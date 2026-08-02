import { describe, it, expect } from 'vitest'
import { seedRng, nextInt } from '../../src/core/rng'

// H002 · randomness is state as data (RULES.md §1). There is no generator
// object — an Rng is a uint32 you thread through.

const draw = (seed: number, count: number, n: number): number[] => {
  let rng = seedRng(seed)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const [k, next] = nextInt(rng, n)
    out.push(k)
    rng = next
  }
  return out
}

describe('H002 · seeded RNG', () => {
  it('seedRng produces a plain uint32', () => {
    const rng = seedRng(42)
    expect(typeof rng).toBe('number')
    expect(Number.isInteger(rng)).toBe(true)
    expect(rng).toBeGreaterThanOrEqual(0)
    expect(rng).toBeLessThanOrEqual(0xffffffff)
    expect(JSON.parse(JSON.stringify({ rng }))).toEqual({ rng })
  })

  // The frozen golden. If this changes, every saved run in the world breaks.
  it('matches the frozen five-draw golden for seed 42', () => {
    expect(draw(42, 5, 100)).toEqual([60, 44, 85, 66, 17])
  })

  it('is reproducible — same seed, same draws, always', () => {
    expect(draw(42, 32, 1000)).toEqual(draw(42, 32, 1000))
  })

  it('diverges on a neighbouring seed', () => {
    expect(draw(43, 5, 100)).toEqual([99, 27, 52, 5, 6])
    expect(draw(43, 5, 100)).not.toEqual(draw(42, 5, 100))
  })

  it('nextInt does not mutate the rng it was handed', () => {
    const rng = seedRng(42)
    const [a] = nextInt(rng, 100)
    const [b] = nextInt(rng, 100)
    expect(a).toBe(b)
    expect(rng).toBe(seedRng(42))
  })

  it('returns [value, nextRng] and advances', () => {
    const rng = seedRng(42)
    const [, next] = nextInt(rng, 100)
    expect(next).not.toBe(rng)
    expect(Number.isInteger(next)).toBe(true)
    expect(next).toBeGreaterThanOrEqual(0)
    expect(next).toBeLessThanOrEqual(0xffffffff)
  })

  it('stays in range [0, n)', () => {
    for (const n of [1, 2, 6, 7, 100]) {
      for (const k of draw(1234, 500, n)) {
        expect(k).toBeGreaterThanOrEqual(0)
        expect(k).toBeLessThan(n)
      }
    }
  })

  it('n = 1 always draws 0', () => {
    expect(draw(99, 20, 1).every((k) => k === 0)).toBe(true)
  })

  it('is roughly uniform over 60k draws', () => {
    const buckets = new Array(6).fill(0)
    for (const k of draw(7, 60_000, 6)) buckets[k]++
    const expected = 10_000
    for (const b of buckets) {
      expect(Math.abs(b - expected) / expected).toBeLessThan(0.05)
    }
  })
})
