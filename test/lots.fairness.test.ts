import { describe, expect, it } from 'vitest'

import {
  ALL_RIDERS,
  BARE_BODY,
  GNAWING_ESCALATION,
  GNAWING_HEALTH,
  GNAWING_SCRIPT,
  GNAWING_SCRIPT as SCRIPT,
  HAND_SIZE,
  KINDLED_HEALTH,
  LEVEL_CAP,
  MARROW_HEALTH,
  PLAIN_POUCH,
  RUSTED_PLATE,
  SILT_MOTHER_HEALTH,
  THE_CAREFUL,
  THE_GNAWING,
  THE_KINDLED,
  THE_MARROW,
  THE_PUSHER,
  THE_RUNNER,
  THE_SILT_MOTHER,
  THE_WARDEN,
  TRAVELER_DICE,
  scriptedHorror,
} from '../src/content/index.js'
import type { Armor, Die, Goods, Hand, Horror, Intent, IntentEffect } from '../src/lots/index.js'
import { assembleHand } from '../src/lots/index.js'
import { claimIfWorth, statsOf, winRateOf } from './policy.js'

/**
 * **The company every row is measured through** (the levels wave). It used
 * to be left out, and leaving it out is not neutral: a rider fires only
 * when its face is spent in a claim (art. 51), so a fight fought with no
 * riders at all is a fight where **the cost faces never fire** — and the
 * cost faces are exactly what art. 54 charges a traveler's die for. The
 * Runner measured four points better than it plays. The shell's own
 * `goods()` always carries them; so does this.
 */
const COMPANY: Goods = { talismans: [], riders: ALL_RIDERS, levelCap: LEVEL_CAP }

/**
 * Is it fair? — restated for the levels wave (card 89, the arithmetic pass).
 *
 * **What this file used to assert is what the wave was called to fix.** It
 * held a bare six-die player to *winning* the ordinary fight comfortably
 * (0.78) and it asserted, as a named debt, that art. 89's first fork was
 * **inverted** — the Rusted Plate outrated every bone in the game. Both are
 * gone. The pass moved seven numbers and only the seven the wave named: the
 * body, the Gnawing's health, the region uniques' health, the Warden's, the
 * travelers' distributions, the cost faces those distributions carry, and
 * the bleeds that are taxes on a body that changed size.
 *
 * **The bands are the wave's, stated at its three reference hands.** They
 * are wide on purpose and they are a tripwire under the tuning rather than
 * an opinion about it — the numbers they are set around are measured in
 * `test/report.ts` and published in DESIGN.md, and this file is where a
 * later pass has to come and move them deliberately.
 *
 * It plays the Gnawing well rather than perfectly: hunt the biggest set on
 * the recast, then take the best-scoring claims until the hand is dry.
 */

/** art. 55: the bare hand. Six plain bones, full at the waking. */
const BARE_HAND = assembleHand(PLAIN_POUCH, HAND_SIZE)

/** art. 86, art. 60: a find is a *replacement* now — one bone for one bone. */
function handWith(...found: readonly Die[]): Hand {
  return assembleHand({ dice: [...found, ...PLAIN_POUCH.dice] }, HAND_SIZE)
}

const FOUND_HAND = handWith(THE_CAREFUL)

function winRate(armor: Armor, runs: number, hand = BARE_HAND): number {
  return winRateOf(THE_GNAWING, hand, armor, runs, undefined, COMPANY)
}

const RUNS = 600

