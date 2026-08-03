// castlebrynth · the doors — where a room's declared exits lead, and going.
//
// "FORWARD-ONLY. No backtracking within a push ... Doors are the map: the next
// 2–3 doors appear as sensed descriptions (light, sound, smell). No map screen,
// ever" (DESIGN §the descent). This card is the whole of that: what is behind
// each door of the room you are standing in, and the one transition that goes
// through one.
//
// src/core is pure: no DOM, no I/O, no Date, no Math.random, no console. The
// pool of rooms a depth may draw is passed IN — which pool a room belongs to is
// the bundle's (compile.ts), and this file reads no files, exactly as
// resolve.ts is handed its card rather than looking one up.
//
// ─────────────────────────────────────────────── the sense is authored, the room is drawn ──
//
// A `Door` (cards.ts) is an id and a SENSE LINE, and it has no field naming
// where it goes. That split is the design: an author writes what reaches you
// through the door — light, sound, smell — and the labyrinth decides what is
// actually there, per push. "Rooms draw fresh per push from an authored pool"
// (DESIGN §the descent).
//
// ─────────────────────────────────────────────────────── the stream is threaded, never re-forked ──
//
// EVERY DRAW HERE COMES OFF `run.descent`, AND WRITES ITS SUCCESSOR BACK.
//
// This is the one mistake this card exists to not make. `fork(parent, name)`
// reads the parent's SEED and deliberately never its `draws` (rng.ts), so a
// fork is FRESH AT DRAW 0 every time. That property is what makes the tree of
// streams reproducible — and it is also a trap with teeth: a `descend` that
// said `fork(run.rng, STREAM.descent)` at each traversal would re-open the same
// stream at the same position on every push through a door, and every door at
// every depth would open on the same room, forever, in every seed.
//
// So the stream is state (D001 put it on `RunBranch.descent`), and this file
// threads it exactly the way everything else in this engine threads a value:
// read the position, draw, hand the successor back to the caller as part of the
// new state. Nothing here forks anything.
//
// `openPush` is the ONE fork, and it is not a draw: it is how a push's stream is
// minted from the run's root at the start of a push, once.
//
// ───────────────────────────────────────────────────── doors redraw off the death count ──
//
// DESIGN §ledgers: "Death wakes you at the Crossing, bars and uses restored;
// doors redraw". There is no redraw code here, and there must not be: a run's
// root stream is already `runStream(seed, deaths)` (rng.ts), the death count is
// mixed into its seed, and this push's descent stream forks off that root. So a
// rebirth draws a different labyrinth because it is a different stream, not
// because anything asked it to shuffle. Redraw-on-death is a CONSEQUENCE of
// `run = seed + death count + inputs, exactly` (.llm/rules/engine.md), and
// `redrawsOnDeath` in doors.test.ts asserts it end to end.
//
// ─────────────────────────────────────────────────────────── the fixed draw order ──
//
// One `pick` over the pool per door, in the room's DECLARATION order, first
// door first. Draw order is part of the save format (rng.ts): reversing this
// loop, or drawing only for the door taken, changes every seed's labyrinth. It
// is frozen, and doors.test.ts asserts the cost in words.
//
// WHY EVERY DOOR DRAWS, AND NOT JUST THE ONE TAKEN. Because the choice has to
// mean something. If a traversal drew one room, all three doors would open on
// the same room and "doors are the map" would be a map with one road on it
// (cards.ts `Doors` makes the same argument for the floor of 2). Drawing the
// whole set makes the destinations a pure function of the stream's POSITION —
// fixed before the choice is made, distinct per door — so choosing is choosing
// between rooms, and `sensed` can show the set without advancing anything.
//
// ───────────────────────────────────────────────────── deliberately absent ──
//
//   no backtracking    there is no function here that lowers `depth` or returns
//                      a room you have left. Forward-only is not a check this
//                      card performs; it is a transition this card does not
//                      have (resolve.ts: "there is no word for going back").
//   no landmarks       "landmarks fixed per depth" and "exactly one notable-die
//   no notable die     event per depth" (DESIGN §the descent) are deferred past
//                      H180 by the skeleton directive, and both are draws — so
//                      they will take their place in the order above, and that
//                      is a save-breaking change made loudly when it lands.
//   no gate proof      whether a clue-locked gate is satisfiable within a push
//                      is a graph pass over content, not a draw over a pool.
//   no pool authoring  which rooms are in a depth's pool is the bundle's.

import { STREAM, fork, pick } from "./rng";
import type { Doors, RoomCard } from "./cards";
import type { Draw } from "./rng";
import type { Id, RngState, RunBranch } from "./types";

