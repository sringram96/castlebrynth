/// <reference types="vite/client" />
// L001 · the Lots manifest, asserted.
//
// The card's DONE WHEN has three halves and they are the first three blocks:
//   1. the real grammar.yaml loads, and survives a JSON round-trip;
//   2. an overlay merges, PROVEN IN BOTH DIRECTIONS — a set switched on turns
//      an entry on, a disable turns one off, a numeric override lands, and an
//      overlay reaching for something the base does not have is refused;
//   3. a bad verb fixture fails pointed — with the file and the dotted key
//      path, in the same voice as src/core/cards.ts.
//
// After those, the laws this schema exists to make unbreakable: an unknown
// hook, `retrigger` refused BY NAME, a lean that deletes a face, and two
// gilded faces on one die.
//
// The exemplar below is annotated `Manifest`, so `tsc --noEmit` — the first
// third of `npm run law` — is an assertion about the types, and it is the
// file an author copies. It carries the collections grammar.yaml deliberately
// leaves empty (jokers, spells, skills, enemy rules, enemies): those are later
// cards' content, and inventing them in the shipped base would be a balance
// decision made in the dark. Inventing them in a test is a fixture.

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import {
  BANNED_VERBS,
  EFFECT_VERBS,
  HOOKS,
  MANIFEST_KEYS,
  OVERLAY_KEYS,
  applyOverlay,
  dieEv,
  formatProblem,
  isEnabled,
  loadManifest,
} from "./manifest";
import type { LoadResult, Manifest, Problem } from "./manifest";

const GRAMMAR = "grammar.yaml";
const FIXTURE = "grammar.fixture.yaml";
const OVERLAY = "experiments/thumb.yaml";

// ──────────────────────────────────────────────────────────────── the exemplar ──

/**
 * Everything a manifest may say, said once.
 *
 * Two dice — a plain one and a gilded one — two gilded faces declared so a die
 * can be made to carry both (it may not), a joker that is the DESIGN sentence
 * verbatim ("rusted knife: +2 to any scored combo"), a consumable spell and a
 * socketed one, a skill spent after the dice land, an enemy rule that is the
 * other DESIGN sentence ("seals your sixes"), and an enemy that declares how
 * hard it follows you when you run.
 */
const EXEMPLAR: Manifest = {
  version: 1,

  tiers: {
    pair: { mult: 2, match: { counts: [2] } },
    full_house: { mult: 4, match: { counts: [3, 2] } },
    straight: { mult: 3, match: { run: 4 } },
  },

  faces: {
    one: { pips: 1 },
    two: { pips: 2 },
    three: { pips: 3 },
    four: { pips: 4 },
    five: { pips: 5 },
    six: { pips: 6 },
    // A gilded trigger face. Its effect gives; a face may never charge.
    gilded_six: {
      pips: 6,
      gilded: { hook: "on_score", effects: [{ verb: "add", amount: 2 }] },
    },
    // A second one, declared so that a die can be caught carrying both.
    gilded_one: {
      pips: 1,
      gilded: { hook: "on_score", effects: [{ verb: "block", amount: 1 }] },
    },
  },

  dice: {
    bone: {
      name: "Knucklebone",
      faces: ["one", "two", "three", "four", "five", "six"],
      socketable: false,
    },
    hollow: {
      name: "The Hollow Die",
      faces: ["one", "two", "three", "four", "five", "gilded_six"],
      socketable: true,
      lean: { gilded_six: 0.5 },
      requires: { will: 2 },
    },
  },

  jokers: {
    knife: {
      name: "Rusted Knife",
      hook: "on_score",
      effects: [{ verb: "add", amount: 2 }],
    },
  },

  spells: {
    ember: {
      name: "Ember",
      sockets: false,
      hook: "skill_window",
      effects: [{ verb: "burn", amount: 1 }],
    },
    // Socketed onto a blank: the roll is the cost, so it fires where faces fire.
    ascension: {
      name: "The Rising Word",
      sockets: true,
      hook: "on_score",
      effects: [{ verb: "promote", amount: 1 }],
    },
  },

  skills: {
    steady_hand: {
      name: "Steady Hand",
      uses: 2,
      hook: "skill_window",
      effects: [{ verb: "add", amount: 3 }],
    },
  },

  enemy_rules: {
    seals_sixes: {
      name: "It seals your sixes.",
      hook: "roll",
      effects: [{ verb: "seal", face: "six" }],
    },
  },

  enemies: {
    hound: {
      name: "Tallow Hound",
      pursuit: 0.25,
      rules: ["seals_sixes"],
    },
  },

  economy: {
    gather: { enabled: false },
    refresh_per_fight: { enabled: true },
  },

  sets: {
    found: { enabled: false, entries: ["jokers.knife", "dice.hollow"] },
  },
};

