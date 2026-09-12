/**
 * What a fight costs, and what the cost does to the next attack.
 *
 * Three claims, and they are the whole shape of the new combat:
 *
 *   - **the number is public.** The enemy's health and the bones it will break
 *     are on screen before anything is committed, and neither is ever a
 *     surprise.
 *   - **bones are health, and only health.** Damage counts down and does
 *     nothing else: the hand is six dice at thirty bones and six dice at one,
 *     and every shape stays reachable however wounded the run is. What a wound
 *     costs is exchanges. See docs/COMBAT.md § The hand.
 *   - **zero ends the run**, and never goes below it.
 */

import { expect, test } from '@playwright/test'

import {
  act,
  boot,
  dice,
  livingBones,
  screenName,
  scoresOnOffer,
  state,
} from './helpers.js'

test.describe('the enemy states its numbers before anything is committed', () => {
  test('shows what is left of it and what it breaks', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat')
    const hp = page.locator('#enemy-hp')
    await expect(hp).toHaveAttribute('data-hp', '120')
    await expect(hp).toHaveAttribute('data-max', '120')
    await expect(hp).toContainText('120 / 120')

    const hits = page.locator('#enemy-hits')
    await expect(hits).toBeVisible()
    await expect(hits).toHaveAttribute('data-damage', '5')
    await expect(hits).toContainText('5')
  })

  test('never hides the damage until it lands', async ({ page }) => {
    // Before the first throw, mid-attack, and after: the figure is up the
    // whole time. The entire tactical contract is knowing it.
    for (const fixture of ['?room=gate&mode=combat', '?room=gate&rolls=1', '?room=gate&rolls=3']) {
      await boot(page, fixture)
      await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', '8')
    }
  })

  test('takes exactly what it says, and no more', async ({ page }) => {
    await boot(page, '?room=deep&bones=30&rolls=3&dice=1,1,2,3,4,6')
    expect(await livingBones(page)).toBe(30)
    // Pair is the only shape here, and the Marrow survives it comfortably.
    await page.locator('.score-entry[data-hand="pair"]').click()
    expect(await livingBones(page)).toBe(25)
    const attack = (await state(page)).run!.combat!.lastAttack!
    expect(attack.retaliation).toBe(5)
    expect(attack.bonesBefore - attack.bonesAfter).toBe(5)
  })
})

test.describe('bones are health, and only health', () => {
  test('a healthy run throws six', async ({ page }) => {
    await boot(page, '?room=hollow&bones=30&mode=combat')
    await expect(dice(page)).toHaveCount(6)
  })

  test('a wounded run throws six as well', async ({ page }) => {
    // The repealed rule. `min(6, bones)` is gone: what a wound costs is
    // exchanges, not dice. See docs/COMBAT.md § The hand.
    for (const bones of [6, 5, 4, 2, 1]) {
      await boot(page, `?room=hollow&bones=${bones}&mode=combat`)
      await expect(dice(page), `${bones} bones`).toHaveCount(6)
    }
  })

  test('keeps every shape reachable at one bone', async ({ page }) => {
    // A single bone left and a Full House still on the card. Nothing about the
    // pile decides what the scorecard can offer any more.
    await boot(page, '?room=hollow&bones=1&rolls=1&dice=4,4,4,4,2,2')
    const offered = await scoresOnOffer(page)
    expect(offered).toContain('four-kind')
    expect(offered).toContain('full-house')
    expect(offered).not.toContain('five-kind')
    expect(offered).not.toContain('six-kind')
    // And these dice make no straight, so it is not on the card at all — which
    // is the scorecard's rule, not the pile's.
    await expect(page.locator('.score-entry[data-hand="straight"]')).toHaveCount(0)
  })

  test('marks the pile low, because the next exchange could end it', async ({ page }) => {
    // Six is no longer the line the dice game crosses — it crosses none. It is
    // still the line where an exchange with the Warden ends the run, so the
    // orb still says so.
    await boot(page, '?room=fork&bones=20')
    await expect(page.locator('#orb')).toHaveAttribute('data-low', 'no')
    await boot(page, '?room=fork&bones=6')
    await expect(page.locator('#orb')).toHaveAttribute('data-low', 'yes')
  })
})

test.describe('zero', () => {
  test('ends the run, and never goes below it', async ({ page }) => {
    // Five bones against the Warden's eight. Whatever the hand does, the
    // answer takes everything — unless the attack finishes the thing first,
    // which it cannot from full health.
    await boot(page, '?room=gate&bones=5&rolls=3')
    const offered = await scoresOnOffer(page)
    await page.locator(`.score-entry[data-hand="${offered[0]}"]`).click()

    expect(await screenName(page)).toBe('dead')
    // Off state rather than off the pile: the tray is hidden on a death
    // screen, so the last number it painted is not the truth.
    const run = (await state(page)).run!
    expect(run.bones).toBe(0)
    expect(run.combat!.lastAttack!.bonesAfter).toBe(0)
    expect(run.cause).toContain('The Warden')
  })

  test('the death screen says what is left, what was carried, and how far', async ({ page }) => {
    await boot(page, '?mode=dead')
    const summary = page.locator('#run-summary')
    await expect(summary).toContainText('0 bones left')
    await expect(summary).toContainText('down')
    // And two ways out, neither of them a reload.
    await expect(act(page, 'start')).toBeVisible()
    await expect(act(page, 'title')).toBeVisible()
  })

  test('a fight cannot be opened with nothing to throw', async ({ page }) => {
    await boot(page, '?room=hollow&bones=0')
    await expect(act(page, 'fight')).toHaveCount(0)
  })
})

test.describe('a killing attack takes no answer', () => {
  test('however thin the pile is', async ({ page }) => {
    // Three bones left and a thing on its last legs. The Gnawing breaks three,
    // so an answer would end the run — and there is no answer, because the
    // kill happened first.
    await boot(page, '?room=hollow&bones=3&enemyHp=3&rolls=3')
    const offered = await scoresOnOffer(page)
    await page.locator(`.score-entry[data-hand="${offered[0]}"]`).click()

    await expect
      .poll(async () => (await state(page)).run?.combat === undefined)
      .toBe(true)
    expect(await screenName(page)).not.toBe('dead')
    expect((await state(page)).run!.bones).toBe(3)
  })
})

test.describe('the pile', () => {
  test('is a count, and it never disagrees with the state', async ({ page }) => {
    await boot(page, '?room=hollow&bones=17&mode=combat')
    expect(await livingBones(page)).toBe((await state(page)).run!.bones)
    // The two-part pile is gone with the named bones it existed for.
    const pile = page.locator('#pile')
    await expect(pile).not.toHaveAttribute('data-common', /.*/)
    await expect(pile).not.toHaveAttribute('data-specials', /.*/)
  })
})
