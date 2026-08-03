// castlebrynth · death — either bar at zero, and what comes back with you.
//
// "EITHER bar at zero — health or sanity — is death, by the same rule. Death
// wakes you at the Crossing, bars and uses restored; doors redraw ... RUN
// ledger (tithes, consumables, non-kept gear) — death takes it, except ✦ key
// and • kept items + one random survivor. CAMPAIGN ledger (dice, knowledge,
// landmarks, grants) — death cannot touch it. DICE SURVIVE DEATH — law."
// (DESIGN §ledgers, death, growth.)
//
// src/core is pure: no DOM, no I/O, no Date, no Math.random, no console. The
// survivor is drawn from the seeded stream on the state, like everything else.
//
// ────────────────────────────────────────────── death cannot reach the campaign ledger ──
//
// Said three times, in three languages, because it is the law most expensive to
// get wrong — a death that reached the campaign branch would take your dice, and
// there is no way to notice that in a playtest until someone has lost a
// campaign's worth of them.
//
//   the TYPE      `DeathTransition` is `(dying: RunBranch) => RunBranch`
//                 (types.ts). Death cannot be handed the whole state, cannot be
//                 handed the campaign branch, and cannot return one.
//   the LINT      eslint.config.mjs forbids this FILE from importing
//                 `CampaignBranch` or `GameState`, from naming `CampaignBranch`
//                 in a type, and from reaching any `.campaign` — because a type
//                 only binds the code that wears it, and a helper down here
//                 typed `(s: GameState) => GameState` would walk straight past
//                 the first defence.
//   the TEST      death.test.ts runs a death inside a whole state and requires
//                 the campaign branch to come back by IDENTITY, not just deep
//                 equality.
//
// ───────────────────────────────────────────── what death is, and what it is not ──
//
// Death is THE EMPTYING OF THE POUCH and the resetting of a push's condition.
// It is deliberately not the rebirth:
//
//   not death's   incrementing `GameState.deaths` — that counter is the run's
//                 identity, minted by the lifecycle when the next push begins
//                 (types.ts `DeathTransition`).
//   not death's   standing you at the Crossing. Which room the Crossing IS
//                 comes from the bundle (`ContentBundle.start`), and the engine
//                 never names a room. So death leaves `roomId` null — nowhere,
//                 yet — and whoever knows the bundle puts you somewhere.
//   not death's   moving the survivors into the campaign stash. They come back
//                 with you in the pouch; placing them in `stash` is a write to
//                 the campaign branch, and this file may not make one. That is
//                 rebirth's, and the survivors are handed to it in the one
//                 place it can find them.
//   not death's   "every death unlocks ≥1 new line somewhere (death pays)".
//                 A new line is content, and it is unlocked on the CAMPAIGN
//                 ledger. Deferred past H180 with the rest of the content laws.
//
// ─────────────────────────────────────────────────────────── doors redraw ──
//
// Not from here. A rebirth re-roots the run at `runStream(seed, deaths + 1)`
// (rng.ts) and the push's stream forks off that root, so the labyrinth is
// different because the RUN IS DIFFERENT — asserted end to end in doors.test.ts.
// What death does do is re-open the Descent's stream off the root it was handed,
// so that a mid-push position can never ride through a death: whichever way the
// lifecycle re-roots afterwards, there is no stale door draw left in the state.
// death.test.ts says plainly that this re-opening is NOT the redraw, so that
// nobody later reads it as one.

import { openPush } from "./doors";
import { nextInt } from "./rng";
import type { DeathTransition, ItemRef, Pouch, RunBranch, SkillState, Slot, Vitals } from "./types";

/**
 * EITHER BAR AT ZERO IS DEATH, BY THE SAME RULE.
 *
 * `hp` and `sanity`, and only those two: `might` and `will` are the body's
 * stats, not bars that can kill (DESIGN §the lots: "Stats are the body ...
 * dice are the hands"). Sanity is a `Pool` falling toward 0 exactly as hp is —
 * that is what "by the same rule" means, and it is why there is one predicate
 * here and not two. Sanity's only difference is on the way OUT, where `view`
 * derives the vignette from it (api.ts) and `Strip` has no field to draw it in.
 *
 * `<= 0`, not `=== 0`. Nothing is clamped in this engine — a room's `adjust`
 * moves a bar by exactly what the card said and "the delta arrived first"
 * (resolve.ts) — so a 3-point blow to a 2-point bar lands on -1, and an
 * equality test would let a player walk out of the room that killed them.
 *
 * AN UNFILLED BAR CANNOT KILL. `max === 0` is not a bar at zero, it is a bar
 * that content has not opened yet: `freshRun` mints every pool at `{0, 0}`
 * because starting bars are balance and balance is content (api.ts), so `{0,0}`
 * is the state this predicate meets FIRST, on every save made before the
 * Crossing fills them. Without the guard, `newRun` would answer dead and the
 * lifecycle's first act would be a funeral. `vignetteOf` draws the same line
 * for the same reason — "an unfilled bar is not a closed frame; it is a frame
 * with nothing to say yet".
 */
