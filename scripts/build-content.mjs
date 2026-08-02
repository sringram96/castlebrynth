// H004 — the content compiler: content/*.yaml → content/bundle.json.
//
//   content/*.yaml  →  (H003 authored shape)  →  THIS  →  types.ts Bundle
//
// The authored form is keyed maps and inline delta words. The engine
// form is arrays with ids hoisted and deltas tagged on `kind`. This
// script is the whole of that translation, and the only place a
// Descent word is read off a page.
//
// Law this file answers to:
//   RULES.md 3  closed languages — a key that is not in the tables
//               below does not exist. Meeting one is a build failure
//               naming the file and the exact path to the offender, so
//               a bad word dies here and never at play.
//   RULES.md 5  cards are data — nothing here decides anything about
//               the game; it re-shapes what an author wrote.
//   VOCAB.md    the tables below are VOCAB.md, in VOCAB.md's order.
//               That order is the order deltas apply in, so it is the
//               order they are emitted in.
//   H004 non-goal: vocabulary closure only. Gate satisfiability,
//               mandatory fallbacks, dangling gotos, refuse purity and
//               the canon scan are content-lint's (H005).
//
// The word tables are restated here rather than imported: this is .mjs
// and src/core/cards.ts is TypeScript. tests/acceptance/H004.compiler
// .test.ts asserts the two agree, so drift is a red test, not a bug.
//
// Usage:
//   node scripts/build-content.mjs [--in <dir>] [--out <file>] [--start <scene>]
//
// `--start` names the scene a new run begins in. With exactly one
// scene in the directory there is nothing to choose and it may be
// omitted; with several, the build refuses to guess and says so.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";

// ---------------------------------------------------------------------
// the word tables — VOCAB.md, in VOCAB.md order
// ---------------------------------------------------------------------

/** VOCAB.md gates. All listed must hold; a gateless response is the fallback. */
export const GATE_KEYS = ["flags", "items"];

/** VOCAB.md deltas, in the order they apply. `say` is always present. */
export const DELTA_WORDS = [
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
];

/** VOCAB.md's parked words. Named so a build can refuse them out loud. */
export const RESERVED_WORDS = ["lies", "counter", "dropObols"];

/** The authored scene keys (src/core/cards.ts CardScene). */
export const SCENE_KEYS = ["scene", "tier", "enter", "line", "objects"];

/** The authored object keys (src/core/cards.ts CardObject). */
export const OBJECT_KEYS = ["tap", "actions"];

/** CANON.md knowledge tiers. Declared per scene, dropped from the bundle. */
export const TIERS = ["T0", "T1", "T2", "T3"];

// ---------------------------------------------------------------------
// failure
//
// Every failure carries the file and the dotted path to the offending
// key, because "unknown word" without a location is not a diagnosis.
// ---------------------------------------------------------------------

export class CompileError extends Error {
  constructor(where, detail) {
    super(`${where} — ${detail}`);
    this.name = "CompileError";
    /** `<file>: <dotted.path[i]>`, or `<file>` for a whole-file fault. */
    this.where = where;
    this.detail = detail;
  }
}

/** A path segment, appended. */
function step(trail, key) {
  return trail ? `${trail}.${key}` : String(key);
}

/** An index, appended. */
function at(trail, index) {
  return `${trail}[${index}]`;
}

function fail(file, trail, detail) {
  throw new CompileError(trail ? `${file}: ${trail}` : file, detail);
}

// ---------------------------------------------------------------------
// shape helpers
// ---------------------------------------------------------------------

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(file, trail, value, what) {
  if (!isRecord(value)) fail(file, trail, `${what} must be a map`);
  return value;
}

function text(file, trail, value, what) {
  if (typeof value !== "string") fail(file, trail, `${what} must be a string`);
  return value;
}

function idList(file, trail, value) {
  if (!Array.isArray(value)) fail(file, trail, "must be a list of ids");
  return value.map((id, i) =>
    typeof id === "string" ? id : fail(file, at(trail, i), "must be an id"),
  );
}

/** Only the keys named; anything else is a word that does not exist. */
function closed(file, trail, value, allowed, what) {
  for (const key of Object.keys(value)) {
    if (allowed.includes(key)) continue;
    if (RESERVED_WORDS.includes(key))
      fail(
        file,
        step(trail, key),
        `"${key}" is reserved (VOCAB.md) — it is not implemented and may not be used`,
      );
    fail(
      file,
      step(trail, key),
      `"${key}" is not ${what} (VOCAB.md is the whole language)`,
    );
  }
}

