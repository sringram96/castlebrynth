import { describe, expect, it } from 'vitest'

import { HAND_SIZE, LADDER, PLAIN_POUCH } from '../src/content/index.js'
import type { Card, Die, DieId, Hand, Intent, Line, Turn, Value } from '../src/lots/index.js'
import { LINES, claimable, shapesOf } from '../src/lots/index.js'

/**
 * The floor, restated for the bare hand (arts 46, 48, 55, 63, 64).
 *
 * This file used to enforce the whiff clause — no hand could fail to score —
 * which art. 46 repealed in favour of the ANY DICE line. It has been
 * restated twice since, because art. 55 has moved the bare hand twice and
 * the pigeonhole argument underneath it is a different argument each time.
 *
 * **At six** (art. 55 as amended 2026-08-06, and where it stands now) the
 * two branches are: a repeated value, which is a pair; or six distinct
 * values, which can only be all of 1–6 and is therefore the straight. So
 * something above the floor is always there, and it is tight at ×2 — the
 * hand 1-1-2-3-5-6 makes a pair and a run of 3 and nothing better. Neither
 * half of the guarantee holds on its own.
 *
 * **At five** (the 2026-08-05 ruling, now superseded) the branches were a
 * repeat or five distinct values omitting one of 1–6, and omitting any one
 * always leaves three consecutive behind: *a pair or a run of 3*, also tight
 * at ×2. Three lines of the ladder — the straight, three pairs, two triples
 * — sat on the card out of a bare hand's reach, and the sixth die that
 * opened them was a dead traveler's. **That is the clause the amendment
 * repealed**: a bare hand now reaches every line on the card, and what a
 * traveler's die buys is a better hand rather than a longer ladder.
 */

/** art. 55 (amended): the bare hand, as the first waking assembles it. */
const BARE = PLAIN_POUCH.dice.length

/** arts 48, 60: the lines no hand shorter than six can make, whatever it rolls. */
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

  it('is tight at ×2: some bare hand reaches no better (arts 48, 55)', () => {
    let worst = Number.POSITIVE_INFINITY
    for (const hand of everyHand(BARE)) worst = Math.min(worst, bestAboveFloor(hand))
    // Never nothing — the shape above is always there.
    expect(worst).toBeGreaterThan(0)
    // And never better than a pair or a run of 3, both of which are ×2.
    expect(worst).toBe(LADDER.pair.multiplier)
    expect(worst).toBe(LADDER['run-3'].multiplier)
    // The witness, so the number is a hand and not a coincidence.
    expect(bestAboveFloor([1, 1, 2, 3, 5, 6] as Value[])).toBe(2)
  })

  /**
   * arts 48, 55 (amended 2026-08-06): **the whole card is spendable from the
   * waking.** The bare hand is six, so the three six-die lines are in reach
   * of it and a run can no longer carry lines it has no way to claim.
   */
  it('leaves no line of the ladder out of a bare hand’s reach (arts 48, 55)', () => {
    const reachable = new Set<Line>()
    for (const hand of everyHand(BARE)) for (const line of linesIn(hand)) reachable.add(line)
    for (const line of LINES) expect([...reachable], line).toContain(line)
    // The three that used to be out of reach, named, because they are the
    // whole difference the amendment made.
    for (const line of NEEDS_SIX) expect([...reachable], line).toContain(line)
  })

  it('keeps the six-die lines six-die lines (arts 48, 60)', () => {
    expect(HAND_SIZE).toBe(BARE)
    expect(shapesOf([1, 2, 3, 4, 5, 6] as Value[])).toContain('straight')
    expect(shapesOf([1, 1, 2, 2, 3, 3] as Value[])).toContain('three-pairs')
    expect(shapesOf([1, 1, 1, 2, 2, 2] as Value[])).toContain('two-triples')
    // A hand one short of six makes none of them, whatever it rolls: these
    // are shapes and not sizes, and a wound that shrinks the hand shuts them.
    const shorter = new Set<Line>()
    for (const hand of everyHand(BARE - 1)) for (const line of linesIn(hand)) shorter.add(line)
    for (const line of NEEDS_SIX) expect([...shorter], line).not.toContain(line)
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
