/**
 * How often the labyrinth gives you something, in a real browser.
 *
 * Both outcomes of a win are journeys the player takes, so both are pressed
 * here: the one that opens an offer, and the one that says the thing is dead
 * and hands over nothing. The second used to be unreachable — every fight
 * paid, and a room laid two items out before the first fight — and an
 * empty-handed win that nobody has ever seen is the one that looks like a bug.
 *
 * The seeds are chosen, not lucky: `?seed=` builds the same run every time, so
 * these are deterministic assertions about a probabilistic rule.
 */

import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

import { act, boot, dice, screenName, state, tappable } from './helpers.js'

/** Land the killing blow on a fight opened one point from over. */
async function finishFight(page: Page): Promise<void> {
  await act(page, 'roll').click()
  await dice(page).nth(0).click()
  await act(page, 'score').click()
}

test.describe('what a win leaves behind', () => {
  test('the passage hands out nothing on the way to the first fight', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()

    // No offer screen, and no upgrade: an upgrade is beaten out of something.
    expect(await screenName(page)).toBeNull()
    const now = await state(page)
    expect(now.mode).toBe('explore')
    expect(now.run!.roomId).toBe('passage')
    expect(now.run!.dice.every((d) => d === 'plain')).toBe(true)
    expect(now.run!.relics).toEqual([])
  })

  test('a fight that drops something offers at most two, and taking one equips it', async ({
    page,
  }) => {
    await boot(page, '?room=hollow&enemyHp=1&seed=1')
    await finishFight(page)

    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'reward')
    const offers = page.locator('#offers .offer')
    const count = await offers.count()
    expect(count, 'a win offered more than the Gnawing declares').toBeLessThanOrEqual(2)
    expect(count, 'a reward screen with nothing on it').toBeGreaterThan(0)
    // Take one is the prompt, and each card states its mechanic before TAKE.
    await expect(page.locator('#screen')).toContainText('Take one.')

    const taken = await offers.first().getAttribute('data-offer-id')
    await page.locator('[data-act="take"]').first().click()
    await expect(page.locator('#screen')).toBeHidden()

    const after = await state(page)
    expect(after.run!.dice, 'the hand stopped being six').toHaveLength(6)
    expect([...after.run!.dice, ...after.run!.relics]).toContain(taken)
    // And the pickup line repeats the rule rather than confirming the press.
    await expect(page.locator('#say')).toContainText('taken.')
  })

  test('a fight that drops nothing goes straight back to the room and says so', async ({ page }) => {
    await boot(page, '?room=hollow&enemyHp=1&seed=4')
    await finishFight(page)

    expect(await screenName(page), 'seed 4 opened an offer').toBeNull()
    await expect(page.locator('#say')).toContainText('Nothing useful on it')
    // The way on is open, and the tray is the interface again.
    await expect(act(page, 'go')).toBeVisible()
    await tappable(page, act(page, 'go'))
    const after = await state(page)
    expect(after.mode).toBe('explore')
    expect(after.run!.relics).toEqual([])
  })

  test('the optional fight has both outcomes too', async ({ page }) => {
    await boot(page, '?room=deep&enemyHp=1&seed=1')
    await finishFight(page)
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'reward')
    await expect(page.locator('#offers .offer')).toHaveCount(2)

    await boot(page, '?room=deep&enemyHp=1&seed=4')
    await finishFight(page)
    expect(await screenName(page)).toBeNull()
  })

  test('the boss leaves nothing, on any seed', async ({ page }) => {
    for (const seed of [1, 2, 4, 7]) {
      await boot(page, `?room=gate&enemyHp=1&seed=${seed}`)
      await finishFight(page)
      expect(await screenName(page), `seed ${seed} made the Warden drop something`).toBeNull()
      // The door is the reward.
      await expect(act(page, 'go')).toBeVisible()
    }
  })

  test('a taken relic appears in the tray without opening anything', async ({ page }) => {
    await boot(page, '?room=hollow&enemyHp=1&seed=1')
    await finishFight(page)

    const relicOffer = page.locator('#offers .offer').filter({ hasText: 'EFFECT ·' }).first()
    test.skip((await relicOffer.count()) === 0, 'this seed offered two dice')
    const id = await relicOffer.getAttribute('data-offer-id')
    await relicOffer.locator('[data-act="take"]').click()

    const slot = page.locator(`#relics .relic[data-relic-id="${id}"]`)
    await expect(slot).toBeVisible()
    await tappable(page, slot)
  })
})
