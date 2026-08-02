// H102 acceptance · the skin is data, and its names are the contract.
//
// H115 re-skins the game by editing values in theme.ts. Nothing here asserts a
// value, on purpose: a test that pinned `bg` to `#191d20` would turn red the
// moment the art pass did its job, and H115's scope cannot reach this file to
// fix it. What is pinned is the token *names*, because H103/H104/H105 read
// them and a silent rename is a shell drawing with `undefined`.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { theme } from './theme'

// Not `new URL(...)`: these tests run under happy-dom (H101's
// environmentMatchGlobs), whose global URL is its own, and node's fs
// rejects it — "The URL must be of scheme file". fileURLToPath is the
// one spelling that survives both environments.
const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'theme.ts'), 'utf8')

/** Every leaf, as `color.bg` → value. */
function leaves(node: unknown, path: string[] = []): [string, unknown][] {
  if (typeof node !== 'object' || node === null) return [[path.join('.'), node]]
  return Object.entries(node).flatMap(([key, value]) => leaves(value, [...path, key]))
}

describe('the tokens are data', () => {
  it('is strings all the way down — no functions, no behaviour', () => {
    for (const [path, value] of leaves(theme)) {
      expect(typeof value, path).toBe('string')
      expect((value as string).trim(), path).not.toBe('')
    }
  })

  it('imports nothing, so a token needs no boot to be read', () => {
    expect(SOURCE).not.toMatch(/^\s*import\s/m)
  })

  it('survives JSON unchanged, like the state it dresses', () => {
    expect(JSON.parse(JSON.stringify(theme))).toEqual(theme)
    expect(structuredClone(theme)).toEqual(theme)
  })

  it('is frozen through, so a shell cannot re-skin itself by accident', () => {
    expect(Object.isFrozen(theme)).toBe(true)
    for (const group of Object.values(theme)) expect(Object.isFrozen(group)).toBe(true)
    for (const group of Object.values(theme.type)) {
      if (typeof group === 'object') expect(Object.isFrozen(group)).toBe(true)
    }
    // ESM is strict mode: the write throws rather than quietly doing nothing.
    expect(() => {
      ;(theme.color as { bg: string }).bg = '#ff00ff'
    }).toThrow()
    expect(theme.color.bg).not.toBe('#ff00ff')
  })

  it('reads the same every time — the theme is a lookup, not a lifecycle', () => {
    const once = leaves(theme)
    const twice = leaves(theme)
    expect(twice).toEqual(once)
    expect(once.length).toBeGreaterThan(20)
  })
})

describe('the names are the contract', () => {
  it('has exactly the five groups', () => {
    expect(Object.keys(theme).sort()).toEqual(['color', 'frame', 'radius', 'space', 'type'])
  })

  it('keeps the palette the mock drew, by the mock’s own names', () => {
    // mock/slice-mvp.html `:root` — bg, panel, edge, text, dim, sel, bad, key.
    // The rest are the surfaces the mock spelled inline and the panel needs.
    expect(Object.keys(theme.color).sort()).toEqual([
      'bad',
      'bg',
      'dim',
      'edge',
      'key',
      'panel',
      'rule',
      'sel',
      'slot',
      'slotEmpty',
      'tap',
      'tapActive',
      'text',
      'wire',
    ])
  })

  it('does not carry the vignette aperture — that is state, not skin', () => {
    // `--open` moves with sanity every time `paintAll()` runs (GAME.md #frame).
    expect(theme.color).not.toHaveProperty('open')
    expect(Object.keys(theme.frame)).not.toContain('open')
  })

  it('keeps the scales and the layout constants', () => {
    expect(Object.keys(theme.space).sort()).toEqual(['lg', 'md', 'sm', 'xl', 'xs'])
    expect(Object.keys(theme.radius).sort()).toEqual(['lg', 'md', 'sm'])
    expect(Object.keys(theme.frame).sort()).toEqual([
      'hairline',
      'minTap',
      'narrator',
      'panel',
    ])
    expect(Object.keys(theme.type).sort()).toEqual([
      'leading',
      'prose',
      'size',
      'track',
      'ui',
    ])
    expect(Object.keys(theme.type.size).sort()).toEqual([
      'action',
      'caption',
      'label',
      'meta',
      'micro',
      'prose',
    ])
    expect(Object.keys(theme.type.track).sort()).toEqual(['action', 'block', 'label', 'title'])
    expect(Object.keys(theme.type.leading).sort()).toEqual(['prose', 'ui'])
  })
})

describe('the values stay swappable', () => {
  it('states colours as CSS the browser reads, not numbers to do sums on', () => {
    for (const [name, value] of Object.entries(theme.color)) {
      expect(value, name).toMatch(/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i)
    }
  })

  it('states every length with its unit, so nothing does arithmetic on it', () => {
    const lengths = [
      ...Object.entries(theme.space),
      ...Object.entries(theme.radius),
      ...Object.entries(theme.frame),
      ...Object.entries(theme.type.size),
      ...Object.entries(theme.type.track),
    ]
    for (const [name, value] of lengths) {
      expect(value, name).toMatch(/^-?[\d.]+(px|em|rem|%)$/)
    }
    // Leading is the exception CSS itself makes: unitless, so it inherits.
    for (const [name, value] of Object.entries(theme.type.leading)) {
      expect(value, name).toMatch(/^[\d.]+$/)
    }
  })

  it('honours the hit-area floor (LAWS.md #visible)', () => {
    expect(Number.parseFloat(theme.frame.minTap)).toBeGreaterThanOrEqual(44)
  })
})
