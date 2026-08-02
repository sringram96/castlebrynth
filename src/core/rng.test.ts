// H002 — co-located unit tests for the seeded stream.
//
// This file is inside tsconfig's `include`, so `npm run law` typechecks
// it: the `[value, rng2]` tuple shape and `RngState` being the same
// number the run ledger carries are compile-time claims, not runtime
// ones. The behavioural scoreboard lives in tests/acceptance/H002.
import { describe, expect, it } from "vitest";
import { next, nextInt, seedRng } from "./rng";
import type { GameState, RngState } from "./types";

// ---------------------------------------------------------------------
// seedRng — total, and always a uint32
// ---------------------------------------------------------------------

type SeedRow = { name: string; given: number; then: number };

const seedRows: readonly SeedRow[] = [
  { name: "zero seeds a stream like any other", given: 0, then: 0 },
  { name: "a small seed is itself", given: 42, then: 42 },
  { name: "the largest uint32 is itself", given: 4294967295, then: 4294967295 },
  { name: "a negative seed wraps into uint32", given: -1, then: 4294967295 },
  { name: "a fraction truncates", given: 42.9, then: 42 },
  { name: "past 2^32 wraps", given: 4294967296 + 7, then: 7 },
  { name: "NaN lands on zero rather than poisoning the stream", given: NaN, then: 0 },
  { name: "Infinity lands on zero too", given: Infinity, then: 0 },
];

describe("seedRng", () => {
  for (const { name, given, then } of seedRows) {
    it(name, () => {
      expect(seedRng(given)).toBe(then);
    });
  }

  it("is idempotent — seeding a state returns that state", () => {
    const state = seedRng(42);
    expect(seedRng(state)).toBe(state);
  });
});

// ---------------------------------------------------------------------
// next — the draw, as data
// ---------------------------------------------------------------------

describe("next", () => {
  it("returns [value, rng2], both uint32", () => {
    const [value, state] = next(seedRng(7));
    expect(typeof value).toBe("number");
    expect(typeof state).toBe("number");
    expect(value >>> 0).toBe(value);
    expect(state >>> 0).toBe(state);
  });

  it("moves the stream — the state it returns is not the one it got", () => {
    const start = seedRng(7);
    const [, state] = next(start);
    expect(state).not.toBe(start);
  });

  it("never mutates its argument", () => {
    const start = seedRng(7);
    next(start);
    next(start);
    expect(start).toBe(seedRng(7));
  });

  it("has no module state — the same input is the same output", () => {
    const start = seedRng(7);
    const first = next(start);
    next(seedRng(999));
    expect(next(start)).toEqual(first);
  });

  it("does not repeat itself over a long walk", () => {
    const seen = new Set<number>();
    let state = seedRng(7);
    for (let i = 0; i < 5000; i++) {
      const [value, nextState] = next(state);
      seen.add(value);
      state = nextState;
    }
    // 5000 draws from 2^32 — collisions are possible but vanishing.
    expect(seen.size).toBeGreaterThan(4990);
  });
});

// ---------------------------------------------------------------------
// nextInt — a bounded draw
// ---------------------------------------------------------------------

type IntRow = { name: string; given: number; when: number };

const intRows: readonly IntRow[] = [
  { name: "n=1 is the only answer there is", given: 42, when: 1 },
  { name: "a coin", given: 42, when: 2 },
  { name: "a d6", given: 42, when: 6 },
  { name: "a d20", given: 1, when: 20 },
  { name: "a wide draw", given: 99, when: 4096 },
];

describe("nextInt", () => {
  for (const { name, given, when } of intRows) {
    it(`${name} — 200 draws all land in [0, n)`, () => {
      let state = seedRng(given);
      for (let i = 0; i < 200; i++) {
        const [value, nextState] = nextInt(state, when);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(when);
        state = nextState;
      }
    });
  }

  it("n=1 always answers 0", () => {
    let state = seedRng(3);
    for (let i = 0; i < 50; i++) {
      const [value, nextState] = nextInt(state, 1);
      expect(value).toBe(0);
      state = nextState;
    }
  });

  it("spends exactly one draw, whatever n is", () => {
    const start = seedRng(3);
    const [, afterRaw] = next(start);
    const [, afterInt] = nextInt(start, 6);
    expect(afterInt).toBe(afterRaw);
  });

  it("never mutates its argument", () => {
    const start = seedRng(3);
    nextInt(start, 6);
    expect(start).toBe(seedRng(3));
  });

  it("throws on a range with nothing in it", () => {
    expect(() => nextInt(seedRng(3), 0)).toThrow(RangeError);
    expect(() => nextInt(seedRng(3), -3)).toThrow(RangeError);
    expect(() => nextInt(seedRng(3), 1.5)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------
// the stream is state on the ledger (RULES.md 2, RULES.md 9)
// ---------------------------------------------------------------------

describe("the stream rides on the run ledger", () => {
  it("types as RngState — the field GameState already carries", () => {
    const rng: RngState = seedRng(42);
    const [, rng2] = next(rng);
    const run: Pick<GameState, "rng"> = { rng: rng2 };
    expect(run.rng).toBe(rng2);
  });

  it("survives a JSON round-trip and resumes identically", () => {
    let state = seedRng(42);
    for (let i = 0; i < 17; i++) [, state] = next(state);

    const parsed: RngState = JSON.parse(JSON.stringify({ rng: state })).rng;
    expect(parsed).toBe(state);
    expect(next(parsed)).toEqual(next(state));
  });
});