/**
 * A door, and what this push put behind it.
 *
 * `id` and `sense` are the author's, copied off the card; `room` is the draw's.
 * The sense line rides along because it is the whole of what a player chooses
 * with — there is no map screen, ever (DESIGN §the descent).
 */
export interface DrawnDoor {
  readonly id: Id;
  /** Light, sound, smell. Authored, never drawn. */
  readonly sense: string;
  /** The room this door opens on, drawn from the depth's pool. */
  readonly room: Id;
}

/**
 * Mint a push's Descent stream from the run's root. The ONE fork in this card.
 *
 * Called once when a push begins — by whoever mints the run branch (api.ts
 * `freshRun`, and rebirth after it) — and never again. Everything after it
 * threads `RunBranch.descent`.
 *
 * Exported so that the derivation has exactly one spelling: two call sites
 * forking under two different names would silently give a run two labyrinths.
 */
export function openPush(root: RngState): RngState {
  return fork(root, STREAM.descent);
}

/**
 * What is behind each door of this room, and the stream that comes after.
 *
 * PURE and TOTAL. It draws — so the successor must be threaded by the caller —
 * but it does not touch a state, which is what lets `sensed` below show the
 * same set to the free tap without advancing anything.
 *
 * An EMPTY POOL answers null rather than throwing. `pick` throws on an empty
 * pool deliberately (rng.ts: an exhausted pool is a content decision, not a
 * random one), and that is right at its level and wrong at this one — nothing
 * fails at play (.llm/rules/engine.md). A depth with no rooms in it is a
 * content bug that a bundle-level check should refuse at LOAD; here it is a
 * push that cannot go on, said quietly.
 */
export function drawDoors(
  descent: RngState,
  doors: Doors,
  pool: readonly Id[],
): Draw<readonly DrawnDoor[]> | null {
  if (pool.length === 0) return null;
  const drawn: DrawnDoor[] = [];
  let stream = descent;
  // Declaration order, first door first. Frozen — see the header.
  for (const door of doors) {
    const [room, after] = pick(stream, pool);
    stream = after;
    drawn.push({ id: door.id, sense: door.sense, room });
  }
  return [drawn, stream];
}

/**
 * The doors as they are sensed from where you stand, WITHOUT advancing anything.
 *
 * The free tap "describes, selects, surfaces actions; never advances, costs, or
 * harms" (DESIGN §the descent), so the picture of the doors must be derivable
 * from the state alone. It is: the destinations are a pure function of the
 * stream's position, and this function reads that position and throws the
 * successor away.
 *
 * Which means showing the doors and then walking through one draws the SAME
 * set — `descend` re-derives it off the same unadvanced `run.descent` — so the
 * room a player was shown is the room a player gets. Looking is free, and
 * looking twice is free too.
 */
export function sensed(run: RunBranch, card: RoomCard, pool: readonly Id[]): readonly DrawnDoor[] {
  const drawn = drawDoors(run.descent, card.doors, pool);
  return drawn === null ? [] : drawn[0];
}

/**
 * Go through a door. The only transition this card has, and it only goes down.
 *
 * FORWARD-ONLY, three ways at once: `depth` is raised and never lowered, the
 * room is drawn from the next pool rather than recalled, and there is no
 * counterpart function. Backtracking is not refused here — it is absent.
 *
 * DECLARED DOORS ONLY. `door` must be one of `card.doors`; anything else
 * answers null. resolve.ts already emits `goto` only for a word the loader
 * checked against the room's own declaration (content-lint refuses an
 * undeclared `goto` at LOAD), so this is the same law said at the other end,
 * and it is a null rather than a throw because nothing fails at play.
 *
 * The stream advances by exactly one door-set — the whole set is drawn, the
 * chosen one is kept — so a replay of the same inputs walks the same rooms.
 * `run.flags` are NOT cleared: a flag is a one-shot of the PUSH, not of the
 * room (types.ts `RunBranch.flags`), and clearing them here would silently
 * re-arm every ambush already sprung.
 */
export function descend(
  run: RunBranch,
  card: RoomCard,
  door: Id,
  pool: readonly Id[],
): RunBranch | null {
  const drawn = drawDoors(run.descent, card.doors, pool);
  if (drawn === null) return null;
  const [doors, after] = drawn;
  const taken = doors.find((candidate) => candidate.id === door);
  if (taken === undefined) return null;
  return { ...run, descent: after, depth: run.depth + 1, roomId: taken.room };
}
