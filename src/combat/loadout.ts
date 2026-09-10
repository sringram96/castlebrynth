/**
 * What the loadout does to a turn: the iron block, the item beat, the
 * talisman, and the one damage equation the three of them feed.
 *
 * Everything here is pure. It imports content tables and a generator type and
 * nothing else — no state, no UI, no render, no enemy. Hand it faces and a
 * loadout and it answers with numbers; the reducer is what commits them.
 *
 * ## The equation
 *
 * ```
 * damage = max(1, floor(sum6 × mult) + itemFlats + talismanFlat)
 * ```
 *
 * One multiplier, from `HAND_DEFINITIONS`, applied to the six core dice and to
 * nothing else. Everything the loadout contributes is **flat and added after
 * it**: the iron die contributes nothing to the sum at all, item faces add
 * after the multiply, and a talisman adds after that. Global and compounding
 * multipliers were measured and rejected, and there is nowhere in this file to
 * express one.
 *
 * ## The answer
 *
 * ```
 * answer = max(0, enemyHit − block)
 * ```
 *
 * The enemy's number is still fixed and still on screen from the first frame.
 * The iron die does not change it; it stands in front of it.
 */

import { ironDie, itemDie, talisman } from '../content/dice.js'
import type { IronDieId, ItemDieId, ItemFace, TalismanId } from '../content/dice.js'
import type { NamedHandId, ScoreId } from './hands.js'
import { multiplierOf } from './hands.js'
import { rollFace } from './roll.js'
import type { DieValue } from './roll.js'
import type { Rng } from '../game/rng.js'

// ── the iron die ───────────────────────────────────────────────────────

/**
 * One iron die, settled for this turn.
 *
 * The face index is recorded alongside the block so the presentation can name
 * *which face* without re-deriving it from a number that several faces share —
 * `[0, 0, 3, 3, 5, 7]` has two zeroes and two threes.
 */
export interface IronRoll {
  readonly id: IronDieId
  readonly face: number
  /** What it blocks off this turn's answer. Zero is a real result. */
  readonly block: number
}

/**
 * Throw the iron dice.
 *
 * Called on **ROLL only**. REROLL does not touch them and there is no press
 * that can: what the iron shows is the turn's terrain rather than part of the
 * dice game. (Provisional — see `docs/COMBAT.md` § Open questions.)
 */
export function rollIron(ids: readonly IronDieId[], rng: Rng): readonly IronRoll[] {
  return ids.map((id) => {
    const die = ironDie(id)
    const face = rollFace(die.faces.length, rng)
    return { id, face, block: die.faces[face] ?? 0 }
  })
}

/** What the iron is holding this turn, in total. */
export function blockOf(rolls: readonly IronRoll[]): number {
  return rolls.reduce((total, roll) => total + Math.max(0, roll.block), 0)
}

/** The enemy's fixed hit, less what the iron stood in front of. Never negative. */
export function answerAfterBlock(enemyHit: number, block: number): number {
  return Math.max(0, enemyHit - Math.max(0, block))
}

/**
 * What an iron die is holding, in a sentence, before anything is committed.
 *
 * The caption under the die, and the reason the iron is legible rather than a
 * surprise at the end of the turn.
 */
export function ironCaption(roll: IronRoll): string {
  const name = ironDie(roll.id).name
  return roll.block > 0
    ? `${name} holds: blocks ${roll.block} this turn.`
    : `${name} came up empty.`
}

/** The same, short enough for the plate. */
export function ironBadge(roll: IronRoll): string {
  return roll.block > 0 ? `BLOCKS ${roll.block}` : 'EMPTY'
}

// ── item dice ──────────────────────────────────────────────────────────

/** One item die, fired. */
export interface ItemRoll {
  readonly id: ItemDieId
  readonly face: number
  readonly result: ItemFace
}

/**
 * Fire the item dice.
 *
 * Called at **Attack**, automatically, once, as a beat in the cascade. They
 * never appear at ROLL or REROLL, there is no press for them and there is no
 * reroll of them — an item die is a treat that lands mid-cascade, not a fourth
 * decision.
 */
export function rollItems(ids: readonly ItemDieId[], rng: Rng): readonly ItemRoll[] {
  return ids.map((id) => {
    const die = itemDie(id)
    const face = rollFace(die.faces.length, rng)
    return { id, face, result: die.faces[face] ?? { kind: 'blank' } }
  })
}

/** What the item dice added to the total. Flat, always. */
export function itemFlatsOf(rolls: readonly ItemRoll[]): number {
  return rolls.reduce((total, r) => total + (r.result.kind === 'flat' ? r.result.amount : 0), 0)
}

/** What the item dice charged, in bones. Charged before the blow lands. */
export function itemCostOf(rolls: readonly ItemRoll[]): number {
  return rolls.reduce((total, r) => total + (r.result.kind === 'cost' ? r.result.bones : 0), 0)
}

/** What one item face did, for the number that pops on the die itself. */
export function itemBadge(result: ItemFace): string {
  if (result.kind === 'flat') return `+${result.amount}`
  if (result.kind === 'cost') return `−${result.bones}`
  return '—'
}

// ── talismans ──────────────────────────────────────────────────────────

/** Which talismans answer to the line that was scored. */
export function talismansFor(
  ids: readonly TalismanId[],
  hand: ScoreId,
): readonly TalismanId[] {
  if (hand === 'crap') return []
  return ids.filter((id) => talisman(id).lines.includes(hand as NamedHandId))
}

/** What they add. Flat, and never a multiplier. */
export function talismanFlatOf(ids: readonly TalismanId[], hand: ScoreId): number {
  return talismansFor(ids, hand).reduce((total, id) => total + talisman(id).bonus, 0)
}

// ── the equation ───────────────────────────────────────────────────────

export interface Loadout {
  readonly itemFlats: number
  readonly talismanFlat: number
}

export interface AttackTotals {
  /** Every core die on the table, added. Not only the ones in the pattern. */
  readonly sum: number
  readonly multiplier: number
  /** `floor(sum × multiplier)`. The line's own contribution, before flats. */
  readonly base: number
  readonly itemFlats: number
  readonly talismanFlat: number
  /** `max(1, base + itemFlats + talismanFlat)`. Never zero, never negative. */
  readonly damage: number
}

/**
 * What an attack does, in full, with the loadout it was made with.
 *
 * The one damage equation in the game. `hands.ts` owns the multiplier and this
 * owns everything added to it, and there is no third place: a bonus written
 * down anywhere else is a bug.
 */
export function totalsFor(
  dice: readonly DieValue[],
  hand: ScoreId,
  loadout: Loadout,
): AttackTotals {
  const sum = dice.reduce((total: number, die) => total + die, 0)
  const multiplier = multiplierOf(hand)
  const base = Math.floor(sum * multiplier)
  const damage = Math.max(1, base + loadout.itemFlats + loadout.talismanFlat)
  return {
    sum,
    multiplier,
    base,
    itemFlats: loadout.itemFlats,
    talismanFlat: loadout.talismanFlat,
    damage,
  }
}
