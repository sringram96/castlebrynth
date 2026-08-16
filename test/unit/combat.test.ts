/**
 * The fight, through the reducer.
 *
 * Every assertion here goes through `reduce`. Nothing constructs a
 * `CombatState` by hand except where a fixture-style escape hatch is stated
 * outright, because the thing under test is the transition rather than the
 * shape: it is the reducer that decides what is legal, what a hand costs, and
 * who is left standing.
 *
 * The pure pattern arithmetic lives in `hands.test.ts`. This file is about
 * what pressing things does.
 */

import { describe, expect, it } from 'vitest'
import { newRun, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { CombatState, GameState, RunState } from '../../src/game/state.js'
import { MAX_ACTIVE_DICE, MAX_ROLLS } from '../../src/combat/roll.js'
import type { DieValue } from '../../src/combat/roll.js'
import { legalScores, scoreDice } from '../../src/combat/hands.js'
import type { ScoreId } from '../../src/combat/hands.js'
import { enemy } from '../../src/content/enemies.js'
import { nodeOf } from './where.js'


/** Standing in a room, named by its authored template. */
function at(templateId: string, run: Partial<RunState> = {}, seed = 4): GameState {
  const base = newRun(seed)
  const roomId = nodeOf(base, templateId)
  return {
    version: SAVE_VERSION,
    mode: 'explore',
    meta: EMPTY_META,
    run: { ...base, roomId, path: [...base.path, roomId], ...run },
  }
}

/** In a fight, before the first throw. */
const facing = (templateId = 'hollow', run: Partial<RunState> = {}, seed = 4): GameState =>
  reduce(at(templateId, run, seed), { type: 'FIGHT' })

const combatOf = (state: GameState): CombatState => state.run!.combat!

/**
 * Exact faces on the table.
 *
 * The one thing no sequence of honest presses can produce, and it is stated
 * here rather than smuggled: a test about *what a Full House costs* should not
 * have to search seeds for one.
 */
function withDice(state: GameState, ...faces: number[]): GameState {
  const combat = combatOf(state)
  return {
    ...state,
    run: {
      ...state.run!,
      combat: { ...combat, dice: faces as DieValue[], rollsUsed: 1 },
    },
  }
}

/** Whatever the dice on the table legally allow, first choice. */
function scoreAnything(state: GameState): GameState {
  const combat = combatOf(state)
  const hand = legalScores(combat.dice, combat.usedHands)[0]!
  return reduce(state, { type: 'SCORE', hand })
}

describe('FIGHT', () => {
  it('opens the fight from the room, with the enemy at full health', () => {
    const state = facing()
    const combat = combatOf(state)
    expect(state.mode).toBe('combat')
    expect(combat.enemyId).toBe('gnawing')
    expect(combat.enemyHp).toBe(enemy('gnawing').maxHp)
    expect(combat.enemyMaxHp).toBe(enemy('gnawing').maxHp)
  })

  it('starts the scorecard empty and the table clear', () => {
    const combat = combatOf(facing())
    expect(combat.usedHands).toEqual([])
    expect(combat.dice).toEqual([])
    expect(combat.rollsUsed).toBe(0)
    expect(combat.round).toBe(1)
    expect(combat.lastAttack).toBeUndefined()
  })

  it('gives the enemy nothing to roll', () => {
    // The reducer is the only thing that draws inside a fight, and it draws
    // once per throw of *the player's* bones. There is no enemy line, no enemy
    // army and no enemy die anywhere in the state it produces.
    const combat = combatOf(facing()) as unknown as Record<string, unknown>
    for (const gone of ['enemyLine', 'enemyBones', 'enemyStartCount', 'field', 'playerLine', 'phase']) {
      expect(combat, `${gone} survived`).not.toHaveProperty(gone)
    }
  })

  it('is refused with an empty pile', () => {
    const empty = at('hollow', { bones: 0 })
    expect(reduce(empty, { type: 'FIGHT' })).toBe(empty)
  })

  it('is refused twice', () => {
    const open = facing()
    expect(reduce(open, { type: 'FIGHT' })).toBe(open)
  })
})

describe('ROLL', () => {
  it('throws six bones for a healthy pile', () => {
    const combat = combatOf(reduce(facing(), { type: 'ROLL' }))
    expect(combat.dice).toHaveLength(MAX_ACTIVE_DICE)
    expect(combat.rollsUsed).toBe(1)
  })

  it('throws exactly as many bones as the pile has, below six', () => {
    for (const bones of [5, 4, 3, 2, 1]) {
      const combat = combatOf(reduce(facing('hollow', { bones }), { type: 'ROLL' }))
      expect(combat.dice, `${bones} bones`).toHaveLength(bones)
    }
  })

  it('still throws six at twelve bones and at six', () => {
    for (const bones of [30, 12, 6]) {
      expect(combatOf(reduce(facing('hollow', { bones }), { type: 'ROLL' })).dice).toHaveLength(6)
    }
  })

  it('only ever shows ordinary d6 faces', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const die of combatOf(reduce(facing('hollow', {}, seed), { type: 'ROLL' })).dice) {
        expect(die).toBeGreaterThanOrEqual(1)
        expect(die).toBeLessThanOrEqual(6)
        expect(Number.isInteger(die)).toBe(true)
      }
    }
  })

  it('cannot happen twice', () => {
    const rolled = reduce(facing(), { type: 'ROLL' })
    expect(reduce(rolled, { type: 'ROLL' })).toBe(rolled)
  })

  it('is refused outside a fight', () => {
    const room = at('hollow')
    expect(reduce(room, { type: 'ROLL' })).toBe(room)
  })
})

