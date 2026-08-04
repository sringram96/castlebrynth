import { describe, expect, it } from 'vitest'

import { CANDLE_WORDS, everyString, lintVoice } from '../src/content/index.js'

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

  it('keeps a beat to one candle of text — ~45 words or fewer', () => {
    const overlong = everyString()
      .map((said) => said.text)
      .filter((text) => text.split(/\s+/).length > CANDLE_WORDS)
    expect(overlong).toEqual([])
  })
})
