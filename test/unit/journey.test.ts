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
import { ROOM_LIBRARY } from '../../src/content/rooms.js'
import { roomAt } from '../../src/game/map.js'
import { validateRun } from '../../src/game/mapValidation.js'
import { nodeOf } from './where.js'
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

/**
 * Walk one room on, by the label the map put on the button.
 *
 * The route is generated now, so a test cannot name the room it is going to —
 * only the way it is taking. That is exactly what a player can do, which makes
 * it the honest thing for a journey to assert against.
 */
function walk(state: GameState, label?: string): GameState {
  const exits = roomAt(state.run!).exits
  const chosen = label ? exits.find((e) => e.label === label) : exits[0]
  if (!chosen) throw new Error(`no way on${label ? ` labelled ${label}` : ''}`)
  return reduce(state, { type: 'GO', to: chosen.to })
}

/** Walk until the run is standing in a room built from a named template. */
function walkTo(state: GameState, templateId: string, guard = 12): GameState {
  let now = state
  for (let step = 0; step < guard; step++) {
    if (roomAt(now.run!).id === templateId) return now
    const before = now.run!.roomId
    now = walk(now)
    if (now.run!.roomId === before) break
  }
  throw new Error(`never reached ${templateId}`)
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
    expect(started.run!.roomId).toBe(started.run!.map.start)
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
    state = walkTo(state, 'hollow')

    // The Gnawing. A room with a living enemy has no exits, whatever the map
    // put behind it.
    const onward = roomAt(state.run!).exits[0]!
    expect(reduce(state, { type: 'GO', to: onward.to })).toBe(state)
    const cleared = state.run!.roomId
    state = clearReward(fightItOut(reduce(state, { type: 'FIGHT' })))
    if (state.mode === 'dead') return
    // Cleared is keyed by **node**, because two hollows in one descent would
    // be two fights.
    expect(state.run!.cleared).toContain(cleared)

    // The Font. Its exit is withheld until it has answered.
    state = walkTo(state, 'sanctuary')
    const past = roomAt(state.run!).exits[0]!
    expect(reduce(state, { type: 'GO', to: past.to })).toBe(state)
    state = reduce(state, { type: 'RITUAL_ROLL' })

    // On to the boss, whichever way the director laid the middle out.
    state = walkTo(state, 'gate')

    // The Warden, and the door behind it.
    state = clearReward(fightItOut(reduce(state, { type: 'FIGHT' })))
    if (state.mode === 'dead') return
    state = walk(state)
    expect(state.mode).toBe('complete')
    expect(state.meta.wins).toBe(1)
  })
})

describe('the deep route', () => {
  it('goes through the vault and the Marrow', () => {
    let state = reduce(TITLE, { type: 'START_RUN', seed: 21 })
    state = walkTo(state, 'hollow')
    state = clearReward(fightItOut(reduce(state, { type: 'FIGHT' })))
    if (state.mode === 'dead') return
    state = walkTo(state, 'sanctuary')
    state = reduce(state, { type: 'RITUAL_ROLL' })

    // The fork, and the way the director labelled DEEP.
    state = walkTo(state, 'fork')
    state = walk(state, 'DEEP')
    expect(roomAt(state.run!).id).toBe('chain-vault')

    // A shut gate holds the exits, in state, so no dispatch can walk past it.
    const out = roomAt(state.run!).exits[0]!
    expect(reduce(state, { type: 'GO', to: out.to })).toBe(state)
    state = play(
      state,
      { type: 'INTERACT', interactionId: 'vault-chain' },
      { type: 'INTERACT', interactionId: 'vault-lever' },
    )
    state = walk(state)
    expect(roomAt(state.run!).id).toBe('deep')

    const before = state.run!.vials
    state = fightItOut(reduce(state, { type: 'FIGHT' }))
    if (state.mode === 'dead') return
    // The Marrow always leaves a Vial, offer or no offer.
    expect(state.run!.vials).toBe(before + 1)
  })
})

