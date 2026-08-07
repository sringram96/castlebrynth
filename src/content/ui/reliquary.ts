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
 * Coordinates are the artwork's native pixels — 1619 × 971 — because that is
 * the space an art direction is given in: *put it at x=728, y=397* is an
 * instruction an engineer does not have to interpret.
 */

import type { TrayFrame, TrayPose, TrayRect } from '../../shell/tray-space.js'

/** The plate's own dimensions. The manifest declares the same two numbers. */
export const RELIQUARY_FRAME: TrayFrame = {
  authoredWidth: 1619,
  authoredHeight: 971,
}

export interface ReliquaryMap extends TrayFrame {
  /** The glass the body's level rises in. */
  readonly healthOrb: TrayRect
  /** Where the two numerals sit under it. */
  readonly healthText: TrayRect
  /** The inscription rail: what is coming, and what is unspent. */
  readonly statusRail: TrayRect
  /** The dark central recess the hand rests in. */
  readonly mainWell: TrayRect
  /** The running total, at the well's near corner. */
  readonly score: TrayRect
  /**
   * The turn's verb. **There is no painted plaque for an action** — the three
   * beds along the foot are the tabs — so this is a bare anchor and the verb
   * is text on the apparatus. An authored bed would let it be inscribed; it is
   * reported as owed rather than drawn in CSS.
   */
  readonly action: TrayRect
  /** The three beds along the foot, which the painted divisions really do map. */
  readonly tabs: readonly TrayRect[]
}

export const RELIQUARY: ReliquaryMap = {
  ...RELIQUARY_FRAME,
  healthOrb: { x: 104, y: 301, width: 236, height: 258 },
  healthText: { x: 78, y: 566, width: 288, height: 96 },
  statusRail: { x: 372, y: 292, width: 940, height: 52 },
  mainWell: { x: 340, y: 272, width: 1004, height: 408 },
  score: { x: 400, y: 596, width: 300, height: 70 },
  action: { x: 1000, y: 562, width: 344, height: 104 },
  tabs: [
    { x: 280, y: 720, width: 309, height: 124 },
    { x: 615, y: 720, width: 355, height: 124 },
    { x: 1000, y: 720, width: 329, height: 124 },
  ],
}

/**
 * **The six carved cells the dice rest in**, measured once off the artwork.
 *
 * The strip across the top of the reliquary is six recesses at a pitch of
 * about 117 authored pixels, each roughly 105 wide and 72 deep. The dice go in
 * them — that is the art direction, and this is where it is written down.
 */
export const DIE_CELLS: readonly TrayRect[] = [
  { x: 482, y: 191, width: 108, height: 72 },
  { x: 605, y: 191, width: 105, height: 72 },
  { x: 725, y: 191, width: 100, height: 72 },
  { x: 840, y: 191, width: 100, height: 72 },
  { x: 955, y: 191, width: 100, height: 72 },
  { x: 1070, y: 191, width: 100, height: 72 },
]

/**
 * **How large a die is drawn, and how large a die is pressed.**
 *
 * Two different rectangles about one point. The drawing is sized to the cell
 * it sits in — 72 authored pixels, which at a 390-pixel stage is about 17 CSS
 * pixels. The target is the largest rectangle that fits the cell's *pitch*
 * without touching its neighbour, and it is taller than the strip because
 * there is free room above and below it: about 27 × 36 CSS pixels.
 *
 * **That is under art. 128's forty-pixel floor, and it is a deliberate
 * choice** — the painted cells were preferred to the target size, twice and
 * knowingly. It is recorded here rather than hidden because it is a real tax
 * on every press in the duel, and because the repair is a number in this file
 * the day a wider strip is drawn.
 */
export const DIE_ART = 72
export const DIE_TARGET_WIDTH = 112
export const DIE_TARGET_HEIGHT = 150

/**
 * **The hand, as authored placement — and the hand is six.**
 *
 * `HAND_SIZE` is six (art. 60, in content) and the plate carries six cells, so
 * the composition is the plain one: **one die per cell, and that is the
 * picture.** No layout algorithm, no flex box, no arrangement decided at
 * runtime.
 *
 * Other counts are **handled, not designed**. A wound can shorten a hand and
 * an intent can bind a die, so the engine may hand this fewer than six; a
 * mercy may someday hand it more. Those cases sit in the middle cells or
 * overflow into a second row beneath, which keeps the tray honest without
 * anybody art-directing a five-die tableau nobody has asked for. art. 128 is
 * unchanged: the tray renders the hand it is given, nothing caps it, and
 * nothing here is a slot a die is required to fill.
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
    // A short row is centred among the cells rather than left-packed.
    const from = Math.floor((perRow - inRow) / 2)
    const cell = cells[from + (i % perRow)] ?? cells[cells.length - 1]!
    out.push({
      x: cell.x + (cell.width - DIE_ART) / 2,
      y: cell.y + (cell.height - DIE_ART) / 2 + row * (DIE_ART + 22),
      width: DIE_ART,
      height: DIE_ART,
      rotation: TILTS[i % TILTS.length] ?? 0,
    })
  }
  return out
}
