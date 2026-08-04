/**
 * src/lots — the dice engine: turn, ladder, claims, the card, armor, riders
 * (arts 41–65, as amended by the demo ruling of 2026-08-04).
 *
 * Stubs only. `reference/castlebrynth-lots-demo.html` is the playable spec
 * this module owes until the encounter fixture is re-authored; where prose
 * and the demo disagree about behaviour, the demo wins.
 *
 * No tuning number lives here. Shapes are law and live here; the ladder's
 * multipliers, the hand's size, armor values, every horror's intent and
 * every die's faces arrive from `src/content` (art. 48).
 */

const unimplemented = (): never => {
  throw new Error('not implemented')
}

// ── The dice ───────────────────────────────────────────────────────────

/**
 * art. 50: shapes are free, values are law. Any body may be forged, but
 * every face shows a value 1–6, so every value theorem survives it.
 */
export type Value = 1 | 2 | 3 | 4 | 5 | 6

declare const dieBrand: unique symbol
export type DieId = string & { readonly [dieBrand]: 'die' }
declare const riderBrand: unique symbol
export type RiderId = string & { readonly [riderBrand]: 'rider' }
declare const bondBrand: unique symbol
export type BondId = string & { readonly [bondBrand]: 'bond' }
declare const talismanBrand: unique symbol
export type TalismanId = string & { readonly [talismanBrand]: 'talisman' }
declare const wearableBrand: unique symbol
export type WearableId = string & { readonly [wearableBrand]: 'wearable' }

/**
 * art. 51 (amended): the face schema — a value and an optional rider. The
 * rider fires only when its face is spent in a claimed combo; kept or unused
 * faces fire nothing; passive faces are banned. The brace-rider socket is
 * repealed with art. 47. v1 ships every rider empty (art. 55) and the socket
 * typed anyway.
 */
export interface Face {
  readonly value: Value
  readonly rider?: RiderId
}

/**
 * art. 49 (amended): dice and their company are collectible on five axes —
 * shape, riders, bonds, talismans, and wearables.
 */
export interface Die {
  readonly id: DieId
  /** How many faces the body has: 4, 6, 8, 20 — free (art. 50). */
  readonly body: number
  /** Exactly `body` faces, each declaring its value on inspect (art. 54). */
  readonly faces: readonly Face[]
  /** art. 52: bonds trigger when both halves are spent in the same claim. */
  readonly bond?: BondId
}

/**
 * art. 53: talismans (never "jokers") upgrade scoring from outside the hand,
 * in three species — value modifiers, ladder modifiers, and shape triggers
 * that read the whole turn. They are keepsakes on the permanent ledger.
 */
export type TalismanSpecies = 'value' | 'ladder' | 'shape'

export interface Talisman {
  readonly id: TalismanId
  readonly species: TalismanSpecies
}

/**
 * art. 47 (amended): defense is a body stat — armor, granted by items and
 * mercies, automatically blocking its value from every attack. A wearable is
 * where that value comes from; art. 49 makes it collectible like a die.
 */
export interface Wearable {
  readonly id: WearableId
  /** How much of every attack it blocks. Tuning, so it is authored (art. 48). */
  readonly armor: number
}

/** art. 47: the stat itself, once the worn wearables and mercies are summed. */
export type Armor = number

export function armorFrom(worn: readonly Wearable[]): Armor {
  return unimplemented()
}

/** art. 60: the pouch is the collection, on the permanent ledger. */
export interface Pouch {
  readonly dice: readonly Die[]
}

/**
 * art. 60: the hand is assembled from the pouch for the descent, and its
 * size is a body stat — grown by mercies, shrunk by wounds. Never six.
 */
export interface Hand {
  readonly dice: readonly Die[]
}

export function assembleHand(pouch: Pouch, size: number): Hand {
  return unimplemented()
}

/** What a die's faces declare, for the inspect screen (art. 54). */
export function inspect(die: Die): readonly Face[] {
  return unimplemented()
}

// ── The ladder & the card ──────────────────────────────────────────────

/**
 * art. 48 (amended): the ladder, expanded — sets, runs, composites, and the
 * ANY DICE floor. The shapes are law and are named here; every multiplier is
 * tuning and lives in content.
 */
export type Line =
  | 'pair'
  | 'two-pair'
  | 'triple'
  | 'full-house'
  | 'three-pairs'
  | 'quad'
  | 'two-triples'
  | 'quint'
  | 'run-3'
  | 'run-4'
  | 'run-5'
  | 'straight'
  | 'any-dice'

/** Every line of the ladder, in ascending order of what it asks of a hand. */
export const LINES: readonly Line[] = [
  'pair',
  'two-pair',
  'triple',
  'full-house',
  'three-pairs',
  'quad',
  'two-triples',
  'quint',
  'run-3',
  'run-4',
  'run-5',
  'straight',
  'any-dice',
]

/** art. 45: harm is sum × tier. The multiplier is content's; the shape is not. */
export interface Tier {
  readonly name: string
  readonly multiplier: number
}

/** The ladder is authored: every number in it is tuning (art. 48). */
export type Ladder = Readonly<Record<Line, Tier>>

/**
 * art. 63: the card — every line claimable once per fight, refilling between
 * fights. `true` is spent. An empty card leaves only armor and flight.
 */
export type Card = Readonly<Record<Line, boolean>>

/** art. 63: the card refills between fights, never within one. */
export function freshCard(): Card {
  return unimplemented()
}

export function spend(card: Card, line: Line): Card {
  return unimplemented()
}

/** art. 63: what is left to spend — the fight's fuse, seen at a glance. */
export function unspent(card: Card): readonly Line[] {
  return unimplemented()
}

