/**
 * What a win pays, and what taking it does to the army.
 *
 * The reward screen is the only place in the game where a press makes a
 * **physical change to the pile that is not a casualty**, so the rules are
 * covered in full here: the cadence, the guaranteed drop, the transmutation at
 * the ceiling, and the SKIP that means the change is always the player's.
 */

import { describe, expect, it } from 'vitest'
import { newRun, offerFor, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { GameState, RunState } from '../../src/game/state.js'
import { BONE_CEILING, newSpecial, totalBones } from '../../src/content/bones.js'
import { LOOT_REWARDS, isBoneReward, reward } from '../../src/content/rewards.js'
import { enemy } from '../../src/content/enemies.js'
import { Rng } from '../../src/game/rng.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

const offering = (offer: string[], run: Partial<RunState> = {}): GameState => ({
  version: SAVE_VERSION,
  mode: 'reward',
  meta: EMPTY_META,
  run: { ...newRun(1), roomId: 'hollow', offer: offer as never, ...run },
})

/** How often an enemy pays anything at all, over many seeds. */
function payRate(enemyId: string, trials = 600): number {
  const run = newRun(1)
  let paid = 0
  for (let seed = 0; seed < trials; seed++) {
    if (offerFor(run, enemyId, new Rng(seed * 2654435761)).length > 0) paid += 1
  }
  return paid / trials
}

describe('the reward pool', () => {
  it('is three nouns and no fourth', () => {
    // No new collectible category without a product decision. See CLAUDE.md.
    expect(new Set(LOOT_REWARDS.map((id) => reward(id).kind))).toEqual(
      new Set(['bone', 'charm', 'vial']),
    )
  })

  it('states an exact mechanic on every card', () => {
    for (const id of LOOT_REWARDS) {
      expect(reward(id).rule, id).toMatch(/\d/)
    }
  })
})

describe('cadence', () => {
  it('the Gnawing pays about three times in five, two at a time', () => {
    expect(enemy('gnawing').rewardChance).toBe(0.6)
    expect(enemy('gnawing').rewardChoices).toBe(2)
    expect(payRate('gnawing')).toBeGreaterThan(0.53)
    expect(payRate('gnawing')).toBeLessThan(0.67)
  })

  it('the Marrow pays more often, because it is the detour', () => {
    expect(enemy('marrow').rewardChance).toBe(0.7)
    expect(payRate('marrow')).toBeGreaterThan(0.63)
    expect(payRate('marrow')).toBeLessThan(0.77)
  })

  it('the Warden pays nothing: the open door is the reward', () => {
    expect(enemy('warden').rewardChance).toBe(0)
    expect(payRate('warden', 60)).toBe(0)
  })

  it('never offers the same thing twice in one screen', () => {
    for (let seed = 0; seed < 200; seed++) {
      const offer = offerFor(newRun(1), 'gnawing', new Rng(seed * 40503))
      expect(new Set(offer).size).toBe(offer.length)
    }
  })

  it('offers no more than the enemy declares', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(offerFor(newRun(1), 'gnawing', new Rng(seed)).length).toBeLessThanOrEqual(2)
    }
  })
})

describe('the guaranteed drop', () => {
  it('the Marrow leaves a Vial whether or not it rolls an offer', () => {
    // Outside the 70%. A no-offer Marrow win still pays it, which is what
    // makes the detour worth taking whatever the dice do.
    expect(enemy('marrow').drop).toBe('vial')
    let sawOffer = false
    let sawNone = false
    for (let seed = 1; seed <= 40 && !(sawOffer && sawNone); seed++) {
      const won = winAgainstMarrow(seed)
      if (!won) continue
      expect(won.run!.vials).toBeGreaterThanOrEqual(1)
      if (won.mode === 'reward') sawOffer = true
      else sawNone = true
    }
    expect(sawOffer && sawNone, 'both a paying and a non-paying Marrow win were seen').toBe(true)
  })

  it('pays exactly once', () => {
    const won = winAgainstMarrow(3)
    if (!won) return
    // The win is granted in one place and `combat` is gone from the state it
    // returns, so there is no second call with a fight left to win.
    expect(reduce(won, { type: 'DEFEAT_DONE' })).toBe(won)
    expect(won.run!.vials).toBe(1)
  })
})

/** Fight the Marrow to the end with a fixture-thin army, or give up. */
function winAgainstMarrow(seed: number): GameState | undefined {
  let state: GameState = {
    version: SAVE_VERSION,
    mode: 'explore',
    meta: EMPTY_META,
    run: { ...newRun(seed), roomId: 'deep', path: ['entry', 'deep'] },
  }
  state = reduce(state, { type: 'FIGHT' })
  // Stand its army at one bone, then take that bone. Both are positions the
  // fight reaches on its own; this only skips the rounds that get there.
  const combat = state.run!.combat!
  const last = combat.enemyLine[combat.enemyLine.length - 1]!
  state = {
    ...state,
    run: {
      ...state.run!,
      combat: {
        ...combat,
        enemyBones: combat.enemyBones.filter((b) => b.boneId === last.enemyBoneId),
        enemyLine: [{ ...last, value: 1, faceIndex: 0 }],
      },
    },
  }
  state = play(state, { type: 'FIELD', width: 6, specialIds: [] }, { type: 'THROW' }, { type: 'SMASH' })
  if (state.run?.combat?.defeated) state = reduce(state, { type: 'DEFEAT_DONE' })
  return state.mode === 'reward' || state.mode === 'explore' ? state : undefined
}

