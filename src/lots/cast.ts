// castlebrynth · the cast — a die leaves your hand, and a face comes up.
//
// This is the one place the Lots touches randomness. Everything above it —
// scoring (score.ts), the turn (turn.ts) — is arithmetic on what landed here,
// so a fight is deterministic the moment this function is.
//
// ──────────────────────────────────────────────── a lean is not a bent die ──
//
// "Loaded bones: all six faces always possible; weighting is a declared
// probability lean, stated on inspect and legible in the art" (DESIGN §the
// lots). src/core/rng.ts already says the other half of that sentence: `roll`
// is fair by construction, and "a loaded bone is not a bent die here; it is a
// declared lean applied by the manifest on top of a fair draw, because 'all six
// faces always possible' is design law and leans are content, not engine."
//
// So this file does not roll a d6 and then nudge it. It reads the die's weight
// table out of the manifest, turns those weights into TICKS — a whole number of
// them per face, never zero — and draws one uniform integer across the total.
// The draw is fair; the lean lives entirely in how many ticks each face owns.
// A face can therefore be made rare and can never be made impossible, which is
// the law the loader already refuses a weight of 0 for (manifest.ts,
// `readLean`).
//
// ────────────────────────────────────────────────────── ticks, and the gap ──
//
// A weight is any finite number greater than zero, because that is all
// grammar.yaml promises (manifest.ts, `readLean`). Two cases, and the branch is
// on load-time DATA — the weights — never on the draw, so one manifest always
// takes one path and determinism is untouched:
//
//   WHOLE weights, total within one draw's range — the common case, and the
//   only case grammar.yaml ships. The weights ARE the ticks. `bone` becomes six
//   faces of one tick each, which is a uniform d6, exactly and provably: the
//   same distribution `roll(rng, 6)` gives, with no rounding anywhere.
//   `river-stone`'s 1·1·2·2·1·1 becomes eight ticks, and P(three) is 2/8 to the
//   last bit.
//
//   ANYTHING ELSE — a fractional weight, or a total too large to draw across —
//   is normalised onto a fixed tick budget, and that rounding is the one place
//   this file is approximate. A weight is rounded to its nearest tick and then
//   floored at one, so `lean: {six: 1e-12}` — which manifest.ts names as a real
//   gap and hands to L007 — arrives here as one tick in a million rather than
//   as a deleted face. Approximate, and still incapable of deleting a letter.
//
// The alternative was to make the fractional case exact, which cannot be done:
// a probability of one third has no exact form in any finite word, so the
// choice is not "exact vs rounded" but "rounded where it is written down vs
// rounded silently". It is written down.
//
// What is NOT written down here is any bound on how far apart two weights may
// sit. That is F3's, it is named in manifest.ts under "a bound on a lean's
// RATIO", and it belongs to L007 — the F-law prover — because a band is read
// against a rarity and a whole arsenal, neither of which one cast can see.
//
// ────────────────────────────────────────────────────── the fixed draw order ──
//
// Draw order is part of the save format (src/core/rng.ts). These costs are
// frozen and cast.test.ts asserts them:
//
//   cast      exactly one `nextInt` over the die's total ticks — so a lean
//             changes WHICH face lands and never how much entropy it costs.
//             (`nextInt` may reject and redraw; that is its own fixed cost.)
//   castHand  one `cast` per die, in HAND ORDER, left to right.
//
// Reordering a hand therefore changes the run, exactly as reordering any other
// draw does. That is not a bug to paper over; it is what "a run is seed + death
// count + inputs, exactly" means (.llm/rules/engine.md).

import { nextInt } from "../core/rng";
import type { Draw } from "../core/rng";
import type { Id, RngState } from "../core/types";
import { isEnabled } from "./manifest";
import type { DieEntry, Manifest } from "./manifest";

/**
 * One die of your hand, as it landed.
 *
 * `pips` is carried rather than looked up again, because it is what the throw
 * is scored on and a bone that has landed must not be able to change its mind —
 * "no takebacks: nothing rerolls or cancels a landed die, anywhere"
 * (.llm/rules/engine.md). It is a plain JSON record for the same reason every
 * other state shape is: a fight must survive a save.
 */
export interface Bone {
  readonly die: Id;
  readonly face: Id;
  readonly pips: number;
}

/** The widest bound `nextInt` will draw across (src/core/rng.ts). */
const MOST = 4294967296;

/**
 * Ticks a normalised lean is spread over. A power of two, so the common
 * halves and quarters of a hand-written weight table land exactly.
 */
const BUDGET = 1048576;

/**
 * A die's faces, as whole ticks — one entry per declared face, in the die's own
 * face order, every entry at least 1.
 *
 * See the header for which of the two cases applies when. The floor at 1 is the
 * load-time law restated where it can still be broken: "a lean SHIFTS the odds
 * and never deletes a face" (manifest.ts, `readLean`).
 */
