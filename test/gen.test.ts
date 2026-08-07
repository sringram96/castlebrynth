import { describe, expect, it } from 'vitest'

import { CATALOG, GRAMMAR } from '../src/content/index.js'
import type { Catalog, Grammar } from '../src/gen/index.js'
import { NO_HISTORY, deal, explainWinnability, isWinnable } from '../src/gen/index.js'
import { alwaysLeft, coinFlip, runOf, seedOf } from './drift.js'

/**
 * The dealer, run by run (arts 31–39, 77–82). What it does to a thousand
 * runs at once is `gen.drift.test.ts`; this is what it owes every single one.
 */
const EMPTY: Catalog = { rooms: [], encounters: [], depths: [] }
const BARE_GRAMMAR: Grammar = {
  adjacencyBans: [],
  guarantees: [],
  fightBand: [0, 0],
  doorWeights: [1, 1, 1],
  clumpPenalty: 1,
  driftPull: 0,
  bandPull: 0,
  forkChance: 0,
}

describe('gen — the drift, one run at a time', () => {
  it('deals only the Crossing before a single door is opened (art. 79)', () => {
    const opening = deal(seedOf(3), 1, CATALOG, GRAMMAR)
    expect(opening.nodes).toHaveLength(1)
    expect(opening.nodes[0]!.room).toBe('room.crossing')
    expect(opening.nodes[0]!.step).toBe(0)
    // Nothing about the road not taken is computed, so nothing can leak it:
    // a door carries an index, a hidden tag, and no room at all.
    for (const door of opening.nodes[0]!.doors) {
      expect(Object.keys(door).sort()).toEqual(['at', 'demands', 'region'])
    }
  })

  it('offers one to three doors at every room, and one at the last (art. 31)', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const chain = runOf(seed, alwaysLeft)
      for (const node of chain.nodes) {
        expect(node.doors.length, `seed ${seed} step ${node.step}`).toBeGreaterThanOrEqual(1)
        expect(node.doors.length).toBeLessThanOrEqual(3)
        // The indices are the choice, so they are exactly 0..n-1 (art. 36).
        expect(node.doors.map((door) => door.at)).toEqual(
          node.doors.map((_, at) => at),
        )
      }
      // art. 37: the Warden's door ends the depth and commits no room.
      const last = chain.nodes.at(-1)!
      expect(last.room).toBe('room.warden')
      expect(last.doors).toHaveLength(1)
      expect(last.doors[0]!.ends).toBe(true)
    }
  })

  it('runs the depth to its authored length, and no further (art. 81)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      expect(chain.nodes).toHaveLength(chain.length)
    }
  })

  it('gives every room dealt an instance of its own, template repeats and all (art. 82)', () => {
    const chain = runOf(17, alwaysLeft)
    const instances = chain.nodes.map((node) => node.instance)
    expect(new Set(instances).size).toBe(instances.length)
    // The template is what you recognise; the instance is where you stand.
    for (const node of chain.nodes) {
      expect(node.instance as string).toBe(`${node.room}#${node.step}`)
    }
  })

  it('derives the run from seed plus choices, and from nothing else (art. 36)', () => {
    const history = { taken: [0, 1, 0, 0, 1, 0] }
    const once = deal(seedOf(7), 1, CATALOG, GRAMMAR, history)
    const twice = deal(seedOf(7), 1, CATALOG, GRAMMAR, history)
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
  })

  it('deals a different run for different choices off the same seed (art. 36)', () => {
    const left = deal(seedOf(7), 1, CATALOG, GRAMMAR, { taken: [0, 0, 0, 0, 0, 0] })
    const right = deal(seedOf(7), 1, CATALOG, GRAMMAR, { taken: [1, 1, 1, 1, 1, 1] })
    expect(left.nodes.map((node) => node.room)).not.toEqual(
      right.nodes.map((node) => node.room),
    )
  })

  it('keeps the road behind you: a prefix of a run is that run (arts 36, 79)', () => {
    const whole = deal(seedOf(21), 1, CATALOG, GRAMMAR, { taken: [1, 0, 1, 0, 0] })
    const half = deal(seedOf(21), 1, CATALOG, GRAMMAR, { taken: [1, 0, 1] })
    expect(JSON.stringify(whole.nodes.slice(0, half.nodes.length))).toBe(
      JSON.stringify(half.nodes),
    )
  })

  it('is winnable by construction: no run ever demands what it has not offered (arts 33, 80)', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      expect(explainWinnability(chain, CATALOG), `seed ${seed}`).toEqual([])
      expect(isWinnable(chain, CATALOG)).toBe(true)
    }
  })

  it('deals nothing rather than throwing when content has authored nothing', () => {
    const chain = deal(seedOf(1), 1, EMPTY, BARE_GRAMMAR, NO_HISTORY)
    expect(chain.nodes).toEqual([])
    expect(chain.length).toBe(0)
    expect(isWinnable(chain, EMPTY)).toBe(true)
  })

  it('ends the replay on a choice that was never on the table', () => {
    // A history from another seed, or a corrupted one: the run stops where
    // the choices stop making sense rather than inventing a door.
    const chain = deal(seedOf(5), 1, CATALOG, GRAMMAR, { taken: [0, 9, 0, 0] })
    expect(chain.nodes).toHaveLength(2)
  })
})
