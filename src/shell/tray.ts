/**
 * The tray's dice, laid out — art. 128.
 *
 * The hand has never been six in the engine: `Hand` is a collection and
 * art. 60 has always said hand size is a body stat, grown by mercies and
 * shrunk by wounds. What *was* six was the tray — a fixed 48-pixel slot with
 * a fixed gap, tuned until six of them fitted one row on a 390-pixel phone.
 * That is a presentation constant standing in for a game rule, and the moment
 * a mercy grew the hand to seven it would have wrapped into a ragged second
 * row nobody designed.
 *
 * So the layout is computed from the count instead of tuned for it. Four
 * numbers go in — how many dice, how much room, the size a die wants to be,
 * the size below which a thumb stops being able to hit it — and a size, a
 * gap and a row count come out.
 *
 * **The floor is a touch target and it does not bend.** `MIN` is the same
 * forty device pixels the world band's marks use for the same reason: a
 * thumb is a thumb, and art. 6 says everything clickable is always
 * clickable. When the dice will not fit a row at that size they wrap to
 * another row; they are never shrunk under it and the tray never scrolls.
 * Scrolling would hide a die, and a die you cannot see is a die you cannot
 * plan with (art. 42).
 */

/** How large a die wants to be, and how small it may be made (art. 128). */
export interface DieDial {
  /** What a die is at the canonical hand. Card 94's 48, unchanged. */
  readonly preferred: number
  /** Below this a thumb misses. The world band's `THUMB`, and the same 40. */
  readonly min: number
  /** A short hand gets larger dice rather than a wider gap. */
  readonly max: number
  readonly gap: number
  readonly minGap: number
}

export const DIE_DIAL: DieDial = {
  preferred: 48,
  min: 40,
  max: 60,
  gap: 6,
  minGap: 4,
}

export interface TrayLayout {
  /** The side of a die, in CSS pixels. */
  readonly size: number
  readonly gap: number
  /** How many dice stand on the widest row. */
  readonly perRow: number
  readonly rows: number
}

/**
 * Lay out `count` dice in `width` pixels.
 *
 * The order it tries things in is the design:
 *
 * 1. **Fit them all on one row at the size they want.** This is the common
 *    case and the canonical hand is in it.
 * 2. **If there is room to spare, grow them** — up to `max`. A hand of two
 *    reads as two heavy bones rather than two small ones adrift in a wide
 *    tray, which is what the reference's tray does with three.
 * 3. **If they are tight, shrink them** — down to `min`, tightening the gap
 *    first, because a gap is spacing and a die is a target.
 * 4. **If they still will not fit, wrap.** Rows are balanced, so nine dice
 *    are five and four rather than eight and one — a row with one die on it
 *    reads as a mistake, and a balanced pair of rows reads as a big hand.
 *
 * `count` of zero is legal and answers a layout with no rows. Nothing in the
 * current rules deals a hand of nothing, but a bind that took the last die
 * would, and presentation code that divides by the count is presentation
 * code that crashes the day the rules change (art. 128).
 */
export function layoutDice(count: number, width: number, dial: DieDial = DIE_DIAL): TrayLayout {
  if (count <= 0) return { size: dial.preferred, gap: dial.gap, perRow: 0, rows: 0 }
  const room = Math.max(0, width)

  // How wide `n` dice of `size` are, with `gap` between them.
  const spanOf = (n: number, size: number, gap: number): number => n * size + (n - 1) * gap

  if (spanOf(count, dial.preferred, dial.gap) <= room) {
    // There is room. Grow toward `max`, keeping the gap — a wider gap would
    // spend the room on nothing, and a bigger die spends it on the thing the
    // player is reading.
    let size = dial.preferred
    while (size < dial.max && spanOf(count, size + 1, dial.gap) <= room) size++
    return { size, gap: dial.gap, perRow: count, rows: 1 }
  }

  // Tight. Tighten the gap before touching the die.
  if (spanOf(count, dial.preferred, dial.minGap) <= room) {
    return { size: dial.preferred, gap: dial.minGap, perRow: count, rows: 1 }
  }

  // Shrink, but never below the thumb.
  let size = dial.preferred
  while (size > dial.min && spanOf(count, size - 1, dial.minGap) > room) size--
  if (spanOf(count, size, dial.minGap) <= room) {
    return { size, gap: dial.minGap, perRow: count, rows: 1 }
  }

  // It does not fit at the floor, so it wraps. How many fit a row at the
  // floor, then balanced across as many rows as that needs.
  const fits = Math.max(1, Math.floor((room + dial.minGap) / (dial.min + dial.minGap)))
  const rows = Math.ceil(count / fits)
  const perRow = Math.ceil(count / rows)
  return { size: dial.min, gap: dial.minGap, perRow, rows }
}

/**
 * The dice split into the rows they are drawn in, longest row first.
 *
 * It returns indices rather than dice so that nothing here has to know what
 * a die is — the tray hands it a count and gets back the shape, and
 * selection stays a property of a die's identity rather than of where it
 * happens to sit (art. 128).
 */
export function diceRows(count: number, layout: TrayLayout): readonly (readonly number[])[] {
  if (count <= 0 || layout.rows === 0) return []
  const rows: number[][] = []
  for (let i = 0; i < count; i += layout.perRow) {
    rows.push(Array.from({ length: Math.min(layout.perRow, count - i) }, (_, k) => i + k))
  }
  return rows
}

// ── The painted tray's hand, as a composition ──────────────────────────
//
// `layoutDice` above answers *what fits*. In the painted tray that is the
// wrong question: the dice are physical pieces resting in a well, not cells
// in a grid, and how many stand on a row is an art-direction decision rather
// than a consequence of the width left over. Five dice fit one row easily and
// are still authored as three and two, because a hand reads as a hand.
//
// The table is the art direction, stated once. Past it the rule is four to a
// row, which keeps the shape rather than inventing a new one — nothing here
// caps the hand, and art. 128's collection is untouched.

/** How many rows a hand of `n` is arranged in, in the painted tray. */
export const HAND_ROWS: Readonly<Record<number, number>> = {
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 2,
  6: 2,
  7: 2,
  8: 2,
}

export function composedRows(count: number): number {
  if (count <= 0) return 0
  return HAND_ROWS[count] ?? Math.ceil(count / 4)
}

/**
 * The hand as an arrangement rather than a fit.
 *
 * The row count is authored; the die size is then the largest that lets that
 * arrangement stand in the room available, never below the floor a thumb
 * needs (art. 128, unamended — the floor is on the *target*, and how much
 * bone is drawn inside it is a separate question the shell answers).
 *
 * The gap stays tight on purpose: spreading the dice to fill the well would
 * make them read as a toolbar. They are a handful, thrown down.
 */
export function composedHand(count: number, width: number, dial: DieDial = DIE_DIAL): TrayLayout {
  if (count <= 0) return { size: dial.preferred, gap: dial.gap, perRow: 0, rows: 0 }
  const rows = composedRows(count)
  const perRow = Math.ceil(count / rows)
  const room = Math.max(0, width)
  const fits = (size: number, gap: number): boolean => perRow * size + (perRow - 1) * gap <= room
  let gap = dial.gap
  let size = dial.preferred
  while (size > dial.min && !fits(size, gap)) size--
  if (!fits(size, gap)) gap = dial.minGap
  while (size > dial.min && !fits(size, gap)) size--
  return { size, gap, perRow, rows }
}
