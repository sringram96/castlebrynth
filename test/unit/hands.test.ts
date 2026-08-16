/**
 * The scorecard, as pure arithmetic.
 *
 * Every expectation here is written out in digits rather than derived from
 * `HAND_DEFINITIONS`, because a test that computes its expectation from the
 * thing it is testing proves nothing. If a multiplier moves, this file has to
 * move with it — which is the point: the table is tuning, and tuning that can
 * change without anybody noticing is not tuning, it is drift.
 */

import { describe, expect, it } from 'vitest'
import {
  CRAP_MULTIPLIER,
  HAND_DEFINITIONS,
  NAMED_HANDS,
  handDefinition,
  isNamedHandId,
  isScoreId,
  legalScores,
  matchingHands,
  multiplierOf,
  scoreDice,
  scoreName,
  sumOf,
} from '../../src/combat/hands.js'
import type { NamedHandId } from '../../src/combat/hands.js'
import type { DieValue } from '../../src/combat/roll.js'

const dice = (...values: number[]): readonly DieValue[] => values as DieValue[]
const matches = (...values: number[]): readonly NamedHandId[] => matchingHands(dice(...values))

describe('the table', () => {
  it('holds the eight named hands and their multipliers', () => {
    expect(HAND_DEFINITIONS.map((h) => [h.id, h.multiplier])).toEqual([
      ['pair', 1.0],
      ['two-pair', 1.25],
      ['triple', 1.5],
      ['straight', 1.75],
      ['full-house', 2.0],
      ['four-kind', 2.5],
      ['five-kind', 3.0],
      ['six-kind', 4.0],
    ])
  })

  it('keeps CRAP off the card and at half', () => {
    expect(CRAP_MULTIPLIER).toBe(0.5)
    expect(NAMED_HANDS).not.toContain('crap')
    expect(isNamedHandId('crap')).toBe(false)
    expect(isScoreId('crap')).toBe(true)
    expect(multiplierOf('crap')).toBe(0.5)
    expect(scoreName('crap')).toBe('CRAP')
  })

  it('refuses a hand it does not have', () => {
    expect(() => handDefinition('nonesuch' as never)).toThrow()
    expect(isScoreId('yahtzee')).toBe(false)
  })
})

describe('recognising a hand', () => {
  it('finds a pair', () => {
    expect(matches(2, 2, 3, 4, 5, 6)).toContain('pair')
  })

  it('finds two pair', () => {
    expect(matches(2, 2, 5, 5, 3, 6)).toContain('two-pair')
  })

  it('does not call one pair two pair', () => {
    expect(matches(2, 2, 3, 4, 5, 6)).not.toContain('two-pair')
  })

  it('finds a triple', () => {
    expect(matches(4, 4, 4, 1, 2, 6)).toContain('triple')
  })

  it('finds the low straight', () => {
    expect(matches(1, 2, 3, 4, 5)).toContain('straight')
  })

  it('finds the high straight', () => {
    expect(matches(2, 3, 4, 5, 6)).toContain('straight')
  })

  it('lets the sixth bone be anything', () => {
    expect(matches(1, 2, 3, 4, 5, 5)).toContain('straight')
    expect(matches(1, 2, 3, 4, 5, 6)).toContain('straight')
  })

  it('refuses four in a row', () => {
    expect(matches(1, 2, 3, 4, 6, 6)).not.toContain('straight')
  })

  it('finds a full house of three and two', () => {
    expect(matches(3, 3, 3, 5, 5, 1)).toContain('full-house')
  })

  it('finds a full house of three and three', () => {
    expect(matches(3, 3, 3, 5, 5, 5)).toContain('full-house')
  })

  it('finds a full house of four and two', () => {
    expect(matches(3, 3, 3, 3, 5, 5)).toContain('full-house')
  })

  it('refuses five alike and a spare as a full house', () => {
    // There is no *distinct* pair. Five threes contain a triple, but the two
    // threes left over are the same face, and a house needs two faces.
    expect(matches(3, 3, 3, 3, 3, 1)).not.toContain('full-house')
    expect(matches(3, 3, 3, 3, 3, 1)).toContain('five-kind')
  })

  it('finds four, five and six of a kind', () => {
    expect(matches(2, 2, 2, 2, 5, 6)).toContain('four-kind')
    expect(matches(2, 2, 2, 2, 2, 6)).toContain('five-kind')
    expect(matches(2, 2, 2, 2, 2, 2)).toContain('six-kind')
  })

  it('lets a bigger group satisfy a smaller one', () => {
    // Four of a kind is also a triple and also a pair. Which of them gets
    // spent is the player's decision, not the detector's.
    const four = matches(2, 2, 2, 2, 5, 6)
    expect(four).toContain('pair')
    expect(four).toContain('triple')
    expect(four).toContain('four-kind')
  })

  it('finds every hand a roll actually contains, at once', () => {
    expect([...matches(5, 5, 5, 2, 2, 4)].sort()).toEqual(
      ['full-house', 'pair', 'triple', 'two-pair'].sort(),
    )
  })

  it('finds nothing in six distinct faces that do not run', () => {
    expect(matches(1, 2, 3, 4, 6)).toEqual([])
  })

  it('finds nothing at all in an empty table', () => {
    expect(matchingHands([])).toEqual([])
  })
})

