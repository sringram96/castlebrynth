/// <reference types="vite/client" />
// D004 — the authored content, walked. The skeleton's definition of walkable.
//
// This file is in `src/` and therefore inside `npm run law` (`vitest run src`),
// which is deliberate: content/ is checked by scripts/content-lint.mjs at the
// same gate, and a claim about the content that only a hand-run acceptance file
// makes is a claim that goes stale. The acceptance files in tests/ are outside
// the gate on purpose (H000 is red until its deps land); these assertions are
// not, so they are kept where the gate can see them.
//
// ── what is asserted here and nowhere else ───────────────────────────────────
//
// Everything a single card can answer belongs to `loadRoom` and is already
// enforced at LOAD; nothing here re-checks it. What is left over is exactly the
// set of claims that need MORE THAN ONE FILE, which is the set cards.ts names
// as deferred ("what is NOT checked"):
//
//   · the Crossing exists, and it has the three beats the room is for;
//   · the pool has one of each kind of room the skeleton needs;
//   · a gate keyed on an item is SATISFIABLE — the item is given by a card, and
//     by a different card, so the key sits a room earlier and not in the lock;
//   · the loop actually WALKS: resolution emits `goto`, doors.ts binds it to a
//     room of the pool, and the descent goes on doing that without stalling.
//
// The last one is the task's DONE WHEN, standing in for a play harness that
// does not exist yet (H008). It is a real walk — `resolve` for the act,
// `descend` for the door, off one seeded stream — and not a graph traversal
// over the YAML, because a graph is a claim about a picture and this is a claim
// about the engine.
//
// ── what is NOT asserted here ────────────────────────────────────────────────
//
//   the pool's shape    which rooms a depth draws is the bundle's, and
//                       `ContentBundle` (types.ts) declares only `version` and
//                       `start` — there is no authored depth pool to read yet
//                       (compile.ts, "start / depth"). The walk below builds its
//                       own pool out of the compiled rooms and says so.
//   starting bars       `freshRun` opens every pool at zero on purpose:
//                       "starting HP, Might and Will are balance, balance is
//                       content" (api.ts) — and no field of `ContentBundle`
//                       carries them, so no card can author them yet. The walk
//                       does not read a bar; the fight tests choose one.
//   prose and tier      scanning a line against its tier and against the banned
//                       words (DESIGN §world & voice) wants a prose pass, and it
//                       is out of skeleton scope (content-lint.mjs says so too).

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import { compileRooms } from "./compile";
import { descend, sensed } from "./doors";
import { newRun } from "./api";
import { resolve } from "./resolve";
import type { RoomCard, Response } from "./cards";
import type { Effect, GameState, Id } from "./types";
import { loadManifest } from "../lots/manifest";
import { compileFoes, foeOf } from "../lots/foes";
import { openFight } from "../lots/turn";

// Every authored file, found rather than listed: a room added to the pool is
// covered by this file the moment it exists, and a room deleted takes its
// assertions with it.
const load = (glob: Record<string, string>, prefix: string) =>
  Object.entries(glob)
    .map(([path, text]) => ({ file: `${prefix}/${path.split("/").pop() ?? path}`, text }))
    .sort((a, b) => (a.file < b.file ? -1 : 1));

const ROOM_SOURCES = load(
  import.meta.glob("../../content/rooms/*.yaml", { query: "?raw", import: "default", eager: true }),
  "content/rooms",
);
const FOE_SOURCES = load(
  import.meta.glob("../../content/foes/*.yaml", { query: "?raw", import: "default", eager: true }),
  "content/foes",
);

const compiled = compileRooms(ROOM_SOURCES);
if (!compiled.ok) throw new Error(compiled.problems.map((p) => `${p.file}: ${p.path}`).join(" | "));
const ROOMS = compiled.rooms;

const compiledFoes = compileFoes(FOE_SOURCES);
if (!compiledFoes.ok) throw new Error("foe cards do not compile");
const FOES = compiledFoes.foes;

const manifestResult = loadManifest("grammar.yaml", parse(grammarSource));
if (!manifestResult.ok) throw new Error("grammar.yaml does not load");
const MANIFEST = manifestResult.manifest;

