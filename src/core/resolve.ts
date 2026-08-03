// castlebrynth · resolution — the Descent's words, applied to a state.
//
// `cards.ts` says what a room MAY say. This file says what it MEANS. Between
// them there is no third place for a word to be interpreted: the loader closes
// the vocabulary at LOAD, and everything below reads only words that survived
// it. That is the whole shape of "unknown words fail at LOAD"
// (.llm/rules/engine.md) — there is no `default:` here that could fail at play,
// and there is no branch that throws.
//
// That last sentence is a claim, so it is carried by a mechanism rather than by
// discipline: an id from an intent reaches an author-keyed map only through
// `own` below, which is the one place a lookup on `objects` or `actions` may
// happen. Read raw, those maps answer an inherited Function for a dozen plain
// strings (`toString`, `constructor`, `valueOf`, …) and the totality guarantee
// is a `TypeError`. It shipped that way once; the regression is asserted.
//
// src/core is pure: no DOM, no I/O, no Date, no Math.random, no console. Every
// function here takes a state and returns a value, and none of them can edit a
// state — `GameState` is readonly to the leaves (types.ts law 1), so a resolver
// that tried would not compile.
//
// ────────────────────────────────────────────────── gate ordering is the algorithm ──
//
// An action is a LIST of responses. They are tried in order; the first whose
// gate holds answers; the list ends in an ungated fallback, so something always
// answers (`Responses` in cards.ts makes that a tuple law and the loader says
// it a second time for authored YAML). Resolution therefore never chooses — it
// reads the author's order — and no softlock can be introduced here.
//
// ─────────────────────────────────────────────────────────── ledger routing ──
//
// Ruled 2026-08-03 and landed in H010: a flag id names its own ledger in its
// prefix. `flag:` writes `RunBranch.flags` — death empties it. `knowledge:`
// writes `CampaignBranch.knowledge` — death cannot touch it, and it RATCHETS.
// A gate's `flags` reads the UNION of the two, so one gate may name both.
//
// THE LEDGERS STORE THE PREFIX. Nothing is stripped on the way in: `flag:x` and
// `knowledge:x` are different ids, and stripping would collide them the moment
// a card used both. Gates compare prefixed to prefixed, so the two ends agree.
//
// ────────────────────────────────────────── applied, or emitted, and nothing else ──
//
// Seven words move the state: `set` `unset` `give` `take` `adjust` `journal`
// `refuse`. One word speaks: `say` — exactly one `Effect` per response, never
// two. The remaining six — `goto` `addObject` `removeObject` `prompt` `fight`
// `end` — have no state to move that this card is allowed to invent, so they
// are EMITTED, with everything the author wrote on them, in the order the
// vocabulary declares. `WORD_LANDING` below is that split, made a type: a word
// added to `Deltas` without a line there is a compile error, which is how "a
// new word is its own Asana task, never a side effect" is enforced at this end
// of the pipe as well as at the loader's.
//
// AN EMISSION IS NOT A NEW WORD. Every kind below is an existing delta word of
// cards.ts's closed table, carried outward unchanged. `Effect` (types.ts) is a
// closed set of PRESENTATION effects and is not touched here: a fight is not a
// picture, and `Emission` is a separate channel on this card's own result so
// that adding one is not an amendment to types.ts.
//
// ─────────────────────────────────────────────────────────────── flagged gaps ──
//
// Three words emit because the state has nowhere to put them, and putting one
// there is a `types.ts` change and another card's:
//
//   goto          `RunBranch.roomId` names a ROOM; a door is not a room, and
//                 where a door leads is bound at draw time by D002. So the
//                 traversal is recorded as an emission and the binding — the
//                 new roomId, the new depth — belongs to whoever draws.
//   addObject /   `RunBranch` has no set of present objects. It cannot be
//   removeObject  derived either: a latent object is absent until something
//                 adds it, and nothing in a card is obliged to raise a flag
//                 beside the change. The change and its CAUSE (required by
//                 DESIGN §content laws) are emitted whole.
//   end           nothing on `GameState` says a run is over. Ending a run is a
//                 lifecycle transition (rebirth keeps the campaign, increments
//                 `deaths`, rebuilds the run branch); this card emits the
//                 ending id and does not invent the transition.
//
// ───────────────────────────────────────────────────── deliberately absent ──
//
//   no clamping     `adjust` moves a bar by exactly what the card said. The
//                   floor, the affordability gate and the death predicate are
//                   H205's and D003's — cards.ts already ruled that "the delta
//                   arrived first", and api.ts's `vignetteOf` says the same:
//                   "nothing is clamped here". A clamp in the resolver would be
//                   balance, and balance is content.
//   no randomness   not one word of the core vocabulary draws. Nothing here
//                   touches `RunBranch.rng`, so nothing has to persist a
//                   successor and determinism is free: same state, same card,
//                   same intent, same answer, byte for byte.
//   no combat,      `fight` and `end` and `prompt` pass an id through. The
//   no QTE,         engine never names an enemy, an ending or a QTE
//   no rendering    (.llm/rules/engine.md). The Lots is L001's, the ending
//                   H114's, the QTE H208's, the picture `view`'s.

