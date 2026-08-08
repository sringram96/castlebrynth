/**
 * Reload, and the run is still there.
 *
 * The old build could boot to black off a stale save. So: a reload always
 * lands on the door, the door offers CONTINUE only when there is something to
 * continue into, and an unreadable save is a sentence rather than a wall.
 */

import { expect, test } from '@playwright/test'

import { act, boot, dice, state } from './helpers.js'

test.describe('saving and resuming', () => {
  test('a reload mid-explore comes back to the same room', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await page.locator('[data-take-id="careful"]').click()
    await act(page, 'go').click()
    const before = await state(page)

    await page.reload()

    // Boot lands on the door, always — and CONTINUE is one press back.
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
    await expect(act(page, 'continue')).toBeVisible()
    await act(page, 'continue').click()

    const after = await state(page)
    expect(after.mode).toBe('explore')
    expect(after.run!.roomId).toBe(before.run!.roomId)
    expect(after.run!.dice).toEqual(before.run!.dice)
    await expect(page.locator('#tray')).toBeVisible()
    await expect(dice(page)).toHaveCount(6)
  })

  test('a reload mid-fight comes back to the same fight, at the same point', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await page.locator('[data-take-id="knuckle"]').click()
    await act(page, 'go').click()
    await act(page, 'fight').click()
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await dice(page).nth(1).click()
    const before = await state(page)

    await page.reload()
    await act(page, 'continue').click()

    const after = await state(page)
    expect(after.mode).toBe('combat')
    expect(after.run!.combat!.enemyHp).toBe(before.run!.combat!.enemyHp)
    expect(after.run!.combat!.phase).toBe(before.run!.combat!.phase)
    // Down to the dice on the table and which of them were chosen.
    expect(after.run!.combat!.roll).toEqual(before.run!.combat!.roll)
    expect(after.run!.combat!.selected).toEqual(before.run!.combat!.selected)
    await expect(dice(page).nth(0)).toHaveAttribute('data-selected', 'yes')
    await expect(act(page, 'score')).toBeVisible()
  })

  test('an unreadable save says so and still offers a descent — never a black screen', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('castlebrynth', '{"version":1,"mode":"wat"')
    })
    await page.goto('/')

    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
    await expect(page.locator('.screen-line')).toContainText('lost the thread')
    await expect(act(page, 'continue')).toHaveCount(0)
    await act(page, 'start').click()
    await expect(dice(page)).toHaveCount(6)
  })

  test('a save from the old schema is discarded rather than migrated', async ({ page }) => {
    await page.addInitScript(() => {
      // A prototype vault: the shape the pre-reset build wrote.
      localStorage.setItem(
        'castlebrynth',
        JSON.stringify({ version: 1, mode: 'explore', vault: { pouch: ['bone'] }, at: { beat: 3 } }),
      )
    })
    await page.goto('/')
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
    await expect(act(page, 'continue')).toHaveCount(0)
    await act(page, 'start').click()
    const now = await state(page)
    expect(now.run!.roomId).toBe('entry')
    expect(now.run!.dice).toHaveLength(6)
  })
})
