/**
 * card 71 — **the intents say both halves, and they say them impending.**
 *
 * Two defects from the playtest of 2026-08-06, and the second one cost the
 * player health:
 *
 * - The first line anybody read on entering a fight was *"It swipes at
 *   you."* — present tense, health untouched — which reads as a report of a
 *   thing that already happened and undercuts art. 42's whole promise.
 * - Half of them explained their effect and never their damage. SEAL 6 said
 *   *"It jams your pair combos"* and nothing about the six it also lands.
 *   The other half explained nothing: BELLOW 16, the biggest hit in the
 *   depth, said *"It takes a long breath."*
 */

import { describe, expect, it } from 'vitest'

import {
  CANDLE_WORDS,
  GNAWING_SCRIPT,
  HORROR_SCRIPTS,
  INTENT_SAYS,
  MARROW_SCRIPT,
  NOTICES,
  intentChip,
  lintVoice,
  saysIntent,
} from '../src/content/index.js'
import type { Intent } from '../src/lots/index.js'

const everyIntent = (): readonly Intent[] => HORROR_SCRIPTS.flat()

describe('card 71 — every intent carries both halves', () => {
  it('puts its own number in every line', () => {
    // art. 42 shows the number on the chip; art. 73 makes the intent
    // tappable. What a tap gets back has to include the thing the chip is
    // already showing, or the two are describing different attacks.
    for (const intent of everyIntent()) {
      expect(
        saysIntent(intent),
        `${intent.verb} ${intent.amount} never says its number`,
      ).toContain(String(intent.amount))
    }
  })

  it('says what the effect does to the plan, beside what the number does', () => {
    // The plan-attacks (art. 65) are the ones that used to say only half.
    // Each is asked for a word that could only come from its own effect.
    const owed: Readonly<Record<string, RegExp>> = {
      seal: /pair/i,
      curse: /count|score/i,
      corrode: /armour/i,
      bind: /cast|table|under/i,
      bleed: /keep|more/i,
      hunger: /claim/i,
    }
    let checked = 0
    for (const intent of everyIntent()) {
      const kind = intent.effect?.kind
      if (kind === undefined) continue
      const want = owed[kind]
      if (want === undefined) throw new Error(`no expectation written for ${kind}`)
      expect(saysIntent(intent), `${intent.verb} does not say what its ${kind} does`).toMatch(want)
      checked += 1
    }
    expect(checked, 'the depth ships plan-attacks').toBeGreaterThan(10)
  })

  it('reads the numbers off the intent rather than baking them into the words', () => {
    // COVET is the case that proves it: the Gnawing's eats sixes and the
    // Marrow's eats fives, and one authored sentence has to tell the truth
    // about both. The old line said "sixes" in each.
    const gnawing = GNAWING_SCRIPT.find((one) => one.verb === 'COVET')!
    const marrow = MARROW_SCRIPT.find((one) => one.verb === 'COVET')!
    expect(gnawing.effect).toEqual({ kind: 'curse', value: 6 })
    expect(marrow.effect).toEqual({ kind: 'curse', value: 5 })
    expect(saysIntent(gnawing)).toContain('6')
    expect(saysIntent(marrow)).toContain('5')
    expect(saysIntent(gnawing)).not.toBe(saysIntent(marrow))
  })

  it('grows its number with the script’s escalation, like the chip does', () => {
    // A looped script comes back heavier (`scriptedHorror`). The sentence
    // and the chip must agree about how much heavier.
    const swipe: Intent = { verb: 'SWIPE', amount: 7 }
    const later: Intent = { verb: 'SWIPE', amount: 16 }
    expect(saysIntent(swipe)).toContain('7')
    expect(saysIntent(later)).toContain('16')
    expect(intentChip(later)).toBe('SWIPE 16')
  })

  it('leaves no unfilled token anywhere in the catalog', () => {
    for (const intent of everyIntent()) {
      expect(saysIntent(intent), intent.verb).not.toMatch(/\{[a-z]+\}/)
    }
  })

  it('never falls back to the chip — every shipped verb has a line', () => {
    for (const intent of everyIntent()) {
      expect(saysIntent(intent), `${intent.verb} has no authored line`).not.toBe(
        intentChip(intent),
      )
    }
  })
})

describe('card 71 — impending, not landed', () => {
  it('writes every line as the thing about to happen', () => {
    // The tell the playtest caught is a bare present-tense report: "It
    // swipes at you", read before health has moved. Every line now opens on
    // the wind-up, so none of them can be mistaken for a receipt.
    for (const said of Object.values(INTENT_SAYS)) {
      expect(said, said).toMatch(/\b(is|are|about to|going to|draws|wants|coming|getting)\b/)
    }
  })

  it('keeps them in his mouth and inside one candle', () => {
    // rules/voice.md: the band is his mind. The old lines addressed the
    // player in the second person, which is a narrator doing it.
    for (const said of Object.values(INTENT_SAYS)) {
      expect(lintVoice(said, 'thought'), said).toEqual([])
      expect(said.trim().split(/\s+/).length).toBeLessThanOrEqual(CANDLE_WORDS)
    }
  })
})

describe('card 71 — the totals line is one statement', () => {
  it('stands the floor’s offer beside a reason, not beside a refusal', () => {
    // "any dice 4 · No combo uses exactly these dice." — both true, and
    // contradictory in plain reading.
    const floor = NOTICES['claim.floor'] ?? ''
    expect(floor).not.toBe('')
    expect(floor).not.toMatch(/^no\b/i)
    expect(floor).not.toBe(NOTICES['claim.exact'])
  })

  it('keeps a real refusal for the case that is actually a refusal', () => {
    // A selection that claims nothing at all — the floor line spent too —
    // still needs the sentence that says so.
    expect((NOTICES['claim.exact'] ?? '').length).toBeGreaterThan(0)
  })
})
