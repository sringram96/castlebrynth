/**
 * The reliquary, as composition.
 *
 * The PNG owns appearance. This file owns placement. Everything is expressed
 * in normalized tray-space (0..1), then projected uniformly by tray-space.ts.
 * No viewport-dependent reflow is allowed inside the painted apparatus.
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
 * Measured from reference/visual/reliquary-runtime-target.png.
 *
 * The six sockets are the crown. The wide central recess is the active panel.
 * The three footer beds are Actions / Pouch / Map. The right-hand vertical
 * cavities are secondary/future carried-item space; they are not die slots.
 */
export const RELIQUARY: ReliquaryMap = {
  ...RELIQUARY_FRAME,

  // The orb is deliberately large. The fill is presentation; the number sits
  // near its foot and must not be allowed to collapse the glass.
  healthOrb: { x: 0.043, y: 0.220, width: 0.190, height: 0.390 },
  healthText: { x: 0.055, y: 0.585, width: 0.145, height: 0.105 },

  // Fight inscriptions live inside the upper lip of the central well, not on
  // top of the six dice.
  statusRail: { x: 0.270, y: 0.282, width: 0.300, height: 0.055 },

  // The crown containing the canonical six-die hand.
  diceZone: { x: 0.205, y: 0.080, width: 0.575, height: 0.185 },

  // The large authored recess from the clean panel.
  mainWell: { x: 0.255, y: 0.270, width: 0.470, height: 0.450 },

  // Secondary fight readout positions inside the well.
  score: { x: 0.270, y: 0.640, width: 0.205, height: 0.065 },
  action: { x: 0.590, y: 0.635, width: 0.135, height: 0.075 },

  // The remaining small top-right recess after the widened six-die crown.
  menu: { x: 0.800, y: 0.095, width: 0.055, height: 0.105 },

  // The actual three carved footer beds.
  tabs: [
    { x: 0.132, y: 0.800, width: 0.235, height: 0.140 },
    { x: 0.370, y: 0.800, width: 0.250, height: 0.140 },
    { x: 0.623, y: 0.800, width: 0.235, height: 0.140 },
  ],
}

/**
 * The six widened sockets in the supplied runtime painting.
 *
 * These are artwork geometry, not a layout algorithm. Six is the authored
 * hand. A shorter hand is centered for defensive/general engine support; a
 * longer hand may spill below, but no shipped composition is designed around
 * that case.
 */
export const DIE_CELLS: readonly TrayRect[] = [
  { x: 0.2110, y: 0.0895, width: 0.0882, height: 0.1602 },
  { x: 0.3065, y: 0.0895, width: 0.0882, height: 0.1602 },
  { x: 0.4020, y: 0.0895, width: 0.0882, height: 0.1602 },
  { x: 0.4966, y: 0.0895, width: 0.0882, height: 0.1602 },
  { x: 0.5921, y: 0.0895, width: 0.0882, height: 0.1602 },
  { x: 0.6877, y: 0.0895, width: 0.0882, height: 0.1602 },
]

/**
 * The visible die nearly fills its carved socket. The target is wider than the
 * old implementation but never visibly draws a box around the die.
 */
export const DIE_SPRITE = 0.078
export const DIE_TARGET_WIDTH = 0.092
export const DIE_TARGET_HEIGHT = 0.200

export type DiePose = TrayPose

/** Sockets keep the canonical six square; only overflow receives a tiny tilt. */
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
