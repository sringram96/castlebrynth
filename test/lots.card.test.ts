import { describe, expect, it } from 'vitest'

import { LADDER, PAIRISH } from '../src/content/index.js'
import type { Intent } from '../src/lots/index.js'
import {
  LINES,
  claim,
  claimable,
  disband,
  freshCard,
  sealed,
  unspent,
  unused,
  withheld,
} from '../src/lots/index.js'
import { idsOf, turnOf } from './helpers.js'

/**
 * The card — arts 63–65. Every line claimable once per fight; the card is
 * the fight's fuse, made of your own spending.
 */
const SEAL: Intent = {
  verb: 'SEAL',
  amount: 6,
  effect: { kind: 'seal', lines: PAIRISH },
}

describe('lots — art. 63 (once per fight), art. 64 (one line per composite), art. 65 (seal)', () => {
  it('starts a fight with every line unspent (art. 63)', () => {
    expect(unspent(freshCard())).toEqual(LINES)
  })

  it('spends a line when it is claimed, and refuses it twice (art. 63)', () => {
    const turn = turnOf([4, 4, 2, 2, 5, 1])
    const once = claim(turn, idsOf(turn, 0, 1), 'pair', LADDER)
    expect(once.card.pair).toBe(true)
    expect(claimable(once, idsOf(once, 2, 3), LADDER)).not.toContain('pair')
    expect(() => claim(once, idsOf(once, 2, 3), 'pair', LADDER)).toThrow()
  })

  it('gives the line and the dice back when a claim is disbanded', () => {
    const turn = turnOf([4, 4, 2, 2, 5, 1])
    const once = claim(turn, idsOf(turn, 0, 1), 'pair', LADDER)
    const undone = disband(once, 'pair')
    expect(undone.card.pair).toBe(false)
    expect(undone.claims).toEqual([])
    expect(claimable(undone, idsOf(undone, 0, 1), LADDER)).toContain('pair')
  })

  it('spends a die in at most one claim per turn (art. 45)', () => {
    const turn = turnOf([4, 4, 4, 2, 2, 1])
    const once = claim(turn, idsOf(turn, 0, 1), 'pair', LADDER)
    // The third four is free; the two already claimed are not.
    expect(claimable(once, idsOf(once, 0, 1, 2), LADDER)).toEqual(['any-dice'])
    expect(unused(once).map((l) => l.die)).toEqual(idsOf(once, 2, 3, 4, 5))
  })

  it('shuts exactly the lines a sealing intent names, and no others (art. 65)', () => {
    expect(sealed(SEAL)).toEqual(PAIRISH)
    const turn = turnOf([4, 4, 2, 2, 5, 1], { intent: SEAL })
    expect(claimable(turn, idsOf(turn, 0, 1), LADDER)).toEqual(['any-dice'])
    expect(claimable(turn, idsOf(turn, 0, 1, 2, 3), LADDER)).toEqual(['any-dice'])
    // A run is not pair-shaped, so the seal never touches it.
    const runner = turnOf([1, 2, 3, 5, 5, 6], { intent: SEAL })
    expect(claimable(runner, idsOf(runner, 0, 1, 2), LADDER)).toContain('run-3')
  })

  it('leaves an empty card with nothing to claim — armor and patience (art. 63)', () => {
    const spentAll = Object.fromEntries(LINES.map((line) => [line, true]))
    const turn = turnOf([6, 6, 6, 6, 6, 6], { card: spentAll as never })
    expect(claimable(turn, idsOf(turn, 0, 1), LADDER)).toEqual([])
  })
})

/**
 * arts 63, 65, 72, 118 — **what is holding this shape shut.**
 *
 * The playtest defect: a full house lying on the table on a SEAL turn is
 * offered as ANY DICE, and the tray called that *the best these make* — a
 * sentence that is true of dice that make nothing and false about a full
 * house. `claimable` cannot tell the two apart because both come back as the
 * floor alone; this is the question that can.
 */
describe('lots — arts 63, 65: why a shape is not on offer', () => {
  it('says nothing when the line these dice make is claimable', () => {
    const turn = turnOf([4, 4, 4, 2, 2, 1])
    expect(withheld(turn, idsOf(turn, 0, 1, 2, 3, 4))).toBeNull()
    expect(claimable(turn, idsOf(turn, 0, 1, 2, 3, 4), LADDER)).toContain('full-house')
  })

  it('says nothing when the dice make no line above the floor', () => {
    const turn = turnOf([1, 2, 4, 6, 3, 5])
    // A stray pair of values with nothing between them: the floor, honestly.
    expect(withheld(turn, idsOf(turn, 0, 3))).toBeNull()
  })

  it('names the seal when this turn’s intent shut the shape (art. 65)', () => {
    const turn = turnOf([4, 4, 4, 2, 2, 1], { intent: SEAL })
    const shape = idsOf(turn, 0, 1, 2, 3, 4)
    // The shape is there, and the only thing on offer is the floor.
    expect(claimable(turn, shape, LADDER)).toEqual(['any-dice'])
    expect(withheld(turn, shape)).toEqual({ line: 'full-house', why: 'sealed' })
  })

  it('names the card when the line is already spent this fight (art. 63)', () => {
    const spent = { ...freshCard(), 'full-house': true }
    const turn = turnOf([4, 4, 4, 2, 2, 1], { card: spent })
    const shape = idsOf(turn, 0, 1, 2, 3, 4)
    expect(claimable(turn, shape, LADDER)).toEqual(['any-dice'])
    expect(withheld(turn, shape)).toEqual({ line: 'full-house', why: 'spent' })
  })

  it('names the seal first when both hold — one of them lifts next turn', () => {
    const spent = { ...freshCard(), 'full-house': true }
    const turn = turnOf([4, 4, 4, 2, 2, 1], { card: spent, intent: SEAL })
    expect(withheld(turn, idsOf(turn, 0, 1, 2, 3, 4))?.why).toBe('sealed')
  })

  it('reads the shape and not the hand — the exact selection (art. 72)', () => {
    const turn = turnOf([4, 4, 4, 2, 2, 1], { intent: SEAL })
    // All six make nothing, so nothing is being withheld from them.
    expect(withheld(turn, idsOf(turn, 0, 1, 2, 3, 4, 5))).toBeNull()
    // The pair inside them is sealed, and named as the pair it is.
    expect(withheld(turn, idsOf(turn, 3, 4))).toEqual({ line: 'pair', why: 'sealed' })
  })

  it('says nothing about a selection with no dice in it', () => {
    const turn = turnOf([4, 4, 4, 2, 2, 1], { intent: SEAL })
    expect(withheld(turn, [])).toBeNull()
  })
})
