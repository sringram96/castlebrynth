/**
 * The tray, as a piece of physical furniture.
 *
 * The plate is one authored picture and every control on it is placed in the
 * plate's own fractions. What is asserted here is **geometry**: that nothing
 * overflows its bay, nothing overlaps its neighbour, nothing runs off the
 * screen, and every label fits inside the box it was given.
 *
 * The regions changed meaning in the War of Bones and the coordinates did not.
 * That is the point of the file: the same measurements, holding a different
 * game.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, bones, tappable, trayControls } from './helpers.js'

/** Every screen the tray is up on, and what to press to get there. */
const SCREENS: readonly [string, string][] = [
  ['the entry', '?room=entry'],
  ['the chapel, before the font', '?room=sanctuary&bones=18'],
  ['the fork', '?room=fork'],
  ['the vault, shut', '?room=chain-vault'],
  ['the vault, open', '?room=chain-vault&vault=open'],
  ['a fight, before the field', '?room=hollow&mode=combat&phase=thrown'],
  ['a fight, committed', '?room=hollow&mode=combat&phase=fielded'],
  ['a fight, thrown', '?room=hollow&mode=combat&phase=rolled'],
  ['a fight, smashed', '?room=deep&mode=combat&phase=smashed'],
  ['carrying everything', '?room=fork&specials=knuckle,cinderbone&vials=2&charms=1'],
]

interface Box {
  x: number
  y: number
  w: number
  h: number
  right: number
  bottom: number
}

async function boxes(page: Page, selector: string): Promise<Box[]> {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = (n as HTMLElement).getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }
    }),
  )
}

test.describe('nothing runs off the phone', () => {
  for (const [where, fixture] of SCREENS) {
    test(where, async ({ page }) => {
      await boot(page, fixture)
      const viewport = page.viewportSize()!

      for (const control of await trayControls(page)) {
        const box = (await control.boundingBox())!
        const act = (await control.getAttribute('data-act')) ?? 'button'
        expect(box.x, `${where}: [${act}] off the left`).toBeGreaterThanOrEqual(-0.5)
        expect(box.right ?? box.x + box.width, `${where}: [${act}] off the right`).toBeLessThanOrEqual(
          viewport.width + 0.5,
        )
        expect(box.y + box.height, `${where}: [${act}] off the bottom`).toBeLessThanOrEqual(
          viewport.height + 0.5,
        )
      }
    })
  }
})

test.describe('the crown', () => {
  test('seats one bone per lane, at the touch floor, never overlapping', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=rolled')
    const seated = await boxes(page, '#crown .bone')
    expect(seated.length, 'the crown drew no line').toBeGreaterThan(0)

    for (const bone of seated) {
      expect(bone.h, 'a bone target is under 44px tall').toBeGreaterThanOrEqual(43.5)
      expect(bone.w, 'a bone target is narrower than its bay').toBeGreaterThanOrEqual(30)
    }
    for (let i = 1; i < seated.length; i++) {
      expect(seated[i]!.x, 'two bone targets overlap').toBeGreaterThanOrEqual(
        seated[i - 1]!.right - 0.5,
      )
    }
  })

  test('draws exactly the width that was committed, and no ghost lanes', async ({ page }) => {
    for (const width of [1, 3, 6]) {
      await boot(page, `?room=deep&mode=combat&phase=rolled&width=${width}`)
      await expect(bones(page)).toHaveCount(width)
    }
  })

  test('is empty out of a fight', async ({ page }) => {
    await boot(page, '?room=fork&specials=knuckle')
    await expect(bones(page)).toHaveCount(0)
  })
})

test.describe('the enemy line', () => {
  test('stands above the crown, lane for lane', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=rolled&width=6')
    const mine = await boxes(page, '#crown .bone')
    const theirs = await boxes(page, '#enemy-line .bone-enemy')
    expect(theirs.length).toBe(6)
    expect(mine.length).toBe(6)

    for (let lane = 0; lane < 6; lane++) {
      // Above, and centred on the same lane. This is the whole reason it is a
      // child of the tray rather than of the world.
      expect(theirs[lane]!.bottom, `lane ${lane} is not above the crown`).toBeLessThanOrEqual(
        mine[lane]!.y + 1,
      )
      const mineCentre = mine[lane]!.x + mine[lane]!.w / 2
      const theirCentre = theirs[lane]!.x + theirs[lane]!.w / 2
      expect(Math.abs(mineCentre - theirCentre), `lane ${lane} is not aligned`).toBeLessThan(2)
    }
  })

  test('is on screen and inside the viewport', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown')
    const viewport = page.viewportSize()!
    for (const bone of await boxes(page, '#enemy-line .bone-enemy')) {
      expect(bone.x).toBeGreaterThanOrEqual(-0.5)
      expect(bone.right).toBeLessThanOrEqual(viewport.width + 0.5)
      expect(bone.y).toBeGreaterThanOrEqual(-0.5)
    }
  })
})

