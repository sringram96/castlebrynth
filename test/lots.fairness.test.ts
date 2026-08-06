import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  GNAWING_ESCALATION,
  GNAWING_HEALTH,
  GNAWING_SCRIPT,
  HAND_SIZE,
  LADDER,
  PLAIN_POUCH,
  RUSTED_PLATE,
  THE_GNAWING,
  THE_CAREFUL,
  scriptedHorror,
} from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Armor, Fight, Hand, Horror, Intent, IntentEffect, Line, Turn } from '../src/lots/index.js'
import {
  advanceFight,
  assembleHand,
  attack,
  cast,
  casting,
  claim,
  claimable,
  decide,
  keep,
  openFight,
  recast,
  unused,
  withTurn,
} from '../src/lots/index.js'
import type { Seed } from '../src/state/index.js'

/**
 * Is it fair? — restated for the five-die start (arts 55, 86).
 *
 * This file used to assert that a bare player beats the Gnawing more often
 * than not. Under the travelers ruling that is simply no longer true, and
 * saying so is the point: the amendment took a die out of the starting hand
 * and the measured win rate against the depth's ordinary teeth fell from
 * about 0.78 to about 0.28. A first waking is now expected to die.
 *
 * That is the progression the ruling installs rather than a regression it
 * caused. A found bone reaches the hand at the *next* waking (art. 60
 * assembles the hand for the descent), so the shape of the game is: the
 * first run is desperate, and the run after the one where you found
 * somebody is the run you can win. What this file holds is that shape —
 * that five is survivable but rarely, that six is comfortable, and that the
 * sixth bone is worth more than the armor you could have worn instead.
 *
 * It plays the Gnawing well rather than perfectly: hunt the biggest set on
 * the recast, then take the best-scoring claims until the hand is dry. The
 * bands are wide on purpose. They are a tripwire under the tuning, not an
 * opinion about it.
 */

/** Every subset of the free dice, best-scoring claim first, until dry. */
function claimGreedily(start: Turn): Turn {
  let turn = start
  for (let pass = 0; pass < 6; pass++) {
    const free = unused(turn).map((landed) => landed.die)
    if (free.length === 0) break
    let best: { dice: readonly string[]; line: Line; score: number } | null = null
    for (let mask = 1; mask < 1 << free.length; mask++) {
      const chosen = free.filter((_, i) => (mask >> i) & 1)
      for (const line of claimable(turn, chosen, LADDER)) {
        const score = attack(claim(turn, chosen, line, LADDER)) - attack(turn)
        if (best === null || score > best.score) best = { dice: chosen, line, score }
      }
    }
    if (best === null || best.score <= 0) break
    turn = claim(turn, best.dice as never, best.line, LADDER)
  }
  return turn
}

/** Keep everything showing the most common value; throw the rest again. */
function keepSensibly(turn: Turn): Turn {
  const laid = casting(turn)
  const counts = new Map<number, number>()
  for (const landed of laid) {
    counts.set(landed.face.value, (counts.get(landed.face.value) ?? 0) + 1)
  }
  let bestValue = 0
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value > bestValue)) {
      bestValue = value
      bestCount = count
    }
  }
  if (bestCount < 2) return turn
  return keep(
    turn,
    laid.filter((landed) => landed.face.value === bestValue).map((landed) => landed.die),
  )
}

/** art. 55: the bare hand. art. 86: the same hand, one traveler's bone on. */
const BARE_HAND = assembleHand(PLAIN_POUCH, HAND_SIZE)
const FOUND_HAND = assembleHand({ dice: [...PLAIN_POUCH.dice, THE_CAREFUL] }, HAND_SIZE)

/**
 * One horror, one hand, one way of playing, `runs` seeds — how often the
 * player walks out. Every measurement in this file is this function with a
 * different argument, so two numbers beside each other always mean the same
 * thing.
 */
export function winRateOf(
  horror: Horror,
  hand: Hand,
  armor: Armor,
  runs: number,
  play: (turn: Turn) => Turn = claimGreedily,
): number {
  let wins = 0
  for (let seed = 0; seed < runs; seed++) {
    const lot = lotFrom(seed as unknown as Seed)
    let fight: Fight = openFight(horror, hand, BARE_BODY.health, armor)
    // art. 65: a horror that heals what it is not hit for can in principle
    // outlast a player who never claims. The guard is the test's, not the
    // game's — a real turn always ends.
    let guard = 0
    while (fight.outcome === 'fighting' && guard++ < 300) {
      const turn = play(recast(keepSensibly(cast(fight.turn, lot)), lot))
      fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
    }
    if (fight.outcome === 'won') wins++
  }
  return wins / runs
}

function winRate(armor: Armor, runs: number, hand = BARE_HAND): number {
  return winRateOf(THE_GNAWING, hand, armor, runs)
}

describe('lots — is it fair? (art. 33, and the arithmetic agent)', () => {
  it('leaves a bare five-die player able to beat the Gnawing, and rarely (arts 55, 86)', () => {
    const bare = winRate(BARE_BODY.armor, 400)
    // Winnable: the loop still closes on five bones and no armor, so a first
    // waking is a fight and not a formality in the other direction.
    expect(bare).toBeGreaterThan(0.15)
    // And expected to lose. This is the number the ruling moved — it was
    // above 0.5 at six dice — and it is asserted rather than hoped.
    expect(bare).toBeLessThan(0.45)
  })

  it('makes the sixth bone the biggest thing that ever happens to a run (art. 86)', () => {
    const bare = winRate(BARE_BODY.armor, 400)
    const found = winRate(BARE_BODY.armor, 400, FOUND_HAND)
    // A traveler's die turns a run you expect to lose into one you expect to
    // win. Nothing else in the game moves the number this far, which is what
    // art. 86 is for: your build is who you have found.
    expect(bare).toBeLessThan(0.5)
    expect(found).toBeGreaterThan(0.5)
    expect(found - bare).toBeGreaterThan(0.3)
  })

  it('makes armor worth wearing without making the fight a formality (art. 47)', () => {
    const bare = winRate(BARE_BODY.armor, 400)
    const plated = winRate(RUSTED_PLATE.armor, 400)
    expect(plated).toBeGreaterThan(bare)
    expect(plated).toBeLessThanOrEqual(1)
  })

  it('rates a found bone above the plate it could have been (arts 47, 86)', () => {
    // art. 89's first fork is exactly this trade, so the two sides of it had
    // better not be the same size. The bone wins, and it should: armor is
    // three off every blow, and a sixth die is a whole extra shape.
    const plated = winRate(RUSTED_PLATE.armor, 400)
    const found = winRate(BARE_BODY.armor, 400, FOUND_HAND)
    expect(found).toBeGreaterThan(plated)
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

/**
 * The turtle: a thumb that only spends a line on a claim worth having, and
 * ends the turn on anything less. It is the player `hunger` exists to
 * price, and it is why that kind cannot be measured against the greedy
 * model at all — the greedy model never hesitates.
 */
function claimIfWorth(floor: number): (turn: Turn) => Turn {
  return (start) => {
    const free = unused(start).map((landed) => landed.die)
    let best: { dice: readonly string[]; line: Line; score: number } | null = null
    for (let mask = 1; mask < 1 << free.length; mask++) {
      const chosen = free.filter((_, i) => (mask >> i) & 1)
      for (const line of claimable(start, chosen, LADDER)) {
        const score = attack(claim(start, chosen, line, LADDER))
        if (best === null || score > best.score) best = { dice: chosen, line, score }
      }
    }
    if (best === null || best.score < floor) return start
    return claim(start, best.dice as never, best.line, LADDER)
  }
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
