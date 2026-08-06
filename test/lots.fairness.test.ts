import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  GNAWING_ESCALATION,
  GNAWING_HEALTH,
  GNAWING_SCRIPT,
  HAND_SIZE,
  PLAIN_POUCH,
  RUSTED_PLATE,
  THE_GNAWING,
  THE_CAREFUL,
  scriptedHorror,
} from '../src/content/index.js'
import type { Armor, Hand, Horror, Intent, IntentEffect } from '../src/lots/index.js'
import { assembleHand } from '../src/lots/index.js'
import { claimIfWorth, winRateOf } from './policy.js'

/**
 * Is it fair? — restated for the six-die start (arts 55, 86).
 *
 * **The ruling of 2026-08-06 moved this file twice over.** art. 55 now wakes
 * the player with a full hand of six, and the measured win rate against the
 * depth's ordinary teeth goes back to about 0.78 — where it was before the
 * five-bone ruling took it down to about 0.28. A first waking is expected to
 * *win* again, and this file says so rather than hoping otherwise.
 *
 * **And a found bone is a different kind of thing now.** It no longer fills
 * a hole: the hand is full, so a traveler's die comes down only by taking a
 * plain bone's place at the choosing screen (art. 60), and what it is worth
 * is the difference between the two dice rather than the difference between
 * five dice and six. Measured, that is a step of three to five points
 * instead of the fifty the empty slot was worth.
 *
 * **The debt that leaves is named at the foot of this file.** art. 89's
 * first fork is *a bone or the plate*, and the two sides of it have swapped
 * places: the plate is worth more than any die in the game right now. That
 * is an arithmetic question — the plate's armor, the Gnawing's health, or
 * the travelers' distributions — and it is not settled here.
 *
 * It plays the Gnawing well rather than perfectly: hunt the biggest set on
 * the recast, then take the best-scoring claims until the hand is dry. The
 * bands are wide on purpose. They are a tripwire under the tuning, not an
 * opinion about it.
 */

/**
 * art. 55: the bare hand. art. 86 as it now lands: the same hand with a
 * traveler's bone **in place of** a plain one, because a full hand is what a
 * find has to displace something out of (art. 60).
 */
const BARE_HAND = assembleHand(PLAIN_POUCH, HAND_SIZE)
const FOUND_HAND = assembleHand(
  { dice: [...PLAIN_POUCH.dice.slice(0, HAND_SIZE - 1), THE_CAREFUL] },
  HAND_SIZE,
)

function winRate(armor: Armor, runs: number, hand = BARE_HAND): number {
  return winRateOf(THE_GNAWING, hand, armor, runs)
}

describe('lots — is it fair? (art. 33, and the arithmetic agent)', () => {
  it('leaves a bare six-die player expected to beat the Gnawing (arts 55, 86)', () => {
    const bare = winRate(BARE_BODY.armor, 400)
    // Expected to win: art. 55 as amended wakes the hand full, and the loop
    // closes comfortably on six bones and no armor.
    expect(bare).toBeGreaterThan(0.6)
    // And not a formality — the depth's ordinary teeth still take a run in
    // roughly one fight in five, which is what keeps art. 32 meaning
    // anything.
    expect(bare).toBeLessThan(0.9)
  })

  it('leaves a traveler’s die worth swapping in, and only just (art. 86)', () => {
    const bare = winRate(BARE_BODY.armor, 400)
    const found = winRate(BARE_BODY.armor, 400, FOUND_HAND)
    // Still an upgrade: a traveler's distribution beats a plain bone's, which
    // is the whole of what art. 86 promises now that the hand starts full.
    expect(found).toBeGreaterThan(bare)
    // **And a small one.** Under the five-bone start this step was worth more
    // than half the fight; it is now worth a few points, because a find
    // displaces a plain bone instead of filling a hole. Asserted so that a
    // future tuning pass has to come here and move it deliberately.
    expect(found - bare).toBeLessThan(0.2)
  })

  it('makes armor worth wearing without making the fight a formality (art. 47)', () => {
    const bare = winRate(BARE_BODY.armor, 400)
    const plated = winRate(RUSTED_PLATE.armor, 400)
    expect(plated).toBeGreaterThan(bare)
    expect(plated).toBeLessThanOrEqual(1)
  })

  /**
   * **art. 89's fork, inverted — an open arithmetic question, not a rule.**
   *
   * The fork is *a bone or the plate*, and it was designed around the bone
   * being the bigger of the two: armor is three off every blow, and the
   * sixth die used to be a whole extra shape. With the hand full at the
   * waking (art. 55 as amended 2026-08-06) the die is no longer an extra
   * shape — it is a better face on a shape you already had — and the plate
   * now wins the fork outright.
   *
   * This test asserts the state of things rather than the intent, so that
   * the gap is visible in the suite instead of living in somebody's head. It
   * is a tripwire under a decision the arithmetic agent has not made yet:
   * the levers are the plate's armor, the Gnawing's health, and the
   * travelers' distributions, and none of them is this file's to pull.
   */
  it('rates the plate above a found bone — art. 89’s fork, inverted (debt)', () => {
    const plated = winRate(RUSTED_PLATE.armor, 400)
    const found = winRate(BARE_BODY.armor, 400, FOUND_HAND)
    expect(plated).toBeGreaterThan(found)
    // Both sides are still worth taking, which is what keeps it a fork and
    // not a right answer wearing a question's coat.
    expect(found).toBeGreaterThan(winRate(BARE_BODY.armor, 400))
  })
})

