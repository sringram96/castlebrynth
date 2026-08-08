/**
 * The beats, with motion on.
 *
 * Every other spec runs with `motion=0`, because they are about what the game
 * does. This one is about the several hundred milliseconds between a press and
 * its result, which is where a dice game lives — and about the promise that
 * none of it is load-bearing: the last block turns motion off at the media
 * level and asserts the same run reaches the same numbers immediately.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, dice, screenName, state } from './helpers.js'

const withMotion = (page: Page, fixture: string) => boot(page, fixture, { motion: true })

/** The slots currently mid-throw. */
const rolling = (page: Page) => page.locator('#crown .die-rolling')

test.describe('a throw is six objects landing', () => {
  test('ROLL puts every die in the air, and settles all six onto its faces', async ({ page }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()

    // Staggered, so they are not all in the air at the same instant — but by
    // the end every one of the six has been.
    await expect(rolling(page)).not.toHaveCount(0)
    await expect(rolling(page)).toHaveCount(0, { timeout: 3000 })

    const shown = await dice(page).evaluateAll((nodes) =>
      nodes.map((n) => ({
        button: (n as HTMLElement).dataset['value'],
        face: n.querySelector('.die-face')?.getAttribute('data-value'),
      })),
    )
    expect(shown).toHaveLength(6)
    // The flicker settles onto the reducer's face, every time. A die still
    // showing a cosmetic value would be an animation deciding an outcome.
    for (const die of shown) expect(die.face).toBe(die.button)
    const now = await state(page)
    expect(now.run!.combat!.roll.map((d) => String((d as { value: number }).value))).toEqual(
      shown.map((d) => d.button),
    )
  })

  test('REROLL throws only what was not held', async ({ page }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()
    await expect(rolling(page)).toHaveCount(0, { timeout: 3000 })

    await dice(page).nth(0).click()
    await dice(page).nth(2).click()
    await act(page, 'reroll').click()

    // The whole decision of the phase is visible only if the held dice stay
    // still. If all six tumble, holding two of them looked like nothing.
    const airborne = await page
      .locator('#crown .die-rolling')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset['slot']))
    expect(airborne).not.toContain('0')
    expect(airborne).not.toContain('2')
    expect(airborne.length).toBeGreaterThan(0)

    await expect(dice(page).nth(0)).toHaveAttribute('data-selected', 'yes')
    await expect(dice(page).nth(2)).toHaveAttribute('data-selected', 'yes')
  })
})

test.describe('a score is a chain of events', () => {
  test('confirms the hand, lands the blow, and only then lets the enemy answer', async ({
    page,
  }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()
    await expect(rolling(page)).toHaveCount(0, { timeout: 3000 })
    await dice(page).nth(0).click()
    await dice(page).nth(1).click()

    const before = await state(page)
    await act(page, 'score').click()

    // First: the dice you chose say so.
    await expect(page.locator('#crown .die-scoring')).toHaveCount(2)
    // Then the blow lands, on the enemy, with a number.
    await expect(page.locator('#fx .hit-number')).toBeVisible({ timeout: 3000 })
    // And the answer is its own beat, after it.
    await expect(page.locator('#world.struck')).toBeVisible({ timeout: 3000 })

    // The state was settled before any of that: the save cannot disagree.
    const during = await state(page)
    expect(during.run!.hp).toBeLessThan(before.run!.hp)

    await expect(act(page, 'roll')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('#crown .die-scoring')).toHaveCount(0)
  })

  test('holds the scored hand on screen instead of erasing it', async ({ page }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()
    await expect(rolling(page)).toHaveCount(0, { timeout: 3000 })
    await dice(page).nth(0).click()
    await act(page, 'score').click()

    // The reducer has already produced the next turn — empty table, intent
    // phase — but the crown still holds the hand that was scored.
    const settledState = await state(page)
    expect(settledState.run!.combat!.phase).toBe('intent')
    expect(settledState.run!.combat!.roll).toHaveLength(0)
    await expect(page.locator('#score')).toBeVisible()
    await expect(dice(page)).toHaveCount(6)
  })

  test('pulses the relic that contributed, and fires the red face that cost', async ({ page }) => {
    // Six Pushers and a Blood Thimble on a seed whose throw contains a red 1,
    // so both the relic and the face have something to say about the score.
    await withMotion(page, '?seed=2&room=hollow&mode=combat&dice=pusher,pusher,pusher,pusher,pusher,pusher&relics=thimble')
    await act(page, 'roll').click()
    await expect(rolling(page)).toHaveCount(0, { timeout: 3000 })

    const red = page.locator('.die:has(.mark-hurt)').first()
    await expect(red).toBeVisible()
    await red.click()
    await expect(page.locator('#well')).toContainText('Lose 7 HP')
    await expect(page.locator('#well')).toContainText('Blood Thimble +8')

    await act(page, 'score').click()
    await expect(page.locator('#relics .relic-triggered')).toHaveCount(1)
    await expect(page.locator('#crown .mark-fired')).not.toHaveCount(0)
    await expect(page.locator('.orb-delta-hurt')).toBeVisible()
  })

  test('lets the killing blow land before the reward screen takes over', async ({ page }) => {
    await withMotion(page, '?room=hollow&enemyHp=1&seed=1')
    await act(page, 'roll').click()
    await expect(rolling(page)).toHaveCount(0, { timeout: 3000 })
    await dice(page).nth(0).click()
    await act(page, 'score').click()

    // The hit is on screen while the screen still is not.
    await expect(page.locator('#fx .hit-number')).toBeVisible({ timeout: 3000 })
    expect(await screenName(page), 'the reward screen arrived before the blow').toBeNull()
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'reward', { timeout: 3000 })
  })

  test('never locks input: a press during a transition finishes it', async ({ page }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await act(page, 'score').click()
    // Straight back in, mid-sequence. The press lands rather than being eaten.
    await act(page, 'roll').click({ timeout: 4000 })
    const now = await state(page)
    expect(now.run!.combat!.phase).toBe('rolled')
    expect(now.run!.combat!.roll).toHaveLength(6)
  })
})

test.describe('reduced motion is the same game, immediately', () => {
  // Set on the page rather than the context: the project spreads a device
  // descriptor into `use`, and a describe-level `reducedMotion` does not
  // survive it — the emulation silently did not apply.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('reaches every number without waiting for anything', async ({ page }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
    await act(page, 'roll').click()
    // No transition at all: the next state is on screen in the same tick.
    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(false)
    await expect(rolling(page)).toHaveCount(0)

    await dice(page).nth(0).click()
    await dice(page).nth(1).click()
    const damage = Number(await page.locator('#score .term-damage').textContent())
    const before = await state(page)
    await act(page, 'score').click()

    const after = await state(page)
    expect(after.run!.combat!.enemyHp).toBe(before.run!.combat!.enemyHp - damage)
    expect(after.run!.hp).toBe(before.run!.hp - 6)
    // And the interface is already the next turn — nothing is held back.
    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(false)
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('says everything in text, not only in movement', async ({ page }) => {
    await withMotion(page, '?seed=1&room=hollow&mode=combat&dice=leech,leech,leech,leech,leech,leech')
    await act(page, 'roll').click()
    const green = page.locator('.die:has(.mark-heal)').first()
    await expect(green).toBeVisible()
    await green.click()
    // The consequence is a sentence, whether or not anything moved.
    await expect(page.locator('#well')).toContainText('Heal 4 HP')
    await act(page, 'score').click()
    await expect(page.locator('#say')).toContainText('Green face: heal 4 HP')
  })
})
