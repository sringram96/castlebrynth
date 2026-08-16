import { expect, test } from '@playwright/test'

import {
  act,
  boot,
  dice,
  livingBones,
  screenName,
  scoresOnOffer,
  state,
  toFirstFight,
  valuesOf,
  where,
} from './helpers.js'
import { fightItOut } from './play.js'

test.describe('the first run', () => {
  test('fresh storage boots to a title that offers only what is true', async ({ page }) => {
    await boot(page)
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
    await expect(act(page, 'start')).toBeVisible()
    // Nothing to continue into, so no CONTINUE. The door never lies about
    // where a press takes you.
    await expect(act(page, 'continue')).toHaveCount(0)
  })

  test('starting a run lands in the first room with thirty bones', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()

    await expect(page.locator('#screen')).toBeHidden()
    await expect(page.locator('#backdrop')).toBeVisible()
    await expect(page.locator('#tray')).toBeVisible()
    await expect(page.locator('#say')).toContainText('The stair ends in a long hall')

    // The pile is the life, and it reads at arm's length.
    await expect(page.locator('#pile')).toHaveText('30')
    await expect(page.locator('#pile')).toHaveAttribute('aria-label', '30 living bones')
    // Out of a fight there is no hand. Six sockets pretending to be one would
    // be furniture left standing.
    await expect(dice(page)).toHaveCount(0)
  })

  test('carries no trace of the game this replaced', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    const body = await page.locator('body').innerHTML()
    for (const gone of [
      'data-act="throw"',
      'data-act="round"',
      'data-act="field"',
      'data-act="pouch"',
      'enemy-line',
    ]) {
      expect(body, `${gone} is still in the DOM`).not.toContain(gone)
    }
    const run = (await state(page)).run as unknown as Record<string, unknown>
    expect(run).not.toHaveProperty('hp')
    expect(run).not.toHaveProperty('commonBones')
    expect(run).not.toHaveProperty('specials')
    expect(run).not.toHaveProperty('relics')
    expect(run).toHaveProperty('bones')
  })

  test('looking is free, always answers, and never commits', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()

    const before = await livingBones(page)
    const details = page.locator('#hits .hit')
    const count = await details.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await details.nth(i).click()
      await expect(page.locator('#say')).toBeVisible()
      await expect(page.locator('#say')).not.toBeEmpty()
    }

    expect(await livingBones(page)).toBe(before)
    expect(await where(page)).toBe('entry')
  })

  test('MENU states the pile, the satchel, the rules and the scorecard', async ({ page }) => {
    await boot(page, '?room=fork&vials=2')

    await act(page, 'menu').click()
    const overlay = page.locator('#overlay')

    await expect(overlay.locator('#pile-total')).toContainText('BONES')
    await expect(overlay).toContainText('Vial')
    await expect(overlay).toContainText('5 bones back, up to 30 in all')

    // The whole fight, in five lines, and the scorecard under them.
    await expect(overlay.locator('#rules li')).toHaveCount(5)
    await expect(overlay).toContainText('Hold what I want')
    await expect(overlay.locator('#hand-table')).toContainText('FULL HOUSE')
    await expect(overlay.locator('#hand-table')).toContainText('×2')

    // The game this replaced is not in here.
    await expect(overlay).not.toContainText('High kills low')
    await expect(overlay).not.toContainText('Knuckle')

    await act(page, 'close').click()
    await expect(overlay).toBeHidden()
  })

  test('the enemy is visible before any combat control appears', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)

    // Still exploring: no hand, no verb, and the monster already fills the
    // scene. This is the P0 the reset exists to fix.
    await expect(act(page, 'roll')).toHaveCount(0)
    await expect(dice(page)).toHaveCount(0)
    const enemy = page.locator('#enemy')
    await expect(enemy).toBeVisible()
    await expect(enemy).toHaveAttribute('data-enemy', 'present')

    // And the well says what it is, before the fight is entered.
    await expect(page.locator('#well')).toContainText('The Gnawing')
  })
})

test.describe('the first fight', () => {
  test('states both of its numbers before anything is committed', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)
    await act(page, 'fight').click()

    // Public, exact, and up before ROLL exists as a press.
    await expect(page.locator('#enemy-hp')).toHaveAttribute('data-hp', '70')
    await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', '3')
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('the hand is as wide as the pile allows, and there is nothing to set', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)
    await act(page, 'fight').click()

    // Six bones, face-down: no value has been decided and no width was asked
    // for. The stepper is gone — not hidden, not disabled, gone.
    await expect(dice(page)).toHaveCount(6)
    await expect(page.locator('#width')).toHaveCount(0)
    await expect(act(page, 'width-up')).toHaveCount(0)
    for (const value of await valuesOf(dice(page))) expect(Number.isNaN(value)).toBe(true)
  })

  test('a thin pile throws what it has, and no more', async ({ page }) => {
    await boot(page, '?room=hollow&bones=2&mode=combat')
    await expect(dice(page)).toHaveCount(2)
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('ROLL puts real faces on the table', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat')
    await act(page, 'roll').click()

    const faces = await valuesOf(dice(page))
    expect(faces).toHaveLength(6)
    for (const value of faces) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
    }
    // And it cannot happen twice: what is offered now is the reroll.
    await expect(act(page, 'roll')).toHaveCount(0)
    await expect(act(page, 'reroll')).toBeVisible()
  })

  test('the scorecard offers exactly what the dice make', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&dice=5,5,5,2,2,4')
    const offered = await scoresOnOffer(page)
    expect([...offered].sort()).toEqual(['full-house', 'pair', 'triple', 'two-pair'].sort())
    await expect(page.locator('[data-hand="crap"]')).toHaveCount(0)
  })

  test('scoring one hand spends only that hand', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&dice=5,5,5,2,2,4')
    await page.locator('.score-entry[data-hand="two-pair"]').click()

    const combat = (await state(page)).run!.combat!
    expect(combat.usedHands).toEqual(['two-pair'])
    // Full House and Triple both matched, and both survive for later.
    await expect(page.locator('.score-entry[data-hand="two-pair"]')).toHaveAttribute(
      'data-used',
      'yes',
    )
    await expect(page.locator('.score-entry[data-hand="full-house"]')).toHaveAttribute(
      'data-used',
      'no',
    )
  })

  test('an attack settles the whole exchange in one press', async ({ page }) => {
    await boot(page, '?room=deep&bones=30&rolls=3&dice=6,6,6,4,4,3')
    await page.locator('.score-entry[data-hand="full-house"]').click()

    // 29 × 2 = 58 off a 120, and five bones for leaving it standing.
    await expect(page.locator('#enemy-hp')).toHaveAttribute('data-hp', '62')
    expect(await livingBones(page)).toBe(25)

    // And the next attack is already waiting, with a clear table.
    const combat = (await state(page)).run!.combat!
    expect(combat.round).toBe(2)
    expect(combat.rollsUsed).toBe(0)
    await expect(dice(page)).toHaveCount(6)
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('the first fight can be won by pressing buttons', async ({ page }) => {
    test.slow()
    await boot(page)
    await toFirstFight(page)
    expect(await fightItOut(page)).toBe('won')
    if ((await screenName(page)) === 'reward') {
      await expect(page.locator('#offers .offer').first()).toBeVisible()
    }
  })
})
