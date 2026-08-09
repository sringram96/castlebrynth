/**
 * The encounter, on a phone.
 *
 * `test/unit/approach.test.ts` proves the rule. This proves the only thing
 * that matters to the player, which is that the picture and the rule are the
 * same thing: the hall empties out one score at a time, the change is
 * something you can see without a meter, and what is on screen after every
 * transition can be rebuilt from the save alone.
 *
 * The recorder is here for the same reason it is in `motion.spec.ts`: the
 * bright frame lives for 130 ms and the gather for 70, so a poll from Node
 * tests the poller. `watch()` is installed before the press.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, dice, state } from './helpers.js'

const enemy = (page: Page) => page.locator('#enemy')

/** The rendered footprint of the sprite, as a share of the world box. */
async function footprint(page: Page): Promise<number> {
  const box = (await enemy(page).boundingBox())!
  const world = (await page.locator('#world').boundingBox())!
  return (box.width * box.height) / (world.width * world.height)
}

interface Seen {
  /** Milliseconds from the press, or null if it never happened. */
  readonly thrustAt: number | null
  readonly brightAt: number | null
  readonly hitAt: number | null
  readonly gatherAt: number | null
  /** When the sprite was first painted at a different reach. */
  readonly movedAt: number | null
  /** The rungs of the contact ladder that were actually shown. */
  readonly contact: string[]
  readonly screenAt: number | null
  readonly reaches: string[]
}

/** Start watching. Everything asserted after this call happened after it. */
async function watch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const started = performance.now()
    const since = () => Math.round(performance.now() - started)
    const contact = new Set<string>()
    const reaches = new Set<string>()
    const first = document.getElementById('enemy')?.dataset['reach'] ?? ''
    if (first) reaches.add(first)
    const seen = {
      thrustAt: null as number | null,
      brightAt: null as number | null,
      hitAt: null as number | null,
      gatherAt: null as number | null,
      movedAt: null as number | null,
      screenAt: null as number | null,
      contact,
      reaches,
    }
    ;(window as unknown as { __saw: unknown }).__saw = seen

    const sweep = (): void => {
      const el = document.getElementById('enemy')
      const world = document.getElementById('world')
      if (!el || !world) return
      if ((world.classList.contains('thrust') || el.ownerDocument.querySelector('.layer-foreground.thrust')) && seen.thrustAt === null) {
        seen.thrustAt = since()
      }
      // Two ways to be lit: an authored impact plate where one was painted for
      // the pose, and the sprite's own brightness where one was not. Both are
      // the same beat and both count.
      if ((el.classList.contains('struck') || el.classList.contains('lit')) && seen.brightAt === null) {
        seen.brightAt = since()
      }
      if (document.querySelector('#fx .hit-number') && seen.hitAt === null) seen.hitAt = since()
      if (el.classList.contains('gathering') && seen.gatherAt === null) seen.gatherAt = since()
      const reach = el.dataset['reach']
      if (reach) {
        if (!reaches.has(reach) && seen.movedAt === null) seen.movedAt = since()
        reaches.add(reach)
      }
      const rung = el.dataset['contact']
      if (rung) contact.add(rung)
      const screen = document.getElementById('screen')
      if (screen && !screen.hidden && seen.screenAt === null) seen.screenAt = since()
    }

    sweep()
    new MutationObserver(sweep).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'data-reach', 'data-contact', 'data-screen', 'hidden'],
    })
  })
}

async function saw(page: Page, settleFor = 2000): Promise<Seen> {
  await page.waitForTimeout(settleFor)
  return page.evaluate(() => {
    const s = (window as unknown as { __saw: Record<string, unknown> }).__saw
    return {
      ...s,
      contact: [...(s['contact'] as Set<string>)],
      reaches: [...(s['reaches'] as Set<string>)],
    } as unknown as Seen
  })
}

/** Score the cheapest legal hand: one die, so it certainly does not kill. */
async function scoreOneDie(page: Page): Promise<void> {
  await act(page, 'roll').click()
  await dice(page).nth(0).click()
  await act(page, 'score').click()
}

