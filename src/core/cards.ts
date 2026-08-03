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
//          Only a response carries deltas; only a response can `adjust` a
//          body (DESIGN §the lots: "Stats are the body").
//   "FORWARD-ONLY."
//        → the only movement word is `goto`, and it names a DOOR of the
//          current room. There is no word for the room you came from.
//   "knowledge ratchets cross-push (refusals + clues pay off on later
//    meetings). A clue-locked gate ... is marked cross_push."
//        → `set`, `refuse`, and `Gate.flags` with `Gate.cross_push` as the
//          author's declaration that this gate's clue may come from an earlier
//          push. Knowledge has no word of its own: it is a flag, and the
//          ratchet is the MARKING on the gate rather than a second verb
//          (.llm/rules/engine.md, the lean word set). Which ledger holds a
//          given flag — this push's one-shots or the campaign's knowledge —
//          is resolution's business (H006), and a card never says.
//   "Doors are the map: the next 2-3 doors appear as sensed descriptions
//    (light, sound, smell). No map screen, ever."
//        → `RoomCard.doors`: a declared door is an id and a sense line, both
//          required, 2 or 3 of them (see `Doors`). A door has no destination
//          field here — nothing in a room card names another room.
//
// §content laws
//   "Affordance permanence (tappability never toggles; adds/removes carry
//    a cause)"
//        → there is no `tappable` flag anywhere in this file to toggle:
//          presence IS tappability (types.ts `ViewObject`). Adds and removes
//          are `addObject` and `removeObject`, and `ObjectChange.cause` is
//          required — the words are named for the law they serve.
//          Removing the flag removed one WAY to toggle, not toggling: a card
//          that can `removeObject` and `addObject` it again makes it
//          pull/push forever, so the loader refuses any object named by both.
//          An affordance leaves once, or arrives once, and not both.
//   "no softlocks (always a path to exit, death, or the Crossing)"
//        → three things, and the third is the one that bites:
//          (1) every response list ends in an UNGATED fallback, enforced by
//              the `Responses` tuple — a list that ends on a gate does not
//              compile and does not load, so a tap cannot fall through to
//              nothing;
//          (2) a room offers a way on at all: some response says `goto` or
//              `fight`;
//          (3) every DECLARED door is named by some `goto` in the same card.
//          (3) is not optional and it is not the shell's problem. types.ts
//          addresses every act as `Intent { object, action }` — a door is not
//          an object, and `PanelView.actions` are `Intent`-addressed too — so
//          a declared door is reachable ONLY through some object's `goto`.
//          A sensed door no action goes through is a road painted on a wall.
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
// The vocabulary below is the whole language and it is CLOSED, and its word
// set is now declared by .llm/rules/engine.md rather than by this file: gates
// {flags, items} · deltas {say, set, unset, give, take, adjust, journal,
// refuse, goto, addObject, removeObject, prompt, fight, end}. A new word is
// its own Asana task, never a side effect. Named here so their absence reads
// as a decision rather than an oversight:
//
//   an affordability  `adjust` spends ◎ and cannot ask whether you can afford
//   gate              it: the gate keys are flags and items. Until H205 lands
//                     that gate, nothing here stops a card charging a player
//                     into the negative — the delta arrived first, by ruling.
//   events            "exactly one notable-die event per depth" is a property
//                     of a DEPTH, not of a room card; it is countable only
//                     across the pool.
//   depth / landmark  Which pool a room is drawn into is the bundle's shape,
//                     and the bundle is H004's compiler. A card that also
//                     declared its depth would be a second source of truth.
//
// Three more, each a thing DESIGN demands that this schema cannot yet SAY.
// They are named so that the next card to want one finds the gap already
// described rather than discovering it in the dark:
//
//   label             types.ts requires `ViewObject.label` and
//                     `ActionOption.label` — non-optional strings — and no
//                     field here feeds either. "REACH IN" is not derivable
//                     from the key `reach`. H006 meets this immediately.
//   cinema            types.ts `Effect` has kind "cinema", and §art direction
//                     reserves it for first openings and glimpses of the
//                     child. No room word reaches it, so a card cannot ask
//                     for the camera to come close — this room's hatch opening
//                     is exactly such a moment and cannot say so.
//                     It is a RENDERING consequence too, not only a missing
//                     effect: .llm/rules/art.md 3 sets a lens per register
//                     (rooms F~115, cinema F~170+), so two registers need two
//                     lenses and something must declare which one a still is.
//                     That declaration is NOT this card's — `still` names an
//                     asset, and whether the asset is a locked wide tableau or
//                     a letterboxed close-up is a fact about the asset, not
//                     about the room referencing it. The register question is
//                     filed on H104, the scene renderer.
//   geometry          §content laws forbids pixel hunts ("visible objects,
//                     min hit size") and nothing here carries a position or a
//                     size, so no lint can measure a tap target from a card.
//
// ────────────────────────────────────────────────────── what is NOT checked ──
//
// A ratified board ruling (H005's decision record, 2026-08-02) binds the
// loader's reach: rooms DECLARE their doors, `goto` must name a declared door
// of the CURRENT room, declaration-presence is checked HERE, and cross-room
// graph validation is DEFERRED to D002, which binds doors at draw time. So
// this loader never asks where a door leads, whether a gate's key is
// reachable, whether the graph is acyclic, or whether a depth's rooms add up.
// Every check below is answerable from one card alone — including the two
// softlock checks and the toggle check, which read only this card's own
// doors, objects and responses and never follow a door out of the room.
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
 * Two conditions, and .llm/rules/engine.md names both: gates {flags, items}.
 * `flags` are raised by `set` and lowered by `unset`, `items` are what is in
 * the pouch. There is no third condition for knowledge: knowledge is a flag
 * that lives on the campaign ledger instead of the run's, and WHICH ledger
 * holds a given flag is resolution's business (H006), never the card's — a
 * card names a flag and marks the gate.
 *
 * A gate with no condition in it is not a gate; the loader says so. The type
 * cannot: every key is optional, because either one may be the only one.
 *
 * TWO of the three keys are conditions. `cross_push` is not one — see below.
 * A resolver evaluating a gate must skip exactly that key, and it is spelled
 * the way DESIGN.md spells it so that an author copying the design document
 * verbatim is never told their own vocabulary is unknown.
 */
