/**
 * How a simulated player decides.
 *
 * A policy is handed **exactly what the screen shows** and answers with a
 * press. That constraint is the whole value of the file: a policy that could
 * see the enemy's next throw would be measuring a game nobody can play, and a
 * report built on it would be measuring nothing.
 *
 * So the input below is the public line, the pile, and the satchel. There is
 * no seed, no generator, and no forward look — a policy cannot know what its
 * own bones will roll, let alone what the enemy will throw next round.
 *
 * **The width is not a decision any more**, so neither is it one here: every
 * round throws as wide as the pile allows. What is left is the modifier step,
 * and the two tiers are two answers to it:
 *
 *   **naive**      throws every named bone it owns, every round, and drinks
 *                  only when the pile is thin enough that one more bad round
 *                  could end the run. The first-time player, and the floor the
 *                  slice has to be winnable from.
 *
 *   **heuristic**  reads the line and **holds a named bone back** when the
 *                  line it is facing is likely to break it for less than it is
 *                  worth. Allowed to be better than a first-time human; not
 *                  allowed to know anything a human at the same screen does
 *                  not.
 */

import { BONE_PROFILES, boneProfile, specialBone } from '../../src/content/bones.js'
import type { BoneProfileId, SpecialBoneInstance } from '../../src/content/bones.js'
import { LINE_WIDTH } from '../../src/combat/line.js'
import type { RolledBone, TieRule } from '../../src/game/state.js'

export type Tier = 'naive' | 'heuristic'

/** Everything the screen is showing when a decision is due. */
export interface Table {
  /** The enemy's line, face-up and sorted. Public before any commitment. */
  readonly enemyLine: readonly RolledBone[]
  /** How many bones it has left in all, reserves included. */
  readonly enemyBones: number
  readonly tieRule: TieRule
  readonly commonBones: number
  readonly specials: readonly SpecialBoneInstance[]
  readonly vials: number
}

export interface Decision {
  readonly width: number
  readonly specialIds: readonly string[]
}

const totalBones = (t: Table): number => t.commonBones + t.specials.length

/**
 * How wide the line is, given which named bones are standing in it.
 *
 * The same rule as `fieldFor` in the reducer, and it has to be: a policy that
 * thought it was throwing six when the pile could only pay five would be
 * scoring a line the game will not deal it. Holding a named bone back costs a
 * lane whenever there is no spare common to take its place.
 */
const widthWith = (t: Table, standing: number): number =>
  Math.min(LINE_WIDTH, t.commonBones + standing)

/** A profile's mean face. The one number a policy may reason with. */
function meanOf(profile: BoneProfileId): number {
  const faces = boneProfile(profile).faces
  return faces.reduce((sum, v) => sum + v, 0) / faces.length
}

/**
 * The chance one bone of a profile beats, ties, and loses to a fixed number.
 *
 * Exact rather than sampled — six faces is a small enough space to count — so
 * the policy's arithmetic is deterministic and the report is reproducible.
 */
function odds(profile: BoneProfileId, against: number): { win: number; tie: number; lose: number } {
  const faces = boneProfile(profile).faces
  let win = 0
  let tie = 0
  for (const face of faces) {
    if (face > against) win++
    else if (face === against) tie++
  }
  return { win: win / faces.length, tie: tie / faces.length, lose: 1 - (win + tie) / faces.length }
}

/**
 * The expected trade of putting one bone into one lane.
 *
 * Positive is good for the player: enemy bones broken minus my bones broken.
 * A held tie is the Warden's whole encounter and it is priced here — against
 * it a tie is a pure loss rather than an even one, which is what makes a
 * narrow line correct against a boss and wrong against everything else.
 */
function laneValue(profile: BoneProfileId, against: number, tieRule: TieRule): number {
  const { win, tie, lose } = odds(profile, against)
  const tieValue = tieRule === 'warden-holds' ? -1 : 0
  return win * 1 + tie * tieValue + lose * -1
}

