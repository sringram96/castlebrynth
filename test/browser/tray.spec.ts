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

import { SEATED, SEATED_WORLD } from '../../src/content/tray.js'
import type { SeatedText } from '../../src/content/tray.js'
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
  ['carrying everything', '?room=fork&vials=2&items=grave-candle,splinter-fetish'],
  ['a fight with the whole loadout', '?room=deep&rolls=1&items=grave-candle,splinter-fetish'],
  ['a fight with nothing carried', '?room=deep&rolls=1&iron=none&items=none&talismans=none'],
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

  test('draws six at every pile, and no ghost positions', async ({ page }) => {
    for (const pile of [1, 3, 30]) {
      await boot(page, `?room=deep&bones=${pile}&mode=combat`)
      await expect(dice(page)).toHaveCount(6)
    }
  })

  test('keeps the iron and the item dice out of the six', async ({ page }) => {
    // `#crown .bone` means the hand and nothing else. The iron and the items
    // sit on the same rail in hosts of their own, so anything counting the
    // hand — this suite, and the throw animation — counts six.
    await boot(page, '?room=deep&rolls=1&iron=3&items=grave-candle,splinter-fetish')
    await expect(dice(page)).toHaveCount(6)
    await expect(page.locator('#iron .iron-die')).toHaveCount(1)
    await expect(page.locator('#items .item-die')).toHaveCount(2)
  })

  test('seats the whole rail at one height, without overlapping', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&iron=3&items=grave-candle,splinter-fetish')
    // Sorted left to right rather than taken in document order: the three
    // hosts are separate elements, so the DOM order is crown-then-rail-ends
    // and what is under test is the row as a thumb reads it.
    const rail = (await boxes(page, '#iron .iron-die, #crown .bone, #items .item-die')).sort(
      (a, b) => a.x - b.x,
    )
    expect(rail).toHaveLength(9)
    const viewport = page.viewportSize()!
    for (let i = 0; i < rail.length; i++) {
      expect(rail[i]!.y, `rail piece ${i} is off the baseline`).toBeCloseTo(rail[0]!.y, 0)
      expect(rail[i]!.x, `rail piece ${i} runs off the left`).toBeGreaterThanOrEqual(-0.5)
      expect(rail[i]!.right, `rail piece ${i} runs off the right`).toBeLessThanOrEqual(
        viewport.width + 0.5,
      )
      if (i > 0) {
        expect(rail[i]!.x, `rail pieces ${i - 1} and ${i} overlap`).toBeGreaterThanOrEqual(
          rail[i - 1]!.right - 0.5,
        )
      }
    }
  })

  test('never lets the rail sit over the well', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&items=grave-candle,splinter-fetish')
    const well = (await boxes(page, '#well'))[0]!
    for (const piece of await boxes(page, '#iron .iron-die, #items .item-die')) {
      const clear = piece.right <= well.x + 0.5 || piece.x >= well.right - 0.5
      expect(clear, 'a loadout die sits over the well').toBe(true)
    }
  })

  test('leaves the iron and the item rail empty when nothing is carried', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1&iron=none&items=none&talismans=none')
    await expect(dice(page)).toHaveCount(6)
    await expect(page.locator('#iron .iron-die')).toHaveCount(0)
    await expect(page.locator('#items .item-die')).toHaveCount(0)
    await expect(page.locator('.talisman-slot')).toHaveCount(0)
    // An absent thing is absent — not a bay saying it has none.
    await expect(page.locator('#iron-caption')).toBeHidden()
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
    // Four lines out of `6 6 6 4 4 3`: a pair, two pair, a triple, a full house.
    const seated = await boxes(page, '.score-entry')
    expect(seated).toHaveLength(4)
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
    await boot(page, '?room=hollow')
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
    await boot(page, '?room=hollow')
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

/*
 * ── the seating audit ───────────────────────────────────────────────────
 *
 * The second half of the same claim, and the one the playtest asked for:
 * geometry is not only about boxes not overlapping, it is about **words
 * sitting on the plates they were painted for**. A label centred in a box a
 * few pixels wider than its recess reads as a word that drifted, and nothing
 * in the stylesheet says it is wrong. The pile's count was exactly that.
 *
 * The audit is data, in `content/tray.ts` § SEATED, and what follows walks it:
 * every text element is measured against **the painted region it lives in**,
 * never against the viewport, and is centred there or seated per the one
 * alignment the table declares. `fits` is the honest half — several painted
 * recesses are narrower than the words they carry, and the answer to that is a
 * painted housing recorded as owed art, never a squeezed font.
 */
/** Every screen the seating audit walks, across both modes. */
const SEATED_SCREENS: readonly [string, string][] = [
  ['a room with a thing standing in it', '?room=hollow'],
  ['a fight, before the throw', '?room=hollow&mode=combat'],
  ['a fight, one throw in', '?room=deep&rolls=1&iron=5&items=grave-candle'],
  ['a fight, out of throws', '?room=deep&rolls=3&talismans=pair-talisman&vials=2'],
]

/** How far off centre a word may be before it has drifted, in CSS pixels. */
const DRIFT = 2.5

interface Box {
  x: number
  y: number
  w: number
  h: number
}

async function boxOf(page: Page, selector: string): Promise<Box | undefined> {
  const found = page.locator(selector).first()
  if ((await found.count()) === 0) return undefined
  if (!(await found.isVisible())) return undefined
  const box = await found.boundingBox()
  return box ? { x: box.x, y: box.y, w: box.width, h: box.height } : undefined
}

/** One of the plate's own regions, in page coordinates. */
async function regionOf(page: Page, host: string, seat: SeatedText): Promise<Box> {
  const plate = (await page.locator(host).boundingBox())!
  return {
    x: plate.x + seat.region.x * plate.width,
    y: plate.y + seat.region.y * plate.height,
    w: seat.region.width * plate.width,
    h: seat.region.height * plate.height,
  }
}

function assertSeated(where: string, seat: SeatedText, text: Box, region: Box): void {
  const midY = (a: Box): number => a.y + a.h / 2
  const midX = (a: Box): number => a.x + a.w / 2

  expect(
    Math.abs(midY(text) - midY(region)),
    `${where}: ${seat.id} is off its region's middle, vertically`,
  ).toBeLessThanOrEqual(Math.max(DRIFT, region.h / 2))

  if (seat.align === 'centre') {
    expect(
      Math.abs(midX(text) - midX(region)),
      `${where}: ${seat.id} has drifted off the centre of its plate`,
    ).toBeLessThanOrEqual(DRIFT)
  } else {
    expect(
      Math.abs(text.x - region.x),
      `${where}: ${seat.id} is not seated on its region's left edge`,
    ).toBeLessThanOrEqual(DRIFT + 8)
  }

  if (seat.fits) {
    expect(text.w, `${where}: ${seat.id} is wider than the paint that holds it`).toBeLessThanOrEqual(
      region.w + DRIFT,
    )
  }
}

test.describe('the words sit where the paint says', () => {
  for (const [where, fixture] of SEATED_SCREENS) {
    test(where, async ({ page }) => {
      await boot(page, fixture)
      let checked = 0
      for (const seat of SEATED) {
        const text = await boxOf(page, seat.id)
        if (!text) continue
        assertSeated(where, seat, text, await regionOf(page, '#tray', seat))
        checked++
      }
      expect(checked, `${where}: the audit found nothing to measure`).toBeGreaterThan(2)
    })
  }

  test('covers every seated element the table names, across the screens', async ({ page }) => {
    // An entry nobody ever renders is an assertion that cannot fail, which is
    // worse than no assertion at all. Every row of the table has to be found
    // on at least one screen of the game.
    const seen = new Set<string>()
    for (const [, fixture] of SEATED_SCREENS) {
      await boot(page, fixture)
      for (const seat of SEATED) {
        if (await boxOf(page, seat.id)) seen.add(seat.id)
      }
    }
    const missing = SEATED.filter((s) => !seen.has(s.id)).map((s) => s.id)
    expect(missing, 'the audit names something no screen renders').toEqual([])
  })

  test('measures the room chrome against the world box, not the viewport', async ({ page }) => {
    await boot(page, '?room=deep&rolls=1')
    for (const seat of SEATED_WORLD) {
      const text = await boxOf(page, seat.id)
      if (!text) continue
      assertSeated('the world', seat, text, await regionOf(page, '#world', seat))
    }
  })

  test('gives every hand on the card a real touch target', async ({ page }) => {
    // **The measurement this whole change exists for.** The card used to sit in
    // the well, which the painting gives 51% of the plate's width to, and
    // twelve hands in a 194 x 43 box came out at 47 x 21 px each — against a
    // 44px floor this project states in its own CLAUDE.md, carried as a
    // documented exception rather than fixed. Choosing a line is the whole
    // decision an attack is made of; it is the last press that should be hard
    // to hit.
    await boot(page, '?room=hollow&mode=combat&rolls=1')
    const cells = page.locator('#scorecard .score-entry')
    await expect(cells).not.toHaveCount(0)
    for (const cell of await cells.all()) {
      const box = (await cell.boundingBox())!
      const hand = await cell.getAttribute('data-hand')
      expect(box.height, `${hand} is under the touch floor`).toBeGreaterThanOrEqual(44)
      expect(box.width, `${hand} is under the touch floor`).toBeGreaterThanOrEqual(44)
    }
  })

  test('fits every hand’s label on one line, without clipping it', async ({ page }) => {
    // `copy.test.ts` caps the label length; this is what that cap is *for*. A
    // name that overflows its cell is the failure the cap exists to prevent, so
    // the cap is checked against the real cell rather than believed.
    await boot(page, '?room=hollow&mode=combat&rolls=1')
    for (const name of await page.locator('#scorecard .score-name').all()) {
      const fits = await name.evaluate(
        (n) => n.scrollWidth <= n.clientWidth + 1 && n.getClientRects().length === 1,
      )
      expect(fits, `${await name.textContent()} does not fit its cell on one line`).toBe(true)
    }
  })

  test('shows only the lines the dice actually make', async ({ page }) => {
    // The card used to print all twelve at every moment. What it draws now is
    // exactly the legal set — never a greyed row to search past, and never a
    // struck-through one.
    await boot(page, '?room=hollow&mode=combat&rolls=1&dice=5,5,5,2,2,4')
    const hands = await page.locator('#scorecard .score-entry').evaluateAll((ns) =>
      ns.map((n) => (n as HTMLElement).dataset['hand']),
    )
    expect(hands).toEqual(['pair', 'two-pair', 'triple', 'full-house'])
    // Every one of them a real button, because every one of them is playable.
    await expect(page.locator('#scorecard button.score-entry')).toHaveCount(4)
  })

  test('keeps the whole card to one row inside the well', async ({ page }) => {
    // Five legal lines is the most that can ever happen — counted over all
    // 46 656 rolls — so the row never needs to become a grid, and the recess
    // never needs the card to leave it.
    await boot(page, '?room=hollow&mode=combat&rolls=1&dice=6,6,6,6,6,6')
    const tops = await page.locator('#scorecard .score-entry').evaluateAll((ns) =>
      [...new Set(ns.map((n) => Math.round(n.getBoundingClientRect().top)))],
    )
    expect(tops, 'the card wrapped to a second row').toHaveLength(1)
  })

  test('keeps the pile count inside the glass that holds it', async ({ page }) => {
    // The one that was actually wrong, stated on its own so the regression has
    // a name: the number is centred on the orb, not on a box beside it.
    await boot(page, '?room=hollow&bones=17')
    const orb = (await page.locator('#orb').boundingBox())!
    const count = (await page.locator('#pile').boundingBox())!
    expect(Math.abs(count.x + count.width / 2 - (orb.x + orb.width / 2))).toBeLessThanOrEqual(1)
  })

  test('names every text element the plate carries', async ({ page }) => {
    // The other direction: a word added to the well or a bay without a row in
    // the audit is a word nothing is holding to its plate.
    await boot(page, '?room=deep&rolls=1&iron=5&items=grave-candle&talismans=pair-talisman&vials=1')
    const named = new Set(SEATED.map((s) => s.id))
    const loose = await page.evaluate(
      (ids) => {
        const out: string[] = []
        const hosts = ['#well', '#satchel', '#talismans', '#beds']
        for (const host of hosts) {
          const root = document.querySelector(host)
          if (!root) continue
          for (const node of root.querySelectorAll('*')) {
            const text = (node.textContent ?? '').trim()
            if (!text || node.childElementCount > 0) continue
            // Is this node, or an ancestor inside the host, named by the audit?
            let named = false
            for (const id of ids) {
              if (node.closest(id as string)) named = true
            }
            if (!named) out.push(`${host} ${node.className || node.tagName}: ${text.slice(0, 24)}`)
          }
        }
        return out
      },
      [...named],
    )
    // The scorecard's own entries are inside `#scorecard`, which the audit
    // names; anything else that turns up here is a word with no plate.
    expect(loose, 'a word on the plate is in no region the audit names').toEqual([])
  })
})

/**
 * The well is **one centred region**, in every state it has.
 *
 * It always meant to be — `.well` has said `text-align: center` since it was
 * built — but the routes overrode it to `left`, and the routes are what the
 * well carries in most rooms of most runs. So the tray's commonest state was
 * the one state that read as a differently built tray: a room with two ways
 * out sat its words hard against the left edge of a recess whose every other
 * occupant is centred in it.
 */
test.describe('the well is one centred region', () => {
  const WELL_STATES: readonly (readonly [string, string])[] = [
    ['a fork, with two ways on', '?room=cleft'],
    ['a room with one way on', '?room=entry'],
    ['a room with a thing standing in it', '?room=hollow'],
    ['the chapel, before the font', '?room=sanctuary&bones=12'],
    ['a room that is shut', '?room=offertory'],
    ['a fight, mid-throw', '?room=hollow&mode=combat&rolls=1'],
  ]

  for (const [state, fixture] of WELL_STATES) {
    test(state, async ({ page }) => {
      await boot(page, fixture)
      const off = await page.evaluate(() => {
        const out: string[] = []
        const well = document.getElementById('well')!
        for (const node of well.querySelectorAll('*')) {
          const align = getComputedStyle(node).textAlign
          // `start`/`end` are the logical spellings of left and right, and a
          // button's own centring is its own business — what is audited here is
          // prose, which is anything with words and no element children.
          const prose = (node.textContent ?? '').trim() !== '' && node.childElementCount === 0
          if (!prose || node.closest('button')) continue
          if (align !== 'center') out.push(`${node.className || node.tagName}: ${align}`)
        }
        return out
      })
      expect(off, 'a line in the well is not centred in it').toEqual([])
    })
  }

  test('centres the wrapped half of a fork’s consequence, not just its first line', async ({
    page,
  }) => {
    // The well no longer carries the fork: the ways out are hotspots in the
    // picture and each says what it costs beneath its own label. The claim the
    // routes block used to answer still holds, on the thing that replaced it —
    // declaring `text-align: center` is not the same as looking centred, and a
    // consequence is a sentence that wraps more often than not. This measures
    // the **last visual line** of each one against the doorway it hangs under,
    // which is the thing an eye actually judges. The fork is the room that
    // proves it: its deep leg carries a sentence too long for one line at 390.
    await boot(page, '?room=fork')
    const drift = await page.evaluate(() => {
      const out: number[] = []
      for (const sense of document.querySelectorAll('.exit-sense')) {
        const box = sense.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(sense)
        const lines = [...range.getClientRects()].filter((r) => r.width > 0)
        const last = lines[lines.length - 1]
        if (!last || lines.length < 2) continue
        out.push(last.left + last.width / 2 - (box.left + box.width / 2))
      }
      return out
    })
    expect(drift.length, 'no consequence wrapped, so nothing was measured').toBeGreaterThan(0)
    for (const d of drift) {
      expect(Math.abs(d), `a wrapped consequence line sits ${d.toFixed(1)}px off centre`).
        toBeLessThanOrEqual(2)
    }
  })
})
