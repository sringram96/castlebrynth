import { describe, expect, it } from 'vitest'

import { RENDER } from '../src/content/index.js'
import { markRect, viewOf } from '../src/room/index.js'
import type { AssetCache, PixelAsset, Ready, SceneArt } from '../src/visual/index.js'
import {
  LAYER_ORDER,
  Layer,
  NO_ART,
  composite,
  heroFaults,
  inTheWorld,
} from '../src/visual/index.js'

/**
 * art. 127: the layer order is one declared list, and composition is a pure
 * function of the art, the view and the clock.
 *
 * The reason these are tests and not comments: composition is the part of a
 * frame that can be wrong in ways nobody notices for weeks. A plate one band
 * too low is not a crash, it is a picture that is slightly wrong forever.
 */

const CHAMBER = { lens: 96, width: 12, ceiling: 8, back: 43 } as const
const view = viewOf(CHAMBER, RENDER)
const frame = { width: RENDER.grid, height: RENDER.height }

const plate = (id: string, w = 20, h = 20): PixelAsset => ({
  kind: 'plate',
  id,
  src: `assets/visual/${id}.png`,
  nativeWidth: w,
  nativeHeight: h,
  school: 'ossuary',
})

/** A cache holding exactly what a test says it holds, and nothing else. */
function cacheOf(...assets: readonly PixelAsset[]): AssetCache {
  const held = new Map<string, Ready>(
    assets.map((asset) => [
      asset.id,
      { asset, image: {}, width: asset.nativeWidth, height: asset.nativeHeight },
    ]),
  )
  const missed = new Set<string>()
  return {
    get missing(): readonly string[] {
      return [...missed].sort()
    },
    get(id) {
      const found = held.get(id)
      if (found === undefined) missed.add(id)
      return found ?? null
    },
  }
}

const moment = { tick: 0, still: false, inFight: false }
const ctx = (assets: AssetCache): Parameters<typeof composite>[1] => ({
  view,
  frame,
  assets,
  moment,
})

describe('the layer order — art. 127', () => {
  it('is ascending, gapless and has one entry per band', () => {
    expect(LAYER_ORDER).toEqual([...LAYER_ORDER].sort((a, b) => a - b))
    expect(new Set(LAYER_ORDER).size).toBe(LAYER_ORDER.length)
    LAYER_ORDER.forEach((band, i) => expect(band).toBe(i))
  })

  it("divides the world's bands from the HUD's at one place", () => {
    expect(inTheWorld(Layer.Room)).toBe(true)
    expect(inTheWorld(Layer.FirstPerson)).toBe(true)
    // The tray and the pops are DOM. Naming them in the same list is the
    // point of the article; compositing them would be a second z-order.
    expect(inTheWorld(Layer.Hud)).toBe(false)
    expect(inTheWorld(Layer.Feedback)).toBe(false)
  })

  it('sorts by band, whatever order the art was declared in', () => {
    const art: SceneArt = {
      overlays: [
        { asset: 'front', layer: Layer.Foreground, anchor: { space: 'world', at: mark(0, 10) } },
        { asset: 'back', layer: Layer.Material, anchor: { space: 'world', at: mark(0, 10) } },
      ],
      hero: { asset: 'middle', layer: Layer.Hero, anchor: { space: 'world', at: mark(0, 10) } },
    }
    const draws = composite(art, ctx(cacheOf(plate('front'), plate('back'), plate('middle'))))
    expect(draws.map((one) => one.asset)).toEqual(['back', 'middle', 'front'])
  })

  it('breaks ties inside a band by declaration order', () => {
    const art: SceneArt = {
      overlays: [
        { asset: 'first', layer: Layer.Material, anchor: { space: 'world', at: mark(-4, 10) } },
        { asset: 'second', layer: Layer.Material, anchor: { space: 'world', at: mark(4, 10) } },
      ],
    }
    const draws = composite(art, ctx(cacheOf(plate('first'), plate('second'))))
    expect(draws.map((one) => one.asset)).toEqual(['first', 'second'])
  })

  it('honours an explicit order over the order it was written in', () => {
    const art: SceneArt = {
      overlays: [
        {
          asset: 'first',
          layer: Layer.Material,
          order: 9,
          anchor: { space: 'world', at: mark(-4, 10) },
        },
        { asset: 'second', layer: Layer.Material, anchor: { space: 'world', at: mark(4, 10) } },
      ],
    }
    const draws = composite(art, ctx(cacheOf(plate('first'), plate('second'))))
    expect(draws.map((one) => one.asset)).toEqual(['second', 'first'])
  })
})

