// castlebrynth · core types — the shapes every other engine card imports.
//
// Types only: this file emits no runtime value. src/core is pure — no DOM, no
// I/O, no Date, no Math.random, no console (.llm/rules/engine.md).
//
// Three laws are carried by the type system here, not by comments:
//
//   1. NOTHING IN THE STATE IS WRITABLE. Every field is `readonly` and every
//      list is a ReadonlyArray, all the way down. So `view` — the free tap —
//      structurally cannot mutate what it is handed; tsc rejects it. That is
//      why there is no DeepReadonly<> helper and no defensive cloning.
//      (.llm/rules/ui.md: "Free tap NEVER mutates state".)
//
//   2. RUN AND CAMPAIGN ARE DISJOINT BRANCHES. They carry different `branch`
//      discriminants, so neither is assignable to the other in either
//      direction, and `DeathTransition` names only the run branch — death code
//      has no path to the campaign ledger because the campaign ledger is not
//      in its types. DICE SURVIVE DEATH (DESIGN §ledgers, death, growth).
//
//   3. THE STATE IS JSON. Every field is a JSON primitive, an object of them,
//      or a list of them: no Map, no Set, no Date, no class, no undefined. A
//      run is `seed + deaths + inputs`, exactly, and it must survive a save.
//
// Behaviour lives elsewhere by design: H002 the RNG algorithm, H003 rooms,
// H004 the content compiler, H006 resolution.

/** An authored content id. The engine never names a specific die, joker or
 *  enemy — it only ever passes ids through (.llm/rules/engine.md). */
export type Id = string;

/** 0 = the Crossing; the labyrinth runs downward from there. */
export type Depth = number;

// ─────────────────────────────────────────────────────────────── randomness ──

/**
 * Where the seeded RNG lives: on the state, never in a module.
 *
 * Counter form on purpose. The stream is a pure function of (seed, draws), so
 * a save can be resumed mid-push and a run can be replayed from `seed + deaths
 * + inputs` without replaying the RNG's internal churn. H002 owns the mapping
 * from (seed, draws) to a value and the fixed draw order; it must not add
 * hidden state anywhere else.
 */
export interface RngState {
  readonly seed: number;
  /** How many draws this stream has served. Advances, never rewinds — no
   *  takebacks (.llm/rules/engine.md). */
  readonly draws: number;
}

// ──────────────────────────────────────────────────────────── things you own ──

/**
 * What death does with an item.
 * `none` — death takes it. `kept` — • kept, it comes back with you.
 * `key`  — ✦ key, it comes back with you. (DESIGN §ledgers, death, growth.)
 */
export type Keep = "none" | "kept" | "key";

export interface ItemRef {
  readonly id: Id;
  readonly keep: Keep;
}

/** An empty slot is null, not a hole: the pouch's shape never changes. */
export type Slot = ItemRef | null;

/** Exactly 4. The arity is design law, so the type enforces it. */
export type EquipmentSlots = readonly [Slot, Slot, Slot, Slot];

/** Exactly 2. */
export type SmallSlots = readonly [Slot, Slot];

/** A die you own. Campaign property; death cannot touch it. */
export interface DieRef {
  readonly id: Id;
}

/** A skill: found, uses-per-rest, spent AFTER the dice land. */
export interface SkillState {
  readonly id: Id;
  readonly uses: Pool;
}

// ───────────────────────────────────────────────────────────────────── vitals ──

/** A bar or a set of uses; both are restored at the Crossing. */
export interface Pool {
  readonly current: number;
  readonly max: number;
}

export interface Vitals {
  readonly hp: Pool;
  readonly might: Pool;
  readonly will: Pool;
  /**
   * 0 = clear, 1 = closed. This is the vignette, and only the vignette: no
   * sanity bar exists anywhere on screen (DESIGN §frame).
   */
  readonly sanity: number;
}

// ──────────────────────────────────────────────────────────── the two branches ──

/**
 * THE RUN BRANCH — everything death takes.
 *
 * Tithes, consumables and non-kept gear (4 equipment + 2 small slots), plus the
 * position and condition of this push. Death empties it, except ✦ key and •
 * kept items plus one random survivor (DESIGN §ledgers, death, growth).
 */
export interface RunBranch {
  readonly branch: "run";
  readonly rng: RngState;
  readonly depth: Depth;
  /** Where you are standing. null before the first room is drawn. */
  readonly roomId: Id | null;
  readonly vitals: Vitals;
  /** ◎ — the coin of the labyrinth. */
  readonly tithes: number;
  readonly consumables: readonly ItemRef[];
  readonly equipment: EquipmentSlots;
  readonly small: SmallSlots;
  readonly skills: readonly SkillState[];
  /** One-shots for this push: doors opened, ambushes already sprung. Anything
   *  that must ratchet across pushes is knowledge, and lives on the campaign
   *  branch instead. */
  readonly flags: readonly Id[];
}

/**
 * THE CAMPAIGN BRANCH — death cannot touch it.
 *
 * Dice, knowledge, landmarks, grants (DESIGN §ledgers, death, growth), plus the
 * two records that ratchet cross-push: the journal and your refusals
 * ("refusals + clues pay off on later meetings", DESIGN §the descent).
 */
export interface CampaignBranch {
  readonly branch: "campaign";
  /** DICE SURVIVE DEATH — law. */
  readonly dice: readonly DieRef[];
  /** Machine-readable understanding: what gates may now open. */
  readonly knowledge: readonly Id[];
  /** Human-readable lines. Records acts, never morals (DESIGN §content laws). */
  readonly journal: readonly string[];
  /** What the labyrinth refused you, and where. Remembered. */
  readonly refused: readonly Refusal[];
  /** Fixed per depth; once met, always known. */
  readonly landmarks: readonly Id[];
  readonly grants: readonly Id[];
}

