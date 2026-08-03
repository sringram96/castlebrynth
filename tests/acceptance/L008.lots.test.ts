/// <reference types="vite/client" />
// L008 — the Lots acceptance. One seeded fight, from the outside.
//
// Black box: the Lots surface and the shipped grammar.yaml, nothing else. This
// file is the phase-0 definition of done for combat — the intent is shown
// before you roll and lands exactly as shown, every tier the table declares
// scores its own arithmetic, each held die blocks precisely one, the same seed
// replays to the same fight, and both ways out are reachable.
//
// GREEN, AND RUN BY HAND. Like H000 it sits outside `tsconfig.json`'s `include`
// and outside `vitest run src`, so `npm run law` neither type-checks nor runs
// it. Unlike H000 it is not red on purpose — it passes today and must keep
// passing:
//
//     npx vitest run tests/acceptance/L008.lots.test.ts
//
// It cannot simply be added to the law gate, because `vitest run tests` would
// also pick up H000, which is deliberately red until H004's bundle and H006's
// resolution are wired together. Widening the gate is that card's business, not
// this one's.
//
// ─────────────────────────────────────────────────────── DESIGN, not the file ──
//
// The multipliers below are DESIGN's parenthesis written out by hand — "pair
// ×2, trips ×3, straight ×3, full house ×4, quads+ ×5" — and NOT read from
// grammar.yaml. An acceptance test that reads the table it is checking proves
// only that the file agrees with itself. If an experiment moves a multiplier,
// this file goes red, and that is the point: the shipped base is what DESIGN
// says it is.
//
// ────────────────────────────────────────────────── every tier, actually thrown ──
//
// The tiers are not asserted against invented dice. Real hands are cast off
// real seeded streams, and for each tier the test picks the subset of a real
// roll that makes it and throws THAT — which is precisely the decision a player
// makes at the fight screen. A tier only counts as scored here if some seed
// actually produced a hand that could make it.
//
// The collections DESIGN names but grammar.yaml deliberately leaves empty —
// jokers, spells, skills, enemy rules — are DEFERRED past H180 (L005, L006), so
// `on_score` fires nothing and there is nothing here about it. This covers the
// tiers that are IMPLEMENTED. When a joker can speak, the additive half of the
// pipeline gets its own acceptance.
//
// Foes are fixtures even though grammar.yaml now ships two enemies (D005): what
// it ships is the GRAMMAR's half — a name and a pursuit chance — while a body
// and its intents are the enemy card's, in content/foes/. A fight this test can
// do arithmetic against needs both halves pinned here, not read from content
// that a later card is free to rebalance.

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import { STREAM, fork } from "../../src/core/rng";
import type { RngState } from "../../src/core/types";
import { formatProblem, loadManifest } from "../../src/lots/manifest";
import type { Manifest } from "../../src/lots/manifest";
import { bestTier } from "../../src/lots/score";
import { brace, flee, openFight, rollHand, throwBones } from "../../src/lots/turn";
import type { Fight, Foe } from "../../src/lots/turn";

/** DESIGN §the lots, by hand. The whole implemented table. */
const DESIGN_TIERS: Readonly<Record<string, number>> = {
  pair: 2,
  trips: 3,
  straight: 3,
  full_house: 4,
  quads: 5,
};

/** "Hand = 5 plain bones + 1 signature die" — six dice, all plain for now. */
const HAND = ["bone", "bone", "bone", "bone", "bone", "bone"];

const manifest = ((): Manifest => {
  const result = loadManifest("grammar.yaml", parse(grammarSource));
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.manifest;
})();

/** The Lots' own stream, forked off a run's — never sharing the Descent's. */
const lots = (seed: number): RngState => fork({ seed, draws: 0 }, STREAM.lots);

const foe = (over: Partial<Foe> = {}): Foe => ({
  id: "acceptance-foe",
  hp: 60,
  intents: [7],
  pursuit: 0,
  ...over,
});

const indices = (fight: Fight): number[] => (fight.roll ?? []).map((_, i) => i);

const pipsAt = (fight: Fight, at: readonly number[]): number =>
  at.reduce((sum, i) => sum + (fight.roll?.[i]?.pips ?? 0), 0);

