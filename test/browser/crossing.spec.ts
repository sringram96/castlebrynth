/**
 * Movement, now that it lives in the picture.
 *
 * Three claims, and each of them is a thing the tray-GO could not have been
 * asked for:
 *
 *   - **a way out stands where the art says it stands.** The template declares
 *     an anchor, the map binds an edge to it, and the hotspot's centre lands on
 *     that fraction of the world box — measured, not eyeballed.
 *   - **a held exit renders nothing.** Not a greyed arch, not a dimmed label:
 *     absent. `exitsOpen` and the reducer's GO guard are the one statement of
 *     it and the view obeys.
 *   - **crossing is a beat**, and it decides nothing. The reducer moved the run
 *     and saved it before the first frame; a reload halfway across lands in the
 *     destination, settled, and motion off arrives in the same tick.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, state, wayTo, where } from './helpers.js'
import { fightItOut } from './play.js'

const animating = (page: Page): Promise<boolean> =>
  page.evaluate(() => window.castlebrynth?.animating() ?? false)

/** Where a hotspot's centre sits, as a fraction of the world box. */
async function centreOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const world = (await page.locator('#world').boundingBox())!
  const box = (await page.locator(selector).boundingBox())!
  return {
    x: (box.x + box.width / 2 - world.x) / world.width,
    y: (box.y + box.height / 2 - world.y) / world.height,
  }
}

test.describe('a way out stands where the art says', () => {
  test('lands the hotspot on the anchor the template declared', async ({ page }) => {
    await boot(page, '?room=entry')
    const to = (await state(page)).run!.map.nodes[(await state(page)).run!.roomId]!
    void to
    const at = await centreOf(page, '[data-act="go"]')
    // `entry`'s only anchor: the hall's vanishing point, below the far door.
    expect(at.x).toBeCloseTo(0.53, 1)
    expect(at.y).toBeCloseTo(0.55, 1)
  })

  test('seats two mouths where the junction was painted', async ({ page }) => {
    await boot(page, '?room=cleft')
    await expect(act(page, 'go')).toHaveCount(2)
    const left = await centreOf(
      page,
      `[data-act="go"][data-to="${(await (await wayTo(page, 'hollow')).getAttribute('data-to'))!}"]`,
    )
    const right = await centreOf(
      page,
      `[data-act="go"][data-to="${(await (await wayTo(page, 'offertory')).getAttribute('data-to'))!}"]`,
    )
    expect(left.x).toBeLessThan(0.4)
    expect(right.x).toBeGreaterThan(0.6)
    expect(left.y).toBeCloseTo(right.y, 1)
  })

  test('carries the label on the hotspot and the sense where way copy prints', async ({ page }) => {
    await boot(page, '?room=cleft')
    await expect(page.locator('[data-act="go"]').first()).toHaveText('GO ON')
    await expect(page.locator('[data-act="go"]').nth(1)).toHaveText('NARROW')
    // The sense line is still in the well, before the press, exactly where way
    // copy has always printed.
    await expect(page.locator('#well .routes')).toContainText('Something is feeding down there')
    await expect(page.locator('#well .routes')).toContainText('The quiet is doing a lot of work')
  })

  test('is not on the tray any more, in any room', async ({ page }) => {
    // The whole ruling, as an absence. Movement moved into the room, so the
    // beds carry MENU and whichever press the fight is waiting for and nothing
    // else — a GO in a bed would put the most important verb in the game in
    // the one region of the screen that is not the world.
    for (const room of ['entry', 'cleft', 'fork', 'reliquary']) {
      await boot(page, `?room=${room}`)
      await expect(page.locator('#beds [data-act="go"]')).toHaveCount(0)
      await expect(page.locator('#hits [data-act="go"]')).not.toHaveCount(0)
    }
  })
})

