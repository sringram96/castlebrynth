import { describe, expect, it } from 'vitest'

import {
  BURNT,
  CATALOG,
  DROWNED,
  END_LINES,
  GNAWING,
  HORRORS,
  HORROR_SCRIPTS,
  INTENT_SAYS,
  KINDLED,
  LABELS,
  MARROW,
  OSSUARY,
  SILT_MOTHER,
  SOCKET_BEATS,
  endLineOf,
} from '../src/content/index.js'
import type { Chain, EncounterId, RegionId } from '../src/gen/index.js'
import { encounterOf } from '../src/gen/index.js'
import { playDepth } from './depth.js'
import { alwaysLeft, alwaysRight, coinFlip, leaning, runOf, type Policy } from './drift.js'

/**
 * Every region gets its unique (card 29, arts 78, 83–84).
 *
 * The playtest verdict was *"there is still only one bad guy"* — technically
 * two, but the Marrow woke only in the ossuary, so most runs met the Gnawing
 * and nothing else. This holds the symmetry that fixes it: three regions,
 * three uniques, each awake only where it belongs.
 *
 * A single seed says nothing about any of this (art. 38 as amended), so
 * everything here is distributional and measured over a thousand runs.
 */

const RUNS = 1000
/** The whole-depth model is the expensive one, so it walks fewer roads. */
const DEEP_RUNS = 600

/** The three region-locked uniques, and the region each belongs to. */
const UNIQUES: readonly (readonly [EncounterId, RegionId, string])[] = [
  [MARROW, OSSUARY, 'horror.marrow'],
  [SILT_MOTHER, DROWNED, 'horror.silt-mother'],
  [KINDLED, BURNT, 'horror.kindled'],
]

function dealtIn(chain: Chain, who: EncounterId): number {
  return chain.nodes.filter((node) => node.fills.some((fill) => fill.encounter === who)).length
}

describe('card 29 — every region gets its unique (arts 78, 83)', () => {
  it('declares all three on the Marrow’s own row, differing only in region', () => {
    for (const [who, where] of UNIQUES) {
      expect(encounterOf(CATALOG, who), who as string).toMatchObject({
        kind: 'horror',
        binding: 'floating',
        scope: 'unique',
        region: where,
      })
    }
    // And each of them names a horror the engine can find by identity, or a
    // resumed fight would come back to nothing (art. 75).
    for (const [who, , id] of UNIQUES) {
      expect(encounterOf(CATALOG, who)?.horror, who as string).toBe(id)
      expect(HORRORS.map((one) => one.id)).toContain(id)
    }
  })

  it('wakes each one only when its own region locks, over a thousand runs', () => {
    const seen: Record<string, number> = {}
    for (let seed = 1; seed <= RUNS; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      for (const [who, where] of UNIQUES) {
        const held = dealtIn(chain, who)
        if (held === 0) continue
        seen[who as string] = (seen[who as string] ?? 0) + 1
        // art. 78: a region's encounters activate when that region locks,
        // and there is exactly one lock in a depth.
        expect(chain.drift.locked, `${who as string} at seed ${seed}`).toBe(where)
        // art. 83: unique per run means once per run, whatever the drift did.
        expect(held, `${who as string} at seed ${seed}`).toBe(1)
      }
    }
    // And each of them is actually reachable, or the axis is decoration.
    for (const [who] of UNIQUES) {
      expect(seen[who as string] ?? 0, who as string).toBeGreaterThan(0)
    }
  })

  it('never puts two regions’ uniques in one run — a run arrives once', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      const standing = UNIQUES.filter(([who]) => dealtIn(chain, who) > 0)
      expect(standing.length, `seed ${seed}`).toBeLessThanOrEqual(1)
    }
  })

  it('leans each region hard enough that its own unique is what shows up', () => {
    for (const [who, where] of UNIQUES) {
      let mine = 0
      let theirs = 0
      for (let seed = 1; seed <= RUNS; seed++) {
        const chain = runOf(seed, leaning(where))
        if (dealtIn(chain, who) > 0) mine++
        for (const [other] of UNIQUES) {
          if (other !== who && dealtIn(chain, other) > 0) theirs++
        }
      }
      expect(mine, `${who as string} committed`).toBeGreaterThan(0)
      // A player who commits to one region meets that region's thing far
      // more often than anybody else's — which is what art. 78 calls the
      // payoff of commitment.
      expect(mine, `${who as string} vs the others`).toBeGreaterThan(theirs)
    }
  })

  it('keeps the ordinary teeth ordinary — the Gnawing still repeats', () => {
    let repeated = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      if (dealtIn(runOf(seed, coinFlip(seed)), GNAWING) > 1) repeated++
    }
    expect(repeated).toBeGreaterThan(0)
  })
})

