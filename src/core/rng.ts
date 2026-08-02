// castlebrynth · the seeded RNG. Every random thing in the game starts here.
//
// src/core is pure — no DOM, no I/O, no Date, no Math.random, no console — and
// "all randomness flows from the seeded RNG on state, in fixed draw order"
// (.llm/rules/engine.md). This file is that RNG.
//
// ──────────────────────────────────────────────────────── state, not closure ──
//
// A generator that keeps its position in a closure cannot be saved, so it
// cannot be resumed, so `run = seed + death count + inputs` stops being true
// the moment a player closes the tab. Here a stream's entire position is
// `RngState` from ./types — `{ seed, draws }`, two numbers, plain JSON, living
// on `GameState.run.rng` where H001 put it. Every draw reads a state and
// returns a value plus the state that comes after it:
//
//     const [face, after] = roll(state.run.rng, 6);
//
// Nothing is hidden and nothing is mutated. The caller threads the successor
// exactly the way it threads GameState, and a stream serialised mid-push
// resumes from precisely where it stopped, because there is nowhere else for
// its position to live.
//
// COUNTER FORM. `value = H(seed, draws)` — a hash of the pair, not a chain.
// H001 chose that shape in types.ts and it buys two things: a save resumes
// without replaying the generator's churn, and any position costs the same.
//
// ────────────────────────────────────────────────────────────────── streams ──
//
// THE DESCENT draws rooms and doors; THE LOTS casts dice (DESIGN §the two
// engines, one doorway). They must not spend each other's entropy. If they
// shared one counter, peering into one more alcove would silently change every
// die you throw for the rest of the push — the run would no longer be
// `seed + death count + inputs`, it would be `... + how curious you were`, and
// two replays of the same inputs could diverge.
//
// So streams fork by NAME: `fork(root, STREAM.lots)`. A fork reads the parent's
// SEED and deliberately never reads its `draws`, which is the whole property —
// the same fork is derivable from the seed alone, at any moment, in any order,
// and each named stream then advances on its own counter. Forks nest, because a
// fork of a fork is just another named derivation.
//
// ──────────────────────────────────────────────────── the fixed draw order ──
//
// Draw order is part of the save format. Two builds that draw the same things
// in a different order produce different runs from the same seed — a refactor
// that reorders draws is a save-breaking change and must be a loud amendment,
// never a quiet edit (.llm/rules/engine.md). These costs are frozen, and
// rng.test.ts asserts every one of them:
//
//   next        1 word
//   nextFloat   1 word
//   nextInt     1 word, plus 1 for each rejected word (see "no modulo bias")
//   roll        exactly nextInt
//   pick        exactly nextInt over the pool length — a 1-item pool still
//               costs its word, so adding a second option later does not shift
//               everything downstream
//   shuffle     n - 1 nextInt draws for n items, taken from the LAST index down
//               to index 1 (Fisher-Yates, descending). 0 or 1 items cost
//               nothing.
//
// Nothing here rewinds a counter. No takebacks (.llm/rules/engine.md).

import type { RngState } from "./types";

/** 2^32. The width of one drawn word. */
const TWO32 = 4294967296;

/**
 * A draw: the value, and the stream that comes after it.
 *
 * Always destructured — `const [value, after] = ...` — so that forgetting to
 * thread the successor looks wrong at the call site rather than quietly
 * redrawing the same number forever.
 */
export type Draw<T> = readonly [value: T, next: RngState];

/**
 * The two engines, named once (DESIGN §the two engines, one doorway). These are
 * stream names, not content: the engine still never names a die, a joker or an
 * enemy (.llm/rules/engine.md). A card that wants a narrower stream forks
 * further — `fork(fork(root, STREAM.lots), "fight:3")`.
 */
export const STREAM = {
  /** Rooms, doors, landmarks — everything the Descent draws. */
  descent: "descent",
  /** Dice. Everything the Lots casts. */
  lots: "lots",
} as const;

// ───────────────────────────────────────────────────────────────── the mixer ──
//
// MurmurHash3 (x86_32), used in counter mode: the seed words and the counter
// words are hashed together, so a value is a pure function of the pair and
// streams with different seeds are decorrelated by the avalanche rather than
// being shifted copies of one sequence. A published, well-tested mixer is
// deliberate — the fairness laws (DESIGN §fairness laws) rest on this being
// uniform, and a hand-rolled one is not something a reviewer can check.

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;
const C3 = 0xe6546b64;

/** Domain separators, so the three derivations below cannot alias each other. */
const DOMAIN_DRAW = 0x62726e79;
const DOMAIN_FORK = 0x666f726b;
const DOMAIN_DEATH = 0x64656174;

