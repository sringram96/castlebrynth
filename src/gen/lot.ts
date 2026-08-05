/**
 * The seeded source of chance, and the arithmetic that hangs off it.
 *
 * art. 36 (amended): seed + choice history → the same run, always. Nothing
 * in the dealer may reach for a clock or a global counter; every decision it
 * makes is drawn from a lot derived from where the run stands, so replaying
 * the history replays the run exactly.
 */

import type { Seed } from '../state/index.js'

/** art. 36: one seed derives the whole arrangement, so resume is exact. */
export interface Lot {
  next(): number
}

/**
 * A seeded source of chance. The same seed yields the same sequence on any
 * machine, which is the whole of art. 36: resume is exact, and rerolling the
 * labyrinth costs a death.
 */
export function lotFrom(seed: Seed): Lot {
  let state = (seed as number) >>> 0
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

/** art. 32: every death reseeds, and the next seed follows from this one. */
export function reseed(seed: Seed): Seed {
  const lot = lotFrom(seed)
  return (Math.floor(lot.next() * 0x7fffffff) || 1) as unknown as Seed
}

/**
 * The lot a single decision is drawn from (art. 79).
 *
 * Every decision the dealer makes names itself — the step it is at and what
 * kind of decision it is — and folds that together with the seed and the
 * choices made so far. Two consequences, and both of them are law:
 *
 * - the road not taken is never computed, because computing it would mean
 *   asking a lot that this fold never produces (art. 79);
 * - the same seed with the same choices folds to the same number, however
 *   many times the shell re-deals between paints (art. 36).
 */
export function lotAt(
  seed: Seed,
  depth: number,
  taken: readonly number[],
  step: number,
  salt: number,
): Lot {
  let hash = 2166136261 >>> 0
  const mix = (n: number): void => {
    hash ^= n >>> 0
    hash = Math.imul(hash, 16777619) >>> 0
  }
  mix(seed as number)
  mix(depth * 2654435761)
  mix(step * 40503 + 1)
  mix(salt * 2246822519)
  // Only the choices that stand upstream of this decision (art. 79).
  for (let i = 0; i < step && i < taken.length; i++) mix((taken[i] ?? 0) + 7)
  return lotFrom((hash || 1) as unknown as Seed)
}

/** Which kind of decision a lot is for, so two of them never collide. */
export const SALT = {
  room: 1,
  doors: 2,
  tags: 3,
  fills: 4,
  key: 5,
  lock: 6,
} as const

/** A seeded shuffle. Fisher–Yates, so the same seed deals the same hand. */
export function shuffle<T>(items: readonly T[], lot: Lot): readonly T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(lot.next() * (i + 1))
    const a = out[i]!
    const b = out[j]!
    out[i] = b
    out[j] = a
  }
  return out
}

/**
 * Where one item was drawn from, against its weight, or -1 when everything
 * on offer is banned. A weight of zero is a ban rather than a discouragement.
 *
 * It answers with the index rather than the item deliberately. The pools a
 * depth deals from include the neutral pool, and the neutral pool is `null`
 * — an item-shaped answer cannot tell "drew the neutral pool" from "drew
 * nothing", and getting that wrong deals a room with no doors out of it.
 */
export function pickAt<T>(items: readonly T[], weightOf: (item: T) => number, lot: Lot): number {
  const weights = items.map((item) => Math.max(0, weightOf(item)))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) return -1
  let roll = lot.next() * total
  for (const [i, weight] of weights.entries()) {
    if (weight <= 0) continue
    roll -= weight
    if (roll < 0) return i
  }
  // Floating point can leave the roll a hair short of the last bucket.
  for (let i = weights.length - 1; i >= 0; i--) if ((weights[i] ?? 0) > 0) return i
  return -1
}

/**
 * One item, drawn against its weight. Only for item types that cannot
 * themselves be null; everything else asks `pickAt`. When everything on
 * offer is banned the caller gets null and decides what mercy to show — the
 * dealer never silently strands.
 */
export function pick<T>(items: readonly T[], weightOf: (item: T) => number, lot: Lot): T | null {
  const at = pickAt(items, weightOf, lot)
  return at < 0 ? null : (items[at] ?? null)
}

/** Draw n distinct items against their weights, or as many as there are. */
export function pickSome<T>(
  items: readonly T[],
  count: number,
  weightOf: (item: T) => number,
  lot: Lot,
): readonly T[] {
  const left = [...items]
  const out: T[] = []
  while (out.length < count && left.length > 0) {
    const at = pickAt(left, weightOf, lot)
    if (at < 0) break
    out.push(left[at] as T)
    left.splice(at, 1)
  }
  return out
}
