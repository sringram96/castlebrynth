// H004 — the bundle loader: compiled JSON in, typed Bundle out.
//
//   content/*.yaml  →  scripts/build-content.mjs  →  content/bundle.json
//                                                          ↓ THIS
//                                                        Bundle
//
// The compiler is the mouth of the funnel and this is the neck: the
// last place content is text and the first place it is the engine's.
// Everything downstream (H006's resolve, the shell in P1) receives a
// Bundle and may assume every word in it exists.
//
// Law this file answers to:
//   RULES.md 1  purity — no DOM, no I/O, no clock. The bundle arrives
//               as a value; whoever read the file did the reading.
//               That is why `loadBundle` takes its source: core does
//               not open files, and content/bundle.json is a build
//               artifact that need not exist for `npm run law` to pass.
//   RULES.md 2  determinism — everything here is JSON, so a loaded
//               bundle survives a round-trip byte for byte.
//   RULES.md 3  closed languages — an unknown delta `kind` or gate key
//               fails HERE, at load, with the path to it. Never at
//               play. `validateBundle` is the same walk without the
//               throw, for a caller that would rather ask than catch.
//   RULES.md 5  cards are data — this file recognises data; it decides
//               nothing about the game.
//
// What it checks is the language and the shape that carries it: is
// this a bundle, is every word a word, does `start` name a scene it
// holds. What it does not check is content law — satisfiable gates,
// mandatory fallbacks, live goto targets, canon voice. Those are
// content-lint's (H005), over the YAML, where an author can read the
// complaint.

import { RESERVED_WORDS } from "./cards";
import type { Bundle, DeltaKind, Scene } from "./types";

// ---------------------------------------------------------------------
// faults
//
// A fault is where and what — an unknown word without a location is
// not a diagnosis. The path is dotted from the bundle root, indexed
// where the bundle is a list, and reads the same as the compiler's.
// ---------------------------------------------------------------------

export type BundleFault = {
  /** e.g. `scenes.shore.objects[1].actions[0].responses[2].deltas[0]`. */
  readonly path: string;
  readonly detail: string;
};

function fault(path: string, detail: string): BundleFault {
  return { path, detail };
}

/** A path segment, appended. */
function step(trail: string, key: string): string {
  return trail ? `${trail}.${key}` : key;
}

/** An index, appended. */
function at(trail: string, index: number): string {
  return `${trail}[${index}]`;
}

// ---------------------------------------------------------------------
// shape helpers
// ---------------------------------------------------------------------

type UnknownRecord = { readonly [key: string]: unknown };

/** A fault, or null for "no complaint". */
type Fault = BundleFault | null;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function needsRecord(path: string, value: unknown, what: string): Fault {
  return isRecord(value) ? null : fault(path, `${what} must be an object`);
}

function needsString(path: string, value: unknown, what: string): Fault {
  return typeof value === "string" ? null : fault(path, `${what} must be a string`);
}

function needsOptionalString(path: string, value: unknown, what: string): Fault {
  return value === undefined ? null : needsString(path, value, what);
}

function needsIdList(path: string, value: unknown): Fault {
  if (!Array.isArray(value)) return fault(path, "must be a list of ids");
  for (const [i, id] of value.entries())
    if (typeof id !== "string") return fault(at(path, i), "must be an id");
  return null;
}

/** The first complaint wins; a loader that lists everything wrong is a linter. */
function first(...checks: readonly Fault[]): Fault {
  for (const check of checks) if (check !== null) return check;
  return null;
}

function eachOf(
  path: string,
  value: unknown,
  what: string,
  check: (path: string, item: unknown) => Fault,
): Fault {
  if (!Array.isArray(value)) return fault(path, `${what} must be a list`);
  for (const [i, item] of value.entries()) {
    const bad = check(at(path, i), item);
    if (bad !== null) return bad;
  }
  return null;
}

// ---------------------------------------------------------------------
// the delta words — RULES.md 3, the closed language, checked
//
// Keyed by DeltaKind, so a word added to types.ts without a check here
// is a compile error rather than a word that quietly loads unexamined.
// ---------------------------------------------------------------------

