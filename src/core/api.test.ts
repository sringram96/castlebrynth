import { describe, expect, it } from 'vitest'
import { createGame, newRun } from './api'
import type { Game } from './api'
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
// caller actually hands over, validation and normalisation and all — which is
// the authored shape: `scene`/`enter`, objects as a mapping keyed by id, and a
// `tap` on every one of them.

const CROSSING_ENTER =
  'The ring of the portal is cold all through, and nothing is coming back through it.'
const STAIR_ENTER = 'Treads worn hollow, and cold coming up out of them.'

const STONE_TAP = 'A block set into the wall at chest height, scored over with a shape.'
const DOOR_TAP = 'A low door, barred from this side.'
const STEPS_TAP = 'Steps going down past the door, and the dark takes them three treads in.'
const DARK_TAP = 'The dark below the third tread. It does not thin.'

const DOOR_REFUSAL = 'The mark on the wood means something. Not to you, and not to your hands.'
const END_LINE = 'The dark takes the third tread, and then you.'

// The reference arc, in miniature: the door refuses, the scored stone teaches,
// the same tap opens, and the steps take you out of the slice.
const crossing = (): Bundle =>
  loadBundle({
    v: 1,
    start: 'crossing',
    scenes: {
      crossing: {
        scene: 'crossing',
        enter: CROSSING_ENTER,
        tier: 'T0',
        objects: {
          stone: {
            tap: STONE_TAP,
            actions: {
              study: [
                {
                  say: 'A ring with a line falling through it, cut deep enough to read with a thumb.',
                  set: ['knows_mark'],
                  journal: 'the_mark',
                },
              ],
            },
          },
          door: {
            tap: DOOR_TAP,
            actions: {
              open: [
                {
                  if: { flags: ['knows_mark'] },
                  say: 'You lift the bar. The shape on the wood is the shape on the stone.',
                  set: ['door_open'],
                  journal: 'the_way_down',
                },
                // No negation in the vocabulary: "does not know the mark" is
                // the gateless fallback, reached by ordering the knowing
                // branch above it.
                { refuse: true, say: DOOR_REFUSAL },
              ],
              // A second action, so the view has an order to report.
              listen: [{ say: 'Nothing on the other side. A place too big to hear the end of.' }],
            },
          },
          steps: {
            tap: STEPS_TAP,
            actions: {
              descend: [
                {
                  if: { flags: ['door_open'] },
                  say: 'The cold comes up the steps to meet you.',
                  goto: 'stair',
                },
                { refuse: true, say: 'The door is barred between you and them.' },
              ],
            },
          },
          ash: {
            tap: 'Ash banked against the wall in a long grey drift.',
            actions: { look: [{ say: 'Cold, and packed hard.' }] },
            hidden: true,
          },
        },
      },
      stair: {
        scene: 'stair',
        enter: STAIR_ENTER,
        tier: 'T0',
        objects: {
          dark: {
            tap: DARK_TAP,
            actions: {
              descend: [{ say: 'You go down into it.', end: { line: END_LINE, note: 'left the Crossing' } }],
            },
          },
        },
      },
    },
  })

const STUDY = { object: 'stone', action: 'study' } as const
const OPEN = { object: 'door', action: 'open' } as const
const DESCEND = { object: 'steps', action: 'descend' } as const
const DOWN = { object: 'dark', action: 'descend' } as const

/** The only way out of the crossing: learn the mark, lift the bar, go down. */
const onTheStair = (game: Game): GameState =>
  [STUDY, OPEN, DESCEND].reduce((state, tap) => game.act(state, tap).state, game.newRun(1))

