// H002 · the seeded RNG, asserted.
//
// Four things are on trial here, and they are the four the card names:
//   1. the same seed gives the same sequence, INCLUDING across a save;
//   2. forked streams do not spend each other's entropy;
//   3. the draw order is fixed, and its costs are the contract;
//   4. the numbers are actually uniform — no modulo bias, stated tolerances.
//
// The golden vectors at the bottom are the fifth thing: they freeze the
// algorithm. If a refactor changes a single word, that block goes red and the
// change has to be argued as the save-breaking amendment it is.

import { describe, expect, it } from "vitest";
import { newRun, load, save } from "./api";
import {
  STREAM,
  fork,
  next,
  nextFloat,
  nextInt,
  pick,
  roll,
  runStream,
  shuffle,
} from "./rng";
import type { ContentBundle, GameState, RngState } from "./types";

const BUNDLE: ContentBundle = { version: 1, start: "room:crossing" };

/** n raw words from a stream. */
const words = (rng: RngState, n: number): number[] => {
  const out: number[] = [];
  let stream = rng;
  for (let i = 0; i < n; i++) {
    const [word, after] = next(stream);
    out.push(word);
    stream = after;
  }
  return out;
};

/** n faces of a d{sides} from a stream. */
const faces = (rng: RngState, n: number, sides: number): number[] => {
  const out: number[] = [];
  let stream = rng;
  for (let i = 0; i < n; i++) {
    const [face, after] = roll(stream, sides);
    out.push(face);
    stream = after;
  }
  return out;
};

/** How many words a draw spent. The unit the fixed draw order is written in. */
const cost = (before: RngState, after: RngState): number => after.draws - before.draws;

/** Pearson's chi-square against a flat expectation. */
const chiSquare = (counts: readonly number[], n: number): number => {
  const expected = n / counts.length;
  return counts.reduce((acc, c) => acc + ((c - expected) * (c - expected)) / expected, 0);
};

const tally = (n: number, sides: number, rng: RngState): number[] => {
  const counts = new Array<number>(sides).fill(0);
  let stream = rng;
  for (let i = 0; i < n; i++) {
    const [face, after] = roll(stream, sides);
    counts[face - 1] = (counts[face - 1] ?? 0) + 1;
    stream = after;
  }
  return counts;
};

// ────────────────────────────────────────────────────── state, not closure ──

describe("H002 · the stream is data on state, not a closure", () => {
  it("returns the value and the stream that follows it, and touches neither input", () => {
    const rng = runStream(42, 0);
    const frozen = JSON.stringify(rng);
    const [value, after] = next(rng);
    expect(typeof value).toBe("number");
    expect(JSON.stringify(rng)).toBe(frozen);
    expect(after).not.toBe(rng);
  });

  it("is pure: the same state drawn twice gives the same word", () => {
    const rng = runStream(42, 0);
    expect(next(rng)[0]).toBe(next(rng)[0]);
    expect(roll(rng, 6)[0]).toBe(roll(rng, 6)[0]);
  });

  it("advances the counter and never rewinds it — no takebacks", () => {
    let stream = runStream(42, 0);
    for (let i = 0; i < 32; i++) {
      const after = next(stream)[1];
      expect(after.draws).toBe(stream.draws + 1);
      expect(after.seed).toBe(stream.seed);
      stream = after;
    }
    expect(stream.draws).toBe(32);
  });

  it("is JSON, all of it — two numbers and nothing else", () => {
    const rng = next(next(runStream(42, 0))[1])[1];
    expect(Object.keys(rng).sort()).toStrictEqual(["draws", "seed"]);
    const text = JSON.stringify(rng);
    expect(JSON.parse(text)).toStrictEqual(rng);
    expect(JSON.stringify(JSON.parse(text))).toBe(text);
  });

  it("is the very stream H001 already mints, at zero deaths", () => {
    // api.ts opens a run at { seed, draws: 0 } and leaves the mixing to this
    // card. Nothing to migrate: at deaths === 0 the mixing is the identity.
    expect(runStream(1234, 0)).toStrictEqual(newRun(1234, BUNDLE).run.rng);
    expect(runStream(-7, 0)).toStrictEqual({ seed: -7, draws: 0 });
  });
});

