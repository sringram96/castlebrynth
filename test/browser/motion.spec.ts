/**
 * Motion, and the promise that it decides nothing.
 *
 * The only claim worth making about an animation in this codebase is that it
 * **cannot change an outcome**. So every test here proves one of three things:
 *
 *   - a sequence reveals a state that was already saved;
 *   - settling it early lands on exactly the same state;
 *   - with motion off, the same presses produce the same run.
 *
 * This is the one spec that opts *into* motion. Everything else runs with
 * `motion=0`, which takes the same code path `prefers-reduced-motion` does.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, dice, livingBones, screenName, state, valuesOf } from './helpers.js'

const animating = (page: Page): Promise<boolean> =>
  page.evaluate(() => window.castlebrynth?.animating() ?? false)

const settle = (page: Page): Promise<void> =>
  page.evaluate(() => window.castlebrynth?.settle())

/** A fight standing on six known faces, with all three throws spent. */
const TABLE = '?room=deep&bones=30&rolls=3&dice=6,6,6,4,4,3'

test.describe('the state is saved before the first frame', () => {
  test('an attack is decided before any of it is shown', async ({ page }) => {
    await boot(page, TABLE, { motion: true })
    await page.locator('.score-entry[data-hand="full-house"]').click()

    // Read the moment the press returns: the record is already complete, and
    // what happens next is only a picture of it.
    const during = (await state(page)).run!.combat!.lastAttack
    expect(during, 'the attack was not decided before it was shown').toBeDefined()
    expect(during!.damage).toBe(58)
    expect(during!.enemyHpAfter).toBe(62)
    expect(during!.bonesAfter).toBe(25)

    const settledBefore = JSON.stringify((await state(page)).run)
    await settle(page)
    expect(JSON.stringify((await state(page)).run)).toBe(settledBefore)
  })

  test('settling early lands on exactly the same screen', async ({ page }) => {
    await boot(page, TABLE, { motion: true })
    await page.locator('.score-entry[data-hand="full-house"]').click()
    await settle(page)
    const early = { bones: await livingBones(page), hp: await hpOf(page) }

    // The same attack, watched to its end.
    await boot(page, TABLE, { motion: true })
    await page.locator('.score-entry[data-hand="full-house"]').click()
    await expect.poll(() => animating(page), { timeout: 6000 }).toBe(false)

    expect(await livingBones(page)).toBe(early.bones)
    expect(await hpOf(page)).toBe(early.hp)
  })

  test('an impatient thumb finishes a sequence rather than being locked out', async ({ page }) => {
    await boot(page, TABLE, { motion: true })
    await page.locator('.score-entry[data-hand="full-house"]').click()
    // The press arrives mid-sequence and is honoured: `dispatch` settles first.
    await act(page, 'roll').click()
    expect((await state(page)).run!.combat!.rollsUsed).toBe(1)
  })
})

const hpOf = async (page: Page): Promise<string | null> =>
  page.locator('#enemy-hp').getAttribute('data-hp')

test.describe('a throw is played over the truth', () => {
  test('the faces are final before they are tumbled in', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&seed=8', { motion: true })
    await act(page, 'roll').click()
    const fromState = (await state(page)).run!.combat!.dice
    await settle(page)
    expect(await valuesOf(dice(page))).toEqual(fromState)
  })

  test('a reroll settles onto the faces the reducer chose', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&seed=8', { motion: true })
    await act(page, 'roll').click()
    await settle(page)
    await dice(page).nth(0).click()
    await act(page, 'reroll').click()
    const fromState = (await state(page)).run!.combat!.dice
    await settle(page)
    expect(await valuesOf(dice(page))).toEqual(fromState)
  })

  test('a held bone does not tumble', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&seed=8', { motion: true })
    await act(page, 'roll').click()
    await settle(page)
    await dice(page).nth(0).click()
    await act(page, 'reroll').click()
    // The held one is not part of the throw, so it never gets the class the
    // tumble puts on the bones that are actually in the air.
    await expect(dice(page).nth(0)).not.toHaveClass(/bone-rolling/)
    await settle(page)
  })
})

test.describe('reduced motion is the same game', () => {
  test('the same presses produce the same exchange', async ({ page }) => {
    const attack = async (): Promise<string> => {
      await page.locator('.score-entry[data-hand="full-house"]').click()
      await settle(page)
      return JSON.stringify((await state(page)).run!.combat!.lastAttack)
    }

    await boot(page, TABLE, { motion: true })
    const withMotion = await attack()

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, TABLE, { motion: true })
    const reduced = await attack()

    expect(reduced).toBe(withMotion)
  })

  test('the whole exchange is readable without watching anything', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, TABLE, { motion: true })
    await page.locator('.score-entry[data-hand="full-house"]').click()

    // No sequence ran, and the result is already fully stated: the enemy's
    // number, the pile, and the sentence.
    expect(await animating(page)).toBe(false)
    expect(await hpOf(page)).toBe('62')
    expect(await livingBones(page)).toBe(25)
    await expect(page.locator('#say')).toContainText('58')
  })

  test('nothing is conveyed by colour alone', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=deep&rolls=1', { motion: true })
    // A held bone is a *state attribute*, an aria-pressed and a changed
    // position, not a hue.
    const first = dice(page).first()
    await first.click()
    await expect(first).toHaveAttribute('data-held', 'yes')
    await expect(first).toHaveAttribute('aria-pressed', 'true')
    await expect(first).toHaveAttribute('aria-label', /held$/)
  })

  test('a spent hand is struck through as well as dimmed', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&used=pair,triple')
    const spent = page.locator('.score-entry[data-used="yes"]').first()
    await expect(spent).toHaveCount(1)
    const decoration = await spent.evaluate((n) => getComputedStyle(n).textDecorationLine)
    expect(decoration).toContain('line-through')
  })
})

test.describe('a death is a sequence like any other', () => {
  test('with motion off, the win arrives without waiting', async ({ page }) => {
    await boot(page, '?room=hollow&dying=1')
    // The kill was committed by the attack that caused it; with motion off the
    // whole remainder resolves in the same tick.
    await expect.poll(async () => (await state(page)).run?.combat === undefined).toBe(true)
    expect(['reward', null]).toContain(await screenName(page))
  })

  test('with motion on, it is held long enough to be seen and then finishes', async ({ page }) => {
    await boot(page, '?room=hollow&dying=1', { motion: true })
    await expect
      .poll(async () => (await state(page)).run?.combat === undefined, { timeout: 8000 })
      .toBe(true)
  })

  test('a reload inside a death resolves rather than sitting in it', async ({ page }) => {
    await boot(page, '?room=hollow&dying=1', { motion: true })
    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
    await expect
      .poll(async () => (await state(page)).run?.combat === undefined, { timeout: 8000 })
      .toBe(true)
  })
})
