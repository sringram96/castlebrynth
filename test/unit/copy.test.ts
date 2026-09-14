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
import { ladderChips, stripFor } from '../../src/content/faces.js'
import { ENEMIES } from '../../src/content/enemies.js'
import { ROOM_LIBRARY } from '../../src/content/rooms.js'
import { WAYS, way } from '../../src/content/runPlans.js'
import {
  ATTACK_LINE,
  COMPLETE_LINE,
  DEATH_LINE,
  HOW_A_FIGHT_GOES,
  TITLE_LINE,
  TITLE_STALE,
  VERBS,
} from '../../src/content/text.js'
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
  // The four lines that open and close a run. They were the one corner of the
  // player-facing copy no rule in this file reached, which is how the game came
  // to state its premise once on the title screen and contradict it at the door.
  out.push(TITLE_LINE, TITLE_STALE, DEATH_LINE, COMPLETE_LINE)
  return out.filter(Boolean)
}

describe('the scorecard is its numbers', () => {
  it('gives every hand a short name and a multiplier', () => {
    for (const hand of HAND_DEFINITIONS) {
      expect(hand.name, `${hand.id} has no label`).toBe(hand.name.toUpperCase())
      // The limit is the **cell**, and the cell moved. It was ten characters
      // because the card lived in a painted recess 194px wide and an entry got
      // 47px of it; the card stands on its own sheet now at three columns of
      // 122px, and `tray.spec.ts` measures that no label actually wraps rather
      // than trusting this number. Twelve is what 122px holds at the card's
      // type size, with a character in hand.
      expect(hand.name.length, `${hand.id} is too long for its cell`).toBeLessThanOrEqual(12)
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
  it('carries a number before TAKE is pressed — on the card, in digits', () => {
    // The digits moved onto the **strip** for anything with faces: a card
    // shows the six things the die can do rather than a sentence about them.
    // What the card has to carry is unchanged, so what is asserted is the
    // whole card rather than only its prose.
    for (const r of Object.values(REWARDS)) {
      const printed = [r.rule, ...(stripFor(r.id) ?? []).map((c) => c.text)].join(' ')
      expect(printed, `${r.name} does not state a quantity`).toMatch(/\d/)
    }
  })

  it('says what a Vial gives and where it stops', () => {
    expect(reward('vial').rule).toContain('5')
    expect(reward('vial').rule).toContain('30')
  })

  it('says when a thing fires and whether there is a press', () => {
    // The two things a row of chips cannot say, and the reason the prose
    // beside a strip still exists. Every die and the talisman are held to it.
    for (const r of Object.values(REWARDS)) {
      if (!stripFor(r.id)) continue
      expect(r.rule, `${r.name} does not say whether there is a press`).toMatch(/No press\./)
      expect(r.rule, `${r.name} does not say when it fires`).toMatch(/ROLL|ATTACK|score/)
    }
  })
})

describe('the enemies say what they are about to do', () => {
  it('gives every enemy one sentence on first sight', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.tell.length, `${e.name} has no tell`).toBeGreaterThan(10)
    }
  })

  it('prints every rung of every ladder before the first ROLL', () => {
    // A rule the player only learns by losing a bone to it is not a rule, it is
    // a trick — and since every monster now has one, *every* number it can break
    // has to be on the card.
    //
    // **Re-based.** It used to read the damage out of the prose: the Warden's
    // EIGHT and the Marrow's Five. A break is a ladder now, and a ladder written
    // once as chips and once as a sentence is a ladder that will disagree with
    // itself — so the prose says what the rule *is* and the chips carry the
    // numbers. The chips are what this asserts.
    for (const e of Object.values(ENEMIES)) {
      const chips = ladderChips(e.id)
      expect(chips.length, `${e.name} has no ladder`).toBeGreaterThan(1)
      for (const rung of e.breakRule!.rungs) {
        expect(
          chips.some((c) => c.text.includes(String(rung.breaks))),
          `${e.name} does not print the rung that breaks ${rung.breaks}`,
        ).toBe(true)
      }
      expect(e.rule, `${e.name} prints no rule at all`).toBeDefined()
    }
    // And the Warden's is still the loudest thing in its brief, because the
    // condition is the rule and a condition cannot be a chip on its own.
    expect(ENEMIES.warden!.rule).toMatch(/EIGHT/)
    expect(ENEMIES.warden!.rule).toMatch(/CRAP/)
  })

  it('never gives the player a health bar, under any name', () => {
    for (const line of everySentence()) {
      expect(line, `"${line}" gives the player HP`).not.toMatch(/\bmy (HP|health)\b/i)
    }
  })
})

