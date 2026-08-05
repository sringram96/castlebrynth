/**
 * src/state — the two ledgers, the named rituals between them, persistence,
 * exact resume (arts 11, 36).
 *
 * The law this module owes: the run burns at death and the permanent
 * survives; they never mix except through the rituals below; and killing
 * the process at any moment loses nothing.
 *
 * Resume granularity is the fingertip (art. 75). `FightSave` is written on
 * every fight mutation, so killing the app after the intent, mid-keep or
 * mid-claim restores exactly there, the half-made selection included.
 */

import type {
  Armor,
  Card,
  Die,
  DieId,
  Hand,
  Line,
  Pouch,
  Talisman,
  Wearable,
  WearableId,
} from '../lots/index.js'
import { armorFrom, assembleHand } from '../lots/index.js'

// ── The two ledgers ────────────────────────────────────────────────────

declare const runBrand: unique symbol
declare const permanentBrand: unique symbol

/**
 * art. 11: the run burns at death — items, health, position. The brand is
 * load-bearing: a RunLedger cannot be assigned where a PermanentLedger is
 * asked for, and neither can be widened into the other.
 */
export interface RunLedger {
  readonly [runBrand]: 'run'
  /** art. 36: one seed at waking derives the whole arrangement. */
  readonly seed: Seed
  /** Which depth this run is descending. One, until the deep ships. */
  readonly depth: number
  readonly health: number
  readonly healthMax: number
  /** Where in the chain you are — a room identity, never a coordinate. */
  readonly at: RoomVisit
  /**
   * art. 36 (amended): seed + choice history → the same run, always. This is
   * the run's history graph, and it is the source of truth — every room the
   * run has dealt is the replay of it (`deal` in src/gen), so there is one
   * statement of where the player has been and nothing that can disagree
   * with it.
   */
  readonly history: RunHistory
  /** art. 60: assembled from the pouch for this descent. */
  readonly hand: Hand
  /**
   * art. 47: armor is a body stat, in force for the descent — the worn
   * wearables summed, then moved by mercies, wounds, and curses. It burns
   * with the run; the wearables themselves do not (art. 49).
   */
  readonly armor: Armor
  readonly worn: readonly WearableId[]
  readonly carried: readonly ItemId[]
  /**
   * art. 70: doors already opened, as `instance→index`. The world remembers
   * in pixels, and a door is the one thing in a room an act can leave
   * standing open — so which ones are open is run state, not a repaint.
   *
   * art. 82: keyed on the instance and not the template. What stands open
   * here stands open *here*, not in every copy of the room.
   */
  readonly opened: readonly string[]
  /**
   * art. 82: acts already done, as `instance|act`. Two instances of one
   * room each hold their own key; taking one leaves the other lying where
   * it lies. Inferring this from what is carried was right while a room
   * could not repeat, and is wrong now.
   */
  readonly did: readonly string[]
  /** art. 4: a window open when the app closes resolves as missed. */
  readonly window: OpenWindow | null
  /**
   * art. 75: a half-spent turn survives the lock screen. Set while a fight
   * is in flight — including one you ran out on, which pauses rather than
   * discards (art. 63) — and cleared only by winning or dying.
   */
  readonly fight: FightSave | null
  /**
   * arts 67, 75: which panel of the tray the thumb is on.
   *
   * Focus is interaction, and interaction is state — a player who was
   * reading the pouch when the phone locked is reading the pouch when it
   * wakes. It rides the vault like everything else, and it moves only by a
   * tap on a tab or by one of the declared transitions (`focused`), never by
   * an inference about what the shell thinks you probably want.
   */
  readonly panel: Panel
  /**
   * art. 68 (strengthened): the things this run has looked at, as
   * `instance|thing`.
   *
   * An act about a thing does not exist until the thing has been tapped, so
   * this is what summons the verb. It is keyed on the instance like the deeds
   * (art. 82) — two copies of one room are two rooms, and looking in one is
   * not looking in the other — and it persists for the instance: leave and
   * come back, the verb is still there, because the world remembers
   * (art. 70).
   */
  readonly looked: readonly string[]
}

/**
 * art. 67 (amended): the panels the tray can be showing. `fight` exists only
 * while a fight does; the map is a socket with no panel behind it, so it is
 * deliberately not in this union — a disabled tab is legal, pixels are not
 * (arts 31, 85).
 */
