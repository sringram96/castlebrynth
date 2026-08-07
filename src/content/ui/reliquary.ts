/**
 * **The reliquary, as composition** — the one authoritative statement of
 * where anything in the tray stands.
 *
 * `ui/reliquary.png` owns appearance: silhouette, ornament, material,
 * recesses, borders, weight. This file owns composition: what is where, in the
 * artwork's own pixels. CSS owns almost nothing — it renders and it takes
 * taps, and it decides no position at all.
 *
 * Every number below was **measured once** against the asset as rendered, and
 * is now the source of truth. Nothing at runtime re-measures a decorative
 * recess; nothing at runtime infers a position from a flex box. When the art
 * director moves something, they move it here.
 *
 * Coordinates are **fractions of the panel**, 0 to 1 across and 0 to 1 down,
 * which is the space the art direction arrives in
 * (`reference/visual/reliquary-zones.png`). An art director reads a number
 * back off their own diagram; nobody converts anything.
 */

import type { TrayFrame, TrayPose, TrayRect } from '../../shell/tray-space.js'

/** The panel's own dimensions. The manifest declares the same two numbers. */
export const RELIQUARY_FRAME: TrayFrame = {
  authoredWidth: 1460,
  authoredHeight: 727,
}

export interface ReliquaryMap extends TrayFrame {
  /** The glass the body's level rises in. */
  readonly healthOrb: TrayRect
  /** Where the numerals sit, under the glass. */
  readonly healthText: TrayRect
  /** The inscription line: what is coming, and what is unspent. */
  readonly statusRail: TrayRect
  /** The row the dice stand in. */
  readonly diceZone: TrayRect
  /** The dark central recess. */
  readonly mainWell: TrayRect
  /** The running total, at the well's near corner. */
  readonly score: TrayRect
  /**
   * The turn's verb. **There is no painted plaque for an action**, so this is
   * a bare anchor and the verb is text on the apparatus. Reported as owed
   * rather than drawn in CSS.
   */
  readonly action: TrayRect
  /** The small utility glyph the panel carves a place for. */
  readonly menu: TrayRect
  /** The three beds along the foot. */
  readonly tabs: readonly TrayRect[]
}

/**
 * **The zones, from the art director's diagram.**
 *
 * Top rail 0–18%, dice 18–42%, main well 42–88%, footer 88–100%. The orb, the
 * menu glyph and the three tab beds are the diagram's own numbers.
 */
export const RELIQUARY: ReliquaryMap = {
  ...RELIQUARY_FRAME,
  healthOrb: { x: 0.055, y: 0.305, width: 0.128, height: 0.385 },
  healthText: { x: 0.025, y: 0.70, width: 0.19, height: 0.16 },
  statusRail: { x: 0.26, y: 0.44, width: 0.52, height: 0.08 },
  diceZone: { x: 0.0, y: 0.18, width: 1.0, height: 0.24 },
  /**
   * **The recess, measured off the painting rather than off the diagram.**
   *
   * The diagram declares the well as the panel's full width at 42–88%, which
   * is neither where the carving is nor a shape anything can stand in: at full
   * width its rows lay across the health orb on the left and the ornament on
   * the right, and at 88% its last row sat on top of a tab.
   *
   * The grooves that bound the carved recess are the darkest columns and rows
   * in the panel, so they can be found rather than guessed: they fall at
   * x 0.241 and 0.744, y 0.308 and 0.836. What is below is those bounds inset
   * off the groove itself, so what stands in the well stands *inside* the
   * carving instead of on its lip.
   */
  mainWell: { x: 0.252, y: 0.322, width: 0.481, height: 0.5 },
  score: { x: 0.26, y: 0.70, width: 0.24, height: 0.1 },
  action: { x: 0.6, y: 0.68, width: 0.18, height: 0.14 },
  menu: { x: 0.9, y: 0.04, width: 0.06, height: 0.1 },
  tabs: [
    { x: 0.13, y: 0.86, width: 0.24, height: 0.12 },
    { x: 0.38, y: 0.86, width: 0.24, height: 0.12 },
    { x: 0.63, y: 0.86, width: 0.24, height: 0.12 },
  ],
}

/**
 * **The six carved cells the dice rest in**, measured off the panel.
 *
 * The diagram's own slot table puts six 0.11-wide slots at a pitch of 0.14
 * starting at x 0.14 — which overlaps the orb it also declares at 0.02–0.20,
 * and does not line up with the six recesses the panel actually carries. The
 * painted cells win, because the direction that has been given twice is *the
 * dice go in the six top slots*. The diagram's slot sizes are used for the
 * **hit areas** instead, which is what its own note says they are.
 */
export const DIE_CELLS: readonly TrayRect[] = [
  { x: 0.270, y: 0.131, width: 0.072, height: 0.13 },
  { x: 0.348, y: 0.131, width: 0.070, height: 0.13 },
  { x: 0.423, y: 0.131, width: 0.070, height: 0.13 },
  { x: 0.499, y: 0.131, width: 0.069, height: 0.13 },
  { x: 0.574, y: 0.131, width: 0.070, height: 0.13 },
  { x: 0.649, y: 0.131, width: 0.070, height: 0.13 },
]

/**
 * **How large a die is drawn, and how large a die is pressed.**
 *
 * *"These are hit areas. Draw dice centered within each slot."* — the diagram,
 * and it is the same separation that solved the dice once already. The drawing
 * is the painted cell; the target is grown about it to the cell's own pitch
 * and to the full depth of the dice zone.
 *
 * At a 390-pixel stage that is a target of about **30 × 47 CSS pixels**. The
 * height clears art. 128's floor; **the width does not, and cannot** — it is
 * bounded by the pitch of the painted cells, and widening it would overlap the
 * neighbouring die. The diagram's own 0.11-wide slots would fix it and do not
 * sit on the carving. That is the one open question in this file.
 */
export const DIE_SPRITE = 0.062
export const DIE_TARGET_WIDTH = 0.0757
export const DIE_TARGET_HEIGHT = 0.24

/**
 * **The hand, as authored placement — and the hand is six.**
 *
 * `HAND_SIZE` is six (art. 60, in content) and the panel carries six cells, so
 * the composition is one die per cell and that is the picture. Other counts
 * are handled and not designed: fewer sit in the middle cells, more overflow
 * to a row beneath. art. 128 is unchanged — the tray renders the hand it is
 * given, nothing caps it, and a cell is not a slot a die must fill.
 */
export type DiePose = TrayPose

/** A small deterministic tilt, so a rack of dice does not read as a row of icons. */
const TILTS = [-3, 2, -2, 3, -1, 2, -3, 1]

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
      y: cell.y + (cell.height - tall) / 2 + row * (tall + 0.04),
      width: side,
      height: tall,
      rotation: TILTS[i % TILTS.length] ?? 0,
    })
  }
  return out
}
