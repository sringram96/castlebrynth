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

/**
 * The motion budget's numbers (arts 107–110, 117). The *shape* of these rules
 * is law and lives in the articles; every number below is tuning and lives
 * here, which is the same seam every other dial in the game sits on.
 */
export const MOTION = {
  /** art. 109: one world clock. ~150 ms, and everything that loops rides it. */
  tick: 150,
  /**
   * art. 108: how many ticks between blinks. A little over a minute at the
   * clock above — the rarest motion reads the largest, and rarity is the
   * whole of the effect.
   */
  blinkEvery: 420,
  /**
   * art. 110: how many ramp steps a fire's light swells by between the two
   * cast frames. One step reads as the room breathing; more reads as a switch.
   */
  swell: 1,
  /**
   * art. 117: what a room does of its own accord. `soonest` is how long the
   * thumb must be still first and `spread` is how much later than that it may
   * fall — the actual delay is hashed from the instance, so it is the same
   * every time you stand in that room and different between rooms.
   */
  unbidden: { soonest: 56, spread: 96, frames: 9 },
} as const

/**
 * art. 119: **how long each beat of a fight event stands.**
 *
 * The *order* of the beats is law and lives in the article; every number
 * here is tuning, on the same seam every other dial in the game sits on.
 * The article is explicit that these must be settled on a phone — the demo
 * they came from was tuned on a desktop, and a desktop cannot show the thing
 * being decided. What is below is the demo's, and DESIGN.md records that it
 * has not been through a hand yet.
 */
export const CASCADE = {
  /**
   * Section 1: turns of the tumble before the first die settles. Without
   * them the first die lands having never been in the air.
   */
  tumbles: 2,
  /** Section 1: the stagger, so five dice read as five events. */
  land: 90,
} as const

/** The same room on the 480 dial. art. 23: a re-render, never a rewrite. */
export function atGrid(grid: number, height: number): RenderConfig {
  return { ...RENDER, grid, height }
}