const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('newRun — a fresh run of a bundle', () => {
  it('opens at the bundle start scene with the seed it was given', () => {
    const state = newRun(42, crossing())
    expect(state.scene).toBe('crossing')
    expect(state.seed).toBe(42)
    expect(state.flags).toEqual([])
    expect(state.items).toEqual([])
    expect(state.journal).toEqual([])
    expect(state.refused).toEqual([])
  })

  it('is the same fresh run whichever way it is reached', () => {
    const bundle = crossing()
    expect(createGame(bundle).newRun(42)).toEqual(newRun(42, bundle))
  })

  it('hands back state that is JSON, and seven keys of it', () => {
    const state = newRun(42, crossing())
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(structuredClone(state)).toEqual(state)
    expect(Object.keys(state).sort()).toEqual(Object.keys(emptyState('crossing', 42)).sort())
  })
})

describe('act — one tap, against the scene the state is standing in', () => {
  it('resolves the tap in the current scene, not the start one', () => {
    const game = createGame(crossing())
    // On the stair, where the door is nowhere in view and affords nothing.
    const away = onTheStair(game)
    expect(away.scene).toBe('stair')
    expect(game.act(away, OPEN)).toEqual({ state: away, effects: [] })
  })

  it('carries the world forward across taps — refuses, learns, then opens', () => {
    const game = createGame(crossing())
    const start = game.newRun(1)
    const refused = game.act(start, OPEN)
    expect(refused.state.refused).toEqual(['door.open'])
    expect(refused.state.journal).toEqual([])

    const taught = game.act(refused.state, STUDY).state
    expect(taught.flags).toContain('knows_mark')

    const opened = game.act(taught, OPEN)
    expect(opened.effects.some((effect) => effect.kind === 'refused')).toBe(false)
    expect(opened.state.journal).toEqual(['the_mark', 'the_way_down'])
    expect(opened.state.flags).toContain('door_open')
    // The world does not forget having been asked.
    expect(opened.state.refused).toEqual(['door.open'])
  })

  it('carries the refusal line to the caller and moves nothing but the ledger', () => {
    // `refuse: true` carries no line of its own — the `say` is the line, so it
    // leaves on the `refused` effect and only there. A refusal that spoke
    // nothing would be a tap that did nothing; one that spoke twice would put
    // the same sentence on screen twice.
    const game = createGame(crossing())
    const start = game.newRun(1)
    const { state, effects } = game.act(start, OPEN)
    expect(effects).toEqual([{ kind: 'refused', ref: OPEN, line: DOOR_REFUSAL }])
    expect(state).toEqual({ ...start, refused: ['door.open'] })
  })

  it('ends the slice with its line, and leaves the run standing where it was', () => {
    const game = createGame(crossing())
    const away = onTheStair(game)
    const { state, effects } = game.act(away, DOWN)
    expect(effects).toEqual([
      { kind: 'say', text: 'You go down into it.' },
      { kind: 'end', line: END_LINE, note: 'left the Crossing' },
    ])
    // `end` says the slice is over; it is not a `goto` and moves no one.
    expect(state.scene).toBe('stair')
  })

  it('is a no-op for an unknown object, an unafforded action, and a hidden one', () => {
    const game = createGame(crossing())
    const start = game.newRun(1)
    for (const ref of [
      { object: 'nothing', action: 'poke' },
      { object: 'door', action: 'juggle' },
      { object: 'ash', action: 'look' },
    ]) {
      expect(game.act(start, ref)).toEqual({ state: start, effects: [] })
    }
  })

  it('is a no-op in a scene the bundle has not got, rather than a throw', () => {
    // A save from another bundle, or one hand-edited. There is nothing to tap.
    const game = createGame(crossing())
    const lost: GameState = { ...emptyState('nowhere', 1) }
    expect(() => game.act(lost, OPEN)).not.toThrow()
    expect(game.act(lost, OPEN)).toEqual({ state: lost, effects: [] })
  })

  it('does not mistake a name off Object.prototype for a scene', () => {
    // `scenes` is a plain object and a scene id is content: `goto: constructor`
    // compiles. An inherited name must be a miss, not a function.
    const game = createGame(crossing())
    for (const scene of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      const lost: GameState = { ...emptyState(scene, 1) }
      expect(() => game.act(lost, OPEN)).not.toThrow()
      expect(game.act(lost, OPEN)).toEqual({ state: lost, effects: [] })
      expect(() => game.getView(lost)).not.toThrow()
      expect(game.getView(lost).objects).toEqual([])
    }
  })

  it('accepts the frozen three-parameter signature, and no word reads the input', () => {
    // P0.md freezes `act(state, ref, input?)`. Nothing in VOCAB.md reads the
    // free-text half, so passing one may not change the turn it produces.
    const game = createGame(crossing())
    const start = game.newRun(1)
    expect(game.act(start, STUDY, 'with care')).toEqual(game.act(start, STUDY))
  })

  it('leaves a deep-frozen state byte for byte as it found it', () => {
    const game = createGame(crossing())
    const before = deepFreeze(game.newRun(42))
    const snapshot = JSON.stringify(before)
    expect(() => game.act(before, OPEN)).not.toThrow()
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('hands back state that is still JSON, and still seven keys', () => {
    const game = createGame(crossing())
    const { state } = game.act(game.newRun(42), STUDY)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(structuredClone(state)).toEqual(state)
    expect(Object.keys(state).sort()).toEqual(Object.keys(emptyState('crossing', 42)).sort())
  })
})

describe('getView — the moment, from state alone', () => {
  it('reports the scene, its line, and what is in view with what it affords', () => {
    const game = createGame(crossing())
    const view = game.getView(game.newRun(42))
    expect(view.scene).toBe('crossing')
    expect(view.line).toBe(CROSSING_ENTER)
    expect(view.objects).toEqual([
      { id: 'stone', tap: STONE_TAP, actions: ['study'] },
      { id: 'door', tap: DOOR_TAP, actions: ['open', 'listen'] },
      { id: 'steps', tap: STEPS_TAP, actions: ['descend'] },
    ])
  })

  it('carries every object tap verbatim, because the free tap is drawn from it', () => {
    // GAME.md #input: the first tap is free and always describes. A shell that
    // had to call `act` to learn what a thing looks like could not offer one,
    // so the prose has to be in the view and it has to be the authored prose.
    const game = createGame(crossing())
    const taps = (state: GameState): Record<string, string> =>
      Object.fromEntries(game.getView(state).objects.map((o) => [o.id, o.tap]))

    expect(taps(game.newRun(1))).toEqual({ stone: STONE_TAP, door: DOOR_TAP, steps: STEPS_TAP })
    // Every scene, not just the first — including the one arrived at.
    expect(taps(onTheStair(game))).toEqual({ dark: DARK_TAP })
  })

  it('offers exactly the taps act will resolve', () => {
    // A view that listed a tap the engine refuses to resolve would be a lie
    // about the world, and a shell has no other source for what to offer.
    const game = createGame(crossing())
    for (const start of [game.newRun(1), onTheStair(game)]) {
      for (const object of game.getView(start).objects) {
        for (const action of object.actions) {
          expect(game.act(start, { object: object.id, action }).effects).not.toEqual([])
        }
      }
    }
  })

  it('follows the state into the next scene', () => {
    const game = createGame(crossing())
    const view = game.getView(onTheStair(game))
    expect(view.scene).toBe('stair')
    expect(view.line).toBe(STAIR_ENTER)
    expect(view.objects.map((o) => o.id)).toEqual(['dark'])
  })

  it('shows nothing at all for a scene the bundle has not got', () => {
    const game = createGame(crossing())
    const view = game.getView({ ...emptyState('nowhere', 1) })
    expect(view).toEqual({ line: '', scene: 'nowhere', objects: [] })
  })

  it('leaves a deep-frozen state byte for byte as it found it', () => {
    const game = createGame(crossing())
    const state = deepFreeze(game.newRun(42))
    const snapshot = JSON.stringify(state)
    expect(() => game.getView(state)).not.toThrow()
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})

describe('the object set moves only by delta, and only in the scene it names', () => {
  // Two scenes, each holding a hidden `ash`. A delta names the scene it acts
  // on (VOCAB.md), which is what stops one template dealt into two rooms from
  // opening both — the bug the scene key exists to prevent.
  const probe = (): Bundle =>
    loadBundle({
      v: 1,
      start: 'cell',
      scenes: {
        cell: {
          scene: 'cell',
          enter: 'Four close walls, and a grate set into one of them.',
          tier: 'T0',
          objects: {
            grate: {
              tap: 'A grate at floor height, its bars scaled with rust.',
              actions: {
                pull: [{ say: 'It holds.', set: ['pulled'] }],
                lift: [
                  {
                    say: 'The grate comes up, and there is ash under it.',
                    addObject: { scene: 'cell', object: 'ash', cause: 'the grate came up' },
                  },
                ],
                sift: [
                  {
                    say: 'The draught takes the ash down the crawl ahead of you.',
                    addObject: { scene: 'crawl', object: 'ash', cause: 'the draught carried it' },
                  },
                ],
                drop: [
                  {
                    say: 'It falls back into its seat.',
                    removeObject: { scene: 'cell', object: 'grate', cause: 'the grate seated itself' },
                  },
                ],
                enter: [{ say: 'You go through on your elbows.', goto: 'crawl' }],
              },
            },
            ash: {
              tap: 'Ash, packed cold against the stone.',
              actions: { look: [{ say: 'Cold, and packed hard.' }] },
              hidden: true,
            },
          },
        },
        crawl: {
          scene: 'crawl',
          enter: 'A crawl the width of your shoulders, and no room to turn in it.',
          tier: 'T0',
          objects: {
            ash: {
              tap: 'Ash, packed cold against the stone.',
              actions: { look: [{ say: 'Cold, and packed hard.' }] },
              hidden: true,
            },
          },
        },
      },
    })

  const on = (game: Game, state: GameState, action: string): GameState =>
    game.act(state, { object: 'grate', action }).state

  it('is unmoved by a flag, and moved by addObject and removeObject', () => {
    const game = createGame(probe())
    const start = game.newRun(1)
    const ids = (state: GameState): string[] => game.getView(state).objects.map((o) => o.id)

    expect(ids(start)).toEqual(['grate'])
    // A flag on its own never moves the set (LAWS.md #affordance).
    expect(ids(on(game, start, 'pull'))).toEqual(['grate'])
    expect(ids(on(game, start, 'lift'))).toEqual(['grate', 'ash'])
    expect(ids(on(game, start, 'drop'))).toEqual([])
  })

  it('adds into the scene the delta names, and into no other', () => {
    const game = createGame(probe())
    const start = game.newRun(1)
    const ids = (state: GameState): string[] => game.getView(state).objects.map((o) => o.id)

    // Added here: revealed here, and still hidden through there.
    const lifted = on(game, start, 'lift')
    expect(ids(lifted)).toEqual(['grate', 'ash'])
    expect(ids(on(game, lifted, 'enter'))).toEqual([])

    // Added there: still hidden here, and revealed on arriving.
    const sifted = on(game, start, 'sift')
    expect(ids(sifted)).toEqual(['grate'])
    expect(ids(on(game, sifted, 'enter'))).toEqual(['ash'])
  })
})

describe('determinism — the same seed and the same taps are the same run', () => {
  const taps = [OPEN, STUDY, OPEN, { object: 'ash', action: 'look' }, DESCEND, DOWN]

  const play = (): { state: GameState; transcript: string } => {
    const game = createGame(crossing())
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
    const game = createGame(crossing())
    const half = game.act(game.newRun(42), OPEN).state
    const revived: GameState = JSON.parse(JSON.stringify(half))
    expect(game.act(revived, STUDY)).toEqual(game.act(half, STUDY))
  })

  it('leaves the generator where it found it — no word in P0 draws', () => {
    const game = createGame(crossing())
    const start = game.newRun(42)
    let state = start
    for (const tap of taps) state = game.act(state, tap).state
    expect(state.rng).toBe(start.rng)
    expect(state.seed).toBe(42)
  })
})
