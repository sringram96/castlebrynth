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
 * collide for the same run position, so what the player throws on round three
 * cannot change what the enemy throws on round four.
 */
export const RNG_CHANNEL = {
  /** The player's core dice. ROLL and REROLL. */
  playerRoll: 23,
  /** The iron die, thrown once a turn alongside the six, on ROLL only. */
  ironRoll: 31,
  /** The item dice, fired automatically at the item beat of an Attack. */
  itemRoll: 41,
  reward: 53,
} as const

export type RngChannel = (typeof RNG_CHANNEL)[keyof typeof RNG_CHANNEL]

/** The two constants that keep the one-press rooms clear of a fight's rounds. */
export const RITUAL_CHANNEL = 977
export const RELIQUARY_CHANNEL = 613

/**
 * Where in the run a draw sits — **which room**, not how far you walked.
 *
 * Every salt below used to key on `run.path.length`, which was an honest
 * position only while the descent was a line: two routes of different lengths
 * arriving at the same room would draw different things out of the same chest.
 * The map is a DAG now and both branches meet again at the confluence, so the
 * position has to be the node's own identity.
 *
 * A cheap FNV-ish string hash. It is not cryptography and does not need to be:
 * what it has to do is give every node id in a ten-node map a stable number of
 * its own, so a draw is a function of *this room* and the run's seed and
 * nothing else. It is save/replay contract once shipped.
 */
export function nodeSalt(nodeId: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < nodeId.length; i++) {
    h ^= nodeId.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * Where a fight's draw sits: which room, which round, which roll of that
 * round, and which channel.
 *
 * The fourth term is what the three-roll attack needs. Under the old combat
 * each side rolled once a round, so *round plus channel* was an unambiguous
 * position; an attack now draws up to three times before it is scored, and two
 * of those draws sharing a salt would make a reroll reproduce the throw it was
 * rerolling.
 *
 * Derived rather than stored, so a save can never disagree with it. A reload
 * before ROLL and a press of ROLL produce the same dice; a reload with dice
 * already on the table rolls nothing at all, because they are in the save.
 * SCORE draws nothing, and neither does retaliation.
 */
export function combatSalt(
  nodeId: string,
  round: number,
  rollNumber: number,
  channel: number,
): number {
  return (nodeSalt(nodeId) + round * 97 + rollNumber * 17 + channel) >>> 0
}

/**
 * A generator positioned at a salt, off the run's seed.
 *
 * `Math.imul`, not `*`. The salts used to be small — a path length times a
 * thousand — and an ordinary multiply by the golden constant stayed inside the
 * 53 bits a double gives exactly. A salt keyed on a **hashed node id** is a
 * full 32-bit word, and 2³² × 2.6×10⁹ is not: the product loses its low bits,
 * `>>> 0` reads garbage off the top of it, and neighbouring seeds land on the
 * same generator state. That was measured — forty seeds in a row drawing the
 * same answer out of a 70% chance — and this is the fix.
 */
export function rngAt(seed: number, salt: number): Rng {
  return new Rng((seed + Math.imul(salt, 0x9e3779b1)) >>> 0)
}
