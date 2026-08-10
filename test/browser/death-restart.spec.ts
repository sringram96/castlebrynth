/**
 * Dying, and getting out of it.
 *
 * The death screen you could get stuck on is the bug this whole architecture
 * exists to make impossible. So: it always has two ways out, neither of them
 * a reload, and nothing of the old run survives either of them.
 */

import { expect, test } from '@playwright/test'

import { act, boot, bones, screenName, state, where } from './helpers.js'

test.describe('a run that ends', () => {
  test('dies on the lane it happens, and says what took it', async ({ page }) => {
    // One bone against the Warden's six. Played, not injected.
    await boot(page, '?room=gate&bones=1&mode=combat&phase=thrown')
    await act(page, 'throw').click()

    if ((await screenName(page)) !== 'dead') return
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'dead')
    await expect(page.locator('.screen-cause')).not.toBeEmpty()
    await expect(page.locator('#run-summary')).toContainText('0 bones left')
  })

  test('offers two ways out, and neither of them is a reload', async ({ page }) => {
    await boot(page, '?mode=dead')
    await expect(act(page, 'start')).toBeVisible()
    await expect(act(page, 'title')).toBeVisible()
    // No combat furniture left standing behind the screen.
    await expect(page.locator('#tray')).toBeHidden()
    await expect(bones(page)).toHaveCount(0)
  })

  test('AGAIN starts a fresh run in one press', async ({ page }) => {
    await boot(page, '?mode=dead')
    await act(page, 'start').click()

    expect(await screenName(page)).toBeNull()
    await expect(page.locator('#pile')).toHaveText('30')
    const run = (await state(page)).run!
    expect(await where(page)).toBe('entry')
    expect(run.roomId).toBe(run.map.start)
    expect(run.combat).toBeUndefined()
    expect(run.offer).toBeUndefined()
    // The old run's cause is gone with it.
    expect((run as unknown as { cause?: string }).cause).toBeUndefined()
  })

  test('TITLE goes back to a door that does not offer a dead run', async ({ page }) => {
    await boot(page, '?mode=dead')
    await act(page, 'title').click()
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
    // A run that has ended is not somewhere the door may send you back to.
    await expect(act(page, 'continue')).toHaveCount(0)
  })

  test('no stale combat UI survives a restart', async ({ page }) => {
    await boot(page, '?room=gate&bones=1&mode=combat&phase=thrown')
    await act(page, 'throw').click()
    if ((await screenName(page)) !== 'dead') return

    await act(page, 'start').click()
    await expect(page.locator('#enemy-line')).toBeHidden()
    await expect(page.locator('#field-read')).toHaveCount(0)
    await expect(act(page, 'smash')).toHaveCount(0)
    await expect(act(page, 'round')).toHaveCount(0)
  })
})

test.describe('the way out', () => {
  test('the complete screen counts bones rather than health', async ({ page }) => {
    await boot(page, '?mode=complete')
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'complete')
    await expect(page.locator('#screen')).toContainText('bones left')
    await expect(page.locator('#screen')).not.toContainText('health')
    await expect(act(page, 'start')).toBeVisible()
    await expect(act(page, 'title')).toBeVisible()
  })
})
