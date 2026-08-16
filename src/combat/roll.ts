/**
 * Throwing bones, and nothing else.
 *
 * A bone is an ordinary d6 for this baseline. There is no profile, no face
 * effect, no keyword and no modifier hook: six faces, each of them a number
 * between one and six, and the only thing that varies is *how many* of them
 * are in the air. That is the whole file, on purpose — the pattern the dice
 * land in is `hands.ts`, and what it costs is the reducer's.
 *
 * Everything here is pure and deterministic. A generator is handed in; none is
 * made. Nothing in this file reads game state and nothing in it decides an
 * outcome.
 */

import type { Rng } from '../game/rng.js'

/** What a bone can land on. Ordinary, for this baseline, and deliberately. */
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6

export const DIE_FACES: readonly DieValue[] = [1, 2, 3, 4, 5, 6]

/** The most bones one attack may have in the air. */
export const MAX_ACTIVE_DICE = 6

/** One throw plus two rerolls. There is no fourth. */
export const MAX_ROLLS = 3

/** How many bones an attack throws, given what is left of the pile. */
export function activeDice(bones: number): number {
  return Math.max(0, Math.min(MAX_ACTIVE_DICE, Math.floor(bones)))
}

/** One bone, thrown. The only place a face is chosen. */
export function rollDie(rng: Rng): DieValue {
  return (rng.int(6) + 1) as DieValue
}

/** `count` bones, thrown together, in the order they were drawn. */
export function rollDice(count: number, rng: Rng): readonly DieValue[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => rollDie(rng))
}

/**
 * Which held positions are real.
 *
 * Canonical: unique, whole, in range, sorted ascending. A hold is a thought
 * the view was editing and it arrives at the reducer as a bare list of
 * numbers, so it is put in order here rather than trusted — a stale index from
 * a wider roll, the same die named twice, a negative or a fraction from a
 * hand-made dispatch, all reduce to the same answer whichever way they arrive.
 *
 * A fraction is **dropped rather than rounded**. `1.5` is not a die; guessing
 * which of two it meant would be the reducer inventing a decision the player
 * never made.
 */
export function canonicalHeld(
  held: readonly number[],
  count: number,
): readonly number[] {
  const seen = new Set<number>()
  for (const index of held) {
    if (Number.isInteger(index) && index >= 0 && index < count) seen.add(index)
  }
  return [...seen].sort((a, b) => a - b)
}

/**
 * Throw again, keeping what was held.
 *
 * Positions are preserved: a held die stays in the lane it was standing in, so
 * the tray does not reshuffle under the thumb and a held six is visibly the
 * same six. Everything not held is thrown, left to right, off the generator
 * handed in.
 */
export function rerollDice(
  dice: readonly DieValue[],
  held: readonly number[],
  rng: Rng,
): readonly DieValue[] {
  const keep = new Set(canonicalHeld(held, dice.length))
  return dice.map((value, index) => (keep.has(index) ? value : rollDie(rng)))
}
