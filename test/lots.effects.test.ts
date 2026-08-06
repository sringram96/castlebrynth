import { describe, expect, it } from 'vitest'

import { scriptedHorror } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type {
  Die,
  DieId,
  Fight,
  Hand,
  Horror,
  Intent,
  Turn,
  Value,
} from '../src/lots/index.js'
import {
  LINES,
  advanceFight,
  bindsFrom,
  bleedFrom,
  cast,
  castable,
  casting,
  claim,
  claimable,
  decide,
  hungerFrom,
  openFight,
  selection,
  withTurn,
} from '../src/lots/index.js'
import { LADDER } from '../src/content/index.js'
import { seedOf } from './helpers.js'

/**
 * The three effect kinds the company wave adds (card 30, art. 65).
 *
 * Each attacks a different thing the player has — the hand, time, and
 * hesitation — so each is tested for the thing it attacks and for the thing
 * it must *not* touch. The order they resolve in is one order (`advanceFight`)
 * and it is asserted here rather than described: an effect that lands a beat
 * early or a beat late is a different effect.
 *
 * Nothing here is content. The horrors are one-line fixtures whose only job
 * is to declare an intent; the numbers are chosen to make a shape.
 */

/** A die that always shows one value, so a test can say what the table is. */
function fixed(id: string, value: number): Die {
  return { id: id as DieId, body: 1, faces: [{ value: value as Value }] }
}

/** A hand whose faces are exactly these values, in this order. */
function handShowing(...values: readonly number[]): Hand {
  return { dice: values.map((value, at) => fixed(`bone.${at}`, value)) }
}

const LOT = () => lotFrom(seedOf(7))

/** A horror that intends the same thing every turn, and never gets worse. */
function alwaysIntends(intent: Intent, health = 500): Horror {
  return scriptedHorror('horror.fixture', health, [intent], 0)
}

/** A fight opened against one fixed intent, with the hand showing what it shows. */
function against(intent: Intent, hand: Hand, health = 500, armor = 0, yours = 60): Fight {
  return openFight(alwaysIntends(intent, health), hand, yours, armor)
}

/** The whole turn cast and ended, with no claim made. */
function endWithNothing(fight: Fight): Fight {
  const turn = cast(fight.turn, LOT())
  return advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
}

/** The whole turn cast, the biggest claim it offers taken, and ended. */
function endWithSomething(fight: Fight): Fight {
  let turn: Turn = cast(fight.turn, LOT())
  const dice = casting(turn).map((landed) => landed.die)
  const line = claimable(turn, dice, LADDER)[0]
  if (line !== undefined) turn = claim(turn, dice, line, LADDER)
  return advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
}

const idsOn = (turn: Turn): readonly string[] =>
  casting(turn).map((landed) => landed.die as string)

// ── bind: the hand ─────────────────────────────────────────────────────

describe('art. 65 — bind attacks the hand', () => {
  const DRAG: Intent = { verb: 'DRAG', amount: 0, effect: { kind: 'bind', rule: 'highest' } }

  it('takes the die the declared rule names, read off the dice as they lie', () => {
    const fight = against(DRAG, handShowing(2, 6, 3, 1, 5))
    const turn = cast(fight.turn, LOT())
    expect(bindsFrom(turn)).toEqual(['bone.1'])

    const low: Intent = { ...DRAG, effect: { kind: 'bind', rule: 'lowest' } }
    const other = cast(against(low, handShowing(2, 6, 3, 1, 5)).turn, LOT())
    expect(bindsFrom(other)).toEqual(['bone.3'])
  })

  it('breaks a tie on the hand’s own order, so a replay binds the same die', () => {
    const turn = cast(against(DRAG, handShowing(6, 6, 6)).turn, LOT())
    expect(bindsFrom(turn)).toEqual(['bone.0'])
  })

  it('excludes the bound die at the cast, not at the claim', () => {
    const opened = against(DRAG, handShowing(2, 6, 3, 1, 5))
    const next = endWithSomething(opened)
    expect(next.turn.bound).toEqual(['bone.1'])
    // Not in the hand this turn has, and therefore never on the table.
    expect(castable(next.turn).map((die) => die.id as string)).not.toContain('bone.1')
    const laid = cast(next.turn, LOT())
    expect(idsOn(laid)).toHaveLength(4)
    expect(idsOn(laid)).not.toContain('bone.1')
    // And nothing downstream can reach for it: a die that never landed
    // cannot be selected, so it cannot be claimed (art. 45).
    expect(selection(laid, ['bone.1' as DieId])).toEqual([])
    expect(claimable(laid, ['bone.1' as DieId], LADDER)).toEqual([])
  })

  it('lasts exactly one turn — the hand comes back whole (art. 44)', () => {
    const once: Intent = { verb: 'DRAG', amount: 0 }
    const horror = scriptedHorror('horror.fixture', 500, [DRAG, once, once], 0)
    let fight = openFight(horror, handShowing(2, 6, 3, 1, 5), 60, 0)
    fight = endWithSomething(fight)
    expect(fight.turn.bound).toEqual(['bone.1'])
    fight = endWithSomething(fight)
    expect(fight.turn.bound).toEqual([])
    expect(cast(fight.turn, LOT()).castings[0]).toHaveLength(5)
  })

  it('binds nothing when the turn is fled, and nothing off an empty table', () => {
    const fight = against(DRAG, handShowing(2, 6, 3))
    const turn = cast(fight.turn, LOT())
    expect(decide(turn, 'flee', 0).binds).toEqual([])
    // art. 42: the intent is known before a die is thrown, and a turn with
    // nothing thrown has no highest die to take.
    expect(bindsFrom(fight.turn)).toEqual([])
  })

  it('binds nothing when the intent does not declare it', () => {
    const turn = cast(against({ verb: 'SWIPE', amount: 4 }, handShowing(6, 1)).turn, LOT())
    expect(bindsFrom(turn)).toEqual([])
    expect(decide(turn, 'end-turn', 0).binds).toEqual([])
  })
})

