// H003 — the authored card schema: the shape a content agent writes.
//
// Two shapes exist for the same content and they are not the same shape:
//
//   content/*.yaml  →  this file  →  (H004 compiles)  →  types.ts Bundle
//
// The authored form is keyed maps and inline delta words, exactly as
// skill:content writes them. The engine-facing form (src/core/types.ts)
// is tagged unions with ids hoisted into the record. H004 owns the
// translation; nothing here loads, lints, or resolves anything.
//
// Law this file answers to:
//   VOCAB.md    the gate keys and the delta words below are the whole
//               language, in VOCAB.md's order. `say` is always present;
//               `refuse` carries no other delta; the reserved words are
//               named here only so a build can refuse them.
//   RULES.md 1  purity — no I/O, no globals, no module state.
//   RULES.md 3  closed languages — a word absent from the tables below
//               does not exist. New words arrive by amendment card.
//   RULES.md 5  cards are data — this file describes data, never rules.
//   CANON.md    a scene declares its knowledge tier and stays inside it.
//   skill:content  every action's response list ends in a gateless
//               fallback; the type below makes that a compile error to
//               omit, and `endsInFallback` makes it checkable at build.

import type {
  ActionId,
  AdjustTarget,
  DoorRef,
  EnemyId,
  FlagId,
  Gate,
  ItemId,
  JournalId,
  ObjectId,
  PromptSpec,
  SceneId,
} from "./types";

// ---------------------------------------------------------------------
// tiers — CANON.md #knowledge-tiers
// ---------------------------------------------------------------------

/** The knowledge tier a scene declares and may not exceed (LAWS #spoiler). */
export type Tier = "T0" | "T1" | "T2" | "T3";

// ---------------------------------------------------------------------
// gates — VOCAB.md, verbatim
//
// All listed must hold. A response with no `if` is the fallback.
// ---------------------------------------------------------------------

/** Authored gate. Same two keys as the engine's Gate; reused, not re-said. */
export type CardGate = Gate;

// ---------------------------------------------------------------------
// deltas — VOCAB.md, verbatim, in VOCAB.md order
//
// Authored inline on the response: `say:` beside `set:` beside `journal:`.
// The compiler tags and orders them; the author writes a flat map.
// ---------------------------------------------------------------------

/** VOCAB.md `adjust: {stat|tithes, amount, clamped}`. */
export type CardAdjust = {
  readonly target: AdjustTarget;
  readonly amount: number;
  /** Held inside the bar's bounds rather than overflowing it. */
  readonly clamped: boolean;
};

/** VOCAB.md `addObject`/`removeObject` — the cause is diegetic, LAWS #affordance. */
export type CardObjectChange = {
  readonly scene: SceneId;
  readonly object: ObjectId;
  readonly cause: string;
};

/** VOCAB.md `end: {line, note}`. */
export type CardEnd = {
  readonly line: string;
  readonly note: string;
};

/**
 * The delta words, as authored. `say` is required: VOCAB.md says it is
 * always present, so a response without one does not compile.
 */
export type CardDeltas = {
  readonly say: string;
  readonly set?: readonly FlagId[];
  readonly unset?: readonly FlagId[];
  readonly give?: readonly ItemId[];
  readonly take?: readonly ItemId[];
  readonly adjust?: CardAdjust;
  readonly journal?: JournalId;
  /** Logs to the refused ledger. VOCAB.md: no other delta beside `say`. */
  readonly refuse?: true;
  /** Forward-only. A door ref, not a scene id — the draw engine binds it. */
  readonly goto?: DoorRef;
  readonly addObject?: CardObjectChange;
  readonly removeObject?: CardObjectChange;
  readonly prompt?: PromptSpec;
  /** The one doorway into the Lots; it returns. */
  readonly fight?: EnemyId;
  readonly end?: CardEnd;
};

// ---------------------------------------------------------------------
// responses — read top to bottom, first passing gate wins
// ---------------------------------------------------------------------

/** One authored response: an optional gate, and the deltas it applies. */
export type CardResponse = CardDeltas & {
  readonly if?: CardGate;
};

/** A response that competes on its gate. Everything above the fallback. */
export type CardGatedResponse = CardDeltas & {
  readonly if: CardGate;
};

/** The gateless last word. Nothing gates it, so it can always answer. */
export type CardFallbackResponse = CardDeltas & {
  readonly if?: never;
};

/**
 * An action's response list. The tuple shape is the law made structural:
 * any number of gated responses, then exactly one gateless fallback, and
 * the fallback is last. A list that ends on a gate does not compile.
 */
export type CardResponses = readonly [
  ...CardGatedResponse[],
  CardFallbackResponse,
];

// ---------------------------------------------------------------------
// objects and scenes
//
// Ids are the map keys; the compiler hoists them into the record.
// ---------------------------------------------------------------------

