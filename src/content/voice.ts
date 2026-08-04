/**
 * The voice lint. rules/voice.md is binding for every player-facing string,
 * and content review is voice review — so the review is a test, not a
 * habit.
 *
 * Not implemented. Until it is, no string in this directory is proven.
 */

export interface VoiceComplaint {
  readonly text: string
  /** Which line of rules/voice.md the string broke. */
  readonly rule:
    | 'second-person'
    | 'present-tense'
    | 'you-feel'
    | 'no-jokes'
    | 'no-exclamation'
    | 'one-candle'
    | 'concrete-noun'
}

/** One string, judged. Empty means it passes. */
export function lintVoice(text: string): readonly VoiceComplaint[] {
  throw new Error('not implemented')
}

/** ~45 words or fewer is one candle of text (voice). */
export const CANDLE_WORDS = 45
