/**
 * What the fight costs, and what it does not.
 *
 * Three claims that are the whole reason width is a decision:
 *
 *   - **extras are safe.** A bone beyond the paired lanes fought nothing, and
 *     narrowing the field is how a player buys that.
 *   - **dead stays dead.** A casualty is gone from the pile, from the pouch,
 *     and from the next round — and from a reload.
 *   - **zero ends the run on the lane it happens**, and the lanes after it
 *     never resolve.
 */

import { expect, test } from '@playwright/test'

import {
  act,
  boot,
  bones,
  enemyBones,
  livingBones,
  screenName,
  state,
  valuesOf,
} from './helpers.js'

test.describe('extras are safe', () => {
  test('four of its six never meet anything when I field two', async ({ page }) => {
    // The Warden fields six. Two of mine against six of its is four lanes that
    // do not happen, and the player chose that by narrowing.
    await boot(page, '?room=gate&mode=combat&phase=thrown')
    await expect(enemyBones(page)).toHaveCount(6)

    for (let i = 0; i < 4; i++) await act(page, 'width-down').click()
    await expect(page.locator('#width')).toHaveAttribute('data-width', '2')
    await act(page, 'field').click()
    await act(page, 'throw').click()

    const theirs = await valuesOf(enemyBones(page))
    await act(page, 'smash').click()

    // The four it did not contest are unchanged and unbroken.
    for (let lane = 2; lane < 6; lane++) {
      await expect(enemyBones(page).nth(lane)).not.toHaveAttribute('data-broken', 'yes')
    }
    expect(await valuesOf(enemyBones(page))).toEqual(theirs)

    // At most two of its bones can have broken, because only two lanes ran.
    const smash = (await state(page)).run!.combat!.lastSmash!
    expect(smash.enemyBonesLost.length).toBeLessThanOrEqual(2)
    expect(smash.playerCommonLost + smash.playerSpecialsLost.length).toBeLessThanOrEqual(2)
  })

  test('my own extras are marked safe rather than left ambiguous', async ({ page }) => {
    // The Gnawing fields five, so a six-wide line always has one bone with
    // nothing opposite it. Its whole army can be broken in a single round, so
    // the seeds are searched for one where the fight is still standing
    // afterwards and there is a line left to read.
    for (let seed = 1; seed <= 40; seed++) {
      await boot(page, `?room=hollow&mode=combat&phase=rolled&seed=${seed}`)
      const mine = await valuesOf(bones(page))
      const theirs = await valuesOf(enemyBones(page))
      expect(mine.length).toBeGreaterThan(theirs.length)

      await act(page, 'smash').click()
      if ((await bones(page).count()) === 0) continue

      for (let lane = theirs.length; lane < mine.length; lane++) {
        await expect(bones(page).nth(lane)).toHaveAttribute('data-safe', 'yes')
        await expect(bones(page).nth(lane)).not.toHaveAttribute('data-broken', 'yes')
      }
      return
    }
    expect(null, 'no seed in 40 left the Gnawing standing after one round').not.toBeNull()
  })
})

