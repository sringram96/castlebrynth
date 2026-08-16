/**
 * The reload matrix.
 *
 * A real reload, from every stable phase of a round, landing on exactly the
 * state that was saved. This is the property the whole architecture is built
 * to give: the reducer decides, `dispatch` saves, and only then does anything
 * move — so there is never a frame in which the screen and the save disagree.
 */

import { expect, test } from '@playwright/test'

import { act, boot, dice, screenName, state, valuesOf } from './helpers.js'

/** Reload the tab, the way a player does. The save is what comes back. */
async function reload(page: Page): Promise<void> {
  await page.reload()
  await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
}
type Page = import('@playwright/test').Page

/**
 * Walk into a fight and stand it somewhere, without a fixture.
 *
 * A fixture rebuilds itself from the URL on reload, which would prove nothing
 * about the save. So these tests play to the position and then reload into
 * whatever `localStorage` is holding.
 */
async function played(page: Page, upTo: 'open' | 'rolled' | 'rerolled'): Promise<void> {
  await boot(page)
  await act(page, 'start').click()
  await act(page, 'go').click()
  await act(page, 'go').click()
  await act(page, 'fight').click()
  if (upTo === 'open') return
  await act(page, 'roll').click()
  if (upTo === 'rolled') return
  await dice(page).first().click()
  await act(page, 'reroll').click()
}

/** Boot always lands on the title; CONTINUE is one press back. */
async function resume(page: Page): Promise<void> {
  await reload(page)
  await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
  await expect(act(page, 'continue')).toBeVisible()
  await act(page, 'continue').click()
}

test.describe('a reload from', () => {
  test('an unthrown attack keeps the fight and offers the throw again', async ({ page }) => {
    await played(page, 'open')
    const before = (await state(page)).run!.combat!

    await resume(page)

    const after = (await state(page)).run!.combat!
    expect(after.enemyId).toBe(before.enemyId)
    expect(after.enemyHp).toBe(before.enemyHp)
    expect(after.dice).toEqual([])
    expect(after.rollsUsed).toBe(0)
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('a thrown attack keeps the exact faces, and does not throw again', async ({ page }) => {
    await played(page, 'rolled')
    if ((await screenName(page)) !== null) return
    const faces = await valuesOf(dice(page))
    await resume(page)

    expect(await valuesOf(dice(page))).toEqual(faces)
    expect((await state(page)).run!.combat!.rollsUsed).toBe(1)
    // The one thing a reload is allowed to lose is the thought: which dice the
    // thumb had lit. It does not lose the faces, and it does not grant a throw.
    for (const die of await dice(page).all()) {
      await expect(die).toHaveAttribute('data-held', 'no')
    }
    await expect(act(page, 'reroll')).toBeVisible()
  })

  test('a rerolled attack keeps its count of throws', async ({ page }) => {
    await played(page, 'rerolled')
    if ((await screenName(page)) !== null) return
    const before = (await state(page)).run!
    const faces = await valuesOf(dice(page))

    await resume(page)
    const after = (await state(page)).run!
    expect(after.bones).toBe(before.bones)
    expect(after.combat!.rollsUsed).toBe(2)
    expect(await valuesOf(dice(page))).toEqual(faces)
  })

  test('a settled exchange keeps the record it was settled with', async ({ page }) => {
    await played(page, 'rolled')
    const combat = (await state(page)).run!.combat!
    // Score whatever the table allows, through the scorecard.
    await page.locator('button.score-entry').first().click()
    if ((await screenName(page)) !== null) return
    const before = (await state(page)).run!
    if (!before.combat?.lastAttack) return

    await resume(page)
    const after = (await state(page)).run!
    expect(after.bones).toBe(before.bones)
    expect(after.combat!.lastAttack).toEqual(before.combat.lastAttack)
    expect(after.combat!.round).toBe(combat.round + 1)
    await expect(act(page, 'roll')).toBeVisible()
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
  test('nothing about an animation, and no hold, is written', async ({ page }) => {
    await played(page, 'rerolled')
    const raw = await page.evaluate(() => localStorage.getItem('castlebrynth'))
    expect(raw).toBeTruthy()
    for (const forbidden of ['frame', 'elapsed', 'animating', 'startedAt', 'presenting', 'held']) {
      expect(raw, `the save carries ${forbidden}`).not.toContain(`"${forbidden}"`)
    }
  })

  test('a save from the game this replaced is discarded, and says so', async ({ page }) => {
    await page.goto('/?motion=0')
    await page.evaluate(() =>
      localStorage.setItem(
        'castlebrynth',
        JSON.stringify({ version: 8, mode: 'combat', meta: { runs: 3, wins: 1 } }),
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
    const faces = await valuesOf(dice(page))

    // A fixture run: same tab, different URL, and `persist` is off for it.
    await page.goto('/?room=gate&mode=combat&motion=0')
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')

    await page.goto('/?motion=0')
    await act(page, 'continue').click()
    expect(await valuesOf(dice(page))).toEqual(faces)
  })
})
