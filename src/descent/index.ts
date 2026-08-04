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
import type { WorldMark } from '../room/index.js'
import type { ItemId, Ledgers, RoomId, RunLedger } from '../state/index.js'
import { atBeat, carrying, movedTo, openedDoor } from '../state/index.js'

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
  /**
   * art. 68: a tap investigates, and what it investigates is the thing —
   * so a tappable stands somewhere in the world, and the region that answers
   * for it is derived from the same coordinates the prop is painted at.
   */
  readonly at: WorldMark
}

/** What the tray offers now: an act, a spell, a die, a door. */
export type Offer =
  | { readonly kind: 'act'; readonly act: Act }
  | { readonly kind: 'door'; readonly door: Door }

/** art. 7: outcomes, not clicks, are gated — on an item, a clue, an event. */
export interface Act {
  readonly id: string
  /** art. 66: a plain imperative verb, two words or fewer. Never prose. */
  readonly verb: string
  readonly needs: readonly ItemId[]
  /** What doing it puts in your hands. The skeleton's one act is a 'take'. */
  readonly gives: readonly ItemId[]
  /**
   * arts 3 and 33: some lock later in this chain demands what this act
   * gives. A required thing left lying in a room refuses the room's doors —
   * movement is forward only (art. 9), so walking past it would end the run
   * before the player could know it had. Optional treasure carries no flag
   * and may be walked past and lost (art. 4).
   */
  readonly required: boolean
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

/**
 * art. 70: the world remembers in pixels. This is everything mutable about
 * the room the renderer is allowed to read — content binds its props to
 * these fields, and the shell keys its frame cache on them, so an act that
 * changes state cannot leave the scene where it was.
 */
export interface SceneState {
  readonly room: RoomId
  /** Acts already done here: the taken key is gone from the floor. */
  readonly done: readonly string[]
  /** Doors already opened from here — an opened door stands open. */
  readonly opened: readonly string[]
  /** A wounded horror stays wounded: its health, or null if none stands. */
  readonly horror: number | null
}

/** What the room looks like right now, drawn out of the ledgers (art. 70). */
export function sceneStateOf(ledgers: Ledgers, book: RoomBook, room: RoomId): SceneState {
  const run = ledgers.run
  return {
    room,
    done: book.acts(room).filter((one) => done(run, one)).map((one) => one.id),
    opened: (run?.opened ?? []).filter((to) => to.startsWith(`${room}→`)),
    horror: run?.fight?.horrorHealth ?? null,
  }
}

/**
 * The cache key of a scene. The bug art. 70 names was a frame cached by room
 * id alone: taking the key repainted the room the key was still in. A frame
 * is the room *and* what has happened in it.
 */
export function sceneKey(state: SceneState): string {
  return [state.room, state.done.join('+'), state.opened.join('+'), state.horror ?? '-'].join('|')
}

/** How a door from a room is written down, so a room can read it back. */
export function doorKey(room: RoomId, door: Door): string {
  return `${room}→${door.to}`
}

/** art. 70: whether this door has already been opened from this room. */
export function isOpened(state: SceneState, room: RoomId, door: Door): boolean {
  return state.opened.includes(doorKey(room, door))
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

/**
 * arts 3 and 9: what this room still owes the run. Movement is forward only
 * and a lock downstream will demand these, so while one lies here unclaimed
 * every door in the room refuses to commit.
 *
 * It names the acts and not the things: the refusal is a stop, not a hint,
 * and the shell says one line that points at nothing.
 */
export function heldBack(ledgers: Ledgers, book: RoomBook, room: RoomId): readonly Act[] {
  const run = ledgers.run
  return book.acts(room).filter((one) => one.required && !done(run, one))
}

/**
 * art. 3: a run cannot become unwinnable by walking. True when every door in
 * this room is free to be committed — nothing required is still lying here.
 */
export function mayLeave(ledgers: Ledgers, book: RoomBook, room: RoomId): boolean {
  return heldBack(ledgers, book, room).length === 0
}

/** art. 9: forward only — the engine has no back. */
export function chooseDoor(ledgers: Ledgers, chain: Chain, book: RoomBook, door: Door): Ledgers {
  const run = ledgers.run
  if (run === null) throw new Error('no run to move')
  if (!canOpen(ledgers, door)) throw new Error('the door does not open')
  if (door.ends === true) throw new Error("the Warden's door ends the depth: finish, do not walk")
  if (!mayLeave(ledgers, book, run.at.room)) {
    throw new Error('art. 3: something here is still required')
  }
  const step = chain.nodes.findIndex((node) => node.room === door.to)
  // art. 70: the door you came through stands open behind you, and it is
  // written down before you move, so the room you left remembers it.
  const marked = openedDoor(run, doorKey(run.at.room, door))
  return {
    ...ledgers,
    run: movedTo(marked, { room: door.to, step: step < 0 ? run.at.step + 1 : step, beat: 0 }),
  }
}

/**
 * art. 70 for a door that changes no room: opening a fight-door is opening a
 * door, and the room it stands in has to show it.
 */
export function openDoor(ledgers: Ledgers, door: Door): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: openedDoor(run, doorKey(run.at.room, door)) }
}

/** art. 36: the candle you are on is part of where you are. */
export function remember(ledgers: Ledgers, bands: Bands): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: atBeat(run, beatIndex(bands)) }
}