import { ADJUST_TRACKS, LEDGER_PREFIXES } from "./cards";
import type { Adjust, Deltas, Gate, LedgerPrefix, Response, RoomCard } from "./cards";
import type {
  ActResult,
  CampaignBranch,
  Effect,
  EquipmentSlots,
  GameState,
  Id,
  Intent,
  ItemRef,
  Pool,
  RunBranch,
  SmallSlots,
  Vitals,
} from "./types";

// ──────────────────────────────────────────────────────────────── emissions ──

/**
 * A word that leaves the engine instead of landing in the state.
 *
 * Each kind is a delta word of cards.ts, carried out with exactly what the
 * author wrote on it and nothing added. They are ordered as the vocabulary is
 * ordered (see `resolve`), so a replay emits the same list in the same order.
 */
export type Emission =
  /** Through a DECLARED door of this room. Forward-only: there is no word for
   *  going back. Where it leads is bound at draw time (D002). */
  | { readonly kind: "goto"; readonly door: Id }
  /** A latent affordance arrives, for the stated cause (DESIGN §content laws). */
  | { readonly kind: "addObject"; readonly object: Id; readonly cause: string }
  /** An affordance leaves, for the stated cause. It cannot come back: the
   *  loader refuses a card that both removes and re-adds one thing. */
  | { readonly kind: "removeObject"; readonly object: Id; readonly cause: string }
  /** A QTE, by id. What it asks and how long it gives is H208's. */
  | { readonly kind: "prompt"; readonly prompt: Id }
  /** The one doorway into the Lots (DESIGN §the two engines, one doorway).
   *  Emission only — no combat is resolved here. */
  | { readonly kind: "fight"; readonly enemy: Id }
  /** An ending, by id. What it reads is H114's. */
  | { readonly kind: "end"; readonly ending: Id };

/**
 * What one act produced.
 *
 * Extends `ActResult` (types.ts) rather than replacing it, so this is already
 * the value `api.act` returns once the bundle (H004) can hand resolution the
 * card for `run.roomId`. `emissions` rides alongside; the shell reads the ones
 * it owns.
 */
export interface Resolution extends ActResult {
  readonly emissions: readonly Emission[];
}

// ────────────────────────────────────────────────────────── the word landing ──

/** Where a word of the language ends up. */
export type Landing =
  /** Spoken: an `Effect` on the result. `say`, and only `say`. */
  | "effect"
  /** Applied: it moves the run branch, the campaign branch, or both. */
  | "state"
  /** Emitted: passed out whole, because this card has no state to put it in. */
  | "emission";

/**
 * Every word of the Descent's delta vocabulary, and where resolution takes it.
 *
 * The mapped type is over `keyof Deltas`, so this table is EXHAUSTIVE by
 * compile: a word added to cards.ts without a decision here does not build.
 * That is the same law the loader keeps at the other end — the vocabulary is
 * closed, and a new word is its own Asana task (.llm/rules/engine.md).
 *
 * The two ledger words are marked "state" without naming a branch, because
 * which branch they touch is not theirs to say: it is the id's, in its prefix
 * (`ledgerOf`).
 */
export const WORD_LANDING: { readonly [K in keyof Deltas]-?: Landing } = {
  say: "effect",
  set: "state",
  unset: "state",
  give: "state",
  take: "state",
  adjust: "state",
  journal: "state",
  refuse: "state",
  goto: "emission",
  addObject: "emission",
  removeObject: "emission",
  prompt: "emission",
  fight: "emission",
  end: "emission",
};

