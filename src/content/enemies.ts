/**
 * Every enemy in the slice.
 *
 * An enemy is **a number of hits it can take, a number of bones it breaks,
 * art, and a reward table**. It rolls nothing. It has no dice, no army and no
 * attack script: what it does when it survives your attack is take a fixed
 * number of bones out of your pile, and the player is told that number before
 * they commit to anything.
 *
 * That explicitness is the whole tactical contract of the new combat: *I know
 * exactly how many bones this thing will break if it survives.* Hiding it
 * behind an intent icon or a die of its own would buy uncertainty the dice
 * already supply.
 *
 * The rules budget is deliberate and it is small. Three enemies, three paces —
 * a short fight, a longer one, and an exam — so the hand mechanic can be
 * played against differently shaped health totals before any modifier exists.
 *
 * Art is a requirement, not a fallback: an enemy with no `art` file on disk
 * fails `test/unit/assets.test.ts`. An invisible opponent is not a plainer
 * fight, it is an absent one.
 */

import type { ThreatBand } from './roomTypes.js'
import type { RewardId } from './rewards.js'

/**
 * Where the sprite sits in one authored composition.
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
 * How near a thing is standing, as the three pictures there are of it.
 *
 * **This is staging, not a deadline.** Contact costs the player nothing and
 * grants the enemy nothing; what it does is escalate the encounter on screen
 * as the fight lasts. It is derived from `combat.round` and stored nowhere.
 */
export type Stage = 'far' | 'mid' | 'close'

export const STAGES: readonly Stage[] = ['far', 'mid', 'close']

export interface Enemy {
  readonly id: string
  readonly name: string
  /**
   * How much damage it can take before it stops.
   *
   * An explicit number, and deliberately so. The player's life is still a pile
   * of physical objects; the *enemy's* is a total, because the thing the new
   * combat asks of a player is how hard they can hit and how many attacks that
   * will take. See `docs/COMBAT.md`.
   */
  readonly maxHp: number
  /** Bones it breaks, every time it survives an attack. No RNG anywhere. */
  readonly damage: number
  /**
   * What the picture it stands in has to be able to do.
   *
   * The art's veto over generation, from the other side: a room declares the
   * kinds of encounter its composition can hold, an enemy declares the kind it
   * is, and `canHost` in `content/roomResolver.ts` is the one place the two
   * meet. Three words for three encounters — this is a compatibility key, not
   * a taxonomy, and it should stay one.
   */
  readonly encounterTags: readonly string[]
  /**
   * How heavy a fight this is, as one of three words.
   *
   * What a plan asks for. An **ordinal weight**, and the director's business
   * is only *which weight of thing belongs at this point in the descent* — the
   * numbers behind it are `maxHp` and `damage` above.
   */
  readonly threat: ThreatBand
  /** The one sentence the player sees on first sight. */
  readonly tell: string
  /**
   * The encounter's own rule, when it has one worth printing.
   *
   * Shown in the fight's brief, before the first ROLL, because a rule the
   * player only learns by losing a bone to it is not a rule, it is a trick.
   */
  readonly rule?: string
  readonly art: string
  /** Fraction of the world's width the sprite occupies. */
  readonly width: number
  /** Where its feet sit, as a fraction of world height. */
  readonly foot: number
  /** One composition per stage, for a thing painted three ways. */
  readonly staging?: Readonly<Record<Stage, Stance>>
  /** How many rounds it holds each stage before the next drawing. */
  readonly stageEvery?: number
  /** What it can drop: ids drawn from the reward pool. */
  readonly rewards: readonly RewardId[]
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
  /**
   * Granted on every win, outside the ordinary draw.
   *
   * Deterministic and once-only. A fight that rolls no offer still pays this,
   * which is what makes the Marrow worth the detour whatever the dice do.
   */
  readonly drop?: RewardId
}

/**
 * The stages of the maw, measured against the hall it is crawling down.
 *
 * Three authored compositions rather than a slide: at `far` it is a shape at
 * the end of the corridor, at `mid` it is unmistakably nearer, and at `close`
 * it is wider than the frame and its jaw is on the floor in front of you.
 * Nothing interpolates between them — see `docs/ART_DIRECTION.md`.
 */
const MAW: Readonly<Record<Stage, Stance>> = {
  // A shape at the end of the corridor: readable, and plainly not near you.
  far: { width: 0.3, foot: 0.6 },
  // Half the hall gone. Roughly four times the area, which is what makes the
  // second one land — the step has to be too big to be a trick of the light.
  mid: { width: 0.62, foot: 0.82 },
  // Wider than the frame, jaw on the floor, no corridor left behind it.
  close: { width: 1.24, foot: 1.02 },
}