// ───────────────────────────────────────────────── same seed, same sequence ──

describe("H002 · same seed → identical sequences", () => {
  it("walks two independent streams to the same 64 words", () => {
    expect(words(runStream(42, 0), 64)).toStrictEqual(words(runStream(42, 0), 64));
  });

  it("diverges on a different seed", () => {
    expect(words(runStream(42, 0), 16)).not.toStrictEqual(words(runStream(43, 0), 16));
  });

  it("is not fooled by seeds that share low bits", () => {
    // lanes() is injective over safe integers, so a seed beyond 2^32 does not
    // alias the small one hiding in its low half.
    const big = 2 ** 32 + 42;
    expect(words(runStream(big, 0), 8)).not.toStrictEqual(words(runStream(42, 0), 8));
  });

  it("gives every death its own labyrinth — run = seed + deaths + inputs", () => {
    const first = words(runStream(42, 0), 8);
    const second = words(runStream(42, 1), 8);
    const third = words(runStream(42, 2), 8);
    expect(second).not.toStrictEqual(first);
    expect(third).not.toStrictEqual(second);
    // and reproducibly so
    expect(words(runStream(42, 2), 8)).toStrictEqual(third);
  });
});

// ───────────────────────────────────────────────────── across save and load ──

describe("H002 · the sequence survives a save, mid-stream", () => {
  it("keeps going through a bare JSON round-trip", () => {
    const start = runStream(42, 0);
    const uninterrupted = words(start, 20);

    const firstEight = words(start, 8);
    let stream = start;
    for (let i = 0; i < 8; i++) stream = next(stream)[1];
    const revived = JSON.parse(JSON.stringify(stream)) as RngState;
    expect(revived).toStrictEqual(stream);
    const remaining = words(revived, 12);

    expect([...firstEight, ...remaining]).toStrictEqual(uninterrupted);
  });

  it("keeps going through the real save envelope, mid-push", () => {
    // The DONE WHEN, literally: the same seed gives the same sequence across
    // save/load, with the stream carried on GameState where it lives.
    const state = newRun(42, BUNDLE);
    const uninterrupted = faces(state.run.rng, 24, 6);

    let stream = state.run.rng;
    const thrown: number[] = [];
    for (let i = 0; i < 9; i++) {
      const [face, after] = roll(stream, 6);
      thrown.push(face);
      stream = after;
    }

    const mid: GameState = { ...state, run: { ...state.run, rng: stream } };
    const reloaded = load(save(mid));
    expect(reloaded).not.toBeNull();
    const resumed = (reloaded as GameState).run.rng;
    expect(resumed).toStrictEqual(stream);

    expect([...thrown, ...faces(resumed, 15, 6)]).toStrictEqual(uninterrupted);
  });

  it("survives a save taken between the draws of a room sequence", () => {
    const start = fork(runStream(42, 0), STREAM.descent);
    const doors = ["a", "b", "c", "d", "e", "f"];

    // Uninterrupted: draw a door, then shuffle the corridor beyond it.
    const [straightDoor, afterPick] = pick(start, doors);
    const [straightOrder] = shuffle(afterPick, doors);

    // Interrupted: the same draw, a save, and the same shuffle on the far side.
    const [savedDoor, mid] = pick(start, doors);
    const revived = JSON.parse(JSON.stringify(mid)) as RngState;
    const [revivedOrder] = shuffle(revived, doors);

    expect(savedDoor).toBe(straightDoor);
    expect(revivedOrder).toStrictEqual(straightOrder);
  });
});

// ──────────────────────────────────────────────────────────── forked streams ──

