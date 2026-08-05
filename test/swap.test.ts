import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  HAND_SIZE,
  PLAIN_POUCH,
  THE_CAREFUL,
  THE_LEECH,
  THE_PUSHER,
  THE_RUNNER,
} from '../src/content/index.js'
import type { Seed } from '../src/state/index.js'
import {
  collect,
  firstPermanent,
  handFrom,
  sparesOf,
  swapInPouch,
  tookIntoRun,
  wake,
} from '../src/state/index.js'

/**
 * The hand is a chosen six, and choosing is a swap (arts 55, 60, 86, ruled
 * 2026-08-05).
 *
 * The first ruling of the travelers wave left a hole in the hand and had a
 * found die *fill* it. That is right exactly once. After that a find had
 * nowhere to go and sat in the pouch until a waking that never looked at it
 * again — so the collection grew and the build did not, which is the
 * opposite of art. 86's claim that your build is who you have found.
 *
 * What replaces it: the pouch is ordered, the hand is the first `handSize`
 * of it, and everything past that is a **spare**. A swap exchanges two
 * positions, so nothing is destroyed, nothing is sold, and the hand you
 * chose is still the hand when you wake — the order carries it for free.
 */

const seedOf = (n: number): Seed => n as unknown as Seed
const bare = () => firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
const ids = (dice: readonly { readonly id: string }[]): readonly string[] =>
  dice.map((die) => die.id as string)

describe('arts 55, 60 — five bones, a hand of six, and the one free slot', () => {
  it('wakes five against a hand size of six, with nothing spare', () => {
    const permanent = bare()
    expect(permanent.pouch.dice).toHaveLength(5)
    expect(permanent.handSize).toBe(6)
    expect(handFrom(permanent)).toHaveLength(5)
    expect(sparesOf(permanent)).toEqual([])
  })

  it('fills the empty slot with the first find, and asks nothing', () => {
    const found = collect(bare(), THE_PUSHER)
    // Six is the standard, so the first bone completes the hand rather than
    // displacing anything. There is no decision here to make.
    expect(handFrom(found)).toHaveLength(HAND_SIZE)
    expect(ids(handFrom(found))).toContain(THE_PUSHER.id as string)
    expect(sparesOf(found)).toEqual([])
  })

  it('leaves the second find spare rather than in the hand', () => {
    const found = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    expect(found.pouch.dice).toHaveLength(7)
    expect(handFrom(found)).toHaveLength(HAND_SIZE)
    // Owned, and not in play. That is the decision the swap exists for.
    expect(ids(sparesOf(found))).toEqual([THE_RUNNER.id as string])
  })
})

describe('art. 60 — the swap', () => {
  it('exchanges a die in the hand for one out of it, both ways round', () => {
    const found = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    const plain = handFrom(found)[0]!

    const swapped = swapInPouch(found, THE_RUNNER.id, plain.id)
    expect(ids(handFrom(swapped))).toContain(THE_RUNNER.id as string)
    expect(ids(handFrom(swapped))).not.toContain(plain.id as string)
    // The one you gave up is spare, not gone: the pouch is the collection.
    expect(ids(sparesOf(swapped))).toEqual([plain.id as string])
    expect(swapped.pouch.dice).toHaveLength(7)

    // And it is reversible, because nothing was destroyed.
    const back = swapInPouch(swapped, plain.id, THE_RUNNER.id)
    expect(ids(handFrom(back))).toEqual(ids(handFrom(found)))
    expect(ids(sparesOf(back))).toEqual([THE_RUNNER.id as string])
  })

  it('keeps the hand at its size, and the pouch whole', () => {
    const found = collect(collect(collect(bare(), THE_PUSHER), THE_RUNNER), THE_CAREFUL)
    const before = new Set(ids(found.pouch.dice))
    const swapped = swapInPouch(found, THE_CAREFUL.id, handFrom(found)[2]!.id)
    expect(handFrom(swapped)).toHaveLength(HAND_SIZE)
    expect(new Set(ids(swapped.pouch.dice))).toEqual(before)
    expect(swapped.pouch.dice).toHaveLength(8)
  })

  it('refuses a swap it cannot make, rather than inventing one', () => {
    const found = collect(bare(), THE_PUSHER)
    // A die that is not owned, and a die swapped with itself.
    expect(swapInPouch(found, THE_LEECH.id, THE_PUSHER.id)).toBe(found)
    expect(swapInPouch(found, THE_PUSHER.id, THE_LEECH.id)).toBe(found)
    expect(swapInPouch(found, THE_PUSHER.id, THE_PUSHER.id)).toBe(found)
  })

  /**
   * art. 60: the pouch's order *is* the hand, so a chosen hand survives the
   * reseed for nothing. This is the whole reason the swap is an exchange of
   * positions rather than a second list.
   */
  it('carries the chosen hand through a death, without storing it twice', () => {
    const found = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    const chosen = swapInPouch(found, THE_RUNNER.id, handFrom(found)[0]!.id)
    const woken = wake(chosen, seedOf(9))
    expect(ids(woken.run!.hand.dice)).toEqual(ids(handFrom(chosen)))
    expect(ids(woken.run!.hand.dice)).toContain(THE_RUNNER.id as string)
  })
})

describe('arts 60, 63 — the hand and the run in flight', () => {
  it('re-reads the run’s hand off the pouch the swap reordered', () => {
    const permanent = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    const ledgers = wake(permanent, seedOf(3))
    expect(ids(ledgers.run!.hand.dice)).not.toContain(THE_RUNNER.id as string)

    const chosen = swapInPouch(permanent, THE_RUNNER.id, ledgers.run!.hand.dice[0]!.id)
    const armed = tookIntoRun(ledgers.run!, chosen)
    expect(ids(armed.hand.dice)).toContain(THE_RUNNER.id as string)
    expect(armed.hand.dice).toHaveLength(HAND_SIZE)
  })

  /**
   * art. 63: a fled fight pauses with its card as spent as you left it, and
   * art. 75 replays it off the hand it was opened with. Re-arming between
   * backing out of a door and going back through it would be both a broken
   * replay and a way to launder a card, so the hand does not move while a
   * fight is waiting.
   */
  it('will not move the hand while a fight is paused behind a door', () => {
    const permanent = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    const ledgers = wake(permanent, seedOf(3))
    const paused = {
      ...ledgers.run!,
      fight: {
        horror: 'horror.gnawing',
        at: ledgers.run!.at.instance,
        horrorHealth: 9,
        yourHealth: 20,
        turnNumber: 2,
        kept: [],
        castingsSpent: 1,
        card: {} as never,
        claims: [],
        phase: 'keep' as const,
        selected: [],
        advanced: true,
        engaged: false,
      },
    }
    const chosen = swapInPouch(permanent, THE_RUNNER.id, paused.hand.dice[0]!.id)
    // The pouch reordered; the hand in flight did not.
    expect(ids(tookIntoRun(paused, chosen).hand.dice)).toEqual(ids(paused.hand.dice))
    // And it lands the moment the fight is not waiting any more.
    expect(ids(tookIntoRun({ ...paused, fight: null }, chosen).hand.dice)).toContain(
      THE_RUNNER.id as string,
    )
  })
})
