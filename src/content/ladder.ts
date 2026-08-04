import type { Ladder, Line, Tier } from '../lots/index.js'

/**
 * art. 48 (amended): the ladder, expanded — sets ×count; runs by length; the
 * composites, each a single claim (art. 64); the straight named; ANY DICE ×1
 * as the floor. The shapes are law and live in the engine. Every number below
 * is tuning, which is exactly why it lives in content.
 *
 * art. 45: harm = sum × tier. Nothing else multiplies a claim.
 * art. 63: each of these lines is claimable once per fight.
 *
 * The values are the demo's straw (`reference/castlebrynth-lots-demo.html`),
 * kept as it plays until arithmetic tunes them.
 */

export const LADDER: Ladder = {
  pair: { name: 'pair', multiplier: 2 },
  'two-pair': { name: 'two pair', multiplier: 3 },
  triple: { name: 'triple', multiplier: 3 },
  'full-house': { name: 'full house', multiplier: 4 },
  'three-pairs': { name: 'three pairs', multiplier: 4 },
  quad: { name: 'quad', multiplier: 4 },
  'two-triples': { name: 'two triples', multiplier: 5 },
  quint: { name: 'quint', multiplier: 5 },
  'run-3': { name: 'run of 3', multiplier: 2 },
  'run-4': { name: 'run of 4', multiplier: 3 },
  'run-5': { name: 'run of 5', multiplier: 4 },
  straight: { name: 'the straight', multiplier: 6 },
  'any-dice': { name: 'any dice', multiplier: 1 },
}

/** art. 48: the straight keeps its own tier, one above a six-long run. */
export const STRAIGHT: Tier = LADDER.straight

/** art. 46: the deliberate floor — spendable like any other line (art. 63). */
export const ANY_DICE: Tier = LADDER['any-dice']

/** art. 65: the lines a sealing intent shuts — the pair-shaped ones. */
export const PAIRISH: readonly Line[] = ['pair', 'two-pair', 'full-house', 'three-pairs']
