import { describe, expect, it } from 'vitest'

import {
  ALL_RIDERS,
  BARE_BODY,
  CATALOG_GOODS,
  HAND_SIZE,
  LABELS,
  LADDER,
  LEAVES_A_GOOD,
  LEVELS,
  LEVEL_CAP,
  ORIGINS,
  PLAIN_POUCH,
  THE_CHAIN,
  THE_CORD,
  THE_GNAWING,
  THE_WHETSTONE,
  THE_ZEALOT,
  encounterWords,
  leftBy,
  saysGood,
} from '../src/content/index.js'
import type { WorldMark } from '../src/room/index.js'
import type { Goods, Line, Talisman } from '../src/lots/index.js'
import { LINES, assembleHand, tierFor } from '../src/lots/index.js'
import { winRateOf } from './policy.js'

/**
 * **The levels** (card 90, art. 53's ladder species).
 *
 * A level is a talisman that raises one line's multiplier by one and lowers
 * another's by one. The wave's rules, one test each: per-line and never
 * global, capped at two tiers of lift however many talismans agree, priced
 * (art. 54), spoken for (art. 87), spread across the ladder with a
 * run-leveller among them, gating nothing, and legible where it lands.
 *
 * What each one is *worth* is measured in `test/report.ts` and published in
 * DESIGN.md. What is asserted here is that it is worth something at all —
 * card 82's preference test, which a level that bends nothing fails.
 */

const HAND = assembleHand(PLAIN_POUCH, HAND_SIZE)

/** A mark for the socket to stand at. Nothing here is about where it lies. */
const SOMEWHERE: WorldMark = { X: 0, Y: 0, z: 12, width: 2, height: 2 }
const RUNS = 500

function company(...talismans: readonly Talisman[]): Goods {
  return { talismans, riders: ALL_RIDERS, levelCap: LEVEL_CAP }
}

/** What a line actually scores at, through a company. The claim asks this. */
function tierOf(line: Line, goods: Goods): number {
  return tierFor(line, LADDER, goods.talismans, false, goods.levelCap).multiplier
}

describe('card 90 — a level is per-line, and it pays', () => {
  it('lifts only the lines it names, and nothing else on the ladder (art. 53)', () => {
    for (const level of LEVELS) {
      const lifts = level.ladder?.lines ?? []
      const dulls = level.ladder?.dulls ?? []
      const goods = company(level)
      for (const line of LINES) {
        const moved = tierOf(line, goods) - LADDER[line].multiplier
        if (lifts.includes(line) && dulls.includes(line)) continue
        if (lifts.includes(line)) expect(moved, `${level.id} ${line}`).toBeGreaterThan(0)
        else if (dulls.includes(line)) expect(moved, `${level.id} ${line}`).toBeLessThan(0)
        else expect(moved, `${level.id} ${line}`).toBe(0)
      }
    }
  })

  /**
   * art. 54: every power pays. For a **ladder** talisman the price is a
   * dulled line, declared on the good itself — a level that only ever gave
   * would be a level nobody has to think about, and card 82's preference
   * test would fail by construction because a flat gift changes no
   * decision.
   *
   * The other two species are not asked for one, and the reason is on each
   * of them: the value species is beaten outright by a cursing intent
   * (`worth`, art. 65), and the shape species fires only on a turn where
   * every die of the hand landed in a claim. A condition is a declaration.
   */
  it('charges every ladder talisman a dulled line (art. 54)', () => {
    let checked = 0
    for (const good of CATALOG_GOODS) {
      if (!('species' in good) || good.species !== 'ladder') continue
      expect(good.ladder, good.id as string).toBeDefined()
      expect(good.ladder!.dulls ?? [], good.id as string).not.toHaveLength(0)
      // And it never dulls the same line it sharpens, which would be a
      // declaration of nothing wearing a price's coat.
      for (const line of good.ladder!.dulls ?? []) {
        expect(good.ladder!.lines ?? [], good.id as string).not.toContain(line)
      }
      checked++
    }
    expect(checked).toBe(LEVELS.length)
  })

  it('never prices a line below the floor art. 46 keeps spendable', () => {
    const all = company(...LEVELS)
    for (const line of LINES) expect(tierOf(line, all), line).toBeGreaterThanOrEqual(1)
  })

  /**
   * **The cap, and it is reachable.** Two run-levellers agree about the run
   * of 3 and the run of 4, which is the only place in the shipped catalog
   * where a line is lifted twice — so the cap is a guard rather than a wall
   * and a third would be the thing it stops.
   */
  it('caps the lift at two tiers, however many talismans agree (art. 53)', () => {
    const both = company(THE_CORD, THE_CHAIN)
    expect(tierOf('run-3', both)).toBe(LADDER['run-3'].multiplier + 2)
    const third: Talisman = {
      id: 'talisman.probe' as Talisman['id'],
      species: 'ladder',
      ladder: { tiers: 1, lines: ['run-3'], dulls: ['pair'] },
    }
    expect(tierOf('run-3', company(THE_CORD, THE_CHAIN, third))).toBe(
      LADDER['run-3'].multiplier + LEVEL_CAP,
    )
  })

  it('caps the lift and not the net — a dull is never headroom', () => {
    // Two lifts and one dull on the same line: the cap holds the lift at
    // two and the dull still comes off, so nothing buys the third tier back.
    const dulling: Talisman = {
      id: 'talisman.probe' as Talisman['id'],
      species: 'ladder',
      ladder: { tiers: 1, lines: ['pair'], dulls: ['run-3'] },
    }
    expect(tierOf('run-3', company(THE_CORD, THE_CHAIN, dulling))).toBe(
      LADDER['run-3'].multiplier + LEVEL_CAP - 1,
    )
  })
})

