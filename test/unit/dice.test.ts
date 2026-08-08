import { describe, expect, it } from 'vitest'

import { Rng, faceOf, reroll, roll, toggle } from '../../src/combat/dice.js'
import { DICE, HAND_SIZE, LOOT_DICE, STARTING_DICE, die, isDieId } from '../../src/content/dice.js'

const rng = () => new Rng(20260808)

describe('the dice content', () => {
  it('gives every die exactly six faces', () => {
    for (const d of Object.values(DICE)) {
      expect(d.faces).toHaveLength(6)
      for (const face of d.faces) expect(face.value).toBeGreaterThanOrEqual(1)
      for (const face of d.faces) expect(face.value).toBeLessThanOrEqual(6)
    }
  })

  it('gives every die one rule sentence and a build hint', () => {
    for (const d of Object.values(DICE)) {
      expect(d.rule.length).toBeGreaterThan(0)
      expect(d.goodWith.length).toBeGreaterThan(0)
      // Flavour lives below a divider and is never mixed into the rule.
      if (d.flavour) expect(d.rule).not.toContain(d.flavour)
    }
  })

  it('uses only the two keywords that have a visible descriptor', () => {
    for (const d of Object.values(DICE)) {
      for (const face of d.faces) {
        if (!face.effect) continue
        expect(['hurt', 'heal']).toContain(face.effect.kind)
        expect(face.effect.amount).toBeGreaterThan(0)
        // A cost the player cannot read is a cost they cannot price, so the
        // rule sentence has to state the number the face carries.
        expect(d.rule).toContain(String(face.effect.amount))
      }
    }
  })

  it('starts with six plain bones and offers only specials as loot', () => {
    expect(STARTING_DICE).toHaveLength(HAND_SIZE)
    expect(HAND_SIZE).toBe(6)
    expect(new Set(STARTING_DICE)).toEqual(new Set(['plain']))
    expect(LOOT_DICE).not.toContain('plain')
    for (const id of LOOT_DICE) expect(isDieId(id)).toBe(true)
  })

  it('gives each die a material that tells it apart from a plain bone', () => {
    for (const id of LOOT_DICE) expect(die(id).material).not.toBe(die('plain').material)
  })
})

describe('rolling', () => {
  it('throws exactly as many dice as the hand holds', () => {
    for (const size of [1, 3, 6, 8]) {
      const hand = Array.from({ length: size }, () => 'plain')
      expect(roll(hand, rng())).toHaveLength(size)
    }
  })

  it('gives each die a distinct slot, in the hand order', () => {
    const thrown = roll(['plain', 'careful', 'leech', 'plain', 'runner', 'pusher'], rng())
    expect(thrown.map((d) => d.slot)).toEqual([0, 1, 2, 3, 4, 5])
    expect(thrown[1]!.dieId).toBe('careful')
  })

  it('only ever shows a face the die actually has', () => {
    const r = rng()
    for (let i = 0; i < 400; i++) {
      for (const d of roll([...LOOT_DICE, 'plain'], r)) {
        expect(die(d.dieId).faces[d.faceIndex]!.value).toBe(d.value)
      }
    }
  })

  it('is deterministic from its seed', () => {
    expect(roll(STARTING_DICE, new Rng(7))).toEqual(roll(STARTING_DICE, new Rng(7)))
  })
})

describe('rerolling', () => {
  it('preserves a kept die exactly, and rerolls the count unchanged', () => {
    const first = roll(STARTING_DICE, rng())
    const keep = [0, 2, 5]
    const second = reroll(first, keep, new Rng(99))
    expect(second).toHaveLength(first.length)
    for (const slot of keep) {
      expect(second.find((d) => d.slot === slot)).toEqual(first.find((d) => d.slot === slot))
    }
  })

  it('throws every unkept die exactly once', () => {
    // Once, not twice: a die drawn from the stream a second time would make the
    // reroll depend on how many dice were kept.
    const hand = ['careful', 'careful', 'careful', 'careful', 'careful', 'careful']
    const first = roll(hand, rng())
    const a = reroll(first, [0], new Rng(4242))
    const b = reroll(first, [0], new Rng(4242))
    expect(a).toEqual(b)
    for (const d of a) expect(die(d.dieId).faces[d.faceIndex]!.value).toBe(d.value)
  })

  it('keeps the face and its keyword together', () => {
    const thrown = roll(['pusher'], new Rng(1))
    const d = thrown[0]!
    expect(faceOf(d)).toBe(die('pusher').faces[d.faceIndex])
  })
})

describe('choosing', () => {
  it('toggles, stays sorted, and never repeats a slot', () => {
    let chosen: readonly number[] = []
    chosen = toggle(chosen, 3)
    chosen = toggle(chosen, 1)
    chosen = toggle(chosen, 5)
    expect(chosen).toEqual([1, 3, 5])
    chosen = toggle(chosen, 3)
    expect(chosen).toEqual([1, 5])
    chosen = toggle(chosen, 1)
    chosen = toggle(chosen, 5)
    expect(chosen).toEqual([])
  })

  it('never lets one slot appear twice', () => {
    let chosen: readonly number[] = []
    for (let i = 0; i < 20; i++) chosen = toggle(chosen, i % 6)
    expect(new Set(chosen).size).toBe(chosen.length)
  })
})
