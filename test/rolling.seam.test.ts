import { describe, expect, it } from 'vitest'

import { LADDER, PLAIN_POUCH } from '../src/content/index.js'
import type { Amend, Goods, Lot, Trinket, TrinketId, Turn } from '../src/lots/index.js'
import {
  addedBy,
  bittenBy,
  carriedTrinkets,
  claim,
  decide,
  didFire,
  loadedFaces,
  rollAmends,
  turnedBy,
  worthOf,
} from '../src/lots/index.js'
import { everyDie, turnOf } from './helpers.js'
import prewave from './fixtures/pre-rolling.json' with { type: 'json' }
import { transcript, type Transcript } from './prewave.js'

/**
 * **Card 93, section 1 — the seam.**
 *
 * One hook in the scoring path, and it must be a no-op when empty. That is
 * the whole of the wave's engineering requirement, and it splits into two
 * claims that are checked two different ways here.
 *
 * The first is **arithmetic**: the goods roll after the line has settled, they
 * never enter combo detection, they roll once and do not reroll, and each of
 * the four kinds moves exactly the number it says it does.
 *
 * The second is **the flexibility test in its hardest form**: a run carrying
 * no rolling good draws no randomness, so its outcomes are byte-identical to
 * the build before the wave. It is asserted twice over — a lot that screams
 * when it is touched, and a whole transcript of the pre-wave build
 * (`test/fixtures/pre-rolling.json`, taken on the commit before this one and
 * never regenerated) replayed against the build after it.
 */

const trinket = (id: string, rolls: readonly Amend[]): Trinket => ({
  id: id as TrinketId,
  rolls,
})

/** A lot that refuses to be drawn from. The whole first half rests on it. */
const SCREAMS: Lot = {
  next(): number {
    throw new Error('a lot was drawn from that should not have been touched')
  },
}

/** A lot that counts, for the cases where a draw is expected. */
function counting(values: readonly number[]): Lot & { drawn: () => number } {
  let at = 0
  return {
    next(): number {
      return values[at++ % Math.max(1, values.length)] ?? 0
    },
    drawn: () => at,
  }
}

const NOTHING: Goods = { talismans: [], riders: [] }

/** Face 0 always: the first roll of a one-value lot lands on the first face. */
const FIRST = counting([0])

/** A turn with one claim on it, which is what a rolling good amends. */
function claimed(values: readonly number[], line: 'pair' | 'any-dice' = 'pair'): Turn {
  const turn = turnOf(values)
  const dice = everyDie(turn).slice(0, line === 'pair' ? 2 : 1)
  return claim(turn, dice, line, LADDER, NOTHING)
}