// ──────────────────────────────────────────────────────────────────── plumbing ──

type Bag = Record<string, unknown>;

/** A fresh mutable copy of the exemplar. A manifest is JSON, so this is total. */
function copy(): Bag {
  return JSON.parse(JSON.stringify(EXEMPLAR)) as Bag;
}

function dig(root: unknown, ...steps: readonly (string | number)[]): Bag {
  let node: unknown = root;
  for (const key of steps) {
    if (Array.isArray(node) && typeof key === "number") {
      node = node[key];
      continue;
    }
    if (typeof node === "object" && node !== null && typeof key === "string") {
      node = (node as Bag)[key];
      continue;
    }
    throw new Error(`nothing at ${String(key)}`);
  }
  if (typeof node !== "object" || node === null) throw new Error("not a map");
  return node as Bag;
}

function loaded(result: LoadResult): Manifest {
  if (!result.ok) {
    throw new Error(`refused: ${result.problems.map(formatProblem).join(" | ")}`);
  }
  return result.manifest;
}

function refused(result: LoadResult): readonly Problem[] {
  if (result.ok) throw new Error("this loaded, and it should not have");
  return result.problems;
}

/** The one problem at a path. Failing to find exactly one prints them all. */
function pointedAt(problems: readonly Problem[], path: string): Problem {
  const found = problems.filter((problem) => problem.path === path);
  const first = found[0];
  if (found.length !== 1 || first === undefined) {
    throw new Error(
      `expected one problem at "${path}", got ${found.length} of ` +
        `[${problems.map(formatProblem).join(" | ")}]`,
    );
  }
  return first;
}

// ────────────────────────────────────────────────── 1 · the base loads ──

describe("the base manifest", () => {
  it("loads", () => {
    const manifest = loaded(loadManifest(GRAMMAR, parse(grammarSource)));
    expect(Object.keys(manifest.tiers)).toEqual([
      "pair",
      "trips",
      "straight",
      "full_house",
      "quads",
    ]);
    expect(Object.keys(manifest.faces)).toHaveLength(6);
    expect(Object.keys(manifest.dice)).toEqual(["bone", "river-stone"]);
  });

  it("round-trips through JSON", () => {
    const manifest = loaded(loadManifest(GRAMMAR, parse(grammarSource)));
    const again = loaded(loadManifest(GRAMMAR, JSON.parse(JSON.stringify(manifest))));
    expect(again).toEqual(manifest);
  });

  it("carries DESIGN's tier table", () => {
    const manifest = loaded(loadManifest(GRAMMAR, parse(grammarSource)));
    const mults = Object.fromEntries(
      Object.entries(manifest.tiers).map(([key, tier]) => [key, tier.mult]),
    );
    // "pair ×2, trips ×3, straight ×3, full house ×4, quads+ ×5"
    expect(mults).toEqual({ pair: 2, trips: 3, straight: 3, full_house: 4, quads: 5 });
  });

  it("anchors on a plain die of EV 3.5 (F2), and leans without moving it (F3)", () => {
    const manifest = loaded(loadManifest(GRAMMAR, parse(grammarSource)));
    expect(dieEv(manifest, "bone")).toBe(3.5);
    // "rare power = RELIABILITY via lean, not raw EV" — same anchor, tighter spread.
    expect(dieEv(manifest, "river-stone")).toBe(3.5);
    expect(dieEv(manifest, "a-die-that-does-not-exist")).toBeNull();
  });

  it("ships the spend economy as a question, not an answer", () => {
    const manifest = loaded(loadManifest(GRAMMAR, parse(grammarSource)));
    expect(isEnabled(manifest, "economy.gather")).toBe(false);
    expect(isEnabled(manifest, "economy.refresh_per_fight")).toBe(true);
  });

  it("and so does the exemplar, which is what an author copies", () => {
    const manifest = loaded(loadManifest(FIXTURE, copy()));
    expect(manifest.enemies["hound"]?.pursuit).toBe(0.25);
  });
});

