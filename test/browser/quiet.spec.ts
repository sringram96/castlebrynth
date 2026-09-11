/**
 * Quiet rooms: the negative-space law and quiet motion, on a phone.
 *
 * `test/unit/frames.test.ts` holds the *library* to both laws — it counts what
 * a template declares. This holds the **screen** to them, which is a different
 * claim and the one that decides completion: a room can declare three presses
 * and render five if a view invents one, and a law about crowding that is only
 * ever checked in a data structure is a law about a data structure.
 *
 * Four things are proved here and nothing else is:
 *
 *   - **what is rendered fits the frame's budget**, in every room of both
 *     branches, in every position its machinery can be in;
 *   - **motion steps.** A candle sampled across a second moves in whole quanta
 *     at the rate content declared, with no transition and no keyframe anywhere
 *     in it for a browser to smooth;
 *   - **motion knows when it is not wanted.** Nothing is mounted during a
 *     cascade, during a crossing, behind an open MAP, or with motion off;
 *   - **the writing survived the audit on the device.** Every folded line is
 *     readable in the room it belongs to, by a real press or on arrival.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { ROOM_TEMPLATES } from '../../src/content/rooms.js'
import { FRAME_BUDGETS } from '../../src/content/roomResolver.js'
import { act, boot, settled, wayTo, where } from './helpers.js'

const say = (page: Page) => page.locator('#say')

/** Every hotspot in the picture that is not a way out. The press budget's own. */
const presses = (page: Page) => page.locator('#hits button:not([data-act="go"])')

/** Every plate seated in the picture. The plate budget's, as rendered. */
const plates = (page: Page) => page.locator('#midground img[data-prop]:not([hidden])')

/** Every ambient source currently mounted in the world box. */
const ambients = (page: Page) => page.locator('#world [data-ambient]')

/**
 * Hold the room on screen to its own frame's budget.
 *
 * Read through the map, never off a node id: what a spec means is *the vault*,
 * and which node this run called it is the director's business.
 */
async function fitsItsFrame(page: Page): Promise<void> {
  const id = await where(page)
  expect(id, 'the run is not standing anywhere').toBeDefined()
  const template = ROOM_TEMPLATES[id!]!
  const budget = FRAME_BUDGETS[template.composition]!

  expect(
    await presses(page).count(),
    `${id} (${template.composition}) renders more presses than its frame holds`,
  ).toBeLessThanOrEqual(budget.presses)
  expect(
    await plates(page).count(),
    `${id} (${template.composition}) renders more plates than its frame holds`,
  ).toBeLessThanOrEqual(budget.plates)
}

/**
 * Every press on screen, as a box, so the spacing can be measured rather than
 * looked at. Ways out are excluded for the same reason they are excluded from
 * the budget: they stand where the picture puts them.
 */
async function boxes(page: Page): Promise<{ id: string; x: number; y: number; w: number; h: number }[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#hits button:not([data-act="go"])')].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        id:
          el.dataset['interact'] ??
          el.dataset['loot'] ??
          el.dataset['takeId'] ??
          `look:${el.dataset['detail'] ?? '?'}`,
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
        w: r.width,
        h: r.height,
      }
    }),
  )
}

