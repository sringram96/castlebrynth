import { describe, expect, it } from 'vitest'

import { atGrid, AUTHORED_HEIGHT, GRID, RENDER, WAKE } from '../src/content/index.js'
import {
  far2near,
  fillScale,
  focalLength,
  integerScale,
  renderRoom,
  Surface,
  viewOf,
} from '../src/room/index.js'

describe('room — art. 17 (a room renders identical every visit), arts 14, 22–23 (the dial)', () => {
  it('renders the same room byte-identical twice (art. 17)', () => {
    const once = renderRoom(WAKE, RENDER)
    const twice = renderRoom(WAKE, RENDER)
    expect(twice.frame.pixels).toEqual(once.frame.pixels)
  })

  /**
   * The plate, byte for byte, so "identical every visit" is a number and not
   * an opinion — and so nothing changes the box by accident.
   *
   * The constant used to be `castlebrynth-wake-v3.html`'s own canvas bytes,
   * because parity with that reference was the bar. The ramp wave replaced
   * the shading pipeline underneath it: one ramp per surface, one dither
   * between adjacent steps, against the noise in
   * `reference/castlebrynth-ramp-shading.html`, which is the shading bar
   * now. v3 still wins ties about the *box* — its geometry, its contours,
   * its mouth, all of which this still lands on — but it no longer decides
   * what colour a surface takes, so its bytes are no longer the number.
   *
   * **Relocked by the look wave (2026-08-05), from c344dfd9 to bbf46771.**
   * Art. 17 was amended: blending inside a ramp is allowed and alpha
   * compositing is what stays banned, so every surface above the darkest
   * fifth now interpolates instead of dithering (art. 95). The ramp also
   * went from ten steps to sixty-four and turns in hue across its length
   * (art. 94), and the light became a station rather than the camera
   * (art. 113). Every pixel in the plate moved; none of them moved by
   * accident.
   *
   * Relock, never loosen. A tolerance here would let the next wave change
   * the box without anybody noticing, which is the whole thing this test
   * exists to prevent.
   *
   * Regenerate only when the renderer is deliberately changed.
   */
  it('lands byte-identical on the reference plate at GRID 240 (arts 13–18)', () => {
    const room = renderRoom(WAKE, RENDER)
    let h = 2166136261 >>> 0
    for (const byte of room.frame.pixels) {
      h ^= byte
      h = Math.imul(h, 16777619) >>> 0
    }
    expect(h.toString(16)).toBe('bbf46771')
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

  /**
   * art. 25, as amended by the ruling of 2026-08-04: exact fill via sharp
   * upscale. The letterboxed reading is what this replaces, and the number
   * that forced the revisit was a phone — a 390×675 world band held the box
   * at 240×415, about 60% of each dimension.
   */
  it('fills the band instead of sitting in bars (art. 25 as amended)', () => {
    // The frame the shell would compute for a 390×675 world band: its height
    // derives from the device (art. 24), so its aspect is the band's.
    const height = Math.round((GRID * 675) / 390)
    const frame = { width: GRID, height, pixels: new Uint8ClampedArray() }

    const scale = fillScale(frame, 390, 675)
    expect(frame.width * scale).toBeCloseTo(390, 5)
    // Filling one dimension all but fills the other: a sliver, not a bar.
    expect(frame.height * scale).toBeGreaterThan(675 * 0.99)
    expect(frame.height * scale).toBeLessThanOrEqual(675)

    // The superseded reading is what left 40% of the band black.
    expect(integerScale(frame, 390, 675)).toBe(1)
    expect(frame.width * integerScale(frame, 390, 675)).toBe(240)
  })

  it('never scales a frame out of its box, at any band shape (art. 25)', () => {
    for (const [w, h] of [
      [390, 675],
      [1280, 400],
      [320, 900],
      [240, 415],
      [100, 100],
    ] as const) {
      const height = Math.max(120, Math.round((GRID * h) / w))
      const frame = { width: GRID, height, pixels: new Uint8ClampedArray() }
      const scale = fillScale(frame, w, h)
      expect(frame.width * scale).toBeLessThanOrEqual(w + 1e-9)
      expect(frame.height * scale).toBeLessThanOrEqual(h + 1e-9)
      expect(scale).toBeGreaterThan(0)
      // And one of the two dimensions is actually filled, or it is not a fill.
      const filled =
        Math.abs(frame.width * scale - w) < 1e-6 || Math.abs(frame.height * scale - h) < 1e-6
      expect(filled).toBe(true)
    }
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
      [
        WAKE.look.palette.hollow,
        WAKE.look.palette.breath,
        WAKE.look.palette.edge,
        WAKE.look.palette.rim,
      ].map(
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
