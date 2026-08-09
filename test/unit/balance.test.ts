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

  it('is over in three scoring turns, because there are only three', () => {
    // The encounter is a count, not a health bar: it closes one reach per
    // score it survives and there is nothing past `close`. So no seed, at any
    // tier, may take a fourth turn — a fourth turn would mean something
    // advanced twice or not at all.
    for (const tier of ['naive', 'heuristic'] as const) {
      for (const seed of SEEDS) {
        const turns = simulateFight(fightIn('hollow', seed), tier).result.turns
        expect(turns, `${tier}/${seed}`).toBeLessThanOrEqual(3)
        expect(turns).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('is usually seen coming: most players watch it move at least once', () => {
    // If the fight ended on the first score every time, the whole encounter
    // would be a still picture. This is the number that says it is not.
    const moved = SEEDS.map((seed) => simulateFight(fightIn('hollow', seed), 'naive').result.turns > 1)
    expect(rate(moved)).toBeGreaterThan(0.6)
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
    // The band moved when the first fight stopped charging rent. It used to
    // take 18–24 HP off every run on the way past, and the boss inherited
    // that; the Gnawing now costs nothing at all unless it costs everything,
    // so a first-timer reaches the fork close to full. The decision at the
    // fork is still a decision — it is just a narrower one, and the gap below
    // is the part that has to survive any retuning.
    const deep = rate(SEEDS.map((s) => simulateRun(s, 'naive').reachedExit))
    const stair = rate(SEEDS.map((s) => simulateRun(s, 'naive', { deep: false }).reachedExit))
    expect(deep).toBeGreaterThan(0.55)
    expect(deep).toBeLessThan(0.85)
    expect(stair - deep, 'the deep way costs a first-timer nothing').toBeGreaterThan(0.1)
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