const CROSSING = "room:the-crossing";
/** The four-room pool the Crossing opens on. The Crossing is not in it: it is
 *  where a push starts and where a death returns you, not a room you draw. */
const POOL: readonly Id[] = Object.keys(ROOMS).filter((id) => id !== CROSSING);

const card = (id: Id): RoomCard => {
  const found = ROOMS[id];
  if (found === undefined) throw new Error(`no room "${id}"`);
  return found;
};

/** Every response of every action of every object, with where it was written. */
interface Written {
  readonly room: Id;
  readonly object: Id;
  readonly action: Id;
  readonly index: number;
  readonly response: Response;
}

function* responses(room: RoomCard): Generator<Written> {
  for (const [object, declared] of Object.entries(room.objects)) {
    for (const [action, list] of Object.entries(declared.actions ?? {})) {
      for (const [index, response] of list.entries()) {
        yield { room: room.id, object, action, index, response };
      }
    }
  }
}

const allResponses = () => Object.values(ROOMS).flatMap((room) => [...responses(room)]);

/** One act, against the room it is written in. */
const act = (state: GameState, object: Id, action: Id) =>
  resolve(state, card(state.run.roomId ?? ""), { object, action });

/** What an act said. `Effect` is a closed union (types.ts) and only one kind of
 *  it carries prose, so the lines are filtered rather than indexed. */
const said = (result: { effects: readonly Effect[] }): readonly string[] =>
  result.effects.flatMap((effect) => (effect.kind === "say" ? [effect.text] : []));

const start = (seed: number): GameState => newRun(seed, { version: 1, start: CROSSING });

// ──────────────────────────────────────────────────── 1 · the Crossing ──

describe("D004 · the Crossing", () => {
  it("is authored, and it is where a push opens", () => {
    expect(Object.keys(ROOMS)).toContain(CROSSING);
    expect(start(1).run.roomId).toBe(CROSSING);
    expect(start(1).run.depth).toBe(0);
  });

  it("wakes you: the standing line is the first thing over the art", () => {
    // DESIGN §frame allows 1-2 lines, which is about 44 characters to the line.
    expect(card(CROSSING).line).toMatch(/wake/i);
    expect(card(CROSSING).line.length).toBeLessThanOrEqual(88);
  });

  it("offers a plain signature choice, and never confirms which was yours", () => {
    const state = start(2);
    // "one of these was yours" — never confirmed (DESIGN §the lots). The free
    // tap says what is there; the peer says that nothing says which.
    expect(card(CROSSING).objects["bones"]?.tap).toBeDefined();
    expect(said(act(state, "bones", "peer"))[0]).toMatch(/nothing says which/i);

    const taken = act(state, "bones", "take");
    // The choice is recorded on the CAMPAIGN ledger, because a die survives
    // death — "DICE SURVIVE DEATH — law" (DESIGN §ledgers). Which is all a card
    // can do: no delta word writes `CampaignBranch.signature`, and inventing
    // one is its own Asana task (see the header of the room card).
    expect(taken.state.campaign.knowledge).toContain("knowledge:a-bone-was-taken");
    expect(taken.state.run.flags).toContain("flag:bone-taken");
    // Taken once. The second take says so and writes nothing.
    const again = act(taken.state, "bones", "take");
    expect(again.state.campaign.journal).toEqual(taken.state.campaign.journal);
  });

  it("offers the way down, and every door it senses is walked", () => {
    const walked = new Set(
      [...responses(card(CROSSING))].flatMap((r) => (r.response.goto === undefined ? [] : [r.response.goto])),
    );
    expect([...walked].sort()).toEqual(card(CROSSING).doors.map((d) => d.id).sort());
    expect(act(start(3), "stair", "go").emissions).toEqual([
      { kind: "goto", door: "door:the-long-stair" },
    ]);
  });
});

// ──────────────────────────────────────────── 2 · the four-room pool ──