// ── The turn ───────────────────────────────────────────────────────────

/**
 * art. 65: an intent may attack the plan, not just the body — sealing lines,
 * cursing a value, corroding armor. Each is declared on the intent like any
 * number (art. 58); which horror declares which is content, not law.
 */
export type IntentEffect =
  | { readonly kind: 'seal'; readonly lines: readonly Line[] }
  | { readonly kind: 'curse'; readonly value: Value }
  | { readonly kind: 'corrode' }

/** art. 58: a declared verb + number + optional effect. Taxonomy is content. */
export interface Intent {
  readonly verb: string
  readonly amount: number
  readonly effect?: IntentEffect
}

/** art. 65: which lines this turn's intent has sealed shut. */
export function sealed(intent: Intent): readonly Line[] {
  return unimplemented()
}

/** art. 47: armor blocks its value from every attack, unless corroded. */
export function armorAgainst(intent: Intent, armor: Armor): Armor {
  return unimplemented()
}

/** One die as it landed, and whether it is being kept mid-turn (art. 41). */
export interface Landed {
  readonly die: DieId
  readonly face: Face
  /** *Keep* is mid-turn holding. "Brace" has left the vocabulary (art. 41). */
  readonly kept: boolean
}

export type Casting = readonly Landed[]

/**
 * art. 45 (amended): one combo, claimed. A turn may hold several; each die is
 * spent in at most one of them.
 */
export interface Claim {
  readonly line: Line
  readonly dice: readonly Landed[]
  readonly sum: number
  readonly tier: Tier
}

/**
 * art. 41 (amended): the THROW / BRACE / FLEE trio is repealed. Attacking is
 * claiming, and claims are made before the turn ends; the decision left is
 * whether to end the turn or to flee, and FLEE is always offered.
 */
export type Decision = 'end-turn' | 'flee'

/**
 * A turn in flight. art. 42: the intent is visible from the top, before the
 * first casting, so keeping is planning.
 */
export interface Turn {
  readonly intent: Intent
  readonly hand: Hand
  readonly castings: readonly Casting[]
  /** art. 43: two are free; a third is merchandise, never a default. */
  readonly castingsAllowed: number
  /** art. 45: what has been claimed so far this turn, in claiming order. */
  readonly claims: readonly Claim[]
  /** art. 63: the fight's card as this turn has spent it. */
  readonly card: Card
}

/** A source of chance. Seeded, because a run is seeded at waking (art. 36). */
export interface Lot {
  next(): number
}

export function openTurn(hand: Hand, intent: Intent, card: Card, lot: Lot): Turn {
  return unimplemented()
}

/** art. 41: *keep* is mid-turn holding, between the two castings. */
export function keep(turn: Turn, dice: readonly DieId[]): Turn {
  return unimplemented()
}

export function recast(turn: Turn, lot: Lot): Turn {
  return unimplemented()
}

// ── The claims ─────────────────────────────────────────────────────────

/**
 * art. 63: which lines this selection could claim — unspent, unsealed, and
 * matching the shape the dice make. art. 64: a composite offers one line, not
 * the simple lines it contains.
 */
export function claimable(turn: Turn, dice: readonly DieId[], ladder: Ladder): readonly Line[] {
  return unimplemented()
}

/**
 * art. 63: claiming spends the line for the rest of the fight. art. 45: the
 * dice go with it, and cannot be spent in a second claim this turn.
 */
export function claim(
  turn: Turn,
  dice: readonly DieId[],
  line: Line,
  ladder: Ladder,
): Turn {
  return unimplemented()
}

/** Undo, before the turn ends: the dice come home and the line refills. */
export function disband(turn: Turn, line: Line): Turn {
  return unimplemented()
}

/** art. 45: dice that fit nothing go unused and do nothing. */
export function unused(turn: Turn): Casting {
  return unimplemented()
}

/** art. 45: harm = sum × tier. Nothing else multiplies a single claim. */
export function harm(claim: Claim): number {
  return unimplemented()
}

/**
 * The turn's whole attack: every claim summed, then the talismans that read
 * the whole turn rather than one claim (art. 53).
 */
export function attack(turn: Turn, talismans: readonly Talisman[]): number {
  return unimplemented()
}

/** What the turn did, and what the intent did back. */
export interface Resolution {
  readonly decision: Decision
  readonly harmDealt: number
  readonly harmTaken: number
  /** art. 63: the lines this turn burned off the card. */
  readonly linesSpent: readonly Line[]
  readonly fled: boolean
}

export function decide(
  turn: Turn,
  decision: Decision,
  armor: Armor,
  talismans: readonly Talisman[],
): Resolution {
  return unimplemented()
}

// ── The fight ──────────────────────────────────────────────────────────

export interface Horror {
  readonly id: string
  readonly health: number
  /** art. 57: the health and the next attack sit at the top of the frame. */
  intentFor(turnNumber: number): Intent
}

export interface Fight {
  readonly horror: Horror
  readonly horrorHealth: number
  readonly yourHealth: number
  /** art. 47: the stat in force, before this turn's intent corrodes it. */
  readonly armor: Armor
  /** art. 63: one card per fight, refilled at the door. */
  readonly card: Card
  readonly turnNumber: number
  readonly turn: Turn
}

export function openFight(
  horror: Horror,
  hand: Hand,
  yourHealth: number,
  armor: Armor,
  lot: Lot,
): Fight {
  return unimplemented()
}

export function advanceFight(fight: Fight, resolution: Resolution, lot: Lot): Fight {
  return unimplemented()
}
