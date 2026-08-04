import { describe, expect, it } from 'vitest'

import { GNAWING_ESCALATION, GNAWING_SCRIPT, LADDER, scriptedHorror } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Fight, Horror, Intent, Line, Lot } from '../src/lots/index.js'
import {
  advanceFight,
  cast,
  casting,
  claim,
  claimable,
  decide,
  freshCard,
  openFight,
  withTurn,
} from '../src/lots/index.js'
import { handOf, seedOf } from './helpers.js'

/**
 * The fight loop — a headless state machine against an intent script, with
 * the three endings, escalation, and a card that refills between fights and
 * never within one (art. 63).
 */
const SWIPE: Intent = { verb: 'SWIPE', amount: 6 }
const script: readonly Intent[] = [SWIPE, { verb: 'BELLOW', amount: 12 }]

const softly = (health: number): Horror => scriptedHorror('horror.straw', health, script, 3)

/** One turn, played the plainest way there is: cast, claim, end. */
function playTurn(fight: Fight, lot: Lot, decision: 'end-turn' | 'flee' = 'end-turn'): Fight {
  let turn = cast(fight.turn, lot)
  const dice = casting(turn).map((landed) => landed.die)
  const lines: readonly Line[] = claimable(turn, dice, LADDER)
  const line = lines[lines.length - 1]
  if (line !== undefined && decision === 'end-turn') {
    turn = claim(turn, dice, line, LADDER, fight.goods)
  }
  return advanceFight(withTurn(fight, turn), decide(turn, decision, fight.armor, fight.goods))
}

const spent = (fight: Fight): readonly string[] =>
  Object.entries(fight.card)
    .filter(([, burned]) => burned)
    .map(([line]) => line)

describe('lots — art. 63 (the card per fight), the three endings, the escalation hook', () => {
  it('opens with a fresh card and the first intent already showing (arts 42, 63)', () => {
    const fight = openFight(softly(100), handOf(), 26, 3)
    expect(fight.card).toEqual(freshCard())
    expect(fight.turn.intent).toEqual(SWIPE)
    expect(fight.events[0]).toEqual({ kind: 'turn-opened', turnNumber: 1, intent: SWIPE })
  })

  it('runs to a win when the horror falls', () => {
    const lot = lotFrom(seedOf(5))
    const won = playTurn(openFight(softly(10), handOf(), 26, 3), lot)
    expect(won.outcome).toBe('won')
    expect(won.horrorHealth).toBe(0)
    // The horror never strikes back through a killing blow — the demo's order.
    expect(won.yourHealth).toBe(26)
    expect(won.events.at(-1)).toEqual({ kind: 'ended', outcome: 'won' })
  })

  it('runs to a loss when the intent gets through', () => {
    const lot = lotFrom(seedOf(6))
    let fight = openFight(softly(100000), handOf(), 7, 0)
    while (fight.outcome === 'fighting') fight = playTurn(fight, lot)
    expect(fight.outcome).toBe('lost')
    expect(fight.yourHealth).toBeLessThanOrEqual(0)
  })

  it('runs to flight, dealing nothing and taking nothing (art. 41)', () => {
    const lot = lotFrom(seedOf(7))
    const fled = playTurn(openFight(softly(100), handOf(), 26, 3), lot, 'flee')
    expect(fled.outcome).toBe('fled')
    expect(fled.horrorHealth).toBe(100)
    expect(fled.yourHealth).toBe(26)
  })

  it('keeps the card spent across turns and refills it at the next door (art. 63)', () => {
    const lot = lotFrom(seedOf(8))
    const first = playTurn(openFight(softly(100000), handOf(), 200, 3), lot)
    expect(spent(first)).toEqual(['any-dice'])
    // The line stays spent for the rest of the fight, turn after turn.
    const second = playTurn(first, lot)
    expect(second.card['any-dice']).toBe(true)
    expect(second.turn.card['any-dice']).toBe(true)

    // A new door is a new card: nothing carries across a fight (art. 63).
    const nextFight = openFight(softly(100), handOf(), 26, 3)
    expect(nextFight.card).toEqual(freshCard())
  })

  it('returns the hand whole every turn (art. 44)', () => {
    const lot = lotFrom(seedOf(9))
    const hand = handOf()
    const first = playTurn(openFight(softly(100000), hand, 200, 3), lot)
    expect(first.turn.hand.dice).toEqual(hand.dice)
    expect(first.turn.claims).toEqual([])
    expect(first.turn.castings).toEqual([])
  })

  it('escalates when the script runs out and starts again', () => {
    const horror = scriptedHorror('horror.straw', 100, script, 3)
    expect(horror.intentFor(1).amount).toBe(6)
    expect(horror.intentFor(2).amount).toBe(12)
    expect(horror.intentFor(3).amount).toBe(6 + 3)
    expect(horror.intentFor(4).amount).toBe(12 + 3)
    expect(horror.intentFor(5).amount).toBe(6 + 6)
  })

  it("carries the Gnawing's own script and escalation (the demo's numbers)", () => {
    const gnawing = scriptedHorror('horror.gnawing', 150, GNAWING_SCRIPT, GNAWING_ESCALATION)
    expect(GNAWING_SCRIPT.map((intent) => intent.amount)).toEqual([7, 6, 5, 9, 16, 8])
    expect(gnawing.intentFor(7).amount).toBe(7 + GNAWING_ESCALATION)
    expect(gnawing.intentFor(7).verb).toBe('SWIPE')
    expect(gnawing.intentFor(13).amount).toBe(7 + GNAWING_ESCALATION * 2)
  })

  it('refuses to advance a fight that is already over', () => {
    const lot = lotFrom(seedOf(10))
    const over = playTurn(openFight(softly(10), handOf(), 26, 3), lot)
    expect(() => playTurn(over, lot)).toThrow()
  })
})
