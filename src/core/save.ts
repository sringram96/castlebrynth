// castlebrynth · the save envelope — writing a state out, and auditing one back.
//
// H001 laid a `save`/`load` pair on api.ts that proved the envelope was
// VERSIONED. This card makes it prove the envelope is a STATE. Those are
// different promises, and only the second one keeps the engine safe: a save
// carrying `version: 2` and `run.rng: { seed: "42", draws: -1 }` passed every
// check H001 wrote, loaded clean, and handed rng.ts a stream whose `wordAt`
// answers NaN forever. A run is `seed + death count + inputs, exactly`
// (.llm/rules/engine.md) — a poisoned seed is not a corrupt picture, it is a
// run that cannot be replayed and cannot be reasoned about.
//
// So: VALIDATE SHAPE, NOT JUST VERSION. And on anything that fails, return
// null. Never throw (.llm/rules/engine.md), and never hand a half-audited state
// to the engine on the theory that the missing part will not be read.
//
// src/core is pure: no DOM, no I/O, no Date, no Math.random, no console. This
// card takes text and returns a value; it does not know where the text came
// from and it never asks.
//
// ────────────────────────────────────────────────── the audit is a table, by compile ──
//
// Every guard below is an `Audit<T>` — a mapped type over `keyof T`, so the
// audit for a shape is EXHAUSTIVE by compile. A field added to `RunBranch`
// without a line in `RUN_AUDIT` does not build. That is deliberate and it is
// aimed squarely at the next card in this lane: D001 adds fields to both
// branches, and the failure mode this file exists to prevent is exactly a new
// field that nothing checks. tsc keeps that promise; a reviewer would not.
//
// This is the same device cards.ts uses for the word tables and resolve.ts for
// `WORD_LANDING`. One idiom, three places, same reason.
//
// ─────────────────────────────────────────────────────────────── the versions ──
//
//   1  H001's envelope. Versioned, and shallow: both branches present and
//      claiming their own names, and nothing else checked.
//   2  this card. The same STATE SHAPE — a v1 save is a v2 save — but written
//      by an envelope that audits, and read back through one. The bump is the
//      first link of the migration chain rather than a change of shape, and it
//      is laid now so that D001's state change has a chain to hang on instead
//      of inventing one under pressure.
//
// A v1 save therefore loads, through `MIGRATIONS`, and then faces the same
// audit every v2 save faces. That is the whole of "repair": what is carried
// forward is carried forward, and what is poisoned is REFUSED — a repaired
// seed would be a different run wearing the same save's name.
//
// Unknown version — older than the chain, or newer than this build — is null,
// not an exception and not a guess (.llm/rules/engine.md).
//
// ───────────────────────────────────────────────────── deliberately absent ──
//
//   no repair of values   see above. Null is the honest answer; a save the
//                         engine cannot replay is not a save.
//   no content check      that a `roomId` names a room the bundle has is the
//                         content loader's (cards.ts `loadRoom`) — unknown
//                         words fail at LOAD, there, against a bundle this
//                         card is not given and must not read.
//   no balance check      that hp is inside its max, that tithes is not
//                         negative: floors are H205's and D003's. An audit
//                         that refused a save for being unbalanced would make
//                         a balance bug unrecoverable instead of visible.

import type {
  CampaignBranch,
  DieRef,
  GameState,
  Intent,
  ItemRef,
  Keep,
  Pool,
  Refusal,
  RngState,
  RunBranch,
  SaveEnvelope,
  SkillState,
  Slot,
  Vitals,
} from "./types";

/**
 * The version this build writes. Older versions load through `MIGRATIONS`;
 * anything outside the chain is null.
 *
 * Bump this when the state shape changes, and add the migration in the same
 * commit — a bump without a link strands every save in the field.
 */
export const SAVE_VERSION = 2;

// ────────────────────────────────────────────────────────────── the primitives ──

/** A guard over an unknown field, as the audit tables hold them. */
type Check = (value: unknown) => boolean;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A whole number JS can hold exactly.
 *
 * `Number.isSafeInteger` and not `typeof === "number"`: it is one call, and it
 * rejects every one of the things a hand-edited or truncated save actually
 * carries — NaN, Infinity, 1e308, 3.5, and the integers past 2^53 where
 * arithmetic silently stops being arithmetic. A seed the engine cannot count
 * with is the poison this card exists to catch.
 */
const isSafeInt: Check = (value) => typeof value === "number" && Number.isSafeInteger(value);

/** A whole number that counts something, so it never runs backwards: draws
 *  served, deaths died. Advances, never rewinds — no takebacks
 *  (.llm/rules/engine.md). */
const isCount: Check = (value) => isSafeInt(value) && (value as number) >= 0;

const isString: Check = (value) => typeof value === "string";

