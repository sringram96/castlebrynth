/**
 * The Warden, and the one sentence it adds.
 *
 * *Ties hold.* It reverses an expectation the player has been taught for two
 * fights, so the two things that matter are that it is **printed before
 * anything can be committed** and that it does exactly what it says.
 */

import { expect, test } from '@playwright/test'

import { act, boot, bones, enemyBones, livingBones, state, valuesOf } from './helpers.js'

test.describe('before anything is committed', () => {
  test('says its rule out loud, in text, on the first frame of the fight', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat&phase=thrown')
    const rule = page.locator('#enemy-rule')
    await expect(rule).toBeVisible()
    await expect(rule).toHaveText('TIES HOLD.')
    await expect(rule).toHaveAttribute('aria-label', /HOLDS TIES/)
    // And it is up while the player still has the decision to make.
    await expect(act(page, 'field')).toBeVisible()
  })

  test('says it in the room, before the fight is even entered', async ({ page }) => {
    await boot(page, '?room=gate')
    await expect(page.locator('#well')).toContainText('HOLDS TIES')
  })

  test('says it in MENU, where the global card does not', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat&phase=thrown')
    await act(page, 'menu').click()
    await expect(page.locator('#rule-encounter')).toContainText('HOLDS TIES')
    // The four global lines still say ties kill both, because against
    // everything else they do.
    await expect(page.locator('#rules')).toContainText('Ties kill both.')
  })

  test('nothing else in the slice holds ties', async ({ page }) => {
    // The Gnawing has no rule at all — it is the base war, and a badge saying
    // so would be a rule about not having one.
    await boot(page, '?room=hollow&mode=combat&phase=thrown')
    await expect(page.locator('#enemy-rule')).toHaveCount(0)

    // The Marrow has one, and it is not this one.
    await boot(page, '?room=deep&mode=combat&phase=thrown')
    await expect(page.locator('#enemy-rule')).toHaveText('ITS RULE')
    await expect(page.locator('#enemy-rule')).not.toHaveAttribute('aria-label', /tie/i)
  })
})

test.describe('an equal lane', () => {
  test('breaks my bone and leaves its own standing', async ({ page }) => {
    // Search the seeds for a fight whose first lane is a genuine tie. Nothing
    // is injected: every one of these is a real opening round.
    for (let seed = 1; seed <= 60; seed++) {
      await boot(page, `?room=gate&mode=combat&phase=rolled&seed=${seed}`)
      const mine = await valuesOf(bones(page))
      const theirs = await valuesOf(enemyBones(page))
      const lane = mine.findIndex((value, i) => value === theirs[i])
      if (lane < 0) continue

      const before = await livingBones(page)
      await act(page, 'smash').click()

      // My bone is broken. Its bone is not.
      await expect(bones(page).nth(lane)).toHaveAttribute('data-broken', 'yes')
      await expect(enemyBones(page).nth(lane)).not.toHaveAttribute('data-broken', 'yes')
      expect(await livingBones(page)).toBeLessThan(before)

      const smash = (await state(page)).run!.combat!.lastSmash!
      expect(smash.heldTies).toBeGreaterThan(0)
      return
    }
    expect(null, 'no seed in 60 produced a tie against the Warden').not.toBeNull()
  })

  test('is the only thing its rule changes', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat&phase=rolled&seed=3')
    const mine = await valuesOf(bones(page))
    const theirs = await valuesOf(enemyBones(page))
    await act(page, 'smash').click()

    const paired = Math.min(mine.length, theirs.length)
    for (let lane = 0; lane < paired; lane++) {
      const myBroken = (await bones(page).nth(lane).getAttribute('data-broken')) === 'yes'
      const itsBroken = (await enemyBones(page).nth(lane).getAttribute('data-broken')) === 'yes'
      if (mine[lane]! > theirs[lane]!) {
        expect(itsBroken, `lane ${lane}: higher did not kill lower`).toBe(true)
        expect(myBroken, `lane ${lane}: the winner broke`).toBe(false)
      } else if (mine[lane]! < theirs[lane]!) {
        expect(myBroken, `lane ${lane}: the loser lived`).toBe(true)
      } else {
        // The rule, and only here.
        expect(myBroken, `lane ${lane}: a held tie spared me`).toBe(true)
        expect(itsBroken, `lane ${lane}: a held tie broke its bone`).toBe(false)
      }
    }
  })
})

test.describe('the body', () => {
  test('stands in the plate its army says, and gets worse as it goes', async ({ page }) => {
    await boot(page, '?room=gate&mode=combat&phase=thrown')
    const full = await page.locator('#enemy').getAttribute('src')
    expect(full).toContain('warden-idle-full')

    await boot(page, '?room=gate&enemyBones=4&mode=combat&phase=thrown')
    await expect(page.locator('#enemy')).toHaveAttribute('src', /warden-idle-mid/)

    await boot(page, '?room=gate&enemyBones=2&mode=combat&phase=thrown')
    await expect(page.locator('#enemy')).toHaveAttribute('src', /warden-idle-low/)
  })

  test('is one registered family: a pose swap moves nothing', async ({ page }) => {
    const boxOf = async (): Promise<{ x: number; y: number; width: number; height: number }> => {
      const box = await page.locator('#enemy').boundingBox()
      return box!
    }
    await boot(page, '?room=gate&mode=combat&phase=thrown')
    const first = await boxOf()
    await boot(page, '?room=gate&enemyBones=2&mode=combat&phase=thrown')
    const later = await boxOf()
    expect(later.width).toBeCloseTo(first.width, 0)
    expect(later.height).toBeCloseTo(first.height, 0)
    expect(later.x).toBeCloseTo(first.x, 0)
  })
})

test.describe('reduced motion lands on the same fight', () => {
  test('a held tie reads identically with motion off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=gate&mode=combat&phase=rolled&seed=3', { motion: true })
    const mine = await valuesOf(bones(page))
    const theirs = await valuesOf(enemyBones(page))
    await act(page, 'smash').click()

    // No waiting, no sequence: the settled truth is on screen immediately, and
    // every casualty is readable as an attribute rather than as a movement.
    const paired = Math.min(mine.length, theirs.length)
    for (let lane = 0; lane < paired; lane++) {
      if (mine[lane] !== theirs[lane]) continue
      await expect(bones(page).nth(lane)).toHaveAttribute('data-broken', 'yes')
      await expect(enemyBones(page).nth(lane)).not.toHaveAttribute('data-broken', 'yes')
    }
    expect(await livingBones(page)).toBeLessThanOrEqual(30)
  })
})
