// H007 · the save envelope: a version, and a SHAPE.
//
// The promise under test is not "a save round-trips" — H001 proved that. It is
// that a save which is NOT a state cannot get past `load` and into the engine.
// The sharpest case is the RNG: `run.rng` is two numbers, and a run is
// `seed + death count + inputs, exactly` (.llm/rules/engine.md), so a save whose
// seed is a string or whose draw count is negative is not a slightly-wrong
// picture — it is a run that no replay can reproduce, and it fails far away
// from here, inside rng.ts, at the first draw.
//
// Two of these describes are GENERIC over the state rather than a list of
// hand-picked fields: they walk a populated save, remove or poison each named
// field in turn, and require a null for every one. That is what keeps the audit
// honest as D001 adds fields — a new field with no guard behind it is caught by
// a test nobody has to remember to write.

import { describe, expect, it } from "vitest";
import { newRun } from "./api";
import { STREAM, fork, next } from "./rng";
import { OLDEST_READABLE, SAVE_VERSION, load, save } from "./save";
import type { ContentBundle, GameState } from "./types";

const BUNDLE: ContentBundle = { version: 1, start: "room:test-start" };

/**
 * A save with something in every container.
 *
 * A fresh run is mostly empty lists, and an empty list hides an audit that
 * never runs: `listOf(isItem)` passes over `[]` whatever `isItem` does. So the
 * fixture carries a loose item, a worn one, a small one, a die, a skill, a
 * journal line, knowledge, a landmark, a grant and a refusal — every shape the
 * audit tables name, at least once.
 */
function populated(): GameState {
  const fresh = newRun(42, BUNDLE);
  return {
    ...fresh,
    deaths: 3,
    campaign: {
      ...fresh.campaign,
      dice: [{ id: "die:hollow" }],
      signature: { id: "die:hollow" },
      stash: [{ id: "item:rope", keep: "none" }],
      knowledge: ["knowledge:the-book"],
      journal: ["You put the stone back where it was."],
      refused: [{ intent: { object: "book", action: "read" }, depth: 1 }],
      landmarks: ["landmark:the-well"],
      grants: ["grant:steady-hands"],
    },
    run: {
      ...fresh.run,
      rng: { seed: 1234, draws: 7 },
      descent: { seed: 777, draws: 4 },
      depth: 2,
      roomId: "room:cistern",
      vitals: {
        hp: { current: 4, max: 6 },
        might: { current: 2, max: 3 },
        will: { current: 1, max: 3 },
        sanity: { current: 5, max: 6 },
      },
      tithes: 11,
      pouch: {
        consumables: [{ id: "item:candle", keep: "none" }],
        equipment: [{ id: "item:knife", keep: "kept" }, null, null, null],
        small: [{ id: "item:key", keep: "key" }, null],
      },
      skills: [{ id: "skill:steady", uses: { current: 1, max: 2 } }],
      flags: ["flag:door-opened"],
    },
  };
}

/** JSON, so a mutation helper cannot reach the fixture the test still holds. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type Path = readonly (string | number)[];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Every NAMED field in the save, as a path — recursing through lists but not
 * offering a list INDEX as a path of its own. "Every field GameState declares
 * is audited" is the claim; how many items a list holds is a different one
 * (and the tuple arities are asserted by name below).
 */
function fields(value: unknown, at: Path = []): Path[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => fields(item, [...at, i]));
  if (isPlainObject(value)) {
    return Object.keys(value).flatMap((key) => [[...at, key], ...fields(value[key], [...at, key])]);
  }
  return [];
}

/** The container `path` names its last step in, inside a fresh clone. */
function reach(root: unknown, path: Path): Record<string | number, unknown> {
  let here = root as Record<string | number, unknown>;
  for (const step of path.slice(0, -1)) here = here[step] as Record<string | number, unknown>;
  return here;
}

const last = (path: Path): string | number => path[path.length - 1] as string | number;

/** The save, with one field removed. */
function without(state: GameState, path: Path): unknown {
  const copy = clone<unknown>(state);
  delete reach(copy, path)[last(path)];
  return copy;
}

/** The save, with one field replaced. */
function withValue(state: GameState, path: Path, value: unknown): unknown {
  const copy = clone<unknown>(state);
  reach(copy, path)[last(path)] = value;
  return copy;
}

