// H004 — the loader, unit. Pure: no disk, no compiler, no shore.
// Bundles here are written by hand so each row can be exactly one
// thing wrong. The compiler's end of the funnel is proved in
// tests/acceptance/H004.compiler.test.ts, against real content.
import { describe, expect, it } from "vitest";
import {
  BUNDLE_DELTA_KINDS,
  BUNDLE_GATE_KEYS,
  loadBundle,
  sceneOf,
  validateBundle,
} from "./bundle";
import { CARD_DELTA_KEYS, RESERVED_WORDS } from "./cards";
import type { Bundle, Delta } from "./types";

// ---------------------------------------------------------------------
// a bundle, minimally: one scene, one object, one action, one response
// ---------------------------------------------------------------------

function bundleOf(deltas: readonly unknown[], gates?: unknown): unknown {
  return {
    start: "shore",
    scenes: {
      shore: {
        id: "shore",
        line: "The shore. The water does not move.",
        objects: [
          {
            id: "book",
            line: "A book, face up on the stone.",
            actions: [
              {
                id: "read",
                responses: [
                  gates === undefined ? { deltas } : { gates, deltas },
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

const SAY = { kind: "say", text: "The ink swims." };

/** Where a single delta sits in the bundle above. */
const DELTA_0 = "scenes.shore.objects[0].actions[0].responses[0].deltas[0]";
const DELTA_1 = "scenes.shore.objects[0].actions[0].responses[0].deltas[1]";
const GATES = "scenes.shore.objects[0].actions[0].responses[0].gates";

/** One of every VOCAB.md word, in VOCAB.md order. */
const EVERY_DELTA: readonly Delta[] = [
  { kind: "say", text: "The ink swims." },
  { kind: "set", flags: ["knows_glyph"] },
  { kind: "unset", flags: ["knows_glyph"] },
  { kind: "give", items: ["obol"] },
  { kind: "take", items: ["obol"] },
  { kind: "adjust", target: "tithes", amount: -1, clamped: true },
  { kind: "journal", entry: "procession" },
  { kind: "refuse" },
  { kind: "goto", door: "down" },
  { kind: "addObject", scene: "shore", object: "cairn", cause: "the water gives it up" },
  { kind: "removeObject", scene: "shore", object: "cairn", cause: "the water takes it" },
  { kind: "prompt", prompt: { hold: 3 } },
  { kind: "fight", enemy: "warden" },
  { kind: "end", line: "The water closes.", note: "drowned" },
];

// ---------------------------------------------------------------------

describe("H004 · the loader speaks exactly VOCAB.md", () => {
  it("checks every delta word the engine has, in VOCAB.md order", () => {
    expect(BUNDLE_DELTA_KINDS).toEqual([...CARD_DELTA_KEYS]);
  });

  it("gates on flags and items, and nothing else", () => {
    expect(BUNDLE_GATE_KEYS).toEqual(["flags", "items"]);
  });

  it("loads one of every word without complaint", () => {
    expect(validateBundle(bundleOf(EVERY_DELTA))).toBeNull();
    expect(EVERY_DELTA.map((d) => d.kind)).toEqual([...CARD_DELTA_KEYS]);
  });

  it("refuses a word that is not a word, and says where", () => {
    const bad = validateBundle(bundleOf([SAY, { kind: "shout", text: "no" }]));
    expect(bad?.path).toBe(`${DELTA_1}.kind`);
    expect(bad?.detail).toContain("shout");
    expect(bad?.detail).toContain("VOCAB.md");
  });

  it("refuses the reserved words by name", () => {
    for (const word of RESERVED_WORDS) {
      const bad = validateBundle(bundleOf([{ kind: word }]));
      expect(bad?.path, word).toBe(`${DELTA_0}.kind`);
      expect(bad?.detail, word).toContain("reserved");
    }
  });

  it("refuses an unknown gate key", () => {
    const bad = validateBundle(bundleOf([SAY], { depth: 2 }));
    expect(bad?.path).toBe(`${GATES}.depth`);
    expect(bad?.detail).toContain("not a gate key");
  });

  it("takes a gateless response — that one is the fallback", () => {
    expect(validateBundle(bundleOf([SAY]))).toBeNull();
    expect(validateBundle(bundleOf([SAY], { flags: ["knows_glyph"] }))).toBeNull();
    expect(validateBundle(bundleOf([SAY], { items: ["obol"] }))).toBeNull();
  });
});

describe("H004 · a delta must carry what its word carries", () => {
  const rows: readonly {
    readonly name: string;
    readonly given: unknown;
    readonly then: string;
  }[] = [
    { name: "say without text", given: { kind: "say" }, then: `${DELTA_0}.text` },
    { name: "set without flags", given: { kind: "set" }, then: `${DELTA_0}.flags` },
    {
      name: "set with a non-id flag",
      given: { kind: "set", flags: ["ok", 7] },
      then: `${DELTA_0}.flags[1]`,
    },
    { name: "unset without flags", given: { kind: "unset" }, then: `${DELTA_0}.flags` },
    { name: "give without items", given: { kind: "give" }, then: `${DELTA_0}.items` },
    { name: "take without items", given: { kind: "take" }, then: `${DELTA_0}.items` },
    {
      name: "adjust without a target",
      given: { kind: "adjust", amount: 1, clamped: true },
      then: `${DELTA_0}.target`,
    },
    {
      name: "adjust with an unreal amount",
      given: { kind: "adjust", target: "tithes", amount: "one", clamped: true },
      then: `${DELTA_0}.amount`,
    },
    {
      name: "adjust without clamped",
      given: { kind: "adjust", target: "tithes", amount: 1 },
      then: `${DELTA_0}.clamped`,
    },
    {
      name: "journal without an entry",
      given: { kind: "journal" },
      then: `${DELTA_0}.entry`,
    },
    { name: "goto without a door", given: { kind: "goto" }, then: `${DELTA_0}.door` },
    {
      name: "addObject without a cause",
      given: { kind: "addObject", scene: "shore", object: "cairn" },
      then: `${DELTA_0}.cause`,
    },
    {
      name: "removeObject without a cause",
      given: { kind: "removeObject", scene: "shore", object: "cairn" },
      then: `${DELTA_0}.cause`,
    },
    { name: "prompt without a payload", given: { kind: "prompt" }, then: `${DELTA_0}.prompt` },
    { name: "fight without an enemy", given: { kind: "fight" }, then: `${DELTA_0}.enemy` },
    {
      name: "end without a note",
      given: { kind: "end", line: "The water closes." },
      then: `${DELTA_0}.note`,
    },
    { name: "a delta that is not tagged", given: { text: "no" }, then: `${DELTA_0}.kind` },
    { name: "a delta that is not an object", given: "say", then: DELTA_0 },
  ];

  for (const { name, given, then } of rows)
    it(`refuses ${name}, at ${then}`, () => {
      expect(validateBundle(bundleOf([given]))?.path).toBe(then);
    });

  it("asks nothing of refuse — the ledger is the whole of it", () => {
    expect(validateBundle(bundleOf([{ kind: "refuse" }]))).toBeNull();
  });
});

describe("H004 · the bundle around the words", () => {
  const rows: readonly {
    readonly name: string;
    readonly given: unknown;
    readonly then: string;
  }[] = [
    { name: "not an object at all", given: "shore", then: "bundle" },
    { name: "no scenes", given: { start: "shore" }, then: "scenes" },
    {
      name: "a start that is not a scene here",
      given: { start: "crossing", scenes: {} },
      then: "start",
    },
    {
      name: "no start",
      given: { scenes: { shore: { id: "shore", line: "l", objects: [] } } },
      then: "start",
    },
    {
      name: "a scene filed under the wrong id",
      given: { start: "shore", scenes: { shore: { id: "pool", line: "l", objects: [] } } },
      then: "scenes.shore.id",
    },
    {
      name: "a scene without its standing line",
      given: { start: "shore", scenes: { shore: { id: "shore", objects: [] } } },
      then: "scenes.shore.line",
    },
    {
      name: "an object without its free tap",
      given: {
        start: "shore",
        scenes: {
          shore: { id: "shore", line: "l", objects: [{ id: "book", actions: [] }] },
        },
      },
      then: "scenes.shore.objects[0].line",
    },
    {
      name: "an action without responses",
      given: {
        start: "shore",
        scenes: {
          shore: {
            id: "shore",
            line: "l",
            objects: [{ id: "book", line: "t", actions: [{ id: "read" }] }],
          },
        },
      },
      then: "scenes.shore.objects[0].actions[0].responses",
    },
  ];

  for (const { name, given, then } of rows)
    it(`refuses ${name}, at ${then}`, () => {
      expect(validateBundle(given)?.path).toBe(then);
    });

  it("takes an empty scene: no objects is a shape, not a fault", () => {
    const empty = { start: "shore", scenes: { shore: { id: "shore", line: "l", objects: [] } } };
    expect(validateBundle(empty)).toBeNull();
  });
});

describe("H004 · loadBundle", () => {
  it("returns the bundle it was given, whole", () => {
    const source = bundleOf(EVERY_DELTA);
    const bundle = loadBundle(source);
    expect(bundle).toEqual(source);
    expect(bundle.start).toBe("shore");
  });

  it("survives a JSON round-trip unchanged (RULES.md 2)", () => {
    const bundle: Bundle = loadBundle(bundleOf(EVERY_DELTA));
    const again = loadBundle(JSON.parse(JSON.stringify(bundle)));
    expect(again).toEqual(bundle);
    expect(JSON.stringify(again)).toBe(JSON.stringify(bundle));
  });

  it("throws on the first bad word, with the path in the message", () => {
    expect(() => loadBundle(bundleOf([SAY, { kind: "lies", text: "no" }]))).toThrow(
      /deltas\[1\]\.kind/,
    );
    expect(() => loadBundle(bundleOf([SAY, { kind: "lies" }]))).toThrow(/reserved/);
  });

  it("does not throw when only asked (validateBundle)", () => {
    expect(() => validateBundle(bundleOf([{ kind: "shout" }]))).not.toThrow();
  });

  it("hands back a scene by id, and nothing for one it does not hold", () => {
    const bundle = loadBundle(bundleOf([SAY]));
    expect(sceneOf(bundle, "shore")?.id).toBe("shore");
    expect(sceneOf(bundle, "crossing")).toBeUndefined();
    expect(sceneOf(bundle, "toString")).toBeUndefined();
  });
});
