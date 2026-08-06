import { describe, expect, it } from 'vitest'

import {
  LADDER,
  ROLLING_CAP,
  ROLLING_GOODS,
  THE_SLIVER,
  THE_TIN_SAINT,
} from '../src/content/index.js'
import type { Amend, Goods, Lot, Trinket } from '../src/lots/index.js'
import { auditTrinket, claim, decide, rollAmends, worthOf } from '../src/lots/index.js'
import { everyDie, turnOf } from './helpers.js'

/**
 * **Card 93, section 2 — the faces.**
 *
 * Four kinds and a cost face, authored as data so a fifth is content. What
 * this file keeps is the one thing about them that is *not* tuning: **the
 * nulls are the feature.** Every rolling good carries at least two of them and
 * at least one cost face, because a good that fires every turn is a number on
 * the body, and a number on the body is a wearable (art. 47) rather than a
 * thing that rolls. It is also the whole reason art. 54's audit lets a face
 * this large exist at all.
 *
 * The numbers themselves are tuning and are not asserted here — they are
 * measured in `test/report.ts` and published in DESIGN.md, and an assertion on
 * one would be a band this wave is forbidden to add.
 */

const NOTHING: Goods = { talismans: [], riders: [] }

/** Every face in turn, so a trinket can be examined face by face. */
function facing(trinket: Trinket, at: number): Lot {
  return { next: () => at / trinket.rolls.length }
}

/** A turn with a claim of `size` dice on it — what an amendment amends. */
function claimedOf(size: 2 | 5): ReturnType<typeof turnOf> {
  const values = size === 2 ? [4, 4, 1, 2, 3, 5] : [5, 5, 5, 2, 2, 6]
  const turn = turnOf(values)
  return claim(turn, everyDie(turn).slice(0, size), size === 2 ? 'pair' : 'full-house', LADDER, NOTHING)
}

describe('card 93 §2 — every rolling good pays on its own faces (art. 54)', () => {
  it('ships two, and no more, so the cap is a guard rather than a wall', () => {
    expect(ROLLING_GOODS).toHaveLength(2)
    expect(ROLLING_GOODS.length).toBeLessThanOrEqual(ROLLING_CAP)
    expect(ROLLING_GOODS.map((one) => one.id)).toEqual([THE_TIN_SAINT.id, THE_SLIVER.id])
  })

  /** The bar, and it is the article rather than the tuning. */
  it('gives every one of them at least two nulls and one cost face', () => {
    for (const one of ROLLING_GOODS) {
      const report = auditTrinket(one)
      expect(report.nulls, one.id as string).toBeGreaterThanOrEqual(2)
      expect(report.costFaces, one.id as string).toBeGreaterThanOrEqual(1)
      expect(report.cost, one.id as string).toBeGreaterThan(0)
      expect(report.paid, one.id as string).toBe(true)
    }
  })

  /**
   * And the audit bites. A trinket that gives without whiffing fails it, so
   * the check above is a check rather than a tautology — the same reason
   * `THE_ORPHAN` exists for the dice.
   */
  it('fails a rolling good that fires every turn — so the audit bites', () => {
    const flat: Trinket = {
      id: 'trinket.flat' as Trinket['id'],
      rolls: Array.from({ length: 6 }, (): Amend => ({ kind: 'add', amount: 2 })),
    }
    const report = auditTrinket(flat)
    expect(report.nulls).toBe(0)
    expect(report.paid).toBe(false)
    expect(ROLLING_GOODS.map((one) => one.id)).not.toContain(flat.id)
  })

  /**
   * **The bite stops short of the run** (art. 120's floor, and art. 61's).
   * A price may take from the body and never take the last of it, so no cost
   * face may be big enough to be the thing that ends a run on its own.
   */
  it('keeps every bite survivable, well under a whole body', () => {
    for (const one of ROLLING_GOODS) {
      // Two carried is the cap, so the worst turn in the game is both of them
      // biting at once — and it must still be a wound rather than a death.
      expect(auditTrinket(one).cost).toBeLessThan(16)
    }
    const worst = ROLLING_GOODS.map((one) => auditTrinket(one).cost).reduce((a, b) => a + b, 0)
    expect(worst).toBeLessThan(24)
  })
})

