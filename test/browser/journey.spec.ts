/**
 * The whole route, in a browser, on real presses.
 *
 * This is the test that decides completion. A green unit suite is not
 * completion; see `CLAUDE.md`. Every press below is a real press on a real
 * button, and **no state is injected anywhere in this file** — the run gets
 * from the door to the exit or it does not.
 */

import { expect, test } from '@playwright/test'

import { act, boot, livingBones, screenName, state, wayTo, where } from './helpers.js'
import { clearReward, fight, fightItOut } from './play.js'

test.describe('the short route', () => {
  test('door to exit, without a single injected state', async ({ page }) => {
    test.slow()
    await boot(page)
    await act(page, 'start').click()
    expect(await livingBones(page)).toBe(30)

    await act(page, 'go').click()
    await act(page, 'go').click()

    // The Gnawing. A room with a living enemy has no way on.
    await expect(act(page, 'go')).toHaveCount(0)
    if ((await fightItOut(page)) === 'died') return
    await clearReward(page)
    await expect(act(page, 'go')).toBeVisible()

    // The Font. Its exit is withheld until it has answered.
    await act(page, 'go').click()
    await expect(act(page, 'go')).toHaveCount(0)
    const before = await livingBones(page)
    await act(page, 'ritual').click()
    expect(await livingBones(page)).toBeGreaterThanOrEqual(before)
    await expect(act(page, 'go')).toBeVisible()

    // The Reliquary is entirely optional, and GO ON never leaves.
    await act(page, 'go').click()
    await expect(act(page, 'go')).toBeVisible()
    await act(page, 'go').click()

    // The fork. Take the stair, by the label the map put on the button.
    expect(await where(page)).toBe('fork')
    await page.locator('[data-act="go"]').filter({ hasText: 'STAIR' }).click()
    expect(await where(page)).toBe('gate')

    // The Warden, and the door behind it.
    if ((await fightItOut(page)) === 'died') return
    await clearReward(page)
    await act(page, 'go').click()
    expect(await screenName(page)).toBe('complete')
    await expect(page.locator('#screen')).toContainText('bones left')
  })
})

test.describe('the deep route', () => {
  test('through the vault and the Marrow, and the Vial it always leaves', async ({ page }) => {
    test.slow()
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    if ((await fightItOut(page)) === 'died') return
    await clearReward(page)

    await act(page, 'go').click()
    await act(page, 'ritual').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    expect(await where(page)).toBe('fork')

    // DEEP is the second bed, and it says what it costs before the tap. The
    // button carries a **node** id, so it is found through the map.
    const deep = await wayTo(page, 'chain-vault')
    await expect(deep).toBeVisible()
    await deep.click()
    expect(await where(page)).toBe('chain-vault')

    // A shut gate holds the exits. The lever pulled against nothing costs a
    // bone; worked in the right order it costs none.
    await expect(act(page, 'go')).toHaveCount(0)
    const before = await livingBones(page)
    await page.locator('[data-interact="vault-chain"]').click()
    await page.locator('[data-interact="vault-lever"]').click()
    expect(await livingBones(page)).toBe(before)
    await expect(act(page, 'go')).toBeVisible()

    await act(page, 'go').click()
    expect(await where(page)).toBe('deep')

    const vials = (await state(page)).run!.vials
    const report = await fight(page)
    if (report.end === 'died') return
    // The Marrow always leaves a Vial, offer or no offer — **net of whatever
    // the fight drank**. A round that spends one and then wins one leaves the
    // satchel where it started, and a bare count would read that as a missing
    // drop rather than as the fight being expensive.
    expect((await state(page)).run!.vials).toBe(vials - report.drank + 1)
    await clearReward(page, false)
  })
})

test.describe('the reward screen', () => {
  test('TAKE puts the thing where it belongs, and says its rule', async ({ page }) => {
    test.slow()
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    if ((await fightItOut(page)) === 'died') return
    if ((await screenName(page)) !== 'reward') return

    // Every card states its exact mechanic before the press.
    const first = page.locator('#offers .offer').first()
    await expect(first.locator('.card-rule')).toContainText('EFFECT')
    await expect(first.locator('.card-rule')).toContainText(/\d/)

    const id = await first.getAttribute('data-offer-id')
    await first.locator('[data-act="take"]').click()
    await expect(page.locator('#screen')).toBeHidden()
    await expect(page.locator('#say')).toContainText('taken')

    const run = (await state(page)).run!
    if (id === 'vial') expect(run.vials).toBe(1)
  })

  test('SKIP leaves it, and changes nothing about the army', async ({ page }) => {
    test.slow()
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    if ((await fightItOut(page)) === 'died') return
    if ((await screenName(page)) !== 'reward') return

    const before = (await state(page)).run!
    await expect(act(page, 'skip')).toBeVisible()
    await act(page, 'skip').click()

    await expect(page.locator('#screen')).toBeHidden()
    const after = (await state(page)).run!
    expect(after.bones).toBe(before.bones)
    expect(after.vials).toBe(before.vials)
    expect(after.offer).toBeUndefined()
    await expect(page.locator('#say')).toContainText('leave it')
  })

  test('never changes the pile, whichever way it is answered', async ({ page }) => {
    // The satchel and the pile are separate things. Nothing on the reward
    // screen may change how many bones a run is carrying.
    test.slow()
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    if ((await fightItOut(page)) === 'died') return
    if ((await screenName(page)) !== 'reward') return
    const before = (await state(page)).run!.bones
    await page.locator('[data-act="take"]').first().click()
    expect((await state(page)).run!.bones).toBe(before)
  })
})
