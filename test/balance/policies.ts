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
import { legalScores, multiplierOf, scoreDice } from '../../src/combat/hands.js'
import type { NamedHandId, ScoreId } from '../../src/combat/hands.js'
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
}

interface Option {
  readonly id: ScoreId
  readonly damage: number
}

function options(t: Table): readonly Option[] {
  return legalScores(t.dice, t.usedHands).map((id) => ({
    id,
    damage: scoreDice(t.dice, id).damage,
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
 * Per die on the table, because a wounded attack rolls fewer of them and its
 * ceiling falls with it. `5.5 × n` is a shade above what an ordinary Pair on
 * an average roll pays, so the solver throws again on anything mediocre and
 * stops on anything that is actually working.
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
 * solver tops up whenever a full Vial would not be spilled — and it watches
 * the six-bone line, because below it the attack itself gets narrower and the
 * fight starts compounding.
 */
export function drinkFor(t: Table, tier: Tier): boolean {
  if (t.vials <= 0) return false
  if (t.bones >= BONE_CEILING) return false
  if (tier === 'naive') return t.bones <= t.enemyDamage * 2
  if (t.bones <= 8) return true
  return t.bones <= BONE_CEILING - 5
}
