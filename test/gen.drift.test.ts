import { describe, expect, it } from 'vitest'

import { BURNT, CATALOG, FULL_DEPTH, DROWNED, GRAMMAR, OSSUARY } from '../src/content/index.js'
import type { Catalog, Chain, Grammar, RegionId } from '../src/gen/index.js'
import type { Policy } from './drift.js'
import {
  alwaysLeft,
  alwaysRight,
  avoiding,
  coinFlip,
  leaning,
  reportOf,
  runOf,
  runWith,
} from './drift.js'

/**
 * The drift, across a thousand runs (arts 38, 77–79).
 *
 * art. 38 (amended) took the rhythm obligations out of the solver and made
 * them distributional laws: the dealer leans with pressures rather than
 * solving constraints, so what it owes is a shape over many runs and not a
 * guarantee about one. That is what this file asks about — and it asks with
 * scripted policies, because a law about how the labyrinth answers a player
 * needs a player to answer.
 */
const RUNS = 1000

/** Every run a policy makes over the same thousand seeds. */
function sweep(make: (seed: number) => Policy, runs = RUNS): readonly Chain[] {
  const out: Chain[] = []
  for (let seed = 1; seed <= runs; seed++) out.push(runOf(seed, make(seed)))
  return out
}

const share = (n: number, of: number): number => n / of

/** What fraction of the rooms dealt were of each type, anchors aside. */
function typeShares(chains: readonly Chain[]): Map<string, number> {
  const seen = new Map<string, number>()
  let total = 0
  for (const chain of chains) {
    for (const node of chain.nodes) {
      if (node.type === 'crossing' || node.type === 'warden') continue
      seen.set(node.type, (seen.get(node.type) ?? 0) + 1)
      total++
    }
  }
  for (const [type, count] of seen) seen.set(type, count / Math.max(1, total))
  return seen
}

describe('the drift — art. 78 (every run arrives somewhere)', () => {
  it('locks a region by the forced door count, in every run, under every policy', () => {
    for (const [name, make] of [
      ['always-left', () => alwaysLeft],
      ['always-right', () => alwaysRight],
      ['lean-drowned', () => leaning(DROWNED)],
      ['coin-flip', (seed: number) => coinFlip(seed)],
    ] as const) {
      for (const chain of sweep(make)) {
        expect(chain.drift.locked, `${name} seed ${chain.seed}`).not.toBeNull()
        expect(chain.drift.opened).toBeGreaterThanOrEqual(FULL_DEPTH.lockAt)
      }
    }
  })

  it('announces the arrival once, in the first room after the lock', () => {
    for (const chain of sweep(() => alwaysLeft)) {
      const announcing = chain.nodes.filter((node) => node.announces !== null)
      expect(announcing).toHaveLength(1)
      expect(announcing[0]!.announces).toBe(chain.drift.locked)
      expect(announcing[0]!.step).toBe(FULL_DEPTH.lockAt)
    }
  })

  it('deals only the locked region once it has locked, the Warden aside (art. 78)', () => {
    for (const chain of sweep((seed) => coinFlip(seed), 200)) {
      const locked = chain.drift.locked as RegionId
      const pool = FULL_DEPTH.regions.find((one) => one.id === locked)!.rooms
      for (const node of chain.nodes) {
        if (node.step < FULL_DEPTH.lockAt || node.step === FULL_DEPTH.length - 1) continue
        expect(pool, `seed ${chain.seed} step ${node.step}`).toContain(node.room)
        expect(node.region).toBe(locked)
      }
    }
  })
})

