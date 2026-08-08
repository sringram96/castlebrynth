import { describe, expect, it } from 'vitest'

import { HANDS, LADDER, armorOf, preview, recognise } from '../../src/combat/scoring.js'
import type { HandName } from '../../src/combat/scoring.js'
import type { Value } from '../../src/content/dice.js'
import { RELICS } from '../../src/content/relics.js'

const v = (...values: number[]): Value[] => values as Value[]
const plain = (...values: number[]) => v(...values).map((value) => ({ value }))

describe('hand recognition', () => {
  it('labels every supported pattern', () => {
    expect(recognise(v(5, 5)).name).toBe('pair')
    expect(recognise(v(4, 4, 4)).name).toBe('triple')
    expect(recognise(v(2, 3, 4)).name).toBe('straight3')
    expect(recognise(v(6, 6, 6, 2, 2)).name).toBe('fullHouse')
    expect(recognise(v(1, 1, 1, 1)).name).toBe('quad')
    expect(recognise(v(2, 3, 4, 5, 6)).name).toBe('straight5')
  })

  it('does not care what order the dice were chosen in', () => {
    expect(recognise(v(4, 6, 5, 2, 3)).name).toBe('straight5')
    expect(recognise(v(2, 6, 6, 2, 6)).name).toBe('fullHouse')
  })

  it('invents nothing: anything else is ANY, and ANY always scores', () => {
    for (const values of [v(3), v(3, 5), v(1, 2, 4), v(1, 1, 2, 3), v(6, 6, 5, 5, 4, 4)]) {
      expect(recognise(values).name).toBe('any')
      expect(recognise(values).multiplier).toBe(1)
    }
  })

  it('recognises a hand only at its own size', () => {
    // Three dice containing a pair are not a Pair: the hand is the dice you
    // chose, not a subset the engine went looking for.
    expect(recognise(v(5, 5, 2)).name).toBe('any')
    expect(recognise(v(4, 4, 4, 2)).name).toBe('any')
    expect(recognise(v(1, 2, 3, 4)).name).toBe('any')
  })

  it('needs a straight to be consecutive and distinct', () => {
    expect(recognise(v(2, 3, 5)).name).toBe('any')
    expect(recognise(v(3, 3, 4)).name).toBe('any')
    expect(recognise(v(1, 2, 3, 4, 6)).name).toBe('any')
  })

  it('has an empty selection score nothing', () => {
    expect(preview([], []).damage).toBe(0)
  })

  it('keeps the ladder and the table in step', () => {
    expect([...LADDER].sort()).toEqual(Object.keys(HANDS).sort())
    for (const name of LADDER) expect(HANDS[name].multiplier).toBeGreaterThan(0)
  })
})

describe('the damage formula', () => {
  it('is sum times multiplier', () => {
    const p = preview(plain(5, 5, 5), [])
    expect(p.sum).toBe(15)
    expect(p.multiplier).toBe(3)
    expect(p.damage).toBe(45)
  })

  it("adds a relic's multiplier to the hand it names, and to no other", () => {
    expect(preview(plain(6, 6), ['knuckle']).damage).toBe(12 * 3)
    expect(preview(plain(6, 6, 6), ['knuckle']).damage).toBe(18 * 3)
  })

  it('pays a first-of-fight relic once', () => {
    const first = preview(plain(2, 3, 4), ['rosary'])
    expect(first.damage).toBe(9 * 3 + 12)
    const again = preview(plain(2, 3, 4), ['rosary'], ['straight3'])
    expect(again.damage).toBe(9 * 3)
  })

  it('counts a marked face for the Blood Thimble, and charges for it too', () => {
    const selection = [{ value: 1 as Value, effect: { kind: 'hurt' as const, amount: 7 } }, { value: 1 as Value }]
    const p = preview(selection, ['thimble'])
    expect(p.damage).toBe(2 * 2 + 8)
    expect(p.cost).toBe(7)
  })

  it('doubles only a uniform selection', () => {
    expect(preview(plain(4, 4, 4), ['nail']).damage).toBe(12 * 3 * 2)
    expect(preview(plain(2, 3, 4), ['nail']).damage).toBe(9 * 3)
    // One die is not "all the same value" in any sense a player would mean.
    expect(preview(plain(6), ['nail']).damage).toBe(6)
  })

  it('heals on exactly the size Grave Wax names', () => {
    expect(preview(plain(1, 2, 3), ['wax']).heal).toBe(2)
    expect(preview(plain(1, 2, 3, 4), ['wax']).heal).toBe(0)
  })

  it('does not depend on the order relics are carried in', () => {
    const selection = plain(6, 6)
    const ids = ['knuckle', 'rosary', 'plate', 'thimble', 'wax', 'nail']
    const forwards = preview(selection, ids).damage
    const backwards = preview(selection, [...ids].reverse()).damage
    expect(forwards).toBe(backwards)
  })

  it('reads armour off the relics and nowhere else', () => {
    expect(armorOf([])).toBe(0)
    expect(armorOf(['plate'])).toBe(2)
    expect(armorOf(['knuckle', 'wax'])).toBe(0)
  })

  it('names every relic effect the shipped catalogue uses', () => {
    const handled = new Set([
      'multiplier',
      'firstOfFight',
      'armor',
      'perMarkedFace',
      'healOnExactly',
      'doubleIfUniform',
    ])
    for (const r of Object.values(RELICS)) expect(handled.has(r.effect.kind)).toBe(true)
  })

  it('only names hands that exist', () => {
    for (const r of Object.values(RELICS)) {
      const e = r.effect
      const named: HandName[] =
        e.kind === 'multiplier' ? [e.hand] : e.kind === 'firstOfFight' ? [...e.hands] : []
      for (const name of named) expect(LADDER).toContain(name)
    }
  })
})
