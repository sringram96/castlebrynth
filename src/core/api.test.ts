import { describe, expect, it } from 'vitest'
import { createGame, newRun } from './api'
import { loadBundle } from './bundle'
import type { Bundle } from './cards'
import { emptyState } from './types'
import type { GameState } from './types'

// H006b · the API, on its own. resolve.test.ts already proves what a tap
// means; what is under test here is the layer above it — the bundle bound at
// construction, the scene found from the state, the View projected out of it,
// and a run that replays byte for byte from one seed and one tap list.
//
// The fixture goes through loadBundle, so what is under test is the shape a
// caller actually hands over, validation and normalisation and all.

const shore = (): Bundle =>
  loadBundle({
    v: 1,
    start: 'shore',
    scenes: {
      shore: {
        id: 'shore',
        line: 'Grey water, and no far side to it.',
        objects: [
          {
            id: 'stone',
            name: 'a flat stone',
            actions: { study: [{ say: 'A mark is cut into it.', setFlag: 'knows_glyph' }] },
          },
          {
            id: 'book',
            name: 'a book',
            actions: {
              read: [
                { gate: { flag: 'knows_glyph' }, say: 'Names in a line.', journal: 'procession' },
                { refuse: 'The marks swim.' },
              ],
              // A second action, so the view has an order to report.
              lift: [{ say: 'Heavier than it looks.', goto: 'water' }],
            },
          },
          { id: 'ash', name: 'ash', actions: { look: [{ say: 'Grey.' }] }, hidden: true },
        ],
      },
      water: { id: 'water', line: 'The water takes you.', objects: [] },
    },
  })

const STUDY = { object: 'stone', action: 'study' } as const
const READ = { object: 'book', action: 'read' } as const

const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('newRun — a fresh run of a bundle', () => {
  it('opens at the bundle start scene with the seed it was given', () => {
    const state = newRun(42, shore())
    expect(state.scene).toBe('shore')
    expect(state.seed).toBe(42)
    expect(state.flags).toEqual([])
    expect(state.items).toEqual([])
    expect(state.journal).toEqual([])
    expect(state.refused).toEqual([])
  })

  it('is the same fresh run whichever way it is reached', () => {
    const bundle = shore()
    expect(createGame(bundle).newRun(42)).toEqual(newRun(42, bundle))
  })

  it('hands back state that is JSON, and seven keys of it', () => {
    const state = newRun(42, shore())
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(structuredClone(state)).toEqual(state)
    expect(Object.keys(state).sort()).toEqual(Object.keys(emptyState('shore', 42)).sort())
  })
})

