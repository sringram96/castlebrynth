/**
 * **The well** — the reliquary's main content box, and what flows inside it.
 *
 * The panel carves one wide recess in its middle, and what stands in it is
 * whatever the thumb has asked for: the room's verbs under ACTS, what you are
 * carrying under POUCH, the duel while a fight is on. The box never moves —
 * its rectangle is authored in `src/content/ui/reliquary.ts` like everything
 * else on the panel — so this file is only about **the flow inside it**.
 *
 * That split is the point. The well does not know what it holds. It is handed
 * a count and a height and answers how the rows are arranged; a caller that
 * wants to put something new in the tray writes the rows and nothing here
 * changes. Adding content to the panel stops being a layout problem.
 *
 * **A list, and it becomes two columns rather than running off the bottom.**
 * One column while the rows fit the recess; two when they do not, because a
 * recess is a fixed depth and a list that overflows it is a list with a row
 * nobody can see (art. 42's reasoning, said about a tray instead of a hand).
 * Rows shrink toward a floor before a second column opens, and never below it
 * — a row is a thing a thumb presses, and art. 128's floor is about the press
 * and not about the words in it.
 */

/** How large a row wants to be, and how small it may be made. */
export interface WellDial {
  /** What a row is when there is room. */
  readonly item: number
  /** Below this a thumb misses. The same forty the world band's marks use. */
  readonly min: number
  readonly gap: number
}

export const WELL_DIAL: WellDial = { item: 40, min: 34, gap: 4 }

/** The arrangement: how many columns, how many rows in each, how tall a row is. */
export interface WellFlow {
  readonly columns: number
  readonly perColumn: number
  readonly item: number
  readonly gap: number
  /**
   * Whether the arrangement still does not fit, so the well has to scroll.
   * It is reported rather than hidden: a caller that would rather paginate,
   * or a content author who should be writing fewer rows, can both see it.
   */
  readonly overflows: boolean
}

/** How many rows of `size` stand in `height`. At least one, always. */
function rowsIn(height: number, size: number, gap: number): number {
  if (size <= 0) return 1
  return Math.max(1, Math.floor((Math.max(0, height) + gap) / (size + gap)))
}

/**
 * Lay `count` rows out in a box `height` tall.
 *
 * The order it tries things in is the design:
 *
 * 1. **One column at the size a row wants.** The common case — two or three
 *    verbs in a room — and it is what the recess was carved for.
 * 2. **Shrink the row toward the floor**, because a slightly shorter row is
 *    a smaller change than a second column.
 * 3. **Open a second column.** Two is the shape the panel reads well at: the
 *    recess is much wider than it is deep, so a column pair fills it rather
 *    than leaving half of it dark.
 * 4. **More columns, then scroll.** Both are degradations and both are
 *    reported. A well that needs four columns is a well being asked to hold a
 *    screen's worth of content, which is what the tabs are for.
 */
export function wellFlow(count: number, height: number, dial: WellDial = WELL_DIAL): WellFlow {
  if (count <= 0) {
    return { columns: 0, perColumn: 0, item: dial.item, gap: dial.gap, overflows: false }
  }
  const { gap } = dial
  // 1 · one column, at the size a row wants
  if (count <= rowsIn(height, dial.item, gap)) {
    return { columns: 1, perColumn: count, item: dial.item, gap, overflows: false }
  }
  // 2 · shrink toward the floor before opening a column
  let item = dial.item
  while (item > dial.min && count > rowsIn(height, item, gap)) item--
  if (count <= rowsIn(height, item, gap)) {
    return { columns: 1, perColumn: count, item, gap, overflows: false }
  }
  // 3 · two columns, at the size a row wants — the shrink is undone, because
  // once a column has opened there is room to be legible again.
  const roomy = rowsIn(height, dial.item, gap)
  if (count <= roomy * 2) {
    return {
      columns: 2,
      perColumn: Math.ceil(count / 2),
      item: dial.item,
      gap,
      overflows: false,
    }
  }
  // 4 · past that it is more columns at the floor, and it says so.
  const tight = rowsIn(height, dial.min, gap)
  const columns = Math.ceil(count / tight)
  return {
    columns,
    perColumn: Math.ceil(count / columns),
    item: dial.min,
    gap,
    overflows: columns > 2,
  }
}