describe('lots — is it fair? (art. 33, and the arithmetic agent)', () => {
  /**
   * **The wave's headline band.** The ordinary fight from the second room is
   * a fight a first waking is expected to win, and expected to feel: about
   * three in five, over five to seven turns. The turn count is half the
   * band and not decoration — card 89's finding was that fights ended in
   * about three and a half turns, so the escalation never came round and
   * the horror's arc never happened.
   */
  it('makes the ordinary Gnawing a fight of five to seven turns, won three times in five', () => {
    const stats = statsOf(THE_GNAWING, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    expect(stats.winRate).toBeGreaterThan(0.5)
    expect(stats.winRate).toBeLessThan(0.7)
    expect(stats.meanTurns).toBeGreaterThan(5)
    expect(stats.meanTurns).toBeLessThan(7.5)
  })

  /**
   * **The horror's arc, which is what the turns were bought for.** The
   * script comes round in the majority of fights, so the escalation is a
   * thing that happens rather than a field nobody reads; and the
   * telegraphed blow — BELLOW, the biggest hit in the depth — lands in the
   * large majority of the fights that reach the turn it is scheduled for.
   *
   * *Reaching the turn* is the honest denominator. Counting the fights that
   * outlive the whole script instead would make this test pass by
   * construction, because a fight on its seventh turn has obviously had its
   * fifth.
   */
  it('lets the script come round, and the telegraphed blow land (art. 119 §3)', () => {
    const stats = statsOf(THE_GNAWING, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    expect(stats.escalated / stats.runs).toBeGreaterThan(0.5)
    expect(stats.ranFull / stats.runs).toBeGreaterThan(0.5)
    expect(stats.telegraphLanded / stats.ranFull).toBeGreaterThan(0.8)
  })

  /**
   * **art. 89's fork, no longer inverted.** The fork is *a bone or the
   * plate*, and under the five-bone start the bone was a whole extra shape,
   * so it won outright; under six-at-the-waking it became a better face on
   * a shape you already had, and the plate won outright. Neither is a fork.
   *
   * The lever was the one the debt named: **the travelers' distributions**.
   * The runner went from a die measurably *worse* than a plain bone — two
   * cost faces on the only two faces worth reaching for — to the best bone
   * in the game, and it now sits within a few points of the plate.
   */
  it('rates the best bone and the plate within a few points — the fork, restored', () => {
    const bare = winRate(BARE_BODY.armor, RUNS)
    const plated = winRate(RUSTED_PLATE.armor, RUNS)
    const bone = winRate(BARE_BODY.armor, RUNS, handWith(THE_RUNNER))
    // Both sides are worth taking, which is what keeps it a fork.
    expect(plated).toBeGreaterThan(bare)
    expect(bone).toBeGreaterThan(bare)
    // And neither is the right answer: a few points, in either direction.
    expect(Math.abs(plated - bone)).toBeLessThan(0.08)
  })

  /** Every traveler's die is worth swapping a plain bone out for (art. 86). */
  it('leaves every traveler’s die worth the bone it displaces', () => {
    const bare = winRate(BARE_BODY.armor, RUNS)
    for (const die of TRAVELER_DICE) {
      expect(winRate(BARE_BODY.armor, RUNS, handWith(die)), die.id as string).toBeGreaterThan(bare)
    }
  })

  /**
   * **The uniques come up to the Gnawing's level, and above it.** They sat
   * at 112 and 128 against its 150, so arriving in a region made a depth
   * *safer* — the exact opposite of what art. 78 says arrival costs. They
   * are now at or above the ordinary teeth, and the found hand meets them
   * at two in five to one in two.
   */
  it('puts every region’s unique at or above the ordinary teeth (arts 78, 83)', () => {
    for (const health of [MARROW_HEALTH, SILT_MOTHER_HEALTH, KINDLED_HEALTH]) {
      expect(health).toBeGreaterThanOrEqual(GNAWING_HEALTH)
    }
    for (const unique of [THE_MARROW, THE_SILT_MOTHER, THE_KINDLED]) {
      const found = winRateOf(unique, FOUND_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
      expect(found, unique.id).toBeGreaterThan(0.35)
      expect(found, unique.id).toBeLessThan(0.6)
      // And the ordinary teeth are the easier fight, which is what makes a
      // region's unique worth being afraid of.
      expect(found, unique.id).toBeLessThan(
        winRateOf(THE_GNAWING, FOUND_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY),
      )
    }
  })

  /**
   * **The wall.** A first-ever run bouncing off the last door is the design
   * working — provided the bounce deposits, which `test/depth.ts` and the
   * ratchet row in DESIGN.md are what measure.
   */
  it('makes the keeper a wall to a first waking (card 31, the wave’s band)', () => {
    expect(winRateOf(THE_WARDEN, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)).toBeLessThan(
      0.15,
    )
  })

  /**
   * **And the wall is a gate, not a ceiling.** What a run deposits has to
   * move the number it bounced off, or death is not the progression system
   * the pitch says it is. The band here is the *direction* and its size:
   * the wave asked for about a half and the measured answer is about a
   * third, which DESIGN.md reports as a miss with its reason (the median
   * haul a whole failed run leaves is two goods, and against this keeper a
   * bone is worth a third of what armour is).
   */
  it('lets what a failed run deposited move the wall, and by a lot', () => {
    const bare = winRateOf(THE_WARDEN, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    const returning = winRateOf(
      THE_WARDEN,
      handWith(THE_PUSHER),
      RUSTED_PLATE.armor,
      RUNS,
      undefined,
      COMPANY,
    )
    expect(returning).toBeGreaterThan(bare * 2)
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
const PLAIN_SCRIPT: readonly Intent[] = SCRIPT.map((one) => ({
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

/**
 * The band the kinds are held to, restated for the wave's own numbers: the
 * bare hand still has a fight (above 0.2) and a found hand is still ahead
 * of it. A kind that pushes either side of that out is over budget.
 */
const inBand = (bare: number, found: number, what: string): void => {
  expect(bare, `${what} bare`).toBeGreaterThan(0.2)
  expect(found, `${what} found`).toBeGreaterThan(bare)
}

describe('lots — the new effect kinds move the number, and stay inside the band', () => {
  it('prices bind against the hand: one die fewer is worth about a tenth', () => {
    const control = winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    const bound = probe({ kind: 'bind', rule: 'highest' })
    const bare = winRateOf(bound, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    const found = winRateOf(bound, FOUND_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    expect(bare).toBeLessThan(control)
    inBand(bare, found, 'bind')
  })

  it('prices bleed against time, once it is big enough to cost a turn', () => {
    const control = winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    const bleeding = probe({ kind: 'bleed', amount: 9, turns: 3 })
    const bare = winRateOf(bleeding, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    const found = winRateOf(bleeding, FOUND_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    expect(bare).toBeLessThan(control)
    inBand(bare, found, 'bleed')
  })

  /**
   * A finding worth keeping rather than smoothing over, **and it inverted
   * with the body** (card 89).
   *
   * The step is a property of the body's **headroom over the script**, not
   * of the effect: a bleed changes nothing until its total pushes the
   * player across the intent they were surviving by. At twenty-six that
   * headroom was wide — the player died on the fourth intent whatever
   * happened — so a bleed of three was invisible and four was worth a fifth
   * of the fight. At sixty-four the body survives the Gnawing's whole
   * script and dies to the loop coming round with **three points to
   * spare**, so the step has moved to two and a bleed of one over three
   * turns is already a turn shorter.
   *
   * That is the argument, not a smaller number: the same law, read against a
   * body that now sits near a threshold instead of far from one. It is also
   * why the shipped bleeds came up from four to five and six — a bleed that
   * cannot cost a turn cannot cost anything, and the turn is what a bleed is
   * priced against.
   */
  it('shows the step: a bleed inside the body’s headroom moves nothing', () => {
    const control = winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)
    const inside = winRateOf(
      probe({ kind: 'bleed', amount: 2, turns: 1 }),
      BARE_HAND,
      BARE_BODY.armor,
      RUNS,
      undefined,
      COMPANY,
    )
    expect(inside).toBe(control)
    // And one point past it is a whole turn's worth of difference.
    const past = winRateOf(
      probe({ kind: 'bleed', amount: 3, turns: 1 }),
      BARE_HAND,
      BARE_BODY.armor,
      RUNS,
      undefined,
      COMPANY,
    )
    expect(past).toBeLessThan(control)
  })

  it('charges hunger for hesitation only, and for nothing else', () => {
    const feeding = probe({ kind: 'hunger', amount: 30 })
    // A thumb that always claims is never charged. Exactly, not nearly:
    // art. 46 keeps the floor spendable, so the greedy player never once
    // ends a turn with nothing landed.
    expect(winRateOf(feeding, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY)).toBe(
      winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS, undefined, COMPANY),
    )

    // And a thumb that holds out for a big claim is. The turtle is the
    // player this kind exists for, and against it the number moves.
    const turtle = claimIfWorth(40)
    const control = winRateOf(CONTROL, BARE_HAND, BARE_BODY.armor, RUNS, turtle, COMPANY)
    const bare = winRateOf(feeding, BARE_HAND, BARE_BODY.armor, RUNS, turtle, COMPANY)
    expect(bare).toBeLessThan(control)
    // The turtle is already a worse player than the greedy one, so the band
    // this is held to is the turtle's own: hunger must not be the thing that
    // makes turtling unplayable, only the thing that makes it cost.
    expect(bare).toBeGreaterThan(0.1)
  })
})

/** The script is unchanged by the pass, and the file says which way it went. */
describe('lots — what the arithmetic pass moved', () => {
  it('left the Gnawing’s intents where they were, and moved its health', () => {
    expect(GNAWING_SCRIPT.map((one) => one.amount)).toEqual([7, 6, 5, 9, 16, 8])
    // The fight got longer because the *body* did, which is what makes a
    // fight's length a thing content can tune without touching a horror.
    expect(BARE_BODY.health).toBeGreaterThan(GNAWING_SCRIPT.reduce((sum, one) => sum + one.amount, 0))
  })
})