export type Panel = 'acts' | 'pouch' | 'fight'

/** art. 67: where the thumb starts, and where a finished fight puts it back. */
export const HOME: Panel = 'acts'

/**
 * art. 11: the permanent survives — dice, signature, keepsakes, knowledge,
 * the Book of Ends. art. 10: knowledge is a key and lives here.
 */
export interface PermanentLedger {
  readonly [permanentBrand]: 'permanent'
  readonly pouch: Pouch
  /** art. 56: the signature is simply the first die you collect. */
  readonly signature: DieId | null
  /** art. 53: talismans are keepsakes, and keepsakes are permanent. */
  readonly keepsakes: readonly Talisman[]
  /** art. 49: wearables are collectible like dice, so they survive death. */
  readonly wearables: readonly Wearable[]
  /** art. 34: keyed on room and entity identity, never on position. */
  readonly known: readonly Clue[]
  /**
   * art. 84: unique encounters respawn with the reseed — the run burns — but
   * meetings are knowledge. This is who the player has met, ever.
   */
  readonly met: readonly EncounterId[]
  /**
   * art. 84: and what they remember of the player. The socket is typed and
   * empty: the merchant who would fill it awaits the economy ruling.
   */
  readonly memories: readonly Memory[]
  readonly bookOfEnds: readonly EndLine[]
  /** art. 60: hand size is a body stat, grown and shrunk. Not the constant six. */
  readonly handSize: number
  /** arts 47, 55: the bare body you wake with. Content declares both numbers. */
  readonly body: Body
}

/**
 * The body stats a waking starts from. arts 47 and 60 make both of these
 * stats rather than constants; content owns the numbers.
 */
export interface Body {
  readonly health: number
  readonly armor: Armor
}

/** Both ledgers, and nothing else. A run may be absent between wakings. */
export interface Ledgers {
  readonly run: RunLedger | null
  readonly permanent: PermanentLedger
}

declare const seedBrand: unique symbol
export type Seed = number & { readonly [seedBrand]: 'seed' }
declare const itemBrand: unique symbol
export type ItemId = string & { readonly [itemBrand]: 'item' }
declare const roomBrand: unique symbol
export type RoomId = string & { readonly [roomBrand]: 'room' }
declare const clueBrand: unique symbol
export type ClueId = string & { readonly [clueBrand]: 'clue' }
declare const encounterBrand: unique symbol
/** art. 83: a thing that stands in a socket, or is bound to a room. */
export type EncounterId = string & { readonly [encounterBrand]: 'encounter' }
declare const instanceBrand: unique symbol
/**
 * art. 82: template and instance. A run may deal the same room twice; the
 * template is what you recognise, and this is where you are standing.
 * Knowledge keys on the template (art. 34); scene state keys on this.
 */
export type InstanceId = string & { readonly [instanceBrand]: 'instance' }

/** art. 34: a clue keys on a thing, so it survives death and the reseed. */
export interface Clue {
  readonly id: ClueId
  readonly about: RoomId | DieId
}

/**
 * art. 84: what an encounter remembers of the player. The labyrinth
 * remembers you, and it remembers you across deaths — so this lives on the
 * permanent and not in the run that burns.
 *
 * Nothing writes a mark yet. The merchant is the encounter this is for, and
 * the merchant waits on the economy; shipping the socket typed and empty is
 * what art. 84 asks for and all it asks for.
 */
export interface Memory {
  readonly about: EncounterId
  /** What it holds. Empty until there is something to hold. */
  readonly marks: readonly string[]
}

/**
 * art. 36 (amended): the run's history graph. Every room dealt and every
 * door taken — recorded as the choices, because under art. 79 the rooms are
 * derived from them and a second copy could only ever disagree.
 */
export interface RunHistory {
  /** Which door was opened at each room dealt, in order. */
  readonly taken: readonly number[]
}

/** One line per death, and a different line for the Warden's door. */
export interface EndLine {
  readonly seed: Seed
  readonly depth: number
  readonly cause: string
}

export interface RoomVisit {
  /** art. 82: the template — what you recognise, and what knowledge keys on. */
  readonly room: RoomId
  /** art. 82: the instance — where you stand, and what scene state keys on. */
  readonly instance: InstanceId
  /** How far down the chain — the road behind you does not exist (art. 9). */
  readonly step: number
  /** Which candle of the room's text you are on (art. 29). */
  readonly beat: number
}