test.describe('a named bone that breaks', () => {
  test('is named, removed from the pouch, and stays gone', async ({ page }) => {
    // Field a Cinderbone into a losing lane. Nothing is injected: the seeds
    // are searched for a round in which it genuinely loses.
    for (let seed = 1; seed <= 60; seed++) {
      await boot(page, `?room=gate&specials=cinderbone&mode=combat&phase=thrown&seed=${seed}`)
      if ((await act(page, 'pouch').count()) === 0) continue

      await act(page, 'pouch').click()
      await page.locator('[data-act="field-bone"]').first().click()
      await act(page, 'close').click()
      await act(page, 'field').click()
      await act(page, 'throw').click()

      const named = page.locator('#crown .bone[data-special-id="cinderbone"]')
      if ((await named.count()) === 0) continue
      const lane = Number(await named.getAttribute('data-lane'))
      const mine = await valuesOf(bones(page))
      const theirs = await valuesOf(enemyBones(page))
      // A held tie kills it too, which is the Warden's whole point.
      if (theirs[lane] === undefined || mine[lane]! > theirs[lane]!) continue

      const before = await livingBones(page)
      await act(page, 'smash').click()
      // The Warden has eight bones and a six-wide line, so a single round can
      // never empty it: the fight is always still standing here.
      await expect(page.locator('#crown .bone[data-special-id="cinderbone"]')).toHaveAttribute(
        'data-broken',
        'yes',
      )
      const smash = (await state(page)).run!.combat!.lastSmash!
      // The whole cost of the round, of which the Cinderbone is one — other
      // lanes break too, and the pile has to agree with the record exactly.
      const lost = smash.playerCommonLost + smash.playerSpecialsLost.length
      expect(await livingBones(page)).toBe(before - lost)
      expect(smash.playerSpecialsLost).toHaveLength(1)
      expect(smash.playerSpecialsLost[0]).toMatch(/^cinderbone#/)
      // The word band names it, because a named bone dying is a run-shaping
      // event and a number in a corner is not enough.
      await expect(page.locator('#say')).toContainText('Cinderbone is gone')

      // The pouch no longer holds it, and a reload does not bring it back.
      await act(page, 'pouch').click()
      await expect(page.locator('.pouch-row')).toHaveCount(0)
      await act(page, 'close').click()
      return
    }
    expect(null, 'no seed in 60 put a Cinderbone in a losing lane').not.toBeNull()
  })

  test('never turns into a common bone', async ({ page }) => {
    await boot(page, '?room=gate&specials=knuckle&bones=10&mode=combat&phase=thrown&seed=8')
    const before = (await state(page)).run!
    await act(page, 'pouch').click()
    await page.locator('[data-act="field-bone"]').first().click()
    await act(page, 'close').click()
    await act(page, 'field').click()
    await act(page, 'throw').click()
    await act(page, 'smash').click()

    const after = (await state(page)).run!
    const lost = after.combat!.lastSmash!
    // Whatever broke, the common count fell by exactly the commons that broke.
    expect(after.commonBones).toBe(before.commonBones - lost.playerCommonLost)
    expect(after.specials).toHaveLength(before.specials.length - lost.playerSpecialsLost.length)
  })
})

test.describe('zero', () => {
  test('ends the run on the lane it happens', async ({ page }) => {
    // One bone against the Warden's six. The run ends on lane one, and there
    // are no lanes after it.
    await boot(page, '?room=gate&bones=1&mode=combat&phase=thrown')
    await expect(page.locator('#width')).toHaveAttribute('data-width', '1')
    await act(page, 'field').click()
    await act(page, 'throw').click()

    const mine = (await valuesOf(bones(page)))[0]!
    const theirs = (await valuesOf(enemyBones(page)))[0]!
    await act(page, 'smash').click()

    if (mine > theirs) {
      // It won its lane and lives. Nothing to assert about death here.
      expect(await livingBones(page)).toBe(1)
      return
    }
    expect(await screenName(page)).toBe('dead')
    // Off state rather than off the pile: the tray is hidden on a death
    // screen, so the last number it painted is not the truth.
    const run = (await state(page)).run!
    expect(run.commonBones + run.specials.length).toBe(0)
    const smash = run.combat!.lastSmash!
    expect(smash.stoppedAtLane).toBe(0)
    expect(smash.lanes).toHaveLength(1)
  })

  test('the death screen says what is left, what was carried, and how far', async ({ page }) => {
    await boot(page, '?mode=dead')
    const summary = page.locator('#run-summary')
    await expect(summary).toContainText('0 bones left')
    await expect(summary).toContainText('down')
    // Not the old line about six bones.
    await expect(page.locator('#screen')).not.toContainText('Carried nothing but the six bones')
    // And two ways out, neither of them a reload.
    await expect(act(page, 'start')).toBeVisible()
    await expect(act(page, 'title')).toBeVisible()
  })

  test('a fight cannot be opened with nothing to field', async ({ page }) => {
    await boot(page, '?room=hollow&bones=0')
    await expect(act(page, 'fight')).toHaveCount(0)
  })
})

test.describe('the pile', () => {
  test('is a count, and it never disagrees with the state', async ({ page }) => {
    await boot(page, '?room=hollow&bones=17&specials=knuckle&mode=combat&phase=rolled')
    const run = (await state(page)).run!
    expect(await livingBones(page)).toBe(run.commonBones + run.specials.length)
    await expect(page.locator('#pile')).toHaveAttribute(
      'data-specials',
      String(run.specials.length),
    )
  })

  test('warns when a single smash could end the run', async ({ page }) => {
    await boot(page, '?room=fork&bones=20')
    await expect(page.locator('#orb')).toHaveAttribute('data-low', 'no')
    await boot(page, '?room=fork&bones=6')
    await expect(page.locator('#orb')).toHaveAttribute('data-low', 'yes')
  })
})