describe('TAKE', () => {
  it('a Charm goes in the satchel', () => {
    const after = play(offering(['charm']), { type: 'TAKE', id: 'charm' })
    expect(after.run!.charms).toBe(1)
    expect(after.mode).toBe('explore')
  })

  it('a Vial goes in the satchel', () => {
    const after = play(offering(['vial']), { type: 'TAKE', id: 'vial' })
    expect(after.run!.vials).toBe(1)
  })

  it('a named bone below the ceiling adds one to the total', () => {
    const before = offering(['knuckle'], { commonBones: 20 })
    const after = play(before, { type: 'TAKE', id: 'knuckle' })
    expect(totalBones(after.run!)).toBe(21)
    expect(after.run!.commonBones).toBe(20)
    expect(after.run!.specials).toHaveLength(1)
  })

  it('a named bone at the ceiling transmutes one common bone', () => {
    // No replacement picker and no loadout screen. The player asked for the
    // bone; making them choose which anonymous one to sacrifice is a decision
    // with no information in it.
    const before = offering(['knuckle'], { commonBones: 30 })
    expect(totalBones(before.run!)).toBe(BONE_CEILING)
    const after = play(before, { type: 'TAKE', id: 'knuckle' })
    expect(totalBones(after.run!)).toBe(BONE_CEILING)
    expect(after.run!.commonBones).toBe(29)
    expect(after.run!.specials).toHaveLength(1)
  })

  it('gives two of the same type two identities', () => {
    let state = play(offering(['knuckle'], { commonBones: 20 }), { type: 'TAKE', id: 'knuckle' })
    state = { ...state, mode: 'reward', run: { ...state.run!, offer: ['knuckle'] } }
    state = play(state, { type: 'TAKE', id: 'knuckle' })
    const ids = state.run!.specials.map((s) => s.instanceId)
    expect(new Set(ids).size).toBe(2)
  })

  it('repeats the rule it just gave you', () => {
    const after = play(offering(['charm']), { type: 'TAKE', id: 'charm' })
    expect(after.run!.say).toContain(reward('charm').rule)
  })

  it('refuses something that was not offered', () => {
    const before = offering(['charm'])
    expect(reduce(before, { type: 'TAKE', id: 'vial' })).toBe(before)
  })
})

describe('the ceiling and the pool', () => {
  it('drops bone rewards from the pool with thirty specials and no commons', () => {
    // The corner where a named bone has nowhere to go. An offer that cannot be
    // taken is not an offer.
    const stuffed: RunState = {
      ...newRun(1),
      commonBones: 0,
      specials: Array.from({ length: BONE_CEILING }, (_, i) => newSpecial('knuckle', i)),
      nextSpecialSerial: BONE_CEILING,
    }
    for (let seed = 0; seed < 100; seed++) {
      for (const id of offerFor(stuffed, 'gnawing', new Rng(seed * 7919))) {
        expect(isBoneReward(id), `${id} was offered with nowhere to put it`).toBe(false)
      }
    }
  })

  it('keeps offering bones while one common remains to transmute', () => {
    const full: RunState = {
      ...newRun(1),
      commonBones: 1,
      specials: Array.from({ length: 29 }, (_, i) => newSpecial('knuckle', i)),
      nextSpecialSerial: 29,
    }
    let sawBone = false
    for (let seed = 0; seed < 200 && !sawBone; seed++) {
      sawBone = offerFor(full, 'gnawing', new Rng(seed * 7919)).some(isBoneReward)
    }
    expect(sawBone).toBe(true)
  })
})

describe('SKIP', () => {
  it('returns to the room having changed nothing', () => {
    const before = offering(['knuckle', 'charm'], { commonBones: 30 })
    const after = play(before, { type: 'SKIP' })
    expect(after.mode).toBe('explore')
    expect(after.run!.offer).toBeUndefined()
    expect(after.run!.commonBones).toBe(30)
    expect(after.run!.specials).toEqual([])
    expect(after.run!.charms).toBe(0)
  })

  it('is refused outside the reward screen', () => {
    const exploring: GameState = { ...offering([]), mode: 'explore' }
    expect(reduce(exploring, { type: 'SKIP' })).toBe(exploring)
  })
})

describe('determinism', () => {
  it('pays the same whether the death was watched or skipped', () => {
    // A death that is watched calls `victory` from DEFEAT_DONE; one that is
    // not calls it from the SMASH. Both draw from the run's own generator at
    // the same position, so both get the same answer.
    const watched = winAgainstMarrow(11)
    const again = winAgainstMarrow(11)
    expect(watched?.run!.offer).toEqual(again?.run!.offer)
    expect(watched?.mode).toBe(again?.mode)
  })
})
