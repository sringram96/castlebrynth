/**
 * How a simulated player decides.
 *
 * A policy is handed **exactly what the screen shows** and answers with a
 * press. That constraint is the whole value of the file: a policy that could
 * see what the next throw would roll would be measuring a game nobody can
 * play, and a report built on it would be measuring nothing.
 *
 * So the input below is the dice on the table, how many throws are left, which
 * categories have been spent, the enemy's two public numbers, and the pile.
 * There is no seed, no generator and no forward look.
 *
 * Three decisions, and the two tiers are two answers to them:
 *
 *   **naive**      throws once, scores the biggest number it can see, and
 *                  drinks only when the pile is thin enough that one more
 *                  exchange could end the run. It never rerolls. The
 *                  first-time player who has not worked out that the two spare
 *                  throws are free, and the floor the slice has to be winnable
 *                  from.
 *
 *   **heuristic**  keeps its best group and its high faces, uses the throws it
 *                  is given, spends the *cheapest* hand that will finish the
 *                  thing, and tops up whenever a full Vial would not be
 *                  spilled. Allowed to be better than a first-time human; not
 *                  allowed to know anything a human at the same screen does
 *                  not.
 */

import { MAX_ROLLS } from '../../src/combat/roll.js'
import type { DieValue } from '../../src/combat/roll.js'
import { legalScores, multiplierOf } from '../../src/combat/hands.js'
import type { NamedHandId, ScoreId } from '../../src/combat/hands.js'
import { talismanFlatOf, totalsFor } from '../../src/combat/loadout.js'
import { coreDie } from '../../src/content/dice.js'
import type { CoreDieId, TalismanId } from '../../src/content/dice.js'
import { BONE_CEILING } from '../../src/content/bones.js'

export type Tier = 'naive' | 'heuristic'

/** Everything the screen is showing when a decision is due. */
export interface Table {
  readonly dice: readonly DieValue[]
  readonly rollsUsed: number
  readonly usedHands: readonly NamedHandId[]
  readonly enemyHp: number
  readonly enemyMaxHp: number
  /** What it breaks, every exchange it survives. Public, and never random. */
  readonly enemyDamage: number
  readonly bones: number
  readonly vials: number
  /**
   * What the talisman would add, per line. On the scorecard before the press,
   * so a policy is allowed to see it.
   *
   * The **item dice are deliberately absent** from this. They have not been
   * thrown when the decision is due, and a policy that reasoned about their
   * expected value would be reasoning about something the screen does not
   * show — which is the one rule this file exists to keep. It is also why no
   * balance figure may assume them: the model plays as if they are not there,
   * and whatever they add is upside on top of what the report prints.
   */
  readonly talismans: readonly TalismanId[]
}

interface Option {
  readonly id: ScoreId
  readonly damage: number
}

function options(t: Table): readonly Option[] {
  return legalScores(t.dice, t.usedHands).map((id) => ({
    id,
    damage: totalsFor(t.dice, id, {
      itemFlats: 0,
      talismanFlat: talismanFlatOf(t.talismans, id),
    }).damage,
  }))
}

function best(list: readonly Option[]): Option | undefined {
  return [...list].sort((a, b) => b.damage - a.damage)[0]
}

/**
 * Which hand to spend.
 *
 * Naive takes the biggest number on the card. The solver's one extra idea is
 * **do not overpay for a kill**: if three of the legal hands all finish the
 * thing, the cheapest of them finishes it just as dead and leaves the
 * expensive one on the card for the next fight's worth of attacks.
 */
export function scoreFor(t: Table, tier: Tier): ScoreId | undefined {
  const all = options(t)
  if (all.length === 0) return undefined
  if (tier === 'naive') return best(all)!.id

  const lethal = all.filter((o) => o.damage >= t.enemyHp)
  if (lethal.length > 0) {
    return [...lethal].sort((a, b) => multiplierOf(a.id) - multiplierOf(b.id))[0]!.id
  }
  return best(all)!.id
}

/**
 * How good a hand has to be before it is not worth throwing again.
 *
 * `5.5 × 6` is a shade above what an ordinary Pair on an average roll pays, so
 * the solver throws again on anything mediocre and stops on anything that is
 * actually working. It is stated per die and multiplied by the hand rather
 * than by `dice.length`, which is now always six — kept in that form because
 * the number was calibrated per die and reads as what it is.
 */
const WORTH_KEEPING = 5.5

/** Whether to commit now, or spend a throw. */
export function shouldScore(t: Table, tier: Tier): boolean {
  if (t.dice.length === 0) return false
  if (t.rollsUsed >= MAX_ROLLS) return true
  if (tier === 'naive') return true
  const top = best(options(t))
  if (!top) return true
  // A hand that finishes it is never worth improving.
  if (top.damage >= t.enemyHp) return true
  return top.damage >= WORTH_KEEPING * t.dice.length
}

/**
 * Which dice to keep.
 *
 * Two ideas and no third: **keep the biggest group**, because the group is
 * what makes a shape, and **keep high faces**, because every die on the table
 * adds to the total whether or not it is part of the pattern. A five kept
 * outside a group of sixes is not a wasted position — it is four points of
 * damage before the multiplier.
 *
 * It does not chase straights. That is a real hole in the policy and it is
 * left open on purpose: the report should measure what an obvious line of play
 * produces before anybody tunes against a clever one.
 */
