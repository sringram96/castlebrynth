import { describe, expect, it } from 'vitest'

import {
  LADDER,
  LEECH,
  PLAIN_BONE,
  RUSTED_PLATE,
  THE_LEECH,
  THE_ORPHAN,
  THE_OSSUARY,
  THE_SISTERS,
  THE_ZEALOT,
} from '../src/content/index.js'
import type { Goods, Intent } from '../src/lots/index.js'
import { attack, audit, claim, decide, harm, keep } from '../src/lots/index.js'
import { bone, idsOf, turnOf } from './helpers.js'

/**
 * The company a hand keeps — arts 49–56 as amended, plus the ruling of
 * 2026-08-04: the Sisters' ghost is taxed by a curse, and the bond fires
 * only on the exact two-die pair claim.
 */
const SWIPE: Intent = { verb: 'SWIPE', amount: 7 }
const COVET: Intent = { verb: 'COVET', amount: 5, effect: { kind: 'curse', value: 6 } }

const ossuary: Goods = { talismans: [THE_OSSUARY], riders: [] }
const zealot: Goods = { talismans: [THE_ZEALOT], riders: [] }
const leech: Goods = { talismans: [], riders: [LEECH] }

describe('lots — art. 51 (riders), art. 52 (bonds), art. 53 (talismans), art. 47 (wearables)', () => {
  it('fires a rider only when its face is spent in a claim (art. 51)', () => {
    const dice = [THE_LEECH, bone(1), bone(2), bone(3), bone(4), bone(5)]
    let spent = turnOf([6, 6, 2, 3, 4, 1], { dice, intent: SWIPE })
    spent = claim(spent, idsOf(spent, 0, 1), 'pair', LADDER)
    expect(decide(spent, 'end-turn', 0, leech).healed).toBe(LEECH.onUse.amount)

    // Kept, and never claimed: the six does nothing (art. 51).
    const held = keep(turnOf([6, 6, 2, 3, 4, 1], { dice, intent: SWIPE }), [THE_LEECH.id])
    expect(decide(held, 'end-turn', 0, leech).healed).toBe(0)

    // Claimed, but the Leech's own face is a five: nothing fires.
    let elsewhere = turnOf([5, 2, 2, 3, 4, 1], { dice, intent: SWIPE })
    elsewhere = claim(elsewhere, idsOf(elsewhere, 1, 2), 'pair', LADDER)
    expect(decide(elsewhere, 'end-turn', 0, leech).healed).toBe(0)
  })

  it('joins a ghost sister to a matching pair, at triple tier (art. 52)', () => {
    const dice = [THE_SISTERS[0], THE_SISTERS[1], bone(2), bone(3), bone(4), bone(5)]
    let turn = turnOf([4, 4, 1, 2, 3, 6], { dice, intent: SWIPE })
    turn = claim(turn, idsOf(turn, 0, 1), 'pair', LADDER)
    const made = turn.claims[0]!
    expect(made.bond).toBe(THE_SISTERS[0].bond)
    // Three fours, not two, and the PAIR line at the triple's tier.
    expect(made.sum).toBe(12)
    expect(made.tier.multiplier).toBe(LADDER.triple.multiplier)
    expect(harm(made)).toBe(12 * LADDER.triple.multiplier)
    expect(turn.card.pair).toBe(true)
    expect(turn.card.triple).toBe(false)
  })

  it('refuses the ghost to unequal sisters, and to a composite (art. 52, the ruling)', () => {
    const dice = [THE_SISTERS[0], THE_SISTERS[1], bone(2), bone(3), bone(4), bone(5)]
    // Unequal: not a pair at all, so there is nothing for the bond to join.
    const uneven = turnOf([4, 5, 1, 2, 3, 6], { dice, intent: SWIPE })
    expect(() => claim(uneven, idsOf(uneven, 0, 1), 'pair', LADDER)).toThrow()

    // Equal, but inside a composite: the bond does not fire (the ruling).
    let house = turnOf([4, 4, 4, 2, 2, 6], { dice, intent: SWIPE })
    house = claim(house, idsOf(house, 0, 1, 2, 3, 4), 'full-house', LADDER)
    const made = house.claims[0]!
    expect(made.bond).toBeUndefined()
    expect(made.sum).toBe(16)
    expect(made.tier.multiplier).toBe(LADDER['full-house'].multiplier)
  })

  it('taxes the ghost with the curse, like any other face (the ruling)', () => {
    const dice = [THE_SISTERS[0], THE_SISTERS[1], bone(2), bone(3), bone(4), bone(5)]
    let cursed = turnOf([6, 6, 1, 2, 3, 4], { dice, intent: COVET })
    cursed = claim(cursed, idsOf(cursed, 0, 1), 'pair', LADDER)
    expect(cursed.claims[0]!.sum).toBe(0)
  })

  it('doubles sixes when summing, and loses to a curse that counts them at nothing (art. 53)', () => {
    let rich = turnOf([6, 6, 1, 2, 3, 4], { intent: SWIPE })
    rich = claim(rich, idsOf(rich, 0, 1), 'pair', LADDER, ossuary)
    expect(rich.claims[0]!.sum).toBe(24)

    let poor = turnOf([6, 6, 1, 2, 3, 4], { intent: COVET })
    poor = claim(poor, idsOf(poor, 0, 1), 'pair', LADDER, ossuary)
    expect(poor.claims[0]!.sum).toBe(0)
  })

  it('doubles the turn only when every die of the hand is claimed (art. 53)', () => {
    let all = turnOf([2, 2, 2, 5, 5, 5], { intent: SWIPE })
    all = claim(all, idsOf(all, 0, 1, 2, 3, 4, 5), 'two-triples', LADDER, zealot)
    const plain = 21 * LADDER['two-triples'].multiplier
    expect(attack(all)).toBe(plain)
    expect(attack(all, zealot)).toBe(plain * 2)

    let some = turnOf([2, 2, 2, 5, 5, 1], { intent: SWIPE })
    some = claim(some, idsOf(some, 0, 1, 2), 'triple', LADDER, zealot)
    expect(attack(some, zealot)).toBe(6 * LADDER.triple.multiplier)
  })

  it('grants armor from a wearable, and nothing from a bare body (arts 47, 55)', () => {
    const quiet = turnOf([1, 2, 2, 4, 4, 6], { intent: SWIPE })
    expect(decide(quiet, 'end-turn', 0).harmTaken).toBe(7)
    expect(decide(quiet, 'end-turn', RUSTED_PLATE.armor).harmTaken).toBe(4)
  })

  it('audits every die against the plain bone, and names what it owes (art. 54)', () => {
    expect(audit(PLAIN_BONE, PLAIN_BONE)).toMatchObject({
      values: 21,
      plainValues: 21,
      riders: 0,
      bonded: false,
      overBudget: false,
    })
    expect(audit(THE_ORPHAN, PLAIN_BONE)).toMatchObject({ values: 26, overBudget: true })
    expect(audit(THE_LEECH, PLAIN_BONE)).toMatchObject({ riders: 1, overBudget: false })
    expect(audit(THE_SISTERS[0], PLAIN_BONE)).toMatchObject({ bonded: true })
  })
})
