// H006 · resolution, asserted. The core vocabulary, applied.
//
// The word set is .llm/rules/engine.md's and it is the law this file asserts:
// gates {flags, items} · deltas {say, set, unset, give, take, adjust, journal,
// refuse, goto, addObject, removeObject, prompt, fight, end}. Every one of them
// is exercised below on a card that LOADED — the fixtures are pushed through
// `loadRoom` first, so nothing here is resolved that a content author could not
// have written, and the boundary "unknown words fail at LOAD, never at play"
// is a test rather than a claim.
//
// LINES ARE COUNTED, NEVER SEARCHED. An earlier incarnation of this project
// shipped a doubled refusal line that no test caught, because the test searched
// a joined log instead of counting. `saying()` below counts, and the refusal
// block asserts the count is exactly one.
//
// THE FIXTURES ARE ROOMS, NOT TABLES. The shore is the H000 atom in the house
// voice — the book refuses, the stone teaches, the same tap opens, the spent
// page still answers. The sump is the rest of the language: a pack to empty, a
// cold to wade, a board over a hatch, a grate to hold still at, and a shape in
// the water that is the one doorway into the Lots.

import { describe, expect, it } from "vitest";
import { newRun, view } from "./api";
import { ADJUST_TRACKS, DELTA_WORDS, loadRoom } from "./cards";
import type { Response, Responses, RoomCard, RoomObject } from "./cards";
import { WORD_LANDING, resolve } from "./resolve";
import type { Resolution } from "./resolve";
import type {
  CampaignBranch,
  ContentBundle,
  Effect,
  GameState,
  Id,
  Intent,
  RunBranch,
} from "./types";

const SEED = 42;

// ─────────────────────────────────────────────────────────────── the fixtures ──

/**
 * THE SHORE — the atom (H000), in the house voice.
 *
 * Three responses on one action, and their ORDER is the whole algorithm: the
 * spent page answers first once it is spent, the glyph answers second once it
 * is known, and the refusal is the ungated last word that can always answer.
 * The middle gate is marked `cross_push`, because the glyph is met on a
 * different push and pays off on a later meeting (DESIGN §the descent).
 */
const SHORE: RoomCard = {
  id: "room:the-shore",
  tier: "T0",
  still: "still:the-shore",
  line: "Water at the foot of the stair. A book on the step, open.",

  doors: [
    { id: "door:stair-down", sense: "The stair goes on down, and the water goes with it." },
    { id: "door:low-arch", sense: "An arch, low, breathing cold on your face." },
  ],

  objects: {
    book: {
      tap: "A book left open on the step, swollen with the damp. The script crawls.",
      actions: {
        read: [
          {
            if: { flags: ["flag:read-book"] },
            say: "The page is read. The ink has nothing left to say to you.",
          },
          {
            if: { flags: ["knowledge:the-glyph"], cross_push: true },
            say: "The script settles into strokes. It is a procession, and it is going down.",
            set: ["flag:read-book"],
            journal: "Read the procession off the book on the shore.",
          },
          {
            refuse: true,
            say: "It is a script you don't know. Your eye slides off the line and out.",
          },
        ],
      },
    },

    stone: {
      tap: "A stone set into the step, cut with one mark, worn shallow by hands.",
      actions: {
        study: [
          {
            if: { flags: ["knowledge:the-glyph"] },
            say: "The same mark. You have it already, and it has not changed.",
          },
          {
            say: "You hold the mark until it comes apart into strokes you know.",
            set: ["knowledge:the-glyph"],
          },
        ],
      },
    },

    stair: {
      tap: "The stair goes down into the water, and does not come back up.",
      actions: {
        go: [{ say: "You go down. The water takes your knees.", goto: "door:stair-down" }],
      },
    },

    arch: {
      tap: "The low arch. Cold comes out of it, steady, like breath.",
      actions: {
        go: [{ say: "You stoop, and go through.", goto: "door:low-arch" }],
      },
    },
  },
};

/**
 * THE SUMP — the rest of the language.
 *
 * `give` and `take` at the pack · `adjust` in the water, where hp and sanity
 * take the SAME number so that the one arithmetic they share is visible in the
 * card as well as in the code · `set` and `unset` on the wading · `addObject`
 * and `removeObject` at the board, each with its cause · `goto` at the stair,
 * the grate and the hatch · `prompt` at the grate · `fight` and `end` at the
 * shape.
 */
