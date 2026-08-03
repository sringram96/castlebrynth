/// <reference types="vite/client" />
// L002 · the score, asserted.
//
// "base = sum of thrown faces × combo tier (pair ×2, trips ×3, straight ×3,
// full house ×4, quads+ ×5)" (DESIGN §the lots). Every tier the shipped table
// declares is thrown here and its arithmetic is checked as a NUMBER, not as a
// tier name — a test that only asserts `tier === "pair"` would pass against a
// scorer that forgot to multiply.
//
// The three places a shape check goes wrong are given their own blocks: five of
// a kind must NOT be a full house (one group cannot be both the three and the
// two), a `counts` entry is a MINIMUM (so quads+ needs no "or better"), and a
// tie between two ×3 tiers must land the same way every time.

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import { applyOverlay, formatProblem, loadManifest } from "./manifest";
import type { LoadResult, Manifest } from "./manifest";
import type { Bone } from "./cast";
import { bestTier, scoreThrow } from "./score";

const GRAMMAR = "grammar.yaml";

const loaded = (result: LoadResult): Manifest => {
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.manifest;
};

const base = (): Manifest => loaded(loadManifest(GRAMMAR, parse(grammarSource)));

const NAMED = ["", "one", "two", "three", "four", "five", "six"] as const;

/** A throw, written as the numbers on it. */
const thrown = (...pips: number[]): readonly Bone[] =>
  pips.map((p) => ({ die: "bone", face: NAMED[p] ?? "one", pips: p }));

const sum = (pips: number[]): number => pips.reduce((a, b) => a + b, 0);

// ─────────────────────────────────────────────── DESIGN's table, every tier ──

describe("the tier table, thrown", () => {
  const manifest = base();

  // Each row: the throw, the tier it must name, and the multiplier DESIGN
  // spells for it. The score is asserted as sum × mult, computed here.
  const table: readonly [string, number[], string, number][] = [
    ["pair ×2", [4, 4, 1, 2, 2, 6], "pair", 2],
    ["trips ×3", [5, 5, 5, 1, 2, 4], "trips", 3],
    ["straight ×3", [1, 2, 3, 4, 6, 6], "straight", 3],
    ["full house ×4", [2, 2, 2, 6, 6, 1], "full_house", 4],
    ["quads ×5", [3, 3, 3, 3, 1, 2], "quads", 5],
  ];

  for (const [what, pips, tier, mult] of table) {
    it(`scores a ${what}`, () => {
      const scored = scoreThrow(manifest, thrown(...pips));
      expect(scored.tier).toBe(tier);
      expect(scored.mult).toBe(mult);
      expect(scored.sum).toBe(sum(pips));
      expect(scored.score).toBe(sum(pips) * mult);
    });
  }

  it("scores a throw with no combo at its sum — ×1, and says so", () => {
    const scored = scoreThrow(manifest, thrown(1, 2, 4, 6));
    expect(scored.tier).toBeNull();
    expect(scored.mult).toBe(1);
    expect(scored.score).toBe(13);
  });

  it("scores one die alone", () => {
    expect(scoreThrow(manifest, thrown(6)).score).toBe(6);
  });

  it("scores nothing for nothing — which is what a BRACE throws", () => {
    const scored = scoreThrow(manifest, []);
    expect(scored.sum).toBe(0);
    expect(scored.tier).toBeNull();
    expect(scored.score).toBe(0);
  });

  it("only counts the dice you threw, never the ones you held", () => {
    // The held pair is not in the throw, so it is not in the shape.
    expect(scoreThrow(manifest, thrown(6, 1)).tier).toBeNull();
    expect(scoreThrow(manifest, thrown(6, 1)).score).toBe(7);
  });
});

// ──────────────────────────────────────────────────────── the shape rules ──