// ────────────────────────────────────────────── 2 · overlays, both directions ──

describe("an experiment overlay", () => {
  const base = (): Manifest => loaded(loadManifest(GRAMMAR, parse(grammarSource)));

  it("switches an entry ON through its set, and OFF by name", () => {
    const before = base();
    // The river stone is in a set that ships off, so it is off — even though
    // the entry itself says nothing about being off.
    expect(before.dice["river-stone"]?.enabled).toBeUndefined();
    expect(isEnabled(before, "dice.river-stone")).toBe(false);
    expect(isEnabled(before, "dice.bone")).toBe(true);

    const after = loaded(
      applyOverlay(before, OVERLAY, {
        enable: ["sets.weights"],
        disable: ["dice.bone"],
      }),
    );
    expect(isEnabled(after, "dice.river-stone")).toBe(true);
    expect(isEnabled(after, "dice.bone")).toBe(false);
    // and the base it layered over is untouched
    expect(isEnabled(before, "dice.river-stone")).toBe(false);
    expect(isEnabled(before, "dice.bone")).toBe(true);
  });

  it("flips the parked economy question without a line of code moving", () => {
    const after = loaded(
      applyOverlay(base(), OVERLAY, {
        enable: ["economy.gather"],
        disable: ["economy.refresh_per_fight"],
      }),
    );
    expect(isEnabled(after, "economy.gather")).toBe(true);
    expect(isEnabled(after, "economy.refresh_per_fight")).toBe(false);
  });

  it("overrides a number, however deep it sits", () => {
    const after = loaded(
      applyOverlay(base(), OVERLAY, {
        override: {
          "tiers.pair.mult": 3,
          "tiers.straight.match.run": 5,
          "dice.river-stone.lean.three": 3,
        },
      }),
    );
    expect(after.tiers["pair"]?.mult).toBe(3);
    expect(after.tiers["straight"]?.match.run).toBe(5);
    expect(after.dice["river-stone"]?.lean?.["three"]).toBe(3);
    // and the EV moves with it, measurably
    expect(dieEv(after, "river-stone")).toBeCloseTo(31 / 9, 10);
  });

  it("refuses to introduce an entry", () => {
    const problems = refused(
      applyOverlay(base(), OVERLAY, { enable: ["dice.obsidian"] }),
    );
    const problem = pointedAt(problems, "enable[0]");
    expect(problem.file).toBe(OVERLAY);
    expect(problem.message).toContain("not in the base manifest");
    expect(problem.message).toContain("cannot introduce an entry");
  });

  it("refuses to introduce a value the base does not already carry", () => {
    const problems = refused(
      applyOverlay(base(), OVERLAY, { override: { "dice.bone.lean.six": 2 } }),
    );
    expect(pointedAt(problems, "override.dice.bone.lean.six").message).toContain(
      "not in the base manifest",
    );
  });

  it("refuses to write a WORD anywhere — which is how it cannot add a verb or a hook", () => {
    const asVerb = refused(
      applyOverlay(base(), OVERLAY, { override: { "version": "retrigger" } }),
    );
    expect(pointedAt(asVerb, "override.version").message).toContain("NUMERIC values only");

    const atANonNumber = refused(
      applyOverlay(base(), OVERLAY, { override: { "dice.bone.name": 4 } }),
    );
    expect(pointedAt(atANonNumber, "override.dice.bone.name").message).toContain(
      "only override numeric values",
    );
  });

  it("speaks three words and no others", () => {
    expect(OVERLAY_KEYS).toEqual(["enable", "disable", "override"]);
    const problems = refused(
      applyOverlay(base(), OVERLAY, { dice: { obsidian: { name: "Obsidian" } } }),
    );
    expect(pointedAt(problems, "dice").message).toContain('unknown overlay key "dice"');
  });

  it("is read back through the front door, so it cannot override a law away", () => {
    // A lean weight is a number, so `override` may move it — to 0 it may not.
    const problems = refused(
      applyOverlay(base(), OVERLAY, { override: { "dice.river-stone.lean.three": 0 } }),
    );
    expect(pointedAt(problems, "dice.river-stone.lean.three").message).toContain(
      "greater than zero",
    );
  });
});

// ─────────────────────────────────────── 3 · unknown words fail at LOAD ──

