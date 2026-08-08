/**
 * MENU is the menu, and inspect is a close look at one thing.
 *
 * The old label taught the wrong verb: the bottom-left bed said INSPECT and
 * opened the entire loadout. These are the assertions that keep the two apart
 * — and that keep every control that looks pressable answering a press, which
 * is where an idle die used to fail silently.
 */

import { expect, test } from '@playwright/test'

import { act, boot, dice, state, tappable } from './helpers.js'

const overlay = (page: import('@playwright/test').Page) => page.locator('#overlay')

test.describe('MENU', () => {
  test('is offered in every tray mode, and closes again', async ({ page }) => {
    for (const [where, fixture, presses] of [
      ['exploring', '?room=entry', []],
      ['a fight before its roll', '?room=hollow&mode=combat', []],
      ['a fight after its roll', '?room=hollow&mode=combat', ['[data-act=roll]']],
    ] as const) {
      await boot(page, fixture)
      for (const press of presses) await page.locator(press).click()

      await tappable(page, act(page, 'menu'))
      await act(page, 'menu').click()
      await expect(overlay(page), `MENU did not open ${where}`).toBeVisible()
      await expect(overlay(page)).toHaveAttribute('data-overlay', 'menu')

      await act(page, 'close').click()
      await expect(overlay(page), `MENU did not close ${where}`).toBeHidden()
    }
  })

  test('holds the whole loadout, the relics, and the scoring reference', async ({ page }) => {
    await boot(page, '?room=fork&dice=pusher,leech&relics=thimble,plate')
    await act(page, 'menu').click()

    await expect(overlay(page)).toContainText('DICE')
    await expect(overlay(page)).toContainText('Pusher Bone')
    await expect(overlay(page)).toContainText('Leech Bone')
    await expect(overlay(page)).toContainText('Plain Bone')
    await expect(overlay(page)).toContainText('RELICS')
    await expect(overlay(page)).toContainText('Blood Thimble')
    await expect(overlay(page)).toContainText('Rusted Plate')
    await expect(overlay(page)).toContainText('SCORING')
    await expect(overlay(page).locator('.ladder-row')).toHaveCount(7)
  })

  test('moves no state at all', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()
    await dice(page).nth(0).click()

    const before = await state(page)
    await act(page, 'menu').click()
    await act(page, 'close').click()
    expect(await state(page)).toEqual(before)
  })

  test('is the only global overlay: no control anywhere says INSPECT', async ({ page }) => {
    for (const fixture of ['?room=entry', '?room=fork&relics=wax', '?room=hollow&mode=combat']) {
      await boot(page, fixture)
      // The word survives only as a contextual action on one named thing.
      const global = await page.locator('[data-act="inspect"]').count()
      expect(global, `${fixture} still offers a global INSPECT`).toBe(0)
      const labels = await page
        .locator('#tray button')
        .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''))
      expect(labels.join(' ')).not.toContain('INSPECT')
    }
  })
})

test.describe('inspecting one thing', () => {
  test('a crown die out of a throw opens that die, and changes nothing', async ({ page }) => {
    await boot(page, '?room=fork&dice=pusher')
    const before = await state(page)

    const die = dice(page).nth(0)
    await expect(die).toHaveAttribute('data-act', 'inspect-die')
    await expect(die).toHaveAttribute('aria-label', 'Inspect Pusher Bone')
    await tappable(page, die)
    await die.click()

    await expect(overlay(page)).toBeVisible()
    await expect(overlay(page)).toHaveAttribute('data-overlay', 'die')
    await expect(overlay(page)).toContainText('Pusher Bone')
    // Its whole truth: six faces, the rule, and what it helps with.
    await expect(overlay(page).locator('.card-faces .die-face')).toHaveCount(6)
    await expect(overlay(page)).toContainText('HELPS WITH ·')

    expect(await state(page), 'looking at a die moved the game').toEqual(before)
    await act(page, 'close').click()
    await expect(overlay(page)).toBeHidden()
  })

  test('a crown die inside a fight still chooses', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()

    const die = dice(page).nth(0)
    await expect(die).toHaveAttribute('data-act', 'die')
    await die.click()
    await expect(die).toHaveAttribute('data-selected', 'yes')
    await die.click()
    await expect(die).toHaveAttribute('data-selected', 'no')
  })

  test('a fight before its roll inspects rather than pressing for nothing', async ({ page }) => {
    // There is nothing to choose yet, so a tap that dispatched SELECT would be
    // discarded by the reducer — a control that looks live and answers nothing.
    await boot(page, '?room=hollow&mode=combat&dice=leech')
    const before = await state(page)
    await dice(page).nth(0).click()
    await expect(overlay(page)).toHaveAttribute('data-overlay', 'die')
    expect(await state(page)).toEqual(before)
  })

  test('a relic in its bay opens that relic, and changes nothing', async ({ page }) => {
    await boot(page, '?room=fork&relics=thimble')
    const before = await state(page)

    const slot = page.locator('#relics .relic[data-relic-id="thimble"]')
    await expect(slot).toHaveAttribute('aria-label', 'Inspect Blood Thimble')
    await tappable(page, slot)
    await slot.click()

    await expect(overlay(page)).toHaveAttribute('data-overlay', 'relic')
    await expect(overlay(page)).toContainText('Blood Thimble')
    await expect(overlay(page)).toContainText('adds +8 damage')
    expect(await state(page)).toEqual(before)
  })

  test('a thing in the room is described as inspecting that thing', async ({ page }) => {
    await boot(page, '?room=entry')
    const hit = page.locator('#hits [data-detail="far-door"]')
    await expect(hit).toHaveAttribute('aria-label', 'Inspect the far door')
    await hit.click()
    // A room detail speaks in the word band; it does not open the menu.
    await expect(page.locator('#say')).toContainText('The hall keeps going')
    await expect(overlay(page)).toBeHidden()
  })
})
