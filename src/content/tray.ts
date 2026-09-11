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

/**
 * The count under the glass.
 *
 * **Centred on the orb, not on the plate.** It used to run 0.045 → 0.220, whose
 * middle is 0.1325, while the glass's middle is 0.12465 — five pixels of drift
 * on a phone, which is exactly the kind of thing the seating audit was opened
 * to find: a word that is *nearly* on its plate reads as a word that was put
 * there by a layout rather than painted there. The box is now the orb's own
 * width, centred on the orb's own centre, and `SEATED` below asserts it.
 */
export const ORB_TEXT: Rect = { x: ORB.x - 0.016, y: 0.665, width: ORB.width + 0.032, height: 0.085 }

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

/**
 * The iron die, and the item dice, on the same rail as the six.
 *
 * The plate was painted with **six** bays and the loadout wave needs nine
 * positions, so three of them stand on the rail rather than in a recess: the
 * iron die one pitch to the left of the first bay, the two item dice one and
 * two pitches to the right of the last. They keep the crown's pitch and its
 * baseline, so the row reads as one row of dice at one height, which is the
 * whole point of putting them there — the iron rolls *with* the six and the
 * items are visibly the same kind of object.
 *
 * The iron sits at 0.175 rather than at a clean 0.18722 (one exact pitch out)
 * so that its box clears the well's left edge at 0.225 at every width. Nothing
 * here is a control: none of the three is ever pressable, all three are
 * `pointer-events: none`, and the two rules that govern controls — the 44 px
 * floor and the no-overlap rule — are about controls.
 *
 * **A painted bay for each of them is owed.** See `POLISH_PROGRESS.md`
 * § HUMAN ART REQUIRED — the loadout. No art was authored for this wave.
 */
export const IRON_CENTRES: readonly Point[] = [{ x: 0.175, y: 0.19231 }]
export const ITEM_CENTRES: readonly Point[] = [
  { x: 0.82648, y: 0.19231 },
  { x: 0.9178, y: 0.19231 },
]

/**
 * The dark recess in the middle. The stage: the scorecard, or the room's line.
 *
 * **It is wider and deeper than the painted recess, and that is deliberate.**
 * The recess itself is 0.444 × 0.404 — 187 × 84 px on a phone — which was
 * enough for two lines of prose and is not enough for eight scorecard entries
 * and a row of real buttons. So the box runs sideways to just inside the pile
 * orb's caption and the first satchel bay, and downwards to just above the
 * beds, overhanging the painted frame's ribs left, right and below.
 *
 * That overhang is precedented rather than novel: the enemy's line used to
 * overhang the same recess by about 18 px a side, for the same reason — the
 * plate has one region wide enough to carry what a fight is doing, and the
 * alternative to spilling over its ribs is not showing the fight. The box
 * carries its own scrim in CSS so the text stays readable over them. No art is
 * touched.
 *
 * The **top** edge is the one that did not move. The six die targets are 44 px
 * tall on a plate whose bays are 21, so they already hang below their own
 * recess; a well that started any higher would be a scorecard entry sitting
 * under a bone. Every other edge is bounded the same way: by the control it
 * would otherwise collide with, not by the painting.
 */
export const WELL: Rect = { x: 0.225, y: 0.2967, width: 0.51, height: 0.4863 }

/**
 * Three small bays on the right. Relics sit here, and are the one place the
 * player can see their passive build without opening anything.
 *
 * The first is the Vial and never moves. The second is the talisman, which is
 * where its flat pops when its line is the one scored — the number appears on
 * the thing that made it, which is the whole readout ruling in one place. The
 * third is left as a painted recess.
 */
export const RELIC_PITCH = 0.0753
export const RELIC_CENTRES: readonly Point[] = [
  { x: 0.776, y: 0.57967 },
  { x: 0.85137, y: 0.57967 },
  { x: 0.92877, y: 0.57967 },
]

/** Which bay each carried thing sits in. Stable: the thumb learns the plate. */
export const VIAL_BAY = 0
export const TALISMAN_BAY = 1

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

