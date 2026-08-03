/// <reference types="vite/client" />
// L002 · the turn, asserted.
//
// "enemy intent shows (enemies never roll) → roll your hand → THROW a combo /
// brace / FLEE → each held die blocks 1 → intent lands" (DESIGN §the lots),
// walked one clause at a time.
//
// The block math is checked EXACTLY and never approximately: the roll is read
// off the fight, so every expectation below is arithmetic on a known hand
// rather than a range a lucky seed could satisfy.
//
// Foes are fixtures. grammar.yaml ships `enemies: {}` on purpose — "an invented
// joker is a balance decision made in the dark" — and an enemy's body and
// intents are the enemy card's, not the grammar's (manifest.ts). Inventing one
// in the shipped base would be that decision; inventing one here is a fixture.

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import { STREAM, fork } from "../core/rng";
import type { RngState } from "../core/types";
import { applyOverlay, formatProblem, loadManifest } from "./manifest";
import type { LoadResult, Manifest } from "./manifest";
import type { Foe } from "./turn";
import { brace, flee, openFight, rollHand, throwBones } from "./turn";
import type { Fight } from "./turn";

const GRAMMAR = "grammar.yaml";

const loaded = (result: LoadResult): Manifest => {
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.manifest;
};

const base = (): Manifest => loaded(loadManifest(GRAMMAR, parse(grammarSource)));

/** "Hand = 5 plain bones + 1 signature die" — six, and all plain here. */
const HAND = ["bone", "bone", "bone", "bone", "bone", "bone"];

/** The stream a fight is handed: the Lots' own, forked off the run's. */
const lots = (seed: number): RngState => fork({ seed, draws: 0 }, STREAM.lots);

const foe = (over: Partial<Foe> = {}): Foe => ({
  id: "fixture-foe",
  hp: 40,
  intents: [8],
  pursuit: 0,
  ...over,
});

const all = (fight: Fight): number[] => (fight.roll ?? []).map((_, i) => i);

// ─────────────────────────────────────────── the intent shows, and never rolls ──

describe("opening a fight", () => {
  it("shows the intent before a single die is cast", () => {
    const rng = lots(1);
    const fight = openFight(base(), rng, foe({ intents: [5, 9] }), HAND, 20);
    expect(fight.intent).toBe(5);
    expect(fight.roll).toBeNull();
    // Enemies never roll: opening spends no entropy at all.
    expect(fight.rng).toEqual(rng);
  });

  it("starts you and the foe whole — the hand refreshes per fight", () => {
    const fight = openFight(base(), lots(1), foe(), HAND, 20);
    expect(fight.foeHp).toBe(40);
    expect(fight.hp).toBe(20);
    expect(fight.hand).toEqual(HAND);
    expect(fight.ending).toBeNull();
    expect(fight.last).toBeNull();
  });

  it("cycles the intents it was given, and rolls for none of them", () => {
    const manifest = base();
    let fight = openFight(manifest, lots(2), foe({ intents: [3, 7, 11] }), HAND, 200);
    const shown: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      shown.push(fight.intent);
      fight = brace(rollHand(manifest, fight));
    }
    expect(shown).toEqual([3, 7, 11, 3, 7, 11]);
  });

  it("refuses a hand carrying a die that is switched off", () => {
    expect(() => openFight(base(), lots(1), foe(), [...HAND, "river-stone"], 20)).toThrow(
      /switched off/,
    );
  });

  it("refuses a foe with nothing to show, and an impossible pursuit chance", () => {
    expect(() => openFight(base(), lots(1), foe({ intents: [] }), HAND, 20)).toThrow(/no intents/);
    expect(() => openFight(base(), lots(1), foe({ pursuit: 1.5 }), HAND, 20)).toThrow(/pursuit/);
  });

  it("refuses the gather economy rather than running the wrong one quietly", () => {
    const gathering = loaded(
      applyOverlay(base(), "experiments/x.yaml", { enable: ["economy.gather"] }),
    );
    expect(() => openFight(gathering, lots(1), foe(), HAND, 20)).toThrow(/gather/);
  });
});

// ───────────────────────────────────────────────────────── roll, and no rerolls ──

describe("rolling the hand", () => {
  it("casts every die of the hand", () => {
    const fight = rollHand(base(), openFight(base(), lots(3), foe(), HAND, 20));
    expect(fight.roll).toHaveLength(HAND.length);
    for (const bone of fight.roll ?? []) {
      expect(bone.die).toBe("bone");
      expect(bone.pips).toBeGreaterThanOrEqual(1);
      expect(bone.pips).toBeLessThanOrEqual(6);
    }
  });

  it("refuses a second cast in the same turn — NO REROLLS EVER", () => {
    const manifest = base();
    const rolled = rollHand(manifest, openFight(manifest, lots(3), foe(), HAND, 20));
    expect(() => rollHand(manifest, rolled)).toThrow(/NO REROLLS EVER/);
  });

  it("refuses a throw or a brace before anything has landed", () => {
    const fight = openFight(base(), lots(3), foe(), HAND, 20);
    expect(() => throwBones(base(), fight, [0])).toThrow(/roll your hand/);
    expect(() => brace(fight)).toThrow(/roll your hand/);
  });
});

