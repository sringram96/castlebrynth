/**
 * A thumb inside a fight, as a function.
 *
 * `test/drift.ts` holds the policies that stand for how somebody walks; this
 * holds the ones that stand for how somebody plays a turn. They live in one
 * file because the claim every measurement in this repo makes is *the same
 * model, a different argument* — two copies of "plays it well" would be two
 * models, and a table built from both would be comparing nothing.
 *
 * Nothing here is content. It plays the ladder well rather than perfectly.
 */

import { BARE_BODY, LADDER } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Armor, Fight, Hand, Horror, Line, Turn } from '../src/lots/index.js'
import {
  advanceFight,
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

/** Every subset of the free dice, best-scoring claim first, until dry. */
export function claimGreedily(start: Turn): Turn {
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

/**
 * The turtle: it only spends a line on a claim worth having, and ends the
 * turn on anything less. It is the player art. 65's `hunger` exists to
 * price, and the greedy model cannot measure that kind at all because the
 * greedy model never hesitates.
 */
export function claimIfWorth(floor: number): (turn: Turn) => Turn {
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

/** Keep everything showing the most common value; throw the rest again. */
export function keepSensibly(turn: Turn): Turn {
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

/**
 * One horror, one hand, one way of playing, `runs` seeds — how often the
 * player walks out of that one fight at full health.
 *
 * Every per-horror number in DESIGN.md is this function with a different
 * argument, so two numbers beside each other always mean the same thing.
 * What it cannot answer is what a *depth* costs; `test/depth.ts` does that.
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
