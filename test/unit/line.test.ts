/**
 * Fielding, throwing and standing in order.
 *
 * The sort is a **rule**, not a convenience: which of two equal bones stands
 * in the earlier lane decides which one meets the enemy's higher bone. So both
 * tie-breaks are asserted here rather than left to whatever order an array
 * happened to be built in.
 */

import { describe, expect, it } from 'vitest'
import {
  LINE_WIDTH,
  commonKey,
  enemyField,
  materialiseField,
  recharmLine,
  rollEnemyLine,
  rollPlayerLine,
  sortEnemyLine,
  sortPlayerLine,
} from '../../src/combat/line.js'
import { newSpecial } from '../../src/content/bones.js'
import { armyOf } from '../../src/content/enemies.js'
import { Rng } from '../../src/game/rng.js'
import type { EnemyBoneInstance, RolledBone } from '../../src/game/state.js'

const bone = (
  boneKey: string,
  value: number,
  extra: Partial<RolledBone> = {},
): RolledBone => ({ boneKey, profile: 'common', faceIndex: 0, value, ...extra })

describe('enemy fielding', () => {
  it('never fields more than six', () => {
    // The Marrow carries nine. Three of them are always in reserve, which is
    // what makes casualties matter across rounds rather than only within one.
    const army = armyOf('marrow')
    expect(army).toHaveLength(9)
    expect(enemyField(army)).toHaveLength(LINE_WIDTH)
  })

  it('fields by authored priority, best first', () => {
    const fielded = enemyField(armyOf('marrow'))
    expect(fielded.slice(0, 2).map((b) => b.profile)).toEqual(['wrong', 'wrong'])
    expect(fielded.slice(2).every((b) => b.profile === 'common')).toBe(true)
  })

  it('fields the whole army when it is smaller than a line', () => {
    expect(enemyField(armyOf('gnawing'))).toHaveLength(5)
  })

  it('is stable for equal priorities', () => {
    const army = armyOf('gnawing')
    expect(enemyField(army).map((b) => b.boneId)).toEqual(
      enemyField([...army].reverse()).map((b) => b.boneId),
    )
  })
})

describe('materialising a player field', () => {
  const pile = {
    commonBones: 20,
    specials: [newSpecial('cinderbone', 0), newSpecial('knuckle', 1)],
  }

  it('produces exactly the committed width', () => {
    for (let width = 1; width <= 6; width++) {
      expect(materialiseField({ width, specialIds: [] }, pile, 1)).toHaveLength(width)
    }
  })

  it('puts specials in slots inside the width, never on top of it', () => {
    const line = materialiseField(
      { width: 3, specialIds: ['cinderbone#0', 'knuckle#1'] },
      pile,
      1,
    )
    expect(line).toHaveLength(3)
    expect(line.filter((b) => b.specialInstanceId !== undefined)).toHaveLength(2)
    expect(line.filter((b) => b.profile === 'common')).toHaveLength(1)
  })

  it('gives each special its own profile', () => {
    const line = materialiseField(
      { width: 2, specialIds: ['cinderbone#0', 'knuckle#1'] },
      pile,
      1,
    )
    expect(line.map((b) => b.profile).sort()).toEqual(['cruel', 'heavy'])
  })

  it('gives common bones round-scoped keys', () => {
    const line = materialiseField({ width: 2, specialIds: [] }, pile, 3)
    expect(line.map((b) => b.boneKey)).toEqual([commonKey(3, 0), commonKey(3, 1)])
  })

  it('refuses a special that is not alive', () => {
    expect(() => materialiseField({ width: 1, specialIds: ['ghost#9'] }, pile, 1)).toThrow()
  })

  it('refuses more common bones than the pile holds', () => {
    expect(() =>
      materialiseField({ width: 4, specialIds: [] }, { commonBones: 2, specials: [] }, 1),
    ).toThrow()
  })
})