/** art. 4: optional treasure may be fleeting. Unmet, it closes. */
export interface OpenWindow {
  readonly about: RoomId
  readonly closesAtBeat: number
}

/**
 * art. 75: interaction is state. A half-made selection, a half-spent turn
 * and a fight you ran out on all survive the lock screen, so all of it is
 * written down — and it is written down small.
 *
 * The dice as they lie are *not* in here. The lot a turn is thrown with is
 * derived from the run's seed and the turn number (art. 36), so the casting
 * is replayed rather than stored: the same seed, the same kept set, the same
 * faces. What cannot be derived is what the thumb did, and that is here.
 */
export interface FightSave {
  readonly horror: string
  /**
   * Which room's door this fight stands at (art. 30: it never moves), by
   * instance — art. 82: a fight paused here is not paused in every copy of
   * the room.
   */
  readonly at: InstanceId
  readonly horrorHealth: number
  readonly yourHealth: number
  readonly turnNumber: number
  /**
   * art. 41: *keep* is mid-turn holding. "Brace" has left the vocabulary.
   * This is the set as it stood when the recast landed, which is what the
   * replay needs — the marks the player sees are cleared by art. 72.
   */
  readonly kept: readonly DieId[]
  readonly castingsSpent: number
  /** art. 63: the card belongs to the fight, so a resume finds it as spent. */
  readonly card: Card
  /** art. 45: claims already made this turn, each holding its own dice. */
  readonly claims: readonly ClaimSave[]
  /** Which half of the turn the thumb is in: before the cast, keeping, claiming. */
  readonly phase: FightPhase
  /** art. 75: a half-made selection is state like any other. */
  readonly selected: readonly DieId[]
  /** art. 28: the advance never undoes itself, so it is remembered as done. */
  readonly advanced: boolean
  /**
   * art. 63: whether the player is still at the door. A paused fight is
   * saved exactly like a live one — the difference is only where you are
   * standing, and a boot has to land you back where you were (art. 75).
   */
  readonly engaged: boolean
}

/** Where the thumb is inside a turn (arts 41, 75). */
export type FightPhase = 'pre' | 'keep' | 'claim'

/** One claim, small enough to write down: a line and the dice inside it. */
export interface ClaimSave {
  readonly line: Line
  readonly dice: readonly DieId[]
}

// ── The rituals ────────────────────────────────────────────────────────
// art. 11: the only crossings between the ledgers. Nothing else may touch
// both, and nothing here mutates in place.

/** The room every run opens in. art. 37: the Crossing is a fixed anchor. */
export const CROSSING = 'room.crossing' as RoomId

/**
 * art. 82: an instance is a template at a step. The engine has no back
 * (art. 9), so how far down you are names a room dealt uniquely — which is
 * what lets the whole graph be replayed from the choices alone.
 */
export function instanceOf(room: RoomId, step: number): InstanceId {
  return `${room}#${step}` as InstanceId
}

/** Wake at the Crossing: a fresh run from the permanent, seeded (art. 36). */
export function wake(permanent: PermanentLedger, seed: Seed, depth = 1): Ledgers {
  const run: RunLedger = {
    seed,
    depth,
    health: permanent.body.health,
    healthMax: permanent.body.health,
    at: { room: CROSSING, instance: instanceOf(CROSSING, 0), step: 0, beat: 0 },
    history: { taken: [] },
    // art. 60: the pouch's order is the hand, so a hand chosen by swapping
    // (`swapInPouch`) is the hand you wake with next time, for free.
    hand: assembleHand(permanent.pouch, permanent.handSize),
    armor: armorFrom(permanent.wearables, permanent.body.armor),
    worn: permanent.wearables.map((wearable) => wearable.id),
    carried: [],
    opened: [],
    did: [],
    window: null,
    fight: null,
    panel: HOME,
    looked: [],
  } as unknown as RunLedger
  return { run, permanent }
}

/** art. 10: knowledge is a key. Learning is permanent, immediately. */
export function learn(permanent: PermanentLedger, clue: Clue): PermanentLedger {
  if (permanent.known.some((held) => held.id === clue.id)) return permanent
  return { ...permanent, known: [...permanent.known, clue] }
}

