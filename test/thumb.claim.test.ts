import { describe, expect, it } from 'vitest'

import { ALL_RIDERS, LADDER, NOTICES, THE_CAREFUL, THE_GNAWING } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { DieId, Fight, Goods, Line, Lot, Value } from '../src/lots/index.js'
import {
  advanceFight,
  assembleHand,
  cast,
  casting,
  claim,
  claimable,
  decide,
  fitsNothing,
  harm,
  keep,
  recast,
  shapeOf,
  shapesOf,
  withTurn,
} from '../src/lots/index.js'
import { openFightDoor } from '../src/hinge/index.js'
import type { Ledgers } from '../src/state/index.js'
import { collect } from '../src/state/index.js'
import { atAFight } from './drift.js'
import { seedOf, turnOf } from './helpers.js'

/**
 * The thumb on the dice — art. 72, and the defect the first playtest found.
 *
 * A valid full house could not be claimed through the shell while every
 * engine test was green, because the two layers disagree about nothing: the
 * engine matches the *exact* selection (art. 72's DEFAULT), and the shell
 * never said so. A hand of six holding a full house offers FULL HOUSE on
 * the exact five and only ANY DICE on all six — and ANY DICE is the floor
 * (art. 46), always on offer, so the shell's "nothing to take" branch was
 * unreachable and the thumb was told nothing at all.
 *
 * These tests are the two halves of that: the flow a thumb actually walks,
 * and the property the engine owed all along.
 */

const GOODS: Goods = { talismans: [], riders: ALL_RIDERS }

/**
 * The shell's own call sequence, lifted out of the DOM — every call
 * `src/main.ts` makes to play a turn, in the order a thumb makes it. There
 * is no DOM here on purpose: the defect lives in which engine questions the
 * shell asks and what it does with the answers, not in the markup.
 */
function thumb(opened: Fight, lot: Lot) {
  let now = opened
  let phase: 'pre' | 'keep' | 'claim' = 'pre'
  let selected: readonly DieId[] = []

  return {
    get fight() {
      return now
    },
    get phase() {
      return phase
    },
    /** The dice as they lie, in tray order. */
    laid() {
      return casting(now.turn)
    },
    values() {
      return casting(now.turn).map((landed) => landed.face.value)
    },
    /** "roll dice" */
    roll() {
      now = withTurn(now, cast(now.turn, lot))
      phase = 'keep'
    },
    /** "re-roll the rest" */
    reroll() {
      now = withTurn(now, recast(now.turn, lot))
      phase = 'claim'
      selected = []
    },
    /**
     * The second casting declined. art. 41 (amended): there is no Keep all
     * button any more — holding every die and pressing Reroll throws nothing,
     * which is the same thing said in the vocabulary the phase already has.
     */
    holdAll() {
      for (const landed of casting(now.turn)) this.tap(landed.die)
      now = withTurn(now, recast(now.turn, lot))
      phase = 'claim'
      selected = []
    },
    /** A tap on a die: holding in the keep phase, selecting in the claim phase. */
    tap(die: DieId) {
      if (phase === 'keep') {
        const held = casting(now.turn)
          .filter((landed) => (landed.die === die ? !landed.kept : landed.kept))
          .map((landed) => landed.die)
        now = withTurn(now, keep(now.turn, held))
        return
      }
      selected = selected.includes(die)
        ? selected.filter((one) => one !== die)
        : [...selected, die]
    },
    selected() {
      return selected
    },
    /** The claim buttons the tray would draw for this selection. */
    offers(): readonly Line[] {
      if (phase !== 'claim' || selected.length === 0) return []
      return claimable(now.turn, selected, LADDER)
    },
    /**
     * What the tray says when a selection is owed a reason (art. 72).
     *
     * card 71: the reason is a *reason* now. The tray used to print the
     * floor's offer and "No combo uses exactly these dice" side by side,
     * which reads as offering something and denying it in one breath — so
     * what stands beside the offer says what the offer is.
     */
    says(): string | null {
      if (phase !== 'claim' || selected.length === 0) return null
      return fitsNothing(now.turn, selected, LADDER) ? (NOTICES['claim.floor'] ?? '') : null
    },
    /**
     * "attack" — one press (art. 41, amended 2026-08-05). The selection is
     * the attack: the claim goes on the ledger and the turn ends behind it,
     * so the two halves the thumb used to press separately are returned
     * together here.
     */
    attack(line: Line) {
      now = withTurn(now, claim(now.turn, selected, line, LADDER, GOODS))
      const claimed = now.turn
      const resolution = decide(claimed, 'end-turn', now.armor, GOODS)
      now = advanceFight(now, resolution)
      phase = 'pre'
      selected = []
      return { claimed, resolution }
    },
    /** "end turn" — the press when the selection claims nothing (art. 46). */
    endTurn() {
      const resolution = decide(now.turn, 'end-turn', now.armor, GOODS)
      now = advanceFight(now, resolution)
      phase = 'pre'
      selected = []
      return resolution
    },
  }
}

/**
 * The fight-door of the dealt chain, opened the way the shell opens it.
 *
 * arts 55, 60 (amended 2026-08-06): a bare hand is six, so the defect
 * art. 72 is about can be staged on the hand a player actually wakes with —
 * five dice of signature 3-2 are a full house, and the sixth die on the
 * table is the one that stops the *whole selection* from being one. Under
 * the superseded five-bone start this fixture had to buy its sixth die off a
 * dead traveler first; it no longer does.
 */
