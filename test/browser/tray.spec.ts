/**
 * The input contract, on a phone.
 *
 * The pre-reset build shipped a panel container that intercepted taps meant
 * for the tabs beneath it, and shipped it green. Every check here is against
 * the rendered page rather than the model, because that bug is invisible to a
 * model by construction.
 *
 * The polish sweep added the second half: not only *can* every control be
 * pressed, but everything sits in the bay it was painted for, at both phone
 * widths. A tray whose third relic bay is off the right edge passes every
 * tappability assertion ever written, because the control it lost was never
 * rendered.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { CONTENT, DIE_BAY, DIE_CENTRES, RELIC_CENTRES } from '../../src/content/tray.js'
import { act, boot, dice, tappable, trayControls } from './helpers.js'

/** The two phones every layout claim in this file is made about. */
const SIZES = [
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 },
]

/** Rooms where the tray is the interface, and what to press to get there. */
const STATIONS: readonly (readonly [string, string, readonly string[]])[] = [
  ['entry', '?room=entry', []],
  ['the fork', '?room=fork', []],
  ['the chapel, before the font', '?room=sanctuary&hp=40', []],
  ['the chapel, after the font', '?room=sanctuary&hp=40', ['[data-act=ritual]']],
  ['the hollow, before the fight', '?room=hollow', []],
  ['the hollow, waiting to roll', '?room=hollow&mode=combat', []],
  ['the hollow, rolled', '?room=hollow&mode=combat', ['[data-act=roll]']],
  ['the hollow, chosen', '?room=hollow&mode=combat', ['[data-act=roll]', '.die[data-slot="0"]']],
  ['carrying a relic', '?room=fork&relics=thimble', []],
  ['carrying three', '?room=fork&relics=thimble,wax,plate', []],
]

const boxes = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }
    }),
  )

const trayBox = async (page: Page) => (await page.locator('#tray').boundingBox())!

test.describe('the tray fits the plate', () => {
  for (const size of SIZES) {
    test(`at ${size.name}, at every station`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })

      for (const [where, fixture, presses] of STATIONS) {
        await boot(page, fixture)
        for (const press of presses) await page.locator(press).click()
        const tray = await trayBox(page)

        // The content band — the orb's outer edge to the third relic bay — is
        // on screen in full. Only the painted margin may run off.
        expect(tray.x + CONTENT.left * tray.width, `${where}: the orb is off the left`).toBeGreaterThanOrEqual(-0.5)
        expect(
          tray.x + CONTENT.right * tray.width,
          `${where}: the last relic bay is off the right`,
        ).toBeLessThanOrEqual(size.width + 0.5)

        // Six dice, in six bays, 44px tall and never overlapping.
        const seated = await boxes(page, '#crown .die')
        expect(seated, `${where}: the crown is not six dice`).toHaveLength(6)
        for (const die of seated) {
          expect(die.h, `${where}: a die target is under 44px tall`).toBeGreaterThanOrEqual(43.5)
          expect(die.w, `${where}: a die target is narrower than its bay`).toBeGreaterThanOrEqual(30)
        }
        for (let i = 1; i < seated.length; i++) {
          expect(seated[i]!.x, `${where}: two die targets overlap`).toBeGreaterThanOrEqual(
            seated[i - 1]!.right - 0.5,
          )
        }

        // And the die you can see is inside the recess it was painted for.
        const faces = await boxes(page, '#crown .die-face')
        faces.forEach((face, index) => {
          const centre = tray.x + DIE_CENTRES[index]!.x * tray.width
          const half = (DIE_BAY.width / 2) * tray.width
          expect(face.x, `${where}: die ${index} spills left of its bay`).toBeGreaterThanOrEqual(centre - half)
          expect(face.right, `${where}: die ${index} spills right of its bay`).toBeLessThanOrEqual(centre + half)
        })

        // Nothing the player can press leaves the screen, and no label is cut.
        for (const control of await trayControls(page)) await tappable(page, control)
        const clipped = await page
          .locator('#beds .act')
          .evaluateAll((nodes) =>
            nodes
              .filter((n) => n.scrollWidth > n.clientWidth + 1)
              .map((n) => `${(n as HTMLElement).dataset['act']}:${n.textContent}`),
          )
        expect(clipped, `${where}: a tray label is clipped`).toEqual([])

        const scrolls = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        )
        expect(scrolls, `${where}: the page scrolls sideways`).toBe(false)

        // The four regions keep to themselves: the well never sits under an
        // action, and a relic bay never sits over the well.
        const well = (await page.locator('#well').boundingBox())!
        for (const bed of await boxes(page, '#beds .act')) {
          expect(well.y + well.height, `${where}: the well overlaps an action`).toBeLessThanOrEqual(bed.y + 0.5)
        }
        for (const bay of await boxes(page, '#relics .relic')) {
          expect(bay.x, `${where}: a relic bay overlaps the well`).toBeGreaterThanOrEqual(
            well.x + well.width - 0.5,
          )
        }
      }
    })

    test(`at ${size.name}, the three relic bays are all on screen`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      await boot(page, '?room=fork&relics=thimble,wax,plate')

      const bays = await boxes(page, '#relics .relic')
      expect(bays, 'three carried relics, three bays').toHaveLength(3)
      const tray = await trayBox(page)
      bays.forEach((bay, index) => {
        expect(bay.right, `relic bay ${index} is off the right edge`).toBeLessThanOrEqual(size.width + 0.5)
        const centre = tray.x + RELIC_CENTRES[index]!.x * tray.width
        expect(Math.abs(bay.x + bay.w / 2 - centre), `relic ${index} is not on its bay`).toBeLessThan(2)
      })
      for (let i = 1; i < bays.length; i++) {
        expect(bays[i]!.x, 'two relic targets overlap').toBeGreaterThanOrEqual(bays[i - 1]!.right - 0.5)
      }
    })
  }

  test('an empty bay is empty, and one relic fills only the first', async ({ page }) => {
    await boot(page, '?room=fork')
    await expect(page.locator('#relics .relic')).toHaveCount(0)
    await expect(page.locator('#relics')).toHaveAttribute('data-count', '0')

    await boot(page, '?room=fork&relics=thimble')
    await expect(page.locator('#relics .relic')).toHaveCount(1)
    const tray = await trayBox(page)
    const bay = (await page.locator('#relics .relic').boundingBox())!
    expect(Math.abs(bay.x + bay.width / 2 - (tray.x + RELIC_CENTRES[0]!.x * tray.width))).toBeLessThan(2)
  })

  test('a fourth relic says so rather than disappearing', async ({ page }) => {
    await boot(page, '?room=fork&relics=thimble,wax,plate,nail')
    await expect(page.locator('#relics .relic')).toHaveCount(3)
    await expect(page.locator('.relic-more')).toHaveText('+1')
    // And MENU still holds all four.
    await act(page, 'menu').click()
    await expect(page.locator('#overlay')).toContainText('Choir Nail')
  })
})

