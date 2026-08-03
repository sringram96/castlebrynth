// castlebrynth · the Lots manifest — the whole language combat is written in.
//
// The engine of the Lots knows two closed word sets and nothing else: the
// PIPELINE HOOKS it runs in order, and the EFFECT VERBS an entry may speak at
// one of them. Everything else — every tier, face, die, joker, spell, skill,
// enemy rule and enemy — is data in `grammar.yaml`, layered by
// `experiments/*.yaml`. This file is the shape of that data and the door it
// comes through: unknown words fail at LOAD, by name and by key path
// (.llm/rules/engine.md).
//
// There is not one content id in this file, and there must never be one:
// "engine code never names a specific die, joker, or enemy"
// (.llm/rules/engine.md). Every name below is a HOOK, a VERB, a stat, or a
// key — vocabulary, not content. If a die's name ever appears here, the law
// this card exists to enforce has already been broken.
//
// Like `loadRoom` in src/core/cards.ts, the loader does no I/O. It is handed
// the parsed data and the file's name, and the name exists only so an error
// can say where. The shell reads and parses; this reads and refuses.
//
// ─────────────────────────────────────────── DESIGN, clause by clause ──
//
// §the lots
//   "engine knows only pipeline hooks (intent_shown → roll → skill_window →
//    action → combo_validate → base_sum → tier_mult → on_score
//    faces-then-jokers → apply → enemy_resolve on_hold/armor/on_block →
//    on_turn_end) and closed effect verbs (add, mult, promote, block, burn,
//    hp, seal, curse; retrigger BANNED)"
//        → `HOOKS` and `EFFECT_VERBS`, in that order, and `retrigger` is
//          refused BY NAME with its own message rather than falling into the
//          generic unknown-verb path. Someone will try it; they should be told
//          why it is gone, not merely that it is (F5 termination: nothing
//          re-enters scoring).
//   "base = sum of thrown faces × combo tier (pair ×2, trips ×3, straight ×3,
//    full house ×4, quads+ ×5)"
//        → `tiers`. A tier is a multiplier and a SHAPE, and the shape is data
//          too: `counts` (groups of identical faces, each a minimum) or `run`
//          (consecutive pips). The engine matches a generic shape; it never
//          says the words "full house".
//   "Loaded bones: all six faces always possible; weighting is a declared
//    probability lean"
//        → a die declares exactly SIX faces, and a `lean` is a table of
//          weights whose every entry must be greater than zero. A weight of 0
//          is refused: a lean shifts odds, it does not delete a face. This is
//          the whole of what makes a loaded bone honest.
//   "At most one gilded trigger face per die."
//        → a face may carry a `gilded` trigger; a die may reference at most
//          one face that has one, and the loader names both when it finds two.
//   "No verb-faces, no self-cost faces."
//        → every face carries `pips`, so a face always scores a number and can
//          never be only a verb; and inside a gilded trigger `add` and `hp`
//          must be POSITIVE, so a face cannot charge you for itself.
//   "Items are ADDITIVE jokers"  +  F1 "tier × at most ONE item mult"
//        → jokers are ordinary effect-carriers, and `mult` is not forbidden to
//          them — F1 permits exactly one — but no single entry may declare
//          two `mult` effects. The runtime cap across entries is the scorer's
//          (L002); the per-entry cap is answerable here and so is answered.
//   "Spells are instants: consumables for everyone; socketed faces for the
//    wizard (the roll is the cost). Mana does not exist."
//        → `spells`, with `sockets: true` for the ones that may be set into a
//          socketable die's face. A socketed spell IS a gilded face, so it
//          must fire at `on_score` like one. There is no cost key anywhere in
//          this file: see "deliberately absent".
//   "skills (found, uses-per-rest, spent AFTER the dice land)"
//        → `skills` carry `uses`, and a skill's hook may not be
//          `intent_shown` or `roll` — everything from `skill_window` onward is
//          after the dice have landed, and nothing before it is.
//   "Elites may bend grammar as content ('seals your sixes')."
//        → `enemy_rules`: a named bend, a hook, and effects. `seal` is the one
//          verb whose operand is a FACE rather than a number, because the only
//          example DESIGN gives of it names a face.
//   "FLEE is always offered: every enemy's inspect declares its PURSUIT chance
//    alongside its intent"
//        → `enemies[…].pursuit` is REQUIRED, and there is no key anywhere that
//          switches fleeing off. An enemy that forgot to declare its pursuit
//          chance does not load.
//   "Heavy dice may be stat-gated ('this die wants Might 3') — stats shape the
//    arsenal without ever touching the throw math."
//        → `dice[…].requires`, closed to `might` and `will`. It gates ACCESS
//          and nothing else: no effect verb reads a stat, no lean is scaled by
//          one, and there is no stat anywhere in the scoring path. Deleting a
//          `requires` may change which dice you may hold; it can never change
//          what a die does once held.
//
// §fairness laws
//   F1 is the per-entry mult cap above. F2 ("plain die EV 3.5 anchors all") is
//   why `dieEv` exists: the anchor must be measurable from the manifest, not
//   asserted in a comment. F5 is why `retrigger` is named and refused. F3, F4,
//   F6 and F7 are properties of a whole arsenal or a whole depth and are the
//   sim's (a later card in this chain); none of them is answerable from one
//   manifest read, and so none of them is attempted here.
//
// ───────────────────────────────────────────────── the subject of an effect ──
//
// EVERY EFFECT IS WRITTEN ABOUT YOU. There is no `target` key, because there
// is nothing to choose between: `add`/`mult`/`promote` move YOUR score,
// `block` your incoming harm, `seal` one of YOUR faces ("seals your sixes" is
// an enemy's rule and it acts on the player), `hp`/`burn`/`curse` your body
// and your hand. Damage to the enemy is not a verb at all — `apply` is the
// pipeline stage where your score is spent on it. A verb set with no word for
// the enemy's health is the shape of that sentence.
//
// Sign follows from it: `hp: -2` takes two of yours, `add: -1` is a cost on
// your score (F4 risk symmetry, written as a number). The verbs that count
// steps — promote, block, burn, curse — are positive whole numbers, and
// `mult` is a positive factor.
//
// ─────────────────────────────────────────────────── deliberately absent ──
//
// The vocabulary here is CLOSED. A new word is a loud amendment — its own
// Asana task — never a side effect (DESIGN §the lots, .llm/rules/engine.md).
// Named so their absence reads as a decision:
//
//   mana / cost      "Mana does not exist" (DESIGN §the lots). No entry has a
//                    resource cost, and a spell's cost is structural: for the
//                    wizard the roll is the cost, for everyone else the spell
//                    is consumed. A `cost` key would be a second economy.
//   reroll / retrigger  NO REROLLS EVER (DESIGN §content laws); nothing
//                    re-enters scoring (F5); "no takebacks: nothing rerolls or
//                    cancels a landed die, anywhere" (.llm/rules/engine.md).
//                    `retrigger` is not merely missing from the verb table —
//                    it is refused by name, with the reason.
//   flee             There is no toggle for it. FLEE is always offered
//                    (DESIGN §the lots), so the only flee-shaped data an enemy
//                    carries is the chance it pursues you.
//   target           See above: every effect is about you.
//   rarity           F3 bands EV by rarity, and the band check needs a whole
//                    arsenal to be meaningful. Rarity arrives with the sim
//                    that enforces it, not before.
//   the hand         "Hand = 5 plain bones + 1 signature die" is the loadout's
//                    shape, not the grammar's; nothing here counts your dice.
//                    It is why `counts` is not checked against a hand size.
//   intents / HP     An enemy here is its PURSUIT chance and the rules it
//                    bends, because those are the two things the grammar must
//                    know about it. Its intents, its health and its art are
//                    the enemy card's, and this schema is additive to them.
//   labels for tiers and faces
//                    A die, joker, spell, skill, enemy rule and enemy each
//                    carry a `name`, because each is a thing you inspect. A
//                    tier and a face carry none: a tier is read as its
//                    multiplier and a face as its pips, and the day the frame
//                    wants "FULL HOUSE" spelled out is the day that string is
//                    added deliberately rather than assumed now.
//   a lean's prose   A loaded bone's lean is "stated on inspect and legible in
//                    the art", and there is no field for that sentence — it is
//                    DERIVED from the weight table. A hand-written lean line
//                    is a line that can lie about the odds, and THE ART NEVER
//                    LIES (DESIGN §art direction).
//
// ─────────────────────────────────────────────── what is NOT checked here ──
//
// Every check below is answerable from one manifest (plus its overlays) alone.
// Not answerable, and so not attempted: whether an arsenal has a dominant
// entry (F6), whether EV sits in its rarity band (F3), whether upside carries
// its cost (F4), whether a throw can exceed 60% of a boss (F7), or whether the
// tier table's ties resolve sensibly. Those need a tournament and a roster.
// Scoring — running the pipeline — is the next card in this chain; nothing
// here scores anything.

