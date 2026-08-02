import { describe, it, expect } from 'vitest'
import {
  emptyState,
  hasFlag,
  hasItem,
  withFlag,
  withoutFlag,
  withItem,
  withoutItem,
  refKey,
} from '../../src/core/types'

// H001 · the contract hub. State must be data — nothing here may depend on
// a class, a clock, or a live object graph (.llm/rules/purity.mdc and state-is-json.mdc).

const STATE_KEYS = ['scene', 'flags', 'items', 'journal', 'refused', 'rng', 'seed'] as const

describe('H001a · GameState is data', () => {
  it('has exactly the frozen key set', () => {
    const s = emptyState('shore', 42)
    expect(Object.keys(s).sort()).toEqual([...STATE_KEYS].sort())
  })

  it('starts empty at the named scene with the given seed', () => {
    const s = emptyState('shore', 42)
    expect(s.scene).toBe('shore')
    expect(s.seed).toBe(42)
    expect(s.flags).toEqual([])
    expect(s.items).toEqual([])
    expect(s.journal).toEqual([])
    expect(s.refused).toEqual([])
    expect(typeof s.rng).toBe('number')
  })

  it('survives JSON round-trip deep-equal', () => {
    const s = withItem(withFlag(emptyState('shore', 7), 'knows_glyph'), 'lamp')
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })

  it('survives structuredClone deep-equal', () => {
    const s = withItem(withFlag(emptyState('shore', 7), 'knows_glyph'), 'lamp')
    expect(structuredClone(s)).toEqual(s)
  })

  it('holds no non-JSON values anywhere', () => {
    const s = withFlag(emptyState('shore', 1), 'a')
    const walk = (v: unknown, path: string): void => {
      if (v === null) return
      const t = typeof v
      if (t === 'string' || t === 'number' || t === 'boolean') return
      if (Array.isArray(v)) {
        v.forEach((x, i) => walk(x, `${path}[${i}]`))
        return
      }
      expect(
        Object.getPrototypeOf(v) === Object.prototype,
        `${path} is not a plain JSON value (.llm/rules/state-is-json.mdc)`,
      ).toBe(true)
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, `${path}.${k}`)
    }
    walk(s, 'state')
  })
})

describe('H001a · helpers are pure', () => {
  it('withFlag does not mutate its argument', () => {
    const s = Object.freeze(emptyState('shore', 1))
    const next = withFlag(s, 'knows_glyph')
    expect(s.flags).toEqual([])
    expect(next.flags).toEqual(['knows_glyph'])
    expect(next).not.toBe(s)
  })

  it('withFlag is idempotent — no duplicate members', () => {
    const s = withFlag(withFlag(emptyState('shore', 1), 'a'), 'a')
    expect(s.flags).toEqual(['a'])
  })

  it('preserves insertion order', () => {
    const s = withFlag(withFlag(withFlag(emptyState('shore', 1), 'c'), 'a'), 'b')
    expect(s.flags).toEqual(['c', 'a', 'b'])
  })

  it('withoutFlag removes, and is a no-op when absent', () => {
    const s = withFlag(emptyState('shore', 1), 'a')
    expect(withoutFlag(s, 'a').flags).toEqual([])
    expect(withoutFlag(s, 'nope').flags).toEqual(['a'])
  })

  it('hasFlag / hasItem read membership', () => {
    const s = withItem(withFlag(emptyState('shore', 1), 'a'), 'lamp')
    expect(hasFlag(s, 'a')).toBe(true)
    expect(hasFlag(s, 'b')).toBe(false)
    expect(hasItem(s, 'lamp')).toBe(true)
    expect(hasItem(s, 'ash')).toBe(false)
  })

  it('item helpers behave like flag helpers', () => {
    const s = Object.freeze(emptyState('shore', 1))
    expect(withItem(s, 'lamp').items).toEqual(['lamp'])
    expect(withItem(withItem(s, 'lamp'), 'lamp').items).toEqual(['lamp'])
    expect(withoutItem(withItem(s, 'lamp'), 'lamp').items).toEqual([])
    expect(s.items).toEqual([])
  })

  it('refKey is the stable ledger key for an action', () => {
    expect(refKey({ object: 'book', action: 'read' })).toBe('book.read')
  })
})