/** A list, every item of which passes. An empty list passes: a fresh campaign
 *  owns nothing and knows nothing (api.ts `freshCampaign`). */
function listOf(item: Check): Check {
  return (value) => Array.isArray(value) && value.every(item);
}

/** A list of exactly `n` items, every one of which passes. The pouch's shape
 *  never changes (types.ts `Slot`), so its arity is audited, not assumed. */
function tupleOf(n: number, item: Check): Check {
  return (value) => Array.isArray(value) && value.length === n && value.every(item);
}

/** Exactly this string, as a discriminant. */
function literal(word: string): Check {
  return (value) => value === word;
}

/**
 * The keys of one shape, each with the guard that proves it.
 *
 * `-?` makes every key required IN THE TABLE even where it is optional on the
 * shape, which is the point: an optional field still needs a decision, and the
 * decision is written here rather than left to whether a save happened to carry
 * one.
 */
type Audit<T> = { readonly [K in keyof T]-?: Check };

/** A table, made a guard: a record, and every audited key holding.
 *
 *  Keys the table does not name are NOT rejected. A save is data on a disk we
 *  do not own; the promise this card makes is that everything `GameState`
 *  declares is well-formed, not that nothing else was ever written beside it.
 *  The engine reads by name and the state is readonly to the leaves
 *  (types.ts law 1), so an unnamed key is inert. */
function audit<T>(table: Audit<T>): Check {
  // Every value of an `Audit<T>` is a `Check` by construction, but tsc cannot
  // see that through a mapped type over a generic `keyof T`, so the erasure is
  // spelled once here rather than at each of the fifteen call sites.
  const entries = Object.entries(table as unknown as Record<string, Check>);
  return (value) => {
    if (!isRecord(value)) return false;
    for (const [key, check] of entries) if (!check(value[key])) return false;
    return true;
  };
}

// ──────────────────────────────────────────────────────────────── the shapes ──

/**
 * THE ONE THIS CARD IS FOR.
 *
 * `{ seed, draws }`, both whole, `draws` never negative — and `rng` PRESENT.
 * H001's check did not look at this object at all, so a save with no `rng` on
 * its run branch loaded happily and died at the first draw, inside rng.ts,
 * with a stack trace naming a file that had done nothing wrong.
 */
const RNG_AUDIT: Audit<RngState> = { seed: isSafeInt, draws: isCount };
const isRng = audit(RNG_AUDIT);

/** A bar, or a set of uses. Both whole; `max` counts, so it cannot be negative.
 *  `current` MAY be negative — nothing is clamped in this engine (resolve.ts:
 *  "the delta arrived first"), and a bar below zero is a death H205/D003 have
 *  not read yet, not a corrupt save. */
const POOL_AUDIT: Audit<Pool> = { current: isSafeInt, max: isCount };
const isPool = audit(POOL_AUDIT);

const VITALS_AUDIT: Audit<Vitals> = {
  hp: isPool,
  might: isPool,
  will: isPool,
  /** The sanity BAR (types.ts `Vitals.sanity`) — a `Pool` like `hp`, audited by
   *  the same guard, because either at zero is death by the same rule
   *  (DESIGN §ledgers). There is no vignette on the state to audit: it is
   *  derived by `view` and stored nowhere. */
  sanity: isPool,
};
const isVitals = audit(VITALS_AUDIT);

/** Exhaustive over `Keep` by compile: a fourth thing death could do with an
 *  item would have to be decided here as well as in types.ts. */
const KEEP_VALUES: { readonly [K in Keep]: true } = { none: true, kept: true, key: true };
const isKeep: Check = (value) => typeof value === "string" && value in KEEP_VALUES;

const ITEM_AUDIT: Audit<ItemRef> = { id: isString, keep: isKeep };
const isItem = audit(ITEM_AUDIT);

/** An empty slot is null, not a hole (types.ts `Slot`). */
const isSlot: Check = (value: unknown): value is Slot => value === null || isItem(value);

const DIE_AUDIT: Audit<DieRef> = { id: isString };
const isDie = audit(DIE_AUDIT);

const SKILL_AUDIT: Audit<SkillState> = { id: isString, uses: isPool };
const isSkill = audit(SKILL_AUDIT);

const INTENT_AUDIT: Audit<Intent> = { object: isString, action: isString };
const isIntent = audit(INTENT_AUDIT);

/** What the labyrinth refused you, and where. `depth` is a count: 0 is the
 *  Crossing and the labyrinth runs downward from there (types.ts `Depth`). */
const REFUSAL_AUDIT: Audit<Refusal> = { intent: isIntent, depth: isCount };
const isRefusal = audit(REFUSAL_AUDIT);

// ────────────────────────────────────────────────────────────── the branches ──