/** Deltas ride into a JSON bundle; nothing that JSON cannot hold may. */
function jsonSafe(file, trail, value) {
  if (value === null) return value;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(file, trail, "must be a finite number");
    return value;
  }
  if (Array.isArray(value))
    return value.map((item, i) => jsonSafe(file, at(trail, i), item));
  if (isRecord(value)) {
    const out = {};
    for (const key of Object.keys(value))
      out[key] = jsonSafe(file, step(trail, key), value[key]);
    return out;
  }
  return fail(file, trail, "must be JSON: string, number, boolean, null, list, or map");
}

// ---------------------------------------------------------------------
// deltas — one compiler per word, tagged on `kind`
//
// Keyed by the word, so a word in the table without a compiler here is
// an immediate, obvious failure rather than a silently dropped delta.
// ---------------------------------------------------------------------

const DELTA = {
  say: (file, trail, value) => ({
    kind: "say",
    text: text(file, trail, value, "say"),
  }),

  set: (file, trail, value) => ({
    kind: "set",
    flags: idList(file, trail, value),
  }),

  unset: (file, trail, value) => ({
    kind: "unset",
    flags: idList(file, trail, value),
  }),

  give: (file, trail, value) => ({
    kind: "give",
    items: idList(file, trail, value),
  }),

  take: (file, trail, value) => ({
    kind: "take",
    items: idList(file, trail, value),
  }),

  adjust: (file, trail, value) => {
    const map = record(file, trail, value, "adjust");
    closed(file, trail, map, ["target", "amount", "clamped"], "an adjust key");
    const amount = map.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount))
      fail(file, step(trail, "amount"), "must be a finite number");
    if (typeof map.clamped !== "boolean")
      fail(file, step(trail, "clamped"), "must be true or false");
    return {
      kind: "adjust",
      target: text(file, step(trail, "target"), map.target, "target"),
      amount,
      clamped: map.clamped,
    };
  },

  journal: (file, trail, value) => ({
    kind: "journal",
    entry: text(file, trail, value, "journal"),
  }),

  refuse: (file, trail, value) => {
    if (value !== true)
      fail(file, trail, "refuse is written `refuse: true` or left out");
    return { kind: "refuse" };
  },

  goto: (file, trail, value) => ({
    kind: "goto",
    door: text(file, trail, value, "goto"),
  }),

  addObject: (file, trail, value) => objectChange("addObject", file, trail, value),

  removeObject: (file, trail, value) =>
    objectChange("removeObject", file, trail, value),

  prompt: (file, trail, value) => ({
    kind: "prompt",
    prompt: jsonSafe(file, trail, record(file, trail, value, "prompt")),
  }),

  fight: (file, trail, value) => ({
    kind: "fight",
    enemy: text(file, trail, value, "fight"),
  }),

  end: (file, trail, value) => {
    const map = record(file, trail, value, "end");
    closed(file, trail, map, ["line", "note"], "an end key");
    return {
      kind: "end",
      line: text(file, step(trail, "line"), map.line, "line"),
      note: text(file, step(trail, "note"), map.note, "note"),
    };
  },
};

/** addObject / removeObject — LAWS.md #affordance puts the cause on the delta. */
function objectChange(kind, file, trail, value) {
  const map = record(file, trail, value, kind);
  closed(file, trail, map, ["scene", "object", "cause"], `an ${kind} key`);
  return {
    kind,
    scene: text(file, step(trail, "scene"), map.scene, "scene"),
    object: text(file, step(trail, "object"), map.object, "object"),
    cause: text(file, step(trail, "cause"), map.cause, "cause"),
  };
}

// ---------------------------------------------------------------------
// gates, responses, actions, objects, scenes
// ---------------------------------------------------------------------

function compileGate(file, trail, value) {
  const map = record(file, trail, value, "a gate");
  closed(file, trail, map, GATE_KEYS, "a gate key");
  const gate = {};
  for (const key of GATE_KEYS)
    if (map[key] !== undefined) gate[key] = idList(file, step(trail, key), map[key]);
  return gate;
}

/**
 * One authored response into the engine's `{gates?, deltas}`. Deltas
 * come out in VOCAB.md order however the author laid them out: the
 * order they are written in is a matter of taste, the order they apply
 * in is law.
 */
export function compileResponse(file, trail, value) {
  const map = record(file, trail, value, "a response");
  closed(file, trail, map, ["if", ...DELTA_WORDS], "a response key");

  if (map.say === undefined)
    fail(file, trail, "every response says something (VOCAB.md: say is always present)");

  const deltas = [];
  for (const word of DELTA_WORDS)
    if (map[word] !== undefined)
      deltas.push(DELTA[word](file, step(trail, word), map[word]));

  const response = {};
  if (map.if !== undefined) response.gates = compileGate(file, step(trail, "if"), map.if);
  response.deltas = deltas;
  return response;
}

function compileAction(file, trail, id, value) {
  if (!Array.isArray(value))
    fail(file, trail, "an action is a list of responses, read top to bottom");
  return {
    id,
    responses: value.map((response, i) =>
      compileResponse(file, at(trail, i), response),
    ),
  };
}

