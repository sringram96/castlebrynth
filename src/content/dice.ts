/**
 * The loadout: the six core dice, the iron die, the item dice, the talismans.
 *
 * Four small tables and no framework. Everything here is content — faces,
 * names, the one sentence a card has to be able to say — and nothing here
 * decides an outcome: `combat/loadout.ts` does the arithmetic and the reducer
 * commits it.
 *
 * ## The four things, and why they are four things
 *
 * - **A core die** is one of the six the attack throws. There are always six,
 *   from the first fight to the last turn of the boss; a found die *replaces*
 *   one of the six and never adds a seventh. Growth is replacement. It **is its
 *   faces and nothing else** — no rule text, no trigger, no exception anywhere —
 *   so a crooked die changes what the throw comes up with and never what the
 *   throw means.
 * - **An iron die** rolls alongside the six on ROLL, is never held, is never
 *   rerolled, contributes nothing to the sum and nothing to line
 *   qualification. What it rolls is a flat block against the enemy's answer
 *   this turn.
 * - **An item die** never appears at ROLL or REROLL and has no press of its
 *   own, ever. It rolls automatically at Attack, as a beat in the scoring
 *   cascade — a flat add, a blank, or a cost paid in bones.
 * - **A talisman** names a line and adds a flat `+N` when that line is the one
 *   scored. Flat, never a multiplier.
 *
 * ## What a `rule` is for, now that the faces are drawn
 *
 * A card **shows the faces** — `content/faces.ts` derives a strip of chips from
 * the `faces` table below, and every place a thing is read prints it. So the
 * prose is no longer a sentence restating six numbers in words, which is how a
 * rule string comes to disagree with the table beside it. It says the two
 * things a strip cannot:
 *
 *   **when it fires**, and **whether there is a press.**
 *
 * `Rolls itself at every ATTACK. No press.` — and the digits are on the chips.
 *
 * ## What is deliberately not expressible here
 *
 * No multiplier faces on an item die, and no global multiplier anywhere but
 * `HAND_DEFINITIONS`: compounding multipliers were measured and rejected. No
 * void faces. No always-on damage-reduction stat — armour is the iron die and
 * only the iron die. The face types below are the whole vocabulary, and adding
 * a fifth is a product decision.
 *
 * ## Provisional
 *
 * Every number in this file is a **first-pass value**. They are reported by
 * `npm run balance`, not tuned to make a target pass. See `docs/COMBAT.md`.
 */

import type { NamedHandId } from '../combat/hands.js'
import type { DieValue } from '../combat/roll.js'

// ── the six ────────────────────────────────────────────────────────────

/**
 * Every core die in the game.
 *
 * `bone` is the floor. The six after it are the **crooked** ones, and the last
 * is the treasure.
 */
export type CoreDieId =
  | 'bone'
  | 'knucklebone'
  | 'long-bone'
  | 'saints-finger'
  | 'jawbone'
  | 'heavy-bone'
  | 'cracked-bone'
  | 'hand-of-orrin'

/**
 * One of the six the attack throws.
 *
 * **A core die is its faces and nothing else.** There is no `rule` field here
 * and there is nowhere to write one: no trigger, no keyword, no exception in
 * `hands.ts`, and no face that is not an integer one to six. That is what keeps
 * the sum, the strips, the solver and the scorecard working unchanged however
 * many of these are authored — a crooked die changes the *distribution* of the
 * throw and never its vocabulary.
 *
 * `flavour` is him, in his own voice, about the object in his hand. It is not a
 * rule and nothing reads it for a number.
 */
export interface CoreDie {
  readonly id: CoreDieId
  readonly name: string
  /**
   * One word, for the pill that sits on the thing where it lies.
   *
   * The same rule `Reward.short` is held to and for the same reason: a phone is
   * 390 px wide and *The Hand of Saint Orrin* is not. The full name is one LOOK
   * away, with the strip and the price.
   */
  readonly short: string
  /** Six faces, each an integer 1–6. Asserted in `test/unit/bones.test.ts`. */
  readonly faces: readonly DieValue[]
  readonly flavour: string
}

