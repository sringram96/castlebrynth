/**
 * The shapes of the dice engine (arts 41–65, as amended by the demo ruling
 * of 2026-08-04).
 *
 * Shapes are law and live here. No tuning number does: the ladder's
 * multipliers, the hand's size, armor values, every horror's intent and
 * every die's faces arrive from `src/content` (art. 48).
 */

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
 * art. 51: what a rider does when its face is spent in a claim. The species
 * is law; the number is tuning, so the effect arrives from content.
 */
export type RiderEffect = { readonly kind: 'heal'; readonly amount: number }

export interface Rider {
  readonly id: RiderId
  readonly onUse: RiderEffect
}

/**
 * art. 53: talismans (never "jokers") upgrade scoring from outside the hand,
 * in three species — value modifiers, ladder modifiers, and shape triggers
 * that read the whole turn. They are keepsakes on the permanent ledger.
 */
export type TalismanSpecies = 'value' | 'ladder' | 'shape'

/**
 * art. 54: every power pays, and everything is declared on inspect — so a
 * talisman carries its own numbers rather than hiding them behind its id.
 * The ruling of 2026-08-04 fixes the stacking order: value modifiers apply
 * when summing, ladder modifiers when tiering, shape triggers last on the
 * turn's total, and multiple shape triggers each read the turn on their own.
 */
export interface Talisman {
  readonly id: TalismanId
  readonly species: TalismanSpecies
  /** `value`: a face of `of` counts `times` its worth when a claim is summed. */
  readonly value?: { readonly of: Value; readonly times: number }
  /** `ladder`: a claimed line scores `tiers` higher — one tier is one multiplier. */
  readonly ladder?: { readonly tiers: number; readonly lines?: readonly Line[] }
  /** `shape`: reads the whole turn; when every die of the hand is claimed, the total ×`times`. */
  readonly shape?: { readonly everyDie: boolean; readonly times: number }
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

/**
 * The company a hand keeps: what the permanent ledger lends to a claim. The
 * engine reads their declarations; content writes them (arts 51, 53).
 */
export interface Goods {
  readonly talismans: readonly Talisman[]
  readonly riders: readonly Rider[]
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

/** One die as it landed, and whether it is being kept mid-turn (art. 41). */
export interface Landed {
  readonly die: DieId
  readonly face: Face
  /** *Keep* is mid-turn holding. "Brace" has left the vocabulary (art. 41). */
  readonly kept: boolean
  /**
   * art. 52: the bond the die carries, copied down at casting time so a
   * claim can read it without going back to the hand.
   */
  readonly bond?: BondId
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
  /** art. 52: set when a bond joined the claim — the ghost is in the sum. */
  readonly bond?: BondId
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

/** What the turn did, and what the intent did back. */
export interface Resolution {
  readonly decision: Decision
  readonly harmDealt: number
  /**
   * What the intent will take once armor has eaten its share. The fight
   * applies it only if the horror is still standing — the demo's order.
   */
  readonly harmTaken: number
  /** art. 51: on-use riders, fired between the claims and the intent. */
  readonly healed: number
  /** art. 57: the running total worth showing — how much armor ate. */
  readonly blocked: number
  /** art. 63: the lines this turn burned off the card. */
  readonly linesSpent: readonly Line[]
  readonly fled: boolean
}

// ── The fight ──────────────────────────────────────────────────────────

export interface Horror {
  readonly id: string
  readonly health: number
  /** art. 57: the health and the next attack sit at the top of the frame. */
  intentFor(turnNumber: number): Intent
}

/** Where a fight stands. `fighting` until exactly one of the three endings. */
export type Outcome = 'fighting' | 'won' | 'lost' | 'fled'

/**
 * What a fight says out loud — structured, never prose. The voice lives in
 * content and is bound by rules/voice.md; the engine only names events.
 */
export type FightEvent =
  | { readonly kind: 'turn-opened'; readonly turnNumber: number; readonly intent: Intent }
  | { readonly kind: 'claimed'; readonly line: Line; readonly harm: number }
  | { readonly kind: 'dealt'; readonly amount: number }
  | { readonly kind: 'healed'; readonly amount: number }
  | { readonly kind: 'blocked'; readonly amount: number }
  | { readonly kind: 'struck'; readonly amount: number }
  | { readonly kind: 'ended'; readonly outcome: Outcome }

export interface Fight {
  readonly horror: Horror
  readonly horrorHealth: number
  readonly yourHealth: number
  /** The ceiling a rider's heal cannot pass. */
  readonly yourHealthMax: number
  /** art. 47: the stat in force, before this turn's intent corrodes it. */
  readonly armor: Armor
  /** art. 63: one card per fight, refilled at the door. */
  readonly card: Card
  readonly turnNumber: number
  readonly turn: Turn
  readonly hand: Hand
  /** art. 53: the company this fight is fought with. */
  readonly goods: Goods
  readonly outcome: Outcome
  /** What happened, in order, since the fight opened. */
  readonly events: readonly FightEvent[]
}
