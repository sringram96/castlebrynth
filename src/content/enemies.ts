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
  /**
   * Shown when the intent is tapped.
   *
   * It names the verb, the number, and the order — *after you score, unless you
   * kill it first* — because the order is the whole of the first fight's
   * lesson and nothing else on the screen teaches it. A telegraph says what its
   * next attack is and for how much. No status vocabulary, ever.
   */
  readonly explain: string
}

/**
 * How far away a thing that closes the distance is standing.
 *
 * Three stable compositions and nothing between them. There is no fourth, and
 * there is no half-step: an enemy is at one of these or the fight is over.
 */
export type Reach = 'far' | 'mid' | 'close'

/** The order it closes them in. `close` is the last one before contact. */
export const REACHES: readonly Reach[] = ['far', 'mid', 'close']

/**
 * Where the sprite sits at one reach.
 *
 * The same numbers as a still pose, plus `at` — because a thing crawling down
 * a corridor is not politely centred in it, and a pose painted six inches
 * left of the middle has to appear six inches left of the middle. All three
 * are read off the art by `npm run art`; none of them is set by hand.
 */
export interface Stance {
  /** Fraction of the world's width the sprite occupies. */
  readonly width: number
  /** Where its feet sit, as a fraction of world height. */
  readonly foot: number
  /** Its horizontal centre, as a fraction of world width. Middle by default. */
  readonly at?: number
}

/**
 * An enemy that comes for you instead of standing and trading blows.
 *
 * The whole rule is one sentence: **every score it survives brings it one
 * reach nearer, and there is nothing past `close`.** So the fight is a count
 * the player can read off the picture — three attacks, then it is on you —
 * and the number is never printed anywhere, because the thing getting bigger
 * is the number.
 *
 * It is a per-enemy content rule, not a combat mode. An enemy without this
 * field fights exactly as it always did.
 */
export interface Approach {
  /** One stance per reach. Its still pose must be the `far` one. */
  readonly stances: Readonly<Record<Reach, Stance>>
  /**
   * How many scores it survives at each reach before it takes the next step.
   *
   * The hall is long and it is dragging itself down it, so a stretch takes
   * more than one turn to cover. This is what sets the deadline: the player
   * gets `every × 3` attacks, and the last of them had better kill it.
   *
   * It is not the same lever as health. Health decides how long the fight
   * *is*; this decides how long the fight *may be* before the thing arrives.
   * Raising one without the other either makes the deadline irrelevant or
   * makes it the only thing that matters.
   */
  readonly every: number
  /** The beat when it arrives. Said once, and it is the last thing said. */
  readonly says: string
  /** Why the run ended, for the death screen. */
  readonly cause: string
}

export interface Enemy {
  readonly id: string
  readonly name: string
  readonly hp: number
  /**
   * The cycle. Turn N takes `script[N % script.length]`.
   *
   * An approaching enemy declares one intent per turn of the whole walk —
   * `every × 3` of them — because the two turns it spends at a reach are not
   * the same turn. One of them ends with it still where it was and the other
   * ends with it nearer, and an intent that cannot tell the player which is
   * which is a lie on the turn that matters most.
   */
  readonly script: readonly Intent[]
  /** The one sentence the player sees on first sight. */
  readonly tell: string
  readonly art: string
  /** Fraction of the world's width the sprite occupies. */
  readonly width: number
  /** Where its feet sit, as a fraction of world height. */
  readonly foot: number
  /** Set when the thing closes the distance rather than standing in it. */
  readonly approach?: Approach
  /** What it can drop: ids drawn from dice and relics. */
  readonly rewards: readonly string[]
  /**
   * The chance a win drops anything at all, and how many to offer when it
   * does.
   *
   * Not every fight pays. A run that is handed something after every beat
   * teaches the player that finds are routine, and a routine find is not a
   * reward — it is a step. These are content, not a hidden table, so the
   * cadence of the whole slice can be read in one place.
   */
  readonly rewardChance: number
  readonly rewardChoices: number
}

const RAKE = 'RAKE will deal 6 damage after you score, unless you kill it first.'
const STRIKE = 'STRIKE will deal 8 damage after you score, unless you kill it first.'

/**
 * The stances of the maw, measured against the hall it is crawling down.
 *
 * Three authored compositions rather than a slide: at `far` it is a shape at
 * the end of the corridor, at `mid` it is unmistakably nearer, and at `close`
 * it is wider than the frame and its jaw is on the floor in front of you.
 * Nothing interpolates between them — see `docs/ART_DIRECTION.md`.
 */
const MAW: Approach = {
  stances: {
    // A shape at the end of the corridor: readable, and plainly not near you.
    far: { width: 0.3, foot: 0.6 },
    // Half the hall gone. Roughly four times the area, which is what makes the
    // second one land — the step has to be too big to be a trick of the light.
    mid: { width: 0.62, foot: 0.82 },
    // Wider than the frame, jaw on the floor, no corridor left behind it.
    close: { width: 1.24, foot: 1.02 },
  },
  // Two scores per stretch of hall. Six attacks, and the sixth had better
  // finish it.
  every: 2,
  says: 'It has me.',
  cause: 'The Gnawing — it got close enough.',
}