function atTheFightDoor() {
  // art. 83: the fight is wherever this run's choices put teeth.
  const { ledgers, door } = atAFight(4)
  const found: Ledgers = {
    permanent: ledgers.permanent,
    run: {
      ...ledgers.run!,
      hand: assembleHand(ledgers.permanent.pouch, ledgers.permanent.handSize),
    },
  }
  return openFightDoor(found, { door, horror: THE_GNAWING }, GOODS)
}

/**
 * Seed 6 casts 4-1-4-2-4-1 off that hand: three fours, two ones, and a two
 * that belongs to nothing. It is the playtest's hand — a full house you can
 * see, one die away from being the whole hand.
 */
const FULL_HOUSE_SEED = 6

describe('the thumb — art. 72 (the exact selection, and why it fits nothing)', () => {
  it('claims a full house end to end, through the flow a thumb walks', () => {
    const play = thumb(atTheFightDoor(), lotFrom(seedOf(FULL_HOUSE_SEED)))

    play.roll()
    expect(play.values()).toEqual([4, 1, 4, 2, 4, 1])

    // Keeping is planning (art. 42), and this hand is already what it wants.
    play.holdAll()
    expect(play.phase).toBe('claim')

    // The exact five: three fours and two ones, leaving the two behind.
    const laid = play.laid()
    const five = laid.filter((landed) => landed.face.value !== 2)
    for (const landed of five) play.tap(landed.die)
    expect(play.selected()).toHaveLength(5)

    expect(play.offers()).toContain('full-house')
    expect(play.says()).toBeNull()

    // One press: the claim and the end of the turn (art. 41, amended).
    const before = play.fight.horrorHealth
    const { claimed, resolution } = play.attack('full-house')

    const made = claimed.claims[0]!
    expect(made.line).toBe('full-house')
    expect(made.sum).toBe(4 * 3 + 1 * 2)
    expect(harm(made)).toBe(14 * LADDER['full-house'].multiplier)

    // The card burns the line, and the horror wears the harm (arts 45, 63).
    expect(claimed.card['full-house']).toBe(true)
    expect(resolution.harmDealt).toBe(14 * LADDER['full-house'].multiplier)
    expect(play.fight.horrorHealth).toBe(before - resolution.harmDealt)
  })

  it('says why when the selection holds a full house without being one', () => {
    const play = thumb(atTheFightDoor(), lotFrom(seedOf(FULL_HOUSE_SEED)))
    play.roll()
    play.holdAll()

    // The whole hand: a full house is in there, but the selection is not one.
    for (const landed of play.laid()) play.tap(landed.die)
    expect(shapeOf(play.values()).signature).toBe('321')

    // The floor is on offer, and the floor is not a combo (art. 46) — so the
    // thumb is owed a reason, and this is the line that was missing.
    expect(play.offers()).toEqual(['any-dice'])
    expect(play.says()).toBe(NOTICES['claim.floor'])
    // card 71: and it reads as one statement beside the offer rather than as
    // a refusal contradicting it.
    expect(play.says()).not.toBe(NOTICES['claim.exact'])

    // Releasing the one die that fits nothing turns the message into an offer.
    const stray = play.laid().find((landed) => landed.face.value === 2)!
    play.tap(stray.die)
    expect(play.offers()).toContain('full-house')
    expect(play.says()).toBeNull()
  })

  it('never says why while a combo is on offer', () => {
    const play = thumb(atTheFightDoor(), lotFrom(seedOf(FULL_HOUSE_SEED)))
    play.roll()
    play.holdAll()
    const fours = play.laid().filter((landed) => landed.face.value === 4)
    for (const landed of fours) play.tap(landed.die)
    expect(play.offers()).toContain('triple')
    expect(play.says()).toBeNull()
  })

  it('holds its tongue when nothing is selected at all', () => {
    const turn = turnOf([4, 1, 4, 2, 4, 2])
    expect(fitsNothing(turn, [], LADDER)).toBe(false)
  })
})

describe('the shapes — every five-die selection of signature 3-2 is a full house', () => {
  it('offers FULL HOUSE for every 3-2 selection there is (arts 48, 72)', () => {
    let seen = 0
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) {
        if (a === b) continue
        // Every ordering of the five, so the property cannot depend on
        // which slot of the tray a die happens to sit in.
        const base = [a, a, a, b, b] as Value[]
        for (const values of permutations(base)) {
          seen++
          expect(shapeOf(values).signature).toBe('32')
          expect(shapesOf(values)).toContain('full-house')

          // And through the claim path the shell actually calls.
          const turn = turnOf(values)
          const ids = turn.hand.dice.map((die) => die.id)
          expect(claimable(turn, ids, LADDER)).toContain('full-house')
          expect(fitsNothing(turn, ids, LADDER)).toBe(false)
        }
      }
    }
    // 30 value pairs × 10 distinct arrangements of AAABB.
    expect(seen).toBe(300)
  })

  it('reads exhaustively: of all five-die hands, exactly the 3-2 ones are full houses', () => {
    for (let n = 0; n < 6 ** 5; n++) {
      const values = [0, 1, 2, 3, 4].map((i) => ((Math.floor(n / 6 ** i) % 6) + 1) as Value)
      const isFullHouse = shapesOf(values).includes('full-house')
      expect(isFullHouse).toBe(shapeOf(values).signature === '32')
    }
  })
})

/** The distinct arrangements of a five-value multiset. */
function permutations(values: readonly Value[]): readonly Value[][] {
  const out = new Map<string, Value[]>()
  const walk = (left: readonly Value[], built: readonly Value[]): void => {
    if (left.length === 0) {
      out.set(built.join(''), [...built])
      return
    }
    for (let i = 0; i < left.length; i++) {
      walk([...left.slice(0, i), ...left.slice(i + 1)], [...built, left[i]!])
    }
  }
  walk(values, [])
  return [...out.values()]
}
