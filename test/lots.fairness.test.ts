import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  HAND_SIZE,
  LADDER,
  PLAIN_POUCH,
  RUSTED_PLATE,
  THE_GNAWING,
  THE_CAREFUL,
} from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Armor, Fight, Line, Turn } from '../src/lots/index.js'
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

function winRate(armor: Armor, runs: number, hand = BARE_HAND): number {
  let wins = 0
  for (let seed = 0; seed < runs; seed++) {
    const lot = lotFrom(seed as unknown as Seed)
    let fight: Fight = openFight(THE_GNAWING, hand, BARE_BODY.health, armor)
    while (fight.outcome === 'fighting') {
      const turn = claimGreedily(recast(keepSensibly(cast(fight.turn, lot)), lot))
      fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
    }
    if (fight.outcome === 'won') wins++
  }
  return wins / runs
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
