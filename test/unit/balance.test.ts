/**
 * The simulation, as a test rather than as a report.
 *
 * `npm run balance` prints distributions for a person to read. This is the
 * part that must never regress silently: a handful of seeds, the properties
 * the simulator itself has to have, and the invariants the slice is built on.
 *
 * The numbers here are deliberately loose. Tight ones belong in the report,
 * where a person is looking at them and can tell a tuning change from a bug.
 */

import { describe, expect, it } from 'vitest'

import { fightIn, simulateFight, simulateRun } from '../balance/simulate.js'
import { charmFor, drinkFor, fieldFor } from '../balance/policies.js'
import type { Table } from '../balance/policies.js'
import { ENEMIES, armySize } from '../../src/content/enemies.js'
import { BONE_CEILING, newSpecial } from '../../src/content/bones.js'
import { LINE_WIDTH } from '../../src/combat/line.js'

const SEEDS = [1, 7, 23, 91, 404, 2029, 55501, 900001]

const table = (over: Partial<Table> = {}): Table => ({
  enemyLine: [],
  enemyBones: 5,
  tieRule: 'mutual',
  commonBones: 30,
  specials: [],
  charms: 0,
  vials: 0,
  charmUsed: false,
  ...over,
})

const bone = (value: number) => ({
  boneKey: `e${value}`,
  profile: 'common' as const,
  faceIndex: 0,
  value,
  enemyBoneId: `e${value}`,
})

describe('the simulator plays the real game', () => {
  it('finishes every fight in the slice, at both tiers', () => {
    for (const [roomId] of [['hollow'], ['deep'], ['gate']] as const) {
      for (const tier of ['naive', 'heuristic'] as const) {
        for (const seed of SEEDS) {
          const { result } = simulateFight(fightIn(roomId, seed), tier)
          expect(result.rounds, `${roomId}/${tier}/${seed} ran forever`).toBeLessThan(40)
          expect(result.rounds).toBeGreaterThan(0)
        }
      }
    }
  })

  it('never reports a negative cost, whatever the satchel does', () => {
    // Counted off the smash records rather than as a start-to-finish
    // difference, because a Vial drunk mid-fight puts bones back.
    for (const seed of SEEDS) {
      const { result } = simulateFight(
        fightIn('gate', seed, { bones: 20, vials: 3 }),
        'heuristic',
      )
      expect(result.bonesLost).toBeGreaterThanOrEqual(0)
    }
  })

  it('replays a seed exactly', () => {
    for (const tier of ['naive', 'heuristic'] as const) {
      expect(simulateFight(fightIn('deep', 44), tier).result).toEqual(
        simulateFight(fightIn('deep', 44), tier).result,
      )
      expect(simulateRun(44, tier)).toEqual(simulateRun(44, tier))
    }
  })

  it('never leaves a run in a mode it cannot get out of', () => {
    for (const seed of SEEDS) {
      const run = simulateRun(seed, 'naive')
      expect(run.reachedExit || run.diedIn !== undefined, `seed ${seed} stalled`).toBe(true)
    }
  })
})

describe('the slice is finishable', () => {
  it('the first fight is won bare, on every seed here', () => {
    for (const seed of SEEDS) {
      expect(simulateFight(fightIn('hollow', seed), 'naive').result.won, `seed ${seed}`).toBe(true)
    }
  })

  it('a whole run can be finished by a beginner', () => {
    const out = SEEDS.filter((seed) => simulateRun(seed, 'naive', { deep: false }).reachedExit)
    expect(out.length, 'no beginner run reached the exit').toBeGreaterThan(0)
  })

  it('the boss is the thing that kills runs', () => {
    // Where a run ends is a design statement: it should end at the exam, not
    // at the tutorial.
    const deaths = SEEDS.map((seed) => simulateRun(seed, 'naive').diedIn).filter(Boolean)
    for (const where of deaths) expect(where).toBe('gate')
  })

  it('the deep route is genuinely the harder one', () => {
    const escape = (deep: boolean): number =>
      SEEDS.filter((seed) => simulateRun(seed, 'naive', { deep }).reachedExit).length
    expect(escape(true)).toBeLessThanOrEqual(escape(false))
  })
})

