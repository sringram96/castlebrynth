// H003 · the room card schema, asserted. H009 · migrated to the lean word set.
//
// The word set is .llm/rules/engine.md's, and it is the law this file asserts:
// gates {flags, items} · deltas {say, set, unset, give, take, adjust, journal,
// refuse, goto, addObject, removeObject, prompt, fight, end}. `learn`, `harm`
// and the gate key `knows` were H003's and are now superseded — they are not
// merely gone from the tables, they are asserted REJECTED, at the type and at
// load, so the old set cannot come back quietly.
//
// The card's DONE WHEN has two halves and they are the first two blocks below:
//   1. an exemplar card typechecks — TALLOW_STORE is annotated `RoomCard`, so
//      `tsc --noEmit` (the first third of `npm run law`) is the assertion. It
//      is a real room, not a stub: it is the file a content author copies.
//   2. unknown words are rejected at LOAD, with a path-precise problem naming
//      the file and the offending key path.
//
// After those: what the TYPE refuses outright. Those cases are written with
// `@ts-expect-error`, which is checked by the same tsc run — if a line ever
// stops being an error, the unused directive turns the build red. That is the
// only honest way to test a compile error, and it is why the claims about
// structural enforcement in cards.ts can be believed.
//
// Then the three laws that belong to a whole card rather than to any one
// response: an affordance may not toggle, a room must offer a way on, and
// every sensed door must be one that some action goes through.
//
// Five words have no place in a quiet store room and so are not in the
// exemplar: `fight`, the doorway into the Lots, the other two emissions
// `prompt` and `end`, and `unset` and `take`, which undo things this room has
// no reason to undo. They are covered in the loader block instead.

import { describe, expect, it } from "vitest";
import {
  ADJUST_TRACKS,
  DELTA_WORDS,
  DOOR_KEYS,
  GATE_KEYS,
  KEEPS,
  OBJECT_KEYS,
  RESPONSE_KEYS,
  ROOM_KEYS,
  TIERS,
  formatProblem,
  loadRoom,
} from "./cards";
import type { Doors, Problem, Responses, RoomCard, RoomObject } from "./cards";

const FILE = "content/rooms/tallow-store.yaml";

// ──────────────────────────────────────────────────────────────── the exemplar ──

/**
 * THE TALLOW STORE — the reference room.
 *
 * Everything a room may say, said once, in the house voice: quiet, concrete,
 * unsentimental, short lines, present tense, tier T0 (residue only).
 *
 * The beats, so the shape reads as a room and not a table:
 *   · the vat is the risk — the free tap telegraphs the edge, REACH IN takes
 *     skin for a key, and a second reach finds only the hole it made;
 *   · the ladle leaves the room when you work it out, with a cause, and
 *     nothing in the card can put it back;
 *   · the bench shifts off a hatch that was not there before, with a cause;
 *   · the hatch is packed shut, and opens only on knowledge marked cross_push
 *     — a clue met on a different push, paying off on a later meeting;
 *   · three doors, sensed as smell, light and sound, and every one of them is
 *     walked through by some action in this room. No map screen.
 *
 * Every line is inside §frame's budget: 1-2 lines over a 240-wide canvas.
 */
const TALLOW_STORE: RoomCard = {
  id: "room:tallow-store",
  tier: "T0",
  still: "still:tallow-store",
  line: "A store room under the stair. Cold fat in the air.",

  doors: [
    {
      id: "door:stair-down",
      sense: "The far doorway, open on a stair. The air off it smells of wet stone.",
    },
    {
      id: "door:lamp-corridor",
      sense: "Light under the near door, low and steady. Somebody keeps a lamp.",
    },
    {
      id: "door:under-floor",
      sense: "Water moves under the boards. A long way down.",
    },
  ],

  objects: {
    vat: {
      tap: "A vat of set tallow, skinned grey. The break in the skin is not soft.",
      actions: {
        reach: [
          {
            if: { flags: ["vat-opened"] },
            say: "The hole your arm made holds its shape. The edges have gone hard.",
          },
          {
            say: "Cold to the elbow. An edge opens your palm. A key comes up with it.",
            adjust: { hp: -1 },
            set: ["vat-opened", "knowledge:things-kept-in-tallow"],
            give: [{ id: "item:greased-key", keep: "none" }],
            journal: "Put an arm into the tallow. Brought up a key, and a cut.",
          },
        ],
      },
    },

    ladle: {
      tap: "A ladle stands upright in the tallow, handle out.",
      actions: {
        take: [
          {
            say: "You work the handle out. The tallow closes over the hole it leaves.",
            give: [{ id: "item:tallow-ladle", keep: "none" }],
            removeObject: { object: "ladle", cause: "the ladle is out of the vat" },
            journal: "Worked the ladle out of the tallow.",
          },
        ],
      },
    },

    bench: {
      tap: "A work bench, scrubbed pale. Wick-ends in a tin, cut to one length.",
      actions: {
        peer: [
          { say: "Every wick is the same length. The tin is full. Nobody here burns one." },
        ],
        shift: [
          {
            if: { flags: ["bench-shifted"] },
            say: "The bench stands where you put it. The boards under it are pale.",
          },
          {
            say: "You put your shoulder to it. It comes off the boards, and iron shows.",
            set: ["bench-shifted"],
            addObject: { object: "hatch", cause: "the bench is shifted off it" },
          },
        ],
      },
    },

    hatch: {
      latent: true,
      tap: "A hatch in the floor, iron, flush with the boards. The seam is packed.",
      actions: {
        listen: [{ say: "Water, under the iron. A long way down, and moving." }],
        lift: [
          {
            if: { flags: ["knowledge:tallow-seal"], cross_push: true },
            say: "You work the seam. The hatch lifts, and the water below is loud.",
            set: ["hatch-open"],
            goto: "door:under-floor",
          },
          {
            refuse: true,
            say: "There is nothing to get hold of. The tallow has gone hard as wood.",
          },
        ],
      },
    },

    stair: {
      tap: "The far doorway, open. Steps going down, wet at the edges.",
      actions: {
        go: [{ say: "You go down. The cold comes up to meet you.", goto: "door:stair-down" }],
      },
    },

    "near-door": {
      tap: "The near door, shut. A line of light at the foot of it, steady.",
      actions: {
        listen: [{ say: "Nothing moves on the other side. The light does not change." }],
        open: [
          {
            say: "The door gives. The corridor beyond is lit end to end, and empty.",
            goto: "door:lamp-corridor",
          },
        ],
      },
    },
  },
};