type DeltaCheck = (path: string, delta: UnknownRecord) => Fault;

const DELTA_SHAPE: { readonly [K in DeltaKind]: DeltaCheck } = {
  say: (path, delta) => needsString(step(path, "text"), delta.text, "text"),

  set: (path, delta) => needsIdList(step(path, "flags"), delta.flags),

  unset: (path, delta) => needsIdList(step(path, "flags"), delta.flags),

  give: (path, delta) => needsIdList(step(path, "items"), delta.items),

  take: (path, delta) => needsIdList(step(path, "items"), delta.items),

  adjust: (path, delta) =>
    first(
      needsString(step(path, "target"), delta.target, "target"),
      typeof delta.amount === "number" && Number.isFinite(delta.amount)
        ? null
        : fault(step(path, "amount"), "must be a finite number"),
      typeof delta.clamped === "boolean"
        ? null
        : fault(step(path, "clamped"), "must be true or false"),
    ),

  journal: (path, delta) => needsString(step(path, "entry"), delta.entry, "entry"),

  // The refused ledger and nothing else. VOCAB.md gives it no payload.
  refuse: () => null,

  goto: (path, delta) => needsString(step(path, "door"), delta.door, "door"),

  addObject: (path, delta) => objectChange(path, delta),

  removeObject: (path, delta) => objectChange(path, delta),

  prompt: (path, delta) =>
    needsRecord(step(path, "prompt"), delta.prompt, "prompt"),

  fight: (path, delta) => needsString(step(path, "enemy"), delta.enemy, "enemy"),

  end: (path, delta) =>
    first(
      needsString(step(path, "line"), delta.line, "line"),
      needsString(step(path, "note"), delta.note, "note"),
    ),
};

/** LAWS.md #affordance puts the diegetic cause on the delta itself. */
function objectChange(path: string, delta: UnknownRecord): Fault {
  return first(
    needsString(step(path, "scene"), delta.scene, "scene"),
    needsString(step(path, "object"), delta.object, "object"),
    needsString(step(path, "cause"), delta.cause, "cause"),
  );
}

function isDeltaKind(value: string): value is DeltaKind {
  return Object.prototype.hasOwnProperty.call(DELTA_SHAPE, value);
}

function checkDelta(path: string, value: unknown): Fault {
  const shaped = needsRecord(path, value, "a delta");
  if (shaped !== null) return shaped;
  const delta = value as UnknownRecord;

  const kind = delta.kind;
  if (typeof kind !== "string")
    return fault(step(path, "kind"), "a delta is tagged with a kind");
  if (!isDeltaKind(kind))
    return fault(
      step(path, "kind"),
      (RESERVED_WORDS as readonly string[]).includes(kind)
        ? `"${kind}" is reserved (VOCAB.md) — it is not implemented and may not be used`
        : `"${kind}" is not a delta word (VOCAB.md is the whole language)`,
    );

  return DELTA_SHAPE[kind](path, delta);
}

// ---------------------------------------------------------------------
// gates, responses, actions, objects, scenes
// ---------------------------------------------------------------------

const GATE_KEYS = ["flags", "items"] as const;

function checkGate(path: string, value: unknown): Fault {
  const shaped = needsRecord(path, value, "a gate");
  if (shaped !== null) return shaped;
  const gate = value as UnknownRecord;

  for (const key of Object.keys(gate))
    if (!(GATE_KEYS as readonly string[]).includes(key))
      return fault(
        step(path, key),
        `"${key}" is not a gate key (VOCAB.md gates on flags and items)`,
      );

  return first(
    gate.flags === undefined ? null : needsIdList(step(path, "flags"), gate.flags),
    gate.items === undefined ? null : needsIdList(step(path, "items"), gate.items),
  );
}

function checkResponse(path: string, value: unknown): Fault {
  const shaped = needsRecord(path, value, "a response");
  if (shaped !== null) return shaped;
  const response = value as UnknownRecord;

  return first(
    // Gateless is not a fault: it is the mandatory fallback.
    response.gates === undefined ? null : checkGate(step(path, "gates"), response.gates),
    eachOf(step(path, "deltas"), response.deltas, "deltas", checkDelta),
  );
}

