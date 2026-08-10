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
 * Two tiers:
 *
 *   **naive**      fields everything, always. The widest legal line, best
 *                  specials in it, and a Vial only when the pile is thin
 *                  enough that one more bad round could end the run. This is
 *                  the first-time player, and it is the floor the slice has to
 *                  be winnable from.
 *
 *   **heuristic**  reads the line, compares every legal width, and picks the
 *                  one with the best expected trade. Allowed to be better than
 *                  a first-time human; not allowed to know anything a human
 *                  at the same screen does not.
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
  readonly charms: number
  readonly vials: number
  readonly charmUsed: boolean
}

export interface Decision {
  readonly width: number
  readonly specialIds: readonly string[]
}

const totalBones = (t: Table): number => t.commonBones + t.specials.length

const maxWidth = (t: Table): number => Math.min(LINE_WIDTH, totalBones(t))

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
 * What a field of `width` is worth, given the line on screen.
 *
 * The player's line will sort itself, and so will the pairing, but a policy
 * cannot know which of its bones lands where — so it prices the lanes it will
 * actually contest (the enemy's top `width`) against the bones it is putting
 * in, best against highest. That is the same reasoning a human does at the
 * screen: *my best bone meets its best bone.*
 */
function valueOfWidth(t: Table, width: number, specialIds: readonly string[]): number {
  const chosen = specialIds
    .map((id) => t.specials.find((s) => s.instanceId === id))
    .filter((s): s is SpecialBoneInstance => s !== undefined)
    .map((s) => specialBone(s.specialId).profile)
  const profiles: BoneProfileId[] = [
    ...chosen,
    ...Array.from({ length: width - chosen.length }, () => 'common' as BoneProfileId),
  ]
  // Best bones into the lanes that will be contested hardest.
  profiles.sort((a, b) => meanOf(b) - meanOf(a))

  let value = 0
  for (let lane = 0; lane < width; lane++) {
    const against = t.enemyLine[lane]?.value
    // A lane with no enemy bone opposite is free: it cannot die, and it cannot
    // kill. Worth exactly nothing, which is why widening past the enemy's line
    // is neither clever nor a mistake.
    if (against === undefined) continue
    value += laneValue(profiles[lane]!, against, t.tieRule)
  }
  return value
}

/**
 * What to field.
 *
 * Naive fields everything. Heuristic compares every legal width against the
 * line it can see, and takes the best — which, against the Warden's held ties
 * and against a line full of sevens, is usually not six.
 */
export function fieldFor(t: Table, tier: Tier): Decision {
  const most = maxWidth(t)
  if (most <= 0) return { width: 0, specialIds: [] }

  const specialsFor = (width: number): readonly string[] =>
    bestSpecials(t)
      .slice(0, Math.min(width, t.specials.length))
      .map((s) => s.instanceId)

  if (tier === 'naive') {
    return { width: most, specialIds: specialsFor(most) }
  }

  let best: Decision = { width: 1, specialIds: specialsFor(1) }
  let bestScore = -Infinity
  for (let width = 1; width <= most; width++) {
    const specialIds = specialsFor(width)
    // Two terms, and the second one is not optional.
    //
    // The trade is what a lane is worth. **Progress** is how many of its bones
    // this width is expected to break — and without it the policy is happy to
    // field one bone a round for ever, because refusing to engage has an
    // expected trade of zero and zero beats every negative number. That is not
    // caution, it is a stall: a fight that never ends is a fight the player
    // eventually loses to attrition, and a simulator that plays it would
    // report a boss as easy because it never finished one.
    //
    // So progress is weighted lightly and it is always positive. Wide play is
    // preferred when the trade is close, narrow play wins only when the trade
    // is genuinely bad — which against the Warden's held ties it often is.
    const score = valueOfWidth(t, width, specialIds) + PROGRESS * killsFor(t, width, specialIds)
    if (score > bestScore + 1e-9) {
      bestScore = score
      best = { width, specialIds }
    }
  }
  return best
}

/**
 * How much a bone broken on its side is worth against one of mine.
 *
 * Below one, because bones are the player's life and its army is only its
 * army — but comfortably above zero, because the fight has to end.
 */
const PROGRESS = 0.55

/** Expected enemy bones broken by a field of this width. */
function killsFor(t: Table, width: number, specialIds: readonly string[]): number {
  const chosen = specialIds
    .map((id) => t.specials.find((s) => s.instanceId === id))
    .filter((s): s is SpecialBoneInstance => s !== undefined)
    .map((s) => specialBone(s.specialId).profile)
  const profiles: BoneProfileId[] = [
    ...chosen,
    ...Array.from({ length: width - chosen.length }, () => 'common' as BoneProfileId),
  ]
  profiles.sort((a, b) => meanOf(b) - meanOf(a))

  let kills = 0
  for (let lane = 0; lane < width; lane++) {
    const against = t.enemyLine[lane]?.value
    if (against === undefined) continue
    const { win, tie } = odds(profiles[lane]!, against)
    // A mutual tie takes one of its bones too. A held tie takes none.
    kills += win + (t.tieRule === 'warden-holds' ? 0 : tie)
  }
  return kills
}

/**
 * Which rolled bone to spend a Charm on, or none.
 *
 * Only ever a bone that is **losing its lane**, and only when throwing it
 * again is more likely to help than the bone is likely to be worth keeping. A
 * Charm spent on a lane already won is a Charm thrown away.
 */
export function charmFor(
  t: Table,
  line: readonly RolledBone[],
  tier: Tier,
): string | undefined {
  if (tier === 'naive') return undefined
  if (t.charmUsed || t.charms <= 0) return undefined

  let best: { key: string; gain: number } | undefined
  for (let lane = 0; lane < line.length; lane++) {
    const mine = line[lane]!
    const against = t.enemyLine[lane]?.value
    if (against === undefined) continue

    const now = mine.value > against ? 1 : mine.value === against ? (t.tieRule === 'warden-holds' ? -1 : 0) : -1
    if (now >= 1) continue
    // What the same bone is worth thrown again, as an expectation over its
    // own faces. Nothing here knows what it will actually roll.
    const after = laneValue(mine.profile, against, t.tieRule)
    const gain = after - now
    if (gain > 0.25 && (!best || gain > best.gain)) best = { key: mine.boneKey, gain }
  }
  return best?.key
}

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
