/**
 * The encounter with a thing that closes the distance.
 *
 * One rule, stated three ways because all three have to hold at once:
 *
 *   1. every score it survives brings it one reach nearer;
 *   2. a dead thing does not take a step;
 *   3. there is nothing past `close`, so a thing at `close` that survives
 *      arrives, and arriving is the end of the run.
 *
 * The reason these are model tests rather than screen tests is the whole point
 * of the design: the reach is gameplay, it lives in `GameState`, and the
 * pictures in `render/` are handed a finished answer. `test/browser/approach.
 * spec.ts` checks that the pictures agree with it.
 */

import { describe, expect, it } from 'vitest'

import { MAX_HP, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { TITLE } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { REACHES, enemy, intentAt, nextReach, stanceAt } from '../../src/content/enemies.js'
import type { Reach } from '../../src/content/enemies.js'
import { resolve } from '../../src/combat/resolve.js'
import { load, save } from '../../src/game/save.js'
import { applyFixture } from '../../src/game/fixture.js'

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/** Standing in the room with it, having pressed nothing. */
const inTheHall = (seed = 1): GameState => {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const run = started.run!
  return { ...started, run: { ...run, roomId: 'hollow', path: [...run.path, 'hollow'] } }
}

const opened = (seed = 1): GameState => reduce(inTheHall(seed), { type: 'FIGHT' })

/**
 * A fight standing at `reach`, with the enemy on `enemyHp`, one press from a
 * score that spends every die.
 *
 * The reach and the turn move together because that is the only way the game
 * can produce either of them: it advances exactly once per surviving score.
 */
function poised(reach: Reach, enemyHp: number, seed = 1): GameState {
  const rolled = reduce(opened(seed), { type: 'ROLL' })
  const combat = rolled.run!.combat!
  return {
    ...rolled,
    run: {
      ...rolled.run!,
      combat: {
        ...combat,
        approach: reach,
        turn: REACHES.indexOf(reach),
        enemyHp,
        selected: [0, 1, 2, 3, 4, 5],
      },
    },
  }
}

/** Survivable: no hand of six dice takes this much off. */
const UNKILLABLE = 9999
/** One point left, so any hand at all finishes it. */
const DOOMED = 1

describe('where it is standing', () => {
  it('begins the fight at the far end of the hall', () => {
    const combat = opened().run!.combat!
    expect(combat.approach).toBe('far')
    expect(combat.reached).toBeUndefined()
    expect(combat.turn).toBe(0)
  })

  it('stands at the same reach before the fight opens as after', () => {
    // Walking in and pressing FIGHT must not make it jump.
    const e = enemy('gnawing')
    expect(stanceAt('gnawing', undefined)).toEqual(stanceAt('gnawing', 'far'))
    expect({ width: e.width, foot: e.foot }).toEqual(e.approach!.stances.far)
  })

  it('is only a thing about enemies that have one', () => {
    const started = reduce(TITLE, { type: 'START_RUN', seed: 1 })
    const run = started.run!
    const standing = reduce(
      { ...started, run: { ...run, roomId: 'deep', path: [...run.path, 'deep'] } },
      { type: 'FIGHT' },
    )
    expect(standing.run!.combat!.approach).toBeUndefined()
    expect(enemy('marrow').approach).toBeUndefined()
    expect(enemy('warden').approach).toBeUndefined()
  })
})

describe('it comes one reach nearer for every score it survives', () => {
  it('goes far to mid on the first', () => {
    const after = reduce(poised('far', UNKILLABLE), { type: 'SCORE' })
    expect(after.mode).toBe('combat')
    expect(after.run!.combat!.approach).toBe('mid')
    expect(after.run!.combat!.reached).toBeUndefined()
  })

  it('goes mid to close on the second', () => {
    const after = reduce(poised('mid', UNKILLABLE), { type: 'SCORE' })
    expect(after.mode).toBe('combat')
    expect(after.run!.combat!.approach).toBe('close')
    expect(after.run!.combat!.reached).toBeUndefined()
  })

  it('reaches you on the third, and that is the run', () => {
    const before = poised('close', UNKILLABLE)
    const after = reduce(before, { type: 'SCORE' })
    expect(after.mode).toBe('dead')
    expect(after.run!.hp).toBe(0)
    expect(after.run!.combat!.reached).toBe(true)
    // It did not move: there was nowhere left to move to except onto you.
    expect(after.run!.combat!.approach).toBe('close')
    expect(after.run!.cause).toBe(enemy('gnawing').approach!.cause)
    expect(after.run!.combat!.log.join(' ')).toContain(enemy('gnawing').approach!.says)
  })

  it('never skips a reach, and never takes two steps for one score', () => {
    let state = opened()
    const seen: (Reach | undefined)[] = [state.run!.combat!.approach]
    for (let turn = 0; turn < 2; turn++) {
      const rolled = reduce(state, { type: 'ROLL' })
      // Survivable, so the step is the only thing that happens.
      const survivable: GameState = {
        ...rolled,
        run: {
          ...rolled.run!,
          combat: { ...rolled.run!.combat!, enemyHp: UNKILLABLE, selected: [0] },
        },
      }
      state = reduce(survivable, { type: 'SCORE' })
      expect(state.run!.combat!.turn).toBe(turn + 1)
      seen.push(state.run!.combat!.approach)
    }
    expect(seen).toEqual(['far', 'mid', 'close'])
  })

  it('runs out of ladder exactly at close', () => {
    expect(nextReach('far')).toBe('mid')
    expect(nextReach('mid')).toBe('close')
    expect(nextReach('close')).toBeUndefined()
  })
})

describe('a dead thing does not take a step', () => {
  for (const reach of REACHES) {
    it(`kills it at ${reach} without letting it move`, () => {
      const before = poised(reach, DOOMED)
      const out = resolve(before.run!, before.run!.combat!)
      expect(out.won).toBe(true)
      expect(out.reached).toBe(false)
      expect(out.approach, 'it moved after it died').toBe(reach)

      const after = reduce(before, { type: 'SCORE' })
      expect(after.mode).not.toBe('dead')
      expect(after.run!.hp).toBe(MAX_HP)
      expect(after.run!.cleared).toContain('hollow')
    })
  }

  it('is survivable at close: killing it there is the whole point of close', () => {
    const after = reduce(poised('close', DOOMED), { type: 'SCORE' })
    expect(after.mode === 'reward' || after.mode === 'explore').toBe(true)
    expect(after.run!.hp).toBe(MAX_HP)
    expect(after.run!.combat).toBeUndefined()
  })
})

describe('the encounter says what it is going to do', () => {
  it('declares one intent per reach, in the order it closes them', () => {
    const e = enemy('gnawing')
    expect(e.script).toHaveLength(REACHES.length)
    // The reach and the turn are the same number, by construction: it advances
    // exactly once per turn it survives, so `script[turn]` is `script[reach]`.
    REACHES.forEach((reach, turn) => {
      expect(intentAt('gnawing', turn)).toBe(e.script[turn])
      expect(nextReach(reach) === undefined).toBe(turn === REACHES.length - 1)
    })
  })

  it('deals no damage from down the hall: arriving is the whole threat', () => {
    for (const intent of enemy('gnawing').script) expect(intent.damage).toBe(0)
    const survived = reduce(poised('far', UNKILLABLE), { type: 'SCORE' })
    expect(survived.run!.hp).toBe(MAX_HP)
  })

  it('tells you the last turn is the last turn, before you spend it', () => {
    const atClose = intentAt('gnawing', REACHES.indexOf('close'))
    expect(atClose.explain.toLowerCase()).toContain('kills me')
    expect(atClose.explain.toLowerCase()).toContain('last turn')
  })
})

describe('the reach is state, and only state', () => {
  it('is decided by the reducer before anything can be drawn', () => {
    // The same call, twice, with nothing rendered in between. If presentation
    // could reach the outcome, these two would be free to differ.
    const before = poised('mid', UNKILLABLE)
    const a = resolve(before.run!, before.run!.combat!)
    const b = resolve(before.run!, before.run!.combat!)
    expect(a).toEqual(b)
    expect(a.approach).toBe('close')
    expect(reduce(before, { type: 'SCORE' })).toEqual(reduce(before, { type: 'SCORE' }))
  })

  it('survives a save and a reload, at every reach', () => {
    for (const reach of REACHES) {
      const store = new Map<string, string>()
      const storage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      } as unknown as Storage

      const state = poised(reach, UNKILLABLE)
      save(state, storage)
      const back = load(storage)
      expect(back.discarded).toBeUndefined()
      expect(back.state.run!.combat!.approach, `${reach} did not survive a reload`).toBe(reach)
      expect(reduce(back.state, { type: 'CONTINUE' }).mode).toBe('combat')
    }
  })

  it('records having arrived, so a reload after it lands is still the end', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as unknown as Storage

    const dead = reduce(poised('close', UNKILLABLE), { type: 'SCORE' })
    save(dead, storage)
    const back = load(storage)
    expect(back.state.run!.combat!.reached).toBe(true)
    expect(back.state.run!.combat!.approach).toBe('close')
    // And the door does not offer to put you back into it.
    expect(back.state.resume).toBeUndefined()
  })

  it('can be stood at from a URL, in a state the game could have produced', () => {
    for (const reach of REACHES) {
      const state = applyFixture(TITLE, `?room=hollow&reach=${reach}`)
      const combat = state.run!.combat!
      expect(state.mode).toBe('combat')
      expect(combat.approach).toBe(reach)
      expect(combat.turn, 'the fixture and the ladder disagree').toBe(REACHES.indexOf(reach))
    }
  })
})

describe('the run it belongs to', () => {
  it('is a fight of exactly three attacks, however it goes', () => {
    let state = opened()
    let scores = 0
    while (state.mode === 'combat' && scores < 10) {
      state = play(state, { type: 'ROLL' }, { type: 'SELECT', slot: 0 }, { type: 'SELECT', slot: 1 })
      state = reduce(state, { type: 'SCORE' })
      scores++
    }
    expect(state.mode).not.toBe('combat')
    expect(scores).toBeLessThanOrEqual(REACHES.length)
  })
})
