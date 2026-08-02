import { describe, it, expect } from 'vitest'
import { parse, serialize, SAVE_VERSION } from './save'
import { emptyState, type GameState } from './types'

// The acceptance owns the round trip and the headline lies. These cover the
// four keys it never mistypes, the numbers JSON can smuggle past a typeof, and
// what a stranger's eighth key does on the way in.

const lived = (): GameState => ({
  ...emptyState('shore', 42),
  flags: ['knows_glyph'],
  items: ['lamp', 'ash'],
  journal: ['the procession passed'],
  refused: ['book.read'],
})

const save = (state: Record<string, unknown>): string =>
  JSON.stringify({ v: SAVE_VERSION, state: { ...lived(), ...state } })

describe('parse round trip', () => {
  it('recovers a lived-in state with every array populated', () => {
    expect(parse(JSON.stringify(serialize(lived())))).toEqual(lived())
  })

  it('keeps a seed that was never a uint32', () => {
    const s = emptyState('shore', -1)
    expect(parse(JSON.stringify(serialize(s)))).toEqual(s)
  })

  it('hands back the seven keys and no eighth', () => {
    const back = parse(JSON.stringify(serialize(lived())))
    expect(Object.keys(back ?? {}).sort()).toEqual([
      'flags',
      'items',
      'journal',
      'refused',
      'rng',
      'scene',
      'seed',
    ])
  })
})

describe('parse rejects the keys the acceptance does not mistype', () => {
  const rejected: [string, string][] = [
    ['items missing', JSON.stringify({ v: 1, state: withoutKey('items') })],
    ['journal missing', JSON.stringify({ v: 1, state: withoutKey('journal') })],
    ['refused missing', JSON.stringify({ v: 1, state: withoutKey('refused') })],
    ['seed missing', JSON.stringify({ v: 1, state: withoutKey('seed') })],
    ['rng missing', JSON.stringify({ v: 1, state: withoutKey('rng') })],
    ['items a string', save({ items: 'lamp' })],
    ['journal an object', save({ journal: {} })],
    ['refused null', save({ refused: null })],
    ['flags null', save({ flags: null })],
    ['items hold numbers', save({ items: [1] })],
    ['journal holds null', save({ journal: [null] })],
    ['refused holds objects', save({ refused: [{ object: 'book' }] })],
    ['items hold a nested array', save({ items: [['lamp']] })],
    ['seed a string', save({ seed: '42' })],
    ['seed null', save({ seed: null })],
    ['scene null', save({ scene: null })],
    ['scene an array', save({ scene: ['shore'] })],
  ]

  for (const [name, raw] of rejected) {
    it(`returns null when ${name}`, () => {
      expect(parse(raw)).toBeNull()
    })
  }
})

describe('parse and the numbers JSON can smuggle', () => {
  // The overflowing literal is spliced in as text because a 1e999 written in
  // this file is itself a lint error — which is the point. JSON.parse turns it
  // into Infinity, a typeof check waves it through, and every draw taken after
  // the load is poisoned somewhere far from the file that did it.
  const overflowing = (key: string, literal: string): string =>
    save({}).replace(`"${key}":42`, `"${key}":${literal}`)

  it('refuses an rng that overflowed to Infinity', () => {
    expect(parse(overflowing('rng', '1e999'))).toBeNull()
  })

  it('refuses a seed that overflowed to Infinity', () => {
    expect(parse(overflowing('seed', '-1e999'))).toBeNull()
  })
})

describe('parse and a hostile file', () => {
  it('drops an eighth key rather than carrying it into the run', () => {
    const back = parse(save({ cheat: true }))
    expect(back).toEqual(lived())
    expect(Object.keys(back ?? {})).not.toContain('cheat')
  })

  it('does not let a __proto__ payload reach the returned state', () => {
    // JSON.parse keeps "__proto__" as an own key rather than following it, so
    // the danger is only in passing the parsed object on. We rebuild instead.
    const keys = JSON.stringify(lived()).slice(1, -1)
    const back = parse(`{"v":1,"state":{${keys},"__proto__":{"pwned":true}}}`)
    expect(back).toEqual(lived())
    expect(Object.getPrototypeOf(back ?? {})).toBe(Object.prototype)
    expect('pwned' in (back ?? {})).toBe(false)
  })

  it('survives every single-character deletion of a valid save', () => {
    const raw = JSON.stringify(serialize(lived()))
    for (let i = 0; i < raw.length; i++) {
      const bitten = raw.slice(0, i) + raw.slice(i + 1)
      expect(() => parse(bitten)).not.toThrow()
    }
  })
})

function withoutKey(key: string): Record<string, unknown> {
  const state: Record<string, unknown> = { ...lived() }
  delete state[key]
  return state
}