test.describe('every room fits its own frame', () => {
  /**
   * Both branches of the descent, room by room, in the positions that hold the
   * most: a worked room with every object in it, a paid one with the find still
   * lying in the recess, a fight room with the body's two spots on the floor.
   */
  const STATIONS: readonly (readonly [string, string])[] = [
    ['entry', '?room=entry'],
    ['passage', '?room=passage'],
    ['cleft', '?room=cleft'],
    // The left branch: a fight, and what it can leave on the floor.
    ['hollow', '?room=hollow'],
    // The right branch: the proving room, before and after its toll.
    ['offertory', '?room=offertory'],
    ['offertory (dark)', '?room=offertory&offertory=dark'],
    ['offertory (paid)', '?room=offertory&offertory=paid'],
    ['confluence', '?room=confluence'],
    ['sanctuary', '?room=sanctuary'],
    ['reliquary', '?room=reliquary'],
    ['reliquary (dark)', '?room=reliquary&reliquary=dark'],
    ['reliquary (open)', '?room=reliquary&reliquary=open'],
    ['fork', '?room=fork'],
    ['chain-vault', '?room=chain-vault'],
    ['chain-vault (weighted)', '?room=chain-vault&vault=weighted'],
    ['chain-vault (open)', '?room=chain-vault&vault=open'],
    ['deep', '?room=deep'],
    ['gate', '?room=gate'],
  ]

  for (const [name, fixture] of STATIONS) {
    test(`${name} renders inside its budget`, async ({ page }) => {
      await boot(page, fixture)
      await fitsItsFrame(page)
    })
  }

  test('keeps clear water between everything it seats, in the fullest room', async ({ page }) => {
    // The Reliquary with its chest open is the most crowded frame the game can
    // produce: three worked objects, a LOOK, a found thing and its TAKE. If
    // clear water holds anywhere it has to hold here.
    await boot(page, '?room=reliquary&reliquary=open')
    const found = await boxes(page)
    // Its LIGHT, its one LOOK, the Talisman lying in the chest, and the TAKE
    // under it: four boxes in one altar frame, which is the most the room ever
    // has on screen at once.
    expect(found.length).toBeGreaterThanOrEqual(4)
    for (const a of found) {
      for (const b of found) {
        if (a.id >= b.id) continue
        const water = Math.max(
          Math.abs(a.x - b.x) - (a.w + b.w) / 2,
          Math.abs(a.y - b.y) - (a.h + b.h) / 2,
        )
        expect(Math.round(water), `${a.id} and ${b.id} have no painting between them`)
          .toBeGreaterThanOrEqual(8)
      }
    }
  })

  test('walks the right branch and fits every frame on the way', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await fitsItsFrame(page)
    await act(page, 'go').click()
    await fitsItsFrame(page)
    await act(page, 'go').click()
    await fitsItsFrame(page)

    // NARROW: the toll rather than the fight.
    await (await wayTo(page, 'offertory')).click()
    expect(await where(page)).toBe('offertory')
    await fitsItsFrame(page)
    await page.locator('[data-interact="offertory-candles"]').click()
    await fitsItsFrame(page)
    await page.locator('[data-interact="offertory-altar"]').click()
    // Paid: the recess is open and the Grave Candle is lying in it, which is
    // the room at its fullest and still inside an altar frame's five.
    await fitsItsFrame(page)

    await act(page, 'go').click()
    expect(await where(page)).toBe('confluence')
    await fitsItsFrame(page)
  })

  test('walks the left branch as far as the fight and fits every frame', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    await (await wayTo(page, 'hollow')).click()
    expect(await where(page)).toBe('hollow')
    // A room painted around its encounter holds the encounter and the two spots
    // the body can pay into, and nothing else at all.
    await fitsItsFrame(page)
    await expect(act(page, 'fight')).toBeVisible()
  })
})