describe("H002 · forked streams — rooms and casts do not eat each other", () => {
  const root = runStream(42, 0);

  it("gives the Descent and the Lots different sequences, and neither is the root's", () => {
    const descent = words(fork(root, STREAM.descent), 8);
    const lots = words(fork(root, STREAM.lots), 8);
    const rootWords = words(root, 8);
    expect(descent).not.toStrictEqual(lots);
    expect(descent).not.toStrictEqual(rootWords);
    expect(lots).not.toStrictEqual(rootWords);
    // not merely offset copies of one another either
    expect(new Set([...descent, ...lots, ...rootWords]).size).toBe(24);
  });

  it("ignores the parent's position — the fork is a function of the seed alone", () => {
    let walked = root;
    for (let i = 0; i < 999; i++) walked = next(walked)[1];
    expect(fork(walked, STREAM.lots)).toStrictEqual(fork(root, STREAM.lots));
  });

  it("cannot be moved by curiosity: peering at more rooms does not move a die", () => {
    // The reason forks exist. If the Descent and the Lots shared a counter,
    // looking into one more alcove would change every future cast and the run
    // would stop being seed + deaths + inputs.
    const before = faces(fork(root, STREAM.lots), 12, 6);

    let descent = fork(root, STREAM.descent);
    for (let i = 0; i < 500; i++) descent = next(descent)[1];
    let curious = root;
    for (let i = 0; i < 37; i++) curious = next(curious)[1];

    expect(faces(fork(curious, STREAM.lots), 12, 6)).toStrictEqual(before);
    expect(faces(fork(descent, STREAM.lots), 12, 6)).not.toStrictEqual(before);
  });

  it("is reproducible from the campaign seed alone", () => {
    // Everything a save needs to rebuild any stream: the seed and the deaths.
    const rebuilt = fork(runStream(42, 0), STREAM.lots);
    expect(words(rebuilt, 8)).toStrictEqual(words(fork(root, STREAM.lots), 8));
  });

  it("nests, so a card can narrow its own stream without asking anyone", () => {
    const fight = fork(fork(root, STREAM.lots), "fight:3");
    const other = fork(fork(root, STREAM.lots), "fight:4");
    expect(words(fight, 8)).not.toStrictEqual(words(other, 8));
    expect(fork(fork(root, STREAM.lots), "fight:3")).toStrictEqual(fight);
  });

  it("always leaves the parent seed behind, even for the empty name", () => {
    expect(fork(root, "").seed).not.toBe(root.seed);
    expect(fork(root, STREAM.lots).seed).not.toBe(root.seed);
  });

  it("opens every fork undrawn", () => {
    expect(fork(root, STREAM.lots).draws).toBe(0);
    let walked = root;
    for (let i = 0; i < 5; i++) walked = next(walked)[1];
    expect(fork(walked, STREAM.descent).draws).toBe(0);
  });

  it("carries the death count into every fork", () => {
    const afterDeath = fork(runStream(42, 1), STREAM.lots);
    expect(words(afterDeath, 8)).not.toStrictEqual(words(fork(root, STREAM.lots), 8));
  });
});

// ───────────────────────────────────────────────────────── fixed draw order ──

describe("H002 · the fixed draw order", () => {
  const rng = runStream(42, 0);

  it("charges one word for next, nextFloat, a power-of-two bound, and a roll", () => {
    expect(cost(rng, next(rng)[1])).toBe(1);
    expect(cost(rng, nextFloat(rng)[1])).toBe(1);
    expect(cost(rng, nextInt(rng, 1024)[1])).toBe(1);
    expect(cost(rng, roll(rng, 6)[1])).toBe(1);
  });

  it("charges one word for a pick, even from a pool of one", () => {
    // A one-item pool still spends its word, so authoring a second option later
    // does not shift every draw downstream of it.
    expect(cost(rng, pick(rng, ["only"])[1])).toBe(1);
    expect(pick(rng, ["only"])[0]).toBe("only");
    expect(cost(rng, pick(rng, ["a", "b", "c"])[1])).toBe(1);
  });

  it("charges n - 1 words for a shuffle of n, and nothing for 0 or 1", () => {
    expect(cost(rng, shuffle(rng, [])[1])).toBe(0);
    expect(cost(rng, shuffle(rng, ["a"])[1])).toBe(0);
    expect(cost(rng, shuffle(rng, ["a", "b"])[1])).toBe(1);
    expect(cost(rng, shuffle(rng, ["a", "b", "c", "d", "e", "f", "g", "h"])[1])).toBe(7);
  });

  it("charges a word for each rejection, deterministically", () => {
    // 0xC0000000 does not divide 2^32, so a quarter of the words fall in the
    // biased tail and are thrown away. The rejections are part of the order:
    // the same seed rejects in the same places, every time.
    let stream = runStream(5, 0);
    let worst = 0;
    let total = 0;
    for (let i = 0; i < 2000; i++) {
      const [, after] = nextInt(stream, 0xc0000000);
      worst = Math.max(worst, cost(stream, after));
      total += cost(stream, after);
      stream = after;
    }
    expect(worst).toBeGreaterThan(1);
    expect(total).toBe(2650);
  });

  it("shuffles downward from the last index — the direction is the contract", () => {
    // Frozen: reverse the walk and this list changes, which changes every
    // seed's labyrinth. That is a save-breaking amendment, not a refactor.
    const [order] = shuffle(fork(runStream(42, 0), STREAM.descent), [
      "a", "b", "c", "d", "e", "f", "g", "h",
    ]);
    expect(order).toStrictEqual(["b", "g", "a", "h", "f", "c", "e", "d"]);
  });

  it("shuffles a copy and leaves the pool alone", () => {
    const doors = ["a", "b", "c", "d"];
    const [order] = shuffle(rng, doors);
    expect(doors).toStrictEqual(["a", "b", "c", "d"]);
    expect(order).not.toBe(doors);
    expect([...order].sort()).toStrictEqual(["a", "b", "c", "d"]);
  });
});

