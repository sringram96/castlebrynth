import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import { createGame } from '../../src/core/api'
import { loadBundle } from '../../src/core/bundle'
import type { Effect } from '../../src/core/api-types'
import type { Bundle } from '../../src/core/cards'

// H000 · THE ROOT ACCEPTANCE.
//
// This is the whole of phase zero in one test: the door refuses, the stone
// teaches, the same tap opens. If this is green, the atom exists.
//
// It is authored by convention, ahead of every card. No agent may edit it
// (AGENTS.md law 3). The agent assigned H000 runs it, finds it green, and
// reports "already satisfied" — that is the card working as designed.

// The world comes from the scene as it was authored, through the same
// `loadBundle` every consumer goes through. It is read from the yaml rather
// than from content/bundle.json because those two shapes disagree today: the
// compiler writes the parsed Scene, whose `objects` is a list, and
// `loadBundle` validates through `parseScene`, which reads the authored shape
// — a mapping keyed by object id. The root acceptance is about the world, not
// about the file the world is cached in.
const SCENE = resolve(__dirname, '../../content/crossing.yaml')

const bundle = (): Bundle =>
  loadBundle({ v: 1, start: 'crossing', scenes: { crossing: yaml.load(readFileSync(SCENE, 'utf8')) } })

const DOOR_OPEN = { object: 'door', action: 'open' } as const
const STONE_STUDY = { object: 'stone', action: 'study' } as const
const STEPS_DESCEND = { object: 'steps', action: 'descend' } as const

/** The arc, as one list: refuse · teach · open · leave. */
const ARC = [DOOR_OPEN, STONE_STUDY, DOOR_OPEN, STEPS_DESCEND] as const

/** The effects of one kind, narrowed — an effect list is a union on `kind`. */
const of = <K extends Effect['kind']>(
  effects: readonly Effect[],
  kind: K,
): readonly Extract<Effect, { kind: K }>[] =>
  effects.filter((e): e is Extract<Effect, { kind: K }> => e.kind === kind)

