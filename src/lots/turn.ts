// castlebrynth · the turn — one fight, beat by beat.
//
// "Turn: enemy intent shows (enemies never roll) → roll your hand → THROW a
// combo / brace / [gather — economy still open] / FLEE → each held die blocks 1
// → intent lands." (DESIGN §the lots.)
//
// That sentence is this file's spine, and the order of it is load-bearing: the
// intent is shown BEFORE you roll, which is what makes the throw a decision
// rather than a wish. Everything you are told, you are told first.
//
// ────────────────────────────────────────────────────────── what a fight is ──
//
// `Fight` is plain JSON, readonly all the way down, threaded like `GameState`:
// every transition takes one and returns a new one. It carries its own
// `RngState`, so a fight is savable mid-turn and resumes on exactly the die it
// stopped on — the same reason the RNG lives on the state and not in a closure
// (src/core/rng.ts). The Descent forks the stream it hands in:
// `fork(state.run.rng, STREAM.lots)`.
//
// ────────────────────────────────────────────── the enemy is not in the grammar ──
//
// `Foe` is handed in, not looked up, and that is manifest.ts's decision
// standing: "An enemy here is its PURSUIT chance and the rules it bends …
// Its intents, its health and its art are the enemy card's, and this schema is
// additive to them." grammar.yaml ships `enemies: {}` for the same reason it
// ships no jokers. So the body and the intents arrive as data from whoever
// opened the fight, and this file names no enemy — the engine never does
// (.llm/rules/engine.md).
//
// `pursuit` is REQUIRED on a `Foe`, exactly as it is required on a manifest
// enemy: "FLEE is always offered: every enemy's inspect declares its PURSUIT
// chance alongside its intent" (DESIGN §the lots). There is no fight without a
// declared chance of being followed, because the type has nowhere to put its
// absence.
//
// ────────────────────────────────────────────── enemies never roll, and so ──
//
// An intent is a NUMBER — the harm this enemy will do when the turn ends — read
// from `Foe.intents` by turn, cycling. No draw is made for it, ever, which is
// "enemies never roll" said as an absence of a call. The Lots' entire entropy
// budget is your own dice.
//
// An intent that is anything other than harm (a grab, a seal, a summons) is an
// enemy-card question and a DEFERRED one; the closed verb `seal` exists in the
// grammar for it (manifest.ts, `enemy_rules`) and nothing here runs effects yet.
// The skeleton's intent is damage, and it says so in its type.
//
// ────────────────────────────────────────────────────────── the block math ──
//
// "each held die blocks 1". A held die is one you did NOT throw, so:
//
//     block = hand size − dice thrown          harm = max(0, intent − block)
//
// BRACE is therefore not a separate defensive statistic — it is the throw of
// nothing, holding everything, blocking one per die in your hand. It is its own
// function because DESIGN gives it its own word in the action list, not because
// it takes a different path. F2's "brace-only survival 4–5 turns" is that
// arithmetic against a hand of six.
//
// `Resolution` reports `held` and `block` separately even though they are equal
// today. They are two different claims — how many dice you kept, and how much
// harm that stopped — and the day a joker speaks `block` they stop being the
// same number. Collapsing them now would hide where that seam is.
//
// ─────────────────────────────────────────── two rulings DESIGN does not make ──
//
// Both change behaviour, so both are written down rather than buried, and both
// are read off the pipeline order rather than invented:
//
//   1. A SHOWN INTENT LANDS, even if your throw just killed the thing.
//      DESIGN's pipeline runs "… → apply → enemy_resolve → on_turn_end" with no
//      branch anywhere in it: `apply` is where your score is spent on the enemy,
//      and `enemy_resolve` comes after it unconditionally. The turn runs to its
//      end. It also reads right against "telegraphed harm" (DESIGN §content
//      laws) — the alternative is harm that was announced and then withdrawn.
//      This is a FEEL question as much as a law one and it is flagged for the
//      human; it is written here so that whichever way it is ruled, it is ruled
//      in one place.
//
//   2. BOTH AT ZERO IS A LOSS. If your throw kills the enemy and its intent then
//      kills you, the fight is lost. "EITHER bar at zero — health or sanity — is
//      death, by the same rule" (DESIGN §ledgers), and death is not conditional
//      on what else happened in the same second. A fight you did not walk out of
//      is not a fight you won. It follows from ruling 1 rather than adding to it:
//      the last thing that happens in the turn is the intent landing.
//
// ────────────────────────────────────────────────────── refresh-per-fight only ──
//
// The whole hand is cast every turn and nothing is spent doing it. That is the
// economy grammar.yaml ships — `refresh_per_fight` on, `gather` off — and
// DESIGN parks the question in §open ("knucklebones gather vs refresh-per-fight
// — ruled by thumb at the fight screen", Asana H199).
//
// `openFight` REFUSES a manifest with `gather` switched on rather than ignoring
// it. A toggle that is read by nothing is worse than a toggle that is missing:
// it lets an experiment believe it changed the game. The gather economy is
// deferred, and until it is built this is what "deferred" has to look like from
// the inside.
//
// ───────────────────────────────────────────────────── the fixed draw order ──
//
// Draw order is part of the save format (src/core/rng.ts). Frozen, and
// turn.test.ts asserts every one:
//
//   openFight   nothing. The intent is read, not rolled.
//   rollHand    one `cast` per die of the hand, in hand order.
//   throwBones  nothing.
//   brace       nothing.
//   flee        exactly one word, ALWAYS — even at pursuit 0, where the answer
//               is known in advance. A draw that is sometimes skipped is a draw
//               order that depends on content, and then an experiment moving a
//               pursuit chance silently reshuffles every fight after it.
//
// NO REROLLS EVER (DESIGN §content laws). `rollHand` on a hand that has already
// been cast this turn is refused by name, and there is no function anywhere in
// this file that unmakes a landed die.