describe('act — one tap, against the scene the state is standing in', () => {
  it('resolves the tap in the current scene, not the start one', () => {
    const game = createGame(shore())
    // Away from the shore, where nothing is in view and nothing is afforded.
    const away = game.act(game.newRun(1), { object: 'book', action: 'lift' }).state
    expect(away.scene).toBe('water')
    expect(game.act(away, READ)).toEqual({ state: away, effects: [] })
  })

  it('carries the world forward across taps — refuses, learns, then opens', () => {
    const game = createGame(shore())
    const refused = game.act(game.newRun(1), READ)
    expect(refused.state.refused).toEqual(['book.read'])
    expect(refused.state.journal).toEqual([])

    const taught = game.act(refused.state, STUDY).state
    const opened = game.act(taught, READ)
    expect(opened.effects.some((effect) => effect.kind === 'refused')).toBe(false)
    expect(opened.state.journal).toEqual(['procession'])
    // The world does not forget having been asked.
    expect(opened.state.refused).toEqual(['book.read'])
  })

  it('is a no-op for an unknown object, an unafforded action, and a hidden one', () => {
    const game = createGame(shore())
    const start = game.newRun(1)
    for (const ref of [
      { object: 'nothing', action: 'poke' },
      { object: 'book', action: 'juggle' },
      { object: 'ash', action: 'look' },
    ]) {
      expect(game.act(start, ref)).toEqual({ state: start, effects: [] })
    }
  })

  it('is a no-op in a scene the bundle has not got, rather than a throw', () => {
    // A save from another bundle, or one hand-edited. There is nothing to tap.
    const game = createGame(shore())
    const lost: GameState = { ...emptyState('nowhere', 1) }
    expect(() => game.act(lost, READ)).not.toThrow()
    expect(game.act(lost, READ)).toEqual({ state: lost, effects: [] })
  })

  it('does not mistake a name off Object.prototype for a scene', () => {
    // `scenes` is a plain object and a scene id is content: `goto: constructor`
    // compiles. An inherited name must be a miss, not a function.
    const game = createGame(shore())
    for (const scene of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      const lost: GameState = { ...emptyState(scene, 1) }
      expect(() => game.act(lost, READ)).not.toThrow()
      expect(game.act(lost, READ)).toEqual({ state: lost, effects: [] })
      expect(() => game.getView(lost)).not.toThrow()
      expect(game.getView(lost).objects).toEqual([])
    }
  })

  it('accepts the frozen three-parameter signature, and no word reads the input', () => {
    // P0.md freezes `act(state, ref, input?)`. Nothing in VOCAB.md reads the
    // free-text half, so passing one may not change the turn it produces.
    const game = createGame(shore())
    const start = game.newRun(1)
    expect(game.act(start, STUDY, 'with care')).toEqual(game.act(start, STUDY))
  })

  it('leaves a deep-frozen state byte for byte as it found it', () => {
    const game = createGame(shore())
    const before = deepFreeze(game.newRun(42))
    const snapshot = JSON.stringify(before)
    expect(() => game.act(before, READ)).not.toThrow()
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('hands back state that is still JSON, and still seven keys', () => {
    const game = createGame(shore())
    const { state } = game.act(game.newRun(42), STUDY)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(structuredClone(state)).toEqual(state)
    expect(Object.keys(state).sort()).toEqual(Object.keys(emptyState('shore', 42)).sort())
  })
})

describe('getView — the moment, from state alone', () => {
  it('reports the scene, its line, and what is in view with what it affords', () => {
    const game = createGame(shore())
    const view = game.getView(game.newRun(42))
    expect(view.scene).toBe('shore')
    expect(view.line).toBe('Grey water, and no far side to it.')
    expect(view.objects).toEqual([
      { id: 'stone', actions: ['study'] },
      { id: 'book', actions: ['read', 'lift'] },
    ])
  })

  it('offers exactly the taps act will resolve', () => {
    // A view that listed a tap the engine refuses to resolve would be a lie
    // about the world, and a shell has no other source for what to offer.
    const game = createGame(shore())
    const start = game.newRun(1)
    for (const object of game.getView(start).objects) {
      for (const action of object.actions) {
        expect(game.act(start, { object: object.id, action }).effects).not.toEqual([])
      }
    }
  })

  it('follows the state into the next scene', () => {
    const game = createGame(shore())
    const { state } = game.act(game.newRun(1), { object: 'book', action: 'lift' })
    const view = game.getView(state)
    expect(view.scene).toBe('water')
    expect(view.line).toBe('The water takes you.')
    expect(view.objects).toEqual([])
  })

  it('shows nothing at all for a scene the bundle has not got', () => {
    const game = createGame(shore())
    const view = game.getView({ ...emptyState('nowhere', 1) })
    expect(view).toEqual({ line: '', scene: 'nowhere', objects: [] })
  })

  it('leaves a deep-frozen state byte for byte as it found it', () => {
    const game = createGame(shore())
    const state = deepFreeze(game.newRun(42))
    const snapshot = JSON.stringify(state)
    expect(() => game.getView(state)).not.toThrow()
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('moves the object set only by delta (LAWS.md §affordance)', () => {
    const bundle = loadBundle({
      v: 1,
      start: 'probe',
      scenes: {
        probe: {
          id: 'probe',
          line: 'A line.',
          objects: [
            {
              id: 'o',
              name: 'o',
              actions: {
                flag: [{ setFlag: 'a', say: 'x' }],
                reveal: [{ addObject: 'ash', say: 'x' }],
                vanish: [{ removeObject: 'o', say: 'x' }],
              },
            },
            { id: 'ash', name: 'ash', actions: { look: [{ say: 'Grey.' }] }, hidden: true },
          ],
        },
      },
    })
    const game = createGame(bundle)
    const start = game.newRun(1)
    const ids = (state: GameState): string[] => game.getView(state).objects.map((o) => o.id)

    expect(ids(start)).toEqual(['o'])
    expect(ids(game.act(start, { object: 'o', action: 'flag' }).state)).toEqual(['o'])
    expect(ids(game.act(start, { object: 'o', action: 'reveal' }).state)).toEqual(['o', 'ash'])
    expect(ids(game.act(start, { object: 'o', action: 'vanish' }).state)).toEqual([])
  })
})

describe('determinism — the same seed and the same taps are the same run', () => {
  const taps = [READ, STUDY, READ, { object: 'ash', action: 'look' }, READ]

  const play = (): { state: GameState; transcript: string } => {
    const game = createGame(shore())
    let state = game.newRun(42)
    const lines: string[] = []
    for (const tap of taps) {
      const turn = game.act(state, tap)
      state = turn.state
      lines.push(JSON.stringify(turn.effects))
    }
    return { state, transcript: lines.join('\n') }
  }

  it('replays byte for byte, state and transcript alike', () => {
    const once = play()
    const twice = play()
    expect(JSON.stringify(once.state)).toBe(JSON.stringify(twice.state))
    expect(once.transcript).toBe(twice.transcript)
  })

  it('replays the same way from a serialised state as from a live one', () => {
    // The state is the save (H007), so a run resumed from disk is the same run.
    const game = createGame(shore())
    const half = game.act(game.newRun(42), READ).state
    const revived: GameState = JSON.parse(JSON.stringify(half))
    expect(game.act(revived, STUDY)).toEqual(game.act(half, STUDY))
  })

  it('leaves the generator where it found it — no word in P0 draws', () => {
    const game = createGame(shore())
    const start = game.newRun(42)
    let state = start
    for (const tap of taps) state = game.act(state, tap).state
    expect(state.rng).toBe(start.rng)
    expect(state.seed).toBe(42)
  })
})
