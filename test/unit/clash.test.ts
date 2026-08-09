/**
 * The smash.
 *
 * The heart of the game, and the file that must be exhaustively covered:
 * everything downstream of it — the pile, the death screen, the reward — is a
 * consequence of these four sentences being applied correctly.
 *
 * Every case here is written as two literal lines and one expected casualty
 * list. Nothing is derived, and nothing draws a random number: if this suite
 * ever needs an `Rng`, the design has leaked.
 */

import { describe, expect, it } from 'vitest'
import { applyLanes, brokenPlayerKeys, resolveSmash } from '../../src/combat/clash.js'
import type { ClashPool } from '../../src/combat/clash.js'
import { newSpecial } from '../../src/content/bones.js'
import type { EnemyBoneInstance, RolledBone, TieRule } from '../../src/game/state.js'

const enemyBone = (n: number): EnemyBoneInstance => ({
  boneId: `e${n}`,
  profile: 'common',
  priority: 0,
})

/** A player line from bare numbers. Highest first, as the sort would leave it. */
const mine = (...values: number[]): readonly RolledBone[] =>
  values.map((value, i) => ({
    boneKey: `p${i}`,
    profile: 'common' as const,
    faceIndex: 0,
    value,
  }))

/** Its line, from bare numbers. */
const theirs = (...values: number[]): readonly RolledBone[] =>
  values.map((value, i) => ({
    boneKey: `e${i}`,
    profile: 'common' as const,
    faceIndex: 0,
    value,
    enemyBoneId: `e${i}`,
  }))

const pool = (commonBones: number, enemies: number, specials: string[] = []): ClashPool => ({
  commonBones,
  specials: specials.map((id, i) => newSpecial(id as never, i)),
  enemyBones: Array.from({ length: enemies }, (_, i) => enemyBone(i)),
})

const smash = (
  start: ClashPool,
  playerLine: readonly RolledBone[],
  enemyLine: readonly RolledBone[],
  tieRule: TieRule = 'mutual',
) => resolveSmash({ pool: start, playerLine, enemyLine, tieRule })

describe('one lane', () => {
  it('higher kills lower', () => {
    const { record, pool: after } = smash(pool(10, 1), mine(6), theirs(3))
    expect(record.lanes[0]!.result).toBe('player')
    expect(after.commonBones).toBe(10)
    expect(after.enemyBones).toHaveLength(0)
  })

  it('lower dies to higher', () => {
    const { record, pool: after } = smash(pool(10, 1), mine(3), theirs(6))
    expect(record.lanes[0]!.result).toBe('enemy')
    expect(after.commonBones).toBe(9)
    expect(after.enemyBones).toHaveLength(1)
  })

  it('a normal tie kills both', () => {
    const { record, pool: after } = smash(pool(10, 1), mine(5), theirs(5))
    expect(record.lanes[0]!.result).toBe('both')
    expect(after.commonBones).toBe(9)
    expect(after.enemyBones).toHaveLength(0)
  })

  it('the Warden holds a tie: my bone only', () => {
    const { record, pool: after } = smash(pool(10, 1), mine(5), theirs(5), 'warden-holds')
    expect(record.lanes[0]!.result).toBe('warden-hold')
    expect(record.heldTies).toBe(1)
    expect(after.commonBones).toBe(9)
    expect(after.enemyBones).toHaveLength(1)
  })

  it('the Warden rule touches nothing but ties', () => {
    expect(smash(pool(10, 1), mine(6), theirs(3), 'warden-holds').record.lanes[0]!.result).toBe(
      'player',
    )
    expect(smash(pool(10, 1), mine(3), theirs(6), 'warden-holds').record.lanes[0]!.result).toBe(
      'enemy',
    )
  })
})

describe('extras', () => {
  it('my unpaired bones are safe', () => {
    const { record, pool: after } = smash(pool(10, 2), mine(6, 5, 4, 3), theirs(2, 1))
    expect(record.lanes.filter((l) => l.result === 'safe-player')).toHaveLength(2)
    expect(after.commonBones).toBe(10)
    expect(record.playerCommonLost).toBe(0)
  })

  it('its unpaired bones are safe', () => {
    // The whole point of narrowing the field: fewer of mine at risk, and fewer
    // of its killed. Four of its six never met anything.
    const { record, pool: after } = smash(pool(24, 6), mine(8, 5), theirs(7, 6, 5, 3, 2, 1))
    expect(record.lanes.filter((l) => l.result === 'safe-enemy')).toHaveLength(4)
    expect(after.enemyBones).toHaveLength(5)
    expect(after.commonBones).toBe(23)
  })

  it('records every bone in a lane, safe or not', () => {
    const { record } = smash(pool(10, 2), mine(6, 5, 4), theirs(2, 1))
    expect(record.lanes).toHaveLength(3)
  })
})

describe('width', () => {
  it('one bone works', () => {
    const { record } = smash(pool(10, 5), mine(6), theirs(5, 4, 3, 2, 1))
    expect(record.lanes.filter((l) => l.player)).toHaveLength(1)
    expect(record.enemyBonesLost).toEqual(['e0'])
  })

  it('six bones work', () => {
    const { record } = smash(pool(10, 6), mine(6, 5, 4, 3, 2, 1), theirs(1, 2, 3, 4, 5, 6))
    expect(record.lanes).toHaveLength(6)
  })
})

