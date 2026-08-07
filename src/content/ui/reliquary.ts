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

/** Keep the current runtime contract: the supplied painting is shipped at this size. */
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

/**
 * Measured from reference/visual/reliquary-runtime-target.png and then tuned
 * against the phone composition rather than against decorative sub-cells.
 *
 * The crown belongs to the six-die hand. The central recess belongs to the
 * fight's changing information — especially scoring. The footer remains the
 * three stable beds. The right-hand cavities remain secondary/future space.
 */
export const RELIQUARY: ReliquaryMap = {
  ...RELIQUARY_FRAME,

  healthOrb: { x: 0.043, y: 0.220, width: 0.190, height: 0.390 },
  healthText: { x: 0.055, y: 0.585, width: 0.145, height: 0.105 },

  // Situational fight text, when there is any, lives at the top of the well.
  // The old always-on incoming/unused pair is no longer part of the visual
  // composition.
  statusRail: { x: 0.275, y: 0.305, width: 0.390, height: 0.070 },

  // Six large dice across the crown. This zone is deliberately taller and a
  // little wider than the carved recesses so the bones read before the frame.
  diceZone: { x: 0.185, y: 0.050, width: 0.610, height: 0.225 },

  // The large authored recess is the combat information stage.
  mainWell: { x: 0.250, y: 0.270, width: 0.480, height: 0.455 },

  // Scoring owns the visual centre of the well rather than a tiny lower-left
  // inscription. `sum × line` is the primary changing object in combat.
  score: { x: 0.285, y: 0.390, width: 0.405, height: 0.205 },
  action: { x: 0.585, y: 0.620, width: 0.145, height: 0.085 },

  menu: { x: 0.800, y: 0.095, width: 0.055, height: 0.105 },

  tabs: [
    { x: 0.132, y: 0.800, width: 0.235, height: 0.140 },
    { x: 0.370, y: 0.800, width: 0.250, height: 0.140 },
    { x: 0.623, y: 0.800, width: 0.235, height: 0.140 },
  ],
}

/**
 * Six authored crown positions. They intentionally consume almost the whole
 * available rail: the dice are game pieces, not tiny icons decorating it.
 */
export const DIE_CELLS: readonly TrayRect[] = [
  { x: 0.188, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.289, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.390, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.491, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.592, y: 0.058, width: 0.096, height: 0.205 },
  { x: 0.693, y: 0.058, width: 0.096, height: 0.205 },
]

/**
 * The bone nearly fills the crown compartment. Interaction size follows the
 * authored apparatus; it is not allowed to force the artwork back into a
 * generic responsive grid.
 */
export const DIE_SPRITE = 0.091
export const DIE_TARGET_WIDTH = 0.099
export const DIE_TARGET_HEIGHT = 0.210

export type DiePose = TrayPose

/** Sockets keep the canonical six square; only defensive overflow receives a tiny tilt. */
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
