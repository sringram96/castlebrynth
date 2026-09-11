/**
 * What a win pays, where it lies, and what picking it up does to the run.
 *
 * **There is no reward screen.** What a fight pays falls beside the body as
 * room objects; what a chest holds is an object in the chest. So what is under
 * test here is the loot record — the draw happening once and being written onto
 * the node, the caps being the reducer's, walking away being legal, and a
 * placed find beating the pool.
 */

import { describe, expect, it } from 'vitest'
import { canTake, lootIn, newRun, offerFor, reduce, unclaimedIn } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { GameState, RunState } from '../../src/game/state.js'
import { LOOT_REWARDS, REWARDS, isRewardId, itemDieOf, reward } from '../../src/content/rewards.js'
import type { RewardId } from '../../src/content/rewards.js'
import { ITEM_DICE } from '../../src/content/dice.js'
import { enemy } from '../../src/content/enemies.js'
import { legalScores } from '../../src/combat/hands.js'
import { Rng } from '../../src/game/rng.js'
import { nodeOf, standIn } from './where.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/** A run standing in the Hollow with things lying on its floor. */
const lying = (ids: readonly RewardId[], run: Partial<RunState> = {}): GameState => {
  const base = newRun(1)
  const roomId = nodeOf(base, 'hollow')
  return {
    version: SAVE_VERSION,
    mode: 'explore',
    meta: EMPTY_META,
    run: {
      ...base,
      roomId,
      cleared: [...base.cleared, roomId],
      loot: { [roomId]: ids.map((id) => ({ id, taken: false })) },
      ...run,
    },
  }
}

/** How often an enemy pays anything at all, over many seeds. */
function payRate(enemyId: string, trials = 600): number {
  const run = newRun(1)
  let paid = 0
  for (let seed = 0; seed < trials; seed++) {
    if (offerFor(run, enemyId, new Rng(seed * 2654435761)).length > 0) paid += 1
  }
  return paid / trials
}

