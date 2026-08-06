/**
 * **The tray's painter** (card 94, arts 100, 113).
 *
 * `src/content/faces.ts` holds the drawings as indices into a ramp; this
 * turns a stack of them into pixels. The split is art. 100's: the drawing
 * says what a thing is made of and never what colour it is, so one bone
 * lights two ways and one glyph reads in whichever key the material is in.
 *
 * Nothing here knows what a die is worth, what a face means, or which of
 * them is which. It takes grids and ramps and fills squares.
 */

import type { Drawing } from '../content/faces.js'
import { FACE_GRID } from '../content/faces.js'

/** One drawing and the ramp it is read through. Later layers paint over. */
export interface Layer {
  readonly draw: Drawing
  readonly ramp: readonly string[]
}

/**
 * How many device pixels one authored pixel comes to, given the size the slot
 * actually came to. At least one, and a whole number — a face at a fractional
 * scale is a face with soft pips, which is the one thing this drawing cannot
 * survive.
 */
export function scaleFor(cssSize: number, ratio = 1): number {
  return Math.max(1, Math.round((cssSize * ratio) / FACE_GRID))
}

/**
 * Paint the stack onto a canvas, sizing it to fit. The canvas keeps its CSS
 * size and takes a backing store at the device's own ratio, so the pixels are
 * square on a phone as well as on a desk.
 */
export function paintFace(
  canvas: HTMLCanvasElement,
  layers: readonly Layer[],
  cssSize: number,
  ratio = 1,
): void {
  const scale = scaleFor(cssSize, ratio)
  const side = FACE_GRID * scale
  if (canvas.width !== side || canvas.height !== side) {
    canvas.width = side
    canvas.height = side
  }
  canvas.style.width = `${cssSize}px`
  canvas.style.height = `${cssSize}px`
  const ctx = canvas.getContext('2d')
  if (ctx === null) return
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, side, side)
  for (const layer of layers) {
    for (let y = 0; y < FACE_GRID; y++) {
      const row = layer.draw[y]
      if (row === undefined) continue
      for (let x = 0; x < FACE_GRID; x++) {
        const cell = row[x]
        if (cell === undefined || cell === '.' || cell === ' ') continue
        const ink = layer.ramp[Number(cell)]
        if (ink === undefined) continue
        ctx.fillStyle = ink
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }
}