import type { Id } from "../core/types";

// ────────────────────────────────────────────────────── the closed pipeline ──

/**
 * The pipeline, in order (DESIGN §the lots).
 *
 * `on_hold`, `armor` and `on_block` are the three phases inside
 * `enemy_resolve`; DESIGN names them in the same breath, so they are hooks an
 * entry may attach to and they sit here where they run. Attaching to
 * `enemy_resolve` itself means the whole stage.
 *
 * Order is load-bearing exactly once — a skill may not fire before the dice
 * land — and the index of `skill_window` is what says so.
 */
export type Hook =
  | "intent_shown"
  | "roll"
  | "skill_window"
  | "action"
  | "combo_validate"
  | "base_sum"
  | "tier_mult"
  | "on_score"
  | "apply"
  | "enemy_resolve"
  | "on_hold"
  | "armor"
  | "on_block"
  | "on_turn_end";

// ───────────────────────────────────────────────────── the closed effect verbs ──

/** What an entry may do. CLOSED (DESIGN §the lots). */
export type EffectVerb =
  | "add"
  | "mult"
  | "promote"
  | "block"
  | "burn"
  | "hp"
  | "seal"
  | "curse";

/**
 * One thing an entry does.
 *
 * `seal` names a FACE; every other verb takes an `amount`. Never both, never
 * neither — the loader holds that, because the type cannot.
 */
export interface Effect {
  readonly verb: EffectVerb;
  /** A number, for every verb but `seal`. Sign is a cost (see the header). */
  readonly amount?: number;
  /** A declared face id — `seal` only. "seals your sixes", said as data. */
  readonly face?: Id;
}

/** A hook and what happens there. The shape every effect-carrying entry has. */
export interface Trigger {
  readonly hook: Hook;
  readonly effects: readonly Effect[];
}

// ─────────────────────────────────────────────────────────────────── tiers ──

/**
 * The SHAPE a tier wants, as data.
 *
 * `counts` — groups of identical faces, each entry a MINIMUM: `[2]` is a pair
 * or better, `[3, 2]` a full house, `[4]` quads or better. Because each is a
 * minimum, the tier table needs no "or better" flag and quads+ is just `[4]`.
 * `run` — that many consecutive pip values.
 *
 * Exactly one of the two. A tier that wants both wants two things.
 */
export interface TierMatch {
  readonly counts?: readonly number[];
  readonly run?: number;
}

