// castlebrynth · the room card schema — the language every room is written in.
//
// A room card is authored data (YAML), parsed by the shell and handed to
// `loadRoom` as `unknown`. This file is the whole of what a room may say:
// the types are the shape, the word tables are the vocabulary, and the loader
// is the door — unknown words fail at LOAD (.llm/rules/engine.md), by name and
// by key path, so a content author can fix a card without reading engine code.
//
// src/core is pure: no DOM, no I/O, no Date, no Math.random, no console. The
// loader therefore never reads a file; it is handed the parsed data and the
// file's name, and the name exists only so an error can say where.
//
// ─────────────────────────────────────────── DESIGN, clause by clause ──
//
// §the descent
//   "Tap is free, always — describes, selects, surfaces actions; never
//    advances, costs, or harms."
//        → `RoomObject.tap` is a REQUIRED string and the only place a free
//          tap can put anything. It is a line, not a response: there is no
//          slot on it for a gate or a delta, so a tap structurally cannot
//          advance, cost, or harm. Omitting it is a compile error.
//   "Named investigation actions (PEER, LISTEN, REACH IN) carry the risk."
//        → `RoomObject.actions` — authored ids mapping to response lists.
//          Only a response carries deltas; only a response can `harm`.
//   "FORWARD-ONLY."
//        → the only movement word is `goto`, and it names a DOOR of the
//          current room. There is no word for the room you came from.
//   "knowledge ratchets cross-push (refusals + clues pay off on later
//    meetings). A clue-locked gate ... is marked cross_push."
//        → `learn` (campaign knowledge), `refuse`, and `Gate.knows` with
//          `Gate.crossPush` as the author's declaration that this gate's
//          clue may come from an earlier push.
//   "Doors are the map: the next 2-3 doors appear as sensed descriptions
//    (light, sound, smell). No map screen, ever."
//        → `RoomCard.doors`: a declared door is an id and a sense line, both
//          required, 1 to 3 of them (see `Doors`). A door has no destination
//          field here — nothing in a room card names another room.
//
// §content laws
//   "Affordance permanence (tappability never toggles; adds/removes carry
//    a cause)"
//        → there is no `tappable` flag anywhere in this file to toggle:
//          presence IS tappability (types.ts `ViewObject`). Adds and removes
//          are `reveal` and `remove`, and `ObjectChange.cause` is required.
//   "no softlocks (always a path to exit, death, or the Crossing)"
//        → every response list ends in an UNGATED fallback, enforced by the
//          `Responses` tuple: a list that ends on a gate does not compile
//          and does not load. A tap can therefore never fall through to
//          nothing. A room also declares at least one door.
//   "journal records acts, never morals"
//        → `journal` is a line, written by the author. Whether it moralises
//          is a prose question, and prose is the content lint's lane.
//   "spoiler containment by tier"
//        → `RoomCard.tier` is declared and closed to T0..T3. SCANNING the
//          prose against the tier is the content lint's job; this card gives
//          it the tier to scan against.
//
// ─────────────────────────────────────────────────── deliberately absent ──
//
// The vocabulary below is the whole language and it is CLOSED. A new word is
// its own Asana task, never a side effect (.llm/rules/engine.md). Named here
// so their absence reads as a decision rather than an oversight:
//
//   tithes / prices   No word spends or grants ◎. DESIGN §the descent prices
//                     events ("guarded, priced, or bargained"), but a spend
//                     word without an affordability GATE lets content charge
//                     a player into the negative, and the gate keys are
//                     flags, items and knowledge. The delta and the gate must
//                     land together, on one card.
//   might/will/sanity No Descent clause moves them. `harm` covers "carry the
//                     risk" and "telegraphed harm"; the rest is resolution.
//   take (items)      Nothing in §the descent or §content laws removes an
//                     item from the pouch. It arrives with the spend economy.
//   QTEs              "QTEs are their own category" (DESIGN §the descent) —
//                     their own category, and their own card.
//   events            "exactly one notable-die event per depth" is a property
//                     of a DEPTH, not of a room card; it is countable only
//                     across the pool.
//   depth / landmark  Which pool a room is drawn into is the bundle's shape,
//                     and the bundle is H004's compiler. A card that also
//                     declared its depth would be a second source of truth.
//
// ────────────────────────────────────────────────────── what is NOT checked ──
//
// A ratified board ruling (H005's decision record, 2026-08-02) binds the
// loader's reach: rooms DECLARE their doors, `goto` must name a declared door
// of the CURRENT room, declaration-presence is checked HERE, and cross-room
// graph validation is DEFERRED to D002, which binds doors at draw time. So
// this loader never asks where a door leads, whether a gate's key is
// reachable, whether the graph is acyclic, or whether a depth's rooms add up.
// Every check below is answerable from one card alone.
//
// Resolution — applying a delta to a state — is H006. Nothing here resolves.