describe('REROLL', () => {
  it('cannot happen before the first throw', () => {
    const open = facing()
    expect(reduce(open, { type: 'REROLL', held: [] })).toBe(open)
  })

  it('keeps held bones exactly where they were, and throws the rest', () => {
    const rolled = reduce(facing(), { type: 'ROLL' })
    const before = combatOf(rolled).dice
    const after = combatOf(reduce(rolled, { type: 'REROLL', held: [0, 2] })).dice
    expect(after[0]).toBe(before[0])
    expect(after[2]).toBe(before[2])
    expect(after).toHaveLength(before.length)
  })

  it('actually throws the unheld ones', () => {
    // Not an assertion about a particular face: over many seeds a reroll of
    // four bones has to change something, or nothing is being thrown.
    let changed = 0
    for (let seed = 1; seed <= 40; seed++) {
      const rolled = reduce(facing('hollow', {}, seed), { type: 'ROLL' })
      const before = combatOf(rolled).dice
      const after = combatOf(reduce(rolled, { type: 'REROLL', held: [0, 1] })).dice
      if (after.slice(2).some((die, i) => die !== before[i + 2])) changed++
    }
    expect(changed).toBeGreaterThan(30)
  })

  it('counts a throw', () => {
    const rolled = reduce(facing(), { type: 'ROLL' })
    expect(combatOf(reduce(rolled, { type: 'REROLL', held: [] })).rollsUsed).toBe(2)
  })

  it('gives an attack three throws and no fourth', () => {
    let state = reduce(facing(), { type: 'ROLL' })
    state = reduce(state, { type: 'REROLL', held: [] })
    state = reduce(state, { type: 'REROLL', held: [] })
    expect(combatOf(state).rollsUsed).toBe(MAX_ROLLS)
    expect(reduce(state, { type: 'REROLL', held: [] })).toBe(state)
  })

  it('refuses a throw in which nothing would move', () => {
    const rolled = reduce(facing(), { type: 'ROLL' })
    const all = [0, 1, 2, 3, 4, 5]
    expect(reduce(rolled, { type: 'REROLL', held: all })).toBe(rolled)
    expect(combatOf(rolled).rollsUsed).toBe(1)
  })

  it('cannot be corrupted by duplicate or impossible positions', () => {
    const rolled = reduce(facing(), { type: 'ROLL' })
    const clean = combatOf(reduce(rolled, { type: 'REROLL', held: [0, 2] })).dice
    const messy = combatOf(
      reduce(rolled, { type: 'REROLL', held: [2, 0, 0, 2, -1, 99, 6, 1.5] }),
    ).dice
    expect(messy).toEqual(clean)
  })

  it('holds nothing when the list is empty, and throws everything', () => {
    const rolled = reduce(facing(), { type: 'ROLL' })
    expect(combatOf(reduce(rolled, { type: 'REROLL', held: [] })).dice).toHaveLength(6)
  })
})