// ──────────────────────────────────────────────────────────── ledger routing ──

/** The two branches a flag id may name. */
type Ledger = "run" | "campaign";

/**
 * Prefix to branch. Exhaustive over `LedgerPrefix`, so a third prefix would
 * have to be routed here deliberately — and it would be a third BRANCH of state
 * first (cards.ts `LEDGER_PREFIXES`).
 */
const LEDGER_OF: { readonly [K in LedgerPrefix]: Ledger } = {
  "flag:": "run",
  "knowledge:": "campaign",
};

/**
 * Which ledger this id is written on, by its own prefix.
 *
 * null is unreachable from loaded content: `flagList` in cards.ts refuses an id
 * that names no ledger, by name and by key path. It answers null rather than
 * throwing because nothing fails at play — the same discipline that makes
 * `load` return null instead of raising (.llm/rules/engine.md).
 */
function ledgerOf(flag: Id): Ledger | null {
  const prefix = LEDGER_PREFIXES.find((known) => flag.startsWith(known));
  return prefix === undefined ? null : LEDGER_OF[prefix];
}

/** Raised on either ledger. A gate reads the UNION of the two (cards.ts `Gate`). */
function isRaised(state: GameState, flag: Id): boolean {
  return state.run.flags.includes(flag) || state.campaign.knowledge.includes(flag);
}

// ───────────────────────────────────────────────────────────────── the pouch ──

/** Where a thing is carried. The pouch is three containers, and a gate and a
 *  `take` must agree about all three or a card could gate on what it cannot
 *  remove. */
type Held =
  | { readonly place: "consumables"; readonly index: number }
  | { readonly place: "equipment"; readonly index: number }
  | { readonly place: "small"; readonly index: number };

/**
 * Where this id is carried, or null.
 *
 * A FIXED order — consumables, then the four equipment slots, then the two
 * small ones — so that `take` is deterministic when the same id is carried
 * twice. Order is part of the save format, exactly as draw order is.
 */
function heldAt(run: RunBranch, id: Id): Held | null {
  const loose = run.consumables.findIndex((item) => item.id === id);
  if (loose >= 0) return { place: "consumables", index: loose };
  const worn = run.equipment.findIndex((slot) => slot !== null && slot.id === id);
  if (worn >= 0) return { place: "equipment", index: worn };
  const small = run.small.findIndex((slot) => slot !== null && slot.id === id);
  if (small >= 0) return { place: "small", index: small };
  return null;
}

/** An empty slot is null, not a hole: the pouch's shape never changes
 *  (types.ts `Slot`). Written out rather than mapped, so the arity stays the
 *  tuple's and no cast is needed. */
function emptyEquipment(slots: EquipmentSlots, at: number): EquipmentSlots {
  return [
    at === 0 ? null : slots[0],
    at === 1 ? null : slots[1],
    at === 2 ? null : slots[2],
    at === 3 ? null : slots[3],
  ];
}

function emptySmall(slots: SmallSlots, at: number): SmallSlots {
  return [at === 0 ? null : slots[0], at === 1 ? null : slots[1]];
}

// ───────────────────────────────────────────────────────────────────── gates ──

/**
 * Does this response answer?
 *
 * Two conditions, ANDed, and both lists are ANDs of their own
 * (cards.ts `Gate`): every named flag raised on either ledger, every named item
 * in the pouch.
 *
 * `cross_push` IS SKIPPED. It is not a condition — nothing about the state
 * makes it true or false. It is the author's declaration that the clue may come
 * from an earlier push, and the resolver's whole duty toward it is to leave it
 * alone. A gate carrying only `cross_push` therefore gates on nothing and
 * ANSWERS; it is not unsatisfiable. (The loader refuses such a gate at LOAD,
 * which is where that mistake is caught — but a resolver that treated the
 * marking as a condition would silently make every cross-push clue unreachable,
 * so the behaviour is defined here anyway, and asserted.)
 */
