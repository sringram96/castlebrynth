/**
 * Everything the labyrinth can hand you.
 *
 * Two nouns and no third: **bones** and **Vials**. Relics went first — a
 * passive arithmetic modifier has nothing to modify in a game whose whole
 * combat rule is *higher kills lower* — and the Charm followed the phase it
 * was spent in, because a reroll needs a moment between seeing your throw and
 * living with it and the round no longer has one. No new collectible category
 * may be added without a product decision. See `CLAUDE.md`.
 *
 * What is left is the shape of the two things a fight lets you decide: a Vial
 * is *how long do I last*, and a named bone is *what is standing in the line*.
 *
 * A reward card has to state its exact mechanic before TAKE is pressed. Not a
 * hint, not a category: the numbers. `Restore 5 bones, up to 30.` is the whole
 * card for a Vial, and a player who has read it cannot be surprised by it.
 */

import type { SpecialBoneId } from './bones.js'
import { SPECIAL_BONES, specialBone } from './bones.js'

export type RewardId = SpecialBoneId | 'vial'

export type RewardKind = 'bone' | 'vial'

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
   * enemy, so the whole cadence of the slice can be read in one place. A Vial
   * is common; a named bone is not.
   */
  readonly weight: number
}

const REWARD_LIST: readonly Reward[] = [
  {
    id: 'vial',
    name: 'Vial',
    kind: 'vial',
    rule: 'Drink it: 5 common bones back, up to 30 in all.',
    flavour: 'Thick, and still warm. Best not to ask.',
    weight: 6,
  },
  {
    id: 'cinderbone',
    name: SPECIAL_BONES.cinderbone.name,
    kind: 'bone',
    rule: `A bone for the pile. ${SPECIAL_BONES.cinderbone.rule}`,
    ...(SPECIAL_BONES.cinderbone.flavour ? { flavour: SPECIAL_BONES.cinderbone.flavour } : {}),
    weight: 2,
  },
  {
    id: 'knuckle',
    name: SPECIAL_BONES.knuckle.name,
    kind: 'bone',
    rule: `A bone for the pile. ${SPECIAL_BONES.knuckle.rule}`,
    ...(SPECIAL_BONES.knuckle.flavour ? { flavour: SPECIAL_BONES.knuckle.flavour } : {}),
    weight: 1,
  },
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

/** Whether taking this puts a bone in the pile rather than in the satchel. */
export function isBoneReward(id: RewardId): boolean {
  return reward(id).kind === 'bone'
}

/** The bone a bone-reward is. Throws for a satchel reward, which is the point. */
export function boneOfReward(id: RewardId): SpecialBoneId {
  if (!isBoneReward(id)) throw new Error(`${id} is not a bone`)
  return specialBone(id as SpecialBoneId).id
}
