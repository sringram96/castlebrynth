// D002 · forward-only doors: what is behind them, and going through one.
//
// Three laws are load-bearing here and each gets its own describe:
//
//   THE STREAM IS THREADED, NEVER RE-FORKED. A fork is fresh at draw 0 every
//   time (rng.ts), so a `descend` that re-derived its stream by name would open
//   every door at every depth on the same room, in every seed, forever. The
//   regression test does not just assert that two pushes differ — it computes
//   what the re-forking bug WOULD have produced and requires the real answer
//   not to be it.
//
//   FORWARD-ONLY IS AN ABSENCE. There is no assertion that backtracking is
//   refused, because there is no transition to refuse: depth only rises, and
//   the module's export list is asserted so that a `climb` cannot be added
//   quietly.
//
//   DOORS REDRAW OFF THE DEATH COUNT, and no code in doors.ts does it. It falls
//   out of `run = seed + death count + inputs, exactly` — the death count is
//   mixed into the run's root stream (rng.ts `runStream`) and this push's
//   stream forks off that root — so the test walks it end to end from a seed
//   and a death count, the way the lifecycle will.

import { describe, expect, it } from "vitest";
import * as doors from "./doors";
import { descend, drawDoors, openPush, sensed } from "./doors";
import { newRun } from "./api";
import { load, save } from "./save";
import { pick, runStream } from "./rng";
import type { Door, Doors, RoomCard } from "./cards";
import type { ContentBundle, Id, RngState, RunBranch } from "./types";

const BUNDLE: ContentBundle = { version: 1, start: "room:crossing" };

const door = (id: string, sense: string): Door => ({ id, sense });

/** Sense lines, as an author writes them: light, sound, smell — and never a
 *  destination (DESIGN §the descent, cards.ts `Door`). */
const THREE: Doors = [
  door("door:left", "cold air, and water somewhere under it"),
  door("door:ahead", "a lamp still burning"),
  door("door:right", "tallow, and something turned"),
];

const TWO: Doors = [THREE[0], THREE[1]];

const card = (declared: Doors): RoomCard => ({
  id: "room:tallow-store",
  tier: "T0",
  still: "still:tallow-store",
  line: "The store, and three ways out of it.",
  doors: declared,
  objects: {},
});

const CARD = card(THREE);

/** A pool of 4 — a power of two, so `nextInt` never rejects a word and the cost
 *  of a draw is exactly one (rng.ts "no modulo bias"). That makes the draw-order
 *  assertions exact rather than lower bounds. */
const POOL: readonly Id[] = ["room:a", "room:b", "room:c", "room:d"];

/** A wide pool, for the tests that want distinct destinations to be likely. */
const WIDE: readonly Id[] = Array.from({ length: 16 }, (_, i) => `room:${i}`);

const runAt = (descent: RngState): RunBranch => ({ ...newRun(42, BUNDLE).run, descent });

const roomsOf = (drawn: readonly doors.DrawnDoor[]): readonly Id[] => drawn.map((d) => d.room);

// ──────────────────────────────────────────────────────────────────────────────

describe("D002 · the sense is authored, the room is drawn", () => {
  it("carries every door of the room, with the author's id and sense line", () => {
    const drawn = drawDoors({ seed: 7, draws: 0 }, THREE, POOL);
    expect(drawn).not.toBeNull();
    const [set] = drawn as [readonly doors.DrawnDoor[], RngState];
    expect(set).toHaveLength(3);
    expect(set.map((d) => d.id)).toStrictEqual(["door:left", "door:ahead", "door:right"]);
    expect(set.map((d) => d.sense)).toStrictEqual(THREE.map((d) => d.sense));
  });

  it("puts a room from the depth's pool behind each one", () => {
    const [set] = drawDoors({ seed: 7, draws: 0 }, THREE, POOL) as [doors.DrawnDoor[], RngState];
    for (const d of set) expect(POOL).toContain(d.room);
  });

  it("honours both arities the design allows, and nothing else can be written", () => {
    // 2 or 3, counted by the type (cards.ts `Doors`) — the floor is 2 because
    // "doors are the map" does not survive a map with one road on it.
    expect((drawDoors({ seed: 7, draws: 0 }, TWO, POOL) as [doors.DrawnDoor[], RngState])[0]).toHaveLength(2);
    expect((drawDoors({ seed: 7, draws: 0 }, THREE, POOL) as [doors.DrawnDoor[], RngState])[0]).toHaveLength(3);
  });

  it("gives the doors distinct destinations — choosing is choosing between rooms", () => {
    // Not "always distinct" (a uniform draw may repeat, and forcing it not to
    // would be a rule nothing in the design asks for), but the SET is drawn per
    // door rather than once: over a spread of seeds, the three differ often.
    const varied = Array.from({ length: 20 }, (_, seed) => {
      const [set] = drawDoors({ seed, draws: 0 }, THREE, WIDE) as [doors.DrawnDoor[], RngState];
      return new Set(roomsOf(set)).size;
    });
    expect(varied.filter((size) => size === 3).length).toBeGreaterThan(10);
  });
});

