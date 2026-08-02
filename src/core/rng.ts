// H002 · randomness is state as data (.llm/rules/purity.mdc).
//
// mulberry32, exactly as published. The generator is not an object with a
// hidden cursor — it is a uint32 that lives in GameState and gets threaded
// through, which is what makes a save the state and two runs from one seed
// byte-identical.
//
// The mixer is frozen. Every draw ever taken from a saved run was taken by
// these lines, so a tidier constant is a corrupted save file, not a refactor.

/** The generator, entire. A plain uint32 — JSON-safe by being a number. */
export type Rng = number

/** Opens the stream at the seed, coerced to the uint32 it has to stay. */
export function seedRng(seed: number): Rng {
  return seed >>> 0
}

/**
 * Draws `k` in `[0, n)` and hands back the advanced generator.
 *
 * Nothing is mutated because there is nothing to mutate: thread `rng2` on for
 * the next draw, or drop it and draw the same `k` again.
 */
export function nextInt(rng: Rng, n: number): [k: number, rng2: Rng] {
  // The state is a Weyl sequence — advance first, then mix, so the value a
  // caller sees belongs to the state it is handed back.
  const rng2 = (rng + 0x6d2b79f5) >>> 0
  // Math.imul for both multiplies: `*` would carry these past 2^53 and round.
  let t = Math.imul(rng2 ^ (rng2 >>> 15), rng2 | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const bits = (t ^ (t >>> 14)) >>> 0
  // Scale the whole word rather than take `bits % n`: a remainder over-weights
  // the low buckets whenever n does not divide 2^32, and n here is a d6.
  return [Math.floor((bits / 0x100000000) * n), rng2]
}
