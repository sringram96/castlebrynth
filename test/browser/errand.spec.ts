/**
 * The errand: what the run is for, on the screens a player actually reads.
 *
 * The premise is one rule — **bone remembers**. The thirty in the pile are what
 * he still knows; what breaks one takes what was in it; and at zero he does not
 * die, he stops knowing why he came down and walks back to the stair.
 *
 * `test/unit/copy.test.ts` holds the sentences to that contract. This holds the
 * *game* to it: the premise has to survive being rendered, in the order a
 * player meets it, or it is a document rather than a story. The three things
 * that have to land, in the first minute:
 *
 *   - there is somebody he is looking for;
 *   - he has been down here before and does not have it any more;
 *   - the thirty are what is left of knowing that, and they are not the six.
 */

import { expect, test } from '@playwright/test'

import { act, boot } from './helpers.js'

test.describe('the first minute says what this is', () => {
  test('states the errand on the title screen', async ({ page }) => {
    await boot(page)
    const screen = page.locator('.screen-title')
    await expect(screen).toContainText(/looking for someone/i)
    // And the way in is still a real button on the same screen.
    await expect(act(page, 'start')).toHaveCount(1)
  })

  test('says in the first room that he has been here and does not remember', async ({ page }) => {
    await boot(page, '?room=entry')
    // The word band over the world, which is the arrival line — the one place
    // the premise is put in a room instead of on a screen.
    await expect(page.locator('#say, .say').first()).toContainText(/before/i)
    await expect(page.locator('#say, .say').first()).toContainText(/do not remember/i)
  })

  test('tells the pile what it is, where the pile is explained', async ({ page }) => {
    await boot(page, '?room=fork&bones=30')
    await act(page, 'menu').first().click()
    const menu = page.locator('.screen-panel')
    // Both halves. The distinction between the thirty and the six is the whole
    // reason the story holds together, and it is stated in exactly one place.
    await expect(menu).toContainText(/not what I throw/i)
    await expect(menu).toContainText(/everything I still know/i)
    // And the mechanic, literally, before any of the atmosphere: losing one
    // costs you what was in it.
    await expect(menu).toContainText(/takes what was in it/i)
  })
})

test.describe('running out is not a death', () => {
  test('heads the end of a run with what actually happened', async ({ page }) => {
    await boot(page, '?mode=dead')
    const screen = page.locator('.screen-dead')
    await expect(screen).toContainText(/forgot what you came for/i)
    await expect(screen).toContainText(/cannot remember what I came down for/i)
  })

  test('never uses the word death on any screen a run can end on', async ({ page }) => {
    // The premise is that running out is *worse* than dying: he walks back up
    // and no longer knows what for. A screen that calls it a death throws that
    // away in one word, so no ending screen may contain one.
    for (const mode of ['dead', 'complete']) {
      await boot(page, `?mode=${mode}`)
      const words = (await page.locator('.screen').innerText()).toLowerCase()
      expect(words, `the ${mode} screen calls it a death`).not.toMatch(
        /\b(died|death|killed|dying|slain)\b/,
      )
    }
  })

  test('says at the door that the errand outlived the run', async ({ page }) => {
    await boot(page, '?mode=complete')
    const screen = page.locator('.screen-complete')
    // Getting out is not finding him, and the game says so rather than
    // congratulating the player for a rescue that did not happen.
    await expect(screen).toContainText(/did not find him/i)
    await expect(screen).toContainText(/still know to look/i)
    // The number is on the screen beside it, and it is the one that matters:
    // how much of knowing he got out with.
    await expect(screen).toContainText(/bones left/i)
  })
})
