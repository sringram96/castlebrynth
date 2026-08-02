// H002 — acceptance. The seeded stream: mulberry32 over uint32, state
// as data.
//
// The scoreboard for one claim: randomness in castlebrynth is a pure
// function of a number you can save (RULES.md 2). Same seed, same run,
// forever; a different seed, a different castle; and reading a stream
// never spends it.
import { describe, expect, it } from "vitest";
import { next, nextInt, seedRng } from "../../src/core/rng";

// ---------------------------------------------------------------------
// the goldens — frozen. If a line below changes, every landed save and
// every replayed run changed with it. That is an amendment, not a fix.
// ---------------------------------------------------------------------

const SEED = 42;

/** Five raw draws from seed 42, in order. */
const GOLDEN_DRAWS = [
  2581720956, 1925393290, 3661312704, 2876485805, 750819978,
] as const;

/** The five states those draws hand back, in order. */
const GOLDEN_STATES = [
  1831565855, 3663131668, 1199730185, 3031295998, 567894515,
] as const;

/** The same five draws, taken as a d6 — nextInt(_, 6). */
const GOLDEN_D6 = [3, 2, 5, 4, 1] as const;

/** Seed 43, for contrast. A neighbouring seed is a different castle. */
const GOLDEN_D6_NEIGHBOUR = [5, 1, 3, 0, 0] as const;

// ---------------------------------------------------------------------
// helpers — no module state here either; each walk is handed its start
// ---------------------------------------------------------------------

/** `count` raw draws from `rng`, in order. */
function draws(rng: number, count: number): number[] {
  const out: number[] = [];
  let state = rng;
  for (let i = 0; i < count; i++) {
    const [value, nextState] = next(state);
    out.push(value);
    state = nextState;
  }
  return out;
}

/** `count` draws of `nextInt(_, n)` from `rng`, in order. */
function ints(rng: number, count: number, n: number): number[] {
  const out: number[] = [];
  let state = rng;
  for (let i = 0; i < count; i++) {
    const [value, nextState] = nextInt(state, n);
    out.push(value);
    state = nextState;
  }
  return out;
}

/**
 * Mulberry32 in its canonical closure form, written out here so the
 * acceptance checks the *algorithm* and not merely that the module
 * agrees with itself.
 */
function referenceMulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("H002 · the same seed is the same run, forever", () => {
  it("replays the frozen 5-draw golden for seed 42", () => {
    expect(draws(seedRng(SEED), 5)).toEqual([...GOLDEN_DRAWS]);
    expect(ints(seedRng(SEED), 5, 6)).toEqual([...GOLDEN_D6]);
  });

  it("hands back the frozen states, so a save resumes mid-stream", () => {
    const seen: number[] = [];
    let state = seedRng(SEED);
    for (let i = 0; i < 5; i++) {
      const [, nextState] = next(state);
      seen.push(nextState);
      state = nextState;
    }
    expect(seen).toEqual([...GOLDEN_STATES]);
  });

  it("gives two walks of the same seed the identical sequence", () => {
    expect(draws(seedRng(SEED), 64)).toEqual(draws(seedRng(SEED), 64));
    expect(ints(seedRng(SEED), 64, 20)).toEqual(ints(seedRng(SEED), 64, 20));
  });

  it("resumes a saved stream exactly where it stopped", () => {
    const whole = draws(seedRng(SEED), 10);
    let state = seedRng(SEED);
    for (let i = 0; i < 4; i++) [, state] = next(state);

    // the state, put through a save envelope and back
    const resumed: number = JSON.parse(JSON.stringify({ rng: state })).rng;
    expect(resumed).toBe(state);
    expect(draws(resumed, 6)).toEqual(whole.slice(4));
  });

  it("is mulberry32 — it matches the canonical closure, draw for draw", () => {
    const reference = referenceMulberry32(SEED);
    const mine = draws(seedRng(SEED), 200);
    for (const value of mine) {
      expect(value / 4294967296).toBe(reference());
    }
  });

  it("keeps the state a uint32 that survives JSON", () => {
    let state = seedRng(SEED);
    for (let i = 0; i < 200; i++) {
      const [value, nextState] = next(state);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(4294967296);
      expect(Number.isInteger(nextState)).toBe(true);
      expect(nextState).toBeGreaterThanOrEqual(0);
      expect(nextState).toBeLessThan(4294967296);
      expect(JSON.parse(JSON.stringify(nextState))).toBe(nextState);
      state = nextState;
    }
  });
});

