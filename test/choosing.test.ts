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
import { stacked, swapped } from '../src/shell/screens/choosing.js'
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

/**
 * art. 124 (ruled 2026-08-07): **the order is the interface.**
 *
 * The first cut of the screen asked the player to pick six dice out of the
 * whole pouch before Descend would light — a form, charging six presses for
 * the case where nothing has changed since the last descent. Art. 60 already
 * said the pouch is ordered and the hand is its first `handSize`, so the
 * screen draws that and the only move is a swap.
 *
 * These are the two decisions the screen makes, and they are in
 * `src/shell/screens/choosing.ts` rather than in `main.ts` for the reason
 * `strip.ts` exists: a question the harness cannot ask is a question CI
 * cannot answer.
 */
describe('art. 124 — identical spares stack, individuals never do', () => {
  it('draws six bare bones as one row of six', () => {
    expect(stacked(PLAIN_POUCH.dice)).toEqual([
      { die: PLAIN_POUCH.dice[0], count: HAND_SIZE },
    ])
  })

  /**
   * art. 87: a good with an origin sentence is somebody. Three travelers'
   * bones are three people and three rows, however alike their bodies look.
   */
  it('never stacks a die that came off somebody', () => {
    const rows = stacked([THE_PUSHER, THE_CAREFUL, THE_RUNNER])
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.count === 1)).toBe(true)
  })

  it('gathers a scattered stack into one row, and keeps the individual apart', () => {
    const rows = stacked([...PLAIN_POUCH.dice.slice(0, 3), THE_PUSHER, ...PLAIN_POUCH.dice.slice(3)])
    // One row per distinct thing, wherever in the pouch its copies lie: six
    // bones interrupted by a traveler are still one decision and one row.
    expect(rows.map((row) => row.count)).toEqual([HAND_SIZE, 1])
    // The die a stack keeps is the first of it, so a swap out of a stack
    // takes the one nearest the hand.
    expect(rows[0]!.die.id).toBe(PLAIN_POUCH.dice[0]!.id)
    expect(rows[1]!.die.id).toBe(THE_PUSHER.id)
  })

  /**
   * The key is the name and the faces, never the id: `bone.1` and `bone.2`
   * are different ids and the same thing to a player, which is exactly the
   * distinction the article says is not a decision.
   */
  it('stacks on what the player can see, not on the id', () => {
    expect(stacked([PLAIN_POUCH.dice[0]!, PLAIN_POUCH.dice[5]!])).toEqual([
      { die: PLAIN_POUCH.dice[0], count: 2 },
    ])
  })
})

describe('art. 124 — a swap moves one thing', () => {
  const hand = PLAIN_POUCH.dice

  it('replaces the marked die where it stands and disturbs nothing else', () => {
    const after = swapped(hand, hand[2]!.id, THE_PUSHER.id)
    expect(after).toEqual([
      hand[0]!.id,
      hand[1]!.id,
      THE_PUSHER.id,
      hand[3]!.id,
      hand[4]!.id,
      hand[5]!.id,
    ])
  })

  it('is not a swap with either half unmarked, and changes nothing', () => {
    expect(swapped(hand, null, THE_PUSHER.id)).toEqual(hand.map((die) => die.id))
    expect(swapped(hand, hand[0]!.id, null)).toEqual(hand.map((die) => die.id))
  })

  /**
   * `chooseHand` de-duplicates, so a hand naming one die twice would come
   * back a slot short and fill itself from the spares. Nothing on the screen
   * can mark a hand die as *entering*; this is the guard behind that one.
   */
  it('refuses to take a die that is already in the hand', () => {
    expect(swapped(hand, hand[0]!.id, hand[4]!.id)).toEqual(hand.map((die) => die.id))
  })

  /** The whole point: a swap is a reordering, and the order is the hand. */
  it('lands as the hand once the pouch is reordered around it', () => {
    const found = collect(bare(), THE_PUSHER)
    const chosen = chooseHand(found, swapped(handFrom(found), handFrom(found)[1]!.id, THE_PUSHER.id))
    expect(ids(handFrom(chosen))).toContain(THE_PUSHER.id as string)
    expect(handFrom(chosen)).toHaveLength(HAND_SIZE)
    // Nothing destroyed: what left the hand is a spare, not gone (art. 60).
    expect(chosen.pouch.dice).toHaveLength(HAND_SIZE + 1)
    expect(sparesOf(chosen)).toHaveLength(1)
  })

  /**
   * art. 124: **Descend is one press when nothing changed.** The screen
   * opens on the hand you last took down, which the order carries for free,
   * so leaving without swapping is a no-op rather than a re-pick.
   */
  it('leaves the hand exactly as it stood when nothing is marked', () => {
    const found = collect(bare(), THE_PUSHER)
    const before = ids(handFrom(found))
    expect(ids(handFrom(chooseHand(found, swapped(handFrom(found), null, null))))).toEqual(before)
  })
})
