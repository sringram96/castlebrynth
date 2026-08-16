/**
 * The input contract, in a fight.
 *
 * Every visible verb is a real button that answers a real tap at its own
 * centre; art is `pointer-events: none`; an unavailable action is absent
 * rather than greyed. These are the failures a logical suite cannot see.
 */

import { expect, test } from '@playwright/test'

import {
  act,
  boot,
  dice,
  scoresOnOffer,
  scoresSpent,
  tappable,
  trayControls,
  valuesOf,
} from './helpers.js'

/** The three positions an attack can be in, as fixtures. */
const POSITIONS = [
  ['before the throw', '?room=deep&vials=1&mode=combat'],
  ['with throws left', '?room=deep&vials=1&rolls=1'],
  ['with none left', '?room=deep&vials=1&rolls=3'],
] as const

test.describe('every control answers a tap', () => {
  for (const [name, fixture] of POSITIONS) {
    test(name, async ({ page }) => {
      await boot(page, fixture)
      const controls = await trayControls(page)
      expect(controls.length, 'the tray offered nothing').toBeGreaterThan(0)
      for (const control of controls) await tappable(page, control)
    })
  }

  test('exploring', async ({ page }) => {
    await boot(page, '?room=fork&vials=1')
    for (const control of await trayControls(page)) await tappable(page, control)
  })
})

test.describe('art never eats a press', () => {
  test('the tray plate and every bone face are inert', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const inert = await page.evaluate(() =>
      [...document.querySelectorAll('#tray-frame, .bone-face, .pip, #enemy, #backdrop')].map(
        (n) => getComputedStyle(n).pointerEvents,
      ),
    )
    expect(inert.length).toBeGreaterThan(0)
    for (const value of inert) expect(value).toBe('none')
  })
})

test.describe('an unavailable action is absent', () => {
  test('nothing on the tray is ever disabled', async ({ page }) => {
    for (const [, fixture] of POSITIONS) {
      await boot(page, fixture)
      await expect(page.locator('#tray button[disabled]')).toHaveCount(0)
      await expect(page.locator('#tray [aria-disabled="true"]')).toHaveCount(0)
    }
  })

  test('a hand that cannot be scored is text, not a dead button', async ({ page }) => {
    // 1 2 3 4 6 6 makes a pair and nothing else. The other seven entries are
    // still on the card, because *what is left* is the decision — and not one
    // of them is a control.
    await boot(page, '?room=deep&rolls=1&dice=1,2,3,4,6,6')
    await expect(page.locator('.score-entry')).toHaveCount(8)
    await expect(page.locator('button.score-entry')).toHaveCount(1)
    expect(await scoresOnOffer(page)).toEqual(['pair'])
    for (const hand of ['triple', 'straight', 'full-house', 'six-kind']) {
      await expect(page.locator(`.score-entry[data-hand="${hand}"]`)).toHaveAttribute(
        'data-legal',
        'no',
      )
    }
  })

  test('a fight with no reward offers nothing to take', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat')
    await expect(act(page, 'take')).toHaveCount(0)
    await expect(act(page, 'skip')).toHaveCount(0)
  })

  test('the verbs the old fight had are nowhere on the screen', async ({ page }) => {
    for (const [, fixture] of POSITIONS) {
      await boot(page, fixture)
      for (const gone of ['throw', 'round', 'field', 'smash', 'charm', 'pouch']) {
        await expect(act(page, gone), `${gone} is still on the tray`).toHaveCount(0)
      }
    }
  })
})

test.describe('the crown', () => {
  test('shows the shape of the attack before it is thrown, with no faces', async ({ page }) => {
    await boot(page, '?room=deep&bones=30&mode=combat')
    await expect(dice(page)).toHaveCount(6)
    // No value has been decided, so none is shown: a face here would be the
    // view inventing a number the reducer has not drawn.
    for (const value of await valuesOf(dice(page))) expect(Number.isNaN(value)).toBe(true)
    await expect(page.locator('#crown .bone-back')).toHaveCount(6)
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('is a row of HOLD buttons while a throw remains', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    await expect(page.locator('#crown [data-act="hold"]')).toHaveCount(6)
    const first = dice(page).first()
    await expect(first).toHaveAttribute('data-held', 'no')
    await expect(first).toHaveAttribute('aria-pressed', 'false')
    await first.click()
    await expect(first).toHaveAttribute('data-held', 'yes')
    await expect(first).toHaveAttribute('aria-pressed', 'true')
    await first.click()
    await expect(first).toHaveAttribute('data-held', 'no')
  })

  test('stops being a control once there is nothing left to throw', async ({ page }) => {
    await boot(page, '?room=deep&rolls=3')
    await expect(dice(page)).toHaveCount(6)
    await expect(page.locator('#crown [data-act="hold"]')).toHaveCount(0)
    await expect(act(page, 'reroll')).toHaveCount(0)
  })

  test('says which die it is, what it shows, and whether it is held', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const values = await valuesOf(dice(page))
    for (let index = 0; index < values.length; index++) {
      await expect(dice(page).nth(index)).toHaveAttribute(
        'aria-label',
        `Die ${index + 1}, showing ${values[index]}, not held`,
      )
    }
    await dice(page).first().click()
    await expect(dice(page).first()).toHaveAttribute(
      'aria-label',
      `Die 1, showing ${values[0]}, held`,
    )
  })
})