const GNAWING: Enemy = {
  id: 'gnawing',
  name: 'The Gnawing',
  // Six attacks, and the sixth had better kill it. Tuned so that a player who
  // has not yet learned the ladder still wins this one — the fight teaches by
  // being frightening, not by being lost. See `npm run balance`.
  hp: 140,
  // No special rule and no blow. It cannot reach you from down the hall, so
  // every intent it declares is the same intent: it is getting closer. What
  // kills you is arriving, and the picture says how long that will take.
  //
  // Two intents per reach, and they are not interchangeable: the first ends
  // with it still where it was, the second ends with it nearer. The pair at
  // `close` is the whole encounter in two lines — one that says the next move
  // reaches you, and one that says this is the move.
  script: [
    {
      verb: 'CRAWL',
      damage: 0,
      explain: 'CRAWL drags it a little further down the hall after you score. It has most of the way still to come.',
    },
    {
      verb: 'CRAWL',
      damage: 0,
      explain: 'CRAWL puts it halfway down the hall after you score, unless you kill it first.',
    },
    {
      verb: 'CLOSE IN',
      damage: 0,
      explain: 'CLOSE IN drags it nearer again after you score. It is most of the way here.',
    },
    {
      verb: 'CLOSE IN',
      damage: 0,
      explain: 'CLOSE IN puts it within reach of me after you score, unless you kill it first.',
    },
    {
      verb: 'GATHER',
      damage: 0,
      explain: 'GATHER is it setting itself, and it does not move this turn. What it does next reaches me.',
    },
    {
      verb: 'REACH',
      damage: 0,
      explain: 'REACH kills me after you score. This is the last turn there is.',
    },
  ],
  tell: 'Too many eyes. All of them found me. It is a long hall, and it has started down it.',
  art: 'gnawing',
  // Its still pose is where it stands before the fight opens: far away.
  width: MAW.stances.far.width,
  foot: MAW.stances.far.foot,
  approach: MAW,
  rewards: ['knuckle', 'wax', 'careful', 'plate', 'leech'],
  rewardChance: 0.6,
  rewardChoices: 2,
}

const MARROW: Enemy = {
  id: 'marrow',
  name: 'The Marrow',
  hp: 210,
  // Teaches one thing: when a blow is announced a turn early, it is worse.
  script: [
    { verb: 'RAKE', damage: 6, explain: RAKE },
    { verb: 'RAKE', damage: 6, explain: RAKE },
    {
      verb: 'WIND UP',
      damage: 0,
      telegraph: true,
      explain: 'WIND UP deals no damage this turn. Its next attack is CRUSH for 15.',
    },
    {
      verb: 'CRUSH',
      damage: 15,
      explain: 'CRUSH deals 15 damage after you score, unless you kill it first.',
    },
  ],
  tell: 'The bones of it are somebody. Several somebodies.',
  art: 'marrow',
  width: 0.62,
  foot: 0.94,
  // The optional route, so it pays better than the mandatory first fight.
  rewards: ['rosary', 'nail', 'thimble', 'pusher', 'runner'],
  rewardChance: 0.7,
  rewardChoices: 2,
}

const WARDEN: Enemy = {
  id: 'warden',
  name: 'The Warden',
  hp: 300,
  // Both taught ideas, and no third. A heavier floor and the same telegraph.
  script: [
    { verb: 'STRIKE', damage: 8, explain: STRIKE },
    { verb: 'STRIKE', damage: 8, explain: STRIKE },
    {
      verb: 'RAISE',
      damage: 0,
      telegraph: true,
      explain: 'RAISE deals no damage this turn. Its next attack is JUDGE for 20.',
    },
    {
      verb: 'JUDGE',
      damage: 20,
      explain: 'JUDGE deals 20 damage after you score, unless you kill it first.',
    },
  ],
  tell: 'It was waiting at this door. It has been waiting a long time.',
  art: 'warden',
  width: 0.86,
  foot: 0.99,
  // The boss stands at the way out. Escape is the reward.
  rewards: [],
  rewardChance: 0,
  rewardChoices: 0,
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

/**
 * Where it stands after surviving `turns` scores, or nothing because it has
 * run out of hall and is standing on you.
 *
 * `undefined` is the whole of the contact rule. The caller in
 * `combat/resolve.ts` is the only place that reads it, and it is the only
 * place that may decide what that means.
 *
 * A pure function of the turn count and the content, so the reach recorded in
 * state and the number of turns that produced it can never disagree — which
 * is what lets a fixture stand a fight at a reach without inventing a
 * position the game could not have reached.
 */
export function reachAfter(id: string, turns: number): Reach | undefined {
  const ladder = enemy(id).approach
  if (!ladder) return undefined
  return REACHES[Math.floor(turns / ladder.every)]
}

/** The turn an enemy first stands at a reach. Its whole walk, in one line. */
export function turnAt(id: string, reach: Reach): number {
  const ladder = enemy(id).approach
  return ladder ? REACHES.indexOf(reach) * ladder.every : 0
}

/** Where an enemy's sprite sits at a reach. Its still pose when it has none. */
export function stanceAt(id: string, reach: Reach | undefined): Stance {
  const e = enemy(id)
  if (!reach || !e.approach) return { width: e.width, foot: e.foot }
  return e.approach.stances[reach]
}
