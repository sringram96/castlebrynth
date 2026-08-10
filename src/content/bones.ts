/**
 * Every bone in the game.
 *
 * A bone is six faces and a number on each of them. There is no keyword, no
 * face effect, no rider and no algebra: a bone rolls a value, and a higher
 * value kills a lower one. That is the whole of it, and it is the whole of it
 * on purpose — the old six-die loadout asked the player to hold seven hand
 * classes, a multiplier table, red and green faces and a relic bonus in their
 * head at once. This asks them to read a number.
 *
 * ## The copy law
 *
 * A bone's card answers two questions and stops:
 *
 *   1. what values can this bone roll?
 *   2. what makes it different from a common bone?
 *
 * `rule` answers both, literally, in digits. `3, 4, 5, 6, 7, 7.` is the whole
 * card for a Cinderbone. A player who has read that sentence knows everything
 * the game knows about it, which is the property the old die cards never had.
 *
 * ## Profiles and instances
 *
 * A **profile** is a distribution — four of them, and they are mechanical law.
 * Two faces with the same number resolve identically however they are painted.
 *
 * A **special** is a named bone built on a profile. It is carried as an
 * *instance* rather than as an id, because a special's death matters: two
 * Cinderbones may be alive at once and one of them may break while the other
 * does not, and an id cannot tell those two apart.
 */

export type BoneProfileId = 'common' | 'wrong' | 'cruel' | 'heavy'

export type BoneFaces = readonly [number, number, number, number, number, number]

export interface BoneProfile {
  readonly id: BoneProfileId
  readonly faces: BoneFaces
  /** The distribution in one sentence, in digits. Never flavour. */
  readonly rule: string
}

const profile = (id: BoneProfileId, faces: BoneFaces, rule: string): BoneProfile => ({
  id,
  faces,
  rule,
})

export const BONE_PROFILES: Readonly<Record<BoneProfileId, BoneProfile>> = {
  common: profile('common', [1, 2, 3, 4, 5, 6], 'A common bone. 1, 2, 3, 4, 5, 6.'),
  wrong: profile('wrong', [2, 3, 4, 5, 6, 7], 'Every face is one step too high. 2, 3, 4, 5, 6, 7.'),
  cruel: profile('cruel', [3, 4, 5, 6, 7, 7], 'A high bone with two sevens. 3, 4, 5, 6, 7, 7.'),
  heavy: profile('heavy', [4, 5, 6, 6, 7, 8], 'A heavy bone that can reach eight. 4, 5, 6, 6, 7, 8.'),
}

export function boneProfile(id: BoneProfileId): BoneProfile {
  const found = BONE_PROFILES[id]
  if (!found) throw new Error(`no such bone profile: ${id}`)
  return found
}

/** The largest number any bone can show. The UI has to be able to read it. */
export const HIGHEST_FACE = 8

export type SpecialBoneId = 'cinderbone' | 'knuckle'

export interface SpecialBone {
  readonly id: SpecialBoneId
  readonly name: string
  readonly profile: BoneProfileId
  /** Its faces, in digits. The card is this sentence and nothing else. */
  readonly rule: string
  /** Optional flavour, below a divider, never mixed into the rule. */
  readonly flavour?: string
}

export const SPECIAL_BONES: Readonly<Record<SpecialBoneId, SpecialBone>> = {
  cinderbone: {
    id: 'cinderbone',
    name: 'Cinderbone',
    profile: 'cruel',
    rule: '3, 4, 5, 6, 7, 7.',
    flavour: 'It came out of the fire harder than it went in.',
  },
  knuckle: {
    id: 'knuckle',
    name: 'Knuckle',
    profile: 'heavy',
    rule: '4, 5, 6, 6, 7, 8.',
    flavour: 'Somebody else made a fist with this. It is the last thing it did.',
  },
}

/**
 * Takes a plain string on purpose.
 *
 * Views hold an id that came off a data attribute or out of a save, and
 * narrowing every one of those at the call site would put a type guard in
 * front of every card in the game. An unknown id is a programming error and
 * this says so loudly, which is the behaviour a view wants anyway.
 */
export function specialBone(id: string): SpecialBone {
  const found = SPECIAL_BONES[id as SpecialBoneId]
  if (!found) throw new Error(`no such special bone: ${id}`)
  return found
}

export function isSpecialBoneId(id: string): id is SpecialBoneId {
  return id in SPECIAL_BONES
}

/**
 * One living special bone in the pile.
 *
 * `instanceId` is its identity for the length of the run. Two Cinderbones are
 * two different objects; fielding one must never field the other, and breaking
 * one must never take the other with it. Nothing in the UI is allowed to use a
 * screen position as an identity.
 */
export interface SpecialBoneInstance {
  readonly instanceId: string
  readonly specialId: SpecialBoneId
}

export function newSpecial(specialId: SpecialBoneId, serial: number): SpecialBoneInstance {
  return { instanceId: `${specialId}#${serial}`, specialId }
}

/** The faces of one living special. */
export function facesOfSpecial(instance: SpecialBoneInstance): BoneFaces {
  return boneProfile(specialBone(instance.specialId).profile).faces
}

export function profileOfSpecial(instance: SpecialBoneInstance): BoneProfileId {
  return specialBone(instance.specialId).profile
}

/**
 * The most bones a run may hold, specials included.
 *
 * A ceiling rather than a maximum-life field, because it is a content
 * decision and not a property of a run: a run does not carry "how many bones I
 * could have", it carries the bones it has. Everything that gives bones back —
 * the Font, a Vial — measures against this one number.
 */
export const BONE_CEILING = 30

/** What a run wakes up with. Thirty common bones and nothing else. */
export const STARTING_BONES = BONE_CEILING

/**
 * The pile: everything alive.
 *
 * **One helper, and every rule calls it.** *Am I alive?* and *how much can I
 * recover?* are the same arithmetic, and the moment the tray, the reducer, the
 * Font and the balance simulation each write it out for themselves is the
 * moment one of them counts the specials and another does not.
 */
export function totalBones(pile: {
  readonly commonBones: number
  readonly specials: readonly SpecialBoneInstance[]
}): number {
  return pile.commonBones + pile.specials.length
}

/** How many bones a recovery may still put back. Never negative. */
export function roomToRecover(pile: {
  readonly commonBones: number
  readonly specials: readonly SpecialBoneInstance[]
}): number {
  return Math.max(0, BONE_CEILING - totalBones(pile))
}
