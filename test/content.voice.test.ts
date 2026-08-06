import { describe, expect, it } from 'vitest'

import {
  CANDLE_WORDS,
  ROOMS,
  SCRAWL_WORDS,
  VERBS,
  everyString,
  lintVoice,
} from '../src/content/index.js'

/**
 * rules/voice.md is binding for every player-facing string, and content
 * review is voice review. The lint is the review.
 *
 * **Amended by the mind wave: the narrator is repealed.** Every line is the
 * protagonist thinking or the protagonist writing, so the categories are
 * whose mouth a string comes out of — a **thought** in live play, a
 * **scrawl** for anything written down, a **label** for a name, and a
 * **placeholder** for prose still in the repealed register that cards 27–29
 * have not reached.
 */
describe('content — rules/voice.md (his mind, and nobody narrating it)', () => {
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
    // A label answers to neither register, and keeps everything else.
    expect(lintVoice('the hero', 'label').map((c) => c.rule)).toContain('no-narrator')
    expect(lintVoice('the wet passage', 'label')).toEqual([])
  })

  /**
   * The load-bearing claim of the amendment. A thought that says *you* is a
   * narrator addressing the player, which is the thing that was repealed;
   * the old register's whole catalogue fails here, which is the point.
   */
  it('catches the narrator in a thought, and lets the man think', () => {
    expect(lintVoice('You wake, and the ceiling is close enough to touch.').map((c) => c.rule))
      .toContain('first-person')
    expect(lintVoice('The floor comes up. The run ends here, and everything you know keeps.')
      .map((c) => c.rule)).toContain('first-person')
    // Him, thinking. First person, fragments, questions, and a past he is
    // allowed to remember — the blanket past-tense ban died with the
    // flourish, because "He came down here" is the man and not a narrator.
    expect(lintVoice('Coins. Somebody’s coins.')).toEqual([])
    expect(lintVoice('That sound again. Closer this time.')).toEqual([])
    expect(lintVoice('What— what IS that.')).toEqual([])
    expect(lintVoice('Castlebrynth. He came down here. So I go down.')).toEqual([])
  })

  /**
   * And the other way round: a scrawl is an order to yourself, so *you* is
   * legal there and *I* is the defect. One rule, two directions, and the two
   * voices cannot be written into each other's category by accident.
   */
  it('catches the diary in a scrawl, and lets the note be an order', () => {
    expect(lintVoice('you must find him', 'scrawl')).toEqual([])
    expect(lintVoice('don’t sleep in the wet rooms', 'scrawl')).toEqual([])
    expect(lintVoice('count the swipes. it always swipes twice', 'scrawl')).toEqual([])
    expect(lintVoice('I should have counted the swipes', 'scrawl').map((c) => c.rule))
      .toContain('note-to-self')
    // He is out of time when he writes one, so a scrawl cannot be a
    // paragraph. The number is tuning; the shortness is the rule.
    const long = Array.from({ length: SCRAWL_WORDS + 1 }, () => 'run').join(' ')
    expect(lintVoice(long, 'scrawl').map((c) => c.rule)).toContain('scrawled-fast')
  })

  it('keeps the feeling ban, and gains its true reason', () => {
    expect(lintVoice('You feel a cold hand on your shoulder.').map((c) => c.rule))
      .toContain('feelings')
    // He does not describe his feelings in his own head either.
    expect(lintVoice('I feel something behind me.').map((c) => c.rule)).toContain('feelings')
    // Fear itself is legal, because fear is had.
    expect(lintVoice('oh no')).toEqual([])
    expect(lintVoice('no no no')).toEqual([])
  })

  it('lets him shout once, and never twice', () => {
    expect(lintVoice('oh no!')).toEqual([])
    expect(lintVoice('run! run!').map((c) => c.rule)).toContain('no-shouting')
  })

  it('lets no narrator stand in for him, in any category', () => {
    for (const category of ['thought', 'scrawl', 'label', 'placeholder'] as const) {
      expect(lintVoice('the adventurer draws a blade', category).map((c) => c.rule), category)
        .toContain('no-narrator')
    }
  })

  /**
   * The debt, counted rather than felt. Everything still in the repealed
   * register is declared a placeholder — it answers to the rules that
   * survived the amendment and to nothing else — so the size of what cards
   * 27–29 owe is a number this test can print rather than an impression.
   */
  it('declares what is still in the repealed register instead of hiding it', () => {
    const said = everyString()
    const placeholders = said.filter((one) => one.category === 'placeholder')
    // The room prose, the tap answers, the intents, the origins: cards 27–29.
    expect(placeholders.length).toBeGreaterThan(0)
    // And a placeholder still owes the rules that survive.
    for (const one of placeholders) {
      expect(lintVoice(one.text, 'placeholder'), one.text).toEqual([])
    }
  })

  /**
   * art. 66: controls and prose are different languages. A control is a
   * plain imperative verb, two words or fewer; it never narrates, and the
   * poetry is the response to the button rather than the button. Controls
   * are exempt from rules/voice.md and bound by this instead — so the review
   * is still a test, by a different rule. The mind wave does not touch them.
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