// ── bleed: time ────────────────────────────────────────────────────────

describe('art. 65 — bleed attacks time', () => {
  const CHILL: Intent = {
    verb: 'CHILL',
    amount: 0,
    effect: { kind: 'bleed', amount: 4, turns: 3 },
  }

  it('does not tick on the turn it opens, and ticks on each of the next K', () => {
    let fight = against(CHILL, handShowing(1, 1, 1))
    const opened = fight.yourHealth
    fight = endWithSomething(fight)
    // One tick has landed — the top of turn two — and two are left.
    expect(fight.yourHealth).toBe(opened - 4)
    expect(fight.bleed).toEqual({ amount: 4, turns: 2 })
  })

  it('applies armor at every tick, and stops at nothing (art. 47)', () => {
    let fight = against(CHILL, handShowing(1, 1, 1), 500, 3)
    const opened = fight.yourHealth
    fight = endWithSomething(fight)
    expect(fight.yourHealth).toBe(opened - 1)

    // Armor above the bleed eats the whole of it, every time.
    let plated = against(CHILL, handShowing(1, 1, 1), 500, 9)
    const whole = plated.yourHealth
    plated = endWithSomething(plated)
    expect(plated.yourHealth).toBe(whole)
    expect(plated.events.some((one) => one.kind === 'bled')).toBe(false)
  })

  it('refreshes rather than adds, however often it lands', () => {
    let fight = against(CHILL, handShowing(1, 1, 1))
    fight = endWithSomething(fight)
    fight = endWithSomething(fight)
    fight = endWithSomething(fight)
    // Three landings of a three-turn bleed leave a three-turn bleed, never
    // nine turns of it and never twelve a tick.
    expect(fight.bleed).toEqual({ amount: 4, turns: 2 })
    const before = fight.yourHealth
    fight = endWithSomething(fight)
    expect(before - fight.yourHealth).toBe(4)
  })

  it('runs out, and then it is gone', () => {
    const once: Intent = { verb: 'CHILL', amount: 0 }
    const horror = scriptedHorror('horror.fixture', 500, [CHILL, once, once, once, once], 0)
    let fight = openFight(horror, handShowing(1, 1, 1), 60, 0)
    const opened = fight.yourHealth
    for (let n = 0; n < 4; n++) fight = endWithSomething(fight)
    expect(fight.bleed).toBeNull()
    // Three ticks, at the top of turns two, three and four. No fourth.
    expect(opened - fight.yourHealth).toBe(12)
  })

  it('can be the thing that kills you, and the fight says so', () => {
    let fight = against(CHILL, handShowing(1, 1, 1), 500, 0, 3)
    fight = endWithSomething(fight)
    expect(fight.outcome).toBe('lost')
    expect(fight.events.at(-1)).toEqual({ kind: 'ended', outcome: 'lost' })
    expect(fight.events.some((one) => one.kind === 'bled')).toBe(true)
  })

  it('ticks before the intent shows, so a turn opens on what it already costs', () => {
    let fight = against(CHILL, handShowing(1, 1, 1))
    fight = endWithSomething(fight)
    const bled = fight.events.findIndex((one) => one.kind === 'bled')
    const opened = fight.events.map((one) => one.kind).lastIndexOf('turn-opened')
    expect(bled).toBeGreaterThan(-1)
    expect(bled).toBeLessThan(opened)
  })

  it('opens nothing from an intent that declares no turns', () => {
    expect(bleedFrom({ verb: 'X', amount: 1, effect: { kind: 'bleed', amount: 4, turns: 0 } }))
      .toBeNull()
    expect(bleedFrom({ verb: 'X', amount: 1 })).toBeNull()
  })
})

