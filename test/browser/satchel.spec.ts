/**
 * The satchel: the Vial, and the bay it sits in.
 *
 * One consumable for this baseline, and the bay it lives in never moves. What
 * matters here is that it cannot be spent by accident, that it is not offered
 * when it would be wasted, and that drinking it visibly widens the attack —
 * which is the whole reason a Vial is worth carrying now.
 */

import { expect, test } from '@playwright/test'

import { act, boot, dice, livingBones, state, tappable } from './helpers.js'

test.describe('the Vial', () => {
  test('shows its count and restores exactly five', async ({ page }) => {
    await boot(page, '?room=fork&bones=12&vials=2')
    await expect(page.locator('.satchel-slot[data-slot-id="vial"] .satchel-count')).toHaveText('2')
    expect(await livingBones(page)).toBe(12)

    await act(page, 'drink').click()
    expect(await livingBones(page)).toBe(17)
    expect((await state(page)).run!.vials).toBe(1)
    await expect(page.locator('#say')).toContainText('5 bones back')
  })

  test('gives only the remainder at the ceiling, and is absent when full', async ({ page }) => {
    await boot(page, '?room=fork&bones=28&vials=1')
    await act(page, 'drink').click()
    expect(await livingBones(page)).toBe(30)
    // Full: there is nothing a Vial could do, so it is not offered — which is
    // also what stops one being wasted. The bay is still there, and pressing
    // it explains what would go in it.
    await boot(page, '?room=fork&bones=30&vials=1')
    await expect(act(page, 'drink')).toHaveCount(0)
    await expect(page.locator('.satchel-slot[data-slot-id="vial"]')).toBeVisible()
    await expect(act(page, 'inspect-reward')).toBeVisible()
  })

  test('widens the attack it is about to throw', async ({ page }) => {
    // The pile is the hand, so five bones back is up to five more dice. That
    // is a better consumable than it used to be, not a worse one.
    await boot(page, '?room=hollow&bones=3&vials=1&mode=combat')
    await expect(dice(page)).toHaveCount(3)

    await act(page, 'drink').click()
    expect(await livingBones(page)).toBe(8)
    await expect(dice(page)).toHaveCount(6)
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('is not offered while a death is being watched', async ({ page }) => {
    await boot(page, '?room=hollow&bones=12&vials=1&dying=1', { motion: true })
    // The fight is parked on the picture of the thing stopping; there is no
    // move to make, so none is offered.
    if ((await state(page)).run?.combat?.defeated) {
      await expect(act(page, 'drink')).toHaveCount(0)
    }
  })
})

test.describe('the bays', () => {
  test('the Vial never moves, whatever is carried', async ({ page }) => {
    const order = async (): Promise<(string | undefined)[]> =>
      page
        .locator('.satchel-slot')
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset['slotId']))

    await boot(page, '?room=fork')
    expect(await order()).toEqual(['vial'])
    await boot(page, '?room=fork&vials=3')
    expect(await order()).toEqual(['vial'])
  })

  test('the Pouch is gone, and nothing slid over to hide the gap', async ({ page }) => {
    // The painted plate has three recesses and one control. The other two are
    // left showing rather than the Vial being re-centred: the recesses are
    // part of the picture, and moving a control would be the tray pretending
    // its own geometry changed.
    await boot(page, '?room=fork&vials=1')
    await expect(act(page, 'pouch')).toHaveCount(0)
    await expect(page.locator('#pouch-rows')).toHaveCount(0)
    const box = await page.locator('.satchel-slot[data-slot-id="vial"]').boundingBox()
    const tray = await page.locator('#tray').boundingBox()
    // The first of the three bays, which sits left of the plate's midpoint
    // between the well and the right edge.
    expect(box!.x).toBeGreaterThan(tray!.x + tray!.width * 0.7)
    expect(box!.x).toBeLessThan(tray!.x + tray!.width * 0.82)
  })

  test('is a real, tappable button', async ({ page }) => {
    await boot(page, '?room=fork&vials=1')
    for (const slot of await page.locator('.satchel-slot').all()) {
      await tappable(page, slot)
    }
  })
})