function ticksOf(die: DieEntry): readonly number[] {
  const weights = die.faces.map((face) => die.lean?.[face] ?? 1);
  let total = 0;
  let whole = true;
  for (const weight of weights) {
    total += weight;
    if (!Number.isInteger(weight)) whole = false;
  }
  if (whole && total <= MOST) return weights;
  return weights.map((weight) => Math.max(1, Math.round((weight / total) * BUDGET)));
}

/** The die this manifest declares under `id`, or a loud refusal. */
function readDie(manifest: Manifest, die: Id): DieEntry {
  const entry = manifest.dice[die];
  if (entry === undefined) {
    throw new RangeError(
      `lots: no die "${die}" in this manifest. A hand is the loadout's business, ` +
        `but every die in it is written in grammar.yaml.`,
    );
  }
  if (!isEnabled(manifest, `dice.${die}`)) {
    throw new RangeError(
      `lots: the die "${die}" is switched off — by its own \`enabled\`, or by a set ` +
        `that lists it. A die that is not in the arsenal cannot be in the hand.`,
    );
  }
  return entry;
}

/**
 * Cast one die: the bone that landed, and the stream that comes after it.
 *
 * Throws RangeError on a die this manifest does not declare or has switched
 * off. That is a caller bug and not player data — the same discipline `pick`
 * and `nextInt` keep in src/core/rng.ts, and the opposite of `load`, which must
 * never throw. A hand holding a die nobody wrote down should be loud.
 */
export function cast(manifest: Manifest, rng: RngState, die: Id): Draw<Bone> {
  const entry = readDie(manifest, die);
  const ticks = ticksOf(entry);
  let total = 0;
  for (const tick of ticks) total += tick;

  const [drawn, after] = nextInt(rng, total);

  // `drawn` is in [0, total), so the walk always lands inside a face's ticks;
  // the last index is only what the loop is written to start from.
  let index = ticks.length - 1;
  let seen = 0;
  for (let i = 0; i < ticks.length; i += 1) {
    seen += ticks[i] ?? 0;
    if (drawn < seen) {
      index = i;
      break;
    }
  }

  const face = entry.faces[index];
  const declared = face === undefined ? undefined : manifest.faces[face];
  if (face === undefined || declared === undefined) {
    // Unreachable through `loadManifest`, which checks every die's faces against
    // the alphabet. Loud rather than silent, because reaching it means a
    // manifest arrived through some other door.
    throw new RangeError(`lots: the die "${die}" names a face this manifest does not declare`);
  }
  return [{ die, face, pips: declared.pips }, after];
}

/**
 * Refuse now what `cast` would refuse later: every die of this hand is declared
 * by this manifest and switched on.
 *
 * Draws nothing, so a fight can check its hand before it has a history to lose
 * (turn.ts, `openFight`).
 */
export function requireHand(manifest: Manifest, hand: readonly Id[]): void {
  for (const die of hand) readDie(manifest, die);
}

/**
 * Cast a whole hand, left to right.
 *
 * Every turn casts the WHOLE hand and nothing is spent doing it: the shipped
 * economy is refresh-per-fight, not gather (grammar.yaml `economy`, DESIGN
 * §open). turn.ts is where that is checked; here it is simply why this function
 * takes a hand rather than a budget.
 */
export function castHand(
  manifest: Manifest,
  rng: RngState,
  hand: readonly Id[],
): Draw<readonly Bone[]> {
  const bones: Bone[] = [];
  let stream = rng;
  for (const die of hand) {
    const [bone, after] = cast(manifest, stream, die);
    bones.push(bone);
    stream = after;
  }
  return [bones, stream];
}

/**
 * What this die's declared lean actually comes to: face id → probability.
 *
 * Derived from the same ticks `cast` draws across, so it cannot disagree with
 * the die — a second table would be a second truth, and "THE ART NEVER LIES"
 * (DESIGN §art direction) is only true of an inspect line that is derived
 * rather than written. This is the measuring function `dieEv` is, and the same
 * caveat applies: it will tell you a die's odds, and it will not tell you
 * whether those odds are allowed. That is L007's.
 *
 * null for a die this manifest does not declare, matching `dieEv`. Asking is
 * not casting, so an unknown die is an answer here and a throw there.
 */
export function castOdds(manifest: Manifest, die: Id): { readonly [face: string]: number } | null {
  const entry = manifest.dice[die];
  if (entry === undefined) return null;
  const ticks = ticksOf(entry);
  let total = 0;
  for (const tick of ticks) total += tick;
  if (total === 0) return null;
  const odds: { [face: string]: number } = {};
  entry.faces.forEach((face, index) => {
    odds[face] = (ticks[index] ?? 0) / total;
  });
  return odds;
}
