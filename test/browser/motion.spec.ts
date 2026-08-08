/**
 * The beats, with motion on.
 *
 * Every other spec runs with `motion=0`, because they are about what the game
 * does. This one is about the several hundred milliseconds between a press and
 * its result, which is where a dice game lives — and about the promise that
 * none of it is load-bearing: the last block turns motion off at the media
 * level and asserts the same run reaches the same numbers immediately.
 *
 * ## Why there is a recorder
 *
 * The obvious way to test a beat is to poll for it from Node. That tests the
 * poller: `.die-rolling` lives for 300 ms and a hit number is on screen for
 * 470 ms before the next turn takes over, so on a loaded runner a poll can
 * arrive after the thing it was looking for has gone and fail a build that is
 * perfectly correct. `watch()` installs a MutationObserver *before* the press
 * and reports what actually happened, with timings — so these assertions are
 * about the sequence rather than about how fast the test could look.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, dice, state } from './helpers.js'

const withMotion = (page: Page, fixture: string) => boot(page, fixture, { motion: true })

/** Nothing is in the air any more. */
const thrown = (page: Page) => expect(page.locator('#crown .die-rolling')).toHaveCount(0, { timeout: 4000 })

interface Seen {
  /** Slots that were in the air at any point, and slots that confirmed. */
  readonly rolled: string[]
  readonly scored: string[]
  /** Relics whose bay pulsed, by id. */
  readonly relics: string[]
  readonly markFired: boolean
  readonly orbDelta: string | null
  /** Milliseconds from the press, or null if it never happened. */
  readonly hitAt: number | null
  readonly struckAt: number | null
  readonly screenAt: number | null
}

/** Start watching. Everything asserted below happens after this call. */
async function watch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const started = performance.now()
    const since = () => Math.round(performance.now() - started)
    const rolled = new Set<string>()
    const scored = new Set<string>()
    const relics = new Set<string>()
    const seen = {
      rolled,
      scored,
      relics,
      markFired: false,
      orbDelta: null as string | null,
      hitAt: null as number | null,
      struckAt: null as number | null,
      screenAt: null as number | null,
    }
    ;(window as unknown as { __seen: unknown }).__seen = seen

    const sweep = (): void => {
      for (const n of document.querySelectorAll('#crown .die-rolling')) {
        rolled.add((n as HTMLElement).dataset['slot'] ?? '?')
      }
      for (const n of document.querySelectorAll('#crown .die-scoring')) {
        scored.add((n as HTMLElement).dataset['slot'] ?? '?')
      }
      for (const n of document.querySelectorAll('#relics .relic-triggered')) {
        relics.add((n as HTMLElement).dataset['relicId'] ?? '?')
      }
      if (document.querySelector('#crown .mark-fired')) seen.markFired = true
      const delta = document.querySelector('.orb-delta')
      if (delta && seen.orbDelta === null) seen.orbDelta = delta.textContent
      if (document.querySelector('#fx .hit-number') && seen.hitAt === null) seen.hitAt = since()
      if (document.querySelector('#world.struck') && seen.struckAt === null) seen.struckAt = since()
      const screen = document.getElementById('screen')
      if (screen && !screen.hidden && seen.screenAt === null) seen.screenAt = since()
    }

    sweep()
    new MutationObserver(sweep).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'data-screen', 'hidden'],
    })
  })
}

/** What the observer saw, once the longest sequence has had time to finish. */
async function seen(page: Page): Promise<Seen> {
  await page.waitForTimeout(1500)
  return page.evaluate(() => {
    const s = (window as unknown as { __seen: Record<string, unknown> }).__seen
    return {
      ...s,
      rolled: [...(s['rolled'] as Set<string>)].sort(),
      scored: [...(s['scored'] as Set<string>)].sort(),
      relics: [...(s['relics'] as Set<string>)],
    } as unknown as Seen
  })
}