const SUMP: RoomCard = {
  id: "room:the-sump",
  tier: "T1",
  still: "still:the-sump",
  line: "A sump room, and the water in it stands. It smells of iron.",

  doors: [
    { id: "door:sump-stair", sense: "Steps up out of the water, dry at the top of them." },
    { id: "door:grate", sense: "A grate at the waterline. Air goes through it, fast and cold." },
    { id: "door:hatch-below", sense: "Water moving under the floor, and a long way down to it." },
  ],

  objects: {
    pack: {
      tap: "A pack above the waterline, still buckled. Whoever set it down did it carefully.",
      actions: {
        open: [
          {
            say: "Two things in it, and both of them dry. He kept them dry to the end.",
            give: [
              { id: "item:tallow-candle", keep: "none" },
              { id: "item:iron-key", keep: "key" },
            ],
            journal: "Opened a pack above the sump. Took a candle and a key off a dead man.",
          },
        ],
        empty: [
          {
            if: { items: ["item:tallow-candle"] },
            say: "You put the candle back in the pack and buckle it again.",
            take: ["item:tallow-candle"],
          },
          { say: "Nothing of yours belongs in it." },
        ],
      },
    },

    water: {
      tap: "The water stands to the knee. It is colder than the room is, which is wrong.",
      actions: {
        wade: [
          {
            say: "You wade it. The cold goes in at the shins and stays. Your foot turns up coin.",
            set: ["flag:waded"],
            adjust: { hp: -2, sanity: -2, will: -1, tithes: 3 },
            journal: "Waded the sump, and came out of it with coin.",
          },
        ],
        dry: [
          {
            if: { flags: ["flag:waded"] },
            say: "You stand out of the water until your legs stop shaking.",
            unset: ["flag:waded"],
          },
          { say: "You are as dry as this room gets." },
        ],
      },
    },

    beam: {
      tap: "A beam has come down across the sump, black with wet, and it is not light.",
      actions: {
        heave: [
          {
            say: "You get your shoulder under it. It shifts, and stays shifted, and you feel it.",
            adjust: { might: -1 },
          },
        ],
      },
    },

    board: {
      tap: "A board lies over the sump floor, one end lifted, the other end nailed.",
      actions: {
        pry: [
          {
            say: "The nails come out wet. Under the board there is iron, and a seam in the iron.",
            removeObject: { object: "board", cause: "the board is up and out of the way" },
            addObject: { object: "hatch", cause: "the board was lying over it" },
          },
        ],
      },
    },

    hatch: {
      latent: true,
      tap: "A hatch in the sump floor, iron, and the seam of it is packed with tallow.",
      actions: {
        lift: [
          {
            if: { items: ["item:iron-key"] },
            say: "The key turns the plate. The hatch comes up, and the drop under it is long.",
            goto: "door:hatch-below",
          },
          {
            refuse: true,
            say: "The seam holds. There is nothing here to get hold of.",
          },
        ],
      },
    },

    grate: {
      tap: "A grate at the waterline, and the air through it is fast enough to hear.",
      actions: {
        open: [{ say: "The grate lifts out of its seat.", goto: "door:grate" }],
        hold: [
          {
            say: "Something comes along the grate. You hold still, and it is a question of how long.",
            prompt: "qte:hold-still",
          },
        ],
      },
    },

    stair: {
      tap: "Steps going up out of the water. The top of them is dry.",
      actions: {
        go: [{ say: "You go up, and the water lets you.", goto: "door:sump-stair" }],
      },
    },

    shape: {
      tap: "Something stands at the far end of the water, and it does not move with the water.",
      actions: {
        approach: [
          {
            say: "It turns. It has been waiting for a light to reach it.",
            fight: "enemy:the-sump-shape",
          },
        ],
        kneel: [
          {
            say: "You go down on your knees in the water and let it come to you.",
            end: "end:given-to-the-sump",
          },
        ],
      },
    },
  },
};

/**
 * A gate carrying ONLY the marking.
 *
 * The loader refuses this card — a gate with no condition in it is not a gate
 * — so it is built by hand and never loaded. It exists to pin the resolver's
 * treatment of `cross_push`: skipped, so the gate gates on nothing and ANSWERS.
 * A resolver that read the marking as a condition would make every cross-push
 * clue unreachable and no other test in this file would notice.
 */
const MARKING: RoomCard = {
  id: "room:the-marking",
  tier: "T0",
  still: "still:the-marking",
  line: "A short passage, and a sign cut into the wall of it.",
  doors: [
    { id: "door:on", sense: "The passage goes on, and the air goes with it." },
    { id: "door:narrow", sense: "A second way, narrower, and dry." },
  ],
  objects: {
    sign: {
      tap: "A sign cut into the wall. The cut is old and the hand was steady.",
      actions: {
        read: [
          { if: { cross_push: true }, say: "You have met this cut before, on another push." },
          { say: "It is a cut in a wall." },
        ],
      },
    },
    on: {
      tap: "The passage, going on.",
      actions: { go: [{ say: "You go on.", goto: "door:on" }] },
    },
    narrow: {
      tap: "The narrow way, dry underfoot.",
      actions: { go: [{ say: "You take the narrow way.", goto: "door:narrow" }] },
    },
  },
};

