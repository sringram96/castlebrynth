// H001 — the contract hub. Types and tiny pure helpers; no behavior.
//
// Law this file answers to:
//   RULES.md 1  purity — no DOM, I/O, Date, Math.random, console.
//   RULES.md 2  determinism — every field here survives a JSON round-trip.
//   RULES.md 3  closed languages — the Delta union below is VOCAB.md,
//               word for word. New words arrive by amendment card only.
//   RULES.md 9  two ledgers in the type system — CampaignLedger and
//               RunLedger are distinct branches; death may only touch
//               the run branch.
//   P0.md       GameAPI (newRun / act / getView) is frozen here; the
//               shell consumes only these types in P1.
//
// H006 implements the API against these types. Nothing here decides.

// ---------------------------------------------------------------------
// ids
//
// Plain aliases, not brands: content arrives as JSON strings from the
// compiler (H004) and must stay assignable both ways.
// ---------------------------------------------------------------------

export type SceneId = string;
export type ObjectId = string;
export type ActionId = string;
export type FlagId = string;
export type ItemId = string;
export type JournalId = string;
export type DoorRef = string;
export type EnemyId = string;
export type StatId = string;

/** RNG state is data on GameState (RULES.md 2). H002 owns the algorithm. */
export type RngState = number;

// ---------------------------------------------------------------------
// json
//
// The whole state graph is JSON — no Set, no Map, no Date, no class.
// ---------------------------------------------------------------------

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonObject = { readonly [key: string]: JsonValue };

// ---------------------------------------------------------------------
// content — the card/bundle surface the engine consumes
//
// This is the compiled, engine-facing shape: deltas are tagged on
// `kind` so resolve can switch exhaustively. H003 owns the authored
// YAML shape; H004 compiles that into this.
// ---------------------------------------------------------------------

/** VOCAB.md gates. All listed must hold; a gateless response is the fallback. */
export type Gate = {
  /** All set on the campaign ledger. */
  readonly flags?: readonly FlagId[];
  /** All currently carried on the run ledger. */
  readonly items?: readonly ItemId[];
};

/** VOCAB.md `adjust: {stat|tithes, amount, clamped}`. */
export type AdjustTarget = StatId | "tithes";

/**
 * VOCAB.md `prompt: {...}` — the QTE payload. VOCAB leaves the shape
 * open; the QTE amendment card closes it. Until then: JSON, nothing more.
 */
export type PromptSpec = JsonObject;

/**
 * The Descent's delta set — exactly VOCAB.md, in VOCAB.md order.
 * Deltas apply in this order within a response; `say` is always present.
 */
export type Delta =
  | { readonly kind: "say"; readonly text: string }
  | { readonly kind: "set"; readonly flags: readonly FlagId[] }
  | { readonly kind: "unset"; readonly flags: readonly FlagId[] }
  | { readonly kind: "give"; readonly items: readonly ItemId[] }
  | { readonly kind: "take"; readonly items: readonly ItemId[] }
  | {
      readonly kind: "adjust";
      readonly target: AdjustTarget;
      readonly amount: number;
      readonly clamped: boolean;
    }
  | { readonly kind: "journal"; readonly entry: JournalId }
  /** Logs to the refused ledger; no other delta beside the mandatory say. */
  | { readonly kind: "refuse" }
  /** Forward-only; doors are bound by the draw engine. */
  | { readonly kind: "goto"; readonly door: DoorRef }
  | {
      readonly kind: "addObject";
      readonly scene: SceneId;
      readonly object: ObjectId;
      /** Diegetic cause — LAWS.md #affordance requires it on the delta. */
      readonly cause: string;
    }
  | {
      readonly kind: "removeObject";
      readonly scene: SceneId;
      readonly object: ObjectId;
      readonly cause: string;
    }
  | { readonly kind: "prompt"; readonly prompt: PromptSpec }
  /** The one doorway into the Lots; it returns. */
  | { readonly kind: "fight"; readonly enemy: EnemyId }
  | { readonly kind: "end"; readonly line: string; readonly note: string };

export type DeltaKind = Delta["kind"];

/** A gated response. `gates` absent = the mandatory gateless fallback. */
export type Response = {
  readonly gates?: Gate;
  readonly deltas: readonly Delta[];
};

/** Responses are read top to bottom; the first whose gates all pass wins. */
export type Action = {
  readonly id: ActionId;
  readonly label?: string;
  readonly responses: readonly Response[];
};

export type SceneObject = {
  readonly id: ObjectId;
  readonly label?: string;
  /** The free-tap description (GAME.md #descent: tap describes, never advances). */
  readonly line: string;
  readonly actions: readonly Action[];
};

export type Scene = {
  readonly id: SceneId;
  /** Arrival line, shown once on entering. */
  readonly enter?: string;
  readonly line: string;
  readonly objects: readonly SceneObject[];
};

