// H007 — acceptance. The save envelope, v1.
//
// The scoreboard for one claim (RULES.md 10): a populated GameState
// round-trips deep-equal through `serialize`/`parse`, and `parse` answers
// null — never an exception — to malformed JSON, to a version it does not
// know, and to a state missing a field the contract names.
import { describe, expect, it } from "vitest";
import { parse, serialize } from "../../src/core/save";
import type { Bundle, GameState } from "../../src/core/types";

// ---------------------------------------------------------------------
// fixture — populated, not empty: every field the contract names carries
// something, so a round-trip that quietly drops one is visible.
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
          label: "the book",
          line: "A book, open, face up on the stone.",
          actions: [
            {
              id: "read",
              label: "read it",
              responses: [
                {
                  gates: { flags: ["knows_glyph"], items: ["lamp"] },
                  deltas: [
                    { kind: "say", text: "The page names a procession." },
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
    stair: {
      id: "stair",
      line: "A stair, going down.",
      objects: [],
    },
  },
};

const state: GameState = {
  seed: 42,
  flags: ["knows_glyph", "read_book"],
  journal: ["procession"],
  refused: [{ scene: "shore", object: "book", action: "read" }],
  scene: "shore",
  items: ["lamp"],
  rng: 1_234_567,
  bundle,
};

/** A JSON-shaped copy we are allowed to break, field by field. */
function corrupt(edit: (draft: Record<string, unknown>) => void): string {
  const draft = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  edit(draft);
  return JSON.stringify({ v: 1, state: draft });
}

describe("H007 · the round trip is lossless", () => {
  it("returns a populated GameState deep-equal to the one saved", () => {
    const restored = parse(serialize(state));

    expect(restored).toEqual(state);
    expect(restored).not.toBe(state);
    expect(restored?.bundle).toEqual(bundle);
    expect(restored?.refused).toEqual([
      { scene: "shore", object: "book", action: "read" },
    ]);
  });

  it("is byte-stable — saving what it restored writes the same string", () => {
    const once = serialize(state);
    const restored = parse(once);

    expect(restored).not.toBeNull();
    expect(serialize(restored as GameState)).toBe(once);
  });

  it("writes a {v:1, state} envelope and nothing else", () => {
    const envelope = JSON.parse(serialize(state)) as Record<string, unknown>;

    expect(Object.keys(envelope).sort()).toEqual(["state", "v"]);
    expect(envelope.v).toBe(1);
    expect(envelope.state).toEqual(state);
  });
});

describe("H007 · parse returns null, never throws", () => {
  const malformed: readonly (readonly [string, string])[] = [
    ["empty string", ""],
    ["whitespace", "   "],
    ["a bare word", "not json at all"],
    ["a truncated object", '{"v":1,"state":{'],
    ["a trailing comma", '{"v":1,"state":{},}'],
    ["single quotes", "{'v':1}"],
    ["JSON that is not an object", '"a string"'],
    ["JSON null", "null"],
    ["an array envelope", "[1,2,3]"],
  ];

  const wrongVersion: readonly (readonly [string, string])[] = [
    ["no version at all", JSON.stringify({ state })],
    ["version 0", JSON.stringify({ v: 0, state })],
    ["a version from the future", JSON.stringify({ v: 2, state })],
    ["the version as a string", JSON.stringify({ v: "1", state })],
    ["a null version", JSON.stringify({ v: null, state })],
  ];

  const missingField: readonly (readonly [string, string])[] = (
    ["seed", "flags", "journal", "refused", "scene", "items", "rng", "bundle"] as const
  ).map((field) => [
    `no ${field}`,
    corrupt((draft) => {
      delete draft[field];
    }),
  ]);

  const wrongTypes: readonly (readonly [string, string])[] = [
    [
      "flags as a stringified Set",
      corrupt((draft) => {
        draft.flags = {};
      }),
    ],
    [
      "rng gone to null",
      corrupt((draft) => {
        draft.rng = null;
      }),
    ],
    [
      "a refusal missing its scene",
      corrupt((draft) => {
        draft.refused = [{ object: "book", action: "read" }];
      }),
    ],
    [
      "a bundle that is not content",
      corrupt((draft) => {
        draft.bundle = "shore";
      }),
    ],
    [
      "no state on the envelope",
      JSON.stringify({ v: 1 }),
    ],
  ];

  const rows: readonly (readonly [string, readonly (readonly [string, string])[]])[] =
    [
      ["malformed JSON", malformed],
      ["wrong version", wrongVersion],
      ["missing fields", missingField],
      ["a field of the wrong type", wrongTypes],
    ];

  for (const [group, cases] of rows) {
    for (const [name, raw] of cases) {
      it(`${group}: ${name} → null`, () => {
        expect(() => parse(raw)).not.toThrow();
        expect(parse(raw)).toBeNull();
      });
    }
  }

  it("leaves a good save good — the failures above are not a blanket no", () => {
    expect(parse(serialize(state))).toEqual(state);
  });
});