/** One combo tier: what it looks like, and what it multiplies by. */
export interface TierEntry {
  readonly mult: number;
  readonly match: TierMatch;
  readonly enabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────── faces ──

/**
 * A face of a die.
 *
 * `pips` is required and it is why there are no verb-faces: a face always
 * scores a number. A blank (the Hollow Die's) is `pips: 0`, not a missing
 * field. `gilded` is the trigger a gilded face carries, and a die may
 * reference at most one face that has one.
 */
export interface FaceEntry {
  readonly pips: number;
  readonly gilded?: Trigger;
  readonly enabled?: boolean;
}

// ──────────────────────────────────────────────────────────────────── dice ──

/**
 * What a die asks of the body before you may hold it. Closed to the two stats
 * the strip carries that are not a bar you spend down.
 *
 * It gates ACCESS only. Nothing in the scoring path reads a stat: "stats shape
 * the arsenal without ever touching the throw math" (DESIGN §the lots).
 */
export interface StatGate {
  readonly might?: number;
  readonly will?: number;
}

/** A die. Six faces, always; a lean shifts the odds between them, never to nothing. */
export interface DieEntry {
  readonly name: string;
  /** Exactly six declared face ids, all different. */
  readonly faces: readonly Id[];
  /** Whether a spell may be set into one of its faces (DESIGN §the lots). */
  readonly socketable: boolean;
  /** Weight per face of THIS die. Unlisted faces weigh 1. Every weight > 0. */
  readonly lean?: { readonly [face: string]: number };
  readonly requires?: StatGate;
  readonly enabled?: boolean;
}

// ────────────────────────────────────────────── jokers, spells, skills, enemies ──

/** An item, additive (DESIGN §the lots). Fires where faces and jokers fire. */
export interface JokerEntry extends Trigger {
  readonly name: string;
  readonly enabled?: boolean;
}

/** An instant. `sockets` marks the ones a socketable die may carry as a face. */
export interface SpellEntry extends Trigger {
  readonly name: string;
  readonly sockets: boolean;
  readonly enabled?: boolean;
}

/** Found, uses-per-rest, spent AFTER the dice land. */
export interface SkillEntry extends Trigger {
  readonly name: string;
  readonly uses: number;
  readonly enabled?: boolean;
}

/** A content-level grammar bender. Named, because the bend is stated on inspect. */
export interface EnemyRuleEntry extends Trigger {
  readonly name: string;
  readonly enabled?: boolean;
}

/**
 * What the grammar knows about an enemy: the chance it follows you out, and
 * which rules it bends. Its intents, its health and its art are elsewhere.
 */
export interface EnemyEntry {
  readonly name: string;
  /** 0..1. Required — FLEE is always offered, so this is always declared. */
  readonly pursuit: number;
  readonly rules?: readonly Id[];
  readonly enabled?: boolean;
}

// ───────────────────────────────────────────────────── economy, and the sets ──

/**
 * One economy question, held open as a switch.
 *
 * DESIGN parks the spend economy ("knucklebones gather vs refresh-per-fight —
 * ruled by thumb at the fight screen"). A toggle is the shape of a question
 * that will be answered by playing both, so an overlay can flip it without a
 * line of code changing.
 */
export interface EconomyToggle {
  readonly enabled: boolean;
}

/**
 * A named group of entries, switched together.
 *
 * `entries` are entry paths — `<collection>.<key>` — and never another set:
 * sets do not nest, so "is this on?" is one flag and one pass over the sets,
 * not a graph walk.
 */
export interface SetEntry {
  readonly enabled: boolean;
  readonly entries: readonly string[];
}

// ───────────────────────────────────────────────────────────── the manifest ──

/** Everything the Lots is made of. */
export interface Manifest {
  readonly version: number;
  readonly tiers: { readonly [id: string]: TierEntry };
  readonly faces: { readonly [id: string]: FaceEntry };
  readonly dice: { readonly [id: string]: DieEntry };
  readonly jokers: { readonly [id: string]: JokerEntry };
  readonly spells: { readonly [id: string]: SpellEntry };
  readonly skills: { readonly [id: string]: SkillEntry };
  readonly enemy_rules: { readonly [id: string]: EnemyRuleEntry };
  readonly enemies: { readonly [id: string]: EnemyEntry };
  readonly economy: { readonly [id: string]: EconomyToggle };
  readonly sets: { readonly [id: string]: SetEntry };
}

/**
 * An overlay (`experiments/*.yaml`).
 *
 * Three words, and they are the whole of what an experiment may do: switch
 * entries on, switch them off, and move numbers. It cannot introduce an entry,
 * a hook or a verb — every path it names must already resolve, and `override`
 * may only replace a value that is already a number, so no overlay can ever
 * write a word anywhere.
 */
export interface Overlay {
  readonly enable?: readonly string[];
  readonly disable?: readonly string[];
  readonly override?: { readonly [path: string]: number };
}

// ───────────────────────────────────────────────────────── the word tables ──
//
// Each table is typed by a shape above, so a key added to a type without a
// word here — or a word here with no key — is a compile error.

type KeyTable<T> = { readonly [K in keyof T]-?: true };

const HOOK_TABLE: KeyTable<Record<Hook, unknown>> = {
  intent_shown: true,
  roll: true,
  skill_window: true,
  action: true,
  combo_validate: true,
  base_sum: true,
  tier_mult: true,
  on_score: true,
  apply: true,
  enemy_resolve: true,
  on_hold: true,
  armor: true,
  on_block: true,
  on_turn_end: true,
};

const VERB_TABLE: KeyTable<Record<EffectVerb, unknown>> = {
  add: true,
  mult: true,
  promote: true,
  block: true,
  burn: true,
  hp: true,
  seal: true,
  curse: true,
};

const EFFECT_KEY_TABLE: KeyTable<Effect> = { verb: true, amount: true, face: true };
const TRIGGER_KEY_TABLE: KeyTable<Trigger> = { hook: true, effects: true };
const TIER_KEY_TABLE: KeyTable<TierEntry> = { mult: true, match: true, enabled: true };
const MATCH_KEY_TABLE: KeyTable<TierMatch> = { counts: true, run: true };
const FACE_KEY_TABLE: KeyTable<FaceEntry> = { pips: true, gilded: true, enabled: true };
const DIE_KEY_TABLE: KeyTable<DieEntry> = {
  name: true,
  faces: true,
  socketable: true,
  lean: true,
  requires: true,
  enabled: true,
};
const STAT_KEY_TABLE: KeyTable<StatGate> = { might: true, will: true };
const JOKER_KEY_TABLE: KeyTable<JokerEntry> = { name: true, ...TRIGGER_KEY_TABLE, enabled: true };
const SPELL_KEY_TABLE: KeyTable<SpellEntry> = {
  name: true,
  sockets: true,
  ...TRIGGER_KEY_TABLE,
  enabled: true,
};
const SKILL_KEY_TABLE: KeyTable<SkillEntry> = {
  name: true,
  uses: true,
  ...TRIGGER_KEY_TABLE,
  enabled: true,
};
const ENEMY_RULE_KEY_TABLE: KeyTable<EnemyRuleEntry> = {
  name: true,
  ...TRIGGER_KEY_TABLE,
  enabled: true,
};
const ENEMY_KEY_TABLE: KeyTable<EnemyEntry> = {
  name: true,
  pursuit: true,
  rules: true,
  enabled: true,
};
const ECONOMY_KEY_TABLE: KeyTable<EconomyToggle> = { enabled: true };
const SET_KEY_TABLE: KeyTable<SetEntry> = { enabled: true, entries: true };
const MANIFEST_KEY_TABLE: KeyTable<Manifest> = {
  version: true,
  tiers: true,
  faces: true,
  dice: true,
  jokers: true,
  spells: true,
  skills: true,
  enemy_rules: true,
  enemies: true,
  economy: true,
  sets: true,
};
const OVERLAY_KEY_TABLE: KeyTable<Overlay> = { enable: true, disable: true, override: true };

/** The pipeline, in the order it runs. */
export const HOOKS = Object.keys(HOOK_TABLE) as readonly Hook[];
/** What an entry may do. The whole of it. */
export const EFFECT_VERBS = Object.keys(VERB_TABLE) as readonly EffectVerb[];
/** The keys a manifest may carry. */
export const MANIFEST_KEYS = Object.keys(MANIFEST_KEY_TABLE) as readonly (keyof Manifest)[];
/** The three words an experiment may say. */
export const OVERLAY_KEYS = Object.keys(OVERLAY_KEY_TABLE) as readonly (keyof Overlay)[];

/**
 * Words that are not missing — they are GONE, and the loader says so by name.
 *
 * `retrigger` re-enters scoring, and nothing re-enters scoring: F5
 * termination, NO REROLLS EVER (DESIGN §content laws), and "no takebacks:
 * nothing rerolls or cancels a landed die, anywhere" (.llm/rules/engine.md).
 * It is listed here rather than left to fall through the unknown-verb message
 * because the author who reaches for it has a reason, and deserves the reason
 * it is not there.
 */
export const BANNED_VERBS: readonly string[] = ["retrigger"];

const BANNED_REASON =
  "it re-enters scoring, and nothing re-enters scoring — F5 termination, " +
  "NO REROLLS EVER (DESIGN §content laws), and no takebacks anywhere " +
  "(.llm/rules/engine.md). It is BANNED, not missing. If the Lots must ever " +
  "have it, that is a loud amendment to DESIGN.md and its own Asana task.";

/** Everything after the dice land. A skill may fire at one of these and nowhere earlier. */
const AFTER_THE_DICE_LAND = HOOKS.slice(HOOKS.indexOf("skill_window"));

/** Where faces and jokers resolve — DESIGN's pipeline spells it "faces-then-jokers". */
const SCORING_HOOK: Hook = "on_score";

/** The entry collections, in manifest order. `sets` is not one: it groups them. */
const COLLECTIONS = [
  "tiers",
  "faces",
  "dice",
  "jokers",
  "spells",
  "skills",
  "enemy_rules",
  "enemies",
  "economy",
] as const;

type Collection = (typeof COLLECTIONS)[number];

/** The collections an entry path may name, plus `sets`. */
const PATHABLE: readonly string[] = [...COLLECTIONS, "sets"];

// ──────────────────────────────────────────────────────────────── problems ──

/**
 * One thing wrong with one file, at one key path.
 *
 * `path` is dotted, with `[i]` for list positions — `dice.bone.lean.six`,
 * `jokers.knife.effects[0].verb` — so an author can find it by reading their
 * own file, never the engine's source. The form is src/core/cards.ts's,
 * deliberately: two loaders, one error language.
 */
export interface Problem {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

export type LoadResult =
  | { readonly ok: true; readonly manifest: Manifest }
  | { readonly ok: false; readonly problems: readonly Problem[] };

/** `file: path — message`, the form an author reads. */
export function formatProblem(problem: Problem): string {
  return `${problem.file}: ${problem.path === "" ? "(root)" : problem.path} — ${problem.message}`;
}

// ──────────────────────────────────────────────────────────────── plumbing ──

type Fault = (path: string, message: string) => void;

const at = (path: string, key: string): string => (path === "" ? key : `${path}.${key}`);
const nth = (path: string, index: number): string => `${path}[${index}]`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A word not in the table does not exist. The message carries the whole
 *  vocabulary so the fix needs no engine read. */
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

function line(value: unknown, path: string, what: string, fault: Fault): void {
  if (typeof value !== "string" || value.trim() === "") {
    fault(path, `${what} is required, and is a line of writing`);
  }
}

function flag(value: unknown, path: string, what: string, required: boolean, fault: Fault): void {
  if (value === undefined) {
    if (required) fault(path, `${what} is required, and is written true or false`);
    return;
  }
  if (typeof value !== "boolean") fault(path, `${what} is written true or false`);
}

/** A finite number, and nothing clever. */
function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function whole(value: unknown, path: string, what: string, least: number, fault: Fault): void {
  if (!isNumber(value) || !Number.isInteger(value) || value < least) {
    fault(path, `${what} is a whole number, ${least} or more`);
  }
}

// ─────────────────────────────────────────────────────────────────── effects ──

/**
 * What a given entry kind is allowed to say. `costs` is the only axis so far,
 * and it exists for one DESIGN sentence: "no self-cost faces".
 */
interface EffectRules {
  readonly costs: boolean;
  readonly what: string;
}

const COSTS_ALLOWED: EffectRules = { costs: true, what: "an effect" };
const NO_SELF_COST: EffectRules = { costs: false, what: "a face's effect" };

/** Verbs that count steps: a positive whole number of them. */
const STEP_VERBS: readonly EffectVerb[] = ["promote", "block", "burn", "curse"];
/** Verbs whose amount may be negative, because a cost is written as a number. */
const SIGNED_VERBS: readonly EffectVerb[] = ["add", "hp"];
/** The one verb whose operand is a face. */
const FACE_VERB: EffectVerb = "seal";

function readEffect(
  value: unknown,
  path: string,
  rules: EffectRules,
  faces: readonly string[],
  fault: Fault,
): EffectVerb | null {
  if (!isRecord(value)) {
    fault(path, `${rules.what} is a map: the verb, and what it takes`);
    return null;
  }
  closed(value, EFFECT_KEY_TABLE, path, "effect key", Object.keys(EFFECT_KEY_TABLE), fault);

  const raw = value["verb"];
  if (typeof raw !== "string" || raw === "") {
    fault(at(path, "verb"), "`verb` is required, and is one of: " + EFFECT_VERBS.join(", "));
    return null;
  }
  if (BANNED_VERBS.includes(raw)) {
    fault(at(path, "verb"), `"${raw}" is a BANNED verb — ${BANNED_REASON}`);
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(VERB_TABLE, raw)) {
    fault(
      at(path, "verb"),
      `unknown effect verb "${raw}" — the verb vocabulary is closed: ` +
        `${EFFECT_VERBS.join(", ")}. A new verb is a loud amendment to DESIGN.md ` +
        `and its own Asana task, never a side effect (.llm/rules/engine.md).`,
    );
    return null;
  }
  const verb = raw as EffectVerb;

  if (verb === FACE_VERB) {
    if (value["amount"] !== undefined) {
      fault(
        at(path, "amount"),
        `\`${FACE_VERB}\` takes a face, not an amount — it names the face it shuts`,
      );
    }
    const face = value["face"];
    if (typeof face !== "string" || face === "") {
      fault(at(path, "face"), `\`${FACE_VERB}\` names the face it shuts, and \`face\` is required`);
    } else if (!faces.includes(face)) {
      fault(
        at(path, "face"),
        `"${face}" is not a declared face. \`${FACE_VERB}\` names one of: ` +
          `${faces.join(", ") || "(none declared)"}.`,
      );
    }
    return verb;
  }

  if (value["face"] !== undefined) {
    fault(at(path, "face"), `\`${verb}\` takes an amount, not a face — only \`${FACE_VERB}\` names one`);
  }
  const amount = value["amount"];
  if (!isNumber(amount)) {
    fault(at(path, "amount"), `\`${verb}\` takes an \`amount\`, and it is a number`);
    return verb;
  }
  if (verb === "mult") {
    if (amount <= 0) fault(at(path, "amount"), "`mult` is a factor greater than zero");
    return verb;
  }
  if (STEP_VERBS.includes(verb)) {
    whole(amount, at(path, "amount"), `\`${verb}\` counts steps, so its amount`, 1, fault);
    return verb;
  }
  // add and hp: whole, non-zero, and signed — the sign is the cost.
  if (!Number.isInteger(amount) || amount === 0) {
    fault(
      at(path, "amount"),
      `\`${verb}\` is a whole number and never zero — a change of none is a lie. ` +
        `A negative is a cost, written as a number (F4 risk symmetry).`,
    );
    return verb;
  }
  if (!rules.costs && SIGNED_VERBS.includes(verb) && amount < 0) {
    fault(
      at(path, "amount"),
      `a face may not charge you: "no verb-faces, no self-cost faces" ` +
        `(DESIGN §the lots), and \`${verb}: ${amount}\` is a cost. Put the cost on ` +
        `the joker, the spell or the skill that grants the face instead.`,
    );
  }
  return verb;
}

function readEffects(
  value: unknown,
  path: string,
  rules: EffectRules,
  faces: readonly string[],
  fault: Fault,
): void {
  if (!Array.isArray(value)) {
    fault(path, "`effects` is a list of effects — what happens at the hook");
    return;
  }
  if (value.length === 0) {
    fault(path, "`effects` is empty — an entry that does nothing at its hook is not an entry");
    return;
  }
  let mults = 0;
  value.forEach((effect, index) => {
    if (readEffect(effect, nth(path, index), rules, faces, fault) === "mult") mults += 1;
  });
  if (mults > 1) {
    fault(
      path,
      `${mults} \`mult\` effects here — F1 mult discipline is "tier × at most ONE ` +
        `item mult, hard cap", so one entry declares at most one. Fold them into ` +
        `a single factor, or make the second one \`add\`.`,
    );
  }
}

/** A hook and its effects: the shape every effect-carrying entry shares. */
function readTrigger(
  value: Record<string, unknown>,
  path: string,
  rules: EffectRules,
  faces: readonly string[],
  allowed: readonly Hook[],
  why: string,
  fault: Fault,
): void {
  const raw = value["hook"];
  if (typeof raw !== "string" || raw === "") {
    fault(at(path, "hook"), "`hook` is required, and is one of: " + HOOKS.join(" → "));
  } else if (BANNED_VERBS.includes(raw)) {
    fault(at(path, "hook"), `"${raw}" is not a hook, and as a verb it is BANNED — ${BANNED_REASON}`);
  } else if (!Object.prototype.hasOwnProperty.call(HOOK_TABLE, raw)) {
    fault(
      at(path, "hook"),
      `unknown hook "${raw}" — the pipeline is closed and runs in this order: ` +
        `${HOOKS.join(" → ")}. A new hook is a loud amendment to DESIGN.md and ` +
        `its own Asana task, never a side effect (.llm/rules/engine.md).`,
    );
  } else if (!allowed.includes(raw as Hook)) {
    fault(
      at(path, "hook"),
      `"${raw}" is a hook, but not one this may use: ${why} — ${allowed.join(", ")}.`,
    );
  }
  readEffects(value["effects"], at(path, "effects"), rules, faces, fault);
}

// ────────────────────────────────────────────────────────────── collections ──

/** A collection is a map keyed by id, and an id must survive being a path step. */
function readCollection(
  source: Record<string, unknown>,
  name: Collection | "sets",
  fault: Fault,
  read: (entry: Record<string, unknown>, path: string, key: string) => void,
): readonly string[] {
  const value = source[name];
  if (!isRecord(value)) {
    fault(name, `\`${name}\` is a map of entries, keyed by id — write {} for none`);
    return [];
  }
  const keys: string[] = [];
  for (const key of Object.keys(value)) {
    const path = at(name, key);
    if (key.trim() === "") {
      fault(path, "an entry id is not blank");
      continue;
    }
    if (/[.[\]]/.test(key)) {
      fault(
        path,
        `"${key}" carries a . [ or ] — an entry id is also a path step, and an ` +
          `overlay addresses entries as \`${name}.<id>\`, so those three ` +
          `characters would make the address unreadable`,
      );
      continue;
    }
    const entry = value[key];
    if (!isRecord(entry)) {
      fault(path, "an entry is a map of keys");
      continue;
    }
    keys.push(key);
    read(entry, path, key);
  }
  return keys;
}

// ──────────────────────────────────────────────────────────────── the loader ──

/**
 * Read one authored manifest.
 *
 * Never throws — junk in gives problems out. Every problem is reported, not
 * just the first, because an author fixing a file wants the whole list.
 *
 * `file` names the file in the problems and is used for nothing else: the
 * loader does no I/O, the shell parses the YAML and hands the data in.
 */
export function loadManifest(file: string, source: unknown): LoadResult {
  const problems: Problem[] = [];
  const fault: Fault = (path, message) => {
    problems.push({ file, path, message });
  };

  if (!isRecord(source)) {
    fault("", "a manifest is a map of keys, and this is not one");
    return { ok: false, problems };
  }

  closed(source, MANIFEST_KEY_TABLE, "", "manifest key", MANIFEST_KEYS, fault);
  whole(source["version"], "version", "`version` — the manifest format, and it", 1, fault);

  // Faces first: dice reference them, and `seal` names one.
  const faces = readCollection(source, "faces", fault, (entry, path) => {
    closed(entry, FACE_KEY_TABLE, path, "face key", Object.keys(FACE_KEY_TABLE), fault);
    whole(
      entry["pips"],
      at(path, "pips"),
      "`pips` — every face scores a number, so there are no verb-faces " +
        "(DESIGN §the lots), and a blank is 0 rather than a missing field, so it",
      0,
      fault,
    );
    flag(entry["enabled"], at(path, "enabled"), "`enabled`", false, fault);
  });

  // The gilded triggers, read once faces are known so `seal` can be checked.
  const gilded: string[] = [];
  const faceMap = isRecord(source["faces"]) ? source["faces"] : {};
  for (const key of faces) {
    const entry = faceMap[key];
    if (!isRecord(entry)) continue;
    const trigger = entry["gilded"];
    if (trigger === undefined) continue;
    gilded.push(key);
    const path = at(at("faces", key), "gilded");
    if (!isRecord(trigger)) {
      fault(path, "`gilded` is a map: the hook it fires at, and its effects");
      continue;
    }
    closed(trigger, TRIGGER_KEY_TABLE, path, "gilded key", Object.keys(TRIGGER_KEY_TABLE), fault);
    readTrigger(
      trigger,
      path,
      NO_SELF_COST,
      faces,
      [SCORING_HOOK],
      "a gilded face resolves where DESIGN's pipeline puts faces, " +
        '"on_score (faces-then-jokers)"',
      fault,
    );
  }

  readCollection(source, "tiers", fault, (entry, path) => {
    closed(entry, TIER_KEY_TABLE, path, "tier key", Object.keys(TIER_KEY_TABLE), fault);
    const mult = entry["mult"];
    if (!isNumber(mult) || mult < 1) {
      fault(at(path, "mult"), "`mult` is a number, 1 or more — a tier multiplies, it does not shrink");
    }
    flag(entry["enabled"], at(path, "enabled"), "`enabled`", false, fault);
    readTierMatch(entry["match"], at(path, "match"), faceMap, faces, fault);
  });

  readCollection(source, "dice", fault, (entry, path) => {
    closed(entry, DIE_KEY_TABLE, path, "die key", Object.keys(DIE_KEY_TABLE), fault);
    line(entry["name"], at(path, "name"), "`name` — a die is inspected, so it is named, and this", fault);
    flag(entry["socketable"], at(path, "socketable"), "`socketable`", true, fault);
    flag(entry["enabled"], at(path, "enabled"), "`enabled`", false, fault);
    const own = readDieFaces(entry["faces"], at(path, "faces"), faces, gilded, fault);
    readLean(entry["lean"], at(path, "lean"), own, fault);
    readRequires(entry["requires"], at(path, "requires"), fault);
  });

  readCollection(source, "jokers", fault, (entry, path) => {
    closed(entry, JOKER_KEY_TABLE, path, "joker key", Object.keys(JOKER_KEY_TABLE), fault);
    line(entry["name"], at(path, "name"), "`name` — a joker is inspected, so it is named, and this", fault);
    flag(entry["enabled"], at(path, "enabled"), "`enabled`", false, fault);
    readTrigger(
      entry,
      path,
      COSTS_ALLOWED,
      faces,
      [SCORING_HOOK],
      "a joker resolves where DESIGN's pipeline puts jokers, " +
        '"on_score (faces-then-jokers)"',
      fault,
    );
  });

  readCollection(source, "spells", fault, (entry, path) => {
    closed(entry, SPELL_KEY_TABLE, path, "spell key", Object.keys(SPELL_KEY_TABLE), fault);
    line(entry["name"], at(path, "name"), "`name` — a spell is inspected, so it is named, and this", fault);
    flag(entry["sockets"], at(path, "sockets"), "`sockets`", true, fault);
    flag(entry["enabled"], at(path, "enabled"), "`enabled`", false, fault);
    const socketed = entry["sockets"] === true;
    readTrigger(
      entry,
      path,
      COSTS_ALLOWED,
      faces,
      socketed ? [SCORING_HOOK] : HOOKS,
      socketed
        ? "a socketed spell IS a gilded face — the roll is the cost (DESIGN §the lots), " +
            "so it fires where faces fire"
        : "an instant may fire anywhere in the pipeline",
      fault,
    );
  });

  readCollection(source, "skills", fault, (entry, path) => {
    closed(entry, SKILL_KEY_TABLE, path, "skill key", Object.keys(SKILL_KEY_TABLE), fault);
    line(entry["name"], at(path, "name"), "`name` — a skill is inspected, so it is named, and this", fault);
    whole(entry["uses"], at(path, "uses"), "`uses` — uses-per-rest (DESIGN §ledgers), and it", 1, fault);
    flag(entry["enabled"], at(path, "enabled"), "`enabled`", false, fault);
    readTrigger(
      entry,
      path,
      COSTS_ALLOWED,
      faces,
      AFTER_THE_DICE_LAND,
      'a skill is "spent AFTER the dice land" (DESIGN §ledgers, death, growth), ' +
        "so it fires at skill_window or later",
      fault,
    );
  });

  const rules = readCollection(source, "enemy_rules", fault, (entry, path) => {
    closed(entry, ENEMY_RULE_KEY_TABLE, path, "enemy rule key", Object.keys(ENEMY_RULE_KEY_TABLE), fault);
    line(
      entry["name"],
      at(path, "name"),
      "`name` — a bent rule is stated on inspect, so it is named, and this",
      fault,
    );
    flag(entry["enabled"], at(path, "enabled"), "`enabled`", false, fault);
    readTrigger(entry, path, COSTS_ALLOWED, faces, HOOKS, "an enemy rule may bend any stage", fault);
  });

  readCollection(source, "enemies", fault, (entry, path) => {
    closed(entry, ENEMY_KEY_TABLE, path, "enemy key", Object.keys(ENEMY_KEY_TABLE), fault);
    line(entry["name"], at(path, "name"), "`name` — an enemy is inspected, so it is named, and this", fault);
    flag(entry["enabled"], at(path, "enabled"), "`enabled`", false, fault);
    const pursuit = entry["pursuit"];
    if (!isNumber(pursuit) || pursuit < 0 || pursuit > 1) {
      fault(
        at(path, "pursuit"),
        "`pursuit` is required, and is a chance from 0 to 1. FLEE is always offered, " +
          "and every enemy's inspect declares its PURSUIT chance alongside its intent " +
          "(DESIGN §the lots) — so there is no enemy without one, and no key here " +
          "switches fleeing off.",
      );
    }
    const bends = entry["rules"];
    if (bends !== undefined) {
      if (!Array.isArray(bends)) {
        fault(at(path, "rules"), "`rules` is a list of enemy rule ids");
      } else {
        bends.forEach((bend, index) => {
          const where = nth(at(path, "rules"), index);
          if (typeof bend !== "string" || bend === "") {
            fault(where, "an enemy rule id is a non-blank string");
            return;
          }
          if (!rules.includes(bend)) {
            fault(
              where,
              `"${bend}" is not a declared enemy rule. One of: ` +
                `${rules.join(", ") || "(none declared)"}.`,
            );
          }
        });
      }
    }
  });

  readCollection(source, "economy", fault, (entry, path) => {
    closed(entry, ECONOMY_KEY_TABLE, path, "economy key", Object.keys(ECONOMY_KEY_TABLE), fault);
    flag(
      entry["enabled"],
      at(path, "enabled"),
      "`enabled` — an economy toggle is a question held open, so its state",
      true,
      fault,
    );
  });

  // Sets last: their entries are paths into everything above.
  const known = knownEntryPaths(source);
  readCollection(source, "sets", fault, (entry, path) => {
    closed(entry, SET_KEY_TABLE, path, "set key", Object.keys(SET_KEY_TABLE), fault);
    flag(entry["enabled"], at(path, "enabled"), "`enabled` — a set exists to be switched, so its state", true, fault);
    const entries = entry["entries"];
    if (!Array.isArray(entries)) {
      fault(at(path, "entries"), "`entries` is a list of entry paths — `<collection>.<id>`");
      return;
    }
    if (entries.length === 0) {
      fault(at(path, "entries"), "a set with nothing in it switches nothing");
      return;
    }
    entries.forEach((member, index) => {
      const where = nth(at(path, "entries"), index);
      if (typeof member !== "string" || member === "") {
        fault(where, "an entry path is a non-blank string — `<collection>.<id>`");
        return;
      }
      if (member.startsWith("sets.")) {
        fault(
          where,
          `"${member}" is a set. Sets do not nest — a set lists entries, so ` +
            `"is this on?" stays one flag and one pass, never a graph walk.`,
        );
        return;
      }
      if (!known.includes(member)) {
        fault(
          where,
          `"${member}" is not an entry of this manifest. An entry path is ` +
            `\`<collection>.<id>\`, and the collections are: ${COLLECTIONS.join(", ")}.`,
        );
      }
    });
  });

  if (problems.length > 0) return { ok: false, problems };
  // Every key, every word and every value above has been read.
  return { ok: true, manifest: source as unknown as Manifest };
}

function readTierMatch(
  value: unknown,
  path: string,
  faceMap: Record<string, unknown>,
  faces: readonly string[],
  fault: Fault,
): void {
  if (!isRecord(value)) {
    fault(path, "`match` is a map: the shape this tier wants — `counts` or `run`");
    return;
  }
  closed(value, MATCH_KEY_TABLE, path, "match key", Object.keys(MATCH_KEY_TABLE), fault);
  const counts = value["counts"];
  const run = value["run"];
  if (counts !== undefined && run !== undefined) {
    fault(path, "a tier wants one shape, not two — `counts` or `run`, never both");
    return;
  }
  if (counts === undefined && run === undefined) {
    fault(path, "a tier declares its shape — `counts` (groups of a kind) or `run` (consecutive pips)");
    return;
  }
  if (counts !== undefined) {
    if (!Array.isArray(counts)) {
      fault(at(path, "counts"), "`counts` is a list of group sizes — [2] a pair, [3, 2] a full house");
      return;
    }
    if (counts.length === 0) {
      fault(at(path, "counts"), "`counts` is empty — a tier of no groups is every throw");
      return;
    }
    counts.forEach((count, index) => {
      whole(
        count,
        nth(at(path, "counts"), index),
        "a group size is a MINIMUM (so [4] is quads or better), and it",
        2,
        fault,
      );
    });
    return;
  }
  // `run` — and it can be measured against the faces that exist.
  const pips = new Set<number>();
  for (const key of faces) {
    const face = faceMap[key];
    if (isRecord(face) && isNumber(face["pips"])) pips.add(face["pips"]);
  }
  const ceiling = Math.max(pips.size, 2);
  if (!isNumber(run) || !Number.isInteger(run) || run < 2 || run > ceiling) {
    fault(
      at(path, "run"),
      `\`run\` is a whole number of consecutive pips, from 2 to ${ceiling} — ` +
        `${pips.size} distinct pip values are declared in \`faces\`, so a longer ` +
        `run is a tier that can never be thrown`,
    );
  }
}

function readDieFaces(
  value: unknown,
  path: string,
  faces: readonly string[],
  gilded: readonly string[],
  fault: Fault,
): readonly string[] {
  if (!Array.isArray(value)) {
    fault(path, "`faces` is a list of six declared face ids");
    return [];
  }
  if (value.length !== 6) {
    fault(
      path,
      `a die has six faces, not ${value.length} — "all six faces always possible" ` +
        `(DESIGN §the lots). A face you do not want is a blank (pips: 0), never a ` +
        `face left out.`,
    );
  }
  const own: string[] = [];
  const carried: string[] = [];
  value.forEach((face, index) => {
    const where = nth(path, index);
    if (typeof face !== "string" || face === "") {
      fault(where, "a face id is a non-blank string");
      return;
    }
    if (!faces.includes(face)) {
      fault(
        where,
        `"${face}" is not a declared face. One of: ${faces.join(", ") || "(none declared)"}.`,
      );
      return;
    }
    if (own.includes(face)) {
      fault(where, `"${face}" is on this die twice — its six faces are six different faces`);
      return;
    }
    own.push(face);
    if (gilded.includes(face)) carried.push(face);
  });
  if (carried.length > 1) {
    fault(
      path,
      `${carried.length} gilded faces on one die — ${carried.join(", ")}. At most ONE ` +
        `gilded trigger face per die (DESIGN §the lots): a die you cannot read at a ` +
        `glance is a die whose odds are not legible in the art.`,
    );
  }
  return own;
}

function readLean(value: unknown, path: string, own: readonly string[], fault: Fault): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    fault(path, "`lean` is a map of face id to weight — unlisted faces weigh 1");
    return;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) {
    fault(path, "`lean` is empty — a die with no lean leaves the word out");
    return;
  }
  for (const key of keys) {
    const where = at(path, key);
    if (!own.includes(key)) {
      fault(
        where,
        `"${key}" is not a face of this die. A lean weights the die's OWN faces: ` +
          `${own.join(", ") || "(none readable)"}.`,
      );
      continue;
    }
    const weight = value[key];
    if (!isNumber(weight) || weight <= 0) {
      fault(
        where,
        `a lean weight is greater than zero, and "${key}" is ${String(weight)}. ` +
          `"All six faces always possible; weighting is a declared probability lean" ` +
          `(DESIGN §the lots) — a lean SHIFTS the odds and never deletes a face. ` +
          `A face you want rarely takes a small weight, never none.`,
      );
    }
  }
}

