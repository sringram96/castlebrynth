/**
 * The bones themselves.
 *
 * Four distributions and two named bones, and every number in them is
 * mechanical law: a face table that drifts is a game that plays differently
 * from the one the cards describe. These tests are written out in digits
 * rather than derived from the content, because a test that computes its
 * expectation from the thing it is testing proves nothing.
 */

import { describe, expect, it } from 'vitest'
import {
  BONE_CEILING,
  BONE_PROFILES,
  SPECIAL_BONES,
  STARTING_BONES,
  boneProfile,
  facesOfSpecial,
  isSpecialBoneId,
  newSpecial,
  roomToRecover,
  specialBone,
  totalBones,
} from '../../src/content/bones.js'

describe('profiles', () => {
  it('common is an ordinary d6', () => {
    expect(BONE_PROFILES.common.faces).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('wrong is every face one step too high', () => {
    expect(BONE_PROFILES.wrong.faces).toEqual([2, 3, 4, 5, 6, 7])
  })

  it('cruel has two sevens', () => {
    expect(BONE_PROFILES.cruel.faces).toEqual([3, 4, 5, 6, 7, 7])
  })

  it('heavy reaches eight', () => {
    expect(BONE_PROFILES.heavy.faces).toEqual([4, 5, 6, 6, 7, 8])
  })

  it('every profile has exactly six faces', () => {
    for (const profile of Object.values(BONE_PROFILES)) {
      expect(profile.faces, profile.id).toHaveLength(6)
    }
  })

  it('every profile states its faces in digits', () => {
    // The copy law: a bone's card is its numbers. A rule that describes the
    // distribution in words is a rule the player has to translate.
    for (const profile of Object.values(BONE_PROFILES)) {
      for (const value of new Set(profile.faces)) {
        expect(profile.rule, profile.id).toContain(String(value))
      }
    }
  })

  it('refuses a profile it does not have', () => {
    expect(() => boneProfile('nonesuch' as never)).toThrow()
  })
})

describe('special bones', () => {
  it('the Cinderbone is cruel', () => {
    expect(SPECIAL_BONES.cinderbone.profile).toBe('cruel')
    expect(facesOfSpecial(newSpecial('cinderbone', 0))).toEqual([3, 4, 5, 6, 7, 7])
  })

  it('the Knuckle is heavy', () => {
    expect(SPECIAL_BONES.knuckle.profile).toBe('heavy')
    expect(facesOfSpecial(newSpecial('knuckle', 0))).toEqual([4, 5, 6, 6, 7, 8])
  })

  it('states its faces in digits and nothing else', () => {
    expect(SPECIAL_BONES.cinderbone.rule).toBe('3, 4, 5, 6, 7, 7.')
    expect(SPECIAL_BONES.knuckle.rule).toBe('4, 5, 6, 6, 7, 8.')
  })

  it('tells a special id from anything else', () => {
    expect(isSpecialBoneId('knuckle')).toBe(true)
    expect(isSpecialBoneId('charm')).toBe(false)
    expect(isSpecialBoneId('common')).toBe(false)
  })

  it('refuses a bone it does not have', () => {
    expect(() => specialBone('plain')).toThrow()
  })

  it('gives two bones of the same type different identities', () => {
    // The whole reason a special is an instance. Two Cinderbones may be alive
    // at once and one of them may break while the other does not.
    const first = newSpecial('cinderbone', 0)
    const second = newSpecial('cinderbone', 1)
    expect(first.instanceId).not.toBe(second.instanceId)
    expect(first.specialId).toBe(second.specialId)
  })
})

describe('the pile', () => {
  it('counts specials', () => {
    expect(totalBones({ commonBones: 27, specials: [] })).toBe(27)
    expect(
      totalBones({ commonBones: 27, specials: [newSpecial('knuckle', 0), newSpecial('knuckle', 1)] }),
    ).toBe(29)
  })

  it('starts a run at the ceiling', () => {
    expect(STARTING_BONES).toBe(BONE_CEILING)
    expect(BONE_CEILING).toBe(30)
  })

  it('measures room to recover against the total, specials included', () => {
    // The rule that stops a run stacking named bones on top of a full pile and
    // then healing back to thirty commons underneath them.
    expect(roomToRecover({ commonBones: 30, specials: [] })).toBe(0)
    expect(roomToRecover({ commonBones: 28, specials: [newSpecial('knuckle', 0)] })).toBe(1)
    expect(roomToRecover({ commonBones: 20, specials: [] })).toBe(10)
  })

  it('never offers negative room', () => {
    expect(roomToRecover({ commonBones: 40, specials: [] })).toBe(0)
  })
})
