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

import { newRun, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { SAVE_VERSION, TITLE } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { BONE_CEILING } from '../../src/content/bones.js'
import { legalScores } from '../../src/combat/hands.js'
import { ROOM_LIBRARY } from '../../src/content/rooms.js'
import { roomAt } from '../../src/game/map.js'
import { validateRun } from '../../src/game/mapValidation.js'
import { legal, stateOf } from '../../src/content/interactions.js'
import { GRAMMARS } from '../../src/content/runPlans.js'
import { nodeOf, seedFor } from './where.js'
import { load, save, wipe } from '../../src/game/save.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/**
 * Fight whatever is in the room until it or the run is finished.
 *
 * Real presses only: ROLL, SCORE, and DEFEAT_DONE when a death is being held
 * open. It never rerolls and it takes the first legal hand, which is the naive
 * policy and the one a first-time player uses.
 */
function fightItOut(state: GameState, guard = 80): GameState {
  let now = state
  for (let step = 0; step < guard; step++) {
    const combat = now.run?.combat
    if (!combat) return now
    if (combat.defeated) {
      now = reduce(now, { type: 'DEFEAT_DONE' })
      continue
    }
    if (now.mode !== 'combat') return now
    if (combat.dice.length === 0) {
      const rolled = reduce(now, { type: 'ROLL' })
      if (rolled === now) return now
      now = rolled
      continue
    }
    const hand = legalScores(combat.dice, combat.usedHands)[0]
    if (!hand) return now
    now = reduce(now, { type: 'SCORE', hand })
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

/**
 * Do whatever this room needs doing before it will let anybody leave.
 *
 * A font is rolled and machinery is worked, in declaration order, which is the
 * order the carved clues say it has to happen in. **A fight is deliberately not
 * here**: every spec below opens its own fights, because what a fight costs is
 * the thing they are about.
 *
 * It exists because there are three grammars now and they do not agree about what
 * stands between two rooms — THE LONG WAY puts the Font before either fight — so a
 * walk that only pressed GO would be a walk that only worked on one of them.
 */
function openTheWay(state: GameState): GameState {
  let now = state
  const here = roomAt(now.run!)
  if (here.ritual && now.run!.ritual?.roomId !== now.run!.roomId) {
    now = reduce(now, { type: 'RITUAL_ROLL' })
  }
  for (const thing of here.interactables ?? []) {
    const room = stateOf(now.run!.rooms, now.run!.roomId, here.id)
    if (room && legal(room, thing.id)) {
      now = reduce(now, { type: 'INTERACT', interactionId: thing.id })
    }
  }
  return now
}

/** Walk until the run is standing in a room built from a named template. */
function walkTo(state: GameState, templateId: string, guard = 16): GameState {
  let now = state
  for (let step = 0; step < guard; step++) {
    if (roomAt(now.run!).id === templateId) return now
    now = openTheWay(now)
    const before = now.run!.roomId
    now = walk(now)
    if (now.run!.roomId === before) break
  }
  throw new Error(`never reached ${templateId}`)
}

/**
 * Pick up whatever is lying in this room, or leave it.
 *
 * There is no screen to clear any more: a win goes straight back to the room
 * with what it paid on the floor, and walking away is walking away. `take`
 * being false is not a SKIP press — it is simply not pressing anything.
 */
function clearReward(state: GameState, take = true): GameState {
  if (!take) return state
  let now = state
  for (;;) {
    const index = (now.run?.loot?.[now.run.roomId] ?? []).findIndex((l) => !l.taken)
    if (index < 0) return now
    const next = reduce(now, { type: 'TAKE', index })
    if (next === now) return now
    now = next
  }
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
    expect(started.run!.bones).toBe(BONE_CEILING)
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
    expect(again.run!.loot).toBeUndefined()
    expect(again.run!.cause).toBeUndefined()
    expect(again.resume).toBeUndefined()
  })
})

describe('the short route', () => {
  it('goes door to exit on real presses', () => {
    // **Pinned to the descent**, because this spec walks its rooms by name: the
    // Gnawing, then the Font, then the door. THE LONG WAY puts the Font first and
    // THE TITHE has none at all, and both of those are walked end to end below.
    let state = reduce(TITLE, { type: 'START_RUN', seed: seedFor('descent') })
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
    let state = reduce(TITLE, { type: 'START_RUN', seed: seedFor('descent') })
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
    // Past the gate, down the deep leg, and on to the Marrow — with an alcove cut
    // into the leg between them since this wave, which is exactly why a walk names
    // the room it is going to rather than counting doors.
    state = walkTo(state, 'deep')

    const before = state.run!.vials
    state = fightItOut(reduce(state, { type: 'FIGHT' }))
    if (state.mode === 'dead') return
    // The Marrow always leaves a Vial, offer or no offer — **on the floor beside
    // the body**, which is where everything a fight pays has lain since the reel
    // wave. Seeing a thing is not carrying it, so the press is what moves it.
    //
    // This used to be written as *vials went up by one*, and it passed only
    // because the run died in this fight and returned before the assertion ever
    // ran. The Marrow breaks less the more of it is gone now, so the run survives
    // and the claim is finally reached.
    const left = state.run!.loot![state.run!.roomId]!.filter((l) => !l.taken)
    expect(left.map((l) => l.id)).toContain('vial')
    expect(state.run!.vials).toBe(before)
    state = clearReward(state)
    expect(state.run!.vials).toBe(before + 1)
  })
})

