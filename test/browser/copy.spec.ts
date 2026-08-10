/**
 * The copy, where a player actually reads it.
 *
 * `test/unit/copy.test.ts` holds the content tables to their rules. This holds
 * the *screen* to them: a sentence that exists in `bones.ts` and is never
 * rendered is not a rule anybody has read.
 */

import { expect, test } from '@playwright/test'

import { act, boot, bones } from './helpers.js'

test.describe('a bone explains itself in one card', () => {
  test('the Cinderbone states its six faces and nothing else', async ({ page }) => {
    await boot(page, '?room=fork&specials=cinderbone')
    await act(page, 'pouch').click()

    const overlay = page.locator('#overlay')
    await expect(overlay).toContainText('Cinderbone')
    await expect(overlay).toContainText('3, 4, 5, 6, 7, 7.')
    // Six faces drawn, and the two sevens are both there.
    await expect(overlay.locator('.card-faces .bone-face')).toHaveCount(6)
    await expect(overlay.locator('.card-faces .bone-face[data-value="7"]')).toHaveCount(2)
  })

  test('the Knuckle states the eight it can reach, in digits', async ({ page }) => {
    await boot(page, '?room=fork&specials=knuckle')
    await act(page, 'pouch').click()
    const overlay = page.locator('#overlay')
    await expect(overlay).toContainText('4, 5, 6, 6, 7, 8.')
    // And the eight prints its number, because no pip pattern says eight.
    await expect(overlay.locator('.bone-face[data-value="8"] .bone-numeral')).toHaveText('8')
  })

  test('a bone in the line can be inspected without spending anything', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat&phase=smashed')
    await bones(page).first().click()
    await expect(page.locator('#overlay')).toBeVisible()
    await expect(page.locator('#overlay')).toContainText('1, 2, 3, 4, 5, 6.')
    await act(page, 'close').click()
    await expect(page.locator('#overlay')).toBeHidden()
  })
})

test.describe('a carried thing explains itself in one card', () => {
  test('a Vial says what it gives and where it stops', async ({ page }) => {
    await boot(page, '?room=fork&bones=30&vials=1')
    // Full, so the bay inspects rather than drinks.
    await page.locator('.satchel-slot[data-slot-id="vial"]').click()
    const overlay = page.locator('#overlay')
    await expect(overlay).toContainText('5 common bones back')
    await expect(overlay).toContainText('30')
  })

  test('the well asks for the decision the phase actually wants', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown')
    await expect(page.locator('#well')).toContainText('Its line is up')
  })

  test('the Marrow says what is wrong with its bones', async ({ page }) => {
    await boot(page, '?room=deep')
    await expect(page.locator('#well')).toContainText('Two of its bones are wrong')
  })

  test('a taken thing repeats its own rule', async ({ page }) => {
    // The pickup line is the card again, not "Vial. Taken." — sending the
    // player to MENU to find out what they just chose is the failure this
    // exists to prevent.
    await boot(page, '?room=fork')
    await expect(page.locator('#say')).not.toContainText('Taken.')
  })
})

test.describe('nothing on screen speaks the old language', () => {
  const FIXTURES = [
    '?room=entry',
    '?room=fork&specials=knuckle&vials=1',
    '?room=hollow&mode=combat&phase=thrown',
    '?room=deep&mode=combat&phase=smashed',
    '?room=gate&mode=combat&phase=smashed',
    '?mode=dead',
    '?mode=complete',
  ]

  for (const fixture of FIXTURES) {
    test(`${fixture} never says HP or damage`, async ({ page }) => {
      await boot(page, fixture)
      const text = await page.locator('body').innerText()
      expect(text, 'the screen says HP').not.toMatch(/\bHP\b/)
      expect(text, 'the screen says damage').not.toMatch(/\bdamage\b/i)
      expect(text, 'the screen says health').not.toMatch(/\bhealth\b/i)
      expect(text, 'the screen says relic').not.toMatch(/\brelic\b/i)
    })
  }

  test('MENU carries no scoring ladder and no multiplier', async ({ page }) => {
    await boot(page, '?room=fork')
    await act(page, 'menu').click()
    const overlay = page.locator('#overlay')
    await expect(overlay.locator('.ladder')).toHaveCount(0)
    await expect(overlay).not.toContainText('multiplier')
    await expect(overlay).not.toContainText('SCORING')
  })
})
