/**
 * card 69 — **the turn says what it did.**
 *
 * Traced in the playtest of 2026-08-06 with nothing skipped: the offer read
 * *pair 20*, Attack was pressed, and the band went straight on to the next
 * intent while two numbers moved underneath it. Nothing ever said the player
 * hit for 20, or that it hit back for 7. Both halves of the exchange were
 * communicated entirely by arithmetic.
 *
 * And the ending: the run finished, and what was on screen was the *next*
 * run's Crossing, fully lit, vitals full, one lowercase line — with the
 * lesson keyed on the horror rather than on the blow, so a death to CORRODE
 * taught *"the fifth one is the big one. count them"*.
 */

import { describe, expect, it } from 'vitest'

import {
  CANDLE_WORDS,
  DEATHS,
  END_LINES,
  EXCHANGE,
  GNAWING_SCRIPT,
  HORROR_SCRIPTS,
  NOTICES,
  SCRAWL_WORDS,
  THE_GNAWING,
  endLineFor,
  endLineOf,
  lintVoice,
  saysDeath,
  saysExchange,
} from '../src/content/index.js'
import type { Resolution } from '../src/lots/index.js'

const NOTHING: Resolution = {
  decision: 'end-turn',
  harmDealt: 0,
  harmTaken: 0,
  healed: 0,
  hurt: 0,
  blocked: 0,
  linesSpent: [],
  fled: false,
  binds: [],
  bleeds: null,
  fed: 0,
}

const exchange = (over: Partial<Resolution>): string => saysExchange({ ...NOTHING, ...over })

describe('card 69 — a turn carries both halves of the exchange', () => {
  it('names what you dealt and what it took, in one line', () => {
    const said = exchange({ harmDealt: 20, harmTaken: 7 })
    expect(said, 'the attack is in the line').toContain('20')
    expect(said, 'the blow is in the line').toContain('7')
  })

  it('tells armour eating a blow apart from nothing having been thrown', () => {
    // A player who cannot tell these apart cannot tell whether the armour is
    // doing anything, which is most of what art. 47 is for.
    const stopped = exchange({ harmDealt: 12, harmTaken: 0, blocked: 6 })
    const quiet = exchange({ harmDealt: 12, harmTaken: 0, blocked: 0 })
    expect(stopped).not.toBe(quiet)
    expect(stopped).toContain('12')
    expect(quiet).toContain('12')
  })

  it('says the cost face in the same breath as the claim that spent it', () => {
    // arts 54, 86: a price he chose to pay is part of what happened, not a
    // number in a readout.
    const priced = exchange({ harmDealt: 18, harmTaken: 4, hurt: 3 })
    expect(priced).toContain('3')
    expect(priced.length).toBeGreaterThan(exchange({ harmDealt: 18, harmTaken: 4 }).length)
  })

  it('still answers a turn where nothing at all happened', () => {
    // art. 69: silence is a bug, and a turn of armour and patience (art. 46)
    // is the turn most likely to produce one.
    expect(exchange({}).length).toBeGreaterThan(0)
  })

  it('leaves no unfilled token in any shape it can produce', () => {
    const every = [
      exchange({ harmDealt: 20, harmTaken: 7 }),
      exchange({ harmDealt: 20 }),
      exchange({ harmDealt: 20, blocked: 5 }),
      exchange({ harmTaken: 7 }),
      exchange({}),
      exchange({ harmDealt: 9, harmTaken: 2, hurt: 3, healed: 2 }),
    ]
    for (const said of every) {
      expect(said, said).not.toMatch(/\{[a-z]+\}/)
      expect(said.trim().split(/\s+/).length).toBeLessThanOrEqual(CANDLE_WORDS)
    }
  })

  it('writes every shape in the amended register', () => {
    for (const said of Object.values(EXCHANGE)) {
      expect(lintVoice(said, 'thought'), said).toEqual([])
    }
  })
})