function holds(state: GameState, gate: Gate | undefined): boolean {
  if (gate === undefined) return true;
  if (gate.flags !== undefined) {
    for (const flag of gate.flags) if (!isRaised(state, flag)) return false;
  }
  if (gate.items !== undefined) {
    for (const item of gate.items) if (heldAt(state.run, item) === null) return false;
  }
  return true;
}

// ────────────────────────────────────────────────────────── applying the words ──

/** Raise a flag on the run ledger. A ledger is a set: raising a raised flag
 *  changes nothing, and returns the very same branch. */
function withFlag(run: RunBranch, flag: Id): RunBranch {
  if (run.flags.includes(flag)) return run;
  return { ...run, flags: [...run.flags, flag] };
}

/** Lower a flag on the run ledger. Only `flag:` ids reach here — `unset` of a
 *  `knowledge:` id is refused at LOAD, because knowledge RATCHETS and a ratchet
 *  you can lower is not a ratchet (DESIGN §the descent). */
function withoutFlag(run: RunBranch, flag: Id): RunBranch {
  if (!run.flags.includes(flag)) return run;
  return { ...run, flags: run.flags.filter((raised) => raised !== flag) };
}

/** Raise knowledge. Nothing in the language lowers it. */
function withKnowledge(campaign: CampaignBranch, flag: Id): CampaignBranch {
  if (campaign.knowledge.includes(flag)) return campaign;
  return { ...campaign, knowledge: [...campaign.knowledge, flag] };
}

/**
 * Put things in the pouch.
 *
 * They land in `consumables`: it is the only unbounded container, and the
 * engine has no word for equipping. "Mid-push finds are swap-or-leave"
 * (DESIGN §ledgers) is a decision the player makes at the panel, not a delta a
 * room applies — a `give` that reached for a slot would silently drop the fifth
 * thing a room handed you.
 *
 * The items are COPIED. A save owns its contents; nothing in a state points
 * into a content bundle.
 */
function given(run: RunBranch, items: readonly ItemRef[]): RunBranch {
  const taken: ItemRef[] = items.map((item) => ({ id: item.id, keep: item.keep }));
  return { ...run, consumables: [...run.consumables, ...taken] };
}

/**
 * Take things out of the pouch, by id.
 *
 * ONE instance per listing: a list of ids is a list of things taken, so
 * `take: [x, x]` takes two and a player carrying two keeps one. Taking what is
 * not carried is not an error — a card may take back what you never picked up
 * — and it changes nothing.
 *
 * `keep` is not consulted. What death would have done with a thing stops
 * mattering the moment it is gone (cards.ts `take`).
 */
function taken(run: RunBranch, ids: readonly Id[]): RunBranch {
  let next = run;
  for (const id of ids) {
    const where = heldAt(next, id);
    if (where === null) continue;
    if (where.place === "consumables") {
      next = {
        ...next,
        consumables: next.consumables.filter((_, index) => index !== where.index),
      };
      continue;
    }
    if (where.place === "equipment") {
      next = { ...next, equipment: emptyEquipment(next.equipment, where.index) };
      continue;
    }
    next = { ...next, small: emptySmall(next.small, where.index) };
  }
  return next;
}

/**
 * Move one pool by a whole number.
 *
 * FOUR TRACKS, ONE ARITHMETIC. `sanity` is a `Pool` falling toward 0 = death,
 * exactly as `hp` is — DESIGN §ledgers: "EITHER bar at zero — health or sanity
 * — is death, by the same rule". The same rule makes it the same quantity, so
 * it moves through this same line; there is nowhere here to put an inversion or
 * a special case, and that is deliberate. Sanity's only difference is on the
 * way OUT, where `view` derives the vignette from it and `Strip` has no field
 * to draw it in (types.ts, DESIGN §frame).
 *
 * Nothing is clamped, in either direction. See the header.
 */
function withVitals(vitals: Vitals, track: keyof Vitals, by: number): Vitals {
  const moved: Pool = { current: vitals[track].current + by, max: vitals[track].max };
  return {
    hp: track === "hp" ? moved : vitals.hp,
    sanity: track === "sanity" ? moved : vitals.sanity,
    might: track === "might" ? moved : vitals.might,
    will: track === "will" ? moved : vitals.will,
  };
}

/**
 * How each track moves. Exhaustive over `keyof Adjust` by compile, and walked
 * in cards.ts's `ADJUST_TRACKS` order, so two builds move the same tracks in
 * the same order from the same card.
 */
