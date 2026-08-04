import { describe, expect, it } from 'vitest'

import { LADDER, LEECH, THE_OSSUARY, THE_ZEALOT } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Fight, Goods, Intent, Line, Lot, Turn, Value } from '../src/lots/index.js'
import {
  LINES,
  advanceFight,
  attack,
  cast,
  casting,
  claim,
  claimable,
  claimedDice,
  decide,
  everyDieClaimed,
  keep,
  openFight,
  openTurn,
  recast,
  freshCard,
  unused,
  withTurn,
} from '../src/lots/index.js'
import { handOf, seedOf, turnOf, idsOf } from './helpers.js'
import { scriptedHorror } from '../src/content/index.js'

/**
 * The arithmetic agent's guarantees, as properties rather than examples.
 * These hold for every hand, every fight, forever — or the promise that a
 * player can compute their odds is not kept.
 */
const SWIPE: Intent = { verb: 'SWIPE', amount: 8 }
const COVET: Intent = { verb: 'COVET', amount: 5, effect: { kind: 'curse', value: 6 } }

const values = (lot: Lot, n: number): readonly Value[] =>
  Array.from({ length: n }, () => (1 + Math.floor(lot.next() * 6)) as Value)

/** Claim greedily until the turn has nothing left it can take. */
function claimAll(start: Turn, goods: Goods = { talismans: [], riders: [] }): Turn {
  let turn = start
  for (let pass = 0; pass < 8; pass++) {
    const free = unused(turn).map((landed) => landed.die)
    if (free.length === 0) break
    let took = false
    for (let size = free.length; size >= 1 && !took; size--) {
      for (let from = 0; from + size <= free.length && !took; from++) {
        const chosen = free.slice(from, from + size)
        const lines = claimable(turn, chosen, LADDER).filter((line) => line !== 'any-dice')
        const line = lines[0]
        if (line === undefined) continue
        turn = claim(turn, chosen, line, LADDER, goods)
        took = true
      }
    }
    if (!took) break
  }
  return turn
}