describe('fewer bones make the big hands impossible, with no rule to say so', () => {
  it('cannot make a full house with four dice', () => {
    // Three of one and two of another needs five. Nothing anywhere states
    // that; it falls out of the counting.
    for (const roll of [dice(3, 3, 3, 3), dice(6, 6, 6, 2), dice(1, 1, 2, 2)]) {
      expect(matchingHands(roll)).not.toContain('full-house')
    }
  })

  it('cannot make a straight with four dice', () => {
    expect(matches(1, 2, 3, 4)).not.toContain('straight')
  })

  it('cannot make five or six of a kind with four dice', () => {
    const four = matches(4, 4, 4, 4)
    expect(four).toContain('four-kind')
    expect(four).not.toContain('five-kind')
    expect(four).not.toContain('six-kind')
  })

  it('leaves a wounded player pair, two pair, triple and four', () => {
    expect([...matches(4, 4, 4, 4)].sort()).toEqual(['four-kind', 'pair', 'triple'].sort())
    expect([...matches(2, 2, 5, 5)].sort()).toEqual(['pair', 'two-pair'].sort())
  })

  it('finds a pair in two bones, and nothing in one', () => {
    expect(matches(6, 6)).toEqual(['pair'])
    expect(matches(6)).toEqual([])
  })
})

describe('what the player may press', () => {
  it('offers every unused hand the roll contains', () => {
    expect([...legalScores(dice(5, 5, 5, 2, 2, 4), [])].sort()).toEqual(
      ['full-house', 'pair', 'triple', 'two-pair'].sort(),
    )
  })

  it('leaves out the ones already spent', () => {
    const legal = legalScores(dice(5, 5, 5, 2, 2, 4), ['triple'])
    expect(legal).not.toContain('triple')
    expect(legal).toContain('full-house')
  })

  it('keeps a triple legal when only the full house is spent, and the reverse', () => {
    expect(legalScores(dice(5, 5, 5, 2, 2, 4), ['full-house'])).toContain('triple')
    expect(legalScores(dice(5, 5, 5, 2, 2, 4), ['triple'])).toContain('full-house')
  })

  it('offers CRAP only when nothing unused qualifies', () => {
    // Pair is unused and the roll makes one, so CRAP is not on offer.
    expect(legalScores(dice(1, 2, 3, 4, 6, 6), [])).toEqual(['pair'])
    // The same roll once Pair is gone.
    expect(legalScores(dice(1, 2, 3, 4, 6, 6), ['pair'])).toEqual(['crap'])
  })

  it('offers CRAP for a roll that makes nothing at all', () => {
    expect(legalScores(dice(1, 2, 3, 4, 6), [])).toEqual(['crap'])
  })

  it('never offers CRAP alongside a named hand', () => {
    for (const used of [[], ['pair'], ['pair', 'two-pair']] as NamedHandId[][]) {
      const legal = legalScores(dice(5, 5, 5, 2, 2, 4), used)
      if (legal.includes('crap')) expect(legal).toHaveLength(1)
    }
  })

  it('offers CRAP again and again: it is not a category that runs out', () => {
    // `used` can never contain it — the reducer refuses to write it — so the
    // same bad roll is answerable for ever.
    const roll = dice(1, 2, 3, 4, 6)
    expect(legalScores(roll, [])).toEqual(['crap'])
    expect(legalScores(roll, [...NAMED_HANDS])).toEqual(['crap'])
  })

  it('offers nothing at an empty table', () => {
    expect(legalScores([], [])).toEqual([])
  })
})

describe('scoring', () => {
  it('adds every bone on the table, not only the ones in the pattern', () => {
    expect(sumOf(dice(6, 6, 6, 4, 4, 3))).toBe(29)
  })

  it('turns a full house of 6 6 6 4 4 3 into 58', () => {
    expect(scoreDice(dice(6, 6, 6, 4, 4, 3), 'full-house')).toEqual({
      sum: 29,
      multiplier: 2,
      damage: 58,
    })
  })

  it('turns the same roll scored as a triple into 43', () => {
    // 29 × 1.5 is 43.5, floored. The same bones, a weaker shape, and a
    // category kept back for later.
    expect(scoreDice(dice(6, 6, 6, 4, 4, 3), 'triple')).toEqual({
      sum: 29,
      multiplier: 1.5,
      damage: 43,
    })
  })

  it('floors a fractional product rather than rounding it', () => {
    // 15 × 1.25 = 18.75
    expect(scoreDice(dice(5, 5, 3, 2), 'two-pair').damage).toBe(18)
    // 21 × 1.75 = 36.75
    expect(scoreDice(dice(1, 2, 3, 4, 5, 6), 'straight').damage).toBe(36)
  })

  it('halves the sum for CRAP', () => {
    expect(scoreDice(dice(1, 2, 3, 4, 6), 'crap')).toEqual({
      sum: 16,
      multiplier: 0.5,
      damage: 8,
    })
  })

  it('never does less than one, however thin the pile', () => {
    // One bone showing a 1, scored as CRAP: half of one is nought, and nought
    // damage would be a press that did nothing.
    expect(scoreDice(dice(1), 'crap').damage).toBe(1)
    expect(scoreDice(dice(1), 'pair').damage).toBe(1)
  })

  it('reads the multiplier off the table and nowhere else', () => {
    for (const hand of HAND_DEFINITIONS) {
      expect(scoreDice(dice(6, 6, 6, 6, 6, 6), hand.id).multiplier).toBe(hand.multiplier)
    }
  })
})