describe('card 93 §1 — carrying none draws nothing', () => {
  it('never reaches for a lot when no rolling good is carried', () => {
    const turn = claimed([3, 3, 4, 5, 6, 6])
    expect(rollAmends(turn, NOTHING, SCREAMS)).toEqual([])
    expect(rollAmends(turn, { ...NOTHING, trinkets: [] }, SCREAMS)).toEqual([])
    // And the resolve that wraps it does not either, whether or not it is
    // even given one — a company with nothing in it needs no lot at all.
    expect(() => decide(turn, 'end-turn', 0, NOTHING, SCREAMS)).not.toThrow()
    expect(decide(turn, 'end-turn', 0, NOTHING).amends).toEqual([])
  })

  /**
   * **Do not draw and discard.** The wave is explicit: a draw thrown away is
   * still a draw, and it would silently change every fight for every player
   * carrying nothing — which is almost every player almost all of the time.
   */
  it('leaves the stream where it found it, draw for draw', () => {
    const lot = counting([0.1, 0.9, 0.5])
    const turn = claimed([2, 2, 3, 4, 5, 6])
    decide(turn, 'end-turn', 0, NOTHING, lot)
    expect(lot.drawn()).toBe(0)
  })

  /**
   * And the other side of it: a company that *does* carry one and is handed
   * no lot is refused rather than quietly played without its goods. A wave
   * whose claim is *it changes nothing when absent* cannot afford to fail
   * silently when it is present.
   */
  it('refuses a carried good with nothing to roll it, rather than dropping it', () => {
    const turn = claimed([2, 2, 3, 4, 5, 6])
    const carrying: Goods = { ...NOTHING, trinkets: [trinket('t.add', [{ kind: 'add', amount: 2 }])] }
    expect(() => decide(turn, 'end-turn', 0, carrying)).toThrow(/nothing to roll it/)
  })

  /**
   * **The transcript.** Two halves of the pre-wave build — every turn's four
   * numbers across two horrors, three hands and forty seeds, and a hundred
   * and fifty whole depths walked end to end — replayed and compared byte for
   * byte. If the seam draws a value it should not have, the first turn of the
   * first fight disagrees and the row says which.
   */
  it('reproduces the pre-wave fights exactly (the flexibility test)', () => {
    const now: Transcript = transcript()
    const before = prewave as unknown as Transcript
    expect(now.fights).toHaveLength(before.fights.length)
    expect(now.depths).toHaveLength(before.depths.length)
    for (let at = 0; at < before.fights.length; at++) {
      const was = before.fights[at]!
      expect(now.fights[at], `${was.horror} · ${was.hand} · seed ${was.seed}`).toEqual(was)
    }
  })

  /**
   * **The depths half is superseded, and by a ruling rather than by a drift**
   * (art. 125, the mend's third wave).
   *
   * It was 240 fights and 150 whole runs, and both halves matched byte for
   * byte until a rarity semantics ruling deliberately re-dealt the boon
   * socket. **The fights half still matches, all 240 of them**, and that is
   * the half the seam owns — art. 125 does not touch the scoring path, and
   * if the amend seam ever draws a value it should not, the very first turn
   * of the very first fight will say so.
   *
   * The depths half is a record of a *deal*, and the deal changed on
   * purpose: 100 of the 150 runs are dealt a different good somewhere, and a
   * different good is a different run from there on. Regenerating it would
   * make it agree with whatever the code currently does, which is the one
   * thing the file must not do, so it is kept as it stands and this is the
   * note that says why it is no longer asserted line for line.
   *
   * What the depths half was *for* is asserted directly instead, because the
   * add-on's claim outlives the transcript that once carried it: with the
   * two rolling-good rows taken out of the catalog, no run is dealt one.
   */
  it('deals no rolling good from a catalog without them (the add-on claim)', () => {
    const now: Transcript = transcript()
    for (const depth of now.depths) {
      for (const held of depth.haul) {
        expect(held, `depth seed ${depth.seed}`).not.toMatch(/^trinket\./)
      }
    }
  })
})

describe('card 94 §3 — the caption cannot lie about what is loaded', () => {
  /**
   * **The face was settled when the turn opened.** A turn's amend lot is a
   * pure function of the seed, the step and the turn number, so reading the
   * face before the press rolls nothing — and the caption in the tray is
   * therefore the same face the beat lands on, by construction rather than by
   * care. `rollAmends` is written on top of `loadedFaces` for exactly that
   * reason: one statement of *which face*, and no second one to drift.
   */
  it('shows the face the beat will land on, face for face', () => {
    const carrying: Goods = {
      ...NOTHING,
      trinkets: [
        trinket('t.saint', [{ kind: 'block', amount: 6 }, { kind: 'null' }]),
        trinket('t.sliver', [{ kind: 'per', amount: 2 }, { kind: 'cost', amount: 5 }]),
      ],
    }
    for (const values of [[3, 3, 4, 5, 6, 6], [2, 2, 2, 4, 5, 6], [6, 6, 1, 2, 3, 4]]) {
      for (const draws of [[0], [0.9], [0.2, 0.7]]) {
        const turn = claimed(values)
        // Two independent lots off the same stream: the caption's and the
        // roll's. In the shell they are two calls to `turnLots(...)(AMEND_LOT)`
        // and this is the same thing said in a fixture.
        const rolled = rollAmends(turn, carrying, counting(draws))
        const loaded = loadedFaces(carrying, counting(draws))
        expect(loaded.map((one) => one.trinket)).toEqual(rolled.map((one) => one.trinket))
        expect(loaded.map((one) => one.face)).toEqual(rolled.map((one) => one.face))
      }
    }
  })

  /**
   * And it inherits the flexibility law rather than working around it: a run
   * carrying nothing does not draw to find out what it is holding, because
   * there is nothing to hold. This is the one that would have quietly broken
   * every fight for almost every player if it had been written the other way.
   */
  it('draws nothing for a run carrying nothing', () => {
    expect(loadedFaces(NOTHING, SCREAMS)).toEqual([])
    expect(loadedFaces({ ...NOTHING, trinkets: [] }, SCREAMS)).toEqual([])
  })

  /**
   * It is readable before anything has been claimed, which is the whole
   * point — `rollAmends` refuses a turn with no claim because there is
   * nothing to amend, and the caption has to stand from the top of the turn.
   */
  it('is readable before a line has been chosen', () => {
    const carrying: Goods = {
      ...NOTHING,
      trinkets: [trinket('t.add', [{ kind: 'add', amount: 2 }])],
    }
    const bare = turnOf([3, 3, 4, 5, 6, 6])
    expect(rollAmends(bare, carrying, FIRST)).toEqual([])
    expect(loadedFaces(carrying, FIRST)).toEqual([
      { trinket: 't.add', face: { kind: 'add', amount: 2 } },
    ])
  })
})