describe("the closed language", () => {
  it("names the pipeline in the order it runs, and nothing else", () => {
    expect(HOOKS).toEqual([
      "intent_shown",
      "roll",
      "skill_window",
      "action",
      "combo_validate",
      "base_sum",
      "tier_mult",
      "on_score",
      "apply",
      "enemy_resolve",
      "on_hold",
      "armor",
      "on_block",
      "on_turn_end",
    ]);
    expect(EFFECT_VERBS).toEqual([
      "add",
      "mult",
      "promote",
      "block",
      "burn",
      "hp",
      "seal",
      "curse",
    ]);
    expect(EFFECT_VERBS).not.toContain("retrigger");
    expect(MANIFEST_KEYS).toContain("enemy_rules");
  });

  it("refuses an unknown hook, at its path", () => {
    const source = copy();
    dig(source, "jokers", "knife")["hook"] = "on_crit";
    const problem = pointedAt(refused(loadManifest(FIXTURE, source)), "jokers.knife.hook");
    expect(formatProblem(problem)).toBe(
      `grammar.fixture.yaml: jokers.knife.hook — ${problem.message}`,
    );
    expect(problem.message).toContain('unknown hook "on_crit"');
    expect(problem.message).toContain("intent_shown → roll → skill_window");
    expect(problem.message).toContain("loud amendment");
  });

  it("refuses an unknown effect verb, at its path", () => {
    const source = copy();
    dig(source, "jokers", "knife", "effects", 0)["verb"] = "sunder";
    const problem = pointedAt(
      refused(loadManifest(FIXTURE, source)),
      "jokers.knife.effects[0].verb",
    );
    expect(problem.file).toBe(FIXTURE);
    expect(problem.message).toContain('unknown effect verb "sunder"');
    expect(problem.message).toContain("add, mult, promote, block, burn, hp, seal, curse");
  });

  it("refuses `retrigger` BY NAME, and says why it is gone", () => {
    expect(BANNED_VERBS).toEqual(["retrigger"]);

    const asVerb = copy();
    dig(asVerb, "jokers", "knife", "effects", 0)["verb"] = "retrigger";
    const verb = pointedAt(refused(loadManifest(FIXTURE, asVerb)), "jokers.knife.effects[0].verb");
    expect(verb.message).toContain('"retrigger" is a BANNED verb');
    expect(verb.message).toContain("nothing re-enters scoring");
    expect(verb.message).toContain("F5 termination");
    expect(verb.message).not.toContain("unknown effect verb");

    // Someone will also try it as a hook. Same answer, same reason.
    const asHook = copy();
    dig(asHook, "jokers", "knife")["hook"] = "retrigger";
    const hook = pointedAt(refused(loadManifest(FIXTURE, asHook)), "jokers.knife.hook");
    expect(hook.message).toContain("BANNED");
    expect(hook.message).toContain("NO REROLLS EVER");
  });

  it("refuses an unknown manifest key", () => {
    const source = copy();
    source["curses"] = {};
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "curses").message).toContain(
      'unknown manifest key "curses"',
    );
  });
});

// ─────────────────────────────────────────────── 4 · the laws of the dice ──