function readRequires(value: unknown, path: string, fault: Fault): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    fault(path, "`requires` is a map of stat to the least it may be");
    return;
  }
  closed(value, STAT_KEY_TABLE, path, "stat", Object.keys(STAT_KEY_TABLE), fault);
  if (Object.keys(value).length === 0) {
    fault(path, "`requires` is empty — a die that asks nothing leaves the word out");
    return;
  }
  for (const key of Object.keys(STAT_KEY_TABLE)) {
    if (value[key] === undefined) continue;
    whole(
      value[key],
      at(path, key),
      `\`${key}\` — a stat gate shapes the arsenal and never the throw math ` +
        `(DESIGN §the lots), and the least it may be`,
      1,
      fault,
    );
  }
}

/** Every `<collection>.<id>` this manifest declares. Read leniently: this runs
 *  alongside the checks above, not after them, so half-broken entries are
 *  simply not addressable rather than a second pile of problems. */
function knownEntryPaths(source: Record<string, unknown>): readonly string[] {
  const paths: string[] = [];
  for (const collection of COLLECTIONS) {
    const value = source[collection];
    if (!isRecord(value)) continue;
    for (const key of Object.keys(value)) paths.push(at(collection, key));
  }
  return paths;
}

// ───────────────────────────────────────────────────────────────── overlays ──
//
// An experiment layers over the base and may do three things: enable, disable,
// and move a number. It may not introduce an entry, a hook or a verb, and the
// reason is structural rather than a check on the side: `enable`/`disable`
// address entries that must already exist, and `override` may only replace a
// value that is ALREADY A NUMBER. There is no path by which a string reaches
// the manifest through an overlay, so there is no path by which a new word does.

