/**
 * The copy invariants.
 *
 * Deliberately **not** a snapshot of every sentence: the writing should stay
 * free to improve. These are the specific clarity failures the game keeps
 * being tempted into, stated as rules, so that re-introducing one fails a test
 * rather than surviving to a playtest.
 *
 * The law: mechanical text states the literal truth first, and atmosphere
 * comes second or not at all.
 *
 * One old rule is **gone**, and it is worth saying why. Damage and health used
 * to be banned words, because the game had neither: what a fight cost was
 * bones breaking, and a number over an enemy would have been arithmetic drawn
 * on top of a physical fact. The dice game changed that on purpose. Enemies
 * have explicit health and explicit damage, the player is told both before
 * committing to anything, and hiding them would be hiding the whole tactical
 * contract. What is still banned is a **health bar for the player**: the pile
 * is life, and it is objects.
 */

import { describe, expect, it } from 'vitest'

import { REWARDS, reward } from '../../src/content/rewards.js'
import { ENEMIES } from '../../src/content/enemies.js'
import { ROOM_LIBRARY } from '../../src/content/rooms.js'
import { WAYS, way } from '../../src/content/runPlans.js'
import { ATTACK_LINE, HOW_A_FIGHT_GOES, VERBS } from '../../src/content/text.js'
import { CRAP_NAME, HAND_DEFINITIONS } from '../../src/combat/hands.js'

/** Everything the player can read, so a banned word cannot hide in a corner. */
function everySentence(): string[] {
  const out: string[] = []
  for (const r of Object.values(REWARDS)) out.push(r.rule, r.flavour ?? '')
  for (const e of Object.values(ENEMIES)) out.push(e.tell, e.rule ?? '')
  for (const h of HAND_DEFINITIONS) out.push(h.name, h.rule)
  for (const r of ROOM_LIBRARY) {
    out.push(r.arrival)
    for (const d of r.details) out.push(d.says)
    if (r.ritual) out.push(r.ritual.name, r.ritual.label, r.ritual.describe, r.ritual.prompt)
  }
  // The ways on are copy too, and they moved out of the rooms with the
  // topology. They are still sentences a player reads, so they are still held
  // to every rule below.
  for (const w of Object.values(WAYS)) out.push(w.label, w.sense)
  out.push(...HOW_A_FIGHT_GOES, ...Object.values(ATTACK_LINE), ...Object.values(VERBS))
  return out.filter(Boolean)
}

describe('the scorecard is its numbers', () => {
  it('gives every hand a short name and a multiplier', () => {
    for (const hand of HAND_DEFINITIONS) {
      expect(hand.name, `${hand.id} has no label`).toBe(hand.name.toUpperCase())
      expect(hand.name.length, `${hand.id} is too long for the well`).toBeLessThanOrEqual(10)
      expect(hand.multiplier, `${hand.id} has no multiplier`).toBeGreaterThan(0)
    }
  })

  it('states what each hand takes, in one sentence', () => {
    for (const hand of HAND_DEFINITIONS) {
      expect(hand.rule.length, `${hand.id} explains nothing`).toBeGreaterThan(8)
      expect(hand.rule, `${hand.id} does not finish its sentence`).toMatch(/[.!]$/)
    }
  })

  it('names the fallback without making it look like a category', () => {
    expect(CRAP_NAME).toBe('CRAP')
    expect(HAND_DEFINITIONS.map((h) => h.name)).not.toContain(CRAP_NAME)
  })
})

describe('a reward card states its exact mechanic', () => {
  it('carries a number before TAKE is pressed', () => {
    for (const r of Object.values(REWARDS)) {
      expect(r.rule, `${r.name} does not state a quantity`).toMatch(/\d/)
    }
  })

  it('says what a Vial gives and where it stops', () => {
    expect(reward('vial').rule).toContain('5')
    expect(reward('vial').rule).toContain('30')
  })
})

describe('the enemies say what they are about to do', () => {
  it('gives every enemy one sentence on first sight', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.tell.length, `${e.name} has no tell`).toBeGreaterThan(10)
    }
  })

  it('states its damage in the rule when it prints one', () => {
    // A rule the player only learns by losing a bone to it is not a rule, it
    // is a trick. The Warden's eight is the loudest thing in its brief.
    expect(ENEMIES.warden!.rule).toMatch(/EIGHT/)
    expect(ENEMIES.marrow!.rule).toMatch(/Five/)
  })

  it('never gives the player a health bar, under any name', () => {
    for (const line of everySentence()) {
      expect(line, `"${line}" gives the player HP`).not.toMatch(/\bmy (HP|health)\b/i)
    }
  })
})

describe('the rules card is the whole fight', () => {
  it('states the five sentences it runs on', () => {
    const all = HOW_A_FIGHT_GOES.join(' ')
    expect(all).toMatch(/six bones/i)
    expect(all).toMatch(/hold/i)
    expect(all).toMatch(/again/i)
    expect(all).toMatch(/add up/i)
    expect(all).toMatch(/once per fight/i)
    expect(all).toMatch(/CRAP/)
  })

  it('is short enough to be read', () => {
    expect(HOW_A_FIGHT_GOES.length).toBeLessThanOrEqual(6)
    for (const line of HOW_A_FIGHT_GOES) expect(line.length).toBeLessThan(70)
  })

  it('asks for a decision at every position of an attack, in one line', () => {
    for (const [position, line] of Object.entries(ATTACK_LINE)) {
      expect(line.length, position).toBeLessThan(48)
      expect(line, position).toMatch(/[.!]$/)
    }
  })
})

