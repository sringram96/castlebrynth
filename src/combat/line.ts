/**
 * Fielding a line, throwing it, and standing it in order.
 *
 * Everything here is pure and everything here is deterministic. A line is
 * *materialised* from a committed decision, *thrown* from a generator handed
 * in, and *sorted* by a rule written down rather than by whatever order an
 * array happened to be in. No function in this file reads game state, and no
 * function in this file decides an outcome — that is `clash.ts`.
 *
 * ## Why sorting is content and not presentation
 *
 * The lines sort high to low automatically and there is no manual lane
 * rearrangement. That makes the sort a *rule*: which of two equal bones stands
 * in the earlier lane decides which one meets the enemy's higher bone, and a
 * sort that fell out of DOM order or array order would be a rule nobody wrote.
 * So both tie-breaks below are stated, total, and tested.
 */

import type { BoneFaces, BoneProfileId, SpecialBoneInstance } from '../content/bones.js'
import { boneProfile, profileOfSpecial } from '../content/bones.js'
import type { EnemyBoneInstance, PlayerField, RolledBone } from '../game/state.js'
import type { Rng } from '../game/rng.js'

/** The most bones either side may put in one line. */
export const LINE_WIDTH = 6

/**
 * The enemy's line, chosen before anything is thrown.
 *
 * Lowest priority number first, up to six, and `boneId` as the final
 * tie-break so the choice is total. This is the whole of "best first": a
 * number on the content, not a heuristic. An enemy holding nine bones fields
 * six and keeps three in reserve, and the reserve is what makes casualties
 * matter across rounds rather than only within one.
 */
export function enemyField(bones: readonly EnemyBoneInstance[]): readonly EnemyBoneInstance[] {
  return [...bones]
    .sort((a, b) => a.priority - b.priority || a.boneId.localeCompare(b.boneId))
    .slice(0, LINE_WIDTH)
}

/** One throw of one profile. The only place a face is chosen. */
export function rollFace(faces: BoneFaces, rng: Rng): { faceIndex: number; value: number } {
  const faceIndex = rng.int(faces.length)
  return { faceIndex, value: faces[faceIndex]! }
}

function castProfile(profileId: BoneProfileId, rng: Rng): { faceIndex: number; value: number } {
  return rollFace(boneProfile(profileId).faces, rng)
}

/**
 * Throw the enemy's chosen bones, then stand them in order.
 *
 * Face-up: the line exists in full before the player decides anything, which
 * is the first rule of the fight and the reason the decision is a decision.
 */
export function rollEnemyLine(
  fielded: readonly EnemyBoneInstance[],
  rng: Rng,
): readonly RolledBone[] {
  const thrown = fielded.map((bone): RolledBone => {
    const { faceIndex, value } = castProfile(bone.profile, rng)
    return {
      boneKey: bone.boneId,
      profile: bone.profile,
      faceIndex,
      value,
      enemyBoneId: bone.boneId,
    }
  })
  return sortEnemyLine(thrown, fielded)
}

/**
 * A common bone's identity for one round.
 *
 * Ephemeral by construction, because a common bone has no identity outside the
 * line it is standing in: it exists so that a smash can break *this* one and
 * a smash can mark *this* one broken. The round is in the key so two rounds'
 * keys can never collide inside one presented sequence.
 */
export function commonKey(round: number, index: number): string {
  return `common:r${round}:${index}`
}

export interface FieldedPile {
  readonly commonBones: number
  readonly specials: readonly SpecialBoneInstance[]
}

/**
 * Exactly the bones a committed field names, unthrown.
 *
 * Every selected special, plus `width - specialIds.length` anonymous common
 * bones. The count is the width and nothing else may decide it — a field of
 * four with two specials is two specials and two common bones, never four
 * plus two.
 *
 * Throws on a field the reducer would have refused. It is a programming error
 * to get here with one: `FIELD` validates the whole commitment in one place.
 */
export function materialiseField(
  field: PlayerField,
  pile: FieldedPile,
  round: number,
): readonly {
  boneKey: string
  profile: BoneProfileId
  specialInstanceId?: string
  specialId?: string
}[] {
  const byId = new Map(pile.specials.map((s) => [s.instanceId, s]))
  const chosen = field.specialIds.map((id) => {
    const found = byId.get(id)
    if (!found) throw new Error(`fielded a special that is not alive: ${id}`)
    return found
  })
  if (chosen.length > field.width) throw new Error('more specials than the field is wide')
  const commons = field.width - chosen.length
  if (commons > pile.commonBones) throw new Error('fielded more common bones than are alive')

  return [
    ...chosen.map((s) => ({
      boneKey: s.instanceId,
      profile: profileOfSpecial(s),
      specialInstanceId: s.instanceId,
      specialId: s.specialId,
    })),
    ...Array.from({ length: commons }, (_, i) => ({
      boneKey: commonKey(round, i),
      profile: 'common' as BoneProfileId,
    })),
  ]
}

/** Throw a materialised field once, then stand it in order. */
export function rollPlayerLine(
  field: PlayerField,
  pile: FieldedPile,
  round: number,
  rng: Rng,
): readonly RolledBone[] {
  const thrown = materialiseField(field, pile, round).map((bone): RolledBone => {
    const { faceIndex, value } = castProfile(bone.profile, rng)
    return {
      boneKey: bone.boneKey,
      profile: bone.profile,
      faceIndex,
      value,
      ...(bone.specialInstanceId ? { specialInstanceId: bone.specialInstanceId } : {}),
      ...(bone.specialId ? { specialId: bone.specialId } : {}),
    }
  })
  return sortPlayerLine(thrown)
}


/**
 * The player's line, standing high to low.
 *
 * The tie-break puts **a common bone before a special of the same value**, and
 * that is a rule rather than a convenience: at equal numbers the earlier lane
 * meets the enemy's higher bone, so the later lane is the safer one, and a
 * special should not die merely because an array happened to be built in a
 * particular order. Specials then order by their run-long instance id, and
 * common bones by their round key, so the sort is total and stable.
 */
export function sortPlayerLine(line: readonly RolledBone[]): readonly RolledBone[] {
  return [...line].sort((a, b) => {
    if (a.value !== b.value) return b.value - a.value
    const aSpecial = a.specialInstanceId !== undefined
    const bSpecial = b.specialInstanceId !== undefined
    if (aSpecial !== bSpecial) return aSpecial ? 1 : -1
    return a.boneKey.localeCompare(b.boneKey)
  })
}

/**
 * The enemy's line, standing high to low.
 *
 * Equal values fall back to the enemy's own authored priority, and then to
 * `boneId`. No AI rearranges anything after the throw: the order is the
 * content's order broken by the numbers, and nothing else.
 */
export function sortEnemyLine(
  line: readonly RolledBone[],
  fielded: readonly EnemyBoneInstance[],
): readonly RolledBone[] {
  const priority = new Map(fielded.map((b) => [b.boneId, b.priority]))
  const rank = (bone: RolledBone): number => priority.get(bone.boneKey) ?? Number.MAX_SAFE_INTEGER
  return [...line].sort((a, b) => {
    if (a.value !== b.value) return b.value - a.value
    const byPriority = rank(a) - rank(b)
    if (byPriority !== 0) return byPriority
    return a.boneKey.localeCompare(b.boneKey)
  })
}