type Step = string | number;

/** `dice.bone.lean.six` → ["dice", "bone", "lean", "six"];
 *  `jokers.knife.effects[0].amount` → [..., "effects", 0, "amount"]. */
function parsePath(path: string): readonly Step[] | null {
  if (path === "") return null;
  const steps: Step[] = [];
  let i = 0;
  let first = true;
  while (i < path.length) {
    if (path[i] === "[") {
      const end = path.indexOf("]", i);
      if (end < 0) return null;
      const digits = path.slice(i + 1, end);
      if (!/^[0-9]+$/.test(digits)) return null;
      steps.push(Number(digits));
      i = end + 1;
      first = false;
      continue;
    }
    if (!first) {
      if (path[i] !== ".") return null;
      i += 1;
    }
    const start = i;
    while (i < path.length && path[i] !== "." && path[i] !== "[" && path[i] !== "]") i += 1;
    if (i === start) return null;
    steps.push(path.slice(start, i));
    first = false;
  }
  return steps.length > 0 ? steps : null;
}

type Container = Record<string, unknown> | unknown[];

function isContainer(value: unknown): value is Container {
  return typeof value === "object" && value !== null;
}

function step(container: Container, key: Step): unknown {
  if (Array.isArray(container)) return typeof key === "number" ? container[key] : undefined;
  return typeof key === "string" ? container[key] : undefined;
}

