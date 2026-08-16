/**
 * The pile.
 *
 * One number, and the two constants every rule that gives bones back or takes
 * them away has to agree on. Written out in digits rather than derived from
 * the content, because a test that computes its expectation from the thing it
 * is testing proves nothing.
 *
 * What a bone *does* in a fight is `combat/roll.ts` and `combat/hands.ts`, and
 * it is tested in `hands.test.ts` and `combat.test.ts`. There is no profile
 * table here and there is not to be one: this baseline has one kind of bone.
 */

import { describe, expect, it } from 'vitest'
import { BONE_CEILING, STARTING_BONES, roomToRecover } from '../../src/content/bones.js'
import {
  DIE_FACES,
  MAX_ACTIVE_DICE,
  MAX_ROLLS,
  activeDice,
  canonicalHeld,
  rerollDice,
  rollDice,
} from '../../src/combat/roll.js'
import type { DieValue } from '../../src/combat/roll.js'
import { Rng } from '../../src/game/rng.js'

describe('the pile', () => {
  it('starts a run at the ceiling', () => {
    expect(STARTING_BONES).toBe(BONE_CEILING)
    expect(BONE_CEILING).toBe(30)
  })

  it('measures room to recover against the ceiling', () => {
    expect(roomToRecover({ bones: 30 })).toBe(0)
    expect(roomToRecover({ bones: 29 })).toBe(1)
    expect(roomToRecover({ bones: 20 })).toBe(10)
  })

  it('never offers negative room', () => {
    expect(roomToRecover({ bones: 40 })).toBe(0)
  })
})

describe('how wide an attack is', () => {
  it('is six for anything from six bones up', () => {
    for (const bones of [30, 12, 7, 6]) expect(activeDice(bones)).toBe(6)
    expect(MAX_ACTIVE_DICE).toBe(6)
  })

  it('is the pile itself below six', () => {
    expect(activeDice(5)).toBe(5)
    expect(activeDice(4)).toBe(4)
    expect(activeDice(3)).toBe(3)
    expect(activeDice(2)).toBe(2)
    expect(activeDice(1)).toBe(1)
  })

  it('is nothing at zero, which is the end of the run', () => {
    expect(activeDice(0)).toBe(0)
    expect(activeDice(-4)).toBe(0)
  })
})

describe('throwing', () => {
  it('gives an attack one throw and two more', () => {
    expect(MAX_ROLLS).toBe(3)
  })

  it('is an ordinary d6 and nothing else', () => {
    expect(DIE_FACES).toEqual([1, 2, 3, 4, 5, 6])
    const rolled = rollDice(200, new Rng(12345))
    for (const die of rolled) {
      expect(die).toBeGreaterThanOrEqual(1)
      expect(die).toBeLessThanOrEqual(6)
    }
    expect(new Set(rolled).size).toBe(6)
  })

  it('throws exactly the number asked for', () => {
    for (const count of [0, 1, 4, 6]) {
      expect(rollDice(count, new Rng(7))).toHaveLength(count)
    }
  })

  it('is a pure function of the generator handed in', () => {
    expect(rollDice(6, new Rng(99))).toEqual(rollDice(6, new Rng(99)))
  })
})

describe('holding', () => {
  const table: readonly DieValue[] = [6, 1, 5, 2, 4, 3]

  it('keeps a held bone in the position it was standing in', () => {
    const after = rerollDice(table, [0, 2], new Rng(5))
    expect(after[0]).toBe(6)
    expect(after[2]).toBe(5)
    expect(after).toHaveLength(6)
  })

  it('throws everything else', () => {
    const a = rerollDice(table, [0], new Rng(5))
    const b = rerollDice(table, [0], new Rng(6))
    // Two different generators, one held position: the rest cannot all agree.
    expect(a.slice(1)).not.toEqual(b.slice(1))
  })

  it('canonicalises a list of positions: unique, whole, in range, in order', () => {
    // 1.5 is not a die, so it is dropped rather than rounded into one.
    expect(canonicalHeld([2, 0, 0, 2, -1, 99, 6, 1.5], 6)).toEqual([0, 2])
    expect(canonicalHeld([], 6)).toEqual([])
    expect(canonicalHeld([0, 1, 2], 0)).toEqual([])
  })

  it('cannot be corrupted by a stale position from a wider throw', () => {
    // Four bones left, and a hold list written when there were six.
    const narrow: readonly DieValue[] = [6, 6, 1, 1]
    expect(rerollDice(narrow, [0, 4, 5], new Rng(3))[0]).toBe(6)
    expect(rerollDice(narrow, [0, 4, 5], new Rng(3))).toHaveLength(4)
  })
})
