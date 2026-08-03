// castlebrynth · the score — what a throw is worth.
//
// "Scoring: base = sum of thrown faces × combo tier (pair ×2, trips ×3,
// straight ×3, full house ×4, quads+ ×5)" (DESIGN §the lots).
//
// That sentence is the whole of this file, and the parenthesis is deliberately
// NOT in it: the tier table is `grammar.yaml`, read through `manifest.ts`. This
// scorer matches a generic SHAPE — groups of a kind, or a run of consecutive
// pips — and never says the words "full house". "Engine code never names a
// specific die, joker, or enemy" (.llm/rules/engine.md), and a tier is content
// by the same argument: an experiment moves `straight`'s `run: 4` to 5 and no
// line here changes.
//
// ─────────────────────────────────────────────────── which half the pipeline ──
//
// DESIGN's pipeline is "… → combo_validate → base_sum → tier_mult → on_score
// faces-then-jokers → apply → …". This file is `combo_validate`, `base_sum` and
// `tier_mult`, and it stops there.
//
// `on_score` is where gilded faces and jokers fire, and it is EMPTY rather than
// unwritten: grammar.yaml ships `jokers: {}` and no face is gilded, because
// "an invented joker is a balance decision made in the dark". Effect
// application — the closed verbs add/mult/promote/… landing on a score — is
// L005's and L006's and is deferred past H180. When it arrives it wraps this
// function; it does not edit it, because `base × tier` is the number those
// effects are additive TO.
//
// F1 mult discipline — "tier × at most ONE item mult, hard cap" — is therefore
// already kept here in its strongest form: there is exactly one multiplier in
// this file, and it is the tier's. The per-entry half of F1 is manifest.ts's;
// the runtime cap across entries becomes real the day a joker can speak `mult`.
//
// ───────────────────────────────────────────────────── the table speaks pips ──
//
// A tier's shape is measured in PIPS, not in face ids, and both halves of the
// table agree on that: `run` is "that many consecutive pips" and the loader
// already checks a run against the declared pips of the alphabet (manifest.ts,
// `readTierMatch`). `counts` is read the same way — a pair is two dice showing
// the same NUMBER. It has to be: the Hollow Die's blanks are distinct faces
// that all show 0, and two blanks are a pair of nothing rather than two
// unrelated letters.
//
// ─────────────────────────────────────────────────────────────── the ruling ──
//
// A throw that matches no tier scores its sum — ×1. That is not a tier and it
// is not one being invented: it is what "sum of thrown faces × combo tier"
// comes to when there is no combo, and without it a single die thrown alone
// would be worth nothing and the fight would have no floor. `tier` is reported
// as null so a reader can tell the difference between "no combo" and "a tier
// whose mult happens to be 1".
//
// TIES go to the tier declared FIRST in the manifest. grammar.yaml ships two at
// ×3 — trips and straight — so a throw can satisfy both, and the answer must be
// the same on every machine and every replay. Declaration order is the only
// ordering the manifest has that an author controls, so that is the one used.
// Whether the table's ties resolve SENSIBLY is a different question and it is
// L007's, the F-law prover (manifest.ts, "what is NOT checked here"). This file
// only guarantees the answer is stable.

import type { Id } from "../core/types";
import { isEnabled } from "./manifest";
import type { Manifest, TierMatch } from "./manifest";
import type { Bone } from "./cast";

/**
 * A throw, scored. Every field is shown so a fight screen can print the
 * arithmetic rather than assert it — `sum × mult = score`, in the open.
 */
export interface Scored {
  readonly bones: readonly Bone[];
  /** base_sum: the sum of the thrown faces' pips. */
  readonly sum: number;
  /** The tier this throw satisfies, or null for no combo. */
  readonly tier: Id | null;
  /** tier_mult. 1 when no tier matched. */
  readonly mult: number;
  /** `sum × mult`. What `apply` spends on the enemy. */
  readonly score: number;
}

