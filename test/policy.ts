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

import { LADDER } from '../src/content/index.js'
import type { Line, Turn } from '../src/lots/index.js'
import { attack, casting, claim, claimable, keep, unused } from '../src/lots/index.js'

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
