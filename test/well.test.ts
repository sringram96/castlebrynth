/**
 * The well's flow — the arrangement inside the reliquary's central recess.
 *
 * `wellFlow` is the whole of the abstraction the tray's main box rests on, and
 * it is deliberately ignorant of what it is arranging: it is handed a count and
 * a depth and it answers with columns, rows and a size. So these tests are
 * about counts and depths and nothing else — no verb, no die, no pouch.
 */

import { describe, expect, it } from 'vitest'

import { WELL_DIAL, wellFlow } from '../src/shell/well.js'

/** A depth that holds exactly four rows at the size a row wants. */
const FOUR_DEEP = WELL_DIAL.item * 4 + WELL_DIAL.gap * 3

/** A depth that holds four rows at full size and five at the floor. */
const SHRINK_DEEP = WELL_DIAL.min * 5 + WELL_DIAL.gap * 4

describe('the well flows', () => {
  it('draws nothing when it holds nothing', () => {
    const flow = wellFlow(0, FOUR_DEEP)
    expect(flow.columns).toBe(0)
    expect(flow.perColumn).toBe(0)
    expect(flow.overflows).toBe(false)
  })

  it('is one column at full size while the rows fit — the ordinary room', () => {
    for (const count of [1, 2, 3, 4]) {
      const flow = wellFlow(count, FOUR_DEEP)
      expect(flow.columns, `${count} rows`).toBe(1)
      expect(flow.perColumn).toBe(count)
      expect(flow.item).toBe(WELL_DIAL.item)
      expect(flow.overflows).toBe(false)
    }
  })

  it('shrinks a row toward the floor before it opens a column', () => {
    // Five rows do not fit at 40 in this depth, and do fit at the floor.
    const flow = wellFlow(5, SHRINK_DEEP)
    expect(flow.columns).toBe(1)
    expect(flow.item).toBeLessThan(WELL_DIAL.item)
    expect(flow.item).toBeGreaterThanOrEqual(WELL_DIAL.min)
  })

  it('never draws a row below the floor a thumb needs (art. 128)', () => {
    for (const count of [1, 5, 9, 20, 60]) {
      expect(wellFlow(count, FOUR_DEEP).item, `${count} rows`).toBeGreaterThanOrEqual(WELL_DIAL.min)
    }
  })

  it('opens a second column rather than running off the bottom', () => {
    const flow = wellFlow(8, FOUR_DEEP)
    expect(flow.columns).toBe(2)
    expect(flow.perColumn).toBe(4)
    expect(flow.item).toBe(WELL_DIAL.item)
    expect(flow.overflows).toBe(false)
  })

  it('undoes the shrink once a column has opened — there is room to be legible', () => {
    expect(wellFlow(7, FOUR_DEEP).item).toBe(WELL_DIAL.item)
  })

  it('holds every row it was given, in whatever shape it chose', () => {
    for (const count of [1, 3, 5, 7, 8, 13, 40]) {
      const flow = wellFlow(count, FOUR_DEEP)
      expect(flow.columns * flow.perColumn, `${count} rows`).toBeGreaterThanOrEqual(count)
    }
  })

  it('says so when it has been asked to hold a screenful — it never hides it', () => {
    const flow = wellFlow(40, FOUR_DEEP)
    expect(flow.overflows).toBe(true)
    expect(flow.columns).toBeGreaterThan(2)
  })

  it('is one row in a depth that holds none, rather than none', () => {
    const flow = wellFlow(1, 0)
    expect(flow.columns).toBe(1)
    expect(flow.perColumn).toBe(1)
  })

  it('takes a dial, so the caller sets the floor and not this file', () => {
    const flow = wellFlow(4, 100, { item: 20, min: 20, gap: 0 })
    expect(flow.columns).toBe(1)
    expect(flow.item).toBe(20)
  })
})