function checkAction(path: string, value: unknown): Fault {
  const shaped = needsRecord(path, value, "an action");
  if (shaped !== null) return shaped;
  const action = value as UnknownRecord;

  return first(
    needsString(step(path, "id"), action.id, "id"),
    needsOptionalString(step(path, "label"), action.label, "label"),
    eachOf(step(path, "responses"), action.responses, "responses", checkResponse),
  );
}

function checkObject(path: string, value: unknown): Fault {
  const shaped = needsRecord(path, value, "an object");
  if (shaped !== null) return shaped;
  const object = value as UnknownRecord;

  return first(
    needsString(step(path, "id"), object.id, "id"),
    needsOptionalString(step(path, "label"), object.label, "label"),
    // The free tap. Every object has one (GAME.md #descent).
    needsString(step(path, "line"), object.line, "line"),
    eachOf(step(path, "actions"), object.actions, "actions", checkAction),
  );
}

function checkScene(path: string, id: string, value: unknown): Fault {
  const shaped = needsRecord(path, value, "a scene");
  if (shaped !== null) return shaped;
  const scene = value as UnknownRecord;

  return first(
    needsString(step(path, "id"), scene.id, "id"),
    scene.id === id
      ? null
      : fault(step(path, "id"), `is "${String(scene.id)}" but filed under "${id}"`),
    needsOptionalString(step(path, "enter"), scene.enter, "enter"),
    needsString(step(path, "line"), scene.line, "line"),
    eachOf(step(path, "objects"), scene.objects, "objects", checkObject),
  );
}

// ---------------------------------------------------------------------
// the bundle
// ---------------------------------------------------------------------

/**
 * The whole walk, without the throw: the first fault in a compiled
 * bundle, or null if every word in it is a word.
 */
export function validateBundle(source: unknown): BundleFault | null {
  if (!isRecord(source)) return fault("bundle", "a bundle must be an object");
  const bundle: UnknownRecord = source;

  const scenesFault = needsRecord("scenes", bundle.scenes, "scenes");
  if (scenesFault !== null) return scenesFault;
  const scenes = bundle.scenes as UnknownRecord;

  for (const id of Object.keys(scenes)) {
    const bad = checkScene(step("scenes", id), id, scenes[id]);
    if (bad !== null) return bad;
  }

  const start = bundle.start;
  const startFault = needsString("start", start, "start");
  if (startFault !== null) return startFault;
  if (!Object.prototype.hasOwnProperty.call(scenes, start as string))
    return fault("start", `"${String(start)}" is not a scene in this bundle`);

  return null;
}

/**
 * Compiled JSON into the Bundle the engine plays. Throws on the first
 * fault, naming its path — RULES.md 3: unknown words fail at load,
 * never at play. A bad bundle is a broken build, not a runtime state
 * to recover from, so unlike a save (RULES.md 10) this one throws.
 *
 * The source is a value, not a path: core does no I/O. Read
 * content/bundle.json wherever files are allowed and hand the parsed
 * JSON in.
 */
export function loadBundle(source: unknown): Bundle {
  const bad = validateBundle(source);
  if (bad !== null) throw new Error(`bundle: ${bad.path} — ${bad.detail}`);
  return source as Bundle;
}

/** One scene out of a loaded bundle, or undefined. Ids are not scenes. */
export function sceneOf(bundle: Bundle, id: string): Scene | undefined {
  return Object.prototype.hasOwnProperty.call(bundle.scenes, id)
    ? bundle.scenes[id]
    : undefined;
}

/**
 * The delta words this loader knows, in VOCAB.md order — the same list
 * the authored side closes over (src/core/cards.ts). Exported so a
 * test can hold the two languages against each other.
 */
export const BUNDLE_DELTA_KINDS = Object.keys(DELTA_SHAPE) as readonly DeltaKind[];

/** VOCAB.md's two gate keys, as this loader closes over them. */
export const BUNDLE_GATE_KEYS: readonly string[] = GATE_KEYS;
