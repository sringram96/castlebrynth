/**
 * Everything the labyrinth can hand you.
 *
 * Four nouns now, and the growth is **placement rather than invention**: the
 * Vial and the item dice were already here, and the iron die and the talisman
 * moved in when they stopped being starting equipment. A fresh run begins with
 * six bare bones and nothing else, so every carried thing in the game is now a
 * thing that was found somewhere, and this is the one table that says what a
 * found thing is called and exactly what it does.
 *
 * Item dice, the iron die and the talisman are drawn from `content/dice.ts` and
 * their card prints those tables verbatim: a found thing has to state its exact
 * mechanic before TAKE is pressed. Not a hint, not a category — the faces.
 *
 * **And now literally the faces.** `content/faces.ts` derives a strip of chips
 * from the thing's own `faces` table, and every place a card is read draws it:
 * the loot card in the room, the tray slot inspection, the menu. What `rule`
 * carries beside the strip is when the thing fires and whether there is a
 * press — the two things a row of chips cannot say.
 *
 * **The caps are the reducer's**, not the pool's. TAKE on a third item die is
 * refused there, and the room says so rather than the draw quietly pretending
 * the thing was never there.
 *
 * ## `short` is not a nickname
 *
 * A found thing lies in the room and carries its own name on it, on a pill
 * seated on the object it is sitting in. A phone is 390 px wide and *Talisman
 * of the Pair* is not, so the pill carries `short` and the full name is one
 * LOOK away, on the card, with the rule. Every `short` is a word a player can
 * point at.
 */

import { IRON_DICE, ITEM_DICE, ITEM_DIE_LIST, ironDie, itemDie, talisman } from './dice.js'
import type { IronDieId, ItemDieId, TalismanId } from './dice.js'

export type RewardId = 'vial' | ItemDieId | IronDieId | TalismanId

export type RewardKind = 'vial' | 'item-die' | 'iron-die' | 'talisman'

export interface Reward {
  readonly id: RewardId
  readonly name: string
  /** One word, for the pill that sits on the thing where it lies. */
  readonly short: string
  readonly kind: RewardKind
  /** The exact mechanic, in digits. This is the card. */
  readonly rule: string
  /** Optional flavour, below a divider. */
  readonly flavour?: string
  /**
   * How often it comes up in a draw, relative to its neighbours.
   *
   * Rarity is expressed here rather than by curating a different table per
   * enemy, so the whole cadence of the slice can be read in one place.
   */
  readonly weight: number
}

/**
 * One thing out of `content/dice.ts`, as a card.
 *
 * Built from the die's own table rather than restated, so the card and the
 * cascade cannot disagree about what the thing does — the same rule
 * `HAND_DEFINITIONS` is held to.
 */
const fromTable = (
  thing: { readonly id: string; readonly name: string; readonly rule: string; readonly flavour?: string },
  kind: RewardKind,
  short: string,
  weight: number,
): Reward => ({
  id: thing.id as RewardId,
  name: thing.name,
  short,
  kind,
  rule: thing.rule,
  ...(thing.flavour ? { flavour: thing.flavour } : {}),
  weight,
})

const REWARD_LIST: readonly Reward[] = [
  {
    id: 'vial',
    name: 'Vial',
    short: 'VIAL',
    kind: 'vial',
    // The one carried thing with no faces, so its card names its **press**
    // where a die's names its firing — the same contract read the other way
    // round. See `content/faces.ts`.
    rule: 'Press DRINK. 5 bones back, never past 30.',
    flavour: 'Thick, and still warm. Best not to ask.',
    weight: 6,
  },
  // Item dice are upside and are drawn less often than the consumable that
  // keeps a run alive. No balance target assumes either of them.
  fromTable(itemDie('grave-candle'), 'item-die', 'CANDLE', 3),
  fromTable(itemDie('splinter-fetish'), 'item-die', 'FETISH', 2),
  // The iron die and the talisman are **placed, never drawn**: their weight is
  // zero and they are not in `LOOT_REWARDS`, so no chest and no fight can roll
  // one. They are in this table because a found thing needs a card, and they
  // are found — in the cage, and in the Reliquary.
  fromTable(ironDie('rustplate'), 'iron-die', 'IRON', 0),
  fromTable(talisman('pair-talisman'), 'talisman', 'PAIR', 0),
]

export const REWARDS: Readonly<Record<RewardId, Reward>> = Object.fromEntries(
  REWARD_LIST.map((r) => [r.id, r]),
) as Readonly<Record<RewardId, Reward>>

/**
 * Everything a draw may produce, in a stable order. Draws are seeded, never
 * shuffled.
 *
 * The placed things are deliberately absent. A run finds the iron in the cage
 * and the talisman in the Reliquary or it does not find them at all — which is
 * what makes the route a build choice rather than a lottery.
 */
export const LOOT_REWARDS: readonly RewardId[] = REWARD_LIST.filter((r) => r.weight > 0).map(
  (r) => r.id,
)

/**
 * Which found thing a say line is about, if it is about one.
 *
 * The one seam between the reducer's prose and the faces that belong beside
 * it. LOOK and TAKE both write `<name>. …` into `run.say`, and the word band
 * draws that thing's strip under the sentence — *a found thing states its exact
 * mechanic where it lies*, and since this wave the mechanic is the faces rather
 * than a sentence about them.
 *
 * It is a match against **this table**, not a parse of English: the name it
 * looks for is the same string the reducer printed, out of the same record. A
 * copy change it does not recognise loses the strip and nothing else, which is
 * the correct failure for a decoration that repeats what the card already says.
 */
export function thingSaidIn(say: string): RewardId | undefined {
  return [...REWARD_LIST]
    .sort((a, b) => b.name.length - a.name.length)
    .find((r) => say.startsWith(r.name))?.id
}

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

/** Whether a reward is an iron die, and which. */
export function ironDieOf(id: RewardId): IronDieId | undefined {
  return id in IRON_DICE ? (id as IronDieId) : undefined
}

/** Referenced so a die added to the table without a card fails loudly here. */
export const ITEM_DIE_REWARDS: readonly RewardId[] = ITEM_DIE_LIST