test.describe('REROLL', () => {
  test('is offered while a throw remains and not after', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    await expect(act(page, 'reroll')).toBeVisible()
    await boot(page, '?room=deep&rolls=2')
    await expect(act(page, 'reroll')).toBeVisible()
    await boot(page, '?room=deep&rolls=3')
    await expect(act(page, 'reroll')).toHaveCount(0)
  })

  test('is not offered when everything is held, because nothing would move', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const row = dice(page)
    for (let index = 0; index < (await row.count()); index++) await row.nth(index).click()
    await expect(act(page, 'reroll')).toHaveCount(0)
  })

  test('leaves a held bone exactly where it was', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const before = await valuesOf(dice(page))
    await dice(page).nth(0).click()
    await dice(page).nth(2).click()
    await act(page, 'reroll').click()

    const after = await valuesOf(dice(page))
    expect(after[0]).toBe(before[0])
    expect(after[2]).toBe(before[2])
    expect(after).toHaveLength(before.length)
    // And the holds survive the throw, so a six kept through the second is
    // still kept going into the third.
    await expect(dice(page).nth(0)).toHaveAttribute('data-held', 'yes')
    await expect(dice(page).nth(2)).toHaveAttribute('data-held', 'yes')
  })
})

test.describe('the scorecard', () => {
  test('prints every hand and its multiplier, all the time', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const card = page.locator('#scorecard')
    await expect(card).toBeVisible()
    for (const [hand, multiplier] of [
      ['pair', '×1'],
      ['two-pair', '×1.25'],
      ['triple', '×1.5'],
      ['straight', '×1.75'],
      ['full-house', '×2'],
      ['four-kind', '×2.5'],
      ['five-kind', '×3'],
      ['six-kind', '×4'],
    ] as const) {
      await expect(card.locator(`[data-hand="${hand}"] .score-mult`)).toHaveText(multiplier)
    }
  })

  test('states what a live choice would actually do', async ({ page }) => {
    // 6 6 6 4 4 3 sums to 29. Full House is ×2, so 58.
    await boot(page, '?room=deep&rolls=1&dice=6,6,6,4,4,3')
    await expect(page.locator('#attack-sum')).toHaveAttribute('data-sum', '29')
    await expect(page.locator('button.score-entry[data-hand="full-house"]')).toHaveAttribute(
      'aria-label',
      /58/,
    )
    await expect(page.locator('button.score-entry[data-hand="triple"]')).toHaveAttribute(
      'aria-label',
      /43/,
    )
  })

  test('marks a spent hand and stops offering it', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&dice=6,6,6,4,4,3&used=triple,pair')
    expect(await scoresSpent(page)).toEqual(expect.arrayContaining(['pair', 'triple']))
    expect(await scoresOnOffer(page)).not.toContain('triple')
    expect(await scoresOnOffer(page)).toContain('full-house')
  })

  test('offers CRAP only when nothing unspent qualifies, and never alongside', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&dice=1,2,3,4,6,6')
    expect(await scoresOnOffer(page)).toEqual(['pair'])
    await expect(page.locator('[data-hand="crap"]')).toHaveCount(0)

    await boot(page, '?room=deep&rolls=1&dice=1,2,3,4,6,6&used=pair')
    expect(await scoresOnOffer(page)).toEqual(['crap'])
    await expect(page.locator('button[data-hand="crap"]')).toBeVisible()
    await expect(page.locator('button[data-hand="crap"] .score-mult')).toHaveText('×0.5')
  })
})

test.describe('the enemy HUD', () => {
  test('states its health and its damage rather than drawing a bar', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat')
    await expect(page.locator('#enemy-hp')).toHaveAttribute('data-max', '120')
    await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', '5')
    await expect(page.locator('.meter')).toHaveCount(0)
    await expect(page.locator('#intent')).toHaveCount(0)
    await expect(page.locator('#enemy-bones')).toHaveCount(0)
  })

  test('prints an encounter rule where there is one', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat')
    await expect(page.locator('#enemy-rule')).toBeVisible()
    await tappable(page, page.locator('#enemy-rule'))
  })
})

test.describe('the well says what the attack wants next', () => {
  const lines: readonly [string, string][] = [
    ['?room=deep&mode=combat', 'Throw the bones.'],
    ['?room=deep&rolls=1', 'Hold, and throw the rest again.'],
    ['?room=deep&rolls=3', 'Nothing left to throw. Score it.'],
  ]

  for (const [fixture, line] of lines) {
    test(`${fixture} asks for its decision`, async ({ page }) => {
      await boot(page, fixture)
      await expect(page.locator('#well')).toContainText(line)
    })
  }
})