describe("a loaded bone", () => {
  it("refuses a lean that deletes a face", () => {
    const zeroed = copy();
    dig(zeroed, "dice", "bone")["lean"] = { six: 0 };
    const problem = pointedAt(refused(loadManifest(FIXTURE, zeroed)), "dice.bone.lean.six");
    expect(problem.message).toContain("greater than zero");
    expect(problem.message).toContain("All six faces always possible");
    expect(problem.message).toContain("never none");

    // and the same for a negative weight, which deletes it twice over
    const negative = copy();
    dig(negative, "dice", "bone")["lean"] = { six: -1 };
    expect(pointedAt(refused(loadManifest(FIXTURE, negative)), "dice.bone.lean.six").message)
      .toContain("greater than zero");

    // a small weight is not deletion, and loads
    const rare = copy();
    dig(rare, "dice", "bone")["lean"] = { six: 0.25 };
    expect(dieEv(loaded(loadManifest(FIXTURE, rare)), "bone")).toBeCloseTo(
      (1 + 2 + 3 + 4 + 5 + 0.25 * 6) / 5.25,
      10,
    );
  });

  it("refuses a lean on a face the die does not have", () => {
    const source = copy();
    dig(source, "dice", "bone")["lean"] = { gilded_six: 2 };
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "dice.bone.lean.gilded_six").message)
      .toContain("not a face of this die");
  });

  it("refuses anything but six faces", () => {
    const source = copy();
    dig(source, "dice", "bone")["faces"] = ["one", "two", "three", "four", "five"];
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "dice.bone.faces").message).toContain(
      "a die has six faces, not 5",
    );
  });

  it("refuses two gilded faces on one die", () => {
    const source = copy();
    dig(source, "dice", "hollow")["faces"] = [
      "one",
      "two",
      "three",
      "four",
      "gilded_one",
      "gilded_six",
    ];
    dig(source, "dice", "hollow")["lean"] = { gilded_six: 0.5 };
    const problem = pointedAt(refused(loadManifest(FIXTURE, source)), "dice.hollow.faces");
    expect(problem.message).toContain("2 gilded faces on one die");
    expect(problem.message).toContain("gilded_one, gilded_six");
    expect(problem.message).toContain("At most ONE gilded trigger face per die");
  });

  it("gates access on a stat, and nothing else", () => {
    const manifest = loaded(loadManifest(FIXTURE, copy()));
    expect(manifest.dice["hollow"]?.requires).toEqual({ will: 2 });

    const source = copy();
    dig(source, "dice", "hollow")["requires"] = { luck: 3 };
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "dice.hollow.requires.luck").message)
      .toContain('unknown stat "luck"');
  });
});

// ──────────────────────────────────── 5 · the laws of what an entry may say ──

describe("what an entry may say", () => {
  it("refuses a face that charges you", () => {
    const source = copy();
    dig(source, "faces", "gilded_six", "gilded", "effects", 0)["amount"] = -2;
    const problem = pointedAt(
      refused(loadManifest(FIXTURE, source)),
      "faces.gilded_six.gilded.effects[0].amount",
    );
    expect(problem.message).toContain("no verb-faces, no self-cost faces");
  });

  it("lets a joker carry a cost, because F4 is written as a number", () => {
    const source = copy();
    dig(source, "jokers", "knife", "effects", 0)["amount"] = -1;
    expect(loaded(loadManifest(FIXTURE, source)).jokers["knife"]?.effects[0]?.amount).toBe(-1);
  });

  it("holds F1: one entry, at most one mult", () => {
    const source = copy();
    dig(source, "jokers", "knife")["effects"] = [
      { verb: "mult", amount: 2 },
      { verb: "mult", amount: 2 },
    ];
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "jokers.knife.effects").message)
      .toContain("at most ONE item mult");
  });

  it("puts faces and jokers where DESIGN's pipeline puts them", () => {
    const source = copy();
    dig(source, "jokers", "knife")["hook"] = "on_turn_end";
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "jokers.knife.hook").message).toContain(
      "faces-then-jokers",
    );
  });

  it("spends a skill only after the dice land", () => {
    const source = copy();
    dig(source, "skills", "steady_hand")["hook"] = "roll";
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "skills.steady_hand.hook").message)
      .toContain("spent AFTER the dice land");
  });

  it("makes a socketed spell obey the law of the face it becomes", () => {
    const source = copy();
    dig(source, "spells", "ascension")["hook"] = "action";
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "spells.ascension.hook").message)
      .toContain("the roll is the cost");
    // a consumable is an instant and may fire anywhere
    const instant = copy();
    dig(instant, "spells", "ember")["hook"] = "intent_shown";
    expect(loaded(loadManifest(FIXTURE, instant)).spells["ember"]?.hook).toBe("intent_shown");
  });

  it("lets `seal` name a face and nothing else", () => {
    const wrongOperand = copy();
    dig(wrongOperand, "enemy_rules", "seals_sixes")["effects"] = [{ verb: "seal", amount: 1 }];
    const problems = refused(loadManifest(FIXTURE, wrongOperand));
    expect(pointedAt(problems, "enemy_rules.seals_sixes.effects[0].amount").message).toContain(
      "takes a face, not an amount",
    );

    const unknownFace = copy();
    dig(unknownFace, "enemy_rules", "seals_sixes", "effects", 0)["face"] = "seven";
    expect(
      pointedAt(
        refused(loadManifest(FIXTURE, unknownFace)),
        "enemy_rules.seals_sixes.effects[0].face",
      ).message,
    ).toContain('"seven" is not a declared face');
  });
});

