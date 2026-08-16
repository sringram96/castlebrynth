/**
 * The Warden, and the one number it adds.
 *
 * *It breaks eight.* That is the whole of the exam: eight bones an exchange
 * against a hundred and eighty of health, so a run that cannot make big shapes
 * quickly runs out of shapes to make. The two things that matter are that the
 * figure is **printed before anything can be committed** and that it does
 * exactly what it says.
 */

import { expect, test } from '@playwright/test'

import { act, boot, dice, livingBones, scoresOnOffer, state } from './helpers.js'

test.describe('before anything is committed', () => {
  test('says its rule out loud, in text, on the first frame of the fight', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat')
    const rule = page.locator('#enemy-rule')
    await expect(rule).toBeVisible()
    await expect(rule).toHaveText('ITS RULE')
    await expect(rule).toHaveAttribute('aria-label', /BREAKS EIGHT/)
    // And the number itself is in the bar, not only in the rule.
    await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', '8')
    // Both are up while the player still has a decision to make.
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('says it in the room, before the fight is even entered', async ({ page }) => {
    await boot(page, '?room=gate')
    await expect(page.locator('#well')).toContainText('BREAKS EIGHT')
  })

  test('says it in MENU, where the global card does not', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat')
    await act(page, 'menu').click()
    await expect(page.locator('#rule-encounter')).toContainText('BREAKS EIGHT')
    // The global lines are about the dice, and say nothing about any one fight.
    await expect(page.locator('#rules')).not.toContainText('EIGHT')
  })

  test('is the heaviest thing in the slice, and says so in numbers', async ({ page }) => {
    const figures = async (): Promise<[string | null, string | null]> => [
      await page.locator('#enemy-hp').getAttribute('data-max'),
      await page.locator('#enemy-hits').getAttribute('data-damage'),
    ]
    await boot(page, '?room=hollow&mode=combat')
    expect(await figures()).toEqual(['70', '3'])
    await boot(page, '?room=deep&mode=combat')
    expect(await figures()).toEqual(['120', '5'])
    await boot(page, '?room=gate&mode=combat')
    expect(await figures()).toEqual(['180', '8'])
  })
})

test.describe('eight bones an exchange', () => {
  test('takes exactly eight for leaving it standing', async ({ page }) => {
    await boot(page, '?room=gate&bones=30&rolls=3&dice=1,1,2,3,4,6')
    expect(await livingBones(page)).toBe(30)
    await page.locator('.score-entry[data-hand="pair"]').click()
    expect(await livingBones(page)).toBe(22)
    expect((await state(page)).run!.combat!.lastAttack!.retaliation).toBe(8)
  })

  test('compounds: two exchanges narrow the attack itself', async ({ page }) => {
    // Twenty bones in, sixteen broken over two exchanges, four left — and at
    // four the hand is four dice wide and the big shapes are out of reach.
    await boot(page, '?room=gate&bones=20&rolls=3&dice=1,1,2,3,4,6')
    await page.locator('.score-entry[data-hand="pair"]').click()
    await expect(dice(page)).toHaveCount(6)

    await boot(page, '?room=gate&bones=4&mode=combat')
    await expect(dice(page)).toHaveCount(4)
    await act(page, 'roll').click()
    const offered = await scoresOnOffer(page)
    expect(offered).not.toContain('full-house')
    expect(offered).not.toContain('straight')
  })

  test('does not answer an attack that finishes it', async ({ page }) => {
    // Eight bones and a Warden on its last legs. Eight is exactly what it
    // breaks, so a single answer would end the run — and there is none.
    await boot(page, '?room=gate&bones=8&enemyHp=5&rolls=3')
    const offered = await scoresOnOffer(page)
    await page.locator(`.score-entry[data-hand="${offered[0]}"]`).click()
    await expect.poll(async () => (await state(page)).run?.combat === undefined).toBe(true)
    expect((await state(page)).run!.bones).toBe(8)
  })
})

test.describe('the body', () => {
  test('stands in the plate its health says, and gets worse as it goes', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat')
    await expect(page.locator('#enemy')).toHaveAttribute('src', /warden-idle-full/)

    await boot(page, '?room=gate&enemyHp=90&mode=combat')
    await expect(page.locator('#enemy')).toHaveAttribute('src', /warden-idle-mid/)

    await boot(page, '?room=gate&enemyHp=20&mode=combat')
    await expect(page.locator('#enemy')).toHaveAttribute('src', /warden-idle-low/)
  })

  test('is one registered family: a pose swap moves nothing', async ({ page }) => {
    const boxOf = async (): Promise<{ x: number; y: number; width: number; height: number }> => {
      const box = await page.locator('#enemy').boundingBox()
      return box!
    }
    await boot(page, '?room=gate&mode=combat')
    const first = await boxOf()
    await boot(page, '?room=gate&enemyHp=20&mode=combat')
    const later = await boxOf()
    expect(later.width).toBeCloseTo(first.width, 0)
    expect(later.height).toBeCloseTo(first.height, 0)
    expect(later.x).toBeCloseTo(first.x, 0)
  })
})

test.describe('reduced motion lands on the same fight', () => {
  test('the exchange reads identically with motion off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=gate&bones=30&rolls=3&dice=6,6,6,4,4,3', { motion: true })
    await page.locator('.score-entry[data-hand="full-house"]').click()

    // No waiting, no sequence: the settled truth is on screen immediately.
    const attack = (await state(page)).run!.combat!.lastAttack!
    expect(attack.damage).toBe(58)
    expect(await livingBones(page)).toBe(22)
    await expect(page.locator('#enemy-hp')).toHaveAttribute('data-hp', '122')
  })
})