describe('lots — the invariants (arts 45, 46, 53, 63) and the declared odds', () => {
  it('never counts a die in two claims (art. 45)', () => {
    const lot = lotFrom(seedOf(101))
    for (let n = 0; n < 400; n++) {
      const turn = claimAll(turnOf(values(lot, 6), { intent: SWIPE }))
      const seen = new Set<string>()
      for (const made of turn.claims) {
        for (const landed of made.dice) {
          expect(seen.has(landed.die)).toBe(false)
          seen.add(landed.die)
        }
      }
      expect(seen.size).toBe(claimedDice(turn).size)
      expect(seen.size + unused(turn).length).toBe(6)
    }
  })

  it('never spends a line twice in one fight (art. 63)', () => {
    const lot = lotFrom(seedOf(102))
    const horror = scriptedHorror('horror.straw', 1000000, [SWIPE], 0)
    let fight: Fight = openFight(horror, handOf(), 100000, 0)
    const burned: Line[] = []
    for (let turnNumber = 0; turnNumber < 20 && fight.outcome === 'fighting'; turnNumber++) {
      const turn = claimAll(cast(fight.turn, lot))
      for (const made of turn.claims) {
        expect(burned).not.toContain(made.line)
        burned.push(made.line)
      }
      fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
    }
    expect(new Set(burned).size).toBe(burned.length)
  })

  it('always leaves ANY DICE claimable while it is unspent (art. 46)', () => {
    const lot = lotFrom(seedOf(103))
    for (let n = 0; n < 500; n++) {
      const turn = turnOf(values(lot, 6), { intent: SWIPE })
      const dice = casting(turn).map((landed) => landed.die)
      expect(claimable(turn, dice, LADDER)).toContain('any-dice')
      // And it is gone the moment the card says so.
      const empty = { ...turn, card: { ...turn.card, 'any-dice': true } }
      expect(claimable(empty, dice, LADDER)).not.toContain('any-dice')
    }
  })

  it('lets covet beat the Ossuary — a cursed six is nothing, not twelve (art. 65)', () => {
    const ossuary: Goods = { talismans: [THE_OSSUARY], riders: [] }
    const lot = lotFrom(seedOf(104))
    for (let n = 0; n < 200; n++) {
      const rolled = values(lot, 6)
      const rich = claimAll(turnOf(rolled, { intent: SWIPE }), ossuary)
      const poor = claimAll(turnOf(rolled, { intent: COVET }), ossuary)
      // The shapes are the same either way: a curse moves worth, not shape.
      expect(poor.claims.map((made) => made.line)).toEqual(rich.claims.map((made) => made.line))
      const claimedSixes = rich.claims
        .flatMap((made) => made.dice)
        .filter((landed) => landed.face.value === 6).length
      expect(attack(poor, ossuary)).toBeLessThanOrEqual(attack(rich, ossuary))
      if (claimedSixes === 0) expect(attack(poor, ossuary)).toBe(attack(rich, ossuary))
      else expect(attack(poor, ossuary)).toBeLessThan(attack(rich, ossuary))
    }
  })

  it('fires the Zealot exactly when every die is claimed, and never otherwise (art. 53)', () => {
    const zealot: Goods = { talismans: [THE_ZEALOT], riders: [] }
    const lot = lotFrom(seedOf(105))
    for (let n = 0; n < 300; n++) {
      const turn = claimAll(turnOf(values(lot, 6), { intent: SWIPE }), zealot)
      const plain = attack(turn)
      const zealous = attack(turn, zealot)
      if (plain === 0) expect(zealous).toBe(0)
      else if (everyDieClaimed(turn)) expect(zealous).toBe(plain * 2)
      else expect(zealous).toBe(plain)
    }
  })

  it('keeps damage at a floor of nothing, both ways (art. 46)', () => {
    const lot = lotFrom(seedOf(106))
    for (let n = 0; n < 300; n++) {
      const turn = claimAll(turnOf(values(lot, 6), { intent: SWIPE }))
      const armor = Math.floor(lot.next() * 20)
      const resolved = decide(turn, 'end-turn', armor)
      expect(resolved.harmTaken).toBeGreaterThanOrEqual(0)
      expect(resolved.harmDealt).toBeGreaterThanOrEqual(0)
      expect(resolved.blocked).toBeGreaterThanOrEqual(0)
      expect(resolved.blocked).toBeLessThanOrEqual(SWIPE.amount)
    }
  })

  it('fires a rider only from a claimed face, never a kept or unused one (art. 51)', () => {
    const leech: Goods = { talismans: [], riders: [LEECH] }
    const turn = turnOf([1, 2, 3, 4, 5, 6], { intent: SWIPE })
    expect(decide(turn, 'end-turn', 0, leech).healed).toBe(0)
  })

  it('derives an identical fight from an identical seed (art. 36)', () => {
    const play = (): readonly number[] => {
      const lot = lotFrom(seedOf(2026))
      const horror = scriptedHorror('horror.straw', 400, [SWIPE], 0)
      let fight: Fight = openFight(horror, handOf(), 200, 2)
      const trace: number[] = []
      while (fight.outcome === 'fighting') {
        const turn = claimAll(recast(keep(cast(fight.turn, lot), []), lot))
        trace.push(...casting(turn).map((landed) => landed.face.value))
        const resolved = decide(turn, 'end-turn', fight.armor)
        trace.push(resolved.harmDealt, resolved.harmTaken)
        fight = advanceFight(withTurn(fight, turn), resolved)
      }
      trace.push(fight.horrorHealth, fight.yourHealth)
      return trace
    }
    expect(play()).toEqual(play())
  })

  /**
   * The recast odds table, unamended by the demo ruling and still binding:
   * hunting a face with 1/2/3/4 dice succeeds 17/31/42/52% of the time.
   * These are the odds a fair d6 gives, which is the point — a player can
   * compute them.
   */
  it('hunts a face at 17 / 31 / 42 / 52 per cent, by simulation (art. 54)', () => {
    const expected = [0.1667, 0.3055, 0.4213, 0.5177]
    const trials = 40000
    const lot = lotFrom(seedOf(4242))
    for (let hunting = 1; hunting <= 4; hunting++) {
      let hits = 0
      for (let n = 0; n < trials; n++) {
        const hand = handOf(6)
        const first = cast(openTurn(hand, SWIPE, freshCard()), lot)
        // Keep the ones you are not hunting with; throw the rest again.
        const held = casting(first)
          .slice(hunting)
          .map((landed) => landed.die)
        const after = recast(keep(first, held), lot)
        const thrown = casting(after).slice(0, hunting)
        if (thrown.some((landed) => landed.face.value === 6)) hits++
      }
      expect(hits / trials).toBeCloseTo(expected[hunting - 1]!, 1.7)
    }
  })

  it('offers every line of the ladder, and the ladder prices every line (art. 48)', () => {
    for (const line of LINES) {
      expect(LADDER[line]).toBeDefined()
      expect(LADDER[line].multiplier).toBeGreaterThan(0)
    }
    expect(Object.keys(LADDER).sort()).toEqual([...LINES].sort())
  })

  it('claims a whole hand without a die going missing (art. 45)', () => {
    const turn = turnOf([2, 2, 3, 3, 4, 4], { intent: SWIPE })
    const claimed = claim(turn, idsOf(turn, 0, 1, 2, 3, 4, 5), 'three-pairs', LADDER)
    expect(everyDieClaimed(claimed)).toBe(true)
    expect(unused(claimed)).toEqual([])
  })
})
