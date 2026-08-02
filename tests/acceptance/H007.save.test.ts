import { describe, it, expect } from 'vitest'
import { serialize, parse, SAVE_VERSION } from '../../src/core/save'
import { emptyState, withFlag, withItem } from '../../src/core/types'

// H007 · the save envelope. parse() is the boundary with the outside world
// and the outside world lies. It never throws — it returns null.

const sample = () => withItem(withFlag(emptyState('shore', 42), 'knows_glyph'), 'lamp')

describe('H007 · serialize', () => {
  it('wraps state in a versioned envelope', () => {
    const env = serialize(sample())
    expect(env.v).toBe(SAVE_VERSION)
    expect(env.v).toBe(1)
    expect(env.state).toEqual(sample())
  })

  it('produces something JSON.stringify handles', () => {
    const raw = JSON.stringify(serialize(sample()))
    expect(typeof raw).toBe('string')
    expect(JSON.parse(raw)).toEqual({ v: 1, state: sample() })
  })

  it('does not mutate the state it was handed', () => {
    const s = Object.freeze(sample())
    serialize(s)
    expect(s).toEqual(sample())
  })
})

describe('H007 · parse round-trips', () => {
  it('recovers a state that deep-equals the original', () => {
    const s = sample()
    const back = parse(JSON.stringify(serialize(s)))
    expect(back).toEqual(s)
  })

  it('round-trips an untouched new run', () => {
    const s = emptyState('shore', 0)
    expect(parse(JSON.stringify(serialize(s)))).toEqual(s)
  })
})

describe('H007 · parse never throws', () => {
  const bad: [string, string][] = [
    ['empty string', ''],
    ['whitespace', '   '],
    ['not json', 'not json at all'],
    ['truncated json', '{"v":1,"state":{'],
    ['json null', 'null'],
    ['json array', '[1,2,3]'],
    ['json string', '"hello"'],
    ['json number', '42'],
    ['no envelope', '{"state":{}}'],
    ['wrong version', '{"v":2,"state":{}}'],
    ['version as string', '{"v":"1","state":{}}'],
    ['missing state', '{"v":1}'],
    ['state is null', '{"v":1,"state":null}'],
    ['state is array', '{"v":1,"state":[]}'],
    ['missing scene', '{"v":1,"state":{"flags":[],"items":[],"journal":[],"refused":[],"rng":0,"seed":0}}'],
    ['missing flags', '{"v":1,"state":{"scene":"shore","items":[],"journal":[],"refused":[],"rng":0,"seed":0}}'],
    ['scene wrong type', '{"v":1,"state":{"scene":9,"flags":[],"items":[],"journal":[],"refused":[],"rng":0,"seed":0}}'],
    ['flags wrong type', '{"v":1,"state":{"scene":"shore","flags":"a","items":[],"journal":[],"refused":[],"rng":0,"seed":0}}'],
    ['flags hold non-strings', '{"v":1,"state":{"scene":"shore","flags":[1],"items":[],"journal":[],"refused":[],"rng":0,"seed":0}}'],
    ['rng wrong type', '{"v":1,"state":{"scene":"shore","flags":[],"items":[],"journal":[],"refused":[],"rng":"x","seed":0}}'],
  ]

  for (const [name, raw] of bad) {
    it(`returns null on ${name}`, () => {
      let result: unknown
      expect(() => {
        result = parse(raw)
      }).not.toThrow()
      expect(result).toBeNull()
    })
  }

  it('survives a fuzz of truncations of a valid save', () => {
    const raw = JSON.stringify(serialize(sample()))
    for (let i = 0; i < raw.length; i++) {
      const cut = raw.slice(0, i)
      expect(() => parse(cut)).not.toThrow()
    }
    expect(parse(raw)).toEqual(sample())
  })
})