describe('SCORE', () => {
  it('takes the damage off the enemy and spends the hand', () => {
    const table = withDice(facing(), 6, 6, 6, 4, 4, 3)
    const after = reduce(table, { type: 'SCORE', hand: 'full-house' })
    const combat = combatOf(after)
    expect(combat.enemyHp).toBe(enemy('gnawing').maxHp - 58)
    expect(combat.usedHands).toEqual(['full-house'])
  })

  it('spends only the hand that was chosen', () => {
    const table = withDice(facing(), 5, 5, 5, 2, 2, 4)
    const combat = combatOf(reduce(table, { type: 'SCORE', hand: 'two-pair' }))
    expect(combat.usedHands).toEqual(['two-pair'])
    // Full House and Triple both matched and both survive.
    expect(legalScores([5, 5, 5, 2, 2, 4], combat.usedHands)).toContain('full-house')
    expect(legalScores([5, 5, 5, 2, 2, 4], combat.usedHands)).toContain('triple')
  })

  it('refuses a hand the dice do not make, and changes nothing', () => {
    const table = withDice(facing(), 1, 2, 3, 4, 6, 6)
    expect(reduce(table, { type: 'SCORE', hand: 'six-kind' })).toBe(table)
  })

  it('refuses a hand that has already been spent', () => {
    const first = reduce(withDice(facing(), 2, 2, 3, 4, 5, 6), { type: 'SCORE', hand: 'pair' })
    const again = withDice(first, 3, 3, 1, 2, 4, 6)
    expect(reduce(again, { type: 'SCORE', hand: 'pair' })).toBe(again)
  })

  it('never trusts the caller about what is legal', () => {
    const table = withDice(facing(), 1, 2, 3, 4, 6)
    // The only legal answer here is CRAP. Anything else is refused outright.
    for (const hand of ['pair', 'triple', 'straight', 'full-house'] as ScoreId[]) {
      expect(reduce(table, { type: 'SCORE', hand })).toBe(table)
    }
    expect(reduce(table, { type: 'SCORE', hand: 'crap' })).not.toBe(table)
  })

  it('never writes CRAP onto the scorecard', () => {
    let state = withDice(facing(), 1, 2, 3, 4, 6)
    state = reduce(state, { type: 'SCORE', hand: 'crap' })
    expect(combatOf(state).usedHands).toEqual([])
    // And it can be spent again, and again.
    state = reduce(withDice(state, 1, 2, 3, 4, 6), { type: 'SCORE', hand: 'crap' })
    expect(combatOf(state).usedHands).toEqual([])
    expect(combatOf(state).round).toBe(3)
  })

  it('leaves the scorecard alone when a bad roll is not scored at all', () => {
    const rolled = reduce(facing(), { type: 'ROLL' })
    const rerolled = reduce(rolled, { type: 'REROLL', held: [] })
    expect(combatOf(rerolled).usedHands).toEqual([])
  })

  it('can be pressed after one throw, without spending the rerolls', () => {
    const rolled = reduce(facing(), { type: 'ROLL' })
    const after = scoreAnything(rolled)
    expect(combatOf(after).round).toBe(2)
    expect(combatOf(after).rollsUsed).toBe(0)
  })

  it('is refused at an empty table', () => {
    const open = facing()
    expect(reduce(open, { type: 'SCORE', hand: 'crap' })).toBe(open)
  })

  it('records the whole exchange before anything is animated', () => {
    const table = withDice(facing('hollow', { bones: 30 }), 6, 6, 6, 4, 4, 3)
    const record = combatOf(reduce(table, { type: 'SCORE', hand: 'full-house' })).lastAttack!
    expect(record).toEqual({
      dice: [6, 6, 6, 4, 4, 3],
      hand: 'full-house',
      sum: 29,
      multiplier: 2,
      damage: 58,
      enemyHpBefore: 70,
      enemyHpAfter: 12,
      retaliation: 3,
      bonesBefore: 30,
      bonesAfter: 27,
    })
  })
})

