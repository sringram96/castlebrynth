import { describe, expect, it } from 'vitest'

import { CANDLE_WORDS, everyString, lintVoice } from '../src/content/index.js'

/**
 * rules/voice.md is binding for every player-facing string, and content
 * review is voice review. The lint is the review.
 */
describe('content — rules/voice.md (second person, present tense, no "you feel")', () => {
  it('passes every player-facing string through the voice lint', () => {
    const complaints = everyString().flatMap((text) => lintVoice(text))
    expect(complaints).toEqual([])
  })

  it('catches what the rule bans, so the lint is not a rubber stamp', () => {
    expect(lintVoice('You feel a cold hand on your shoulder.').map((c) => c.rule))
      .toContain('you-feel')
    expect(lintVoice('You woke in the dark.').map((c) => c.rule)).toContain('present-tense')
    expect(lintVoice('The hero draws a blade.').map((c) => c.rule)).toContain('second-person')
    expect(lintVoice('The door opens!').map((c) => c.rule)).toContain('no-exclamation')
  })

  it('keeps a beat to one candle of text — ~45 words or fewer', () => {
    const overlong = everyString().filter((text) => text.split(/\s+/).length > CANDLE_WORDS)
    expect(overlong).toEqual([])
  })
})
