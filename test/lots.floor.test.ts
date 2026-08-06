import { describe, expect, it } from 'vitest'

import { HAND_SIZE, LADDER, PLAIN_POUCH } from '../src/content/index.js'
import type { Card, Die, DieId, Hand, Intent, Line, Turn, Value } from '../src/lots/index.js'
import { LINES, claimable, shapesOf } from '../src/lots/index.js'

/**
 * The floor, restated for a hand of five (arts 46, 48, 55, 63, 64).
 *
 * This file used to enforce the whiff clause — no hand of six could fail to
 * score — which art. 46 repealed in favour of the ANY DICE line. The
 * travelers ruling of 2026-08-05 moves it again, because the bare hand is
 * now five dice and the pigeonhole argument underneath it is a different
 * argument.
 *
 * **At six**, five dice over six values either repeated a value — a pair —
 * or held all six, which is the straight. The guarantee was a shape, and the
 * best case of the all-distinct branch was the top of the ladder.
 *
 * **At five**, the two branches are: a repeat, which is a pair; or five
 * distinct values, which omits exactly one of 1–6 — and omitting any one
 * value from 1–6 always leaves three consecutive behind. So the guarantee is
 * *a pair or a run of 3*, and it is tight at ×2: the hand 1-1-2-3-5 makes
 * nothing better. Neither half is guaranteed on its own.
 *
 * And three lines of the ladder leave the bare player's reach entirely: the
 * straight, three pairs, and two triples all want six dice. They are on the
 * card, they are unclaimable, and the sixth die that opens them is a dead
 * traveler's (art. 86). That is the amendment's real arithmetic, and it is
 * asserted here rather than described.
 */

/** art. 55 (amended): the bare hand, as the first waking assembles it. */
const BARE = PLAIN_POUCH.dice.length

/** arts 48, 55: the lines a hand of five can never make, whatever it rolls. */
const NEEDS_SIX: readonly Line[] = ['straight', 'three-pairs', 'two-triples']

/** Every hand of `size` dice, as values. 6^size of them. */
function* everyHand(size: number): Generator<readonly Value[]> {
  const out: Value[] = []
  function* go(left: number): Generator<readonly Value[]> {
    if (left === 0) return yield [...out]
    for (let v = 1; v <= 6; v++) {
      out.push(v as Value)
      yield* go(left - 1)
      out.pop()
    }
  }
  yield* go(size)
}

/** Every line any subset of a hand could claim, ignoring the card. */
function linesIn(hand: readonly Value[]): Set<Line> {
  const found = new Set<Line>()
  for (let mask = 1; mask < 1 << hand.length; mask++) {
    for (const line of shapesOf(hand.filter((_, i) => (mask >> i) & 1))) found.add(line)
  }
  return found
}

/** The best tier a hand can reach above the floor, or 0 for none. */
function bestAboveFloor(hand: readonly Value[]): number {
  let best = 0
  for (const line of linesIn(hand)) {
    if (line === 'any-dice') continue
    best = Math.max(best, LADDER[line].multiplier)
  }
  return best
}

const INTENT: Intent = { verb: 'RAKE', amount: 8 }

const card = (spent: readonly Line[] = []): Card =>
  Object.fromEntries(LINES.map((line) => [line, spent.includes(line)])) as Card

const die = (i: number): Die => ({
  id: `bone.${i}` as DieId,
  body: 6,
  faces: [1, 2, 3, 4, 5, 6].map((v) => ({ value: v as Value })),
})

function turnOf(values: readonly Value[] | readonly number[], spent: readonly Line[] = []): Turn {
  const dice = values.map((_, i) => die(i))
  const hand: Hand = { dice }
  const landed = values.map((value, i) => ({
    die: dice[i].id,
    face: { value: value as Value },
    kept: false,
  }))
  return {
    intent: INTENT,
    hand,
    castings: [landed],
    castingsAllowed: 2,
    claims: [],
    card: card(spent),
    bound: [],
  }
}

const everyDie = (turn: Turn): readonly DieId[] => turn.hand.dice.map((d) => d.id)

