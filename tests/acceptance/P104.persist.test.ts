import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { save, restore, SAVE_KEY } from '../../src/shell/persist'
import { loadBundle } from '../../src/core/bundle'
import { createGame } from '../../src/core/api'
import { emptyState, withFlag, withItem } from '../../src/core/types'
import type { Bundle } from '../../src/core/cards'

// P104 · the run survives the app closing. A corrupt save is a new run, not an
// error the person ever sees.

const bundle = (): Bundle =>
  loadBundle(JSON.parse(readFileSync(resolve(__dirname, '../../content/bundle.json'), 'utf8')))

/** The smallest thing that satisfies Storage. Keeps the test out of a browser. */
const fakeStorage = (seed: Record<string, string> = {}): Storage => {
  const map = new Map(Object.entries(seed))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage
}

const played = () => withItem(withFlag(emptyState('shore', 42), 'knows_glyph'), 'lamp')

describe('P104 · round trip', () => {
  it('restores a state that deep-equals the one saved', () => {
    const store = fakeStorage()
    const s = played()
    save(store, s)
    expect(restore(store, bundle())).toEqual(s)
  })

  it('survives a full run of taps', () => {
    const g = createGame(bundle())
    let s = g.newRun(42)
    for (const tap of [
      { object: 'book', action: 'read' },
      { object: 'stone', action: 'study' },
      { object: 'book', action: 'read' },
    ]) {
      s = g.act(s, tap).state
    }
    const store = fakeStorage()
    save(store, s)
    const back = restore(store, bundle())
    expect(back).toEqual(s)
    expect(back.journal).toContain('procession')
    expect(back.refused).toContain('book.read')
  })

  it('writes the versioned envelope from src/core/save.ts, not a second format', () => {
    const store = fakeStorage()
    save(store, played())
    const written = [...Array(store.length).keys()].map((i) => store.getItem(store.key(i)!)!)
    expect(written.length).toBeGreaterThan(0)
    const envelope = JSON.parse(written[0]!)
    expect(envelope.v).toBe(1)
    expect(envelope.state).toBeDefined()
  })

  it('overwrites rather than accumulating', () => {
    const store = fakeStorage()
    save(store, played())
    save(store, emptyState('shore', 42))
    expect(store.length).toBe(1)
  })
})

describe('P104 · a bad save is a new run, quietly', () => {
  const bad: [string, Record<string, string>][] = [
    ['nothing stored', {}],
    ['empty string', { [SAVE_KEY]: '' }],
    ['not json', { [SAVE_KEY]: 'not json' }],
    ['truncated', { [SAVE_KEY]: '{"v":1,"state":{' }],
    ['wrong version', { [SAVE_KEY]: '{"v":2,"state":{}}' }],
    ['missing fields', { [SAVE_KEY]: '{"v":1,"state":{"scene":"shore"}}' }],
    ['json null', { [SAVE_KEY]: 'null' }],
  ]

  for (const [name, seed] of bad) {
    it(`returns a fresh run on ${name}`, () => {
      const b = bundle()
      let out: unknown
      expect(() => {
        out = restore(fakeStorage(seed), b)
      }, 'restore must never throw').not.toThrow()
      const state = out as ReturnType<typeof emptyState>
      expect(state).not.toBeNull()
      expect(state.scene).toBe(b.start)
      expect(state.journal).toEqual([])
      expect(state.refused).toEqual([])
    })
  }

  it('survives every truncation of a real save', () => {
    const store = fakeStorage()
    save(store, played())
    const raw = store.getItem(store.key(0)!)!
    const b = bundle()
    for (let i = 0; i < raw.length; i++) {
      expect(() => restore(fakeStorage({ [SAVE_KEY]: raw.slice(0, i) }), b)).not.toThrow()
    }
  })
})

describe('P104 · it does not reach for the browser', () => {
  it('takes storage as a parameter rather than importing localStorage', () => {
    const src = readFileSync(resolve(__dirname, '../../src/shell/persist.ts'), 'utf8')
    expect(src, 'persist.ts must not reach for a global').not.toMatch(
      /(?:window\.|globalThis\.)?\blocalStorage\b\s*[.[]/,
    )
  })
})
