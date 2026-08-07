/**
 * The viewport — where the frame meets the device, and the only place in
 * `src/visual` that says the words "device pixel" (arts 22–25).
 *
 * The logical rendering space is the frame: `GRID` game pixels across, a
 * height derived from the band's aspect (art. 24). Everything authored is
 * laid out in that space. This file scales it out to whatever the phone has,
 * with nearest-neighbour, which is the whole of art. 25's exact fill.
 *
 * There is no second resolution. The reference image is 1088 pixels wide and
 * that is its *authoring* density, not a runtime requirement: a master is
 * reduced to the frame's own scale before it ships, so a dense-looking frame
 * costs the same as a plain one (art. 126).
 */

import { fillScale } from '../room/index.js'

export interface Viewport {
  /** The frame in game pixels. */
  readonly width: number
  readonly height: number
  /** Device pixels per game pixel. Fractional, which art. 25 accepts. */
  readonly scale: number
  /** What the canvas is stretched to, in CSS pixels. */
  readonly cssWidth: number
  readonly cssHeight: number
}

/**
 * art. 24: the frame's height derives from the device — the box extends
 * itself — so the frame is as many game pixels tall as the band is, at the
 * scale the band's width sets.
 *
 * The floor exists because a band can be measured at zero mid-layout, and a
 * frame of no height is a division by nothing further down.
 */
export function frameHeightFor(grid: number, bandWidth: number, bandHeight: number): number {
  if (bandWidth <= 0) return MIN_FRAME_HEIGHT
  return Math.max(MIN_FRAME_HEIGHT, Math.round((grid * bandHeight) / bandWidth))
}

export const MIN_FRAME_HEIGHT = 120

/** The frame, and what it comes to on this device (art. 25). */
export function viewportOf(
  width: number,
  height: number,
  bandWidth: number,
  bandHeight: number,
): Viewport {
  const scale = fillScale({ width, height, pixels: EMPTY }, bandWidth, bandHeight)
  return { width, height, scale, cssWidth: width * scale, cssHeight: height * scale }
}

/** `fillScale` only reads the dimensions; it is never given real pixels here. */
const EMPTY = new Uint8ClampedArray(0)

/**
 * Hard pixel edges, on a context. Nearest-neighbour is not a preference: a
 * blurred authored pixel is a different pixel, and art. 100's whole argument
 * — that silhouette is most of legibility at this scale — dies to a smoothed
 * edge (art. 25).
 */
export function crisp(ctx: {
  imageSmoothingEnabled: boolean
  webkitImageSmoothingEnabled?: boolean
}): void {
  ctx.imageSmoothingEnabled = false
  // Old WebKit spells it its own way and is still on phones people own.
  if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = false
}
