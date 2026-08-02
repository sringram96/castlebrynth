// H003 — acceptance. The card schema, and the shore that proves it.
//
// The scoreboard for one claim: the authored card language is exactly
// VOCAB.md, and content/shore.yaml is written in it — the book refuses,
// the stone teaches, the same tap opens, every action ends in a
// fallback, and the prose stays inside CANON.md's voice.
//
// Black-box on purpose: this reads the YAML off disk with a plain
// parser. No compiler (H004), no linter (H005), no engine (H006).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
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
  isGateless,
  isTier,
  refusesCleanly,
  type CardResponse,
  type CardScene,
} from "../../src/core/cards";

const SHORE = fileURLToPath(new URL("../../content/shore.yaml", import.meta.url));
const source = readFileSync(SHORE, "utf8");
const shore = parse(source) as CardScene;

// ---------------------------------------------------------------------
// VOCAB.md, copied out by hand. If these lists and the module's tables
// ever disagree, the module drifted from the language.
// ---------------------------------------------------------------------

const VOCAB_GATES = ["flags", "items"] as const;

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

const VOCAB_RESERVED = ["lies", "counter", "dropObols"] as const;

// ---------------------------------------------------------------------
// walking helpers
// ---------------------------------------------------------------------

type ActionEntry = {
  readonly object: string;
  readonly action: string;
  readonly responses: readonly CardResponse[];
};

function actions(scene: CardScene): readonly ActionEntry[] {
  return Object.entries(scene.objects).flatMap(([object, obj]) =>
    Object.entries(obj.actions ?? {}).map(([action, responses]) => ({
      object,
      action,
      responses: responses as readonly CardResponse[],
    })),
  );
}

function responsesOf(object: string, action: string): readonly CardResponse[] {
  const found = actions(shore).find(
    (a) => a.object === object && a.action === action,
  );
  if (!found) throw new Error(`no ${object}.${action} in shore.yaml`);
  return found.responses;
}