function compileObject(file, trail, id, value) {
  const map = record(file, trail, value, "an object");
  closed(file, trail, map, OBJECT_KEYS, "an object key");

  const actionsTrail = step(trail, "actions");
  const actions = map.actions === undefined ? {} : record(file, actionsTrail, map.actions, "actions");

  return {
    id,
    line: text(file, step(trail, "tap"), map.tap, "tap"),
    actions: Object.keys(actions).map((actionId) =>
      compileAction(file, step(actionsTrail, actionId), actionId, actions[actionId]),
    ),
  };
}

/** One authored scene file into one engine Scene. */
export function compileScene(file, doc) {
  const map = record(file, "", doc, "a scene file");
  closed(file, "", map, SCENE_KEYS, "a scene key");

  const tier = text(file, "tier", map.tier, "tier");
  if (!TIERS.includes(tier))
    fail(file, "tier", `"${tier}" is not a knowledge tier (${TIERS.join(", ")})`);

  if (map.enter !== undefined) text(file, "enter", map.enter, "enter");

  const objects = record(file, "objects", map.objects, "objects");
  const scene = {
    id: text(file, "scene", map.scene, "scene"),
    // `tier` is authored law (LAWS.md #spoiler) checked over the YAML by
    // content-lint; the engine never reads it, so it stops here.
    ...(map.enter === undefined ? {} : { enter: map.enter }),
    line: text(file, "line", map.line, "line"),
    objects: Object.keys(objects).map((objectId) =>
      compileObject(file, step("objects", objectId), objectId, objects[objectId]),
    ),
  };
  return scene;
}

// ---------------------------------------------------------------------
// the bundle
// ---------------------------------------------------------------------

/**
 * Compiled scenes into one bundle. `start` is the scene a run begins
 * in; with one scene there is nothing to choose, with several the
 * caller must say which, because a compiler that guesses where the
 * game starts is a compiler that decides the game.
 */
export function compileBundle(files, options = {}) {
  const scenes = {};
  const source = new Map();

  for (const { file, doc } of files) {
    const scene = compileScene(file, doc);
    const seen = source.get(scene.id);
    if (seen !== undefined)
      fail(file, "scene", `"${scene.id}" is already the scene in ${seen}`);
    source.set(scene.id, file);
    scenes[scene.id] = scene;
  }

  const ids = Object.keys(scenes);
  if (ids.length === 0) throw new CompileError("content", "no scenes to compile");

  const start = options.start ?? (ids.length === 1 ? ids[0] : undefined);
  if (start === undefined)
    throw new CompileError(
      "content",
      `several scenes (${ids.join(", ")}) and no start — name one with --start`,
    );
  if (!Object.prototype.hasOwnProperty.call(scenes, start))
    throw new CompileError(
      "content",
      `start "${start}" is not a scene here (${ids.join(", ")})`,
    );

  return { start, scenes };
}

// ---------------------------------------------------------------------
// I/O — the only impure part, and it stays at the edge
// ---------------------------------------------------------------------

/** Every scene file in a directory, in a stable order, parsed. */
export function readScenes(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    throw new CompileError(dir, "no such content directory");
  }

  return names
    .filter((name) => name.endsWith(".yaml") || name.endsWith(".yml"))
    .sort()
    .map((name) => {
      const file = path.join(dir, name);
      let doc;
      try {
        doc = parse(readFileSync(file, "utf8"));
      } catch (error) {
        throw new CompileError(file, `YAML will not parse — ${error.message}`);
      }
      return { file, doc };
    });
}

/** Read, compile, write. Returns the bundle it wrote and where. */
export function build({ dir = "content", out, start } = {}) {
  const target = out ?? path.join(dir, "bundle.json");
  const bundle = compileBundle(readScenes(dir), { start });
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  return { bundle, out: target };
}

// ---------------------------------------------------------------------
// cli
// ---------------------------------------------------------------------

const OPTIONS = { "--in": "dir", "--out": "out", "--start": "start" };

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = OPTIONS[argv[i]];
    if (key === undefined)
      throw new CompileError(
        "argv",
        `unknown option "${argv[i]}" — expected ${Object.keys(OPTIONS).join(", ")}`,
      );
    const value = argv[i + 1];
    if (value === undefined)
      throw new CompileError("argv", `${argv[i]} needs a value`);
    args[key] = value;
    i += 1;
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { bundle, out } = build(parseArgs(argv));
    const scenes = Object.keys(bundle.scenes).length;
    console.log(
      `build-content: ${scenes} scene(s) → ${out}, starting at ${bundle.start}`,
    );
    return 0;
  } catch (error) {
    if (!(error instanceof CompileError)) throw error;
    console.error(`build-content: ${error.message}`);
    return 1;
  }
}

const invoked =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (invoked) process.exit(main());
