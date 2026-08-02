// H003 · the room card schema, asserted.
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
// One word has no place in a quiet store room and so is not in the exemplar:
// `fight`, the doorway into the Lots. It is covered in the loader block.

import { describe, expect, it } from "vitest";
import {
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
 *   · the ladle leaves the room when you take it, with a cause;
 *   · the bench shifts off a hatch that was not there before, with a cause;
 *   · the hatch is packed shut, and opens only on knowledge marked cross_push
 *     — a clue met on a different push, paying off on a later meeting;
 *   · three doors, sensed as light, sound and smell. No map screen.
 */
const TALLOW_STORE: RoomCard = {
  id: "room:tallow-store",
  tier: "T0",
  still: "still:tallow-store",
  line: "A store room under the stair. Cold fat in the air.",

  doors: [
    {
      id: "door:stair-down",
      sense: "The far doorway stands open on a stair. The air off it is colder, and smells of wet stone.",
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
      tap: "A vat of set tallow, skinned over grey. The skin is broken in one place, and the break is not soft.",
      actions: {
        reach: [
          {
            if: { flags: ["vat-opened"] },
            say: "The hole your arm made holds its shape. The edges have gone hard.",
          },
          {
            say: "Cold to the elbow. The fat gives, then holds. Something set in it opens your palm on the way out: a key, greased black.",
            harm: 1,
            set: ["vat-opened"],
            give: [{ id: "item:greased-key", keep: "none" }],
            learn: ["knowledge:things-kept-in-tallow"],
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
            say: "The handle comes up with the tallow still on it. You keep it.",
            give: [{ id: "item:tallow-ladle", keep: "none" }],
            remove: { object: "ladle", cause: "the ladle is in your hand" },
            journal: "Took the ladle out of the vat.",
          },
        ],
      },
    },

    bench: {
      tap: "A work bench, scrubbed pale. Wick-ends in a tin, cut to one length.",
      actions: {
        peer: [{ say: "Every wick is the same length. The tin is full. Nobody here has burned one." }],
        shift: [
          {
            if: { flags: ["bench-shifted"] },
            say: "The bench stands where you put it. The boards under it are pale.",
          },
          {
            say: "You put your shoulder to it. It comes off the boards, and there is iron underneath.",
            set: ["bench-shifted"],
            reveal: { object: "hatch", cause: "the bench is shifted off it" },
          },
        ],
      },
    },

    hatch: {
      latent: true,
      tap: "A hatch in the floor, iron, flush with the boards. The seam is packed with tallow.",
      actions: {
        listen: [{ say: "Water, under the iron. A long way down, and moving." }],
        lift: [
          {
            if: { knows: ["knowledge:tallow-seal"], crossPush: true },
            say: "You work the seam until the tallow comes away in one piece. The hatch lifts, and the water is loud.",
            set: ["hatch-open"],
            goto: "door:under-floor",
          },
          {
            refuse: true,
            say: "There is nothing to get hold of. The tallow in the seam has gone hard as wood.",
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

/** Every line of writing in a card, wherever it lives. */
const prose = (card: RoomCard): readonly string[] => {
  const lines: string[] = [card.line];
  for (const door of card.doors) lines.push(door.sense);
  for (const key of Object.keys(card.objects)) {
    const object = card.objects[key] as RoomObject;
    lines.push(object.tap);
    const actions: { readonly [action: string]: Responses } = object.actions ?? {};
    for (const action of Object.keys(actions)) {
      for (const response of actions[action] as Responses) {
        lines.push(response.say);
        if (response.journal !== undefined) lines.push(response.journal);
        if (response.reveal !== undefined) lines.push(response.reveal.cause);
        if (response.remove !== undefined) lines.push(response.remove.cause);
      }
    }
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

  it("senses three doors and names no room beyond them", () => {
    expect(TALLOW_STORE.doors).toHaveLength(3);
    for (const door of TALLOW_STORE.doors) {
      expect(Object.keys(door).sort(), door.id).toStrictEqual(["id", "sense"]);
      expect(door.sense.length, door.id).toBeGreaterThan(0);
    }
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
});

// ─────────────────────────────────────────── unknown words are rejected at load ──

/** A minimal legal card, for one thing at a time to go wrong in. */
const probe = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "room:probe",
  tier: "T0",
  still: "still:probe",
  line: "A small room. Nothing in it moves.",
  doors: [{ id: "door:on", sense: "Light under the far door." }],
  objects: {},
  ...over,
});

/** A probe card whose one object carries one action's response list. */
const withResponses = (responses: readonly unknown[]): Record<string, unknown> =>
  probe({ objects: { thing: { tap: "A thing on the floor.", actions: { peer: responses } } } });

const problemsOf = (source: unknown): readonly Problem[] => {
  const result = loadRoom(FILE, source);
  return result.ok ? [] : result.problems;
};

const pathsOf = (source: unknown): readonly string[] => problemsOf(source).map((p) => p.path);

const messageAt = (source: unknown, path: string): string =>
  problemsOf(source).find((p) => p.path === path)?.message ?? `(no problem at ${path})`;

describe("H003 · unknown words are rejected at LOAD, by path", () => {
  it("accepts the exemplar, so a rejection below means something", () => {
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

  it("rejects an unknown room key", () => {
    const bad = probe({ depth: 1 });
    expect(pathsOf(bad)).toContain("depth");
    expect(messageAt(bad, "depth")).toContain('unknown room key "depth"');
  });

  it("rejects an unknown object key — including a tappable flag", () => {
    const bad = probe({ objects: { thing: { tap: "A thing.", tappable: true } } });
    expect(pathsOf(bad)).toContain("objects.thing.tappable");
    expect(messageAt(bad, "objects.thing.tappable")).toContain('unknown object key "tappable"');
  });

  it("rejects an unknown door key — a door cannot name where it leads", () => {
    const bad = probe({ doors: [{ id: "door:on", sense: "Light.", to: "room:next" }] });
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
    const bad = probe({ objects: { thing: { actions: {} } } });
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
      { if: { knows: ["knowledge:x"], crossPush: true }, say: "Known." },
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

  it("refuses a gate with nothing in it — the loader's job, not the type's", () => {
    const hollow = withResponses([{ if: {}, say: "Gated on nothing." }, { say: "Fallback." }]);
    expect(messageAt(hollow, "objects.thing.actions.peer[0].if")).toContain("is not a gate");
  });
});

describe("H003 · doors are 1 to 3, sensed, and counted by the type", () => {
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

  it("does not compile a room with no door", () => {
    // @ts-expect-error — nothing in this vocabulary ends a push, so a room
    // with no way on is a softlock (DESIGN §content laws).
    const none: Doors = [];
    expect(none).toBeDefined();
  });

  it("refuses the same counts at load", () => {
    const four = probe({
      doors: [
        { id: "a", sense: "Light." },
        { id: "b", sense: "Sound." },
        { id: "c", sense: "Smell." },
        { id: "d", sense: "Cold." },
      ],
    });
    expect(messageAt(four, "doors")).toContain("1 to 3 doors, not 4");
    expect(messageAt(probe({ doors: [] }), "doors")).toContain("1 to 3 doors, not 0");
  });

  it("requires the sense line — it is the whole of the map", () => {
    const blind = probe({ doors: [{ id: "door:on", sense: "" }] });
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
    // doors lead somewhere this loader has never heard of is clean.
    expect(DOOR_KEYS).toStrictEqual(["id", "sense"]);
    expect(pathsOf(authored())).toStrictEqual([]);
  });
});

describe("H003 · affordance permanence", () => {
  it("has no tappability to toggle — presence is the whole of it", () => {
    expect(OBJECT_KEYS).toStrictEqual(["tap", "latent", "actions"]);
    expect(OBJECT_KEYS).not.toContain("tappable");
    expect(OBJECT_KEYS).not.toContain("visible");
  });

  it("requires a cause on a reveal", () => {
    const causeless = probe({
      objects: {
        thing: {
          tap: "A thing.",
          actions: { peer: [{ say: "It shifts.", reveal: { object: "under" } }] },
        },
        under: { latent: true, tap: "What was under it." },
      },
    });
    const path = "objects.thing.actions.peer[0].reveal.cause";
    expect(pathsOf(causeless)).toContain(path);
    expect(messageAt(causeless, path)).toContain("adds and removes carry a cause");
  });

  it("requires a cause on a remove", () => {
    const causeless = withResponses([{ say: "You take it.", remove: { object: "thing" } }]);
    expect(pathsOf(causeless)).toContain("objects.thing.actions.peer[0].remove.cause");
  });

  it("reaches only this room's own objects", () => {
    const stray = withResponses([
      { say: "It shifts.", reveal: { object: "elsewhere", cause: "the bench moves" } },
    ]);
    const path = "objects.thing.actions.peer[0].reveal.object";
    expect(messageAt(stray, path)).toContain('"elsewhere" is not an object of this room');
  });

  it("refuses to reveal something already present — that would be a toggle", () => {
    const toggle = withResponses([
      { say: "It is there again.", reveal: { object: "thing", cause: "the light moves" } },
    ]);
    const path = "objects.thing.actions.peer[0].reveal.object";
    expect(messageAt(toggle, path)).toContain("latent: true");
  });

  it("accepts a reveal of a latent object, with its cause", () => {
    const clean = probe({
      objects: {
        thing: {
          tap: "A thing.",
          actions: {
            peer: [{ say: "It shifts.", reveal: { object: "under", cause: "the thing is moved" } }],
          },
        },
        under: { latent: true, tap: "What was under it." },
      },
    });
    expect(pathsOf(clean)).toStrictEqual([]);
  });
});

describe("H003 · the vocabulary is closed, and frozen", () => {
  // Changing any list here changes the language every room is written in. A
  // new word is its own Asana task, never a side effect (.llm/rules/engine.md).
  it("freezes the delta words", () => {
    expect(DELTA_WORDS).toStrictEqual([
      "say",
      "set",
      "learn",
      "journal",
      "refuse",
      "give",
      "harm",
      "reveal",
      "remove",
      "fight",
      "goto",
    ]);
  });

  it("freezes the gate keys and the response keys", () => {
    expect(GATE_KEYS).toStrictEqual(["flags", "items", "knows", "crossPush"]);
    expect(RESPONSE_KEYS).toStrictEqual(["if", ...DELTA_WORDS]);
  });

  it("freezes the room and door keys, the tiers, and the keeps", () => {
    expect(ROOM_KEYS).toStrictEqual(["id", "tier", "still", "line", "doors", "objects"]);
    expect(DOOR_KEYS).toStrictEqual(["id", "sense"]);
    expect(TIERS).toStrictEqual(["T0", "T1", "T2", "T3"]);
    expect(KEEPS).toStrictEqual(["none", "kept", "key"]);
  });

  it("has no word for spending tithes, taking an item, or moving backwards", () => {
    // Stated absences, not oversights — see the header of cards.ts. The board
    // owns each of them; none is a side effect of this card.
    for (const absent of ["tithes", "pay", "take", "back", "qte", "sanity", "might", "will"]) {
      expect(DELTA_WORDS as readonly string[], absent).not.toContain(absent);
    }
  });
});

describe("H003 · a refusal is a refusal", () => {
  it("carries its line and nothing else", () => {
    const paid = withResponses([
      { refuse: true, say: "The labyrinth says no.", give: [{ id: "item:x", keep: "none" }] },
    ]);
    expect(messageAt(paid, "objects.thing.actions.peer[0]")).toContain("carries no delta but its line");
  });

  it("accepts a refusal that only speaks", () => {
    expect(pathsOf(withResponses([{ refuse: true, say: "Nothing gives." }]))).toStrictEqual([]);
  });
});

describe("H003 · harm is whole, and never nothing", () => {
  it("refuses a harm of none or a fraction", () => {
    for (const bad of [0, -1, 1.5, "1"]) {
      const card = withResponses([{ say: "It takes skin.", harm: bad }]);
      expect(messageAt(card, "objects.thing.actions.peer[0].harm"), String(bad)).toContain(
        "whole number of HP",
      );
    }
  });

  it("accepts a whole harm", () => {
    expect(pathsOf(withResponses([{ say: "It takes skin.", harm: 2 }]))).toStrictEqual([]);
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
