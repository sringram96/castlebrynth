/**
 * The run's randomness, and where each draw sits in it.
 *
 * A run is a seed plus its history. Every number the game draws is derived
 * from those two things and nothing else, so a fight replays identically after
 * a reload and the balance simulation and the runtime are the same game rather
 * than two models of it.
 *
 * This used to live in `combat/dice.ts`, which was the wrong home the moment
 * randomness stopped being a dice-specific concern. The font draws here, the
 * reliquary draws here, and both throws of a round draw here.
 *
 * ## Channels
 *
 * Every random event names a channel. That separation is the invariant: adding
 * a draw — a new room, a cosmetic decision that later turns out to want one —
 * cannot perturb a result somewhere else, because the two are not standing in
 * the same stream. Once shipped the constants are save/replay contract.
 */

/**
 * A small deterministic generator.
 *
 * mulberry32: one 32-bit word of state, good enough for bones.
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

  /** The generator's own state. Nothing saves it; tests read it. */
  get cursor(): number {
    return this.state
  }
}

/**
 * Which stream a draw belongs to.
 *
 * The exact numbers are not magical. What matters is that no two of them
 * collide for the same run position, so a Charm spent on round three cannot
 * change what the enemy throws on round four.
 */
export const RNG_CHANNEL = {
  enemyThrow: 11,
  playerThrow: 23,
  charm: 37,
  reward: 53,
} as const

export type RngChannel = (typeof RNG_CHANNEL)[keyof typeof RNG_CHANNEL]

/** The two constants that keep the one-press rooms clear of a fight's rounds. */
export const RITUAL_CHANNEL = 977
export const RELIQUARY_CHANNEL = 613

/**
 * Where a fight's draw sits: how far into the run, which round, which channel.
 *
 * Derived rather than stored, so a save can never disagree with it. A reload
 * at `fielded` and a press of THROW produce the same player line; a reload at
 * `rolled` rolls nothing at all, because the line is already in the save.
 */
export function combatSalt(pathLength: number, round: number, channel: number): number {
  return pathLength * 1013 + round * 97 + channel
}

/** A generator positioned at a salt, off the run's seed. */
export function rngAt(seed: number, salt: number): Rng {
  return new Rng((seed + salt * 0x9e3779b1) >>> 0)
}