/**
 * ── the seating audit ─────────────────────────────────────────────────
 *
 * **Every word on the plate is measured against the painted region it lives
 * in, and never against the viewport.** That is the whole of it, and it is
 * written down because the failure it fixes is invisible in code review: a
 * label centred in a flex row that happens to be a few pixels wider than its
 * recess reads as a word that drifted off its plate, and nothing in the
 * stylesheet says it is wrong.
 *
 * Each entry names a selector, the region it belongs to, and how it is seated
 * in it. `centre` means the element's middle sits on the region's middle in
 * both axes. `left` is the one declared exception — the ways out of a room are
 * a list and a ragged left edge is how a list reads — and it means the
 * element's left edge sits on the region's left edge, with its middle still on
 * the region's middle vertically.
 *
 * `fits` is the honest half. Several of the painted regions are **smaller than
 * the words they carry**: the relic bays are 0.0452 of a 730 px plate, which is
 * 19 px on a phone, and `VIAL` is not 19 px. The answer to that is not a
 * squeezed font — it is a painted housing, and it is recorded as owed art in
 * `POLISH_PROGRESS.md` § HUMAN ART REQUIRED. What is asserted here is that the
 * word is **on its plate's centre**, which is the part the code can be held to.
 *
 * `test/browser/tray.spec.ts` walks this table across every screen the tray is
 * up on. Adding a text element to the plate without adding it here is caught
 * there too: the audit asserts that every seated-looking node it finds in the
 * well, the bays and the beds is one this table names.
 */
export interface SeatedText {
  /** A CSS selector, unique on any screen it appears on. */
  readonly id: string
  /** The painted region, in the plate's own fractions. */
  readonly region: Rect
  readonly align: 'centre' | 'left'
  /** Whether the painted region is wide enough to hold the words. */
  readonly fits: boolean
  readonly note?: string
}

const bayRegion = (index: number): Rect => ({
  x: RELIC_CENTRES[index]!.x - RELIC_BAY.width / 2,
  y: RELIC_CENTRES[index]!.y - RELIC_BAY.height / 2,
  width: RELIC_BAY.width,
  height: RELIC_BAY.height,
})

export const SEATED: readonly SeatedText[] = [
  { id: '#pile', region: ORB_TEXT, align: 'centre', fits: true },
  { id: '#iron-caption', region: WELL, align: 'centre', fits: true },
  { id: '#readout', region: WELL, align: 'centre', fits: true },
  { id: '#scorecard', region: WELL, align: 'centre', fits: true },
  { id: '#attack-line', region: WELL, align: 'centre', fits: true },
  {
    id: '#routes',
    region: WELL,
    align: 'left',
    fits: true,
    note: 'A list of ways on. Ragged left, because that is how a list reads.',
  },
  { id: '#brief', region: WELL, align: 'centre', fits: true },
  {
    id: '.satchel-slot .satchel-label',
    region: bayRegion(VIAL_BAY),
    align: 'centre',
    fits: false,
    note: 'The painted recess is 19px on a phone. VIAL is not. Owed art.',
  },
  { id: '.satchel-slot .satchel-count', region: bayRegion(VIAL_BAY), align: 'centre', fits: true },
  {
    id: '.talisman-slot .bay-label',
    region: bayRegion(TALISMAN_BAY),
    align: 'centre',
    fits: false,
    note: 'The same recess, the same width, the same owed housing.',
  },
  { id: '.talisman-slot .bay-count', region: bayRegion(TALISMAN_BAY), align: 'centre', fits: true },
  { id: '[data-act="menu"]', region: ACTION_BEDS[0]!, align: 'centre', fits: true },
  { id: '[data-act="roll"]', region: ACTION_BEDS[1]!, align: 'centre', fits: true },
  { id: '[data-act="reroll"]', region: ACTION_BEDS[1]!, align: 'centre', fits: true },
  { id: '[data-act="fight"]', region: ACTION_BEDS[1]!, align: 'centre', fits: true },
  { id: '[data-act="map"]', region: ACTION_BEDS[2]!, align: 'centre', fits: true },
]

/**
 * The same audit for the chrome over the world.
 *
 * There is no plate here — the region is the world box itself — so the rects
 * are fractions of it. The word band and the enemy's line are centred in the
 * box and nowhere else, which is what stops a say line drifting under a
 * hotspot when a room's art changes.
 */
export const SEATED_WORLD: readonly SeatedText[] = [
  { id: '#say', region: { x: 0, y: 0.78, width: 1, height: 0.22 }, align: 'centre', fits: true },
  { id: '#enemy-bar', region: { x: 0, y: 0, width: 1, height: 0.26 }, align: 'centre', fits: true },
]
