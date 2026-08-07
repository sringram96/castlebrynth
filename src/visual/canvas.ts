/**
 * The painter — the one place a draw list becomes pixels.
 *
 * It takes the cast framebuffer (band 1: the computed box, arts 15, 93) and
 * the compositor's list (bands 2–9: everything authored) and puts them on a
 * canvas at the frame's own resolution. The canvas is then stretched by CSS,
 * nearest-neighbour, exactly as `present`/`fillScale` already did — so this
 * changes what is *on* the frame and nothing about how the frame reaches the
 * device (art. 25 untouched).
 *
 * **Nothing is allocated per frame.** The `ImageData` is held and reused
 * across paints of the same size, plates are decoded once at load, and the
 * draw list is the compositor's own array. A paint is a `putImageData` and
 * one `drawImage` per placed thing.
 */

import type { Framebuffer } from '../room/index.js'
import type { AssetCache } from './assets.js'
import type { Draw } from './compositor.js'
import { crisp } from './viewport.js'

/**
 * The held scratch: one ImageData per canvas, remade only when the frame
 * changes size. A phone rotating is the only thing that should cost an
 * allocation here.
 */
const scratch = new WeakMap<HTMLCanvasElement, ImageData>()

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
): void {
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('no 2d context')
  if (canvas.width !== frame.width || canvas.height !== frame.height) {
    canvas.width = frame.width
    canvas.height = frame.height
    scratch.delete(canvas)
  }
  let image = scratch.get(canvas)
  if (image === undefined || image.width !== frame.width || image.height !== frame.height) {
    image = ctx.createImageData(frame.width, frame.height)
    scratch.set(canvas, image)
  }
  image.data.set(frame.pixels)
  ctx.putImageData(image, 0, 0)

  if (draws.length === 0) return
  crisp(ctx)
  for (const draw of draws) {
    const ready = assets.get(draw.asset)
    if (ready === null || ready.image === null) continue
    ctx.drawImage(ready.image as CanvasImageSource, draw.x, draw.y, draw.width, draw.height)
  }
}