describe("D004 · the pool has one of each", () => {
  it("draws from four rooms beside the Crossing", () => {
    expect(POOL.length).toBeGreaterThanOrEqual(4);
  });

  it("has a room that opens a fight, and the enemy it names exists", () => {
    const fights = allResponses().filter((r) => r.response.fight !== undefined);
    expect(fights.length).toBeGreaterThanOrEqual(1);
    for (const { response } of fights) {
      const enemy = response.fight as Id;
      // Both halves: the grammar's pursuit, the card's body and intents.
      expect(MANIFEST.enemies[enemy]).toBeDefined();
      const foe = foeOf(MANIFEST, FOES[enemy] ?? { id: enemy, hp: 0, intents: [] });
      expect(foe?.hp).toBeGreaterThan(0);
      expect(foe?.intents.length).toBeGreaterThan(0);
    }
  });

  it("has a room whose door is gated on an item", () => {
    const gated = allResponses().filter((r) => (r.response.if?.items ?? []).length > 0);
    expect(gated.length).toBeGreaterThanOrEqual(1);
  });

  it("has a room that gives nothing at all — the empty one", () => {
    const empty = Object.values(ROOMS).filter((room) =>
      [...responses(room)].every(
        (r) =>
          r.response.give === undefined &&
          r.response.adjust === undefined &&
          r.response.fight === undefined,
      ),
    );
    expect(empty.map((room) => room.id)).toContain("room:the-swept-cell");
  });
});

// ────────────────────────────────── 3 · the key sits one room earlier ──

describe("D004 · the gate is satisfiable, and the key is not in the lock", () => {
  it("every item a gate asks for is given by some card in the pool", () => {
    const given = new Map<Id, Id>();
    for (const room of Object.values(ROOMS)) {
      for (const { response } of responses(room)) {
        for (const item of response.give ?? []) given.set(item.id, room.id);
      }
    }
    const gates = allResponses().flatMap((written) =>
      (written.response.if?.items ?? []).map((item) => ({ item, room: written.room })),
    );
    expect(gates.length).toBeGreaterThanOrEqual(1);
    for (const gate of gates) {
      // Reachable at all…
      expect(given.get(gate.item)).toBeDefined();
      // …and reachable BEFORE the lock: a key given in the room it opens is a
      // gate that gates nothing (DESIGN §content laws: gates satisfiable).
      expect(given.get(gate.item)).not.toBe(gate.room);
    }
  });

  it("the grate refuses without the tally, and remembers being asked", () => {
    let state = start(4);
    state = { ...state, run: { ...state.run, roomId: "room:the-cistern-head" } };
    const refused = act(state, "grate", "lift");
    expect(refused.state.campaign.refused).toHaveLength(1);
    expect(refused.state.run.flags).not.toContain("flag:grate-open");
    // A refusal carries no delta but its line.
    expect(refused.state.campaign.journal).toHaveLength(0);
    expect(refused.emissions).toEqual([]);
  });

  it("the tally is taken a room earlier, and then the grate opens", () => {
    let state = start(5);
    state = { ...state, run: { ...state.run, roomId: "room:the-lamp-corridor" } };
    state = act(state, "lamplighter", "speak").state; // the weather
    state = act(state, "lamplighter", "speak").state; // the tally
    expect(state.run.pouch.consumables.map((i) => i.id)).toContain("item:brass-tally");
    // …and it is marked so death cannot take it (DESIGN §ledgers).
    expect(state.run.pouch.consumables.find((i) => i.id === "item:brass-tally")?.keep).toBe("key");
    // Taken once, however many times you ask.
    const asked = act(state, "lamplighter", "speak").state;
    expect(asked.run.pouch.consumables).toEqual(state.run.pouch.consumables);

    state = { ...asked, run: { ...asked.run, roomId: "room:the-cistern-head" } };
    const opened = act(state, "grate", "lift");
    expect(opened.state.run.flags).toContain("flag:grate-open");
    expect(opened.state.campaign.refused).toHaveLength(0);
    // Opening it is not going down it: those are two acts, and what stands on
    // the far side is met between them. This file asserts only that they are
    // two and that the door is still there at the end of it — the threshold
    // itself is D005's and is asserted in src/lots/boss.test.ts.
    expect(opened.emissions.some((e) => e.kind === "goto")).toBe(false);
    const down = act(opened.state, "grate", "go");
    expect(down.emissions.some((e) => e.kind === "goto")).toBe(false);
    expect(act(down.state, "grate", "go").emissions).toEqual([
      { kind: "goto", door: "door:the-grate" },
    ]);
  });
});