test.describe('the satchel', () => {
  test('seats three bays that never overlap', async ({ page }) => {
    await boot(page, '?room=fork&vials=1&charms=1&specials=knuckle')
    const seated = await boxes(page, '.satchel-slot')
    expect(seated).toHaveLength(3)
    for (let i = 1; i < seated.length; i++) {
      expect(seated[i]!.x, 'two satchel bays overlap').toBeGreaterThanOrEqual(
        seated[i - 1]!.right - 0.5,
      )
    }
    for (const bay of seated) expect(bay.h).toBeGreaterThanOrEqual(43.5)
  })

  test('shows a count even when it is nothing', async ({ page }) => {
    await boot(page, '?room=fork')
    await expect(page.locator('.satchel-slot[data-slot-id="vial"] .satchel-count')).toHaveText('0')
    await expect(page.locator('.satchel-slot[data-slot-id="vial"]')).toHaveAttribute(
      'data-live',
      'no',
    )
  })
})

test.describe('the beds', () => {
  test('MENU is always bottom-left, and the phase verb is always the centre', async ({ page }) => {
    const boxOf = async (name: string): Promise<Box | undefined> =>
      (await boxes(page, `[data-act="${name}"]`))[0]

    await boot(page, '?room=hollow&mode=combat&phase=thrown')
    const menu = (await boxOf('menu'))!
    const field = (await boxOf('field'))!
    expect(menu.x).toBeLessThan(field.x)

    // Every phase puts its one verb in the same bed.
    for (const [phase, verb] of [
      ['fielded', 'throw'],
      ['rolled', 'smash'],
    ] as const) {
      await boot(page, `?room=deep&mode=combat&phase=${phase}`)
      const here = (await boxOf(verb))!
      expect(Math.abs(here.x - field.x), `${verb} moved bed`).toBeLessThan(2)
    }
  })

  test('no label is ever clipped by its own box', async ({ page }) => {
    for (const [where, fixture] of SCREENS) {
      await boot(page, fixture)
      const clipped = await page.locator('#tray button:visible').evaluateAll((nodes) =>
        nodes
          .filter((n) => (n as HTMLElement).innerText.trim().length > 0)
          .filter((n) => (n as HTMLElement).scrollWidth > (n as HTMLElement).clientWidth + 1)
          .map((n) => (n as HTMLElement).innerText),
      )
      expect(clipped, `${where}: a label is clipped`).toEqual([])
    }
  })
})

test.describe('the plate itself', () => {
  test('its content band fills the viewport and only decoration overflows', async ({ page }) => {
    await boot(page, '?room=fork')
    const viewport = page.viewportSize()!
    const tray = (await page.locator('#tray').boundingBox())!
    // The painted margin is allowed off the sides; the pile on the left and
    // the third satchel bay on the right are not.
    const orb = (await page.locator('#orb').boundingBox())!
    const last = (await boxes(page, '.satchel-slot')).at(-1)!
    expect(orb.x).toBeGreaterThanOrEqual(-0.5)
    expect(last.right).toBeLessThanOrEqual(viewport.width + 0.5)
    expect(tray.width).toBeGreaterThan(viewport.width * 0.9)
  })

  test('the page itself never scrolls sideways', async ({ page }) => {
    for (const [, fixture] of SCREENS) {
      await boot(page, fixture)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${fixture} scrolls sideways`).toBeLessThanOrEqual(1)
    }
  })
})

test.describe('every visible control answers a tap', () => {
  for (const [where, fixture] of SCREENS) {
    test(where, async ({ page }) => {
      await boot(page, fixture)
      for (const control of await trayControls(page)) await tappable(page, control)
      // And the world's own controls, which sit over the art.
      for (const hit of await page.locator('#hits button:visible').all()) {
        await tappable(page, hit)
      }
      void act
    })
  }
})