/** The exemplar as a content file arrives: parsed data, no types attached. */
const authored = (): unknown => JSON.parse(JSON.stringify(TALLOW_STORE));

/** Every response in a card, with the object and action it hangs under. */
const everyResponse = (card: RoomCard): readonly Responses[number][] => {
  const out: Responses[number][] = [];
  for (const key of Object.keys(card.objects)) {
    const actions: { readonly [action: string]: Responses } =
      (card.objects[key] as RoomObject).actions ?? {};
    for (const action of Object.keys(actions)) out.push(...(actions[action] as Responses));
  }
  return out;
};

/** Every line of writing in a card, wherever it lives. */
const prose = (card: RoomCard): readonly string[] => {
  const lines: string[] = [card.line];
  for (const door of card.doors) lines.push(door.sense);
  for (const key of Object.keys(card.objects)) lines.push((card.objects[key] as RoomObject).tap);
  for (const response of everyResponse(card)) {
    lines.push(response.say);
    if (response.journal !== undefined) lines.push(response.journal);
    if (response.addObject !== undefined) lines.push(response.addObject.cause);
    if (response.removeObject !== undefined) lines.push(response.removeObject.cause);
  }
  return lines;
};

describe("H003 · the exemplar card", () => {
  it("typechecks as a RoomCard — the annotation above is the assertion", () => {
    // If TALLOW_STORE ever stops satisfying RoomCard, `tsc --noEmit` fails and
    // this file never runs. What is left to check here is that it is a room.
    expect(TALLOW_STORE.id).toBe("room:tallow-store");
    expect(TALLOW_STORE.tier).toBe("T0");
    expect(Object.keys(TALLOW_STORE.objects)).toHaveLength(6);
  });

  it("loads clean as authored data, with nothing to report", () => {
    const result = loadRoom(FILE, authored());
    expect(result.ok ? [] : result.problems.map(formatProblem)).toStrictEqual([]);
    expect(result.ok).toBe(true);
  });

  it("gives every object a free-tap line, and gives the tap nowhere to hide a delta", () => {
    // "Tap is free, always — describes, selects, surfaces actions; never
    // advances, costs, or harms" (DESIGN §the descent). The tap is a string.
    // A string cannot carry a gate or a delta, so the law is the shape.
    for (const key of Object.keys(TALLOW_STORE.objects)) {
      const object = TALLOW_STORE.objects[key] as RoomObject;
      expect(typeof object.tap, key).toBe("string");
      expect(object.tap.length, key).toBeGreaterThan(0);
    }
  });

  it("ends every response list in an ungated fallback", () => {
    for (const key of Object.keys(TALLOW_STORE.objects)) {
      const actions: { readonly [action: string]: Responses } =
        (TALLOW_STORE.objects[key] as RoomObject).actions ?? {};
      for (const action of Object.keys(actions)) {
        const responses = actions[action] as Responses;
        const last = responses[responses.length - 1];
        expect(last?.if, `${key}.${action}`).toBeUndefined();
        for (const above of responses.slice(0, -1)) {
          expect(above.if, `${key}.${action}`).toBeDefined();
        }
      }
    }
  });

  it("senses three doors, walks through all three, and names no room beyond them", () => {
    const walked = everyResponse(TALLOW_STORE)
      .map((response) => response.goto)
      .filter((door): door is string => door !== undefined);
    expect(TALLOW_STORE.doors).toHaveLength(3);
    for (const door of TALLOW_STORE.doors) {
      expect(Object.keys(door).sort(), door.id).toStrictEqual(["id", "sense"]);
      expect(door.sense.length, door.id).toBeGreaterThan(0);
      expect(walked, door.id).toContain(door.id);
    }
  });

  it("never removes an affordance it can put back", () => {
    // Affordance permanence, in the exemplar's own shape: the ladle only ever
    // leaves, the hatch only ever arrives, and no object does both.
    const removed = everyResponse(TALLOW_STORE)
      .map((response) => response.removeObject?.object)
      .filter((object): object is string => object !== undefined);
    const added = everyResponse(TALLOW_STORE)
      .map((response) => response.addObject?.object)
      .filter((object): object is string => object !== undefined);
    expect(removed).toStrictEqual(["ladle"]);
    expect(added).toStrictEqual(["hatch"]);
    expect(removed.filter((object) => added.includes(object))).toStrictEqual([]);
  });

  it("keeps the T0 voice — nothing banned, in any line it writes", () => {
    // DESIGN §world & voice, verbatim: banned "suddenly", "you feel",
    // "mysterious", "evil", "creepy", satan/devil/lucifer below T3, any meta
    // reference. T0 is residue only.
    const banned = [
      "suddenly",
      "you feel",
      "mysterious",
      "evil",
      "creepy",
      "satan",
      "devil",
      "lucifer",
      "player",
      "screen",
      "button",
    ];
    const lines = prose(TALLOW_STORE);
    expect(lines.length).toBeGreaterThan(20);
    for (const written of lines) {
      for (const word of banned) {
        expect(written.toLowerCase().includes(word), `"${written}" contains "${word}"`).toBe(false);
      }
    }
  });

  it("keeps every line inside the frame's budget", () => {
    // DESIGN §frame: "1-2 lines of writing on top". The budget is measurable
    // rather than aesthetic because .llm/rules/art.md 6 fixes the canvas at
    // "logical 240-wide portrait; INTEGER upscale only" and art.md 8 puts UI
    // text at native res over the art — about 44 characters to a line, so 88
    // is two of them. Every author copies this room, so one long line here
    // becomes long lines everywhere.
    for (const written of prose(TALLOW_STORE)) {
      expect(written.length, `${written.length} chars: "${written}"`).toBeLessThanOrEqual(88);
    }
  });
});

