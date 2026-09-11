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
 *   one of the six and never adds a seventh. Growth is replacement.
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

export type CoreDieId = 'bone'

export interface CoreDie {
  readonly id: CoreDieId
  readonly name: string
  /** Six faces. An ordinary d6 is the only one authored in this wave. */
  readonly faces: readonly DieValue[]
  readonly rule: string
}

const BONE: CoreDie = {
  id: 'bone',
  name: 'Bone',
  faces: [1, 2, 3, 4, 5, 6],
  rule: 'An ordinary bone. One through six.',
}

export const CORE_DICE: Readonly<Record<CoreDieId, CoreDie>> = { bone: BONE }

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
  faces: [0, 0, 3, 3, 5, 7],
  rule: 'Rolls with the hand: 0, 0, 3, 3, 5 or 7 held off the answer this turn.',
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
  rule: 'Fires with every attack: +3, +3, +5, +5, or nothing twice.',
  flavour: 'It only burns over the dead. It has never once gone out on me.',
}

const SPLINTER_FETISH: ItemDie = {
  id: 'splinter-fetish',
  name: 'Splinter Fetish',
  faces: [FLAT(8), FLAT(8), BLANK, BLANK, COST(2), COST(2)],
  rule: 'Fires with every attack: +8, +8, nothing twice, or 2 of my bones twice.',
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
  rule: '+12 damage when the line I score is PAIR or TWO PAIR.',
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
