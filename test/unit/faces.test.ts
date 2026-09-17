/**
 * The faces, drawn rather than described.
 *
 * `content/rewards.ts` has always stated the law — *not a hint, not a category
 * — the faces* — and what shipped was a sentence about them. What is under test
 * here is the finished version of it: one derivation, from each die's own
 * table, that a card, a slot inspection and the menu all draw.
 *
 * The property that matters most is the one nobody can see: **a die authored
 * later gets a strip for free.** Nothing in `content/faces.ts` enumerates a
 * die, so these walk the tables rather than naming their contents.
 */

import { describe, expect, it } from 'vitest'

import {
  BLANK_CHIP,
  carried,
  carriedName,
  faceStrip,
  familyOf,
  stripFor,
} from '../../src/content/faces.js'
import {
  CORE_DICE,
  IRON_DICE,
  ITEM_DICE,
  TALISMANS,
  itemDie,
  ironDie,
} from '../../src/content/dice.js'

describe('every die in the tables has a strip', () => {
  it('gives a core die one chip per face, in face order', () => {
    for (const id of Object.keys(CORE_DICE)) {
      const strip = faceStrip({ family: 'core', id })
      expect(strip.map((c) => c.text), id).toEqual(CORE_DICE[id as 'bone']!.faces.map(String))
      for (const chip of strip) expect(chip.kind).toBe('value')
    }
  })

  it('gives an iron die one chip per face, blocks and all', () => {
    for (const id of Object.keys(IRON_DICE)) {
      const strip = faceStrip({ family: 'iron', id })
      const die = ironDie(id as 'rustplate')
      expect(strip).toHaveLength(die.faces.length)
      expect(strip.map((c) => c.text)).toEqual(die.faces.map(String))
      // Zero is a real face and is drawn as one — never as a gap.
      expect(strip.map((c) => c.text)).toContain('0')
      for (const chip of strip) expect(chip.kind).toBe('block')
    }
  })

  it('gives an item die a chip per face, with the kind on the chip', () => {
    for (const id of Object.keys(ITEM_DICE)) {
      const die = itemDie(id as 'grave-candle')
      const strip = faceStrip({ family: 'item', id })
      expect(strip, id).toHaveLength(die.faces.length)
      die.faces.forEach((face, index) => {
        const chip = strip[index]!
        expect(chip.kind, `${id} face ${index}`).toBe(face.kind)
        if (face.kind === 'flat') expect(chip.text).toBe(`+${face.amount}`)
        if (face.kind === 'cost') expect(chip.text).toBe(`−${face.bones}`)
        if (face.kind === 'blank') expect(chip.text).toBe(BLANK_CHIP)
      })
    }
  })

  it('draws the Grave Candle exactly as its table stands', () => {
    expect(stripFor('grave-candle')!.map((c) => c.text)).toEqual(['+3', '+3', '+5', '+5', '·', '·'])
  })

  it('draws the Rustplate exactly as its table stands', () => {
    expect(stripFor('rustplate')!.map((c) => c.text)).toEqual(['0', '0', '0', '0', '1', '2'])
  })

  it('draws the Splinter Fetish with its costs marked as costs', () => {
    const strip = stripFor('splinter-fetish')!
    expect(strip.map((c) => c.text)).toEqual(['+8', '+8', '·', '·', '−2', '−2'])
    expect(strip.filter((c) => c.kind === 'cost')).toHaveLength(2)
  })

  it('gives a talisman the honest equivalent: its lines, then its flat', () => {
    for (const id of Object.keys(TALISMANS)) {
      const t = TALISMANS[id as 'pair-talisman']!
      const strip = faceStrip({ family: 'talisman', id })
      expect(strip.filter((c) => c.kind === 'line')).toHaveLength(t.lines.length)
      expect(strip.at(-1)).toEqual({ kind: 'flat', text: `+${t.bonus}` })
    }
  })

  it('never restates a number the table does not hold', () => {
    // The whole reason the strip exists: a card built from prose can disagree
    // with the cascade, and one built from `faces` cannot.
    for (const [id, die] of Object.entries(ITEM_DICE)) {
      const flats = die.faces.filter((f) => f.kind === 'flat').map((f) => `+${f.amount}`)
      const drawn = stripFor(id)!.filter((c) => c.kind === 'flat').map((c) => c.text)
      expect(drawn, id).toEqual(flats)
    }
  })
})

describe('a thing with no faces has none', () => {
  it('answers nothing for a Vial, which has a press instead', () => {
    expect(stripFor('vial')).toBeUndefined()
    expect(familyOf('vial')).toBeUndefined()
  })
})

describe('one carried thing, whichever table it is in', () => {
  it('finds every die, the iron and the talisman by id alone', () => {
    const ids = [
      ...Object.keys(CORE_DICE),
      ...Object.keys(IRON_DICE),
      ...Object.keys(ITEM_DICE),
      ...Object.keys(TALISMANS),
    ]
    for (const id of ids) {
      const thing = carried(id)
      expect(thing, id).toBeDefined()
      expect(thing!.name.length, id).toBeGreaterThan(0)
      expect(thing!.rule.length, id).toBeGreaterThan(0)
      expect(carriedName(id)).toBe(thing!.name)
    }
  })
})

describe('the rule beside a strip says the two things a strip cannot', () => {
  it('says whether there is a press, everywhere there is not one', () => {
    const pressless = [
      ...Object.values(IRON_DICE),
      ...Object.values(ITEM_DICE),
      ...Object.values(TALISMANS),
    ]
    for (const thing of pressless) {
      expect(thing.rule, `${thing.name} does not say it has no press`).toMatch(/No press\.$/)
    }
  })

  it('says when the thing fires', () => {
    expect(itemDie('grave-candle').rule).toMatch(/ATTACK/)
    expect(ironDie('rustplate').rule).toMatch(/ROLL/)
    expect(TALISMANS['pair-talisman']!.rule).toMatch(/score/)
  })

  it('does not restate the faces in words', () => {
    // The failure this replaces: `+3, +3, +5, +5, or nothing twice` beside a
    // table that says something else. A rule with the faces spelled out in it
    // is a second copy of the table.
    for (const die of Object.values(ITEM_DICE)) {
      expect(die.rule, `${die.name} restates its faces`).not.toMatch(/\+\d/)
    }
  })
})
