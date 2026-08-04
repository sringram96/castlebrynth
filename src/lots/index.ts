/**
 * src/lots — the dice engine: turn, ladder, brace, riders (arts 41–60).
 *
 * Stubs only. `reference/the-crawling-one-encounter.md` is the executable
 * truth this module owes: turn for turn, including turn two's brace.
 *
 * No tuning number lives here. The ladder's multipliers, the hand's size,
 * every horror's intent and every die's faces arrive from `src/content`.
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

/**
 * art. 51: the face schema — a value, an optional throw-rider, an optional
 * brace-rider. Riders fire only when the face is used; a frozen face fires
 * nothing; passive faces are banned. v1 ships every rider empty (art. 55)
 * and the sockets typed anyway.
 */
export interface Face {
  readonly value: Value
  readonly throwRider?: RiderId
  readonly braceRider?: RiderId
}

/** art. 49: dice are collectible on four axes — shape, riders, bonds, talismans. */
export interface Die {
  readonly id: DieId
  /** How many faces the body has: 4, 6, 8, 20 — free (art. 50). */
  readonly body: number
  /** Exactly `body` faces, each declaring its value on inspect (art. 54). */
  readonly faces: readonly Face[]
  /** art. 52: bonds trigger when both halves are used at equal value. */
  readonly bond?: BondId
}

/** art. 53: talismans are keepsakes outside the hand that upgrade the ladder. */
export interface Talisman {
  readonly id: TalismanId
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

// ── The turn ───────────────────────────────────────────────────────────

/** art. 58: a declared verb + number + optional rider. Taxonomy is content. */
export interface Intent {
  readonly verb: string
  readonly amount: number
  readonly rider?: string
}

/** One die as it landed, and whether it is being kept mid-turn (art. 41). */
export interface Landed {
  readonly die: DieId
  readonly face: Face
  /** *Freeze* is mid-turn keeping. It is never the word for BRACE (art. 41). */
  readonly frozen: boolean
}

export type Casting = readonly Landed[]

/** art. 41: THROW, BRACE, or FLEE — one decision, after two castings. */
export type Decision = 'throw' | 'brace' | 'flee'

/**
 * A turn in flight. art. 42: the intent is visible from the top, before the
 * first casting, so freezing is planning.
 */
export interface Turn {
  readonly intent: Intent
  readonly hand: Hand
  readonly castings: readonly Casting[]
  /** art. 43: two are free; a third is merchandise, never a default. */
  readonly castingsAllowed: number
}

/** A source of chance. Seeded, because a run is seeded at waking (art. 36). */
export interface Lot {
  next(): number
}

export function openTurn(hand: Hand, intent: Intent, lot: Lot): Turn {
  return unimplemented()
}

export function freeze(turn: Turn, dice: readonly DieId[]): Turn {
  return unimplemented()
}

export function recast(turn: Turn, lot: Lot): Turn {
  return unimplemented()
}

// ── The duel ───────────────────────────────────────────────────────────

export type ComboKind = 'set' | 'run' | 'great-straight'

/** art. 45: dice are numbered; combos are sets and runs; harm = sum × tier. */
export interface Combo {
  readonly kind: ComboKind
  readonly faces: readonly Landed[]
  readonly sum: number
  readonly tier: Tier
}

/** art. 48: sets ×count; runs ×(length−1); the great straight its own tier. */
export interface Tier {
  readonly name: string
  readonly multiplier: number
}

/** The ladder is authored: all its numbers are tuning, all in content (art. 48). */
export interface Ladder {
  set(count: number): Tier
  run(length: number): Tier
  readonly greatStraight: Tier
}

/**
 * art. 46: combos only — no set, no run, no THROW this turn. At six dice or
 * more a hand cannot whiff; below six it can, and that is the true wound.
 */
export function bestCombo(faces: Casting, ladder: Ladder): Combo | null {
  return unimplemented()
}

export function harm(combo: Combo): number {
  return unimplemented()
}

/**
 * art. 47: BRACE is valued — the committed dice absorb their summed value.
 * Not "eats one blow": the dice had to be there.
 */
export function brace(committed: Casting): number {
  return unimplemented()
}

/** What a decision did, and what the intent did back. */
export interface Resolution {
  readonly decision: Decision
  readonly harmDealt: number
  readonly harmTaken: number
  readonly fled: boolean
}

export function decide(
  turn: Turn,
  decision: Decision,
  committed: readonly DieId[],
  ladder: Ladder,
): Resolution {
  return unimplemented()
}

// ── The fight ──────────────────────────────────────────────────────────

export interface Horror {
  readonly id: string
  readonly health: number
  /** art. 57: the health and the intent sit at the top of the frame. */
  intentFor(turnNumber: number): Intent
}

export interface Fight {
  readonly horror: Horror
  readonly horrorHealth: number
  readonly yourHealth: number
  readonly turnNumber: number
  readonly turn: Turn
}

export function openFight(horror: Horror, hand: Hand, yourHealth: number, lot: Lot): Fight {
  return unimplemented()
}

export function advanceFight(fight: Fight, resolution: Resolution, lot: Lot): Fight {
  return unimplemented()
}