/** One MurmurHash3 body round over a 32-bit word. */
function round(h: number, word: number): number {
  let k = Math.imul(word, C1);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, C2);
  let x = h ^ k;
  x = (x << 13) | (x >>> 19);
  return (Math.imul(x, 5) + C3) | 0;
}

/** MurmurHash3's fmix32 avalanche. Bijective, so it cannot lose entropy. */
function avalanche(input: number): number {
  let h = input;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash a domain and a list of 32-bit words down to one unsigned 32-bit word. */
function digest(domain: number, words: readonly number[]): number {
  let h = domain | 0;
  for (const word of words) h = round(h, word);
  return avalanche(h ^ (words.length * 4));
}

/**
 * A JS number as two 32-bit lanes, low first.
 *
 * Injective over every safe integer, positive or negative, so a large campaign
 * seed does not alias a small one and a save can carry whatever number minted
 * it. Non-integers are truncated toward zero — deterministically, which is all
 * determinism asks.
 */
function lanes(value: number): readonly [number, number] {
  const whole = Math.trunc(value);
  return [whole >>> 0, Math.floor(whole / TWO32) >>> 0];
}

/** The word this stream serves at this position. The whole algorithm. */
function wordAt(seed: number, draws: number): number {
  const [seedLo, seedHi] = lanes(seed);
  const [drawLo, drawHi] = lanes(draws);
  return digest(DOMAIN_DRAW, [seedLo, seedHi, drawLo, drawHi]);
}

/** The seed of the sub-stream `name` under `seed`. Pure in both arguments. */
function forkSeed(seed: number, name: string): number {
  const [seedLo, seedHi] = lanes(seed);
  const words = [seedLo, seedHi];
  // Code units, not code points: every JS string has them, including lone
  // surrogates, so the derivation is total and never depends on an encoder.
  for (let i = 0; i < name.length; i++) words.push(name.charCodeAt(i));
  return digest(DOMAIN_FORK, words);
}

// ────────────────────────────────────────────────────────── opening a stream ──

/**
 * The root stream of a run.
 *
 * `run = seed + death count + inputs, exactly` (.llm/rules/engine.md), so the
 * death count is part of a run's identity and has to reach the randomness —
 * otherwise every rebirth on a campaign redraws the same labyrinth. This is the
 * mixing H001 left to this card (see api.ts `freshRun`).
 *
 * At `deaths === 0` the answer is `{ seed, draws: 0 }` verbatim, which is
 * exactly the state `newRun` already mints. The first push therefore needs no
 * migration, and the identity is asserted against `newRun` in rng.test.ts.
 */
export function runStream(seed: number, deaths: number): RngState {
  if (Math.trunc(deaths) === 0) return { seed, draws: 0 };
  const [seedLo, seedHi] = lanes(seed);
  const [deathLo, deathHi] = lanes(deaths);
  return { seed: digest(DOMAIN_DEATH, [seedLo, seedHi, deathLo, deathHi]), draws: 0 };
}

/**
 * A named sub-stream, fresh at draw 0.
 *
 * Reads `parent.seed` and NEVER `parent.draws` — that omission is the
 * fork-safety law, not an oversight. It means the Lots' stream is the same
 * stream whether you forked it before or after the Descent drew forty rooms, so
 * looking at one more door cannot move a die, and the whole tree of streams is
 * reproducible from the campaign seed alone.
 *
 * The child is an ordinary `RngState`: plain JSON, saved wherever its owner
 * keeps state. Re-forking by name gives the stream back at draw 0 — a caller
 * that wants to keep its position must keep the state, exactly as with the
 * root.
 *
 * Names are hashed to 32 bits, so two names could in principle collide. With
 * the handful of names an engine uses this is not a risk worth carrying
 * machinery for; it is worth knowing about before someone forks per room id.
 */
export function fork(parent: RngState, name: string): RngState {
  return { seed: forkSeed(parent.seed, name), draws: 0 };
}

// ─────────────────────────────────────────────────────────────────── drawing ──

/** One raw 32-bit word, 0 … 2^32-1. Every other draw is built on this one. */
export function next(rng: RngState): Draw<number> {
  return [wordAt(rng.seed, rng.draws), { seed: rng.seed, draws: rng.draws + 1 }];
}

/**
 * A number in [0, 1), with 32 bits of resolution. Never reaches 1.
 *
 * For anything that must land on a whole number use `nextInt` instead: scaling
 * a float and flooring it reintroduces exactly the bias `nextInt` is written to
 * avoid.
 */
export function nextFloat(rng: RngState): Draw<number> {
  const [word, after] = next(rng);
  return [word / TWO32, after];
}

/**
 * The full 64-bit product of two 32-bit values, as [high 32, low 32].
 *
 * Split into 16-bit limbs because `u * bound` can exceed 2^53 and doubles would
 * round it — a rounded product is a silently unfair die.
 */
function wideProduct(u: number, bound: number): readonly [number, number] {
  const uHi = Math.floor(u / 65536);
  const uLo = u % 65536;
  const bHi = Math.floor(bound / 65536);
  const bLo = bound % 65536;
  const mid = uHi * bLo + uLo * bHi;
  const low = uLo * bLo + (mid % 65536) * 65536;
  return [uHi * bHi + Math.floor(mid / 65536) + Math.floor(low / TWO32), low % TWO32];
}

function requireBound(bound: number): void {
  if (!Number.isInteger(bound) || bound < 1 || bound > TWO32) {
    throw new RangeError(`rng: bound must be a whole number in [1, 2^32], got ${bound}`);
  }
}

/**
 * A whole number in [0, bound), uniform — NO MODULO BIAS.
 *
 * `word % bound` is wrong whenever `bound` does not divide 2^32: the first
 * `2^32 mod bound` values come up once more often than the rest. At bound 6
 * that is a d6 that leans low by about a part in a billion, which sounds
 * harmless right up until DESIGN §the lots makes the lean a declared, inspected
 * property of a die and the fairness laws start doing arithmetic on it. A
 * generator that is quietly unfair makes every one of those numbers a lie.
 *
 * So: Lemire's multiply-shift with rejection. Multiply the word by `bound` as a
 * 64-bit product and take the high half — that is a scaling, not a wrap, so it
 * has no preferred residue. The low half says which slice of the word's range
 * we landed in; the first `2^32 mod bound` of those slices are the short ones
 * that would cause the bias, and words landing there are thrown away and
 * redrawn. Rejections cost a word each and are part of the fixed draw order:
 * they are deterministic, so a replay rejects in exactly the same places.
 *
 * Throws RangeError on a bound outside [1, 2^32]. That is a caller bug, not
 * player data — `load` is the function that must never throw, and a silent
 * clamp here would hide a broken die behind a plausible number.
 */
export function nextInt(rng: RngState, bound: number): Draw<number> {
  requireBound(bound);
  // 2^32 mod bound — the size of the biased tail, and the only reason any word
  // is ever rejected. Zero when bound divides 2^32, so powers of two never
  // reject at all.
  const shortSlices = (TWO32 - bound) % bound;
  let stream = rng;
  for (;;) {
    const [word, after] = next(stream);
    stream = after;
    const [high, low] = wideProduct(word, bound);
    if (low >= shortSlices) return [high, stream];
  }
}

/**
 * One die: a face in [1, faces]. The Lots' primitive.
 *
 * Fair by construction — every face is equally likely, always. A loaded bone is
 * not a bent die here; it is a declared lean applied by the manifest on top of
 * a fair draw, because "all six faces always possible" is design law
 * (DESIGN §the lots) and leans are content, not engine.
 */
export function roll(rng: RngState, faces: number): Draw<number> {
  const [index, after] = nextInt(rng, faces);
  return [index + 1, after];
}

/**
 * One item out of a pool, uniformly. The Descent's primitive: a room, a door.
 *
 * Throws RangeError on an empty pool. An exhausted pool is a content decision —
 * what happens when a depth runs out of rooms is authored, not random — so it
 * must be answered before the draw rather than papered over with a null.
 */
export function pick<T>(rng: RngState, pool: readonly T[]): Draw<T> {
  if (pool.length === 0) throw new RangeError("rng: cannot pick from an empty pool");
  const [index, after] = nextInt(rng, pool.length);
  // In range by construction; `noUncheckedIndexedAccess` cannot see that.
  return [pool[index] as T, after];
}

/**
 * A shuffled copy. The input is never touched.
 *
 * Fisher-Yates, walking DOWN from the last index — the direction is part of the
 * fixed draw order, so reversing it changes every seed's labyrinth.
 */
export function shuffle<T>(rng: RngState, items: readonly T[]): Draw<readonly T[]> {
  const out = [...items];
  let stream = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const [j, after] = nextInt(stream, i + 1);
    stream = after;
    // Both indices are in range by construction (0 <= j <= i < out.length).
    const held = out[i] as T;
    out[i] = out[j] as T;
    out[j] = held;
  }
  return [out, stream];
}