describe("the shape a tier wants", () => {
  const manifest = base();

  it("reads a `counts` entry as a MINIMUM, so quads+ takes five of a kind", () => {
    expect(bestTier(manifest, thrown(2, 2, 2, 2, 2))).toBe("quads");
    expect(scoreThrow(manifest, thrown(2, 2, 2, 2, 2)).score).toBe(50);
  });

  it("refuses one group as both halves of a full house", () => {
    // Five of a kind is ONE group. A full house is three of one and two of
    // ANOTHER, so [3, 2] must not match here — quads+ claims it instead.
    const table = base();
    const stripped = loaded(applyOverlay(table, "experiments/x.yaml", { disable: ["tiers.quads"] }));
    // With quads gone, five of a kind is trips (×3) and still not a full house.
    expect(bestTier(stripped, thrown(2, 2, 2, 2, 2))).toBe("trips");
  });

  it("wants a full house's two halves on different numbers", () => {
    expect(bestTier(manifest, thrown(4, 4, 4, 5, 5))).toBe("full_house");
    expect(bestTier(manifest, thrown(4, 4, 4, 5, 1))).toBe("trips");
  });

  it("measures a run in consecutive pips, and a gap breaks it", () => {
    expect(bestTier(manifest, thrown(2, 3, 4, 5))).toBe("straight");
    expect(bestTier(manifest, thrown(2, 3, 5, 6))).toBeNull();
    // A repeat is not a step: 3,4,4,5 is three consecutive values, not four.
    expect(bestTier(manifest, thrown(3, 4, 4, 5))).toBe("pair");
  });

  it("takes the longer run when the throw has one", () => {
    expect(bestTier(manifest, thrown(1, 2, 3, 4, 5, 6))).toBe("straight");
  });

  it("takes the highest multiplier a throw satisfies", () => {
    // 3,3,3,3 is a pair, trips AND quads. ×5 wins.
    expect(bestTier(manifest, thrown(3, 3, 3, 3))).toBe("quads");
  });
});

// ────────────────────────────────────────────────────── ties, and switches ──

describe("the table, as content", () => {
  const manifest = base();

  it("breaks a tie the same way every time — first declared wins", () => {
    // 3,3,3,4,5,6 is trips AND a straight of four. Both are ×3 in the shipped
    // table, and `trips` is written first, so `trips` is the answer — here, and
    // on every machine, and on every replay.
    const throwOf = thrown(3, 3, 3, 4, 5, 6);
    expect(bestTier(manifest, throwOf)).toBe("trips");
    expect(bestTier(manifest, throwOf)).toBe("trips");
    expect(scoreThrow(manifest, throwOf).score).toBe(24 * 3);
  });

  it("stops seeing a tier an experiment switched off", () => {
    const without = loaded(
      applyOverlay(base(), "experiments/x.yaml", { disable: ["tiers.quads", "tiers.full_house"] }),
    );
    // Four of a kind falls back to trips ×3 rather than reaching for a tier
    // that is no longer in the table.
    expect(bestTier(without, thrown(3, 3, 3, 3))).toBe("trips");
    expect(bestTier(base(), thrown(3, 3, 3, 3))).toBe("quads");
  });

  it("follows a multiplier an experiment moved", () => {
    const bent = loaded(applyOverlay(base(), "experiments/x.yaml", { override: { "tiers.pair.mult": 7 } }));
    const scored = scoreThrow(bent, thrown(6, 6));
    expect(scored.tier).toBe("pair");
    expect(scored.score).toBe(12 * 7);
  });

  it("follows a run length an experiment moved", () => {
    const bent = loaded(
      applyOverlay(base(), "experiments/x.yaml", { override: { "tiers.straight.match.run": 3 } }),
    );
    expect(bestTier(base(), thrown(1, 2, 3))).toBeNull();
    expect(bestTier(bent, thrown(1, 2, 3))).toBe("straight");
  });
});

// ──────────────────────────────────────────────────────────── determinism ──

describe("scoring", () => {
  it("is total and pure — the same throw, the same answer, always", () => {
    const manifest = base();
    const bones = thrown(5, 5, 5, 2, 2, 1);
    const once = scoreThrow(manifest, bones);
    expect(scoreThrow(manifest, bones)).toEqual(once);
    // No randomness reaches it: this is why a fight replays.
    expect(JSON.parse(JSON.stringify(once))).toEqual(once);
  });
});