describe('card 90 — a level bends the curve, or it does not ship (card 82)', () => {
  /**
   * The published number, asserted as a *sign* rather than as a value: what
   * each one is worth is in DESIGN.md and is measured by `test/report.ts`.
   * A level that came out flat or negative against the ordinary fight has
   * paid more than it gives, and that is the one way a level can fail.
   */
  it('leaves every level measurably better to carry than not to', () => {
    const bare = winRateOf(THE_GNAWING, HAND, BARE_BODY.armor, RUNS, undefined, company())
    for (const level of LEVELS) {
      const held = winRateOf(THE_GNAWING, HAND, BARE_BODY.armor, RUNS, undefined, company(level))
      expect(held, level.id as string).toBeGreaterThan(bare)
    }
  })

  it('spreads across the ladder, and levels at least one run', () => {
    const lifted = new Set<Line>(LEVELS.flatMap((one) => one.ladder?.lines ?? []))
    // Sets, composites, runs and the floor: a basket, not one family.
    expect(lifted.has('quad')).toBe(true)
    expect(lifted.has('full-house')).toBe(true)
    expect(lifted.has('any-dice')).toBe(true)
    expect([...lifted].some((line) => line.startsWith('run-'))).toBe(true)
    expect(lifted.size).toBeGreaterThanOrEqual(6)
  })
})

describe('card 90 — placed, spoken for, and legible', () => {
  it('places every level through the ordinary drops, like any other good', () => {
    for (const level of LEVELS) {
      const dealt = LEAVES_A_GOOD.filter((who) =>
        leftBy(who).some((good) => good.id === level.id),
      )
      expect(dealt, level.id as string).toHaveLength(1)
    }
    // card 90: and the Zealot, which had been a fixture with nowhere to be.
    expect(
      LEAVES_A_GOOD.some((who) => leftBy(who).some((good) => good.id === THE_ZEALOT.id)),
    ).toBe(true)
  })

  /** art. 87: if the sentence cannot be written, the item does not ship. */
  it('gives every level its origin sentence and its name (arts 87, 111)', () => {
    for (const level of [...LEVELS, THE_ZEALOT]) {
      expect(ORIGINS[level.id as string], level.id as string).toBeTruthy()
      expect(LABELS[level.id as string], level.id as string).toBeTruthy()
    }
  })

  /**
   * arts 54, 68, and card 72's declaration duty: the pouch inspect says the
   * line and the bonus. A power the player cannot read in the pouch is a
   * power they cannot price before the claim that reveals it.
   */
  it('declares the line, the bonus and the cap on inspect (art. 54)', () => {
    const said = saysGood(THE_WHETSTONE)
    expect(said).toContain(LABELS[THE_WHETSTONE.id as string])
    expect(said).toContain(LADDER.quad.name)
    expect(said).toContain(LADDER.pair.name)
    expect(said).toContain(`+${LEVEL_CAP}`)
    expect(said).toContain(ORIGINS[THE_WHETSTONE.id as string])
    // And the shape species declares its own condition rather than a line.
    expect(saysGood(THE_ZEALOT)).toContain(`×${THE_ZEALOT.shape?.times}`)
  })

  /**
   * **No gates.** The wave's boundary, made a test: nothing anywhere
   * requires a *specific* good, so no act, no door and no lock may ever
   * name one. Art. 3's required thing is the key and it is not a level.
   */
  it('gates nothing on a specific good (art. 3, and the wave’s boundary)', () => {
    let checked = 0
    for (const who of LEAVES_A_GOOD) {
      const acts = encounterWords(who, SOMEWHERE).acts
      expect(acts.length, who as string).toBeGreaterThan(0)
      for (const one of acts) {
        // art. 4: a good is optional treasure. Nothing that hands one over
        // may hold a door, so no run can ever be lost by declining to take
        // one — which is the whole of *no specific-good gates*.
        expect(one.required, one.id).toBe(false)
        // And it demands nothing to press: a good behind a good would be a
        // gate wearing a fork's coat.
        expect(one.needs ?? [], one.id).toHaveLength(0)
      }
      checked++
    }
    expect(checked).toBe(LEAVES_A_GOOD.length)
  })
})
