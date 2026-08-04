/**
 * src/room — the computed-box renderer on the GRID dial (arts 13–25).
 *
 * The port of `reference/castlebrynth-wake-v3.html`. The lean is not here:
 * it is PARKED (art. 8), so the camera has no X.
 *
 * Everything authored — the three numbers, the palette, the shaders, the
 * props, the configuration — arrives from `src/content`. This directory
 * knows how to compute a box and nothing about which box.
 */

import { castBox } from './cast.js'
import type { RenderConfig } from './config.js'
import { dither, hash } from './dither.js'
import type { Framebuffer } from './framebuffer.js'
import { fill, plot } from './framebuffer.js'
import type { Brush, Prop, Scene } from './scene.js'
import type { View } from './view.js'
import { viewOf } from './view.js'

export type { Frame, RenderConfig } from './config.js'
export { focalLength, frameOf } from './config.js'
export { dither, hash } from './dither.js'
export type { Framebuffer } from './framebuffer.js'
export { framebuffer } from './framebuffer.js'
export type { Brush, Prop, RoomPalette, Scene, SurfaceShaders, SurfaceId } from './scene.js'
export { Surface } from './scene.js'
export type { Projected, RoomShape, View } from './view.js'
export { viewOf } from './view.js'

/** One rendered room: the pixels, and the buffers that explain them. */
export interface RenderedRoom {
  readonly view: View
  readonly frame: Framebuffer
  readonly surface: Uint8Array
  readonly depth: Float32Array
}

/**
 * Render a room. Deterministic by construction: the same scene and the same
 * configuration produce the same bytes, every visit (art. 17).
 */
export function renderRoom(scene: Scene, config: RenderConfig): RenderedRoom {
  const view = viewOf(scene.shape, config)
  const cast = castBox(view, scene.palette, scene.surfaces)
  const brush = brushOf(view, cast.target, cast.depth)
  // art. 19: painted near over far. The plate declares that order — see
  // `far2near`, which says whether a plate keeps its promise — because the
  // reference lays one prop over an atmosphere that stands nearer than it,
  // and the reference wins ties about intent.
  for (const prop of scene.props(view)) prop.paint(brush)
  return { view, frame: cast.target, surface: cast.surface, depth: cast.depth }
}

/** True when a plate declares its props far to near, as art. 19 asks. */
export function far2near(props: readonly Prop[]): boolean {
  return props.every((prop, i) => i === 0 || props[i - 1]!.z >= prop.z)
}

function brushOf(view: View, target: Framebuffer, depth: Float32Array): Brush {
  return {
    view,
    target,
    project: (X, Y, z) => view.project(X, Y, z),
    px: (color, x, y) => plot(target, color, x, y),
    rect: (color, x, y, w, h) => fill(target, color, x, y, w, h),
    dither,
    hash,
    depthAt(x, y) {
      const px = x | 0
      const py = y | 0
      if (px < 0 || py < 0 || px >= target.width || py >= target.height) return Infinity
      return depth[py * target.width + px]!
    },
  }
}

/**
 * Blit a rendered frame to a canvas. The only place the renderer meets a
 * device pixel (art. 25).
 */
export function present(frame: Framebuffer, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('no 2d context')
  canvas.width = frame.width
  canvas.height = frame.height
  const image = ctx.createImageData(frame.width, frame.height)
  image.data.set(frame.pixels)
  ctx.putImageData(image, 0, 0)
}

/**
 * art. 25 (amended by the ruling of 2026-08-04): exact fill via sharp
 * upscale. The scale is whatever fits the box, fraction and all — the frame
 * already derives its height from the device (art. 24), so filling one
 * dimension very nearly fills the other, and what is left is a sliver
 * rather than a bar.
 *
 * Nearest-neighbour (`image-rendering: pixelated`) is what keeps it sharp.
 * A fractional scale means neighbouring game pixels can land one device
 * pixel apart at the seams; that unevenness is the declared price of the
 * ruling, and on a phone's pixel density it is under the eye.
 */
export function fillScale(frame: Framebuffer, boxWidth: number, boxHeight: number): number {
  if (frame.width <= 0 || frame.height <= 0) return 1
  const fits = Math.min(boxWidth / frame.width, boxHeight / frame.height)
  // A box with no room in it still has to be given a number.
  return fits > 0 ? fits : 1
}

/**
 * The largest whole-number scale that fits, never below 1 — the superseded
 * reading of art. 25. Kept because the 480 dial (art. 23) and any future
 * context that wants true square pixels will ask for it, and because a
 * ruling that can be pointed at is easier to revisit than one that was
 * deleted.
 */
export function integerScale(
  frame: Framebuffer,
  boxWidth: number,
  boxHeight: number,
): number {
  return Math.max(1, Math.floor(fillScale(frame, boxWidth, boxHeight)))
}
