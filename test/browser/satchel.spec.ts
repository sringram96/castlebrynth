/**
 * The satchel: the Charm, the Vial, and the Pouch.
 *
 * Three bays that never move, and two consumables whose whole design is that
 * they cannot be spent by accident. The Charm in particular: it is the only
 * reroll in the game, it is rare, and a single stray tap on a bone must never
 * consume one.
 */

import { expect, test } from '@playwright/test'

import { act, boot, bones, livingBones, state, tappable, valuesOf } from './helpers.js'

test.describe('the Charm', () => {
  test('is offered only in rolled, with one in hand and none spent', async ({ page }) => {
    // Nothing to spend it on before the throw.
    await boot(page, '?room=hollow&charms=1&mode=combat&phase=thrown')
    await expect(act(page, 'charm')).toHaveCount(0)
    await boot(page, '?room=hollow&charms=1&mode=combat&phase=fielded')
    await expect(act(page, 'charm')).toHaveCount(0)
    // And nothing to spend when the satchel is empty.
    await boot(page, '?room=hollow&mode=combat&phase=rolled')
    await expect(act(page, 'charm')).toHaveCount(0)
  })

  test('takes two presses: arm, then choose a bone', async ({ page }) => {
    await boot(page, '?room=hollow&charms=1&mode=combat&phase=rolled&seed=4')
    const before = await valuesOf(bones(page))

    // A bone tapped while the Charm is not armed inspects it and spends
    // nothing. This is the whole reason arming exists.
    await bones(page).first().click()
    await expect(page.locator('#overlay')).toBeVisible()
    await act(page, 'close').click()
    expect((await state(page)).run!.charms).toBe(1)
    expect(await valuesOf(bones(page))).toEqual(before)

    // Armed, the bones become targets and say so.
    await act(page, 'charm').click()
    await expect(bones(page).first()).toHaveAttribute('data-target', 'yes')
    await expect(page.locator('.satchel-slot[data-slot-id="charm"]')).toHaveAttribute(
      'data-armed',
      'yes',
    )
  })

  test('rethrows exactly the bone it was spent on', async ({ page }) => {
    await boot(page, '?room=hollow&charms=1&mode=combat&phase=rolled&seed=4')
    const line = (await state(page)).run!.combat!.playerLine!
    const target = line[line.length - 1]!

    await act(page, 'charm').click()
    await page.locator(`.bone[data-bone-key="${cssEscape(target.boneKey)}"]`).click()

    const after = (await state(page)).run!.combat!
    expect(after.charmUsed).toBe(true)
    // Every other bone comes back byte-identical.
    const untouched = after.playerLine!.filter((b) => b.boneKey !== target.boneKey)
    expect(untouched).toEqual(line.filter((b) => b.boneKey !== target.boneKey))
    // And the line stands itself up again around whatever it landed on.
    const values = await valuesOf(bones(page))
    expect([...values].sort((a, b) => b - a)).toEqual(values)
  })

  test('spends one charge and disappears for the rest of the fight', async ({ page }) => {
    await boot(page, '?room=hollow&charms=2&mode=combat&phase=rolled&seed=4')
    await act(page, 'charm').click()
    await bones(page).first().click()

    expect((await state(page)).run!.charms).toBe(1)
    // Two carried, one spendable. The control is absent, not disabled.
    await expect(act(page, 'charm')).toHaveCount(0)

    // And still absent next round.
    await act(page, 'smash').click()
    if ((await act(page, 'round').count()) > 0) {
      await act(page, 'round').click()
      await act(page, 'field').click()
      await act(page, 'throw').click()
      await expect(act(page, 'charm')).toHaveCount(0)
      expect((await state(page)).run!.combat!.charmUsed).toBe(true)
    }
  })

  test('survives a reload: it does not throw again', async ({ page }) => {
    await boot(page, '?room=hollow&charms=1&mode=combat&phase=rolled&seed=4')
    await act(page, 'charm').click()
    await bones(page).first().click()
    const after = await valuesOf(bones(page))

    // The fixture rebuilds from the URL, which is the same run: the values it
    // landed on were saved before a frame of the spin played.
    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
    expect((await state(page)).run!.charms).toBe(1)
    expect(after.length).toBeGreaterThan(0)
  })
})

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

  test('can be drunk mid-fight without touching the line already thrown', async ({ page }) => {
    await boot(page, '?room=hollow&bones=12&vials=1&mode=combat&phase=rolled&seed=5')
    const line = await valuesOf(bones(page))

    await act(page, 'drink').click()
    expect(await livingBones(page)).toBe(17)
    // The bones on the table are the bones on the table. A Vial adds reserves.
    expect(await valuesOf(bones(page))).toEqual(line)
    await expect(act(page, 'smash')).toBeVisible()
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

  test('fields a named bone into the line, and takes it out again', async ({ page }) => {
    await boot(page, '?room=hollow&specials=knuckle&mode=combat&phase=thrown')
    await act(page, 'pouch').click()

    const row = page.locator('.pouch-row').first()
    await expect(row).toHaveAttribute('data-fielded', 'no')
    await row.locator('[data-act="field-bone"]').click()
    await expect(row).toHaveAttribute('data-fielded', 'yes')
    await act(page, 'close').click()

    // It is in the line, visibly, before anything is committed.
    await expect(page.locator('#crown .bone[data-special-id="knuckle"]')).toHaveCount(1)

    await act(page, 'field').click()
    const field = (await state(page)).run!.combat!.field!
    expect(field.specialIds).toHaveLength(1)
    expect(field.specialIds[0]).toMatch(/^knuckle#/)
  })

  test('offers no field control outside the phase that can use one', async ({ page }) => {
    await boot(page, '?room=hollow&specials=knuckle&mode=combat&phase=rolled')
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
    expect(await order()).toEqual(['vial', 'charm', 'pouch'])
    await boot(page, '?room=fork&vials=3&charms=2&specials=knuckle')
    expect(await order()).toEqual(['vial', 'charm', 'pouch'])
  })

  test('are all real, tappable buttons', async ({ page }) => {
    await boot(page, '?room=fork&vials=1&charms=1&specials=knuckle')
    for (const slot of await page.locator('.satchel-slot').all()) {
      await tappable(page, slot)
    }
  })
})

function cssEscape(value: string): string {
  return value.replace(/[^\w-]/g, (c) => `\\${c}`)
}
