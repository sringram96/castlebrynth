/// <reference types="vite/client" />
// The foe card, and the door it comes through.
//
// Three things are asserted, and they are the three the file exists for: the
// key set is CLOSED and says so by name and by key path, the numbers are read
// rather than trusted, and the join with grammar.yaml puts `pursuit` in exactly
// one place. Everything else about an enemy — how a fight runs, what an intent
// costs — is turn.ts's and is asserted there.

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import tallowThingSource from "../../content/foes/tallow-thing.yaml?raw";
import { formatProblem } from "../core/cards";
import { compileFoe, compileFoes, foeOf, loadFoe, FOE_KEYS } from "./foes";
import { loadManifest } from "./manifest";
import type { Manifest } from "./manifest";
import { openFight } from "./turn";

const manifest = ((): Manifest => {
  const result = loadManifest("grammar.yaml", parse(grammarSource));
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.manifest;
})();

const good = { id: "tallow-thing", hp: 72, intents: [5, 3, 8] };

/** The problems one card produced, as `path — message` pairs. */
const problems = (source: unknown, file = "content/foes/x.yaml") => {
  const result = loadFoe(file, source);
  return result.ok ? [] : result.problems;
};

const paths = (source: unknown) => problems(source).map((p) => p.path);

describe("the foe card · the language is closed", () => {
  it("reads a whole card", () => {
    const result = loadFoe("content/foes/x.yaml", good);
    expect(result.ok && result.card).toEqual(good);
  });

  it("names an unknown key, at its own path, with the whole vocabulary", () => {
    const found = problems({ ...good, armour: 2 });
    expect(found.map((p) => p.path)).toEqual(["armour"]);
    expect(found[0]?.message).toContain('unknown foe key "armour"');
    for (const key of FOE_KEYS) expect(found[0]?.message).toContain(key);
  });

  it("refuses `pursuit` here, because grammar.yaml already owns it", () => {
    // Not an oversight and not a synonym: two files declaring one chance is two
    // answers to "how hard does it follow you" (DESIGN §the lots).
    const found = problems({ ...good, pursuit: 0.3 });
    expect(found.map((p) => p.path)).toEqual(["pursuit"]);
    expect(found[0]?.message).toContain("grammar.yaml");
  });

  it("reports every problem, not just the first", () => {
    expect(paths({ id: "", hp: 0, intents: [] }).sort()).toEqual(["hp", "id", "intents"]);
  });

  it("is not a card at all", () => {
    expect(paths("a body")).toEqual([""]);
    expect(paths([good])).toEqual([""]);
  });
});

describe("the foe card · the numbers are read", () => {
  it("wants a whole hp of one or more", () => {
    expect(paths({ ...good, hp: 0 })).toEqual(["hp"]);
    expect(paths({ ...good, hp: -3 })).toEqual(["hp"]);
    expect(paths({ ...good, hp: 7.5 })).toEqual(["hp"]);
    expect(paths({ ...good, hp: "72" })).toEqual(["hp"]);
  });

  it("wants at least one intent, and every one of them whole and not negative", () => {
    expect(paths({ ...good, intents: [] })).toEqual(["intents"]);
    expect(paths({ ...good, intents: 5 })).toEqual(["intents"]);
    expect(paths({ ...good, intents: [5, -1] })).toEqual(["intents[1]"]);
    expect(paths({ ...good, intents: [5, 2.5] })).toEqual(["intents[1]"]);
    // Zero is a real intent: a turn where nothing lands is a turn a fight can
    // have, and it is not the same as no intent at all.
    expect(paths({ ...good, intents: [0] })).toEqual([]);
  });
});

describe("the foe card · a set of files", () => {
  it("compiles the shipped card off its own text", () => {
    const result = compileFoe("content/foes/tallow-thing.yaml", tallowThingSource);
    expect(result.ok && result.card.id).toBe("tallow-thing");
  });

  it("refuses two files answering to one id, and names the first", () => {
    const twice = compileFoes([
      { file: "content/foes/a.yaml", text: tallowThingSource },
      { file: "content/foes/b.yaml", text: tallowThingSource },
    ]);
    expect(twice.ok).toBe(false);
    expect(!twice.ok && twice.problems[0]?.file).toBe("content/foes/b.yaml");
    expect(!twice.ok && twice.problems[0]?.message).toContain("content/foes/a.yaml");
  });

  it("keys its output in sorted id order, whatever order it was handed", () => {
    const other = tallowThingSource.replace("id: tallow-thing", "id: a-thing");
    const forward = compileFoes([
      { file: "content/foes/tallow-thing.yaml", text: tallowThingSource },
      { file: "content/foes/a-thing.yaml", text: other },
    ]);
    expect(forward.ok && Object.keys(forward.foes)).toEqual(["a-thing", "tallow-thing"]);
  });

  it("passes a file-level problem through in the file's own words", () => {
    const doubled = tallowThingSource.replace("hp: 72", "hp: 72\nhp: 9");
    const result = compileFoe("content/foes/x.yaml", doubled);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problems[0]?.message).toContain("DUPLICATE_KEY");
  });
});

describe("the foe card · joined to the grammar", () => {
  it("takes its pursuit chance from grammar.yaml and nowhere else", () => {
    const foe = foeOf(manifest, good);
    expect(foe).toEqual({
      id: "tallow-thing",
      hp: 72,
      intents: [5, 3, 8],
      pursuit: manifest.enemies["tallow-thing"]?.pursuit,
    });
  });

  it("answers null for an enemy the grammar does not declare — never a throw", () => {
    // Nothing fails at play: a room that says `fight:` at an unknown enemy is
    // refused by the content lint, at LOAD, before anybody is standing in it.
    expect(foeOf(manifest, { ...good, id: "no-such-thing" })).toBeNull();
  });

  it("is a foe the turn loop takes as it stands", () => {
    const foe = foeOf(manifest, good);
    const hand = ["bone", "bone", "bone", "bone", "bone", "bone"];
    const fight = openFight(manifest, { seed: 1, draws: 0 }, foe as never, hand, 20);
    expect(fight.foeHp).toBe(72);
    expect(fight.intent).toBe(5); // shown before the roll, and it is the first one
  });
});
