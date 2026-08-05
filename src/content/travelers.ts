/**
 * The travelers, and the dice they left (arts 86–87).
 *
 * Every die past the bare five belonged to someone who came down here before
 * you and did not come back. A die's shape is how its owner died: the
 * distribution is how they played, and the cost face is the mistake that
 * killed them. Reading the dice is one of the ways the labyrinth is learned —
 * you are looking at what it did to the people ahead of you.
 *
 * art. 87 is the acceptance test and not a decoration: each of these ships
 * with one sentence of origin (in `prose.ts`, with the rest of the words),
 * and if the sentence could not be written the die would not be here.
 *
 * art. 54: every power pays. The two dice that out-value the plain bone
 * carry cost faces — riders in the ordinary art. 51 sense, firing only when
 * their face is *spent in a claim*. Carrying a cost face is free; reaching
 * for it is not, which is the whole difference between a tax and a decision.
 */

import type { Die, DieId, Face, Rider, RiderId, Value } from '../lots/index.js'

const id = (s: string): DieId => s as DieId
const rider = (s: string): RiderId => s as RiderId

const face = (value: number, carries?: RiderId): Face =>
  carries === undefined ? { value: value as Value } : { value: value as Value, rider: carries }

// ── The cost faces (arts 51, 54, 86) ───────────────────────────────────

/** The push that finally did not pay: the low face, and what it costs. */
export const PUSH_RIDER = rider('rider.push')
/** What the strong throw opens, on the one who was saving it. */
export const BLEED_RIDER = rider('rider.bleed')

/**
 * art. 51: the numbers live with the rider and never inside the face, so a
 * face declares which rider it carries and the rider declares the price.
 */
export const THE_PUSH: Rider = { id: PUSH_RIDER, onUse: { kind: 'wound', amount: 3 } }
export const THE_BLEED: Rider = { id: BLEED_RIDER, onUse: { kind: 'wound', amount: 2 } }

export const TRAVELER_RIDERS: readonly Rider[] = [THE_PUSH, THE_BLEED]

// ── The three (art. 86) ────────────────────────────────────────────────

/**
 * **The one who kept pushing.** Faces {1, 5, 5, 6, 6, 6}: four faces above
 * the plain bone's best and one below its worst, which is exactly how the
 * owner played — high, and again, and again. The 1 is the throw that did not
 * pay, and spending it in a claim costs 3.
 *
 * Sum 29 against the plain bone's 21 (art. 54: over budget, and it says so
 * on its own face).
 */
export const THE_PUSHER: Die = {
  id: id('bone.pusher'),
  body: 6,
  faces: [face(1, PUSH_RIDER), face(5), face(5), face(6), face(6), face(6)],
}

/**
 * **The one who was careful.** Faces {2, 3, 3, 4, 4, 5}: no 6 to reach for
 * and no 1 to be caught by, summing to exactly the plain bone's 21. It pays
 * for its steadiness with its ceiling rather than with a cost face, so it
 * carries none.
 *
 * The point of it is legible from the die alone: nothing here could have
 * gone wrong, and it went wrong anyway.
 */
export const THE_CAREFUL: Die = {
  id: id('bone.careful'),
  body: 6,
  faces: [face(2), face(3), face(3), face(4), face(4), face(5)],
}

/**
 * **The one who ran.** Faces {2, 3, 4, 5, 6, 6}: a clean spread with two
 * sixes on top of it — strong, and never spent until there was nowhere left
 * to go. Both sixes bite: claiming one costs 2.
 *
 * Sum 26 against 21, and the price sits on the strength rather than beside
 * it — which is the difference between this die and the pusher's, and the
 * difference between the two deaths.
 */
export const THE_RUNNER: Die = {
  id: id('bone.runner'),
  body: 6,
  faces: [face(2), face(3), face(4), face(5), face(6, BLEED_RIDER), face(6, BLEED_RIDER)],
}

/** The three, for the audit and for the catalog that places them. */
export const TRAVELER_DICE: readonly Die[] = [THE_PUSHER, THE_CAREFUL, THE_RUNNER]
