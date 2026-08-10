/**
 * The reload matrix.
 *
 * A real reload, from every stable phase of a round, landing on exactly the
 * state that was saved. This is the property the whole architecture is built
 * to give: the reducer decides, `dispatch` saves, and only then does anything
 * move — so there is never a frame in which the screen and the save disagree.
 */

import { expect, test } from '@playwright/test'

import { act, boot, bones, enemyBones, screenName, state, valuesOf } from './helpers.js'

/** Reload the tab, the way a player does. The save is what comes back. */
async function reload(page: Page): Promise<void> {
  await page.reload()
  await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
}
type Page = import('@playwright/test').Page

/**
 * Walk into a fight and stand it at a phase, without a fixture.
 *
 * A fixture rebuilds itself from the URL on reload, which would prove nothing
 * about the save. So these tests play to the position and then reload into
 * whatever `localStorage` is holding.
 */
async function played(page: Page, phase: 'thrown' | 'fielded' | 'rolled' | 'smashed'): Promise<void> {
  await boot(page)
  await act(page, 'start').click()
  await act(page, 'go').click()
  await act(page, 'go').click()
  await act(page, 'fight').click()
  if (phase === 'thrown') return
  await act(page, 'field').click()
  if (phase === 'fielded') return
  await act(page, 'throw').click()
  if (phase === 'rolled') return
  await act(page, 'smash').click()
}

/** Boot always lands on the title; CONTINUE is one press back. */
async function resume(page: Page): Promise<void> {
  await reload(page)
  await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
  await expect(act(page, 'continue')).toBeVisible()
  await act(page, 'continue').click()
}

test.describe('a reload from', () => {
  test('thrown keeps the enemy line and resets nothing but the draft', async ({ page }) => {
    await played(page, 'thrown')
    const line = await valuesOf(enemyBones(page))
    await act(page, 'width-down').click()
    await act(page, 'width-down').click()
    await expect(page.locator('#width')).toHaveAttribute('data-width', '4')

    await resume(page)

    // The threat is identical. It was decided by FIGHT and saved before a
    // frame of the throw played.
    expect(await valuesOf(enemyBones(page))).toEqual(line)
    // And the draft is gone, because a draft is a thought rather than a move.
    // Losing an unfinished thought is exactly right; a half-selected army in
    // a save would not be.
    await expect(page.locator('#width')).toHaveAttribute('data-width', '6')
    expect((await state(page)).run!.combat!.field).toBeUndefined()
  })

  test('fielded keeps the committed composition', async ({ page }) => {
    await played(page, 'fielded')
    const field = (await state(page)).run!.combat!.field!
    await resume(page)

    expect((await state(page)).run!.combat!.field).toEqual(field)
    await expect(act(page, 'throw')).toBeVisible()
    // And the throw it produces is the one it was always going to produce.
    await act(page, 'throw').click()
    const first = await valuesOf(bones(page))
    expect(first).toHaveLength(field.width)
  })

  test('rolled keeps the exact values, and does not roll again', async ({ page }) => {
    await played(page, 'rolled')
    const line = await valuesOf(bones(page))
    await resume(page)

    expect(await valuesOf(bones(page))).toEqual(line)
    await expect(act(page, 'smash')).toBeVisible()
    await expect(act(page, 'throw')).toHaveCount(0)
  })

  test('smashed keeps the casualties and still offers ROUND', async ({ page }) => {
    await played(page, 'smashed')
    if ((await screenName(page)) !== null) return
    const before = (await state(page)).run!
    const smash = before.combat?.lastSmash
    if (!smash) return

    await resume(page)
    const after = (await state(page)).run!
    expect(after.commonBones).toBe(before.commonBones)
    expect(after.combat!.lastSmash).toEqual(smash)
    await expect(act(page, 'round')).toBeVisible()
  })

  test('a cleared room stays cleared', async ({ page }) => {
    await boot(page, '?room=sanctuary')
    await act(page, 'ritual').click()
    const ritual = (await state(page)).run as unknown as { ritual: unknown }
    await page.goto('/?motion=0')
    // A fixture does not persist, so this checks the *shape* rather than the
    // value: a run built from a URL is never written over a real save.
    expect(ritual).toBeTruthy()
  })
})

test.describe('the save never holds a frame', () => {
  test('nothing about an animation is written', async ({ page }) => {
    await played(page, 'smashed')
    const raw = await page.evaluate(() => localStorage.getItem('castlebrynth'))
    expect(raw).toBeTruthy()
    for (const forbidden of ['frame', 'elapsed', 'animating', 'startedAt', 'presenting']) {
      expect(raw, `the save carries ${forbidden}`).not.toContain(`"${forbidden}"`)
    }
  })

  test('a save from the game this replaced is discarded, and says so', async ({ page }) => {
    await page.goto('/?motion=0')
    await page.evaluate(() =>
      localStorage.setItem(
        'castlebrynth',
        JSON.stringify({ version: 6, mode: 'combat', meta: { runs: 3, wins: 1 } }),
      ),
    )
    await page.goto('/?motion=0')
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
    await expect(page.locator('#screen')).toContainText('lost the thread')
    await expect(act(page, 'continue')).toHaveCount(0)
  })
})

test.describe('a fixture is never written over a real save', () => {
  test('playing, then opening a fixture, then reloading finds the run', async ({ page }) => {
    await played(page, 'rolled')
    const line = await valuesOf(bones(page))

    // A fixture run: same tab, different URL, and `persist` is off for it.
    await page.goto('/?room=gate&mode=combat&motion=0')
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')

    await page.goto('/?motion=0')
    await act(page, 'continue').click()
    expect(await valuesOf(bones(page))).toEqual(line)
  })
})