/**
 * What a core die's card says where a loaded die's rule would go.
 *
 * One sentence, shared by every one of them, because **they do not differ in
 * what they do** — they differ in what they come up with, and the strip beside
 * this says that. A per-die rule string here would be the one place a crooked
 * die could start having a rule.
 */
export const CORE_RULE = 'One of the six I throw. No press, and no rule of its own.'

const core = (
  id: CoreDieId,
  name: string,
  short: string,
  faces: readonly DieValue[],
  flavour: string,
): CoreDie => ({ id, name, short, faces, flavour })

export const CORE_DICE: Readonly<Record<CoreDieId, CoreDie>> = {
  bone: core('bone', 'Bone', 'BONE', [1, 2, 3, 4, 5, 6], 'An ordinary one. It has no opinion about anything.'),
  // Pairs and multiples. Two of everything and no middle at all, which is what
  // makes FOUR and FULL HOUSE reachable and STRAIGHT impossible.
  knucklebone: core(
    'knucklebone',
    'Knucklebone',
    'KNUCKLE',
    [1, 1, 2, 2, 6, 6],
    "Somebody's. Two of everything and no middle.",
  ),
  // Straights. One face doubled at the top so the run is still a run.
  'long-bone': core(
    'long-bone',
    'Long Bone',
    'LONG',
    [1, 2, 3, 4, 5, 5],
    'Longer than it has any business being. It lands in order more often than it should.',
  ),
  // Reliable middles and no sixes. A sum you can count on and a ceiling you
  // cannot raise.
  'saints-finger': core(
    'saints-finger',
    "Saint's Finger",
    'FINGER',
    [2, 3, 3, 4, 4, 5],
    'Somebody kept this in a box. It never gives me much and it never gives me nothing.',
  ),
  // Variance as a choice. Either the best die on the table or the worst.
  jawbone: core(
    'jawbone',
    'Jawbone',
    'JAW',
    [1, 1, 1, 6, 6, 6],
    'It only knows two numbers and it is sure of both.',
  ),
  // High average, no ones. The dull good one.
  'heavy-bone': core(
    'heavy-bone',
    'Heavy Bone',
    'HEAVY',
    [2, 3, 4, 5, 6, 6],
    'Heavy in the hand. It has never once come up on its lowest face twice running.',
  ),
  // A four-of-a-kind seed: two thirds of it is the same number.
  'cracked-bone': core(
    'cracked-bone',
    'Cracked Bone',
    'CRACKED',
    [1, 1, 4, 4, 4, 4],
    'Split down one side. Four of the six faces are the same and I do not know why.',
  ),
  // **Treasure only.** Never in the carver's pool, never in a bargain, never in
  // a fight's offer. See `TREASURE_DIE`.
  'hand-of-orrin': core(
    'hand-of-orrin',
    'The Hand of Saint Orrin',
    'HAND',
    [1, 1, 1, 1, 6, 6],
    'Treasure. It costs what it cost to get here.',
  ),
}

/** How many core dice a run carries. Six, always, and never a seventh. */
export const HAND_SLOTS = 6

/** What a fresh run's six slots hold. */
export const STARTING_HAND: readonly CoreDieId[] = Array.from({ length: HAND_SLOTS }, () => 'bone')

export function coreDie(id: CoreDieId): CoreDie {
  const found = CORE_DICE[id]
  if (!found) throw new Error(`no such core die: ${id}`)
  return found
}

export function isCoreDieId(id: string): id is CoreDieId {
  return id in CORE_DICE
}

/**
 * The one die that is never sold, never chained and never dropped.
 *
 * Its price is the road to it. It is reachable exactly one way — the niche the
 * seed chose as this run's treasure — and the two pools below are defined by its
 * absence rather than by a list somebody has to remember to keep it out of.
 */
