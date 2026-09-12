/**
 * The scorecard: every hand, what it takes, and what it multiplies by.
 *
 * The one place the hand table lives. A multiplier written down twice is a
 * multiplier that will disagree with itself, so the reducer, the tray, the
 * menu and the balance simulation all read this file and none of them holds a
 * number of its own.
 *
 * Everything here is pure. Nothing imports state, content, UI or render;
 * nothing draws a random number; nothing knows an enemy exists. A hand is a
 * function of the faces on the table and the categories already spent.
 *
 * ## Two meanings at once
 *
 * The dice say two things simultaneously, and the interesting decision in the
 * game is that they are not the same thing:
 *
 *   - **they add up.** Every die on the table counts, including the ones that
 *     took no part in the pattern.
 *   - **they make a shape.** The shape picks exactly one multiplier.
 *
 * So a player wants a stronger pattern *and* high individual faces, and often
 * cannot have both. `6 6 6 4 4 3` is a Full House worth 58 or a Triple worth
 * 43, and the difference is which category is still unspent.
 *
 * ## Spent once, and only when chosen
 *
 * A named hand is consumed when the player deliberately scores it, and never
 * otherwise. There is no scratching, no burning and no forced zero: a bad roll
 * costs a roll and nothing else. When nothing unspent qualifies there is
 * always CRAP, which is weak, reusable, and not a category.
 */

import type { DieValue } from './roll.js'

export type NamedHandId =
  | 'pair'
  | 'two-pair'
  | 'triple'
  | 'small-straight'
  | 'straight'
  | 'full-house'
  | 'four-kind'
  | 'three-pair'
  | 'run-of-six'
  | 'two-triples'
  | 'five-kind'
  | 'six-kind'

/** Every way an attack can be scored. CRAP is the fallback, not a category. */
export type ScoreId = NamedHandId | 'crap'

export interface HandDefinition {
  readonly id: NamedHandId
  /** The label on the scorecard. Short: the well is narrow. */
  readonly name: string
  /**
   * The same hand in four characters or fewer.
   *
   * The card shows only the lines the dice actually make, so it is one row of
   * between one and five — five being the most that can ever be legal at once,
   * counted over all 46 656 rolls. At one, two or three the row is wide enough
   * for the whole name; at four or five it is not, and an abbreviation the
   * player can still read beats a name clipped mid-word.
   */
  readonly short: string
  readonly multiplier: number
  /** The pattern in one sentence, in digits where digits will do. */
  readonly rule: string
  /** Whether this roll contains the shape. Pure, and takes only the faces. */
  readonly matches: (counts: ReadonlyMap<DieValue, number>, dice: readonly DieValue[]) => boolean
}

/** What a roll with no unspent named hand is still worth. */
export const CRAP_MULTIPLIER = 0.5

export const CRAP_NAME = 'CRAP'

/** How many of each face are on the table. */
export function faceCounts(dice: readonly DieValue[]): ReadonlyMap<DieValue, number> {
  const counts = new Map<DieValue, number>()
  for (const die of dice) counts.set(die, (counts.get(die) ?? 0) + 1)
  return counts
}

/** How many dice share the most common face. */
function highestMultiplicity(counts: ReadonlyMap<DieValue, number>): number {
  let best = 0
  for (const n of counts.values()) if (n > best) best = n
  return best
}

/** How many distinct faces appear at least `n` times. */
function valuesAtLeast(counts: ReadonlyMap<DieValue, number>, n: number): number {
  let found = 0
  for (const count of counts.values()) if (count >= n) found++
  return found
}

/**
 * Three of one face and two of a *different* one.
 *
 * Read off multiplicities rather than off an exact partition, so `3 3 3 3 5 5`
 * qualifies (four threes contain three) and `3 3 3 3 3 1` does not (there is
 * no second face appearing twice). A group is *selectable*, not exclusive.
 */
function fullHouse(counts: ReadonlyMap<DieValue, number>): boolean {
  for (const [value, n] of counts) {
    if (n < 3) continue
    for (const [other, m] of counts) {
      if (other !== value && m >= 2) return true
    }
  }
  return false
}

/**
 * A run of `length` distinct consecutive faces, anywhere on the table.
 *
 * One function for all three lengths, because three hand-written face lists
 * would be three chances to write `[2, 3, 4, 5, 6]` wrong. On ordinary d6s a
 * run of five is 1–5 or 2–6, and a run of six is the only roll that holds
 * every face at once.
 */
