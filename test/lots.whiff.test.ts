import { describe, expect, it } from 'vitest'

import { LADDER } from '../src/content/index.js'
import type { Casting, DieId, Value } from '../src/lots/index.js'
import { bestCombo } from '../src/lots/index.js'

function casting(values: readonly number[]): Casting {
  return values.map((value, i) => ({
    die: `bone.${i}` as DieId,
    face: { value: value as Value },
    frozen: false,
  }))
}

describe('lots — art. 46 (a full hand cannot whiff), art. 50 (values are law)', () => {
  it('scores every one of the 46656 hands of six: values repeat, or six distinct is the great straight', () => {
    const whiffs: number[][] = []
    const values = [1, 2, 3, 4, 5, 6]
    for (const a of values) {
      for (const b of values) {
        for (const c of values) {
          for (const d of values) {
            for (const e of values) {
              for (const f of values) {
                const hand = [a, b, c, d, e, f]
                if (bestCombo(casting(hand), LADDER) === null) whiffs.push(hand)
              }
            }
          }
        }
      }
    }
    expect(whiffs).toEqual([])
  })

  it('names the great straight as its own tier, not as a run (art. 48)', () => {
    const combo = bestCombo(casting([1, 2, 3, 4, 5, 6]), LADDER)
    expect(combo).not.toBeNull()
    expect(combo!.kind).toBe('great-straight')
  })

  // art. 46: below six, whiffing is possible — losing dice below six is the
  // true wound. Which diminished hands can actually whiff depends on the
  // shortest legal run, which the ladder has not yet been made to declare.
  it('lets a diminished hand fail (art. 46)', () => {
    const diminished = bestCombo(casting([1, 3, 6]), LADDER)
    expect(diminished).toBeNull()
  })
})