describe('the reward table', () => {
  it('names every carried thing in the game, and invents none', () => {
    // No new collectible category without a product decision. See CLAUDE.md.
    // What grew here is **placement**, not vocabulary: the iron die and the
    // talisman stopped being starting equipment and became things that are
    // found, so they need cards. Nothing was invented alongside them.
    expect(new Set(Object.keys(REWARDS))).toEqual(
      new Set(['vial', 'grave-candle', 'splinter-fetish', 'rustplate', 'pair-talisman']),
    )
    expect(new Set(Object.values(REWARDS).map((r) => r.kind))).toEqual(
      new Set(['vial', 'item-die', 'iron-die', 'talisman']),
    )
  })

  it('draws only what may be drawn: the placed things are placed', () => {
    // The Rustplate is in the cage and the Talisman is in the Reliquary. If
    // either could also be rolled out of a chest, the route would stop being a
    // build choice and start being a lottery.
    expect(LOOT_REWARDS).toEqual(['vial', 'grave-candle', 'splinter-fetish'])
    expect(LOOT_REWARDS).not.toContain('rustplate')
    expect(LOOT_REWARDS).not.toContain('pair-talisman')
  })

  it('prints a carried thing’s own faces on its card, rather than restating them', () => {
    // The card and the cascade read one table, for the same reason every
    // multiplier lives in HAND_DEFINITIONS: a rule written down twice is a
    // rule that will disagree with itself.
    for (const id of Object.keys(REWARDS) as RewardId[]) {
      const die = itemDieOf(id)
      if (!die) continue
      expect(reward(id).rule).toBe(ITEM_DICE[die]!.rule)
      expect(reward(id).name).toBe(ITEM_DICE[die]!.name)
    }
  })

  it('states an exact mechanic on every card', () => {
    for (const id of Object.keys(REWARDS) as RewardId[]) {
      expect(reward(id).rule, id).toMatch(/\d/)
    }
  })

  it('carries a short name a pill can hold', () => {
    // A found thing lies in the room with its name on it, and a phone is 390 px
    // wide. `Talisman of the Pair` is not a pill; `PAIR` is.
    for (const id of Object.keys(REWARDS) as RewardId[]) {
      expect(reward(id).short.length, id).toBeLessThanOrEqual(6)
      expect(reward(id).short, id).toBe(reward(id).short.toUpperCase())
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

  it('never offers the same thing twice out of one body', () => {
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

describe('what falls beside the body', () => {
  it('lands in the room rather than on a screen', () => {
    const won = winAgainstMarrow(3)
    expect(won).toBeDefined()
    // The whole ruling, in one assertion: a win goes back to the room.
    expect(won!.mode).toBe('explore')
    expect(lootIn(won!.run!).length).toBeGreaterThan(0)
  })

  it('the Marrow’s Vial and its rolled offer are separate objects', () => {
    // Not one card with two things on it. The guaranteed drop is placed first
    // and once, so it never rides on the 70% that decides whether anything
    // else fell.
    expect(enemy('marrow').drop).toBe('vial')
    let sawTwo = false
    let sawOne = false
    for (let seed = 1; seed <= 40 && !(sawTwo && sawOne); seed++) {
      const won = winAgainstMarrow(seed)
      if (!won) continue
      const fell = lootIn(won.run!)
      expect(fell[0]?.id).toBe('vial')
      if (fell.length > 1) sawTwo = true
      else sawOne = true
    }
    expect(sawTwo && sawOne, 'both a paying and a non-paying Marrow win were seen').toBe(true)
  })

  it('is not carried until it is picked up', () => {
    const won = winAgainstMarrow(3)!
    // Seeing a thing is not having it. The satchel is empty until TAKE.
    expect(won.run!.vials).toBe(0)
    expect(won.meta.seenRewards).toEqual([])
  })

  it('pays exactly once', () => {
    const won = winAgainstMarrow(3)!
    // The win is granted in one place and `combat` is gone from the state it
    // returns, so there is no second call with a fight left to win.
    expect(reduce(won, { type: 'DEFEAT_DONE' })).toBe(won)
    expect(lootIn(won.run!).length).toBe(lootIn(reduce(won, { type: 'DEFEAT_DONE' }).run!).length)
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
  return state.mode === 'explore' ? state : undefined
}

describe('TAKE', () => {
  it('a Vial goes in the satchel', () => {
    const after = play(lying(['vial']), { type: 'TAKE', index: 0 })
    expect(after.run!.vials).toBe(1)
  })

  it('picks the thing that was pressed, not the first of its kind', () => {
    const after = play(lying(['vial', 'grave-candle']), { type: 'TAKE', index: 1 })
    expect(after.run!.itemDice).toEqual(['grave-candle'])
    expect(after.run!.vials).toBe(0)
    expect(unclaimedIn(after.run!).map((l) => l.id)).toEqual(['vial'])
  })

  it('stacks', () => {
    const state = play(lying(['vial', 'vial']), { type: 'TAKE', index: 0 }, { type: 'TAKE', index: 1 })
    expect(state.run!.vials).toBe(2)
  })

  it('never touches the pile', () => {
    // The satchel and the pile are separate things. Picking a thing up may
    // never change how many bones a run is carrying.
    const before = lying(['vial'], { bones: 17 })
    expect(play(before, { type: 'TAKE', index: 0 }).run!.bones).toBe(17)
  })

  it('repeats the rule it just gave you', () => {
    const after = play(lying(['vial']), { type: 'TAKE', index: 0 })
    expect(after.run!.say).toContain(reward('vial').rule)
  })

  it('remembers it, for the door', () => {
    expect(play(lying(['vial']), { type: 'TAKE', index: 0 }).meta.seenRewards).toContain('vial')
  })

  it('cannot be taken twice', () => {
    const once = play(lying(['vial']), { type: 'TAKE', index: 0 })
    expect(reduce(once, { type: 'TAKE', index: 0 })).toBe(once)
    expect(once.run!.vials).toBe(1)
  })

  it('refuses an index nothing is lying at', () => {
    const before = lying(['vial'])
    expect(reduce(before, { type: 'TAKE', index: 4 })).toBe(before)
    expect(reduce(before, { type: 'TAKE', index: -1 })).toBe(before)
  })

  it('refuses a third item die, in the reducer', () => {
    // The cap is enforced here and not by the thing that offered it. The view
    // draws no TAKE, and the LOOK prints the refusal as a sentence.
    const full = lying(['splinter-fetish'], { itemDice: ['grave-candle', 'splinter-fetish'] })
    expect(canTake(full.run!, 'splinter-fetish')).toBe(false)
    expect(reduce(full, { type: 'TAKE', index: 0 })).toBe(full)
    expect(full.run!.itemDice.length).toBe(2)
  })

  it('refuses a second iron die, and a talisman already carried', () => {
    const ironed = lying(['rustplate'], { ironDice: ['rustplate'] })
    expect(canTake(ironed.run!, 'rustplate')).toBe(false)
    expect(reduce(ironed, { type: 'TAKE', index: 0 })).toBe(ironed)

    const charmed = lying(['pair-talisman'], { talismans: ['pair-talisman'] })
    expect(canTake(charmed.run!, 'pair-talisman')).toBe(false)
    expect(reduce(charmed, { type: 'TAKE', index: 0 })).toBe(charmed)
  })

  it('puts the iron and the talisman where they belong', () => {
    const iron = play(lying(['rustplate']), { type: 'TAKE', index: 0 })
    expect(iron.run!.ironDice).toEqual(['rustplate'])
    const charm = play(lying(['pair-talisman']), { type: 'TAKE', index: 0 })
    expect(charm.run!.talismans).toEqual(['pair-talisman'])
  })
})

describe('walking away', () => {
  it('is legal, and the thing stays behind', () => {
    const before = lying(['vial'], { bones: 30 })
    const exits = before.run!.map.nodes[before.run!.roomId]!.exits
    const after = play(before, { type: 'GO', to: exits[0]!.to })
    expect(after.mode).toBe('explore')
    expect(after.run!.vials).toBe(0)
    expect(after.run!.bones).toBe(30)
    // Still recorded, on the room it was left in. A forward DAG means it stays
    // there; nothing deletes it, because nothing needs to.
    expect(unclaimedIn(after.run!, before.run!.roomId).map((l) => l.id)).toEqual(['vial'])
  })

  it('says so, on the way through', () => {
    const before = lying(['vial'])
    const exits = before.run!.map.nodes[before.run!.roomId]!.exits
    const after = play(before, { type: 'GO', to: exits[0]!.to })
    expect(after.run!.say).toContain('The door does not open twice')
  })

  it('says nothing about it when there was nothing to leave', () => {
    const before = lying([])
    const exits = before.run!.map.nodes[before.run!.roomId]!.exits
    const after = play(before, { type: 'GO', to: exits[0]!.to })
    expect(after.run!.say).not.toContain('The door does not open twice')
  })
})

describe('determinism', () => {
  it('pays the same whether the death was watched or skipped', () => {
    // A death that is watched calls `victory` from DEFEAT_DONE; one that is
    // not calls it from the SCORE. Both draw from the run's own generator at
    // the same position, so both get the same answer.
    const watched = winAgainstMarrow(11)
    const again = winAgainstMarrow(11)
    expect(lootIn(watched!.run!)).toEqual(lootIn(again!.run!))
    expect(watched?.mode).toBe(again?.mode)
  })
})
