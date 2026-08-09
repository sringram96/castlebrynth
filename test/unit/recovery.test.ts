/**
 * Getting bones back, and paying bones out.
 *
 * Three touchpoints and one invariant running through all of them: **nothing
 * resurrects a named bone.** The Font gives commons, a Vial gives commons, and
 * the ceiling is measured against the total with the specials counted in — so
 * a run cannot stack named bones on a full pile and then heal thirty commons
 * back underneath them.
 */

import { describe, expect, it } from 'vitest'
import { FONT_BONUS, VIAL_BONES, fontRestore, loseOneBone, newRun, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { GameState, RitualRoll, RunState } from '../../src/game/state.js'
import { BONE_CEILING, newSpecial, totalBones } from '../../src/content/bones.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

const at = (roomId: string, run: Partial<RunState> = {}, seed = 4): GameState => {
  const base = newRun(seed)
  return {
    version: SAVE_VERSION,
    mode: 'explore',
    meta: EMPTY_META,
    run: { ...base, roomId, path: [...base.path, roomId], ...run },
  }
}

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

  it('restores common bones and records what it gave', () => {
    const state = play(at('sanctuary', { commonBones: 10 }), { type: 'RITUAL_ROLL' })
    const run = state.run!
    expect(run.ritual).toBeDefined()
    expect(run.ritual!.restored).toBe(run.ritual!.roll + FONT_BONUS)
    expect(run.commonBones).toBe(10 + run.ritual!.restored)
    expect(run.ritual!.missingBefore).toBe(BONE_CEILING - 10)
  })

  it('never puts the pile over the ceiling', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const state = play(at('sanctuary', { commonBones: 28 }, seed), { type: 'RITUAL_ROLL' })
      expect(totalBones(state.run!)).toBeLessThanOrEqual(BONE_CEILING)
    }
  })

  it('counts specials against the ceiling', () => {
    // Twenty-eight commons and two named bones is already thirty. The basin
    // has nothing to give, and it says so rather than paying anyway.
    const state = play(
      at('sanctuary', {
        commonBones: 28,
        specials: [newSpecial('knuckle', 0), newSpecial('cinderbone', 1)],
        nextSpecialSerial: 2,
      }),
      { type: 'RITUAL_ROLL' },
    )
    expect(state.run!.ritual!.restored).toBe(0)
    expect(totalBones(state.run!)).toBe(BONE_CEILING)
    expect(state.run!.say).toContain('already full')
  })

  it('never resurrects a named bone', () => {
    const before = at('sanctuary', { commonBones: 10, specials: [], nextSpecialSerial: 3 })
    const after = play(before, { type: 'RITUAL_ROLL' })
    expect(after.run!.specials).toEqual([])
  })

  it('answers once, whatever the thumb does', () => {
    const once = play(at('sanctuary', { commonBones: 10 }), { type: 'RITUAL_ROLL' })
    expect(reduce(once, { type: 'RITUAL_ROLL' })).toBe(once)
  })

  it('withholds the exits until it has been pressed', () => {
    const unpressed = at('sanctuary', { commonBones: 10 })
    expect(reduce(unpressed, { type: 'GO', to: 'reliquary' })).toBe(unpressed)
    const pressed = play(unpressed, { type: 'RITUAL_ROLL' })
    expect(reduce(pressed, { type: 'GO', to: 'reliquary' })).not.toBe(pressed)
  })
})