/** An envelope at the current version, around whatever it is handed. */
const enveloped = (state: unknown, version: number = SAVE_VERSION): string =>
  JSON.stringify({ version, state });

const show = (path: Path): string => path.join(".");

// ──────────────────────────────────────────────────────────────────────────────

describe("H007 · the envelope round-trips", () => {
  it("writes the current version, and reads its own writing back unchanged", () => {
    const state = populated();
    const text = save(state);
    expect((JSON.parse(text) as { version: number }).version).toBe(SAVE_VERSION);
    expect(load(text)).toStrictEqual(state);
  });

  it("round-trips again from the reloaded state, byte for byte", () => {
    const text = save(populated());
    const back = load(text);
    expect(back).not.toBeNull();
    expect(save(back as GameState)).toBe(text);
  });

  it("survives an empty save as well as a full one — a fresh run has no contents", () => {
    const fresh = newRun(42, BUNDLE);
    expect(load(save(fresh))).toStrictEqual(fresh);
  });
});

/**
 * A save as v1 and v2 wrote one: the three containers flat on the run branch,
 * no `descent` stream, and a campaign with no `signature` and no `stash`.
 *
 * Written out rather than derived from `populated()`, because a migration test
 * that builds its input by transforming the current shape proves only that the
 * transform is invertible. This is what is actually on a player's disk.
 */
function legacy(): Record<string, unknown> {
  return {
    seed: 42,
    deaths: 3,
    campaign: {
      branch: "campaign",
      dice: [{ id: "die:hollow" }],
      knowledge: ["knowledge:the-book"],
      journal: ["You put the stone back where it was."],
      refused: [{ intent: { object: "book", action: "read" }, depth: 1 }],
      landmarks: ["landmark:the-well"],
      grants: ["grant:steady-hands"],
    },
    run: {
      branch: "run",
      rng: { seed: 1234, draws: 7 },
      depth: 2,
      roomId: "room:cistern",
      vitals: {
        hp: { current: 4, max: 6 },
        might: { current: 2, max: 3 },
        will: { current: 1, max: 3 },
        sanity: { current: 5, max: 6 },
      },
      tithes: 11,
      consumables: [{ id: "item:candle", keep: "none" }],
      equipment: [{ id: "item:knife", keep: "kept" }, null, null, null],
      small: [{ id: "item:key", keep: "key" }, null],
      skills: [{ id: "skill:steady", uses: { current: 1, max: 2 } }],
      flags: ["flag:door-opened"],
    },
  };
}

