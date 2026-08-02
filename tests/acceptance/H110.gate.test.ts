import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createGame } from '../../src/core/api'
import type { Game } from '../../src/core/api'
import { loadBundle } from '../../src/core/bundle'
import type { Effect } from '../../src/core/api-types'
import type { Bundle } from '../../src/core/cards'
import type { GameState } from '../../src/core/types'

// H110 · THE GATE — content/gate.yaml, headless, through GameAPI.
//
// The shore taught you to read; the gate asks you to pay attention. A locked
// thing, a dead thing that is holding what opens it, and a wall with writing on
// it you can only half use.
//
// Authored ahead of the card (AGENTS.md law 7) and red until H110 lands. It
// names the ids H110 must author, because an acceptance that guessed at them
// afterwards would be a second opinion about the world:
//
//   scene    gate
//   objects  iron_gate.open · dead_bearer.search · mural.read
//   flag     gate_open
//   item     rusted_key
//   journal  bearer (the search) · toll (the mural, read deeply)
//
// The shore's `path follow` regains its goto and points here.
//
// H111 adds an `exit` to this same scene, so nothing below counts the gate's
// objects or pins its object set exactly — this file must still be green after
// the corridor lands behind it.

const SEED = 42

const bundle = (): Bundle =>
  loadBundle(JSON.parse(readFileSync(resolve(__dirname, '../../content/bundle.json'), 'utf8')))

const STONE_STUDY = { object: 'stone', action: 'study' } as const
const BOOK_READ = { object: 'book', action: 'read' } as const
const PATH_FOLLOW = { object: 'path', action: 'follow' } as const

const GATE_OPEN = { object: 'iron_gate', action: 'open' } as const
const BEARER_SEARCH = { object: 'dead_bearer', action: 'search' } as const
const MURAL_READ = { object: 'mural', action: 'read' } as const

/** Everything the narrator said this turn, refusals included. */
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

const count = (list: readonly string[], member: string): number =>
  list.filter((m) => m === member).length

const ids = (g: Game, s: GameState): string[] => g.getView(s).objects.map((o) => o.id)

/** The shore, played the only way it opens, and then up the path. */
const atTheGate = (g: Game): GameState => {
  let s = g.newRun(SEED)
  s = g.act(s, STONE_STUDY).state
  s = g.act(s, BOOK_READ).state
  s = g.act(s, PATH_FOLLOW).state
  return s
}

describe('H110 · the path off the shore arrives somewhere', () => {
  it('refuses until the book is open, and ledgers being asked', () => {
    const g = createGame(bundle())
    const start = g.newRun(SEED)

    const turned = g.act(start, PATH_FOLLOW)
    expect(turned.effects.some((e) => e.kind === 'refused')).toBe(true)
    expect(turned.state.refused).toContain('path.follow')
    expect(turned.state.scene, 'a refusal moves nobody').toBe('shore')
  })

  it('reaches the gate once the book has opened', () => {
    const g = createGame(bundle())
    const s = atTheGate(g)
    expect(s.scene).toBe('gate')

    const v = g.getView(s)
    expect(v.line.length, 'the gate stands under a line of its own').toBeGreaterThan(0)
    expect(ids(g, s)).toEqual(expect.arrayContaining(['iron_gate', 'dead_bearer', 'mural']))
  })

  it('the refusal stays on the record after the path opens', () => {
    const g = createGame(bundle())
    let s = g.newRun(SEED)
    s = g.act(s, PATH_FOLLOW).state
    s = g.act(s, STONE_STUDY).state
    s = g.act(s, BOOK_READ).state
    s = g.act(s, PATH_FOLLOW).state
    expect(s.scene).toBe('gate')
    expect(s.refused, 'the world does not forget being asked').toContain('path.follow')
  })
})

describe('H110 · the iron gate is locked, and says what by', () => {
  it('refuses without the key, and the refusal wants it by name', () => {
    const g = createGame(bundle())
    const before = atTheGate(g)
    const turn = g.act(before, GATE_OPEN)

    expect(turn.effects.some((e) => e.kind === 'refused'), 'a locked gate refuses').toBe(true)
    expect(turn.state.refused, 'the ledger is the compass (GAME.md #progress)').toContain(
      'iron_gate.open',
    )
    // LAWS.md #gates — a response that blocks required progress declares its
    // key. Not "it will not budge": the thing that would open it.
    expect(prose(turn.effects), 'the refusal must name the key').toMatch(/\bkey\b/i)
    // The narrator speaks the world, never the engine's bookkeeping.
    expect(prose(turn.effects)).not.toContain('rusted_key')

    // VOCAB.md refuse purity — a refusal changes nothing but the ledger.
    expect(turn.state.flags).toEqual(before.flags)
    expect(turn.state.items).toEqual(before.items)
    expect(turn.state.journal).toEqual(before.journal)
    expect(turn.state.scene).toBe(before.scene)
  })

  it('opens with the key, consumes it, and sets gate_open', () => {
    const g = createGame(bundle())
    let s = atTheGate(g)
    s = g.act(s, BEARER_SEARCH).state
    expect(s.items, 'the bearer is holding what opens it').toContain('rusted_key')

    const opened = g.act(s, GATE_OPEN)
    expect(opened.effects.some((e) => e.kind === 'refused'), 'the key must not be refused').toBe(
      false,
    )
    expect(opened.state.flags).toContain('gate_open')
    expect(opened.state.items, 'keys are consumables (GAME.md #items)').not.toContain('rusted_key')
  })

  it('opens exactly once — a second open re-opens nothing and costs nothing', () => {
    const g = createGame(bundle())
    let s = atTheGate(g)
    s = g.act(s, BEARER_SEARCH).state
    const opened = g.act(s, GATE_OPEN).state
    expect(opened.flags, 'the first open must actually open it').toContain('gate_open')

    const again = g.act(opened, GATE_OPEN)
    expect(again.state, 'a gate already open has nothing left to change').toEqual(opened)
    // An open gate turned nobody away, so nothing about it belongs in the
    // ledger a second time.
    expect(again.state.refused).toEqual(opened.refused)
  })
})

