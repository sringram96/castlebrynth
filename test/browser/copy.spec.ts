/**
 * The copy, where a player actually reads it.
 *
 * `test/unit/copy.test.ts` holds the content tables to their rules. This holds
 * the *screen* to them: a sentence that exists in `hands.ts` and is never
 * rendered is not a rule anybody has read.
 */

import { expect, test } from '@playwright/test'

import { act, boot } from './helpers.js'

test.describe('the scorecard explains itself where the fight is', () => {
  test('every hand and its multiplier is on the tray, all the time', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const card = page.locator('#scorecard')
    for (const name of ['PAIR', 'TWO PAIR', 'TRIPLE', 'STRAIGHT', 'FULL HOUSE', 'FOUR', 'FIVE', 'SIX']) {
      await expect(card).toContainText(name)
    }
  })

  test('and again in MENU, at a size a person can read', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    await act(page, 'menu').click()
    const table = page.locator('#hand-table')
    await expect(table.locator('.hand-row')).toHaveCount(9)
    await expect(table).toContainText('Three alike and two others alike.')
    await expect(table).toContainText('Five in a row: 1–5 or 2–6.')
    // The fallback is on the card, and it is plainly not one of the eight.
    await expect(table.locator('[data-hand="crap"]')).toContainText('never spent')
  })

  test('MENU states the pile, the satchel and the five lines a fight runs on', async ({ page }) => {
    await boot(page, '?room=fork&vials=2')

    await act(page, 'menu').click()
    const overlay = page.locator('#overlay')

    await expect(overlay.locator('#pile-total')).toContainText('BONES')
    await expect(overlay).toContainText('An attack throws 6 of them')

    await expect(overlay).toContainText('Vial')
    await expect(overlay).toContainText('5 bones back, up to 30 in all')

    await expect(overlay.locator('#rules li')).toHaveCount(5)
    await expect(overlay).toContainText('six bones')
    await expect(overlay).toContainText('CRAP')

    // The game this replaced is not in here.
    await expect(overlay).not.toContainText('High kills low')
    await expect(overlay).not.toContainText('Cinderbone')
    await expect(overlay).not.toContainText('POUCH')

    await act(page, 'close').click()
    await expect(overlay).toBeHidden()
  })
})

test.describe('a carried thing explains itself in one card', () => {
  test('a Vial says what it gives and where it stops', async ({ page }) => {
    await boot(page, '?room=fork&bones=30&vials=1')
    // Full, so the bay inspects rather than drinks.
    await page.locator('.satchel-slot[data-slot-id="vial"]').click()
    const overlay = page.locator('#overlay')
    await expect(overlay).toContainText('5 bones back')
    await expect(overlay).toContainText('30')
  })

  test('a taken thing repeats its own rule', async ({ page }) => {
    // The pickup line is the card again, not "Vial. Taken." — sending the
    // player to MENU to find out what they just chose is the failure this
    // exists to prevent.
    await boot(page, '?room=fork')
    await expect(page.locator('#say')).not.toContainText('Taken.')
  })
})

test.describe('the fight says its numbers out loud', () => {
  test('the word band reads back the whole exchange', async ({ page }) => {
    // 6 6 6 4 4 3 as a Full House: 29 × 2, 58 off a 120, and five bones for
    // leaving it standing.
    await boot(page, '?room=deep&bones=30&rolls=3&dice=6,6,6,4,4,3')
    await page.locator('.score-entry[data-hand="full-house"]').click()

    const say = page.locator('#say')
    await expect(say).toContainText('FULL HOUSE')
    await expect(say).toContainText('29 × 2 — 58')
    await expect(say).toContainText('The Marrow: 120 → 62')
    await expect(say).toContainText('It breaks 5 of mine. 30 → 25 bones.')
  })
})

test.describe('nothing on screen speaks the old language', () => {
  const FIXTURES = [
    '?room=entry',
    '?room=fork&vials=1',
    '?room=hollow&mode=combat',
    '?room=deep&rolls=1',
    '?room=gate&rolls=3',
    '?mode=dead',
    '?mode=complete',
  ]

  for (const fixture of FIXTURES) {
    test(`${fixture} never speaks the War of Bones`, async ({ page }) => {
      await boot(page, fixture)
      const text = await page.locator('body').innerText()
      // Damage and health are legitimate now — the enemy has both and states
      // both. What must never come back is the deleted machinery.
      expect(text, 'the screen says Cinderbone').not.toMatch(/\bcinderbone\b/i)
      expect(text, 'the screen says Knuckle').not.toMatch(/\bknuckle\b/i)
      expect(text, 'the screen says relic').not.toMatch(/\brelic\b/i)
      expect(text, 'the screen says lane').not.toMatch(/\blane\b/i)
      expect(text, 'the screen says smash').not.toMatch(/\bsmash\b/i)
      expect(text, 'the screen says pouch').not.toMatch(/\bpouch\b/i)
      expect(text, 'the screen gives the player HP').not.toMatch(/\bmy (HP|health)\b/i)
    })
  }
})