// ────────────────────────────────────────────────────────────── no modulo bias ──

describe("H002 · no modulo bias", () => {
  it("splits a hostile bound into equal thirds where % would give 50/25/25", () => {
    // 2^32 = 1.333 x 0xC0000000, so `word % bound` would hand the first third
    // of the range twice the mass of the other two. This is the decisive test:
    // at small bounds the bias is a part in a billion and no sample can see it,
    // but here it is half the distribution.
    const N = 60000;
    const BOUND = 0xc0000000;
    const third = BOUND / 3;
    for (const seed of [1, 42]) {
      const buckets = [0, 0, 0];
      let escaped = 0;
      let stream = runStream(seed, 0);
      for (let i = 0; i < N; i++) {
        const [value, after] = nextInt(stream, BOUND);
        if (value < 0 || value >= BOUND) escaped++;
        buckets[Math.floor(value / third)] = (buckets[Math.floor(value / third)] ?? 0) + 1;
        stream = after;
      }
      const seen = `seed ${seed}: ${buckets.join()}`;
      expect(escaped, seen).toBe(0);
      // Tolerance: each third within 1 percentage point of 33.3% — about five
      // standard deviations at N = 60000, and nowhere near the 50/25/25 that
      // modulo would produce.
      expect(Math.abs((buckets[0] ?? 0) / N - 1 / 3), seen).toBeLessThan(0.01);
      expect(Math.abs((buckets[1] ?? 0) / N - 1 / 3), seen).toBeLessThan(0.01);
      expect(Math.abs((buckets[2] ?? 0) / N - 1 / 3), seen).toBeLessThan(0.01);
    }
  });

  it("agrees with exact 64-bit arithmetic, word for word", () => {
    // The debiasing multiplies a 32-bit word by the bound and keeps the high
    // half. That product overflows a double, so it is done in 16-bit limbs —
    // and a rounding slip there would be an invisibly loaded die. This replays
    // the same words in BigInt, where the arithmetic is exact, and demands the
    // same answer AND the same number of rejections.
    for (const bound of [3, 6, 7, 20, 999, 2 ** 24 + 1, 0xc0000000, 2 ** 32 - 1]) {
      const wide = BigInt(bound);
      const tail = (1n << 32n) % wide;
      const exactly = (from: RngState): readonly [number, RngState] => {
        let probe = from;
        for (;;) {
          const [word, onward] = next(probe);
          probe = onward;
          const product = BigInt(word) * wide;
          if ((product & 0xffffffffn) >= tail) return [Number(product >> 32n), probe];
        }
      };
      let stream = runStream(17, 0);
      let mismatches = 0;
      for (let i = 0; i < 400; i++) {
        const [value, after] = nextInt(stream, bound);
        const [exact, probe] = exactly(stream);
        if (value !== exact || probe.draws !== after.draws) mismatches++;
        stream = after;
      }
      expect(mismatches, `bound ${bound}`).toBe(0);
    }
  });

  it("never rejects when the bound divides 2^32", () => {
    for (const bound of [1, 2, 4, 256, 65536, 2 ** 31, 2 ** 32]) {
      let stream = runStream(9, 0);
      let worst = 0;
      let escaped = 0;
      for (let i = 0; i < 500; i++) {
        const [value, after] = nextInt(stream, bound);
        worst = Math.max(worst, cost(stream, after));
        if (value < 0 || value >= bound) escaped++;
        stream = after;
      }
      expect(worst, `bound ${bound}`).toBe(1);
      expect(escaped, `bound ${bound}`).toBe(0);
    }
  });

  it("stays inside every bound it is given, including awkward ones", () => {
    for (const bound of [1, 2, 3, 5, 6, 7, 20, 100, 999, 2 ** 24 + 1, 2 ** 32 - 1]) {
      let stream = runStream(11, 0);
      let escaped = 0;
      for (let i = 0; i < 2000; i++) {
        const [value, after] = nextInt(stream, bound);
        if (!Number.isInteger(value) || value < 0 || value >= bound) escaped++;
        stream = after;
      }
      expect(escaped, `bound ${bound}`).toBe(0);
    }
  });

  it("keeps nextFloat in [0, 1)", () => {
    let stream = runStream(13, 0);
    let low = 1;
    let high = 0;
    let escaped = 0;
    for (let i = 0; i < 50000; i++) {
      const [value, after] = nextFloat(stream);
      if (value < 0 || value >= 1) escaped++;
      low = Math.min(low, value);
      high = Math.max(high, value);
      stream = after;
    }
    expect(escaped).toBe(0);
    expect(low).toBeLessThan(0.001);
    expect(high).toBeGreaterThan(0.999);
  });
});