test.describe('the hall empties out one score at a time', () => {
  test('far is far, mid is unmistakably nearer, and close is on top of you', async ({ page }) => {
    const shares: number[] = []
    for (const reach of ['far', 'mid', 'close'] as const) {
      await boot(page, `?room=hollow&reach=${reach}&enemyHp=9999`)
      await expect(enemy(page)).toHaveAttribute('data-reach', reach)
      shares.push(await footprint(page))
    }
    const [far, mid, close] = shares as [number, number, number]

    // Not "slightly larger". Each step has to be too big to be a trick of the
    // light, because the size is the only place the turn count is written.
    expect(mid, 'mid is not clearly nearer than far').toBeGreaterThan(far * 2)
    expect(close, 'close is not clearly nearer than mid').toBeGreaterThan(mid * 2)
    expect(close, 'close does not dominate the frame').toBeGreaterThan(0.5)
    expect(far, 'far is not visible at all').toBeGreaterThan(0.04)
  })

  test('the reach on screen is the reach in the save, not a leftover class', async ({ page }) => {
    // A real walk, so the save is real: a fixture does not persist.
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    await act(page, 'fight').click()
    await expect(enemy(page)).toHaveAttribute('data-reach', 'far')

    for (const expected of ['mid', 'close'] as const) {
      await scoreOneDie(page)
      const now = await state(page)
      expect(now.run!.combat!.approach).toBe(expected)

      await page.reload()
      await act(page, 'continue').click()
      // Nothing has animated on this page. Whatever it shows, it read off the
      // save — which is the whole of §12: no stable condition may exist only
      // as a class an animation left behind.
      await expect(enemy(page)).toHaveAttribute('data-reach', expected)
      expect((await state(page)).run!.combat!.approach).toBe(expected)
    }
  })

  test('killing it never moves it, at any reach', async ({ page }) => {
    for (const reach of ['far', 'mid', 'close'] as const) {
      await boot(page, `?room=hollow&reach=${reach}&enemyHp=1`)
      await scoreOneDie(page)
      const now = await state(page)
      expect(now.mode, `it survived a killing blow at ${reach}`).not.toBe('dead')
      expect(now.run!.hp).toBe(100)
      expect(now.run!.cleared).toContain('hollow')
    }
  })

  test('surviving it at close is the end of the run', async ({ page }) => {
    await boot(page, '?room=hollow&reach=close&enemyHp=9999')
    await scoreOneDie(page)
    const now = await state(page)
    expect(now.mode).toBe('dead')
    expect(now.run!.hp).toBe(0)
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'dead')
    await expect(page.locator('.screen-cause')).toContainText('The Gnawing')
  })

  test('says it is coming, and says the last turn is the last one', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')
    await expect(page.locator('#intent')).toContainText('CRAWL')

    await boot(page, '?room=hollow&reach=close&enemyHp=9999')
    const intent = page.locator('#intent')
    await expect(intent).toContainText('REACH')
    await intent.click()
    // No modal, no tutorial label. The intent it already shows says it.
    await expect(page.locator('#say')).toContainText('last turn')
    await expect(page.locator('#screen')).toBeHidden()
  })
})

