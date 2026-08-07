import { describe, expect, it } from 'vitest'

import { DIE_DIAL, diceRows, layoutDice } from '../src/shell/tray.js'
import { HAND_SIZE, LADDER, plainPouchOf } from '../src/content/index.js'
import { assembleHand, cast, casting, claim, claimable, keep, openFight } from '../src/lots/index.js'
import type { DieId, Horror, Intent, Lot } from '../src/lots/index.js'

/**
 * art. 123: the tray renders the hand it is given.
 *
 * The engine has never assumed six — `Hand` has always been a collection —
 * so what these prove is the other half: that presentation does not assume
 * it either, and that six survives as a *rule* rather than as a shape
 * baked into a stylesheet.
 */
describe('the tray — art. 123 (the hand is a collection)', () => {
  /** A 390-pixel phone's fight panel, less its two ten-pixel gutters. */
  const PHONE = 370

  it('lays out zero dice without dividing by the count', () => {
    const layout = layoutDice(0, PHONE)
    expect(layout.rows).toBe(0)
    expect(layout.perRow).toBe(0)
    expect(diceRows(0, layout)).toEqual([])
    // Nothing in the current rules deals a hand of nothing. A bind that took
    // the last die would, and presentation that crashes the day a rule
    // changes is presentation that assumed the rule.
    expect(Number.isFinite(layout.size)).toBe(true)
  })

  for (const count of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`lays out ${count} ${count === 1 ? 'die' : 'dice'} on one row inside the frame`, () => {
      const layout = layoutDice(count, PHONE)
      const span = count * layout.size + (count - 1) * layout.gap
      expect(layout.rows).toBe(1)
      expect(layout.perRow).toBe(count)
      // No horizontal overflow, at any count the task named.
      expect(span).toBeLessThanOrEqual(PHONE)
      // And no die under the thumb (art. 6: everything clickable stays
      // clickable, which a 28-pixel die is not).
      expect(layout.size).toBeGreaterThanOrEqual(DIE_DIAL.min)
      expect(layout.size).toBeLessThanOrEqual(DIE_DIAL.max)
    })
  }

  it('grows a short hand and shrinks a long one, rather than keeping one size', () => {
    expect(layoutDice(2, PHONE).size).toBeGreaterThan(layoutDice(6, PHONE).size)
    expect(layoutDice(8, PHONE).size).toBeLessThan(layoutDice(6, PHONE).size)
  })

  it('wraps rather than shrinking under the thumb, and balances the rows', () => {
    const layout = layoutDice(9, PHONE)
    expect(layout.size).toBe(DIE_DIAL.min)
    expect(layout.rows).toBe(2)
    const rows = diceRows(9, layout)
    expect(rows.length).toBe(2)
    // Balanced: five and four, never eight and one.
    expect(Math.abs((rows[0]?.length ?? 0) - (rows[1]?.length ?? 0))).toBeLessThanOrEqual(1)
    // Every die is drawn exactly once, wherever it landed.
    expect(rows.flat().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('never overflows its width at any count up to a hand nobody has authored', () => {
    for (let count = 1; count <= 24; count++) {
      const layout = layoutDice(count, PHONE)
      const widest = layout.perRow * layout.size + (layout.perRow - 1) * layout.gap
      expect(widest, `${count} dice overflow`).toBeLessThanOrEqual(PHONE)
      expect(layout.rows * layout.perRow).toBeGreaterThanOrEqual(count)
    }
  })

  it('is a pure function of the count and the room', () => {
    expect(layoutDice(6, PHONE)).toEqual(layoutDice(6, PHONE))
  })
})

/**
 * art. 123: and the *engine* half — a hand that is not six plays. These go
 * through the real `openFight`, the real cast and the real claim, because
 * the claim about count-independence is only worth anything if the dice
 * engine can be handed a hand nobody tuned it for.
 */
describe('the hand — art. 60 (hand size is a body stat, not a number in the engine)', () => {
  const intent: Intent = { verb: 'REND', amount: 4 }
  const horror: Horror = { id: 'test.horror', health: 200, intentFor: () => intent }
  /** A lot that always lands the same face, so the shape is the test's. */
  const flat = (n: number): Lot => ({ next: () => n })

  for (const size of [1, 2, 3, 6, 8, 12]) {
    it(`opens, casts and claims with a hand of ${size}`, () => {
      const hand = assembleHand(plainPouchOf(size), size)
      expect(hand.dice.length).toBe(size)
      const fight = openFight(horror, hand, 40, 0)
      const turn = cast(fight.turn, flat(0))
      expect(casting(turn).length).toBe(size)
      // ANY DICE is the deliberate floor and is claimable at every size
      // (art. 46), which is what makes "a turn is always endable" true for a
      // hand nobody has balanced.
      const laid = casting(turn)
      const all = laid.map((one) => one.die)
      expect(claimable(turn, all, LADDER)).toContain('any-dice')
    })
  }

  it('keeps and selects by identity, never by position', () => {
    const hand = assembleHand(plainPouchOf(5), 5)
    const fight = openFight(horror, hand, 40, 0)
    const turn = cast(fight.turn, flat(0))
    const third = casting(turn)[2]!.die
    const held = keep(turn, [third])
    // The kept die is the one that was named, wherever the row draws it.
    expect(casting(held).filter((one) => one.kept).map((one) => one.die)).toEqual([third])
    // And re-keeping the same id is stable: position never enters into it.
    expect(casting(keep(held, [third])).filter((one) => one.kept).length).toBe(1)
  })

  it('claims a line out of a hand of eight without the engine minding the count', () => {
    const hand = assembleHand(plainPouchOf(8), 8)
    const fight = openFight(horror, hand, 40, 0)
    const turn = cast(fight.turn, flat(0))
    const laid = casting(turn)
    const pair = laid.slice(0, 2).map((one) => one.die as DieId)
    const made = claim(turn, pair, 'any-dice', LADDER)
    expect(made.claims.length).toBe(1)
    expect(made.claims[0]?.dice.length).toBe(2)
  })

  it('still ships six, and six lives in content', () => {
    // art. 60: the number is a body stat and it is authored. This test exists
    // so that changing it is a deliberate act with a red test behind it,
    // rather than something that happens by accident in a refactor.
    expect(HAND_SIZE).toBe(6)
    expect(plainPouchOf(HAND_SIZE).dice.length).toBe(6)
  })
})
