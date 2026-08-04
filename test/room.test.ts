import { describe, expect, it } from 'vitest'

import { atGrid, AUTHORED_HEIGHT, GRID, RENDER, WAKE } from '../src/content/index.js'
import { far2near, focalLength, renderRoom, Surface, viewOf } from '../src/room/index.js'

describe('room — art. 17 (a room renders identical every visit), arts 14, 22–23 (the dial)', () => {
  it('renders the same room byte-identical twice (art. 17)', () => {
    const once = renderRoom(WAKE, RENDER)
    const twice = renderRoom(WAKE, RENDER)
    expect(twice.frame.pixels).toEqual(once.frame.pixels)
  })

  /**
   * Visual parity with `reference/castlebrynth-wake-v3.html` at GRID 240 is
   * the bar, so it is a number and not an opinion. The constant is the
   * FNV-1a of the reference canvas's own RGBA bytes, read out of a browser
   * with guides off and the muted school — the file's defaults. Regenerate
   * it only when the reference itself changes.
   */
  it('lands byte-identical on the reference plate at GRID 240 (arts 13–18)', () => {
    const room = renderRoom(WAKE, RENDER)
    let h = 2166136261 >>> 0
    for (const byte of room.frame.pixels) {
      h ^= byte
      h = Math.imul(h, 16777619) >>> 0
    }
    expect(h.toString(16)).toBe('12300133')
  })

  it('is opaque everywhere — no alpha, no gradients (art. 17)', () => {
    const room = renderRoom(WAKE, RENDER)
    for (let i = 3; i < room.frame.pixels.length; i += 4) {
      expect(room.frame.pixels[i]).toBe(255)
    }
  })

  it('turns the GRID dial without a rewrite: 480 re-renders the box (art. 23)', () => {
    const doubled = renderRoom(WAKE, atGrid(GRID * 2, AUTHORED_HEIGHT * 2))
    expect(doubled.frame.width).toBe(GRID * 2)
    expect(doubled.frame.height).toBe(AUTHORED_HEIGHT * 2)
  })

  it('declares its props, and says plainly when they are not far to near (art. 19)', () => {
    const view = viewOf(WAKE.shape, RENDER)
    expect(far2near(WAKE.props(view))).toBe(false)
  })

  it('derives focal length from lens, and only from lens (art. 14)', () => {
    expect(focalLength(WAKE.shape.lens, GRID)).toBeCloseTo(
      GRID / 2 / Math.tan((WAKE.shape.lens * Math.PI) / 360),
      10,
    )
    // The dial scales the lens with the frame: same angle, twice the pixels.
    expect(focalLength(WAKE.shape.lens, GRID * 2)).toBeCloseTo(
      focalLength(WAKE.shape.lens, GRID) * 2,
      10,
    )
  })

  it('keeps the mouth structural: past the cutoff is near-black (art. 16)', () => {
    // The box alone — props stand in front of the mouth and are allowed to.
    const box = renderRoom({ ...WAKE, props: () => [] }, RENDER)
    // Nothing past the cutoff but the near-black, its breath, and the two
    // marks the contour pass derives there (art. 18).
    const allowed = new Set(
      [WAKE.palette.hollow, WAKE.palette.breath, WAKE.palette.edge, WAKE.palette.rim].map(
        (hex) => hex.slice(1),
      ),
    )
    const seen = new Set<string>()
    let mouthPixels = 0
    for (let i = 0; i < box.surface.length; i++) {
      if (box.surface[i] !== Surface.Mouth) continue
      mouthPixels++
      const p = i * 4
      const hex = [box.frame.pixels[p]!, box.frame.pixels[p + 1]!, box.frame.pixels[p + 2]!]
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('')
      seen.add(hex)
    }
    expect(mouthPixels).toBeGreaterThan(0)
    expect([...seen].filter((hex) => !allowed.has(hex))).toEqual([])
  })
})
