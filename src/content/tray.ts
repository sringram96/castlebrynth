/**
 * Where things sit on the painted tray.
 *
 * The PNG owns appearance; this file owns placement. Everything is a fraction
 * of the tray's own box, so the composition never reflows — the reliquary is
 * one authored picture and its beds are where they were painted, not a
 * responsive grid.
 *
 * These coordinates are measured off the master and are the one piece of the
 * pre-reset build carried across, because they are data rather than
 * architecture.
 *
 * **The tray bleeds.** It is laid out at whichever is larger: the viewport, or
 * the width at which a die bed reaches the 44 px touch floor. On a 390 px
 * phone that is 458 px, so the frame's decorative outer edge runs off both
 * sides — which reads better than a shrunken frame and is what makes the dice
 * tappable without overlapping targets.
 */

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export const TRAY = {
  authoredWidth: 730,
  authoredHeight: 364,
  /** The smallest a die bed may be on screen, in CSS pixels. */
  minTouch: 44,
} as const

export const TRAY_ASPECT = TRAY.authoredWidth / TRAY.authoredHeight

/** The dark glass on the left. Health lives inside it. */
export const ORB: Rect = { x: 0.06, y: 0.3, width: 0.145, height: 0.335 }
export const ORB_TEXT: Rect = { x: 0.045, y: 0.655, width: 0.175, height: 0.085 }

/** The six beds along the top. The hand, and nothing else, ever. */
export const DIE_BEDS: readonly Rect[] = [
  { x: 0.188, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.289, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.39, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.491, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.592, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.693, y: 0.058, width: 0.096, height: 0.205 },
]

/** The dark recess in the middle. The stage: the score, or the room's line. */
export const WELL: Rect = { x: 0.25, y: 0.285, width: 0.48, height: 0.43 }

/** Three small beds on the right. Relics sit here. */
export const RELIC_BEDS: readonly Rect[] = [
  { x: 0.754, y: 0.43, width: 0.068, height: 0.24 },
  { x: 0.83, y: 0.43, width: 0.068, height: 0.24 },
  { x: 0.906, y: 0.43, width: 0.068, height: 0.24 },
]

/**
 * The three beds along the bottom. The persistent controls.
 *
 * Left is always INSPECT. Centre is always the primary action. Right is the
 * secondary, and is absent rather than disabled when there is not one. Their
 * meaning never moves between beds, in any mode.
 */
export const ACTION_BEDS: readonly Rect[] = [
  { x: 0.132, y: 0.8, width: 0.235, height: 0.14 },
  { x: 0.37, y: 0.8, width: 0.25, height: 0.14 },
  { x: 0.623, y: 0.8, width: 0.235, height: 0.14 },
]

/** How wide the tray must be laid out for a die bed to reach the touch floor. */
export function trayWidthFor(viewportWidth: number): number {
  const bed = DIE_BEDS[0]!.width
  return Math.max(viewportWidth, Math.ceil(TRAY.minTouch / bed))
}
