/**
 * Which drawing belongs to which fact.
 *
 * The whole of `content/enemyPresentation.ts` is a lookup, and the property
 * that matters is that it is **pure**: the same fact gives the same plate from
 * a settled paint, from the middle of a transition, and after a reload. None
 * of it is in the save, and none of it may be.
 */

import { describe, expect, it } from 'vitest'
import { armyBand, idleFrameMs, idlePose, smashPose } from '../../src/content/enemyPresentation.js'
import { STAGES, armySize, stageForRound, stanceAt } from '../../src/content/enemies.js'
import type { SmashRecord } from '../../src/game/state.js'

const record = (over: Partial<SmashRecord> = {}): SmashRecord => ({
  lanes: [],
  playerCommonLost: 0,
  playerSpecialsLost: [],
  enemyBonesLost: [],
  heldTies: 0,
  ...over,
})

describe('the army band', () => {
  it('is thirds, and the boundary belongs to the lower band', () => {
    // The honest reading of a count: the moment it drops to the line it has
    // crossed it.
    expect(armyBand(8, 8)).toBe('full')
    expect(armyBand(6, 8)).toBe('full')
    expect(armyBand(5, 8)).toBe('medium')
    expect(armyBand(3, 8)).toBe('medium')
    expect(armyBand(2, 8)).toBe('low')
    expect(armyBand(1, 8)).toBe('low')
  })

  it('gives an eight-bone Warden three bands worth having', () => {
    const start = armySize('warden')
    expect(start).toBe(8)
    const bands = Array.from({ length: start }, (_, i) => armyBand(start - i, start))
    expect(new Set(bands)).toEqual(new Set(['full', 'medium', 'low']))
  })

  it('survives a zero start rather than dividing by it', () => {
    expect(armyBand(0, 0)).toBe('full')
  })
})

describe('idle plates', () => {
  it('the Warden stands in the plate its army says', () => {
    expect(idlePose('warden', 8, 8)).toBe('idle.full.1')
    expect(idlePose('warden', 4, 8)).toBe('idle.mid.1')
    expect(idlePose('warden', 1, 8)).toBe('idle.low.1')
  })

  it('rests on the first plate of a band', () => {
    // A settled paint, a reload and reduced motion all pass no frame, and all
    // three have to land on the plate the band was authored to rest on.
    expect(idlePose('warden', 8, 8)).toBe(idlePose('warden', 8, 8, 0))
    expect(idlePose('warden', 8, 8, 2)).toBe(idlePose('warden', 8, 8, 0))
  })

  it('cycles the pair, in both directions', () => {
    expect(idlePose('warden', 8, 8, 1)).toBe('idle.full.2')
    expect(idlePose('warden', 8, 8, -1)).toBe('idle.full.2')
  })

  it('gives nothing to an enemy with no idle family', () => {
    expect(idlePose('gnawing', 5, 5)).toBeUndefined()
    expect(idleFrameMs('gnawing')).toBeUndefined()
    expect(idleFrameMs('warden')).toBe(700)
  })
})

describe('smash plates', () => {
  it('a held tie shows the defensive plate', () => {
    // The boss rule, on the round the player has just paid for it.
    expect(smashPose('warden', record({ heldTies: 1, playerCommonLost: 1 }))).toBe('defense')
  })

  it('a held tie outranks a casualty', () => {
    expect(
      smashPose('warden', record({ heldTies: 2, playerCommonLost: 3, enemyBonesLost: ['a'] })),
    ).toBe('defense')
  })

  it('casualties with no held tie show the attacking plate', () => {
    expect(smashPose('warden', record({ playerCommonLost: 2 }))).toBe('attack')
    expect(smashPose('warden', record({ playerSpecialsLost: ['knuckle#0'] }))).toBe('attack')
  })

  it('a round that cost nothing gets no pose', () => {
    // A defensive drawing over a round in which nothing happened to you would
    // be the picture claiming something the record does not.
    expect(smashPose('warden', record({ enemyBonesLost: ['a', 'b'] }))).toBeUndefined()
  })

  it('the Gnawing has a struck plate and no defensive one', () => {
    expect(smashPose('gnawing', record({ playerCommonLost: 1 }))).toBe('hit')
    expect(smashPose('gnawing', record({ heldTies: 1 }))).toBeUndefined()
  })

  it('gives nothing to an enemy with no entry', () => {
    expect(smashPose('marrow', record({ playerCommonLost: 3 }))).toBeUndefined()
  })
})

describe('staging', () => {
  it('the Gnawing walks far, mid, close across the rounds', () => {
    expect(stageForRound('gnawing', 1)).toBe('far')
    expect(stageForRound('gnawing', 2)).toBe('mid')
    expect(stageForRound('gnawing', 3)).toBe('close')
  })

  it('stops at close and stays there', () => {
    expect(stageForRound('gnawing', 9)).toBe('close')
    expect(stageForRound('gnawing', 99)).toBe(STAGES[STAGES.length - 1])
  })

  it('is staging, not a deadline: nothing about it is in the reducer', () => {
    // The old contact rule killed the player when it arrived. It does not
    // exist. What decides the fight is the army, and the drawing only says
    // which round it is.
    expect(stageForRound('warden', 5)).toBeUndefined()
    expect(stageForRound('marrow', 5)).toBeUndefined()
  })

  it('each stage has its own authored composition', () => {
    const far = stanceAt('gnawing', 'far')
    const close = stanceAt('gnawing', 'close')
    expect(close.width).toBeGreaterThan(far.width * 3)
  })

  it('an enemy with no staging keeps its still pose everywhere', () => {
    expect(stanceAt('marrow', undefined)).toEqual(stanceAt('marrow', 'close'))
  })
})

describe('purity', () => {
  it('every lookup answers the same twice', () => {
    const facts = record({ heldTies: 1, playerCommonLost: 2 })
    expect(smashPose('warden', facts)).toBe(smashPose('warden', facts))
    expect(idlePose('warden', 5, 8)).toBe(idlePose('warden', 5, 8))
    expect(facts).toEqual(record({ heldTies: 1, playerCommonLost: 2 }))
  })
})