describe('the rules card is the whole fight', () => {
  it('states the sentences it runs on', () => {
    const all = HOW_A_FIGHT_GOES.join(' ')
    expect(all).toMatch(/six dice/i)
    // And it says outright that bones are not the width, because that is the
    // rule the game most recently stopped having.
    expect(all).toMatch(/not what I throw/i)
    expect(all).toMatch(/iron/i)
    expect(all).toMatch(/item dice/i)
    expect(all).toMatch(/hold/i)
    expect(all).toMatch(/again/i)
    expect(all).toMatch(/add up/i)
    expect(all).toMatch(/once per fight/i)
    expect(all).toMatch(/CRAP/)
  })

  it('is short enough to be read', () => {
    expect(HOW_A_FIGHT_GOES.length).toBeLessThanOrEqual(8)
    for (const line of HOW_A_FIGHT_GOES) expect(line.length).toBeLessThan(90)
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
    // **The printed-contract law.** The deep way used to promise a *chance* of
    // an upgrade; it now certainly pays iron, because the Rustplate lies in
    // the cage. What it pays has to be on the button before the press — we
    // hide places, never rules.
    expect(risky.sense, 'the deep route does not state what it pays').toMatch(/iron/i)
    // The vault only takes a bone for pulling an unweighted lever. A correct
    // solution is free, so the route must not promise an unavoidable toll.
    expect(risky.sense).not.toMatch(/\btoll\b/i)
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

/**
 * The run says what it is for.
 *
 * The premise is that **bone remembers**: the thirty in the pile are what he
 * still knows, and at zero he does not die — he stops knowing why he came down
 * and walks back to the stair. These are the four ways that can quietly stop
 * being true, written as rules rather than as a snapshot of the sentences, so
 * the prose stays free to improve and the contract does not.
 */
describe('the run says what it is for', () => {
  it('states the errand on the title, in the first sentence a player reads', () => {
    // Not *which* errand — who he is looking for is the one thing the character
    // cannot remember and the game therefore never says. What must survive is
    // that there **is** one, because it is the only answer to "why am I doing
    // this" the game ever offers.
    expect(TITLE_LINE).toMatch(/looking for|to look|find/i)
  })

  it('never calls the end of a run a death, anywhere a player can read it', () => {
    // Nothing kills him. A screen that says otherwise is the one lie the game
    // cannot afford, because the whole premise is that running out is *worse*
    // than dying — he goes back up, and he no longer knows what for.
    for (const line of everySentence()) {
      expect(line, `"${line}" calls running out a death`).not.toMatch(
        /\b(died|death|killed|dying|slain)\b/i,
      )
    }
  })

  it('says at the end whether the errand survived, rather than whether the run did', () => {
    // Both endings are about the same thing and it is not victory: one of them
    // still knows to look and the other does not.
    expect(DEATH_LINE, 'the losing end does not say what was actually lost').toMatch(
      /remember|forgot|forgotten/i,
    )
    expect(COMPLETE_LINE, 'the winning end does not say the errand outlived it').toMatch(
      /look|looking|remember/i,
    )
  })

  it('keeps the Font the one thing that cannot give back a named one', () => {
    // This sentence shipped long before the story did and is now load-bearing
    // for it: the basin returns what the castle took, and never the ones that
    // mattered. If it is ever softened, the premise loses the only place it is
    // dramatised instead of asserted.
    const font = ROOM_LIBRARY.find((r) => r.ritual)
    expect(font, 'no room in the library has a font any more').toBeDefined()
    expect(font!.ritual!.prompt).toMatch(/never one that had a name/i)
  })
})