describe('card 93 §1 — the goods amend, and never score', () => {
  const pair = (): Turn => claimed([4, 4, 1, 2, 3, 5])

  /** The line resolves untouched, and the amendment moves what it came to. */
  it('adds after the tier and the sum have settled', () => {
    const turn = pair()
    const plain = decide(turn, 'end-turn', 0, NOTHING)
    const carrying: Goods = { ...NOTHING, trinkets: [trinket('t.add', [{ kind: 'add', amount: 3 }])] }
    const amended = decide(turn, 'end-turn', 0, carrying, FIRST)
    expect(amended.harmDealt).toBe(plain.harmDealt + 3)
    // The claim itself is the claim it was: sum, tier and line all untouched.
    expect(amended.linesSpent).toEqual(plain.linesSpent)
    expect(turn.claims[0]!.sum).toBe(8)
    expect(turn.claims[0]!.tier.multiplier).toBe(LADDER.pair.multiplier)
  })

  /**
   * **`per` is the interesting one.** It pays for each die the turn claimed,
   * so it pays twice on a pair and five times on a full house — the only kind
   * whose worth rises as the hand improves, with no number on it changing.
   */
  it('pays `per` once for each die in the claim, and five times on a full house', () => {
    const stone: Goods = {
      ...NOTHING,
      trinkets: [trinket('t.per', [{ kind: 'per', amount: 2 }])],
    }
    const twice = decide(pair(), 'end-turn', 0, stone, FIRST)
    expect(addedBy(twice.amends)).toBe(4)

    const hand = turnOf([5, 5, 5, 2, 2, 6])
    const house = claim(hand, everyDie(hand).slice(0, 5), 'full-house', LADDER, NOTHING)
    const fives = decide(house, 'end-turn', 0, stone, FIRST)
    expect(addedBy(fives.amends)).toBe(10)
  })

  /** A `block` face turns its value aside from the incoming hit (art. 47). */
  it('turns a `block` face aside from the blow, and reports it as blocked', () => {
    const turn = pair()
    const shield: Goods = {
      ...NOTHING,
      trinkets: [trinket('t.block', [{ kind: 'block', amount: 4 }])],
    }
    const bare = decide(turn, 'end-turn', 0, NOTHING)
    const held = decide(turn, 'end-turn', 0, shield, FIRST)
    expect(turnedBy(held.amends)).toBe(4)
    expect(held.harmTaken).toBe(Math.max(0, bare.harmTaken - 4))
    expect(held.blocked).toBe(Math.min(4, turn.intent.amount))
  })

  /**
   * And it blocks through a corroding intent, because corrosion eats the
   * *body stat* (art. 47) and this happened at score time. It is the thing
   * that makes a rolling good a different answer from a wearable.
   */
  it('still blocks when the intent has corroded the armor (art. 47)', () => {
    const hand = turnOf([4, 4, 1, 2, 3, 5], { intent: { verb: 'CORRODE', amount: 9, effect: { kind: 'corrode' } } })
    const turn = claim(hand, everyDie(hand).slice(0, 2), 'pair', LADDER, NOTHING)
    const shield: Goods = {
      ...NOTHING,
      trinkets: [trinket('t.block', [{ kind: 'block', amount: 4 }])],
    }
    // The armor is eaten and the trinket is not: nine, less the four it turned.
    expect(decide(turn, 'end-turn', 6, NOTHING).harmTaken).toBe(9)
    expect(decide(turn, 'end-turn', 6, shield, FIRST).harmTaken).toBe(5)
  })

  /** A `cost` face bites, in the same channel art. 86's cost faces bite in. */
  it('charges a `cost` face into `hurt`, where every other cost face lands', () => {
    const turn = pair()
    const biting: Goods = {
      ...NOTHING,
      trinkets: [trinket('t.cost', [{ kind: 'cost', amount: 5 }])],
    }
    const bitten = decide(turn, 'end-turn', 0, biting, FIRST)
    expect(bittenBy(bitten.amends)).toBe(5)
    expect(bitten.hurt).toBe(5)
    // Armor does not touch it. It did not come from the horror (art. 47).
    expect(decide(turn, 'end-turn', 99, biting, FIRST).hurt).toBe(5)
  })

  /** A null did not fire, and it moves nothing at all. */
  it('moves nothing on a null, and says so', () => {
    const turn = pair()
    const idle: Goods = { ...NOTHING, trinkets: [trinket('t.null', [{ kind: 'null' }])] }
    const rolled = decide(turn, 'end-turn', 3, idle, FIRST)
    const plain = decide(turn, 'end-turn', 3, NOTHING)
    expect(rolled.amends).toHaveLength(1)
    expect(didFire(rolled.amends[0]!)).toBe(false)
    expect(rolled.harmDealt).toBe(plain.harmDealt)
    expect(rolled.harmTaken).toBe(plain.harmTaken)
    expect(rolled.hurt).toBe(plain.hurt)
  })

  /**
   * **One roll per turn, and they do not reroll.** art. 41's second casting
   * is the hand's; a trinket is thrown once, when the turn is attacked.
   */
  it('rolls once per turn, once per carried good, and no more', () => {
    const lot = counting([0, 0])
    const two: Goods = {
      ...NOTHING,
      trinkets: [
        trinket('t.a', [{ kind: 'add', amount: 1 }]),
        trinket('t.b', [{ kind: 'add', amount: 1 }]),
      ],
    }
    const rolled = rollAmends(pair(), two, lot)
    expect(rolled).toHaveLength(2)
    expect(lot.drawn()).toBe(2)
  })

  /**
   * **No claim, no roll.** They amend what the line came to, and a turn of
   * armour and patience (art. 46) has no line — so it is not a turn a carried
   * thing bites you on, and nothing is drawn for it either.
   */
  it('does not roll on a turn that claimed nothing', () => {
    const turn = turnOf([1, 2, 3, 4, 5, 6])
    const biting: Goods = {
      ...NOTHING,
      trinkets: [trinket('t.cost', [{ kind: 'cost', amount: 5 }])],
    }
    expect(rollAmends(turn, biting, SCREAMS)).toEqual([])
    expect(decide(turn, 'end-turn', 0, biting, SCREAMS).hurt).toBe(0)
  })

  /** And running is not attacking, so nothing rolls on a flight either. */
  it('rolls nothing on a flight (art. 41)', () => {
    const biting: Goods = {
      ...NOTHING,
      trinkets: [trinket('t.cost', [{ kind: 'cost', amount: 5 }])],
    }
    const fled = decide(pair(), 'flee', 0, biting, SCREAMS)
    expect(fled.amends).toEqual([])
    expect(fled.hurt).toBe(0)
  })
})

