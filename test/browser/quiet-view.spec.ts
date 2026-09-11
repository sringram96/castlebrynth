/**
 * The words, and taking them off the picture.
 *
 * Two claims, and the second is a feature that must never cost the player the
 * game:
 *
 *   - **the word band is centred**, like every other text region on the screen.
 *     It was the last one set to `start`, and it is the prose a player actually
 *     reads in every room.
 *   - **HIDE clears the chrome and SHOW puts it back**, in the same corner, both
 *     ways. It changes no run state, it survives nothing — a reload comes back
 *     dressed — and no beat is ever played underneath it.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, state, where } from './helpers.js'

/** Whether the chrome is currently off the picture. */
const cleared = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.body.dataset['viewing'] === 'yes')

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

test.describe('the words come off the picture', () => {
  test('clears the band, the tray and the hotspots, and leaves the way back', async ({ page }) => {
    await boot(page, '?room=entry')
    await expect(page.locator('#tray')).toBeVisible()

    await act(page, 'view').click()
    expect(await cleared(page)).toBe(true)
    await expect(page.locator('#tray')).toBeHidden()
    await expect(page.locator('.say')).toBeHidden()
    await expect(page.locator('#hits')).toBeHidden()
    // The one thing still on screen, and it says what it does now.
    await expect(act(page, 'view')).toBeVisible()
    await expect(act(page, 'view')).toHaveText('SHOW')
  })

  test('puts everything back from the same corner it went from', async ({ page }) => {
    await boot(page, '?room=entry')
    const before = await act(page, 'view').boundingBox()

    await act(page, 'view').click()
    const during = await act(page, 'view').boundingBox()
    await act(page, 'view').click()

    expect(await cleared(page)).toBe(false)
    await expect(page.locator('#tray')).toBeVisible()
    await expect(page.locator('.say')).toBeVisible()
    await expect(act(page, 'view')).toHaveText('HIDE')
    // It must not move between the two states. A control that walks is a
    // control somebody has to hunt for on a screen with nothing else on it.
    expect(during!.x).toBeCloseTo(before!.x, 0)
    expect(during!.y).toBeCloseTo(before!.y, 0)
  })

  test('changes nothing about the run', async ({ page }) => {
    // It produces no GameState. Not the room, not the pile, not the save —
    // the whole feature is a coat of paint over a run that never noticed.
    await boot(page, '?room=cleft')
    const before = await state(page)
    await act(page, 'view').click()
    const after = await state(page)
    expect(after.run).toEqual(before.run)
    expect(after.mode).toBe(before.mode)
  })

  test('is not in the save: a reload comes back dressed', async ({ page }) => {
    await boot(page, '', { motion: false })
    await act(page, 'start').click()
    await act(page, 'view').click()
    expect(await cleared(page)).toBe(true)

    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
    await act(page, 'continue').click()

    expect(await cleared(page)).toBe(false)
    await expect(page.locator('#tray')).toBeVisible()
  })

  test('gives the picture back before a crossing plays', async ({ page }) => {
    // Every beat in this game exists to show an outcome the reducer already
    // computed. One played under a cleared screen would be shown to nobody.
    await boot(page, '?room=entry', { motion: true })
    await act(page, 'view').click()
    expect(await cleared(page)).toBe(true)

    // The hotspots are hidden, so coming back is the first press either way.
    await act(page, 'view').click()
    await act(page, 'go').click()
    expect(await cleared(page)).toBe(false)
    expect(await where(page)).toBe('passage')
  })

  test('is not offered in a fight, where the numbers are the contract', async ({ page }) => {
    // The same ruling the right bed keeps for MAP: a fight *is* the room, and
    // what the HUD carries in one — the name, what is left of it, which rung
    // the ladder is on — is stated before anything is committed precisely so it
    // cannot be taken off the screen. Hidden, never disabled.
    await boot(page, '?room=hollow&mode=combat&rolls=1')
    await expect(act(page, 'view')).toHaveCount(0)
    await expect(page.locator('#enemy-bar')).toBeVisible()
  })

  test('and is a real button at a real size', async ({ page }) => {
    await boot(page, '?room=entry')
    const box = (await act(page, 'view').boundingBox())!
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44)
    await expect(act(page, 'view')).toHaveJSProperty('tagName', 'BUTTON')
  })
})