describe('H110 · the dead bearer gives up the key once', () => {
  it('gives rusted_key and lands a journal entry', () => {
    const g = createGame(bundle())
    const before = atTheGate(g)
    const turn = g.act(before, BEARER_SEARCH)

    expect(turn.state.items).toContain('rusted_key')
    expect(turn.state.journal, 'searching him is a thing you did').toContain('bearer')
    expect(entries(turn.effects), 'the entry is announced, not left to be diffed').toContain(
      'bearer',
    )
    expect(turn.effects.some((e) => e.kind === 'refused')).toBe(false)
  })

  it('once, and only once — a second search adds nothing', () => {
    const g = createGame(bundle())
    let s = atTheGate(g)
    s = g.act(s, BEARER_SEARCH).state
    const twice = g.act(s, BEARER_SEARCH).state

    expect(count(twice.items, 'rusted_key'), 'one key, not two').toBe(1)
    expect(count(twice.journal, 'bearer'), 'one entry, not two').toBe(1)
  })

  it('does not hand the key back after the gate has taken it', () => {
    const g = createGame(bundle())
    let s = atTheGate(g)
    s = g.act(s, BEARER_SEARCH).state
    s = g.act(s, GATE_OPEN).state
    expect(s.items).not.toContain('rusted_key')

    const after = g.act(s, BEARER_SEARCH).state
    expect(after.items, 'he has nothing else to give').not.toContain('rusted_key')
    expect(count(after.journal, 'bearer')).toBe(1)
  })
})

describe('H110 · the mural is a script you cannot read', () => {
  it('answers anyone, gated on nothing, and gives no lore unread', () => {
    const g = createGame(bundle())
    // Reachable play always arrives here glyphed — the shore will not open the
    // path otherwise — so the fallback is reached by standing at the gate
    // without the knowledge, which is what the fallback is for.
    const unlettered: GameState = { ...g.newRun(SEED), scene: 'gate' }
    expect(g.getView(unlettered).objects.map((o) => o.id)).toContain('mural')

    const turn = g.act(unlettered, MURAL_READ)
    expect(prose(turn.effects).length, '"it is a wall of writing" is a complete answer').toBeGreaterThan(0)
    expect(turn.state.journal, 'nothing is learned from marks you cannot hold').not.toContain('toll')
  })

  it('reads deeply with knows_glyph, and lands the toll', () => {
    const g = createGame(bundle())
    const s = atTheGate(g)
    expect(s.flags, 'the shore taught this before it let you leave').toContain('knows_glyph')

    const turn = g.act(s, MURAL_READ)
    expect(turn.state.journal).toContain('toll')
    expect(entries(turn.effects)).toContain('toll')
  })

  it('says what the toll was and never who takes it (TRUTH.md tiers)', () => {
    const g = createGame(bundle())
    const s = atTheGate(g)
    const said = prose(g.act(s, MURAL_READ).effects)
    expect(said.length, 'a mural read deeply has something to say').toBeGreaterThan(0)

    // T1 may carry the crossing and its memory toll. The taker, the rite and
    // the child are T2 and above, and LAWS.md #spoiler is not a taste.
    for (const forbidden of [/morning\s+king/i, /satan/i, /\bchild\b/i, /\bbrother\b/i, /\binfant\b/i]) {
      expect(said, `the mural reached above its tier: ${String(forbidden)}`).not.toMatch(forbidden)
    }
  })
})

describe('H110 · the gate is the same gate every time', () => {
  const TAPS = [
    STONE_STUDY,
    BOOK_READ,
    PATH_FOLLOW,
    GATE_OPEN,
    MURAL_READ,
    BEARER_SEARCH,
    GATE_OPEN,
    GATE_OPEN,
  ] as const

  const play = (): { state: GameState; transcript: string[] } => {
    const g = createGame(bundle())
    let s = g.newRun(SEED)
    const transcript: string[] = []
    for (const tap of TAPS) {
      const turn = g.act(s, tap)
      s = turn.state
      transcript.push(JSON.stringify(turn.effects))
    }
    return { state: s, transcript }
  }

  it('replays exactly — same seed, same taps, same state', () => {
    const a = play()
    const b = play()
    expect(a.state).toEqual(b.state)
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

  it('keeps its affordances constant while you work on it (LAWS.md #affordance)', () => {
    const g = createGame(bundle())
    let s = atTheGate(g)
    // Deliberately not the whole object set: H111 hangs an exit here on
    // gate_open, and an object arriving by delta with a cause is legal. What is
    // not legal is a thing on screen quietly changing what it affords.
    const affords = (id: string): readonly string[] =>
      [...(g.getView(s).objects.find((o) => o.id === id)?.actions ?? [])].sort()
    const bearer = affords('dead_bearer')
    const mural = affords('mural')
    expect(bearer.length).toBeGreaterThan(0)
    expect(mural.length).toBeGreaterThan(0)

    for (const tap of [MURAL_READ, GATE_OPEN, BEARER_SEARCH, GATE_OPEN]) {
      s = g.act(s, tap).state
      expect(s.scene, 'nothing on the gate walks you off it').toBe('gate')
      expect(affords('dead_bearer'), 'the bearer changed what he affords').toEqual(bearer)
      expect(affords('mural'), 'the mural changed what it affords').toEqual(mural)
    }
  })
})
