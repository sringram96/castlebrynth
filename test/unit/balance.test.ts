/**
 * The simulation, as a test rather than as a report.
 *
 * `npm run balance` prints distributions for a person to read. This is the
 * part that must never regress silently: a handful of seeds, the properties
 * the simulator itself has to have, and the invariants the slice is built on.
 *
 * The numbers here are deliberately loose. Tight ones belong in the report,
 * where a person is looking at them and can tell a tuning change from a bug —
 * and while the multipliers and the three health totals are first-pass values,
 * a tight assertion here would be a gate nobody agreed to.
 */

import { describe, expect, it } from 'vitest'

import { fightIn, simulateFight, simulateRun } from '../balance/simulate.js'
import { drinkFor, holdFor, scoreFor, shouldScore } from '../balance/policies.js'
import type { Table } from '../balance/policies.js'
import { ENEMIES } from '../../src/content/enemies.js'
import { BONE_CEILING } from '../../src/content/bones.js'
import { MAX_ACTIVE_DICE, MAX_ROLLS } from '../../src/combat/roll.js'
import type { DieValue } from '../../src/combat/roll.js'

const SEEDS = [1, 7, 23, 91, 404, 2029, 55501, 900001]

/**
 * A wider set, for the run-level statements.
 *
 * Eight seeds is plenty for *does this terminate* and far too few for *is this
 * route harder than that one*: a route comparison is a rate, and a rate read
 * off eight samples is noise with an opinion.
 */
const MANY = Array.from({ length: 40 }, (_, i) => (i + 1) * 7919)

const table = (over: Partial<Table> = {}): Table => ({
  dice: [6, 6, 3, 2, 1, 1] as DieValue[],
  rollsUsed: 1,
  usedHands: [],
  enemyHp: 70,
  enemyMaxHp: 70,
  enemyDamage: 3,
  bones: 30,
  vials: 0,
  ...over,
})

