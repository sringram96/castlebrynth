/**
 * Every enemy in the slice.
 *
 * An enemy is HP, an attack script, at most one special rule, art, and a
 * reward table. The script is a fixed cycle rather than a random draw, so the
 * intent shown at the top of a turn is always the truth and a player who reads
 * it is always rewarded for reading it.
 *
 * The rules budget is deliberate. The first enemy teaches one thing: make a
 * combination and hit it. The second teaches the telegraph. The boss combines
 * the two and introduces nothing.
 *
 * Art is a requirement, not a fallback: an enemy with no `art` file on disk
 * fails `test/unit/assets.test.ts`. An invisible opponent is not a plainer
 * fight, it is an absent one.
 */

export interface Intent {
  /** Two words or fewer, and it is a verb. */
  readonly verb: string
  readonly damage: number
  /**
   * A telegraph announces itself one turn early and hits harder. It is the
   * only enemy special in the slice, and exactly one enemy has it before the
   * boss does.
   */
  readonly telegraph?: boolean
  /** Shown when the intent is tapped. Plain language. */
  readonly explain: string
}

export interface Enemy {
  readonly id: string
  readonly name: string
  readonly hp: number
  /** The cycle. Turn N takes `script[N % script.length]`. */
  readonly script: readonly Intent[]
  /** The one sentence the player sees on first sight. */
  readonly tell: string
  readonly art: string
  /** Fraction of the world's width the sprite occupies. */
  readonly width: number
  /** Where its feet sit, as a fraction of world height. */
  readonly foot: number
  /** What it can drop: ids drawn from dice and relics. */
  readonly rewards: readonly string[]
}

const GNAWING: Enemy = {
  id: 'gnawing',
  name: 'The Gnawing',
  hp: 170,
  // No special rule. Every blow is the same size and it never surprises you.
  script: [
    { verb: 'BITE', damage: 6, explain: 'It bites. 6 damage. It does nothing else, ever.' },
  ],
  tell: 'It has too many eyes and all of them found me.',
  art: 'gnawing',
  width: 0.72,
  foot: 0.82,
  rewards: ['knuckle', 'wax', 'careful', 'plate', 'leech'],
}

const MARROW: Enemy = {
  id: 'marrow',
  name: 'The Marrow',
  hp: 210,
  // Teaches one thing: when a blow is announced a turn early, it is worse.
  script: [
    { verb: 'RAKE', damage: 6, explain: 'It rakes. 6 damage.' },
    { verb: 'RAKE', damage: 6, explain: 'It rakes. 6 damage.' },
    {
      verb: 'WIND UP',
      damage: 0,
      telegraph: true,
      explain: 'It is drawing back. No damage this turn. The next one is 15.',
    },
    { verb: 'CRUSH', damage: 15, explain: 'The blow it wound up for. 15 damage.' },
  ],
  tell: 'The bones of it are somebody. Several somebodies.',
  art: 'marrow',
  width: 0.62,
  foot: 0.94,
  rewards: ['rosary', 'nail', 'thimble', 'pusher', 'runner'],
}

const WARDEN: Enemy = {
  id: 'warden',
  name: 'The Warden',
  hp: 300,
  // Both taught ideas, and no third. A heavier floor and the same telegraph.
  script: [
    { verb: 'STRIKE', damage: 8, explain: 'It strikes. 8 damage.' },
    { verb: 'STRIKE', damage: 8, explain: 'It strikes. 8 damage.' },
    {
      verb: 'RAISE',
      damage: 0,
      telegraph: true,
      explain: 'It is raising its arms. No damage this turn. The next one is 20.',
    },
    { verb: 'JUDGE', damage: 20, explain: 'The blow it raised for. 20 damage.' },
  ],
  tell: 'It was waiting at this door. It has been waiting a long time.',
  art: 'warden',
  width: 0.86,
  foot: 0.99,
  rewards: [],
}

export const ENEMIES: Readonly<Record<string, Enemy>> = {
  gnawing: GNAWING,
  marrow: MARROW,
  warden: WARDEN,
}

export function enemy(id: string): Enemy {
  const found = ENEMIES[id]
  if (!found) throw new Error(`no such enemy: ${id}`)
  return found
}

/** The intent an enemy declares on a given turn. Turns are 0-based. */
export function intentAt(id: string, turn: number): Intent {
  const script = enemy(id).script
  return script[turn % script.length]!
}
