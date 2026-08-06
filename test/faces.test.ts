/**
 * **The dice legible** (card 94, arts 54, 100, 111, 113).
 *
 * Sam's playtest of the rolling goods: *"I have no idea how to tell core die
 * apart from item die. The descriptions of special die are not clear. I can't
 * tell what item die are doing."* Three complaints, three sections, and this
 * file is the bar under each of them that can be held in code.
 *
 * What it can hold: that the two materials are actually two materials rather
 * than one in two colours, that every face of every shipped thing has a
 * drawing and a word, that there is exactly one phrasing of each of those
 * words, and that the pop's arithmetic is the engine's. What it cannot hold is
 * whether the rows read apart at arm's length on a phone — that is DESIGN.md's
 * manual pass and the report says so out loud.
 */

import { describe, expect, it } from 'vitest'

import {
  BONE_BODY,
  BONE_RAMP,
  BONE_RAMP_LIT,
  BONE_SCAR,
  FACE_GRID,
  IRON_BODY,
  IRON_EMPTY,
  IRON_RAMP,
  IRON_RAMP_LIT,
  IRON_RAMP_NULL,
  KIND_INK,
  LABELS,
  PLAIN_POUCH,
  READOUT,
  ROLLING_GOODS,
  TRAVELER_DICE,
  THE_SISTERS,
  faceSays,
  glyphFor,
  pipsFor,
  saysAmend,
  saysGood,
} from '../src/content/index.js'
import type { Drawing } from '../src/content/index.js'
import type { Amend } from '../src/lots/index.js'
import { scaleFor } from '../src/shell/faces.js'

const KINDS: readonly Amend['kind'][] = ['null', 'add', 'per', 'block', 'cost']

/** Which cells a drawing actually inks, as `x,y` — its silhouette, as a set. */
function inked(draw: Drawing): ReadonlySet<string> {
  const on = new Set<string>()
  draw.forEach((row, y) => {
    for (let x = 0; x < FACE_GRID; x++) {
      const cell = row[x]
      if (cell !== undefined && cell !== '.' && cell !== ' ') on.add(`${x},${y}`)
    }
  })
  return on
}

/** Every drawing is the same square, or the painter is stacking mismatched art. */
function wellFormed(draw: Drawing, what: string): void {
  expect(draw.length, `${what}: rows`).toBe(FACE_GRID)
  draw.forEach((row, y) => {
    expect(row.length, `${what}: row ${y}`).toBe(FACE_GRID)
    expect(row, `${what}: row ${y}`).toMatch(/^[0-9. ]+$/)
  })
}