export const TREASURE_DIE: CoreDieId = 'hand-of-orrin'

/**
 * The crooked dice: every core die that is neither the plain bone nor the
 * treasure.
 *
 * Derived, not listed. A die authored tomorrow is in the pools tomorrow, and the
 * Hand cannot leak into them however many are added.
 */
export const CROOKED_DICE: readonly CoreDieId[] = (Object.keys(CORE_DICE) as CoreDieId[]).filter(
  (id) => id !== 'bone' && id !== TREASURE_DIE,
)

/** What the Bone Carver has on the table. */
export const CARVER_POOL: readonly CoreDieId[] = CROOKED_DICE

/** What a chained bargain can be holding. The same pool, by ruling. */
export const BARGAIN_POOL: readonly CoreDieId[] = CROOKED_DICE

/**
 * What a crooked die costs, in bones. **First-pass, reported not tuned.**
 *
 * One number for the Carver's table and for a chained bargain, because they are
 * the same transaction seen twice: *a specific die, priced before the press.*
 * The harness's bargain policy sweep is what says whether three of thirty is a
 * price or a formality — see `docs/COMBAT.md` § Balance.
 */
export const DIE_PRICE = 3

// ── the iron die ───────────────────────────────────────────────────────

export type IronDieId = 'rustplate'

export interface IronDie {
  readonly id: IronDieId
  readonly name: string
  /**
   * Six faces, each a flat block against this turn's answer.
   *
   * Zero is a real face and the interesting one: armour that is *sometimes*
   * there is a turn's terrain rather than a stat, which is the whole reason it
   * is a die. See `docs/COMBAT.md` § The iron die.
   */
  readonly faces: readonly number[]
  readonly rule: string
  readonly flavour?: string
}

const RUSTPLATE: IronDie = {
  id: 'rustplate',
  name: 'Rustplate',
  // Useful terrain, not a second health bar. The old 0/0/3/3/5/7 table made
  // the route that charged a toll and added a fight dramatically safer than
  // the short route because it erased most of the Warden's answer.
  faces: [0, 0, 0, 0, 1, 2],
  rule: 'Rolls with your six at ROLL. Blocks its face off the answer. No press.',
  flavour: 'Two thirds of a breastplate and most of a century of rain.',
}

export const IRON_DICE: Readonly<Record<IronDieId, IronDie>> = { rustplate: RUSTPLATE }

export function ironDie(id: IronDieId): IronDie {
  const found = IRON_DICE[id]
  if (!found) throw new Error(`no such iron die: ${id}`)
  return found
}

export function isIronDieId(id: string): id is IronDieId {
  return id in IRON_DICE
}

/**
 * How many iron dice a run may carry.
 *
 * One, this wave, and **whether a cap above one should exist is open** — see
 * `docs/COMBAT.md` § Open questions. The constant is here so that the answer
 * is changed in one place rather than discovered in four.
 */
export const IRON_CAP = 1

// ── item dice ──────────────────────────────────────────────────────────

/**
 * One face of an item die.
 *
 * Three kinds and no fourth. `flat` adds to the total after the multiplier;
 * `blank` is a real face and the reason an item die is upside rather than a
 * tax; `cost` charges bones at the item beat, before the blow lands.
 */
export type ItemFace =
  | { readonly kind: 'flat'; readonly amount: number }
  | { readonly kind: 'blank' }
  | { readonly kind: 'cost'; readonly bones: number }

export type ItemDieId = 'grave-candle' | 'splinter-fetish'

export interface ItemDie {
  readonly id: ItemDieId
  readonly name: string
  /** Six faces. Rolled automatically at Attack; never held, never rerolled. */
  readonly faces: readonly ItemFace[]
  readonly rule: string
  readonly flavour?: string
}