import type { Id, ItemRef, Keep } from "./types";

// ─────────────────────────────────────────────────────────────────── tiers ──

/** Knowledge tiers (DESIGN §world & voice). A card declares one and stays
 *  inside it; the prose scan that holds it there is the content lint's. */
export type Tier = "T0" | "T1" | "T2" | "T3";

// ─────────────────────────────────────────────────────────────────── gates ──

/**
 * What must hold for a response to answer. ALL listed conditions must hold,
 * and the lists are AND: `{ flags: [a, b] }` means both.
 *
 * Three keys, and each one is a ledger that already exists in types.ts:
 * `flags` are this push's one-shots (RunBranch.flags), `items` are what is in
 * the pouch, `knows` is campaign knowledge — "Machine-readable understanding:
 * what gates may now open" (types.ts CampaignBranch.knowledge).
 *
 * A gate with no condition in it is not a gate; the loader says so. The type
 * cannot: every key is optional, because any one of them may be the only one.
 */
export interface Gate {
  /** One-shots for this push (types.ts RunBranch.flags). */
  readonly flags?: readonly Id[];
  /** In the pouch, by item id. */
  readonly items?: readonly Id[];
  /** Campaign knowledge — it survives death, so it ratchets cross-push. */
  readonly knows?: readonly Id[];
  /**
   * The author's declaration that this gate's clue is NOT promised inside
   * this push: it "pays off on a later meeting" (DESIGN §the descent, which
   * spells this marker `cross_push`). Unmarked clue-locked gates are the ones
   * a graph pass must prove satisfiable in-push — and that pass is D002's,
   * not this loader's.
   */
  readonly crossPush?: true;
}

// ────────────────────────────────────────────────────────────────── deltas ──

/**
 * An affordance appearing or leaving, with the reason it did.
 *
 * DESIGN §content laws: "adds/removes carry a cause". The cause is required,
 * and it is diegetic — the thing in the room that did it, in the room's own
 * words, so a reader of the card can see why the labyrinth changed shape.
 */
export interface ObjectChange {
  /** An object DECLARED in this same room. Nothing here reaches another room. */
  readonly object: Id;
  readonly cause: string;
}

/**
 * The delta words: everything a response may apply. CLOSED — a word absent
 * from this list does not exist, and `loadRoom` rejects it by name.
 *
 * `say` is required. A response that applies nothing still speaks, because a
 * tap that produces no line is a tap that appears to have done nothing
 * (DESIGN §frame: 1-2 lines of writing on top; types.ts `Effect` kind "say").
 */
export interface Deltas {
  /** The line this response writes. Always present. */
  readonly say: string;
  /** Raise these run flags: doors opened, ambushes sprung. This push only. */
  readonly set?: readonly Id[];
  /** Add to campaign knowledge. Death cannot take it; it ratchets cross-push. */
  readonly learn?: readonly Id[];
  /** One line for the journal. Records the act (DESIGN §content laws). */
  readonly journal?: string;
  /**
   * The labyrinth says no, and remembers being asked (types.ts `Refusal`,
   * CampaignBranch.refused). A refusal carries no other delta than its line:
   * a refusal that also gives, teaches or moves you was not a refusal.
   */
  readonly refuse?: true;
  /** Put items in the pouch. The author marks each one's `keep`. */
  readonly give?: readonly ItemRef[];
  /** HP taken, a whole number of it, 1 or more. Telegraph it in the free tap
   *  line first (DESIGN §content laws: "telegraphed harm"). */
  readonly harm?: number;
  /** A latent object of this room becomes present, for a stated cause. */
  readonly reveal?: ObjectChange;
  /** A declared object of this room is gone, for a stated cause. */
  readonly remove?: ObjectChange;
  /** The one doorway into the Lots (DESIGN §the two engines, one doorway).
   *  An enemy id, passed through — the engine never names an enemy. */
  readonly fight?: Id;
  /** Go through a door DECLARED by this room. Forward-only: there is no word
   *  for going back, and a door ref is not a room id. */
  readonly goto?: Id;
}

