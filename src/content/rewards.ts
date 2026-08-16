/**
 * Everything the labyrinth can hand you.
 *
 * One noun, for this baseline: **Vials**. Named bones went with the fielding
 * step they modified, and nothing has been invented to replace them — a boring
 * reward pool for one combat prototype is preferable to contaminating the
 * experiment with modifiers before the base dice game has been played.
 *
 * The screen infrastructure stays. When modifiers return they need somewhere
 * to enter a run, and this is that somewhere; what is gone is the contents,
 * not the machinery.
 *
 * A reward card has to state its exact mechanic before TAKE is pressed. Not a
 * hint, not a category: the numbers. `Restore 5 bones, up to 30.` is the whole
 * card for a Vial, and a player who has read it cannot be surprised by it.
 */

export type RewardId = 'vial'

export type RewardKind = 'vial'

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

const REWARD_LIST: readonly Reward[] = [
  {
    id: 'vial',
    name: 'Vial',
    kind: 'vial',
    rule: 'Drink it: 5 bones back, up to 30 in all.',
    flavour: 'Thick, and still warm. Best not to ask.',
    weight: 6,
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