/** Every non-empty selection of `n` dice, smallest first. What a thumb has. */
function selections(n: number): readonly (readonly number[])[] {
  const out: number[][] = [];
  for (let mask = 1; mask < 1 << n; mask += 1) {
    const pick: number[] = [];
    for (let i = 0; i < n; i += 1) if (mask & (1 << i)) pick.push(i);
    out.push(pick);
  }
  return out.sort((a, b) => a.length - b.length);
}

const SELECTIONS = selections(HAND.length);

/** The dice of this roll that make `tier`, or null if this hand cannot. */
function makes(fight: Fight, tier: string): readonly number[] | null {
  const roll = fight.roll;
  if (roll === null) return null;
  for (const pick of SELECTIONS) {
    if (bestTier(manifest, pick.map((i) => roll[i]).filter((b) => b !== undefined)) === tier) {
      return pick;
    }
  }
  return null;
}

// ────────────────────────────────────────────── 1 · intents match effects ──

describe("L008 · the intent is shown, and lands as shown", () => {
  it("shows before the roll and never rolls for itself", () => {
    const rng = lots(1);
    const fight = openFight(manifest, rng, foe({ intents: [4, 9, 2] }), HAND, 40);
    expect(fight.intent).toBe(4);
    expect(fight.roll).toBeNull();
    // Enemies never roll: opening a fight spends no entropy.
    expect(fight.rng).toEqual(rng);
  });

  it("lands exactly what it showed, every turn of a whole fight", () => {
    let fight = openFight(manifest, lots(2), foe({ hp: 400, intents: [3, 8, 5, 11] }), HAND, 200);
    const shown: number[] = [];
    for (let turn = 0; turn < 8 && fight.ending === null; turn += 1) {
      const before = fight;
      shown.push(before.intent);
      const rolled = rollHand(manifest, before);
      // Half the hand thrown, half held — so the block is real and partial.
      const thrown = indices(rolled).slice(0, 3);
      fight = throwBones(manifest, rolled, thrown);

      const held = HAND.length - thrown.length;
      const harm = Math.max(0, before.intent - held);
      expect(fight.last?.intent).toBe(before.intent);
      expect(fight.last?.harm).toBe(harm);
      expect(fight.hp).toBe(before.hp - harm);
    }
    // …and it cycled the intents it was given, in order.
    expect(shown).toEqual([3, 8, 5, 11, 3, 8, 5, 11]);
  });
});

// ────────────────────────────────────── 2 · every implemented tier scores ──

describe("L008 · the tier table, thrown for real", () => {
  it("scores every tier DESIGN declares, from hands that actually landed", () => {
    const wanted = Object.keys(DESIGN_TIERS);
    const scored = new Map<string, number>();

    for (let seed = 0; seed < 600 && scored.size < wanted.length; seed += 1) {
      const rolled = rollHand(manifest, openFight(manifest, lots(seed), foe({ hp: 9999 }), HAND, 9999));
      for (const tier of wanted) {
        if (scored.has(tier)) continue;
        const pick = makes(rolled, tier);
        if (pick === null) continue;

        const after = throwBones(manifest, rolled, pick);
        const mult = DESIGN_TIERS[tier] ?? 0;
        const sum = pipsAt(rolled, pick);

        // base = sum of thrown faces × combo tier, and the harm to the foe is
        // that number and nothing else.
        expect(after.last?.tier).toBe(tier);
        expect(after.last?.score).toBe(sum * mult);
        expect(after.foeHp).toBe(9999 - sum * mult);
        scored.set(tier, sum * mult);
      }
    }

    expect([...scored.keys()].sort()).toEqual([...wanted].sort());
    for (const score of scored.values()) expect(score).toBeGreaterThan(0);
  });

  it("scores a throw with no combo at its bare sum", () => {
    const rolled = rollHand(manifest, openFight(manifest, lots(3), foe({ hp: 9999 }), HAND, 9999));
    // One die is a combo of nothing, always.
    const after = throwBones(manifest, rolled, [0]);
    expect(after.last?.tier).toBeNull();
    expect(after.last?.score).toBe(pipsAt(rolled, [0]));
  });
});

// ──────────────────────────────────────────── 3 · each held die blocks 1 ──

