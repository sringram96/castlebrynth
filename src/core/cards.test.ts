// H003 — co-located unit tests for the authored card schema.
//
// This file is inside tsconfig's `include`, so `npm run law` typechecks
// it. That is the point: the strongest claims here are compile-time —
// the response list that must end in a gateless fallback, the delta
// tables that cannot drift from the types they are built from. The
// runtime assertions cover the predicates a build will lean on.
import { describe, expect, it } from "vitest";
import {
  CARD_DELTA_KEYS,
  CARD_GATE_KEYS,
  CARD_OBJECT_KEYS,
  CARD_RESPONSE_KEYS,
  CARD_SCENE_KEYS,
  CARD_TIERS,
  RESERVED_WORDS,
  endsInFallback,
  isCardDeltaKey,
  isCardGateKey,
  isCardResponseKey,
  isGateless,
  isReservedWord,
  isTier,
  refusesCleanly,
  type CardResponse,
  type CardResponses,
  type CardScene,
} from "./cards";

// ---------------------------------------------------------------------
// fixtures — the shore's shape, not its prose. The prose lives in
// content/shore.yaml and is checked by the acceptance test.
// ---------------------------------------------------------------------

/** The refuses-then-opens list: two gates, then the fallback. */
const read: CardResponses = [
  { if: { flags: ["read_book"] }, say: "The ink is going." },
  {
    if: { flags: ["knows_glyph"] },
    say: "A procession, inked crude.",
    set: ["read_book"],
    journal: "procession",
  },
  { refuse: true, say: "A script you don't know." },
];

const scene: CardScene = {
  scene: "shore",
  tier: "T0",
  enter: "Cold shingle.",
  line: "The shore. The water does not move.",
  objects: {
    stone: {
      tap: "A shelf of stone.",
      actions: {
        study: [
          { if: { flags: ["knows_glyph"] }, say: "The same mark." },
          { say: "You follow the cuts.", set: ["knows_glyph"] },
        ],
      },
    },
    book: { tap: "A book, open.", actions: { read } },
    // An object may be tap-only: no actions is a legal shape.
    pool: { tap: "A pool between two ribs of rock." },
  },
};

/** Every delta word, authored — the compile-time proof that all 14 fit. */
const everyDelta: CardResponse = {
  say: "Stone, wet to the wrist.",
  set: ["knows_glyph"],
  unset: ["knows_glyph"],
  give: ["lamp"],
  take: ["lamp"],
  adjust: { target: "tithes", amount: -1, clamped: true },
  journal: "procession",
  refuse: true,
  goto: "down",
  addObject: { scene: "shore", object: "ash", cause: "the lamp leaves it" },
  removeObject: { scene: "shore", object: "ash", cause: "the water takes it" },
  prompt: { id: "hold_breath", will: 2 },
  fight: "warden",
  end: { line: "The water closes over.", note: "drowned" },
};

// ---------------------------------------------------------------------

