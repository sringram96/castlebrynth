import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createGame } from '../../src/core/api'
import type { Game } from '../../src/core/api'
import { loadBundle } from '../../src/core/bundle'
import type { Effect } from '../../src/core/api-types'
import type { Bundle } from '../../src/core/cards'
import type { GameState } from '../../src/core/types'

// H111 · THE CORRIDOR MOUTH — content/corridor.yaml, headless, through GameAPI.
//
// The third scene, and the end of the P1 slice. Authored ahead of the card
// (AGENTS.md law 7). The ids it pins are the ones H111 must author:
//
//   scene    corridor
//   objects  dust_floor.inspect · lamp_alcove · dark_crossing.cross · exit.follow
//   flag     floor_seen
//   journal  dust (the floor, inspected)
//
//   and back at the gate: exit.follow, gated on gate_open, into the corridor.
//
// ON THE ENDING. The card says the dark crossing fires an `end` delta.
// `end` is in VOCAB.md and is not in the engine: DELTA_ORDER (src/core/cards.ts)
// has nine words and none of them is `end`, and Effect (src/core/api-types.ts)
// has four kinds and none of them is an ending. So this file asserts what the
// crossing *does* — it is offered, it is not refused, it speaks, and it is one
// way — and never how it is spelled. The end card itself is a thing on a
// screen, and it is proven on the screen, in H100.
//
// Nothing here may spring. P1 has no harm in it, and the floor says what it is
// before the trap that will later hang off it costs anybody anything
// (LAWS.md #telegraph).

const SEED = 42

const bundle = (): Bundle =>
  loadBundle(JSON.parse(readFileSync(resolve(__dirname, '../../content/bundle.json'), 'utf8')))

const STONE_STUDY = { object: 'stone', action: 'study' } as const
const BOOK_READ = { object: 'book', action: 'read' } as const
const PATH_FOLLOW = { object: 'path', action: 'follow' } as const

const BEARER_SEARCH = { object: 'dead_bearer', action: 'search' } as const
const GATE_OPEN = { object: 'iron_gate', action: 'open' } as const

const EXIT_FOLLOW = { object: 'exit', action: 'follow' } as const
const FLOOR_INSPECT = { object: 'dust_floor', action: 'inspect' } as const
const CROSS = { object: 'dark_crossing', action: 'cross' } as const

const prose = (effects: readonly Effect[]): string => {
  const lines: string[] = []
  for (const e of effects) {
    if (e.kind === 'say') lines.push(e.text)
    if (e.kind === 'refused') lines.push(e.line)
  }
  return lines.join(' ')
}

const entries = (effects: readonly Effect[]): string[] => {
  const out: string[] = []
  for (const e of effects) if (e.kind === 'journal') out.push(e.entry)
  return out
}

const ids = (g: Game, s: GameState): string[] => g.getView(s).objects.map((o) => o.id)

/** At the gate, with it still locked. */
const atTheGate = (g: Game): GameState => {
  let s = g.newRun(SEED)
  s = g.act(s, STONE_STUDY).state
  s = g.act(s, BOOK_READ).state
  s = g.act(s, PATH_FOLLOW).state
  return s
}

/** At the gate, opened, standing in front of the way down. */
const throughTheGate = (g: Game): GameState => {
  let s = atTheGate(g)
  s = g.act(s, BEARER_SEARCH).state
  s = g.act(s, GATE_OPEN).state
  return s
}

const inTheCorridor = (g: Game): GameState => g.act(throughTheGate(g), EXIT_FOLLOW).state

describe('H111 · the gate opens onto the corridor, and not before', () => {
  it('does not let you past a locked gate', () => {
    const g = createGame(bundle())
    const locked = atTheGate(g)
    expect(locked.flags).not.toContain('gate_open')

    const turn = g.act(locked, EXIT_FOLLOW)
    expect(turn.state.scene, 'a shut gate is a shut gate').toBe('gate')
  })

  it('walks into the corridor once gate_open is set', () => {
    const g = createGame(bundle())
    const open = throughTheGate(g)
    expect(open.flags).toContain('gate_open')

    const turn = g.act(open, EXIT_FOLLOW)
    expect(turn.state.scene).toBe('corridor')
    expect(turn.effects, 'arriving is announced, not left to be diffed').toContainEqual({
      kind: 'enter',
      scene: 'corridor',
    })
  })

  it('stands the corridor mouth up with everything the card names in it', () => {
    const g = createGame(bundle())
    const s = inTheCorridor(g)
    const v = g.getView(s)

    expect(v.scene).toBe('corridor')
    expect(v.line.length, 'the corridor stands under a line of its own').toBeGreaterThan(0)
    expect(ids(g, s)).toEqual(
      expect.arrayContaining(['dust_floor', 'lamp_alcove', 'dark_crossing', 'exit']),
    )
  })
})

describe('H111 · the dust floor tells you about itself', () => {
  it('inspect sets floor_seen and lands a journal line', () => {
    const g = createGame(bundle())
    const before = inTheCorridor(g)
    const turn = g.act(before, FLOOR_INSPECT)

    expect(turn.state.flags).toContain('floor_seen')
    expect(turn.state.journal, 'looking at it is a thing you did').toContain('dust')
    expect(entries(turn.effects)).toContain('dust')
    expect(prose(turn.effects).length, 'the floor says what it is').toBeGreaterThan(0)
  })

  it('costs nothing, springs nothing — P1 has no trap in it yet', () => {
    const g = createGame(bundle())
    const before = inTheCorridor(g)
    const turn = g.act(before, FLOOR_INSPECT)

    expect(turn.effects.some((e) => e.kind === 'refused'), 'looking is not refused').toBe(false)
    expect(turn.state.refused, 'nothing turned you away').toEqual(before.refused)
    expect(turn.state.items, 'nothing was taken off you').toEqual(before.items)
    expect(turn.state.scene, 'the floor does not move you').toBe('corridor')
  })

  it('stays seen once it has been seen', () => {
    const g = createGame(bundle())
    let s = inTheCorridor(g)
    s = g.act(s, FLOOR_INSPECT).state
    s = g.act(s, FLOOR_INSPECT).state
    expect(s.flags, 'no takebacks — the floor cannot become unread').toContain('floor_seen')
    expect(s.scene).toBe('corridor')
  })
})

