import type { Ladder, Tier } from '../lots/index.js'

/**
 * art. 48: the ladder — sets ×count; runs ×(length−1); the great straight
 * 1-2-3-4-5-6 is its own named tier. All numbers here are tuning, which is
 * exactly why they live in content and not in the engine.
 *
 * art. 45: harm = sum × tier. Nothing else multiplies.
 */

const SET_NAMES: Readonly<Record<number, string>> = {
  2: 'a pair',
  3: 'a triple',
  4: 'a quartet',
  5: 'a quintet',
  6: 'a hand of one number',
}

const RUN_NAMES: Readonly<Record<number, string>> = {
  3: 'a short run',
  4: 'a run',
  5: 'a long run',
}

export const GREAT_STRAIGHT: Tier = { name: 'the great straight', multiplier: 6 }

export const LADDER: Ladder = {
  set(count) {
    return { name: SET_NAMES[count] ?? 'a set', multiplier: count }
  },
  run(length) {
    return { name: RUN_NAMES[length] ?? 'a run', multiplier: length - 1 }
  },
  greatStraight: GREAT_STRAIGHT,
}
