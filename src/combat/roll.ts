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
 *
 * ## A slot is thrown off its own die
 *
 * There are eight core dice now and a slot may hold any of them, so `rollHand`
 * reads each slot's own `faces` table rather than assuming `1..6`. That is the
 * **entire** mechanical footprint of the crooked dice: a face index and a lookup.
 * Every face is still an integer one to six, so nothing downstream — the sum, the
 * shapes, the strips, the solver — learns that more than one table exists.
 */

import { coreDie } from '../content/dice.js'
import type { CoreDieId } from '../content/dice.js'
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

/** One plain bone, thrown. An ordinary d6 and nothing else. */
export function rollDie(rng: Rng): DieValue {
  return (rng.int(6) + 1) as DieValue
}

/** `count` plain bones, thrown together, in the order they were drawn. */
export function rollDice(count: number, rng: Rng): readonly DieValue[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => rollDie(rng))
}

/**
 * One slot of the hand, thrown off **its own die's faces**.
 *
 * This is the whole of what a crooked die is. It picks a face index and reads the
 * table; it does not modify, reroll, weight or post-process anything, so there is
 * no rule here for a die to carry and nowhere to write one. Every face is an
 * integer one to six — asserted in content — so the value it answers with is an
 * ordinary die value and `hands.ts` never learns that eight of these exist.
 *
 * It costs exactly one draw, the same as a plain bone, which is what keeps a
 * replay of a seed identical for a hand of six bones: `rng.int(6)` is
 * `rng.int(6)` whichever table it indexes.
 */
export function rollSlot(die: CoreDieId, rng: Rng): DieValue {
  const faces = coreDie(die).faces
  return faces[rng.int(faces.length)] ?? 1
}

/**
 * The hand, thrown.
 *
 * Six slots, each off its own die, left to right. **Nothing reads the pile**: the
 * hand is six from the first fight to the last turn of the boss, and what being
 * hurt costs is exchanges rather than dice.
 */
export function rollHand(hand: readonly CoreDieId[], rng: Rng): readonly DieValue[] {
  return hand.map((die) => rollSlot(die, rng))
}

/**
 * Throw again, keeping what was held — each slot off its own die.
 *
 * The positional contract is why the hand has to be passed in: a held die stays in
 * the lane it was standing in, so slot three is thrown from *slot three's* die
 * however many of the six have been replaced.
 */
export function rerollHand(
  dice: readonly DieValue[],
  held: readonly number[],
  hand: readonly CoreDieId[],
  rng: Rng,
): readonly DieValue[] {
  const keep = new Set(canonicalHeld(held, dice.length))
  return dice.map((value, index) =>
    keep.has(index) ? value : rollSlot(hand[index] ?? 'bone', rng),
  )
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
