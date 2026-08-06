/**
 * The word band's third state (the answer wave, card 69).
 *
 * art. 29 gives the band two jobs and the shell only ever had room for one
 * of them. It showed **what you are looking at** and **what is coming**, and
 * it had nowhere to put **what just happened** — so an act's result was
 * written into the same slot a tap wrote into, and every act without an
 * authored line fell straight through to the candle underneath. The candle
 * underneath is the one describing the thing you have just picked up, which
 * is how *Take bone* came to answer *"There is a bone in it."*
 *
 * So the band is three states with a priority, and the priority is the whole
 * of the module:
 *
 * > **an act's answer, then what you are looking at, then the ambient.**
 *
 * The ambient is whatever the moment says on its own — the candle in a room,
 * the intent in a fight, the door's line at the threshold. It is always
 * there, which is why it is not nullable: art. 69 says silence is a bug, and
 * the bottom of a priority order is where a silence would hide.
 *
 * Nothing here paints and nothing here is authored. Every string arrives
 * from `src/content`, and the only thing this file decides is which of them
 * the player is reading.
 */

/** What the band is holding over the ambient, if anything. */
export interface Held {
  /** art. 70: what the last press did. Prose confirms; pixels prove. */
  readonly answer: string | null
  /** art. 68: the tap *is* the inspection, and this is the whole of it. */
  readonly look: string | null
}

/** Nothing held: the moment speaks for itself. */
export const HUSHED: Held = { answer: null, look: null }

/**
 * An act has answered. It clears the look, because attention has moved from
 * the thing to what was done to it — the same reasoning art. 71 uses when a
 * tap releases a picked door.
 */
export function answered(text: string | null): Held {
  return text === null || text === '' ? HUSHED : { answer: text, look: null }
}

/**
 * A tap has answered. It clears the answer for the same reason in the other
 * direction: an answer left standing under a fresh look would win the
 * priority and the player would be reading a reply to a press they have
 * already moved on from.
 */
export function noticed(text: string): Held {
  return text === '' ? HUSHED : { answer: null, look: text }
}

/** The line the player is actually reading. */
export function bandLine(held: Held, ambient: string): string {
  return held.answer ?? held.look ?? ambient
}

/**
 * Whether something is standing over the ambient right now.
 *
 * The band draws a mark when there is a candle still to come (art. 29), and
 * a held line is the same promise in a different shape: there is something
 * underneath this, and one tap gets to it.
 */
export function holding(held: Held): boolean {
  return held.answer !== null || held.look !== null
}
