/// <reference types="vite/client" />
// L002 · the cast, asserted.
//
// The claim this file has to hold is the one DESIGN makes twice: "all six faces
// always possible; weighting is a declared probability lean". So the tests come
// in two halves — the plain bone is EXACTLY the fair d6 src/core/rng.ts already
// proves (same face, same cost, every seed), and a leaned bone shifts the odds
// by exactly what it declared and never to nothing, including in the two ugly
// corners manifest.ts names as a real gap: a weight of 1e-12 and one of 1e12.
//
// The odds are asserted against `castOdds`, which is derived from the same
// ticks `cast` draws across, AND against an empirical sample — because a
// derived table agreeing with itself proves nothing. The sample is what catches
// a cumulative walk that is off by one.

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import { roll } from "../core/rng";
import type { RngState } from "../core/types";
import { applyOverlay, formatProblem, loadManifest } from "./manifest";
import type { LoadResult, Manifest } from "./manifest";
import { cast, castHand, castOdds, requireHand } from "./cast";

const GRAMMAR = "grammar.yaml";
const OVERLAY = "experiments/lean.yaml";

const loaded = (result: LoadResult): Manifest => {
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.manifest;
};

const base = (): Manifest => loaded(loadManifest(GRAMMAR, parse(grammarSource)));

/** The base, with the leaned die switched on — it ships inside a set that is off. */
const leaned = (override: Record<string, number> = {}): Manifest =>
  loaded(applyOverlay(base(), OVERLAY, { enable: ["sets.weights"], override }));

const seed = (n: number): RngState => ({ seed: n, draws: 0 });

/** How often each face lands over `n` casts, threading the stream properly. */
function sample(manifest: Manifest, die: string, n: number): Map<string, number> {
  const seen = new Map<string, number>();
  let rng = seed(9001);
  for (let i = 0; i < n; i += 1) {
    const [bone, after] = cast(manifest, rng, die);
    rng = after;
    seen.set(bone.face, (seen.get(bone.face) ?? 0) + 1);
  }
  return seen;
}

// ─────────────────────────────────────────────── the plain bone is the fair d6 ──

describe("a plain bone", () => {
  it("is exactly `roll(rng, 6)` — same face, same cost, every seed", () => {
    const manifest = base();
    for (let s = 0; s < 200; s += 1) {
      const rng = seed(s);
      const [bone, after] = cast(manifest, rng, "bone");
      const [face, rolled] = roll(rng, 6);
      // The alphabet's pips run 1..6 in the die's face order, so the fair d6's
      // value IS the face that lands. No nudging, no second draw.
      expect(bone.pips).toBe(face);
      expect(after).toEqual(rolled);
    }
  });

  it("costs exactly one drawn integer", () => {
    const rng = seed(7);
    const [, after] = cast(base(), rng, "bone");
    // One `nextInt`, which at bound 6 may reject — so at least one word, and
    // the same count `roll` spends.
    expect(after.draws).toBeGreaterThanOrEqual(1);
    expect(after).toEqual(roll(rng, 6)[1]);
  });

  it("declares six equal odds", () => {
    expect(castOdds(base(), "bone")).toEqual({
      one: 1 / 6,
      two: 1 / 6,
      three: 1 / 6,
      four: 1 / 6,
      five: 1 / 6,
      six: 1 / 6,
    });
  });

  it("carries the die, the face and its pips on the bone that landed", () => {
    const [bone] = cast(base(), seed(3), "bone");
    expect(bone.die).toBe("bone");
    expect(Object.keys(base().faces)).toContain(bone.face);
    expect(bone.pips).toBe(base().faces[bone.face]?.pips);
  });
});

// ───────────────────────────────────────────────────── a lean shifts the odds ──

