/**
 * Throwing dice, and nothing else.
 *
 * A core die is an ordinary d6 for this baseline. There is no profile, no face
 * effect, no keyword and no modifier hook: six faces, each of them a number
 * between one and six. That is the whole file, on purpose — the pattern the
 * dice land in is `hands.ts`, what the loadout adds is `loadout.ts`, and what
 * any of it costs is the reducer's.
 *
 * Everything here is pure and deterministic. A generator is handed in; none is
 * made. Nothing in this file reads game state and nothing in it decides an
 * outcome.
 *
 * ## The hand is six dice, always
 *
 * `min(6, bones)` is **repealed**. An attack throws six from the first fight
 * of a run to the last turn of the boss; bones are health and only health.
 * Damage no longer narrows the dice game, because the run's progression is
 * *replacement* — a found die takes one of the six slots — and a width that
 * shrank with the pile would keep taking those slots away again.
 */

import type { Rng } from '../game/rng.js'

/** What a core die can land on. Ordinary, for this baseline, and deliberately. */
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6

export const DIE_FACES: readonly DieValue[] = [1, 2, 3, 4, 5, 6]

/**
 * How many dice an attack throws. Six. Not a maximum — the number.
 *
 * There is no width control and no width rule: nothing anywhere reads the pile
 * to decide how many dice are in the air.
 */
export const HAND_DICE = 6

/** One throw plus two rerolls. There is no fourth. */
export const MAX_ROLLS = 3

/** One core die, thrown. The only place a face is chosen. */
export function rollDie(rng: Rng): DieValue {
  return (rng.int(6) + 1) as DieValue
}

/** `count` core dice, thrown together, in the order they were drawn. */
export function rollDice(count: number, rng: Rng): readonly DieValue[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => rollDie(rng))
}

/**
 * Which face of a die with `sides` faces came up. Zero-based.
 *
 * The one draw an iron die and an item die share, so a die whose faces are
 * blocks and a die whose faces are effects are the same act of throwing and
 * differ only in what their table says a face means.
 */
export function rollFace(sides: number, rng: Rng): number {
  return rng.int(Math.max(1, Math.floor(sides)))
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
