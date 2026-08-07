/**
 * The painter — the one place a draw list becomes pixels.
 *
 * It takes the cast framebuffer (band 1: the computed box, arts 15, 93) and
 * the compositor's list (bands 2–9: everything authored) and puts them on a
 * canvas.
 *
 * **The canvas is the device's, not the frame's** (the hero-art wave). Before
 * this, the canvas was `GRID` pixels across and CSS stretched it, which meant
 * an authored plate was resampled down to the frame's own scale on the way in:
 * a painting of a thousand pixels arrived as two hundred and forty and every
 * bit of the density it was drawn for was thrown away before anybody saw it.
 * The computed box is still cast at `GRID` — it is a raycast and its cost is
 * the frame's area — and it is stretched up exactly as CSS used to stretch it,
 * nearest neighbour, so art. 25's exact fill is unchanged and the box looks
 * identical. What changed is that the authored bands are drawn at the size the
 * *screen* has, so a plate is never reduced below what it was drawn at.
 *
 * **Nothing is allocated per frame.** The `ImageData` and the scratch canvas
 * the box is upscaled through are held per canvas and remade only when a size
 * changes; plates are decoded once at load; the draw list is the compositor's
 * own array. A paint is one `putImageData`, one stretch, and one `drawImage`
 * per placed thing (art. 126: density is bought in the raster, not the loop).
 */

import type { Framebuffer } from '../room/index.js'
import type { AssetCache } from './assets.js'
import type { Draw } from './compositor.js'
import { crisp } from './viewport.js'

/**
 * The held scratch: the box's own pixels, and the small canvas they are
 * stretched through. Remade only when the frame changes size — a phone
 * rotating is the only thing that should cost an allocation here.
 */
interface Scratch {
  image: ImageData
  box: HTMLCanvasElement
}
const scratch = new WeakMap<HTMLCanvasElement, Scratch>()

/** How large the canvas actually is, in device pixels (arts 22, 25). */
export interface DeviceFrame {
  readonly width: number
  readonly height: number
}

/**
 * Paint a frame: the cast box, then everything authored over it, in the
 * article's order (art. 127).
 *
 * A draw whose asset has no image behind it is skipped — that is a drawing
 * (art. 100's species, painted as a prop inside the cast) or art that has not
 * arrived, and both cases are the same fallback: the band stays empty and the
 * computed room stands on its own.
 */
export function paintFrame(
  canvas: HTMLCanvasElement,
  frame: Framebuffer,
  draws: readonly Draw[],
  assets: AssetCache,
  device: DeviceFrame,
): void {
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('no 2d context')
  const width = Math.max(1, Math.round(device.width))
  const height = Math.max(1, Math.round(device.height))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  let held = scratch.get(canvas)
  if (held === undefined || held.image.width !== frame.width || held.image.height !== frame.height) {
    const box = document.createElement('canvas')
    box.width = frame.width
    box.height = frame.height
    held = { image: ctx.createImageData(frame.width, frame.height), box }
    scratch.set(canvas, held)
  }
  const boxCtx = held.box.getContext('2d')
  if (boxCtx === null) throw new Error('no 2d context')
  held.image.data.set(frame.pixels)
  boxCtx.putImageData(held.image, 0, 0)

  // art. 25: the box is stretched to the device, nearest neighbour, which is
  // what CSS was doing to the whole canvas before and is now done to the one
  // band that wants it.
  crisp(ctx)
  ctx.drawImage(held.box, 0, 0, frame.width, frame.height, 0, 0, width, height)

  if (draws.length === 0) return
  // The compositor speaks in frame pixels because that is where the geometry
  // is honest (art. 19's 1/z, art. 22's fractions). One multiply moves the
  // list onto the device, and it is the only place the two ever meet.
  const k = width / Math.max(1, frame.width)
  for (const draw of draws) {
    const ready = assets.get(draw.asset)
    if (ready === null || ready.image === null) continue
    const x = Math.round(draw.x * k)
    const y = Math.round(draw.y * k)
    const w = Math.max(1, Math.round(draw.width * k))
    const h = Math.max(1, Math.round(draw.height * k))
    // **Up is crisp, down is smooth.** Nearest neighbour is the law for an
    // authored pixel shown larger than it was drawn (arts 25, 100) — a blurred
    // authored pixel is a different pixel. Shown *smaller* than it was drawn,
    // nearest neighbour is not preservation, it is throwing away three pixels
    // in four and keeping whichever one the rounding landed on; the density
    // the plate was authored for survives only if the shrink averages. So the
    // rule reads off the ratio and never off a preference.
    ctx.imageSmoothingEnabled = w < ready.width
    ctx.drawImage(ready.image as CanvasImageSource, x, y, w, h)
  }
  ctx.imageSmoothingEnabled = false
}