/** Specials ranked by how high they roll. The best ones go in first. */
function bestSpecials(t: Table): readonly SpecialBoneInstance[] {
  return [...t.specials].sort(
    (a, b) =>
      meanOf(specialBone(b.specialId).profile) - meanOf(specialBone(a.specialId).profile) ||
      a.instanceId.localeCompare(b.instanceId),
  )
}


/**
 * Which named bones to stand in the line.
 *
 * The width is fixed at whatever the pile can put up, so this is the whole of
 * the decision. Naive throws every named bone it owns. Heuristic asks, for
 * each one, whether the lane it will land in is worth the risk of losing it
 * forever — and against a line it cannot beat, the answer is no.
 */
export function fieldFor(t: Table, tier: Tier): Decision {
  if (totalBones(t) <= 0) return { width: 0, specialIds: [] }

  const ranked = bestSpecials(t).slice(0, LINE_WIDTH)
  if (tier === 'naive') {
    const specialIds = ranked.map((s) => s.instanceId)
    return { width: widthWith(t, specialIds.length), specialIds }
  }

  // Which lane each named bone will actually stand in, best against highest.
  // A named bone outranks a common one by construction — every special
  // profile rolls higher — so the ranked specials take the top lanes.
  const keep: string[] = []
  ranked.forEach((instance, lane) => {
    const against = t.enemyLine[lane]?.value
    // No enemy bone opposite: the lane is free, so there is no risk to weigh
    // and the bone may as well stand. It cannot die and it cannot kill.
    if (against === undefined) return void keep.push(instance.instanceId)

    const profile = specialBone(instance.specialId).profile
    const mine = laneValue(profile, against, t.tieRule)
    const instead = laneValue('common', against, t.tieRule)

    // What the named bone buys in this lane, against what it costs when it
    // breaks. `RISK_OF_NAMED` is how many common bones one named bone is
    // worth — it is gone for the rest of the run, and nothing resurrects it.
    const { lose, tie } = odds(profile, against)
    const death = lose + (t.tieRule === 'mutual' ? tie : tie)
    if (mine - instead > death * RISK_OF_NAMED) keep.push(instance.instanceId)
  })
  // Holding a bone back can cost a lane. If it does, and the pile has nothing
  // else to field, the bone stands after all — a narrower line is a worse
  // trade than a risked bone in every case the slice can produce.
  const held = ranked.filter((s) => !keep.includes(s.instanceId))
  for (const s of held) {
    if (widthWith(t, keep.length) < widthWith(t, keep.length + 1)) keep.push(s.instanceId)
  }
  return { width: widthWith(t, keep.length), specialIds: keep }
}

/**
 * How many common bones one named bone is worth.
 *
 * Above one, because a named bone is gone for the rest of the run and a common
 * one is a number going down. Not far above it, because a named bone held back
 * for ever is a named bone that did nothing — and the reason to carry one is
 * that it wins lanes a common bone loses.
 */
const RISK_OF_NAMED = 1.6

/**
 * Whether to drink, and it is the one place the two tiers nearly agree.
 *
 * Both drink when the pile is thin, because a Vial saved through a death is a
 * Vial wasted. Naive is more conservative — it waits until a single bad round
 * could end things — and heuristic tops up whenever a full Vial would not be
 * spilled.
 */
export function drinkFor(t: Table, tier: Tier): boolean {
  if (t.vials <= 0) return false
  const total = totalBones(t)
  if (total >= 30) return false
  if (tier === 'naive') return total <= 8
  // A Vial is five bones and the ceiling is thirty, so drinking above
  // twenty-five spills some of it. Below that, a Vial in the satchel when the
  // run ends is a Vial wasted.
  return total <= 25
}

/** Every profile a policy may meet, so a new one cannot be silently ignored. */
export const PROFILES = Object.keys(BONE_PROFILES) as readonly BoneProfileId[]