/**
 * art. 84: a meeting is knowledge. The encounter itself burns with the run
 * and respawns with the reseed — but that you have met it does not, and the
 * memory it keeps of you does not either. The labyrinth remembers you.
 *
 * A meeting crosses the ledgers, so it is a ritual and not an assignment
 * (art. 11).
 */
export function meet(permanent: PermanentLedger, who: EncounterId): PermanentLedger {
  if (permanent.met.includes(who)) return permanent
  return { ...permanent, met: [...permanent.met, who] }
}

/** art. 84: whether this is a face the player has seen before, ever. */
export function hasMet(permanent: PermanentLedger, who: EncounterId): boolean {
  return permanent.met.includes(who)
}

/**
 * art. 84: and what it remembers of you. The encounter burns with the run
 * and respawns with the reseed; the mark it keeps does not.
 *
 * A mark is a key and never a sentence — nothing player-facing passes
 * through here. This is the socket the merchant will use when the economy
 * lands, and the Savior is the first thing to write into it.
 */
export function remember(
  permanent: PermanentLedger,
  about: EncounterId,
  mark: string,
): PermanentLedger {
  const held = permanent.memories.find((one) => one.about === about)
  if (held === undefined) {
    return { ...permanent, memories: [...permanent.memories, { about, marks: [mark] }] }
  }
  if (held.marks.includes(mark)) return permanent
  return {
    ...permanent,
    memories: permanent.memories.map((one) =>
      one.about === about ? { ...one, marks: [...one.marks, mark] } : one,
    ),
  }
}

/** art. 84: what one encounter holds about the player, ever. */
export function remembers(permanent: PermanentLedger, about: EncounterId): readonly string[] {
  return permanent.memories.find((one) => one.about === about)?.marks ?? []
}

/**
 * A die, a keepsake, or a wearable crosses from the run to the permanent —
 * the collection survives death (arts 11, 49). Not to be confused with the
 * turn's *keep*, which only holds dice between castings (art. 41).
 *
 * art. 56: the signature is simply the first die you collect — including
 * the one you pick out of a pouch you already carry.
 */
export function collect(
  permanent: PermanentLedger,
  taken: Die | Talisman | Wearable,
): PermanentLedger {
  if (isDie(taken)) {
    const already = permanent.pouch.dice.some((die) => die.id === taken.id)
    const pouch: Pouch = already
      ? permanent.pouch
      : { dice: [...permanent.pouch.dice, taken] }
    const signature = permanent.signature ?? taken.id
    return { ...permanent, pouch, signature }
  }
  if (isWearable(taken)) {
    if (permanent.wearables.some((worn) => worn.id === taken.id)) return permanent
    return { ...permanent, wearables: [...permanent.wearables, taken] }
  }
  if (permanent.keepsakes.some((kept) => kept.id === taken.id)) return permanent
  return { ...permanent, keepsakes: [...permanent.keepsakes, taken] }
}

function isDie(taken: Die | Talisman | Wearable): taken is Die {
  return 'faces' in taken
}

function isWearable(taken: Talisman | Wearable): taken is Wearable {
  return 'armor' in taken
}

/**
 * What a good just collected does to the run already in flight (arts 47,
 * 55–56, 60, 86).
 *
 * A found thing has to be worth something *now*. art. 55 leaves the sixth
 * slot empty from the first waking and calls it the invitation; an
 * invitation you cannot accept until you die is not one, and a plate that
 * blocks nothing until the next descent is not armor. So:
 *
 * - **the hand**, while it is short of the body's hand size: a newly
 *   collected die fills it, appended, so the dice already on the table keep
 *   their identities — which is what art. 75's replay depends on. Past that
 *   the hand is full and art. 60 stands unchanged: the pouch grows, and
 *   which six go down with you is settled at the next waking.
 * - **the armor** (art. 47): a wearable not yet worn is worn, and its value
 *   is *added* rather than the stat being re-derived. The stat is the worn
 *   wearables "then moved by mercies, wounds, and curses" — recomputing it
 *   would quietly undo whatever had moved it.
 *
 * Talismans need nothing here: they are read off the permanent at the door
 * (art. 53), so a keepsake found in this room is in the next fight already.
 */
