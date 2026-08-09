import { expect, test } from '@playwright/test'

import { act, boot, dice, state, where } from './helpers.js'

test.describe('dying, and coming back', () => {
  test('lethal damage lands on a death screen with one obvious way on', async ({ page }) => {
    // One point of health against a full-strength Warden: the next blow ends it.
    await boot(page, '?room=gate&hp=1&mode=combat')
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await act(page, 'score').click()

    const screen = page.locator('#screen')
    await expect(screen).toHaveAttribute('data-screen', 'dead')
    await expect(screen).toContainText('YOU DID NOT COME BACK')
    // It says what killed you, which is the one thing worth knowing.
    await expect(page.locator('.screen-cause')).toContainText('The Warden')
    await expect(act(page, 'start')).toBeVisible()
    await expect(act(page, 'start')).toHaveText('AGAIN')
  })

  test('AGAIN is one press to a clean new run, with no reload', async ({ page }) => {
    await boot(page, '?mode=dead')
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'dead')

    let reloaded = false
    page.on('framenavigated', () => {
      reloaded = true
    })

    await act(page, 'start').click()

    await expect(page.locator('#screen')).toBeHidden()
    await expect(page.locator('#tray')).toBeVisible()
    await expect(dice(page)).toHaveCount(6)
    expect(reloaded, 'AGAIN reloaded the page').toBe(false)

    const now = await state(page)
    expect(now.mode).toBe('explore')
    expect(now.run!.roomId).toBe(now.run!.map.start)
    expect(await where(page)).toBe('entry')
    expect(now.run!.hp).toBeGreaterThan(1)
    expect(now.run!.relics).toEqual([])
    expect(now.run!.combat).toBeUndefined()
  })

  test('leaves no stale combat interface behind', async ({ page }) => {
    await boot(page, '?room=gate&hp=1&mode=combat')
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await act(page, 'score').click()
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'dead')

    await act(page, 'start').click()

    // The old fight's furniture is gone: no intent, no score, no reroll, and
    // the first room's own way on is the thing offered.
    await expect(page.locator('#intent')).toHaveCount(0)
    await expect(page.locator('#score')).toHaveCount(0)
    await expect(act(page, 'reroll')).toHaveCount(0)
    await expect(act(page, 'roll')).toHaveCount(0)
    await expect(act(page, 'go')).toBeVisible()
  })

  test('can die again, immediately, without the loop jamming', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await boot(page, '?mode=dead')
      await act(page, 'start').click()
      await expect(page.locator('#screen')).toBeHidden()
      await expect(act(page, 'go')).toBeVisible()
    }
  })

  test('TITLE from the death screen still offers a fresh descent', async ({ page }) => {
    await boot(page, '?mode=dead')
    await act(page, 'title').click()
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
    await expect(act(page, 'start')).toHaveText('DESCEND')

    // CONTINUE must not offer to walk back into a run that is over.
    if ((await act(page, 'continue').count()) > 0) {
      await act(page, 'continue').click()
      await expect(page.locator('#screen')).not.toHaveAttribute('data-screen', 'dead')
    }
    await act(page, 'start').click()
    await expect(page.locator('#screen')).toBeHidden()
  })

  test('getting out is its own screen, and leads back to a new descent', async ({ page }) => {
    await boot(page, '?mode=complete')
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'complete')
    await expect(page.locator('#screen')).toContainText('OUT')
    await act(page, 'start').click()
    await expect(page.locator('#screen')).toBeHidden()
    await expect(dice(page)).toHaveCount(6)
  })
})