// ─────────────────────────────────────────── unknown words are rejected at load ──

/** The way on: an action that walks through each sensed door. A room without
 *  one is a softlock, so every probe below carries it. */
const WAY_ON = {
  tap: "Two doors, both shut.",
  actions: {
    go: [{ say: "You go on.", goto: "door:on" }],
    down: [{ say: "You go down.", goto: "door:down" }],
  },
};

/** A minimal legal card, for one thing at a time to go wrong in. */
const probe = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "room:probe",
  tier: "T0",
  still: "still:probe",
  line: "A small room. Nothing in it moves.",
  doors: [
    { id: "door:on", sense: "Light under the far door." },
    { id: "door:down", sense: "Cold air off the near stair." },
  ],
  objects: { way: WAY_ON },
  ...over,
});

/** A probe card carrying the way on, plus whatever is under test. */
const withObjects = (objects: Record<string, unknown>): Record<string, unknown> =>
  probe({ objects: { way: WAY_ON, ...objects } });

/** A probe card whose one object carries one action's response list. */
const withResponses = (responses: readonly unknown[]): Record<string, unknown> =>
  withObjects({ thing: { tap: "A thing on the floor.", actions: { peer: responses } } });

const problemsOf = (source: unknown): readonly Problem[] => {
  const result = loadRoom(FILE, source);
  return result.ok ? [] : result.problems;
};

const pathsOf = (source: unknown): readonly string[] => problemsOf(source).map((p) => p.path);

const messageAt = (source: unknown, path: string): string =>
  problemsOf(source).find((p) => p.path === path)?.message ?? `(no problem at ${path})`;

describe("H003 · unknown words are rejected at LOAD, by path", () => {
  it("accepts the probe and the exemplar, so a rejection below means something", () => {
    expect(pathsOf(probe())).toStrictEqual([]);
    expect(pathsOf(authored())).toStrictEqual([]);
  });

  it("names the file, the key path and the word — an author needs no engine source", () => {
    const bad = withResponses([{ say: "A line.", sey: "A typo." }]);
    const problem = problemsOf(bad)[0] as Problem;
    expect(problem.file).toBe(FILE);
    expect(problem.path).toBe("objects.thing.actions.peer[0].sey");
    expect(problem.message).toContain('unknown response word "sey"');
    // The message carries the whole vocabulary, so the fix is in the message.
    for (const word of DELTA_WORDS) expect(problem.message).toContain(word);
    expect(formatProblem(problem)).toBe(
      `${FILE}: objects.thing.actions.peer[0].sey — ${problem.message}`,
    );
  });

  it("rejects an unknown gate key", () => {
    const bad = withResponses([
      { if: { item: ["item:key"] }, say: "Gated." },
      { say: "Fallback." },
    ]);
    expect(pathsOf(bad)).toContain("objects.thing.actions.peer[0].if.item");
    expect(messageAt(bad, "objects.thing.actions.peer[0].if.item")).toContain(
      'unknown gate key "item"',
    );
  });

  it("spells the cross-push marking the way DESIGN.md spells it", () => {
    // An author copying DESIGN §the descent verbatim writes `cross_push`, and
    // must not be told their own vocabulary is unknown.
    const asDesigned = withResponses([
      { if: { flags: ["knowledge:x"], cross_push: true }, say: "Known." },
      { say: "Fallback." },
    ]);
    expect(pathsOf(asDesigned)).toStrictEqual([]);

    const camel = withResponses([
      { if: { flags: ["knowledge:x"], crossPush: true }, say: "Known." },
      { say: "Fallback." },
    ]);
    expect(messageAt(camel, "objects.thing.actions.peer[0].if.crossPush")).toContain(
      'unknown gate key "crossPush"',
    );
  });

  it("rejects an unknown room key", () => {
    const bad = probe({ depth: 1 });
    expect(pathsOf(bad)).toContain("depth");
    expect(messageAt(bad, "depth")).toContain('unknown room key "depth"');
  });

  it("rejects an unknown object key — including a tappable flag", () => {
    const bad = withObjects({ thing: { tap: "A thing.", tappable: true } });
    expect(pathsOf(bad)).toContain("objects.thing.tappable");
    expect(messageAt(bad, "objects.thing.tappable")).toContain('unknown object key "tappable"');
  });

  it("rejects an unknown door key — a door cannot name where it leads", () => {
    const bad = probe({
      doors: [
        { id: "door:on", sense: "Light.", to: "room:next" },
        { id: "door:down", sense: "Cold." },
      ],
    });
    expect(pathsOf(bad)).toContain("doors[0].to");
    expect(messageAt(bad, "doors[0].to")).toContain('unknown door key "to"');
  });

  it("rejects an unknown tier, and lists the tiers", () => {
    expect(messageAt(probe({ tier: "T4" }), "tier")).toContain('unknown tier "T4"');
    expect(messageAt(probe({ tier: "T4" }), "tier")).toContain("T0, T1, T2, T3");
  });

  it("rejects an unknown keep on a given item", () => {
    const bad = withResponses([{ say: "Take it.", give: [{ id: "item:x", keep: "forever" }] }]);
    const path = "objects.thing.actions.peer[0].give[0].keep";
    expect(pathsOf(bad)).toContain(path);
    expect(messageAt(bad, path)).toContain('unknown keep "forever"');
  });

  it("reports every unknown word at once, not just the first", () => {
    const bad = probe({
      mood: "damp",
      objects: {
        way: WAY_ON,
        thing: { tap: "A thing.", glow: true, actions: { peer: [{ say: "A line.", sey: "x" }] } },
      },
    });
    expect(pathsOf(bad)).toStrictEqual([
      "mood",
      "objects.thing.glow",
      "objects.thing.actions.peer[0].sey",
    ]);
  });

  it("accepts fight — the one doorway into the Lots — as an enemy id passed through", () => {
    const card = withResponses([{ say: "It comes off the wall.", fight: "enemy:tallow-thing" }]);
    expect(pathsOf(card)).toStrictEqual([]);
  });
});

