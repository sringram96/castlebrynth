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

export const RENDER: RenderConfig = {
  grid: GRID,
  height: AUTHORED_HEIGHT,
  horizon: 118 / AUTHORED_HEIGHT,
  eye: 14,
  mouth: 24 / GRID,
  breath: { x: 26 / GRID, y: 34 / GRID },
  fog: { start: 0.45, gain: 22, second: 0.7 },
  rim: 48 / GRID,
}

/** The same room on the 480 dial. art. 23: a re-render, never a rewrite. */
export function atGrid(grid: number, height: number): RenderConfig {
  return { ...RENDER, grid, height }
}
