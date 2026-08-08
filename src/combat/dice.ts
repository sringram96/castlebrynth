/**
 * Rolling, holding and rerolling.
 *
 * One rule governs all of it: the number of dice on the table is
 * `run.dice.length` and nothing else may decide it. Rolling produces exactly
 * that many entries, holding never changes the count, and rerolling changes
 * faces and never the count.
 */

import { die } from '../content/dice.js'
import type { Face } from '../content/dice.js'
import type { RolledDie } from '../game/state.js'

/**
 * A small deterministic generator.
 *
 * Runs are seeded so a fight can be replayed exactly — which is what makes the
 * balance simulation and the runtime the same game rather than two models of
 * it. mulberry32: one 32-bit word of state, good enough for dice.
 */
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** 0..n-1 */
  int(n: number): number {
    return Math.floor(this.next() * n)
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('nothing to pick from')
    return items[this.int(items.length)]!
  }

  /** The generator's own state, so a run can be saved mid-fight. */
  get cursor(): number {
    return this.state
  }
}

function cast(slot: number, dieId: string, rng: Rng): RolledDie {
  const faces = die(dieId).faces
  const faceIndex = rng.int(faces.length)
  return { slot, dieId, faceIndex, value: faces[faceIndex]!.value }
}

/** Throw every die. The count is the hand's, always. */
export function roll(dice: readonly string[], rng: Rng): readonly RolledDie[] {
  return dice.map((dieId, slot) => cast(slot, dieId, rng))
}

/**
 * Throw everything not held.
 *
 * A held die comes back byte-identical — same slot, same die, same face — and
 * every unheld die is thrown exactly once. Both halves are tested.
 */
export function reroll(
  current: readonly RolledDie[],
  held: readonly number[],
  rng: Rng,
): readonly RolledDie[] {
  const keep = new Set(held)
  return current.map((d) => (keep.has(d.slot) ? d : cast(d.slot, d.dieId, rng)))
}

export function faceOf(d: RolledDie): Face {
  return die(d.dieId).faces[d.faceIndex]!
}

/** Toggle membership. This is the whole of holding, and the whole of undo. */
export function toggle(list: readonly number[], slot: number): readonly number[] {
  return list.includes(slot) ? list.filter((s) => s !== slot) : [...list, slot].sort((a, b) => a - b)
}