describe("H007 · the version chain", () => {
  it("carries an older save forward instead of stranding it", () => {
    expect(OLDEST_READABLE).toBe(1);
    for (const version of [1, 2]) {
      const back = load(enveloped(legacy(), version));
      expect(back, `v${version}`).not.toBeNull();
      expect(back?.seed).toBe(42);
      expect(back?.deaths).toBe(3);
    }
  });

  it("gathers the old flat containers into the pouch, losing nothing", () => {
    // D001 re-shaped what a run holds; it did not change what it holds. Every
    // thing in the old save is in the new one, in the container it was in.
    const back = load(enveloped(legacy(), 2));
    expect(back?.run.pouch).toStrictEqual({
      consumables: [{ id: "item:candle", keep: "none" }],
      equipment: [{ id: "item:knife", keep: "kept" }, null, null, null],
      small: [{ id: "item:key", keep: "key" }, null],
    });
    // And it does not carry both spellings of what it holds.
    const raw = back as unknown as Record<string, Record<string, unknown>>;
    for (const gone of ["consumables", "equipment", "small"]) {
      expect(Object.keys(raw["run"] as object), gone).not.toContain(gone);
    }
  });

  it("mints the Descent's stream a migrated save never had — derived, not invented", () => {
    // It must be the value `freshRun` would have minted from the same seed
    // (api.ts), and it must be at draw 0: a v2 save cannot have drawn a door,
    // because D002 did not exist when it was written.
    const back = load(enveloped(legacy(), 2));
    expect(back?.run.descent).toStrictEqual(fork({ seed: 1234, draws: 7 }, STREAM.descent));
    expect(back?.run.descent.draws).toBe(0);
    // Derived from the SEED and never the parent's position, so it does not
    // matter that the old save was mid-push (rng.ts `fork`).
    expect(back?.run.descent.seed).not.toBe(1234);
  });

  it("opens the campaign's new fields empty rather than guessing them", () => {
    // Nothing in a v2 save records which die was yours or what you had stashed.
    // A guess would silently pick a player's class for them, or mint items.
    const back = load(enveloped(legacy(), 2));
    expect(back?.campaign.signature).toBeNull();
    expect(back?.campaign.stash).toStrictEqual([]);
    // And it keeps every campaign field that WAS written down.
    expect(back?.campaign.dice).toStrictEqual([{ id: "die:hollow" }]);
    expect(back?.campaign.knowledge).toStrictEqual(["knowledge:the-book"]);
    expect(back?.campaign.refused).toHaveLength(1);
  });

  it("re-saves a migrated save at the current version", () => {
    const back = load(enveloped(legacy(), 1));
    expect(back).not.toBeNull();
    const rewritten = save(back as GameState);
    expect((JSON.parse(rewritten) as { version: number }).version).toBe(SAVE_VERSION);
    expect(load(rewritten)).toStrictEqual(back);
  });

  it("audits a migrated save too — an old save is not a trusted one", () => {
    const poisoned = { ...legacy(), run: { ...(legacy()["run"] as object), rng: { seed: "42" } } };
    expect(load(enveloped(poisoned, 1))).toBeNull();
    expect(load(enveloped(poisoned, 2))).toBeNull();
  });

  it("refuses to carry forward a run with no stream to fork from", () => {
    // `descent` derives from `rng`, and a stream derived from poison is a
    // plausible number with no run behind it.
    for (const rng of [undefined, null, {}, { seed: 1.5, draws: 0 }, { seed: 1, draws: -1 }]) {
      const broken = { ...legacy(), run: { ...(legacy()["run"] as object), rng } };
      expect(load(enveloped(broken, 2)), JSON.stringify(rng)).toBeNull();
    }
  });

  it("refuses a legacy save at the CURRENT version — the version is a claim", () => {
    // A v2-shaped state wearing `version: 3` is not migrated, because it says
    // it needs no migration. It is simply not a v3 state, and it is refused.
    expect(load(enveloped(legacy(), SAVE_VERSION))).toBeNull();
  });

  it("refuses a version outside the chain, older or newer, and does not throw", () => {
    const state = populated();
    for (const version of [0, -1, SAVE_VERSION + 1, SAVE_VERSION + 99]) {
      const text = enveloped(state, version);
      expect(() => load(text), `v${version}`).not.toThrow();
      expect(load(text), `v${version}`).toBeNull();
    }
  });

  it("refuses a version that is not a number at all", () => {
    const state = populated();
    for (const version of [undefined, null, "1", "2", 1.5, NaN, Infinity, {}, []]) {
      const text = JSON.stringify({ version, state });
      expect(load(text), JSON.stringify(version)).toBeNull();
    }
  });
});

describe("H007 · the RNG is the poison this card exists to catch", () => {
  const seeded = (rng: unknown): string => enveloped(withValue(populated(), ["run", "rng"], rng));

  it("refuses a save with no rng on the run branch", () => {
    expect(load(enveloped(without(populated(), ["run", "rng"])))).toBeNull();
    expect(load(seeded(null))).toBeNull();
    expect(load(seeded(undefined))).toBeNull();
  });

  it("refuses a seed that is not a whole number JS can hold exactly", () => {
    for (const seed of ["42", null, 1.5, NaN, Infinity, -Infinity, 2 ** 53, 1e308]) {
      expect(load(seeded({ seed, draws: 0 })), String(seed)).toBeNull();
    }
  });

  it("refuses a draw count that is not a whole number, or that runs backwards", () => {
    // Draws advance and never rewind — no takebacks (.llm/rules/engine.md).
    for (const draws of ["7", null, -1, -0.5, 2.5, NaN, Infinity, 2 ** 53]) {
      expect(load(seeded({ seed: 1234, draws })), String(draws)).toBeNull();
    }
  });

  it("accepts the stream shapes that are real, including a fresh one", () => {
    for (const rng of [
      { seed: 0, draws: 0 },
      { seed: -7, draws: 0 },
      { seed: 4294967295, draws: 900 },
    ]) {
      expect(load(seeded(rng))?.run.rng, JSON.stringify(rng)).toStrictEqual(rng);
    }
  });

  it("never hands the engine a stream that cannot draw", () => {
    // The whole point, stated as the engine would meet it: whatever `load`
    // returns, the first draw off it is a real 32-bit word and the successor
    // is a real position — not NaN, not undefined, not a throw.
    const candidates = [
      { seed: 1234, draws: 7 },
      { seed: "42", draws: 0 },
      { seed: 1.5, draws: 0 },
      { seed: NaN, draws: 0 },
      { seed: 1, draws: -1 },
      { seed: 1, draws: NaN },
      undefined,
      null,
      {},
    ];
    for (const rng of candidates) {
      const back = load(seeded(rng));
      if (back === null) continue;
      const [word, after] = next(back.run.rng);
      expect(Number.isInteger(word), JSON.stringify(rng)).toBe(true);
      expect(word >= 0 && word < 2 ** 32, JSON.stringify(rng)).toBe(true);
      expect(Number.isSafeInteger(after.draws), JSON.stringify(rng)).toBe(true);
    }
    // And exactly one of those nine was a stream: the rest were refused.
    expect(candidates.filter((rng) => load(seeded(rng)) !== null)).toHaveLength(1);
  });
});

