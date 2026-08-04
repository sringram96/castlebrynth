import { describe, expect, it } from 'vitest'

import { CRAWLING_ONE, LADDER, REFERENCE_POUCH, YOUR_HEALTH_AT_WAKING } from '../src/content/index.js'
import type { Casting, DieId, Value } from '../src/lots/index.js'
import { assembleHand, bestCombo, brace, harm, openTurn } from '../src/lots/index.js'

/**
 * `reference/the-crawling-one-encounter.md` is executable truth. If a change
 * breaks turn two's fork, the change is wrong, not the fixture.
 */

const lot = { next: () => 0 }

function casting(values: readonly number[]): Casting {
  return values.map((value, i) => ({
    die: `bone.${i}` as DieId,
    face: { value: value as Value },
    frozen: false,
  }))
}

describe('lots — arts 45–48 (the poker duel, the ladder, valued BRACE), art. 60 (the hand)', () => {
  it('turn one: freeze two sixes, find a third, and throw 18 × 3 = 54 (arts 45, 48)', () => {
    // First casting 3 3 6 4 2 6; freeze the sixes; second casting 6 4 2 1.
    const settled = casting([6, 6, 6, 4, 2, 1])
    const combo = bestCombo(settled, LADDER)
    expect(combo).not.toBeNull()
    expect(combo!.kind).toBe('set')
    expect(combo!.sum).toBe(18)
    expect(combo!.tier.multiplier).toBe(3)
    expect(harm(combo!)).toBe(54)
    // The Crawling One: 90 → 36. RAKE resolves: you 20 → 12.
    expect(CRAWLING_ONE.health - harm(combo!)).toBe(36)
    expect(YOUR_HEALTH_AT_WAKING - CRAWLING_ONE.intentFor(1).amount).toBe(12)
  })

  it('turn two: the fork — a pair throws 16 and kills you; the brace holds (arts 46, 47)', () => {
    // First casting 5 4 4 2 1 6; freeze 4-4 (the chase) and 6-5 (the shield);
    // recast 2 and 1; second casting 3 2 — the chase fails, the plan holds.
    const settled = casting([4, 4, 6, 5, 3, 2])

    // The suicide line: a pair of 4s throws 16, leaving it alive at 20, and
    // BELLOW 13 lands on 12 health.
    const pair = casting([4, 4])
    const pairCombo = bestCombo(pair, LADDER)
    expect(pairCombo).not.toBeNull()
    expect(harm(pairCombo!)).toBe(16)
    expect(36 - 16).toBeGreaterThan(0)
    expect(CRAWLING_ONE.intentFor(2).amount).toBeGreaterThan(12)

    // The line taken: BRACE 6+5+4 = 15 absorbs all 13. No harm either way.
    const committed = settled.filter((l) => [6, 5, 4].includes(l.face.value))
    expect(brace(committed.slice(0, 3))).toBe(15)
    expect(brace(committed.slice(0, 3))).toBeGreaterThanOrEqual(
      CRAWLING_ONE.intentFor(2).amount,
    )
  })

  it('turn three: triple sixes again, 54 ≥ 36 — dead before it swings (art. 45)', () => {
    const settled = casting([6, 6, 6, 5, 2, 2])
    const combo = bestCombo(settled, LADDER)
    expect(harm(combo!)).toBeGreaterThanOrEqual(36)
  })

  it('gives two castings a turn, free, with the intent shown first (arts 41, 42)', () => {
    const hand = assembleHand(REFERENCE_POUCH, 6)
    const turn = openTurn(hand, CRAWLING_ONE.intentFor(1), lot)
    expect(turn.castingsAllowed).toBe(2)
    expect(turn.intent.verb).toBe('RAKE')
    expect(turn.castings).toHaveLength(1)
  })
})