describe('H111 · the lamp alcove is a place, and nothing more', () => {
  it('is tappable, and answers', () => {
    const g = createGame(bundle())
    const s = inTheCorridor(g)
    const alcove = g.getView(s).objects.find((o) => o.id === 'lamp_alcove')

    expect(alcove, 'the alcove must be on screen (LAWS.md #visible)').toBeDefined()
    expect(alcove?.actions.length, '"it is an alcove" is a complete answer').toBeGreaterThan(0)
  })

  it('does nothing at all — it is holding a space for P2, not filling it', () => {
    const g = createGame(bundle())
    const before = inTheCorridor(g)
    const alcove = g.getView(before).objects.find((o) => o.id === 'lamp_alcove')
    expect(alcove?.actions.length, 'the alcove must be there to do nothing').toBeGreaterThan(0)

    for (const action of alcove?.actions ?? []) {
      const turn = g.act(before, { object: 'lamp_alcove', action })
      expect(prose(turn.effects).length, `lamp_alcove.${action} said nothing`).toBeGreaterThan(0)
      expect(turn.state, `lamp_alcove.${action} changed the world`).toEqual(before)
    }
  })
})

describe('H111 · the way back', () => {
  it('walks you back to the gate, which is still open', () => {
    const g = createGame(bundle())
    const s = inTheCorridor(g)
    const turn = g.act(s, EXIT_FOLLOW)

    expect(turn.state.scene).toBe('gate')
    expect(turn.state.flags, 'route is a ratchet (GAME.md #progress)').toContain('gate_open')
    expect(g.getView(turn.state).objects.length, 'the gate is standing empty').toBeGreaterThan(0)
  })

  it('is a door, not a one-way trip — you can walk it twice', () => {
    const g = createGame(bundle())
    let s = inTheCorridor(g)
    s = g.act(s, EXIT_FOLLOW).state
    expect(s.scene).toBe('gate')
    s = g.act(s, EXIT_FOLLOW).state
    expect(s.scene, 'an opened gate stays walked-through-able').toBe('corridor')
  })
})

describe('H111 · the dark crossing ends the slice', () => {
  it('is offered, and is not a refusal', () => {
    const g = createGame(bundle())
    const before = inTheCorridor(g)
    const crossing = g.getView(before).objects.find((o) => o.id === 'dark_crossing')
    expect(crossing?.actions, 'the crossing must afford crossing').toContain('cross')

    const turn = g.act(before, CROSS)
    expect(turn.effects.some((e) => e.kind === 'refused'), 'nothing turns you back here').toBe(
      false,
    )
    expect(turn.state.refused).toEqual(before.refused)
    expect(prose(turn.effects).length, 'the world says something as you go').toBeGreaterThan(0)
  })

  it('is one way — it never puts you back up the labyrinth', () => {
    const g = createGame(bundle())
    const turn = g.act(inTheCorridor(g), CROSS)
    // How the ending is spelled is H111's business (see the header). That it
    // does not quietly walk you back to the shore is this file's.
    expect(turn.state.scene).not.toBe('shore')
    expect(turn.state.scene).not.toBe('gate')
  })
})

describe('H111 · the walk, end to end', () => {
  const WALK = [
    STONE_STUDY,
    BOOK_READ,
    PATH_FOLLOW,
    BEARER_SEARCH,
    GATE_OPEN,
    EXIT_FOLLOW,
    FLOOR_INSPECT,
    CROSS,
  ] as const

  const play = (): { state: GameState; scenes: string[]; transcript: string[] } => {
    const g = createGame(bundle())
    let s = g.newRun(SEED)
    const scenes: string[] = [s.scene]
    const transcript: string[] = []
    for (const tap of WALK) {
      const turn = g.act(s, tap)
      s = turn.state
      scenes.push(s.scene)
      transcript.push(JSON.stringify(turn.effects))
    }
    return { state: s, scenes, transcript }
  }

  it('shore → gate → corridor → the crossing, in one run', () => {
    const { state, scenes } = play()
    expect(scenes.slice(0, 4)).toEqual(['shore', 'shore', 'shore', 'gate'])
    expect(scenes).toContain('corridor')
    expect(state.journal, 'the whole slice, written down').toEqual(
      expect.arrayContaining(['procession', 'bearer', 'dust']),
    )
    expect(state.flags).toEqual(expect.arrayContaining(['knows_glyph', 'book_open', 'gate_open', 'floor_seen']))
  })

  it('replays exactly — same seed, same taps, same run', () => {
    const a = play()
    const b = play()
    expect(a.state).toEqual(b.state)
    expect(a.scenes).toEqual(b.scenes)
    expect(a.transcript).toEqual(b.transcript)
  })

  it('leaves a state that is still seven keys of JSON', () => {
    const { state } = play()
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(structuredClone(state)).toEqual(state)
    expect(Object.keys(state).sort()).toEqual(
      ['flags', 'items', 'journal', 'refused', 'rng', 'scene', 'seed'],
    )
  })
})