// ──────────────────────────────────────────────────────── distribution sanity ──

describe("H002 · distribution sanity", () => {
  // Tolerances are stated, not felt. At N = 240000 a fair d6 has a standard
  // deviation of about 0.46% of the expected count per face, so the 2% band
  // below is roughly 4.4 sigma: a genuinely uniform generator clears it for any
  // seed, and a lean of more than a couple of percent cannot hide inside it.
  // The chi-square bound is the same claim across all faces at once, at
  // p = 0.001 (5 degrees of freedom → 20.5; 19 → 43.8).
  const N = 240000;

  it("rolls a flat d6 — DESIGN §the lots makes die fairness law", () => {
    for (const seed of [1, 42, -7]) {
      const counts = tally(N, 6, fork(runStream(seed, 0), STREAM.lots));
      expect(counts.reduce((a, b) => a + b, 0)).toBe(N);
      for (const count of counts) {
        expect(Math.abs(count - N / 6) / (N / 6), `seed ${seed}: ${counts.join()}`).toBeLessThan(
          0.02,
        );
      }
      expect(chiSquare(counts, N), `seed ${seed}: ${counts.join()}`).toBeLessThan(20.5);
    }
  });

  it("rolls a flat d20 — a bound that divides nothing", () => {
    for (const seed of [1, 42]) {
      const counts = tally(N, 20, fork(runStream(seed, 0), STREAM.lots));
      for (const count of counts) {
        expect(Math.abs(count - N / 20) / (N / 20), `seed ${seed}: ${counts.join()}`).toBeLessThan(
          0.05,
        );
      }
      expect(chiSquare(counts, N), `seed ${seed}: ${counts.join()}`).toBeLessThan(43.8);
    }
  });

  it("centres nextFloat on 0.5", () => {
    const samples = 100000;
    let sum = 0;
    let stream = runStream(3, 0);
    for (let i = 0; i < samples; i++) {
      const [value, after] = nextFloat(stream);
      sum += value;
      stream = after;
    }
    // Standard error of the mean here is ~0.0009; 0.005 is about 5.5 sigma.
    expect(Math.abs(sum / samples - 0.5)).toBeLessThan(0.005);
  });

  it("shuffles without a favourite position", () => {
    const samples = 60000;
    const positions = [0, 0, 0, 0, 0];
    let stream = fork(runStream(11, 0), STREAM.descent);
    for (let i = 0; i < samples; i++) {
      const [order, after] = shuffle(stream, ["a", "b", "c", "d", "e"]);
      const at = order.indexOf("a");
      positions[at] = (positions[at] ?? 0) + 1;
      stream = after;
    }
    // A biased Fisher-Yates (the classic off-by-one) shows up here as a skew of
    // several percent. Tolerance 4% of the expected count, about 4.9 sigma.
    for (const count of positions) {
      expect(
        Math.abs(count - samples / 5) / (samples / 5),
        positions.join(),
      ).toBeLessThan(0.04);
    }
  });
});

