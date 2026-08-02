import { describe, it, expect } from 'vitest'
import { nextInt, seedRng } from './rng'
import { emptyState } from './types'

// The acceptance owns the golden and the range promise. These cover the edges
// it does not reach: what a seed outside uint32 means, what the stream does
// over a long run, and the fact that `n` steers the draw but never the state.

const states = (seed: number, count: number, n: number): number[] => {
  let rng = seedRng(seed)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const [, next] = nextInt(rng, n)
    out.push(next)
    rng = next
  }
  return out
}

describe('seedRng', () => {
  it('coerces a seed to uint32 rather than carrying it as given', () => {
    expect(seedRng(-1)).toBe(0xffffffff)
    expect(seedRng(0x1_0000_0000)).toBe(0)
    expect(seedRng(0xffffffff)).toBe(0xffffffff)
  })

  it('opens where emptyState says the stream opens', () => {
    for (const seed of [0, 42, -1, 0xffffffff]) {
      expect(seedRng(seed)).toBe(emptyState('shore', seed).rng)
    }
  })
})

describe('nextInt', () => {
  it('is a function of (rng, n) and nothing else', () => {
    const rng = seedRng(1234)
    expect(nextInt(rng, 6)).toEqual(nextInt(rng, 6))
  })

  it('advances the state independently of n — only the draw depends on it', () => {
    expect(states(42, 16, 2)).toEqual(states(42, 16, 997))
  })

  it('wraps at the top of the range instead of leaving uint32', () => {
    const [, rng2] = nextInt(0xffffffff, 6)
    expect(rng2).toBe(0x6d2b79f4)
  })

  it('keeps a large n in range and integral', () => {
    let rng = seedRng(7)
    for (let i = 0; i < 200; i++) {
      const [k, next] = nextInt(rng, 0x8000_0000)
      expect(Number.isInteger(k)).toBe(true)
      expect(k).toBeGreaterThanOrEqual(0)
      expect(k).toBeLessThan(0x8000_0000)
      rng = next
    }
  })

  it('does not stall — 4096 successive states are all distinct', () => {
    const seen = states(1, 4096, 6)
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('survives the JSON round trip a save will put it through (.llm/rules/determinism.mdc)', () => {
    const [, rng2] = nextInt(seedRng(42), 6)
    const revived: number = JSON.parse(JSON.stringify({ rng: rng2 })).rng
    expect(nextInt(revived, 6)).toEqual(nextInt(rng2, 6))
  })
})