const MOVE: { readonly [K in keyof Adjust]-?: (run: RunBranch, by: number) => RunBranch } = {
  hp: (run, by) => ({ ...run, vitals: withVitals(run.vitals, "hp", by) }),
  sanity: (run, by) => ({ ...run, vitals: withVitals(run.vitals, "sanity", by) }),
  might: (run, by) => ({ ...run, vitals: withVitals(run.vitals, "might", by) }),
  will: (run, by) => ({ ...run, vitals: withVitals(run.vitals, "will", by) }),
  /** ◎ — the coin, and the one track that is not a bar. */
  tithes: (run, by) => ({ ...run, tithes: run.tithes + by }),
};

function adjusted(run: RunBranch, adjust: Adjust): RunBranch {
  let next = run;
  for (const track of ADJUST_TRACKS) {
    const by = adjust[track];
    if (by === undefined) continue;
    next = MOVE[track](next, by);
  }
  return next;
}

/**
 * The labyrinth said no, and remembers being asked.
 *
 * The refusal is keyed by the act and the depth — "what the labyrinth refused
 * you, and where" (types.ts `CampaignBranch.refused`) — and it is recorded
 * ONCE. Asking the same question in the same place twice is one refusal
 * remembered, not two: nothing in the language can count refusals (a gate reads
 * flags and items), so a tally would be a save that grows on a repeated tap and
 * says nothing new. A card that needs the count needs a field for it, and that
 * is a types.ts change and its own task.
 *
 * The intent is COPIED, so the ledger does not hold the shell's object.
 */
function refused(campaign: CampaignBranch, intent: Intent, depth: number): CampaignBranch {
  const already = campaign.refused.some(
    (past) =>
      past.intent.object === intent.object &&
      past.intent.action === intent.action &&
      past.depth === depth,
  );
  if (already) return campaign;
  return {
    ...campaign,
    refused: [
      ...campaign.refused,
      { intent: { object: intent.object, action: intent.action }, depth },
    ],
  };
}

// ───────────────────────────────────────────────────────────────── resolving ──

/**
 * Read an AUTHOR-KEYED map without reading through the prototype.
 *
 * `card.objects` and `RoomObject.actions` are keyed by ids a content author
 * chose, and an object literal inherits `Object.prototype`. So a raw `map[id]`
 * does NOT answer `undefined` for `toString`, `constructor`, `valueOf`,
 * `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`,
 * `__defineGetter__`, `__lookupGetter__`, `__defineSetter__`,
 * `__lookupSetter__` or `__proto__` — it answers an inherited Function (or, for
 * `__proto__`, the prototype itself), an `=== undefined` guard waves it
 * through, and the next line calls an array method on it. Twelve plain strings
 * turned the only transition into a `TypeError`, which is exactly what "unknown
 * things fail at LOAD, never at play" (.llm/rules/engine.md) forbids.
 *
 * `noUncheckedIndexedAccess` types both lookups as `T | undefined` already.
 * That is a compile-time promise the runtime does not keep, which is precisely
 * why this is a guard and not a type. `cards.ts` writes the same one at its own
 * three map lookups (`closed`, `KEEP_TABLE`, `TIER_TABLE`); this is the house
 * form, applied at the last place that omitted it.
 */
