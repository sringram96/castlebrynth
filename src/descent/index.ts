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

export type { Pick, Touch } from './pick.js'
export { isPicked, onArrival, picking, pickedDoor } from './pick.js'
import type { RegionId } from '../gen/index.js'
import type { Good } from '../lots/index.js'
import type { WorldMark } from '../room/index.js'
import type {
  Clue,
  EncounterId,
  InstanceId,
  ItemId,
  Ledgers,
  PermanentLedger,
  RoomId,
  RunLedger,
} from '../state/index.js'
import {
  CROSSING,
  atBeat,
  carrying,
  collect,
  decline,
  deedKey,
  didHere,
  hasLooked,
  learn,
  movedTo,
  openedDoor,
  // `remember` is taken here by the candle you are on; the ritual this
  // aliases is art. 84's, and it is about an encounter and not a beat.
  lookedAt,
  remember as markMemory,
  tookDoor,
  tookIntoRun,
  wounded,
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

/**
 * art. 120: **what a press costs.** The Lots promise the intent before you
 * commit; the Descent promises the price. Every field is content's — the
 * engine knows only that a price comes out of the body and stops short of
 * the last of it, because a run ends to a horror, to the Warden or to a
 * door, never to a question.
 *
 * One kind ships. A new kind — a spoiled thing, a window closing (art. 4) —
 * comes here and says so, and the acceptance test in `test/price.test.ts`
 * walks whatever this interface declares rather than a list somebody has to
 * remember to extend.
 */
export interface Price {
  /** What the press takes out of the body. Zero is not a price. */
  readonly health: number
}

/**
 * art. 120's **return bar**, declared so it can be tested rather than
 * trusted. Every priced act returns at least one of these, and *lose four
 * health and receive ordinary loot* is not on the list.
 *
 * `knowledge` is art. 88's payload and the cheapest legal one, so it should
 * be the most common: an act that sharpens a question is worth more than one
 * that answers it.
 */
export type Payload = 'knowledge' | 'leverage' | 'relationship' | 'change' | 'object'

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
  /**
   * art. 40 (ruled): what share of what is missing this act gives back. The
   * Sanctum's breath is half; the Savior's mercy is all of it. The number is
   * tuning and lives in content — the engine only knows that a share of
   * missing health is what a mercy restores, and that the rounding goes the
   * player's way.
   *
   * Absent on every act that is not a mercy, which is nearly all of them.
   */
  readonly heals?: number
  /**
   * art. 84: the encounter this act belongs to, when doing it is a thing
   * that encounter should remember. The meeting itself is written down by
   * standing in the room (`meet`); this is the mark left by the deed.
   */
  readonly remembers?: EncounterId
  /**
   * arts 49, 86: what doing this puts on the *permanent* ledger — a dead
   * traveler's die, a talisman, a wearable. `gives` is the run's pocket and
   * burns with the run; this is the collection and does not (art. 11), so it
   * crosses by the `collect` ritual and by nothing else.
   *
   * art. 56: collecting is also how a signature is named, and the ritual
   * does that on its own — nothing here has to know it is the first.
   */
  readonly takes?: readonly Good[]
  /**
   * art. 89: the acts this one closes. A fork is two goods in one socket,
   * and taking one forfeits the other — so the deed that takes writes the
   * deed that lost, in the same instance and on the same beat.
   *
   * It is act ids and not encounters because the forfeiture is a *deed*: it
   * is what the room has to stop offering and stop painting, and both of
   * those read the deeds (arts 70, 82).
   */
  readonly forfeits?: readonly string[]
  /**
   * art. 68 (strengthened): the thing in the world this act is about.
   *
   * **An act about a thing does not exist until the thing has been tapped.**
   * The tap is the inspection — there is no other one, and there are no
   * inspect buttons and no tooltips — and the verb is what looking summons.
   * A player can no longer take a thing they have never looked at.
   *
   * An act with no `about` is about the room rather than about a thing in
   * it, and is offered on arrival like any other.
   */
  readonly about?: string
  /**
   * arts 68, 97 (card 67): which door of this room this act turns the lock
   * of. Absent on everything that is not a lock, which is nearly all of them.
   *
   * The defect this closes is that the key opened the Warden's door **by
   * existing**. art. 80 constructs the whole depth around placing that key
   * and the payoff was a passive inventory check — looking is free and
   * commitment is drama, and a lock that opens itself is neither. So a
   * locked door is a *deed-gated* door: the deed this act writes (art. 82,
   * per instance) is what the door reads, and until it is written the door
   * offers no way on at all.
   *
   * It is a door index rather than a boolean because that is what
   * generalises: every future lock is a deed-gated door, and no future lock
   * can regress to a passive check without deleting this field.
   */
  readonly unlocks?: number
  /**
   * art. 120: what this press costs, if it costs anything. Absent on nearly
   * every act, which is the point of the ones it is not absent on.
   *
   * The price reaches the player through the *thing's look* and never
   * through the verb (art. 66 gives a verb two words), so a priced act is
   * also always an act `about` something: there is no way to be offered one
   * without having tapped the thing it is about (art. 68), and that tap is
   * where the number is said.
   */
  readonly price?: Price
  /**
   * art. 120's return bar. A priced act declares what it pays in, and
   * `test/price.test.ts` holds it to actually paying it — a `knowledge`
   * claim with no clue behind it is a failing test rather than a
   * disappointment.
   */
  readonly pays?: readonly Payload[]
  /**
   * arts 10, 88: what doing this puts on the permanent ledger as knowledge.
   * A clue keys on a thing and never on a place, so it survives death and
   * the reseed (art. 34) — which is the whole of why knowledge is a payload
   * worth paying health for.
   */
  readonly learns?: readonly Clue[]
  /**
   * art. 84 (extended): the flag the *not* doing of this writes.
   *
   * It is on the act rather than on the thing because what is refused is the
   * offer, and the offer is the verb. It is written when the run walks out
   * of the room with this act undone (`chooseDoor`) and when a fork forfeits
   * it (art. 89), and it is written to the permanent, because a refusal
   * outlives the run that made it.
   *
   * Absent on most acts. The vocabulary is small and reusable by design: a
   * flag lands in two or three later moments, and content shares one flag
   * across the acts that mean the same refusal.
   */
  readonly refused?: string
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
  /**
   * `done` for the same reason `socket` takes it: one room's own tappables
   * depend on what has happened in it. The Warden's hall has a keeper
   * standing in it once the key has turned and not after it falls, and the
   * keeper stands in no socket (art. 37), so the room itself is what has to
   * answer. The default is *nothing has happened here*, which is the right
   * answer for every caller asking what a room is rather than what this one
   * has become.
   */
  tappables(room: RoomId, done?: readonly string[]): readonly Tappable[]
  /**
   * art. 6: looking is free and always answers.
   *
   * art. 69, and card 67: **it answers either way.** What is carried comes
   * in because one answer in the game depends on it — a lock names what it
   * wants, or, if the key is on you, names what fits. That is the first half
   * of the ceremony and the reason the second half can be a summons rather
   * than a hint (art. 68). The engine passes the run's pocket and reads
   * nothing out of it; which answers care is content's business alone.
   */
  /**
   * art. 118 (`withheld`): and it answers a third way. When an act about
   * this thing exists but is not being offered — a mercy a whole body
   * cannot drink — the look is where the reason lives, because a withheld
   * verb has nowhere to put one. Content authors the second sentence under
   * its own key; the engine only says which of the two states it is in.
   *
   * art. 120 (`price`): and a fourth. When the act about this thing costs
   * something, **the look is where the price is said** — the verb is two
   * words (art. 66) and cannot carry a number, and art. 68 abolished the
   * button that could. It is the tap that summons the verb, so there is no
   * order of presses in which the verb arrives before its price.
   *
   * It is the *number* rather than a flag, and for the reason art. 42 gives
   * about an intent: a price the player cannot count is a price they cannot
   * weigh. Content puts it in the sentence; the engine works it out and
   * never writes a word of it. Zero means no act about this thing is being
   * offered at a price.
   *
   * arts 10, 84 (`remembered`): and a fifth, which is not about this room at
   * all — **what he still knows.** The clues on the permanent ledger and the
   * refusals written beside them, in one list, because they are one thing to
   * a thing being looked at: a bone you walked past once is a bone you
   * recognise, and so is a drop you have already put your head into. The
   * engine hands the marks over and reads nothing out of them; which things
   * care is content's business, exactly as it is for the pocket.
   */
  look(
    room: RoomId,
    target: string,
    carried?: readonly ItemId[],
    withheld?: boolean,
    price?: number,
    remembered?: readonly string[],
  ): string
  acts(room: RoomId): readonly Act[]
  /**
   * art. 83: sockets carry their own words. The room is handed over so the
   * socket's things can stand where this room keeps that socket — not so the
   * room can speak for them.
   *
   * card 95 (`done`): and what has happened *here* goes with it, because a
   * socket may be finished with. A horror beaten in the room it stands in
   * stops being a candle, a tappable and a prop, all three (art. 70) — and
   * until this wave that state was unreachable, because winning walked you out
   * of the room before you could stand in it.
   *
   * It defaults to nothing so that every caller asking about a room rather
   * than about a moment in one is unchanged, and so that the one caller who
   * must pass it (`enterRoom`) is the only one who has to know.
   */
  socket(room: RoomId, fill: Fill, done?: readonly string[]): SocketWords
  /** art. 78: what the depth says when it arrives somewhere. */
  arrival(region: RegionId): readonly string[]
  /**
   * The words of one line of the Book of Ends — a thing he wrote down
   * (rules/voice.md, the scrawl). The engine asks for it by cause and never
   * knows what it says, exactly as it never knows what a room says.
   */
  scrawl(cause: string): string
}