// ──────────────────────────────────────────────────── each held die blocks 1 ──

describe("the block math", () => {
  const manifest = base();

  it("BRACE holds the whole hand, and every die of it blocks one", () => {
    const rolled = rollHand(manifest, openFight(manifest, lots(4), foe({ intents: [8] }), HAND, 20));
    const after = brace(rolled);
    expect(after.last?.held).toBe(6);
    expect(after.last?.block).toBe(6);
    expect(after.last?.score).toBe(0);
    expect(after.last?.harm).toBe(2); // 8 shown, 6 blocked
    expect(after.hp).toBe(18);
    expect(after.foeHp).toBe(40); // a brace throws nothing, so it costs nothing
  });

  it("throwing the whole hand holds nothing, so the whole intent lands", () => {
    const rolled = rollHand(manifest, openFight(manifest, lots(5), foe({ intents: [8] }), HAND, 20));
    const after = throwBones(manifest, rolled, all(rolled));
    expect(after.last?.held).toBe(0);
    expect(after.last?.block).toBe(0);
    expect(after.last?.harm).toBe(8);
    expect(after.hp).toBe(12);
  });

  it("blocks exactly one per die kept back, for every size of throw", () => {
    for (let keep = 0; keep <= 6; keep += 1) {
      const rolled = rollHand(
        manifest,
        openFight(manifest, lots(100 + keep), foe({ intents: [8] }), HAND, 40),
      );
      const indices = all(rolled).slice(0, 6 - keep);
      const after = indices.length === 0 ? brace(rolled) : throwBones(manifest, rolled, indices);
      expect(after.last?.held).toBe(keep);
      expect(after.last?.block).toBe(keep);
      expect(after.last?.harm).toBe(Math.max(0, 8 - keep));
      expect(after.hp).toBe(40 - Math.max(0, 8 - keep));
    }
  });

  it("never heals you when the block outruns the intent", () => {
    const rolled = rollHand(manifest, openFight(manifest, lots(6), foe({ intents: [2] }), HAND, 20));
    const after = brace(rolled);
    expect(after.last?.harm).toBe(0);
    expect(after.hp).toBe(20);
  });

  it("spends the thrown dice's score on the foe, and only the thrown ones", () => {
    const rolled = rollHand(manifest, openFight(manifest, lots(7), foe({ hp: 60 }), HAND, 60));
    const indices = [0, 1];
    const after = throwBones(manifest, rolled, indices);
    const bones = indices.map((i) => rolled.roll?.[i]);
    const sum = bones.reduce((total, b) => total + (b?.pips ?? 0), 0);
    const mult = manifest.tiers[after.last?.tier ?? ""]?.mult ?? 1;
    expect(after.last?.score).toBe(sum * mult);
    expect(after.foeHp).toBe(60 - sum * mult);
    // The four dice you held are not in the throw, and not on the foe.
    expect(after.last?.thrown).toHaveLength(2);
  });

  it("refuses a die thrown twice, a die that is not there, and an empty throw", () => {
    const rolled = rollHand(manifest, openFight(manifest, lots(8), foe(), HAND, 20));
    expect(() => throwBones(manifest, rolled, [0, 0])).toThrow(/thrown twice/);
    expect(() => throwBones(manifest, rolled, [9])).toThrow(/no die at position/);
    expect(() => throwBones(manifest, rolled, [])).toThrow(/BRACE/);
  });
});

// ────────────────────────────────────────────────────── the turn runs to its end ──

describe("the turn's shape", () => {
  const manifest = base();

  it("clears the roll and shows the next intent once it resolves", () => {
    let fight = openFight(manifest, lots(9), foe({ intents: [4, 6] }), HAND, 30);
    fight = brace(rollHand(manifest, fight));
    expect(fight.roll).toBeNull();
    expect(fight.turn).toBe(1);
    expect(fight.intent).toBe(6);
    expect(fight.last?.turn).toBe(0);
    expect(fight.last?.intent).toBe(4);
  });

  it("records what was shown alongside what landed", () => {
    const rolled = rollHand(manifest, openFight(manifest, lots(10), foe({ intents: [9] }), HAND, 30));
    const after = brace(rolled);
    expect(after.last?.intent).toBe(9);
    expect(after.last?.harm).toBe(3);
    expect(after.last?.action).toBe("brace");
  });
});

// ────────────────────────────────────────────────────────── win, lose, and flee ──

