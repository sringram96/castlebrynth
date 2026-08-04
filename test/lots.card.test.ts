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