// ─────────────────────────────────────────────────────────────────── helpers ──

const BUNDLE: ContentBundle = { version: 1, start: SHORE.id };

const fresh = (): GameState => newRun(SEED, BUNDLE);

/** A state with the run branch bent to a fixture's needs. */
const bendRun = (state: GameState, run: Partial<RunBranch>): GameState => ({
  ...state,
  run: { ...state.run, ...run },
});

/** A state with the campaign branch bent to a fixture's needs. */
const bendCampaign = (state: GameState, campaign: Partial<CampaignBranch>): GameState => ({
  ...state,
  campaign: { ...state.campaign, ...campaign },
});

/** Bars with room to move, since a fresh run opens with every pool at 0/0. */
const withBars = (state: GameState): GameState =>
  bendRun(state, {
    vitals: {
      hp: { current: 10, max: 10 },
      sanity: { current: 8, max: 8 },
      might: { current: 3, max: 3 },
      will: { current: 3, max: 3 },
    },
    tithes: 5,
  });

const act = (state: GameState, card: RoomCard, object: Id, action: Id): Resolution =>
  resolve(state, card, { object, action });

/** What THIS act said. */
const said = (out: Resolution): readonly string[] => {
  const lines: string[] = [];
  for (const effect of out.effects) if (effect.kind === "say") lines.push(effect.text);
  return lines;
};

/** How many lines carry the phrase. A COUNT, so a doubled line fails. */
const saying = (lines: readonly string[], phrase: string): number =>
  lines.filter((line) => line.includes(phrase)).length;

/** A deep copy through JSON — the only honest "before" for a purity check,
 *  since reference equality would pass even if a field were rewritten. */
const clone = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

/** Frozen to the leaves. Anything that tried to write through a shared
 *  reference throws here instead of corrupting a save quietly. */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry);
  return Object.freeze(value);
}

/** Every ARRAY reachable from a value, by reference. */
function arraysIn(value: unknown, found: unknown[] = [], seen = new Set<unknown>()): unknown[] {
  if (value === null || typeof value !== "object") return found;
  if (seen.has(value)) return found;
  seen.add(value);
  if (Array.isArray(value)) found.push(value);
  const entries = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const entry of entries) arraysIn(entry, found, seen);
  return found;
}

/** Every response in a card, with nothing about where it hangs. */
const everyResponse = (card: RoomCard): readonly Response[] => {
  const out: Response[] = [];
  for (const key of Object.keys(card.objects)) {
    const actions: { readonly [action: string]: Responses } =
      (card.objects[key] as RoomObject).actions ?? {};
    for (const action of Object.keys(actions)) out.push(...(actions[action] as Responses));
  }
  return out;
};

/** Every delta word a card actually uses. */
const wordsUsed = (card: RoomCard): ReadonlySet<string> => {
  const used = new Set<string>();
  for (const response of everyResponse(card)) {
    for (const key of Object.keys(response)) if (key !== "if") used.add(key);
  }
  return used;
};

// ──────────────────────────────────────────────────────── the fixtures are content ──

describe("H006 · the fixtures are content, not stubs", () => {
  it("loads both rooms clean, with nothing to report", () => {
    for (const card of [SHORE, SUMP]) {
      const result = loadRoom(`content/rooms/${card.id}.yaml`, clone(card));
      expect(result.ok ? [] : result.problems.map((p) => `${p.path} — ${p.message}`)).toStrictEqual(
        [],
      );
    }
  });

  it("uses every delta word of the language between them", () => {
    const used = new Set([...wordsUsed(SHORE), ...wordsUsed(SUMP)]);
    expect([...DELTA_WORDS].filter((word) => !used.has(word))).toStrictEqual([]);
  });
});

// ─────────────────────────────────────────────────────── unknown words: at LOAD ──

