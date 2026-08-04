import { describe, expect, it } from 'vitest'

import { LADDER } from '../src/content/index.js'
import type { Value } from '../src/lots/index.js'
import { NO_GOODS, assemble, harm, shapesOf } from '../src/lots/index.js'

/**
 * The shapes and the ladder — arts 45 and 48 as amended, art. 64 on
 * composites. The fixtures are the demo's, because the demo is the playable
 * spec until the encounter fixture lands.
 */
const shapes = (...values: number[]): readonly string[] => shapesOf(values as Value[])

describe('lots — art. 48 (the shapes), art. 45 (sum × tier), art. 64 (composites)', () => {
  it('names the sets by their count', () => {
    expect(shapes(4, 4)).toEqual(['pair', 'any-dice'])
    expect(shapes(4, 4, 4)).toEqual(['triple', 'any-dice'])
    expect(shapes(4, 4, 4, 4)).toEqual(['quad', 'any-dice'])
    expect(shapes(4, 4, 4, 4, 4)).toEqual(['quint', 'any-dice'])
  })

  it('names the runs by their length, and the straight by its own name', () => {
    expect(shapes(2, 3, 4)).toEqual(['run-3', 'any-dice'])
    expect(shapes(2, 3, 4, 5)).toEqual(['run-4', 'any-dice'])
    expect(shapes(2, 3, 4, 5, 6)).toEqual(['run-5', 'any-dice'])
    expect(shapes(1, 2, 3, 4, 5, 6)).toEqual(['straight', 'any-dice'])
  })

  it('names the composites, and offers them whole (art. 64)', () => {
    expect(shapes(2, 2, 5, 5)).toEqual(['two-pair', 'any-dice'])
    expect(shapes(3, 3, 3, 5, 5)).toEqual(['full-house', 'any-dice'])
    expect(shapes(1, 1, 3, 3, 5, 5)).toEqual(['three-pairs', 'any-dice'])
    expect(shapes(2, 2, 2, 5, 5, 5)).toEqual(['two-triples', 'any-dice'])
  })

  it('never reads a set as a run — the values must be distinct and adjacent', () => {
    expect(shapes(2, 2, 3, 3)).not.toContain('run-3')
    expect(shapes(2, 2, 3, 3)).not.toContain('run-4')
    expect(shapes(1, 2, 2, 3)).not.toContain('run-4')
  })

  it('admits ANY DICE for every selection there is (art. 46)', () => {
    for (let n = 1; n <= 6; n++) {
      const values = Array.from({ length: n }, (_, i) => ((i % 6) + 1) as Value)
      expect(shapesOf(values)).toContain('any-dice')
    }
    expect(shapesOf([])).toEqual([])
  })

  it('scores a claim at sum × tier, and nothing else (art. 45)', () => {
    const landed = (value: Value, i: number) => ({
      die: `bone.${i}` as never,
      face: { value },
      kept: false,
    })
    const dice = [landed(3, 0), landed(3, 1), landed(3, 2), landed(5, 3), landed(5, 4)]
    const claim = assemble('full-house', dice, LADDER, null, NO_GOODS)
    expect(claim.sum).toBe(19)
    expect(claim.tier.multiplier).toBe(LADDER['full-house'].multiplier)
    expect(harm(claim)).toBe(19 * LADDER['full-house'].multiplier)
  })
})