/**
 * The Gnawing: the short fight, and the one the dice game is learned on.
 *
 * Seventy damage and three bones a round. A healthy player rolling six dice is
 * doing thirty to sixty an attack, so this is two or three attacks long — long
 * enough to spend a couple of named hands, short enough that spending the
 * wrong one is not fatal.
 */
const GNAWING: Enemy = {
  id: 'gnawing',
  name: 'The Gnawing',
  maxHp: 70,
  damage: 3,
  encounterTags: ['closing-horror'],
  threat: 'low',
  tell: 'Too many eyes. All of them found me. It is a long hall, and it has started down it.',
  art: 'gnawing',
  // Its still pose is where it stands before the fight opens: far away.
  width: MAW.far.width,
  foot: MAW.far.foot,
  staging: MAW,
  stageEvery: 1,
  rewards: ['vial'],
  rewardChance: 0.6,
  rewardChoices: 1,
}

/**
 * The Marrow: the long one.
 *
 * A hundred and twenty, and five bones a round. It outlasts the good hands: a
 * player who spends Full House and Four early has Pair and Two Pair left for
 * the tail of it, and the tail is where the pile starts to thin.
 */
const MARROW: Enemy = {
  id: 'marrow',
  name: 'The Marrow',
  maxHp: 120,
  damage: 5,
  encounterTags: ['standing-horror'],
  threat: 'medium',
  tell: 'The bones of it are somebody. Several somebodies.',
  rule: 'It takes a long time to stop. Five of mine, every time it does not.',
  art: 'marrow',
  width: 0.62,
  foot: 0.94,
  // The optional route, so it pays better than the mandatory first fight.
  rewards: ['vial'],
  rewardChance: 0.7,
  rewardChoices: 1,
  drop: 'vial',
}

/**
 * The Warden: the exam.
 *
 * A hundred and eighty, and eight bones a round — which is where the
 * hand-width rule bites hardest. Two bad exchanges take a healthy player under
 * six bones, and under six bones the good shapes stop being reachable at all.
 *
 * It pays nothing. It is standing at the way out, and the open door is the
 * reward.
 */
const WARDEN: Enemy = {
  id: 'warden',
  name: 'The Warden',
  maxHp: 180,
  damage: 8,
  encounterTags: ['duel-stander'],
  threat: 'keeper',
  tell: 'It was waiting at this door. It has been waiting a long time.',
  rule: 'IT BREAKS EIGHT. Every attack that does not finish it costs me eight bones.',
  art: 'warden',
  // The whole frame, because every one of its ten plates *is* the whole frame.
  // A scene-registered family carries its own position in the drawing — where
  // the skeleton stands inside its 480x720 canvas is the staging — so the only
  // honest stance for it is the one that says "all of it, where it was
  // painted". The compositor cover-fits it exactly as it cover-fits the
  // backdrop; see `isScenePlate`.
  width: 1,
  foot: 1,
  rewards: [],
  rewardChance: 0,
  rewardChoices: 0,
}

export const ENEMIES: Readonly<Record<string, Enemy>> = {
  gnawing: GNAWING,
  marrow: MARROW,
  warden: WARDEN,
}

/** Every authored encounter, in declaration order. The resolver's whole world. */
export const ENEMY_LIST: readonly Enemy[] = Object.values(ENEMIES)

export function enemy(id: string): Enemy {
  const found = ENEMIES[id]
  if (!found) throw new Error(`no such enemy: ${id}`)
  return found
}

/**
 * Which drawing of a thing that is painted three ways belongs to a round.
 *
 * Round 1 is `far`, round 2 is `mid`, round 3 and everything after is `close`.
 * It is derived from `combat.round` and stored nowhere, which is why a reload
 * on round three paints the near composition without a frame index in the
 * save. An enemy with no staging gets nothing and stands as it always did.
 */
export function stageForRound(id: string, round: number): Stage | undefined {
  const e = enemy(id)
  if (!e.staging) return undefined
  const every = e.stageEvery ?? 1
  const step = Math.floor(Math.max(0, round - 1) / every)
  return STAGES[Math.min(step, STAGES.length - 1)]
}

/** Where an enemy's sprite sits at a stage. Its still pose when it has none. */
export function stanceAt(id: string, stage: Stage | undefined): Stance {
  const e = enemy(id)
  if (!stage || !e.staging) return { width: e.width, foot: e.foot }
  return e.staging[stage]
}
