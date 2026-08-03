// castlebrynth · core types — the shapes every other engine card imports.
//
// Types only: this file emits no runtime value. src/core is pure — no DOM, no
// I/O, no Date, no Math.random, no console (.llm/rules/engine.md).
//
// Four laws are carried by the type system here, not by comments:
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
//   4. NO SANITY BAR EXISTS ANYWHERE (DESIGN §frame). Sanity is a `Pool` like
//      hp — "either bar at zero is death, by the same rule" — and `Strip`, the
//      list of bars that render, has NO FIELD for it. There is nowhere to put
//      one, so the design's sentence is a type rather than a comment. The only
//      route sanity has to the screen is `GameView.vignette`, derived by
//      `view` and stored nowhere.
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

/**
 * WHAT YOU CARRY DOWN. One container, so that death is one field.
 *
 * "Pouch packed at the Crossing from the stash; mid-push finds are
 * swap-or-leave; no stash access below" (DESIGN §ledgers, death, growth). The
 * three containers were flat on the run branch until D001 gathered them, and
 * the gathering is not tidying: death "takes it, except ✦ key and • kept items
 * + one random survivor", and a law about a THING needs a thing to be about.
 * With the pouch named, D003 empties one field and tsc can see that it emptied
 * all of it; with three flat fields, a death that forgot `small` would compile,
 * pass every type law, and quietly let a run's knives ride through death.
 *
 * The arities are the design's (4 + 2) and they are the tuple types', so the
 * pouch's SHAPE never changes — only what is in the slots. An empty slot is
 * null, not a hole.
 */