describe("H006 · unknown words fail at LOAD, never at play", () => {
  it("rejects a word the language does not have, by name and by key path", () => {
    const card = clone(SHORE) as {
      objects: { book: { actions: { read: Record<string, unknown>[] } } };
    };
    // A typo an author will really make: the fallback keeps its line and gains
    // a word that does not exist.
    card.objects.book.actions.read[2] = { refuse: true, say: "...", sey: "..." };
    const result = loadRoom("content/rooms/the-shore.yaml", card);
    expect(result.ok).toBe(false);
    const problems = result.ok ? [] : result.problems;
    expect(problems.map((p) => p.path)).toContain("objects.book.actions.read[2].sey");
    expect(problems.some((p) => p.message.includes("unknown response word"))).toBe(true);
  });

  it("resolves every action of every loaded card without throwing, saying one line each", () => {
    // Nothing fails at play. Every action of both rooms, from a state that
    // satisfies no gate at all, must answer — and answer with exactly one line.
    for (const card of [SHORE, SUMP]) {
      for (const object of Object.keys(card.objects)) {
        const actions = (card.objects[object] as RoomObject).actions ?? {};
        for (const action of Object.keys(actions)) {
          const out = act(withBars(fresh()), card, object, action);
          expect(out.effects, `${object}.${action}`).toHaveLength(1);
          expect(said(out), `${object}.${action}`).toHaveLength(1);
        }
      }
    }
  });

  it("is inert on an intent this card does not have — the same state, and silence", () => {
    const state = fresh();
    for (const intent of [
      { object: "book", action: "eat" },
      { object: "chandelier", action: "read" },
    ]) {
      const out = resolve(state, SHORE, intent);
      expect(out.state).toBe(state); // the very same object: nothing was rebuilt
      expect(out.effects).toStrictEqual([]);
      expect(out.emissions).toStrictEqual([]);
    }
  });

  it("routes every word of the language somewhere, by compile and by table", () => {
    // WORD_LANDING is a mapped type over `keyof Deltas`, so a word added to
    // cards.ts without a decision in resolve.ts does not build. This asserts
    // the runtime table matches the loader's vocabulary exactly.
    expect(Object.keys(WORD_LANDING).sort()).toStrictEqual([...DELTA_WORDS].sort());
    expect(WORD_LANDING.say).toBe("effect");
    expect(WORD_LANDING.fight).toBe("emission");
    expect(WORD_LANDING.refuse).toBe("state");
  });
});

// ──────────────────────────────────────────────────────────────── gate ordering ──

describe("H006 · gate ordering", () => {
  it("takes the ungated fallback when no gate holds", () => {
    const out = act(fresh(), SHORE, "book", "read");
    expect(saying(said(out), "script you don't know")).toBe(1);
  });

  it("takes the FIRST response whose gate holds, not the last and not the best", () => {
    // Both gates hold. The spent page is written first, so the spent page
    // answers and the procession does not — ordering, not scoring.
    const state = bendCampaign(bendRun(fresh(), { flags: ["flag:read-book"] }), {
      knowledge: ["knowledge:the-glyph"],
    });
    const out = act(state, SHORE, "book", "read");
    expect(saying(said(out), "nothing left to say")).toBe(1);
    expect(saying(said(out), "procession")).toBe(0);
  });

  it("walks the atom: refuses, is taught, opens, and then is spent", () => {
    let state = fresh();
    const log: string[] = [];
    const step = (object: Id, action: Id): readonly string[] => {
      const out = act(state, SHORE, object, action);
      state = out.state;
      log.push(...said(out));
      return said(out);
    };

    expect(saying(step("book", "read"), "script you don't know")).toBe(1);
    expect(state.campaign.refused).toHaveLength(1);
    expect(state.campaign.journal).toHaveLength(0);

    step("stone", "study");
    expect(state.campaign.knowledge).toStrictEqual(["knowledge:the-glyph"]);

    const opening = step("book", "read");
    expect(saying(opening, "procession")).toBe(1);
    expect(saying(opening, "script you don't know")).toBe(0);
    expect(state.run.flags).toStrictEqual(["flag:read-book"]);
    expect(saying(state.campaign.journal, "procession")).toBe(1);

    const journal = [...state.campaign.journal];
    const spent = step("book", "read");
    expect(spent).toHaveLength(1); // spent, not dead
    expect(saying(spent, "script you don't know")).toBe(0); // and never refused twice
    expect(state.campaign.journal).toStrictEqual(journal); // the spent page does not re-journal
    expect(state.campaign.refused).toHaveLength(1);
    expect(saying(log, "script you don't know")).toBe(1); // once in the whole run
  });
});

// ───────────────────────────────────────────────────────────────────── cross_push ──

describe("H006 · cross_push is a marking, not a condition", () => {
  it("evaluates the flags beside it — the marked gate still needs its clue", () => {
    const without = act(fresh(), SHORE, "book", "read");
    expect(saying(said(without), "procession")).toBe(0);
    const with_ = act(
      bendCampaign(fresh(), { knowledge: ["knowledge:the-glyph"] }),
      SHORE,
      "book",
      "read",
    );
    expect(saying(said(with_), "procession")).toBe(1);
  });

  it("answers a gate that carries only the marking — ungated, NOT unsatisfiable", () => {
    const out = act(fresh(), MARKING, "sign", "read");
    expect(saying(said(out), "on another push")).toBe(1);
    expect(saying(said(out), "cut in a wall")).toBe(0);
  });

  it("and the loader is where that card is caught", () => {
    const result = loadRoom("content/rooms/the-marking.yaml", clone(MARKING));
    expect(result.ok).toBe(false);
    const problems = result.ok ? [] : result.problems;
    expect(problems).toHaveLength(1);
    expect(problems[0]?.path).toBe("objects.sign.actions.read[0].if");
    expect(problems[0]?.message).toContain("not a condition");
  });
});