function runOf(counts: ReadonlyMap<DieValue, number>, length: number): boolean {
  const has = (v: number): boolean => (counts.get(v as DieValue) ?? 0) > 0
  for (let start = 1; start + length - 1 <= 6; start++) {
    let whole = true
    for (let i = 0; i < length; i++) if (!has(start + i)) whole = false
    if (whole) return true
  }
  return false
}

/**
 * The table.
 *
 * These multipliers are **provisional tuning values**, not product law, and
 * this is the one place to change them. Ordered weakest to strongest, which is
 * the order the scorecard prints in.
 *
 * ## What each hand is worth, measured
 *
 * Six d6s is 46 656 rolls, so how often a shape turns up is not an estimate —
 * it is a count. Over every roll, with plain bones:
 *
 *     PAIR           98.46%   x1        FOUR            5.22%   x2.5
 *     TWO PAIR       55.62%   x1.25     THREE PAIR      3.86%   x2.6
 *     TRIPLE         36.73%   x1.5      THE LADDER      1.54%   x2.8
 *     SHORT RUN      27.01%   x1.6      TWO TRIPLES     0.64%   x2.9
 *     FULL HOUSE     17.04%   x2        FIVE            0.40%   x3
 *     STRAIGHT        9.26%   x1.75     SIX             0.01%   x4
 *
 * The four added here are placed **by that count**, in the gaps between the
 * rungs that already existed, so that rarer never pays less among them. No
 * existing multiplier was touched: the wave that wanted more hands did not ask
 * for the old ones to be re-priced, and re-pricing them is a separate decision
 * with its own balance run.
 *
 * ## One inversion, reported rather than tuned
 *
 * **FULL HOUSE turns up at 17.04% and pays x2; STRAIGHT turns up at 9.26% and
 * pays x1.75.** The rarer hand pays less, and it has been that way since the
 * table was written. Fixing it means swapping two numbers a lot of other
 * measurements sit on, so it is written down here and in `COMBAT.md` § Balance
 * for a decision rather than quietly corrected.
 *
 * ## What the crooked dice do to the new ones
 *
 * THE LADDER needs all six faces at once, so it is the first hand in the game a
 * loaded bone can put **out of reach**: a Jawbone rolls only 1s and 6s, and a
 * hand carrying two of them can no longer make a run of six at all. That is the
 * intended shape of the trade — a crooked die changes what the throw comes up
 * with, and what it comes up with is now sometimes a door closing.
 */
export const HAND_DEFINITIONS: readonly HandDefinition[] = [
  {
    id: 'pair',
    short: 'PAIR',
    name: 'PAIR',
    multiplier: 1.0,
    rule: 'Two bones alike.',
    matches: (counts) => highestMultiplicity(counts) >= 2,
  },
  {
    id: 'two-pair',
    short: '2 PR',
    name: 'TWO PAIR',
    multiplier: 1.25,
    rule: 'Two different faces, twice each.',
    matches: (counts) => valuesAtLeast(counts, 2) >= 2,
  },
  {
    id: 'triple',
    short: 'TRIP',
    name: 'TRIPLE',
    multiplier: 1.5,
    rule: 'Three bones alike.',
    matches: (counts) => highestMultiplicity(counts) >= 3,
  },
  {
    id: 'small-straight',
    short: 'RUN4',
    name: 'SHORT RUN',
    multiplier: 1.6,
    rule: 'Four in a row.',
    matches: (counts) => runOf(counts, 4),
  },
  {
    id: 'straight',
    short: 'RUN5',
    name: 'STRAIGHT',
    multiplier: 1.75,
    rule: 'Five in a row: 1–5 or 2–6.',
    matches: (counts) => runOf(counts, 5),
  },
  {
    id: 'full-house',
    short: 'FULL',
    name: 'FULL HOUSE',
    multiplier: 2.0,
    rule: 'Three alike and two others alike.',
    matches: (counts) => fullHouse(counts),
  },
  {
    id: 'four-kind',
    short: '4 OF',
    name: 'FOUR',
    multiplier: 2.5,
    rule: 'Four bones alike.',
    matches: (counts) => highestMultiplicity(counts) >= 4,
  },
  {
    id: 'three-pair',
    short: '3 PR',
    name: 'THREE PAIR',
    multiplier: 2.6,
    rule: 'Three different faces, twice each.',
    matches: (counts) => valuesAtLeast(counts, 2) >= 3,
  },
  {
    id: 'run-of-six',
    short: 'LADR',
    name: 'THE LADDER',
    multiplier: 2.8,
    rule: 'Every face at once: 1 to 6.',
    matches: (counts) => runOf(counts, 6),
  },
  {
    id: 'two-triples',
    short: '2 TR',
    name: 'TWO TRIPLES',
    multiplier: 2.9,
    rule: 'Two different faces, three each.',
    matches: (counts) => valuesAtLeast(counts, 3) >= 2,
  },
  {
    id: 'five-kind',
    short: '5 OF',
    name: 'FIVE',
    multiplier: 3.0,
    rule: 'Five bones alike.',
    matches: (counts) => highestMultiplicity(counts) >= 5,
  },
  {
    id: 'six-kind',
    short: '6 OF',
    name: 'SIX',
    multiplier: 4.0,
    rule: 'All six alike.',
    matches: (counts) => highestMultiplicity(counts) >= 6,
  },
]

