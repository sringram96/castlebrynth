import { describe, expect, it } from 'vitest'

import {
  DEMO_ARMOR,
  DEMO_GOODS,
  DEMO_HAND,
  DEMO_GNAWING,
  DEMO_GNAWING_HEALTH,
  DEMO_HEALTH,
  LADDER,
} from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { DieId, Fight, Turn } from '../src/lots/index.js'
import {
  advanceFight,
  cast,
  casting,
  claim,
  claimable,
  decide,
  openFight,
  unspent,
  withTurn,
} from '../src/lots/index.js'
import { seedOf } from './helpers.js'

/**
 * The reference fight — `reference/the-gnawing-fight.md`, turn for turn.
 *
 * It replaces the Crawling One walkthrough, which tested the THROW / BRACE
 * turn the demo ruling repealed: arts 41 and 47 as amended (dice attack,
 * armor defends), art. 45 (a turn claims several combos, each die spent at
 * most once), art. 46 (the whiff clause repealed, ANY DICE is the floor),
 * arts 63–65 (the card, composites as single claims, intents that attack
 * the plan).
 *
 * The walkthrough keeps all six dice every turn — one casting, no recast.
 * The second casting is proved in `lots.turn.test.ts`; what this proves is
 * the claim, the card, and the resolution.
 */
const SEED = 20

const at = (...index: number[]): readonly DieId[] =>
  index.map((i) => {
    const die = DEMO_HAND.dice[i]
    if (die === undefined) throw new Error(`no die at ${i}`)
    return die.id
  })

const rolled = (turn: Turn): readonly number[] =>
  casting(turn).map((landed) => landed.face.value)