function own<T>(map: { readonly [key: string]: T }, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

/** Nothing was addressed, so nothing was said and nothing moved. */
const inert = (state: GameState): Resolution => ({ state, effects: [], emissions: [] });

/**
 * Resolve one act.
 *
 * `card` is the room the run is standing in — the caller holds the bundle and
 * looks it up by `state.run.roomId`, because src/core is pure and this file
 * reads no files (cards.ts keeps the same discipline).
 *
 * TOTAL, and it never throws. An intent naming an object or an action this card
 * does not have is INERT: the same state back, nothing said, nothing emitted.
 * The shell only ever offers what `view` surfaced, so it is not a case that
 * should arise — but resolution is not the place to discover it, because
 * unknown things fail at LOAD and nothing fails at play.
 *
 * "Does not have" means DOES NOT HAVE ITSELF (`own`), not "reads undefined".
 * An intent is a pair of plain strings and the shell may be a tap behind the
 * engine — `removeObject` is emitted, so the present-object set is the shell's
 * and can lag by one act — which makes the inert path a real path and not a
 * theoretical one.
 *
 * The words are applied in the order the vocabulary declares them
 * (`DELTA_WORDS`, .llm/rules/engine.md): say, set, unset, give, take, adjust,
 * journal, refuse, goto, addObject, removeObject, prompt, fight, end. That
 * order is part of the save format the way draw order is: `set` then `unset` of
 * the same flag is a lowered flag, always, in every build.
 */
export function resolve(state: GameState, card: RoomCard, intent: Intent): Resolution {
  // BOTH lookups are guarded, and deliberately: the object side happens to be
  // inert today only because `Object.prototype` carries no `.actions`, and an
  // accident is not a guarantee — it would become a crash the moment anything
  // reached one field further.
  const actions = own(card.objects, intent.object)?.actions;
  const responses = actions === undefined ? undefined : own(actions, intent.action);
  if (responses === undefined) return inert(state);

  // Gate ordering: the first response whose gates all hold answers. The list
  // ends in an ungated fallback (cards.ts `Responses`), so `find` succeeds —
  // the guard below is the total function's, not a case content can reach.
  const chosen: Response | undefined = responses.find((response) => holds(state, response.if));
  if (chosen === undefined) return inert(state);

  let run = state.run;
  let campaign = state.campaign;
  const emissions: Emission[] = [];

  // say — ONE line, once. Exactly one prose effect per response, whatever else
  // the response carries: a doubled line is a bug this project has shipped
  // before, and the only defence that holds is having one place that can write
  // one. This is that place.
  const effects: readonly Effect[] = [{ kind: "say", text: chosen.say }];

  // set — each id to the ledger its prefix names.
  for (const flag of chosen.set ?? []) {
    const ledger = ledgerOf(flag);
    if (ledger === "run") run = withFlag(run, flag);
    else if (ledger === "campaign") campaign = withKnowledge(campaign, flag);
    // null: refused at LOAD. Nothing to raise, and nothing to throw.
  }

  // unset — run ledger only. A `knowledge:` id cannot arrive (LOAD), and would
  // be ignored if it did: knowledge ratchets, and nothing lowers it.
  for (const flag of chosen.unset ?? []) {
    if (ledgerOf(flag) === "run") run = withoutFlag(run, flag);
  }

  if (chosen.give !== undefined) run = given(run, chosen.give);
  if (chosen.take !== undefined) run = taken(run, chosen.take);
  if (chosen.adjust !== undefined) run = adjusted(run, chosen.adjust);

  // journal — prose, appended as written. It records the act (DESIGN §content
  // laws), and doing a thing twice is two lines: unlike the refused ledger,
  // which is keyed, the journal is what happened, in order.
  if (chosen.journal !== undefined) {
    campaign = { ...campaign, journal: [...campaign.journal, chosen.journal] };
  }

  // refuse — the ledger, and nothing else. A refusal carries no other delta;
  // the loader refuses a card that says otherwise, so there is nothing to skip
  // here. The depth is the depth the act was made at.
  if (chosen.refuse === true) campaign = refused(campaign, intent, state.run.depth);

  // The six that leave. In vocabulary order.
  if (chosen.goto !== undefined) emissions.push({ kind: "goto", door: chosen.goto });
  if (chosen.addObject !== undefined) {
    emissions.push({
      kind: "addObject",
      object: chosen.addObject.object,
      cause: chosen.addObject.cause,
    });
  }
  if (chosen.removeObject !== undefined) {
    emissions.push({
      kind: "removeObject",
      object: chosen.removeObject.object,
      cause: chosen.removeObject.cause,
    });
  }
  if (chosen.prompt !== undefined) emissions.push({ kind: "prompt", prompt: chosen.prompt });
  if (chosen.fight !== undefined) emissions.push({ kind: "fight", enemy: chosen.fight });
  if (chosen.end !== undefined) emissions.push({ kind: "end", ending: chosen.end });

  // Structural sharing, deliberately: a response that moved nothing gives the
  // same state object back, so "this changed nothing" is checkable by identity
  // and not only by a deep compare.
  const next: GameState =
    run === state.run && campaign === state.campaign ? state : { ...state, run, campaign };

  return { state: next, effects, emissions };
}