describe('what it costs to leave a thing standing', () => {
  it('breaks exactly the enemy’s own number of bones', () => {
    for (const [template, enemyId] of [
      ['hollow', 'gnawing'],
      ['deep', 'marrow'],
      ['gate', 'warden'],
    ] as const) {
      const table = withDice(facing(template, { bones: 30 }), 1, 1, 2, 3, 4, 6)
      const after = reduce(table, { type: 'SCORE', hand: 'pair' })
      expect(after.run!.bones, enemyId).toBe(30 - enemy(enemyId).damage)
    }
  })

  it('is the same number every time, with no draw behind it', () => {
    let state = facing('deep', { bones: 30 })
    const seen: number[] = []
    for (let attack = 0; attack < 3; attack++) {
      state = reduce(state, { type: 'ROLL' })
      const before = state.run!.bones
      state = scoreAnything(state)
      seen.push(before - state.run!.bones)
    }
    expect(seen).toEqual([5, 5, 5])
  })

  it('starts the next attack automatically, with a clear table', () => {
    const after = scoreAnything(reduce(facing(), { type: 'ROLL' }))
    const combat = combatOf(after)
    expect(combat.round).toBe(2)
    expect(combat.dice).toEqual([])
    expect(combat.rollsUsed).toBe(0)
    expect(after.mode).toBe('combat')
  })

  it('counts one round per surviving exchange', () => {
    let state = facing('gate', { bones: 30 })
    for (let attack = 1; attack <= 3; attack++) {
      expect(combatOf(state).round).toBe(attack)
      state = scoreAnything(reduce(state, { type: 'ROLL' }))
    }
    expect(combatOf(state).round).toBe(4)
  })
})

describe('a killing attack', () => {
  /** A fight standing one good hand from over. */
  const nearlyDone = (hp: number, bones = 30): GameState => {
    const open = facing('hollow', { bones })
    return { ...open, run: { ...open.run!, combat: { ...combatOf(open), enemyHp: hp } } }
  }

  it('takes no answer, however thin the pile', () => {
    const table = withDice(nearlyDone(20, 3), 6, 6, 6, 4, 4, 3)
    const after = reduce(table, { type: 'SCORE', hand: 'full-house' })
    expect(after.run!.bones).toBe(3)
    expect(after.mode).not.toBe('dead')
    expect(combatOf(after).lastAttack!.retaliation).toBe(0)
  })

  it('leaves the enemy on zero and never below it', () => {
    const table = withDice(nearlyDone(20), 6, 6, 6, 4, 4, 3)
    expect(combatOf(reduce(table, { type: 'SCORE', hand: 'full-house' })).enemyHp).toBe(0)
  })

  it('holds the fight open on an authored death rather than settling it', () => {
    const table = withDice(nearlyDone(20), 6, 6, 6, 4, 4, 3)
    const after = reduce(table, { type: 'SCORE', hand: 'full-house' })
    expect(combatOf(after).defeated).toBe(true)
    expect(after.mode).toBe('combat')
    expect(after.run!.cleared).not.toContain(after.run!.roomId)
  })

  it('finishes on DEFEAT_DONE, once', () => {
    const table = withDice(nearlyDone(20), 6, 6, 6, 4, 4, 3)
    const dying = reduce(table, { type: 'SCORE', hand: 'full-house' })
    const won = reduce(dying, { type: 'DEFEAT_DONE' })
    expect(won.mode === 'reward' || won.mode === 'explore').toBe(true)
    expect(won.run!.combat).toBeUndefined()
    expect(reduce(won, { type: 'DEFEAT_DONE' })).toBe(won)
  })
})

describe('a lethal answer', () => {
  it('ends the run and never takes the pile below zero', () => {
    const table = withDice(facing('gate', { bones: 5 }), 1, 1, 2, 3, 4, 6)
    const after = reduce(table, { type: 'SCORE', hand: 'pair' })
    expect(after.mode).toBe('dead')
    expect(after.run!.bones).toBe(0)
    expect(after.run!.cause).toContain('The Warden')
  })

  it('keeps the fight on the plate, so the death has a cause to show', () => {
    const table = withDice(facing('gate', { bones: 5 }), 1, 1, 2, 3, 4, 6)
    const after = reduce(table, { type: 'SCORE', hand: 'pair' })
    expect(after.run!.combat).toBeDefined()
    expect(combatOf(after).lastAttack!.bonesAfter).toBe(0)
  })

  it('does not happen when the same attack finishes the thing first', () => {
    const open = facing('gate', { bones: 5 })
    const dying = { ...open, run: { ...open.run!, combat: { ...combatOf(open), enemyHp: 20 } } }
    const after = reduce(withDice(dying, 6, 6, 6, 4, 4, 3), { type: 'SCORE', hand: 'full-house' })
    expect(after.mode).not.toBe('dead')
    expect(after.run!.bones).toBe(5)
  })

  it('cannot be pressed on from: an empty pile has nothing to throw', () => {
    const table = withDice(facing('gate', { bones: 5 }), 1, 1, 2, 3, 4, 6)
    const dead = reduce(table, { type: 'SCORE', hand: 'pair' })
    expect(reduce(dead, { type: 'ROLL' })).toBe(dead)
  })
})