export function tookIntoRun(run: RunLedger, permanent: PermanentLedger): RunLedger {
  // art. 63: never while a fight is in flight or paused behind a door. The
  // hand a fight was opened with is the hand it is replayed with (art. 75),
  // and re-arming between fleeing and going back in would be a way to launder
  // a card. A good found here waits for the fight to end.
  const dice = run.fight === null ? handFrom(permanent) : [...run.hand.dice]

  const worn = [...run.worn]
  let armor = run.armor
  for (const wearable of permanent.wearables) {
    if (worn.includes(wearable.id)) continue
    worn.push(wearable.id)
    armor += wearable.armor
  }

  const same =
    dice.length === run.hand.dice.length &&
    dice.every((die, at) => die.id === run.hand.dice[at]?.id) &&
    worn.length === run.worn.length
  return same ? run : { ...run, hand: { dice }, worn, armor }
}

/**
 * art. 60: the hand is assembled from the pouch, and the pouch is ordered —
 * so the hand is simply the first `handSize` of it. Everything past that is
 * a **spare**: owned, carried between runs, and not currently in play.
 *
 * The order being the answer is what lets a chosen hand survive a death for
 * nothing: the reseed burns the run and the pouch is untouched, so the six
 * you chose are still the first six when you wake.
 */
export function handFrom(permanent: PermanentLedger): readonly Die[] {
  return permanent.pouch.dice.slice(0, Math.max(0, permanent.handSize))
}

/** art. 60: the dice you own that are not in the hand right now. */
export function sparesOf(permanent: PermanentLedger): readonly Die[] {
  return permanent.pouch.dice.slice(Math.max(0, permanent.handSize))
}

/**
 * arts 60, 86 (ruled 2026-08-05): the hand is a **chosen** six, and choosing
 * is a swap.
 *
 * A found die past a full hand does not simply pile up in the pouch waiting
 * for a waking that will never look at it — it asks which die it replaces,
 * and it is a straight exchange: the one you take goes into the hand's
 * order, the one you give up becomes a spare. Nothing is destroyed and
 * nothing is sold; the pouch is the collection (art. 60) and this only ever
 * moves things inside it.
 *
 * It is done by exchanging positions rather than by keeping a second list,
 * because the pouch's order *is* the hand (`handFrom`). One statement of
 * what you are carrying, and nothing that can disagree with it.
 */
export function swapInPouch(
  permanent: PermanentLedger,
  taking: DieId,
  leaving: DieId,
): PermanentLedger {
  if (taking === leaving) return permanent
  const dice = [...permanent.pouch.dice]
  const to = dice.findIndex((die) => die.id === taking)
  const from = dice.findIndex((die) => die.id === leaving)
  if (to < 0 || from < 0) return permanent
  const held = dice[to]!
  dice[to] = dice[from]!
  dice[from] = held
  return { ...permanent, pouch: { dice } }
}

/** art. 32: every death reseeds. The run burns; one line is written. */
export function die(ledgers: Ledgers, cause: string): PermanentLedger {
  return withEnding(ledgers, cause)
}

/** The Warden's door: a terse ending, a different Book line, a fresh waking. */
export function finish(ledgers: Ledgers, cause: string): PermanentLedger {
  return withEnding(ledgers, cause)
}

function withEnding(ledgers: Ledgers, cause: string): PermanentLedger {
  const run = ledgers.run
  if (run === null) return ledgers.permanent
  const line: EndLine = { seed: run.seed, depth: run.depth, cause }
  return { ...ledgers.permanent, bookOfEnds: [...ledgers.permanent.bookOfEnds, line] }
}

/** A first waking: the pouch of plain bones, nothing known yet (art. 55). */
export function firstPermanent(pouch: Pouch, handSize: number, body: Body): PermanentLedger {
  return {
    pouch,
    signature: null,
    keepsakes: [],
    wearables: [],
    known: [],
    met: [],
    memories: [],
    bookOfEnds: [],
    handSize,
    body,
  } as unknown as PermanentLedger
}

// ── Moving through a run ───────────────────────────────────────────────

/** Nothing mutates in place: a run moves by being rewritten (art. 11). */
export function movedTo(run: RunLedger, at: RoomVisit): RunLedger {
  return { ...run, at }
}

/**
 * art. 36: a door taken is written into the history before anything else
 * moves, because the history *is* the run — the room the player is about to
 * stand in is derived from it (art. 79).
 */
export function tookDoor(run: RunLedger, at: number): RunLedger {
  return { ...run, history: { taken: [...run.history.taken, at] } }
}