export interface Gate {
  /** CONDITION. A named flag, raised by `set` (types.ts RunBranch.flags for a
   *  one-shot, CampaignBranch.knowledge for one that survives death). */
  readonly flags?: readonly Id[];
  /** CONDITION. In the pouch, by item id. */
  readonly items?: readonly Id[];
  /**
   * NOT A CONDITION. Nothing about the state makes it true or false, and a
   * resolver must evaluate the other two keys and SKIP this one — a gate
   * carrying only `cross_push` gates on nothing, which is why the loader
   * refuses it.
   *
   * It is the author's declaration that this gate's clue is not promised
   * inside this push: it "pays off on a later meeting" (DESIGN §the descent,
   * which spells the marker `cross_push`). Unmarked clue-locked gates are the
   * ones a graph pass must prove satisfiable in-push — and that pass is
   * D002's, not this loader's.
   */
  readonly cross_push?: true;
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
 * Arithmetic on a track. Damage is not a word of its own: it is a negative
 * number here, and a gift is a positive one.
 *
 * DESIGN §the lots: "Stats are the body (health, soak, skill and dice access);
 * dice are the hands", and DESIGN §ledgers: "EITHER bar at zero — health or
 * sanity — is death". So the risk a named action carries is not a special verb
 * but ordinary arithmetic on the body, and the loader's job is only to see
 * that the arithmetic is whole and that it moves something.
 *
 * Five tracks: the two bars that can kill you, the two stats, and the coin.
 * The set is CLOSED, so that `adjust: { helth: -1 }` is an error at LOAD
 * rather than a line that quietly moves nothing. `depth` is not one of them —
 * how far down you are is a fact about the descent's draw, not something a
 * room adjusts.
 *
 * SANITY IS TRACKED, AND NEVER RENDERED AS A NUMBER. That is one fact, not
 * two, and it is the corner of the design most likely to be misread — so,
 * plainly: DESIGN §ledgers says "EITHER bar at zero — health or sanity — is
 * death, by the same rule", which makes sanity a bar that a room must be able
 * to move. DESIGN §frame's "no sanity bar exists anywhere" and .llm/rules/ui.md
 * 5's "no sanity number is ever rendered" are statements about the SCREEN: it
 * shows as the vignette closing in, an ordered-dither aperture, instead of as
 * a bar. A value can be tracked and never displayed; that is the whole design.
 * And the Fraying — "narrator lies at low sanity" — is the CONSEQUENCE of low
 * sanity and is what DESIGN §open parks; parking the consequence does not park
 * the value it reads. Leaving sanity out would make half of "either bar at
 * zero is death" unreachable from the room language.
 *
 * A move must still be telegraphed in the free tap line first (DESIGN §content
 * laws: telegraphed harm); that a line telegraphs it is prose, and prose is
 * the content lint's lane.
 */
export interface Adjust {
  /** The health bar (types.ts Vitals.hp). Negative is harm. */
  readonly hp?: number;
  /**
   * The sanity bar. Negative is harm, exactly as on `hp` — DESIGN §ledgers
   * ties the two together: either at zero is death, "by the same rule", so
   * they are the same kind of quantity and they move the same way.
   *
   * Never shown as a number or a bar; it renders as the vignette (see above).
   * A card writes the BAR, in whole units. types.ts `Vitals.sanity` currently
   * holds the vignette's own scale instead (0 = clear, 1 = closed), which runs
   * the other way; reconciling the state shape with the word set is H006's,
   * alongside the same question about `CampaignBranch.knowledge`. Nothing here
   * resolves a delta, so nothing here depends on the answer.
   */
  readonly sanity?: number;
  /** types.ts Vitals.might. */
  readonly might?: number;
  /** types.ts Vitals.will. */
  readonly will?: number;
  /** ◎ — the coin of the labyrinth (types.ts RunBranch.tithes). Negative
   *  spends. The affordability gate that keeps a spend off the negative is
   *  H205's, and it is not here yet. */
  readonly tithes?: number;
}

/**
 * The delta words: everything a response may apply. CLOSED — a word absent
 * from this list does not exist, and `loadRoom` rejects it by name. The list
 * and its ORDER are .llm/rules/engine.md's, so that the vocabulary an author
 * meets in an error message is the vocabulary the rule declares, read the same
 * way round.
 *
 * `say` is required. A response that applies nothing still speaks, because a
 * tap that produces no line is a tap that appears to have done nothing
 * (DESIGN §frame: 1-2 lines of writing on top; types.ts `Effect` kind "say").
 */
export interface Deltas {
  /** The line this response writes. Always present. */
  readonly say: string;
  /** Raise these flags: doors opened, ambushes sprung, things now known. */
  readonly set?: readonly Id[];
  /** Lower these flags again. */
  readonly unset?: readonly Id[];
  /** Put items in the pouch. The author marks each one's `keep`. */
  readonly give?: readonly ItemRef[];
  /** Take items out of the pouch, by id. What death would have done with one
   *  stops mattering the moment it is gone, so there is no `keep` here. */
  readonly take?: readonly Id[];
  /** Move a track: the body, or the coin. Harm is a negative number. */
  readonly adjust?: Adjust;
  /** One line for the journal. Records the act (DESIGN §content laws). */
  readonly journal?: string;
  /**
   * The labyrinth says no, and remembers being asked (types.ts `Refusal`,
   * CampaignBranch.refused). A refusal carries no other delta than its line:
   * a refusal that also gives, marks or moves you was not a refusal.
   */
  readonly refuse?: true;
  /** Go through a door DECLARED by this room. Forward-only: there is no word
   *  for going back, and a door ref is not a room id. */
  readonly goto?: Id;
  /** A latent object of this room becomes present, for a stated cause. */
  readonly addObject?: ObjectChange;
  /** A declared object of this room is gone, for a stated cause. */
  readonly removeObject?: ObjectChange;
  /** A QTE, by id, passed through. "QTEs are their own category" (DESIGN §the
   *  descent) and their own card: what a prompt asks, how long it gives, and
   *  the Will-check fallback every QTE must declare are H208's, not this
   *  loader's. The word exists here so a room can raise one. */
  readonly prompt?: Id;
  /** The one doorway into the Lots (DESIGN §the two engines, one doorway).
   *  An enemy id, passed through — the engine never names an enemy. */
  readonly fight?: Id;
  /** An ending, by id, passed through. What an ending reads and how it is
   *  shown is H114's; the engine never names one. */
  readonly end?: Id;
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
   * Not present when the room opens; a response `addObject`s it, with a cause.
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
 * 2 or 3 doors, counted by the type. Both bounds are DESIGN's sentence:
 * "the next 2-3 doors appear as sensed descriptions".
 *
 * The floor is 2 and not 1. Under FORWARD-ONLY with no map screen, WHICH DOOR
 * to take is the only navigational decision the game ever offers; a floor of 1
 * would let a descent be authored as a chain of corridors with no choice in
 * it, and "doors are the map" does not survive a map with one road on it.
 * Widening a bound later is safe, tightening one after content exists is not,
 * and lowering this floor is a DESIGN.md amendment rather than a schema
 * default.
 */
export type Doors = readonly [Door, Door] | readonly [Door, Door, Door];

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
  cross_push: true,
};

/** The two gate keys that are CONDITIONS (.llm/rules/engine.md: gates {flags,
 *  items}). `cross_push` is not one of them: it is a marking, and a resolver
 *  skips it. */
const GATE_CONDITIONS = ["flags", "items"] as const;

const DELTA_KEY_TABLE: KeyTable<Deltas> = {
  say: true,
  set: true,
  unset: true,
  give: true,
  take: true,
  adjust: true,
  journal: true,
  refuse: true,
  goto: true,
  addObject: true,
  removeObject: true,
  prompt: true,
  fight: true,
  end: true,
};

const ADJUST_TRACK_TABLE: KeyTable<Adjust> = {
  hp: true,
  sanity: true,
  might: true,
  will: true,
  tithes: true,
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
/** The delta words, in order. The whole language a response may apply, and
 *  the order .llm/rules/engine.md declares it in. */
export const DELTA_WORDS = Object.keys(DELTA_KEY_TABLE) as readonly (keyof Deltas)[];
/** The tracks `adjust` may move: the two bars, the two stats, the coin. */
export const ADJUST_TRACKS = Object.keys(ADJUST_TRACK_TABLE) as readonly (keyof Adjust)[];
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
  for (const key of GATE_CONDITIONS) {
    if (value[key] !== undefined) idList(value[key], at(path, key), `\`${key}\``, fault);
  }
  if (value["cross_push"] !== undefined && value["cross_push"] !== true) {
    fault(at(path, "cross_push"), "`cross_push` is written only as true, or left out");
  }
  if (GATE_CONDITIONS.every((key) => value[key] === undefined)) {
    fault(
      path,
      "a gate with no condition in it is not a gate — drop the `if`. " +
        "`cross_push` is a marking, not a condition: it gates nothing on its own.",
    );
  }
}

/** One `addObject` or `removeObject`, and where it was written. Kept so the
 *  toggle check can name both halves of a pull/push when it finds one. */
interface Sighting {
  readonly object: string;
  readonly path: string;
}

/**
 * One card being read: what it declares, what its responses turn out to do,
 * and where to send a problem.
 *
 * The `gotos` / `fights` / `adds` / `removes` lists are filled in as the
 * responses are walked, because three laws are properties of the WHOLE card
 * rather than of any one response — a door nothing reaches, a room with no way
 * on, and an object that leaves and comes back. They are answered once the
 * walk is over, and every one of them reads this card alone.
 */
interface Reading {
  readonly fault: Fault;
  readonly doors: readonly string[];
  readonly objects: readonly string[];
  readonly latent: readonly string[];
  readonly gotos: string[];
  readonly fights: string[];
  readonly adds: Sighting[];
  readonly removes: Sighting[];
}

function readChange(
  value: unknown,
  path: string,
  word: "addObject" | "removeObject",
  read: Reading,
): void {
  const fault = read.fault;
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
  if (!read.objects.includes(target)) {
    fault(
      at(path, "object"),
      `"${target}" is not an object of this room. \`${word}\` reaches only this ` +
        `room's own objects: ${read.objects.join(", ") || "(none declared)"}.`,
    );
    return;
  }
  const sighting: Sighting = { object: target, path: at(path, "object") };
  if (word === "removeObject") {
    read.removes.push(sighting);
    return;
  }
  read.adds.push(sighting);
  if (!read.latent.includes(target)) {
    fault(
      at(path, "object"),
      `"${target}" is already present when the room opens, so adding it ` +
        `would toggle an affordance. Mark it \`latent: true\` where it is declared.`,
    );
  }
}

/** `adjust`: whole numbers on named tracks, and at least one of them. */
function readAdjust(value: unknown, path: string, fault: Fault): void {
  if (!isRecord(value)) {
    fault(path, "`adjust` is a map of tracks: how far each one moves, and which way");
    return;
  }
  closed(value, ADJUST_TRACK_TABLE, path, "adjust track", ADJUST_TRACKS, fault);
  let moved = 0;
  for (const track of ADJUST_TRACKS) {
    const by = value[track];
    if (by === undefined) continue;
    moved += 1;
    if (typeof by !== "number" || !Number.isInteger(by) || by === 0) {
      fault(
        at(path, track),
        `\`${track}\` moves by a whole number, and never by none — a move of zero ` +
          `is a lie. Harm is a NEGATIVE number here, and it must be telegraphed in ` +
          `the free tap line first (DESIGN §content laws).`,
      );
    }
  }
  if (moved === 0) {
    fault(path, "`adjust` with no track in it moves nothing — leave the word out instead");
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

function readResponse(value: unknown, path: string, last: boolean, read: Reading): void {
  const fault = read.fault;
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
  if (value["unset"] !== undefined) idList(value["unset"], at(path, "unset"), "`unset`", fault);
  if (value["journal"] !== undefined) {
    line(value["journal"], at(path, "journal"), "`journal`, when written,", fault);
  }
  if (value["give"] !== undefined) readItems(value["give"], at(path, "give"), fault);
  if (value["take"] !== undefined) idList(value["take"], at(path, "take"), "`take`", fault);
  if (value["adjust"] !== undefined) readAdjust(value["adjust"], at(path, "adjust"), fault);
  if (value["fight"] !== undefined) {
    id(value["fight"], at(path, "fight"), "`fight` — an enemy id", fault);
    if (typeof value["fight"] === "string" && value["fight"] !== "") {
      read.fights.push(value["fight"]);
    }
  }
  if (value["prompt"] !== undefined) {
    id(value["prompt"], at(path, "prompt"), "`prompt` — a QTE id", fault);
  }
  if (value["end"] !== undefined) {
    id(value["end"], at(path, "end"), "`end` — an ending id", fault);
  }

  if (value["addObject"] !== undefined) {
    readChange(value["addObject"], at(path, "addObject"), "addObject", read);
  }
  if (value["removeObject"] !== undefined) {
    readChange(value["removeObject"], at(path, "removeObject"), "removeObject", read);
  }

  if (value["goto"] !== undefined) {
    const where = at(path, "goto");
    id(value["goto"], where, "`goto` — a door of this room", fault);
    const door = value["goto"];
    if (typeof door === "string" && door !== "") {
      read.gotos.push(door);
      if (!read.doors.includes(door)) {
        fault(
          where,
          `"${door}" is not a door of this room. \`goto\` names a door DECLARED ` +
            `by the room you are standing in: ${read.doors.join(", ") || "(none declared)"}. ` +
            `Where that door leads is bound at draw time, not here.`,
        );
      }
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
            `drop \`refuse\` (a refusal that gives, marks or moves you was not one)`,
        );
      }
    }
  }
}

function readResponses(value: unknown, path: string, read: Reading): void {
  if (!Array.isArray(value)) {
    read.fault(path, "an action is a list of responses, read top to bottom");
    return;
  }
  if (value.length === 0) {
    read.fault(
      path,
      "an action with no responses answers nothing — a list is one or more " +
        "gated responses, then one ungated fallback",
    );
    return;
  }
  value.forEach((response, index) => {
    readResponse(response, nth(path, index), index === value.length - 1, read);
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
    if (doors.length < 2 || doors.length > 3) {
      fault(
        "doors",
        `a room senses 2 or 3 doors, not ${doors.length} — "the next 2-3 doors ` +
          `appear as sensed descriptions" (DESIGN §the descent). Which door to ` +
          `take is the only navigational decision the descent offers, so a room ` +
          `with one way on is not a fork and the map has one road on it.`,
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

  // Collect what is declared before reading responses: `addObject` and
  // `removeObject` reach this room's own objects and nothing else.
  const objectIds = Object.keys(objects);
  const latentIds = objectIds.filter((key) => {
    const object = objects[key];
    return isRecord(object) && object["latent"] === true;
  });

  const read: Reading = {
    fault,
    doors: doorIds,
    objects: objectIds,
    latent: latentIds,
    gotos: [],
    fights: [],
    adds: [],
    removes: [],
  };

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
      readResponses(actions[action], actionPath, read);
    }
  }

  // ── the three laws that are properties of the whole card ──────────────────
  //
  // Each reads only what this card declares and what this card's own responses
  // do. None of them follows a door out of the room, so none of them trespasses
  // on D002's cross-room graph pass.

  // Affordance permanence. An object that can be removed and added again
  // pulls and pushes forever, and "tappability never toggles" is exactly the
  // thing that forbids. Reported at the add, naming the remove.
  for (const added of read.adds) {
    const removed = read.removes.find((sighting) => sighting.object === added.object);
    if (removed === undefined) continue;
    fault(
      added.path,
      `"${added.object}" is removed at ${removed.path} and added here, so its ` +
        `tappability toggles — an affordance arrives once, or leaves once, not both ` +
        `(DESIGN §content laws: affordance permanence). Two objects, or one one-way change.`,
    );
  }

  // No softlocks, first half: a way on exists at all.
  if (read.gotos.length === 0 && read.fights.length === 0) {
    fault(
      "",
      "this room offers no way on — no response says `goto` or `fight`, so a " +
        "player who enters it cannot leave (DESIGN §content laws: no softlocks)",
    );
  }

  // No softlocks, second half: every sensed door can actually be walked
  // through. types.ts addresses every act as `Intent { object, action }`, and a
  // door is not an object — so a door no `goto` names is a road painted on a
  // wall, and the player is left choosing between doors that do not open.
  doorIds.forEach((door, index) => {
    if (read.gotos.includes(door)) return;
    fault(
      at(nth("doors", index), "id"),
      `"${door}" is sensed but nothing goes through it — no response in this room ` +
        `says \`goto: ${door}\`. Every act is addressed to an object and an action ` +
        `(types.ts \`Intent\`), so a door is reached only through some object's ` +
        `\`goto\` (DESIGN §content laws: no softlocks).`,
    );
  });

  if (problems.length > 0) return { ok: false, problems };
  // Every key, every word and every value above has been read. The cast is
  // the payoff for that, and it is the only one in this file.
  return { ok: true, card: source as unknown as RoomCard };
}