// ──────────────────────────────────────────────────────────────── responses ──

/** One response: an optional gate, and the deltas it applies. */
export type Response = Deltas & { readonly if?: Gate };

/** A response that competes on its gate. Everything above the fallback. */
export type GatedResponse = Deltas & { readonly if: Gate };

/** The gateless last word. Nothing gates it, so it can always answer. */
export type FallbackResponse = Deltas & { readonly if?: never };

/**
 * An action's responses, read top to bottom: the first whose gate holds
 * answers, and the last one always can.
 *
 * The tuple is the law made structural. Any number of gated responses, then
 * exactly one ungated fallback, last. A list that ends on a gate does not
 * compile — the final element is checked against `{ if?: never }` — and an
 * ungated response anywhere above the end does not compile either, because it
 * would make everything below it unreachable. An empty list does not compile.
 * No softlocks (DESIGN §content laws) is therefore not a comment here.
 */
export type Responses = readonly [...GatedResponse[], FallbackResponse];

// ────────────────────────────────────────────────────────────────── objects ──

/**
 * A thing in the room.
 *
 * There is no `tappable` field, here or in types.ts `ViewObject`: presence IS
 * tappability, so tappability cannot toggle — affordance permanence made
 * structural (DESIGN §content laws).
 */
export interface RoomObject {
  /**
   * The free tap. REQUIRED: an object with no readable line is a compile
   * error, not a lint warning. A string is all it is — the tap has nowhere to
   * put a gate or a delta, so it "never advances, costs, or harms".
   */
  readonly tap: string;
  /**
   * Not present when the room opens; a response `reveal`s it, with a cause.
   * Absent means present from the start.
   *
   * This is not a pixel hunt (DESIGN §content laws): a latent object is not
   * hidden in the art waiting to be found, it is not in the room yet. Only a
   * named action puts it there.
   */
  readonly latent?: true;
  /** Named investigation actions, by authored id: PEER, LISTEN, REACH IN. */
  readonly actions?: { readonly [action: string]: Responses };
}

// ──────────────────────────────────────────────────────────────────── doors ──

/**
 * A door, as the room senses it. Doors are the map (DESIGN §the descent), so
 * the sense line is not decoration — it is the whole of what a player is given
 * to choose with. There is no map screen, ever, and there is no field here
 * naming where the door leads: the draw binds that at draw time (D002).
 */
export interface Door {
  readonly id: Id;
  /** Light, sound, smell — what reaches you through it. Required, non-empty. */
  readonly sense: string;
}

/**
 * 1 to 3 doors, counted by the type.
 *
 * DESIGN §the descent: "the next 2-3 doors appear as sensed descriptions".
 * The upper bound is that sentence. The lower bound is 1 rather than 2 on a
 * judgment call: a room with no door at all is a softlock under §content laws
 * (nothing in this vocabulary ends a push), while 2-3 reads as the shape of a
 * FORK, and a corridor with one way on is not a fork. If the board wants a
 * hard floor of two, this type and the loader's bound are the one-line change.
 */
export type Doors = readonly [Door] | readonly [Door, Door] | readonly [Door, Door, Door];

// ───────────────────────────────────────────────────────────── the room card ──

/** One authored room. The whole of what a room may say. */
export interface RoomCard {
  readonly id: Id;
  /** Declared, and never exceeded by the prose (DESIGN §content laws). */
  readonly tier: Tier;
  /** The full-bleed pixel still this room renders as (types.ts GameView). */
  readonly still: Id;
  /** The standing line, over the art (DESIGN §frame). */
  readonly line: string;
  /** The map, sensed. `goto` may name these and nothing else. */
  readonly doors: Doors;
  /** Keyed by object id. May be empty; presence is tappability. */
  readonly objects: { readonly [object: string]: RoomObject };
}

// ─────────────────────────────────────────────────────────── the word tables ──
//
// Each table is typed by the shape above, so a key added to a type without a
// word here — or a word here with no key — is a compile error. The exported
// arrays keep declaration order, and that order is the vocabulary as a reader
// of an error message meets it.

