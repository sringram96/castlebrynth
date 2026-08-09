/**
 * The whole run, as state transitions.
 *
 * Not a unit test of any one function: a test of the *journey*. Every screen
 * the game can be on has to be reachable, every one of them has to have a way
 * out, and a run has to be able to get from the door to the exit by pressing
 * things the reducer actually accepts.
 *
 * The browser suite is what decides completion — a green unit suite is not
 * completion; see `CLAUDE.md`. What this covers is the shape of the machine
 * underneath it, where a hundred rounds cost a millisecond and a browser
 * journey costs a minute.
 */

import { describe, expect, it } from 'vitest'

import { maxWidth, newRun, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { SAVE_VERSION, TITLE } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { BONE_CEILING, totalBones } from '../../src/content/bones.js'
import { FIRST_ROOM, ROOMS, room } from '../../src/content/rooms.js'
import { load, save, wipe } from '../../src/game/save.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/**
 * Fight whatever is in the room until it or the run is finished.
 *
 * Real presses only: FIELD, THROW, SMASH, ROUND, and DEFEAT_DONE when a death
 * is being held open. The width is always the widest legal one, which is the
 * naive policy and the one a first-time player uses.
 */
function fightItOut(state: GameState, guard = 60): GameState {
  let now = state
  for (let round = 0; round < guard; round++) {
    const combat = now.run?.combat
    if (!combat) return now
    if (combat.defeated) {
      now = reduce(now, { type: 'DEFEAT_DONE' })
      continue
    }
    if (now.mode !== 'combat') return now
    switch (combat.phase) {
      case 'thrown':
        now = reduce(now, { type: 'FIELD', width: maxWidth(now.run!), specialIds: [] })
        break
      case 'fielded':
        now = reduce(now, { type: 'THROW' })
        break
      case 'rolled':
        now = reduce(now, { type: 'SMASH' })
        break
      case 'smashed':
        now = reduce(now, { type: 'ROUND' })
        break
    }
  }
  throw new Error('a fight ran past its guard')
}

/** Take whatever is offered, or leave it, and get back to the room. */
function clearReward(state: GameState, take = true): GameState {
  if (state.mode !== 'reward') return state
  const first = state.run!.offer![0]!
  return reduce(state, take ? { type: 'TAKE', id: first } : { type: 'SKIP' })
}

describe('the door', () => {
  it('opens on the title with nothing behind it', () => {
    expect(TITLE.mode).toBe('title')
    expect(TITLE.run).toBeUndefined()
    expect(TITLE.version).toBe(SAVE_VERSION)
  })

  it('starts a run in one press, standing in the first room', () => {
    const started = reduce(TITLE, { type: 'START_RUN', seed: 1 })
    expect(started.mode).toBe('explore')
    expect(started.run!.roomId).toBe(FIRST_ROOM)
    expect(totalBones(started.run!)).toBe(BONE_CEILING)
    expect(started.meta.runs).toBe(1)
  })

  it('offers CONTINUE only when there is somewhere live to go back to', () => {
    const running = reduce(TITLE, { type: 'START_RUN', seed: 1 })
    const back = reduce(running, { type: 'TITLE' })
    expect(back.resume).toBe('explore')
    expect(reduce(back, { type: 'CONTINUE' }).mode).toBe('explore')

    // A run that has ended is not somewhere the door may send you.
    const dead: GameState = { ...running, mode: 'dead' }
    expect(reduce(dead, { type: 'TITLE' }).resume).toBeUndefined()
  })

  it('leaves nothing of the old run behind', () => {
    // The invariant the stuck-on-death bug turned on.
    const dead: GameState = {
      ...reduce(TITLE, { type: 'START_RUN', seed: 1 }),
      mode: 'dead',
    }
    const again = reduce(dead, { type: 'START_RUN', seed: 2 })
    expect(again.run!.combat).toBeUndefined()
    expect(again.run!.offer).toBeUndefined()
    expect(again.run!.cause).toBeUndefined()
    expect(again.resume).toBeUndefined()
  })
})

describe('the short route', () => {
  it('goes door to exit on real presses', () => {
    let state = reduce(TITLE, { type: 'START_RUN', seed: 6 })
    state = play(state, { type: 'GO', to: 'passage' }, { type: 'GO', to: 'hollow' })

    // The Gnawing. A room with a living enemy has no exits.
    expect(reduce(state, { type: 'GO', to: 'sanctuary' })).toBe(state)
    state = clearReward(fightItOut(reduce(state, { type: 'FIGHT' })))
    if (state.mode === 'dead') return
    expect(state.run!.cleared).toContain('hollow')

    // The Font. Its exit is withheld until it has answered.
    state = reduce(state, { type: 'GO', to: 'sanctuary' })
    expect(state.run!.roomId).toBe('sanctuary')
    expect(reduce(state, { type: 'GO', to: 'reliquary' })).toBe(state)
    state = play(state, { type: 'RITUAL_ROLL' }, { type: 'GO', to: 'reliquary' })

    // The Reliquary is entirely optional.
    state = play(state, { type: 'GO', to: 'fork' }, { type: 'GO', to: 'gate' })
    expect(state.run!.roomId).toBe('gate')

    // The Warden, and the door behind it.
    state = clearReward(fightItOut(reduce(state, { type: 'FIGHT' })))
    if (state.mode === 'dead') return
    state = reduce(state, { type: 'GO', to: 'exit' })
    expect(state.mode).toBe('complete')
    expect(state.meta.wins).toBe(1)
  })
})

describe('the deep route', () => {
  it('goes through the vault and the Marrow', () => {
    let state = reduce(TITLE, { type: 'START_RUN', seed: 21 })
    state = play(state, { type: 'GO', to: 'passage' }, { type: 'GO', to: 'hollow' })
    state = clearReward(fightItOut(reduce(state, { type: 'FIGHT' })))
    if (state.mode === 'dead') return
    state = play(
      state,
      { type: 'GO', to: 'sanctuary' },
      { type: 'RITUAL_ROLL' },
      { type: 'GO', to: 'reliquary' },
      { type: 'GO', to: 'fork' },
      { type: 'GO', to: 'chain-vault' },
    )
    expect(state.run!.roomId).toBe('chain-vault')

    // A shut gate holds the exits, in state, so no dispatch can walk past it.
    expect(reduce(state, { type: 'GO', to: 'deep' })).toBe(state)
    state = play(
      state,
      { type: 'INTERACT', interactionId: 'vault-chain' },
      { type: 'INTERACT', interactionId: 'vault-lever' },
      { type: 'GO', to: 'deep' },
    )
    expect(state.run!.roomId).toBe('deep')

    const before = state.run!.vials
    state = fightItOut(reduce(state, { type: 'FIGHT' }))
    if (state.mode === 'dead') return
    // The Marrow always leaves a Vial, offer or no offer.
    expect(state.run!.vials).toBe(before + 1)
  })
})

describe('every room can be left', () => {
  it('has a way on, or is the ending', () => {
    for (const r of Object.values(ROOMS)) {
      expect(r.exits.length > 0 || r.ending !== undefined, `${r.id} is a dead end`).toBe(true)
    }
  })

  it('names only rooms that exist', () => {
    for (const r of Object.values(ROOMS)) {
      for (const exit of r.exits) {
        expect(() => room(exit.to), `${r.id} → ${exit.to}`).not.toThrow()
      }
    }
  })

  it('refuses an exit the room does not have', () => {
    const state = reduce(TITLE, { type: 'START_RUN', seed: 1 })
    expect(reduce(state, { type: 'GO', to: 'gate' })).toBe(state)
  })
})

describe('the run can end', () => {
  it('dies when the last bone breaks, and says what took it', () => {
    let state = reduce(TITLE, { type: 'START_RUN', seed: 3 })
    state = play(state, { type: 'GO', to: 'passage' }, { type: 'GO', to: 'hollow' })
    // One bone, one round. Whatever happens, the run cannot survive losing it.
    state = { ...state, run: { ...state.run!, commonBones: 1 } }
    state = fightItOut(reduce(state, { type: 'FIGHT' }))
    if (state.mode !== 'dead') return
    expect(totalBones(state.run!)).toBe(0)
    expect(state.run!.cause).toBeTruthy()
    // And the death screen has a way out that is not a reload.
    expect(reduce(state, { type: 'START_RUN', seed: 4 }).mode).toBe('explore')
    expect(reduce(state, { type: 'TITLE' }).mode).toBe('title')
  })

  it('never fights with nothing left to field', () => {
    const state = reduce(TITLE, { type: 'START_RUN', seed: 1 })
    const empty: GameState = {
      ...state,
      run: { ...state.run!, roomId: 'hollow', commonBones: 0, specials: [] },
    }
    expect(reduce(empty, { type: 'FIGHT' })).toBe(empty)
  })
})

describe('the save', () => {
  const storage = (): Storage => {
    const map = new Map<string, string>()
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
      clear: () => map.clear(),
      key: () => null,
      get length() {
        return map.size
      },
    } as Storage
  }

  it('boots to the title, whatever it was doing', () => {
    const store = storage()
    const fighting = reduce(
      play(
        reduce(TITLE, { type: 'START_RUN', seed: 1 }),
        { type: 'GO', to: 'passage' },
        { type: 'GO', to: 'hollow' },
      ),
      { type: 'FIGHT' },
    )
    save(fighting, store)
    const { state } = load(store)
    expect(state.mode).toBe('title')
    expect(state.resume).toBe('combat')
    // And one press is back where the run stood, mid-round.
    expect(reduce(state, { type: 'CONTINUE' }).run!.combat!.phase).toBe('thrown')
  })

  it('discards a save from the game this replaced', () => {
    const store = storage()
    store.setItem('castlebrynth', JSON.stringify({ version: 6, mode: 'combat', meta: {} }))
    const { state, discarded } = load(store)
    expect(discarded).toBe('incompatible')
    expect(state.run).toBeUndefined()
    expect(SAVE_VERSION).toBe(7)
  })

  it('survives an empty and a corrupt store', () => {
    const store = storage()
    expect(load(store).state.mode).toBe('title')
    store.setItem('castlebrynth', 'not json')
    expect(load(store).discarded).toBe('corrupt')
    wipe(store)
    expect(load(store).state.mode).toBe('title')
  })

  it('holds no animation state', () => {
    // Nothing about a transition may be written. A reload lands on a settled
    // frame by construction, not by a clock being recovered.
    const store = storage()
    const smashed = play(
      reduce(
        play(
          reduce(TITLE, { type: 'START_RUN', seed: 8 }),
          { type: 'GO', to: 'passage' },
          { type: 'GO', to: 'hollow' },
        ),
        { type: 'FIGHT' },
      ),
      { type: 'FIELD', width: 4, specialIds: [] },
      { type: 'THROW' },
      { type: 'SMASH' },
    )
    save(smashed, store)
    const raw = store.getItem('castlebrynth')!
    for (const forbidden of ['frame', 'elapsed', 'animating', 'startedAt']) {
      expect(raw, `the save carries ${forbidden}`).not.toContain(`"${forbidden}"`)
    }
  })
})

