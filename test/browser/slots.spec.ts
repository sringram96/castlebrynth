/**
 * Tap what you carry.
 *
 * A found thing used to be readable in exactly one moment — the one press
 * before TAKE — and afterwards it was a lump in a slot. Every fight after that
 * was played by memory, which is the opposite of the contract the game holds
 * itself to: *a found thing states its exact mechanic where it lies*.
 *
 * So an occupied slot opens its card, and the card shows **the faces**. It is
 * read-only in every position of the game, it is not offered mid-cascade, and
 * an empty slot offers nothing at all rather than a dead button.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, state } from './helpers.js'

const overlay = (page: Page) => page.locator('#overlay')
const chips = (page: Page) => page.locator('#overlay .faces .face-chip')

/** Everything the loadout rail is offering as a press. */
const slots = (page: Page) => page.locator('#iron button, #items button')

test.describe('an occupied slot opens its card', () => {
  test('reads an item die in the room, out of a fight', async ({ page }) => {
    await boot(page, '?room=fork&items=grave-candle')
    await page.locator('#items .item-die[data-item-id="grave-candle"]').click()

    await expect(overlay(page)).toBeVisible()
    // Name, faces, when-line, flavour — the whole card, in that order.
    await expect(overlay(page).locator('.card-name')).toHaveText('Grave Candle')
    await expect(chips(page)).toHaveText(['+3', '+3', '+5', '+5', '·', '·'])
    await expect(overlay(page)).toContainText('Rolls itself at every ATTACK. No press.')
    await expect(overlay(page)).toContainText('It only burns over the dead')
  })

  test('reads the iron die, which is on the rail between fights too', async ({ page }) => {
    await boot(page, '?room=fork&iron=3')
    await page.locator('#iron .iron-die').click()
    await expect(chips(page)).toHaveText(['0', '0', '3', '3', '5', '7'])
    await expect(overlay(page)).toContainText('Rolls with your six at ROLL')
    await expect(overlay(page)).toContainText('No press.')
  })

  test('reads the talisman, whose faces are the lines it answers to', async ({ page }) => {
    await boot(page, '?room=fork&talismans=pair-talisman')
    await act(page, 'inspect-talisman').click()
    await expect(chips(page)).toHaveText(['PAIR', 'TWO PAIR', '+12'])
    await expect(overlay(page)).toContainText('Fires when the line I score is PAIR or TWO PAIR')
  })

  test('reads a slot inside a fight, between sequences', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&iron=5&items=splinter-fetish')
    await page.locator('#items .item-die').first().click()
    await expect(chips(page)).toHaveText(['+8', '+8', '·', '·', '−2', '−2'])
    // The cost faces are marked as costs, not merely coloured.
    await expect(page.locator('#overlay .face-chip[data-face="cost"]')).toHaveCount(2)
  })

  test('writes nothing, in either mode', async ({ page }) => {
    for (const fixture of ['?room=fork&items=grave-candle', '?room=deep&rolls=1&items=grave-candle']) {
      await boot(page, fixture)
      const before = await state(page)
      await slots(page).first().click()
      await act(page, 'close').click()
      expect(await state(page), fixture).toEqual(before)
    }
  })
})

test.describe('what is not a slot offers nothing', () => {
  test('an empty rail has no presses on it', async ({ page }) => {
    await boot(page, '?room=fork&iron=none&items=none&talismans=none')
    await expect(slots(page)).toHaveCount(0)
    await expect(page.locator('.talisman-slot')).toHaveCount(0)
    // Hidden, never a dead button: there is nothing in the bay to read.
    await expect(act(page, 'inspect-slot')).toHaveCount(0)
  })

  test('the pile orb is not a slot', async ({ page }) => {
    await boot(page, '?room=fork&bones=20')
    await expect(page.locator('#orb button, #pile button')).toHaveCount(0)
    expect(await page.locator('#orb').evaluate((n) => n.tagName)).toBe('DIV')
  })

  test('a core die is not a slot: its press is the hold, and nothing else', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const acts = await page
      .locator('#crown button')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset['act']))
    expect(acts).toHaveLength(6)
    for (const found of acts) expect(found).toBe('hold')
  })
})

test.describe('the faces are drawn everywhere the thing is read', () => {
  test('on the thing lying in the room, under the LOOK that names it', async ({ page }) => {
    await boot(page, '?room=offertory&offertory=paid')
    await page.locator('[data-act="look-loot"]').click()
    const say = page.locator('#say')
    await expect(say).toContainText('Grave Candle')
    // The strip, in the band, where the thing lies.
    await expect(say.locator('.face-chip')).toHaveText(['+3', '+3', '+5', '+5', '·', '·'])
  })

  test('on the line that confirms taking it', async ({ page }) => {
    await boot(page, '?room=offertory&offertory=paid')
    await act(page, 'take').click()
    const say = page.locator('#say')
    await expect(say).toContainText('taken')
    await expect(say.locator('.face-chip')).toHaveText(['+3', '+3', '+5', '+5', '·', '·'])
  })

  test('and in the accessible name, because a chip is a picture', async ({ page }) => {
    await boot(page, '?room=offertory&offertory=paid')
    await expect(page.locator('[data-act="look-loot"]')).toHaveAttribute(
      'aria-label',
      /\+3, \+3, \+5, \+5, blank, blank/,
    )
    await boot(page, '?room=fork&iron=3')
    await expect(page.locator('#iron button')).toHaveAttribute('aria-label', /0, 0, 3, 3, 5, 7/)
  })
})