test.describe('a strike, and then it comes closer', () => {
  test('the hand goes in, the flesh goes white, and the number is the real one', async ({
    page,
  }) => {
    await boot(page, '?room=hollow&enemyHp=9999', { motion: true })
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await dice(page).nth(1).click()
    const damage = Number(await page.locator('#score .term-damage').textContent())

    await watch(page)
    await act(page, 'score').click()
    const seen = await saw(page)

    expect(seen.thrustAt, 'nothing swung').not.toBeNull()
    expect(seen.brightAt, 'the enemy never took the hit').not.toBeNull()
    expect(seen.hitAt, 'no damage number').not.toBeNull()
    // At full extension, not before it.
    expect(seen.brightAt!).toBeGreaterThanOrEqual(seen.thrustAt!)
    // And the flash and the number are one event, not two soft ones.
    expect(Math.abs(seen.brightAt! - seen.hitAt!)).toBeLessThan(80)
    // Never a second opinion about the damage: the animation shows the number
    // the reducer produced, because there is no other number anywhere.
    const shown = await page.evaluate(
      () => document.querySelector('#fx .hit-number')?.getAttribute('data-damage') ?? null,
    )
    const now = await state(page)
    expect(now.run!.combat!.enemyHp).toBe(9999 - damage)
    if (shown !== null) expect(Number(shown)).toBe(damage)
  })

  test('it advances only after the strike has been allowed to read', async ({ page }) => {
    await boot(page, '?room=hollow&enemyHp=9999', { motion: true })
    await act(page, 'roll').click()
    await dice(page).nth(0).click()

    await watch(page)
    await act(page, 'score').click()
    const seen = await saw(page)

    expect(seen.gatherAt, 'it never gathered itself').not.toBeNull()
    expect(seen.movedAt, 'it never moved').not.toBeNull()
    // The blow first, then an uncomfortable pause, then the step. An advance
    // on the same frame as the impact is an advance nobody saw.
    expect(seen.brightAt).not.toBeNull()
    expect(seen.gatherAt!, 'it stepped over its own hit').toBeGreaterThan(seen.brightAt! + 100)
    expect(seen.movedAt!).toBeGreaterThan(seen.gatherAt!)
    expect(seen.reaches).toEqual(['far', 'mid'])
    await expect(enemy(page)).toHaveAttribute('data-reach', 'mid')
  })

  test('reaching you is bigger than any of it, and ends on the death screen', async ({ page }) => {
    await boot(page, '?room=hollow&reach=close&enemyHp=9999', { motion: true })
    await act(page, 'roll').click()
    await dice(page).nth(0).click()

    await watch(page)
    await act(page, 'score').click()
    const seen = await saw(page, 2500)

    // Discrete rungs, not a tween: every one of them was on screen long enough
    // for a mutation record to exist for it.
    expect(seen.contact.length, 'it slid instead of lunging').toBeGreaterThanOrEqual(3)
    expect(seen.contact).toContain('landed')
    expect(seen.screenAt, 'the death screen never arrived').not.toBeNull()
    expect(seen.screenAt!, 'the screen took over before it got to you').toBeGreaterThan(
      seen.brightAt ?? 0,
    )
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'dead')
    // And the settled picture is the arrival, painted from state.
    await expect(enemy(page)).toHaveAttribute('data-contact', 'landed')
  })

  test('an impatient press lands on exactly the state the reducer committed', async ({ page }) => {
    await boot(page, '?room=hollow&reach=mid&enemyHp=9999', { motion: true })
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await act(page, 'score').click()
    // Straight back in, mid-advance.
    await page.evaluate(() => window.castlebrynth?.settle())

    const now = await state(page)
    expect(now.run!.combat!.approach).toBe('close')
    await expect(enemy(page)).toHaveAttribute('data-reach', 'close')
    await expect(page.locator('#enemy.gathering')).toHaveCount(0)
    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(false)
  })
})

test.describe('reduced motion is the same encounter, immediately', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('lands on the far end of the ladder with nothing in the air', async ({ page }) => {
    await boot(page, '?room=hollow&reach=mid&enemyHp=9999', { motion: true })
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await act(page, 'score').click()

    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(false)
    expect((await state(page)).run!.combat!.approach).toBe('close')
    await expect(enemy(page)).toHaveAttribute('data-reach', 'close')
    // Nothing transient is left on screen — and nothing was needed to say it.
    await expect(page.locator('#enemy.gathering, #enemy.struck, #world.thrust')).toHaveCount(0)
    await expect(page.locator('#say')).toContainText('CLOSE IN')
  })

  test('reaches the same death, without the lunge', async ({ page }) => {
    await boot(page, '?room=hollow&reach=close&enemyHp=9999', { motion: true })
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await act(page, 'score').click()

    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(false)
    const now = await state(page)
    expect(now.mode).toBe('dead')
    expect(now.run!.combat!.reached).toBe(true)
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'dead')
    // The reason is a sentence, not a movement — and it names what did it.
    await expect(page.locator('.screen-cause')).toContainText('The Gnawing')
    await expect(enemy(page)).toHaveAttribute('data-contact', 'landed')
  })
})