describe("H007 · every field the state declares is audited", () => {
  // Generic on purpose. These two tests read the shape off a real save rather
  // than off a list someone maintains, so a field D001 adds to either branch
  // arrives here already covered — and a field added with no guard behind it
  // fails immediately, by name.

  it("refuses a save with any one named field missing", () => {
    const state = populated();
    const paths = fields(state);
    expect(paths.length).toBeGreaterThan(30);
    for (const path of paths) {
      expect(load(enveloped(without(state, path))), show(path)).toBeNull();
    }
  });

  it("refuses a save with any one number replaced by something that is not one", () => {
    const state = populated();
    const numbers = fields(state).filter(
      (path) => typeof reach(state, path)[last(path)] === "number",
    );
    expect(numbers.length).toBeGreaterThan(10);
    for (const path of numbers) {
      for (const junk of [NaN, Infinity, 1.5, "1", null, {}]) {
        expect(load(enveloped(withValue(state, path, junk))), `${show(path)} = ${junk}`).toBeNull();
      }
    }
  });

  it("refuses a save with any one string replaced by something that is not one", () => {
    // `run.roomId` is the one field where null is a VALUE and not an absence:
    // "null before the first room is drawn" (types.ts `RunBranch.roomId`). So
    // null is not junk there, and asserting otherwise would be asking the audit
    // to refuse every save made at the Crossing before the first draw.
    const nullable = new Set(["run.roomId"]);
    const state = populated();
    const strings = fields(state).filter(
      (path) => typeof reach(state, path)[last(path)] === "string",
    );
    expect(strings.length).toBeGreaterThan(10);
    for (const path of strings) {
      const junks = nullable.has(show(path)) ? [1, {}, []] : [1, null, {}, []];
      for (const junk of junks) {
        expect(load(enveloped(withValue(state, path, junk))), show(path)).toBeNull();
      }
    }
  });

  it("refuses a count that runs backwards, wherever one is declared", () => {
    const state = populated();
    for (const path of [["deaths"], ["run", "depth"], ["run", "rng", "draws"]] as const) {
      expect(load(enveloped(withValue(state, path, -1))), show(path)).toBeNull();
    }
  });
});

describe("H007 · the two branches stay the branches they claim to be", () => {
  it("refuses a campaign wearing the run's name, and the reverse", () => {
    const state = populated();
    expect(load(enveloped(withValue(state, ["campaign", "branch"], "run")))).toBeNull();
    expect(load(enveloped(withValue(state, ["run", "branch"], "campaign")))).toBeNull();
  });

  it("refuses a save missing a branch entirely", () => {
    const state = populated();
    expect(load(enveloped(without(state, ["campaign"])))).toBeNull();
    expect(load(enveloped(without(state, ["run"])))).toBeNull();
  });

  it("refuses a list that is not a list", () => {
    const state = populated();
    for (const path of [["run", "flags"], ["campaign", "journal"], ["campaign", "dice"]] as const) {
      for (const junk of ["", {}, null, 0]) {
        expect(load(enveloped(withValue(state, path, junk))), show(path)).toBeNull();
      }
    }
  });
});