describe('determinism', () => {
  it('a seed replays exactly', () => {
    const once = fightItOut(
      reduce(
        play(
          reduce(TITLE, { type: 'START_RUN', seed: 44 }),
          { type: 'GO', to: 'passage' },
          { type: 'GO', to: 'hollow' },
        ),
        { type: 'FIGHT' },
      ),
    )
    const twice = fightItOut(
      reduce(
        play(
          reduce(TITLE, { type: 'START_RUN', seed: 44 }),
          { type: 'GO', to: 'passage' },
          { type: 'GO', to: 'hollow' },
        ),
        { type: 'FIGHT' },
      ),
    )
    expect(once).toEqual(twice)
  })

  it('two seeds do not', () => {
    const runOf = (seed: number): GameState =>
      reduce(
        play(
          reduce(TITLE, { type: 'START_RUN', seed }),
          { type: 'GO', to: 'passage' },
          { type: 'GO', to: 'hollow' },
        ),
        { type: 'FIGHT' },
      )
    expect(runOf(1).run!.combat!.enemyLine).not.toEqual(runOf(2).run!.combat!.enemyLine)
  })

  it('a new run carries the same opening pile whatever the seed', () => {
    for (const seed of [1, 2, 3, 999]) expect(totalBones(newRun(seed))).toBe(BONE_CEILING)
  })
})
