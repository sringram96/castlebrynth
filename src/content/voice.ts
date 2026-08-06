/**
 * The voice lint. rules/voice.md is binding for every player-facing string,
 * and content review is voice review — so the review is a test, not a habit.
 *
 * **Amended by the mind wave (2026-08-06): the narrator is repealed.** Every
 * line is the protagonist thinking or the protagonist writing, so the lint
 * stopped asking "is this in register" and started asking "whose mouth is
 * this". Four categories:
 *
 * - a **thought** is live play. First person, plain, short. Second person is
 *   the defect it now catches: a line that says *you* is a narrator talking
 *   to the player, which is the whole of what the amendment repeals.
 * - a **scrawl** is anything written down — the waking line, the Book of
 *   Ends. Second person imperative, because a note to yourself is an order;
 *   first person is the defect, because that is a diary.
 * - a **label** is a name — a combo, an item, a room, a horror's verb — and
 *   is exempt from both registers, because a name is not a sentence.
 * - a **placeholder** is prose written under the repealed register and not
 *   yet rewritten. It answers to the rules that survive the amendment and to
 *   nothing else. It is a debt with a name (cards 27–29), and nothing new
 *   may be written in it.
 *
 * What died with the flourish: the blanket past-tense ban (he may remember —
 * *"He came down here"* is the man, not a narrator) and the exclamation-mark
 * ban (he is allowed one when it is earned, and never two). What replaces
 * the first is the second-person ban, which is the real test and was always
 * the thing the old rule was aiming at.
 */

export type VoiceCategory = 'thought' | 'scrawl' | 'label' | 'placeholder'

/** One player-facing string, and which rule it answers to. */
export interface Utterance {
  readonly text: string
  readonly category: VoiceCategory
}

export interface VoiceComplaint {
  readonly text: string
  /** Which line of rules/voice.md the string broke. */
  readonly rule:
    | 'first-person'
    | 'note-to-self'
    | 'no-narrator'
    | 'feelings'
    | 'no-shouting'
    | 'one-candle'
    | 'scrawled-fast'
    | 'concrete-noun'
}

/** ~45 words or fewer is one candle of text (voice). */
export const CANDLE_WORDS = 45

/**
 * A scrawl is short: he is out of time when he writes one. The number is
 * tuning; that a scrawl cannot be a paragraph is the rule.
 */
export const SCRAWL_WORDS = 12

/**
 * "Fear is had, never narrated." The ban survives the amendment and gains
 * its true reason — and gains *"I feel"* with it, because a man describing
 * his own feelings is still a writer describing them.
 */
const FEELINGS = /\b(you|i) (feel|felt|sense|sensed)\b/i

/** A third-person stand-in for the player. There is no narrator to have one. */
const NARRATOR = /\b(hero|heroine|player|adventurer|protagonist)\b/i

/**
 * A narrator addressing the player. Legal in a scrawl, where *you* is
 * himself and the line is an order; a defect in a thought, where it is
 * somebody else describing his descent to him.
 */
const SECOND_PERSON = /\b(you|your|yours|yourself)\b/i

/** A diary rather than an order. Legal in a thought; a defect in a scrawl. */
const FIRST_PERSON = /\b(i|me|my|mine|myself)\b/i

/** Tappable nouns are concrete and singular — vagueness is the failure. */
const VAGUE = /\b(thing|things|stuff|item|items|object|objects|area|zone|element|content)\b/i

/** One string, judged. Empty means it passes. */
export function lintVoice(
  text: string,
  category: VoiceCategory = 'thought',
): readonly VoiceComplaint[] {
  const complaints: VoiceComplaint[] = []
  const flag = (rule: VoiceComplaint['rule']): void => void complaints.push({ text, rule })

  // What every category owes, whatever mouth it comes out of.
  if (FEELINGS.test(text)) flag('feelings')
  if (NARRATOR.test(text)) flag('no-narrator')
  // He is allowed one when it is earned. Two is a writer doing an impression
  // of fright.
  if ((text.match(/!/g)?.length ?? 0) > 1) flag('no-shouting')
  if (words(text) > CANDLE_WORDS) flag('one-candle')

  switch (category) {
    case 'thought':
      if (SECOND_PERSON.test(text)) flag('first-person')
      break
    case 'scrawl':
      if (FIRST_PERSON.test(text)) flag('note-to-self')
      if (words(text) > SCRAWL_WORDS) flag('scrawled-fast')
      break
    case 'label':
      if (VAGUE.test(text)) flag('concrete-noun')
      // A name is a name: past five words it is a sentence wearing a label.
      if (words(text) > 5) flag('concrete-noun')
      break
    case 'placeholder':
      // Nothing further. The register is exactly what these have not been
      // rewritten into yet, and pretending otherwise would make the debt
      // invisible instead of named.
      break
  }
  return complaints
}

function words(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

/** Sugar for the many places content declares a whole category at once. */
export function asThoughts(texts: readonly string[]): readonly Utterance[] {
  return texts.map((text) => ({ text, category: 'thought' as const }))
}

export function asScrawls(texts: readonly string[]): readonly Utterance[] {
  return texts.map((text) => ({ text, category: 'scrawl' as const }))
}

export function asLabels(texts: readonly string[]): readonly Utterance[] {
  return texts.map((text) => ({ text, category: 'label' as const }))
}

/**
 * The debt, declared. Every string still in the repealed register goes
 * through here, so the size of what cards 27–29 owe is one call site and not
 * a feeling.
 */
export function asPlaceholders(texts: readonly string[]): readonly Utterance[] {
  return texts.map((text) => ({ text, category: 'placeholder' as const }))
}
