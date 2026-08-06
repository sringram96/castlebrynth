/**
 * The pick — which door the thumb is holding (art. 71, strengthened by the
 * ruling of 2026-08-06).
 *
 * **The act strip serves the last look.** The defect the ruling closes is
 * that a picked door stayed picked: you tapped an urn, the door verb was
 * still sitting in the strip, and one press took you through a door you were
 * not looking at. Attention moved and the commit did not.
 *
 * So tapping any thing releases the pick — the outline goes, the door's verbs
 * leave the strip — and a door verb may only ever commit the door currently
 * picked. **No pick means no door verb.** Re-picking is one tap, and that one
 * extra tap is the whole declared cost: art. 5's spirit is that nothing
 * irreversible happens by accident, and commitment is only drama when the
 * commit is the thing you meant.
 *
 * Arriving in a room still picks the first door offered. The ruling is about
 * attention *moving*, and nothing has moved yet — a room you walk into and
 * walk out of costs what it always did.
 *
 * The summons (art. 68) is untouched, and deliberately so: a verb looking has
 * summoned lives on the ledger and survives the pick's release, because the
 * summons is knowledge and the pick is attention.
 */

import type { Door } from '../gen/index.js'

/** Which door the thumb is holding, by the index that *is* the choice. */
export type Pick = number | null

/** What the thumb just touched in the world. */
export type Touch =
  | { readonly kind: 'door'; readonly door: Door }
  /** Anything else with pixels: a prop, a socket's thing, the room's own. */
  | { readonly kind: 'thing'; readonly id: string }

/**
 * The pick after a tap. A door picks itself; **anything else releases**, which
 * is the whole of the ruling and the reason it lives in one function rather
 * than in the shell's memory of when to clear a variable.
 */
export function picking(touch: Touch): Pick {
  return touch.kind === 'door' ? touch.door.at : null
}

/**
 * The pick on walking into a room: the first door it offers, or none where it
 * offers none.
 */
export function onArrival(ahead: readonly Door[]): Pick {
  return ahead[0]?.at ?? null
}

/**
 * The door a door verb may commit right now — and there is at most one.
 *
 * A pick that names no door in front of you is no pick: the strip cannot
 * offer a way through a door the room is not offering (art. 31).
 */
export function pickedDoor(pick: Pick, ahead: readonly Door[]): Door | null {
  if (pick === null) return null
  return ahead.find((door) => door.at === pick) ?? null
}

/** art. 70: whether this door is the one wearing the pick's outline. */
export function isPicked(pick: Pick, door: Door): boolean {
  return pick !== null && pick === door.at
}
