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
import { REACHES, enemy, intentAt, reachAfter, stanceAt, turnAt } from '../../src/content/enemies.js'
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

/** How many scores it survives at a reach before it takes the next step. */
const EVERY = enemy('gnawing').approach!.every

/**
 * A fight standing at `reach`, on its *first* turn there, with the enemy on
 * `enemyHp` and one press from a score that spends every die.
 *
 * The reach and the turn move together because that is the only way the game
 * can produce either of them: the reach is a function of the turn count and
 * the content, so a fixture that set one without the other would be a
 * position no play could reach.
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
        turn: turnAt('gnawing', reach),
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

/** Score once, survivably, from wherever the fight currently stands. */
function survive(state: GameState): GameState {
  const rolled = reduce(state, { type: 'ROLL' })
  return reduce(
    {
      ...rolled,
      run: {
        ...rolled.run!,
        combat: { ...rolled.run!.combat!, enemyHp: UNKILLABLE, selected: [0] },
      },
    },
    { type: 'SCORE' },
  )
}

describe('it comes one reach nearer for every stretch of hall it covers', () => {
  it('holds where it is until it has covered the stretch', () => {
    // The whole point of a cadence over one: most turns end with it still
    // where it was, and the turn that does not is the one that lands.
    let state = poised('far', UNKILLABLE)
    for (let n = 1; n < EVERY; n++) {
      state = reduce(state, { type: 'SCORE' })
      expect(state.mode).toBe('combat')
      expect(state.run!.combat!.approach, `it jumped after ${n} of ${EVERY}`).toBe('far')
    }
    state = survive(state)
    expect(state.run!.combat!.approach).toBe('mid')
  })

  it('goes far to mid, then mid to close, and never the other way', () => {
    let state = opened()
    const seen: (Reach | undefined)[] = [state.run!.combat!.approach]
    for (let turn = 0; turn < EVERY * (REACHES.length - 1); turn++) {
      state = survive(state)
      expect(state.run!.combat!.turn).toBe(turn + 1)
      const at = state.run!.combat!.approach!
      // Forward or nowhere, one rung at a time, never twice for one score.
      const was = seen.at(-1)!
      expect(REACHES.indexOf(at) - REACHES.indexOf(was)).toBeLessThanOrEqual(1)
      expect(REACHES.indexOf(at)).toBeGreaterThanOrEqual(REACHES.indexOf(was))
      seen.push(at)
    }
    expect(seen.at(0)).toBe('far')
    expect(seen.at(-1)).toBe('close')
    expect(new Set(seen)).toEqual(new Set(REACHES))
  })

  it('reaches you off the last turn at close, and that is the run', () => {
    let state = poised('close', UNKILLABLE)
    for (let n = 1; n < EVERY; n++) {
      state = reduce(state, { type: 'SCORE' })
      expect(state.mode, 'it arrived before it had finished gathering').toBe('combat')
    }
    const after = survive(state)
    expect(after.mode).toBe('dead')
    expect(after.run!.hp).toBe(0)
    expect(after.run!.combat!.reached).toBe(true)
    // It did not move: there was nowhere left to move to except onto you.
    expect(after.run!.combat!.approach).toBe('close')
    expect(after.run!.cause).toBe(enemy('gnawing').approach!.cause)
    expect(after.run!.combat!.log.join(' ')).toContain(enemy('gnawing').approach!.says)
  })

  it('runs out of ladder exactly when the last stretch is covered', () => {
    const last = EVERY * REACHES.length
    for (let turns = 0; turns < last; turns++) {
      expect(reachAfter('gnawing', turns), `turn ${turns}`).toBe(REACHES[Math.floor(turns / EVERY)])
    }
    expect(reachAfter('gnawing', last)).toBeUndefined()
    // And an enemy that does not close never has anywhere to be.
    expect(reachAfter('marrow', 0)).toBeUndefined()
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

      // The killing blow parks the fight on the picture of it dying, and it
      // dies where it stood: the reach is still the one it was killed at, so
      // the collapse plays at the end of the hall or on top of you as the
      // fight earned. `DEFEAT_DONE` is the press that ends the fight.
      const dying = reduce(before, { type: 'SCORE' })
      expect(dying.mode).toBe('combat')
      expect(dying.run!.combat!.defeated).toBe(true)
      expect(dying.run!.combat!.approach).toBe(reach)

      const after = reduce(dying, { type: 'DEFEAT_DONE' })
      expect(after.mode).not.toBe('dead')
      expect(after.run!.hp).toBe(MAX_HP)
      expect(after.run!.cleared).toContain('hollow')
    })
  }

  it('is survivable at close: killing it there is the whole point of close', () => {
    const after = play(poised('close', DOOMED), { type: 'SCORE' }, { type: 'DEFEAT_DONE' })
    expect(after.mode === 'reward' || after.mode === 'explore').toBe(true)
    expect(after.run!.hp).toBe(MAX_HP)
    expect(after.run!.combat).toBeUndefined()
  })
})