test.describe('a throw is six objects landing', () => {
  test('ROLL puts every die in the air, and settles all six onto its faces', async ({ page }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    await watch(page)
    await act(page, 'roll').click()
    const saw = await seen(page)

    expect(saw.rolled, 'not every die was thrown').toEqual(['0', '1', '2', '3', '4', '5'])

    // And when it is over, the flicker has settled onto the reducer's face —
    // every time. A die still showing a cosmetic value would be an animation
    // that had decided an outcome.
    await thrown(page)
    const shown = await dice(page).evaluateAll((nodes) =>
      nodes.map((n) => ({
        button: (n as HTMLElement).dataset['value'],
        face: n.querySelector('.die-face')?.getAttribute('data-value'),
      })),
    )
    expect(shown).toHaveLength(6)
    for (const die of shown) expect(die.face).toBe(die.button)

    const now = await state(page)
    expect(now.run!.combat!.roll.map((d) => String((d as { value: number }).value))).toEqual(
      shown.map((d) => d.button),
    )
  })

  test('REROLL throws only what was not held', async ({ page }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()
    await thrown(page)

    await dice(page).nth(0).click()
    await dice(page).nth(2).click()

    await watch(page)
    await act(page, 'reroll').click()
    const saw = await seen(page)

    // The whole decision of the phase is visible only if the held dice stay
    // still. If all six tumble, holding two of them looked like nothing.
    expect(saw.rolled, 'a held die was thrown, or an unheld one was not').toEqual(['1', '3', '4', '5'])

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
    await thrown(page)
    await dice(page).nth(0).click()
    await dice(page).nth(1).click()

    const before = await state(page)
    await watch(page)
    await act(page, 'score').click()
    const saw = await seen(page)

    // The dice you chose say so, the blow lands with a number, and the answer
    // is a beat of its own *after* it — which is the order of the sentence a
    // player should be able to say out loud when it is over.
    expect(saw.scored, 'the chosen dice did not confirm').toEqual(['0', '1'])
    expect(saw.hitAt, 'the blow never landed').not.toBeNull()
    expect(saw.struckAt, 'the enemy never answered').not.toBeNull()
    expect(saw.struckAt!, 'the answer came before the blow').toBeGreaterThan(saw.hitAt!)

    // And the state was settled before any of it: the save cannot disagree.
    const during = await state(page)
    expect(during.run!.hp).toBeLessThan(before.run!.hp)

    await expect(act(page, 'roll')).toBeVisible()
    await expect(page.locator('#crown .die-scoring')).toHaveCount(0)
  })

  test('holds the scored hand on screen instead of erasing it', async ({ page }) => {
    await withMotion(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()
    await thrown(page)
    await dice(page).nth(0).click()
    await act(page, 'score').click()

    // The reducer has already produced the next turn — empty table, intent
    // phase — but the crown still holds the hand that was scored.
    const settled = await state(page)
    expect(settled.run!.combat!.phase).toBe('intent')
    expect(settled.run!.combat!.roll).toHaveLength(0)
    await expect(page.locator('#score')).toBeVisible()
    await expect(dice(page)).toHaveCount(6)
  })

  test('pulses the relic that contributed, and fires the red face that cost', async ({ page }) => {
    // Six Pushers and a Blood Thimble on a seed whose throw contains a red 1,
    // so both the relic and the face have something to say about the score.
    await withMotion(
      page,
      '?seed=2&room=hollow&mode=combat&dice=pusher,pusher,pusher,pusher,pusher,pusher&relics=thimble',
    )
    await act(page, 'roll').click()
    await thrown(page)

    const red = page.locator('.die:has(.mark-hurt)').first()
    await expect(red).toBeVisible()
    await red.click()
    await expect(page.locator('#well')).toContainText('Lose 7 HP')
    await expect(page.locator('#well')).toContainText('Blood Thimble +8')

    await watch(page)
    await act(page, 'score').click()
    const saw = await seen(page)

    expect(saw.relics, 'the relic that contributed did not pulse').toEqual(['thimble'])
    expect(saw.markFired, 'the red face never fired on its own die').toBe(true)
    expect(saw.orbDelta, 'the health it cost never showed on the orb').toBe('−7')
  })

  test('lets the killing blow land before the reward screen takes over', async ({ page }) => {
    await withMotion(page, '?room=hollow&enemyHp=1&seed=1')
    await act(page, 'roll').click()
    await thrown(page)
    await dice(page).nth(0).click()

    await watch(page)
    await act(page, 'score').click()
    const saw = await seen(page)

    expect(saw.hitAt, 'the killing blow never landed').not.toBeNull()
    expect(saw.screenAt, 'the reward screen never arrived').not.toBeNull()
    // A terminal screen that arrives before its own blow is the fight ending
    // without the player seeing how.
    expect(saw.screenAt!, 'the reward screen took over before the blow').toBeGreaterThan(saw.hitAt!)
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'reward')
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
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      true,
    )
    await act(page, 'roll').click()
    // No transition at all: the next state is on screen in the same tick.
    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(false)
    await expect(page.locator('#crown .die-rolling')).toHaveCount(0)

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
    await withMotion(
      page,
      '?seed=1&room=hollow&mode=combat&dice=leech,leech,leech,leech,leech,leech',
    )
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
