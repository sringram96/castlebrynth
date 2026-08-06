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
  chooseHand,
  mustChoose,
  tookIntoRun,
  wake,
} from '../src/state/index.js'

/**
 * The hand is a chosen six, and it is chosen at the waking (arts 55, 60, 86,
 * ruled 2026-08-05, amended).
 *
 * The first ruling of the travelers wave left a hole in the hand and had a
 * found die *fill* it. That is right exactly once. After that a find had
 * nowhere to go and sat in the pouch until a waking that never looked at it
 * again — so the collection grew and the build did not, which is the
 * opposite of art. 86's claim that your build is who you have found.
 *
 * What replaces it: the pouch is ordered, the hand is the first `handSize`
 * of it, and everything past that is a **spare**. A die found mid-descent
 * goes into the pouch and stays there; which dice come *down* is settled
 * where a descent begins, because art. 60 has always said the hand is
 * assembled for the descent. Nothing is destroyed and nothing is sold — the
 * choice is a reordering, and the order carries the hand for free.
 */

const seedOf = (n: number): Seed => n as unknown as Seed
const bare = () => firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
const ids = (dice: readonly { readonly id: string }[]): readonly string[] =>
  dice.map((die) => die.id as string)

describe('arts 55, 60 — six bones, a hand of six, and the first find', () => {
  it('wakes six against a hand size of six, with nothing spare', () => {
    const permanent = bare()
    expect(permanent.pouch.dice).toHaveLength(HAND_SIZE)
    expect(permanent.handSize).toBe(6)
    expect(handFrom(permanent)).toHaveLength(HAND_SIZE)
    expect(sparesOf(permanent)).toEqual([])
  })

  /**
   * art. 55 as amended 2026-08-06: the hand is full at the waking, so the
   * first find is the first *decision* rather than the first completion. It
   * is owned the moment it is taken and it descends when the player says so
   * (art. 60), which is the article this whole file is about.
   */
  it('leaves the first find spare rather than in the hand', () => {
    const found = collect(bare(), THE_PUSHER)
    expect(found.pouch.dice).toHaveLength(HAND_SIZE + 1)
    expect(handFrom(found)).toHaveLength(HAND_SIZE)
    // Owned, and not in play. That is the decision the swap exists for.
    expect(ids(sparesOf(found))).toEqual([THE_PUSHER.id as string])
  })

  it('leaves the second find spare too, and destroys neither', () => {
    const found = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    expect(found.pouch.dice).toHaveLength(HAND_SIZE + 2)
    expect(handFrom(found)).toHaveLength(HAND_SIZE)
    expect(ids(sparesOf(found))).toEqual([THE_PUSHER.id as string, THE_RUNNER.id as string])
  })
})

describe('art. 60 — the choosing', () => {
  it('asks only when the pouch has outgrown the hand', () => {
    // Six bones is exactly a hand: nothing to decide until something is found.
    expect(mustChoose(bare())).toBe(false)
    expect(mustChoose(collect(bare(), THE_PUSHER))).toBe(true)
    expect(mustChoose(collect(collect(bare(), THE_PUSHER), THE_RUNNER))).toBe(true)
  })

  it('brings the chosen dice to the front, in the order they were chosen', () => {
    const found = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    const keep = [THE_RUNNER.id, THE_PUSHER.id, ...ids(handFrom(found)).slice(0, 4)]
    const chosen = chooseHand(found, keep as never)

    expect(ids(handFrom(chosen))).toEqual(keep)
    expect(handFrom(chosen)).toHaveLength(HAND_SIZE)
    // What was not chosen is spare, not gone: the pouch is the collection.
    expect(chosen.pouch.dice).toHaveLength(HAND_SIZE + 2)
    expect(sparesOf(chosen)).toHaveLength(2)
  })

  it('destroys nothing and invents nothing', () => {
    const found = collect(collect(collect(bare(), THE_PUSHER), THE_RUNNER), THE_CAREFUL)
    const before = new Set(ids(found.pouch.dice))
    const chosen = chooseHand(found, [THE_CAREFUL.id, THE_RUNNER.id] as never)
    expect(new Set(ids(chosen.pouch.dice))).toEqual(before)
    expect(chosen.pouch.dice).toHaveLength(HAND_SIZE + 3)
  })

  it('ignores what is not owned, and a name said twice', () => {
    const found = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    // THE_LEECH is not in this pouch; the pusher is named twice.
    const chosen = chooseHand(found, [
      THE_LEECH.id,
      THE_PUSHER.id,
      THE_PUSHER.id,
    ] as never)
    expect(ids(chosen.pouch.dice)).not.toContain(THE_LEECH.id as string)
    expect(ids(chosen.pouch.dice)[0]).toBe(THE_PUSHER.id as string)
    expect(chosen.pouch.dice).toHaveLength(HAND_SIZE + 2)
    // A short choice is honoured as far as it goes; the rest fill behind it.
    expect(handFrom(chosen)).toHaveLength(HAND_SIZE)
  })

  /**
   * art. 60: the pouch's order *is* the hand, so a chosen hand survives the
   * reseed for nothing. This is the whole reason the choice is a reordering
   * rather than a second list.
   */
  it('carries the chosen hand through a death, without storing it twice', () => {
    const found = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    const chosen = chooseHand(found, [THE_RUNNER.id, ...ids(handFrom(found)).slice(0, 5)] as never)
    const woken = wake(chosen, seedOf(9))
    expect(ids(woken.run!.hand.dice)).toEqual(ids(handFrom(chosen)))
    expect(ids(woken.run!.hand.dice)).toContain(THE_RUNNER.id as string)
  })
})

describe('arts 60, 63 — the hand and the run in flight', () => {
  it('re-reads the run’s hand off the pouch the choice reordered', () => {
    const permanent = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    const ledgers = wake(permanent, seedOf(3))
    expect(ids(ledgers.run!.hand.dice)).not.toContain(THE_RUNNER.id as string)

    const chosen = chooseHand(permanent, [
      THE_RUNNER.id,
      ...ids(handFrom(permanent)).slice(1),
    ] as never)
    const armed = tookIntoRun(ledgers.run!, chosen)
    expect(ids(armed.hand.dice)).toContain(THE_RUNNER.id as string)
    expect(armed.hand.dice).toHaveLength(HAND_SIZE)
  })

  /**
   * art. 63: a fled fight pauses with its card as spent as you left it, and
   * art. 75 replays it off the hand it was opened with. The choosing screen
   * only ever opens at a waking, so this can no longer be reached through
   * the thumb — the guard stays because the ledger is the law and a caller
   * that got it wrong would break a replay silently.
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
        bound: [],
        bleed: null,
        card: {} as never,
        claims: [],
        phase: 'keep' as const,
        selected: [],
        advanced: true,
        engaged: false,
      },
    }
    const chosen = chooseHand(permanent, [
      THE_RUNNER.id,
      ...ids(handFrom(permanent)).slice(1),
    ] as never)
    // The pouch reordered; the hand in flight did not.
    expect(ids(tookIntoRun(paused, chosen).hand.dice)).toEqual(ids(paused.hand.dice))
    // And it lands the moment the fight is not waiting any more.
    expect(ids(tookIntoRun({ ...paused, fight: null }, chosen).hand.dice)).toContain(
      THE_RUNNER.id as string,
    )
  })
})
