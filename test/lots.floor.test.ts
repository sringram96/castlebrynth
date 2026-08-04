import { describe, expect, it } from 'vitest'

import { LADDER } from '../src/content/index.js'
import type { Card, Die, DieId, Hand, Intent, Line, Turn, Value } from '../src/lots/index.js'
import { LINES, claimable } from '../src/lots/index.js'

/**
 * The floor, after the amendment. This file used to enforce the whiff
 * clause — no hand of six could fail to score — which art. 46 repeals. What
 * replaces it is the ANY DICE line: a turn without a shape is a turn of
 * armor and patience, never a turn with nothing to do, and the floor is a
 * line on the card like any other (arts 46, 48, 63, 64).
 */

const INTENT: Intent = { verb: 'RAKE', amount: 8 }

const card = (spent: readonly Line[] = []): Card =>
  Object.fromEntries(LINES.map((line) => [line, spent.includes(line)])) as Card

const die = (i: number): Die => ({
  id: `bone.${i}` as DieId,
  body: 6,
  faces: [1, 2, 3, 4, 5, 6].map((v) => ({ value: v as Value })),
})

function turnOf(values: readonly number[], spent: readonly Line[] = []): Turn {
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
  }
}

const everyDie = (turn: Turn): readonly DieId[] => turn.hand.dice.map((d) => d.id)

describe('lots — art. 46 (the ANY DICE floor), art. 48 (the shapes), arts 63–64 (the card)', () => {
  it('leaves every one of the 46656 hands of six something to claim (art. 46)', () => {
    const barren: number[][] = []
    const values = [1, 2, 3, 4, 5, 6]
    for (const a of values) {
      for (const b of values) {
        for (const c of values) {
          for (const d of values) {
            for (const e of values) {
              for (const f of values) {
                const hand = [a, b, c, d, e, f]
                const turn = turnOf(hand)
                if (claimable(turn, everyDie(turn), LADDER).length === 0) barren.push(hand)
              }
            }
          }
        }
      }
    }
    expect(barren).toEqual([])
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