describe('a vial', () => {
  it('gives five common bones and spends one vial', () => {
    const after = play(at('fork', { commonBones: 10, vials: 2 }), { type: 'DRINK' })
    expect(after.run!.commonBones).toBe(15)
    expect(after.run!.vials).toBe(1)
    expect(VIAL_BONES).toBe(5)
  })

  it('stops at the ceiling and gives only the remainder', () => {
    const after = play(at('fork', { commonBones: 28, vials: 1 }), { type: 'DRINK' })
    expect(totalBones(after.run!)).toBe(BONE_CEILING)
    expect(after.run!.say).toContain('2 bones')
  })

  it('is refused at a full pile, so the vial is not wasted', () => {
    const full = at('fork', { commonBones: 30, vials: 1 })
    expect(reduce(full, { type: 'DRINK' })).toBe(full)
    expect(full.run!.vials).toBe(1)
  })

  it('is refused with an empty satchel', () => {
    const dry = at('fork', { commonBones: 10, vials: 0 })
    expect(reduce(dry, { type: 'DRINK' })).toBe(dry)
  })

  it('never resurrects a named bone', () => {
    const after = play(
      at('fork', { commonBones: 10, vials: 1, specials: [], nextSpecialSerial: 2 }),
      { type: 'DRINK' },
    )
    expect(after.run!.specials).toEqual([])
  })

  it('is legal in a fight, and does not touch the line already thrown', () => {
    const rolled = play(
      at('hollow', { commonBones: 10, vials: 1 }),
      { type: 'FIGHT' },
      { type: 'FIELD', width: 4, specialIds: [] },
      { type: 'THROW' },
    )
    const line = rolled.run!.combat!.playerLine
    const after = reduce(rolled, { type: 'DRINK' })
    expect(after.run!.combat!.playerLine).toEqual(line)
    expect(after.run!.commonBones).toBe(15)
    expect(after.run!.combat!.phase).toBe('rolled')
  })

  it('is refused while a smash is being read', () => {
    const smashed = play(
      at('hollow', { commonBones: 10, vials: 1 }),
      { type: 'FIGHT' },
      { type: 'FIELD', width: 1, specialIds: [] },
      { type: 'THROW' },
      { type: 'SMASH' },
    )
    if (smashed.run?.combat?.phase === 'smashed') {
      expect(reduce(smashed, { type: 'DRINK' })).toBe(smashed)
    }
  })
})

describe('losing one bone outside a fight', () => {
  it('takes a common one first', () => {
    const run = { ...newRun(1), commonBones: 5, specials: [newSpecial('knuckle', 0)] }
    const { run: after, lost } = loseOneBone(run)
    expect(lost.kind).toBe('common')
    expect(after.commonBones).toBe(4)
    expect(after.specials).toHaveLength(1)
  })

  it('takes the oldest named bone when there is nothing anonymous left', () => {
    const run = {
      ...newRun(1),
      commonBones: 0,
      specials: [newSpecial('cinderbone', 0), newSpecial('knuckle', 1)],
    }
    const { run: after, lost } = loseOneBone(run)
    expect(lost).toEqual({ kind: 'special', name: 'Cinderbone' })
    expect(after.specials.map((s) => s.instanceId)).toEqual(['knuckle#1'])
  })

  it('takes nothing from an empty pile, and says so', () => {
    const { took } = loseOneBone({ ...newRun(1), commonBones: 0, specials: [] })
    expect(took).toBe(false)
  })
})

describe('the chain vault', () => {
  const vault = (run: Partial<RunState> = {}): GameState => at('chain-vault', run)

  it('costs exactly one bone for a lever pulled against nothing', () => {
    const after = play(vault({ commonBones: 12 }), { type: 'INTERACT', interactionId: 'vault-lever' })
    expect(after.run!.commonBones).toBe(11)
    expect(after.run!.say).toContain('snaps')
  })

  it('names the named bone it takes', () => {
    const after = play(
      vault({ commonBones: 0, specials: [newSpecial('cinderbone', 0)], nextSpecialSerial: 1 }),
      { type: 'INTERACT', interactionId: 'vault-lever' },
    )
    expect(after.run!.say).toContain('Cinderbone')
    expect(after.run!.specials).toHaveLength(0)
  })

  it('is deterministic: the same pile pays the same bone', () => {
    const start = vault({ commonBones: 0, specials: [newSpecial('knuckle', 0), newSpecial('cinderbone', 1)] })
    const a = play(start, { type: 'INTERACT', interactionId: 'vault-lever' })
    const b = play(start, { type: 'INTERACT', interactionId: 'vault-lever' })
    expect(a.run!.specials).toEqual(b.run!.specials)
  })

  it('can kill the run, and uses the death the game already has', () => {
    const after = play(vault({ commonBones: 1 }), { type: 'INTERACT', interactionId: 'vault-lever' })
    expect(after.mode).toBe('dead')
    expect(totalBones(after.run!)).toBe(0)
    expect(after.run!.cause).toBe('The chain mechanism.')
  })

  it('costs nothing once the cage is on the plate', () => {
    const weighted = play(vault({ commonBones: 12 }), {
      type: 'INTERACT',
      interactionId: 'vault-chain',
    })
    const after = play(weighted, { type: 'INTERACT', interactionId: 'vault-lever' })
    expect(after.run!.commonBones).toBe(12)
    expect(after.mode).toBe('explore')
  })
})
