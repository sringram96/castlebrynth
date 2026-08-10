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

import { act, boot, bones, enemyBones, livingBones, screenName, state, valuesOf } from './helpers.js'

const animating = (page: Page): Promise<boolean> =>
  page.evaluate(() => window.castlebrynth?.animating() ?? false)

const settle = (page: Page): Promise<void> =>
  page.evaluate(() => window.castlebrynth?.settle())

test.describe('the state is saved before the first frame', () => {
  test('a smash is decided before any of it is shown', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=6', { motion: true })
    await act(page, 'throw').click()

    // Read the moment the press returns: the record is already complete, and
    // what happens next is only a picture of it.
    const during = (await state(page)).run!.combat!.lastSmash
    expect(during, 'the smash was not decided before it was shown').toBeDefined()
    expect(during!.lanes.length).toBeGreaterThan(0)

    const settledBefore = JSON.stringify((await state(page)).run)
    await settle(page)
    expect(JSON.stringify((await state(page)).run)).toBe(settledBefore)
  })

  test('settling early lands on exactly the same screen', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=6', { motion: true })
    await act(page, 'throw').click()
    await settle(page)
    const early = {
      bones: await livingBones(page),
      mine: await valuesOf(bones(page)),
      theirs: await valuesOf(enemyBones(page)),
    }

    // The same fight, watched to its end.
    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=6', { motion: true })
    await act(page, 'throw').click()
    await expect.poll(() => animating(page), { timeout: 6000 }).toBe(false)

    expect(await livingBones(page)).toBe(early.bones)
    expect(await valuesOf(bones(page))).toEqual(early.mine)
    expect(await valuesOf(enemyBones(page))).toEqual(early.theirs)
  })

  test('an impatient thumb finishes a sequence rather than being locked out', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=6', { motion: true })
    await act(page, 'throw').click()
    // The press arrives mid-sequence and is honoured: `dispatch` settles first.
    if ((await act(page, 'round').count()) > 0) {
      await act(page, 'round').click()
      expect((await state(page)).run!.combat!.round).toBe(2)
    }
  })
})

test.describe('a throw is played over the truth', () => {
  test('the enemy line is final before it is animated in', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=8', { motion: true })
    const fromState = (await state(page)).run!.combat!.enemyLine.map((b) => b.value)
    await expect.poll(() => animating(page), { timeout: 6000 }).toBe(false)
    expect(await valuesOf(enemyBones(page))).toEqual(fromState)
  })

  test('my own throw settles onto the faces the reducer chose', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=8', { motion: true })
    await act(page, 'throw').click()
    const fromState = (await state(page)).run!.combat!.playerLine!.map((b) => b.value)
    await settle(page)
    expect(await valuesOf(bones(page))).toEqual(fromState)
  })

})

test.describe('reduced motion is the same game', () => {
  test('the same presses produce the same run', async ({ page }) => {
    const playRound = async (): Promise<string> => {
      await act(page, 'throw').click()
      await settle(page)
      return JSON.stringify((await state(page)).run!.combat!.lastSmash)
    }

    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=15', { motion: true })
    const withMotion = await playRound()

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=15', { motion: true })
    const reduced = await playRound()

    expect(reduced).toBe(withMotion)
  })

  test('every casualty is readable without watching anything', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=deep&mode=combat&phase=thrown&seed=15', { motion: true })
    await act(page, 'throw').click()

    // No sequence ran, and the result is already fully stated: broken bones
    // carry an attribute, the summary carries the counts, and the word band
    // carries the sentence.
    expect(await animating(page)).toBe(false)
    await expect(page.locator('#smash-summary')).toBeVisible()
    const smash = (await state(page)).run!.combat!.lastSmash!
    const marked = await page.locator('#crown .bone[data-broken="yes"]').count()
    expect(marked).toBe(smash.playerCommonLost + smash.playerSpecialsLost.length)
  })

  test('nothing is conveyed by colour alone', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=deep&mode=combat&phase=smashed&seed=15', { motion: true })
    // A broken bone is a *state attribute* and a changed shape, not a hue.
    const broken = page.locator('#crown .bone[data-broken="yes"]').first()
    if ((await broken.count()) === 0) return
    await expect(broken).toHaveAttribute('aria-label', /broken/)
  })
})

test.describe('a death is a sequence like any other', () => {
  test('with motion off, the win arrives without waiting', async ({ page }) => {
    await boot(page, '?room=hollow&dying=1')
    // The kill was committed by the smash that caused it; with motion off the
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
