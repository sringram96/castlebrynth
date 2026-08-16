/**
 * Which drawing belongs to which fact.
 *
 * The whole of `content/enemyPresentation.ts` is a lookup, and the property
 * that matters is that it is **pure**: the same fact gives the same plate from
 * a settled paint, from the middle of a transition, and after a reload. None
 * of it is in the save, and none of it may be.
 */

import { describe, expect, it } from 'vitest'
import {
  attackPose,
  healthBand,
  idleFrameMs,
  idlePose,
} from '../../src/content/enemyPresentation.js'
import { ENEMIES, STAGES, stageForRound, stanceAt } from '../../src/content/enemies.js'
import type { AttackRecord } from '../../src/game/state.js'

const record = (over: Partial<AttackRecord> = {}): AttackRecord => ({
  dice: [6, 6, 3, 2, 1, 1],
  hand: 'pair',
  sum: 19,
  multiplier: 1,
  damage: 19,
  enemyHpBefore: 180,
  enemyHpAfter: 161,
  retaliation: 8,
  bonesBefore: 30,
  bonesAfter: 22,
  ...over,
})

describe('the health band', () => {
  it('is thirds, and the boundary belongs to the lower band', () => {
    // The honest reading of a total: the moment it drops to the line it has
    // crossed it.
    expect(healthBand(180, 180)).toBe('full')
    expect(healthBand(121, 180)).toBe('full')
    expect(healthBand(120, 180)).toBe('medium')
    expect(healthBand(61, 180)).toBe('medium')
    expect(healthBand(60, 180)).toBe('low')
    expect(healthBand(0, 180)).toBe('low')
  })

  it('gives the Warden three bands worth having', () => {
    const max = ENEMIES.warden!.maxHp
    expect(max).toBe(180)
    const bands = Array.from({ length: max + 1 }, (_, hp) => healthBand(hp, max))
    expect(new Set(bands)).toEqual(new Set(['full', 'medium', 'low']))
  })

  it('survives a zero total rather than dividing by it', () => {
    expect(healthBand(0, 0)).toBe('full')
  })
})

describe('idle plates', () => {
  it('the Warden stands in the plate its health says', () => {
    expect(idlePose('warden', 180, 180)).toBe('idle.full.1')
    expect(idlePose('warden', 90, 180)).toBe('idle.mid.1')
    expect(idlePose('warden', 20, 180)).toBe('idle.low.1')
  })

  it('rests on the first plate of a band', () => {
    // A settled paint, a reload and reduced motion all pass no frame, and all
    // three have to land on the plate the band was authored to rest on.
    expect(idlePose('warden', 180, 180)).toBe(idlePose('warden', 180, 180, 0))
    expect(idlePose('warden', 180, 180, 2)).toBe(idlePose('warden', 180, 180, 0))
  })

  it('cycles the pair, in both directions', () => {
    expect(idlePose('warden', 180, 180, 1)).toBe('idle.full.2')
    expect(idlePose('warden', 180, 180, -1)).toBe('idle.full.2')
  })

  it('gives nothing to an enemy with no idle family', () => {
    expect(idlePose('gnawing', 70, 70)).toBeUndefined()
    expect(idleFrameMs('gnawing')).toBeUndefined()
    expect(idleFrameMs('warden')).toBe(700)
  })
})

describe('attack plates', () => {
  it('a feeble attack shows the defensive plate', () => {
    // CRAP is the fallback that is never useless and always weak, and the
    // drawing of a thing shrugging is what running out of shapes looks like.
    expect(attackPose('warden', record({ hand: 'crap', damage: 9 }))).toBe('defense')
  })

  it('a real hit shows the attacking plate', () => {
    expect(attackPose('warden', record({ hand: 'full-house', damage: 48 }))).toBe('attack')
    expect(attackPose('warden', record({ hand: 'pair' }))).toBe('attack')
  })

  it('a killing attack gets no pose: the authored death is the picture', () => {
    expect(
      attackPose('warden', record({ hand: 'four-kind', enemyHpAfter: 0, retaliation: 0 })),
    ).toBeUndefined()
  })

  it('the Gnawing has a struck plate and no defensive one', () => {
    expect(attackPose('gnawing', record({ hand: 'pair' }))).toBe('hit')
    expect(attackPose('gnawing', record({ hand: 'crap' }))).toBe('hit')
  })

  it('gives nothing to an enemy with no entry', () => {
    expect(attackPose('marrow', record({ hand: 'pair' }))).toBeUndefined()
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
    // exist. What decides the fight is the dice, and the drawing only says
    // which attack it is.
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
    const facts = record({ hand: 'crap', damage: 7 })
    expect(attackPose('warden', facts)).toBe(attackPose('warden', facts))
    expect(idlePose('warden', 90, 180)).toBe(idlePose('warden', 90, 180))
    expect(facts).toEqual(record({ hand: 'crap', damage: 7 }))
  })
})
