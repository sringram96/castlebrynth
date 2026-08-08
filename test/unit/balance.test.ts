/**
 * A guard on the tuning, so the balance report cannot rot quietly.
 *
 * This is a much smaller sample than `npm run balance` prints — it is here to
 * catch a change that moves the game a long way, not to replace reading the
 * table. The bands are wide on purpose.
 *
 * And it is not the acceptance criterion. Human completion of the deployed
 * slice outranks any number below.
 */

import { describe, expect, it } from 'vitest'

import { fightIn, simulateFight, simulateRun } from '../balance/simulate.js'

const SEEDS = Array.from({ length: 120 }, (_, i) => (i + 1) * 2654435761)
const rate = (xs: readonly boolean[]): number => xs.filter(Boolean).length / xs.length

describe('the first encounter', () => {
  it('is won by a player who has only just learned the ladder', () => {
    const wins = SEEDS.map((seed) => simulateFight(fightIn('hollow', seed), 'naive').result.won)
    expect(rate(wins)).toBeGreaterThanOrEqual(0.9)
  })

  it('is over in three to five scoring turns', () => {
    const turns = SEEDS.map((seed) => simulateFight(fightIn('hollow', seed), 'heuristic').result.turns)
    const median = [...turns].sort((a, b) => a - b)[Math.floor(turns.length / 2)]!
    expect(median).toBeGreaterThanOrEqual(3)
    expect(median).toBeLessThanOrEqual(5)
  })

  it('never gives a turn with nothing productive to do', () => {
    // Six dice always make a pair or a run of three, and ANY always scores, so
    // there is no hand that cannot be spent on something.
    for (const room of ['hollow', 'deep', 'gate']) {
      for (const tier of ['naive', 'heuristic'] as const) {
        const empty = SEEDS.map((seed) => simulateFight(fightIn(room, seed), tier).result.emptyTurns)
        expect(empty.reduce((a, b) => a + b, 0), `${room}/${tier}`).toBe(0)
      }
    }
  })
})

describe('the whole slice', () => {
  it('can be finished by a first-timer who takes the safe way', () => {
    const out = SEEDS.map((s) => simulateRun(s, 'naive', { deep: false }).reachedExit)
    expect(rate(out)).toBeGreaterThanOrEqual(0.7)
  })

  it('makes the deep way a real gamble for that same player', () => {
    const out = rate(SEEDS.map((s) => simulateRun(s, 'naive').reachedExit))
    expect(out).toBeGreaterThan(0.35)
    expect(out).toBeLessThan(0.7)
  })

  it('rewards learning the ladder', () => {
    const naive = rate(SEEDS.map((s) => simulateRun(s, 'naive').reachedExit))
    const learned = rate(SEEDS.map((s) => simulateRun(s, 'heuristic').reachedExit))
    expect(learned).toBeGreaterThan(naive + 0.2)
  })

  it('is deterministic — the same seed is the same run, every time', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      expect(simulateRun(seed, 'heuristic')).toEqual(simulateRun(seed, 'heuristic'))
    }
  })
})