import { nextFloat } from "../core/rng";
import type { Id, RngState } from "../core/types";
import { castHand, requireHand } from "./cast";
import type { Bone } from "./cast";
import { isEnabled } from "./manifest";
import type { Manifest } from "./manifest";
import { scoreThrow } from "./score";

/**
 * What the Lots must know about the thing in front of you.
 *
 * Its grammar — the rules it bends, the pursuit chance it declares on inspect —
 * is the manifest's; its body and its intents are the enemy card's and arrive
 * here as data. See the header.
 */
export interface Foe {
  readonly id: Id;
  readonly hp: number;
  /** Harm per turn, cycled by turn number. Enemies never roll. */
  readonly intents: readonly number[];
  /** 0..1 — the chance it follows you out. Required: FLEE is always offered. */
  readonly pursuit: number;
}

/** How a fight ended. `fled` is not a loss: the room's door draw stands. */
export type Ending = "won" | "lost" | "fled";

/** Which word you spoke this turn. The action vocabulary, as data. */
export type Action = "throw" | "brace" | "flee";

/** What one turn came to. Reported in full so a fight screen prints the
 *  arithmetic instead of asserting it. */
export interface Resolution {
  readonly turn: number;
  readonly action: Action;
  readonly thrown: readonly Bone[];
  readonly tier: Id | null;
  /** `sum × tier`. Harm to the foe. 0 for a brace, 0 for a flight. */
  readonly score: number;
  /** Dice kept back. */
  readonly held: number;
  /** Harm stopped — one per held die. See the header on why both are here. */
  readonly block: number;
  /** What was shown before you rolled. */
  readonly intent: number;
  /** What landed on you. */
  readonly harm: number;
  /** Flee only: whether it followed. */
  readonly pursued: boolean;
}

/**
 * One fight, whole. Plain JSON, readonly throughout, savable at any beat.
 *
 * `roll` is null until you have cast this turn's hand, and back to null once
 * the turn resolves — which is also the phase marker the transitions read, so
 * there is no second field that could disagree with it.
 */
