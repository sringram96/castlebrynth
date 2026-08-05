/**
 * src/descent — playing a room: candles, taps, acts, doors (arts 5–9, 29,
 * 82–83).
 *
 * Every string this module moves is authored in `src/content` and bound by
 * rules/voice.md; none of them is written here. The `RoomBook` is the port
 * that keeps it that way — content answers what a room says; this module
 * only decides when it is said.
 *
 * Two of the drift's articles land here rather than in `src/gen`, because
 * both are about a room under the thumb and not about the arrangement:
 *
 * - **art. 82** — a room may be dealt twice. What you took *here* is gone
 *   from here, not from every copy, so scene state keys on the instance;
 *   what you learned about the room applies to both, so knowledge keys on
 *   the template.
 * - **art. 83** — a room's authored prose never assumes what fills its
 *   sockets. The room says its own words and each socket says its own, and
 *   this module is where the two are laid end to end.
 */

import type { Chain, ChainNode, Dealer, Door, Fill } from '../gen/index.js'
import { deal, nodeAt } from '../gen/index.js'
import type { RegionId } from '../gen/index.js'
import type { WorldMark } from '../room/index.js'
import type { InstanceId, ItemId, Ledgers, RoomId, RunLedger } from '../state/index.js'
import {
  atBeat,
  carrying,
  deedKey,
  didHere,
  movedTo,
  openedDoor,
  tookDoor,
} from '../state/index.js'

/**
 * art. 29: three bands. The word at the top, borderless, fading after a
 * beat — presentation fades, knowledge doesn't. The world is the frame.
 * The tray holds what the moment offers.
 */
export interface Bands {
  readonly word: Beat | null
  /** art. 82: the template — what knowledge and the renderer key on. */
  readonly room: RoomId
  /** art. 82: the instance — what scene state and the deeds key on. */
  readonly instance: InstanceId
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
  /** What doing it puts in your hands. */
  readonly gives: readonly ItemId[]
  /**
   * arts 3 and 80: some lock ahead of this room demands what this act gives,
   * and the dealer put it here for exactly that reason. A required thing
   * left lying in a room refuses the room's doors — movement is forward only
   * (art. 9), so walking past it would end the run before the player could
   * know it had. Optional treasure carries no flag and may be walked past
   * and lost (art. 4).
   */
  readonly required: boolean
}

/**
 * art. 83: what a socket says for itself. A room does not speak for what
 * stands in it — this is how the encounter speaks instead, and it is the
 * whole reason a dozen rooms can feel like thirty.
 */
export interface SocketWords {
  readonly beats: readonly string[]
  readonly tappables: readonly Tappable[]
  readonly acts: readonly Act[]
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
  /**
   * art. 83: sockets carry their own words. The room is handed over so the
   * socket's things can stand where this room keeps that socket — not so the
   * room can speak for them.
   */
  socket(room: RoomId, fill: Fill): SocketWords
  /** art. 78: what the depth says when it arrives somewhere. */
  arrival(region: RegionId): readonly string[]
}

/**
 * art. 70: the world remembers in pixels. This is everything mutable about
 * the room the renderer is allowed to read — content binds its props to
 * these fields, and the shell keys its frame cache on them, so an act that
 * changes state cannot leave the scene where it was.
 */
export interface SceneState {
  /** art. 82: the template is what is painted. */
  readonly room: RoomId
  /** art. 82: the instance is what is remembered. */
  readonly instance: InstanceId
  /** Acts already done here: the taken key is gone from the floor. */
  readonly done: readonly string[]
  /** Doors already opened from here — an opened door stands open. */
  readonly opened: readonly string[]
  /** A wounded horror stays wounded: its health, or null if none stands. */
  readonly horror: number | null
  /** art. 83: what stands in this room's sockets, so the paint can show it. */
  readonly fills: readonly Fill[]
}

/** art. 83: the acts a room offers, its own and its sockets' together. */
export function actsIn(book: RoomBook, node: ChainNode): readonly Act[] {
  return [
    ...book.acts(node.room),
    ...node.fills.flatMap((fill) => book.socket(node.room, fill).acts),
  ]
}

/** art. 83: the same, for what may be tapped. */
export function tappablesIn(book: RoomBook, node: ChainNode): readonly Tappable[] {
  return [
    ...book.tappables(node.room),
    ...node.fills.flatMap((fill) => book.socket(node.room, fill).tappables),
  ]
}

/**
 * The candles of a room as dealt: the arrival first when this is the room
 * that announces one (art. 78), then the room's own words, then each
 * socket's.
 */
export function beatsIn(book: RoomBook, node: ChainNode): readonly string[] {
  return [
    ...(node.announces === null ? [] : book.arrival(node.announces)),
    ...book.beats(node.room),
    ...node.fills.flatMap((fill) => book.socket(node.room, fill).beats),
  ]
}

/** What the room looks like right now, drawn out of the ledgers (art. 70). */
export function sceneStateOf(ledgers: Ledgers, book: RoomBook, node: ChainNode): SceneState {
  const run = ledgers.run
  return {
    room: node.room,
    instance: node.instance,
    done: actsIn(book, node)
      .filter((one) => done(run, node.instance, one))
      .map((one) => one.id),
    opened: (run?.opened ?? []).filter((key) => key.startsWith(`${node.instance}→`)),
    horror: run?.fight?.horrorHealth ?? null,
    fills: node.fills,
  }
}

