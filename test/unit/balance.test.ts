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
import { drinkFor, fieldFor } from '../balance/policies.js'
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
  vials: 0,
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
  it('throws as wide as the pile allows', () => {
    expect(fieldFor(table(), 'naive').width).toBe(LINE_WIDTH)
    expect(fieldFor(table({ commonBones: 3 }), 'naive').width).toBe(3)
    expect(fieldFor(table({ commonBones: 0 }), 'naive').width).toBe(0)
  })

  it('stands every named bone it owns, whatever it is facing', () => {
    const specials = [newSpecial('cinderbone', 0), newSpecial('knuckle', 1)]
    const brutal = table({ specials, commonBones: 10, enemyLine: [8, 8, 8, 8, 8, 8].map(bone) })
    const decision = fieldFor(brutal, 'naive')
    // The Knuckle rolls higher than the Cinderbone, so it takes the top lane.
    expect(decision.specialIds[0]).toBe('knuckle#1')
    expect(decision.specialIds).toHaveLength(2)
  })

  it('drinks only when a bad round could end the run', () => {
    expect(drinkFor(table({ vials: 1, commonBones: 20 }), 'naive')).toBe(false)
    expect(drinkFor(table({ vials: 1, commonBones: 6 }), 'naive')).toBe(true)
    expect(drinkFor(table({ vials: 0, commonBones: 2 }), 'naive')).toBe(false)
  })
})

describe('the heuristic policy', () => {
  const knuckle = [newSpecial('knuckle', 0)]

  it('holds a named bone back against a line that will break it', () => {
    // Eights across. A Knuckle reaches eight on one face in six, so the lane
    // it lands in is a losing lane nearly always — and losing it costs a bone
    // that nothing in the game brings back.
    const brutal = table({ specials: knuckle, commonBones: 10, enemyLine: [8, 8].map(bone) })
    expect(fieldFor(brutal, 'heuristic').specialIds).toEqual([])
  })

  it('stands it against a line it beats', () => {
    const soft = table({ specials: knuckle, commonBones: 10, enemyLine: [3, 1].map(bone) })
    expect(fieldFor(soft, 'heuristic').specialIds).toEqual(['knuckle#0'])
  })

  it('holds harder when ties are held', () => {
    // A tie is an even trade against anything else and a pure loss against the
    // Warden, so the same line is a worse bet for a named bone.
    const line = [6, 6].map(bone)
    const mutual = fieldFor(
      table({ specials: knuckle, commonBones: 10, enemyLine: line }),
      'heuristic',
    ).specialIds.length
    const warden = fieldFor(
      table({ specials: knuckle, commonBones: 10, enemyLine: line, tieRule: 'warden-holds' }),
      'heuristic',
    ).specialIds.length
    expect(warden).toBeLessThanOrEqual(mutual)
  })

  it('never throws a line narrower than the pile can pay for', () => {
    // Holding a bone back is free when there is a common to take its place and
    // costly when there is not. It must never cost a lane.
    for (const value of [1, 4, 6, 7, 8]) {
      const enemyLine = Array.from({ length: 6 }, () => bone(value))
      const thin = table({ specials: knuckle, commonBones: 2, enemyLine })
      const decision = fieldFor(thin, 'heuristic')
      expect(decision.width).toBe(3)
      expect(decision.specialIds).toEqual(['knuckle#0'])
    }
  })

  it('never stalls: it always throws at least one bone', () => {
    for (const value of [1, 4, 6, 7, 8]) {
      const t = table({ enemyLine: Array.from({ length: 6 }, () => bone(value)) })
      expect(fieldFor(t, 'heuristic').width).toBeGreaterThanOrEqual(1)
    }
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