// ────────────────────────────────────────────── what the type refuses outright ──

describe("H003 · the free-tap line is structurally mandatory", () => {
  it("does not compile an object with no readable line", () => {
    // @ts-expect-error — an object with no free-tap line is a compile error,
    // not a lint warning: DESIGN §the descent, "Tap is free, always".
    const mute: RoomObject = { actions: {} };
    expect(mute).toBeDefined();
  });

  it("also refuses it at load, for authored files that tsc never sees", () => {
    const bad = withObjects({ thing: { actions: {} } });
    expect(pathsOf(bad)).toContain("objects.thing.tap");
    expect(messageAt(bad, "objects.thing.tap")).toContain("`tap`");
  });
});

describe("H003 · a response list ends in an ungated fallback", () => {
  it("does not compile a list that ends on a gated response", () => {
    // @ts-expect-error — the last element is checked against `{ if?: never }`,
    // so a tap can never fall through to nothing (DESIGN §content laws).
    const dead: Responses = [{ if: { flags: ["x"] }, say: "Only when gated." }];
    expect(dead).toBeDefined();
  });

  it("does not compile an empty list", () => {
    // @ts-expect-error — the tuple requires the fallback element.
    const empty: Responses = [];
    expect(empty).toBeDefined();
  });

  it("does not compile an ungated response above the end", () => {
    // @ts-expect-error — everything above the fallback must be gated, or it is
    // unreachable: the first element is checked against `{ if: Gate }`.
    const shadowed: Responses = [{ say: "Always." }, { say: "Never." }];
    expect(shadowed).toBeDefined();
  });

  it("does not compile an unknown delta word", () => {
    // @ts-expect-error — the vocabulary is closed in the type as well as the
    // loader; excess property checking catches it on the literal.
    const typo: Responses = [{ say: "A line.", sey: "A typo." }];
    expect(typo).toBeDefined();
  });

  it("compiles a lone ungated response, and a gated stack above one", () => {
    const lone: Responses = [{ say: "The only answer." }];
    const stack: Responses = [
      { if: { flags: ["knowledge:x"], cross_push: true }, say: "Known." },
      { if: { items: ["item:key"] }, say: "Carried." },
      { say: "Neither." },
    ];
    expect(lone).toHaveLength(1);
    expect(stack).toHaveLength(3);
  });

  it("refuses both shapes at load too", () => {
    const endsGated = withResponses([{ if: { flags: ["x"] }, say: "Gated." }]);
    expect(pathsOf(endsGated)).toContain("objects.thing.actions.peer[0].if");
    expect(messageAt(endsGated, "objects.thing.actions.peer[0].if")).toContain("UNGATED fallback");

    const shadowed = withResponses([{ say: "Always." }, { say: "Never." }]);
    expect(messageAt(shadowed, "objects.thing.actions.peer[0]")).toContain("unreachable");

    const empty = withResponses([]);
    expect(messageAt(empty, "objects.thing.actions.peer")).toContain("answers nothing");
  });

  it("refuses a gate with nothing in it, cross_push included", () => {
    const hollow = withResponses([{ if: {}, say: "Gated on nothing." }, { say: "Fallback." }]);
    expect(messageAt(hollow, "objects.thing.actions.peer[0].if")).toContain("is not a gate");

    // cross_push is a marking, not a condition: it gates nothing on its own,
    // and a resolver evaluating a gate skips exactly this key.
    const marked = withResponses([
      { if: { cross_push: true }, say: "Marked." },
      { say: "Fallback." },
    ]);
    expect(messageAt(marked, "objects.thing.actions.peer[0].if")).toContain("not a condition");
  });
});

