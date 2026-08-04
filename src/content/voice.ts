/**
 * The voice lint. rules/voice.md is binding for every player-facing string,
 * and content review is voice review — so the review is a test, not a
 * habit.
 *
 * Two categories, by the ruling of 2026-08-04. A **beat** is prose and owes
 * the whole rule. A **label** is a name — a combo, an item, a room, a
 * horror's verb — and is exempt from second person and present tense,
 * because a name is not a sentence. Everything else still binds: no "you
 * feel", no exclamation marks, no jokes.
 */

export type VoiceCategory = 'beat' | 'label'

/** One player-facing string, and which rule it answers to. */
export interface Utterance {
  readonly text: string
  readonly category: VoiceCategory
}

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

/** ~45 words or fewer is one candle of text (voice). */
export const CANDLE_WORDS = 45

/** "No 'you feel.' Name what is there; let the player do the feeling." */
const YOU_FEEL = /\byou (feel|felt|sense|sensed)\b/i

/**
 * Second person, present tense. The past is caught by the finite forms the
 * labyrinth would actually reach for; this is a lint, not a parser, and it
 * errs toward letting content through rather than inventing grammar.
 */
const PAST =
  /\b(was|were|had|woke|went|saw|came|took|fell|stood|said|made|found|gave|knew|told|ran|wrote|spoke|broke|chose|rose|walked|opened|closed|turned|looked|waited|seemed|became|reached|touched|listened)\b/i

/** A third-person stand-in for the player, or a first-person narrator. */
const NOT_YOU =
  /\b(hero|heroine|player|adventurer|protagonist|he|she|him|his|hers|i|me|my|mine|we|us|our)\b/i

/** "No mercy, no jokes." */
const JOKE = /\b(lol|haha+|hee|joking|kidding|hilarious|funny|amusing|obviously)\b|[:;]-?[)D]/i

/** Tappable nouns are concrete and singular — vagueness is the failure. */
const VAGUE = /\b(thing|things|stuff|item|items|object|objects|area|zone|element|content)\b/i

/** One string, judged. Empty means it passes. */
export function lintVoice(
  text: string,
  category: VoiceCategory = 'beat',
): readonly VoiceComplaint[] {
  const complaints: VoiceComplaint[] = []
  const flag = (rule: VoiceComplaint['rule']): void => void complaints.push({ text, rule })

  if (YOU_FEEL.test(text)) flag('you-feel')
  if (text.includes('!')) flag('no-exclamation')
  if (JOKE.test(text)) flag('no-jokes')
  if (words(text) > CANDLE_WORDS) flag('one-candle')

  if (category === 'beat') {
    if (PAST.test(text)) flag('present-tense')
    if (NOT_YOU.test(text)) flag('second-person')
  } else {
    if (VAGUE.test(text)) flag('concrete-noun')
    // A name is a name: past five words it is a sentence wearing a label.
    if (words(text) > 5) flag('concrete-noun')
  }
  return complaints
}

function words(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

/** Sugar for the many places content declares a whole category at once. */
export function asBeats(texts: readonly string[]): readonly Utterance[] {
  return texts.map((text) => ({ text, category: 'beat' as const }))
}

export function asLabels(texts: readonly string[]): readonly Utterance[] {
  return texts.map((text) => ({ text, category: 'label' as const }))
}