// ── hunger: hesitation ─────────────────────────────────────────────────

describe('art. 65 — hunger attacks hesitation', () => {
  const GAPE: Intent = { verb: 'GAPE', amount: 0, effect: { kind: 'hunger', amount: 9 } }

  it('feeds the horror when the turn lands no claim', () => {
    const fight = against(GAPE, handShowing(1, 2, 4), 60)
    const hurt: Fight = { ...fight, horrorHealth: 40 }
    const after = endWithNothing(hurt)
    expect(after.horrorHealth).toBe(49)
    expect(after.events).toContainEqual({ kind: 'fed', amount: 9 })
  })

  it('feeds it nothing when a claim landed, however small', () => {
    const fight = against(GAPE, handShowing(1, 2, 4), 60)
    const hurt: Fight = { ...fight, horrorHealth: 40 }
    const after = endWithSomething(hurt)
    expect(after.horrorHealth).toBeLessThan(40)
    expect(after.events.some((one) => one.kind === 'fed')).toBe(false)
  })

  it('never heals it past the health it started the fight with (art. 57)', () => {
    const fight = against(GAPE, handShowing(1, 2, 4), 60)
    const scratched: Fight = { ...fight, horrorHealth: 57 }
    expect(endWithNothing(scratched).horrorHealth).toBe(60)
  })

  it('is not fed by running: flight is not a turn that hesitated (art. 41)', () => {
    const fight = against(GAPE, handShowing(1, 2, 4), 60)
    const turn = cast(fight.turn, LOT())
    expect(decide(turn, 'flee', 0).fed).toBe(0)
  })

  it('reads a claim, not a number — a claim worth nothing still counts', () => {
    // art. 65: a cursing intent counts a value at nothing, so this claim
    // scores zero. It is still a claim, and hunger is about the choice.
    const both: Intent = { verb: 'GAPE', amount: 0, effect: { kind: 'hunger', amount: 9 } }
    const fight = against(both, handShowing(3, 3, 5))
    let turn = cast(fight.turn, LOT())
    turn = claim(turn, ['bone.0' as DieId, 'bone.1' as DieId], 'pair', LADDER)
    expect(hungerFrom(turn)).toBe(0)
  })
})

// ── the order, and what nothing may quietly break ──────────────────────

describe('art. 65 — the new kinds keep the old law', () => {
  it('leaves the card, the ladder and the floor exactly where they were', () => {
    // Every line is still claimable once per fight, whatever is bound or
    // bleeding: an effect that quietly spent a line would be a bug the
    // card's own tests could not see.
    const DRAG: Intent = { verb: 'DRAG', amount: 3, effect: { kind: 'bind', rule: 'highest' } }
    let fight = against(DRAG, handShowing(2, 2, 5, 5, 6))
    fight = endWithSomething(fight)
    const open = LINES.filter((line) => !fight.card[line])
    expect(open.length).toBe(LINES.length - 1)
  })

  it('lets a whole fight run to a win with all three in force', () => {
    const script: readonly Intent[] = [
      { verb: 'DRAG', amount: 1, effect: { kind: 'bind', rule: 'highest' } },
      { verb: 'CHILL', amount: 1, effect: { kind: 'bleed', amount: 2, turns: 2 } },
      { verb: 'GAPE', amount: 1, effect: { kind: 'hunger', amount: 4 } },
    ]
    const horror = scriptedHorror('horror.fixture', 40, script, 0)
    let fight = openFight(horror, handShowing(4, 4, 4, 4, 4), 200, 0)
    for (let turn = 0; turn < 20 && fight.outcome === 'fighting'; turn++) {
      fight = endWithSomething(fight)
    }
    expect(fight.outcome).toBe('won')
  })
})