describe("H003 · doors are 2 or 3, sensed, and counted by the type", () => {
  it("does not compile four doors", () => {
    // @ts-expect-error — "the next 2-3 doors appear as sensed descriptions".
    const tooMany: Doors = [
      { id: "a", sense: "Light." },
      { id: "b", sense: "Sound." },
      { id: "c", sense: "Smell." },
      { id: "d", sense: "Cold." },
    ];
    expect(tooMany).toBeDefined();
  });

  it("does not compile a single door — a corridor is not a fork", () => {
    // @ts-expect-error — which door to take is the only navigational decision
    // the descent offers, and a map with one road on it is not a map.
    const chain: Doors = [{ id: "a", sense: "Light." }];
    expect(chain).toBeDefined();
  });

  it("does not compile a room with no door", () => {
    // @ts-expect-error — nothing in this vocabulary ends a push, so a room
    // with no way on is a softlock (DESIGN §content laws).
    const none: Doors = [];
    expect(none).toBeDefined();
  });

  it("refuses the same counts at load", () => {
    const four = probe({
      doors: [
        { id: "door:on", sense: "Light." },
        { id: "door:down", sense: "Sound." },
        { id: "c", sense: "Smell." },
        { id: "d", sense: "Cold." },
      ],
    });
    expect(messageAt(four, "doors")).toContain("2 or 3 doors, not 4");
    expect(messageAt(probe({ doors: [{ id: "door:on", sense: "Light." }] }), "doors")).toContain(
      "2 or 3 doors, not 1",
    );
    expect(messageAt(probe({ doors: [] }), "doors")).toContain("2 or 3 doors, not 0");
  });

  it("requires the sense line — it is the whole of the map", () => {
    const blind = probe({
      doors: [
        { id: "door:on", sense: "" },
        { id: "door:down", sense: "Cold." },
      ],
    });
    expect(pathsOf(blind)).toContain("doors[0].sense");
    expect(messageAt(blind, "doors[0].sense")).toContain("no map screen");
  });

  it("refuses the same door id twice in one room", () => {
    const twice = probe({
      doors: [
        { id: "door:on", sense: "Light." },
        { id: "door:on", sense: "Sound." },
      ],
    });
    expect(messageAt(twice, "doors[1].id")).toContain("declared twice");
  });
});

describe("H003 · goto names a declared door of THIS room", () => {
  it("accepts a goto that names one", () => {
    expect(pathsOf(withResponses([{ say: "You go on.", goto: "door:on" }]))).toStrictEqual([]);
  });

  it("rejects a goto that names anything else, and says what is declared", () => {
    const stray = withResponses([{ say: "You go on.", goto: "door:elsewhere" }]);
    const path = "objects.thing.actions.peer[0].goto";
    expect(pathsOf(stray)).toContain(path);
    expect(messageAt(stray, path)).toContain('"door:elsewhere" is not a door of this room');
    expect(messageAt(stray, path)).toContain("door:on");
  });

  it("never asks where a door leads — cross-room graph validation is D002's", () => {
    // The ruling this card was given (H005's decision record, 2026-08-02):
    // declaration-presence is checked here; the graph is bound at draw time.
    // The proof is that a door has no room-naming key at all, and a card whose
    // doors lead somewhere this loader has never heard of is clean. The two
    // softlock checks below read this same one card and follow nothing out.
    expect(DOOR_KEYS).toStrictEqual(["id", "sense"]);
    expect(pathsOf(authored())).toStrictEqual([]);
  });
});

// ──────────────────────────────────────── the laws that belong to a whole card ──

describe("H003 · no softlocks — the room offers a way on", () => {
  it("refuses a room where nothing says goto or fight", () => {
    const stranded = probe({
      objects: { thing: { tap: "A thing.", actions: { peer: [{ say: "Nothing gives." }] } } },
    });
    expect(messageAt(stranded, "")).toContain("offers no way on");
    expect(formatProblem(problemsOf(stranded)[0] as Problem)).toContain("(root)");
  });

  it("accepts a fight as the way on, without a goto of its own", () => {
    // FIGHT is the other doorway (DESIGN §the two engines, one doorway). The
    // sensed doors still have to be walked through, so this card is judged on
    // both counts and passes both.
    const arena = withObjects({
      thing: {
        tap: "It is already standing.",
        actions: { peer: [{ say: "It turns.", fight: "enemy:x" }] },
      },
    });
    expect(pathsOf(arena)).toStrictEqual([]);
  });
});

describe("H003 · no softlocks — every sensed door is walked through", () => {
  it("refuses a door nothing goes through", () => {
    const halfMapped = probe({
      objects: {
        way: { tap: "Two doors.", actions: { go: [{ say: "You go on.", goto: "door:on" }] } },
      },
    });
    expect(pathsOf(halfMapped)).toStrictEqual(["doors[1].id"]);
    expect(messageAt(halfMapped, "doors[1].id")).toContain('"door:down" is sensed but nothing goes');
    // Why this is the schema's business and not the shell's: types.ts addresses
    // every act as `Intent { object, action }`, and a door is not an object.
    expect(messageAt(halfMapped, "doors[1].id")).toContain("Intent");
  });

  it("names every unwalked door, not just the first", () => {
    const painted = probe({
      objects: { thing: { tap: "A thing.", actions: { peer: [{ say: "Nothing gives." }] } } },
    });
    expect(pathsOf(painted)).toStrictEqual(["", "doors[0].id", "doors[1].id"]);
  });

  it("counts a goto from any object, in any action, gated or not", () => {
    const scattered = probe({
      objects: {
        one: { tap: "One.", actions: { go: [{ say: "On.", goto: "door:on" }] } },
        two: {
          tap: "Two.",
          actions: {
            go: [
              { if: { flags: ["opened"] }, say: "Down.", goto: "door:down" },
              { say: "It does not give." },
            ],
          },
        },
      },
    });
    expect(pathsOf(scattered)).toStrictEqual([]);
  });
});