describe("cards · the word tables are built from the types", () => {
  it("lists a key for every delta word and no more", () => {
    expect(Object.keys(everyDelta).sort()).toEqual([...CARD_DELTA_KEYS].sort());
  });

  it("keeps VOCAB.md's apply order", () => {
    expect(CARD_DELTA_KEYS[0]).toBe("say");
    expect(CARD_DELTA_KEYS[CARD_DELTA_KEYS.length - 1]).toBe("end");
    expect(CARD_DELTA_KEYS.indexOf("set")).toBeLessThan(
      CARD_DELTA_KEYS.indexOf("journal"),
    );
    expect(CARD_DELTA_KEYS.indexOf("refuse")).toBeLessThan(
      CARD_DELTA_KEYS.indexOf("goto"),
    );
  });

  it("gates on flags and items, and nothing else", () => {
    expect(CARD_GATE_KEYS).toEqual(["flags", "items"]);
  });

  it("puts the gate ahead of the deltas on a response", () => {
    expect(CARD_RESPONSE_KEYS[0]).toBe("if");
    expect(CARD_RESPONSE_KEYS.length).toBe(CARD_DELTA_KEYS.length + 1);
  });

  it("answers membership for gates, deltas, responses, and tiers", () => {
    const rows = [
      { name: "a gate key", when: () => isCardGateKey("flags"), then: true },
      { name: "not a gate", when: () => isCardGateKey("depth"), then: false },
      { name: "a delta word", when: () => isCardDeltaKey("goto"), then: true },
      { name: "not a word", when: () => isCardDeltaKey("teleport"), then: false },
      { name: "the gate on a response", when: () => isCardResponseKey("if"), then: true },
      { name: "a delta on a response", when: () => isCardResponseKey("end"), then: true },
      { name: "a tier", when: () => isTier("T2"), then: true },
      { name: "not a tier", when: () => isTier("T4"), then: false },
    ];
    for (const row of rows) expect(row.when(), row.name).toBe(row.then);
  });

  it("holds the objects and scenes to their fields", () => {
    expect([...CARD_OBJECT_KEYS].sort()).toEqual(["actions", "tap"]);
    expect([...CARD_SCENE_KEYS].sort()).toEqual([
      "enter",
      "line",
      "objects",
      "scene",
      "tier",
    ]);
    expect(CARD_TIERS).toEqual(["T0", "T1", "T2", "T3"]);
  });

  it("keeps VOCAB.md's reserved words out of the language", () => {
    for (const word of RESERVED_WORDS) {
      expect(isReservedWord(word)).toBe(true);
      expect(isCardDeltaKey(word)).toBe(false);
      expect(isCardResponseKey(word)).toBe(false);
    }
    expect(isReservedWord("say")).toBe(false);
  });

  it("survives a JSON round-trip — content is data (RULES.md 5)", () => {
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
  });
});

describe("cards · the mandatory gateless fallback", () => {
  it("reads the last response as the one that always answers", () => {
    expect(isGateless(read[read.length - 1]!)).toBe(true);
    expect(endsInFallback(read)).toBe(true);
  });

  it("rejects a list that ends on a gate, or repeats the fallback", () => {
    const gated: CardResponse = { if: { items: ["lamp"] }, say: "a" };
    const fallback: CardResponse = { say: "b" };
    const rows = [
      { name: "empty", given: [], then: false },
      { name: "gate last", given: [fallback, gated], then: false },
      { name: "gate only", given: [gated], then: false },
      { name: "two fallbacks", given: [fallback, fallback], then: false },
      { name: "gate then fallback", given: [gated, fallback], then: true },
      { name: "fallback alone", given: [fallback], then: true },
    ];
    for (const row of rows)
      expect(endsInFallback(row.given), row.name).toBe(row.then);
  });

  it("finds a fallback on every action in the fixture", () => {
    for (const object of Object.values(scene.objects))
      for (const responses of Object.values(object.actions ?? {}))
        expect(endsInFallback(responses)).toBe(true);
  });
});

describe("cards · refuse carries no other delta (VOCAB.md)", () => {
  it("passes a bare refusal and a gated one", () => {
    expect(refusesCleanly({ refuse: true, say: "No." })).toBe(true);
    expect(
      refusesCleanly({ if: { flags: ["knows_glyph"] }, refuse: true, say: "No." }),
    ).toBe(true);
  });

  it("fails a refusal that also sets, gives, or journals", () => {
    expect(refusesCleanly({ refuse: true, say: "No.", set: ["read_book"] })).toBe(
      false,
    );
    expect(refusesCleanly({ refuse: true, say: "No.", journal: "procession" })).toBe(
      false,
    );
    expect(refusesCleanly({ refuse: true, say: "No.", goto: "down" })).toBe(false);
  });

  it("leaves every non-refusal alone", () => {
    expect(refusesCleanly(read[1]!)).toBe(true);
    expect(refusesCleanly({ say: "a", set: ["b"], journal: "c" })).toBe(true);
  });
});