/**
 * The cache key of a scene. The bug art. 70 names was a frame cached by room
 * id alone: taking the key repainted the room the key was still in. A frame
 * is the room *and* what has happened in it — and under art. 82 it is the
 * *instance*, so the second alcove is not painted with the first one's
 * losses.
 */
export function sceneKey(state: SceneState): string {
  return [
    state.instance,
    state.done.join('+'),
    state.opened.join('+'),
    state.horror ?? '-',
    state.fills.map((fill) => `${fill.socket}=${fill.encounter}`).join('+'),
  ].join('|')
}

/** How a door from a room is written down, so a room can read it back. */
export function doorKey(instance: InstanceId, door: Door): string {
  return `${instance}→${door.at}`
}

/** art. 70: whether this door has already been opened from this room. */
export function isOpened(state: SceneState, door: Door): boolean {
  return state.opened.includes(doorKey(state.instance, door))
}

export function enterRoom(
  ledgers: Ledgers,
  chain: Chain,
  book: RoomBook,
  at: InstanceId,
): Bands {
  const node = nodeAt(chain, at)
  if (node === null) throw new Error(`no room dealt at ${at}`)
  const run = ledgers.run
  const beats = beatsIn(book, node)
  const on = run !== null && run.at.instance === at ? run.at.beat : 0
  const tray: Offer[] = [
    ...actsIn(book, node)
      .filter((one) => !done(run, at, one))
      .map((one) => ({ kind: 'act' as const, act: one })),
    ...node.doors.map((door) => ({ kind: 'door' as const, door })),
  ]
  return {
    word: beatAt(beats, on),
    room: node.room,
    instance: at,
    beats,
    tray,
    tappables: tappablesIn(book, node),
  }
}

/** art. 82: done *here*. Two alcoves each hold their own key. */
function done(run: RunLedger | null, instance: InstanceId, one: Act): boolean {
  if (run === null) return false
  return run.did.includes(deedKey(instance, one.id))
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
  // art. 82: the deed is written against this instance, and the items it
  // gives are written against the run — one is about here, the other is
  // about you.
  let moved = didHere(run, run.at.instance, chosen.id)
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
 * and a lock downstream will demand these — the dealer placed them here
 * because of that lock (art. 80) — so while one lies here unclaimed every
 * door in the room refuses to commit.
 *
 * It names the acts and not the things: the refusal is a stop, not a hint,
 * and the shell says one line that points at nothing.
 */
export function heldBack(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
): readonly Act[] {
  const run = ledgers.run
  return actsIn(book, node).filter((one) => one.required && !done(run, node.instance, one))
}

/**
 * art. 3: a run cannot become unwinnable by walking. True when every door in
 * this room is free to be committed — nothing required is still lying here.
 */
export function mayLeave(ledgers: Ledgers, book: RoomBook, node: ChainNode): boolean {
  return heldBack(ledgers, book, node).length === 0
}

/**
 * Walking through a door: the run as it stands after it, and the run as it
 * has now been dealt. They come back together because under art. 79 they are
 * one act — the room behind a door does not exist until the door is opened,
 * so committing the door is what deals it.
 */
export interface Walk {
  readonly ledgers: Ledgers
  readonly chain: Chain
}

/**
 * art. 9: forward only — the engine has no back. art. 36: the choice goes
 * into the history first, and the room the player arrives in is the replay
 * of that history, so there is never a moment where the two disagree.
 */
export function chooseDoor(
  ledgers: Ledgers,
  chain: Chain,
  book: RoomBook,
  door: Door,
  dealer: Dealer,
): Walk {
  const run = ledgers.run
  if (run === null) throw new Error('no run to move')
  if (!canOpen(ledgers, door)) throw new Error('the door does not open')
  if (door.ends === true) throw new Error("the Warden's door ends the depth: finish, do not walk")
  const here = nodeAt(chain, run.at.instance)
  if (here === null) throw new Error(`no room dealt at ${run.at.instance}`)
  if (!mayLeave(ledgers, book, here)) {
    throw new Error('art. 3: something here is still required')
  }
  // art. 70: the door you came through stands open behind you, and it is
  // written down before you move, so the room you left remembers it.
  const marked = openedDoor(tookDoor(run, door.at), doorKey(run.at.instance, door))
  const dealt = deal(run.seed, run.depth, dealer.catalog, dealer.grammar, marked.history)
  const arrived = dealt.nodes.at(-1)
  if (arrived === undefined || arrived.step <= here.step) {
    throw new Error('the door commits no room: the depth is spent')
  }
  return {
    ledgers: {
      ...ledgers,
      run: movedTo(marked, {
        room: arrived.room,
        instance: arrived.instance,
        step: arrived.step,
        beat: 0,
      }),
    },
    chain: dealt,
  }
}

/**
 * art. 70 for a door that changes no room: opening a fight-door is opening a
 * door, and the room it stands in has to show it.
 */
export function openDoor(ledgers: Ledgers, door: Door): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: openedDoor(run, doorKey(run.at.instance, door)) }
}

/** art. 36: the candle you are on is part of where you are. */
export function remember(ledgers: Ledgers, bands: Bands): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: atBeat(run, beatIndex(bands)) }
}