/** The compiled content the engine resolves against (H004 builds it). */
export type Bundle = {
  readonly start: SceneId;
  readonly scenes: { readonly [id: SceneId]: Scene };
};

// ---------------------------------------------------------------------
// state — two ledgers (RULES.md 9, GAME.md #ledgers)
// ---------------------------------------------------------------------

/** What was tapped, and where. */
export type ActionRef = {
  readonly object: ObjectId;
  readonly action: ActionId;
};

/**
 * One entry in the refused ledger. The knowledge ratchet is cross-push
 * (GAME.md #descent): a refusal logged now pays off when its kind is
 * met again later, so the record keeps the kind, not just a count.
 */
export type Refusal = ActionRef & { readonly scene: SceneId };

/**
 * Campaign ledger — knowledge, flags, landmarks, grants. Death cannot
 * touch it (GAME.md #ledgers). Refusals and journal entries are
 * knowledge: they ratchet across pushes.
 */
export type CampaignLedger = {
  /** The save seed. A run is determined by seed + death count + inputs. */
  readonly seed: number;
  /** A string set, held as a JSON-safe unique list — never a Set. */
  readonly flags: readonly FlagId[];
  readonly journal: readonly JournalId[];
  readonly refused: readonly Refusal[];
};

/**
 * Run ledger — position, carried items, the live RNG stream. Death
 * takes it (GAME.md #death). Death code may touch only this branch.
 */
export type RunLedger = {
  readonly scene: SceneId;
  readonly items: readonly ItemId[];
  readonly rng: RngState;
};

/**
 * The whole of play, as data.
 *
 * The two ledgers are distinct named branches (RULES.md 9) composed
 * flat, so a field rule stays lintable while the shell and the root
 * acceptance read `state.flags` directly.
 *
 * `bundle` rides on state because the frozen GameAPI passes content to
 * `newRun` only — `act(state, ref, input?)` takes no bundle (P0.md),
 * and core keeps no module state (skill:engine).
 */
export type GameState = CampaignLedger &
  RunLedger & {
    readonly bundle: Bundle;
  };

// ---------------------------------------------------------------------
// GameAPI — frozen in P0.md; the shell consumes only this
// ---------------------------------------------------------------------

/**
 * What the shell must show or do. Every kind is a VOCAB.md word; the
 * purely-ledger deltas (set, give, refuse, …) are observable on state
 * instead. `say` is the floor: every response carries one.
 */
export type Effect =
  | { readonly kind: "say"; readonly text: string }
  | { readonly kind: "journal"; readonly entry: JournalId }
  | { readonly kind: "goto"; readonly door: DoorRef }
  | { readonly kind: "prompt"; readonly prompt: PromptSpec }
  | { readonly kind: "fight"; readonly enemy: EnemyId }
  | { readonly kind: "end"; readonly line: string; readonly note: string };

export type EffectKind = Effect["kind"];

/** An object as the shell draws it: what it is, what it offers. */
export type ViewObject = {
  readonly id: ObjectId;
  readonly actions: readonly ActionId[];
};

/** Everything needed to render a frame. Reading it is free — no mutation. */
export type View = {
  readonly enter?: string;
  readonly line: string;
  readonly scene: SceneId;
  readonly objects: readonly ViewObject[];
};

/** QTE input handed back through `act` (VOCAB.md prompt). */
export type ActInput = JsonValue;

export type ActResult = {
  readonly state: GameState;
  readonly effects: readonly Effect[];
};

export type NewRun = (seed: number, bundle: Bundle) => GameState;
export type Act = (
  state: GameState,
  ref: ActionRef,
  input?: ActInput,
) => ActResult;
export type GetView = (state: GameState) => View;

/** The whole contract the shell gets in P1. H006 supplies it. */
export type GameAPI = {
  readonly newRun: NewRun;
  readonly act: Act;
  readonly getView: GetView;
};

// ---------------------------------------------------------------------
// tiny pure helpers
// ---------------------------------------------------------------------

/**
 * The exhaustiveness hook. Put this in a switch's default and the
 * compiler refuses the switch the moment a vocabulary word is added
 * without a case for it (RULES.md 3, skill:engine).
 */
export function assertNever(value: never): never {
  throw new Error(`unreachable: ${JSON.stringify(value)}`);
}

/** Set membership over a JSON-safe id list. */
export function hasId(set: readonly string[], id: string): boolean {
  return set.includes(id);
}

/** Set insert. Never mutates; always returns a fresh list. */
export function addId(set: readonly string[], id: string): readonly string[] {
  return set.includes(id) ? [...set] : [...set, id];
}

/** Set remove. Never mutates; always returns a fresh list. */
export function removeId(
  set: readonly string[],
  id: string,
): readonly string[] {
  return set.filter((member) => member !== id);
}

/** Two taps at the same object and action. */
export function sameRef(a: ActionRef, b: ActionRef): boolean {
  return a.object === b.object && a.action === b.action;
}