describe("D002 · the fixed draw order", () => {
  it("draws one room per door, in the room's declaration order, first door first", () => {
    const start: RngState = { seed: 7, draws: 0 };
    const [first] = pick(start, POOL);
    const [set] = drawDoors(start, THREE, POOL) as [doors.DrawnDoor[], RngState];
    // The first DECLARED door takes the first draw off the stream.
    expect(set[0]?.room).toBe(first);
  });

  it("binds the same room sequence to a reversed declaration, reversed", () => {
    // This is what pins the order: the stream produces one sequence of rooms,
    // and which door gets which is the DECLARATION's business. Reverse the
    // card's doors and the same rooms come out attached the other way round.
    const start: RngState = { seed: 7, draws: 0 };
    const forward = drawDoors(start, THREE, POOL) as [doors.DrawnDoor[], RngState];
    const backward = drawDoors(start, [THREE[2], THREE[1], THREE[0]], POOL) as [
      doors.DrawnDoor[],
      RngState,
    ];
    expect(roomsOf(backward[0])).toStrictEqual(roomsOf(forward[0]));
    expect(backward[0].map((d) => d.id)).toStrictEqual(["door:right", "door:ahead", "door:left"]);
  });

  it("costs exactly one word per door, and never rewinds", () => {
    const start: RngState = { seed: 7, draws: 5 };
    const [, afterThree] = drawDoors(start, THREE, POOL) as [doors.DrawnDoor[], RngState];
    const [, afterTwo] = drawDoors(start, TWO, POOL) as [doors.DrawnDoor[], RngState];
    expect(afterThree.draws).toBe(8);
    expect(afterTwo.draws).toBe(7);
    expect(afterThree.seed).toBe(start.seed);
  });

  it("is deterministic: the same position draws the same labyrinth", () => {
    const a = drawDoors({ seed: 7, draws: 3 }, THREE, POOL) as [doors.DrawnDoor[], RngState];
    const b = drawDoors({ seed: 7, draws: 3 }, THREE, POOL) as [doors.DrawnDoor[], RngState];
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("D002 · the stream is threaded, never re-forked", () => {
  it("advances the run's descent stream, and keeps the successor", () => {
    const before = runAt(openPush({ seed: 42, draws: 0 }));
    const after = descend(before, CARD, "door:ahead", POOL);
    expect(after?.descent.seed).toBe(before.descent.seed);
    expect(after?.descent.draws).toBe(3);
  });

  it("opens a new room on each push — the bug this card exists to not have", () => {
    // THE REGRESSION. A `descend` that said `fork(run.rng, STREAM.descent)`
    // instead of reading `run.descent` would restart the stream at draw 0 every
    // time and hand back the SAME room, at every depth, forever. So: walk five
    // pushes, and require the walk not to be the constant the bug produces.
    let run = runAt(openPush({ seed: 42, draws: 0 }));
    const walked: Id[] = [];
    for (let i = 0; i < 5; i++) {
      const next = descend(run, CARD, "door:ahead", WIDE);
      expect(next).not.toBeNull();
      run = next as RunBranch;
      walked.push(run.roomId as Id);
    }
    // What the re-forking bug would have produced, computed here rather than
    // described: the same draw off a stream that never moved.
    const stuck = (
      drawDoors(openPush({ seed: 42, draws: 0 }), CARD.doors, WIDE) as [
        doors.DrawnDoor[],
        RngState,
      ]
    )[0][1]?.room;
    expect(walked[0]).toBe(stuck);
    expect(walked.every((room) => room === stuck)).toBe(false);
    expect(new Set(walked).size).toBeGreaterThan(1);
    expect(run.descent.draws).toBe(15);
  });

  it("mints a push's stream with one spelling, and it is the one freshRun uses", () => {
    // Two call sites forking under two different names would silently give a
    // run two labyrinths, so the derivation is exported and shared.
    const fresh = newRun(42, BUNDLE);
    expect(fresh.run.descent).toStrictEqual(openPush(fresh.run.rng));
  });

  it("re-forking by name is the same value every time — which is why it is not used", () => {
    // Stated as a property of `fork` rather than trusted to a comment: this is
    // exactly why the stream has to live on the state (types.ts `descent`).
    const root: RngState = { seed: 42, draws: 0 };
    expect(openPush(root)).toStrictEqual(openPush(root));
    expect(openPush(root).draws).toBe(0);
    // Even after the ROOT has been drawn from, the fork is unchanged: a fork
    // reads its parent's seed and never its position.
    expect(openPush({ seed: 42, draws: 900 })).toStrictEqual(openPush(root));
  });
});

describe("D002 · forward-only", () => {
  it("raises the depth by one, and the room is drawn rather than recalled", () => {
    const run = { ...runAt(openPush({ seed: 42, draws: 0 })), depth: 2, roomId: "room:here" };
    const next = descend(run, CARD, "door:left", POOL);
    expect(next?.depth).toBe(3);
    expect(next?.roomId).not.toBe("room:here");
    expect(POOL).toContain(next?.roomId);
  });

  it("only ever goes down, over a whole push", () => {
    let run = runAt(openPush({ seed: 5, draws: 0 }));
    const depths = [run.depth];
    for (let i = 0; i < 8; i++) {
      run = descend(run, CARD, "door:right", WIDE) as RunBranch;
      depths.push(run.depth);
    }
    expect(depths).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("has no transition that goes back — the export list is the assertion", () => {
    // Backtracking is not refused, it is ABSENT. A `climb` or an `ascend` added
    // later has to change this line, which makes it a decision rather than a
    // diff nobody read.
    expect(Object.keys(doors).sort()).toStrictEqual(["descend", "drawDoors", "openPush", "sensed"]);
  });

  it("keeps the push's flags — a flag is a one-shot of the push, not of the room", () => {
    // Clearing them here would silently re-arm every ambush already sprung
    // (types.ts `RunBranch.flags`).
    const run = { ...runAt(openPush({ seed: 42, draws: 0 })), flags: ["flag:sprung"] };
    expect(descend(run, CARD, "door:left", POOL)?.flags).toStrictEqual(["flag:sprung"]);
  });
});

describe("D002 · declared doors only", () => {
  it("refuses a door this room does not declare, and does not throw", () => {
    const run = runAt(openPush({ seed: 42, draws: 0 }));
    for (const undeclared of ["door:sump", "", "room:a", "door:LEFT"]) {
      expect(() => descend(run, CARD, undeclared, POOL), undeclared).not.toThrow();
      expect(descend(run, CARD, undeclared, POOL), undeclared).toBeNull();
    }
  });

  it("refuses a door of a DIFFERENT room's card", () => {
    const run = runAt(openPush({ seed: 42, draws: 0 }));
    const elsewhere = card([door("door:stair", "a draught"), door("door:arch", "silence")]);
    expect(descend(run, elsewhere, "door:left", POOL)).toBeNull();
    expect(descend(run, CARD, "door:stair", POOL)).toBeNull();
  });

  it("spends nothing when it refuses — a rejected door is not a draw", () => {
    const run = runAt(openPush({ seed: 42, draws: 0 }));
    expect(descend(run, CARD, "door:sump", POOL)).toBeNull();
    // The state is untouched, so the doors a player is shown next are the same
    // ones. `descend` returns a new branch or nothing; it never edits.
    expect(run.descent.draws).toBe(0);
  });
});

describe("D002 · an exhausted pool is quiet", () => {
  it("answers null rather than throwing, at both levels", () => {
    const run = runAt(openPush({ seed: 42, draws: 0 }));
    expect(() => drawDoors(run.descent, THREE, [])).not.toThrow();
    expect(drawDoors(run.descent, THREE, [])).toBeNull();
    expect(() => descend(run, CARD, "door:left", [])).not.toThrow();
    expect(descend(run, CARD, "door:left", [])).toBeNull();
    expect(sensed(run, CARD, [])).toStrictEqual([]);
  });

  it("draws from a pool of one without spending more than a pool of many", () => {
    // A 1-item pool still costs its word (rng.ts `pick`), so adding a second
    // room to a depth later does not shift everything downstream.
    const [set, after] = drawDoors({ seed: 7, draws: 0 }, THREE, ["room:only"]) as [
      doors.DrawnDoor[],
      RngState,
    ];
    expect(roomsOf(set)).toStrictEqual(["room:only", "room:only", "room:only"]);
    expect(after.draws).toBe(3);
  });
});

describe("D002 · looking is free", () => {
  it("shows the doors without advancing anything", () => {
    // The free tap "never advances, costs, or harms" (DESIGN §the descent).
    const run = runAt(openPush({ seed: 42, draws: 0 }));
    const before = JSON.parse(JSON.stringify(run)) as unknown;
    sensed(run, CARD, POOL);
    sensed(run, CARD, POOL);
    expect(JSON.parse(JSON.stringify(run))).toStrictEqual(before);
  });

  it("answers the same set twice, and the same set the walk will use", () => {
    // The room a player was SHOWN is the room a player GETS: both derive from
    // the same unadvanced position.
    const run = runAt(openPush({ seed: 42, draws: 0 }));
    const shown = sensed(run, CARD, WIDE);
    expect(sensed(run, CARD, WIDE)).toStrictEqual(shown);
    for (const d of shown) {
      expect(descend(run, CARD, d.id, WIDE)?.roomId).toBe(d.room);
    }
  });
});

describe("D002 · doors redraw off the death count", () => {
  /** A push's doors, from the two numbers that name a run: seed and deaths.
   *  This is the derivation the lifecycle performs — `runStream` mixes the
   *  death count into the root, and the push's stream forks off that root. */
  const redrawsOnDeath = (seed: number, deaths: number): readonly Id[] =>
    roomsOf(sensed(runAt(openPush(runStream(seed, deaths))), CARD, WIDE));

  it("draws a different labyrinth after each death, from the same campaign seed", () => {
    const before = redrawsOnDeath(42, 0);
    for (const deaths of [1, 2, 3, 4, 5]) {
      expect(redrawsOnDeath(42, deaths), `deaths=${deaths}`).not.toStrictEqual(before);
    }
    // And five deaths are five different labyrinths, not one alternate.
    const walks = [0, 1, 2, 3, 4, 5].map((deaths) => redrawsOnDeath(42, deaths).join());
    expect(new Set(walks).size).toBe(6);
  });

  it("redraws without any redraw code — it is the seed, not a shuffle", () => {
    // The only input that changed is the death count. Nothing in doors.ts reads
    // it; it reached the draw through `runStream` and `fork` alone.
    expect(redrawsOnDeath(42, 0)).toStrictEqual(redrawsOnDeath(42, 0));
    expect(redrawsOnDeath(42, 1)).toStrictEqual(redrawsOnDeath(42, 1));
  });

  it("is seed-sensitive too: two campaigns are two labyrinths", () => {
    expect(redrawsOnDeath(1, 0)).not.toStrictEqual(redrawsOnDeath(2, 0));
  });
});

describe("D002 · the walk survives a save", () => {
  it("round-trips the run through the envelope, mid-push, and resumes identically", () => {
    // A stream's whole position is `{seed, draws}` on the state (rng.ts), which
    // is what lets a push be closed and resumed. Prove it end to end: walk,
    // save, load, and walk on — the continuation must match the one that never
    // stopped.
    const state = newRun(42, BUNDLE);
    let run = descend(state.run, CARD, "door:ahead", WIDE) as RunBranch;
    run = descend(run, CARD, "door:left", WIDE) as RunBranch;

    const resumed = load(save({ ...state, run }));
    expect(resumed).not.toBeNull();
    expect(resumed?.run.descent).toStrictEqual(run.descent);

    const kept = descend(run, CARD, "door:right", WIDE);
    const reloaded = descend((resumed as { run: RunBranch }).run, CARD, "door:right", WIDE);
    expect(reloaded).toStrictEqual(kept);
  });
});