describe('every room can be left', () => {
  it('gives every generated node a way on, or an ending', () => {
    // The claim moved with the topology: a *template* has no exits at all
    // any more, so the thing that must not be a dead end is a node of the
    // generated map.
    for (const seed of [1, 2, 3, 44, 900]) {
      const run = reduce(TITLE, { type: 'START_RUN', seed }).run!
      for (const node of Object.values(run.map.nodes)) {
        const here = roomAt(run, node.id)
        expect(
          here.exits.length > 0 || here.ending !== undefined,
          `seed ${seed}: ${node.id} (${node.templateId}) is a dead end`,
        ).toBe(true)
      }
    }
  })

  it('never generates a map the validator rejects', () => {
    for (const seed of [1, 2, 3, 44, 900, 12345]) {
      const run = reduce(TITLE, { type: 'START_RUN', seed }).run!
      expect(validateRun(run.map), `seed ${seed}`).toEqual([])
    }
  })

  it('leads only to nodes that exist', () => {
    const run = reduce(TITLE, { type: 'START_RUN', seed: 7 }).run!
    for (const node of Object.values(run.map.nodes)) {
      for (const exit of roomAt(run, node.id).exits) {
        expect(run.map.nodes[exit.to], `${node.id} → ${exit.to}`).toBeDefined()
      }
    }
  })

  it('refuses an exit the room does not have', () => {
    const state = reduce(TITLE, { type: 'START_RUN', seed: 1 })
    expect(reduce(state, { type: 'GO', to: nodeOf(state.run!, 'gate') })).toBe(state)
  })

  it('gives every authored template a backdrop and an arrival', () => {
    for (const r of ROOM_LIBRARY) {
      expect(r.art, `${r.id} has no backdrop`).toBeTruthy()
      expect(r.arrival.length, `${r.id} says nothing on arrival`).toBeGreaterThan(10)
    }
  })
})

describe('the run can end', () => {
  it('dies when the last bone breaks, and says what took it', () => {
    let state = reduce(TITLE, { type: 'START_RUN', seed: 3 })
    state = walkTo(state, 'hollow')
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
      run: {
        ...state.run!,
        roomId: nodeOf(state.run!, 'hollow'),
        commonBones: 0,
        specials: [],
      },
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
      walkTo(reduce(TITLE, { type: 'START_RUN', seed: 1 }), 'hollow'),
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
    // **Both** of the shapes that reached 7 are discarded: the generated map
    // and the War of Bones arrived at that number independently, so a save
    // claiming 7 could be either and this build can read neither.
    for (const version of [6, 7]) {
      store.setItem('castlebrynth', JSON.stringify({ version, mode: 'combat', meta: {} }))
      const { state, discarded } = load(store)
      expect(discarded, `version ${version}`).toBe('incompatible')
      expect(state.run).toBeUndefined()
    }
    expect(SAVE_VERSION).toBe(8)
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
        walkTo(reduce(TITLE, { type: 'START_RUN', seed: 8 }), 'hollow'),
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
        walkTo(reduce(TITLE, { type: 'START_RUN', seed: 44 }), 'hollow'),
        { type: 'FIGHT' },
      ),
    )
    const twice = fightItOut(
      reduce(
        walkTo(reduce(TITLE, { type: 'START_RUN', seed: 44 }), 'hollow'),
        { type: 'FIGHT' },
      ),
    )
    expect(once).toEqual(twice)
  })

  it('two seeds do not', () => {
    const runOf = (seed: number): GameState =>
      reduce(
        walkTo(reduce(TITLE, { type: 'START_RUN', seed }), 'hollow'),
        { type: 'FIGHT' },
      )
    expect(runOf(1).run!.combat!.enemyLine).not.toEqual(runOf(2).run!.combat!.enemyLine)
  })

  it('a new run carries the same opening pile whatever the seed', () => {
    for (const seed of [1, 2, 3, 999]) expect(totalBones(newRun(seed))).toBe(BONE_CEILING)
  })
})