describe("the ways out", () => {
  const manifest = base();

  it("reaches a win: throw everything at something small", () => {
    let fight = openFight(manifest, lots(11), foe({ hp: 12, intents: [0] }), HAND, 30);
    for (let turn = 0; turn < 10 && fight.ending === null; turn += 1) {
      const rolled = rollHand(manifest, fight);
      fight = throwBones(manifest, rolled, all(rolled));
    }
    expect(fight.ending).toBe("won");
    expect(fight.foeHp).toBeLessThanOrEqual(0);
    expect(fight.hp).toBeGreaterThan(0);
  });

  it("reaches a loss: brace-only against something patient", () => {
    let fight = openFight(manifest, lots(12), foe({ hp: 500, intents: [10] }), HAND, 12);
    // Six dice block six, so four lands each turn: three turns of twelve HP.
    for (let turn = 0; turn < 10 && fight.ending === null; turn += 1) {
      fight = brace(rollHand(manifest, fight));
    }
    expect(fight.ending).toBe("lost");
    expect(fight.hp).toBeLessThanOrEqual(0);
  });

  it("takes no further acts once it is over", () => {
    let fight = openFight(manifest, lots(13), foe({ hp: 1, intents: [0] }), HAND, 20);
    fight = throwBones(manifest, rollHand(manifest, fight), [0]);
    expect(fight.ending).toBe("won");
    expect(() => rollHand(manifest, fight)).toThrow(/over/);
    expect(() => brace(fight)).toThrow(/over/);
    expect(() => flee(fight)).toThrow(/over/);
  });

  it("lets a shown intent land even when the throw was fatal — and calls that a loss", () => {
    // The foe dies to the throw; its intent lands anyway, and it kills you.
    // "EITHER bar at zero is death, by the same rule" — a fight you did not walk
    // out of is not a fight you won. (turn.ts, rulings 1 and 2.)
    // The whole hand is thrown, so nothing is held and nothing is blocked.
    let fight = rollHand(manifest, openFight(manifest, lots(14), foe({ hp: 1, intents: [3] }), HAND, 3));
    fight = throwBones(manifest, fight, all(fight));
    expect(fight.foeHp).toBeLessThanOrEqual(0);
    expect(fight.hp).toBeLessThanOrEqual(0);
    expect(fight.ending).toBe("lost");
  });
});

describe("FLEE, always offered", () => {
  const manifest = base();

  it("ends the fight before the dice are even cast", () => {
    const fight = flee(openFight(manifest, lots(15), foe({ pursuit: 0 }), HAND, 20));
    expect(fight.ending).toBe("fled");
    expect(fight.last?.action).toBe("flee");
  });

  it("costs exactly one word, whatever the pursuit chance is", () => {
    for (const pursuit of [0, 0.5, 1]) {
      const open = openFight(manifest, lots(16), foe({ pursuit }), HAND, 20);
      // A draw that is sometimes skipped is a draw order that depends on
      // content. It never is.
      expect(flee(open).rng.draws).toBe(open.rng.draws + 1);
    }
  });

  it("is never followed at 0, and always followed at 1", () => {
    for (let s = 0; s < 40; s += 1) {
      expect(flee(openFight(manifest, lots(200 + s), foe({ pursuit: 0 }), HAND, 20)).last?.pursued).toBe(
        false,
      );
      expect(flee(openFight(manifest, lots(200 + s), foe({ pursuit: 1 }), HAND, 20)).last?.pursued).toBe(
        true,
      );
    }
  });

  it("lands one parting harm when it follows, and it is unblocked", () => {
    const open = openFight(manifest, lots(17), foe({ pursuit: 1, intents: [7] }), HAND, 20);
    // Rolled and holding six dice — and you turned your back, so none of them
    // is between you and it.
    const after = flee(rollHand(manifest, open));
    expect(after.last?.pursued).toBe(true);
    expect(after.last?.block).toBe(0);
    expect(after.last?.harm).toBe(7);
    expect(after.hp).toBe(13);
    expect(after.ending).toBe("fled");
  });

  it("costs nothing when it does not follow", () => {
    const after = flee(openFight(manifest, lots(18), foe({ pursuit: 0, intents: [7] }), HAND, 20));
    expect(after.last?.harm).toBe(0);
    expect(after.hp).toBe(20);
  });

  it("is death if the parting harm is fatal", () => {
    const after = flee(openFight(manifest, lots(19), foe({ pursuit: 1, intents: [7] }), HAND, 5));
    expect(after.ending).toBe("lost");
  });
});

// ──────────────────────────────────────────────────── determinism, and the save ──

describe("a fight", () => {
  const manifest = base();

  /** One scripted fight: brace, brace, throw everything, flee. */
  const script = (seed: number): Fight => {
    let fight = openFight(manifest, lots(seed), foe({ hp: 200, intents: [6, 9] }), HAND, 40);
    fight = brace(rollHand(manifest, fight));
    fight = brace(rollHand(manifest, fight));
    fight = rollHand(manifest, fight);
    fight = throwBones(manifest, fight, all(fight));
    return flee(fight);
  };

  it("replays exactly from the same seed and the same inputs", () => {
    expect(JSON.stringify(script(21))).toBe(JSON.stringify(script(21)));
  });

  it("is a different fight on a different seed", () => {
    expect(JSON.stringify(script(21))).not.toBe(JSON.stringify(script(22)));
  });

  it("survives a JSON round trip mid-turn, and resumes on the same die", () => {
    const midturn = rollHand(manifest, openFight(manifest, lots(23), foe(), HAND, 30));
    const saved = JSON.parse(JSON.stringify(midturn)) as Fight;
    expect(saved).toEqual(midturn);
    expect(brace(saved)).toEqual(brace(midturn));
  });
});