describe("H007 · the pouch keeps its shape", () => {
  it("holds the arity of both slot tuples", () => {
    // An empty slot is null, not a hole: the pouch's shape never changes
    // (types.ts `Slot`), so a save cannot arrive with three equipment slots.
    const state = populated();
    const worn = { id: "item:knife", keep: "kept" };
    for (const equipment of [[], [null], [null, null, null], [null, null, null, null, null]]) {
      expect(load(enveloped(withValue(state, ["run", "pouch", "equipment"], equipment)))).toBeNull();
    }
    for (const small of [[], [null], [null, null, null]]) {
      expect(load(enveloped(withValue(state, ["run", "pouch", "small"], small)))).toBeNull();
    }
    expect(load(enveloped(withValue(state, ["run", "pouch", "equipment"], [worn, null, null, null])))).not.toBeNull();
  });

  it("refuses a slot that is neither an item nor empty", () => {
    const state = populated();
    for (const slot of ["item:knife", 0, {}, { id: "item:knife" }, { id: 1, keep: "kept" }]) {
      expect(load(enveloped(withValue(state, ["run", "pouch", "equipment"], [slot, null, null, null])))).toBeNull();
    }
  });

  it("refuses a keep value death does not know what to do with", () => {
    const state = populated();
    for (const keep of ["KEPT", "keep", "", null, 1]) {
      const item = { id: "item:candle", keep };
      expect(load(enveloped(withValue(state, ["run", "pouch", "consumables"], [item]))), String(keep)).toBeNull();
    }
    for (const keep of ["none", "kept", "key"]) {
      const item = { id: "item:candle", keep };
      expect(load(enveloped(withValue(state, ["run", "pouch", "consumables"], [item]))), String(keep)).not.toBeNull();
    }
  });
});

describe("H007 · load never throws, on anything", () => {
  it("answers null to text that is not a save, and raises nothing", () => {
    const junk = [
      "",
      " ",
      "{not json",
      "null",
      "undefined",
      "[]",
      "[1,2,3]",
      '"a string"',
      "17",
      "true",
      "{}",
      JSON.stringify({ version: SAVE_VERSION }),
      JSON.stringify({ version: SAVE_VERSION, state: null }),
      JSON.stringify({ version: SAVE_VERSION, state: "a state" }),
      JSON.stringify({ version: SAVE_VERSION, state: [] }),
      JSON.stringify({ version: SAVE_VERSION, state: { seed: 1, deaths: 0 } }),
      JSON.stringify({ state: populated() }),
      JSON.stringify(populated()),
      // A prototype-shaped key, in case anything ever indexes without a guard.
      JSON.stringify({ version: SAVE_VERSION, state: { __proto__: { seed: 1 } } }),
    ];
    for (const text of junk) {
      expect(() => load(text), text).not.toThrow();
      expect(load(text), text).toBeNull();
    }
  });

  it("does not choke on a deeply nested save", () => {
    let nested: unknown = 1;
    for (let i = 0; i < 500; i++) nested = { nested };
    const text = enveloped(withValue(populated(), ["run", "roomId"], nested));
    expect(() => load(text)).not.toThrow();
    expect(load(text)).toBeNull();
  });
});

describe("H007 · what the audit deliberately does not do", () => {
  it("does not read balance — a bar past its max is a save, not a corruption", () => {
    // Nothing is clamped in this engine (resolve.ts: "the delta arrived
    // first"); floors and the death predicate are H205's and D003's. An audit
    // that refused this would make a balance bug unrecoverable rather than
    // visible.
    const state = populated();
    for (const hp of [{ current: 99, max: 6 }, { current: -4, max: 6 }, { current: 0, max: 0 }]) {
      expect(load(enveloped(withValue(state, ["run", "vitals", "hp"], hp)))).not.toBeNull();
    }
    expect(load(enveloped(withValue(state, ["run", "tithes"], -5)))).not.toBeNull();
  });

  it("does not read content — whether a room id names a room is the loader's", () => {
    const state = populated();
    const back = load(enveloped(withValue(state, ["run", "roomId"], "room:no-such-room")));
    expect(back?.run.roomId).toBe("room:no-such-room");
    expect(load(enveloped(withValue(state, ["run", "roomId"], null)))).not.toBeNull();
  });

  it("carries an unnamed key through rather than refusing the save", () => {
    // The engine reads by name and the state is readonly to the leaves
    // (types.ts law 1), so a key nothing declares is inert. Refusing it would
    // throw away a save for carrying a field a future version writes.
    const state = populated();
    const back = load(enveloped({ ...state, souvenir: "from another build" }));
    expect(back).not.toBeNull();
    expect(back?.seed).toBe(state.seed);
  });
});
