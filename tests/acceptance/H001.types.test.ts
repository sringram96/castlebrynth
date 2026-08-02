// H001 — acceptance. The contract hub: GameState, ActionRef, Effect,
// View, and the exhaustiveness hook H006 builds its switches on.
//
// The scoreboard for one claim: the shapes P0.md freezes exist, they
// are JSON all the way down, and the vocabulary is closed at compile
// time — not at play (RULES.md 3).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertNever,
  type ActionRef,
  type Bundle,
  type Delta,
  type DeltaKind,
  type Effect,
  type GameState,
  type Refusal,
  type View,
} from "../../src/core/types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

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

/** A populated state — every field the card names, none of them empty. */
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

/** VOCAB.md's delta set, as written, in order. */
const VOCAB_DELTAS = [
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
] as const;

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

/** The switch H006 inherits: exhaustive, never-guarded. */
function applyOrder(delta: Delta): number {
  switch (delta.kind) {
    case "say":
      return 0;
    case "set":
      return 1;
    case "unset":
      return 2;
    case "give":
      return 3;
    case "take":
      return 4;
    case "adjust":
      return 5;
    case "journal":
      return 6;
    case "refuse":
      return 7;
    case "goto":
      return 8;
    case "addObject":
      return 9;
    case "removeObject":
      return 10;
    case "prompt":
      return 11;
    case "fight":
      return 12;
    case "end":
      return 13;
    default:
      return assertNever(delta);
  }
}

describe("H001 · GameState is the whole of play, as JSON", () => {
  it("names every ledger field the contract promises", () => {
    expect(Object.keys(state).sort()).toEqual(
      [
        "bundle",
        "flags",
        "items",
        "journal",
        "refused",
        "rng",
        "scene",
        "seed",
      ].sort(),
    );
    expect(typeof state.scene).toBe("string");
    expect(typeof state.rng).toBe("number");
    expect(typeof state.seed).toBe("number");
    for (const list of [state.flags, state.items, state.journal, state.refused])
      expect(Array.isArray(list)).toBe(true);
  });

  it("holds flags as a string set that survives JSON", () => {
    // A Set would stringify to {} — the flags are a unique string list.
    expect(state.flags).not.toBeInstanceOf(Set);
    expect(state.flags.every((f) => typeof f === "string")).toBe(true);
    expect(new Set(state.flags).size).toBe(state.flags.length);
    expect(JSON.parse(JSON.stringify(state.flags))).toEqual(state.flags);
  });

  it("survives structuredClone", () => {
    const cloned = structuredClone(state);
    expect(cloned).toEqual(state);
    expect(cloned).not.toBe(state);
    expect(JSON.stringify(cloned)).toBe(JSON.stringify(state));
  });

  it("survives a JSON round-trip, deep-equal and byte-identical", () => {
    const parsed: GameState = JSON.parse(JSON.stringify(state));
    expect(parsed).toEqual(state);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(state));
  });

  it("keeps the refused ledger addressable by what was refused", () => {
    const first: Refusal | undefined = state.refused[0];
    expect(first).toEqual({ scene: "shore", object: "book", action: "read" });
  });
});

describe("H001 · the API surface the shell consumes", () => {
  it("addresses a tap as ActionRef {object, action}", () => {
    const ref: ActionRef = { object: "book", action: "read" };
    expect(Object.keys(ref).sort()).toEqual(["action", "object"]);
  });

  it("carries say in the Effect union, at minimum", () => {
    const said: Effect = { kind: "say", text: "A script you don't know." };
    const effects: readonly Effect[] = [said];
    const lines = effects.flatMap((e) => (e.kind === "say" ? [e.text] : []));
    expect(lines).toEqual(["A script you don't know."]);
  });

  it("draws a frame as View {enter?, line, scene, objects:[{id, actions:[id]}]}", () => {
    const view: View = {
      enter: "Water, and a shelf of stone above it.",
      line: "The shore. The water does not move.",
      scene: "shore",
      objects: [
        { id: "book", actions: ["read"] },
        { id: "stone", actions: ["study"] },
      ],
    };
    expect(view.scene).toBe("shore");
    expect(view.line).toBeTypeOf("string");
    expect(view.objects.map((o) => o.id)).toEqual(["book", "stone"]);
    expect(view.objects.flatMap((o) => o.actions)).toEqual(["read", "study"]);

    // `enter` is optional: a frame you did not just walk into has none.
    const returning: View = { line: view.line, scene: "shore", objects: [] };
    expect(returning.enter).toBeUndefined();
  });
});

describe("H001 · the vocabulary is closed at compile time (RULES.md 3)", () => {
  it("has exactly one Delta variant per VOCAB.md word", () => {
    expect(Object.keys(everyDelta)).toEqual([...VOCAB_DELTAS]);
  });

  it("routes every word through the never-guarded switch", () => {
    expect(VOCAB_DELTAS.map((word) => applyOrder(everyDelta[word]))).toEqual(
      VOCAB_DELTAS.map((_, i) => i),
    );
  });

  it("throws on a word that is not in the language", () => {
    const reserved = { kind: "lies" } as unknown as Delta;
    expect(() => applyOrder(reserved)).toThrow(/unreachable/);
  });

  it("compiles the never guard — tsc over src is the proof", () => {
    const tsc = spawnSync(
      process.execPath,
      ["node_modules/typescript/bin/tsc", "--noEmit"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(`${tsc.stdout ?? ""}${tsc.stderr ?? ""}`).toBe("");
    expect(tsc.status).toBe(0);
  }, 120_000);
});
