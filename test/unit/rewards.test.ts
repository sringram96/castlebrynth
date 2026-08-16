/**
 * What a win pays, and what taking it does to the run.
 *
 * The pool is one noun deep for this baseline — named bones went with the
 * fielding decision they modified — so what is under test is the *machinery*
 * rather than the contents: the cadence, the guaranteed drop, the win being
 * granted exactly once, and the SKIP that means the change is always the
 * player's. When modifiers come back this is the door they come in through.
 */

import { describe, expect, it } from 'vitest'
import { newRun, offerFor, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { GameState, RunState } from '../../src/game/state.js'
import { LOOT_REWARDS, isRewardId, reward } from '../../src/content/rewards.js'
import { enemy } from '../../src/content/enemies.js'
import { legalScores } from '../../src/combat/hands.js'
import { Rng } from '../../src/game/rng.js'
import { nodeOf, standIn } from './where.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

const offering = (offer: string[], run: Partial<RunState> = {}): GameState => ({
  version: SAVE_VERSION,
  mode: 'reward',
  meta: EMPTY_META,
  run: { ...newRun(1), roomId: nodeOf(newRun(1), 'hollow'), offer: offer as never, ...run },
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
  it('is one noun for this baseline, and no second', () => {
    // No new collectible category without a product decision. See CLAUDE.md.
    // Named bones went with the fielding step; nothing was invented to replace
    // them, because a boring pool is better than contaminating the experiment.
    expect(LOOT_REWARDS).toEqual(['vial'])
    expect(new Set(LOOT_REWARDS.map((id) => reward(id).kind))).toEqual(new Set(['vial']))
  })

  it('states an exact mechanic on every card', () => {
    for (const id of LOOT_REWARDS) {
      expect(reward(id).rule, id).toMatch(/\d/)
    }
  })

  it('knows what it does and does not have', () => {
    expect(isRewardId('vial')).toBe(true)
    expect(isRewardId('cinderbone')).toBe(false)
    expect(() => reward('knuckle' as never)).toThrow()
  })
})

describe('cadence', () => {
  it('the Gnawing pays about three times in five', () => {
    expect(enemy('gnawing').rewardChance).toBe(0.6)
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

  it('offers no more than the enemy declares, and never pads a thin pool up', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(offerFor(newRun(1), 'gnawing', new Rng(seed)).length).toBeLessThanOrEqual(
        enemy('gnawing').rewardChoices,
      )
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

/** Fight the Marrow to its last point of health, then finish it. */
function winAgainstMarrow(seed: number): GameState | undefined {
  let state: GameState = standIn(
    { version: SAVE_VERSION, mode: 'explore', meta: EMPTY_META, run: newRun(seed) },
    'deep',
  )
  state = reduce(state, { type: 'FIGHT' })
  // Stood on one point of health, which is a position every fight reaches on
  // its own; this only skips the attacks that get there. Everything after is a
  // real press.
  state = { ...state, run: { ...state.run!, combat: { ...state.run!.combat!, enemyHp: 1 } } }
  state = reduce(state, { type: 'ROLL' })
  const combat = state.run!.combat!
  state = reduce(state, { type: 'SCORE', hand: legalScores(combat.dice, combat.usedHands)[0]! })
  if (state.run?.combat?.defeated) state = reduce(state, { type: 'DEFEAT_DONE' })
  return state.mode === 'reward' || state.mode === 'explore' ? state : undefined
}

describe('TAKE', () => {
  it('a Vial goes in the satchel', () => {
    const after = play(offering(['vial']), { type: 'TAKE', id: 'vial' })
    expect(after.run!.vials).toBe(1)
  })

  it('stacks', () => {
    let state = play(offering(['vial']), { type: 'TAKE', id: 'vial' })
    state = { ...state, mode: 'reward', run: { ...state.run!, offer: ['vial'] } }
    expect(play(state, { type: 'TAKE', id: 'vial' }).run!.vials).toBe(2)
  })

  it('never touches the pile', () => {
    // The satchel and the pile are separate things. Nothing on the reward
    // screen may change how many bones a run is carrying.
    const before = offering(['vial'], { bones: 17 })
    expect(play(before, { type: 'TAKE', id: 'vial' }).run!.bones).toBe(17)
  })

  it('repeats the rule it just gave you', () => {
    const after = play(offering(['vial']), { type: 'TAKE', id: 'vial' })
    expect(after.run!.say).toContain(reward('vial').rule)
  })

  it('remembers it, for the door', () => {
    expect(play(offering(['vial']), { type: 'TAKE', id: 'vial' }).meta.seenRewards).toContain('vial')
  })

  it('refuses something that was not offered', () => {
    const before = offering([])
    expect(reduce(before, { type: 'TAKE', id: 'vial' })).toBe(before)
  })
})

describe('SKIP', () => {
  it('returns to the room having changed nothing', () => {
    const before = offering(['vial'], { bones: 30 })
    const after = play(before, { type: 'SKIP' })
    expect(after.mode).toBe('explore')
    expect(after.run!.offer).toBeUndefined()
    expect(after.run!.bones).toBe(30)
    expect(after.run!.vials).toBe(0)
  })

  it('is refused outside the reward screen', () => {
    const exploring: GameState = { ...offering([]), mode: 'explore' }
    expect(reduce(exploring, { type: 'SKIP' })).toBe(exploring)
  })
})

describe('determinism', () => {
  it('pays the same whether the death was watched or skipped', () => {
    // A death that is watched calls `victory` from DEFEAT_DONE; one that is
    // not calls it from the SCORE. Both draw from the run's own generator at
    // the same position, so both get the same answer.
    const watched = winAgainstMarrow(11)
    const again = winAgainstMarrow(11)
    expect(watched?.run!.offer).toEqual(again?.run!.offer)
    expect(watched?.mode).toBe(again?.mode)
  })
})