/** art. 82: an act is done here, in this instance, and only here. */
export function didHere(run: RunLedger, instance: InstanceId, act: string): RunLedger {
  const key = deedKey(instance, act)
  if (run.did.includes(key)) return run
  return { ...run, did: [...run.did, key] }
}

/**
 * art. 68 (strengthened): looking at a thing, written down. Looking is free
 * and never commits (art. 5), so this is the one mutation a tap may make —
 * it does not change the world, it changes what the world will offer.
 */
export function lookedAt(run: RunLedger, instance: InstanceId, thing: string): RunLedger {
  const key = deedKey(instance, thing)
  if (run.looked.includes(key)) return run
  return { ...run, looked: [...run.looked, key] }
}

/** art. 68: whether this thing has been looked at, here (art. 82). */
export function hasLooked(run: RunLedger | null, instance: InstanceId, thing: string): boolean {
  return run !== null && run.looked.includes(deedKey(instance, thing))
}

/** How a deed is written down, so a room can read back what it has lost. */
export function deedKey(instance: InstanceId, act: string): string {
  return `${instance}|${act}`
}

export function atBeat(run: RunLedger, beat: number): RunLedger {
  return { ...run, at: { ...run.at, beat } }
}

export function carrying(run: RunLedger, item: ItemId): RunLedger {
  if (run.carried.includes(item)) return run
  return { ...run, carried: [...run.carried, item] }
}

/** art. 70: an opened door stands open, and stays open. */
export function openedDoor(run: RunLedger, key: string): RunLedger {
  if (run.opened.includes(key)) return run
  return { ...run, opened: [...run.opened, key] }
}

/**
 * art. 75: the fight as it stands, written into the run. art. 63: a fight
 * you ran out on keeps its card and its wounds, so this is not cleared by
 * flight — only by winning, and by the death that burns the whole run.
 */
export function fighting(run: RunLedger, fight: FightSave | null): RunLedger {
  return { ...run, fight }
}

/**
 * arts 67, 75: the thumb moves to a panel, and the move is written down.
 *
 * Every caller of this is a *declared* transition — a tap on a tab, a fight
 * opening, a fight ending. Nothing infers focus from the state of the world,
 * because a focus that moves on its own is a focus the player has to keep
 * checking.
 */
export function focused(run: RunLedger, panel: Panel): RunLedger {
  return run.panel === panel ? run : { ...run, panel }
}

export function wounded(run: RunLedger, health: number): RunLedger {
  return { ...run, health }
}

// ── Persistence & exact resume ─────────────────────────────────────────

/** Where the ledgers are written. A port, so a test can kill it mid-turn. */
export interface Vault {
  read(key: string): string | null
  write(key: string, value: string): void
}

/** One versioned key. */
export const VAULT_KEY = 'castlebrynth'

/**
 * Where a snapshot goes that could not be read at all.
 *
 * art. 11 promises that the Book of Ends survives everything, and the old
 * `load` broke that promise the moment a schema changed: it refused, and the
 * next write wiped what it had refused. Nothing is destroyed here. A
 * snapshot the ladder below cannot walk forward is copied to this key and
 * left alone, so a reader written later can still go and get it.
 */
export const QUARANTINE_KEY = 'castlebrynth.quarantine'

/**
 * Bumped when the run's shape changes: art. 75 put the fight, the doors it
 * has opened and the thumb's half-made selection on the ledger, and the
 * drift put the history graph, the instance and the deeds beside them. A
 * snapshot written before either cannot answer for them — so it is migrated
 * forward by the ladder below, never refused.
 *
 * 4 is the panels wave: art. 67's tray became a rail and a panel area, and
 * art. 75 makes which panel the thumb is on state like any other. 5 is the
 * summons (art. 68): what a run has looked at decides what it may do.
 */
export const VAULT_VERSION = 5

// ── The migration ladder ───────────────────────────────────────────────

/**
 * One step of the ladder: a snapshot at `from`, rewritten so that it is a
 * snapshot at `from + 1`.
 *
 * A migration is handed the raw parsed object and hands back a raw parsed
 * object. It is deliberately not typed against `Snapshot`: the whole point
 * of it is that its input has a *different* shape from the one the rest of
 * this module knows, and a migration that could be type-checked against
 * today's types would be a migration that had already stopped working.
 */
export interface Migration {
  readonly from: number
  readonly up: (snapshot: Record<string, unknown>) => Record<string, unknown>
}

