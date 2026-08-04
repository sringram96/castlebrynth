import { describe, expect, it } from 'vitest'

import type { Catalog, Grammar } from '../src/gen/index.js'
import { deal, explainWinnability, isWinnable } from '../src/gen/index.js'
import type { Seed } from '../src/state/index.js'

/**
 * The catalog and the grammar are authored content. Until the rooms are
 * written they are empty, and the generator must say so rather than deal a
 * chain that cannot be finished.
 */
const CATALOG: Catalog = { rooms: [] }
const GRAMMAR: Grammar = {
  adjacencyBans: [],
  guarantees: ['crossing', 'warden'],
  keyBand: [0, 0.5],
  lockBand: [0.5, 1],
  fightBand: [1, 3],
  weights: {
    passage: 1,
    lair: 1,
    puzzle: 1,
    trove: 1,
    omen: 0,
    sanctum: 0,
    merchant: 0,
    savior: 0,
    crossing: 0,
    warden: 0,
  },
}

describe('gen — art. 33 (every arrangement winnable), art. 32 (every death reseeds)', () => {
  it('deals 1000 seeds and every one of them can be finished (art. 33)', () => {
    const unwinnable: number[] = []
    for (let n = 0; n < 1000; n++) {
      const chain = deal(n as unknown as Seed, 1, CATALOG, GRAMMAR)
      if (!isWinnable(chain, CATALOG)) unwinnable.push(n)
    }
    expect(unwinnable).toEqual([])
  })

  it('names why, when a chain is not winnable — blind play cannot dodge cruelty (art. 38)', () => {
    const chain = deal(0 as unknown as Seed, 1, CATALOG, GRAMMAR)
    expect(explainWinnability(chain, CATALOG)).toEqual([])
  })

  it('derives the whole arrangement from one seed, so resume is exact (art. 36)', () => {
    const once = deal(7 as unknown as Seed, 1, CATALOG, GRAMMAR)
    const twice = deal(7 as unknown as Seed, 1, CATALOG, GRAMMAR)
    expect(twice).toEqual(once)
  })
})
