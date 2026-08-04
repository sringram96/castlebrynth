/**
 * src/descent — playing a room: candles, taps, acts, doors (arts 5–9, 29).
 *
 * Every string this module moves is authored in `src/content` and bound by
 * rules/voice.md; none of them is written here. The `RoomBook` is the port
 * that keeps it that way — content answers what a room says; this module
 * only decides when it is said.
 */

import type { Chain, Door } from '../gen/index.js'
import { nodeAt } from '../gen/index.js'
import type { ItemId, Ledgers, RoomId, RunLedger } from '../state/index.js'
import { atBeat, carrying, movedTo } from '../state/index.js'

/**
 * art. 29: three bands. The word at the top, borderless, fading after a
 * beat — presentation fades, knowledge doesn't. The world is the frame.
 * The tray holds what the moment offers.
 */
export interface Bands {
  readonly word: Beat | null
  readonly room: RoomId
  /** Every candle this room has, so recall costs nothing (art. 29). */
  readonly beats: readonly string[]
  readonly tray: readonly Offer[]
  /** art. 6: everything ever clickable is always clickable. */
  readonly tappables: readonly Tappable[]
}

/** One candle of text at a time: a beat is ~45 words or fewer (voice). */
export interface Beat {
  readonly text: string
  /** Which candle. A look answers with −1: it is not one of the room's. */
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
  /** What doing it puts in your hands. The skeleton's one act is a 'take'. */
  readonly gives: readonly ItemId[]
}

/**
 * What a room says. Content implements it; the engine never reads a string
 * it did not receive through this port.
 */
export interface RoomBook {
  beats(room: RoomId): readonly string[]
  tappables(room: RoomId): readonly Tappable[]
  /** art. 6: looking is free and always answers. */
  look(room: RoomId, target: string): string
  acts(room: RoomId): readonly Act[]
}

export function enterRoom(
  ledgers: Ledgers,
  chain: Chain,
  book: RoomBook,
  room: RoomId,
): Bands {
  const run = ledgers.run
  const beats = book.beats(room)
  const at = run !== null && run.at.room === room ? run.at.beat : 0
  const node = nodeAt(chain, room)
  const tray: Offer[] = [
    ...book
      .acts(room)
      .filter((act) => !done(run, act))
      .map((act) => ({ kind: 'act' as const, act })),
    ...(node?.doors ?? []).map((door) => ({ kind: 'door' as const, door })),
  ]
  return { word: beatAt(beats, at), room, beats, tray, tappables: book.tappables(room) }
}

function done(run: RunLedger | null, act: Act): boolean {
  if (run === null || act.gives.length === 0) return false
  return act.gives.every((item) => run.carried.includes(item))
}

function beatAt(beats: readonly string[], index: number): Beat | null {
  const text = beats[Math.min(index, beats.length - 1)]
  if (text === undefined) return null
  return { text, index: Math.min(index, beats.length - 1), last: index >= beats.length - 1 }
}

/** art. 5: tapping never harms; looking is free and always answers (art. 6). */
export function look(book: RoomBook, bands: Bands, target: Tappable): Beat {
  return { text: book.look(bands.room, target.id), index: -1, last: true }
}

/** art. 29: tap to recall the word. Presentation fades, knowledge doesn't. */
export function recall(bands: Bands): Beat | null {
  return bands.word
}

/** One candle at a time. The last candle stays lit — there is no next. */
export function nextBeat(bands: Bands): Bands {
  const at = (bands.word?.index ?? -1) + 1
  return { ...bands, word: beatAt(bands.beats, at) }
}

/** Which candle the bands are on, for the run to write down (art. 36). */
export function beatIndex(bands: Bands): number {
  return Math.max(0, bands.word?.index ?? 0)
}

/** Acting is not tapping: it has gates and consequences (art. 7). */
export function act(ledgers: Ledgers, chosen: Act): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  if (!chosen.needs.every((item) => run.carried.includes(item))) return ledgers
  let moved = run
  for (const item of chosen.gives) moved = carrying(moved, item)
  return { ...ledgers, run: moved }
}

/** art. 31: the road ahead is only ever the doors in front of you. */
export function doors(bands: Bands): readonly Door[] {
  return bands.tray.flatMap((offer) => (offer.kind === 'door' ? [offer.door] : []))
}

/**
 * art. 7: outcomes, not clicks, are gated. A door you cannot open is still
 * a door you may always tap — it simply does not open (art. 5).
 */
export function canOpen(ledgers: Ledgers, door: Door): boolean {
  const held = new Set<string>(ledgers.run?.carried ?? [])
  return door.demands.every((key) => held.has(key))
}

/** art. 9: forward only — the engine has no back. */
export function chooseDoor(ledgers: Ledgers, chain: Chain, door: Door): Ledgers {
  const run = ledgers.run
  if (run === null) throw new Error('no run to move')
  if (!canOpen(ledgers, door)) throw new Error('the door does not open')
  if (door.ends === true) throw new Error("the Warden's door ends the depth: finish, do not walk")
  const step = chain.nodes.findIndex((node) => node.room === door.to)
  return {
    ...ledgers,
    run: movedTo(run, { room: door.to, step: step < 0 ? run.at.step + 1 : step, beat: 0 }),
  }
}

/** art. 36: the candle you are on is part of where you are. */
export function remember(ledgers: Ledgers, bands: Bands): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: atBeat(run, beatIndex(bands)) }
}