// ────────────────────────────────────────────────────────────── ledger routing ──

describe("H006 · ledger routing, proven branch by branch", () => {
  it("writes a `flag:` id to the RUN branch, and not to the campaign", () => {
    const out = act(withBars(fresh()), SUMP, "water", "wade");
    expect(out.state.run.flags).toStrictEqual(["flag:waded"]);
    expect(out.state.campaign.knowledge).toStrictEqual([]);
  });

  it("writes a `knowledge:` id to the CAMPAIGN branch, and not to the run", () => {
    const out = act(fresh(), SHORE, "stone", "study");
    expect(out.state.campaign.knowledge).toStrictEqual(["knowledge:the-glyph"]);
    expect(out.state.run.flags).toStrictEqual([]);
  });

  it("stores the prefix — nothing is stripped on the way in", () => {
    const out = act(fresh(), SHORE, "stone", "study");
    expect(out.state.campaign.knowledge).not.toContain("the-glyph");
    expect(out.state.campaign.knowledge[0]?.startsWith("knowledge:")).toBe(true);
  });

  it("reads a gate's `flags` as the UNION of the two ledgers", () => {
    // `flag:read-book` lives on the run branch, `knowledge:the-glyph` on the
    // campaign one, and each opens its own gate from its own branch alone.
    const fromRun = act(bendRun(fresh(), { flags: ["flag:read-book"] }), SHORE, "book", "read");
    expect(saying(said(fromRun), "nothing left to say")).toBe(1);

    const fromCampaign = act(
      bendCampaign(fresh(), { knowledge: ["knowledge:the-glyph"] }),
      SHORE,
      "stone",
      "study",
    );
    expect(saying(said(fromCampaign), "have it already")).toBe(1);
  });

  it("raises a flag once — a ledger is a set", () => {
    const state = bendRun(withBars(fresh()), { flags: ["flag:waded"] });
    const out = act(state, SUMP, "water", "wade");
    expect(out.state.run.flags).toStrictEqual(["flag:waded"]);
  });

  it("lowers a run flag with `unset`", () => {
    const state = bendRun(fresh(), { flags: ["flag:waded", "flag:read-book"] });
    const out = act(state, SUMP, "water", "dry");
    expect(out.state.run.flags).toStrictEqual(["flag:read-book"]);
  });

  it("never lowers knowledge, because knowledge ratchets", () => {
    // `unset` of a `knowledge:` id is refused at LOAD (cards.ts), which is
    // where an author meets it. This is the second lock: a card that got past
    // the loader still cannot unlearn.
    const unlearn: RoomCard = {
      ...SUMP,
      objects: {
        ...SUMP.objects,
        water: {
          tap: "The water stands to the knee.",
          actions: {
            forget: [{ say: "You try to put it out of your head.", unset: ["knowledge:the-glyph"] }],
          },
        },
      },
    };
    const state = bendCampaign(fresh(), { knowledge: ["knowledge:the-glyph"] });
    const out = act(state, unlearn, "water", "forget");
    expect(out.state.campaign.knowledge).toStrictEqual(["knowledge:the-glyph"]);

    const result = loadRoom("content/rooms/unlearn.yaml", clone(unlearn));
    expect(result.ok).toBe(false);
    const problems = result.ok ? [] : result.problems;
    expect(problems.some((p) => p.message.includes("RATCHETS"))).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────── refusal ──

describe("H006 · refuse", () => {
  const refuse = (state: GameState): Resolution => act(state, SUMP, "hatch", "lift");

  it("says its line EXACTLY ONCE", () => {
    const out = refuse(fresh());
    expect(out.effects).toHaveLength(1);
    expect(said(out)).toHaveLength(1);
    expect(saying(said(out), "The seam holds")).toBe(1);
  });

  it("writes the refused ledger: the act, and where it was made", () => {
    const out = refuse(bendRun(fresh(), { depth: 3 }));
    expect(out.state.campaign.refused).toHaveLength(1);
    expect(out.state.campaign.refused[0]?.intent).toStrictEqual({
      object: "hatch",
      action: "lift",
    });
    expect(out.state.campaign.refused[0]?.depth).toBe(3);
  });

  it("implies no other delta — nothing but the ledger moves", () => {
    const before = withBars(bendRun(fresh(), { flags: ["flag:waded"] }));
    const after = refuse(before).state;
    expect(after.run).toStrictEqual(before.run);
    expect(after.campaign.journal).toStrictEqual(before.campaign.journal);
    expect(after.campaign.knowledge).toStrictEqual(before.campaign.knowledge);
    expect(after.campaign.dice).toStrictEqual(before.campaign.dice);
  });

  it("remembers the same refusal once, and a refusal at a new depth again", () => {
    const first = refuse(fresh()).state;
    const twice = refuse(first).state;
    expect(twice.campaign.refused).toHaveLength(1);
    const deeper = refuse(bendRun(twice, { depth: 1 })).state;
    expect(deeper.campaign.refused).toHaveLength(2);
    expect(deeper.campaign.refused.map((r) => r.depth)).toStrictEqual([0, 1]);
  });

  it("holds its intent by value, not by the caller's reference", () => {
    const intent: Intent = { object: "hatch", action: "lift" };
    const out = resolve(fresh(), SUMP, intent);
    expect(out.state.campaign.refused[0]?.intent).not.toBe(intent);
    expect(out.state.campaign.refused[0]?.intent).toStrictEqual(intent);
  });
});

// ───────────────────────────────────────────────────────────── give, take, gates ──

describe("H006 · give and take", () => {
  it("gives into the pouch, keeping what death does with each thing", () => {
    const out = act(fresh(), SUMP, "pack", "open");
    expect(out.state.run.consumables).toStrictEqual([
      { id: "item:tallow-candle", keep: "none" },
      { id: "item:iron-key", keep: "key" },
    ]);
  });

  it("takes one instance back out, and leaves the rest of the pouch alone", () => {
    const opened = act(fresh(), SUMP, "pack", "open").state;
    const doubled = bendRun(opened, {
      consumables: [...opened.run.consumables, { id: "item:tallow-candle", keep: "none" }],
    });
    const out = act(doubled, SUMP, "pack", "empty");
    expect(out.state.run.consumables).toStrictEqual([
      { id: "item:iron-key", keep: "key" },
      { id: "item:tallow-candle", keep: "none" },
    ]);
  });

  it("takes out of a worn slot, and leaves a null where it was", () => {
    const state = bendRun(fresh(), {
      equipment: [null, { id: "item:tallow-candle", keep: "kept" }, null, null],
    });
    const out = act(state, SUMP, "pack", "empty");
    expect(out.state.run.equipment).toStrictEqual([null, null, null, null]);
    expect(out.state.run.equipment).toHaveLength(4); // the pouch's shape never changes
  });

  it("takes nothing when the thing is not carried, and does not fail", () => {
    const state = fresh();
    const out = act(state, SUMP, "pack", "empty");
    expect(saying(said(out), "Nothing of yours")).toBe(1); // the gate did not hold
    expect(out.state).toBe(state);
  });

  it("reads an items gate across the whole pouch: loose, worn and small", () => {
    const key = { id: "item:iron-key", keep: "key" } as const;
    const holds = (state: GameState): number => saying(said(act(state, SUMP, "hatch", "lift")), "key turns the plate");
    expect(holds(fresh())).toBe(0);
    expect(holds(bendRun(fresh(), { consumables: [key] }))).toBe(1);
    expect(holds(bendRun(fresh(), { equipment: [null, null, key, null] }))).toBe(1);
    expect(holds(bendRun(fresh(), { small: [null, key] }))).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────────────── adjust ──

describe("H006 · adjust", () => {
  it("moves hp and sanity by the same arithmetic — sanity is a bar like any other", () => {
    const before = withBars(fresh());
    const after = act(before, SUMP, "water", "wade").state;
    // The card moves both by -2. If sanity were inverted, scaled, or special-
    // cased anywhere, these two lines could not both hold.
    expect(after.run.vitals.hp).toStrictEqual({ current: 8, max: 10 });
    expect(after.run.vitals.sanity).toStrictEqual({ current: 6, max: 8 });
    expect(after.run.vitals.hp.current - before.run.vitals.hp.current).toBe(
      after.run.vitals.sanity.current - before.run.vitals.sanity.current,
    );
  });

  it("leaves every max where it was — a card moves the bar, not the body", () => {
    const before = withBars(fresh());
    const after = act(before, SUMP, "water", "wade").state;
    for (const track of ["hp", "sanity", "might", "will"] as const) {
      expect(after.run.vitals[track].max, track).toBe(before.run.vitals[track].max);
    }
  });

  it("moves will and the coin, and the coin is not a bar", () => {
    const after = act(withBars(fresh()), SUMP, "water", "wade").state;
    expect(after.run.vitals.will).toStrictEqual({ current: 2, max: 3 });
    expect(after.run.tithes).toBe(8);
  });

  it("moves might", () => {
    const after = act(withBars(fresh()), SUMP, "beam", "heave").state;
    expect(after.run.vitals.might).toStrictEqual({ current: 2, max: 3 });
  });

  it("observably moves every track the language has", () => {
    const before = withBars(fresh());
    const waded = act(before, SUMP, "water", "wade").state;
    const heaved = act(waded, SUMP, "beam", "heave").state;
    const moved = {
      hp: heaved.run.vitals.hp.current !== before.run.vitals.hp.current,
      sanity: heaved.run.vitals.sanity.current !== before.run.vitals.sanity.current,
      might: heaved.run.vitals.might.current !== before.run.vitals.might.current,
      will: heaved.run.vitals.will.current !== before.run.vitals.will.current,
      tithes: heaved.run.tithes !== before.run.tithes,
    };
    expect([...ADJUST_TRACKS].filter((track) => !moved[track])).toStrictEqual([]);
  });

  it("does not clamp — the delta arrives first, and the floor is H205's", () => {
    const empty = bendRun(fresh(), {
      vitals: {
        hp: { current: 1, max: 10 },
        sanity: { current: 1, max: 8 },
        might: { current: 3, max: 3 },
        will: { current: 3, max: 3 },
      },
      tithes: 0,
    });
    const after = act(empty, SUMP, "water", "wade").state;
    expect(after.run.vitals.hp.current).toBe(-1);
    expect(after.run.vitals.sanity.current).toBe(-1);
    expect(after.run.vitals.will.current).toBe(2);
  });
});

// ───────────────────────────────────────────────────────────────────── journal ──

describe("H006 · journal", () => {
  it("appends the line the card wrote, and only when the card wrote one", () => {
    const opened = act(fresh(), SUMP, "pack", "open").state;
    expect(opened.campaign.journal).toStrictEqual([
      "Opened a pack above the sump. Took a candle and a key off a dead man.",
    ]);
    const heaved = act(opened, SUMP, "beam", "heave").state;
    expect(heaved.campaign.journal).toStrictEqual(opened.campaign.journal);
  });

  it("records the act each time the act is made — the journal is what happened", () => {
    const once = act(withBars(fresh()), SUMP, "water", "wade").state;
    const twice = act(once, SUMP, "water", "wade").state;
    expect(twice.campaign.journal).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────────────────────────── emissions ──

describe("H006 · the words that leave", () => {
  it("emits a goto naming a door this room DECLARED, and moves no room itself", () => {
    const state = fresh();
    const out = act(state, SHORE, "stair", "go");
    expect(out.emissions).toStrictEqual([{ kind: "goto", door: "door:stair-down" }]);
    expect(SHORE.doors.some((door) => door.id === "door:stair-down")).toBe(true);
    // Where the door leads is bound at draw time (D002). Resolution records the
    // traversal and does not invent a destination.
    expect(out.state.run.roomId).toBe(state.run.roomId);
    expect(out.state.run.depth).toBe(state.run.depth);
  });

  it("emits both object changes, each carrying its cause", () => {
    const out = act(fresh(), SUMP, "board", "pry");
    expect(out.emissions).toStrictEqual([
      { kind: "addObject", object: "hatch", cause: "the board was lying over it" },
      {
        kind: "removeObject",
        object: "board",
        cause: "the board is up and out of the way",
      },
    ]);
  });

  it("emits a prompt, and implements no QTE", () => {
    const state = fresh();
    const out = act(state, SUMP, "grate", "hold");
    expect(out.emissions).toStrictEqual([{ kind: "prompt", prompt: "qte:hold-still" }]);
    expect(out.state).toBe(state);
  });

  it("emits a fight and NOTHING else", () => {
    const state = withBars(fresh());
    const out = act(state, SUMP, "shape", "approach");
    expect(out.emissions).toStrictEqual([{ kind: "fight", enemy: "enemy:the-sump-shape" }]);
    expect(out.effects).toHaveLength(1);
    expect(out.state).toBe(state); // no combat, no cost, no ledger
  });

  it("emits an ending, and does not invent the transition after it", () => {
    const state = fresh();
    const out = act(state, SUMP, "shape", "kneel");
    expect(out.emissions).toStrictEqual([{ kind: "end", ending: "end:given-to-the-sump" }]);
    expect(out.state).toBe(state);
  });

  it("says nothing extra: one line per response, emission or not", () => {
    for (const [object, action] of [
      ["stair", "go"],
      ["board", "pry"],
      ["grate", "hold"],
      ["shape", "approach"],
      ["shape", "kneel"],
    ] as const) {
      expect(act(fresh(), SUMP, object, action).effects, `${object}.${action}`).toHaveLength(1);
    }
  });
});

// ────────────────────────────────────────────────────────────── purity, the tap ──

describe("H006 · nothing mutates", () => {
  const busy = (): GameState => {
    let state = withBars(fresh());
    state = act(state, SHORE, "stone", "study").state;
    state = act(state, SHORE, "book", "read").state;
    state = act(state, SUMP, "pack", "open").state;
    state = act(state, SUMP, "water", "wade").state;
    state = act(state, SUMP, "hatch", "lift").state;
    return state;
  };

  it("leaves the state it was handed deep-equal, whatever the word", () => {
    const state = busy();
    const before = clone(state);
    for (const card of [SHORE, SUMP]) {
      for (const object of Object.keys(card.objects)) {
        const actions = (card.objects[object] as RoomObject).actions ?? {};
        for (const action of Object.keys(actions)) resolve(state, card, { object, action });
      }
    }
    expect(clone(state)).toStrictEqual(before);
  });

  it("resolves against a state frozen to the leaves, and never writes through", () => {
    // The types make the state unwritable at compile time (types.ts law 1).
    // This makes it unwritable at run time too: any push into a ledger array or
    // any assignment into a pool would throw here, in strict-mode ESM.
    const state = deepFreeze(busy());
    for (const card of [SHORE, SUMP]) {
      for (const object of Object.keys(card.objects)) {
        const actions = (card.objects[object] as RoomObject).actions ?? {};
        for (const action of Object.keys(actions)) {
          expect(() => resolve(state, card, { object, action }), `${object}.${action}`).not.toThrow();
        }
      }
    }
  });

  it("never draws — resolution does not touch the RNG stream", () => {
    // Not one word of the core vocabulary is random, so no child stream has to
    // be persisted and a replay cannot drift. `RunBranch` carries a single
    // `rng`; a second one would be a types.ts change and its own task.
    const state = withBars(fresh());
    for (const [object, action] of [
      ["water", "wade"],
      ["pack", "open"],
      ["shape", "approach"],
    ] as const) {
      expect(act(state, SUMP, object, action).state.run.rng).toStrictEqual(state.run.rng);
    }
  });

  it("the free tap leaves the state deep-equal, and answers the same twice", () => {
    const state = busy();
    const before = clone(state);
    const once = JSON.stringify(view(state));
    const twice = JSON.stringify(view(state));
    expect(clone(state)).toStrictEqual(before); // never advances, costs, or harms
    expect(twice).toBe(once); // total and pure
  });

  it("the free tap hands back no container the shell could grow or shrink", () => {
    // types.ts law 1 rules out defensive cloning: the state is readonly to the
    // leaves, so sharing a VALUE (a Pool) is safe and deliberate. An ARRAY is
    // the different case — a shell that was handed `campaign.journal` itself
    // could push into a save, and no type would be violated at run time. So no
    // array reachable from the view may be an array reachable from the state.
    const state = busy();
    const shown = arraysIn(view(state));
    const held = new Set(arraysIn(state));
    expect(shown.filter((array) => held.has(array))).toStrictEqual([]);
  });

  it("gives the very same state back when a response moves nothing", () => {
    const state = fresh();
    const out = act(state, SHORE, "arch", "go");
    expect(out.state).toBe(state);
  });

  it("does not hold the card's items — a save owns what is in it", () => {
    const out = act(fresh(), SUMP, "pack", "open");
    const given = (SUMP.objects["pack"] as RoomObject).actions?.["open"]?.[0]?.give;
    expect(out.state.run.consumables[0]).not.toBe(given?.[0]);
    expect(out.state.run.consumables[0]).toStrictEqual(given?.[0]);
  });
});

// ─────────────────────────────────────────────────────────────────── determinism ──

describe("H006 · determinism", () => {
  /** A push through both rooms, logging everything an act produced. */
  const script = (): string => {
    let state = withBars(fresh());
    const log: { effects: readonly Effect[]; emissions: unknown }[] = [];
    const step = (card: RoomCard, object: Id, action: Id): void => {
      const out = resolve(state, card, { object, action });
      state = out.state;
      log.push({ effects: out.effects, emissions: out.emissions });
    };
    step(SHORE, "book", "read");
    step(SHORE, "stone", "study");
    step(SHORE, "book", "read");
    step(SHORE, "book", "read");
    step(SUMP, "pack", "open");
    step(SUMP, "water", "wade");
    step(SUMP, "water", "dry");
    step(SUMP, "board", "pry");
    step(SUMP, "hatch", "lift");
    step(SUMP, "grate", "hold");
    step(SUMP, "pack", "empty");
    step(SUMP, "shape", "approach");
    return JSON.stringify({ state, log });
  };

  it("replays byte-identical from the same seed and the same inputs", () => {
    expect(script()).toBe(script());
  });

  it("answers the same twice from the same state — an act is a function", () => {
    const state = withBars(fresh());
    const once = resolve(state, SUMP, { object: "water", action: "wade" });
    const twice = resolve(state, SUMP, { object: "water", action: "wade" });
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it("survives the save: the state a run produces is JSON, to the leaves", () => {
    const state = act(withBars(fresh()), SUMP, "pack", "open").state;
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
  });
});
