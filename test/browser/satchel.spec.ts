/**
 * The satchel: the Vial and the Pouch.
 *
 * Three bays that never move, and two consumables whose whole design is that
 * they cannot be spent by accident. The Vial in particular: it is the only
 * reroll in the game, it is rare, and a single stray tap on a bone must never
 * consume one.
 */

import { expect, test } from '@playwright/test'

import { act, boot, bones, livingBones, state, tappable, valuesOf } from './helpers.js'

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
    // also what stops one being wasted.
    await boot(page, '?room=fork&bones=30&vials=1')
    await expect(act(page, 'drink')).toHaveCount(0)
    await expect(page.locator('.satchel-slot[data-slot-id="vial"]')).toBeVisible()
  })

  test('can be drunk in the modifier step, and widens the line it will throw', async ({ page }) => {
    // Before the throw is the only place a Vial is drunk now, and that makes
    // it a better consumable rather than a worse one: five bones back is up to
    // five more lanes in the throw the player is about to make.
    await boot(page, '?room=hollow&bones=3&vials=1&mode=combat&phase=thrown')
    await expect(bones(page)).toHaveCount(3)

    await act(page, 'drink').click()
    expect(await livingBones(page)).toBe(8)
    await expect(bones(page)).toHaveCount(6)
    await expect(act(page, 'throw')).toBeVisible()
  })

  test('is not offered while a smash is being read', async ({ page }) => {
    await boot(page, '?room=hollow&bones=12&vials=1&mode=combat&phase=smashed&seed=5')
    await expect(act(page, 'drink')).toHaveCount(0)
  })
})

test.describe('the Pouch', () => {
  test('lists every named bone and its faces, and no common ones', async ({ page }) => {
    await boot(page, '?room=fork&specials=cinderbone,knuckle')
    await act(page, 'pouch').click()

    const rows = page.locator('#pouch-rows .pouch-row')
    await expect(rows).toHaveCount(2)
    await expect(page.locator('#overlay')).toContainText('Cinderbone')
    await expect(page.locator('#overlay')).toContainText('3, 4, 5, 6, 7, 7.')
    await expect(page.locator('#overlay')).toContainText('4, 5, 6, 6, 7, 8.')
    // Six faces each, and nothing about the twenty-eight anonymous bones.
    await expect(rows.first().locator('.bone-face')).toHaveCount(6)
    await expect(page.locator('#overlay')).not.toContainText('Common bones')
  })

  test('keeps two of the same type apart', async ({ page }) => {
    await boot(page, '?room=fork&specials=knuckle,knuckle')
    await act(page, 'pouch').click()
    const rows = page.locator('#pouch-rows .pouch-row')
    await expect(rows).toHaveCount(2)
    const ids = await rows.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).dataset['instanceId']),
    )
    expect(new Set(ids).size).toBe(2)
  })

  test('holds a named bone back, and puts it in the line again', async ({ page }) => {
    // Every named bone is standing by default — a bone you are carrying is a
    // bone you are fighting with — so the decision the pouch offers is the
    // withdrawal, and this walks it in both directions.
    // The keeper, so the fight is still standing after the throw and there is
    // a committed field left to read.
    await boot(page, '?room=gate&specials=knuckle&mode=combat&phase=thrown')
    await expect(page.locator('#crown .bone[data-special-id="knuckle"]')).toHaveCount(1)

    await act(page, 'pouch').click()
    const row = page.locator('.pouch-row').first()
    await expect(row).toHaveAttribute('data-fielded', 'yes')
    await row.locator('[data-act="withdraw-bone"]').click()
    await expect(row).toHaveAttribute('data-fielded', 'no')
    await act(page, 'close').click()
    await expect(page.locator('#crown .bone[data-special-id="knuckle"]')).toHaveCount(0)

    await act(page, 'pouch').click()
    await row.locator('[data-act="field-bone"]').click()
    await expect(row).toHaveAttribute('data-fielded', 'yes')
    await act(page, 'close').click()
    await expect(page.locator('#crown .bone[data-special-id="knuckle"]')).toHaveCount(1)

    await act(page, 'throw').click()
    const field = (await state(page)).run!.combat!.field!
    expect(field.specialIds).toHaveLength(1)
    expect(field.specialIds[0]).toMatch(/^knuckle#/)
  })

  test('offers no field control outside the phase that can use one', async ({ page }) => {
    await boot(page, '?room=hollow&specials=knuckle&mode=combat&phase=smashed')
    await act(page, 'pouch').click()
    await expect(page.locator('[data-act="field-bone"]')).toHaveCount(0)
    await expect(page.locator('#overlay')).toContainText('Knuckle')
  })
})

test.describe('the three bays', () => {
  test('never move, whatever is carried', async ({ page }) => {
    const order = async (): Promise<(string | undefined)[]> =>
      page
        .locator('.satchel-slot')
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset['slotId']))

    await boot(page, '?room=fork')
    expect(await order()).toEqual(['vial', 'pouch'])
    await boot(page, '?room=fork&vials=3&specials=knuckle')
    expect(await order()).toEqual(['vial', 'pouch'])
  })

  test('are all real, tappable buttons', async ({ page }) => {
    await boot(page, '?room=fork&vials=1&specials=knuckle')
    for (const slot of await page.locator('.satchel-slot').all()) {
      await tappable(page, slot)
    }
  })
})

function cssEscape(value: string): string {
  return value.replace(/[^\w-]/g, (c) => `\\${c}`)
}
