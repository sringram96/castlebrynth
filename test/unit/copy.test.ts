/**
 * The copy invariants.
 *
 * Deliberately **not** a snapshot of every sentence: the writing should stay
 * free to improve. These are the specific clarity failures the polish sweep
 * exists to fix, stated as rules, so that re-introducing one fails a test
 * rather than surviving to a playtest.
 *
 * The law: mechanical text states the literal truth first, and atmosphere
 * comes second or not at all.
 */

import { describe, expect, it } from 'vitest'

import { DICE, die } from '../../src/content/dice.js'
import { RELICS, relic } from '../../src/content/relics.js'
import { ENEMIES } from '../../src/content/enemies.js'
import { ROOMS, room } from '../../src/content/rooms.js'

/** Everything the player can read, so a banned word cannot hide in a corner. */
function everySentence(): string[] {
  const out: string[] = []
  for (const d of Object.values(DICE)) out.push(d.rule, d.helpsWith, d.flavour ?? '')
  for (const r of Object.values(RELICS)) out.push(r.rule, r.helpsWith)
  for (const e of Object.values(ENEMIES)) {
    out.push(e.tell)
    for (const i of e.script) out.push(i.explain)
  }
  for (const r of Object.values(ROOMS)) {
    out.push(r.arrival)
    for (const d of r.details) out.push(d.says)
    for (const x of r.exits) out.push(x.label, x.sense)
  }
  return out
}

describe('the dice say what they do', () => {
  it('states the faces before anything else', () => {
    // Question one of the copy law: what can this die roll? Every rule opens
    // by answering it, in numbers.
    for (const d of Object.values(DICE)) {
      expect(d.rule, `${d.name} never says what it rolls`).toMatch(/\d/)
      expect(d.helpsWith.length, `${d.name} has no help line`).toBeGreaterThan(0)
    }
  })

  it('names the colour and the condition for every special face', () => {
    for (const d of Object.values(DICE)) {
      const kinds = new Set(d.faces.flatMap((f) => (f.effect ? [f.effect.kind] : [])))
      if (kinds.size === 0) continue
      const colour = kinds.has('hurt') ? /\bred\b/i : /\bgreen\b/i
      expect(d.rule, `${d.name} does not name the colour of its special face`).toMatch(colour)
      // The condition in full. A die whose cost you can dodge by not choosing
      // it is a different die from one whose cost you cannot.
      expect(d.rule, `${d.name} does not say when its effect happens`).toMatch(
        /included in the hand you SCORE/,
      )
      // And the amount, in health, in words the orb uses.
      expect(d.rule, `${d.name} does not say what its effect costs or gives`).toMatch(
        /(lose|heal) \d+ HP/i,
      )
    }
  })

  it('tells the Runner apart from a die with one 6', () => {
    // Two sixes and only one is red. "Scoring its marked 6" describes a die
    // this is not, and the difference is five health.
    const runner = die('runner')
    expect(runner.faces.filter((f) => f.value === 6)).toHaveLength(2)
    expect(runner.rule).toMatch(/One of its 6 faces is red/)
  })

  it('does not claim the Leech is the only healing', () => {
    // Grave Wax heals too, so it never was.
    expect(die('leech').helpsWith).not.toMatch(/only healing/i)
    expect(relic('wax').rule).toMatch(/heal/i)
  })
})

describe('the relics say what they do', () => {
  it('gives every relic an exact rule and a concrete help line', () => {
    for (const r of Object.values(RELICS)) {
      expect(r.rule.length, `${r.name} has no rule`).toBeGreaterThan(0)
      expect(r.helpsWith.length, `${r.name} has no help line`).toBeGreaterThan(0)
      // A rule with no number and no named hand is a mood, not a mechanic.
      expect(r.rule, `${r.name}'s rule states no quantity`).toMatch(/\d|double/i)
    }
  })

  it('makes Blood Thimble name the same faces its implementation counts', () => {
    const thimble = relic('thimble')
    expect(thimble.effect.kind).toBe('perRedFace')
    expect(thimble.rule).toMatch(/red/i)
    expect(thimble.rule).not.toMatch(/green/i)
    expect(thimble.rule).toMatch(/included in the hand you SCORE/)
  })
})

describe('the enemies say what they are about to do', () => {
  it('states the damage and the order on every intent', () => {
    for (const e of Object.values(ENEMIES)) {
      for (const intent of e.script) {
        expect(intent.explain, `${e.name} ${intent.verb} does not name itself`).toContain(intent.verb)
        if (intent.damage > 0) {
          expect(intent.explain).toContain(String(intent.damage))
          // The order is the whole of the first fight's lesson.
          expect(intent.explain, `${e.name} ${intent.verb} does not say when it lands`).toMatch(
            /after you score/,
          )
        }
      }
    }
  })

  it('makes a telegraph state its next attack and its size', () => {
    for (const e of Object.values(ENEMIES)) {
      e.script.forEach((intent, turn) => {
        if (!intent.telegraph) return
        const next = e.script[(turn + 1) % e.script.length]!
        expect(intent.explain).toMatch(/no damage this turn/i)
        expect(intent.explain, `${e.name} does not name its next blow`).toContain(next.verb)
        expect(intent.explain, `${e.name} does not size its next blow`).toContain(String(next.damage))
      })
    }
  })
})

describe('the rooms say what changed', () => {
  it('tells the player the way on is open once the enemy is down', () => {
    for (const r of Object.values(ROOMS)) {
      if (!r.enemy) continue
      for (const exit of r.exits) {
        expect(exit.sense, `${r.name}'s way on says nothing about the way on`).toMatch(
          /corridor|passage|tunnel|door|path|open/i,
        )
      }
    }
  })

  it('makes the fork a decision rather than a riddle', () => {
    const [safe, risky] = room('fork').exits
    expect(safe?.sense, 'the short route does not say it is shorter').toMatch(/short/i)
    // The player is making a game decision. Say so before the tap.
    expect(risky?.sense, 'the deep route does not state its risk').toMatch(/fight|danger/i)
    expect(risky?.sense, 'the deep route does not state its reward').toMatch(/upgrade|chance/i)
  })

  it('lays nothing out on a step: an upgrade is beaten out of something', () => {
    for (const r of Object.values(ROOMS)) {
      expect(r.arrival, `${r.name} claims items are waiting`).not.toMatch(/two things|carry one/i)
    }
  })
})

describe('nothing player-facing uses private vocabulary', () => {
  it('never says "marked" where it means a red or green face', () => {
    for (const line of everySentence()) {
      expect(line, `"${line}" uses the word marked`).not.toMatch(/\bmarked\b/i)
    }
  })

  it('never calls a rule a build', () => {
    for (const line of everySentence()) {
      expect(line, `"${line}" describes a build instead of a rule`).not.toMatch(/\bbuild\b/i)
    }
  })
})