type KeyTable<T> = { readonly [K in keyof T]-?: true };

const ROOM_KEY_TABLE: KeyTable<RoomCard> = {
  id: true,
  tier: true,
  still: true,
  line: true,
  doors: true,
  objects: true,
};

const DOOR_KEY_TABLE: KeyTable<Door> = {
  id: true,
  sense: true,
};

const OBJECT_KEY_TABLE: KeyTable<RoomObject> = {
  tap: true,
  latent: true,
  actions: true,
};

const GATE_KEY_TABLE: KeyTable<Gate> = {
  flags: true,
  items: true,
  knows: true,
  crossPush: true,
};

const DELTA_KEY_TABLE: KeyTable<Deltas> = {
  say: true,
  set: true,
  learn: true,
  journal: true,
  refuse: true,
  give: true,
  harm: true,
  reveal: true,
  remove: true,
  fight: true,
  goto: true,
};

const RESPONSE_KEY_TABLE: KeyTable<Response> = {
  if: true,
  ...DELTA_KEY_TABLE,
};

const CHANGE_KEY_TABLE: KeyTable<ObjectChange> = {
  object: true,
  cause: true,
};

const ITEM_KEY_TABLE: KeyTable<ItemRef> = {
  id: true,
  keep: true,
};

const TIER_TABLE: KeyTable<Record<Tier, unknown>> = {
  T0: true,
  T1: true,
  T2: true,
  T3: true,
};

const KEEP_TABLE: KeyTable<Record<Keep, unknown>> = {
  none: true,
  kept: true,
  key: true,
};

/** The keys a room card may carry. */
export const ROOM_KEYS = Object.keys(ROOM_KEY_TABLE) as readonly (keyof RoomCard)[];
/** The keys a declared door may carry. */
export const DOOR_KEYS = Object.keys(DOOR_KEY_TABLE) as readonly (keyof Door)[];
/** The keys an object may carry. Note what is not here: no `tappable`. */
export const OBJECT_KEYS = Object.keys(OBJECT_KEY_TABLE) as readonly (keyof RoomObject)[];
/** The gate keys, in order. */
export const GATE_KEYS = Object.keys(GATE_KEY_TABLE) as readonly (keyof Gate)[];
/** The delta words, in order. The whole language a response may apply. */
export const DELTA_WORDS = Object.keys(DELTA_KEY_TABLE) as readonly (keyof Deltas)[];
/** Everything a response may carry: the gate, then the delta words. */
export const RESPONSE_KEYS = Object.keys(RESPONSE_KEY_TABLE) as readonly (keyof Response)[];
/** The knowledge tiers. */
export const TIERS = Object.keys(TIER_TABLE) as readonly Tier[];
/** What death does with an item (types.ts `Keep`). */
export const KEEPS = Object.keys(KEEP_TABLE) as readonly Keep[];

// ────────────────────────────────────────────────────────────────── loading ──

/**
 * One thing wrong with one card, at one key path.
 *
 * `path` is dotted, with `[i]` for list positions —
 * `objects.vat.actions.reach[1].sey` — so an author can find it by reading
 * their own file, never the engine's source.
 */