// ─────────────────────────────────────────────────────────────── preconditions ──

describe("H002 · preconditions are loud", () => {
  const rng = runStream(42, 0);

  it("refuses a bound that is not a whole number in [1, 2^32]", () => {
    for (const bad of [0, -1, 1.5, NaN, Infinity, 2 ** 32 + 1]) {
      expect(() => nextInt(rng, bad), String(bad)).toThrow(RangeError);
    }
    expect(() => roll(rng, 0)).toThrow(RangeError);
  });

  it("refuses to pick out of an empty pool", () => {
    // What happens when a depth runs out of rooms is authored, not random.
    expect(() => pick(rng, [])).toThrow(RangeError);
  });

  it("rolls faces in [1, faces]", () => {
    for (const sides of [1, 2, 6, 20]) {
      let stream = rng;
      let low = Infinity;
      let high = -Infinity;
      for (let i = 0; i < 2000; i++) {
        const [face, after] = roll(stream, sides);
        low = Math.min(low, face);
        high = Math.max(high, face);
        stream = after;
      }
      expect(low, `d${sides}`).toBe(1);
      expect(high, `d${sides}`).toBe(sides);
    }
  });
});

// ───────────────────────────────────────────────────────────── golden vectors ──

describe("H002 · frozen golden vectors", () => {
  // These are the algorithm. A refactor that changes any number here changes
  // every existing save, and must be argued as an amendment rather than landed
  // as a tidy-up (.llm/rules/engine.md: a new word is its own task, never a
  // side effect).
  const root = runStream(42, 0);

  it("freezes the first eight words of seed 42", () => {
    expect(words(root, 8)).toStrictEqual([
      4107416263, 1447628565, 2768266063, 1144988627, 801182102, 2790701375, 1277270248, 620946056,
    ]);
  });

  it("freezes the two engine stream seeds", () => {
    expect(fork(root, STREAM.descent)).toStrictEqual({ seed: 718788175, draws: 0 });
    expect(fork(root, STREAM.lots)).toStrictEqual({ seed: 665658243, draws: 0 });
    expect(fork(fork(root, STREAM.lots), "fight:3").seed).toBe(4040264778);
    expect(fork(root, "").seed).toBe(1798482118);
  });

  it("freezes twelve d6 out of the Lots", () => {
    expect(faces(fork(root, STREAM.lots), 12, 6)).toStrictEqual([
      6, 1, 5, 5, 5, 3, 2, 1, 2, 5, 2, 6,
    ]);
  });

  it("freezes the words of each engine stream", () => {
    expect(words(fork(root, STREAM.descent), 4)).toStrictEqual([
      1684835060, 2477142924, 2067696753, 1751166449,
    ]);
    expect(words(fork(root, STREAM.lots), 4)).toStrictEqual([
      3997698030, 683763012, 2894086914, 3522139828,
    ]);
  });

  it("freezes the run streams the death count mints", () => {
    expect(runStream(42, 1)).toStrictEqual({ seed: 2105107279, draws: 0 });
    expect(runStream(42, 3)).toStrictEqual({ seed: 2967774621, draws: 0 });
  });

  it("freezes nextFloat as the word over 2^32", () => {
    const seven = runStream(7, 0);
    expect(words(seven, 3)).toStrictEqual([3290469258, 3873754127, 369255632]);
    let stream = seven;
    const drawn: number[] = [];
    for (let i = 0; i < 3; i++) {
      const [value, after] = nextFloat(stream);
      drawn.push(value);
      stream = after;
    }
    expect(drawn).toStrictEqual([
      0.7661220752634108, 0.9019286667462438, 0.08597402647137642,
    ]);
    expect(drawn[0]).toBe(3290469258 / 2 ** 32);
  });
});
