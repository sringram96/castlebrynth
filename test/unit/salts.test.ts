/**
 * Where a draw sits in a run, now that a run is a graph.
 *
 * Every salt in the game used to key on `run.path.length`, which was an honest
 * position for exactly as long as the descent was a line. It is a DAG now: the
 * Cleft's two branches meet again at the Confluence, and a draw that depended
 * on *how far you had walked* would be a chest whose contents changed with the
 * route you took to it.
 *
 * So the position is the **node's own identity**, hashed, plus the channel
 * constant each kind of draw already had. Two lines of insurance, and this is
 * what they buy — asserted rather than described, because the day walking
 * varies is the day nobody remembers the assumption was there.
 */

import { describe, expect, it } from 'vitest'

import { RNG_CHANNEL, Rng, combatSalt, nodeSalt, rngAt } from '../../src/game/rng.js'
import { generateRun } from '../../src/game/runGenerator.js'
import { newRun, reduce } from '../../src/game/reducer.js'
import { SAVE_VERSION, TITLE } from '../../src/game/state.js'
import type { GameState, RunState } from '../../src/game/state.js'
import { nodeOf, seedFor } from './where.js'

/**
 * A seed whose grammar is **the descent**, because the paths written out below
 * are its node ids — and because THE LONG WAY has no Reliquary in it at all.
 */
const DESCENT_SEED = seedFor('descent')

describe('a node is a position', () => {
  it('gives every node in a descent a number of its own', () => {
    // A collision would be two rooms drawing out of one stream, which is the
    // exact bug keying on the path length had.
    const ids = Object.keys(generateRun(1).nodes)
    expect(new Set(ids.map(nodeSalt)).size).toBe(ids.length)
  })

  it('is the same number every time, for the same id', () => {
    expect(nodeSalt('a8b')).toBe(nodeSalt('a8b'))
    expect(nodeSalt('a8b')).not.toBe(nodeSalt('a8a'))
  })

  it('reads no history at all', () => {
    // The whole point. Nothing about the route, the depth or the walk is in
    // here — only which room this is.
    expect(combatSalt('a3', 2, 1, RNG_CHANNEL.playerRoll)).toBe(
      combatSalt('a3', 2, 1, RNG_CHANNEL.playerRoll),
    )
    expect(combatSalt('a3', 2, 1, RNG_CHANNEL.playerRoll)).not.toBe(
      combatSalt('b3', 2, 1, RNG_CHANNEL.playerRoll),
    )
  })

  it('keeps the rounds, the throws and the channels apart', () => {
    const seen = new Set<number>()
    for (const round of [1, 2, 3, 4]) {
      for (const roll of [1, 2, 3]) {
        for (const channel of Object.values(RNG_CHANNEL)) {
          seen.add(combatSalt('a3', round, roll, channel))
        }
      }
    }
    expect(seen.size).toBe(4 * 3 * Object.keys(RNG_CHANNEL).length)
  })
})

describe('the generator a salt positions', () => {
  it('separates neighbouring salts rather than collapsing them', () => {
    // A 32-bit salt times the golden constant overflows a double, and the old
    // multiply lost the low bits — forty seeds in a row landing on the same
    // generator state. `Math.imul` is the fix, and this is the regression.
    const first = new Set<number>()
    for (let seed = 1; seed <= 40; seed++) {
      first.add(Math.round(rngAt(seed, combatSalt('a8b', 1, 0, RNG_CHANNEL.reward)).next() * 1e6))
    }
    expect(first.size).toBeGreaterThan(30)
  })

  it('is the same generator for the same seed and salt', () => {
    const a = rngAt(9, nodeSalt('a6'))
    const b = rngAt(9, nodeSalt('a6'))
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()])
    expect(new Rng(1).next()).toBe(new Rng(1).next())
  })
})

/** A run standing in one node of its own map, with a chosen history. */
function standing(seed: number, templateId: string, path: readonly string[]): GameState {
  const base = newRun(seed)
  const roomId = nodeOf(base, templateId)
  const run: RunState = { ...base, roomId, path: [...path, roomId] }
  return { version: SAVE_VERSION, mode: 'explore', meta: TITLE.meta, run }
}

describe('the same room draws the same thing, whatever the route was', () => {
  const solve = (state: GameState): GameState =>
    (['reliquary-bell', 'reliquary-brazier', 'reliquary-lever'] as const).reduce(
      (s, interactionId) => reduce(s, { type: 'INTERACT', interactionId }),
      state,
    )

  it('holds for a chest, across two histories of different lengths', () => {
    // Two runs of the same seed standing in the same Reliquary, one having
    // walked three rooms and one having walked eight. Under the old salt these
    // were two different draws out of one chest.
    const short = solve(standing(DESCENT_SEED, 'reliquary', ['a0', 'a1', 'a2']))
    const long = solve(standing(DESCENT_SEED, 'reliquary', ['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']))
    expect(short.run!.loot).toEqual(long.run!.loot)
  })

  it('holds for a font', () => {
    const roll = (path: readonly string[]): number => {
      const state = reduce(
        { ...standing(DESCENT_SEED, 'sanctuary', path), run: { ...standing(DESCENT_SEED, 'sanctuary', path).run!, bones: 10 } },
        { type: 'RITUAL_ROLL' },
      )
      return state.run!.ritual!.roll
    }
    expect(roll(['a0'])).toBe(roll(['a0', 'a1', 'a2', 'b3', 'a4']))
  })

  it('holds for what a fight throws', () => {
    const dice = (path: readonly string[]): readonly number[] => {
      const open = reduce(standing(DESCENT_SEED, 'hollow', path), { type: 'FIGHT' })
      return reduce(open, { type: 'ROLL' }).run!.combat!.dice
    }
    expect(dice(['a0', 'a1', 'a2'])).toEqual(dice(['a0', 'a1', 'a2', 'a3', 'a4', 'a5']))
  })

  it('and two different rooms of one run do not draw the same thing', () => {
    // The other half: node identity has to *separate* as well as stabilise, or
    // every room in a run would be one stream.
    const hollow = reduce(reduce(standing(DESCENT_SEED, 'hollow', ['a0']), { type: 'FIGHT' }), { type: 'ROLL' })
    const deep = reduce(reduce(standing(DESCENT_SEED, 'deep', ['a0']), { type: 'FIGHT' }), { type: 'ROLL' })
    expect(hollow.run!.combat!.dice).not.toEqual(deep.run!.combat!.dice)
  })
})
