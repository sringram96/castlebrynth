/**
 * Where things sit on the painted tray.
 *
 * The PNG owns appearance; this file owns placement. Everything is a fraction
 * of the tray's own box, so the composition never reflows — the reliquary is
 * one authored picture and its bays are where they were painted, not a
 * responsive grid.
 *
 * **Every number below was measured off `public/assets/ui/tray.png` itself**
 * (730 × 364), by luminance profile: the ribs of the frame are bright, the
 * bays between them are dark, and the boundary between the two is the edge of
 * a bay. The set carried across the product reset had drifted — the first die
 * bed sat 31 source px left of its bay and was 23 px too tall — which is what
 * made the crown read as six dice resting *on* the frame. If the plate is ever
 * repainted, this table is the only thing that needs measuring again.
 *
 * ## The plate does not bleed any more
 *
 * It used to be laid out at 458 px on a 390 px phone, so that a die bed's
 * fraction of the tray would reach the 44 px touch floor. That bought tappable
 * dice and cost the third relic bay, which fell entirely off the right edge.
 *
 * The rule now is the other way round: **the plate is laid out so that its
 * content band exactly fills the viewport**, and only the painted decorative
 * margin — which carries nothing — runs off the sides. See `CONTENT`.
 */

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** A bay's centre. Controls are seated on these, never on a bay's corner. */
export interface Point {
  readonly x: number
  readonly y: number
}

export const TRAY = {
  authoredWidth: 730,
  authoredHeight: 364,
  /** The smallest a control may be on screen, in CSS pixels. */
  minTouch: 44,
} as const

export const TRAY_ASPECT = TRAY.authoredWidth / TRAY.authoredHeight

/**
 * The horizontal band that carries meaning.
 *
 * `left` is the outer edge of the health orb's glass; `right` is the inner
 * edge of the third relic bay. Everything outside is painted decoration, and
 * decoration is the only thing allowed off-screen.
 */
export const CONTENT = { left: 0.052, right: 0.965 } as const
export const CONTENT_SPAN = CONTENT.right - CONTENT.left

/**
 * The four horizontal zones of the plate, top to bottom.
 *
 * Named so that a change can say which region it is talking about. They are
 * descriptive — the bays below carry the placement — and they are what keeps
 * the crown out of the well and the well off the beds.
 */
export const ZONES = {
  topRail: { from: 0, to: 0.143 },
  dice: { from: 0.143, to: 0.242 },
  well: { from: 0.242, to: 0.827 },
  footer: { from: 0.827, to: 1 },
} as const

/** The dark glass on the left. Health lives inside it. */
export const ORB: Rect = { x: 0.0534, y: 0.2802, width: 0.1425, height: 0.3654 }
export const ORB_TEXT: Rect = { x: 0.045, y: 0.665, width: 0.175, height: 0.085 }

/**
 * The six bays along the top. The hand, and nothing else, ever.
 *
 * Measured from the seven bright ribs at source x 170, 236.7, 303.3, 370,
 * 436.7, 503.3 and 570 — a pitch of 66⅔ px, or 0.09132 of the plate. The bay
 * interior is 55 × 36 px, which is `DIE_BAY` below.
 */
export const DIE_PITCH = 0.09132
export const DIE_CENTRES: readonly Point[] = [
  { x: 0.27854, y: 0.19231 },
  { x: 0.36986, y: 0.19231 },
  { x: 0.46119, y: 0.19231 },
  { x: 0.55251, y: 0.19231 },
  { x: 0.64384, y: 0.19231 },
  { x: 0.73516, y: 0.19231 },
]

/** The painted recess a die sits in, for reference and for the fit tests. */
export const DIE_BAY = { width: 0.07534, height: 0.0989 } as const

/** The dark recess in the middle. The stage: the score, or the room's line. */
export const WELL: Rect = { x: 0.27397, y: 0.2967, width: 0.44384, height: 0.40385 }

/**
 * Where the enemy's line stands: in the well, under the crown, in column.
 *
 * Its line used to float above the plate over the room art, because the
 * painted frame has no bay for it. On a dark floor at a dark hour that was
 * four unreadable objects, which is not a line you can answer. The well is
 * already a dark recess and is the only region wide enough to hold a row, so
 * the line moved into it and no repaint was needed.
 *
 * **It uses the crown's pitch, not the well's.** Six lanes at `DIE_PITCH` span
 * 0.532 of the plate and the well's recess is 0.444, so the outer two bones
 * overhang the recess by about 18 px a side and rest on the painted frame.
 * That is the cheaper of the two costs available: lane N against lane N is the
 * entire smash rule, and the column is how a player reads a pairing before an
 * animation explains it. Fitting the recess would have meant a row whose lanes
 * converge on the hand above them like a perspective error.
 *
 * The bones are read, never pressed, so they are seated at their painted size
 * rather than grown to the 44 px touch floor.
 */
export const ENEMY_ROW_Y = 0.3906
export const ENEMY_LANES: readonly Point[] = DIE_CENTRES.map((c) => ({
  x: c.x,
  y: ENEMY_ROW_Y,
}))

export const ENEMY_BONE = { width: 0.058, height: 0.155 } as const

/**
 * Three small bays on the right. Relics sit here, and are the one place the
 * player can see their passive build without opening anything.
 */
export const RELIC_PITCH = 0.0753
export const RELIC_CENTRES: readonly Point[] = [
  { x: 0.776, y: 0.57967 },
  { x: 0.85137, y: 0.57967 },
  { x: 0.92877, y: 0.57967 },
]

export const RELIC_BAY = { width: 0.0452, height: 0.2473 } as const

/**
 * The three beds along the bottom. The persistent controls.
 *
 * Left is always MENU. Centre is always the primary action. Right is the
 * secondary, and is absent rather than disabled when there is not one. Their
 * meaning never moves between beds, in any mode.
 *
 * The painted beds are 45 source px deep — about 26 CSS px on a phone — so a
 * button grown to the 44 px touch floor overhangs them top and bottom. It
 * overhangs decoration, never another control, and it is centred on the bay so
 * the overhang is even.
 */
export const ACTION_BEDS: readonly Rect[] = [
  { x: 0.15479, y: 0.82692, width: 0.20548, height: 0.12363 },
  { x: 0.37671, y: 0.82692, width: 0.24247, height: 0.12363 },
  { x: 0.63425, y: 0.82692, width: 0.20274, height: 0.12363 },
]

/**
 * How wide to lay the plate out for a given viewport.
 *
 * The content band fills the viewport less a hair of safety, and the painted
 * margin takes the overflow. `src/style.css` computes the same thing in CSS —
 * this is here so a test can state the expectation in one place, and so the
 * number has somewhere to be explained.
 */
export const TRAY_SAFETY = 6
export const TRAY_MAX = 620

export function trayWidthFor(viewportWidth: number): number {
  return Math.min(TRAY_MAX, (viewportWidth - TRAY_SAFETY) / CONTENT_SPAN)
}
