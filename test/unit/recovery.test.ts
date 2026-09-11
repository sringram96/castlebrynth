/**
 * Getting bones back, and paying bones out.
 *
 * Three touchpoints and one number: `run.bones` is the pile, the ceiling is
 * thirty, and everything that gives bones back or takes them away measures
 * against those two and nothing else. There is no second life field to keep in
 * step, which is most of why this file is short.
 */

import { describe, expect, it } from 'vitest'
import {
  FONT_BONUS,
  VIAL_BONES,
  fontRestore,
  loseBones,
  newRun,
  reduce,
} from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { GameState, RitualRoll, RunState } from '../../src/game/state.js'
import { BONE_CEILING } from '../../src/content/bones.js'
import { HAND_DICE } from '../../src/combat/roll.js'
import { roomAt } from '../../src/game/map.js'
import { nodeOf, seedWith } from './where.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/**
 * Standing in a room, named by its authored template.
 *
 * The route is generated, so the template has to be resolved to whichever node
 * of this run's map used it — a test may not invent a room the director did
 * not build.
 */
const at = (templateId: string, run: Partial<RunState> = {}, from = 4): GameState => {
  // A descent that actually contains the room: there is no Font at all in THE
  // TITHE, so a spec about the Font asks for a grammar that has one.
  const base = newRun(seedWith(templateId, from))
  const roomId = nodeOf(base, templateId)
  return {
    version: SAVE_VERSION,
    mode: 'explore',
    meta: EMPTY_META,
    run: { ...base, roomId, path: [...base.path, roomId], ...run },
  }
}

/** The node one way on from here. A press carries these, not template ids. */
const onward = (state: GameState): string => roomAt(state.run!).exits[0]!.to

describe('the font', () => {
  it('gives the face plus two', () => {
    for (let roll = 1; roll <= 6; roll++) {
      expect(fontRestore(roll as RitualRoll, 99)).toBe(roll + FONT_BONUS)
    }
    expect(FONT_BONUS).toBe(2)
  })

  it('is capped by the room left, never by the face', () => {
    expect(fontRestore(6, 3)).toBe(3)
    expect(fontRestore(1, 0)).toBe(0)
  })

  it('restores bones and records what it gave', () => {
    const state = play(at('sanctuary', { bones: 10 }), { type: 'RITUAL_ROLL' })
    const run = state.run!
    expect(run.ritual).toBeDefined()
    expect(run.ritual!.restored).toBe(run.ritual!.roll + FONT_BONUS)
    expect(run.bones).toBe(10 + run.ritual!.restored)
    expect(run.ritual!.missingBefore).toBe(BONE_CEILING - 10)
  })

  it('never puts the pile over the ceiling', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const state = play(at('sanctuary', { bones: 28 }, seed), { type: 'RITUAL_ROLL' })
      expect(state.run!.bones).toBeLessThanOrEqual(BONE_CEILING)
    }
  })

  it('says so plainly at a full pile rather than paying nothing quietly', () => {
    const state = play(at('sanctuary', { bones: 30 }), { type: 'RITUAL_ROLL' })
    expect(state.run!.ritual!.restored).toBe(0)
    expect(state.run!.bones).toBe(BONE_CEILING)
    expect(state.run!.say).toContain('already full')
  })

  it('answers once, whatever the thumb does', () => {
    const once = play(at('sanctuary', { bones: 10 }), { type: 'RITUAL_ROLL' })
    expect(reduce(once, { type: 'RITUAL_ROLL' })).toBe(once)
  })

  it('withholds the exits until it has been pressed', () => {
    const unpressed = at('sanctuary', { bones: 10 })
    const on = onward(unpressed)
    expect(reduce(unpressed, { type: 'GO', to: on })).toBe(unpressed)
    const pressed = play(unpressed, { type: 'RITUAL_ROLL' })
    expect(reduce(pressed, { type: 'GO', to: on })).not.toBe(pressed)
  })
})

