import { expect, test } from '@playwright/test'

import { act, boot, dice, screenName, state, toFirstFight } from './helpers.js'
import { fightItOut } from './play.js'

test.describe('the first run', () => {
  test('fresh storage boots to a title that offers only what is true', async ({ page }) => {
    await boot(page)
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'title')
    await expect(act(page, 'start')).toBeVisible()
    // Nothing to continue into, so no CONTINUE. The door never lies about
    // where a press takes you.
    await expect(act(page, 'continue')).toHaveCount(0)
  })

  test('starting a run lands in the first room with six dice', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()

    await expect(page.locator('#screen')).toBeHidden()
    await expect(page.locator('#backdrop')).toBeVisible()
    await expect(page.locator('#tray')).toBeVisible()
    await expect(page.locator('#say')).toContainText('The stair ends in a long hall')
    await expect(dice(page)).toHaveCount(6)
  })

  test('looking is free, always answers, and never commits', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()

    const before = await state(page)
    const details = page.locator('#hits .hit')
    const count = await details.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await details.nth(i).click()
      await expect(page.locator('#say')).toBeVisible()
      await expect(page.locator('#say')).not.toBeEmpty()
    }

    const after = await state(page)
    expect(after.run!.hp).toBe(before.run!.hp)
    expect(after.run!.roomId).toBe(before.run!.roomId)
  })

  test('MENU states the whole loadout, in full, and the ladder', async ({ page }) => {
    await boot(page, '?room=fork&dice=careful&relics=knuckle')

    await act(page, 'menu').click()
    const overlay = page.locator('#overlay')
    await expect(overlay).toContainText('Careful Bone')
    await expect(overlay).toContainText('This die can only roll 3 or 4')
    await expect(overlay).toContainText("Saint's Knuckle")
    await expect(overlay).toContainText('use ×3 instead of ×2')
    // The ladder, so a player can name the hand they just scored.
    await expect(overlay.locator('.ladder-row')).toHaveCount(7)
    await expect(overlay).toContainText('FULL HOUSE')
    // And the arithmetic, literally rather than in prose.
    await expect(overlay).toContainText('DAMAGE = selected dice total × hand multiplier + relic bonuses')
    await act(page, 'close').click()
    await expect(overlay).toBeHidden()
  })

  test('the enemy is visible before any combat control appears', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)

    // Still exploring: no roll, no score, and the monster already fills the
    // scene. This is the P0 the reset exists to fix.
    await expect(act(page, 'roll')).toHaveCount(0)
    const enemy = page.locator('#enemy')
    await expect(enemy).toBeVisible()
    await expect(enemy).toHaveAttribute('data-enemy', 'present')

    const box = (await enemy.boundingBox())!
    const world = (await page.locator('#world').boundingBox())!
    const share = (box.width * box.height) / (world.width * world.height)
    expect(share, 'the enemy does not dominate the scene').toBeGreaterThan(0.2)
    expect(box.x).toBeGreaterThanOrEqual(-1)
    expect(box.x + box.width).toBeLessThanOrEqual(world.width + 1)
  })

  test('every enemy in the slice is on screen in its own room', async ({ page }) => {
    for (const [room, name] of [
      ['hollow', 'The Gnawing'],
      ['deep', 'The Marrow'],
      ['gate', 'The Warden'],
    ] as const) {
      await boot(page, `?room=${room}`)
      const enemy = page.locator('#enemy')
      await expect(enemy).toHaveAttribute('data-enemy', 'present')
      const box = (await enemy.boundingBox())!
      const world = (await page.locator('#world').boundingBox())!
      expect(
        (box.width * box.height) / (world.width * world.height),
        `${name} does not dominate its scene`,
      ).toBeGreaterThan(0.2)
      await expect(page.locator('#well')).toContainText(name)
    }
  })

  test('the backdrop can never be painted over the enemy', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('#world > .layer')].map((el) => ({
        layer: (el as HTMLElement).dataset['layer'],
        z: Number((el as HTMLElement).style.zIndex),
      })),
    )
    const z = (name: string) => order.find((l) => l.layer === name)!.z
    expect(z('backdrop')).toBeLessThan(z('enemy'))
    expect(z('midground')).toBeLessThan(z('enemy'))
    expect(z('enemy')).toBeLessThan(z('fx'))
    expect(z('fx')).toBeLessThan(z('hud'))

    // Belt and braces: paint order follows DOM order for equal stacking
    // contexts, so the enemy is after the backdrop there too.
    const dom = await page.evaluate(() =>
      [...document.querySelectorAll('#world > .layer')].map((el) => (el as HTMLElement).dataset['layer']),
    )
    expect(dom.indexOf('backdrop')).toBeLessThan(dom.indexOf('enemy'))
  })

  test('each room in the slice is its own place', async ({ page }) => {
    const seen = new Set<string>()
    for (const room of ['entry', 'passage', 'hollow', 'fork', 'deep', 'gate']) {
      await boot(page, `?room=${room}`)
      const src = await page.locator('#backdrop').getAttribute('src')
      expect(src, `${room} has no backdrop`).toBeTruthy()
      seen.add(src!)
    }
    expect(seen.size, 'two rooms are the same picture').toBe(6)
  })

  test('plays the whole route to the way out, in one browser, with real presses', async ({
    page,
  }) => {
    // The full journey, fought rather than skipped: three enemies beaten by
    // tapping dice and pressing SCORE. Nothing is dispatched behind the UI's
    // back and the page is never reloaded.
    test.setTimeout(180_000)
    await boot(page)

    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()

    // A win may or may not have dropped anything, and the route has to
    // continue either way — an unconditional take here is what would hide a
    // no-drop win from every journey in the suite.
    const takeAnyReward = async () => {
      if ((await screenName(page)) !== 'reward') return
      const offers = await page.locator('#offers .offer').count()
      expect(offers, 'a win offered more than two').toBeLessThanOrEqual(2)
      await page.locator('[data-act="take"]').first().click()
      await expect(page.locator('#screen')).toBeHidden()
    }

    expect(await fightItOut(page), 'lost to the Gnawing').toBe('won')
    await takeAnyReward()

    await act(page, 'go').click()
    await expect(page.locator('#say')).toContainText('The passage splits')
    await page.locator('[data-to="deep"]').click() // the long way round, on purpose

    expect(await fightItOut(page), 'lost to the Marrow').toBe('won')
    await takeAnyReward()

    await act(page, 'go').click()
    expect(await fightItOut(page), 'lost to the Warden').toBe('won')
    // The boss leaves nothing; the door is the reward.
    await expect(page.locator('#screen')).toBeHidden()

    await act(page, 'go').click()
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'complete')
    await expect(page.locator('#screen')).toContainText('OUT')
  })
})