export interface Problem {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

export type LoadResult =
  | { readonly ok: true; readonly card: RoomCard }
  | { readonly ok: false; readonly problems: readonly Problem[] };

/** `file: path — message`, the form an author reads. */
export function formatProblem(problem: Problem): string {
  return `${problem.file}: ${problem.path === "" ? "(root)" : problem.path} — ${problem.message}`;
}

type Fault = (path: string, message: string) => void;

const at = (path: string, key: string): string => (path === "" ? key : `${path}.${key}`);
const nth = (path: string, index: number): string => `${path}[${index}]`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A word not in the table does not exist. This is the closed language, and
 *  the message carries the whole vocabulary so the fix needs no engine read. */
function closed(
  value: Record<string, unknown>,
  table: Readonly<Record<string, true>>,
  path: string,
  what: string,
  vocabulary: readonly string[],
  fault: Fault,
): void {
  for (const key of Object.keys(value)) {
    if (!Object.prototype.hasOwnProperty.call(table, key)) {
      fault(
        at(path, key),
        `unknown ${what} "${key}" — the ${what} vocabulary is closed: ` +
          `${vocabulary.join(", ")}. A new word is its own Asana task, ` +
          `never a side effect (.llm/rules/engine.md).`,
      );
    }
  }
}

/** A required line of writing: present, a string, and not blank. */
function line(value: unknown, path: string, what: string, fault: Fault): void {
  if (typeof value !== "string" || value.trim() === "") {
    fault(path, `${what} is required, and is a line of writing`);
  }
}

/** A required id: present, a string, not blank. Ids are authored content, so
 *  their SHAPE is checked and their membership is not — the engine only ever
 *  passes an id through (types.ts `Id`). */
function id(value: unknown, path: string, what: string, fault: Fault): void {
  if (typeof value !== "string" || value.trim() === "") {
    fault(path, `${what} is required, and is an id`);
  }
}

/** An optional list of ids. */
function idList(value: unknown, path: string, what: string, fault: Fault): void {
  if (!Array.isArray(value)) {
    fault(path, `${what} is a list of ids`);
    return;
  }
  if (value.length === 0) fault(path, `${what} is empty — leave the word out instead`);
  value.forEach((entry, index) => id(entry, nth(path, index), "an id", fault));
}

function readGate(value: unknown, path: string, fault: Fault): void {
  if (!isRecord(value)) {
    fault(path, "a gate is a map of conditions");
    return;
  }
  closed(value, GATE_KEY_TABLE, path, "gate key", GATE_KEYS, fault);
  for (const key of ["flags", "items", "knows"] as const) {
    if (value[key] !== undefined) idList(value[key], at(path, key), `\`${key}\``, fault);
  }
  if (value["crossPush"] !== undefined && value["crossPush"] !== true) {
    fault(at(path, "crossPush"), "`crossPush` is written only as true, or left out");
  }
  if (value["flags"] === undefined && value["items"] === undefined && value["knows"] === undefined) {
    fault(path, "a gate with no condition in it is not a gate — drop the `if`");
  }
}

function readChange(
  value: unknown,
  path: string,
  word: "reveal" | "remove",
  objects: readonly string[],
  latent: readonly string[],
  fault: Fault,
): void {
  if (!isRecord(value)) {
    fault(path, `\`${word}\` is a map: the object, and the cause it changed`);
    return;
  }
  closed(value, CHANGE_KEY_TABLE, path, "change key", Object.keys(CHANGE_KEY_TABLE), fault);
  id(value["object"], at(path, "object"), "the object that changed", fault);
  line(
    value["cause"],
    at(path, "cause"),
    "`cause` — adds and removes carry a cause (DESIGN §content laws), and this",
    fault,
  );
  const target = value["object"];
  if (typeof target !== "string" || target === "") return;
  if (!objects.includes(target)) {
    fault(
      at(path, "object"),
      `"${target}" is not an object of this room. \`${word}\` reaches only this ` +
        `room's own objects: ${objects.join(", ") || "(none declared)"}.`,
    );
    return;
  }
  if (word === "reveal" && !latent.includes(target)) {
    fault(
      at(path, "object"),
      `"${target}" is already present when the room opens, so revealing it ` +
        `would toggle an affordance. Mark it \`latent: true\` where it is declared.`,
    );
  }
}

function readItems(value: unknown, path: string, fault: Fault): void {
  if (!Array.isArray(value)) {
    fault(path, "`give` is a list of items");
    return;
  }
  if (value.length === 0) fault(path, "`give` is empty — leave the word out instead");
  value.forEach((entry, index) => {
    const where = nth(path, index);
    if (!isRecord(entry)) {
      fault(where, "an item is a map: its id, and what death does with it");
      return;
    }
    closed(entry, ITEM_KEY_TABLE, where, "item key", Object.keys(ITEM_KEY_TABLE), fault);
    id(entry["id"], at(where, "id"), "the item id", fault);
    const keep = entry["keep"];
    if (typeof keep !== "string" || !Object.prototype.hasOwnProperty.call(KEEP_TABLE, keep)) {
      fault(
        at(where, "keep"),
        `unknown keep "${String(keep)}" — one of: ${KEEPS.join(", ")} ` +
          `(none: death takes it; kept: it comes back; key: it comes back).`,
      );
    }
  });
}

function readResponse(
  value: unknown,
  path: string,
  last: boolean,
  doors: readonly string[],
  objects: readonly string[],
  latent: readonly string[],
  fault: Fault,
): void {
  if (!isRecord(value)) {
    fault(path, "a response is a map of words");
    return;
  }
  closed(value, RESPONSE_KEY_TABLE, path, "response word", RESPONSE_KEYS, fault);

  // The fallback law, at load. The tuple type says the same thing to anyone
  // writing a card in TypeScript; authored YAML is not typechecked, so it is
  // said twice on purpose.
  const gated = value["if"] !== undefined;
  if (last && gated) {
    fault(
      at(path, "if"),
      "a response list ends in an UNGATED fallback — otherwise a tap can fall " +
        "through to nothing, and there are no softlocks (DESIGN §content laws)",
    );
  }
  if (!last && !gated) {
    fault(
      path,
      "this response has no gate, so it always answers and everything below it " +
        "is unreachable — only the last response may be ungated",
    );
  }
  if (gated) readGate(value["if"], at(path, "if"), fault);

  line(value["say"], at(path, "say"), "`say` — every response writes a line, and this", fault);

  if (value["set"] !== undefined) idList(value["set"], at(path, "set"), "`set`", fault);
  if (value["learn"] !== undefined) idList(value["learn"], at(path, "learn"), "`learn`", fault);
  if (value["journal"] !== undefined) {
    line(value["journal"], at(path, "journal"), "`journal`, when written,", fault);
  }
  if (value["give"] !== undefined) readItems(value["give"], at(path, "give"), fault);
  if (value["fight"] !== undefined) id(value["fight"], at(path, "fight"), "`fight` — an enemy id", fault);

  if (value["harm"] !== undefined) {
    const harm = value["harm"];
    if (typeof harm !== "number" || !Number.isInteger(harm) || harm < 1) {
      fault(
        at(path, "harm"),
        "`harm` is a whole number of HP, 1 or more — a harm of none is a lie, " +
          "and harm must be telegraphed in the free tap line first",
      );
    }
  }

  if (value["reveal"] !== undefined) {
    readChange(value["reveal"], at(path, "reveal"), "reveal", objects, latent, fault);
  }
  if (value["remove"] !== undefined) {
    readChange(value["remove"], at(path, "remove"), "remove", objects, latent, fault);
  }

  if (value["goto"] !== undefined) {
    const where = at(path, "goto");
    id(value["goto"], where, "`goto` — a door of this room", fault);
    const door = value["goto"];
    if (typeof door === "string" && door !== "" && !doors.includes(door)) {
      fault(
        where,
        `"${door}" is not a door of this room. \`goto\` names a door DECLARED ` +
          `by the room you are standing in: ${doors.join(", ") || "(none declared)"}. ` +
          `Where that door leads is bound at draw time, not here.`,
      );
    }
  }

  if (value["refuse"] !== undefined) {
    if (value["refuse"] !== true) {
      fault(at(path, "refuse"), "`refuse` is written only as true, or left out");
    } else {
      const extra = Object.keys(value).filter((key) => key !== "refuse" && key !== "say" && key !== "if");
      if (extra.length > 0) {
        fault(
          path,
          `a refusal carries no delta but its line; drop ${extra.join(", ")} or ` +
            `drop \`refuse\` (a refusal that gives, teaches or moves you was not one)`,
        );
      }
    }
  }
}

function readResponses(
  value: unknown,
  path: string,
  doors: readonly string[],
  objects: readonly string[],
  latent: readonly string[],
  fault: Fault,
): void {
  if (!Array.isArray(value)) {
    fault(path, "an action is a list of responses, read top to bottom");
    return;
  }
  if (value.length === 0) {
    fault(
      path,
      "an action with no responses answers nothing — a list is one or more " +
        "gated responses, then one ungated fallback",
    );
    return;
  }
  value.forEach((response, index) => {
    readResponse(
      response,
      nth(path, index),
      index === value.length - 1,
      doors,
      objects,
      latent,
      fault,
    );
  });
}

/**
 * Read one authored room card.
 *
 * Never throws — junk in gives problems out, the way `load` in api.ts answers
 * an unreadable save with null rather than an exception. Every problem is
 * reported, not just the first, because an author fixing a file wants the
 * whole list.
 *
 * `file` is used only to name the file in the problems. The loader does no
 * I/O; the shell parses the YAML and hands the data in (src/core is pure).
 */
export function loadRoom(file: string, source: unknown): LoadResult {
  const problems: Problem[] = [];
  const fault: Fault = (path, message) => {
    problems.push({ file, path, message });
  };

  if (!isRecord(source)) {
    fault("", "a room card is a map of keys, and this is not one");
    return { ok: false, problems };
  }

  closed(source, ROOM_KEY_TABLE, "", "room key", ROOM_KEYS, fault);

  id(source["id"], "id", "the room id", fault);
  id(source["still"], "still", "`still` — the pixel still this room renders as", fault);
  line(source["line"], "line", "`line` — the standing line over the art, and this", fault);

  const tier = source["tier"];
  if (typeof tier !== "string" || !Object.prototype.hasOwnProperty.call(TIER_TABLE, tier)) {
    fault(
      "tier",
      `unknown tier "${String(tier)}" — a room declares one of: ${TIERS.join(", ")} ` +
        `(DESIGN §content laws, spoiler containment by tier).`,
    );
  }

  // Doors first: `goto` is checked against them, and only against them.
  const doorIds: string[] = [];
  const doors = source["doors"];
  if (!Array.isArray(doors)) {
    fault("doors", "a room declares its doors as a list — doors are the map (DESIGN §the descent)");
  } else {
    if (doors.length < 1 || doors.length > 3) {
      fault(
        "doors",
        `a room senses 1 to 3 doors, not ${doors.length} — "the next 2-3 doors ` +
          `appear as sensed descriptions" (DESIGN §the descent), and a room with ` +
          `no door at all is a softlock`,
      );
    }
    doors.forEach((door, index) => {
      const where = nth("doors", index);
      if (!isRecord(door)) {
        fault(where, "a door is a map: its id, and the sense of it");
        return;
      }
      closed(door, DOOR_KEY_TABLE, where, "door key", DOOR_KEYS, fault);
      id(door["id"], at(where, "id"), "the door id", fault);
      line(
        door["sense"],
        at(where, "sense"),
        "`sense` — a door is known only by what reaches you through it " +
          "(light, sound, smell), there is no map screen, and this",
        fault,
      );
      const declared = door["id"];
      if (typeof declared === "string" && declared !== "") {
        if (doorIds.includes(declared)) {
          fault(at(where, "id"), `"${declared}" is declared twice in this room`);
        }
        doorIds.push(declared);
      }
    });
  }

  const objects = source["objects"];
  if (!isRecord(objects)) {
    fault("objects", "`objects` is a map of objects, keyed by id — write {} for none");
    return { ok: false, problems };
  }

  // Collect what is declared before reading responses: `reveal` and `remove`
  // reach this room's own objects and nothing else.
  const objectIds = Object.keys(objects);
  const latentIds = objectIds.filter((key) => {
    const object = objects[key];
    return isRecord(object) && object["latent"] === true;
  });

  for (const key of objectIds) {
    const where = at("objects", key);
    const object = objects[key];
    if (key.trim() === "") fault(where, "an object id is not blank");
    if (!isRecord(object)) {
      fault(where, "an object is a map: its free-tap line, and what may be done to it");
      continue;
    }
    closed(object, OBJECT_KEY_TABLE, where, "object key", OBJECT_KEYS, fault);
    line(
      object["tap"],
      at(where, "tap"),
      "`tap` — the free tap describes, always, so every object has a line, and this",
      fault,
    );
    if (object["latent"] !== undefined && object["latent"] !== true) {
      fault(at(where, "latent"), "`latent` is written only as true, or left out");
    }
    const actions = object["actions"];
    if (actions === undefined) continue;
    if (!isRecord(actions)) {
      fault(at(where, "actions"), "`actions` is a map of named actions, keyed by id");
      continue;
    }
    for (const action of Object.keys(actions)) {
      const actionPath = at(at(where, "actions"), action);
      if (action.trim() === "") fault(actionPath, "an action id is not blank");
      readResponses(actions[action], actionPath, doorIds, objectIds, latentIds, fault);
    }
  }

  if (problems.length > 0) return { ok: false, problems };
  // Every key, every word and every value above has been read. The cast is
  // the payoff for that, and it is the only one in this file.
  return { ok: true, card: source as unknown as RoomCard };
}
