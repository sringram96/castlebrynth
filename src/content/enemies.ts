/**
 * Every enemy in the slice.
 *
 * An enemy is **an army, a tie rule, art, and a reward table**. It has no
 * health, no damage numbers and no attack script, because there is nothing for
 * those to describe: what an enemy does is throw bones at you, and what it
 * costs you is the bones of yours that lose.
 *
 * The rules budget is deliberate and it is smaller than it used to be. The
 * first enemy teaches the base war. The second teaches reserves and a better
 * profile. The boss combines them and introduces exactly one new sentence —
 * *ties hold* — which is visible in its brief before the player commits.
 *
 * Art is a requirement, not a fallback: an enemy with no `art` file on disk
 * fails `test/unit/assets.test.ts`. An invisible opponent is not a plainer
 * fight, it is an absent one.
 */

import type { BoneProfileId } from './bones.js'
import type { ThreatBand } from './roomTypes.js'
import type { EnemyBoneInstance, TieRule } from '../game/state.js'
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
 * **This is staging, not a deadline.** It used to be gameplay: an enemy that
 * reached you killed you outright, and the reach was a hidden turn count. That
 * rule is gone. What remains is the authored fact that the Gnawing is drawn
 * three ways, and that showing them in order across the rounds of a fight is
 * how the encounter escalates on screen. Contact costs nothing. The threat is
 * the army it throws.
 */
export type Stage = 'far' | 'mid' | 'close'

export const STAGES: readonly Stage[] = ['far', 'mid', 'close']

/**
 * One kind of bone in an army, and how many of them there are.
 *
 * `priority` is the authored fielding order — lower fields first — and it is
 * also the stable tie-break when two of the enemy's bones roll the same value.
 * Writing it down is what keeps "best first" from becoming an AI.
 */
export interface EnemyBoneSpec {
  readonly profile: BoneProfileId
  readonly count: number
  readonly priority: number
}

export interface Enemy {
  readonly id: string
  readonly name: string
  /** Its bones, in the order it puts them forward. */
  readonly army: readonly EnemyBoneSpec[]
  /** What an equal lane does. One flag, and only the boss changes it. */
  readonly tieRule: TieRule
  /**
   * What the picture it stands in has to be able to do.
   *
   * The art's veto over generation, from the other side: a room declares the
   * kinds of encounter its composition can hold, an enemy declares the kind it
   * is, and `canHost` in `content/roomResolver.ts` is the one place the two
   * meet. Three words for three encounters — this is a compatibility key, not
   * a taxonomy, and it should stay one.
   *
   * It is about **composition**, not combat: where a thing stands in a drawing
   * has nothing to do with how many bones it throws, which is why the War of
   * Bones left it untouched.
   */
  readonly encounterTags: readonly string[]
  /**
   * How heavy a fight this is, as one of three words.
   *
   * What a plan asks for, and it survived the combat overhaul unchanged
   * because it never described hit points: it is an **ordinal weight**, and
   * the director's business is only *which weight of thing belongs at this
   * point in the descent*. The numbers are the enemy's own, and they are the
   * army above rather than a health total — `low` is five common bones,
   * `medium` is nine with two Wrong at the front, `keeper` is eight with a
   * Heavy, a Cruel and a tie rule that reverses.
   */
  readonly threat: ThreatBand
  /** The one sentence the player sees on first sight. */
  readonly tell: string
  /**
   * The encounter's own rule, when it has one worth printing.
   *
   * Shown in the fight's brief, before FIELD, because a rule the player only
   * learns by losing a bone to it is not a rule, it is a trick.
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
 * The Gnawing: the base war, and nothing else.
 *
 * Five common bones. Every round it fields all of them until casualties reduce
 * it, so the first fight is a clean reading of the one rule — line them up,
 * high kills low, ties kill both — with no profile the player has not seen and
 * no exception to remember.
 */
const GNAWING: Enemy = {
  id: 'gnawing',
  name: 'The Gnawing',
  army: [{ profile: 'common', count: 5, priority: 0 }],
  tieRule: 'mutual',
  encounterTags: ['closing-horror'],
  threat: 'low',
  tell: 'Too many eyes. All of them found me. It is a long hall, and it has started down it.',
  art: 'gnawing',
  // Its still pose is where it stands before the fight opens: far away.
  width: MAW.far.width,
  foot: MAW.far.foot,
  staging: MAW,
  stageEvery: 1,
  rewards: ['vial', 'charm', 'cinderbone', 'knuckle'],
  rewardChance: 0.6,
  rewardChoices: 2,
}

/**
 * The Marrow: reserves, and a profile that beats a common bone outright.
 *
 * Nine bones against a line six wide, so three of them are always waiting.
 * Killing what is in front of you does not empty the army; it promotes what is
 * behind it. And the two Wrong bones field first while they live, which is the
 * encounter's real lesson: the top of its line is not a common bone, so the
 * top of yours had better not be either.
 */
const MARROW: Enemy = {
  id: 'marrow',
  name: 'The Marrow',
  army: [
    { profile: 'wrong', count: 2, priority: 0 },
    { profile: 'common', count: 7, priority: 1 },
  ],
  tieRule: 'mutual',
  encounterTags: ['standing-horror'],
  threat: 'medium',
  tell: 'The bones of it are somebody. Several somebodies.',
  rule: 'Two of its bones are wrong. It has more than it can field.',
  art: 'marrow',
  width: 0.62,
  foot: 0.94,
  // The optional route, so it pays better than the mandatory first fight.
  rewards: ['vial', 'charm', 'cinderbone', 'knuckle'],
  rewardChance: 0.7,
  rewardChoices: 2,
  drop: 'vial',
}

/**
 * The Warden: the exam.
 *
 * Everything already taught, plus one sentence. Stronger profiles at the top
 * of its line, two bones in reserve behind a six-wide line, and the tie rule
 * reversed — an equal lane takes your bone and leaves its own standing. That
 * last one is printed in the fight's brief, because a boss rule the player
 * discovers by losing to it is not a boss rule.
 *
 * It pays nothing. It is standing at the way out, and the open door is the
 * reward.
 */
const WARDEN: Enemy = {
  id: 'warden',
  name: 'The Warden',
  army: [
    { profile: 'heavy', count: 1, priority: 0 },
    { profile: 'cruel', count: 1, priority: 1 },
    { profile: 'common', count: 6, priority: 2 },
  ],
  tieRule: 'warden-holds',
  encounterTags: ['duel-stander'],
  threat: 'keeper',
  tell: 'It was waiting at this door. It has been waiting a long time.',
  rule: 'THE WARDEN HOLDS TIES. An equal lane breaks my bone and not its own.',
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
 * An enemy's army, as individual bones.
 *
 * Materialised once, when the fight opens, and then carried in `CombatState`:
 * casualties are removed from that array and never come back, so a fight's
 * army is a fact about the fight rather than a recomputation of the content.
 * Ids are stable and readable — `marrow:wrong:1` — so a test can name one.
 */
export function armyOf(id: string): readonly EnemyBoneInstance[] {
  const out: EnemyBoneInstance[] = []
  for (const spec of enemy(id).army) {
    for (let n = 0; n < spec.count; n++) {
      out.push({
        boneId: `${id}:${spec.profile}:${n}`,
        profile: spec.profile,
        priority: spec.priority,
      })
    }
  }
  return out
}

/** How many bones an enemy stands up with. Its whole army, in one number. */
export function armySize(id: string): number {
  return enemy(id).army.reduce((total, spec) => total + spec.count, 0)
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