describe('lots — the reference fight (arts 41, 45–48, 63–65 as amended)', () => {
  it('reproduces the re-authored encounter turn for turn', () => {
    const lot = lotFrom(seedOf(SEED))
    let fight: Fight = openFight(
      DEMO_GNAWING,
      DEMO_HAND,
      DEMO_HEALTH,
      DEMO_ARMOR,
      DEMO_GOODS,
    )
    expect(fight.horrorHealth).toBe(DEMO_GNAWING_HEALTH)
    expect(fight.armor).toBe(3)

    // ── Turn 1 — swipe 7. `5 3 4 2 3 2`. Two pair, one claim (art. 64).
    expect(fight.turn.intent).toMatchObject({ verb: 'SWIPE', amount: 7 })
    let turn = cast(fight.turn, lot)
    expect(rolled(turn)).toEqual([5, 3, 4, 2, 3, 2])
    // The threes and the twos make one composite, not a triple and a pair.
    expect(claimable(turn, at(1, 4, 3, 5), LADDER)).toEqual(['two-pair', 'any-dice'])
    turn = claim(turn, at(1, 4, 3, 5), 'two-pair', LADDER, DEMO_GOODS)
    expect(turn.claims[0]).toMatchObject({ sum: 10, tier: LADDER['two-pair'] })
    let resolved = decide(turn, 'end-turn', fight.armor, DEMO_GOODS)
    expect(resolved).toMatchObject({ harmDealt: 30, blocked: 3, harmTaken: 4, healed: 0 })
    fight = advanceFight(withTurn(fight, turn), resolved)
    expect(fight).toMatchObject({ horrorHealth: 120, yourHealth: 22, turnNumber: 2 })

    // ── Turn 2 — seal 6. `5 6 3 6 2 1`. The pair lines are shut (art. 65).
    expect(fight.turn.intent).toMatchObject({ verb: 'SEAL', amount: 6 })
    turn = cast(fight.turn, lot)
    expect(rolled(turn)).toEqual([5, 6, 3, 6, 2, 1])
    expect(claimable(turn, at(1, 3), LADDER)).toEqual(['any-dice'])
    expect(() => claim(turn, at(1, 3), 'pair', LADDER, DEMO_GOODS)).toThrow()
    turn = claim(turn, at(5, 4, 2), 'run-3', LADDER, DEMO_GOODS)
    expect(turn.claims[0]).toMatchObject({ sum: 6, tier: LADDER['run-3'] })
    resolved = decide(turn, 'end-turn', fight.armor, DEMO_GOODS)
    expect(resolved).toMatchObject({ harmDealt: 12, blocked: 3, harmTaken: 3 })
    fight = advanceFight(withTurn(fight, turn), resolved)
    expect(fight).toMatchObject({ horrorHealth: 108, yourHealth: 19, turnNumber: 3 })

    // ── Turn 3 — covet 5. `2 4 2 2 6 2`. Covet beats the Ossuary (art. 65).
    expect(fight.turn.intent).toMatchObject({ verb: 'COVET', amount: 5 })
    turn = cast(fight.turn, lot)
    expect(rolled(turn)).toEqual([2, 4, 2, 2, 6, 2])
    // The cursed six would be twelve to the Ossuary, and is nothing instead.
    const cursed = claim(turn, at(4), 'any-dice', LADDER, DEMO_GOODS)
    expect(cursed.claims[0]).toMatchObject({ sum: 0 })
    turn = claim(turn, at(0, 2, 3, 5), 'quad', LADDER, DEMO_GOODS)
    expect(turn.claims[0]).toMatchObject({ sum: 8, tier: LADDER.quad })
    resolved = decide(turn, 'end-turn', fight.armor, DEMO_GOODS)
    expect(resolved).toMatchObject({ harmDealt: 32, blocked: 3, harmTaken: 2 })
    fight = advanceFight(withTurn(fight, turn), resolved)
    expect(fight).toMatchObject({ horrorHealth: 76, yourHealth: 17, turnNumber: 4 })

    // ── Turn 4 — corrode 9. `1 2 1 2 3 6`. The Leech fires; armor does not.
    expect(fight.turn.intent).toMatchObject({ verb: 'CORRODE', amount: 9 })
    turn = cast(fight.turn, lot)
    expect(rolled(turn)).toEqual([1, 2, 1, 2, 3, 6])
    turn = claim(turn, at(5), 'any-dice', LADDER, DEMO_GOODS)
    // The Ossuary doubles the six; the Leech's own face is the one spent.
    expect(turn.claims[0]).toMatchObject({ sum: 12, tier: LADDER['any-dice'] })
    resolved = decide(turn, 'end-turn', fight.armor, DEMO_GOODS)
    expect(resolved).toMatchObject({ harmDealt: 12, healed: 2, blocked: 0, harmTaken: 9 })
    fight = advanceFight(withTurn(fight, turn), resolved)
    expect(fight).toMatchObject({ horrorHealth: 64, yourHealth: 10, turnNumber: 5 })

    // ── Turn 5 — bellow 16. `6 6 6 2 2 3`. The Sisters, and the end (art. 52).
    expect(fight.turn.intent).toMatchObject({ verb: 'BELLOW', amount: 16 })
    turn = cast(fight.turn, lot)
    expect(rolled(turn)).toEqual([6, 6, 6, 2, 2, 3])
    turn = claim(turn, at(1, 2), 'pair', LADDER, DEMO_GOODS)
    // Three sixes at twelve each, on the PAIR line, at the triple's tier.
    expect(turn.claims[0]).toMatchObject({ sum: 36, tier: LADDER.triple })
    expect(turn.claims[0]?.bond).toBe('bond.sisters')
    resolved = decide(turn, 'end-turn', fight.armor, DEMO_GOODS)
    expect(resolved.harmDealt).toBe(108)
    fight = advanceFight(withTurn(fight, turn), resolved)

    // The horror falls before it breathes out, so the bellow never lands.
    expect(fight.outcome).toBe('won')
    expect(fight.horrorHealth).toBe(0)
    expect(fight.yourHealth).toBe(10)
    expect(fight.events.at(-1)).toEqual({ kind: 'ended', outcome: 'won' })

    // Five lines burned off the card, eight still standing (art. 63).
    expect([...unspent(fight.card)].sort()).toEqual(
      ['full-house', 'quint', 'run-4', 'run-5', 'straight', 'three-pairs', 'triple', 'two-triples'].sort(),
    )
  })
})