test.describe('the room breathes, and it breathes in steps', () => {
  test('mounts exactly what content declared, where content seated it', async ({ page }) => {
    await boot(page, '?room=entry', { motion: true })
    await expect(ambients(page)).toHaveCount(1)
    const flame = page.locator('[data-ambient="flicker"]')
    await expect(flame).toHaveAttribute('data-target', 'candles')

    // Seated on the candles the arrival line calls fresh — in whole pixels off
    // the world box, which is what the grid law is about.
    const seat = await flame.evaluate((el) => ({
      left: (el as HTMLElement).style.left,
      top: (el as HTMLElement).style.top,
    }))
    expect(seat.left).toMatch(/^\d+px$/)
    expect(seat.top).toMatch(/^\d+px$/)
  })

  test('steps in whole quanta at the rate content declared', async ({ page }) => {
    await boot(page, '?room=entry', { motion: true })

    // Every step the flame takes for a second and a bit, with the time it took
    // it. A poll would only catch whichever step happened to be up when it
    // looked; the observer catches all of them, which is what lets the *rate*
    // be asserted rather than only the fact that something moved.
    const seen = await page.evaluate(async () => {
      const node = document.querySelector<HTMLElement>('[data-ambient="flicker"]')!
      const steps: { step: string; lit: string; at: number }[] = []
      const read = (): void =>
        void steps.push({
          step: node.dataset['step'] ?? '',
          lit: node.style.getPropertyValue('--lit'),
          at: performance.now(),
        })
      const observer = new MutationObserver(read)
      observer.observe(node, { attributes: true, attributeFilter: ['data-step'] })
      await new Promise((done) => setTimeout(done, 1200))
      observer.disconnect()
      return steps
    })

    // 5 Hz for 1200 ms is six steps. Generous on both sides, because a frame
    // gate lands on frames and a loaded machine drops some.
    expect(seen.length, 'the flame did not step').toBeGreaterThanOrEqual(3)
    expect(seen.length, 'the flame is stepping faster than the clock').toBeLessThanOrEqual(9)

    // **Whole quanta, every step.** `--lit` is a count and the stylesheet
    // multiplies it by one quantum; a fraction here would be a fraction of
    // opacity for a transition to interpolate through.
    for (const beat of seen) {
      expect(Number.isInteger(Number(beat.lit)), `--lit was ${beat.lit}`).toBe(true)
    }
    // And it guttered rather than held: a flame that shows one value is a lamp.
    expect(new Set(seen.map((b) => b.lit)).size).toBeGreaterThanOrEqual(2)
  })

  test('has no transition and no keyframe anywhere in it', async ({ page }) => {
    await boot(page, '?room=entry', { motion: true })
    const css = await page.locator('[data-ambient="flicker"]').evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        transition: style.transitionProperty,
        animations: el.getAnimations().length,
        radius: style.borderTopLeftRadius,
        filter: style.filter,
      }
    })
    // Grid-in-time: it steps, so there is nothing to ease and nothing to blur,
    // and the corners are square like every other piece of chrome over the art.
    expect(css.transition).toBe('none')
    expect(css.animations).toBe(0)
    expect(css.radius).toBe('0px')
    expect(css.filter).toBe('none')
  })

  test('never takes a press', async ({ page }) => {
    await boot(page, '?room=entry', { motion: true })
    for (const node of await ambients(page).all()) {
      expect(await node.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    }
    // Which is the only reason the thing underneath is still pressable.
    await page.locator('[data-detail="candles"]').click()
    await expect(say(page)).toContainText('Candles. Fresh ones, burning')
  })

  test('sways a hanging thing by whole pixels and nothing else', async ({ page }) => {
    await boot(page, '?room=chain-vault', { motion: true })
    const chain = page.locator('[data-ambient="sway"]')
    await expect(chain).toHaveCount(1)
    const shifts = await page.evaluate(async () => {
      const node = document.querySelector<HTMLElement>('[data-ambient="sway"]')!
      const seen: string[] = []
      const observer = new MutationObserver(() =>
        seen.push(node.style.getPropertyValue('--shift')),
      )
      observer.observe(node, { attributes: true, attributeFilter: ['data-step'] })
      await new Promise((done) => setTimeout(done, 1400))
      observer.disconnect()
      return seen
    })
    expect(shifts.length).toBeGreaterThanOrEqual(1)
    for (const shift of shifts) {
      expect(Number.isInteger(Number(shift)), `--shift was ${shift}`).toBe(true)
      expect(Math.abs(Number(shift))).toBeLessThanOrEqual(1)
    }
  })
})

test.describe('the ossuary has dust in it', () => {
  test('carries the territory ambient into every room of the stretch', async ({ page }) => {
    for (const room of ['passage', 'cleft', 'hollow']) {
      await boot(page, `?room=${room}`, { motion: true })
      await expect(page.locator('[data-ambient="drift"]'), room).toHaveCount(1)
    }
    // And not into a stretch that is not the ossuary.
    await boot(page, '?room=sanctuary', { motion: true })
    await expect(page.locator('[data-ambient="drift"]')).toHaveCount(0)
  })

  test('keeps six motes, inside the box, forever', async ({ page }) => {
    await boot(page, '?room=passage', { motion: true })
    const motes = page.locator('[data-ambient="drift"] .mote')
    await expect(motes).toHaveCount(6)

    // Let them fall for a while, then measure. Dust that leaves the box is a
    // particle system leaking; dust that accumulates is weather.
    await page.waitForTimeout(900)
    await expect(motes).toHaveCount(6)
    const outside = await page.evaluate(() => {
      const box = document.getElementById('world')!.getBoundingClientRect()
      return [...document.querySelectorAll<HTMLElement>('[data-ambient="drift"] .mote')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.top < box.top - 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1 || r.right > box.right + 1)
        .length
    })
    expect(outside, 'a mote left the world box').toBe(0)
  })
})