// ── The new effect kinds, one at a time (card 30, art. 65) ─────────────

/**
 * The probe: the Gnawing's own health, script length, amounts and
 * escalation, with **every effect stripped**, so that adding exactly one
 * back measures that one and nothing else. It is not a horror anybody
 * fights — it is a control, and it is the only honest way to say what a
 * kind is worth.
 */
const PLAIN_SCRIPT: readonly Intent[] = GNAWING_SCRIPT.map((one) => ({
  verb: one.verb,
  amount: one.amount,
}))

const CONTROL: Horror = scriptedHorror(
  'horror.probe',
  GNAWING_HEALTH,
  PLAIN_SCRIPT,
  GNAWING_ESCALATION,
)

/** The same probe with one effect on its second intent, and nothing else. */
function probe(effect: IntentEffect): Horror {
  return scriptedHorror(
    'horror.probe',
    GNAWING_HEALTH,
    PLAIN_SCRIPT.map((one, at) => (at === 1 ? { ...one, effect } : one)),
    GNAWING_ESCALATION,
  )
}

const RUNS = 400

describe('lots — the new effect kinds move the number, and stay inside the band', () => {
  /**
   * The band this file already holds: a bare five is a fight and not a
   * formality (above 0.15), and the sixth bone takes a run past a coin
   * flip. A kind that pushes either side of that out is over budget.
   */
  const inBand = (bare: number, found: number, what: string): void => {
    expect(bare, `${what} bare`).toBeGreaterThan(0.15)
    expect(found, `${what} found`).toBeGreaterThan(0.5)
  }

  it('prices bind against the hand: one die fewer is worth about a tenth', () => {
    const control = winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS)
    const bound = probe({ kind: 'bind', rule: 'highest' })
    const bare = winRateOf(bound, BARE_HAND, BARE_BODY.armor, RUNS)
    const found = winRateOf(bound, FOUND_HAND, BARE_BODY.armor, RUNS)
    expect(bare).toBeLessThan(control)
    inBand(bare, found, 'bind')
  })

  it('prices bleed against time, once it is big enough to cost a turn', () => {
    const control = winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS)
    const bleeding = probe({ kind: 'bleed', amount: 4, turns: 3 })
    const bare = winRateOf(bleeding, BARE_HAND, BARE_BODY.armor, RUNS)
    const found = winRateOf(bleeding, FOUND_HAND, BARE_BODY.armor, RUNS)
    expect(bare).toBeLessThan(control)
    inBand(bare, found, 'bleed')
  })

  /**
   * A finding worth keeping rather than smoothing over: at a body of 26
   * against this script the player dies on the fourth intent whatever
   * happens, so a bleed that does not cost a whole turn does not move the
   * win rate at all. Three is invisible here and four is worth a fifth of
   * the fight. The step is a property of the body's size, not of the
   * effect, and it is why the shipped bleeds are authored at four.
   */
  it('shows the step: a bleed under a turn’s worth of health moves nothing', () => {
    const control = winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS)
    const small = winRateOf(
      probe({ kind: 'bleed', amount: 3, turns: 3 }),
      BARE_HAND,
      BARE_BODY.armor,
      RUNS,
    )
    expect(small).toBe(control)
  })

  it('charges hunger for hesitation only, and for nothing else', () => {
    const feeding = probe({ kind: 'hunger', amount: 12 })
    // A thumb that always claims is never charged. Exactly, not nearly:
    // art. 46 keeps the floor spendable, so the greedy player never once
    // ends a turn with nothing landed.
    expect(winRateOf(feeding, BARE_HAND, BARE_BODY.armor, RUNS)).toBe(
      winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS),
    )

    // And a thumb that holds out for a big claim is. The turtle is the
    // player this kind exists for, and against it the number moves.
    const turtle = claimIfWorth(40)
    const control = winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS, turtle)
    const bare = winRateOf(feeding, BARE_HAND, BARE_BODY.armor, RUNS, turtle)
    const found = winRateOf(feeding, FOUND_HAND, BARE_BODY.armor, RUNS, turtle)
    expect(bare).toBeLessThan(control)
    // The turtle is already a worse player than the greedy one, so the band
    // this is held to is the turtle's own: hunger must not be the thing that
    // makes turtling unplayable, only the thing that makes it cost.
    expect(bare).toBeGreaterThan(0.1)
    expect(found).toBeGreaterThan(0.5)
  })
})