test.describe('a held exit renders nothing', () => {
  test('while the thing in the room is alive', async ({ page }) => {
    await boot(page, '?room=hollow')
    await expect(act(page, 'go')).toHaveCount(0)
    // And nothing disabled, anywhere, standing in for it.
    await expect(page.locator('#hits button[disabled]')).toHaveCount(0)
    await expect(page.locator('#hits [aria-disabled="true"]')).toHaveCount(0)
  })

  test('while the font is unresolved', async ({ page }) => {
    await boot(page, '?room=sanctuary&bones=12')
    await expect(act(page, 'go')).toHaveCount(0)
    await act(page, 'ritual').click()
    await expect(act(page, 'go')).toHaveCount(1)
  })

  test('while a toll is unpaid', async ({ page }) => {
    await boot(page, '?room=offertory')
    await expect(act(page, 'go')).toHaveCount(0)
    await page.locator('[data-interact="offertory-candles"]').click()
    await expect(act(page, 'go')).toHaveCount(0)
    await page.locator('[data-interact="offertory-altar"]').click()
    await expect(act(page, 'go')).toHaveCount(1)
  })

  test('and appears the moment the room lets go of it', async ({ page }) => {
    await boot(page, '?room=hollow&bones=30')
    await expect(act(page, 'go')).toHaveCount(0)
    expect(await fightItOut(page)).toBe('won')
    await expect(act(page, 'go')).toHaveCount(1)
  })
})

test.describe('crossing is a beat, and it decides nothing', () => {
  test('holds the room being left, then lands on the one being entered', async ({ page }) => {
    await boot(page, '?room=entry', { motion: true })
    const from = await where(page)
    await act(page, 'go').click()

    // The press has returned and the run has already moved: the state is the
    // destination before a frame of the crossing has run.
    expect(await where(page)).toBe('passage')
    expect(from).toBe('entry')
    expect(await animating(page)).toBe(true)

    await expect.poll(() => animating(page), { timeout: 6000 }).toBe(false)
    expect(await where(page)).toBe('passage')
    // Nothing of the transition is left on the world when it settles.
    await expect(page.locator('#world')).not.toHaveClass(/crossing|dark/)
  })

  test('a reload mid-crossing lands in the destination, settled', async ({ page }) => {
    // Played rather than fixtured, because a fixture rebuilds itself from the
    // URL and would prove nothing about the save.
    await boot(page, '', { motion: true })
    await act(page, 'start').click()
    await act(page, 'go').click()
    // Mid-beat: the dark has not lifted and the sequence has not finished.
    expect(await animating(page)).toBe(true)

    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
    await act(page, 'continue').click()

    expect(await where(page)).toBe('passage')
    expect(await animating(page)).toBe(false)
    await expect(page.locator('#world')).not.toHaveClass(/crossing|dark/)
    await expect(act(page, 'go')).toHaveCount(1)
  })

  test('motion off arrives in the same tick', async ({ page }) => {
    await boot(page, '?room=entry')
    await act(page, 'go').click()
    expect(await animating(page)).toBe(false)
    expect(await where(page)).toBe('passage')
    await expect(page.locator('#world')).not.toHaveClass(/crossing|dark/)
  })

  test('reduced motion arrives in the same tick too', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=entry', { motion: true })
    await act(page, 'go').click()
    expect(await animating(page)).toBe(false)
    expect(await where(page)).toBe('passage')
  })

  test('offers nothing in the world while it is playing, and everything after', async ({
    page,
  }) => {
    // The same ruling the defeat sequence keeps: while a beat is playing there
    // is no move to make, so none is offered — hidden, never disabled. The
    // room on screen is the one being left and its ways lead where the run has
    // already gone.
    await boot(page, '?room=entry', { motion: true })
    await act(page, 'go').click()
    await expect(page.locator('#hits')).toBeHidden()

    // A thumb that presses anyway waits out the doorway and lands on the room
    // it arrived in, rather than on a button that leads back where it came
    // from. Two ways on at the Cleft, so the first of them.
    await act(page, 'go').first().click()
    expect(await where(page)).toBe('cleft')
  })
})
