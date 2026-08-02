// H007 — the save envelope, v1.
//
// Law this file answers to:
//   RULES.md 1   purity — no DOM, no I/O, no clock. Strings in, strings
//                out; the platform that owns storage arrives in P1.
//   RULES.md 2   determinism — the RNG stream is a field on GameState,
//                so a save carries the whole of play and nothing else.
//   RULES.md 10  saves — versioned envelope only; unknown versions parse
//                to null, never throw.
//
// The envelope is `{ v: 1, state }` and nothing more. There are no
// migrations here: v1 is the only version this file has ever written, so
// there is no older shape to lift. When v2 exists it arrives on its own
// card, and this file learns to read v1 into it.
//
// What `parse` checks is *shape*, not vocabulary. A delta's `kind` is
// closed by the compiler at bundle load (RULES.md 3); re-listing the
// words here would put the language in two places. So the walk below
// asks "is this a delta-shaped object", never "is this a real word".

import type { Bundle, GameState } from "./types";

/** The only version this file writes. */
export const SAVE_VERSION = 1;

/** What `serialize` produces and `parse` consumes. */
export type SaveEnvelope = {
  readonly v: typeof SAVE_VERSION;
  readonly state: GameState;
};

// ---------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------

/**
 * A whole GameState as one envelope string. Deterministic: the same
 * state yields the same bytes, because every field is JSON and key order
 * is the state's own.
 */
export function serialize(state: GameState): string {
  return JSON.stringify({ v: SAVE_VERSION, state });
}

// ---------------------------------------------------------------------
// shape predicates
//
// Structural only. Extra keys ride along untouched — the envelope's job
// is to refuse corruption, not to strip what it does not recognise.
// ---------------------------------------------------------------------

type UnknownRecord = { readonly [key: string]: unknown };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): boolean {
  // NaN and Infinity do not survive JSON — they land as null.
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isIdList(value: unknown): boolean {
  return Array.isArray(value) && value.every((id) => typeof id === "string");
}

function isListOf(
  value: unknown,
  member: (item: unknown) => boolean,
): boolean {
  return Array.isArray(value) && value.every(member);
}

/** Refusal — ActionRef plus where it happened (the knowledge ratchet). */
function isRefusal(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.scene === "string" &&
    typeof value.object === "string" &&
    typeof value.action === "string"
  );
}

function isDelta(value: unknown): boolean {
  // Tagged on `kind`; which words are legal is the loader's ruling.
  return isRecord(value) && typeof value.kind === "string";
}

function isGate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.flags !== undefined && !isIdList(value.flags)) return false;
  if (value.items !== undefined && !isIdList(value.items)) return false;
  return true;
}

function isResponse(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.gates !== undefined && !isGate(value.gates)) return false;
  return isListOf(value.deltas, isDelta);
}

function isAction(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOptionalString(value.label) &&
    isListOf(value.responses, isResponse)
  );
}

function isSceneObject(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOptionalString(value.label) &&
    typeof value.line === "string" &&
    isListOf(value.actions, isAction)
  );
}

function isScene(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOptionalString(value.enter) &&
    typeof value.line === "string" &&
    isListOf(value.objects, isSceneObject)
  );
}

function isBundle(value: unknown): value is Bundle {
  return (
    isRecord(value) &&
    typeof value.start === "string" &&
    isRecord(value.scenes) &&
    Object.values(value.scenes).every(isScene)
  );
}

/**
 * Both ledgers, composed flat (RULES.md 9). Every field the contract
 * names must be present and of its type; a save missing one is not a
 * save.
 */
function isGameState(value: unknown): value is GameState {
  return (
    isRecord(value) &&
    // campaign ledger
    isNumber(value.seed) &&
    isIdList(value.flags) &&
    isIdList(value.journal) &&
    isListOf(value.refused, isRefusal) &&
    // run ledger
    typeof value.scene === "string" &&
    isIdList(value.items) &&
    isNumber(value.rng) &&
    // content
    isBundle(value.bundle)
  );
}

// ---------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------

/**
 * A save string back into play, or null. Null on malformed JSON, on any
 * version this file does not know, and on a state missing a field the
 * contract names. It never throws: a bad save is a fact to handle, not
 * an exception to catch (RULES.md 10).
 */
export function parse(raw: string): GameState | null {
  if (typeof raw !== "string") return null;

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(envelope)) return null;
  if (envelope.v !== SAVE_VERSION) return null;
  if (!isGameState(envelope.state)) return null;

  return envelope.state;
}
