/**
 * The tray, as a piece of physical furniture.
 *
 * The plate is one authored picture and every control on it is placed in the
 * plate's own fractions. What is asserted here is **geometry**: that nothing
 * overflows its bay, nothing overlaps its neighbour, nothing runs off the
 * screen, and every label fits inside the box it was given.
 *
 * The regions changed meaning again with the dice and most of the coordinates
 * did not. That is the point of the file: near enough the same measurements,
 * holding a different game. The one that did move is the well, which had to
 * grow to carry eight scorecard entries and a row of live buttons — and it
 * overhangs the painted recess on purpose. See `content/tray.ts`.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, dice, tappable, trayControls } from './helpers.js'

/** Every screen the tray is up on, and what to press to get there. */
const SCREENS: readonly [string, string][] = [
  ['the entry', '?room=entry'],
  ['the chapel, before the font', '?room=sanctuary&bones=18'],
  ['the fork', '?room=fork'],
  ['the vault, shut', '?room=chain-vault'],
  ['the vault, open', '?room=chain-vault&vault=open'],
  ['a fight, before the throw', '?room=hollow&mode=combat'],
  ['a fight, one throw in', '?room=deep&rolls=1'],
  ['a fight, out of throws', '?room=deep&rolls=3'],
  ['a fight with nothing that fits', '?room=deep&rolls=3&dice=1,2,3,4,6,6&used=pair'],
  ['carrying everything', '?room=fork&vials=2'],
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
  test('seats one bone per position, at the touch floor, never overlapping', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const seated = await boxes(page, '#crown .bone')
    expect(seated.length, 'the crown drew no hand').toBeGreaterThan(0)

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

  test('draws exactly what the pile can throw, and no ghost positions', async ({ page }) => {
    for (const [pile, count] of [[1, 1], [3, 3], [30, 6]] as const) {
      await boot(page, `?room=deep&bones=${pile}&mode=combat`)
      await expect(dice(page)).toHaveCount(count)
    }
  })

  test('is empty out of a fight', async ({ page }) => {
    await boot(page, '?room=fork&vials=1')
    await expect(dice(page)).toHaveCount(0)
  })
})

test.describe('the scorecard', () => {
  test('fits inside the tray, and every entry inside the well', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const card = (await boxes(page, '#scorecard'))[0]!
    const well = (await boxes(page, '#well'))[0]!
    expect(card.x).toBeGreaterThanOrEqual(well.x - 0.5)
    expect(card.right).toBeLessThanOrEqual(well.right + 0.5)
    expect(card.y).toBeGreaterThanOrEqual(well.y - 0.5)
    expect(card.bottom).toBeLessThanOrEqual(well.bottom + 0.5)
  })

  test('never overlaps the crown above it or the beds below it', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const well = (await boxes(page, '#well'))[0]!
    for (const bone of await boxes(page, '#crown .bone')) {
      expect(bone.bottom, 'a bone sits over the well').toBeLessThanOrEqual(well.y + 0.5)
    }
    for (const bed of await boxes(page, '#beds .act')) {
      expect(bed.y, 'a bed sits over the well').toBeGreaterThanOrEqual(well.bottom - 0.5)
    }
  })

  test('is on screen, whole', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    const viewport = page.viewportSize()!
    for (const entry of await boxes(page, '.score-entry')) {
      expect(entry.x).toBeGreaterThanOrEqual(-0.5)
      expect(entry.right).toBeLessThanOrEqual(viewport.width + 0.5)
      expect(entry.y).toBeGreaterThanOrEqual(-0.5)
      expect(entry.bottom).toBeLessThanOrEqual(viewport.height + 0.5)
    }
  })

  test('never overlaps one entry with another', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&dice=6,6,6,4,4,3')
    const seated = await boxes(page, '.score-entry')
    expect(seated).toHaveLength(8)
    for (let i = 0; i < seated.length; i++) {
      for (let j = i + 1; j < seated.length; j++) {
        const a = seated[i]!
        const b = seated[j]!
        const apart =
          a.right <= b.x + 0.5 || b.right <= a.x + 0.5 || a.bottom <= b.y + 0.5 || b.bottom <= a.y + 0.5
        expect(apart, `entries ${i} and ${j} overlap`).toBe(true)
      }
    }
  })
})

test.describe('the satchel', () => {
  test('seats the one bay it has, at the touch floor', async ({ page }) => {
    await boot(page, '?room=fork&vials=1')
    const seated = await boxes(page, '.satchel-slot')
    // One, on a plate painted for three. The empty recesses are left showing.
    expect(seated).toHaveLength(1)
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
  test('MENU is always bottom-left, and the throw is always the centre', async ({ page }) => {
    const boxOf = async (name: string): Promise<Box | undefined> =>
      (await boxes(page, `[data-act="${name}"]`))[0]

    await boot(page, '?room=hollow&mode=combat')
    const menu = (await boxOf('menu'))!
    const rolling = (await boxOf('roll'))!
    expect(menu.x).toBeLessThan(rolling.x)

    // Both throws sit in the same bed, so the thumb never has to look.
    await boot(page, '?room=deep&rolls=1')
    const again = await boxOf('reroll')
    expect(again, 'REROLL was not offered').toBeDefined()
    expect(Math.abs(again!.x - rolling.x), 'reroll moved bed').toBeLessThan(2)
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
