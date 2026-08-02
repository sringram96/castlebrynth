import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createGame, newRun } from '../../src/core/api'
import { loadBundle } from '../../src/core/bundle'
import type { Bundle } from '../../src/core/cards'

// H006 · the heart. First passing gate wins; deltas apply in VOCAB order;
// nothing mutates; the same taps always produce the same run.

const shoreBundle = (): Bundle =>
  loadBundle(JSON.parse(readFileSync(resolve(__dirname, '../../content/bundle.json'), 'utf8')))

const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object') {
    Object.values(o as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(o)
  }
  return o
}

const synth = (objects: Bundle['scenes'][string]['objects']): Bundle => ({
  v: 1,
  start: 'probe',
  scenes: { probe: { id: 'probe', line: 'A line.', objects } },
})

describe('H006a · first passing gate wins', () => {
  it('takes the first response whose gate passes, not the most specific', () => {
    const g = createGame(
      synth([
        {
          id: 'o',
          name: 'o',
          actions: {
            poke: [
              { gate: {}, say: 'first' },
              { gate: {}, say: 'second' },
            ],
          },
        },
      ]),
    )
    const { effects } = g.act(g.newRun(1), { object: 'o', action: 'poke' })
    expect(effects.find((e) => e.kind === 'say')).toMatchObject({ text: 'first' })
  })

  it('skips a gate that does not pass', () => {
    const g = createGame(
      synth([
        {
          id: 'o',
          name: 'o',
          actions: {
            poke: [
              { gate: { flag: ['never'] }, say: 'gated' },
              { say: 'fallback' },
            ],
          },
        },
      ]),
    )
    const { effects } = g.act(g.newRun(1), { object: 'o', action: 'poke' })
    expect(effects.find((e) => e.kind === 'say')).toMatchObject({ text: 'fallback' })
  })

  it('treats a multi-condition gate as a conjunction', () => {
    const b = synth([
      {
        id: 'o',
        name: 'o',
        actions: {
          arm: [{ setFlag: ['a'], say: 'armed' }],
          poke: [
            { gate: { flag: ['a', 'b'] }, say: 'both' },
            { say: 'fallback' },
          ],
        },
      },
    ])
    const g = createGame(b)
    const armed = g.act(g.newRun(1), { object: 'o', action: 'arm' }).state
    const { effects } = g.act(armed, { object: 'o', action: 'poke' })
    expect(effects.find((e) => e.kind === 'say')).toMatchObject({ text: 'fallback' })
  })
})

describe('H006a · deltas apply in VOCAB order, not file order', () => {
  it('setFlag (2) precedes clearFlag (3) regardless of key order', () => {
    const g = createGame(
      synth([
        {
          id: 'o',
          name: 'o',
          // clearFlag written first; VOCAB order must still run setFlag first,
          // so the flag ends up cleared.
          actions: { poke: [{ clearFlag: ['a'], setFlag: ['a'], say: 'x' }] },
        },
      ]),
    )
    const { state } = g.act(g.newRun(1), { object: 'o', action: 'poke' })
    expect(state.flags).not.toContain('a')
  })

  it('addItem (4) precedes removeItem (5)', () => {
    const g = createGame(
      synth([
        {
          id: 'o',
          name: 'o',
          actions: { poke: [{ removeItem: ['lamp'], addItem: ['lamp'], say: 'x' }] },
        },
      ]),
    )
    const { state } = g.act(g.newRun(1), { object: 'o', action: 'poke' })
    expect(state.items).not.toContain('lamp')
  })

  it('journal (8) precedes goto (9) — the entry belongs to the scene you left', () => {
    const b: Bundle = {
      v: 1,
      start: 'probe',
      scenes: {
        probe: {
          id: 'probe',
          line: 'A line.',
          objects: [
            { id: 'o', name: 'o', actions: { go: [{ goto: 'far', journal: ['mark'], say: 'x' }] } },
          ],
        },
        far: { id: 'far', line: 'Another line.', objects: [] },
      },
    }
    const g = createGame(b)
    const { state } = g.act(g.newRun(1), { object: 'o', action: 'go' })
    expect(state.journal).toEqual(['mark'])
    expect(state.scene).toBe('far')
  })
})

