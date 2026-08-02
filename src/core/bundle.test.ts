import { describe, it, expect } from 'vitest'
import { loadBundle } from './bundle'

// The acceptance owns the headline: the compiled crossing loads, it
// round-trips, junk is refused, and a `start` naming no scene is refused.
// These cover the rest — every place the loader has to name what is wrong, and
// that a scene gets there through parseScene rather than past it.

const ENTER = 'The ring of the portal is cold all through, and nothing is coming back through it.'

const scene = (id: string) => ({ scene: id, enter: ENTER, objects: {} })

const bundle = (over: Record<string, unknown> = {}) => ({
  v: 1,
  start: 'crossing',
  scenes: { crossing: scene('crossing') },
  ...over,
})

/** A scene with one object in it, so the paths inside have something to name. */
const withDoor = (actions: Record<string, unknown>) => ({
  ...scene('crossing'),
  objects: { door: { tap: 'A low door, barred from this side.', actions } },
})

describe('what a bundle must be', () => {
  it('takes a bundle of scenes and opens on the one start names', () => {
    const b = loadBundle(bundle())
    expect(b.start).toBe('crossing')
    expect(b.scenes['crossing']?.enter).toBe(ENTER)
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

  it('refuses a start that names no scene in the bundle', () => {
    // A run has to have somewhere to open. A bundle that names a scene it does
    // not carry is a world with no way into it.
    expect(() => loadBundle(bundle({ start: 'nowhere' }))).toThrow(/start — names no scene/)
  })

  it('refuses scenes that are not a mapping', () => {
    for (const scenes of [[], 'crossing', null]) {
      expect(() => loadBundle({ ...bundle(), scenes })).toThrow(/scenes/)
    }
  })
})

describe('the scenes go through parseScene, not past it', () => {
  it('refuses a scene the vocabulary does not know, naming the scene and the path', () => {
    const broken = withDoor({ open: [{ say: 'You lift the bar.', setFlag: 'door_open' }] })
    expect(() => loadBundle(bundle({ scenes: { crossing: broken } }))).toThrow(
      /scenes\.crossing: objects\.door\.open\[0\]\.setFlag — unknown vocabulary word/,
    )
  })

  it('refuses a word reserved for a later wave, with the reason and not as an unknown', () => {
    // VOCAB.md keeps these known so that using one fails saying why.
    for (const word of ['contest', 'dropObols', 'prompt', 'roll', 'counter', 'lies']) {
      const reserved = withDoor({ open: [{ say: 'You lift the bar.', [word]: 1 }] })
      expect(
        () => loadBundle(bundle({ scenes: { crossing: reserved } })),
        `accepted the reserved word ${word}`,
      ).toThrow(/reserved for a later wave/)
    }
  })

  it('refuses a response that says nothing', () => {
    const silent = withDoor({ open: [{ set: ['door_open'] }] })
    expect(() => loadBundle(bundle({ scenes: { crossing: silent } }))).toThrow(
      /scenes\.crossing: objects\.door\.open\[0\] — every response must say something/,
    )
  })

  it('refuses an action whose last response is gated — a tap that can do nothing', () => {
    const dangling = withDoor({
      open: [{ if: { flags: ['knows_mark'] }, say: 'You lift the bar.' }],
    })
    expect(() => loadBundle(bundle({ scenes: { crossing: dangling } }))).toThrow(
      /objects\.door\.open\[0\] — the last response must be a gateless fallback/,
    )
  })

  it('refuses a refusal that carries any other delta — a refusal changes nothing', () => {
    // The `say` is the refusal's line and the ledger is the only mark it
    // leaves (VOCAB.md §refuse purity). Anything else in the response is a
    // world that moved while claiming it did not.
    const impure = withDoor({
      open: [{ refuse: true, say: 'The mark means nothing to your hands.', set: ['tried_door'] }],
    })
    expect(() => loadBundle(bundle({ scenes: { crossing: impure } }))).toThrow(
      /objects\.door\.open\[0\]\.refuse — a refusal changes nothing — drop set/,
    )
  })

  it('refuses a scene filed under a key that is not its own id', () => {
    expect(() => loadBundle(bundle({ scenes: { crossing: scene('cellar') } }))).toThrow(
      /scenes\.crossing\.id/,
    )
  })

  it('normalises through the same gate the builder used', () => {
    const authored = withDoor({
      open: [
        { if: { flags: 'knows_mark' }, say: 'You lift the bar.', set: 'door_open' },
        { refuse: true, say: 'The mark on the wood means something. Not to you.' },
      ],
    })
    const b = loadBundle(bundle({ scenes: { crossing: authored } }))
    const open = b.scenes['crossing']?.objects[0]?.actions['open']
    // A scalar and a list of one are the same thing downstream.
    expect(open?.[0]?.if).toEqual({ flags: ['knows_mark'] })
    expect(open?.[0]?.set).toEqual(['door_open'])
    // The object mapping's key is the object's id, and the free tap comes with it.
    expect(b.scenes['crossing']?.objects[0]?.id).toBe('door')
    expect(b.scenes['crossing']?.objects[0]?.tap).toBe('A low door, barred from this side.')
  })
})

describe('what comes out is JSON', () => {
  it('carries no undefined member', () => {
    const b = loadBundle(bundle())
    expect(JSON.parse(JSON.stringify(b))).toEqual(b)
    expect(structuredClone(b)).toEqual(b)
  })

  // PINNED FAILURE — the claim is right and the engine does not meet it.
  //
  // bundle.ts promises in its own header that "a loaded bundle round-trips:
  // loadBundle(JSON.parse(JSON.stringify(b))) equals b". It does not, since the
  // parseScene accepts both the authored mapping and the normalised list it
  // produces, so a compiled bundle passes back through the same gate the
  // compiler used. A validator that rejected its own output would make
  // content/bundle.json unloadable, and src/shell/boot.ts loads it on start.
  it('drops nothing a rebuild would keep — loading twice is loading once', () => {
    const once = loadBundle(bundle({ scenes: { crossing: withDoor({ open: [{ say: 'It holds.' }] }) } }))
    expect(loadBundle(once)).toEqual(once)
  })
})
