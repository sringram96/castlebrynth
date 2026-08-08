/**
 * What the player can actually read, on the screen they read it from.
 *
 * `test/unit/copy.test.ts` holds the content to its rules. This holds the
 * *interface* to putting them in front of somebody — a rule that is exact in
 * `dice.ts` and never rendered is not a rule anybody has read.
 */

import { expect, test } from '@playwright/test'

import { act, boot, dice } from './helpers.js'

test.describe('a special die explains itself in one card', () => {
  test('the Pusher names its red 1, its cost, and when it applies', async ({ page }) => {
    await boot(page, '?room=fork&dice=pusher')
    await dice(page).nth(0).click()

    const card = page.locator('#overlay')
    await expect(card).toContainText('red 1')
    await expect(card).toContainText('lose 7 HP')
    await expect(card).toContainText('included in the hand you SCORE')
    // And why anybody would want it, in play terms.
    await expect(card).toContainText('HELPS WITH ·')
    await expect(card).toContainText('Triples of 6')
  })

  test('the Runner distinguishes its ordinary 6 from its red one', async ({ page }) => {
    await boot(page, '?room=fork&dice=runner')
    await dice(page).nth(0).click()

    const card = page.locator('#overlay')
    await expect(card).toContainText('One of its 6 faces is red')
    await expect(card).toContainText('lose 5 HP')
    // Both sixes are on the card, and only one carries a mark.
    await expect(card.locator('.card-faces .die-face[data-value="6"]')).toHaveCount(2)
    await expect(card.locator('.card-faces .mark-hurt')).toHaveCount(1)
  })

  test('the Leech names its green 6 and what it gives back', async ({ page }) => {
    await boot(page, '?room=fork&dice=leech')
    await dice(page).nth(0).click()

    const card = page.locator('#overlay')
    await expect(card).toContainText('its 6 is green')
    await expect(card).toContainText('heal 4 HP')
    await expect(card).toContainText('included in the hand you SCORE')
    await expect(card).not.toContainText('only healing')
  })

  test('the Careful Bone says exactly which faces it has', async ({ page }) => {
    await boot(page, '?room=fork&dice=careful')
    await dice(page).nth(0).click()
    await expect(page.locator('#overlay')).toContainText('can only roll 3 or 4: three faces of each')
  })
})

test.describe('a relic explains itself in one card', () => {
  test('Blood Thimble says which faces it pays for', async ({ page }) => {
    await boot(page, '?room=fork&relics=thimble')
    await page.locator('#relics .relic[data-relic-id="thimble"]').click()

    const card = page.locator('#overlay')
    await expect(card).toContainText('EFFECT ·')
    await expect(card).toContainText('Each red damage face included in the hand you SCORE')
    await expect(card).toContainText('+8 damage')
    await expect(card).toContainText('HELPS WITH ·')
    await expect(card).toContainText('Pusher and Runner')
    // No private vocabulary and no metaphor standing in for the rule.
    await expect(card).not.toContainText('marked')
    await expect(card).not.toContainText('BUILD ·')
  })

  test('Choir Nail states its condition rather than its rarity', async ({ page }) => {
    await boot(page, '?room=fork&relics=nail')
    await page.locator('#relics .relic[data-relic-id="nail"]').click()
    await expect(page.locator('#overlay')).toContainText('shows the same number, double the final damage')
    await expect(page.locator('#overlay')).not.toContainText('enormous')
  })
})

test.describe('the numbers are legible before they are committed', () => {
  test('a red face previews its cost as a consequence, not a sign', async ({ page }) => {
    await boot(page, '?seed=2&room=hollow&mode=combat&dice=pusher,pusher,pusher,pusher,pusher,pusher')
    await act(page, 'roll').click()
    await page.locator('.die:has(.mark-hurt)').first().click()
    await expect(page.locator('#well')).toContainText('Lose 7 HP')
  })

  test('a relic bonus is named where it is added', async ({ page }) => {
    await boot(page, '?seed=2&room=hollow&mode=combat&dice=pusher,pusher,pusher,pusher,pusher,pusher&relics=thimble')
    await act(page, 'roll').click()
    await page.locator('.die:has(.mark-hurt)').first().click()
    // Not a bare "+8" the player has to attribute themselves.
    await expect(page.locator('#well')).toContainText('Blood Thimble +8')
  })

  test('an enemy telegraph states its next blow and its size', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat')
    // Two rakes, then the wind-up. Play to it through the real interface.
    for (let turn = 0; turn < 2; turn++) {
      await act(page, 'roll').click()
      await dice(page).nth(0).click()
      await act(page, 'score').click()
    }
    const intent = page.locator('#intent')
    await expect(intent).toContainText('WIND UP')
    await intent.click()
    await expect(page.locator('#say')).toContainText('Its next attack is CRUSH for 15')
  })

  test('MENU states the damage equation literally', async ({ page }) => {
    await boot(page, '?room=fork')
    await act(page, 'menu').click()
    await expect(page.locator('#overlay')).toContainText(
      'DAMAGE = selected dice total × hand multiplier + relic bonuses',
    )
    await expect(page.locator('#overlay')).toContainText(
      'resolve when that face is included in the hand you SCORE',
    )
  })
})

test.describe('a pickup says what it does', () => {
  test('repeats the rule instead of confirming the press', async ({ page }) => {
    await boot(page, '?room=hollow&enemyHp=1&seed=1')
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await act(page, 'score').click()

    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'reward')
    await page.locator('#offers .offer[data-offer-id="wax"] [data-act="take"]').click()
    await expect(page.locator('#say')).toContainText('Grave Wax taken.')
    await expect(page.locator('#say')).toContainText('score exactly 3 dice, heal 2 HP')
  })
})