describe('what dies', () => {
  it('a dead common decrements the count', () => {
    const { pool: after } = smash(pool(10, 3), mine(1, 1, 1), theirs(6, 6, 6))
    expect(after.commonBones).toBe(7)
  })

  it('a dead special is removed by instance and named in the record', () => {
    const start: ClashPool = {
      commonBones: 10,
      specials: [newSpecial('cinderbone', 0), newSpecial('cinderbone', 1)],
      enemyBones: [enemyBone(0)],
    }
    const line: readonly RolledBone[] = [
      { boneKey: 'cinderbone#0', profile: 'cruel', faceIndex: 0, value: 3, specialInstanceId: 'cinderbone#0' },
    ]
    const { record, pool: after } = smash(start, line, theirs(6))
    expect(record.playerSpecialsLost).toEqual(['cinderbone#0'])
    expect(record.playerCommonLost).toBe(0)
    // The *other* Cinderbone is untouched. This is the whole reason a special
    // is an instance rather than an id.
    expect(after.specials.map((s) => s.instanceId)).toEqual(['cinderbone#1'])
    expect(after.commonBones).toBe(10)
  })

  it('a surviving special is the same object it went in as', () => {
    const start: ClashPool = {
      commonBones: 10,
      specials: [newSpecial('knuckle', 0)],
      enemyBones: [enemyBone(0)],
    }
    const line: readonly RolledBone[] = [
      { boneKey: 'knuckle#0', profile: 'heavy', faceIndex: 5, value: 8, specialInstanceId: 'knuckle#0' },
    ]
    const { pool: after } = smash(start, line, theirs(6))
    expect(after.specials[0]).toBe(start.specials[0])
  })

  it('a dead enemy bone is removed by id', () => {
    const { record, pool: after } = smash(pool(10, 3), mine(6, 6), theirs(1, 1, 1))
    expect(record.enemyBonesLost).toEqual(['e0', 'e1'])
    expect(after.enemyBones.map((b) => b.boneId)).toEqual(['e2'])
  })

  it('never turns a dead special into a dead common', () => {
    const start: ClashPool = {
      commonBones: 4,
      specials: [newSpecial('knuckle', 0)],
      enemyBones: [enemyBone(0)],
    }
    const line: readonly RolledBone[] = [
      { boneKey: 'knuckle#0', profile: 'heavy', faceIndex: 0, value: 4, specialInstanceId: 'knuckle#0' },
    ]
    const { pool: after } = smash(start, line, theirs(6))
    expect(after.commonBones).toBe(4)
    expect(after.specials).toHaveLength(0)
  })
})

describe('zero', () => {
  it('ends the run on the lane it happens and cancels the rest', () => {
    // Two bones, three paired lanes. Lane 2 takes the last one; lane 3 never
    // resolves, and the enemy bone it would have met is still standing.
    const { record, pool: after } = smash(pool(2, 3), mine(1, 1, 1), theirs(6, 6, 1))
    expect(record.stoppedAtLane).toBe(1)
    expect(record.lanes).toHaveLength(2)
    expect(after.commonBones).toBe(0)
    expect(after.enemyBones).toHaveLength(3)
  })

  it('appends no safe lanes when it stopped early', () => {
    const { record } = smash(pool(1, 4), mine(1, 6, 6), theirs(6, 1, 1, 1))
    expect(record.lanes.every((l) => l.result !== 'safe-player' && l.result !== 'safe-enemy')).toBe(
      true,
    )
  })

  it('a simultaneous final tie is a death, not a win', () => {
    // My last bone and its last bone break on the same lane. Zero outranks
    // everything: the run is over. `reducer.ts` is what acts on this, and it
    // checks the pile before it checks the army.
    const { record, pool: after } = smash(pool(1, 1), mine(4), theirs(4))
    expect(record.lanes[0]!.result).toBe('both')
    expect(record.stoppedAtLane).toBe(0)
    expect(after.commonBones).toBe(0)
    expect(after.enemyBones).toHaveLength(0)
  })
})

describe('the record', () => {
  it('counts held ties', () => {
    const { record } = smash(pool(10, 3), mine(4, 4, 4), theirs(4, 4, 1), 'warden-holds')
    expect(record.heldTies).toBe(2)
  })

  it('names every broken bone of mine', () => {
    const { record } = smash(pool(10, 3), mine(1, 1, 6), theirs(6, 6, 1))
    expect([...brokenPlayerKeys(record.lanes)].sort()).toEqual(['p0', 'p1'])
  })

  it('replays lane by lane to exactly the settled pool', () => {
    // What the presentation depends on: the pile on screen after k beats is
    // `applyLanes` of the first k lanes, and after all of them it is the pool
    // the reducer already committed.
    const start = pool(10, 4)
    const { record, pool: settled } = smash(start, mine(6, 1, 6, 1), theirs(1, 6, 1, 6))
    expect(applyLanes(start, record.lanes)).toEqual(settled)
    for (let k = 0; k <= record.lanes.length; k++) {
      const partial = applyLanes(start, record.lanes.slice(0, k))
      expect(partial.commonBones).toBeGreaterThanOrEqual(settled.commonBones)
      expect(partial.enemyBones.length).toBeGreaterThanOrEqual(settled.enemyBones.length)
    }
  })

  it('draws no random number', () => {
    // Structural: `resolveSmash` takes no generator, so there is nothing it
    // could draw from. The assertion is that the signature stays that way —
    // two identical calls are identical.
    const start = pool(10, 3)
    const once = smash(start, mine(5, 5, 5), theirs(5, 4, 6))
    const twice = smash(start, mine(5, 5, 5), theirs(5, 4, 6))
    expect(once).toEqual(twice)
  })
})
