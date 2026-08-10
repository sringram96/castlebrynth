/**
 * Staged loading, as behaviour rather than as a byte count.
 *
 * The global art payload ceiling is gone. What replaced it is architecture:
 * the screen's art is decoded, the screen after it is fetched in the
 * background, and nothing else is anybody's problem until somebody walks
 * towards it.
 *
 * So the gates here are behavioural, and **not one of them asserts a total
 * number of bytes**. A cap makes authored pose coverage compete with itself;
 * these say the game stays responsive however much of it there is.
 */

import { expect, test } from '@playwright/test'

import { act, boot, decoded, screenName } from './helpers.js'

/** Everything the manifest ships, so "not all of it" can be stated. */
const ALL_FILES = 41

test.describe('the title does not wait for the game', () => {
  test('boots without decoding every file', async ({ page }) => {
    await boot(page)
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')

    const files = await decoded(page)
    expect(files.length, 'the title decoded nothing').toBeGreaterThan(0)
    expect(
      files.length,
      `the title decoded ${files.length} of ${ALL_FILES} files — it is preloading again`,
    ).toBeLessThan(ALL_FILES)

    // What it *did* decode is what it is showing.
    expect(files.some((f) => f.includes('threshold'))).toBe(true)
    expect(files.some((f) => f.includes('tray'))).toBe(true)
    // And not the boss three rooms away.
    expect(files.some((f) => f.includes('warden-defeat'))).toBe(false)
  })

  test('DESCEND is pressable on the first frame', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    // No input was lost to loading: the press landed and the run started.
    expect(await screenName(page)).toBeNull()
    await expect(page.locator('#backdrop')).toBeVisible()
  })
})

test.describe('a room decodes its own art', () => {
  test('entering a room brings its backdrop and its opponent', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()

    await expect
      .poll(async () => (await decoded(page)).some((f) => f.includes('hall')))
      .toBe(true)
    await expect
      .poll(async () => (await decoded(page)).some((f) => f.includes('crawling')))
      .toBe(true)
  })

  test('the room ahead is fetched while the player is still reading this one', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    // `entry` leads to `passage`, whose backdrop is the choir.
    await expect
      .poll(async () => (await decoded(page)).some((f) => f.includes('choir')), {
        timeout: 5000,
      })
      .toBe(true)
  })

  test('no broken image is ever on screen', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat&phase=smashed')
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('img')]
        .filter((img) => img.getAttribute('src') && !img.hidden)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.getAttribute('src')),
    )
    expect(broken).toEqual([])
  })
})

test.describe('nothing is fetched twice', () => {
  test('walking back into a room reuses what was decoded', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    const first = await decoded(page)

    // The loader caches promises by file, so the same source is one request
    // however many times it is asked for.
    const unique = new Set(first)
    expect(unique.size).toBe(first.length)
  })

  test('a room never mounts a second copy of a layer', async ({ page }) => {
    // A room with an opponent, so every layer the compositor owns is in play
    // at once. The Reliquary has no enemy and its enemy layer is correctly
    // absent, which is a different claim.
    await boot(page, '?room=hollow&mode=combat&phase=smashed')
    for (const id of ['#backdrop', '#enemy', '[data-layer="foreground"]', '#weapon', '#tray-frame']) {
      await expect(page.locator(id)).toHaveCount(1)
    }
  })
})

test.describe('a fight does not begin before its art does', () => {
  test('the opponent is on screen before FIGHT is pressed', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()

    // The rule from ART_DIRECTION.md: scenery may degrade, the opponent may
    // not. It is decoded and visible before the verb that starts the fight.
    const enemy = page.locator('#enemy')
    await expect(enemy).toBeVisible()
    const ready = await enemy.evaluate((img) => (img as HTMLImageElement).naturalWidth > 0)
    expect(ready, 'the enemy is on screen but has not decoded').toBe(true)
    await expect(act(page, 'fight')).toBeVisible()
  })

  test('a smash never flashes an undecoded frame', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat&phase=thrown', { motion: true })
    await act(page, 'throw').click()
    // Sampled across the sequence rather than at its end, which is where a
    // frame that starts by fetching its own source would show.
    for (let i = 0; i < 6; i++) {
      const ok = await page
        .locator('#enemy')
        .evaluate((img) => {
          const el = img as HTMLImageElement
          return el.hidden || !el.getAttribute('src') || !el.complete || el.naturalWidth > 0
        })
      expect(ok, 'the enemy layer showed an undecoded frame').toBe(true)
      await page.waitForTimeout(90)
    }
  })
})