describe("L008 · the block is exact", () => {
  it("blocks one per die held, for every size of throw", () => {
    for (let thrown = 0; thrown <= HAND.length; thrown += 1) {
      const before = openFight(manifest, lots(400 + thrown), foe({ hp: 9999, intents: [8] }), HAND, 500);
      const rolled = rollHand(manifest, before);
      const pick = indices(rolled).slice(0, thrown);
      const after = thrown === 0 ? brace(rolled) : throwBones(manifest, rolled, pick);

      const held = HAND.length - thrown;
      expect(after.last?.held).toBe(held);
      expect(after.last?.block).toBe(held);
      expect(after.last?.harm).toBe(Math.max(0, 8 - held));
      expect(after.hp).toBe(500 - Math.max(0, 8 - held));
    }
  });

  it("BRACE holds the whole hand — and a full block is not a heal", () => {
    const rolled = rollHand(manifest, openFight(manifest, lots(5), foe({ intents: [2] }), HAND, 30));
    const after = brace(rolled);
    expect(after.last?.block).toBe(HAND.length);
    expect(after.last?.score).toBe(0);
    expect(after.hp).toBe(30);
  });

  it("FLEE is offered at any beat, and its pursuit chance is what it declared", () => {
    // Before the roll…
    expect(flee(openFight(manifest, lots(6), foe({ pursuit: 0 }), HAND, 30)).ending).toBe("fled");
    // …and after it. Pursuit is declared, so it is not a surprise.
    const rolled = rollHand(manifest, openFight(manifest, lots(6), foe({ pursuit: 1, intents: [7] }), HAND, 30));
    const chased = flee(rolled);
    expect(chased.ending).toBe("fled");
    expect(chased.last?.pursued).toBe(true);
    // One parting harm, and the dice you were holding are not in the way.
    expect(chased.hp).toBe(23);
  });
});

// ─────────────────────────────────────── 4 · deterministic replay, two seeds ──

describe("L008 · the same seed is the same fight", () => {
  /** One scripted fight: brace, throw three, brace, throw everything, flee. */
  const script = (seed: number): string => {
    let fight = openFight(manifest, lots(seed), foe({ hp: 300, intents: [5, 9] }), HAND, 80);
    fight = brace(rollHand(manifest, fight));
    let rolled = rollHand(manifest, fight);
    fight = throwBones(manifest, rolled, indices(rolled).slice(0, 3));
    fight = brace(rollHand(manifest, fight));
    rolled = rollHand(manifest, fight);
    fight = throwBones(manifest, rolled, indices(rolled));
    return JSON.stringify(flee(fight));
  };

  it("replays exactly, on both seeds", () => {
    expect(script(11)).toBe(script(11));
    expect(script(12)).toBe(script(12));
  });

  it("and the two seeds are two different fights", () => {
    expect(script(11)).not.toBe(script(12));
  });

  it("survives a save taken mid-turn and resumes on the same die", () => {
    const midturn = rollHand(manifest, openFight(manifest, lots(13), foe(), HAND, 40));
    const reloaded = JSON.parse(JSON.stringify(midturn)) as Fight;
    expect(reloaded).toEqual(midturn);
    expect(brace(reloaded)).toEqual(brace(midturn));
  });
});

// ──────────────────────────────────────────── 5 · both ways out are reachable ──

describe("L008 · win and lose", () => {
  it("wins: throw the whole hand at something that can die", () => {
    let fight = openFight(manifest, lots(14), foe({ hp: 30, intents: [1] }), HAND, 60);
    for (let turn = 0; turn < 12 && fight.ending === null; turn += 1) {
      const rolled = rollHand(manifest, fight);
      fight = throwBones(manifest, rolled, indices(rolled));
    }
    expect(fight.ending).toBe("won");
    expect(fight.foeHp).toBeLessThanOrEqual(0);
    expect(fight.hp).toBeGreaterThan(0);
  });

  it("loses: brace against something that outlasts you", () => {
    let fight = openFight(manifest, lots(15), foe({ hp: 9999, intents: [10] }), HAND, 12);
    // Six held dice block six, so four lands a turn — three turns of twelve.
    for (let turn = 0; turn < 12 && fight.ending === null; turn += 1) {
      fight = brace(rollHand(manifest, fight));
    }
    expect(fight.ending).toBe("lost");
    expect(fight.hp).toBeLessThanOrEqual(0);
  });

  it("takes no further act once it is over, either way", () => {
    const won = throwBones(
      manifest,
      rollHand(manifest, openFight(manifest, lots(16), foe({ hp: 1, intents: [0] }), HAND, 20)),
      [0],
    );
    expect(won.ending).toBe("won");
    expect(() => rollHand(manifest, won)).toThrow();
    expect(() => brace(won)).toThrow();
    expect(() => flee(won)).toThrow();
  });
});