describe('the encounter says what it is going to do', () => {
  it('declares one intent for every turn of the walk, and no spares', () => {
    const e = enemy('gnawing')
    // One per turn, not one per reach: the two turns spent at a reach are not
    // the same turn, and the script has to be able to say so.
    expect(e.script).toHaveLength(EVERY * REACHES.length)
    e.script.forEach((intent, turn) => {
      expect(intentAt('gnawing', turn)).toBe(intent)
      // Every turn is a real position, and the turn after the last one is not.
      expect(reachAfter('gnawing', turn)).toBe(REACHES[Math.floor(turn / EVERY)])
    })
    expect(reachAfter('gnawing', e.script.length)).toBeUndefined()
  })

  it('deals no damage from down the hall: arriving is the whole threat', () => {
    for (const intent of enemy('gnawing').script) expect(intent.damage).toBe(0)
    const survived = reduce(poised('far', UNKILLABLE), { type: 'SCORE' })
    expect(survived.run!.hp).toBe(MAX_HP)
  })

  it('tells you the last turn is the last turn, before you spend it', () => {
    const last = intentAt('gnawing', turnAt('gnawing', 'close') + EVERY - 1)
    expect(last.explain.toLowerCase()).toContain('kills me')
    expect(last.explain.toLowerCase()).toContain('last turn')

    // And the turn before it says what is coming, so the warning is not the
    // same turn as the thing it warns about.
    const warning = intentAt('gnawing', turnAt('gnawing', 'close') + EVERY - 2)
    expect(warning.explain.toLowerCase()).toContain('reaches me')
    expect(warning.explain.toLowerCase()).not.toContain('last turn')
  })
})

describe('the reach is state, and only state', () => {
  it('is decided by the reducer before anything can be drawn', () => {
    // The same call, twice, with nothing rendered in between. If presentation
    // could reach the outcome, these two would be free to differ.
    const before = survive(poised('mid', UNKILLABLE))
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

    let dead = poised('close', UNKILLABLE)
    for (let n = 0; n < EVERY; n++) dead = survive(dead)
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
      expect(combat.turn, 'the fixture and the ladder disagree').toBe(turnAt('gnawing', reach))
      expect(reachAfter('gnawing', combat.turn)).toBe(reach)
    }
  })
})

describe('the run it belongs to', () => {
  it('is a fight of a fixed number of attacks, however it goes', () => {
    let state = opened()
    let scores = 0
    while (state.mode === 'combat' && scores < 20) {
      state = play(state, { type: 'ROLL' }, { type: 'SELECT', slot: 0 }, { type: 'SELECT', slot: 1 })
      state = reduce(state, { type: 'SCORE' })
      scores++
    }
    expect(state.mode).not.toBe('combat')
    expect(scores).toBeLessThanOrEqual(EVERY * REACHES.length)
  })
})