describe("H003 · affordance permanence", () => {
  it("has no tappability to toggle — presence is the whole of it", () => {
    expect(OBJECT_KEYS).toStrictEqual(["tap", "latent", "actions"]);
    expect(OBJECT_KEYS).not.toContain("tappable");
    expect(OBJECT_KEYS).not.toContain("visible");
  });

  it("refuses an object that can be removed and then added again", () => {
    // Dropping the `tappable` key removed one WAY to toggle, not toggling:
    // `removeObject` on one action plus `addObject` on another is pull/push
    // forever. The words were renamed by H009; the law they serve did not move.
    const pullPush = withObjects({
      latch: { latent: true, tap: "A latch, set in the frame." },
      hand: {
        tap: "The frame, and the latch in it.",
        actions: {
          pull: [
            {
              say: "It comes away.",
              removeObject: { object: "latch", cause: "the latch is in your hand" },
            },
          ],
          push: [
            {
              say: "It seats again.",
              addObject: { object: "latch", cause: "the latch is set again" },
            },
          ],
        },
      },
    });
    const path = "objects.hand.actions.push[0].addObject.object";
    expect(pathsOf(pullPush)).toStrictEqual([path]);
    expect(messageAt(pullPush, path)).toContain("tappability toggles");
    // The problem names BOTH halves, so an author can see the whole loop.
    expect(messageAt(pullPush, path)).toContain("objects.hand.actions.pull[0].removeObject.object");
  });

  it("allows an affordance that only leaves, or only arrives", () => {
    const oneWay = withObjects({
      latch: { latent: true, tap: "A latch, set in the frame." },
      ladle: { tap: "A ladle." },
      hand: {
        tap: "The frame.",
        actions: {
          push: [{ say: "It seats.", addObject: { object: "latch", cause: "the frame gives" } }],
          take: [
            {
              say: "It comes up.",
              removeObject: { object: "ladle", cause: "the ladle is in your hand" },
            },
          ],
        },
      },
    });
    expect(pathsOf(oneWay)).toStrictEqual([]);
  });

  it("requires a cause on an addObject", () => {
    // The rename did not drop the cause: "adds/removes carry a cause"
    // (DESIGN §content laws) still holds, and it is still required.
    const causeless = withObjects({
      thing: {
        tap: "A thing.",
        actions: { peer: [{ say: "It shifts.", addObject: { object: "under" } }] },
      },
      under: { latent: true, tap: "What was under it." },
    });
    const path = "objects.thing.actions.peer[0].addObject.cause";
    expect(pathsOf(causeless)).toContain(path);
    expect(messageAt(causeless, path)).toContain("adds and removes carry a cause");
  });

  it("requires a cause on a removeObject", () => {
    const causeless = withResponses([{ say: "You take it.", removeObject: { object: "thing" } }]);
    expect(pathsOf(causeless)).toContain("objects.thing.actions.peer[0].removeObject.cause");
  });

  it("reaches only this room's own objects", () => {
    const stray = withResponses([
      { say: "It shifts.", addObject: { object: "elsewhere", cause: "the bench moves" } },
    ]);
    const path = "objects.thing.actions.peer[0].addObject.object";
    expect(messageAt(stray, path)).toContain('"elsewhere" is not an object of this room');
  });

  it("refuses to add something already present — that would be a toggle", () => {
    const toggle = withResponses([
      { say: "It is there again.", addObject: { object: "thing", cause: "the light moves" } },
    ]);
    const path = "objects.thing.actions.peer[0].addObject.object";
    expect(messageAt(toggle, path)).toContain("latent: true");
  });

  it("accepts an addObject of a latent object, with its cause", () => {
    const clean = withObjects({
      thing: {
        tap: "A thing.",
        actions: {
          peer: [{ say: "It shifts.", addObject: { object: "under", cause: "the thing is moved" } }],
        },
      },
      under: { latent: true, tap: "What was under it." },
    });
    expect(pathsOf(clean)).toStrictEqual([]);
  });
});

