import { describe, it, expect } from 'vitest'
import {
  emptyState,
  hasFlag,
  hasItem,
  refKey,
  withFlag,
  withItem,
  withoutFlag,
  withoutItem,
  type GameState,
} from './types'

// A populated state — the acceptance suite only ever exercises empty-ish ones,
// and the round-trip promise is about a state that has been lived in.
const lived = (): GameState => ({
  ...withItem(withItem(withFlag(emptyState('shore', 42), 'knows_glyph'), 'lamp'), 'ash'),
  journal: ['procession'],
  refused: ['book.read'],
})

describe('emptyState', () => {
  it('opens the stream at the seed, as a uint32', () => {
    expect(emptyState('shore', 42).rng).toBe(42)
    expect(emptyState('shore', -1).rng).toBe(0xffffffff)
    expect(emptyState('shore', 0xffffffff).rng).toBe(0xffffffff)
  })

  it('keeps the seed it was handed, unchanged', () => {
    expect(emptyState('shore', -1).seed).toBe(-1)
  })

  it('gives every run its own collections', () => {
    expect(emptyState('shore', 1).flags).not.toBe(emptyState('shore', 1).flags)
  })
})

describe('JSON safety (.llm/rules/state-is-json.mdc)', () => {
  it('round-trips a lived-in state through JSON', () => {
    const s = lived()
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })

  it('round-trips a lived-in state through structuredClone', () => {
    const s = lived()
    expect(structuredClone(s)).toEqual(s)
  })

  it('holds no undefined members — JSON would drop them', () => {
    for (const v of Object.values(lived())) expect(v).toBeDefined()
  })
})

describe('with* purity', () => {
  // Freezing the arrays too: a helper that mutates in place throws here rather
  // than passing quietly on a shallow-frozen state.
  const frozen = (): GameState => {
    const s = lived()
    Object.freeze(s.flags)
    Object.freeze(s.items)
    return Object.freeze(s)
  }

  it('never writes through to the argument', () => {
    const s = frozen()
    withFlag(s, 'new')
    withoutFlag(s, 'knows_glyph')
    withItem(s, 'new')
    withoutItem(s, 'lamp')
    expect(s.flags).toEqual(['knows_glyph'])
    expect(s.items).toEqual(['lamp', 'ash'])
  })

  it('copies the collection even when nothing changes', () => {
    const s = lived()
    expect(withFlag(s, 'knows_glyph').flags).not.toBe(s.flags)
    expect(withoutFlag(s, 'absent').flags).not.toBe(s.flags)
  })

  it('leaves the other six keys alone', () => {
    const s = lived()
    const next = withFlag(s, 'lamp_lit')
    expect({ ...next, flags: s.flags }).toEqual(s)
  })
})

describe('membership', () => {
  it('appends at the end and de-duplicates in place of nothing', () => {
    const s = withItem(withItem(withItem(emptyState('shore', 1), 'lamp'), 'ash'), 'lamp')
    expect(s.items).toEqual(['lamp', 'ash'])
  })

  it('removing then re-adding moves the member to the end', () => {
    const s = withFlag(withoutFlag(withFlag(withFlag(emptyState('shore', 1), 'a'), 'b'), 'a'), 'a')
    expect(s.flags).toEqual(['b', 'a'])
  })

  it('removes every copy it can see', () => {
    const s: GameState = { ...emptyState('shore', 1), flags: ['a', 'b', 'a'] }
    expect(withoutFlag(s, 'a').flags).toEqual(['b'])
  })

  it('keeps flags and items apart', () => {
    const s = withFlag(emptyState('shore', 1), 'lamp')
    expect(hasFlag(s, 'lamp')).toBe(true)
    expect(hasItem(s, 'lamp')).toBe(false)
  })
})

describe('refKey', () => {
  it('joins object and action with a dot', () => {
    expect(refKey({ object: 'pool', action: 'touch' })).toBe('pool.touch')
  })

  it('is stable — the same ref gives the same key', () => {
    const key = refKey({ object: 'book', action: 'read' })
    expect(refKey({ object: 'book', action: 'read' })).toBe(key)
  })
})