/** The container holding the last step, and that step. null if the road runs out. */
function locate(root: Container, steps: readonly Step[]): { parent: Container; last: Step } | null {
  let node: Container = root;
  for (let i = 0; i < steps.length - 1; i += 1) {
    const key = steps[i];
    if (key === undefined) return null;
    const next = step(node, key);
    if (!isContainer(next)) return null;
    node = next;
  }
  const last = steps[steps.length - 1];
  if (last === undefined) return null;
  return { parent: node, last };
}

function put(container: Container, key: Step, value: unknown): void {
  if (Array.isArray(container)) {
    if (typeof key === "number") container[key] = value;
    return;
  }
  if (typeof key === "string") container[key] = value;
}

/**
 * Layer one experiment over a manifest.
 *
 * Returns a NEW manifest; the one handed in is not touched. The copy is a JSON
 * round-trip because a manifest is JSON by construction — every field is a
 * primitive, a map of them, or a list of them.
 */
export function applyOverlay(base: Manifest, file: string, source: unknown): LoadResult {
  const problems: Problem[] = [];
  const fault: Fault = (path, message) => {
    problems.push({ file, path, message });
  };

  if (!isRecord(source)) {
    fault("", "an overlay is a map of keys, and this is not one");
    return { ok: false, problems };
  }
  closed(source, OVERLAY_KEY_TABLE, "", "overlay key", OVERLAY_KEYS, fault);

  const next = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;

  for (const word of ["enable", "disable"] as const) {
    const list = source[word];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      fault(word, `\`${word}\` is a list of entry or set paths — \`<collection>.<id>\``);
      continue;
    }
    list.forEach((entry, index) => {
      const where = nth(word, index);
      if (typeof entry !== "string" || entry === "") {
        fault(where, "an entry path is a non-blank string — `<collection>.<id>`");
        return;
      }
      const steps = parsePath(entry);
      const collection = steps === null ? undefined : steps[0];
      const key = steps === null ? undefined : steps[1];
      if (
        steps === null ||
        steps.length !== 2 ||
        typeof collection !== "string" ||
        typeof key !== "string"
      ) {
        fault(
          where,
          `"${entry}" is not an entry path. \`${word}\` names one entry or one set, ` +
            `written \`<collection>.<id>\` — the collections are ${PATHABLE.join(", ")}.`,
        );
        return;
      }
      if (!PATHABLE.includes(collection)) {
        fault(
          where,
          `"${collection}" is not a collection. One of: ${PATHABLE.join(", ")}.`,
        );
        return;
      }
      const bag = next[collection];
      if (!isRecord(bag) || !Object.prototype.hasOwnProperty.call(bag, key)) {
        fault(
          where,
          `"${entry}" is not in the base manifest. An overlay switches what is ` +
            `already there and moves numbers; it cannot introduce an entry, a hook ` +
            `or a verb — that is a change to grammar.yaml, in the open.`,
        );
        return;
      }
      const target = bag[key];
      if (!isRecord(target)) {
        fault(where, `"${entry}" is not a map, so it has no state to switch`);
        return;
      }
      target["enabled"] = word === "enable";
    });
  }

  const overrides = source["override"];
  if (overrides !== undefined) {
    if (!isRecord(overrides)) {
      fault("override", "`override` is a map of dotted path to number");
    } else {
      for (const path of Object.keys(overrides)) {
        const where = at("override", path);
        const value = overrides[path];
        if (!isNumber(value)) {
          fault(
            where,
            `an overlay overrides NUMERIC values only, and ${JSON.stringify(value)} is ` +
              `not a number. A word — a hook, a verb, a name — reaches the manifest ` +
              `by being written in grammar.yaml, never by an experiment.`,
          );
          continue;
        }
        const steps = parsePath(path);
        if (steps === null) {
          fault(where, `"${path}" is not a path — write it dotted, with [i] for list positions`);
          continue;
        }
        const found = locate(next, steps);
        if (found === null || step(found.parent, found.last) === undefined) {
          fault(
            where,
            `"${path}" is not in the base manifest. An overlay may only move a number ` +
              `that is already there; introducing an entry, a hook or a verb is a ` +
              `change to grammar.yaml, in the open.`,
          );
          continue;
        }
        const current = step(found.parent, found.last);
        if (!isNumber(current)) {
          fault(
            where,
            `"${path}" is ${JSON.stringify(current)}, not a number — an overlay may ` +
              `only override numeric values, so it can never rewrite a word.`,
          );
          continue;
        }
        put(found.parent, found.last, value);
      }
    }
  }

  if (problems.length > 0) return { ok: false, problems };

  // Read the result back through the front door. An overlay that moves a
  // number into an illegal one — a lean weight to zero, a pursuit chance past
  // 1 — is caught by exactly the checks that caught it in the base.
  const reread = loadManifest(file, next);
  if (!reread.ok) return reread;
  return { ok: true, manifest: reread.manifest };
}