describe('card 69 — the scrawl keys on the blow', () => {
  it('teaches the intent that landed rather than the horror carrying it', () => {
    // The exact defect: killed by the Gnawing's CORRODE, told to count to
    // the fifth intent — a note about a thing that did not happen.
    const byBlow = endLineFor('CORRODE', THE_GNAWING.id)
    expect(byBlow).not.toBe(endLineOf(THE_GNAWING.id))
    expect(END_LINES[byBlow]).toBeDefined()
    expect(END_LINES[byBlow]).toContain('armour')
  })

  it('authors a lesson for every intent any horror can kill you with', () => {
    const verbs = new Set(HORROR_SCRIPTS.flat().map((intent) => intent.verb))
    expect(verbs.size).toBeGreaterThan(10)
    for (const verb of verbs) {
      const cause = endLineFor(verb, THE_GNAWING.id)
      expect(cause, `${verb} falls back to the horror's line`).toBe(`end.${verb.toLowerCase()}`)
      const said = END_LINES[cause] ?? ''
      expect(said, `${verb} has no scrawl`).not.toBe('')
      expect(lintVoice(said, 'scrawl'), `${verb}: ${said}`).toEqual([])
      expect(said.trim().split(/\s+/).length).toBeLessThanOrEqual(SCRAWL_WORDS)
    }
  })

  it('means the same thing whichever horror is carrying the intent', () => {
    // An intent kind is a rule, not a personality — which is what makes the
    // Warden's script an exam (card 31) and these lessons worth learning.
    for (const script of HORROR_SCRIPTS) {
      for (const intent of script) {
        expect(endLineFor(intent.verb, 'horror.gnawing')).toBe(
          endLineFor(intent.verb, 'horror.warden'),
        )
      }
    }
  })

  it('falls back to the horror only when there is nothing at all to name', () => {
    expect(endLineFor('', THE_GNAWING.id)).toBe(endLineOf(THE_GNAWING.id))
    expect(endLineFor('NOT_AN_INTENT', THE_GNAWING.id)).toBe(endLineOf(THE_GNAWING.id))
  })

  it('gives the two ends that are nobody’s intent their own lessons', () => {
    // arts 65, 86: a bleed lands after the blow and can finish a turn the
    // blow did not — the playtest's own death was one — and a cost face is a
    // price the player chose. Neither borrows the horror's line.
    for (const stem of ['bleed', 'cost']) {
      const cause = endLineFor(stem, THE_GNAWING.id)
      expect(cause).toBe(`end.${stem}`)
      const said = END_LINES[cause] ?? ''
      expect(said, `${stem} has no scrawl`).not.toBe('')
      expect(said).not.toBe(END_LINES[endLineOf(THE_GNAWING.id)])
      expect(lintVoice(said, 'scrawl'), `${stem}: ${said}`).toEqual([])
      expect(said.trim().split(/\s+/).length).toBeLessThanOrEqual(SCRAWL_WORDS)
    }
  })

  it('keeps the Gnawing’s fifth-intent lesson true of the intent it names', () => {
    // The old line was right about the Gnawing and wrong about the death.
    // Its replacement has to be right about the intent, so: check it is.
    const bellow = GNAWING_SCRIPT[4]
    expect(bellow?.verb).toBe('BELLOW')
    expect(bellow?.amount).toBe(Math.max(...GNAWING_SCRIPT.map((one) => one.amount)))
    expect(END_LINES[endLineFor('BELLOW', THE_GNAWING.id)]).toContain('breath')
  })
})

describe('card 69 — the ending is an event', () => {
  it('gives a death a candle of its own before the scrawl', () => {
    const said = saysDeath('end.death')
    expect(said).not.toBe('')
    expect(said).not.toBe(END_LINES['end.death'])
    expect(lintVoice(said, 'thought'), said).toEqual([])
  })

  it('falls every killing blow to one death candle, and keeps the valve its own', () => {
    // The specificity belongs in the scrawl, where the lesson is. What does
    // get its own is art. 3's valve, which is not a blow at all.
    expect(saysDeath('end.bellow')).toBe(saysDeath('end.death'))
    expect(saysDeath('end.kept')).not.toBe(saysDeath('end.death'))
    for (const said of Object.values(DEATHS)) {
      expect(lintVoice(said, 'thought'), said).toEqual([])
    }
  })

  it('gives the Warden’s fall a line of its own', () => {
    // art. 37: the keeper the depth was built around does not fall to the
    // same six words a stray in a corridor falls to.
    const fell = NOTICES['warden.fell'] ?? ''
    expect(fell).not.toBe('')
    expect(fell).not.toBe(NOTICES['fight.won'])
  })
})