describe('the drift — art. 77 (the pattern of doors means everything)', () => {
  it('locks a committed policy into its own region overwhelmingly often', () => {
    // The floor is what indifference gets: three regions, so a third.
    for (const region of [DROWNED, BURNT, OSSUARY]) {
      const got = sweep(() => leaning(region)).filter(
        (chain) => chain.drift.locked === region,
      ).length
      expect(share(got, RUNS), region as string).toBeGreaterThan(0.7)
    }
  })

  it('locks a policy that refuses a region into that region rarely', () => {
    const got = sweep(() => avoiding(OSSUARY)).filter(
      (chain) => chain.drift.locked === OSSUARY,
    ).length
    expect(share(got, RUNS)).toBeLessThan(0.15)
  })

  it('still arrives somewhere with a coin flip, and spreads across the three', () => {
    const counts = new Map<string, number>()
    for (const chain of sweep((seed) => coinFlip(seed))) {
      const locked = chain.drift.locked
      expect(locked).not.toBeNull()
      counts.set(locked as string, (counts.get(locked as string) ?? 0) + 1)
    }
    expect(counts.size).toBe(FULL_DEPTH.regions.length)
    // No single door means much: an unplanned run lands anywhere.
    for (const region of FULL_DEPTH.regions) {
      expect(share(counts.get(region.id as string) ?? 0, RUNS), region.id as string).toBeGreaterThan(
        0.15,
      )
    }
  })

  it('leaves the blind habits — first door, last door — leaning nowhere', () => {
    for (const make of [() => alwaysLeft, () => alwaysRight]) {
      const counts = new Map<string, number>()
      for (const chain of sweep(make)) {
        counts.set(
          chain.drift.locked as string,
          (counts.get(chain.drift.locked as string) ?? 0) + 1,
        )
      }
      for (const region of FULL_DEPTH.regions) {
        const got = share(counts.get(region.id as string) ?? 0, RUNS)
        expect(got, region.id as string).toBeGreaterThan(0.2)
        expect(got).toBeLessThan(0.5)
      }
    }
  })
})