/** A raw object at some version, or nothing. */
type Raw = Record<string, unknown>

const asRaw = (value: unknown): Raw | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Raw) : null

/**
 * arts 11, 36: what every ladder step owes.
 *
 * The **permanent survives, the run does not.** A run is a position in an
 * arrangement, and under art. 36 the arrangement is derived from a seed and
 * a choice history that older schemas did not record — so an old run cannot
 * be replayed, and pretending otherwise would put the player somewhere the
 * dealer never dealt. Dropping it costs a run; keeping the permanent keeps
 * the dice, the knowledge and the Book, which is what art. 11 actually
 * promises. The boot then wakes a fresh run from the permanent it kept.
 */
/**
 * The other shape a rung can have, and the better one when it is available:
 * **keep everything and fill what is new.**
 *
 * `keepingOnlyThePermanent` is for a schema whose *run* cannot be replayed.
 * A rung that only adds a field to the run has no such problem — the
 * arrangement is derived from the same seed and the same choices it always
 * was (art. 36) — so it fills the field and leaves the player exactly where
 * they were standing. Dropping a run that did not need dropping would be a
 * cost the ladder charged for nothing.
 */
function fillingTheRun(snapshot: Raw, fill: (run: Raw) => Raw): Raw {
  const ledgers = asRaw(snapshot.ledgers)
  const permanent = ledgers === null ? null : asRaw(ledgers.permanent)
  if (permanent === null) throw new Error('no permanent ledger to migrate')
  const run = asRaw(ledgers?.run)
  return {
    ...snapshot,
    ledgers: { permanent, run: run === null ? null : fill({ ...run }) },
  }
}

function keepingOnlyThePermanent(snapshot: Raw, fill: (permanent: Raw) => Raw): Raw {
  const ledgers = asRaw(snapshot.ledgers)
  const permanent = ledgers === null ? null : asRaw(ledgers.permanent)
  // A step that cannot find the thing it is meant to carry forward refuses.
  // Inventing an empty permanent here would be the old wipe wearing a new
  // coat — a blank Book of Ends written over a real one, quietly.
  if (permanent === null) throw new Error('no permanent ledger to migrate')
  return { ...snapshot, ledgers: { run: null, permanent: fill({ ...permanent }) } }
}

/**
 * The ladder, in order. Each step names the version it reads; `load` walks
 * from whatever it finds up to `VAULT_VERSION`, and a gap in the chain is a
 * snapshot that gets quarantined rather than guessed at.
 */
export const MIGRATIONS: readonly Migration[] = [
  /**
   * 1 → 2. The thumb's ruling (art. 75) put the fight, the doors a room has
   * opened and the half-made selection on the ledger. A v1 permanent
   * predates the wearables axis (art. 49) and the two body stats (arts 47,
   * 60), so those are filled with what the bare body is.
   */
  {
    from: 1,
    up: (snapshot) =>
      keepingOnlyThePermanent(snapshot, (permanent) => ({
        pouch: permanent.pouch ?? { dice: [] },
        signature: permanent.signature ?? null,
        keepsakes: permanent.keepsakes ?? [],
        wearables: permanent.wearables ?? [],
        known: permanent.known ?? [],
        // art. 11: this is the line the whole ladder exists for.
        bookOfEnds: permanent.bookOfEnds ?? [],
        handSize: permanent.handSize ?? 6,
        body: permanent.body ?? { health: 26, armor: 0 },
      })),
  },
  /**
   * 2 → 3. The drift (arts 77–85) put the history graph, the instance, the
   * deeds and — on the permanent — art. 84's meetings and memories. A v2
   * permanent has met nobody it can prove, so it starts them empty: a
   * meeting it cannot name is not a meeting it can keep.
   */
  {
    from: 2,
    up: (snapshot) =>
      keepingOnlyThePermanent(snapshot, (permanent) => ({
        ...permanent,
        met: permanent.met ?? [],
        memories: permanent.memories ?? [],
      })),
  },
  /**
   * 3 → 4. The panels wave put art. 67's panel focus on the run (art. 75).
   * Nothing about the *arrangement* moved, so this rung keeps the run where
   * it is standing and fills the one new field — a player mid-descent does
   * not lose a descent to a tray change.
   */
  {
    from: 3,
    up: (snapshot) => fillingTheRun(snapshot, (run) => ({ ...run, panel: run.panel ?? HOME })),
  },
  /**
   * 4 → 5. The summons (art. 68). A run from before it has looked at
   * nothing, which is the honest answer — it never recorded looking — and it
   * costs the player only the taps to look again. The run itself is
   * untouched, so nobody loses a descent to it.
   */
  {
    from: 4,
    up: (snapshot) => fillingTheRun(snapshot, (run) => ({ ...run, looked: run.looked ?? [] })),
  },
]