describe('card 93 §1 — the cap is the engine’s, not the caller’s', () => {
  const three: readonly Trinket[] = [
    trinket('t.a', [{ kind: 'add', amount: 1 }]),
    trinket('t.b', [{ kind: 'add', amount: 1 }]),
    trinket('t.c', [{ kind: 'add', amount: 1 }]),
  ]

  it('carries at most the cap, however many are held', () => {
    expect(carriedTrinkets({ ...NOTHING, trinkets: three, trinketCap: 2 })).toHaveLength(2)
    // And the cap is what actually rolls, not just what is listed.
    const rolled = rollAmends(
      claimed([4, 4, 1, 2, 3, 5]),
      { ...NOTHING, trinkets: three, trinketCap: 2 },
      counting([0, 0, 0]),
    )
    expect(rolled).toHaveLength(2)
  })

  it('is uncapped when no cap is declared, which is what an old fixture wants', () => {
    expect(carriedTrinkets({ ...NOTHING, trinkets: three })).toHaveLength(3)
    expect(carriedTrinkets(NOTHING)).toEqual([])
  })
})

describe('card 93 §1 — a face is worth what it declares (art. 54)', () => {
  it('reads every kind, and never below nothing', () => {
    expect(worthOf({ kind: 'add', amount: 3 }, 5)).toBe(3)
    expect(worthOf({ kind: 'block', amount: 3 }, 5)).toBe(3)
    expect(worthOf({ kind: 'cost', amount: 3 }, 5)).toBe(3)
    expect(worthOf({ kind: 'per', amount: 3 }, 5)).toBe(15)
    expect(worthOf({ kind: 'null' }, 5)).toBe(0)
    expect(worthOf({ kind: 'per', amount: 3 }, 0)).toBe(0)
  })

  /** The pouch is not where these live, and nothing about it moved. */
  it('leaves the pouch alone — a trinket is never one of the six (art. 60)', () => {
    expect(PLAIN_POUCH.dice.some((die) => 'rolls' in die)).toBe(false)
  })
})
