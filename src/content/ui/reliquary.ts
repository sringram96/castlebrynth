/**
 * The reliquary, as composition.
 *
 * The PNG owns appearance. This file owns placement. Everything is expressed
 * in normalized tray-space (0..1), then projected uniformly by tray-space.ts.
 * No viewport-dependent reflow is allowed inside the painted apparatus.
 *
 * 2026-08-07 art-direction ruling: the shipped fight composition is authored
 * around six dice. General engine collections remain collections, but the
 * combat plate is allowed to be a composition instead of a layout problem.
 */

import type { TrayFrame, TrayPose, TrayRect } from '../../shell/tray-space.js'

export const RELIQUARY_FRAME: TrayFrame = {
  authoredWidth: 1460,
  authoredHeight: 727,
}

export interface ReliquaryMap extends TrayFrame {
  readonly healthOrb: TrayRect
  readonly healthText: TrayRect
  readonly statusRail: TrayRect
  readonly diceZone: TrayRect
  readonly mainWell: TrayRect
  readonly score: TrayRect
  readonly action: TrayRect
  readonly menu: TrayRect
  readonly tabs: readonly TrayRect[]
}

export const RELIQUARY: ReliquaryMap = {
  ...RELIQUARY_FRAME,

  // The meter is now deliberately INSIDE the dark glass. It is a direct tray
  // child, not a child of the text box, so these are real panel coordinates.
  healthOrb: { x: 0.060, y: 0.300, width: 0.145, height: 0.335 },
  healthText: { x: 0.060, y: 0.635, width: 0.145, height: 0.085 },

  // Kept as a reserved exceptional-status region. Ordinary fight bookkeeping
  // no longer occupies a permanent rail.
  statusRail: { x: 0.275, y: 0.305, width: 0.410, height: 0.060 },

  diceZone: { x: 0.185, y: 0.050, width: 0.610, height: 0.225 },

  // The whole dark recess is the fight's information stage.
  mainWell: { x: 0.250, y: 0.270, width: 0.480, height: 0.455 },

  // Scoring is a compact reading centered in the main well. The visual is
  // not a second dashboard: it is simply sum × multiplier.
  score: { x: 0.250, y: 0.270, width: 0.480, height: 0.455 },
  action: { x: 0.585, y: 0.620, width: 0.145, height: 0.085 },

  menu: { x: 0.800, y: 0.095, width: 0.055, height: 0.105 },

  tabs: [
    { x: 0.132, y: 0.800, width: 0.235, height: 0.140 },
    { x: 0.370, y: 0.800, width: 0.250, height: 0.140 },
    { x: 0.623, y: 0.800, width: 0.235, height: 0.140 },
  ],
}

export const DIE_CELLS: readonly TrayRect[] = [
  { x: 0.188, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.289, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.390, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.491, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.592, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.693, y: 0.058, width: 0.096, height: 0.205 },
]

export const DIE_SPRITE = 0.091
export const DIE_TARGET_WIDTH = 0.099
export const DIE_TARGET_HEIGHT = 0.210

export type DiePose = TrayPose

const TILTS = [0, 0, 0, 0, 0, 0, -2, 2] as const

export function posesFor(count: number): readonly DiePose[] {
  if (count <= 0) return []

  const cells = DIE_CELLS
  const perRow = cells.length
  const out: DiePose[] = []

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow)
    const inRow = Math.min(perRow, count - row * perRow)
    const from = Math.floor((perRow - inRow) / 2)
    const cell = cells[from + (i % perRow)] ?? cells[cells.length - 1]!

    const side = DIE_SPRITE
    const tall = (side * RELIQUARY.authoredWidth) / RELIQUARY.authoredHeight

    out.push({
      x: cell.x + (cell.width - side) / 2,
      y: cell.y + (cell.height - tall) / 2 + row * (tall + 0.035),
      width: side,
      height: tall,
      rotation: TILTS[i % TILTS.length] ?? 0,
    })
  }

  return out
}