test.describe('the tray and its persistent controls', () => {
  test('every control through a whole combat turn stays reachable', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')

    // intent: MENU and ROLL
    for (const control of await trayControls(page)) await tappable(page, control)
    await expect(act(page, 'roll')).toBeVisible()

    await act(page, 'roll').click()
    // rolled: MENU, SCORE, REROLL, and six dice
    await expect(dice(page)).toHaveCount(6)
    for (const control of await trayControls(page)) await tappable(page, control)

    await act(page, 'reroll').click()
    // rerolled: MENU, SCORE, six dice — and no reroll
    await expect(act(page, 'reroll')).toHaveCount(0)
    for (const control of await trayControls(page)) await tappable(page, control)
  })

  test('the three beds keep their meaning, and never move', async ({ page }) => {
    const boxOf = async (name: string) => (await act(page, name).boundingBox())!

    await boot(page, '?room=entry')
    const menuExploring = await boxOf('menu')
    const primaryExploring = await boxOf('go')

    await boot(page, '?room=hollow&mode=combat')
    const menuFighting = await boxOf('menu')
    const primaryFighting = await boxOf('roll')

    // MENU is the left bed in both modes, and the primary verb is the
    // middle bed in both. A control that moves between modes is a control the
    // thumb has to find again every time.
    expect(menuFighting.x).toBeCloseTo(menuExploring.x, 0)
    expect(menuFighting.y).toBeCloseTo(menuExploring.y, 0)
    expect(primaryFighting.x).toBeCloseTo(primaryExploring.x, 0)
    expect(primaryFighting.y).toBeCloseTo(primaryExploring.y, 0)
    expect(primaryFighting.x).toBeGreaterThan(menuFighting.x)
  })

  test('the six dice are separately tappable, and the right one answers', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat')
    await act(page, 'roll').click()

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
    await boot(page, '?room=hollow&mode=combat&relics=thimble')
    const grabby = await page.evaluate(() =>
      [...document.querySelectorAll('img, canvas, .layer, #crown, #beds, #relics, #world')]
        .filter((el) => getComputedStyle(el).pointerEvents !== 'none')
        .map((el) => el.id || el.className),
    )
    expect(grabby, 'art or a positioning container is taking pointer events').toEqual([])
  })

  test('every verb is a real button with a name', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat&relics=thimble')
    await act(page, 'roll').click()
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('[data-act]')]
        .filter((el) => el.tagName !== 'BUTTON' || !el.getAttribute('aria-label'))
        .map((el) => `${el.tagName}:${(el as HTMLElement).dataset['act']}`),
    )
    expect(bad).toEqual([])
  })

  test('nothing the game offers ever runs off a phone', async ({ page }) => {
    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height })
      for (const fixture of [
        '?room=entry',
        '?room=fork',
        '?room=gate&mode=combat',
        '?mode=dead',
        '?mode=complete',
      ]) {
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
        expect(overflow, `${size.name} ${fixture} pushes a control off the screen`).toEqual([])
      }
    }
  })

  test('leaves the room above it tappable', async ({ page }) => {
    await boot(page, '?room=entry')
    const tray = await trayBox(page)
    // Every thing the eye can find in the room is above the plate, and answers
    // a press at its own centre.
    for (const hit of await page.locator('#hits .hit').all()) {
      const box = (await hit.boundingBox())!
      expect(box.y + box.height, 'a room detail is under the tray').toBeLessThanOrEqual(tray.y + 0.5)
      await tappable(page, hit)
    }
  })
})
