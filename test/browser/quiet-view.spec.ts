/**
 * The words, and waving them away.
 *
 * Two claims:
 *
 *   - **the word band is centred**, like every other text region on the screen.
 *     It was the last one set to `start`, and it is the prose a player reads in
 *     every room.
 *   - **tapping the room takes the band away, and anything else brings it
 *     back.** What goes is one paragraph. The tray never goes: a picture with
 *     no tray under it is not a state this game has.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, state, where } from './helpers.js'

/** Tap a part of the painting nothing is standing on. */
const tapRoom = (page: Page): Promise<void> =>
  act(page, 'band').click({ position: { x: 195, y: 120 } })

const bandShown = (page: Page): Promise<boolean> => page.locator('.say').isVisible()

test.describe('the word band is centred', () => {
  test('sets its prose centred, in every room it says anything in', async ({ page }) => {
    for (const room of ['entry', 'cleft', 'sanctuary', 'reliquary']) {
      await boot(page, `?room=${room}`)
      const align = await page
        .locator('.say-beat')
        .first()
        .evaluate((n) => getComputedStyle(n).textAlign)
      expect(align, `${room}'s band is not centred`).toBe('center')
    }
  })

  test('centres the band’s last line in the band, not just its first', async ({ page }) => {
    // Declaring `text-align: center` and looking centred are different claims.
    // The entry hall's arrival is three lines, which is where a left-set block
    // gives itself away.
    await boot(page, '?room=entry')
    const drift = await page.evaluate(() => {
      const beat = document.querySelector('.say-beat')!
      const box = beat.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(beat)
      const lines = [...range.getClientRects()].filter((r) => r.width > 0)
      const last = lines[lines.length - 1]
      if (!last || lines.length < 2) return null
      return last.left + last.width / 2 - (box.left + box.width / 2)
    })
    expect(drift, 'the arrival did not wrap, so nothing was measured').not.toBeNull()
    expect(Math.abs(drift!)).toBeLessThanOrEqual(2)
  })
})

test.describe('tapping the room waves the words away', () => {
  test('takes the band off and puts it back, and never touches the tray', async ({ page }) => {
    await boot(page, '?room=cleft')
    expect(await bandShown(page)).toBe(true)

    await tapRoom(page)
    expect(await bandShown(page)).toBe(false)
    // The one thing that must survive it.
    await expect(page.locator('#tray')).toBeVisible()

    await tapRoom(page)
    expect(await bandShown(page)).toBe(true)
    await expect(page.locator('#tray')).toBeVisible()
  })

  test('leaves the ways out where they were, pressable, either way', async ({ page }) => {
    // The dismiss is the first child of `#hits`, so every hotspot is a later
    // sibling and takes its own tap. If that ordering ever inverted, the room
    // would swallow the most important press in the game.
    await boot(page, '?room=cleft')
    const before = await act(page, 'go').count()
    await tapRoom(page)
    expect(await act(page, 'go').count()).toBe(before)
    await act(page, 'go').first().click()
    expect(await where(page)).not.toBe('cleft')
  })

  test('brings the words back the moment the room is asked anything', async ({ page }) => {
    // A LOOK whose answer stayed hidden would be a control that appeared to do
    // nothing, so any press at all un-dismisses before the reducer writes.
    await boot(page, '?room=entry')
    await tapRoom(page)
    expect(await bandShown(page)).toBe(false)

    await page.locator('[data-detail="candles"]').click()
    expect(await bandShown(page)).toBe(true)
    await expect(page.locator('.say')).toContainText(/candles/i)
  })

  test('changes nothing about the run', async ({ page }) => {
    await boot(page, '?room=cleft')
    const before = await state(page)
    await tapRoom(page)
    const after = await state(page)
    expect(after.run).toEqual(before.run)
    expect(after.mode).toBe(before.mode)
  })

  test('is not in the save: a reload comes back with the words on', async ({ page }) => {
    await boot(page, '', { motion: false })
    await act(page, 'start').click()
    await tapRoom(page)
    expect(await bandShown(page)).toBe(false)

    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
    await act(page, 'continue').click()
    expect(await bandShown(page)).toBe(true)
  })

  test('offers no such press in a fight, where nothing in the room is tappable', async ({
    page,
  }) => {
    // The same ruling every hotspot keeps: a fight is the room.
    await boot(page, '?room=hollow&mode=combat&rolls=1')
    await expect(act(page, 'band')).toHaveCount(0)
  })

  test('never reads as a control', async ({ page }) => {
    // It covers the whole picture. If it drew a border, a background or a focus
    // ring the way the real hotspots do, the room would look like one button.
    await boot(page, '?room=cleft')
    const paint = await act(page, 'band').evaluate((n) => {
      const cs = getComputedStyle(n)
      return { border: cs.borderTopWidth, background: cs.backgroundImage, color: cs.backgroundColor }
    })
    expect(paint.border).toBe('0px')
    expect(paint.background).toBe('none')
    expect(paint.color).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  })
})