const BY_ID: ReadonlyMap<NamedHandId, HandDefinition> = new Map(
  HAND_DEFINITIONS.map((h) => [h.id, h]),
)

/** Every named hand, in scorecard order. */
export const NAMED_HANDS: readonly NamedHandId[] = HAND_DEFINITIONS.map((h) => h.id)

export function handDefinition(id: NamedHandId): HandDefinition {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`no such hand: ${id}`)
  return found
}

export function isNamedHandId(id: string): id is NamedHandId {
  return BY_ID.has(id as NamedHandId)
}

export function isScoreId(id: string): id is ScoreId {
  return id === 'crap' || isNamedHandId(id)
}

/** What a score is called, on the scorecard and in the copy. */
export function scoreName(id: ScoreId): string {
  return id === 'crap' ? CRAP_NAME : handDefinition(id).name
}

/** What a score multiplies the sum by. */
export function multiplierOf(id: ScoreId): number {
  return id === 'crap' ? CRAP_MULTIPLIER : handDefinition(id).multiplier
}

/**
 * Every named hand this roll contains, spent or not.
 *
 * A roll qualifies for as many shapes as it actually contains — `5 5 5 2 2 4`
 * is a Pair and a Two Pair and a Triple and a Full House, all at once — and
 * choosing one of them consumes only that one. Fewer dice make the larger
 * shapes simply absent, with no rule written anywhere to say so.
 */
export function matchingHands(dice: readonly DieValue[]): readonly NamedHandId[] {
  if (dice.length === 0) return []
  const counts = faceCounts(dice)
  return HAND_DEFINITIONS.filter((h) => h.matches(counts, dice)).map((h) => h.id)
}

/**
 * What the player may press right now.
 *
 * Every unspent named hand the roll contains — and when there is not one, the
 * single-element fallback. CRAP is never *added* to a list of named hands: it
 * is what the list is when there are none, which is the whole of why a bad
 * roll cannot burn a category.
 */
export function legalScores(
  dice: readonly DieValue[],
  used: readonly NamedHandId[],
): readonly ScoreId[] {
  if (dice.length === 0) return []
  const spent = new Set(used)
  const named = matchingHands(dice).filter((id) => !spent.has(id))
  return named.length > 0 ? named : ['crap']
}

export interface ScoreResult {
  /** Every die on the table, added. Not only the ones in the pattern. */
  readonly sum: number
  readonly multiplier: number
  /** `max(1, floor(sum × multiplier))`. Never zero, never negative. */
  readonly damage: number
}

/** Every die on the table, added up. */
export function sumOf(dice: readonly DieValue[]): number {
  return dice.reduce((total: number, die) => total + die, 0)
}

/**
 * What an attack does, in full.
 *
 * The one damage equation in the game, and there is no bonus anywhere else:
 * the sum is every die, the multiplier is the chosen hand's, and the floor of
 * one is what keeps even a single bone worth throwing.
 */
export function scoreDice(dice: readonly DieValue[], hand: ScoreId): ScoreResult {
  const sum = sumOf(dice)
  const multiplier = multiplierOf(hand)
  return { sum, multiplier, damage: Math.max(1, Math.floor(sum * multiplier)) }
}