// ──────────────────────────────────────────────── 6 · flee is always offered ──

describe("an enemy", () => {
  it("does not load without a pursuit chance", () => {
    const source = copy();
    delete dig(source, "enemies", "hound")["pursuit"];
    const problem = pointedAt(refused(loadManifest(FIXTURE, source)), "enemies.hound.pursuit");
    expect(problem.message).toContain("FLEE is always offered");
    expect(problem.message).toContain("declares its PURSUIT chance alongside its intent");
  });

  it("declares it as a chance, not as a wish", () => {
    const source = copy();
    dig(source, "enemies", "hound")["pursuit"] = 1.5;
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "enemies.hound.pursuit").message)
      .toContain("a chance from 0 to 1");
  });

  it("bends only rules this manifest declares", () => {
    const source = copy();
    dig(source, "enemies", "hound")["rules"] = ["drinks_your_light"];
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "enemies.hound.rules[0]").message)
      .toContain("not a declared enemy rule");
  });
});

// ─────────────────────────────────────────────────── 7 · the tier table's shape ──

describe("a tier", () => {
  it("wants one shape, not two", () => {
    const source = copy();
    dig(source, "tiers", "pair")["match"] = { counts: [2], run: 4 };
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "tiers.pair.match").message).toContain(
      "one shape, not two",
    );
  });

  it("cannot want a run longer than the faces that exist", () => {
    const source = copy();
    dig(source, "tiers", "straight")["match"] = { run: 9 };
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "tiers.straight.match.run").message)
      .toContain("a tier that can never be thrown");
  });

  it("counts groups as minimums, so quads+ is just [4]", () => {
    const source = copy();
    dig(source, "tiers", "pair")["match"] = { counts: [1] };
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "tiers.pair.match.counts[0]").message)
      .toContain("a MINIMUM");
  });
});

// ──────────────────────────────────────────────────────────── 8 · the sets ──

describe("a set", () => {
  it("lists entries that exist", () => {
    const source = copy();
    dig(source, "sets", "found")["entries"] = ["jokers.whetstone"];
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "sets.found.entries[0]").message)
      .toContain("not an entry of this manifest");
  });

  it("does not nest", () => {
    const source = copy();
    dig(source, "sets", "found")["entries"] = ["sets.found"];
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "sets.found.entries[0]").message)
      .toContain("Sets do not nest");
  });

  it("holds an entry off even when the entry says nothing", () => {
    const manifest = loaded(loadManifest(FIXTURE, copy()));
    expect(manifest.jokers["knife"]?.enabled).toBeUndefined();
    expect(isEnabled(manifest, "jokers.knife")).toBe(false);
    expect(isEnabled(manifest, "dice.bone")).toBe(true);
    expect(isEnabled(manifest, "dice.a-die-that-does-not-exist")).toBe(false);
  });
});

// ──────────────────────────────────────────────────── 9 · junk in, problems out ──

describe("the loader", () => {
  it("never throws", () => {
    for (const junk of [null, 4, "grammar", [], undefined]) {
      expect(loadManifest(FIXTURE, junk).ok).toBe(false);
      expect(applyOverlay(EXEMPLAR, OVERLAY, junk).ok).toBe(false);
    }
  });

  it("reports every problem, not the first", () => {
    const source = copy();
    dig(source, "jokers", "knife")["hook"] = "on_crit";
    dig(source, "jokers", "knife", "effects", 0)["verb"] = "sunder";
    dig(source, "enemies", "hound")["pursuit"] = 2;
    const problems = refused(loadManifest(FIXTURE, source));
    expect(problems.map((problem) => problem.path)).toEqual(
      expect.arrayContaining([
        "jokers.knife.hook",
        "jokers.knife.effects[0].verb",
        "enemies.hound.pursuit",
      ]),
    );
  });

  it("refuses an entry id that cannot be addressed by a path", () => {
    const source = copy();
    dig(source, "dice")["river.stone"] = {
      name: "River Stone",
      faces: ["one", "two", "three", "four", "five", "six"],
      socketable: false,
    };
    expect(pointedAt(refused(loadManifest(FIXTURE, source)), "dice.river.stone").message).toContain(
      "carries a . [ or ]",
    );
  });
});