describe('card 93 §2 — the four kinds, one at a time', () => {
  it('turns a blow aside on the tin saint’s block faces', () => {
    const blocks = THE_TIN_SAINT.rolls.filter((face) => face.kind === 'block')
    expect(blocks.length).toBeGreaterThan(0)
    for (const [at, face] of THE_TIN_SAINT.rolls.entries()) {
      if (face.kind !== 'block') continue
      const rolled = rollAmends(
        claimedOf(2),
        { ...NOTHING, trinkets: [THE_TIN_SAINT] },
        facing(THE_TIN_SAINT, at),
      )
      expect(rolled[0]!.face).toEqual(face)
      expect(rolled[0]!.amount).toBe(face.amount)
    }
  })

  /**
   * **`per` pays twice on a pair and five times on a full house.** It is the
   * only kind whose worth rises as the hand improves, and it is why the sliver
   * is a different good to a better player than to a worse one.
   */
  it('pays the sliver’s per faces once for every die in the claim', () => {
    const at = THE_SLIVER.rolls.findIndex((face) => face.kind === 'per')
    const face = THE_SLIVER.rolls[at]!
    expect(face.kind).toBe('per')
    const each = face.kind === 'per' ? face.amount : 0
    const carrying: Goods = { ...NOTHING, trinkets: [THE_SLIVER] }
    expect(rollAmends(claimedOf(2), carrying, facing(THE_SLIVER, at))[0]!.amount).toBe(each * 2)
    expect(rollAmends(claimedOf(5), carrying, facing(THE_SLIVER, at))[0]!.amount).toBe(each * 5)
  })

  /** A full house pays the sliver five times over, in the attack it lands in. */
  it('lands the sliver’s five-fold pay in the attack itself', () => {
    const at = THE_SLIVER.rolls.findIndex((face) => face.kind === 'per')
    const face = THE_SLIVER.rolls[at]!
    const each = face.kind === 'per' ? face.amount : 0
    const house = claimedOf(5)
    const plain = decide(house, 'end-turn', 0, NOTHING)
    const paid = decide(
      house,
      'end-turn',
      0,
      { ...NOTHING, trinkets: [THE_SLIVER] },
      facing(THE_SLIVER, at),
    )
    expect(paid.harmDealt).toBe(plain.harmDealt + each * 5)
  })

  /** And the flat cut, which is the `add` kind, pays the same either way. */
  it('pays the sliver’s add face flat, whatever the hand did', () => {
    const at = THE_SLIVER.rolls.findIndex((face) => face.kind === 'add')
    const face = THE_SLIVER.rolls[at]!
    expect(face.kind).toBe('add')
    const flat = face.kind === 'add' ? face.amount : 0
    const carrying: Goods = { ...NOTHING, trinkets: [THE_SLIVER] }
    expect(rollAmends(claimedOf(2), carrying, facing(THE_SLIVER, at))[0]!.amount).toBe(flat)
    expect(rollAmends(claimedOf(5), carrying, facing(THE_SLIVER, at))[0]!.amount).toBe(flat)
  })

  /** Every face of every shipped good is worth something readable (art. 54). */
  it('declares a number on every face that is not a null', () => {
    for (const one of ROLLING_GOODS) {
      for (const face of one.rolls) {
        if (face.kind === 'null') {
          expect(worthOf(face, 3)).toBe(0)
          continue
        }
        expect(face.amount, `${one.id as string} ${face.kind}`).toBeGreaterThan(0)
        expect(worthOf(face, 1), `${one.id as string} ${face.kind}`).toBeGreaterThan(0)
      }
    }
  })

  /**
   * **No multiplier face ships.** It measured +0.254 at a weak hand — near
   * double a good bone, and about what the unaudited Zealot is worth — and it
   * is legal here *only* because it whiffs. It is not authored, so the union
   * has no branch for it: a kind nobody ships is a kind that does not exist,
   * which is what "author them as data so a fifth is content" buys.
   */
  it('authors no multiplier face, and holds no branch for one', () => {
    const kinds = new Set(ROLLING_GOODS.flatMap((one) => one.rolls.map((face) => face.kind)))
    expect([...kinds].sort()).toEqual(['add', 'block', 'cost', 'null', 'per'])
  })
})
