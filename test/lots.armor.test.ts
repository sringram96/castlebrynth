import { describe, expect, it } from 'vitest'

import { BASE_ARMOR, LADDER, RUSTED_PLATE } from '../src/content/index.js'
import type { Intent } from '../src/lots/index.js'
import { armorAgainst, armorFrom, attack, claim, decide } from '../src/lots/index.js'
import { idsOf, turnOf } from './helpers.js'

/**
 * Armor and resolution — art. 47 as amended (BRACE repealed, armor is a
 * body stat), arts 57 and 65. The order is the demo's: the claims land, the
 * riders fire, then the intent, minus armor, with a floor of nothing.
 */
const SWIPE: Intent = { verb: 'SWIPE', amount: 7 }
const CORRODE: Intent = { verb: 'CORRODE', amount: 9, effect: { kind: 'corrode' } }
const BELLOW: Intent = { verb: 'BELLOW', amount: 16 }

describe('lots — art. 47 (armor is a stat), art. 46 (the floor), art. 65 (corrode)', () => {
  it('sums armor from what is worn, over a bare body of nothing (arts 47, 55)', () => {
    expect(armorFrom([], BASE_ARMOR)).toBe(0)
    expect(armorFrom([RUSTED_PLATE], BASE_ARMOR)).toBe(RUSTED_PLATE.armor)
    expect(armorFrom([RUSTED_PLATE, RUSTED_PLATE], BASE_ARMOR)).toBe(RUSTED_PLATE.armor * 2)
  })

  it('turns armor off for exactly the turn that corrodes it (art. 65)', () => {
    expect(armorAgainst(SWIPE, 3)).toBe(3)
    expect(armorAgainst(CORRODE, 3)).toBe(0)
    // The stat itself never moved: the next intent finds it whole.
    expect(armorAgainst(BELLOW, 3)).toBe(3)
  })

  it('takes the intent minus armor, and never less than nothing (art. 46)', () => {
    const quiet = turnOf([1, 1, 2, 3, 4, 6], { intent: SWIPE })
    const soft = decide(quiet, 'end-turn', 30)
    expect(soft.harmTaken).toBe(0)
    expect(soft.blocked).toBe(SWIPE.amount)

    const bare = decide(quiet, 'end-turn', 0)
    expect(bare.harmTaken).toBe(SWIPE.amount)
    expect(bare.blocked).toBe(0)

    const eaten = decide(turnOf([1, 1, 2, 3, 4, 6], { intent: CORRODE }), 'end-turn', 3)
    expect(eaten.harmTaken).toBe(CORRODE.amount)
    expect(eaten.blocked).toBe(0)
  })

  it('resolves a turn without a combo as armor and patience, not a punishment (art. 46)', () => {
    const quiet = turnOf([1, 2, 2, 4, 4, 6], { intent: SWIPE })
    const resolved = decide(quiet, 'end-turn', 3)
    expect(resolved.harmDealt).toBe(0)
    expect(resolved.harmTaken).toBe(4)
    expect(resolved.linesSpent).toEqual([])
  })

  it('adds every claim into one attack, in claiming order (art. 45)', () => {
    let turn = turnOf([5, 5, 2, 3, 4, 1], { intent: SWIPE })
    turn = claim(turn, idsOf(turn, 0, 1), 'pair', LADDER)
    turn = claim(turn, idsOf(turn, 2, 3, 4), 'run-3', LADDER)
    const pair = 10 * LADDER.pair.multiplier
    const run = 9 * LADDER['run-3'].multiplier
    expect(attack(turn)).toBe(pair + run)

    const resolved = decide(turn, 'end-turn', 3)
    expect(resolved.harmDealt).toBe(pair + run)
    expect(resolved.linesSpent).toEqual(['pair', 'run-3'])
    expect(resolved.harmTaken).toBe(4)
  })

  it('neither deals nor takes when you run — FLEE is always offered (art. 41)', () => {
    let turn = turnOf([5, 5, 2, 3, 4, 1], { intent: BELLOW })
    turn = claim(turn, idsOf(turn, 0, 1), 'pair', LADDER)
    const fled = decide(turn, 'flee', 0)
    expect(fled).toMatchObject({ fled: true, harmDealt: 0, harmTaken: 0, healed: 0 })
  })

  it('resolves the same turn the same way every time', () => {
    const build = () => {
      let turn = turnOf([6, 6, 6, 2, 2, 1], { intent: CORRODE })
      turn = claim(turn, idsOf(turn, 0, 1, 2), 'triple', LADDER)
      return decide(turn, 'end-turn', 3)
    }
    expect(build()).toEqual(build())
  })
})