export interface Fight {
  readonly rng: RngState;
  readonly foe: Foe;
  readonly foeHp: number;
  readonly hp: number;
  readonly hand: readonly Id[];
  /** 0-based. Names the intent. */
  readonly turn: number;
  /** Shown BEFORE the roll — always. */
  readonly intent: number;
  /** This turn's hand, once cast. */
  readonly roll: readonly Bone[] | null;
  /** The turn just resolved, or null before the first one. */
  readonly last: Resolution | null;
  readonly ending: Ending | null;
}

/** The intent for a turn: `intents`, cycled. Read, never rolled. */
function intentAt(foe: Foe, turn: number): number {
  const intent = foe.intents[turn % foe.intents.length];
  return intent ?? 0;
}

/** A caller bug, said loudly. Player data never reaches these — a manifest is
 *  refused at load and a fight is opened by the engine, not by a file. */
function refuse(message: string): never {
  throw new RangeError(`lots: ${message}`);
}

function open(fight: Fight): void {
  if (fight.ending !== null) {
    refuse(`this fight is over ("${fight.ending}") — a finished fight takes no more acts`);
  }
}

/**
 * Open a fight. Nothing is drawn: the first intent is shown, and the hand is
 * whole because the economy is refresh-per-fight.
 *
 * The hand is validated here rather than at the first roll, so a die nobody
 * wrote down is caught before the fight has a history to lose.
 */
export function openFight(
  manifest: Manifest,
  rng: RngState,
  foe: Foe,
  hand: readonly Id[],
  hp: number,
): Fight {
  if (isEnabled(manifest, "economy.gather")) {
    refuse(
      "this manifest switches `economy.gather` on, and the turn loop only knows " +
        "refresh-per-fight. The spend economy is DESIGN §open, parked in Asana H199 " +
        "and deferred: gather is not implemented, so rather than run the wrong " +
        "economy quietly, this refuses. Switch it off, or build it.",
    );
  }
  if (!isEnabled(manifest, "economy.refresh_per_fight")) {
    refuse(
      "this manifest switches `economy.refresh_per_fight` off, and it is the only " +
        "economy the turn loop knows — the whole hand is cast every turn and nothing " +
        "is spent. There is no third option to fall back to.",
    );
  }
  if (hand.length === 0) refuse("a hand of no dice cannot fight");
  if (foe.intents.length === 0) {
    refuse(
      `the foe "${foe.id}" declares no intents. An enemy intent shows before you roll ` +
        `(DESIGN §the lots), so a foe without one has nothing to show.`,
    );
  }
  if (!Number.isFinite(foe.pursuit) || foe.pursuit < 0 || foe.pursuit > 1) {
    refuse(
      `the foe "${foe.id}" declares a pursuit chance of ${foe.pursuit}, and a chance ` +
        `runs 0 to 1. FLEE is always offered, so this number is always real.`,
    );
  }
  if (!Number.isInteger(foe.hp) || foe.hp < 1) refuse(`the foe "${foe.id}" needs a whole hp of 1 or more`);
  if (!Number.isInteger(hp) || hp < 1) refuse("you cannot open a fight already dead");
  // Draws nothing — this only proves every die of the hand is declared and on.
  requireHand(manifest, hand);
  return {
    rng,
    foe,
    foeHp: foe.hp,
    hp,
    hand,
    turn: 0,
    intent: intentAt(foe, 0),
    roll: null,
    last: null,
    ending: null,
  };
}

/**
 * Cast this turn's hand. The whole hand, every turn — refresh-per-fight.
 *
 * Refused if this turn has already been cast. NO REROLLS EVER (DESIGN §content
 * laws); "nothing rerolls or cancels a landed die, anywhere"
 * (.llm/rules/engine.md). There is no argument that unlocks it.
 */
export function rollHand(manifest: Manifest, fight: Fight): Fight {
  open(fight);
  if (fight.roll !== null) {
    refuse(
      "this hand has already landed this turn. NO REROLLS EVER (DESIGN §content laws) " +
        "— throw it, brace, or flee.",
    );
  }
  const [bones, after] = castHand(manifest, fight.rng, fight.hand);
  return { ...fight, rng: after, roll: bones };
}

