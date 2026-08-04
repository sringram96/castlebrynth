import { describe, expect, it } from 'vitest'

import { CANDLE_WORDS, ROOMS, VERBS, everyString, lintVoice } from '../src/content/index.js'

/**
 * rules/voice.md is binding for every player-facing string, and content
 * review is voice review. The lint is the review.
 *
 * Two categories, by the ruling of 2026-08-04: prose is a **beat** and owes
 * the whole rule; a name — a combo, an item, a room, a horror's verb — is a
 * **label** and is exempt from second person and present tense only.
 */
describe('content — rules/voice.md (second person, present tense, no "you feel")', () => {
  it('passes every player-facing string through the voice lint', () => {
    const complaints = everyString().flatMap((said) => lintVoice(said.text, said.category))
    expect(complaints).toEqual([])
  })

  it('sees the names too — combos, items, rooms, verbs (the ruling of 2026-08-04)', () => {
    const said = everyString()
    const labels = said.filter((one) => one.category === 'label').map((one) => one.text)
    expect(labels).toContain('the straight')
    expect(labels).toContain('the gnawing')
    expect(labels).toContain('the rusted plate')
    // A label skips second person, and keeps everything else.
    expect(lintVoice('the hero', 'label')).toEqual([])
    expect(lintVoice('the hero', 'beat').map((c) => c.rule)).toContain('second-person')
    expect(lintVoice('the gnawing!', 'label').map((c) => c.rule)).toContain('no-exclamation')
  })

  it('catches what the rule bans, so the lint is not a rubber stamp', () => {
    expect(lintVoice('You feel a cold hand on your shoulder.').map((c) => c.rule))
      .toContain('you-feel')
    expect(lintVoice('You woke in the dark.').map((c) => c.rule)).toContain('present-tense')
    expect(lintVoice('The hero draws a blade.').map((c) => c.rule)).toContain('second-person')
    expect(lintVoice('The door opens!').map((c) => c.rule)).toContain('no-exclamation')
  })

  /**
   * art. 66: controls and prose are different languages. A control is a
   * plain imperative verb, two words or fewer; it never narrates, and the
   * poetry is the response to the button rather than the button. Controls
   * are exempt from rules/voice.md and bound by this instead — so the review
   * is still a test, by a different rule.
   */
  it('holds every control to art. 66, not to the voice', () => {
    for (const [key, said] of Object.entries(VERBS)) {
      expect(said.trim().split(/\s+/).length, key).toBeLessThanOrEqual(2)
      // A verb, not a sentence: it opens with a capital and closes with none.
      expect(said, key).toMatch(/^[A-Z]/)
      expect(said, key).not.toMatch(/[.!?,;:]/)
      // And it never narrates: no article, no second person, no object.
      expect(said.toLowerCase(), key).not.toMatch(/\b(the|a|an|your|you)\b/)
    }
  })

  it('presses only authored verbs — no control invents its own words', () => {
    const authored = new Set(Object.values(VERBS))
    for (const held of ROOMS) {
      for (const one of held.acts) expect(authored, one.id).toContain(one.verb)
    }
  })

  it('keeps a beat to one candle of text — ~45 words or fewer', () => {
    const overlong = everyString()
      .map((said) => said.text)
      .filter((text) => text.split(/\s+/).length > CANDLE_WORDS)
    expect(overlong).toEqual([])
  })
})