describe('the compositor — art. 126 (missing art falls back)', () => {
  it('composes nothing at all for a room with no art', () => {
    expect(composite(NO_ART, ctx(cacheOf()))).toEqual([])
  })

  it('drops a plate that is not in the cache, and does not throw', () => {
    const art: SceneArt = {
      hero: { asset: 'never.drawn', layer: Layer.Hero, anchor: { space: 'world', at: mark(0, 10) } },
    }
    const assets = cacheOf()
    expect(() => composite(art, ctx(assets))).not.toThrow()
    expect(composite(art, ctx(assets))).toEqual([])
    // And it says which one, so a dev harness can list the holes.
    expect(assets.missing).toContain('never.drawn')
  })

  it('keeps the plates it has when one beside them is missing', () => {
    const art: SceneArt = {
      overlays: [
        { asset: 'here', layer: Layer.Material, anchor: { space: 'world', at: mark(-4, 10) } },
        { asset: 'gone', layer: Layer.Material, anchor: { space: 'world', at: mark(4, 10) } },
      ],
    }
    const draws = composite(art, ctx(cacheOf(plate('here'))))
    expect(draws.map((one) => one.asset)).toEqual(['here'])
  })

  it('drops a drawing: a ramp-indexed thing is a prop, not an overlay (art. 100)', () => {
    const drawing: PixelAsset = {
      kind: 'drawing',
      id: 'a.drawing',
      rows: ['12', '34'],
      nativeWidth: 2,
      nativeHeight: 2,
    }
    const art: SceneArt = {
      hero: { asset: 'a.drawing', layer: Layer.Hero, anchor: { space: 'world', at: mark(0, 10) } },
    }
    expect(composite(art, ctx(cacheOf(drawing)))).toEqual([])
  })
})

describe('placement — arts 19, 22 (world anchors diminish; frame anchors are ratios)', () => {
  it('places a world anchor exactly where the thumb is told the thing is', () => {
    const at = mark(0, 14)
    const art: SceneArt = {
      hero: { asset: 'thing', layer: Layer.Hero, anchor: { space: 'world', at } },
    }
    const [draw] = composite(art, ctx(cacheOf(plate('thing'))))
    const rect = markRect(view, at)
    // arts 19, 68: the paint and the tap region are one calculation, so they
    // cannot drift apart.
    expect(draw!.x).toBe(Math.round(rect.x))
    expect(draw!.width).toBe(Math.round(rect.width))
    expect(draw!.height).toBe(Math.round(rect.height))
  })

  it('shrinks a world anchor with depth, by 1/z (art. 19)', () => {
    const near = composite(
      { hero: { asset: 'thing', layer: Layer.Hero, anchor: { space: 'world', at: mark(0, 10) } } },
      ctx(cacheOf(plate('thing'))),
    )
    const far = composite(
      { hero: { asset: 'thing', layer: Layer.Hero, anchor: { space: 'world', at: mark(0, 30) } } },
      ctx(cacheOf(plate('thing'))),
    )
    expect(far[0]!.width).toBeLessThan(near[0]!.width)
    expect(far[0]!.height).toBeLessThan(near[0]!.height)
  })

  it('grows a scaled thing about its feet, so it does not sink through the floor', () => {
    const at = mark(0, 14)
    const plain = composite(
      { hero: { asset: 'thing', layer: Layer.Hero, anchor: { space: 'world', at } } },
      ctx(cacheOf(plate('thing'))),
    )[0]!
    const big = composite(
      { hero: { asset: 'thing', layer: Layer.Hero, anchor: { space: 'world', at }, scale: 2 } },
      ctx(cacheOf(plate('thing'))),
    )[0]!
    expect(big.height).toBeGreaterThan(plain.height)
    // The foot is where it was; only the top moved.
    expect(big.y + big.height).toBe(plain.y + plain.height)
  })

  it("measures a frame anchor in fractions and keeps the master's aspect", () => {
    const art: SceneArt = {
      foreground: {
        asset: 'lamp',
        layer: Layer.FirstPerson,
        anchor: { space: 'frame', x: 0.5, y: 1, origin: 'bottom-center', width: 0.25 },
      },
    }
    const [draw] = composite(art, ctx(cacheOf(plate('lamp', 20, 40))))
    expect(draw!.width).toBe(Math.round(0.25 * frame.width))
    // 20×40 is one-to-two, and a plate is never stretched.
    expect(draw!.height).toBe(draw!.width * 2)
    expect(draw!.y + draw!.height).toBe(frame.height)
  })

  it('places a frame anchor at the same fraction of a taller frame (arts 22, 24)', () => {
    const art: SceneArt = {
      foreground: {
        asset: 'lamp',
        layer: Layer.FirstPerson,
        anchor: { space: 'frame', x: 0.13, y: 1, origin: 'bottom-center', width: 0.2 },
      },
    }
    const short = composite(art, { ...ctx(cacheOf(plate('lamp'))), frame })
    const tall = composite(art, {
      ...ctx(cacheOf(plate('lamp'))),
      frame: { width: frame.width, height: frame.height * 2 },
    })
    // Same width, same corner: a taller phone does not move what is pinned
    // to the bottom-left of the lens.
    expect(tall[0]!.width).toBe(short[0]!.width)
    expect(tall[0]!.x).toBe(short[0]!.x)
    expect(tall[0]!.y + tall[0]!.height).toBe(frame.height * 2)
  })

  it('does not place a thing that misses the frame', () => {
    const art: SceneArt = {
      // Behind the far wall of a 43-deep chamber, so far it is a pixel.
      hero: { asset: 'thing', layer: Layer.Hero, anchor: { space: 'world', at: mark(400, 12) } },
    }
    expect(composite(art, ctx(cacheOf(plate('thing'))))).toEqual([])
  })
})

