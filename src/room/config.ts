/**
 * The render configuration — the one place a game pixel is a number.
 *
 * art. 22: nothing is fixed in device pixels; one game pixel is 1/GRID of
 * the frame's width, a ratio and not a canvas size.
 * art. 23: GRID is a dial. Nothing outside this configuration may assume
 * its value, so a 480 migration re-renders the box for free.
 *
 * Every field below is authored in `src/content`; this file only says what
 * a configuration is and derives the frame from it.
 */

export interface RenderConfig {
  /** One game pixel = 1/grid of the frame's width (arts 22–23). */
  readonly grid: number
  /** Frame height in game pixels; derives from the device (art. 24). */
  readonly height: number
  /** The eye line, as a fraction of frame height (art. 13). */
  readonly horizon: number
  /** Eye height in world units. Fixed: the camera is a person (art. 13). */
  readonly eye: number
  /** The mouth's half-width, as a fraction of the grid (art. 16). */
  readonly mouth: number
  /** The mouth's dithered breath, as fractions of the grid (art. 16). */
  readonly breath: { readonly x: number; readonly y: number }
  /** Distance dither: where it starts, how hard it bites, the second step. */
  readonly fog: {
    readonly start: number
    readonly gain: number
    readonly second: number
  }
  /** Rim-light reach either side of the vanishing point, fraction of grid. */
  readonly rim: number
}

/** The frame in game pixels, with the vanishing point on it (art. 13). */
export interface Frame {
  readonly width: number
  readonly height: number
  /** The vanishing point: one, and it does not move. */
  readonly cx: number
  readonly cy: number
}

export function frameOf(config: RenderConfig): Frame {
  return {
    width: config.grid,
    height: config.height,
    cx: config.grid / 2,
    cy: Math.round(config.horizon * config.height),
  }
}

/**
 * art. 14: focal length is derived from lens, never set. Lens is an angle;
 * this is the only conversion in the codebase.
 */
export function focalLength(lens: number, grid: number): number {
  return grid / 2 / Math.tan((lens * Math.PI) / 360)
}