describe("H003 · the vocabulary is closed, and frozen", () => {
  // Changing any list here changes the language every room is written in. A
  // new word is its own Asana task, never a side effect (.llm/rules/engine.md).
  it("freezes the delta words, in the order the rule declares them", () => {
    // Verbatim from .llm/rules/engine.md: "deltas {say, set, unset, give, take,
    // adjust, journal, refuse (→ refused ledger), goto (declared doors only),
    // addObject, removeObject, prompt, fight (emission), end}".
    expect(DELTA_WORDS).toStrictEqual([
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

  it("freezes the gate keys and the response keys", () => {
    // engine.md: "gates {flags, items}". `cross_push` is the third key and it
    // is not a condition — it is a marking, and it stays (DESIGN §the descent).
    expect(GATE_KEYS).toStrictEqual(["flags", "items", "cross_push"]);
    expect(RESPONSE_KEYS).toStrictEqual(["if", ...DELTA_WORDS]);
  });

  it("freezes the tracks `adjust` may move", () => {
    // The permanent strip, less depth (DESIGN §frame: "HP · Might · Will · ◎
    // tithes · depth"). Depth is the draw's, not a card's.
    expect(ADJUST_TRACKS).toStrictEqual(["hp", "might", "will", "tithes"]);
    expect(ADJUST_TRACKS as readonly string[]).not.toContain("depth");
    // Sanity is not a track: the frame shows no sanity bar, and the Fraying is
    // parked (DESIGN §open). A word that moved it would land a parked system.
    expect(ADJUST_TRACKS as readonly string[]).not.toContain("sanity");
  });

  it("freezes the room and door keys, the tiers, and the keeps", () => {
    expect(ROOM_KEYS).toStrictEqual(["id", "tier", "still", "line", "doors", "objects"]);
    expect(DOOR_KEYS).toStrictEqual(["id", "sense"]);
    expect(TIERS).toStrictEqual(["T0", "T1", "T2", "T3"]);
    expect(KEEPS).toStrictEqual(["none", "kept", "key"]);
  });

  it("has no word for the things the header names as absent", () => {
    // Stated absences, not oversights — see the header of cards.ts. The board
    // owns each of them; none is a side effect of this card. `label`, `cinema`
    // and object geometry are named there too: things DESIGN demands that this
    // schema cannot yet say, and that H006 and the art lint will need.
    //
    // `take` left this list at H009 — it is a word now. `tithes`, `sanity`,
    // `might` and `will` are not words either way: they are `adjust` tracks,
    // and `sanity` is not even one of those.
    for (const absent of ["tithes", "pay", "back", "qte", "sanity", "might", "will"]) {
      expect(DELTA_WORDS as readonly string[], absent).not.toContain(absent);
    }
    for (const absent of ["label", "cinema", "at", "size"]) {
      expect(DELTA_WORDS as readonly string[], absent).not.toContain(absent);
      expect(OBJECT_KEYS as readonly string[], absent).not.toContain(absent);
    }
  });
});

describe("H003 · a refusal is a refusal", () => {
  it("carries its line and nothing else", () => {
    const paid = withResponses([
      { refuse: true, say: "The labyrinth says no.", give: [{ id: "item:x", keep: "none" }] },
    ]);
    expect(messageAt(paid, "objects.thing.actions.peer[0]")).toContain(
      "carries no delta but its line",
    );
  });

  it("accepts a refusal that only speaks", () => {
    expect(pathsOf(withResponses([{ refuse: true, say: "Nothing gives." }]))).toStrictEqual([]);
  });
});

describe("H009 · adjust is whole, and never nothing", () => {
  // H003's `harm` law, retargeted. Harm is no longer a word: it is a negative
  // number on a track (.llm/rules/engine.md). What was "1 or more" is now
  // "not zero", because the sign carries the direction.
  it("refuses a move of none or a fraction", () => {
    for (const bad of [0, 1.5, -1.5, "1", null]) {
      const card = withResponses([{ say: "It takes skin.", adjust: { hp: bad } }]);
      expect(messageAt(card, "objects.thing.actions.peer[0].adjust.hp"), String(bad)).toContain(
        "whole number",
      );
    }
  });

  it("accepts a whole move in either direction, on any track", () => {
    expect(pathsOf(withResponses([{ say: "It takes skin.", adjust: { hp: -2 } }]))).toStrictEqual(
      [],
    );
    expect(
      pathsOf(withResponses([{ say: "The cut closes over.", adjust: { hp: 1 } }])),
    ).toStrictEqual([]);
    expect(
      pathsOf(
        withResponses([{ say: "You put coin in the slot.", adjust: { tithes: -3, will: 1 } }]),
      ),
    ).toStrictEqual([]);
  });

  it("refuses an unknown track, and lists the ones there are", () => {
    const bad = withResponses([{ say: "Something gives.", adjust: { sanity: -1 } }]);
    const path = "objects.thing.actions.peer[0].adjust.sanity";
    expect(pathsOf(bad)).toContain(path);
    expect(messageAt(bad, path)).toContain('unknown adjust track "sanity"');
    for (const track of ADJUST_TRACKS) expect(messageAt(bad, path)).toContain(track);
  });

  it("refuses an adjust that moves nothing", () => {
    const hollow = withResponses([{ say: "Nothing changes.", adjust: {} }]);
    expect(messageAt(hollow, "objects.thing.actions.peer[0].adjust")).toContain("moves nothing");
  });

  it("refuses an adjust that is not a map", () => {
    const wrong = withResponses([{ say: "It takes skin.", adjust: 1 }]);
    expect(messageAt(wrong, "objects.thing.actions.peer[0].adjust")).toContain("a map of tracks");
  });
});

describe("H009 · the five added words are vocabulary, and load", () => {
  // Vocabulary only: what each one DOES is another card's (H208 `prompt`,
  // H114 `end`, H205 the tithes spend path and its affordability gate). What
  // is asserted here is that a card may say them and that the shapes hold.
  it("accepts unset — a flag can be lowered again", () => {
    expect(
      pathsOf(withResponses([{ say: "The catch drops back.", unset: ["latch-held"] }])),
    ).toStrictEqual([]);
  });

  it("accepts take — an item leaves the pouch, by id and without a keep", () => {
    // `give` carries `keep` because death must know what to do with the item.
    // Once it is gone that stops mattering, so `take` is a list of ids.
    expect(
      pathsOf(withResponses([{ say: "It takes the key back.", take: ["item:greased-key"] }])),
    ).toStrictEqual([]);
    const wrong = withResponses([
      { say: "It takes the key back.", take: [{ id: "item:x", keep: "none" }] },
    ]);
    expect(pathsOf(wrong)).toContain("objects.thing.actions.peer[0].take[0]");
  });

  it("accepts prompt — a QTE id, passed through", () => {
    expect(
      pathsOf(withResponses([{ say: "The floor goes.", prompt: "qte:catch-the-edge" }])),
    ).toStrictEqual([]);
    const blank = withResponses([{ say: "The floor goes.", prompt: "" }]);
    expect(messageAt(blank, "objects.thing.actions.peer[0].prompt")).toContain("`prompt`");
  });

  it("accepts end — an ending id, passed through", () => {
    expect(
      pathsOf(withResponses([{ say: "The dark closes over.", end: "ending:the-long-way-down" }])),
    ).toStrictEqual([]);
    const blank = withResponses([{ say: "The dark closes over.", end: 1 }]);
    expect(messageAt(blank, "objects.thing.actions.peer[0].end")).toContain("`end`");
  });

  it("does not count `end` as the way on — the softlock check is unchanged", () => {
    // A judgment call, recorded: H009 added `end` as vocabulary and did NOT
    // widen "some response says `goto` or `fight`" to admit it. Widening a
    // ruled check is its own task; refusing more than necessary is the safe
    // direction, and this test is here so the next card finds the decision.
    const ending = probe({
      objects: {
        thing: { tap: "A thing.", actions: { peer: [{ say: "It closes.", end: "ending:x" }] } },
      },
    });
    expect(messageAt(ending, "")).toContain("offers no way on");
  });
});

describe("H009 · the superseded words are rejected", () => {
  // The human ruling (main, "Law: the lean word set supersedes") drops `learn`,
  // `harm` and the gate key `knows`. Removing them from the tables is not
  // enough: a card written against the old set must FAIL, loudly, by name.
  it("rejects `learn` — knowledge is a flag now, so `set` says it", () => {
    const old = withResponses([{ say: "You understand.", learn: ["knowledge:x"] }]);
    const path = "objects.thing.actions.peer[0].learn";
    expect(pathsOf(old)).toContain(path);
    expect(messageAt(old, path)).toContain('unknown response word "learn"');
    expect(messageAt(old, path)).toContain("set");
  });

  it("rejects `harm` — damage is arithmetic on a track now", () => {
    const old = withResponses([{ say: "It takes skin.", harm: 1 }]);
    const path = "objects.thing.actions.peer[0].harm";
    expect(pathsOf(old)).toContain(path);
    expect(messageAt(old, path)).toContain('unknown response word "harm"');
    expect(messageAt(old, path)).toContain("adjust");
  });

  it("rejects the gate key `knows` — the gate conditions are flags and items", () => {
    const old = withResponses([
      { if: { knows: ["knowledge:x"] }, say: "Known." },
      { say: "Fallback." },
    ]);
    const path = "objects.thing.actions.peer[0].if.knows";
    expect(pathsOf(old)).toContain(path);
    expect(messageAt(old, path)).toContain('unknown gate key "knows"');
    expect(messageAt(old, path)).toContain("flags, items");
  });

  it("rejects the old names for the object changes", () => {
    const old = withObjects({
      thing: {
        tap: "A thing.",
        actions: {
          peer: [{ say: "It shifts.", reveal: { object: "under", cause: "the thing is moved" } }],
          take: [{ say: "It comes up.", remove: { object: "thing", cause: "it is in your hand" } }],
        },
      },
      under: { latent: true, tap: "What was under it." },
    });
    expect(messageAt(old, "objects.thing.actions.peer[0].reveal")).toContain(
      'unknown response word "reveal"',
    );
    expect(messageAt(old, "objects.thing.actions.take[0].remove")).toContain(
      'unknown response word "remove"',
    );
  });

  it("does not compile them either — the type is the first door", () => {
    // @ts-expect-error — `learn` is not a word: knowledge is a flag, and `set`
    // raises it (.llm/rules/engine.md, the lean word set).
    const learned: Responses = [{ say: "You understand.", learn: ["knowledge:x"] }];
    // @ts-expect-error — `harm` is not a word: it is `adjust: { hp: -1 }`.
    const hurt: Responses = [{ say: "It takes skin.", harm: 1 }];
    // @ts-expect-error — `knows` is not a gate key: the conditions are flags
    // and items, and campaign knowledge is a flag like any other.
    const known: Responses = [{ if: { knows: ["knowledge:x"] }, say: "K." }, { say: "F." }];
    expect([learned, hurt, known]).toHaveLength(3);
  });

  it("keeps cross_push, which is NOT a condition and was not dropped with knows", () => {
    // engine.md lists gate CONDITIONS as {flags, items}; `cross_push` is a
    // marking on a gate and DESIGN §the descent still names it. It survives
    // the drop of `knows` because it never was a sibling of it.
    expect(GATE_KEYS).toContain("cross_push");
    const marked = withResponses([
      { if: { flags: ["knowledge:tallow-seal"], cross_push: true }, say: "Known." },
      { say: "Fallback." },
    ]);
    expect(pathsOf(marked)).toStrictEqual([]);
  });
});

describe("H003 · the loader is pure, total, and quiet", () => {
  it("never throws, whatever it is handed", () => {
    for (const junk of [null, undefined, "", "a string", 17, [], {}, [1, 2, 3]]) {
      expect(() => loadRoom(FILE, junk), JSON.stringify(junk ?? null)).not.toThrow();
      expect(loadRoom(FILE, junk).ok, JSON.stringify(junk ?? null)).toBe(false);
    }
  });

  it("does not touch what it is given", () => {
    const source = authored();
    const before = JSON.stringify(source);
    loadRoom(FILE, source);
    loadRoom(FILE, probe({ mood: "damp" }));
    expect(JSON.stringify(source)).toBe(before);
  });

  it("is deterministic — the same card gives the same problems, in the same order", () => {
    const bad = probe({ mood: "damp", objects: { thing: { glow: true } } });
    expect(problemsOf(bad)).toStrictEqual(problemsOf(bad));
  });

  it("hands back the card itself when there is nothing to report", () => {
    const source = authored();
    const result = loadRoom(FILE, source);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.card).toBe(source);
  });
});