describe('composition is deterministic — art. 17', () => {
  it('gives the same list for the same input, every time', () => {
    const art: SceneArt = {
      overlays: [
        { asset: 'a', layer: Layer.Material, anchor: { space: 'world', at: mark(-3, 12) } },
        { asset: 'b', layer: Layer.Architecture, anchor: { space: 'world', at: mark(3, 12) } },
      ],
      hero: { asset: 'c', layer: Layer.Hero, anchor: { space: 'world', at: mark(0, 18) } },
      foreground: {
        asset: 'd',
        layer: Layer.FirstPerson,
        anchor: { space: 'frame', x: 0.13, y: 1, origin: 'bottom-center', width: 0.2 },
      },
    }
    const assets = cacheOf(plate('a'), plate('b'), plate('c'), plate('d'))
    expect(composite(art, ctx(assets))).toEqual(composite(art, ctx(assets)))
  })

  it('places nothing on a band the compositor does not own', () => {
    const art: SceneArt = {
      overlays: [
        { asset: 'a', layer: Layer.Hud, anchor: { space: 'world', at: mark(0, 12) } },
        { asset: 'b', layer: Layer.Feedback, anchor: { space: 'world', at: mark(0, 12) } },
      ],
    }
    expect(composite(art, ctx(cacheOf(plate('a'), plate('b'))))).toEqual([])
  })
})

describe('one hero per room — art. 104', () => {
  it('accepts a room with one hero and nothing else on the band', () => {
    expect(
      heroFaults({
        hero: { asset: 'one', layer: Layer.Hero, anchor: { space: 'world', at: mark(0, 12) } },
        overlays: [
          { asset: 'dressing', layer: Layer.Material, anchor: { space: 'world', at: mark(4, 12) } },
        ],
      }),
    ).toEqual([])
  })

  it('refuses two things competing to be the one thing', () => {
    const faults = heroFaults({
      hero: { asset: 'one', layer: Layer.Hero, anchor: { space: 'world', at: mark(0, 12) } },
      overlays: [
        { asset: 'other', layer: Layer.Hero, anchor: { space: 'world', at: mark(4, 12) } },
      ],
    })
    expect(faults.length).toBeGreaterThan(0)
  })
})

function mark(X: number, z: number): { X: number; Y: number; z: number; width: number; height: number } {
  return { X, Y: -RENDER.eye, z, width: 4, height: 6 }
}
