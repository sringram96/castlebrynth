/**
 * Everything the labyrinth can hand you.
 *
 * Two nouns now: **Vials**, and **item dice**. The Vial is the consumable it
 * has always been; an item die is a thing that goes into the loadout and fires
 * automatically at every Attack from then on. The reward screen is where a
 * loadout thing enters a run, which is the machinery this file kept through
 * the baseline that had nothing to put in it.
 *
 * Item dice are drawn from `content/dice.ts` and their card prints that table
 * verbatim: a reward card has to state its exact mechanic before TAKE is
 * pressed. Not a hint, not a category — the faces.
 *
 * **The cap is the reducer's**, not the pool's. TAKE on a third item die is
 * refused there, and the offer screen says so rather than the draw quietly
 * pretending the thing was never there.
 */

import { ITEM_DICE, ITEM_DIE_LIST, itemDie } from './dice.js'
import type { ItemDieId } from './dice.js'

export type RewardId = 'vial' | ItemDieId

export type RewardKind = 'vial' | 'item-die'

export interface Reward {
  readonly id: RewardId
  readonly name: string
  readonly kind: RewardKind
  /** The exact mechanic, in digits. This is the card. */
  readonly rule: string
  /** Optional flavour, below a divider. */
  readonly flavour?: string
  /**
   * How often it comes up in a draw, relative to its neighbours.
   *
   * Rarity is expressed here rather than by curating a different table per
   * enemy, so the whole cadence of the slice can be read in one place. With
   * one thing in the pool it decides nothing today; it is the shape the pool
   * has, and it costs one field to keep.
   */
  readonly weight: number
}

/**
 * One item die, as a card.
 *
 * Built from the die's own table rather than restated, so the card and the
 * cascade cannot disagree about what the thing does — the same rule
 * `HAND_DEFINITIONS` is held to.
 */
const itemDieReward = (id: ItemDieId, weight: number): Reward => {
  const die = itemDie(id)
  return {
    id,
    name: die.name,
    kind: 'item-die',
    rule: die.rule,
    ...(die.flavour ? { flavour: die.flavour } : {}),
    weight,
  }
}

const REWARD_LIST: readonly Reward[] = [
  {
    id: 'vial',
    name: 'Vial',
    kind: 'vial',
    rule: 'Drink it: 5 bones back, up to 30 in all.',
    flavour: 'Thick, and still warm. Best not to ask.',
    weight: 6,
  },
  // Item dice are upside and are drawn less often than the consumable that
  // keeps a run alive. No balance target assumes either of them.
  itemDieReward('grave-candle', 3),
  itemDieReward('splinter-fetish', 2),
]

export const REWARDS: Readonly<Record<RewardId, Reward>> = Object.fromEntries(
  REWARD_LIST.map((r) => [r.id, r]),
) as Readonly<Record<RewardId, Reward>>

/** Everything drawable, in a stable order. Draws are seeded, never shuffled. */
export const LOOT_REWARDS: readonly RewardId[] = REWARD_LIST.map((r) => r.id)

export function reward(id: RewardId): Reward {
  const found = REWARDS[id]
  if (!found) throw new Error(`no such reward: ${id}`)
  return found
}

export function isRewardId(id: string): id is RewardId {
  return id in REWARDS
}

/** Whether a reward is an item die, and which. */
export function itemDieOf(id: RewardId): ItemDieId | undefined {
  return id in ITEM_DICE ? (id as ItemDieId) : undefined
}

/** Referenced so a die added to the table without a card fails loudly here. */
export const ITEM_DIE_REWARDS: readonly RewardId[] = ITEM_DIE_LIST