/**
 * THE RUN BRANCH — everything death takes.
 *
 * `branch` is audited as the literal it claims, in both tables, which is how
 * the two branches stay non-interchangeable across a save exactly as they are
 * non-interchangeable in the type system (types.ts law 2).
 */
const RUN_AUDIT: Audit<RunBranch> = {
  branch: literal("run"),
  rng: isRng,
  depth: isCount,
  roomId: (value) => value === null || isString(value),
  vitals: isVitals,
  tithes: isSafeInt,
  consumables: listOf(isItem),
  equipment: tupleOf(4, isSlot),
  small: tupleOf(2, isSlot),
  skills: listOf(isSkill),
  flags: listOf(isString),
};

/** THE CAMPAIGN BRANCH — death cannot touch it, so a save must not lose it. */
const CAMPAIGN_AUDIT: Audit<CampaignBranch> = {
  branch: literal("campaign"),
  dice: listOf(isDie),
  knowledge: listOf(isString),
  journal: listOf(isString),
  refused: listOf(isRefusal),
  landmarks: listOf(isString),
  grants: listOf(isString),
};

/**
 * The whole save.
 *
 * `seed` is a safe integer and `deaths` is a count, because together they name
 * the run: "a run is `seed + deaths + inputs`, exactly" (types.ts `GameState`).
 * A fractional death count is not a slightly-wrong number, it is a run identity
 * that no replay can reproduce.
 */
const STATE_AUDIT: Audit<GameState> = {
  seed: isSafeInt,
  deaths: isCount,
  campaign: audit(CAMPAIGN_AUDIT),
  run: audit(RUN_AUDIT),
};

const isGameState = audit(STATE_AUDIT);

// ─────────────────────────────────────────────────────────────── the chain ──

/**
 * One step up the version chain: the state as version N, returned as version
 * N+1, or null if this save cannot be carried forward.
 *
 * A migration takes `unknown` and must be TOTAL. It runs BEFORE the audit —
 * that is unavoidable, since an old save is by definition not the current
 * shape — so it may not assume a single field is present or is the type it
 * looks like. What it produces is audited afterwards like anything else, which
 * is what makes a wrong migration a null rather than a corruption.
 */
type Migration = (state: unknown) => unknown;

/**
 * From version, to the next one up. A save enters at its own version and walks
 * to `SAVE_VERSION`.
 *
 * 1 → 2 is the IDENTITY, and says so: v2 changed what the envelope PROMISES
 * (see the header), not what the state holds. A v1 save is a v2 save that was
 * never audited — so it is carried across untouched and then audited, and the
 * ones that were quietly broken are refused now instead of at the first draw.
 */
const MIGRATIONS: { readonly [from: number]: Migration } = {
  1: (state) => state,
};

/** The oldest version the chain can still carry forward. Derived, so it cannot
 *  drift from `MIGRATIONS`. */
export const OLDEST_READABLE: number = Math.min(SAVE_VERSION, ...Object.keys(MIGRATIONS).map(Number));

/**
 * Walk a save up to the current version.
 *
 * Bounded by construction: each step must raise the version by one and the
 * chain is finite, so this terminates on every input including a hostile one.
 * A gap in the chain is a null, not a loop.
 */
function carryForward(from: number, state: unknown): unknown {
  let carried = state;
  for (let version = from; version < SAVE_VERSION; version++) {
    const step = MIGRATIONS[version];
    if (step === undefined) return null;
    carried = step(carried);
    if (carried === null) return null;
  }
  return carried;
}

// ─────────────────────────────────────────────────────────── writing and reading ──

/**
 * Wrap the state in its versioned envelope and render it as JSON text.
 *
 * Total: `GameState` is JSON to the leaves (types.ts law 3) — no Map, no Set,
 * no Date, no undefined — so there is nothing here that `JSON.stringify` can
 * refuse or silently drop.
 */
export function save(state: GameState): string {
  return JSON.stringify({ version: SAVE_VERSION, state } satisfies SaveEnvelope);
}

/**
 * Read a save back, or answer null.
 *
 * NEVER THROWS, on any input — malformed text, a version outside the chain, a
 * state that is not one. The only `try` is around `JSON.parse`, because that is
 * the one call here that can raise; everything after it is guards over
 * `unknown`.
 *
 * The order is: parse, envelope, chain, audit. The audit runs LAST and on the
 * migrated value, so every save this function returns has been checked against
 * the shape THIS build reads, whatever version it arrived as.
 */
export function load(text: string): GameState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  // The version must be a real number before it can be compared: `undefined`,
  // `"2"` and `NaN` are all "not a version we speak", and none of them may fall
  // through a `<=` into the chain.
  const version = parsed["version"];
  if (!isSafeInt(version)) return null;
  if ((version as number) > SAVE_VERSION) return null;

  const carried = carryForward(version as number, parsed["state"]);
  return isGameState(carried) ? (carried as GameState) : null;
}
