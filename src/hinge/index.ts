/**
 * src/hinge — fight-doors, the advance, death routing (art. 30).
 *
 * The doorway between the two engines: exploration delivers you to
 * violence, violence returns you to exploration, and the forward-only
 * ratchet governs both.
 *
 * Stubs only.
 */

import type { Door } from '../gen/index.js'
import type { Fight, Horror, Resolution } from '../lots/index.js'
import type { Ledgers } from '../state/index.js'
import type { Prop } from '../room/index.js'

const unimplemented = (): never => {
  throw new Error('not implemented')
}

/** A door that is a fight. Opening it does not change rooms. */
export interface FightDoor {
  readonly door: Door
  readonly horror: Horror
}

/**
 * art. 30: there is no battle screen. A fight is the room with the thing
 * come close — the horror advances to the near depth and fills the lens,
 * the tray turns to combat, and the word keeps narrating.
 */
export interface Advance {
  /** The horror as a prop at the near depth, painted into the same room. */
  readonly prop: Prop
  /** How far in it has come, 0 at the mouth and 1 at the lens. */
  readonly closeness: number
}

export function openFightDoor(ledgers: Ledgers, door: FightDoor): Fight {
  return unimplemented()
}

/** The advance is a motion that matters, so it never undoes itself (art. 28). */
export function advance(fight: Fight): Advance {
  return unimplemented()
}

/** Where a resolved turn sends the player: on, out, or to the Crossing. */
export type Exit = 'fight-continues' | 'room-continues' | 'death' | 'fled'

export function routeTurn(fight: Fight, resolution: Resolution): Exit {
  return unimplemented()
}

/**
 * Death: the run burns, one line goes into the Book of Ends, the doors
 * reseed, and you wake at the Crossing (arts 11, 32).
 */
export function routeDeath(ledgers: Ledgers, cause: string): Ledgers {
  return unimplemented()
}