describe('a vial', () => {
  it('gives five bones and spends one vial', () => {
    const after = play(at('fork', { bones: 10, vials: 2 }), { type: 'DRINK' })
    expect(after.run!.bones).toBe(15)
    expect(after.run!.vials).toBe(1)
    expect(VIAL_BONES).toBe(5)
  })

  it('stops at the ceiling and gives only the remainder', () => {
    const after = play(at('fork', { bones: 28, vials: 1 }), { type: 'DRINK' })
    expect(after.run!.bones).toBe(BONE_CEILING)
    expect(after.run!.say).toContain('2 bones')
  })

  it('is refused at a full pile, so the vial is not wasted', () => {
    const full = at('fork', { bones: 30, vials: 1 })
    expect(reduce(full, { type: 'DRINK' })).toBe(full)
    expect(full.run!.vials).toBe(1)
  })

  it('is refused with an empty satchel', () => {
    const dry = at('fork', { bones: 10, vials: 0 })
    expect(reduce(dry, { type: 'DRINK' })).toBe(dry)
  })

  it('buys exchanges rather than dice: the hand was already six', () => {
    // The pile is no longer the width of the hand. A Vial drunk at three bones
    // does not widen anything — the attack was throwing six before it and is
    // throwing six after it. What it buys is another exchange survived, which
    // is the whole of what bones are for now.
    const facing = play(at('hollow', { bones: 3, vials: 1 }), { type: 'FIGHT' })
    const thin = reduce(facing, { type: 'ROLL' })
    expect(thin.run!.combat!.dice).toHaveLength(HAND_DICE)

    const after = reduce(facing, { type: 'DRINK' })
    expect(after.run!.bones).toBe(8)
    expect(after.run!.combat!.dice).toEqual([])
    expect(reduce(after, { type: 'ROLL' }).run!.combat!.dice).toHaveLength(HAND_DICE)
  })

  it('is refused over a death that is being watched', () => {
    const open = play(at('hollow', { bones: 10, vials: 1 }), { type: 'FIGHT' })
    const dying: GameState = {
      ...open,
      run: { ...open.run!, combat: { ...open.run!.combat!, defeated: true } },
    }
    expect(reduce(dying, { type: 'DRINK' })).toBe(dying)
  })
})

describe('losing bones outside a fight', () => {
  it('takes exactly what was asked for', () => {
    const { run: after, took } = loseBones({ ...newRun(1), bones: 5 }, 1)
    expect(took).toBe(1)
    expect(after.bones).toBe(4)
  })

  it('takes several, for a room that charges several', () => {
    // The Offertory's toll is two. One helper, so every non-combat cost in the
    // game spends the pile the same way.
    const { run: after, took } = loseBones({ ...newRun(1), bones: 5 }, 2)
    expect(took).toBe(2)
    expect(after.bones).toBe(3)
  })

  it('takes what is there and says so, when the pile is short', () => {
    const { run: after, took } = loseBones({ ...newRun(1), bones: 1 }, 2)
    expect(took).toBe(1)
    expect(after.bones).toBe(0)
  })

  it('takes nothing from an empty pile, and says so', () => {
    const { run: after, took } = loseBones({ ...newRun(1), bones: 0 }, 1)
    expect(took).toBe(0)
    expect(after.bones).toBe(0)
  })
})

describe('the chain vault', () => {
  const vault = (run: Partial<RunState> = {}): GameState => at('chain-vault', run)

  it('costs exactly one bone for a lever pulled against nothing', () => {
    const after = play(vault({ bones: 12 }), { type: 'INTERACT', interactionId: 'vault-lever' })
    expect(after.run!.bones).toBe(11)
    expect(after.run!.say).toContain('snaps')
  })

  it('can kill the run, and uses the death the game already has', () => {
    const after = play(vault({ bones: 1 }), { type: 'INTERACT', interactionId: 'vault-lever' })
    expect(after.mode).toBe('dead')
    expect(after.run!.bones).toBe(0)
    expect(after.run!.cause).toBe('The chain mechanism.')
  })

  it('costs nothing once the cage is on the plate', () => {
    const weighted = play(vault({ bones: 12 }), {
      type: 'INTERACT',
      interactionId: 'vault-chain',
    })
    const after = play(weighted, { type: 'INTERACT', interactionId: 'vault-lever' })
    expect(after.run!.bones).toBe(12)
    expect(after.mode).toBe('explore')
  })
})