describe('card 29 — a locked region is a different depth, not a worse one', () => {
  /**
   * Survival **down to the last door**, by how the thumb walks
   * (`test/depth.ts`). Deliberately not "finished": card 31 put a keeper
   * behind that door, and what this card is measuring is what a region's
   * road costs, not what its boss does. Before the Warden was a being the
   * two questions were the same one, so this is the like-for-like number.
   *
   * The band is wide on purpose: it is a tripwire under the tuning, not an
   * opinion about it. What it is actually guarding is the failure the card
   * named — *a region that became a death sentence* — so the floor matters
   * more than the ceiling.
   */
  const rateOf = (policy: (seed: number) => Policy): number => {
    let out = 0
    for (let seed = 1; seed <= DEEP_RUNS; seed++) {
      if (playDepth(seed, policy(seed)).reachedTheDoor) out++
    }
    return out / DEEP_RUNS
  }

  it('leaves every region survivable, and none of them a formality', () => {
    for (const [, where] of UNIQUES) {
      const rate = rateOf(() => leaning(where))
      expect(rate, `${where as string} floor`).toBeGreaterThan(0.12)
      expect(rate, `${where as string} ceiling`).toBeLessThan(0.5)
    }
  })

  it('keeps a blind walk inside the same band the depth already held', () => {
    for (const policy of [coinFlip, () => alwaysLeft, () => alwaysRight] as const) {
      const rate = rateOf(policy as (seed: number) => Policy)
      expect(rate).toBeGreaterThan(0.15)
      expect(rate).toBeLessThan(0.45)
    }
  })

  it('never strands a run and never refuses one at the last door (arts 33, 80)', () => {
    for (let seed = 1; seed <= DEEP_RUNS; seed++) {
      const played = playDepth(seed, coinFlip(seed))
      expect(['finished', 'died'], `seed ${seed}`).toContain(played.outcome)
    }
  })

  it('actually puts a run in front of a unique often enough to matter', () => {
    let met = 0
    for (let seed = 1; seed <= DEEP_RUNS; seed++) {
      const played = playDepth(seed, coinFlip(seed))
      if (UNIQUES.some(([who]) => played.met.includes(who))) met++
    }
    // Before this card that number was the Marrow's alone, and about a
    // third of what it is now: the whole complaint was that a run met the
    // Gnawing and nothing else.
    expect(met / DEEP_RUNS).toBeGreaterThan(0.25)
  })
})

describe('card 29 — every horror says its own words (arts 58, 73, 84)', () => {
  it('gives every intent of every shipped script a line to answer with', () => {
    for (const script of HORROR_SCRIPTS) {
      for (const intent of script) {
        expect(INTENT_SAYS[intent.verb], intent.verb).toBeDefined()
      }
    }
  })

  it('gives every horror a name, an ending, and a candle to arrive on', () => {
    for (const one of HORRORS) {
      expect(LABELS[one.id], one.id).toBeDefined()
      const ending = endLineOf(one.id)
      expect(END_LINES[ending], `${one.id} → ${ending}`).toBeDefined()
    }
    // And a horror that stands in a socket says a candle for itself, because
    // the room it stands in never speaks for it (art. 83).
    for (const [who] of UNIQUES) {
      expect((SOCKET_BEATS[who as string] ?? []).length, who as string).toBeGreaterThan(0)
    }
  })

  it('gives each of them its own ending line, and no two the same', () => {
    const lines = HORRORS.map((one) => endLineOf(one.id))
    expect(new Set(lines).size).toBe(HORRORS.length)
  })
})