describe('lots — art. 46 (the ANY DICE floor), art. 48 (the shapes), arts 63–64 (the card)', () => {
  it('leaves every one of the 7776 hands of five something to claim (art. 46)', () => {
    const barren: (readonly Value[])[] = []
    let counted = 0
    for (const hand of everyHand(BARE)) {
      counted++
      const turn = turnOf(hand)
      if (claimable(turn, everyDie(turn), LADDER).length === 0) barren.push(hand)
    }
    expect(counted).toBe(6 ** BARE)
    expect(barren).toEqual([])
  })

  /**
   * The restated pigeonhole. Not "something to claim" — ANY DICE makes that
   * trivially true — but a *shape*: five dice cannot avoid both a repeat and
   * three consecutive values.
   */
  it('leaves every hand of five a pair or a run of 3, and no hand both-less (arts 46, 48)', () => {
    const shapeless: (readonly Value[])[] = []
    for (const hand of everyHand(BARE)) {
      const lines = linesIn(hand)
      if (!lines.has('pair') && !lines.has('run-3')) shapeless.push(hand)
    }
    expect(shapeless).toEqual([])
  })

  it('guarantees neither half of that on its own — the pair alone is not law', () => {
    // 1-2-3-4-5 is all run and no pair; 1-1-1-1-1 is all pair and no run.
    expect(linesIn([1, 2, 3, 4, 5] as Value[]).has('pair')).toBe(false)
    expect(linesIn([1, 1, 1, 1, 1] as Value[]).has('run-3')).toBe(false)
    // Which is why the guarantee is the disjunction and nothing narrower.
    expect(linesIn([1, 2, 3, 4, 5] as Value[]).has('run-3')).toBe(true)
    expect(linesIn([1, 1, 1, 1, 1] as Value[]).has('pair')).toBe(true)
  })

  it('is tight at ×2: some hand of five reaches no better (arts 48, 55)', () => {
    let worst = Number.POSITIVE_INFINITY
    for (const hand of everyHand(BARE)) worst = Math.min(worst, bestAboveFloor(hand))
    // Never nothing — the shape above is always there.
    expect(worst).toBeGreaterThan(0)
    // And never better than a pair or a run of 3, both of which are ×2.
    expect(worst).toBe(LADDER.pair.multiplier)
    expect(worst).toBe(LADDER['run-3'].multiplier)
    // The witness, so the number is a hand and not a coincidence.
    expect(bestAboveFloor([1, 1, 2, 3, 5] as Value[])).toBe(2)
  })

  /**
   * arts 48, 55, 86: what the amendment took away. Three lines sit on the
   * card that a bare hand can never spend — and the die that opens them came
   * off somebody who did not come back.
   */
  it('puts three lines of the ladder out of a bare hand’s reach (arts 48, 55)', () => {
    const reachable = new Set<Line>()
    for (const hand of everyHand(BARE)) for (const line of linesIn(hand)) reachable.add(line)
    for (const line of NEEDS_SIX) expect([...reachable], line).not.toContain(line)
    // They are on the card regardless: the card is the ladder, not the hand.
    for (const line of NEEDS_SIX) expect(LINES).toContain(line)
    // Everything else on the ladder is reachable at five.
    for (const line of LINES) {
      if (NEEDS_SIX.includes(line)) continue
      expect([...reachable], line).toContain(line)
    }
  })

  it('opens all three again the moment the hand is six (arts 56, 60, 86)', () => {
    expect(HAND_SIZE).toBe(BARE + 1)
    expect(shapesOf([1, 2, 3, 4, 5, 6] as Value[])).toContain('straight')
    expect(shapesOf([1, 1, 2, 2, 3, 3] as Value[])).toContain('three-pairs')
    expect(shapesOf([1, 1, 1, 2, 2, 2] as Value[])).toContain('two-triples')
  })

  it('names 1-2-3-4-5-6 the straight, and not a run of six (art. 48)', () => {
    const turn = turnOf([1, 2, 3, 4, 5, 6])
    expect(claimable(turn, everyDie(turn), LADDER)).toContain('straight')
  })

  it('offers a composite as one line, not the lines inside it (art. 64)', () => {
    const turn = turnOf([3, 3, 3, 5, 5, 1])
    const fullHouse = turn.hand.dice.slice(0, 5).map((d) => d.id)
    expect([...claimable(turn, fullHouse, LADDER)].sort()).toEqual(['any-dice', 'full-house'])
  })

  it('does not offer a line the card has already spent this fight (art. 63)', () => {
    const turn = turnOf([6, 6, 2, 3, 4, 1], ['pair'])
    const pair = turn.hand.dice.slice(0, 2).map((d) => d.id)
    expect(claimable(turn, pair, LADDER)).not.toContain('pair')
  })

  it('leaves an empty card with nothing to claim — armor and patience (arts 46, 63)', () => {
    const turn = turnOf([6, 6, 6, 6, 6, 6], LINES)
    expect(claimable(turn, everyDie(turn), LADDER)).toEqual([])
  })
})