test.describe('ambience knows when it is not wanted', () => {
  test('is not mounted at all with motion off', async ({ page }) => {
    // The default for this suite, and the law: ceremony vanishes whole. Not a
    // still version of itself, not a dimmed one — nothing.
    await boot(page, '?room=entry')
    await expect(ambients(page)).toHaveCount(0)
    // And the room is exactly as playable.
    await page.locator('[data-detail="candles"]').click()
    await expect(say(page)).toContainText('Candles. Fresh ones, burning')
    await expect(act(page, 'go')).toBeVisible()
  })

  test('is not mounted in a fight', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat', { motion: true })
    await expect(ambients(page)).toHaveCount(0)
  })

  test('goes behind an open MAP and comes back when it closes', async ({ page }) => {
    await boot(page, '?room=entry', { motion: true })
    await expect(ambients(page)).toHaveCount(1)
    await act(page, 'map').click()
    await expect(ambients(page)).toHaveCount(0)
    await page.locator('#overlay [data-act="close"]').click()
    await expect(ambients(page)).toHaveCount(1)
  })

  test('is gone for the whole of a crossing, and back in the next room', async ({ page }) => {
    await boot(page, '?room=entry', { motion: true })
    await expect(ambients(page)).toHaveCount(1)

    const samples = await page.evaluate(async () => {
      const seen: number[] = []
      const timer = setInterval(
        () => seen.push(document.querySelectorAll('#world [data-ambient]').length),
        25,
      )
      document.querySelector<HTMLElement>('[data-act="go"]')!.click()
      await new Promise((done) => setTimeout(done, 500))
      clearInterval(timer)
      return seen
    })
    // A crossing owns the picture: the room being left stops breathing the
    // moment the press lands, and what comes back is the next room's.
    expect(samples[0], 'the room kept breathing through the press').toBe(0)
    await settled(page)
    expect(await where(page)).toBe('passage')
    await expect(ambients(page)).toHaveCount(1)
  })

  test('is gone for the whole of a cascade', async ({ page }) => {
    await boot(page, '?room=offertory', { motion: true })
    await expect(ambients(page)).toHaveCount(2)

    const samples = await page.evaluate(async () => {
      const seen: number[] = []
      const timer = setInterval(
        () => seen.push(document.querySelectorAll('#world [data-ambient]').length),
        25,
      )
      document.querySelector<HTMLElement>('[data-interact="offertory-candles"]')!.click()
      await new Promise((done) => setTimeout(done, 300))
      clearInterval(timer)
      return seen
    })
    expect(samples[0], 'the room kept breathing through the cascade').toBe(0)
    await settled(page)
    await expect(ambients(page)).toHaveCount(2)
  })
})

test.describe('the audit took hotspots, never words', () => {
  /**
   * Every line the audit demoted, and where it has to be readable now.
   *
   * `arrival` means it is on screen the moment the room is entered; a detail id
   * means it is one real press away, on the LOOK that kept its place. This is
   * the same list `test/unit/frames.test.ts` holds the library to, asserted
   * here against what a thumb can actually reach.
   */
  const FOLDED: readonly (readonly [string, string, string])[] = [
    ['entry', 'candles', 'A skull on the floor'],
    ['entry', 'candles', 'There is a door at the end of it and no light behind it'],
    ['passage', 'arch', 'A step, worn down the middle'],
    ['hollow', 'arrival', 'Niches, packed with skulls'],
    ['sanctuary', 'arrival', 'Candles down both walls, lit and level'],
    ['sanctuary', 'arrival', 'Skulls, shelf on shelf, back into the dark'],
    ['reliquary', 'lever', 'A bronze bell'],
    ['reliquary', 'lever', 'Five candles melted almost to the stone'],
    ['reliquary', 'lever', 'An altar built around a basin'],
    ['reliquary', 'lever', 'A chest with no keyhole'],
    ['cleft', 'divide', 'Dragged marks into the left mouth'],
    ['cleft', 'divide', 'Wax down the right-hand wall'],
    ['confluence', 'meeting', 'The mouth I could have come out of'],
    ['confluence', 'meeting', 'The other mouth. Narrower'],
    ['offertory', 'price', 'Candles, and fresh ones'],
    ['offertory', 'price', 'A recess in the wall, shut with a stone lid'],
    ['fork', 'shrine', 'Scratches on the stone'],
    ['chain-vault', 'wall-panel', 'An iron cage'],
    ['chain-vault', 'wall-panel', 'A square plate in the floor'],
    ['chain-vault', 'wall-panel', 'Its linkage runs toward the floor plate'],
    ['chain-vault', 'wall-panel', 'Iron bars with no lock'],
    ['gate', 'arrival', 'REPENT OR PERISH'],
  ]

  for (const [room, from, line] of FOLDED) {
    test(`${room} still says "${line}"`, async ({ page }) => {
      await boot(page, `?room=${room}`)
      if (from !== 'arrival') await page.locator(`[data-detail="${from}"]`).click()
      await expect(say(page)).toContainText(line)
    })
  }
})