describe('the naive policy', () => {
  it('fields everything it legally can', () => {
    expect(fieldFor(table(), 'naive').width).toBe(LINE_WIDTH)
    expect(fieldFor(table({ commonBones: 3 }), 'naive').width).toBe(3)
    expect(fieldFor(table({ commonBones: 0 }), 'naive').width).toBe(0)
  })

  it('puts its best named bones in the line', () => {
    const specials = [newSpecial('cinderbone', 0), newSpecial('knuckle', 1)]
    const decision = fieldFor(table({ specials, commonBones: 10 }), 'naive')
    // The Knuckle rolls higher than the Cinderbone, so it goes in first.
    expect(decision.specialIds[0]).toBe('knuckle#1')
    expect(decision.specialIds).toHaveLength(2)
  })

  it('never spends a Charm', () => {
    const t = table({ charms: 2, enemyLine: [bone(6)] })
    expect(charmFor(t, [{ boneKey: 'p', profile: 'common', faceIndex: 0, value: 1 }], 'naive')).toBeUndefined()
  })

  it('drinks only when a bad round could end the run', () => {
    expect(drinkFor(table({ vials: 1, commonBones: 20 }), 'naive')).toBe(false)
    expect(drinkFor(table({ vials: 1, commonBones: 6 }), 'naive')).toBe(true)
    expect(drinkFor(table({ vials: 0, commonBones: 2 }), 'naive')).toBe(false)
  })
})

describe('the heuristic policy', () => {
  it('narrows against a line it cannot beat', () => {
    // Six sevens, and every one of my lanes is a losing lane. Risking six bones
    // to break maybe one is the mistake the width control exists to let a
    // player avoid.
    const brutal = table({ enemyLine: [7, 7, 7, 7, 7, 7].map(bone) })
    expect(fieldFor(brutal, 'heuristic').width).toBeLessThan(LINE_WIDTH)
  })

  it('widens against a line it beats', () => {
    const soft = table({ enemyLine: [2, 1, 1, 1, 1, 1].map(bone) })
    expect(fieldFor(soft, 'heuristic').width).toBe(LINE_WIDTH)
  })

  it('narrows harder when ties are held', () => {
    const line = [5, 5, 5, 5, 5, 5].map(bone)
    const mutual = fieldFor(table({ enemyLine: line }), 'heuristic').width
    const warden = fieldFor(table({ enemyLine: line, tieRule: 'warden-holds' }), 'heuristic').width
    expect(warden).toBeLessThanOrEqual(mutual)
  })

  it('never stalls: it always fields at least one bone', () => {
    for (const value of [1, 4, 6, 7, 8]) {
      const t = table({ enemyLine: Array.from({ length: 6 }, () => bone(value)) })
      expect(fieldFor(t, 'heuristic').width).toBeGreaterThanOrEqual(1)
    }
  })

  it('spends a Charm on a losing lane it could actually win', () => {
    const t = table({ charms: 1, enemyLine: [bone(3), bone(1)] })
    const line = [
      { boneKey: 'losing', profile: 'common' as const, faceIndex: 0, value: 1 },
      { boneKey: 'winning', profile: 'common' as const, faceIndex: 0, value: 5 },
    ]
    expect(charmFor(t, line, 'heuristic')).toBe('losing')
  })

  it('keeps the Charm when a reroll would barely help', () => {
    // A common bone against a 7 loses on every face. Throwing it again buys
    // nothing, and a Charm spent on a lane that cannot be won is a Charm
    // thrown away — which is a decision, not an oversight.
    const t = table({ charms: 1, enemyLine: [bone(7)] })
    const line = [{ boneKey: 'doomed', profile: 'common' as const, faceIndex: 0, value: 1 }]
    expect(charmFor(t, line, 'heuristic')).toBeUndefined()
  })

  it('keeps a Charm when every lane is already won', () => {
    const t = table({ charms: 1, enemyLine: [bone(1), bone(1)] })
    const line = [
      { boneKey: 'a', profile: 'common' as const, faceIndex: 0, value: 6 },
      { boneKey: 'b', profile: 'common' as const, faceIndex: 0, value: 5 },
    ]
    expect(charmFor(t, line, 'heuristic')).toBeUndefined()
  })

  it('never spends a Charm it does not have, or a second one', () => {
    const line = [{ boneKey: 'a', profile: 'common' as const, faceIndex: 0, value: 1 }]
    const enemyLine = [bone(6)]
    expect(charmFor(table({ charms: 0, enemyLine }), line, 'heuristic')).toBeUndefined()
    expect(charmFor(table({ charms: 2, charmUsed: true, enemyLine }), line, 'heuristic')).toBeUndefined()
  })

  it('never spills a Vial', () => {
    expect(drinkFor(table({ vials: 1, commonBones: BONE_CEILING }), 'heuristic')).toBe(false)
  })
})

describe('the content the simulation reads', () => {
  it('gives every enemy an army', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(armySize(e.id), `${e.id} fields nothing`).toBeGreaterThan(0)
    }
  })

  it('makes the boss the largest army, with reserves behind its line', () => {
    expect(armySize('warden')).toBeGreaterThan(LINE_WIDTH)
    expect(armySize('marrow')).toBeGreaterThan(LINE_WIDTH)
    expect(armySize('gnawing')).toBeLessThanOrEqual(LINE_WIDTH)
  })

  it('gives exactly one enemy the tie rule', () => {
    const holding = Object.values(ENEMIES).filter((e) => e.tieRule === 'warden-holds')
    expect(holding.map((e) => e.id)).toEqual(['warden'])
  })
})
