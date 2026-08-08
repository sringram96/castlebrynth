import { expect, test } from '@playwright/test'

import { act, boot, dice, state, toFirstFight } from './helpers.js'
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
    await expect(page.locator('#say')).toContainText('The stair ended')
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

  test('the gift room states both options, and INSPECT explains everything', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()

    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'reward')
    await expect(page.locator('#offers .offer')).toHaveCount(2)
    // Both are stated in full — faces, rule, and what they are good with —
    // before either is taken.
    await expect(page.locator('#offers')).toContainText('Only ever shows 3 or 4')
    await expect(page.locator('#offers')).toContainText('Pairs score at ×3')
    await page.locator('[data-take-id="careful"]').click()
    await expect(page.locator('#screen')).toBeHidden()

    await act(page, 'inspect').click()
    const overlay = page.locator('#overlay')
    await expect(overlay).toContainText('Careful Bone')
    await expect(overlay).toContainText('Only ever shows 3 or 4')
    // The ladder, so a player can name the hand they just scored.
    await expect(overlay.locator('.ladder-row')).toHaveCount(7)
    await expect(overlay).toContainText('FULL HOUSE')
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
    await page.locator('[data-take-id="careful"]').click()
    await act(page, 'go').click()

    const takeReward = async () => {
      await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'reward')
      await expect(page.locator('#offers .offer')).toHaveCount(3)
      await page.locator('[data-act="take"]').first().click()
      await expect(page.locator('#screen')).toBeHidden()
    }

    expect(await fightItOut(page), 'lost to the Gnawing').toBe('won')
    await takeReward()

    await act(page, 'go').click()
    await expect(page.locator('#say')).toContainText('Two ways')
    await page.locator('[data-to="deep"]').click() // the long way round, on purpose

    expect(await fightItOut(page), 'lost to the Marrow').toBe('won')
    await takeReward()

    await act(page, 'go').click()
    expect(await fightItOut(page), 'lost to the Warden').toBe('won')
    // The boss leaves nothing; the door is the reward.
    await expect(page.locator('#screen')).toBeHidden()

    await act(page, 'go').click()
    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'complete')
    await expect(page.locator('#screen')).toContainText('OUT')
  })
})
