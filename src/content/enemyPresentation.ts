/**
 * What a horror looks like on a beat the fight has already resolved.
 *
 * The whole of this file is a lookup from *something the reducer decided* to
 * *which authored plate shows it*. It computes no outcome, holds no clock and
 * has no opinion about when anything happens: `app/app.ts` owns the when, and
 * the reducer owns the what. Between them there has to be one table saying
 * which drawing belongs to which fact, and this is it — so that neither the
 * controller nor the view carries a threshold or an asset name of its own.
 *
 * Two facts get a picture here, and they are different kinds of fact:
 *
 *   - **how much of its army is left**, which is a settled property of the
 *     fight. It is recomputed from `enemyBones.length` on every paint and
 *     never stored, so a reload at four of eight shows the same plate as never
 *     having left.
 *   - **what the last smash did**, which is transient by nature: it is up for
 *     a couple of hundred milliseconds in the middle of a round and the
 *     settled picture is the army band again.
 *
 * Neither is in `GameState`, and neither may be. A band is arithmetic on a
 * number the save already holds; a pose is a frame of a transition. Putting
 * either in the save would be rendering deciding something, and would give a
 * reload an animation clock to recover.
 */

import type { SmashRecord } from '../game/state.js'

/**
 * How much of a horror's army is left, as the three pictures there are of it.
 *
 * Thirds, and no fourth. Two bands would make the change a single event a
 * player could miss; four would put two of them inside the same handful of
 * rounds and none of them would read. For an eight-bone Warden this gives
 * 8–6 full, 5–3 medium, 2–1 low — each of them several rounds long, so each is
 * on screen long enough to be a state rather than a flicker.
 */
export type ArmyBand = 'full' | 'medium' | 'low'

/** The two plates of one band's idle, in order. */
export type IdlePair = readonly [string, string]

export interface IdleLoop {
  readonly full: IdlePair
  readonly medium: IdlePair
  readonly low: IdlePair
  /** How long each plate is up, in milliseconds. */
  readonly frameMs: number
}

/** What a smash did, reduced to the thing a drawing can be chosen from. */
export interface SmashPoses {
  /** It kept a tie. Its own bone stands and yours does not. */
  readonly held?: string
  /** It broke bones of yours, and no tie was held. */
  readonly struck?: string
}

export interface EnemyPresentation {
  /**
   * The plates it stands in when nothing is happening to it.
   *
   * Optional, and most enemies have none: an enemy with no idle family is
   * simply still, exactly as it was before this file existed.
   */
  readonly idle?: IdleLoop
  /**
   * The plates for what a smash did.
   *
   * Presentation only. Which bones broke is the reducer's; this says which
   * drawing reveals it. An enemy with no entry gets no pose and the round
   * plays exactly as it did before.
   */
  readonly smash?: SmashPoses
}

/**
 * The Warden, deteriorating.
 *
 * Ten plates and three ideas. It stands, growing visibly worse as its army
 * goes; it throws its arms wide when it has broken bones of yours; it draws
 * itself up when it has **held a tie**.
 *
 * That last one is the important one and it is the same drawing the old build
 * used for a telegraph — but it now means something the player can act on.
 * *Ties hold* is the boss's one rule; the defensive plate is what a held tie
 * looks like, and it comes up on the round the player has just paid for it.
 *
 * 700 ms a plate is the slowest an idle can be and still be an idle. The pair
 * is two drawings of a thing standing still, so anything quicker reads as a
 * flicker rather than as breathing, and the hard cut between them is wanted:
 * a crossfade would make it a UI element that happens to be shaped like a
 * corpse.
 */
const WARDEN: EnemyPresentation = {
  idle: {
    full: ['idle.full.1', 'idle.full.2'],
    medium: ['idle.mid.1', 'idle.mid.2'],
    low: ['idle.low.1', 'idle.low.2'],
    frameMs: 700,
  },
  smash: { held: 'defense', struck: 'attack' },
}

/**
 * The Gnawing, struck.
 *
 * One plate, and the encounter already ships it: the thing blown out white on
 * the frame its bones break. There is no idle family, so it stands still.
 */
const GNAWING: EnemyPresentation = {
  smash: { struck: 'hit' },
}

/** Keyed by enemy id. An enemy with no entry is presented as it always was. */
export const PRESENTATION: Readonly<Record<string, EnemyPresentation>> = {
  gnawing: GNAWING,
  warden: WARDEN,
}

export function presentationOf(enemyId: string): EnemyPresentation | undefined {
  return PRESENTATION[enemyId]
}

/**
 * How much of a horror's army is left, in thirds.
 *
 * The boundaries are inclusive downwards — a band ends *at* its fraction, so
 * exactly two thirds is already `medium` and exactly one third is already
 * `low`. That is the honest reading of a count: the moment it drops to the
 * line it has crossed it.
 *
 * Pure, and takes numbers rather than state, because it has to be callable
 * from the settled paint and from the middle of a transition with the same
 * answer. Nothing here is stored; the band is arithmetic on the save.
 */
export function armyBand(alive: number, start: number): ArmyBand {
  if (start <= 0) return 'full'
  if (alive > (start * 2) / 3) return 'full'
  if (alive > start / 3) return 'medium'
  return 'low'
}

/**
 * The plate a horror is standing in, or nothing because it has no idle family.
 *
 * `frame` is which of the band's two plates is up. It is an index the render
 * layer owns and cycles; it is taken modulo the pair, so a caller that has
 * never advanced it — a settled paint, a reload, reduced motion — gets the
 * first plate, which is the one every band is authored to rest on.
 */
export function idlePose(
  enemyId: string,
  alive: number,
  start: number,
  frame = 0,
): string | undefined {
  const idle = presentationOf(enemyId)?.idle
  if (!idle) return undefined
  const pair = idle[armyBand(alive, start)]
  return pair[((frame % pair.length) + pair.length) % pair.length]
}

/**
 * The plate for what a smash just did, or nothing because it has none.
 *
 * A held tie outranks a casualty, and deliberately: for the Warden a round
 * that held a tie *and* broke bones is a round whose one memorable fact is the
 * tie, because that is the rule the player is being taught. A smash that cost
 * the player nothing gets no pose — a defensive drawing over a round in which
 * nothing happened to you would be the picture claiming something the record
 * does not.
 */
export function smashPose(enemyId: string, smash: SmashRecord): string | undefined {
  const poses = presentationOf(enemyId)?.smash
  if (!poses) return undefined
  if (smash.heldTies > 0) return poses.held
  const lost = smash.playerCommonLost + smash.playerSpecialsLost.length
  return lost > 0 ? poses.struck : undefined
}

/** How long one idle plate is up, or nothing because there is no loop to run. */
export function idleFrameMs(enemyId: string): number | undefined {
  return presentationOf(enemyId)?.idle?.frameMs
}