export interface Refusal {
  readonly intent: Intent;
  readonly depth: Depth;
}

/** The whole save. */
export interface GameState {
  /** The campaign seed. */
  readonly seed: number;
  /** How many times you have died. With `seed` it names the current run:
   *  a run is `seed + deaths + inputs`, exactly (.llm/rules/engine.md). */
  readonly deaths: number;
  readonly campaign: CampaignBranch;
  readonly run: RunBranch;
}

/**
 * Death, typed.
 *
 * The parameter and the return are the run branch and nothing else, so
 * "death code may only touch the run branch" (.llm/rules/engine.md) is checked
 * by tsc rather than trusted to a reviewer. A death transition cannot read the
 * campaign ledger, cannot return one, and cannot be handed the whole state.
 *
 * Incrementing `GameState.deaths` is deliberately NOT death code: that counter
 * is the run's identity, minted by the run lifecycle when the next push
 * begins, alongside the seed. Death itself is the emptying of the pouch.
 */
export type DeathTransition = (dying: RunBranch) => RunBranch;

// ─────────────────────────────────────────────────────────────────── the view ──

/**
 * What the free tap is allowed to produce: a picture of the state, derived,
 * never stored. `view` takes a deep-readonly GameState and returns this.
 */
export interface GameView {
  /** The full-bleed pixel still. null before the first room is drawn. */
  readonly still: Id | null;
  /** 1–2 lines of writing on top of the art (DESIGN §frame). */
  readonly lines: readonly string[];
  /** Everything in the room you may tap. There is no `tappable` flag to
   *  toggle: presence IS tappability, which is affordance permanence made
   *  structural (DESIGN §content laws). */
  readonly objects: readonly ViewObject[];
  /** All three pages at once. Paging ◂ ACTIONS · SKILLS · ITEMS ▸ and
   *  selecting an object are free taps, so the shell does both without asking
   *  the engine and therefore without mutating anything. */
  readonly panel: PanelView;
  /** The permanent strip. Never collapses, never hides (.llm/rules/ui.md). */
  readonly strip: Strip;
  /** Sanity, as the vignette closes in. No bar (DESIGN §frame). */
  readonly vignette: number;
}

export interface ViewObject {
  readonly id: Id;
  /** What the writing calls it. */
  readonly label: string;
  /** The named investigation actions this object affords — PEER, LISTEN,
   *  REACH IN. These carry the risk; the tap that surfaced them did not. */
  readonly actions: readonly ActionOption[];
}

export interface PanelView {
  /** Room-level actions, offered when nothing is selected. */
  readonly actions: readonly ActionOption[];
  readonly skills: readonly ActionOption[];
  readonly items: readonly ActionOption[];
}

export interface ActionOption {
  readonly intent: Intent;
  readonly label: string;
}

/** HP · Might · Will · ◎ tithes · depth (DESIGN §frame). */
export interface Strip {
  readonly hp: Pool;
  readonly might: Pool;
  readonly will: Pool;
  readonly tithes: number;
  readonly depth: Depth;
}

// ────────────────────────────────────────────────────────── acts and effects ──

/** An act: this object, this action. The only way state changes. */
export interface Intent {
  readonly object: Id;
  readonly action: Id;
}

/**
 * The player's answer inside an act — a chosen option, a QTE tap. A JSON
 * primitive, because inputs are one third of what makes a run replayable and
 * must survive a save.
 */
export type ActInput = string | number | null;

export interface ActResult {
  readonly state: GameState;
  readonly effects: readonly Effect[];
}

/**
 * What an act asks the shell to present. A closed set: a new kind is its own
 * Asana card, never a quiet edit (.llm/rules/engine.md).
 *
 * These are Descent presentation effects. The Lots speak a different closed
 * language — manifest hooks and effect verbs — which lives in grammar.yaml and
 * is not modelled here.
 */
export type Effect =
  /** A line of writing. */
  | { readonly kind: "say"; readonly text: string }
  /** A letterboxed close-up. The camera coming close IS the alarm; reserved
   *  for glimpses of the child, first openings, boss intros, deaths
   *  (DESIGN §art direction). */
  | { readonly kind: "cinema"; readonly still: Id };

// ───────────────────────────────────────────────────────────────── the surface ──

/**
 * Compiled content. H004 owns the compiler and everything else in the bundle;
 * core needs only the format version and the room a push opens in.
 */
export interface ContentBundle {
  readonly version: number;
  /** The Crossing: where a new run — and every rebirth — begins. */
  readonly start: Id;
}

/** A save on its way to or from storage. Versioned so an unknown version can
 *  be refused (returns null) instead of throwing (.llm/rules/engine.md). */
export interface SaveEnvelope {
  readonly version: number;
  readonly state: GameState;
}

/**
 * The whole engine surface. Five functions, no more.
 *
 * `view` is total and pure: state in, picture out, nothing touched.
 * `act` is the only transition, and it returns a new state rather than
 * editing one — it cannot edit one, because GameState is readonly throughout.
 */
export interface GameAPI {
  readonly newRun: (seed: number, bundle: ContentBundle) => GameState;
  readonly view: (state: GameState) => GameView;
  readonly act: (state: GameState, intent: Intent, input?: ActInput) => ActResult;
  readonly save: (state: GameState) => string;
  /** null on anything we do not speak. Never throws. */
  readonly load: (text: string) => GameState | null;
}