describe('the drift — art. 38 (the rhythm obligations, distributionally)', () => {
  it('keeps the fight count inside its band in all but a handful of runs', () => {
    const [least, most] = GRAMMAR.fightBand
    const counts = sweep((seed) => coinFlip(seed)).map((chain) => reportOf(chain).fights)
    const mean = counts.reduce((sum, n) => sum + n, 0) / counts.length
    expect(mean).toBeGreaterThanOrEqual(least)
    expect(mean).toBeLessThanOrEqual(most)
    // A band is a pressure, not a solved constraint — but a pressure that
    // held nine runs in ten would not be a band at all.
    const inside = counts.filter((n) => n >= least && n <= most).length
    expect(share(inside, counts.length)).toBeGreaterThan(0.9)
    // The guarantee is hard where the band is soft: every depth has teeth.
    expect(counts.filter((n) => n === 0)).toHaveLength(0)
  })

  it('never puts two fights back to back, which is the one banned rhythm', () => {
    for (const chain of sweep((seed) => coinFlip(seed))) {
      const types = chain.nodes.map((node) => node.type)
      for (let i = 1; i < types.length; i++) {
        expect(
          types[i] === 'lair' && types[i - 1] === 'lair',
          `seed ${chain.seed} step ${i}`,
        ).toBe(false)
      }
    }
  })

  it('lets a room repeat within a run, and almost never back to back (art. 82)', () => {
    let repeated = 0
    let adjacent = 0
    let steps = 0
    for (const chain of sweep((seed) => coinFlip(seed))) {
      const rooms = chain.nodes.map((node) => node.room as string)
      if (new Set(rooms).size < rooms.length) repeated++
      for (let i = 1; i < rooms.length; i++) {
        steps++
        if (rooms[i] === rooms[i - 1]) adjacent++
      }
    }
    // Rooms repeat: art. 82 wants recognising the repeat to mean something.
    expect(share(repeated, RUNS)).toBeGreaterThan(0.5)
    // But not one after the other, which reads as a bug rather than a place.
    expect(share(adjacent, steps)).toBeLessThan(0.03)
  })

  it('deals the shallow quiet, and never deals a type of no tendency (art. 39)', () => {
    const seen = typeShares(sweep((seed) => coinFlip(seed)))
    // The bread of the depth, by a clear margin over anything with teeth.
    expect(seen.get('passage') ?? 0).toBeGreaterThan(seen.get('lair') ?? 0)
    // A tendency of zero is a type the *draw* never deals, whatever a pool
    // or a pressure would otherwise say.
    for (const type of ['merchant', 'savior'] as const) {
      expect(seen.get(type) ?? 0, type).toBe(0)
    }
    // The Sanctum is the exception that shows the rule: its tendency is zero
    // too, so every one dealt was dealt by art. 40's promise and by nothing
    // else — exactly one per run, out of seven middle rooms.
    expect(seen.get('sanctum') ?? 0).toBeCloseTo(1 / (FULL_DEPTH.length - 2), 10)
  })

  it('moves the distribution when the tendencies move, which is what art. 39 claims', () => {
    const runs = 400
    // The bans and the guarantee are held off on both sides, so the only
    // thing that differs between the two sweeps is one content number.
    const loose: Grammar = {
      ...GRAMMAR,
      adjacencyBans: [],
      guarantees: [],
      fightBand: [0, FULL_DEPTH.length],
    }
    const sweepOf = (catalog: Catalog): Map<string, number> =>
      typeShares(
        Array.from({ length: runs }, (_, n) => runWith(catalog, loose, n + 1, coinFlip(n + 1))),
      )

    const asShipped = sweepOf(CATALOG)
    // The same rooms, the same rules, two numbers changed: the deep leans
    // toward teeth. If tendencies weighted nothing, this would not move.
    const deeper = sweepOf({
      ...CATALOG,
      depths: [{ ...FULL_DEPTH, tendencies: { ...FULL_DEPTH.tendencies, passage: 1, lair: 5 } }],
    })
    // Not a clean doubling and it should not be: the neutral pool holds no
    // lair at all, so half the run's rooms are out of reach of the change.
    expect(deeper.get('lair') ?? 0).toBeGreaterThan((asShipped.get('lair') ?? 0) * 1.75)
    expect(deeper.get('passage') ?? 0).toBeLessThan((asShipped.get('passage') ?? 0) * 0.65)
  })

  it('offers two doors most often, one and three sometimes (art. 31)', () => {
    const counts = new Map<number, number>()
    let rooms = 0
    for (const chain of sweep((seed) => coinFlip(seed), 300)) {
      for (const node of chain.nodes) {
        if (node.doors[0]?.ends === true) continue
        counts.set(node.doors.length, (counts.get(node.doors.length) ?? 0) + 1)
        rooms++
      }
    }
    expect(share(counts.get(2) ?? 0, rooms)).toBeGreaterThan(0.4)
    // A corridor moment and a crossroads both happen, and neither is common.
    expect(share(counts.get(1) ?? 0, rooms)).toBeGreaterThan(0.02)
    expect(share(counts.get(3) ?? 0, rooms)).toBeGreaterThan(0.1)
  })
})

describe('the drift — art. 36 (seed and choices, and nothing else)', () => {
  it('deals a byte-identical run for the same seed and the same choices', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const once = runOf(seed, coinFlip(seed))
      const twice = runOf(seed, coinFlip(seed))
      expect(JSON.stringify(twice), `seed ${seed}`).toBe(JSON.stringify(once))
    }
  })

  it('deals a different run for the same seed and different choices', () => {
    let differed = 0
    for (let seed = 1; seed <= 200; seed++) {
      const left = runOf(seed, alwaysLeft)
      const right = runOf(seed, alwaysRight)
      if (JSON.stringify(left.nodes) !== JSON.stringify(right.nodes)) differed++
    }
    // Not every seed can differ — a room with one door offers one road — but
    // the overwhelming majority must, or the choices are not choices.
    expect(share(differed, 200)).toBeGreaterThan(0.95)
  })
})
