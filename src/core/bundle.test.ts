import { describe, it, expect } from 'vitest'
import { loadBundle } from './bundle'

// The acceptance owns the headline: the compiled shore loads, it round-trips,
// junk is refused, and a `start` naming no scene is refused. These cover the
// rest — every place the loader has to name what is wrong, and that a scene
// gets there through parseScene rather than past it.

const scene = (id: string) => ({ id, line: 'Grey water.', objects: [] })

const bundle = (over: Record<string, unknown> = {}) => ({
  v: 1,
  start: 'shore',
  scenes: { shore: scene('shore') },
  ...over,
})

describe('what a bundle must be', () => {
  it('takes a bundle of scenes and opens on the one start names', () => {
    const b = loadBundle(bundle())
    expect(b.start).toBe('shore')
    expect(b.scenes['shore']?.line).toBe('Grey water.')
  })

  it('refuses a key the bundle has no meaning for', () => {
    expect(() => loadBundle({ ...bundle(), extra: 1 })).toThrow(/extra/)
  })

  it('refuses a version that is not 1', () => {
    for (const v of [0, 2, '1', null, undefined]) {
      expect(() => loadBundle({ ...bundle(), v }), `accepted v ${String(v)}`).toThrow(/v —/)
    }
  })

  it('refuses a start that is not a scene id', () => {
    expect(() => loadBundle({ ...bundle(), start: 7 })).toThrow(/start/)
  })

  it('refuses scenes that are not a mapping', () => {
    for (const scenes of [[], 'shore', null]) {
      expect(() => loadBundle({ ...bundle(), scenes })).toThrow(/scenes/)
    }
  })
})

describe('the scenes go through parseScene, not past it', () => {
  it('refuses a scene the vocabulary does not know, naming the scene and the path', () => {
    const broken = {
      id: 'shore',
      line: 'Grey water.',
      objects: [{ id: 'book', name: 'a book', actions: { read: [{ setFlagg: 'lit' }] } }],
    }
    expect(() => loadBundle(bundle({ scenes: { shore: broken } }))).toThrow(
      /scenes\.shore: objects\.book\.read\[0\]\.setFlagg — unknown vocabulary word/,
    )
  })

  it('refuses a scene filed under a key that is not its own id', () => {
    expect(() => loadBundle(bundle({ scenes: { shore: scene('cellar') } }))).toThrow(
      /scenes\.shore\.id/,
    )
  })

  it('normalises through the same gate the builder used', () => {
    const authored = {
      id: 'shore',
      line: 'Grey water.',
      objects: [
        { id: 'book', name: 'a book', actions: { read: [{ gate: { flag: 'lit' } }, { say: 'x' }] } },
      ],
    }
    const b = loadBundle(bundle({ scenes: { shore: authored } }))
    expect(b.scenes['shore']?.objects[0]?.actions['read']?.[0]?.gate).toEqual({ flag: ['lit'] })
  })
})

describe('what comes out is JSON', () => {
  it('carries no undefined member', () => {
    const b = loadBundle(bundle())
    expect(JSON.parse(JSON.stringify(b))).toEqual(b)
    expect(structuredClone(b)).toEqual(b)
  })

  it('drops nothing a rebuild would keep — loading twice is loading once', () => {
    const once = loadBundle(bundle())
    expect(loadBundle(once)).toEqual(once)
  })
})
