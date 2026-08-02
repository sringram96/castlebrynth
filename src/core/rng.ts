// H002 — the seeded stream. Mulberry32 over uint32, state as data.
//
// Law this file answers to:
//   RULES.md 1  purity — no DOM, I/O, Date, Math.random, console.
//   RULES.md 2  determinism — the whole generator is one uint32 that
//               rides on the run ledger (H001 `RngState`) and survives a
//               JSON round-trip. Replay a save, replay the numbers.
//   skill:engine  `next(rng) => [value, rng2]`. Arguments are never
//               mutated; there is no generator object and no module
//               state, so a draw is a pure function of what it was
//               handed — the same state always yields the same draw.
//
// Nothing here weights, shuffles, or picks (card non-goal): those are
// later waves, built on top of these two calls.

import type { RngState } from "./types";

/** Mulberry32's step: added to the state before every mix. */
const STEP = 0x6d2b79f5;

/** 2^32 — the draw space. A uint32 over this is exact in a double. */
const RANGE = 0x1_0000_0000;

/**
 * Open a stream. The state *is* the seed, normalized by ToUint32, which
 * makes `seedRng` total: fractions truncate, negatives wrap, NaN and
 * Infinity land on 0. No seed can put the stream outside uint32.
 */
export function seedRng(seed: number): RngState {
  return seed >>> 0;
}

/**
 * One draw: a uint32 in [0, 2^32) and the state that follows it.
 *
 * Mulberry32 as a step over data rather than a closure — the stream is
 * carried by the caller, so two callers holding the same state see the
 * same number, and holding an old state replays from there.
 */
export function next(rng: RngState): readonly [number, RngState] {
  const state = (rng + STEP) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [(t ^ (t >>> 14)) >>> 0, state >>> 0];
}

/**
 * A draw in [0, n) and the state that follows it.
 *
 * Multiply-shift, not modulo: `draw / 2^32` is exact in a double, so the
 * 2^32 draws split across n buckets that differ by at most one draw —
 * flat where modulo would lean on the low ids.
 *
 * `n` must be a positive integer. An empty range has no answer, so
 * asking for one is a caller bug and says so at the call site.
 */
export function nextInt(rng: RngState, n: number): readonly [number, RngState] {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`nextInt: n must be a positive integer, got ${n}`);
  }
  const [draw, state] = next(rng);
  return [Math.floor((draw / RANGE) * n), state];
}