describe('the simulator plays the real game', () => {
  it('finishes every fight in the slice, at both tiers', () => {
    for (const roomId of ['hollow', 'deep', 'gate'] as const) {
      for (const tier of ['naive', 'heuristic'] as const) {
        for (const seed of SEEDS) {
          const { result } = simulateFight(fightIn(roomId, seed), tier)
          expect(result.rounds, `${roomId}/${tier}/${seed} ran forever`).toBeLessThan(60)
          expect(result.rounds).toBeGreaterThan(0)
        }
      }
    }
  })

  it('never uses more than three throws on one attack', () => {
    for (const seed of SEEDS) {
      for (const attack of simulateFight(fightIn('gate', seed), 'heuristic').result.attacks) {
        expect(attack.rollsUsed).toBeGreaterThanOrEqual(1)
        expect(attack.rollsUsed).toBeLessThanOrEqual(MAX_ROLLS)
      }
    }
  })

  it('never scores a named hand twice in one fight', () => {
    for (const seed of SEEDS) {
      const { attacks } = simulateFight(fightIn('gate', seed), 'heuristic').result
      const named = attacks.map((a) => a.hand).filter((h) => h !== 'crap')
      expect(new Set(named).size, `seed ${seed} spent a hand twice`).toBe(named.length)
    }
  })

  it('never reports a negative cost, whatever the satchel does', () => {
    // Counted off the attack records rather than as a start-to-finish
    // difference, because a Vial drunk mid-fight puts bones back.
    for (const seed of SEEDS) {
      const { result } = simulateFight(fightIn('gate', seed, { bones: 20, vials: 3 }), 'heuristic')
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

  it('a whole run can be finished by a player who uses the rerolls', () => {
    const out = MANY.filter((seed) => simulateRun(seed, 'heuristic', { deep: false }).reachedExit)
    expect(out.length, 'no run reached the exit').toBeGreaterThan(0)
  })

  it('the boss is the thing that kills runs', () => {
    // Where a run ends is a design statement: it should end at the exam, not
    // at the tutorial.
    const deaths = SEEDS.map((seed) => simulateRun(seed, 'heuristic').diedIn).filter(Boolean)
    for (const where of deaths) expect(where).toBe('gate')
  })

  it('the deep route is genuinely the harder one', () => {
    const escape = (deep: boolean): number =>
      MANY.filter((seed) => simulateRun(seed, 'heuristic', { deep }).reachedExit).length
    expect(escape(true)).toBeLessThanOrEqual(escape(false))
  })
})

describe('the naive policy', () => {
  it('throws once and commits', () => {
    expect(shouldScore(table({ rollsUsed: 1 }), 'naive')).toBe(true)
    expect(holdFor(table(), 'naive')).toEqual([])
  })

  it('takes the biggest number on the card', () => {
    // 6 6 3 2 1 1 sums to 19. Two Pair at ×1.25 pays 23; Pair at ×1 pays 19.
    expect(scoreFor(table(), 'naive')).toBe('two-pair')
  })

  it('drinks only when a bad exchange could end the run', () => {
    expect(drinkFor(table({ vials: 1, bones: 20 }), 'naive')).toBe(false)
    expect(drinkFor(table({ vials: 1, bones: 6, enemyDamage: 3 }), 'naive')).toBe(true)
    expect(drinkFor(table({ vials: 0, bones: 2 }), 'naive')).toBe(false)
  })
})

describe('the heuristic policy', () => {
  it('throws again on a mediocre hand', () => {
    expect(shouldScore(table({ dice: [1, 1, 2, 3, 4, 6] as DieValue[] }), 'heuristic')).toBe(false)
  })

  it('stops on a hand that is working', () => {
    expect(shouldScore(table({ dice: [6, 6, 6, 6, 5, 5] as DieValue[] }), 'heuristic')).toBe(true)
  })

  it('always commits once the throws are gone', () => {
    expect(
      shouldScore(table({ dice: [1, 1, 2, 3, 4, 6] as DieValue[], rollsUsed: MAX_ROLLS }), 'heuristic'),
    ).toBe(true)
  })

  it('keeps its biggest group', () => {
    expect(holdFor(table({ dice: [6, 1, 6, 5, 2, 3] as DieValue[] }), 'heuristic')).toEqual([0, 2])
  })

  it('keeps a high face outside the group when the group is not itself high', () => {
    // Two twos are the group, and a six left standing is six points of sum
    // whether or not it joins a pattern. It is kept.
    expect(holdFor(table({ dice: [2, 6, 2, 1, 3, 4] as DieValue[] }), 'heuristic')).toEqual([0, 1, 2])
  })

  it('never asks for a throw in which nothing would move', () => {
    for (const dice of [[6, 6, 6, 6, 6, 6], [5, 5, 5, 5], [6, 6]] as DieValue[][]) {
      const held = holdFor(table({ dice }), 'heuristic')
      expect(held.length, `${dice.join('')} held everything`).toBeLessThan(dice.length)
    }
  })

  it('does not overpay for a kill', () => {
    // 6 6 3 2 1 1 sums to 19. The thing has 15 left, so Pair at ×1 finishes it
    // and Two Pair is kept back for the next attack.
    expect(scoreFor(table({ enemyHp: 15 }), 'heuristic')).toBe('pair')
    // With more left than either hand can take, the biggest number wins.
    expect(scoreFor(table({ enemyHp: 70 }), 'heuristic')).toBe('two-pair')
  })

  it('never spills a Vial', () => {
    expect(drinkFor(table({ vials: 1, bones: BONE_CEILING }), 'heuristic')).toBe(false)
  })
})

describe('the content the simulation reads', () => {
  it('gives every enemy a health total and a damage figure', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.maxHp, `${e.id} has no health`).toBeGreaterThan(0)
      expect(e.damage, `${e.id} breaks nothing`).toBeGreaterThan(0)
    }
  })

  it('paces the three fights differently, in order', () => {
    expect(ENEMIES.gnawing!.maxHp).toBeLessThan(ENEMIES.marrow!.maxHp)
    expect(ENEMIES.marrow!.maxHp).toBeLessThan(ENEMIES.warden!.maxHp)
    expect(ENEMIES.gnawing!.damage).toBeLessThan(ENEMIES.marrow!.damage)
    expect(ENEMIES.marrow!.damage).toBeLessThan(ENEMIES.warden!.damage)
  })

  it('keeps every enemy survivable for at least one full-width attack', () => {
    // A thing that empties a full pile in one exchange is not a fight.
    for (const e of Object.values(ENEMIES)) {
      expect(e.damage, `${e.id} ends a fresh run outright`).toBeLessThan(BONE_CEILING)
      expect(e.damage).toBeLessThan(MAX_ACTIVE_DICE * 2)
    }
  })
})