function empty(pool: { readonly current: number; readonly max: number }): boolean {
  return pool.max > 0 && pool.current <= 0;
}

export function isDead(run: RunBranch): boolean {
  return empty(run.vitals.hp) || empty(run.vitals.sanity);
}

// ─────────────────────────────────────────────────────────────── the pouch ──

/** Where a thing is carried. The same three containers, walked in the same
 *  FIXED order as resolve.ts's `heldAt` — consumables, then the four equipment
 *  slots, then the two small ones — so that "one random survivor" is drawn from
 *  a pool in a defined order and a replay saves the same thing. */
interface Held {
  readonly item: ItemRef;
  readonly place: "consumables" | "equipment" | "small";
  readonly index: number;
}

function contents(pouch: Pouch): readonly Held[] {
  const held: Held[] = [];
  pouch.consumables.forEach((item, index) => held.push({ item, place: "consumables", index }));
  pouch.equipment.forEach((slot, index) => {
    if (slot !== null) held.push({ item: slot, place: "equipment", index });
  });
  pouch.small.forEach((slot, index) => {
    if (slot !== null) held.push({ item: slot, place: "small", index });
  });
  return held;
}

/** Survivors keep their PLACES. A ✦ key carried in a small slot comes back in
 *  that small slot: the pouch's shape never changes (types.ts `Pouch`), and
 *  where a thing was is information death has no reason to take. */
function keeping(pouch: Pouch, survivors: readonly Held[]): Pouch {
  const survived = (place: Held["place"], index: number): Slot =>
    survivors.find((held) => held.place === place && held.index === index)?.item ?? null;
  return {
    consumables: survivors.filter((held) => held.place === "consumables").map((held) => held.item),
    equipment: [survived("equipment", 0), survived("equipment", 1), survived("equipment", 2), survived("equipment", 3)],
    small: [survived("small", 0), survived("small", 1)],
  };
}

// ─────────────────────────────────────────────────────────────── restoring ──

/** Bars and uses restored (DESIGN §ledgers). A pool comes back full — and `max`
 *  is untouched, because what a bar's ceiling is remains balance, and balance is
 *  content. */
const full = <T extends { readonly current: number; readonly max: number }>(pool: T): T => ({
  ...pool,
  current: pool.max,
});

function restored(vitals: Vitals): Vitals {
  return {
    hp: full(vitals.hp),
    might: full(vitals.might),
    will: full(vitals.will),
    // Restored like any other bar. It killed you the same way; it comes back
    // the same way.
    sanity: full(vitals.sanity),
  };
}

/** "skills (found, uses-per-rest ...)" — a death is a rest (DESIGN §growth). */
const rested = (skills: readonly SkillState[]): readonly SkillState[] =>
  skills.map((skill) => ({ ...skill, uses: full(skill.uses) }));

// ────────────────────────────────────────────────────────────────── death ──

/**
 * Die. The run branch in, the run branch back, emptied.
 *
 * WHAT COMES BACK WITH YOU, and nothing else:
 *   ✦ key    `keep: "key"`
 *   • kept   `keep: "kept"`
 *   one random survivor, drawn from what is left
 *
 * THE SURVIVOR IS DRAWN OFF THE RUN'S ROOT STREAM, and the successor is kept.
 * Not off `run.descent`: that is the Descent's stream, and spending a word of it
 * here would shift every door of the push — which push you died on would change
 * where its doors led, and the doors were already drawn. Advancing the ROOT is
 * free of that: a fork reads its parent's SEED and never its position (rng.ts),
 * so no child stream moves when the root does.
 *
 * The draw costs ONE word when anything is doomed and NOTHING when nothing is —
 * a pouch of pure keeps has no pool to draw from, and `pick`'s discipline of
 * charging for a one-item pool does not extend to an empty one.
 *
 * WHAT DEATH TAKES: the tithes (◎ is run coin), the flags (one-shots of a push
 * that is over), the depth (back to 0, the Crossing), and the room you were
 * standing in. What it restores: every bar, and every skill's uses.
 */
export const death: DeathTransition = (dying) => {
  const held = contents(dying.pouch);
  const kept = held.filter((one) => one.item.keep !== "none");
  const doomed = held.filter((one) => one.item.keep === "none");

  let rng = dying.rng;
  const survivors = [...kept];
  if (doomed.length > 0) {
    const [index, after] = nextInt(rng, doomed.length);
    rng = after;
    // In range by construction; `noUncheckedIndexedAccess` cannot see that.
    survivors.push(doomed[index] as Held);
  }

  return {
    ...dying,
    rng,
    // No mid-push door draw rides through a death. This is not the redraw —
    // see the header.
    descent: openPush(rng),
    depth: 0,
    // Nowhere, yet: which room the Crossing is comes from the bundle, and the
    // engine never names a room.
    roomId: null,
    vitals: restored(dying.vitals),
    tithes: 0,
    pouch: keeping(dying.pouch, survivors),
    skills: rested(dying.skills),
    flags: [],
  };
};
