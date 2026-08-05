import { describe, expect, it } from 'vitest'

import { HAND_SIZE, PLAIN_POUCH, THE_PUSHER } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Pouch } from '../src/lots/index.js'
import {
  assembleHand,
  cast,
  casting,
  freshCard,
  keep,
  keptAtRecast,
  openTurn,
  recast,
} from '../src/lots/index.js'
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
    const marked = keep(first, held)
    // Before the recast, the marks are the plan and they are visible.
    expect(casting(marked).filter((l) => l.kept)).toHaveLength(2)

    const after = recast(marked, lot)
    for (const die of held) {
      const before = casting(first).find((l) => l.die === die)!
      const now = casting(after).find((l) => l.die === die)!
      expect(now.face).toEqual(before.face)
    }
  })

  /**
   * art. 72: keep-marks are mortal. The instant the second casting lands,
   * every mark clears — after the recast the hand is statistically a fresh
   * hand, so which dice survived the first casting has stopped being
   * information and showing it is noise.
   */
  it('clears every keep-mark the instant the recast lands (art. 72)', () => {
    const lot = lotFrom(seedOf(13))
    const first = cast(openTurn(handOf(), SWIPE, freshCard()), lot)
    const held = [casting(first)[0]!.die, casting(first)[2]!.die]
    const after = recast(keep(first, held), lot)

    expect(casting(after).filter((l) => l.kept)).toEqual([])
    // The first casting keeps its marks, because a resume replays from them
    // and nothing player-facing ever reads them (art. 75).
    expect(keptAtRecast(after)).toEqual(held)
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
    expect(assembleHand(PLAIN_POUCH, 3).dice).toHaveLength(3)
    // A body grown past the pouch takes what the pouch has, and no ghosts.
    expect(assembleHand(PLAIN_POUCH, 99).dice).toHaveLength(PLAIN_POUCH.dice.length)
  })

  /**
   * arts 55, 60 (amended 2026-08-05): the start is five bones against a hand
   * size of six, so the first waking assembles a hand of five and the sixth
   * slot stands empty. The gap is the law, not an accident of the pouch —
   * these two numbers may never be derived from each other.
   */
  it('leaves the sixth slot empty at a first waking (arts 55, 60)', () => {
    expect(PLAIN_POUCH.dice).toHaveLength(5)
    expect(HAND_SIZE).toBe(6)
    expect(assembleHand(PLAIN_POUCH, HAND_SIZE).dice).toHaveLength(5)
    expect(HAND_SIZE - assembleHand(PLAIN_POUCH, HAND_SIZE).dice.length).toBe(1)
  })

  /** art. 86: and one traveler's bone is what closes it. */
  it('fills the sixth slot with the first die collected (arts 56, 86)', () => {
    const found: Pouch = { dice: [...PLAIN_POUCH.dice, THE_PUSHER] }
    expect(assembleHand(found, HAND_SIZE).dice).toHaveLength(HAND_SIZE)
    expect(assembleHand(found, HAND_SIZE).dice.at(-1)).toBe(THE_PUSHER)
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