/**
 * art. 36: every mutation persists; boot restores exactly. A snapshot is a
 * complete, serialisable statement of where the player is.
 */
export interface Snapshot {
  readonly version: number
  readonly ledgers: Ledgers
}

export function snapshot(ledgers: Ledgers): Snapshot {
  return { version: VAULT_VERSION, ledgers }
}

export function save(ledgers: Ledgers, vault: Vault): void {
  vault.write(VAULT_KEY, JSON.stringify(snapshot(ledgers)))
}

/**
 * Boot. A window that was open at close resolves as missed (art. 4); nothing
 * else about the moment may change.
 *
 * art. 11, the debt this closes: an older snapshot is walked up the ladder
 * rather than refused. Refuse-and-wipe was one schema change away from
 * eating every Book of Ends, which is the one thing the game promises
 * survives everything.
 *
 * Three things can go wrong, and none of them destroys anything:
 *
 * - **unreadable bytes** — quarantined, and `null` returned;
 * - **a version this build has no ladder to** (a gap below, or a snapshot
 *   from a *newer* build) — quarantined, and `null` returned;
 * - **a migration that throws** — quarantined, and `null` returned.
 *
 * `null` means the shell wakes fresh. It does not mean the old bytes are
 * gone: the next `save` writes `VAULT_KEY`, and the quarantine is a
 * different key.
 */
export function load(vault: Vault): Ledgers | null {
  const written = vault.read(VAULT_KEY)
  if (written === null) return null

  const quarantine = (): null => {
    // Only the first casualty is kept. A later boot would otherwise
    // overwrite the interesting bytes with the fresh ones it just wrote.
    if (vault.read(QUARANTINE_KEY) === null) vault.write(QUARANTINE_KEY, written)
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(written)
  } catch {
    return quarantine()
  }
  const raw = asRaw(parsed)
  if (raw === null) return quarantine()

  const migrated = climb(raw)
  if (migrated === null) return quarantine()

  const ledgers = asRaw(migrated.ledgers)
  const permanent = ledgers === null ? null : asRaw(ledgers.permanent)
  if (permanent === null) return quarantine()
  const run = ledgers === null ? null : asRaw(ledgers.run)
  // art. 4: a window open when the app closed resolves as missed.
  return {
    run: run === null ? null : ({ ...run, window: null } as unknown as RunLedger),
    permanent: permanent as unknown as PermanentLedger,
  }
}

/**
 * A snapshot, walked from whatever version it says it is up to this one.
 * `null` when there is no path — which is a snapshot to keep, not one to
 * throw away.
 */
function climb(raw: Raw): Raw | null {
  const at = raw.version
  if (typeof at !== 'number' || !Number.isInteger(at) || at < 1) return null
  // A snapshot from a newer build. This one cannot read it and must not
  // rewrite it: the newer build is still installed somewhere.
  if (at > VAULT_VERSION) return null

  let walking = raw
  for (let version = at; version < VAULT_VERSION; version++) {
    const step = MIGRATIONS.find((one) => one.from === version)
    if (step === undefined) return null
    try {
      const next = asRaw(step.up(walking))
      if (next === null) return null
      walking = { ...next, version: version + 1 }
    } catch {
      return null
    }
  }
  return walking
}

/** What was set aside because it could not be read, if anything. */
export function quarantined(vault: Vault): string | null {
  return vault.read(QUARANTINE_KEY)
}

/** The vault a browser has. The URL is the whole install. */
export function browserVault(storage: Storage): Vault {
  return {
    read: (key) => storage.getItem(key),
    write: (key, value) => storage.setItem(key, value),
  }
}

/** The vault a test has: it can be killed, and only the bytes come back. */
export function memoryVault(): Vault {
  const written = new Map<string, string>()
  return {
    read: (key) => written.get(key) ?? null,
    write: (key, value) => void written.set(key, value),
  }
}