describe('H000 · the door refuses, then the door opens', () => {
  it('runs the whole arc', () => {
    const g = createGame(bundle())
    const start = g.newRun(42)

    // — the world, before anything —
    expect(start.scene).toBe('crossing')
    expect(start.journal).toEqual([])
    expect(start.refused).toEqual([])
    expect(start.flags).toEqual([])
    expect(start.items).toEqual([])

    // — tap the door. it refuses, and the world remembers being asked —
    const first = g.act(start, DOOR_OPEN)
    const refusals = of(first.effects, 'refused')
    expect(refusals.length, 'the door must refuse a hand that cannot read the mark').toBe(1)
    const refusal = refusals[0]!
    expect(refusal.ref).toEqual({ object: 'door', action: 'open' })
    expect(first.state.refused).toContain('door.open')

    // The refusal is `refuse: true`, so the line it turns you away with is the
    // response's own `say` — spoken, not swallowed, and spoken once. It rides
    // the refusal itself, which is the only prose this turn produces: a second
    // copy as a `say` would print the same sentence twice.
    expect(refusal.line.length, 'a refusal names what you lack').toBeGreaterThan(0)
    expect(
      of(first.effects, 'say').map((e) => e.text),
      'the refusal line goes out once, on the refusal — never again as prose',
    ).toEqual([])
    expect(first.effects.length, 'a refusal is the whole of what the turn said').toBe(1)

    expect(first.state.journal, 'a refusal journals nothing').toEqual([])
    expect(first.state.flags, 'a refusal changes nothing (VOCAB refuse purity)').toEqual([])

    // The same law, stated whole, so a delta smuggled into a refusal has
    // nowhere to hide: the ledger moves and nothing else in the state does.
    expect(first.state, 'a refusal changes nothing but the ledger').toEqual({
      ...start,
      refused: ['door.open'],
    })

    // — study the stone. it teaches —
    const taught = g.act(first.state, STONE_STUDY)
    expect(taught.state.flags).toContain('knows_mark')
    expect(taught.state.journal).toEqual(['the_mark'])
    expect(of(taught.effects, 'journal').map((e) => e.entry)).toEqual(['the_mark'])

    // — the same tap. now it opens —
    const opened = g.act(taught.state, DOOR_OPEN)
    expect(of(opened.effects, 'refused'), 'must not refuse now').toEqual([])
    expect(opened.state.flags).toContain('door_open')
    expect(opened.state.journal, 'the journal gains the entry, in order').toEqual([
      'the_mark',
      'the_way_down',
    ])

    // — the refusal stays on the record. the world does not forget —
    expect(opened.state.refused).toContain('door.open')

    // — the steps. the slice ends —
    const gone = g.act(opened.state, STEPS_DESCEND)
    const ends = of(gone.effects, 'end')
    expect(ends.length, 'an open door lets the steps end the slice').toBe(1)
    expect(ends[0]!.line.length).toBeGreaterThan(0)
    expect(gone.state.scene, 'an end is an end, not a goto').toBe('crossing')
  })

  it('holds the object set constant for the whole run', () => {
    const g = createGame(bundle())
    let s = g.newRun(42)
    const ids = () =>
      g
        .getView(s)
        .objects.map((o) => o.id)
        .sort()
    const before = ids()
    expect(before.length).toBeGreaterThan(0)

    // Every thing in view carries its free tap and what it affords, so the
    // shell can describe and offer without asking the world to move
    // (GAME.md #input).
    for (const o of g.getView(s).objects) {
      expect(o.tap.length, `${o.id} must have a free tap`).toBeGreaterThan(0)
      expect(o.actions.length, `${o.id} must afford something`).toBeGreaterThan(0)
    }

    // Drawing the moment is not playing it.
    const untouched = structuredClone(s)
    g.getView(s)
    expect(s, 'getView moves nothing').toEqual(untouched)

    for (const tap of ARC) {
      s = g.act(s, tap).state
      expect(ids(), 'nothing appears or vanishes in the Crossing').toEqual(before)
    }
  })

  it('is the same run every time, from the same seed and the same taps', () => {
    const play = () => {
      const g = createGame(bundle())
      let s = g.newRun(42)
      const lines: string[] = []
      for (const tap of ARC) {
        const r = g.act(s, tap)
        s = r.state
        lines.push(JSON.stringify(r.effects))
      }
      return { state: s, lines }
    }
    const a = play()
    const b = play()
    expect(a.state).toEqual(b.state)
    expect(a.lines).toEqual(b.lines)
  })

  it('leaves a state that saves and restores unchanged', () => {
    const g = createGame(bundle())
    let s = g.newRun(42)
    for (const tap of ARC) s = g.act(s, tap).state
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    expect(structuredClone(s)).toEqual(s)
  })

  it('order matters — studying first means the door never refuses', () => {
    // There is no negation in the vocabulary. "Does not know the mark" is the
    // gateless fallback, reached only because the gated branch above it did not
    // pass — so knowing first is what makes the fallback unreachable.
    const g = createGame(bundle())
    let s = g.newRun(42)
    s = g.act(s, STONE_STUDY).state
    const r = g.act(s, DOOR_OPEN)
    expect(of(r.effects, 'refused')).toEqual([])
    expect(r.state.refused).toEqual([])
    expect(r.state.journal).toContain('the_way_down')
  })

  it('order matters — the steps refuse until the door is open', () => {
    // The other half of the same law: the fallback fires, and says so, while
    // the gate above it is unsatisfied.
    const g = createGame(bundle())
    const s = g.newRun(42)
    const barred = g.act(s, STEPS_DESCEND)
    expect(of(barred.effects, 'refused').length, 'the way down is barred').toBe(1)
    expect(of(barred.effects, 'end'), 'a refusal ends nothing').toEqual([])
    expect(barred.state.refused).toEqual(['steps.descend'])
    expect(barred.state.flags).toEqual([])
  })
})