/** Everything after the dice land, said once for all three actions. */
function resolve(
  fight: Fight,
  rng: RngState,
  action: Action,
  resolution: Omit<Resolution, "turn" | "action" | "intent">,
): Fight {
  const foeHp = fight.foeHp - resolution.score;
  const hp = fight.hp - resolution.harm;
  const last: Resolution = { ...resolution, turn: fight.turn, action, intent: fight.intent };

  // Order is the ruling: the intent lands last, so it is read last. A fight you
  // did not walk out of is not a fight you won. (See the header, ruling 2.)
  const ending: Ending | null =
    hp <= 0 ? "lost" : action === "flee" ? "fled" : foeHp <= 0 ? "won" : null;

  const turn = ending === null ? fight.turn + 1 : fight.turn;
  return {
    ...fight,
    rng,
    foeHp,
    hp,
    turn,
    intent: ending === null ? intentAt(fight.foe, turn) : fight.intent,
    roll: null,
    last,
    ending,
  };
}

/** The dice of this turn's roll at these positions, refusing anything that is
 *  not a real, distinct, in-range choice. */
function chosen(roll: readonly Bone[], indices: readonly number[]): readonly Bone[] {
  const seen = new Set<number>();
  const bones: Bone[] = [];
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= roll.length) {
      refuse(`no die at position ${index} of a roll of ${roll.length}`);
    }
    if (seen.has(index)) refuse(`the die at position ${index} is thrown twice — a die is thrown once`);
    seen.add(index);
    bones.push(roll[index] as Bone);
  }
  return bones;
}

/**
 * THROW a combo: these dice of this turn's roll, by position.
 *
 * The rest are HELD and each blocks 1. Then the intent lands. A throw of
 * nothing is not a throw — that is BRACE, and it has its own word.
 */
export function throwBones(
  manifest: Manifest,
  fight: Fight,
  indices: readonly number[],
): Fight {
  open(fight);
  const roll = fight.roll;
  if (roll === null) refuse("nothing has been cast this turn — roll your hand before you throw it");
  if (indices.length === 0) {
    refuse("a throw of no dice is a BRACE, and BRACE is its own word (DESIGN §the lots)");
  }
  const thrown = chosen(roll, indices);
  const scored = scoreThrow(manifest, thrown);
  const held = roll.length - thrown.length;
  return resolve(fight, fight.rng, "throw", {
    thrown,
    tier: scored.tier,
    score: scored.score,
    held,
    block: held,
    harm: Math.max(0, fight.intent - held),
    pursued: false,
  });
}

/**
 * BRACE: throw nothing, hold everything. Every die in the roll blocks 1.
 *
 * The same path a throw takes with an empty selection, given its own name
 * because DESIGN gives it its own word — and because "brace-only survival 4–5
 * turns" (F2) is a claim about a thing a player can name.
 */
export function brace(fight: Fight): Fight {
  open(fight);
  const roll = fight.roll;
  if (roll === null) refuse("nothing has been cast this turn — roll your hand before you brace behind it");
  const held = roll.length;
  return resolve(fight, fight.rng, "brace", {
    thrown: [],
    tier: null,
    score: 0,
    held,
    block: held,
    harm: Math.max(0, fight.intent - held),
    pursued: false,
  });
}

/**
 * FLEE. Always offered — before the roll or after it, and at any turn.
 *
 * "fleeing ends the fight, pursuit may land one parting harm, and the room's
 * door draw stands — forward is still the only way" (DESIGN §the lots). The
 * parting harm is the intent that was shown, and it is UNBLOCKED: the dice you
 * were holding are not between you and it any more, because you turned around.
 * Fleeing into a fatal one is death by the ordinary rule.
 *
 * Costs exactly one word whatever the pursuit chance is — see the header on
 * draw order.
 */
export function flee(fight: Fight): Fight {
  open(fight);
  const [chance, after] = nextFloat(fight.rng);
  const pursued = chance < fight.foe.pursuit;
  return resolve(fight, after, "flee", {
    thrown: [],
    tier: null,
    score: 0,
    held: 0,
    block: 0,
    harm: pursued ? fight.intent : 0,
    pursued,
  });
}