export function holdFor(t: Table, tier: Tier): readonly number[] {
  if (tier === 'naive' || t.dice.length === 0) return []

  const counts = new Map<DieValue, number>()
  for (const die of t.dice) counts.set(die, (counts.get(die) ?? 0) + 1)

  let groupFace: DieValue | undefined
  let groupSize = 1
  for (const [face, n] of counts) {
    if (n > groupSize || (n === groupSize && groupFace !== undefined && face > groupFace)) {
      groupFace = face
      groupSize = n
    }
  }

  // Six is always worth keeping; five is worth keeping unless the group it
  // would compete with is itself made of fives or sixes.
  const keepHigh = (die: DieValue): boolean =>
    die === 6 || (die === 5 && (groupFace === undefined || groupFace < 5))

  const held: number[] = []
  t.dice.forEach((die, index) => {
    if (groupSize >= 2 && die === groupFace) return void held.push(index)
    if (keepHigh(die)) held.push(index)
  })
  // A throw in which nothing moves is refused by the reducer, so the policy
  // never asks for one: it lets its lowest kept die go instead.
  if (held.length === t.dice.length) held.pop()
  return held
}

/**
 * Whether to drink, and it is the one place the two tiers nearly agree.
 *
 * Both drink when the pile is thin, because a Vial saved through a death is a
 * Vial wasted. Naive waits until a single exchange could end things; the
 * solver tops up whenever a full Vial would not be spilled — and it still
 * watches the eight-bone line, which is now simply *the pile is thin* rather
 * than *the attack is about to narrow*. Nothing about the hand depends on it
 * any more.
 */
export function drinkFor(t: Table, tier: Tier): boolean {
  if (t.vials <= 0) return false
  if (t.bones >= BONE_CEILING) return false
  if (tier === 'naive') return t.bones <= t.enemyDamage * 2
  if (t.bones <= 8) return true
  return t.bones <= BONE_CEILING - 5
}

// ── buying a die ───────────────────────────────────────────────────────

/**
 * How a simulated player answers a priced die.
 *
 * Six policies, and the sweep exists to say which dominates rather than to
 * assume. The expectation going in is that **always-take dominates at thirty
 * bones** — three of thirty is close to free — and the point of measuring it is
 * that *we expect* is not a number. See `docs/COMBAT.md` § Balance.
 *
 *   `never`      walk past every table and every chain. The floor.
 *   `always`     buy whatever is offered, whenever the pile allows it.
 *   `fits`       buy only when the die improves the slot it would replace, or
 *                doubles down on an archetype the hand is already building.
 *   `above-N`    always-take, but only while the pile is over N.
 */
export type DiePolicy = 'never' | 'always' | 'fits' | 'above-10' | 'above-15' | 'above-20'

export const DIE_POLICIES: readonly DiePolicy[] = [
  'never',
  'always',
  'fits',
  'above-10',
  'above-15',
  'above-20',
]

/** Exactly what is on the screen when a die is being decided on. */
export interface Shop {
  readonly die: CoreDieId
  /** Absent for the treasure, which is unpriced. */
  readonly price?: number
  readonly bones: number
  readonly hand: readonly CoreDieId[]
}

/** What a die averages. The one number a strip of six chips actually conveys. */
const meanFace = (id: CoreDieId): number =>
  coreDie(id).faces.reduce((total, face) => total + face, 0) / coreDie(id).faces.length

/**
 * How many different things a die can come up with.
 *
 * The other number a strip conveys at a glance, and the interesting one: a die
 * with three distinct faces makes a TRIPLE far more often than one with six, and
 * a player reading `1 1 2 2 6 6` can see that without arithmetic.
 */
const distinctFaces = (id: CoreDieId): number => new Set(coreDie(id).faces).size

/** The floor over which a policy named `above-N` will part with bones. */
function floorOf(policy: DiePolicy): number {
  const named = /^above-(\d+)$/.exec(policy)
  return named ? Number(named[1]) : 0
}

/**
 * Which of the six to give up for this die, or nothing because it is declined.
 *
 * It chooses the **weakest slot by mean face**, which is the only comparison a
 * strip of chips supports without arithmetic a player would not do: a run holding
 * five bones and a Jawbone gives up a bone. Ties go to the earliest slot, so the
 * answer is deterministic.
 *
 * A bargain is never lethal, so the pile has to be strictly over the price — the
 * same rule the reducer enforces, stated here so the policy never asks for a press
 * that would be refused.
 */
export function buyFor(shop: Shop, policy: DiePolicy): number | undefined {
  if (policy === 'never') return undefined
  const price = shop.price ?? 0
  if (price > 0 && shop.bones <= price) return undefined
  if (shop.bones <= floorOf(policy)) return undefined

  let slot = 0
  for (let i = 1; i < shop.hand.length; i++) {
    if (meanFace(shop.hand[i]!) < meanFace(shop.hand[slot]!)) slot = i
  }

  if (policy === 'fits') {
    // **The archetype heuristic**, and it is three reasons rather than one:
    //
    //   it hits harder   — a higher mean than the worst thing in the hand;
    //   it hits narrower — fewer distinct faces, which is what makes multiples;
    //   it doubles down  — the hand already holds one, so a second sharpens it.
    //
    // The narrowness test is the one that matters and the one a mean-face rule
    // misses entirely: a Knucklebone averages *less* than a plain bone and is far
    // better at FOUR, which is the whole reason the crooked dice are interesting.
    const better = meanFace(shop.die) > meanFace(shop.hand[slot]!)
    const narrower = distinctFaces(shop.die) < distinctFaces(shop.hand[slot]!)
    const doubling = shop.hand.includes(shop.die)
    if (!better && !narrower && !doubling) return undefined
  }
  return slot
}