/** An object in a scene. Always tappable while present (LAWS #affordance). */
export type CardObject = {
  /** The free tap. Describes; never advances, costs, or harms (GAME #descent). */
  readonly tap: string;
  readonly actions?: { readonly [id: ActionId]: CardResponses };
};

/** One authored scene file. */
export type CardScene = {
  readonly scene: SceneId;
  /** Declared per scene; content may not reach above it (LAWS #spoiler). */
  readonly tier: Tier;
  /** Arrival line, shown on entering. */
  readonly enter?: string;
  /** The standing line, shown every frame. */
  readonly line: string;
  readonly objects: { readonly [id: ObjectId]: CardObject };
};

// ---------------------------------------------------------------------
// the word tables
//
// Each table is typed by the shape above, so a key added to a type
// without a word here (or a word here without a key) is a compile error.
// The arrays keep declaration order, which is VOCAB.md order.
// ---------------------------------------------------------------------

type KeyTable<T> = { readonly [K in keyof T]-?: true };

const GATE_KEYS: KeyTable<CardGate> = {
  flags: true,
  items: true,
};

const DELTA_KEYS: KeyTable<CardDeltas> = {
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

const RESPONSE_KEYS: KeyTable<CardResponse> = {
  if: true,
  ...DELTA_KEYS,
};

const OBJECT_KEYS: KeyTable<CardObject> = {
  tap: true,
  actions: true,
};

const SCENE_KEYS: KeyTable<CardScene> = {
  scene: true,
  tier: true,
  enter: true,
  line: true,
  objects: true,
};

const TIERS: KeyTable<Record<Tier, unknown>> = {
  T0: true,
  T1: true,
  T2: true,
  T3: true,
};

export type CardGateKey = keyof CardGate;
export type CardDeltaKey = keyof CardDeltas;
export type CardResponseKey = keyof CardResponse;
export type CardObjectKey = keyof CardObject;
export type CardSceneKey = keyof CardScene;

/** VOCAB.md's two gate keys. */
export const CARD_GATE_KEYS = Object.keys(GATE_KEYS) as readonly CardGateKey[];

/** VOCAB.md's delta words, in VOCAB.md order — the order they apply in. */
export const CARD_DELTA_KEYS = Object.keys(
  DELTA_KEYS,
) as readonly CardDeltaKey[];

/** Everything a response may carry: the gate, then the delta words. */
export const CARD_RESPONSE_KEYS = Object.keys(
  RESPONSE_KEYS,
) as readonly CardResponseKey[];

export const CARD_OBJECT_KEYS = Object.keys(
  OBJECT_KEYS,
) as readonly CardObjectKey[];

export const CARD_SCENE_KEYS = Object.keys(
  SCENE_KEYS,
) as readonly CardSceneKey[];

export const CARD_TIERS = Object.keys(TIERS) as readonly Tier[];

/**
 * VOCAB.md's parked words. They are not deltas and must never become
 * one by accident — a build that meets one fails on it by name.
 */
export const RESERVED_WORDS = ["lies", "counter", "dropObols"] as const;

// ---------------------------------------------------------------------
// tiny pure predicates
//
// Shape questions only. Satisfiability, reachability, and the canon
// scan are the linter's (H005); loading is the compiler's (H004).
// ---------------------------------------------------------------------

export function isCardGateKey(key: string): key is CardGateKey {
  return Object.prototype.hasOwnProperty.call(GATE_KEYS, key);
}

export function isCardDeltaKey(key: string): key is CardDeltaKey {
  return Object.prototype.hasOwnProperty.call(DELTA_KEYS, key);
}

export function isCardResponseKey(key: string): key is CardResponseKey {
  return Object.prototype.hasOwnProperty.call(RESPONSE_KEYS, key);
}

export function isTier(value: string): value is Tier {
  return Object.prototype.hasOwnProperty.call(TIERS, value);
}

export function isReservedWord(key: string): boolean {
  return (RESERVED_WORDS as readonly string[]).includes(key);
}

/** No gate at all — the response that can always answer. */
export function isGateless(response: CardResponse): boolean {
  return response.if === undefined;
}

/**
 * The mandatory fallback, as a runtime check: a response list is
 * non-empty and its last response is gateless. Everything above it is
 * gated, or it could never be reached.
 */
export function endsInFallback(responses: readonly CardResponse[]): boolean {
  const last = responses[responses.length - 1];
  if (last === undefined) return false;
  return (
    isGateless(last) && responses.slice(0, -1).every((r) => !isGateless(r))
  );
}

/**
 * VOCAB.md: `refuse: true` logs to the refused ledger and carries no
 * other delta. `say` is exempt — it is always present.
 */
export function refusesCleanly(response: CardResponse): boolean {
  if (response.refuse !== true) return true;
  return Object.keys(response).every(
    (key) => key === "refuse" || key === "say" || key === "if",
  );
}