describe('H006a · the refusal ledger', () => {
  it('ledgers a refusal and changes nothing else', () => {
    const g = createGame(
      synth([
        { id: 'o', name: 'o', actions: { poke: [{ refuse: 'It holds fast.' }] } },
      ]),
    )
    const before = g.newRun(1)
    const { state, effects } = g.act(before, { object: 'o', action: 'poke' })
    expect(state.refused).toEqual(['o.poke'])
    expect(state.flags).toEqual(before.flags)
    expect(state.items).toEqual(before.items)
    expect(state.journal).toEqual(before.journal)
    expect(state.scene).toBe(before.scene)
    expect(effects).toContainEqual({
      kind: 'refused',
      ref: { object: 'o', action: 'poke' },
      line: 'It holds fast.',
    })
  })

  it('does not duplicate a ledger entry on a second refusal', () => {
    const g = createGame(
      synth([{ id: 'o', name: 'o', actions: { poke: [{ refuse: 'It holds fast.' }] } }]),
    )
    let s = g.newRun(1)
    s = g.act(s, { object: 'o', action: 'poke' }).state
    s = g.act(s, { object: 'o', action: 'poke' }).state
    expect(s.refused).toEqual(['o.poke'])
  })
})

describe('H006a · object sets change only by delta (LAWS.md §affordance)', () => {
  it('addObject brings an object into view', () => {
    const g = createGame(
      synth([
        { id: 'o', name: 'o', actions: { poke: [{ addObject: ['ash'], say: 'x' }] } },
        { id: 'ash', name: 'ash', actions: { look: [{ say: 'Grey.' }] }, hidden: true },
      ]),
    )
    const start = g.newRun(1)
    expect(g.getView(start).objects.map((o) => o.id)).not.toContain('ash')
    const { state } = g.act(start, { object: 'o', action: 'poke' })
    expect(g.getView(state).objects.map((o) => o.id)).toContain('ash')
  })

  it('removeObject takes one away', () => {
    const g = createGame(
      synth([
        { id: 'o', name: 'o', actions: { poke: [{ removeObject: ['o'], say: 'x' }] } },
      ]),
    )
    const { state } = g.act(g.newRun(1), { object: 'o', action: 'poke' })
    expect(g.getView(state).objects.map((o) => o.id)).not.toContain('o')
  })

  it('a flag alone never changes the object set', () => {
    const g = createGame(
      synth([
        { id: 'o', name: 'o', actions: { poke: [{ setFlag: ['a'], say: 'x' }] } },
      ]),
    )
    const start = g.newRun(1)
    const { state } = g.act(start, { object: 'o', action: 'poke' })
    expect(g.getView(state).objects.map((o) => o.id)).toEqual(
      g.getView(start).objects.map((o) => o.id),
    )
  })
})

describe('H006b · GameAPI', () => {
  it('newRun starts at the bundle start scene with the given seed', () => {
    const b = shoreBundle()
    const s = newRun(42, b)
    expect(s.scene).toBe(b.start)
    expect(s.seed).toBe(42)
    expect(s.journal).toEqual([])
    expect(s.refused).toEqual([])
  })

  it('getView reports the scene line and the objects with their actions', () => {
    const g = createGame(shoreBundle())
    const v = g.getView(g.newRun(42))
    expect(typeof v.line).toBe('string')
    expect(v.scene).toBe('shore')
    const book = v.objects.find((o) => o.id === 'book')
    expect(book?.actions).toContain('read')
  })

  it('act does not mutate the state it was handed', () => {
    const g = createGame(shoreBundle())
    const before = deepFreeze(g.newRun(42))
    const snapshot = JSON.stringify(before)
    expect(() => g.act(before, { object: 'book', action: 'read' })).not.toThrow()
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('getView does not mutate', () => {
    const g = createGame(shoreBundle())
    const s = deepFreeze(g.newRun(42))
    const snapshot = JSON.stringify(s)
    g.getView(s)
    expect(JSON.stringify(s)).toBe(snapshot)
  })

  it('act returns state that is still JSON-safe', () => {
    const g = createGame(shoreBundle())
    const { state } = g.act(g.newRun(42), { object: 'stone', action: 'study' })
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(structuredClone(state)).toEqual(state)
  })

  it('an unknown object or action is a no-op, not a crash', () => {
    const g = createGame(shoreBundle())
    const s = g.newRun(42)
    expect(() => g.act(s, { object: 'nothing', action: 'poke' })).not.toThrow()
    expect(g.act(s, { object: 'nothing', action: 'poke' }).state).toEqual(s)
    expect(g.act(s, { object: 'book', action: 'juggle' }).state).toEqual(s)
  })

  it('replays deterministically — same seed, same taps, same state', () => {
    const taps = [
      { object: 'book', action: 'read' },
      { object: 'stone', action: 'study' },
      { object: 'book', action: 'read' },
      { object: 'pool', action: 'look' },
    ]
    const run = () => {
      const g = createGame(shoreBundle())
      let s = g.newRun(42)
      for (const t of taps) s = g.act(s, t).state
      return s
    }
    expect(run()).toEqual(run())
  })
})