describe('the controls are plain verbs', () => {
  it('never runs past two words', () => {
    for (const [name, verb] of Object.entries(VERBS)) {
      expect(verb.split(/\s+/).length, `${name} is a sentence`).toBeLessThanOrEqual(2)
      expect(verb, `${name} is not a control label`).toBe(verb.toUpperCase())
    }
  })

  it('has one verb for each throw an attack is given, and none for scoring', () => {
    expect(VERBS).toMatchObject({ roll: 'ROLL', reroll: 'REROLL' })
    // Which hand to spend is the decision, so the choice itself is the
    // commitment and it lives on the scorecard rather than in a bed.
    for (const gone of ['throw', 'round', 'field', 'smash', 'charm', 'pouch', 'score']) {
      expect(VERBS, `${gone} is still a verb`).not.toHaveProperty(gone)
    }
  })
})

describe('the rooms say what changed', () => {
  it('tells the player the way on is open once a fight is behind them', () => {
    // The ways out of an encounter. They are authored on the plan's edges now
    // rather than on the room, which is what lets a different fight sit in
    // front of the same line — but the line still has to say where you are
    // going, or the button is a shrug.
    for (const id of ['past-the-body', 'gate-up', 'rejoin', 'through']) {
      expect(way(id).sense, `${id} says nothing about the way on`).toMatch(
        /corridor|passage|tunnel|door|path|open/i,
      )
    }
  })

  it('makes the fork a decision rather than a riddle', () => {
    const safe = way('stair')
    const risky = way('deep')
    expect(safe.sense, 'the short route does not say it is shorter').toMatch(/short/i)
    // The player is making a game decision. Say so before the tap.
    expect(risky.sense, 'the deep route does not state its risk').toMatch(/fight|danger/i)
    expect(risky.sense, 'the deep route does not state its reward').toMatch(/upgrade|chance/i)
  })

  it('keeps every way on to two words, because it goes on a button', () => {
    for (const [id, w] of Object.entries(WAYS)) {
      expect(w.label.split(/\s+/).length, `${id} is too long for a button`).toBeLessThanOrEqual(2)
      expect(w.sense.length, `${id} gives no reason to press it`).toBeGreaterThan(0)
    }
  })

  it('says what a font gives back before it is pressed, and what it does not', () => {
    for (const r of ROOM_LIBRARY) {
      if (!r.ritual) continue
      // The rule, in the well, before the press — the same contract every
      // carried thing is held to. It gives bones, it says how many, and it
      // says where it stops.
      expect(r.ritual.prompt, `${r.name} does not say what its font gives back`).toMatch(/bones/i)
      expect(r.ritual.prompt, `${r.name} does not say the face matters`).toMatch(/lands on|two more/i)
      expect(r.ritual.prompt, `${r.name} does not state the ceiling`).toContain('thirty')
      // No player health, ever.
      expect(r.ritual.prompt).not.toMatch(/\bHP\b/i)
      // The verb is a control: a plain imperative, two words or fewer.
      expect(r.ritual.label.split(/\s+/).length).toBeLessThanOrEqual(2)
      expect(r.ritual.describe.length).toBeGreaterThan(0)
    }
  })

  it('lays nothing out on a step: an upgrade is beaten out of something', () => {
    for (const r of ROOM_LIBRARY) {
      expect(r.arrival, `${r.name} claims items are waiting`).not.toMatch(/two things|carry one/i)
    }
  })
})

describe('nothing player-facing uses the old vocabulary', () => {
  const banned: readonly [RegExp, string][] = [
    [/\bmarked\b/i, 'marked'],
    [/\bbuild\b/i, 'build'],
    [/\bloadout\b/i, 'loadout'],
    [/\brelic\b/i, 'relic'],
    [/\bcinderbone\b/i, 'Cinderbone'],
    [/\bknuckle\b/i, 'Knuckle'],
    [/\blane\b/i, 'lane'],
    [/\bsmash\b/i, 'smash'],
    [/\bits line\b/i, 'its line'],
    [/\bnamed bone\b/i, 'named bone'],
    [/\bcommon bone\b/i, 'common bone'],
    // "Straight" is deliberately absent: it is a hand in this game *and* an
    // ordinary English word — the stair goes straight to the door.
  ]

  it('never uses a word from the game this replaced', () => {
    for (const line of everySentence()) {
      for (const [pattern, word] of banned) {
        expect(line, `"${line}" uses the word ${word}`).not.toMatch(pattern)
      }
    }
  })

  it('never calls the pile a hand', () => {
    // The six bones in the air are a hand. The thirty in the pile are a life.
    for (const line of everySentence()) {
      expect(line, `"${line}" calls the pile a hand`).not.toMatch(/\bthe pile is (a|my) hand\b/i)
    }
  })
})