/**
 * art. 70: the world remembers in pixels. This is everything mutable about
 * the room the renderer is allowed to read — content binds its props to
 * these fields, and the shell keys its frame cache on them, so an act that
 * changes state cannot leave the scene where it was.
 */
/** art. 97: a threshold's state, which varies where its grammar may not. */
export interface DoorState {
  /** Which door of this room it is — the index the paint and the thumb share. */
  readonly at: number
  /** art. 70: already opened from here, so it stands open. */
  readonly open: boolean
  /** art. 97: it wants a key, so it wears the lock on its frame. */
  readonly locked: boolean
  /**
   * arts 70, 97 (card 67): the lock has been turned, here. The world
   * remembers in pixels — the lock hangs open on the frame rather than
   * quietly ceasing to be drawn, because a lock that vanishes is a lock
   * that was never there.
   */
  readonly turned: boolean
  /** art. 37: the Warden's door ends the depth and is its own object. */
  readonly ends: boolean
}

export interface SceneState {
  /** art. 82: the template is what is painted. */
  readonly room: RoomId
  /** art. 82: the instance is what is remembered. */
  readonly instance: InstanceId
  /** Acts already done here: the taken key is gone from the floor. */
  readonly done: readonly string[]
  /** Doors already opened from here — an opened door stands open. */
  readonly opened: readonly string[]
  /**
   * arts 31, 97: the doors this room offers, in the order it offers them.
   * The paint needs them because every door is a threshold and every
   * threshold is drawn — a door with a tap region and no pixels is the
   * defect art. 97 was written about.
   */
  readonly doors: readonly DoorState[]
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

/**
 * art. 83: the same, for what may be tapped.
 *
 * card 95 (`done`): a socket that is finished with offers nothing to tap. The
 * default is *nothing has happened here*, which is the right answer for every
 * caller asking what a room is rather than what this one has become.
 */
export function tappablesIn(
  book: RoomBook,
  node: ChainNode,
  done: readonly string[] = [],
): readonly Tappable[] {
  return [
    ...book.tappables(node.room, done),
    ...node.fills.flatMap((fill) => book.socket(node.room, fill, done).tappables),
  ]
}

/**
 * The candles of a room as dealt: the waking's scrawl first where there is
 * one, then the arrival when this is the room that announces one (art. 78),
 * then the room's own words, then each socket's.
 *
 * `waking` is the last line of the Book of Ends — the last thing he wrote
 * before he forgot everything else (rules/voice.md: the amnesia is canon).
 * It is passed in rather than read here because the Book is on the permanent
 * ledger and this function knows about a room, not about a player.
 */
export function beatsIn(
  book: RoomBook,
  node: ChainNode,
  waking: string | null = null,
  done: readonly string[] = [],
): readonly string[] {
  return [
    ...(waking === null ? [] : [waking]),
    ...(node.announces === null ? [] : book.arrival(node.announces)),
    ...book.beats(node.room),
    ...node.fills.flatMap((fill) => book.socket(node.room, fill, done).beats),
  ]
}

/** What the room looks like right now, drawn out of the ledgers (art. 70). */
export function sceneStateOf(ledgers: Ledgers, book: RoomBook, node: ChainNode): SceneState {
  const run = ledgers.run
  return {
    room: node.room,
    instance: node.instance,
    // art. 70: every deed done here, and not only the ones that are still
    // acts on the strip. art. 89's forfeiture is a deed with no verb behind
    // it — it is what the room lost rather than what you pressed — and a
    // scene that could only see verbs could not paint it.
    done: (run?.did ?? [])
      .filter((key) => key.startsWith(`${node.instance}|`))
      .map((key) => key.slice((node.instance as string).length + 1)),
    opened: (run?.opened ?? []).filter((key) => key.startsWith(`${node.instance}→`)),
    horror: run?.fight?.horrorHealth ?? null,
    fills: node.fills,
    // art. 97: every door offered is a threshold that gets drawn. What varies
    // between them is state and never grammar.
    doors: node.doors.map((door) => ({
      at: door.at,
      open: (run?.opened ?? []).includes(doorKey(node.instance, door)),
      locked: door.demands.length > 0,
      // art. 70: a turned lock hangs open, and it does so here rather than
      // in the shell, because the paint is a function of the scene state
      // and of nothing the shell happens to be holding.
      turned: turnedHere(ledgers, book, node, door),
      ends: door.ends === true,
    })),
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
    // art. 97: how many thresholds and what state each is in are both pixels,
    // so a frame cached without them is a frame with the wrong doors in it.
    // card 67: and a turned lock is a pixel like the rest of them.
    state.doors
      .map(
        (door) =>
          `${door.at}${door.open ? 'o' : ''}${door.locked ? 'k' : ''}${door.turned ? 't' : ''}`,
      )
      .join('+'),
    state.horror ?? '-',
    state.fills
      .map((fill) => `${fill.socket}=${fill.encounter}${fill.orElse === undefined ? '' : `/${fill.orElse}`}`)
      .join('+'),
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
  // card 95: what the room has become, not only what it is. A socket may be
  // finished with — the horror that stood in it is down — and both what the
  // room says and what it offers to the thumb have to know (art. 70).
  const done = sceneStateOf(ledgers, book, node).done
  const beats = beatsIn(book, node, wakingScrawl(ledgers, book, node), done)
  const on = run !== null && run.at.instance === at ? run.at.beat : 0
  const tray: Offer[] = [
    ...offering(ledgers, book, node).map((one) => ({ kind: 'act' as const, act: one })),
    ...node.doors.map((door) => ({ kind: 'door' as const, door })),
  ]
  return {
    word: beatAt(beats, on),
    room: node.room,
    instance: at,
    beats,
    tray,
    tappables: tappablesIn(book, node, done),
  }
}

/**
 * **The waking opens on the last thing he wrote** (the mind wave).
 *
 * Death is forgetting, and the permanent ledger is what is written down and
 * what he still knows (art. 11, rules/voice.md). So the first candle of a
 * run is the most recent line of the Book of Ends — his own handwriting,
 * found again by a man who does not remember writing it. On a first waking
 * that is the oldest scrawl there is, and it is the first thing the game
 * ever says.
 *
 * It is the Crossing and only the Crossing, because art. 37 makes the
 * Crossing the room that opens every run: the waking is a place, not a
 * moment the shell has to remember it is in.
 */
function wakingScrawl(ledgers: Ledgers, book: RoomBook, node: ChainNode): string | null {
  if ((node.room as string) !== (CROSSING as string)) return null
  const last = ledgers.permanent.bookOfEnds.at(-1)
  if (last === undefined) return null
  const said = book.scrawl(last.cause)
  return said === '' ? null : said
}

/**
 * **The acts a room is offering right now** — the whole of what the strip is
 * holding, and the only statement of it.
 *
 * Four questions, and each is an article: has looking summoned it (art. 68),
 * is what it is gated on actually on you (art. 7, card 67), could pressing it
 * change anything (art. 118), and has it already been done *here* (art. 82).
 *
 * It is one function because the answer wave found out what two of it costs.
 * The tray built this list inline and `src/shell/strip.ts` built it again for
 * the harness, and a deliberate regression of art. 118 was caught by one of
 * them and not the other — which is the same defect as a rule with two
 * statements, discovered before it shipped rather than after.
 */
export function offering(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
): readonly Act[] {
  const run = ledgers.run
  return actsIn(book, node).filter(
    (one) =>
      summoned(run, node.instance, one) &&
      afforded(run, one) &&
      moves(ledgers, one) &&
      !done(run, node.instance, one),
  )
}

/**
 * art. 68: whether looking has summoned this act yet, here. An act about
 * nothing is about the room, and a room is a thing you are standing in.
 */
export function summoned(run: RunLedger | null, instance: InstanceId, one: Act): boolean {
  return one.about === undefined || hasLooked(run, instance, one.about)
}

/**
 * art. 7 (card 67): whether what this act is gated on is actually on you.
 *
 * `act` has always refused an unmet gate; this is what stops the tray from
 * offering the press in the first place. art. 68 abolished the verb that is
 * present and refusing, and a verb that needs something you are not
 * carrying is exactly that verb.
 */
export function afforded(run: RunLedger | null, one: Act): boolean {
  if (one.needs.length === 0) return true
  const held = new Set<string>(run?.carried ?? [])
  return one.needs.every((item) => held.has(item))
}

/**
 * art. 118: **whether pressing this would change anything at all.**
 *
 * An act that cannot is not offered — the verb is absent, the way a locked
 * door's already is (card 67). Today the whole of "cannot" is art. 40's
 * unspent mercy: a body with nothing open gets nothing back, and `act`
 * already refuses such a press rather than spending the deed. The refusal
 * was correct and invisible, which is exactly the shape this article bans.
 *
 * Everything else moves by definition — a take puts something in your hand,
 * a lock turns — so the default is true and each new kind of cannot has to
 * come here and say so.
 *
 * **The second kind of cannot, and the descent wave found it** (card 88). A
 * good is collected by id and the ritual is idempotent (`collect`); a clue
 * is learned by id and so is that. So an act whose *whole* payload is
 * already on the permanent ledger is a press that spends a deed, charges a
 * price and changes nothing — which is precisely the shape art. 118 bans,
 * and it was reachable the moment a room could author a good, because
 * art. 82 lets a run deal the same room twice.
 *
 * It reaches across runs on purpose, and that is arts 10 and 11 rather than
 * an oversight: knowledge survives death, so a man who has already put his
 * ear to one of these knows what he would learn and does not pay for it
 * again. The thing's look is where that is said (art. 118's second clause).
 * An act with no payload at all — the Warden's `Unlock` — is untouched,
 * because there is nothing of it to have spent.
 */
export function moves(ledgers: Ledgers, one: Act): boolean {
  if (one.heals !== undefined) return breathFor(ledgers, one) > 0
  return unspent(ledgers, one)
}

/** Whether any of what this act pays out is still new to the permanent. */
function unspent(ledgers: Ledgers, one: Act): boolean {
  const takes = one.takes ?? []
  const learns = one.learns ?? []
  if (takes.length === 0 && learns.length === 0) return true
  const permanent = ledgers.permanent
  const held = new Set<string>([
    ...permanent.pouch.dice.map((die) => die.id as string),
    ...permanent.keepsakes.map((kept) => kept.id as string),
    ...permanent.wearables.map((worn) => worn.id as string),
  ])
  const known = new Set<string>(permanent.known.map((clue) => clue.id as string))
  return (
    takes.some((good) => !held.has(good.id as string)) ||
    learns.some((clue) => !known.has(clue.id as string))
  )
}

/**
 * art. 118: whether an act *about this thing* is being withheld right now.
 *
 * It is what the look needs in order to say what withholds it. An act
 * already done is not withheld — it is spent, and the room shows that in
 * pixels (art. 70) — and neither is one whose gate is simply not met, which
 * card 67 already answers with the lock's own sentence.
 */
export function withholding(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
  target: string,
): boolean {
  const run = ledgers.run
  return actsIn(book, node).some(
    (one) =>
      one.about === target &&
      !done(run, node.instance, one) &&
      afforded(run, one) &&
      !moves(ledgers, one),
  )
}

/**
 * art. 120: **what a press about this thing would cost, right now.** Zero
 * when nothing about it is priced, which is nearly everything.
 *
 * It is the mirror of `withholding`, and the two are exclusive by
 * construction: a withheld act is one the strip is not offering, and this
 * one asks only about acts it is. It reads `offering` rather than `actsIn`
 * for exactly that reason — a price quoted for a verb that is not there is
 * a threat the game has no way to carry out.
 */
export function priceAt(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
  target: string,
): number {
  let most = 0
  for (const one of offering(ledgers, book, node)) {
    if (one.about !== target || one.price === undefined) continue
    most = Math.max(most, priceOf(ledgers, one))
  }
  return most
}

/**
 * art. 120: what this act would take out of the body as things stand.
 *
 * **A price is never the run.** It stops at one point of health, because a
 * press made out of curiosity may cost a player something and may not cost
 * them everything — a run ends to a horror, to the Warden or to a door, and
 * never to a question. The clamp lives here rather than in each priced act
 * so that no content can author its way past it.
 */
export function priceOf(ledgers: Ledgers, chosen: Act): number {
  const run = ledgers.run
  if (run === null || chosen.price === undefined) return 0
  return Math.max(0, Math.min(chosen.price.health, run.health - 1))
}

/**
 * art. 84 (extended): **what this room would remember you turning down**, if
 * you walked out of it now.
 *
 * An act carries the flag its own refusal writes (`Act.refused`); this is
 * every such flag whose act is still undone here.
 *
 * **A refusal is turning down an offer**, and the three filters are what
 * make that true rather than approximately true. `summoned` is deliberately
 * *not* one of them: a thing the player never looked at is a thing they
 * walked past, which is the strongest refusal there is. But `afforded` is
 * (art. 7 — you cannot decline a thing you were never able to take) and so
 * is `moves` (art. 118 — a mercy a whole body cannot drink is not offered at
 * all, so walking away from it declines nothing). Without the last one every
 * healthy run walking past a Mender was recorded as having turned down a
 * mercy it was never shown.
 */
export function refusalsIn(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
): readonly string[] {
  const run = ledgers.run
  const flags = actsIn(book, node)
    .filter(
      (one) =>
        one.refused !== undefined &&
        !done(run, node.instance, one) &&
        afforded(run, one) &&
        moves(ledgers, one),
    )
    .map((one) => one.refused as string)
  return [...new Set(flags)]
}

/** art. 84: the flags written down, on the ledger that survives the run. */
function declining(permanent: PermanentLedger, flags: readonly string[]): PermanentLedger {
  let held = permanent
  for (const flag of flags) held = decline(held, flag)
  return held
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

/**
 * art. 5: tapping never harms; looking is free and always answers (art. 6).
 *
 * card 67: what the run is carrying goes with the question, because art. 69
 * says a thing answers *either way* and the lock is the one thing in the
 * game whose either-way is a different sentence. The pocket is optional so
 * that a caller which only wants the room's own answer — a test, a re-read
 * — is not made to pretend to be a run.
 */
export function look(
  book: RoomBook,
  bands: Bands,
  target: Tappable,
  carried: readonly ItemId[] = [],
  withheld = false,
  price = 0,
  remembered: readonly string[] = [],
): Beat {
  return {
    text: book.look(bands.room, target.id, carried, withheld, price, remembered),
    index: -1,
    last: true,
  }
}

/**
 * art. 68 (strengthened): and looking is written down, because the verb it
 * summons has to still be there when you come back (arts 70, 82).
 *
 * It is separate from `look` on purpose: `look` answers, this remembers, and
 * a caller that only wants the answer — a test, a re-read — does not have to
 * pretend to be a thumb.
 */
export function looking(ledgers: Ledgers, target: Tappable): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: lookedAt(run, run.at.instance, target.id) }
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

/**
 * art. 40 (ruled): a share of what is missing, rounded in the player's
 * favour, and never a point past the maximum. A body with nothing open gets
 * nothing back — there is no such thing as overhealing here.
 *
 * The share is content's number. This is the arithmetic it is spent through,
 * and it is the same arithmetic for both tiers.
 */
export function breathOf(health: number, healthMax: number, share: number): number {
  const missing = Math.max(0, healthMax - health)
  if (missing === 0 || share <= 0) return 0
  return Math.min(missing, Math.ceil(missing * share))
}

/** What this act would give back to the run as it stands. Zero for most acts. */
export function breathFor(ledgers: Ledgers, chosen: Act): number {
  const run = ledgers.run
  if (run === null || chosen.heals === undefined) return 0
  return breathOf(run.health, run.healthMax, chosen.heals)
}

/**
 * Acting is not tapping: it has gates and consequences (art. 7) — and,
 * under art. 120, a price.
 *
 * `among` is the room's acts, and it is what art. 89's forfeiture needs in
 * order to write art. 84's flag: `forfeits` holds act *ids*, and the flag
 * lives on the act. A caller that hands over nothing gets the old behaviour
 * exactly — the deeds are still written, and the refusal is simply not
 * noticed, which is what happens today for every act that has no flag.
 */
export function act(ledgers: Ledgers, chosen: Act, among: readonly Act[] = []): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  if (!chosen.needs.every((item) => run.carried.includes(item))) return ledgers
  // art. 82: once per instance is the engine's law and not the tray's. The
  // tray already stops offering a done act, but a deed that only the tray
  // enforced would be an act that could be spent twice from anywhere else.
  if (done(run, run.at.instance, chosen)) return ledgers
  const breath = breathFor(ledgers, chosen)
  // A mercy that would restore nothing is not spent. Pressing a verb the
  // tray offered must never cost the player the thing the verb was for, and
  // a body already whole is the one case where it could (art. 5's spirit,
  // at the act strip).
  if (chosen.heals !== undefined && breath === 0) return ledgers
  // art. 82: the deed is written against this instance, and the items it
  // gives are written against the run — one is about here, the other is
  // about you.
  let moved = didHere(run, run.at.instance, chosen.id)
  // art. 89: and what this act closes is written down in the same breath, so
  // the forfeited good is gone from the tray and gone from the paint before
  // anything can offer it again.
  for (const lost of chosen.forfeits ?? []) moved = didHere(moved, run.at.instance, lost)
  for (const item of chosen.gives) moved = carrying(moved, item)
  /**
   * art. 40's breath and art. 120's price move the same number, so the
   * number is settled once. No act ships as both, and the arithmetic is
   * written so that one could be without the second write silently
   * discarding the first.
   */
  const price = priceOf(ledgers, chosen)
  const health = Math.min(run.healthMax, run.health + breath) - price
  if (health !== run.health) moved = wounded(moved, health)
  // art. 84: and the mark it leaves is not, so it crosses by the ritual.
  let permanent =
    chosen.remembers === undefined
      ? ledgers.permanent
      : markMemory(ledgers.permanent, chosen.remembers, chosen.id)
  // arts 10, 88: knowledge is a key and lives on the permanent, so what a
  // priced act pays in survives the death that spends the run it was bought
  // in. That is the whole of why it is worth health.
  for (const clue of chosen.learns ?? []) permanent = learn(permanent, clue)
  // arts 84, 89: the half of a fork you did not take is a thing you turned
  // down, and the labyrinth writes it down in the same breath as the take.
  const lost = new Set(chosen.forfeits ?? [])
  permanent = declining(
    permanent,
    among
      .filter((one) => lost.has(one.id) && one.refused !== undefined)
      .map((one) => one.refused as string),
  )
  // arts 11, 86: the collection survives death, so a good crosses the ledgers
  // by the named ritual rather than by an assignment.
  //
  // art. 60: and only a *good* re-arms the run. The hand never moves inside
  // a descent, so `tookIntoRun` is asked about the collection changing and
  // not about the permanent changing — a clue learned or a refusal written
  // is permanent state that has no business rebuilding a hand.
  const collected = ((): PermanentLedger => {
    let held = permanent
    for (const good of chosen.takes ?? []) held = collect(held, good)
    return held
  })()
  // arts 47, 55–56: and a found thing is worth something now. The bone goes
  // into the slot art. 55 left open, and a plate found here blocks from the
  // next blow rather than from the next waking.
  if (collected !== permanent) moved = tookIntoRun(moved, collected)
  return { run: moved, permanent: collected }
}

/** art. 31: the road ahead is only ever the doors in front of you. */
export function doors(bands: Bands): readonly Door[] {
  return bands.tray.flatMap((offer) => (offer.kind === 'door' ? [offer.door] : []))
}

/**
 * art. 7: outcomes, not clicks, are gated. A door you cannot open is still
 * a door you may always tap — it simply does not open (art. 5).
 *
 * This is the *key* half only: whether what the lock demands is on you. The
 * other half is whether you have turned it (`turnedHere`), and a door needs
 * both (`opens`).
 */
export function canOpen(ledgers: Ledgers, door: Door): boolean {
  const held = new Set<string>(ledgers.run?.carried ?? [])
  return door.demands.every((key) => held.has(key))
}

// ── The ceremony at the lock (card 67, arts 68, 70, 82, 97) ────────────

/**
 * Which act, if any, turns this door's lock. A locked door with nothing
 * authored to turn it never opens — deliberately, and loudly: the old
 * behaviour was that a lock opened itself the moment the key was in the
 * pocket, and a silent fallback to that is exactly the regression this
 * card exists to make impossible. `test/warden.test.ts` holds the catalog
 * to it, so content cannot ship such a door by accident.
 */
export function lockActFor(book: RoomBook, node: ChainNode, door: Door): Act | null {
  return actsIn(book, node).find((one) => one.unlocks === door.at) ?? null
}

/**
 * arts 70, 82: whether this door's lock has been turned **here**. The deed
 * is the act's own id against this instance, so two copies of one room each
 * keep their own lock — and it survives leaving and coming back, because
 * the world remembers.
 */
export function turnedHere(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
  door: Door,
): boolean {
  if (door.demands.length === 0) return false
  const turning = lockActFor(book, node, door)
  if (turning === null) return false
  return (ledgers.run?.did ?? []).includes(deedKey(node.instance, turning.id))
}

/**
 * Whether this door will actually give: the key is on you **and** the lock
 * has been turned. An unlocked door asks for neither.
 *
 * A door that fails this offers no verb at all rather than a verb that
 * refuses (art. 68: not greyed, not refusing, not there).
 */
export function opens(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
  door: Door,
): boolean {
  if (!canOpen(ledgers, door)) return false
  return door.demands.length === 0 || turnedHere(ledgers, book, node, door)
}

/**
 * arts 3, 9: whether this room has nothing left that could ever let the run
 * out of it. Forward is forever, so a run that reaches this is a run the
 * guarantee failed for — and it is the one case the `End run` valve exists
 * for.
 *
 * A locked door the player is *carrying the key to* is not stranded: the
 * lock is a press away, and the press is the point. What strands is a lock
 * whose key is not on you, or a lock nothing in the room can turn.
 */
export function stranded(ledgers: Ledgers, book: RoomBook, node: ChainNode): boolean {
  if (node.doors.length === 0) return false
  return node.doors.every((door) => {
    // A fight is a way on, whatever else is true of the door it stands at.
    if (door.fight !== undefined) return false
    if (!canOpen(ledgers, door)) return true
    return door.demands.length > 0 && lockActFor(book, node, door) === null
  })
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
 *
 * card 67: given a door, it also asks whether that door's lock has been
 * turned. The two questions are one question at the act strip — *may this
 * press take me out of here* — and answering them in one place is what
 * stops a second caller from remembering only half of it.
 */
export function mayLeave(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
  door?: Door,
): boolean {
  if (heldBack(ledgers, book, node).length > 0) return false
  return door === undefined || opens(ledgers, book, node, door)
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
  const here = nodeAt(chain, run.at.instance)
  if (here === null) throw new Error(`no room dealt at ${run.at.instance}`)
  if (heldBack(ledgers, book, here).length > 0) {
    throw new Error('art. 3: something here is still required')
  }
  // card 67: the key opens nothing by existing. A lock is turned by a press
  // that leaves a deed, and the door reads the deed (arts 68, 82).
  //
  // Before the `ends` refusal on purpose: a locked door that also ends the
  // depth is refused for the more specific reason, so a caller that reaches
  // here without the ceremony is told what it actually skipped.
  if (!opens(ledgers, book, here, door)) {
    throw new Error('art. 97: the lock has not been turned')
  }
  if (door.ends === true) throw new Error("the Warden's door ends the depth: finish, do not walk")
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
      // art. 84 (extended): walking out is the moment a refusal becomes one.
      // Everything the room offered and the run did not take is written down
      // here, because forward is forever (art. 9) — the door closing behind
      // you is exactly what makes leaving it a decision rather than a delay.
      permanent: declining(ledgers.permanent, refusalsIn(ledgers, book, here)),
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