describe('a wounded attack', () => {
  it('narrows with the pile, and loses the shapes that need the width', () => {
    const four = reduce(facing('hollow', { bones: 4 }), { type: 'ROLL' })
    const combat = combatOf(four)
    expect(combat.dice).toHaveLength(4)
    expect(legalScores(combat.dice, [])).not.toContain('full-house')
    expect(legalScores(combat.dice, [])).not.toContain('straight')
    expect(legalScores(combat.dice, [])).not.toContain('six-kind')
  })

  it('still does at least one damage with a single bone', () => {
    const one = withDice(facing('hollow', { bones: 1 }), 1)
    const after = reduce(one, { type: 'SCORE', hand: 'crap' })
    expect(scoreDice([1], 'crap').damage).toBe(1)
    expect(combatOf(after).enemyHp).toBe(enemy('gnawing').maxHp - 1)
  })
})

describe('determinism', () => {
  it('gives the same seed the same first throw', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const a = combatOf(reduce(facing('hollow', {}, seed), { type: 'ROLL' })).dice
      const b = combatOf(reduce(facing('hollow', {}, seed), { type: 'ROLL' })).dice
      expect(a).toEqual(b)
    }
  })

  it('gives a reload before the throw the same throw', () => {
    // The save holds a fight with an empty table. Re-reducing ROLL off that
    // saved state is exactly what a reload does.
    const open = facing('hollow', {}, 9)
    const saved: GameState = JSON.parse(JSON.stringify(open))
    expect(combatOf(reduce(saved, { type: 'ROLL' })).dice).toEqual(
      combatOf(reduce(open, { type: 'ROLL' })).dice,
    )
  })

  it('gives a reload before a reroll the same reroll, for the same holds', () => {
    const rolled = reduce(facing('hollow', {}, 9), { type: 'ROLL' })
    const saved: GameState = JSON.parse(JSON.stringify(rolled))
    expect(combatOf(reduce(saved, { type: 'REROLL', held: [1, 3] })).dice).toEqual(
      combatOf(reduce(rolled, { type: 'REROLL', held: [1, 3] })).dice,
    )
  })

  it('gives each of the three throws its own position in the stream', () => {
    // A reroll that reproduced the throw it was rerolling would be the salt
    // colliding. Held nothing, three times: the tables have to differ.
    const one = reduce(facing('hollow', {}, 17), { type: 'ROLL' })
    const two = reduce(one, { type: 'REROLL', held: [] })
    const three = reduce(two, { type: 'REROLL', held: [] })
    expect(combatOf(two).dice).not.toEqual(combatOf(one).dice)
    expect(combatOf(three).dice).not.toEqual(combatOf(two).dice)
  })

  it('draws nothing at all on SCORE', () => {
    const table = withDice(facing(), 6, 6, 6, 4, 4, 3)
    const a = reduce(table, { type: 'SCORE', hand: 'full-house' })
    const b = reduce(table, { type: 'SCORE', hand: 'full-house' })
    expect(a.run!.combat).toEqual(b.run!.combat)
    expect(a.run!.bones).toBe(b.run!.bones)
  })
})

describe('the verbs the old fight had', () => {
  it('answers none of them', () => {
    const open = reduce(facing(), { type: 'ROLL' })
    for (const gone of ['THROW', 'ROUND', 'FIELD', 'SMASH', 'CHARM']) {
      expect(reduce(open, { type: gone } as unknown as Action), gone).toBe(open)
    }
  })

  it('and answers the three that replaced them', () => {
    const open = facing()
    const rolled = reduce(open, { type: 'ROLL' })
    expect(rolled).not.toBe(open)
    const again = reduce(rolled, { type: 'REROLL', held: [0] })
    expect(again).not.toBe(rolled)
    expect(scoreAnything(again)).not.toBe(again)
  })
})
