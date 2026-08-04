/**
 * src/descent — playing a room: candles, taps, acts, doors (arts 5–9, 29).
 *
 * Stubs only. Every string this module moves is authored in `src/content`
 * and bound by rules/voice.md; none of them is written here.
 */

import type { Door } from '../gen/index.js'
import type { ItemId, Ledgers, RoomId } from '../state/index.js'

const unimplemented = (): never => {
  throw new Error('not implemented')
}

/**
 * art. 29: three bands. The word at the top, borderless, fading after a
 * beat — presentation fades, knowledge doesn't. The world is the frame.
 * The tray holds what the moment offers.
 */
export interface Bands {
  readonly word: Beat | null
  readonly room: RoomId
  readonly tray: readonly Offer[]
}

/** One candle of text at a time: a beat is ~45 words or fewer (voice). */
export interface Beat {
  readonly text: string
  readonly index: number
  readonly last: boolean
}

/** art. 6: everything ever clickable is always clickable. */
export interface Tappable {
  readonly id: string
  /** Concrete and singular (voice). */
  readonly noun: string
}

/** What the tray offers now: an act, a spell, a die, a door. */
export type Offer =
  | { readonly kind: 'act'; readonly act: Act }
  | { readonly kind: 'door'; readonly door: Door }

/** art. 7: outcomes, not clicks, are gated — on an item, a clue, an event. */
export interface Act {
  readonly id: string
  readonly verb: string
  readonly needs: readonly ItemId[]
}

export function enterRoom(ledgers: Ledgers, room: RoomId): Bands {
  return unimplemented()
}

/** art. 5: tapping never harms; looking is free and always answers (art. 6). */
export function look(ledgers: Ledgers, target: Tappable): Beat {
  return unimplemented()
}

/** art. 29: tap to recall the word. Presentation fades, knowledge doesn't. */
export function recall(bands: Bands): Beat | null {
  return unimplemented()
}

export function nextBeat(bands: Bands): Bands {
  return unimplemented()
}

/** Acting is not tapping: it has gates and consequences (art. 7). */
export function act(ledgers: Ledgers, chosen: Act): Ledgers {
  return unimplemented()
}

/** art. 31: the road ahead is only ever the doors in front of you. */
export function doors(bands: Bands): readonly Door[] {
  return unimplemented()
}

/** art. 9: forward only — the engine has no back. */
export function chooseDoor(ledgers: Ledgers, door: Door): Ledgers {
  return unimplemented()
}
