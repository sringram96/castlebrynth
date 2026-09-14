import { expect, test } from '@playwright/test'
import { act, boot, state, where } from './helpers.js'

test('a room starts clear, with an explicit READ and HIDE TEXT', async ({ page }) => {
  await boot(page, '?room=entry')
  await expect(page.locator('#tray')).toBeHidden()
  await expect(page.locator('#say')).toBeHidden()
  await expect(page.locator('.room-hint')).toHaveText('Tap ↑ to move · ? to inspect')
  await expect(act(page, 'words')).toHaveText('READ')
  const before = await state(page)
  await act(page, 'words').click()
  await expect(page.locator('#say')).toBeVisible()
  await expect(act(page, 'words')).toHaveText('HIDE TEXT')
  await expect(act(page, 'words')).toHaveAttribute('aria-expanded', 'true')
  await act(page, 'words').click()
  await expect(page.locator('#say')).toBeHidden()
  expect(await state(page)).toEqual(before)
})

test('inspecting a marked object opens its answer without requiring READ first', async ({ page }) => {
  await boot(page, '?room=entry')
  const candles = page.locator('[data-detail="candles"]')
  await expect(candles).toHaveText('?')
  await candles.click()
  await expect(page.locator('#say')).toBeVisible()
  await expect(page.locator('#say')).toContainText('Candles')
  await expect(page.locator('#tray')).toBeHidden()
})

test('a doorway stays usable with the description hidden and labels its consequence', async ({ page }) => {
  await boot(page, '?room=cleft')
  await expect(page.locator('#say')).toBeHidden()
  await expect(page.locator('.exit-sense')).toHaveText(['Fight ahead.', '2-bone toll.'])
  await act(page, 'go').first().click()
  expect(await where(page)).not.toBe('cleft')
})

test('moving to another room clears the words again', async ({ page }) => {
  await boot(page, '?room=entry')
  await act(page, 'words').click()
  await act(page, 'go').click()
  await expect(page.locator('#say')).toBeHidden()
  await expect(page.locator('.room-hint')).toHaveCount(0)
  await expect(act(page, 'words')).toHaveText('READ')
})

test('the room tap remains an optional shortcut and changes no game state', async ({ page }) => {
  await boot(page, '?room=cleft')
  const before = await state(page)
  await act(page, 'band').click({ position: { x: 195, y: 120 } })
  await expect(page.locator('#say')).toBeVisible()
  await act(page, 'band').click({ position: { x: 195, y: 120 } })
  await expect(page.locator('#say')).toBeHidden()
  expect(await state(page)).toEqual(before)
})

test('reloading preserves the run and resumes with an unobstructed room', async ({ page }) => {
  await boot(page)
  await act(page, 'start').click()
  await act(page, 'words').click()
  await page.reload()
  await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
  await act(page, 'continue').click()
  await expect(page.locator('#say')).toBeHidden()
  await expect(page.locator('#explore-pile')).toHaveText('30 BONES')
})

test('opening and closing MENU preserves the reading preference', async ({ page }) => {
  await boot(page, '?room=entry')
  for (const shown of [false, true]) {
    if (shown) await act(page, 'words').click()
    await act(page, 'menu').click()
    await act(page, 'close').click()
    expect(await page.locator('#say').isVisible()).toBe(shown)
  }
})

test('the room text is centred when opened, and the tray stays out of the way', async ({ page }) => {
  for (const room of ['entry', 'cleft', 'sanctuary', 'reliquary']) {
    await boot(page, `?room=${room}`)
    await act(page, 'words').click()
    await expect(page.locator('#say')).toBeVisible()
    expect(await page.locator('#say').evaluate(n => getComputedStyle(n).textAlign)).toBe('center')
    await expect(page.locator('#tray')).toBeHidden()
  }
})

test('room gestures are absent during combat', async ({ page }) => {
  await boot(page, '?room=hollow&mode=combat&rolls=1')
  await expect(act(page, 'band')).toHaveCount(0)
  await expect(act(page, 'words')).toHaveCount(0)
})