/**
 * Group sizes among these pips, largest first: [3,3,3,5,5,1] → [3, 2, 1].
 *
 * A Map keyed by pip value would be the obvious shape; a sorted list of counts
 * is used instead because every question `counts` asks is about SIZES and never
 * about which number made them.
 */
function groupSizes(pips: readonly number[]): readonly number[] {
  const counts = new Map<number, number>();
  for (const pip of pips) counts.set(pip, (counts.get(pip) ?? 0) + 1);
  return [...counts.values()].sort((a, b) => b - a);
}

/**
 * The longest stretch of consecutive values here: {1,2,3,5,6} → 3.
 *
 * The same arithmetic manifest.ts runs at load, over a different subject: there
 * it measures the ALPHABET, to refuse a run tier no hand could ever throw; here
 * it measures one THROW, to ask whether this one did. Kept separate on purpose —
 * a load-time law about what may be authored and a runtime question about what
 * landed are not the same function wearing two hats.
 */
function longestRun(pips: ReadonlySet<number>): number {
  let longest = 0;
  for (const pip of pips) {
    if (pips.has(pip - 1)) continue; // not the start of a stretch
    let length = 1;
    while (pips.has(pip + length)) length += 1;
    if (length > longest) longest = length;
  }
  return longest;
}

/**
 * Does this throw have the shape the tier wants?
 *
 * `counts` entries are MINIMUMS and each must be met by a DIFFERENT group —
 * that second half is what makes a full house a full house. Five of a kind is
 * one group of five, and one group cannot be both the three and the two, so
 * [3, 2] refuses it. (It satisfies [4] instead, which is the higher tier
 * anyway.) Both lists are walked largest-first, which pairs them correctly:
 * if the largest group cannot cover the largest requirement, no smaller one can.
 */
function matches(match: TierMatch, sizes: readonly number[], pips: ReadonlySet<number>): boolean {
  if (match.run !== undefined) return longestRun(pips) >= match.run;
  const counts = match.counts;
  if (counts === undefined) return false; // refused at load; false rather than thrown here
  const want = [...counts].sort((a, b) => b - a);
  if (want.length > sizes.length) return false;
  for (let i = 0; i < want.length; i += 1) {
    if ((sizes[i] ?? 0) < (want[i] ?? 0)) return false;
  }
  return true;
}

/**
 * The best tier this throw satisfies, or null.
 *
 * Highest `mult` wins; a tie goes to whichever was declared first (see the
 * header). Switched-off tiers are not tiers — an experiment that disables one
 * removes it from the table, and `isEnabled` is the single place that question
 * is answered, sets included.
 */
export function bestTier(manifest: Manifest, bones: readonly Bone[]): Id | null {
  const pips = bones.map((bone) => bone.pips);
  const sizes = groupSizes(pips);
  const distinct = new Set(pips);
  let best: Id | null = null;
  let bestMult = 0;
  for (const [id, tier] of Object.entries(manifest.tiers)) {
    if (!isEnabled(manifest, `tiers.${id}`)) continue;
    if (!matches(tier.match, sizes, distinct)) continue;
    if (tier.mult > bestMult) {
      best = id;
      bestMult = tier.mult;
    }
  }
  return best;
}

/**
 * Score a throw: base_sum, then tier_mult.
 *
 * Total and pure — no randomness reaches this file, which is why a fight
 * replays: once the bones have landed, everything after them is arithmetic.
 * An empty throw scores 0, which is what BRACE is (turn.ts).
 */
export function scoreThrow(manifest: Manifest, bones: readonly Bone[]): Scored {
  let sum = 0;
  for (const bone of bones) sum += bone.pips;
  const tier = bestTier(manifest, bones);
  const mult = tier === null ? 1 : (manifest.tiers[tier]?.mult ?? 1);
  return { bones, sum, tier, mult, score: sum * mult };
}