const FLAT = (amount: number): ItemFace => ({ kind: 'flat', amount })
const BLANK: ItemFace = { kind: 'blank' }
const COST = (bones: number): ItemFace => ({ kind: 'cost', bones })

const GRAVE_CANDLE: ItemDie = {
  id: 'grave-candle',
  name: 'Grave Candle',
  faces: [FLAT(3), FLAT(3), FLAT(5), FLAT(5), BLANK, BLANK],
  rule: 'Rolls itself at every ATTACK. No press.',
  flavour: 'It only burns over the dead. It has never once gone out on me.',
}

const SPLINTER_FETISH: ItemDie = {
  id: 'splinter-fetish',
  name: 'Splinter Fetish',
  faces: [FLAT(8), FLAT(8), BLANK, BLANK, COST(2), COST(2)],
  rule: 'Rolls itself at every ATTACK. No press.',
  flavour: 'It wants a splinter. It is not fussy about whose.',
}

export const ITEM_DICE: Readonly<Record<ItemDieId, ItemDie>> = {
  'grave-candle': GRAVE_CANDLE,
  'splinter-fetish': SPLINTER_FETISH,
}

export function itemDie(id: ItemDieId): ItemDie {
  const found = ITEM_DICE[id]
  if (!found) throw new Error(`no such item die: ${id}`)
  return found
}

export function isItemDieId(id: string): id is ItemDieId {
  return id in ITEM_DICE
}

/**
 * How many item dice a run may carry. Two, and the reducer enforces it.
 *
 * A hard cap rather than a soft one: an item die is a treat that lands
 * mid-cascade, and a cascade with five of them in it is a decision tax with
 * the presses removed.
 */
export const ITEM_CAP = 2

/** Every item die, in a stable order. Draws are seeded, never shuffled. */
export const ITEM_DIE_LIST: readonly ItemDieId[] = [GRAVE_CANDLE.id, SPLINTER_FETISH.id]

// ── talismans ──────────────────────────────────────────────────────────

export type TalismanId = 'pair-talisman'

export interface Talisman {
  readonly id: TalismanId
  readonly name: string
  /** The line, or the small family of lines, it answers to. */
  readonly lines: readonly NamedHandId[]
  /** Flat. Never a multiplier, in any circumstance. */
  readonly bonus: number
  readonly rule: string
  readonly flavour?: string
}

const PAIR_TALISMAN: Talisman = {
  id: 'pair-talisman',
  name: 'Talisman of the Pair',
  lines: ['pair', 'two-pair'],
  bonus: 12,
  rule: 'Fires when the line I score is PAIR or TWO PAIR. No press.',
  flavour: 'Two knuckles on one wire. They were not from the same hand.',
}

export const TALISMANS: Readonly<Record<TalismanId, Talisman>> = {
  'pair-talisman': PAIR_TALISMAN,
}

export function talisman(id: TalismanId): Talisman {
  const found = TALISMANS[id]
  if (!found) throw new Error(`no such talisman: ${id}`)
  return found
}

export function isTalismanId(id: string): id is TalismanId {
  return id in TALISMANS
}

/**
 * What a run wakes up carrying, beyond the six. **Nothing.**
 *
 * The iron die and the talisman were provisional starting content while there
 * was no acquisition path for them, and that was recorded as the first thing
 * the next wave should replace. It has been replaced: the Rustplate lies in the
 * Chain Vault's cage and the Talisman of the Pair lies in the Reliquary, so
 * both are found, and which route a run takes is now which build it gets.
 *
 * Empty is **safe by construction** rather than by measurement. The balance
 * law already forbids any gate, target or enemy number from requiring an item
 * die, a talisman or the iron — every fight cell in the report is bare — so a
 * run that starts bare is a run standing exactly where every number was set.
 */
export const STARTING_IRON: readonly IronDieId[] = []
export const STARTING_TALISMANS: readonly TalismanId[] = []