// ─────────────────────────────────────────────── 4 · the loop walks ──

describe("D004 · the loop is walkable", () => {
  /** One push: take the first door the room offers for free, twelve times.
   *
   *  "For free" is the whole point of the filter — the walk takes only UNGATED
   *  ways on, so it never carries a key or a flag from a previous room and every
   *  step is a step a player who did nothing but leave could take. A pool where
   *  some room's only exit were gated would stall this walk, which is the
   *  softlock DESIGN §content laws forbids.
   *
   *  `resolve` for the act, `descend` for the door — the engine, not a graph. */
  function walk(seed: number, steps: number) {
    let state = start(seed);
    const visited: Id[] = [];
    for (let step = 0; step < steps; step += 1) {
      const here = card(state.run.roomId ?? "");
      const way = [...responses(here)].find(
        (r) => r.response.goto !== undefined && r.response.if === undefined,
      );
      expect(way, `${here.id} offers no ungated way on`).toBeDefined();
      const done = act(state, way?.object ?? "", way?.action ?? "");
      // Every act says exactly one line, whatever else it carries.
      expect(done.effects).toHaveLength(1);
      const door = done.emissions.find((e) => e.kind === "goto")?.door as Id;
      const run = descend(done.state.run, here, door, POOL);
      expect(run, `${here.id} could not descend through ${door}`).not.toBeNull();
      state = { ...done.state, run: run ?? done.state.run };
      visited.push(state.run.roomId ?? "");
    }
    return { state, visited };
  }

  it("descends twelve rooms without stalling, and only ever downward", () => {
    const { state, visited } = walk(7, 12);
    expect(state.run.depth).toBe(12);
    expect(visited).toHaveLength(12);
    for (const room of visited) expect(POOL).toContain(room);
  });

  it("replays exactly from the same seed, and differs from another", () => {
    expect(JSON.stringify(walk(8, 10))).toBe(JSON.stringify(walk(8, 10)));
    expect(JSON.stringify(walk(8, 10))).not.toBe(JSON.stringify(walk(9, 10)));
  });

  it("senses every door before it opens one, and the set is what it gets", () => {
    const state = start(10);
    const here = card(CROSSING);
    const doors = sensed(state.run, here, POOL);
    expect(doors).toHaveLength(here.doors.length);
    for (const door of doors) {
      expect(door.sense.length).toBeGreaterThan(0);
      expect(POOL).toContain(door.room);
    }
    // Looking is free, and looking twice is free too.
    expect(sensed(state.run, here, POOL)).toEqual(doors);
    // …and the room you were shown is the room you get.
    const taken = descend(state.run, here, doors[0]?.id ?? "", POOL);
    expect(taken?.roomId).toBe(doors[0]?.room);
  });

  it("the fight room opens a fight the Lots will actually take", () => {
    let state = start(11);
    state = { ...state, run: { ...state.run, roomId: "room:the-drying-room" } };
    const pulled = act(state, "racks", "pull");
    expect(pulled.emissions).toContainEqual({ kind: "fight", enemy: "tallow-thing" });

    const foe = foeOf(MANIFEST, FOES["tallow-thing"] as never);
    expect(foe).not.toBeNull();
    const hand = ["bone", "bone", "bone", "bone", "bone", "bone"];
    const fight = openFight(MANIFEST, { seed: 11, draws: 0 }, foe as never, hand, 20);
    // The intent shows BEFORE you roll, and it is the card's first one.
    expect(fight.intent).toBe(FOES["tallow-thing"]?.intents[0]);
    expect(fight.roll).toBeNull();

    // Once woken, it does not wake again: a flag is a one-shot of the push.
    expect(act(pulled.state, "racks", "pull").emissions).toEqual([]);
  });
});
