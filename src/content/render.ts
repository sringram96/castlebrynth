import type { RenderConfig } from '../room/index.js'

/**
 * The render dial. art. 23: GRID is a dial — 240 today, 480 a named option
 * — and nothing outside this configuration may assume the number. Every
 * spatial field below is a ratio, so turning the dial re-renders the box
 * for free and only sprites redraw.
 */
export const GRID = 240

/**
 * The height the reference frame was authored at. Frame height really
 * derives from the device (art. 24); this is the still the plates were
 * drawn against and what the parity test measures.
 */
export const AUTHORED_HEIGHT = 260

/**
 * The grid every sprite in `plates/` was drawn on. Authored pixels pass
 * through it rather than through GRID directly, so turning the dial scales
 * the props with the box instead of stranding them (art. 23).
 */
export const AUTHORED_GRID = GRID

export const RENDER: RenderConfig = {
  grid: GRID,
  height: AUTHORED_HEIGHT,
  horizon: 118 / AUTHORED_HEIGHT,
  eye: 14,
  mouth: 24 / GRID,
  breath: { x: 26 / GRID, y: 34 / GRID },
  // The distance drop, in ramp steps: nothing until the far half of the
  // room, then down the ramp toward the mouth's own darkness.
  // art. 94: `gain` and `tintAt` are in ramp steps, so both are scaled
  // with the ramp's new depth.
  fog: { start: 0.3, gain: 9 * 6.4, tintAt: 3.2 * 6.4, tintRate: 0.16 / 6.4, tintCap: 0.6 },
  rim: 48 / GRID,
  // art. 95: the darkest fifth dithers, everything above it blends. Settled
  // at a fifth from the demos; the phone pass may move it and this is the
  // one place it moves.
  blendAbove: 0.2,
}

/** The same room on the 480 dial. art. 23: a re-render, never a rewrite. */
export function atGrid(grid: number, height: number): RenderConfig {
  return { ...RENDER, grid, height }
}