describe("H002 · different seeds diverge", () => {
  it("sends a neighbouring seed somewhere else entirely", () => {
    expect(ints(seedRng(43), 5, 6)).toEqual([...GOLDEN_D6_NEIGHBOUR]);
    expect(draws(seedRng(43), 32)).not.toEqual(draws(seedRng(SEED), 32));
  });

  it("gives 500 seeds 500 distinct streams", () => {
    const firstEight = new Set<string>();
    for (let seed = 0; seed < 500; seed++) {
      firstEight.add(draws(seedRng(seed), 8).join(","));
    }
    expect(firstEight.size).toBe(500);
  });

  it("shares no draw between two seeds at the same position", () => {
    const a = draws(seedRng(SEED), 64);
    const b = draws(seedRng(SEED + 1), 64);
    expect(a.filter((value, i) => value === b[i])).toEqual([]);
  });
});

describe("H002 · inputs are never mutated (skill:engine)", () => {
  it("leaves the state it was handed untouched", () => {
    const start = seedRng(SEED);
    const before = JSON.stringify({ rng: start });

    next(start);
    nextInt(start, 6);
    nextInt(start, 4);

    expect(start).toBe(seedRng(SEED));
    expect(JSON.stringify({ rng: start })).toBe(before);
  });

  it("answers the same state with the same draw, however often asked", () => {
    const start = seedRng(SEED);
    const once = next(start);
    for (let i = 0; i < 50; i++) expect(next(start)).toEqual(once);

    // interleaving other streams changes nothing — there is no module state
    draws(seedRng(1), 100);
    ints(seedRng(2), 100, 7);
    expect(next(start)).toEqual(once);
  });

  it("keeps a held state replayable after the stream moved on", () => {
    const held = seedRng(SEED);
    const expected = draws(held, 5);
    let state = held;
    for (let i = 0; i < 1000; i++) [, state] = next(state);
    expect(draws(held, 5)).toEqual(expected);
  });
});

describe("H002 · nextInt is flat and in range", () => {
  it("puts 10k draws of nextInt(_, 4) in every bucket at 22–28%", () => {
    const total = 10_000;
    const buckets = [0, 0, 0, 0];
    let state = seedRng(SEED);
    for (let i = 0; i < total; i++) {
      const [value, nextState] = nextInt(state, 4);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(4);
      buckets[value] = (buckets[value] ?? 0) + 1;
      state = nextState;
    }
    expect(buckets.reduce((sum, n) => sum + n, 0)).toBe(total);
    for (const count of buckets) {
      expect(count / total).toBeGreaterThanOrEqual(0.22);
      expect(count / total).toBeLessThanOrEqual(0.28);
    }
  });

  it("stays in range for every n a die or a draw might ask", () => {
    for (const n of [1, 2, 3, 4, 6, 8, 10, 12, 20, 100, 1000]) {
      let state = seedRng(SEED + n);
      for (let i = 0; i < 500; i++) {
        const [value, nextState] = nextInt(state, n);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(n);
        state = nextState;
      }
    }
  });

  it("advances the stream exactly one draw per int, whatever n is", () => {
    const start = seedRng(SEED);
    const [, afterRaw] = next(start);
    for (const n of [1, 2, 6, 1000]) {
      const [, afterInt] = nextInt(start, n);
      expect(afterInt).toBe(afterRaw);
    }
  });

  it("refuses an empty range instead of inventing an answer", () => {
    for (const n of [0, -1, 2.5, NaN, Infinity]) {
      expect(() => nextInt(seedRng(SEED), n)).toThrow(RangeError);
    }
  });
});