describe("a declared lean", () => {
  it("weights the faces it names and leaves the rest at one", () => {
    // `river-stone`: three and four weigh 2, the others 1 — eight ticks in all.
    expect(castOdds(leaned(), "river-stone")).toEqual({
      one: 1 / 8,
      two: 1 / 8,
      three: 2 / 8,
      four: 2 / 8,
      five: 1 / 8,
      six: 1 / 8,
    });
  });

  it("lands those odds when actually cast", () => {
    const manifest = leaned();
    const n = 24000;
    const seen = sample(manifest, "river-stone", n);
    // Every face landed: "all six faces always possible" (DESIGN §the lots).
    expect(seen.size).toBe(6);
    const odds = castOdds(manifest, "river-stone") ?? {};
    // A fixed seed, so this is a fixed answer and never a flake. The tolerance
    // is loose enough to survive ordinary sampling spread at this n and far too
    // tight to confuse a 1-tick face with a 2-tick one.
    for (const [face, want] of Object.entries(odds)) {
      expect(Math.abs((seen.get(face) ?? 0) / n - want)).toBeLessThan(0.01);
    }
  });

  it("changes the spread and not the anchor — F3, rare power is RELIABILITY", () => {
    const manifest = leaned();
    const odds = castOdds(manifest, "river-stone") ?? {};
    let ev = 0;
    for (const [face, chance] of Object.entries(odds)) {
      ev += chance * (manifest.faces[face]?.pips ?? 0);
    }
    expect(ev).toBeCloseTo(3.5, 12); // the same anchor `dieEv` measures
  });

  it("never deletes a face, even at a weight of 1e-12", () => {
    const manifest = leaned({ "dice.river-stone.lean.three": 1e-12 });
    const odds = castOdds(manifest, "river-stone") ?? {};
    // Vanishing, and still possible — the floor is one tick, never none. This
    // is the gap manifest.ts names under "a bound on a lean's RATIO" and hands
    // to L007: the cast makes it rare, it does not make it a lie.
    expect(odds["three"]).toBeGreaterThan(0);
    expect(odds["three"]).toBeLessThan(1e-5);
    expect(Object.values(odds).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it("survives a weight of 1e12 without falling out of the draw's range", () => {
    const manifest = leaned({ "dice.river-stone.lean.three": 1e12 });
    const odds = castOdds(manifest, "river-stone") ?? {};
    expect(odds["three"]).toBeGreaterThan(0.999);
    expect(odds["six"]).toBeGreaterThan(0);
    // The draw still happens — a total too wide to draw across is normalised,
    // not thrown.
    const [bone] = cast(manifest, seed(11), "river-stone");
    expect(bone.face).toBe("three");
  });

  it("takes a fractional weight, rounded where it is written down", () => {
    const manifest = leaned({ "dice.river-stone.lean.three": 0.5 });
    const odds = castOdds(manifest, "river-stone") ?? {};
    // one·1 two·1 three·0.5 four·2 five·1 six·1 = 6.5 of weight.
    expect(odds["three"]).toBeCloseTo(0.5 / 6.5, 5);
    expect(odds["four"]).toBeCloseTo(2 / 6.5, 5);
    expect(Object.values(odds).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it("answers null for a die nobody wrote down", () => {
    expect(castOdds(base(), "a-die-that-does-not-exist")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────── refusals, loud ──

describe("the cast refuses", () => {
  it("a die this manifest does not declare", () => {
    expect(() => cast(base(), seed(1), "a-die-that-does-not-exist")).toThrow(RangeError);
  });

  it("a die that is switched off", () => {
    // `river-stone` ships inside a set that is off, so it is not in the arsenal.
    expect(() => cast(base(), seed(1), "river-stone")).toThrow(/switched off/);
    // …and the same die, once the set is on, casts.
    expect(() => cast(leaned(), seed(1), "river-stone")).not.toThrow();
  });

  it("a hand carrying either, before a fight has a history to lose", () => {
    expect(() => requireHand(base(), ["bone", "bone", "river-stone"])).toThrow(/switched off/);
    expect(() => requireHand(base(), ["bone", "bone"])).not.toThrow();
  });
});

// ───────────────────────────────────────────────────────── the hand, in order ──

describe("a hand", () => {
  const HAND = ["bone", "bone", "bone", "bone", "bone", "bone"];

  it("casts one die per die, left to right", () => {
    const manifest = base();
    const rng = seed(5);
    const [bones, after] = castHand(manifest, rng, HAND);
    expect(bones).toHaveLength(HAND.length);

    // The same six casts, threaded by hand — the hand is not a batch, it is a
    // sequence, and the fixed draw order says which.
    let stream = rng;
    for (const bone of bones) {
      const [one, next] = cast(manifest, stream, "bone");
      expect(one).toEqual(bone);
      stream = next;
    }
    expect(stream).toEqual(after);
  });

  it("replays exactly from the same stream", () => {
    const manifest = base();
    expect(castHand(manifest, seed(77), HAND)).toEqual(castHand(manifest, seed(77), HAND));
  });

  it("gives a different hand on a different seed", () => {
    const manifest = base();
    const [a] = castHand(manifest, seed(1), HAND);
    const [b] = castHand(manifest, seed(2), HAND);
    expect(a).not.toEqual(b);
  });

  it("puts the leaned die where the hand puts it, and no draw moves", () => {
    const manifest = leaned();
    // "Hand = 5 plain bones + 1 signature die" — the signature last.
    const [bones] = castHand(manifest, seed(31), ["bone", "bone", "bone", "bone", "bone", "river-stone"]);
    expect(bones.map((b) => b.die)).toEqual([
      "bone",
      "bone",
      "bone",
      "bone",
      "bone",
      "river-stone",
    ]);
  });
});