describe('throwing', () => {
  it('throws exactly the committed width', () => {
    const line = rollPlayerLine(
      { width: 4, specialIds: ['knuckle#0'] },
      { commonBones: 10, specials: [newSpecial('knuckle', 0)] },
      1,
      new Rng(7),
    )
    expect(line).toHaveLength(4)
  })

  it('only ever produces values its profiles can roll', () => {
    const line = rollPlayerLine(
      { width: 2, specialIds: ['knuckle#0'] },
      { commonBones: 10, specials: [newSpecial('knuckle', 0)] },
      1,
      new Rng(11),
    )
    for (const b of line) {
      if (b.profile === 'heavy') expect([4, 5, 6, 7, 8]).toContain(b.value)
      else expect([1, 2, 3, 4, 5, 6]).toContain(b.value)
    }
  })

  it('is deterministic for a seed', () => {
    const throwOnce = (): readonly RolledBone[] =>
      rollPlayerLine({ width: 5, specialIds: [] }, { commonBones: 10, specials: [] }, 2, new Rng(99))
    expect(throwOnce()).toEqual(throwOnce())
  })

  it('the enemy throws face-up and sorted', () => {
    const line = rollEnemyLine(enemyField(armyOf('warden')), new Rng(3))
    expect(line).toHaveLength(6)
    for (let i = 1; i < line.length; i++) {
      expect(line[i]!.value).toBeLessThanOrEqual(line[i - 1]!.value)
    }
    // Every entry names the bone it came from, so a casualty removes a bone
    // from the army rather than a position from a list.
    expect(line.every((b) => b.enemyBoneId !== undefined)).toBe(true)
  })
})

describe('sorting', () => {
  it('stands the player line high to low', () => {
    const sorted = sortPlayerLine([bone('a', 2), bone('b', 6), bone('c', 4)])
    expect(sorted.map((b) => b.value)).toEqual([6, 4, 2])
  })

  it('puts a common bone before a special of the same value', () => {
    // The earlier lane meets the enemy's higher bone, so the later lane is the
    // safer one. A special must not die because an array was built one way.
    const sorted = sortPlayerLine([
      bone('knuckle#0', 6, { profile: 'heavy', specialInstanceId: 'knuckle#0' }),
      bone('common:r1:0', 6),
    ])
    expect(sorted[0]!.boneKey).toBe('common:r1:0')
    expect(sorted[1]!.specialInstanceId).toBe('knuckle#0')
  })

  it('orders two equal specials by instance id, totally', () => {
    const a = bone('cinderbone#1', 7, { specialInstanceId: 'cinderbone#1' })
    const b = bone('cinderbone#0', 7, { specialInstanceId: 'cinderbone#0' })
    expect(sortPlayerLine([a, b]).map((x) => x.boneKey)).toEqual([
      'cinderbone#0',
      'cinderbone#1',
    ])
    expect(sortPlayerLine([b, a]).map((x) => x.boneKey)).toEqual([
      'cinderbone#0',
      'cinderbone#1',
    ])
  })

  it('breaks equal enemy values by authored priority', () => {
    const fielded: readonly EnemyBoneInstance[] = [
      { boneId: 'x:common:0', profile: 'common', priority: 1 },
      { boneId: 'x:wrong:0', profile: 'wrong', priority: 0 },
    ]
    const sorted = sortEnemyLine(
      [bone('x:common:0', 5, { enemyBoneId: 'x:common:0' }), bone('x:wrong:0', 5, { enemyBoneId: 'x:wrong:0' })],
      fielded,
    )
    expect(sorted[0]!.boneKey).toBe('x:wrong:0')
  })
})

describe('the Charm', () => {
  const line = sortPlayerLine([bone('a', 6), bone('b', 3), bone('c', 1)])

  it('throws only the bone it names', () => {
    const after = recharmLine(line, 'c', new Rng(5))
    const untouched = after.filter((b) => b.boneKey !== 'c')
    expect(untouched).toEqual(line.filter((b) => b.boneKey !== 'c'))
  })

  it('stands the line up again around the new value', () => {
    const after = recharmLine(line, 'c', new Rng(5))
    for (let i = 1; i < after.length; i++) {
      expect(after[i]!.value).toBeLessThanOrEqual(after[i - 1]!.value)
    }
  })

  it('keeps the same bones, however they end up standing', () => {
    const after = recharmLine(line, 'b', new Rng(13))
    expect(after.map((b) => b.boneKey).sort()).toEqual(['a', 'b', 'c'])
  })

  it('changes nothing when the key is not in the line', () => {
    expect(recharmLine(line, 'nope', new Rng(1))).toEqual(line)
  })
})
