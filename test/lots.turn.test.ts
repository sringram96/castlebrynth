import { describe, expect, it } from 'vitest'

import { HAND_SIZE, PLAIN_POUCH } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import { assembleHand, cast, casting, freshCard, keep, openTurn, recast } from '../src/lots/index.js'
import { handOf, seedOf, SWIPE } from './helpers.js'

/**
 * The turn core — arts 41–44 as amended. The first casting, keep any dice,
 * exactly one second casting of the rest. Nothing here scores.
 */
describe('lots — art. 41 (two castings), art. 42 (intent first), arts 43–44, 60', () => {
  it('states the intent before a single die is thrown (art. 42)', () => {
    const turn = openTurn(handOf(), SWIPE, freshCard())
    expect(turn.intent).toEqual(SWIPE)
    expect(turn.castings).toEqual([])
    expect(casting(turn)).toEqual([])
  })

  it('allows exactly one recast, and no more (art. 41)', () => {
    const lot = lotFrom(seedOf(11))
    const once = recast(cast(openTurn(handOf(), SWIPE, freshCard()), lot), lot)
    expect(once.castings).toHaveLength(2)
    expect(() => recast(once, lot)).toThrow()
  })

  it('refuses to cast twice over the same casting (art. 41)', () => {
    const lot = lotFrom(seedOf(12))
    const first = cast(openTurn(handOf(), SWIPE, freshCard()), lot)
    expect(() => cast(first, lot)).toThrow()
  })

  it('keeps what was kept across the recast — keeping is planning (arts 41–42)', () => {
    const lot = lotFrom(seedOf(13))
    const hand = handOf()
    const first = cast(openTurn(hand, SWIPE, freshCard()), lot)
    const held = [casting(first)[0]!.die, casting(first)[2]!.die]
    const after = recast(keep(first, held), lot)

    for (const die of held) {
      const before = casting(first).find((l) => l.die === die)!
      const now = casting(after).find((l) => l.die === die)!
      expect(now.face).toEqual(before.face)
      expect(now.kept).toBe(true)
    }
    // Everything else came back off the table.
    expect(casting(after).filter((l) => l.kept)).toHaveLength(2)
  })

  it('releases dice when a later keep names fewer of them (art. 41)', () => {
    const lot = lotFrom(seedOf(14))
    const first = cast(openTurn(handOf(), SWIPE, freshCard()), lot)
    const some = keep(first, [casting(first)[0]!.die, casting(first)[1]!.die])
    const fewer = keep(some, [casting(first)[0]!.die])
    expect(casting(fewer).filter((l) => l.kept).map((l) => l.die)).toEqual([
      casting(first)[0]!.die,
    ])
  })

  it('derives the same casts from the same seed (art. 36)', () => {
    const roll = (): readonly number[] => {
      const lot = lotFrom(seedOf(2026))
      const turn = recast(cast(openTurn(handOf(), SWIPE, freshCard()), lot), lot)
      return casting(turn).map((l) => l.face.value)
    }
    expect(roll()).toEqual(roll())
  })

  it('assembles the hand from the pouch, at whatever size the body is (art. 60)', () => {
    expect(assembleHand(PLAIN_POUCH, HAND_SIZE).dice).toHaveLength(HAND_SIZE)
    expect(assembleHand(PLAIN_POUCH, 3).dice).toHaveLength(3)
    // A body grown past the pouch takes what the pouch has, and no ghosts.
    expect(assembleHand(PLAIN_POUCH, 99).dice).toHaveLength(PLAIN_POUCH.dice.length)
  })

  it('throws only values the die declares (art. 50)', () => {
    const lot = lotFrom(seedOf(3))
    let turn = cast(openTurn(handOf(), SWIPE, freshCard()), lot)
    for (let n = 0; n < 200; n++) {
      for (const landed of casting(turn)) {
        expect(landed.face.value).toBeGreaterThanOrEqual(1)
        expect(landed.face.value).toBeLessThanOrEqual(6)
      }
      turn = cast(openTurn(handOf(), SWIPE, freshCard()), lot)
    }
  })
})
