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
}

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
    hand: assembleHand(permanent.pouch, permanent.handSize),
    armor: armorFrom(permanent.wearables, permanent.body.armor),
    worn: permanent.wearables.map((wearable) => wearable.id),
    carried: [],
    opened: [],
    did: [],
    window: null,
    fight: null,
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

export function wounded(run: RunLedger, health: number): RunLedger {
  return { ...run, health }
}

// ── Persistence & exact resume ─────────────────────────────────────────

/** Where the ledgers are written. A port, so a test can kill it mid-turn. */
export interface Vault {
  read(key: string): string | null
  write(key: string, value: string): void
}

/** One versioned key. A snapshot from another version is not read (art. 36). */
export const VAULT_KEY = 'castlebrynth'
/**
 * Bumped when the run's shape changes: art. 75 put the fight, the doors it
 * has opened and the thumb's half-made selection on the ledger, and the
 * drift put the history graph, the instance and the deeds beside them. A
 * snapshot written before either cannot answer for them.
 */
export const VAULT_VERSION = 3

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
 */
export function load(vault: Vault): Ledgers | null {
  const written = vault.read(VAULT_KEY)
  if (written === null) return null
  let parsed: Snapshot
  try {
    parsed = JSON.parse(written) as Snapshot
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object') return null
  if (parsed.version !== VAULT_VERSION) return null
  const { run, permanent } = parsed.ledgers
  if (permanent === undefined || permanent === null) return null
  // art. 4: a window open when the app closed resolves as missed.
  return { run: run === null ? null : ({ ...run, window: null } as RunLedger), permanent }
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