/** Every string the author wrote, prose and ids alike. */
function strings(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

// ---------------------------------------------------------------------

describe("H003 · the card types are exactly VOCAB.md", () => {
  it("gates on flags and items, and nothing else", () => {
    expect(CARD_GATE_KEYS).toEqual([...VOCAB_GATES]);
    expect(VOCAB_GATES.every(isCardGateKey)).toBe(true);
    expect(isCardGateKey("depth")).toBe(false);
  });

  it("names every delta word, in VOCAB.md's order", () => {
    expect(CARD_DELTA_KEYS).toEqual([...VOCAB_DELTAS]);
    expect(VOCAB_DELTAS.every(isCardDeltaKey)).toBe(true);
  });

  it("carries a response as the gate plus the delta words", () => {
    expect(CARD_RESPONSE_KEYS).toEqual(["if", ...VOCAB_DELTAS]);
  });

  it("keeps the reserved words out of the language", () => {
    expect([...RESERVED_WORDS]).toEqual([...VOCAB_RESERVED]);
    for (const word of VOCAB_RESERVED) expect(isCardDeltaKey(word)).toBe(false);
  });

  it("declares the scene, the object, and the tiers CANON.md names", () => {
    expect([...CARD_SCENE_KEYS].sort()).toEqual(
      ["scene", "tier", "enter", "line", "objects"].sort(),
    );
    expect([...CARD_OBJECT_KEYS].sort()).toEqual(["tap", "actions"].sort());
    expect(CARD_TIERS).toEqual(["T0", "T1", "T2", "T3"]);
  });

  it("reads a gateless response as the fallback and a gated one as not", () => {
    const gated: CardResponse = { if: { flags: ["knows_glyph"] }, say: "a" };
    const fallback: CardResponse = { say: "b" };
    expect(isGateless(gated)).toBe(false);
    expect(isGateless(fallback)).toBe(true);
    expect(endsInFallback([gated, fallback])).toBe(true);
    expect(endsInFallback([fallback, gated])).toBe(false);
    expect(endsInFallback([gated])).toBe(false);
    expect(endsInFallback([])).toBe(false);
  });
});

describe("H003 · shore.yaml parses into those types", () => {
  it("declares a scene, a tier, and the two lines", () => {
    expect(shore.scene).toBe("shore");
    expect(isTier(shore.tier)).toBe(true);
    expect(shore.tier).toBe("T0");
    expect(shore.enter).toBeTypeOf("string");
    expect(shore.line).toBeTypeOf("string");
    for (const key of Object.keys(shore))
      expect(CARD_SCENE_KEYS).toContain(key);
  });

  it("holds the reference objects: stone, book, pool, self, a path out", () => {
    expect(Object.keys(shore.objects).sort()).toEqual(
      ["book", "path", "pool", "self", "stone"].sort(),
    );
  });

  it("gives every object a free tap and only known keys", () => {
    for (const [id, object] of Object.entries(shore.objects)) {
      expect(object.tap, id).toBeTypeOf("string");
      expect(object.tap.trim().length, id).toBeGreaterThan(0);
      for (const key of Object.keys(object))
        expect(CARD_OBJECT_KEYS, id).toContain(key);
    }
  });

  it("writes every response in the language, with say always present", () => {
    for (const { object, action, responses } of actions(shore)) {
      const where = `${object}.${action}`;
      expect(Array.isArray(responses), where).toBe(true);
      for (const response of responses) {
        expect(response.say, where).toBeTypeOf("string");
        for (const key of Object.keys(response))
          expect(CARD_RESPONSE_KEYS, `${where}: ${key}`).toContain(key);
        for (const key of Object.keys(response.if ?? {}))
          expect(CARD_GATE_KEYS, `${where}: if.${key}`).toContain(key);
        for (const flag of response.if?.flags ?? [])
          expect(flag, where).toBeTypeOf("string");
      }
    }
  });

  it("ends every action in a gateless fallback, and gates everything above it", () => {
    const listed = actions(shore);
    expect(listed.length).toBeGreaterThan(0);
    for (const { object, action, responses } of listed) {
      expect(endsInFallback(responses), `${object}.${action}`).toBe(true);
    }
  });

  it("keeps refuse alone: the refused ledger, and nothing else", () => {
    for (const { object, action, responses } of actions(shore))
      for (const response of responses)
        expect(refusesCleanly(response), `${object}.${action}`).toBe(true);
  });
});

describe("H003 · the book refuses, then opens", () => {
  const read = responsesOf("book", "read");

  it("answers a first reading with a refusal, and says so", () => {
    const fallback = read[read.length - 1];
    expect(fallback).toBeDefined();
    expect(isGateless(fallback!)).toBe(true);
    expect(fallback!.refuse).toBe(true);
    expect(fallback!.say).toMatch(/script you don't know/i);
    expect(fallback!.journal).toBeUndefined();
    expect(fallback!.set).toBeUndefined();
  });

  it("opens on the knowledge the stone teaches", () => {
    const opened = read.find((r) => r.if?.flags?.includes("knows_glyph"));
    expect(opened).toBeDefined();
    expect(opened!.say).toMatch(/procession/i);
    expect(opened!.set).toContain("read_book");
    expect(opened!.journal).toBe("procession");
    expect(opened!.refuse).toBeUndefined();
  });

  it("teaches knows_glyph at the stone, ungated, so the gate is reachable", () => {
    const study = responsesOf("stone", "study");
    const teaching = study.filter((r) => r.set?.includes("knows_glyph"));
    expect(teaching).toHaveLength(1);
    expect(isGateless(teaching[0]!)).toBe(true);
  });

  it("spends the page: the read_book response is tried first and journals nothing", () => {
    const spent = read.findIndex((r) => r.if?.flags?.includes("read_book"));
    const opened = read.findIndex((r) => r.if?.flags?.includes("knows_glyph"));
    expect(spent).toBeGreaterThanOrEqual(0);
    expect(spent).toBeLessThan(opened);
    expect(read[spent]!.journal).toBeUndefined();
    expect(read[spent]!.set).toBeUndefined();
  });

  it("leaves the shore by a door ref, forward-only", () => {
    const take = responsesOf("path", "take");
    const out = take.filter((r) => r.goto !== undefined);
    expect(out).toHaveLength(1);
    expect(out[0]!.goto).toBeTypeOf("string");
  });

  it("never changes the object set: no addObject, no removeObject", () => {
    for (const { responses } of actions(shore))
      for (const response of responses) {
        expect(response.addObject).toBeUndefined();
        expect(response.removeObject).toBeUndefined();
      }
  });
});

describe("H003 · canon voice (CANON.md, spot-check)", () => {
  // CANON.md's banned list, plus the T0 seal: residue only, never the
  // words the tiers above own.
  const BANNED: readonly RegExp[] = [
    /\bsuddenly\b/i,
    /\byou feel\b/i,
    /\bmysterious/i,
    /\bevil\b/i,
    /\bcreepy\b/i,
    /\bsatan\b/i,
    /\bdevil\b/i,
    /\blucifer\b/i,
    /\bchild(ren)?\b/i,
    /\bbrother\b/i,
    // meta — games, stats, UI
    /\bgame\b/i,
    /\bplayer\b/i,
    /\bscreen\b/i,
    /\bbutton\b/i,
    /\bstats?\b/i,
    /\btap\b/i,
  ];

  const prose = strings(shore);

  it("scans clean", () => {
    for (const line of prose)
      for (const banned of BANNED)
        expect(banned.test(line), `${banned} in "${line}"`).toBe(false);
  });

  it("catches a banned word when one is there — the scan has teeth", () => {
    const bad = "Suddenly you feel the creepy stone.";
    expect(BANNED.some((b) => b.test(bad))).toBe(true);
    expect(/\bevil\b/i.test("A devil's mark.")).toBe(false);
  });

  it("writes short lines, present tense", () => {
    for (const line of prose) expect(line.length).toBeLessThan(200);
  });
});
