/**
 * The input contract, at 390x844.
 *
 * The pre-reset build shipped a panel container that intercepted taps meant
 * for the tabs beneath it, and shipped it green. Every check here is against
 * the rendered page rather than the model, because that bug is invisible to a
 * model by construction.
 */

import { expect, test } from '@playwright/test'

import { act, boot, dice, tappable, trayControls } from './helpers.js'

test.describe('the tray and its persistent controls', () => {
  test('every control the tray offers answers a tap at its own centre', async ({ page }) => {
    // Rooms where the tray is the interface. A full screen (the offer, the
    // death screen) hides the tray on purpose and is covered by its own spec.
    for (const fixture of [
      '?room=entry',
      '?room=fork',
      '?room=hollow',
      '?room=deep',
      '?room=gate',
      '?room=hollow&mode=combat',
      '?room=gate&mode=combat',
    ]) {
      await boot(page, fixture)
      const controls = await trayControls(page)
      expect(controls.length, `${fixture} offers nothing`).toBeGreaterThan(0)
      for (const control of controls) await tappable(page, control)
    }
  })

  test('every control through a whole combat turn stays reachable', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')

    // intent: INSPECT and ROLL
    for (const control of await trayControls(page)) await tappable(page, control)
    await expect(act(page, 'roll')).toBeVisible()

    await act(page, 'roll').click()
    // rolled: INSPECT, SCORE, REROLL, and six dice
    await expect(dice(page)).toHaveCount(6)
    for (const control of await trayControls(page)) await tappable(page, control)

    await act(page, 'reroll').click()
    // rerolled: INSPECT, SCORE, six dice — and no reroll
    await expect(act(page, 'reroll')).toHaveCount(0)
    for (const control of await trayControls(page)) await tappable(page, control)
  })

  test('the three beds keep their meaning, and never move', async ({ page }) => {
    const boxOf = async (name: string) => (await act(page, name).boundingBox())!

    await boot(page, '?room=entry')
    const inspectExploring = await boxOf('inspect')
    const primaryExploring = await boxOf('go')

    await boot(page, '?room=hollow&mode=combat')
    const inspectFighting = await boxOf('inspect')
    const primaryFighting = await boxOf('roll')

    // INSPECT is the left bed in both modes, and the primary verb is the
    // middle bed in both. A control that moves between modes is a control the
    // thumb has to find again every time.
    expect(inspectFighting.x).toBeCloseTo(inspectExploring.x, 0)
    expect(inspectFighting.y).toBeCloseTo(inspectExploring.y, 0)
    expect(primaryFighting.x).toBeCloseTo(primaryExploring.x, 0)
    expect(primaryFighting.y).toBeCloseTo(primaryExploring.y, 0)
    expect(primaryFighting.x).toBeGreaterThan(inspectFighting.x)
  })

  test('the six dice are separately tappable, and the right one answers', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()

    const boxes = await dice(page).evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      }),
    )
    expect(boxes).toHaveLength(6)

    for (const box of boxes) {
      expect(Math.min(box.w, box.h), 'a die is under 44px').toBeGreaterThanOrEqual(43.5)
    }
    // No two die targets overlap, so a thumb cannot fire the wrong one.
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i]!.x, 'two die targets overlap').toBeGreaterThanOrEqual(
        boxes[i - 1]!.x + boxes[i - 1]!.w - 0.5,
      )
    }

    // And the die under the finger is the die that changes.
    for (let i = 0; i < 6; i++) {
      await dice(page).nth(i).click()
      await expect(dice(page).nth(i)).toHaveAttribute('data-selected', 'yes')
      const selected = await dice(page).evaluateAll((nodes) =>
        nodes.filter((n) => (n as HTMLElement).dataset['selected'] === 'yes').length,
      )
      expect(selected).toBe(i + 1)
    }
  })

  test('no art anywhere takes a press', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')
    const grabby = await page.evaluate(() =>
      [...document.querySelectorAll('img, canvas, .layer, #crown, #beds, #relics, #world')]
        .filter((el) => getComputedStyle(el).pointerEvents !== 'none')
        .map((el) => el.id || el.className),
    )
    expect(grabby, 'art or a positioning container is taking pointer events').toEqual([])
  })

  test('every verb is a real button with a name', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('[data-act]')]
        .filter((el) => el.tagName !== 'BUTTON' || !el.getAttribute('aria-label'))
        .map((el) => `${el.tagName}:${(el as HTMLElement).dataset['act']}`),
    )
    expect(bad).toEqual([])
  })

  test('nothing the game offers ever runs off a phone', async ({ page }) => {
    for (const fixture of ['?room=entry', '?room=fork', '?room=gate&mode=combat', '?mode=dead', '?mode=complete']) {
      await boot(page, fixture)
      const overflow = await page.evaluate(() => {
        const w = window.innerWidth
        return [...document.querySelectorAll('button:not([hidden])')]
          .filter((el) => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && (r.left < -0.5 || r.right > w + 0.5)
          })
          .map((el) => (el as HTMLElement).dataset['act'] ?? el.className)
      })
      expect(overflow, `${fixture} pushes a control off the screen`).toEqual([])
      // And the page itself never scrolls sideways.
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      )
      expect(scrolls, `${fixture} scrolls horizontally`).toBe(false)
    }
  })

  test('INSPECT is reachable from everywhere and always closes again', async ({ page }) => {
    for (const fixture of ['?room=entry', '?room=fork', '?room=hollow&mode=combat']) {
      await boot(page, fixture)
      await act(page, 'inspect').click()
      await expect(page.locator('#overlay')).toBeVisible()
      await tappable(page, act(page, 'close'))
      await act(page, 'close').click()
      await expect(page.locator('#overlay')).toBeHidden()
    }
  })
})
