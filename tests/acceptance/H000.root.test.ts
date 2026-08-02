import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createGame } from '../../src/core/api'
import { loadBundle } from '../../src/core/bundle'
import type { Bundle } from '../../src/core/cards'

// H000 · THE ROOT ACCEPTANCE.
//
// This is the whole of phase zero in one test: the book refuses, the stone
// teaches, the same tap opens. If this is green, the atom exists.
//
// It is authored by convention, ahead of every card. No agent may edit it
// (AGENTS.md law 3). The agent assigned H000 runs it, finds it green, and
// reports "already satisfied" — that is the card working as designed.

const bundle = (): Bundle =>
  loadBundle(JSON.parse(readFileSync(resolve(__dirname, '../../content/bundle.json'), 'utf8')))

const BOOK_READ = { object: 'book', action: 'read' } as const
const STONE_STUDY = { object: 'stone', action: 'study' } as const

describe('H000 · the book refuses, then the book opens', () => {
  it('runs the whole arc', () => {
    const g = createGame(bundle())
    const start = g.newRun(42)

    // — the world, before anything —
    expect(start.scene).toBe('shore')
    expect(start.journal).toEqual([])
    expect(start.refused).toEqual([])
    expect(start.flags).toEqual([])

    // — tap the book. it refuses, and the world remembers being asked —
    const first = g.act(start, BOOK_READ)
    const refusal = first.effects.find((e) => e.kind === 'refused')
    expect(refusal, 'the book must refuse an unglyphed reader').toBeDefined()
    expect(first.state.refused).toContain('book.read')
    expect(first.state.journal, 'a refusal journals nothing').toEqual([])
    expect(first.state.flags, 'a refusal changes nothing (VOCAB refuse purity)').toEqual([])

    // — study the stone. it teaches —
    const taught = g.act(first.state, STONE_STUDY)
    expect(taught.state.flags).toContain('knows_glyph')

    // — the same tap. now it opens —
    const opened = g.act(taught.state, BOOK_READ)
    expect(opened.effects.some((e) => e.kind === 'refused'), 'must not refuse now').toBe(false)
    expect(opened.state.journal).toContain('procession')

    // — the refusal stays on the record. the world does not forget —
    expect(opened.state.refused).toContain('book.read')
  })

  it('holds the object set constant for the whole run', () => {
    const g = createGame(bundle())
    let s = g.newRun(42)
    const ids = () => g.getView(s).objects.map((o) => o.id).sort()
    const before = ids()
    expect(before.length).toBeGreaterThan(0)

    for (const tap of [BOOK_READ, STONE_STUDY, BOOK_READ]) {
      s = g.act(s, tap).state
      expect(ids(), 'nothing appears or vanishes on the shore').toEqual(before)
    }
  })

  it('is the same run every time, from the same seed and the same taps', () => {
    const play = () => {
      const g = createGame(bundle())
      let s = g.newRun(42)
      const lines: string[] = []
      for (const tap of [BOOK_READ, STONE_STUDY, BOOK_READ]) {
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
    for (const tap of [BOOK_READ, STONE_STUDY, BOOK_READ]) s = g.act(s, tap).state
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    expect(structuredClone(s)).toEqual(s)
  })

  it('order matters — studying first means the book never refuses', () => {
    const g = createGame(bundle())
    let s = g.newRun(42)
    s = g.act(s, STONE_STUDY).state
    const r = g.act(s, BOOK_READ)
    expect(r.effects.some((e) => e.kind === 'refused')).toBe(false)
    expect(r.state.refused).toEqual([])
    expect(r.state.journal).toContain('procession')
  })
})
