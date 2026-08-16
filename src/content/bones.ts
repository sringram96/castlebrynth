/**
 * The pile: what a run's life is made of.
 *
 * A bone is one object in a heap and the heap is the player's life. There is
 * no health field, no maximum-health field and no separate hit points: `bones`
 * is the number, and when it reaches zero the run is over.
 *
 * A bone is also, in a fight, an ordinary d6 — but that is `combat/roll.ts`'s
 * business, not this file's. What lives here is the arithmetic every rule that
 * gives bones back or takes them away has to agree on, and nothing else. There
 * is deliberately no profile table, no named-bone registry and no instance
 * type: this baseline has one kind of bone, and an abstraction layer built for
 * hypothetical future dice is an abstraction layer built for nobody.
 */

/**
 * The most bones a run may hold.
 *
 * A ceiling rather than a maximum-life field, because it is a content decision
 * and not a property of a run: a run does not carry "how many bones I could
 * have", it carries the bones it has. Everything that gives bones back — the
 * Font, a Vial — measures against this one number.
 */
export const BONE_CEILING = 30

/** What a run wakes up with. The full pile. */
export const STARTING_BONES = BONE_CEILING

/** How many bones a recovery may still put back. Never negative. */
export function roomToRecover(run: { readonly bones: number }): number {
  return Math.max(0, BONE_CEILING - run.bones)
}