export interface Pouch {
  /** The unbounded container: what a room's `give` lands in (resolve.ts). */
  readonly consumables: readonly ItemRef[];
  readonly equipment: EquipmentSlots;
  readonly small: SmallSlots;
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
   * The sanity bar. 0 = death, by the same rule as `hp` — DESIGN §ledgers:
   * "EITHER bar at zero — health or sanity — is death, by the same rule". The
   * same rule makes it the same kind of quantity, so it is the same type, and
   * a room moves it with the same arithmetic (cards.ts `Adjust`).
   *
   * Tracked, and never rendered as a number or a bar. It reaches the shell
   * only as `GameView.vignette` — derived, 0 = clear, 1 = closed, running the
   * other way from the bar it reads — and `Strip` has no field for it at all
   * (DESIGN §frame, .llm/rules/ui.md 5).
   */
  readonly sanity: Pool;
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
  /** This push's ROOT stream. Everything else forks from it. */
  readonly rng: RngState;
  /**
   * THE DESCENT'S STREAM, PERSISTED — rooms and doors draw from here (D002).
   *
   * It is a field and not a `fork(rng, STREAM.descent)` at each call site, and
   * that distinction is the whole reason it exists. A fork reads its parent's
   * SEED and deliberately never its `draws` (rng.ts `fork`), so it is FRESH AT
   * DRAW 0 every time — which is exactly the property that makes the tree of
   * streams reproducible, and exactly the property that makes re-forking by
   * name at each draw return the same number forever. Doors that redraw off the
   * death count would redraw the same three doors, at every depth, for the whole
   * push.
   *
   * So whoever consumes randomness must PERSIST the successor, not re-derive
   * the stream by name. This field is where the Descent persists it: a draw
   * reads it, and writes the state that comes after it back here, the same way
   * everything else in this engine threads a value forward.
   *
   * It lives on the RUN branch because a push's position in the labyrinth dies
   * with the push. Rebirth mints it again from the run's root, and the root is
   * mixed with the death count (rng.ts `runStream`), which is how "doors
   * redraw" after a death is a consequence of the seed rather than a special
   * case in the draw.
   */
  readonly descent: RngState;
  readonly depth: Depth;
  /** Where you are standing. null before the first room is drawn. */
  readonly roomId: Id | null;
  readonly vitals: Vitals;
  /** ◎ — the coin of the labyrinth. */
  readonly tithes: number;
  /** What you carry. Death takes it, except ✦ key and • kept items plus one
   *  random survivor (DESIGN §ledgers, death, growth; D003). */
  readonly pouch: Pouch;
  readonly skills: readonly SkillState[];
  /** One-shots for this push: doors opened, ambushes already sprung. Every id
   *  here carries `flag:` — a card names the ledger it writes in the id's own
   *  prefix (cards.ts `LedgerPrefix`). Anything that must ratchet across
   *  pushes carries `knowledge:` and lives on the campaign branch instead. */
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
  /** DICE SURVIVE DEATH — law. The plain bones and everything won since. */
  readonly dice: readonly DieRef[];
  /**
   * The signature die: the one CHOSEN at the Crossing, and the class.
   *
   * "Hand = 5 plain bones + 1 signature die CHOSEN at the Crossing ('one of
   * these was yours' — never confirmed). The choice is the class" (DESIGN §the
   * lots). So it is campaign property by the same law that keeps the dice —
   * a class you lose on death is not a class — and it is null only before the
   * first Crossing, which is the one moment the game has no answer to what you
   * are.
   *
   * HELD BESIDE `dice`, NOT INSIDE IT. A hand is composed of the plain bones
   * plus this one, so a signature that were also a member of `dice` would have
   * to be excluded again at every composition, and the invariant "exactly one
   * of your dice is the signature" would be a rule nothing enforces. Out here
   * it is a field that is either chosen or not.
   *
   * The engine never names WHICH die (.llm/rules/engine.md): the roster beyond
   * the wizard is content, and parked in DESIGN §open.
   */
  readonly signature: DieRef | null;
  /**
   * THE STASH: what you own but are not carrying.
   *
   * "Pouch packed at the Crossing from the stash ... no stash access below"
   * (DESIGN §ledgers, death, growth). It is on the campaign branch because it
   * is what waits for you between pushes, and it is DISTINCT FROM `dice`
   * because a die is not an item: dice are the hands and survive death by their
   * own law, while stashed items are the things a Crossing packs a pouch from.
   * One list for both would make "DICE SURVIVE DEATH" a filter over a mixed
   * list rather than a branch of the state.
   *
   * Death does not reach here — nothing on this branch is death's — so what a
   * death returns from the pouch (✦ key, • kept, one random survivor) is placed
   * here by the REBIRTH transition, which is the lifecycle's and not death's
   * (types.ts `DeathTransition`, D003).
   */
  readonly stash: readonly ItemRef[];
  /** Machine-readable understanding: what gates may now open. This is where
   *  `knowledge:`-prefixed ids live, and the prefix is the whole of how a card
   *  says so (cards.ts `LedgerPrefix`) — there is no second field and no second
   *  write word. It RATCHETS: `set` raises knowledge, and nothing lowers it —
   *  `unset` of a `knowledge:` id fails at LOAD, because a ratchet you can
   *  lower is not a ratchet (DESIGN §the descent). */
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
  /** Sanity, as the vignette closes in: 0 = clear, 1 = closed. DERIVED from
   *  `RunBranch.vitals.sanity` by `view` and stored nowhere, and it is the ONLY
   *  way sanity reaches the shell — there is no bar and no number
   *  (DESIGN §frame, .llm/rules/ui.md 5). */
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

/**
 * HP · Might · Will · ◎ tithes · depth (DESIGN §frame).
 *
 * SANITY IS NOT HERE, and its absence is the law rather than an oversight.
 * This interface is the list of bars that render, so a `sanity` field on it
 * would BE the bar DESIGN §frame forbids — "no sanity bar exists anywhere".
 * Sanity is a `Pool` on the state like any other (`Vitals.sanity`), and the
 * one thing that must stay true of it is that nothing can draw it: it leaves
 * the engine only as `GameView.vignette`. Adding a field here is not a widening
 * of the strip, it is the repeal of a design law, and tsc refuses it today.
 */
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
