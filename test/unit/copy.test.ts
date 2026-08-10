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
 */

import { describe, expect, it } from 'vitest'

import { BONE_PROFILES, SPECIAL_BONES } from '../../src/content/bones.js'
import { REWARDS, reward } from '../../src/content/rewards.js'
import { ENEMIES } from '../../src/content/enemies.js'
import { ROOM_LIBRARY } from '../../src/content/rooms.js'
import { WAYS, way } from '../../src/content/runPlans.js'
import { PHASE_LINE, VERBS, WAR_OF_BONES } from '../../src/content/text.js'

/** Everything the player can read, so a banned word cannot hide in a corner. */
function everySentence(): string[] {
  const out: string[] = []
  for (const p of Object.values(BONE_PROFILES)) out.push(p.rule)
  for (const b of Object.values(SPECIAL_BONES)) out.push(b.rule, b.flavour ?? '')
  for (const r of Object.values(REWARDS)) out.push(r.rule, r.flavour ?? '')
  for (const e of Object.values(ENEMIES)) out.push(e.tell, e.rule ?? '')
  for (const r of ROOM_LIBRARY) {
    out.push(r.arrival)
    for (const d of r.details) out.push(d.says)
    if (r.ritual) out.push(r.ritual.name, r.ritual.label, r.ritual.describe, r.ritual.prompt)
  }
  // The ways on are copy too, and they moved out of the rooms with the
  // topology. They are still sentences a player reads, so they are still held
  // to every rule below.
  for (const w of Object.values(WAYS)) out.push(w.label, w.sense)
  out.push(...WAR_OF_BONES, ...Object.values(PHASE_LINE), ...Object.values(VERBS))
  return out.filter(Boolean)
}

describe('a bone card is its numbers', () => {
  it('states every distinct face it can roll, in digits', () => {
    for (const bone of Object.values(SPECIAL_BONES)) {
      const faces = BONE_PROFILES[bone.profile].faces
      for (const value of new Set(faces)) {
        expect(bone.rule, `${bone.name} does not state its ${value}`).toContain(String(value))
      }
    }
  })

  it('keeps flavour out of the rule and below a divider', () => {
    for (const bone of Object.values(SPECIAL_BONES)) {
      // The rule is digits and separators. Nothing else, so a player who has
      // read it knows everything the game knows.
      expect(bone.rule, `${bone.name}'s rule carries prose`).toMatch(/^[\d,\s.]+$/)
    }
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

  it('prints an encounter rule for every enemy that has one', () => {
    // A rule the player only learns by losing a bone to it is not a rule, it
    // is a trick. The Warden's is the loudest thing in its brief.
    for (const e of Object.values(ENEMIES)) {
      if (e.tieRule === 'mutual' && !e.rule) continue
      expect(e.rule, `${e.name} has a rule nobody can read`).toBeDefined()
    }
    expect(ENEMIES.warden!.rule).toMatch(/tie/i)
    expect(ENEMIES.warden!.rule).toMatch(/HOLDS/)
  })

  it('never promises damage, which does not exist', () => {
    for (const line of everySentence()) {
      expect(line, `"${line}" talks about damage`).not.toMatch(/\bdamage\b/i)
    }
  })
})

describe('the rules card is the whole game', () => {
  it('states the four sentences the fight runs on', () => {
    const all = WAR_OF_BONES.join(' ')
    expect(all).toMatch(/throws first/i)
    expect(all).toMatch(/1[–-]6/)
    expect(all).toMatch(/high kills low/i)
    expect(all).toMatch(/ties kill both/i)
    expect(all).toMatch(/safe/i)
    expect(all).toMatch(/dead/i)
  })

  it('is short enough to be read', () => {
    expect(WAR_OF_BONES.length).toBeLessThanOrEqual(5)
    for (const line of WAR_OF_BONES) expect(line.length).toBeLessThan(70)
  })

  it('asks for a decision at every phase, in one line', () => {
    for (const [phase, line] of Object.entries(PHASE_LINE)) {
      expect(line.length, phase).toBeLessThan(48)
      expect(line, phase).toMatch(/[.!]$/)
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

  it('has one verb per phase of a round, and a round is two phases', () => {
    expect(VERBS).toMatchObject({ throw: 'THROW', round: 'ROUND' })
    // The three that became one, and the four the old game scored with.
    for (const gone of ['field', 'smash', 'charm', 'roll', 'reroll', 'score']) {
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
      // The rule, in the well, before the press — the same contract every bone
      // and every carried thing is held to. It gives bones, it says how many,
      // it says where it stops, and it says what it will not do.
      expect(r.ritual.prompt, `${r.name} does not say what its font gives back`).toMatch(/bones/i)
      expect(r.ritual.prompt, `${r.name} does not say the face matters`).toMatch(/lands on|two more/i)
      expect(r.ritual.prompt, `${r.name} does not state the ceiling`).toContain('thirty')
      // And the one thing it cannot do, said out loud — because a player who
      // has just lost a Cinderbone will come here hoping.
      expect(r.ritual.prompt, `${r.name} does not rule out a named bone`).toMatch(/name/i)
      // No health, ever.
      expect(r.ritual.prompt).not.toMatch(/\bHP\b|health/i)
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
    [/\bHP\b/, 'HP'],
    [/\bhealth\b/i, 'health'],
    [/\bmarked\b/i, 'marked'],
    [/\bbuild\b/i, 'build'],
    [/\bloadout\b/i, 'loadout'],
    [/\brelic\b/i, 'relic'],
    [/\bmultiplier\b/i, 'multiplier'],
    [/\bfull house\b/i, 'full house'],
    // "Straight" is deliberately absent from this list. It was a hand class in
    // the old game and it is also an ordinary English word — the stair goes
    // straight to the door — so banning it would be banning the language
    // rather than the mechanic. `HANDS`, `LADDER` and `recognise` are gone
    // from the codebase, which is the check that actually matters.
  ]

  it('never uses a word from the game this replaced', () => {
    for (const line of everySentence()) {
      for (const [pattern, word] of banned) {
        expect(line, `"${line}" uses the word ${word}`).not.toMatch(pattern)
      }
    }
  })

  it('never calls the player pile a hand', () => {
    for (const line of everySentence()) {
      expect(line, `"${line}" calls the bones a hand`).not.toMatch(/\bthe hand\b/i)
    }
  })
})
