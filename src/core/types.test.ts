// H001 — co-located unit tests for the contract hub.
//
// This file is inside tsconfig's `include`, so `npm run law` typechecks
// it. That is deliberate: the compile-time claims below (vocabulary
// exhaustiveness, the two-ledger split) are checked by tsc, not by any
// runtime assertion.
import { describe, expect, it } from "vitest";
import {
  addId,
  assertNever,
  hasId,
  removeId,
  sameRef,
  type ActionRef,
  type Bundle,
  type CampaignLedger,
  type Delta,
  type DeltaKind,
  type Effect,
  type EffectKind,
  type GameState,
  type RunLedger,
  type View,
} from "./types";

// ---------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------

const bundle: Bundle = {
  start: "shore",
  scenes: {
    shore: {
      id: "shore",
      enter: "Water, and a shelf of stone above it.",
      line: "The shore. The water does not move.",
      objects: [
        {
          id: "book",
          line: "A book, open, face up on the stone.",
          actions: [
            {
              id: "read",
              responses: [
                {
                  gates: { flags: ["knows_glyph"] },
                  deltas: [
                    { kind: "say", text: "The page names a procession." },
                    { kind: "set", flags: ["read_book"] },
                    { kind: "journal", entry: "procession" },
                  ],
                },
                {
                  deltas: [
                    { kind: "say", text: "A script you don't know." },
                    { kind: "refuse" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

const state: GameState = {
  seed: 42,
  flags: ["knows_glyph"],
  journal: ["procession"],
  refused: [{ scene: "shore", object: "book", action: "read" }],
  scene: "shore",
  items: ["lamp"],
  rng: 1_234_567,
  bundle,
};

/**
 * Every word in VOCAB.md's delta set, one fixture each. `Record` over
 * the union is the exhaustiveness hook: a missing word fails to
 * compile, and a word that is not in the union fails as an excess key.
 */
const everyDelta: Record<DeltaKind, Delta> = {
  say: { kind: "say", text: "Stone, wet to the wrist." },
  set: { kind: "set", flags: ["knows_glyph"] },
  unset: { kind: "unset", flags: ["knows_glyph"] },
  give: { kind: "give", items: ["lamp"] },
  take: { kind: "take", items: ["lamp"] },
  adjust: { kind: "adjust", target: "tithes", amount: -1, clamped: true },
  journal: { kind: "journal", entry: "procession" },
  refuse: { kind: "refuse" },
  goto: { kind: "goto", door: "stair_down" },
  addObject: {
    kind: "addObject",
    scene: "shore",
    object: "ash",
    cause: "the lamp goes out and leaves it",
  },
  removeObject: {
    kind: "removeObject",
    scene: "shore",
    object: "ash",
    cause: "the water takes it",
  },
  prompt: { kind: "prompt", prompt: { id: "hold_breath", will: 2 } },
  fight: { kind: "fight", enemy: "warden" },
  end: { kind: "end", line: "The water closes over.", note: "drowned" },
};

const everyEffect: Record<EffectKind, Effect> = {
  say: { kind: "say", text: "A script you don't know." },
  journal: { kind: "journal", entry: "procession" },
  goto: { kind: "goto", door: "stair_down" },
  prompt: { kind: "prompt", prompt: { id: "hold_breath", will: 2 } },
  fight: { kind: "fight", enemy: "warden" },
  end: { kind: "end", line: "The water closes over.", note: "drowned" },
};

/**
 * The never guard H006 builds on. The `default` branch only compiles
 * while every vocabulary word has a case above it (RULES.md 3).
 */
function deltaWord(delta: Delta): DeltaKind {
  switch (delta.kind) {
    case "say":
      return "say";
    case "set":
      return "set";
    case "unset":
      return "unset";
    case "give":
      return "give";
    case "take":
      return "take";
    case "adjust":
      return "adjust";
    case "journal":
      return "journal";
    case "refuse":
      return "refuse";
    case "goto":
      return "goto";
    case "addObject":
      return "addObject";
    case "removeObject":
      return "removeObject";
    case "prompt":
      return "prompt";
    case "fight":
      return "fight";
    case "end":
      return "end";
    default:
      return assertNever(delta);
  }
}

// ---------------------------------------------------------------------
// the two ledgers, checked by the compiler (RULES.md 9)
// ---------------------------------------------------------------------

type Excludes<T, K extends string> = K extends keyof T ? false : true;

/** Death code takes the run branch, and so cannot reach campaign flags. */
const runBranchHasNoFlags: Excludes<RunLedger, "flags"> = true;
const runBranchHasNoJournal: Excludes<RunLedger, "journal"> = true;
const campaignBranchHasNoItems: Excludes<CampaignLedger, "items"> = true;

const asRun: RunLedger = state;
const asCampaign: CampaignLedger = state;

// ---------------------------------------------------------------------
// tests
// ---------------------------------------------------------------------

describe("types · the vocabulary is closed and exhaustive", () => {
  it("carries one variant per VOCAB.md delta word, in VOCAB.md order", () => {
    expect(Object.keys(everyDelta)).toEqual([
      "say",
      "set",
      "unset",
      "give",
      "take",
      "adjust",
      "journal",
      "refuse",
      "goto",
      "addObject",
      "removeObject",
      "prompt",
      "fight",
      "end",
    ]);
  });

  it("routes every word through a never-guarded switch", () => {
    for (const [word, delta] of Object.entries(everyDelta)) {
      expect(deltaWord(delta)).toBe(word);
    }
  });

  it("assertNever throws when a word slips past the switch", () => {
    const smuggled = { kind: "lies" } as unknown as Delta;
    expect(() => deltaWord(smuggled)).toThrow(/unreachable/);
  });

  it("says at minimum, and every effect kind is a VOCAB word", () => {
    expect(everyEffect.say.kind).toBe("say");
    expect(Object.keys(everyEffect).every((k) => k in everyDelta)).toBe(true);
  });
});

describe("types · two ledgers, one state (RULES.md 9)", () => {
  it("splits the branches in the type system", () => {
    expect(runBranchHasNoFlags).toBe(true);
    expect(runBranchHasNoJournal).toBe(true);
    expect(campaignBranchHasNoItems).toBe(true);
  });

  it("composes both branches flat onto GameState", () => {
    expect(asRun.items).toEqual(["lamp"]);
    expect(asCampaign.flags).toEqual(["knows_glyph"]);
  });
});

describe("types · GameState is JSON, all the way down (RULES.md 2)", () => {
  it("round-trips deep-equal and byte-identical", () => {
    const parsed: GameState = JSON.parse(JSON.stringify(state));
    expect(parsed).toEqual(state);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(state));
  });

  it("holds flags as a list, never a Set", () => {
    expect(Array.isArray(state.flags)).toBe(true);
    expect(JSON.parse(JSON.stringify(state.flags))).toEqual(["knows_glyph"]);
  });
});

describe("types · tiny pure helpers", () => {
  const rows: {
    name: string;
    given: readonly string[];
    when: (set: readonly string[]) => readonly string[] | boolean;
    then: readonly string[] | boolean;
  }[] = [
    {
      name: "hasId finds a member",
      given: ["knows_glyph"],
      when: (s) => hasId(s, "knows_glyph"),
      then: true,
    },
    {
      name: "hasId misses a stranger",
      given: ["knows_glyph"],
      when: (s) => hasId(s, "read_book"),
      then: false,
    },
    {
      name: "addId appends a new member",
      given: ["knows_glyph"],
      when: (s) => addId(s, "read_book"),
      then: ["knows_glyph", "read_book"],
    },
    {
      name: "addId keeps set semantics",
      given: ["knows_glyph"],
      when: (s) => addId(s, "knows_glyph"),
      then: ["knows_glyph"],
    },
    {
      name: "removeId drops a member",
      given: ["knows_glyph", "read_book"],
      when: (s) => removeId(s, "knows_glyph"),
      then: ["read_book"],
    },
    {
      name: "removeId on a stranger is a no-op",
      given: ["knows_glyph"],
      when: (s) => removeId(s, "read_book"),
      then: ["knows_glyph"],
    },
  ];

  for (const row of rows) {
    it(row.name, () => {
      expect(row.when(row.given)).toEqual(row.then);
    });
  }

  it("never mutates its argument and never returns it", () => {
    const before: readonly string[] = ["knows_glyph"];
    const added = addId(before, "read_book");
    const removed = removeId(before, "knows_glyph");
    const same = addId(before, "knows_glyph");
    expect(before).toEqual(["knows_glyph"]);
    expect(added).not.toBe(before);
    expect(removed).not.toBe(before);
    expect(same).not.toBe(before);
  });

  it("sameRef compares object and action", () => {
    const ref: ActionRef = { object: "book", action: "read" };
    expect(sameRef(ref, { object: "book", action: "read" })).toBe(true);
    expect(sameRef(ref, { object: "book", action: "take" })).toBe(false);
    expect(sameRef(ref, { object: "stone", action: "read" })).toBe(false);
  });
});

describe("types · the View the shell draws", () => {
  it("carries enter, line, scene, and objects with their action ids", () => {
    const view: View = {
      enter: "Water, and a shelf of stone above it.",
      line: "The shore. The water does not move.",
      scene: "shore",
      objects: [{ id: "book", actions: ["read"] }],
    };
    const gateless: View = {
      line: "The shore. The water does not move.",
      scene: "shore",
      objects: [],
    };
    expect(view.objects[0]?.actions).toEqual(["read"]);
    expect(gateless.enter).toBeUndefined();
  });
});
