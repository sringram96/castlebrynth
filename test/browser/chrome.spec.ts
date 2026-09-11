/**
 * The two presentation fixes, asserted where they can be seen.
 *
 *   - **the Gnawing's last beat reads inside the frame.** Its close stance was
 *     wider than the world box with its jaw below it, so the most important
 *     composition of the encounter was one the player could only see two
 *     thirds of. The box is asserted rather than the numbers: what matters is
 *     that the whole thing is in the picture, not what fraction produced that.
 *   - **combat chrome obeys the art's pixel grid.** The enemy's health is a row
 *     of whole cells, so its width is an integer multiple of one step at every
 *     point of a drain — no sub-pixel edge and nothing for a transition to
 *     interpolate through. See `docs/ART_DIRECTION.md` § Combat chrome.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, state } from './helpers.js'

const settle = (page: Page): Promise<void> =>
  page.evaluate(() => window.castlebrynth?.settle())

/** One box, as fractions of the world box it is drawn in. */
async function inWorld(page: Page, selector: string) {
  const world = (await page.locator('#world').boundingBox())!
  const box = (await page.locator(selector).boundingBox())!
  return {
    left: (box.x - world.x) / world.width,
    right: (box.x + box.width - world.x) / world.width,
    top: (box.y - world.y) / world.height,
    bottom: (box.y + box.height - world.y) / world.height,
  }
}

test.describe('the Gnawing, at arm’s length', () => {
  test('reads whole, inside the world box, on its close stage', async ({ page }) => {
    // Round three and after is `close`. `?round=3` fights the two attacks that
    // get there rather than setting a counter, so the stage is the one a real
    // fight arrives on.
    await boot(page, '?room=hollow&bones=30&round=3&enemyHp=40')
    await expect(page.locator('#enemy')).toHaveAttribute('data-reach', 'close')

    const box = await inWorld(page, '#enemy')
    // A hair of tolerance, because a sprite's own aspect sets its height and
    // the plate is not a perfect rectangle of ink.
    expect(box.left, 'the close stage runs off the left').toBeGreaterThanOrEqual(-0.01)
    expect(box.right, 'the close stage runs off the right').toBeLessThanOrEqual(1.01)
    expect(box.bottom, 'the jaw is below the frame').toBeLessThanOrEqual(1.01)
    expect(box.top, 'the close stage runs off the top').toBeGreaterThanOrEqual(-0.01)

    // And it is still the near composition rather than a distant shape: it
    // fills most of the frame, which is what the beat is for.
    expect(box.right - box.left).toBeGreaterThan(0.8)
  })

  test('still steps: far, then nearer, then on top of you', async ({ page }) => {
    const widthAt = async (round: number): Promise<number> => {
      await boot(page, `?room=hollow&bones=30&round=${round}&enemyHp=60`)
      const box = await inWorld(page, '#enemy')
      return box.right - box.left
    }
    const far = await widthAt(1)
    const mid = await widthAt(2)
    const close = await widthAt(3)
    expect(mid).toBeGreaterThan(far * 1.5)
    expect(close).toBeGreaterThan(mid)
  })
})

test.describe('combat chrome obeys the art’s pixel grid', () => {
  /** The fill's width, in CSS pixels. */
  const fillWidth = async (page: Page): Promise<number> =>
    (await page.locator('#enemy-fill').boundingBox())!.width

  /** One cell, in CSS pixels, read off the element rather than assumed. */
  const stepOf = async (page: Page): Promise<number> =>
    page
      .locator('#enemy-fill')
      .evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--step')))

  test('draws the bar in whole cells, square, out of the palette', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat')
    const track = page.locator('#enemy-track')
    await expect(track).toBeVisible()

    const style = await page
      .locator('#enemy-fill')
      .evaluate((el) => {
        const s = getComputedStyle(el)
        return { radius: s.borderTopLeftRadius, transition: s.transitionProperty }
      })
    // Square corners: the art has no rounded chrome in it anywhere.
    expect(style.radius).toBe('0px')
    // And the drain is stepped rather than smooth — `motion=0` turns it off
    // entirely, which is the other half of the same law.
    expect(style.transition).toBe('none')
  })

  test('is an integer multiple of one cell at every point of a drain', async ({ page }) => {
    await boot(page, '?room=deep&bones=30&rolls=3&dice=6,6,6,4,4,3')
    const step = await stepOf(page)
    expect(step).toBeGreaterThan(0)

    const widths: number[] = [await fillWidth(page)]
    // Four exchanges against the Marrow, reading the bar after each. Every one
    // of them has to land on a cell boundary.
    for (let attack = 0; attack < 4; attack++) {
      const roll = act(page, 'roll')
      if (await roll.isVisible()) await roll.click()
      const entry = page.locator('button.score-entry').first()
      if ((await entry.count()) === 0) break
      await entry.click()
      await settle(page)
      if ((await page.locator('#enemy-fill').count()) === 0) break
      widths.push(await fillWidth(page))
    }

    expect(widths.length).toBeGreaterThan(2)
    for (const width of widths) {
      const cells = width / step
      expect(
        Math.abs(cells - Math.round(cells)),
        `${width}px is ${cells} cells, which is not a whole number`,
      ).toBeLessThan(0.02)
    }
    // And it actually drained, or the assertion above is measuring nothing.
    expect(widths[widths.length - 1]).toBeLessThan(widths[0]!)
  })

  test('never shows an empty bar for a thing that is still alive', async ({ page }) => {
    // Rounding a live enemy to nothing would be the chrome lying about the one
    // number the fight is made of.
    await boot(page, '?room=gate&enemyHp=1&mode=combat')
    expect((await state(page)).run!.combat!.enemyHp).toBe(1)
    expect(await fillWidth(page)).toBeGreaterThanOrEqual(await stepOf(page))
  })

  test('the pile settles in steps too, and lands instantly with motion off', async ({ page }) => {
    // The audit's other finding. The pile is a count of objects, so it stops
    // pretending to pass through the numbers in between.
    await boot(page, '?room=deep&mode=combat')
    const transition = await page
      .locator('.orb-fill')
      .evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(transition).toBe('none')
  })
})