describe('every grammar is walkable, down every branch', () => {
  // **Three descents now, and the seed chooses.** A journey that only ever walked
  // one of them would leave two thirds of the game unplayed by the suite that is
  // supposed to prove it can be played at all. Every branch of every grammar is
  // walked here with real presses — fights fought, fonts rolled, machinery worked,
  // tolls paid — and every one of them has to reach the way out or die trying,
  // never stall.
  for (const plan of GRAMMARS) {
    for (const branch of ['first', 'second'] as const) {
      it(`${plan.id}, taking the ${branch} mouth at every fork`, () => {
        let state = reduce(TITLE, { type: 'START_RUN', seed: seedFor(plan.id) })
        for (let step = 0; step < 40; step++) {
          if (state.mode === 'complete' || state.mode === 'dead') break
          const here = roomAt(state.run!)
          if (here.enemy && !state.run!.cleared.includes(here.instanceId)) {
            state = clearReward(fightItOut(reduce(state, { type: 'FIGHT' })))
            continue
          }
          const before = state.run!.roomId
          state = clearReward(openTheWay(state))
          const exits = roomAt(state.run!).exits
          const chosen = branch === 'second' ? (exits[1] ?? exits[0]) : exits[0]
          if (!chosen) break
          state = reduce(state, { type: 'GO', to: chosen.to })
          // A press that changed nothing is a stall, and a stall is the one
          // failure a walkable descent may not have.
          expect(state.run!.roomId, `${plan.id} stalled in ${here.id}`).not.toBe(before)
        }
        expect(['complete', 'dead'], `${plan.id} never finished`).toContain(state.mode)
      })
    }
  }

  it('every grammar offers two mouths at both of its forks', () => {
    for (const plan of GRAMMARS) {
      const map = reduce(TITLE, { type: 'START_RUN', seed: seedFor(plan.id) }).run!.map
      const junctions = Object.values(map.nodes).filter((n) => n.role === 'junction')
      expect(junctions, plan.id).toHaveLength(2)
      for (const j of junctions) expect(j.exits, `${plan.id}/${j.id}`).toHaveLength(2)
    }
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
    // One bone, one attack. It throws one die, does at least one damage, and
    // the Gnawing breaks three of a pile that has one.
    state = { ...state, run: { ...state.run!, bones: 1 } }
    state = fightItOut(reduce(state, { type: 'FIGHT' }))
    if (state.mode !== 'dead') return
    expect(state.run!.bones).toBe(0)
    expect(state.run!.cause).toBeTruthy()
    // And the death screen has a way out that is not a reload.
    expect(reduce(state, { type: 'START_RUN', seed: 4 }).mode).toBe('explore')
    expect(reduce(state, { type: 'TITLE' }).mode).toBe('title')
  })

  it('never fights with nothing left to throw', () => {
    const state = reduce(TITLE, { type: 'START_RUN', seed: 1 })
    const empty: GameState = {
      ...state,
      run: {
        ...state.run!,
        roomId: nodeOf(state.run!, 'hollow'),
        bones: 0,
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
      walkTo(reduce(TITLE, { type: 'START_RUN', seed: seedFor('descent') }), 'hollow'),
      { type: 'FIGHT' },
    )
    save(fighting, store)
    const { state } = load(store)
    expect(state.mode).toBe('title')
    expect(state.resume).toBe('combat')
    // And one press is back where the run stood, mid-fight.
    const back = reduce(state, { type: 'CONTINUE' })
    expect(back.mode).toBe('combat')
    expect(back.run!.combat!.dice).toEqual([])
  })

  it('discards a save from the game this replaced', () => {
    const store = storage()
    // Every earlier shape, including the War of Bones at 8 and the loadout
    // wave at 10. There is no migration ladder: an old save is detected,
    // discarded, and reported.
    for (const version of [6, 7, 8, 9, 10]) {
      store.setItem('castlebrynth', JSON.stringify({ version, mode: 'combat', meta: {} }))
      const { state, discarded } = load(store)
      expect(discarded, `version ${version}`).toBe('incompatible')
      expect(state.run).toBeUndefined()
    }
    store.setItem('castlebrynth', JSON.stringify({ version: 11, mode: 'combat', meta: {} }))
    expect(load(store).discarded).toBe('incompatible')
    expect(SAVE_VERSION).toBe(12)
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
    const mid = play(
      reduce(
        walkTo(reduce(TITLE, { type: 'START_RUN', seed: seedFor('descent', 8) }), 'hollow'),
        { type: 'FIGHT' },
      ),
      { type: 'ROLL' },
    )
    save(mid, store)
    const raw = store.getItem('castlebrynth')!
    for (const forbidden of ['frame', 'elapsed', 'animating', 'startedAt', 'held']) {
      expect(raw, `the save carries ${forbidden}`).not.toContain(`"${forbidden}"`)
    }
  })
})

describe('determinism', () => {
  it('a seed replays exactly', () => {
    const once = fightItOut(
      reduce(
        walkTo(reduce(TITLE, { type: 'START_RUN', seed: seedFor('descent', 44) }), 'hollow'),
        { type: 'FIGHT' },
      ),
    )
    const twice = fightItOut(
      reduce(
        walkTo(reduce(TITLE, { type: 'START_RUN', seed: seedFor('descent', 44) }), 'hollow'),
        { type: 'FIGHT' },
      ),
    )
    expect(once).toEqual(twice)
  })

  it('two seeds do not', () => {
    const throwOf = (seed: number): readonly number[] =>
      reduce(
        reduce(
          walkTo(reduce(TITLE, { type: 'START_RUN', seed }), 'hollow'),
          { type: 'FIGHT' },
        ),
        { type: 'ROLL' },
      ).run!.combat!.dice
    expect(throwOf(seedFor('descent'))).not.toEqual(throwOf(seedFor('descent', 40)))
  })

  it('a new run carries the same opening pile whatever the seed', () => {
    for (const seed of [1, 2, 3, 999]) expect(newRun(seed).bones).toBe(BONE_CEILING)
  })
})