// ─────────────────────────────────────────────── reading a loaded manifest ──

/**
 * Is this entry switched on?
 *
 * An entry is on when its own flag is not false AND every set that lists it is
 * on. Nothing that does not exist is on, so an unknown path is false rather
 * than an exception — the paths were all checked at load.
 */
export function isEnabled(manifest: Manifest, path: string): boolean {
  const steps = parsePath(path);
  if (steps === null || steps.length !== 2) return false;
  const collection = steps[0];
  const key = steps[1];
  if (typeof collection !== "string" || typeof key !== "string") return false;
  if (!PATHABLE.includes(collection)) return false;
  const bag = (manifest as unknown as Record<string, unknown>)[collection];
  if (!isRecord(bag)) return false;
  const entry = bag[key];
  if (!isRecord(entry)) return false;
  if (entry["enabled"] === false) return false;
  for (const set of Object.values(manifest.sets)) {
    if (set.entries.includes(path) && !set.enabled) return false;
  }
  return true;
}

/**
 * A die's expected face value: Σ(weight × pips) ÷ Σ(weight), unlisted faces
 * weighing 1.
 *
 * F2 bone standard says "plain die EV 3.5 anchors all", and an anchor that is
 * only asserted in a comment is not an anchor. null for a die this manifest
 * does not declare.
 */
export function dieEv(manifest: Manifest, die: Id): number | null {
  const entry = manifest.dice[die];
  if (entry === undefined) return null;
  let weighted = 0;
  let total = 0;
  for (const face of entry.faces) {
    const declared = manifest.faces[face];
    if (declared === undefined) return null;
    const weight = entry.lean?.[face] ?? 1;
    weighted += weight * declared.pips;
    total += weight;
  }
  return total === 0 ? null : weighted / total;
}
