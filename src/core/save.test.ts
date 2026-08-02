// H007 — co-located unit tests for the save envelope.
//
// Inside tsconfig's `include`, so `npm run law` typechecks this file:
// the claim that `parse` hands back something the compiler accepts as a
// GameState is checked by tsc, not only by an assertion.
import { describe, expect, it } from "vitest";
import { SAVE_VERSION, parse, serialize, type SaveEnvelope } from "./save";
import type { Bundle, GameState } from "./types";

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
                  deltas: [{ kind: "say", text: "The page names a procession." }],
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

const populated: GameState = {
  seed: 42,
  flags: ["knows_glyph"],
  journal: ["procession"],
  refused: [{ scene: "shore", object: "book", action: "read" }],
  scene: "shore",
  items: ["lamp"],
  rng: 1_234_567,
  bundle,
};

/** A first frame: the ledgers are empty, but every field is there. */
const fresh: GameState = {
  seed: 7,
  flags: [],
  journal: [],
  refused: [],
  scene: "shore",
  items: [],
  rng: 0,
  bundle,
};

/** A JSON-shaped copy we may break, wrapped as a v1 envelope. */
function envelopeOf(
  state: GameState,
  edit?: (draft: Record<string, unknown>) => void,
): string {
  const draft = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  edit?.(draft);
  return JSON.stringify({ v: SAVE_VERSION, state: draft });
}

// ---------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------

describe("serialize", () => {
  it("wraps the state in the v1 envelope", () => {
    const envelope = JSON.parse(serialize(populated)) as SaveEnvelope;

    expect(envelope.v).toBe(1);
    expect(envelope.v).toBe(SAVE_VERSION);
    expect(envelope.state).toEqual(populated);
  });

  it("is deterministic — same state, same bytes", () => {
    expect(serialize(populated)).toBe(serialize(populated));
    expect(serialize(populated)).not.toBe(serialize(fresh));
  });

  it("never mutates the state it is handed", () => {
    const before = JSON.stringify(populated);
    serialize(populated);
    expect(JSON.stringify(populated)).toBe(before);
  });
});

// ---------------------------------------------------------------------
// parse — the happy path
// ---------------------------------------------------------------------

describe("parse · a save this file wrote", () => {
  const rows: readonly { name: string; given: GameState }[] = [
    { name: "a populated state", given: populated },
    { name: "a fresh state with empty ledgers", given: fresh },
  ];

  for (const { name, given } of rows) {
    it(`restores ${name}, deep-equal`, () => {
      // Typed as GameState by the compiler, not by a cast — that is the
      // co-located claim tsc checks.
      const restored: GameState | null = parse(serialize(given));

      expect(restored).toEqual(given);
      expect(restored?.scene).toBe(given.scene);
      expect(restored?.bundle.start).toBe("shore");
    });
  }

  it("returns a fresh graph, never an alias of the input", () => {
    const restored = parse(serialize(populated));

    expect(restored).not.toBe(populated);
    expect(restored?.flags).not.toBe(populated.flags);
    expect(restored?.bundle).not.toBe(populated.bundle);
  });

  it("carries a field it does not know about through untouched", () => {
    // Forward tolerance inside v1: the envelope refuses corruption, it
    // does not strip what it fails to recognise.
    const raw = envelopeOf(populated, (draft) => {
      draft.tithes = 3;
    });
    const restored = parse(raw) as unknown as Record<string, unknown> | null;

    expect(restored).not.toBeNull();
    expect(restored?.tithes).toBe(3);
  });
});

// ---------------------------------------------------------------------
// parse — the refusals (RULES.md 10: null, never a throw)
// ---------------------------------------------------------------------

describe("parse · answers null", () => {
  const rows: readonly { name: string; given: string }[] = [
    { name: "malformed JSON", given: "{" },
    { name: "an empty string", given: "" },
    { name: "JSON that is not an object", given: "42" },
    { name: "a JSON null", given: "null" },
    { name: "an array", given: "[]" },
    { name: "a bare state, unwrapped", given: JSON.stringify(populated) },
    { name: "version 2", given: JSON.stringify({ v: 2, state: populated }) },
    { name: 'version "1"', given: JSON.stringify({ v: "1", state: populated }) },
    { name: "no state", given: JSON.stringify({ v: 1 }) },
    { name: "a null state", given: JSON.stringify({ v: 1, state: null }) },
    {
      name: "seed gone missing",
      given: envelopeOf(populated, (draft) => {
        delete draft.seed;
      }),
    },
    {
      name: "rng that did not survive JSON",
      given: envelopeOf(populated, (draft) => {
        draft.rng = null;
      }),
    },
    {
      name: "flags as an object",
      given: envelopeOf(populated, (draft) => {
        draft.flags = { knows_glyph: true };
      }),
    },
    {
      name: "items holding a number",
      given: envelopeOf(populated, (draft) => {
        draft.items = ["lamp", 3];
      }),
    },
    {
      name: "a refusal that forgot its scene",
      given: envelopeOf(populated, (draft) => {
        draft.refused = [{ object: "book", action: "read" }];
      }),
    },
    {
      name: "a bundle with no start",
      given: envelopeOf(populated, (draft) => {
        draft.bundle = { scenes: {} };
      }),
    },
    {
      name: "a scene that is not a scene",
      given: envelopeOf(populated, (draft) => {
        draft.bundle = { start: "shore", scenes: { shore: "the shore" } };
      }),
    },
    {
      name: "an object with no line",
      given: envelopeOf(populated, (draft) => {
        draft.bundle = {
          start: "shore",
          scenes: {
            shore: { id: "shore", line: "…", objects: [{ id: "book", actions: [] }] },
          },
        };
      }),
    },
    {
      name: "a response with no deltas",
      given: envelopeOf(populated, (draft) => {
        draft.bundle = {
          start: "shore",
          scenes: {
            shore: {
              id: "shore",
              line: "…",
              objects: [
                {
                  id: "book",
                  line: "…",
                  actions: [{ id: "read", responses: [{ gates: {} }] }],
                },
              ],
            },
          },
        };
      }),
    },
  ];

  for (const { name, given } of rows) {
    it(`on ${name}`, () => {
      expect(() => parse(given)).not.toThrow();
      expect(parse(given)).toBeNull();
    });
  }

  it("checks shape, not vocabulary — an unknown delta word is the loader's ruling", () => {
    // RULES.md 3 closes the language at bundle load. The envelope must
    // not hold a second copy of the word list.
    const raw = envelopeOf(populated, (draft) => {
      draft.bundle = {
        start: "shore",
        scenes: {
          shore: {
            id: "shore",
            line: "…",
            objects: [
              {
                id: "book",
                line: "…",
                actions: [
                  { id: "read", responses: [{ deltas: [{ kind: "lies" }] }] },
                ],
              },
            ],
          },
        },
      };
    });

    expect(parse(raw)).not.toBeNull();
  });
});