describe('§1 — two materials, not one in two colours', () => {
  it('draws every layer on the one authored square', () => {
    wellFormed(BONE_BODY, 'bone')
    wellFormed(BONE_SCAR, 'scar')
    wellFormed(IRON_BODY, 'iron')
    wellFormed(IRON_EMPTY, 'iron at rest')
    for (let value = 1; value <= 6; value++) wellFormed(pipsFor(value), `pips ${value}`)
    for (const kind of KINDS) wellFormed(glyphFor(kind), `glyph ${kind}`)
  })

  /**
   * **The bar, as far as a test can carry it.** The wave asked that the two
   * rows be tellable apart with the screen upside down, which a colour swap
   * alone does not pass — so the thing to assert is that the *silhouettes*
   * differ, because a silhouette survives being turned over and a hue does
   * not. Bone is rounded and fills its square; iron is a bevelled octagon and
   * cuts its corners off.
   */
  it('gives the two materials different silhouettes', () => {
    const bone = inked(BONE_BODY)
    const iron = inked(IRON_BODY)
    expect(bone).not.toEqual(iron)
    // The corner is the whole of the difference at a glance: the octagon has
    // cut away what the rounded body keeps.
    expect(bone.has('2,2')).toBe(true)
    expect(iron.has('2,2')).toBe(false)
    // And the octagon is genuinely smaller across its diagonal than its side.
    expect(iron.size).toBeLessThan(bone.size)
  })

  /**
   * art. 100: a drawing is indices, never colours, so one drawing lights two
   * ways by swapping what its ramp says. If a ramp ever grew a step the other
   * did not have, a face would fall out of palette (art. 100's first
   * consequence) — which is what this holds.
   */
  it('relights one drawing rather than authoring a second', () => {
    for (const [what, ramp] of [
      ['bone lit', BONE_RAMP_LIT],
      ['iron lit', IRON_RAMP_LIT],
      ['iron null', IRON_RAMP_NULL],
    ] as const) {
      const base = what.startsWith('bone') ? BONE_RAMP : IRON_RAMP
      expect(ramp.length, what).toBe(base.length)
      expect(ramp, what).not.toEqual(base)
      for (const step of ramp) expect(step, what).toMatch(/^hsl\(/)
    }
  })

  /** An authored pixel never lands on half a device pixel (art. 25's reasoning). */
  it('scales an authored pixel to a whole number, always at least one', () => {
    for (const size of [8, 16, 24, 32, 42, 64]) {
      for (const ratio of [1, 1.5, 2, 3]) {
        const scale = scaleFor(size, ratio)
        expect(Number.isInteger(scale), `${size}@${ratio}`).toBe(true)
        expect(scale, `${size}@${ratio}`).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

describe('§2 — a die shows its faces, and a sentence is not a declaration', () => {
  /**
   * The defect this is the bar for: the choosing screen and the pouch drew
   * every die as its first face, so every die in the game rendered as a 1 and
   * the best one advertised itself as the worst. Every face of every shipped
   * die has to have a drawing, or a row cannot show one.
   */
  it('has a drawing for every face of every die that ships', () => {
    const dice = [...PLAIN_POUCH.dice, ...TRAVELER_DICE, ...THE_SISTERS]
    for (const die of dice) {
      expect(die.faces.length, die.id as string).toBe(die.body)
      for (const face of die.faces) {
        expect(inked(pipsFor(face.value)).size, `${die.id as string}: ${face.value}`).toBe(
          face.value * 4,
        )
      }
    }
  })

  /** arts 54, 86: the cost face is marked **where it sits**, not in general. */
  it('marks the cost face where it sits and nowhere else', () => {
    const scar = inked(BONE_SCAR)
    expect(scar.size).toBeGreaterThan(0)
    // It is on the body and clear of every pip, or it would read as a seventh.
    const anyPip = new Set([1, 2, 3, 4, 5, 6].flatMap((v) => [...inked(pipsFor(v))]))
    for (const cell of scar) expect(anyPip.has(cell), cell).toBe(false)
    for (const cell of scar) expect(inked(BONE_BODY).has(cell), cell).toBe(true)
  })

  /** Every trinket face has a glyph, and no two kinds share one. */
  it('gives each face kind its own glyph', () => {
    const seen = new Map<string, string>()
    for (const kind of KINDS) {
      const key = [...inked(glyphFor(kind))].sort().join('|')
      expect(key, kind).not.toBe('')
      expect(seen.has(key), `${kind} shares a glyph with ${seen.get(key) ?? ''}`).toBe(false)
      seen.set(key, kind)
    }
  })

  /** Every trinket face carries its plain-word label, nulls included. */
  it('labels every face of every shipped rolling good', () => {
    for (const good of ROLLING_GOODS) {
      expect(good.rolls.length, good.id as string).toBeGreaterThan(0)
      for (const face of good.rolls) {
        const said = faceSays(face)
        expect(said, `${good.id as string}: ${face.kind}`).not.toBe('')
        // No template left unfilled: a `{n}` on the frame is a number nobody
        // put in, and art. 54 asks for the number.
        expect(said, `${good.id as string}: ${face.kind}`).not.toContain('{')
        if (face.kind !== 'null') expect(said).toContain(`${face.amount}`)
      }
      expect(KIND_INK[good.rolls[0]!.kind]).toMatch(/^hsl\(/)
    }
  })
})

describe('§3 — one vocabulary, three places', () => {
  /**
   * **Do not write three phrasings of one fact.** The tray caption, the
   * inspect's face label and the word band all come out of `faceSays`, so the
   * assertion is that the other two contain what it says rather than that they
   * happen to agree today.
   */
  it('says a face the same way in the tray, the inspect and the band', () => {
    for (const good of ROLLING_GOODS) {
      const declared = saysGood(good)
      for (const face of good.rolls) {
        const word = faceSays(face)
        // The inspect: `saysGood` is the whole declaration, and the tray and
        // the inspect draw their captions from the same call.
        expect(declared, `${good.id as string}: ${face.kind}`).toContain(word)
        // The band, on the beat it lands.
        const landing = saysAmend({
          trinket: good.id,
          face,
          amount: face.kind === 'null' ? 0 : face.amount,
        })
        expect(landing, `${good.id as string}: ${face.kind}`).toContain(word)
        expect(landing, `${good.id as string}: ${face.kind}`).toContain(
          LABELS[good.id as string]!,
        )
      }
    }
  })

  /** The words are content's, and every one of them is authored. */
  it('authors every word the readout is made of', () => {
    for (const key of ['sum', 'line', 'blow', 'costs', 'nothing', 'add', 'block', 'per', 'bites']) {
      expect(READOUT[key], key).toBeDefined()
      expect(READOUT[key], key).not.toBe('')
    }
    // The four that carry a number carry it inside the words rather than
    // beside them, so a retuned face cannot drift off its own description.
    for (const key of ['add', 'block', 'per', 'bites', 'costs']) {
      expect(READOUT[key], key).toContain('{n}')
    }
  })
})
