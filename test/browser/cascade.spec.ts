/**
 * The cascade, through real presses, at 390 × 844.
 *
 * This is the arbiter for the loadout wave. The unit suite proves the reducer
 * settles the right numbers; what is proved here is that a person watching the
 * screen is shown them **in the ruled order, on the things that made them**:
 *
 *   (a) every core die pops its own value, on itself;
 *   (b) the readout resolves `sum × line` — before anything is added to it;
 *   (c) the item dice fire, on the item dice, and a cost lands on the pile;
 *   (d) the talisman fires, on the talisman;
 *   (e) the total lands on the enemy;
 *   (f) the enemy answers, less what the iron held — unless it is dead.
 *
 * The order is asserted with the `watch()` MutationObserver in `helpers.ts`
 * rather than by polling: a poll only ever catches whichever beat happened to
 * be up when it looked, and the claim under test is about *sequence*.
 *
 * Every seed below is pinned, and each is chosen for the case it produces —
 * a cost face firing, an iron blank, a talisman line — so nothing here is
 * skipped and nothing depends on a lucky throw.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  act,
  boot,
  dice,
  livingBones,
  pops,
  screenName,
  state,
  valuesOf,
  watch,
  watchPops,
  watched,
} from './helpers.js'

const settle = (page: Page): Promise<void> =>
  page.evaluate(() => window.castlebrynth?.settle())

const animating = (page: Page): Promise<boolean> =>
  page.evaluate(() => window.castlebrynth?.animating() ?? false)

/**
 * A fight standing on six known faces, with an item die that fires a **flat**.
 *
 * Seed 5 rolls `+8` on the Splinter Fetish at this position in the stream, and
 * `?iron=5` stands the plate on a five. `6 6 6 4 4 3` sums to 29.
 *
 * The whole loadout is named. A fresh run starts with **nothing** now — the
 * iron is in the cage and the talisman is in the Reliquary — so a fixture that
 * wants a cascade with things in it has to say which things, which is the
 * honest shape: every one of them is a thing the run found somewhere.
 */
const CARRYING = 'items=splinter-fetish&talismans=pair-talisman'
const FLAT = `?seed=5&room=deep&bones=26&rolls=3&dice=6,6,6,4,4,3&${CARRYING}&iron=5`

/** The same, on a seed whose Splinter Fetish comes up on a **cost** face. */
const COST = `?seed=2&room=deep&bones=26&rolls=3&dice=6,6,6,4,4,3&${CARRYING}&iron=5`

/** The same, with the iron come up **empty**. */
const BLANK = `?seed=5&room=deep&bones=26&rolls=3&dice=6,6,6,4,4,3&${CARRYING}&iron=0`

test.describe('the beats, in order', () => {
  test('resolves the line before the items fire, and answers after the blow', async ({ page }) => {
    await boot(page, FLAT, { motion: true })
    await watch(page, '#tray', 'data-cascade')

    // PAIR is ×1, so the line contributes 29 and the talisman answers to it.
    await page.locator('.score-entry[data-hand="pair"]').click()
    await expect.poll(() => animating(page), { timeout: 8000 }).toBe(false)

    const beats = await watched(page)
    expect(beats).toEqual(['sum', 'line', 'items', 'talisman', 'total'])
  })

  test('pops every core die on itself, and the item result on the item die', async ({ page }) => {
    await boot(page, FLAT, { motion: true })
    const faces = await valuesOf(dice(page))
    await watchPops(page)

    await page.locator('.score-entry[data-hand="pair"]').click()
    await expect.poll(() => animating(page), { timeout: 8000 }).toBe(false)

    const seen = await pops(page)
    // Each of the six, on its own die, showing its own face.
    for (let index = 0; index < 6; index++) {
      expect(seen, `die ${index} never popped its value`).toContainEqual({
        on: `bone:${index}`,
        text: String(faces[index]),
      })
    }
    // The item's result, on the item die — not on an aggregate — **carrying
    // its own name**. A `+8` over an unlabelled object is a number whose cause
    // the player has to have already memorised; the name is what welds the
    // face to the card that stated it, and it is printed every time.
    expect(seen).toContainEqual({ on: 'item-die:0', text: 'Splinter Fetish+8' })
    // And the talisman's flat, on the talisman, named the same way.
    expect(seen).toContainEqual({ on: 'talisman-slot', text: 'Talisman of the Pair+12' })
    // Nothing flew anywhere. Every pop was anchored to a die, the talisman or
    // the pile — there is no aggregate for a number to migrate to.
    for (const pop of seen) {
      expect(pop.on, `${pop.text} popped on ${pop.on}`).toMatch(/^(bone|item-die|talisman-slot)/)
    }
  })

  test('states what the iron is holding before anything is committed', async ({ page }) => {
    await boot(page, FLAT)
    // Before the press. The caption is the settled terrain of the turn, and it
    // is readable while the decision is still open.
    await expect(page.locator('#iron-caption')).toContainText('Rustplate holds: blocks 5 this turn.')
    await expect(page.locator('#iron .iron-die')).toHaveAttribute('data-block', '5')
    await expect(page.locator('.score-entry[data-hand="pair"]')).toBeVisible()
  })

  test('says the iron came up empty, in the same place, when it did', async ({ page }) => {
    await boot(page, BLANK)
    await expect(page.locator('#iron-caption')).toContainText('Rustplate came up empty.')
    await expect(page.locator('#iron .iron-die')).toHaveAttribute('data-block', '0')

    // And the answer is the enemy's own number, undiminished.
    await page.locator('.score-entry[data-hand="pair"]').click()
    expect((await state(page)).run!.combat!.lastAttack!.retaliation).toBe(5)
  })
})

test.describe('the readout is the only aggregate', () => {
  test('fills in rather than jumping, and lands on the total', async ({ page }) => {
    await boot(page, FLAT, { motion: true })
    await expect(page.locator('#readout')).toHaveText('29')
    await watch(page, '#readout', 'data-stage')

    await page.locator('.score-entry[data-hand="pair"]').click()
    await expect.poll(() => animating(page), { timeout: 8000 }).toBe(false)
    expect(await watched(page)).toEqual(['sum', 'line', 'items', 'talisman', 'total'])
  })

  test('there is exactly one running total on the screen', async ({ page }) => {
    await boot(page, FLAT)
    await expect(page.locator('#readout')).toHaveCount(1)
    // The two rejected versions: no receipt region, and no aggregate for a
    // fly-away number to land in. Neither returns without a product decision.
    await expect(page.locator('#attack-sum')).toHaveCount(0)
    await expect(page.locator('#receipt, .receipt, #totals')).toHaveCount(0)
  })

  test('resolves to the whole equation, with the flats named', async ({ page }) => {
    await boot(page, FLAT)
    // 29 × 1 = 29, +8 from the die, +12 from the talisman: 49.
    await page.locator('.score-entry[data-hand="pair"]').click()
    await settle(page)
    const readout = page.locator('#readout')
    await expect(readout).toHaveAttribute('data-base', '29')
    await expect(readout).toHaveAttribute('data-total', '49')
    await expect(readout).toContainText('29 × 1 = 29 +8 +12 = 49')
  })
})

test.describe('a cost is a cost', () => {
  test('charges at the item beat, on the pile, and the blow still lands', async ({ page }) => {
    await boot(page, COST, { motion: true })
    await watchPops(page)
    const before = await livingBones(page)
    expect(before).toBe(26)

    await page.locator('.score-entry[data-hand="pair"]').click()
    await expect.poll(() => animating(page), { timeout: 8000 }).toBe(false)

    const record = (await state(page)).run!.combat!.lastAttack!
    expect(record.itemCost).toBe(2)
    expect(record.landed).toBe(true)
    // Two for the cost, and the Marrow's five less the iron's five: nothing.
    expect(record.retaliation).toBe(0)
    expect(await livingBones(page)).toBe(24)
    // The cost landed on the player's health, which is where a cost is paid.
    expect(
      (await pops(page)).some((p) => p.on === 'item-die:0' && p.text === 'Splinter Fetish−2'),
    ).toBe(true)
  })

  test('ends the run at the item beat, and the blow never lands', async ({ page }) => {
    // Two bones and a cost face. The pile empties before the blow, so the
    // enemy is untouched and the line is not spent. Revisable ruling,
    // asserted: see docs/COMBAT.md § Costs.
    await boot(page, `?seed=2&room=deep&bones=2&rolls=3&dice=6,6,6,4,4,3&${CARRYING}&iron=5`)
    const full = (await state(page)).run!.combat!.enemyHp

    await page.locator('.score-entry[data-hand="pair"]').click()
    await expect.poll(() => screenName(page), { timeout: 8000 }).toBe('dead')

    const record = (await state(page)).run!.combat!.lastAttack!
    expect(record.landed).toBe(false)
    expect(record.damage).toBe(0)
    expect(record.enemyHpAfter).toBe(record.enemyHpBefore)
    expect((await state(page)).run!.combat!.enemyHp).toBe(full)
    expect((await state(page)).run!.combat!.usedHands).toEqual([])
    expect((await state(page)).run!.bones).toBe(0)
    await expect(page.locator('#screen')).toContainText('cost')
  })
})

test.describe('a reload lands on the settled truth', () => {
  const matrix: readonly [string, string][] = [
    ['before the throw', `?seed=5&room=deep&mode=combat&${CARRYING}`],
    ['with the dice down', FLAT],
    ['with the iron empty', BLANK],
    ['carrying nothing at all', '?seed=5&room=deep&rolls=1&iron=none&items=none&talismans=none'],
  ]

  for (const [where, fixture] of matrix) {
    test(where, async ({ page }) => {
      await boot(page, fixture)
      const before = JSON.stringify((await state(page)).run)
      await page.reload()
      await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
      // A fixture replaces the save rather than merging with it, so what a
      // reload lands on is the same fixture applied to the same seed — which
      // is exactly the property under test: the position is derived, not
      // remembered, and it cannot drift.
      expect(JSON.stringify((await state(page)).run)).toBe(before)
    })
  }

  test('mid-cascade, on the settled record rather than a half-played one', async ({ page }) => {
    await boot(page, FLAT, { motion: true })
    await page.locator('.score-entry[data-hand="pair"]').click()
    // The press has returned. The whole exchange is already saved.
    const during = (await state(page)).run!.combat!.lastAttack!
    expect(during.damage).toBe(49)
    expect(during.itemFlats).toBe(8)
    expect(during.talismanFlat).toBe(12)
    expect(during.block).toBe(5)

    const settledBefore = JSON.stringify((await state(page)).run)
    await settle(page)
    expect(JSON.stringify((await state(page)).run)).toBe(settledBefore)
  })
})

test.describe('motion off reaches the same numbers, in the same tick', () => {
  test('the whole cascade is readable without watching anything', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, FLAT, { motion: true })
    await page.locator('.score-entry[data-hand="pair"]').click()

    expect(await animating(page)).toBe(false)
    // Every number the cascade would have shown is stated, at once, as text.
    await expect(page.locator('#readout')).toHaveAttribute('data-total', '49')
    await expect(page.locator('#enemy-hp')).toHaveAttribute('data-hp', '71')
    expect(await livingBones(page)).toBe(26)
    await expect(page.locator('#say')).toContainText('49')
    await expect(page.locator('#say')).toContainText('The iron takes all of it')
  })

  test('the same presses produce the same exchange with motion on', async ({ page }) => {
    const attack = async (): Promise<string> => {
      await page.locator('.score-entry[data-hand="pair"]').click()
      await settle(page)
      return JSON.stringify((await state(page)).run!.combat!.lastAttack)
    }

    await boot(page, FLAT, { motion: true })
    const withMotion = await attack()

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, FLAT, { motion: true })
    expect(await attack()).toBe(withMotion)
  })

  test('a cost is charged either way', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, COST, { motion: true })
    await page.locator('.score-entry[data-hand="pair"]').click()
    expect(await livingBones(page)).toBe(24)
  })
})

test.describe('an item die has no press that changes anything', () => {
  test('there is no verb for it anywhere, in any position of an attack', async ({ page }) => {
    const positions = [
      '?seed=5&room=deep&mode=combat&iron=5&items=grave-candle,splinter-fetish',
      '?seed=5&room=deep&rolls=1&iron=5&items=grave-candle,splinter-fetish',
      '?seed=5&room=deep&rolls=3&iron=5&items=grave-candle,splinter-fetish',
    ]
    for (const fixture of positions) {
      await boot(page, fixture)
      await expect(page.locator('#items .item-die')).toHaveCount(2)
      // The only press on the rail is a **reading**. There is no roll, no
      // reroll, no fire, and no hold — the whole of the ruling is that an item
      // die is a treat that lands mid-cascade rather than a fourth decision,
      // and reading a card is not a decision in the attack.
      for (const host of ['#items', '#iron']) {
        const acts = await page
          .locator(`${host} button`)
          .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset['act']))
        for (const found of acts) expect(found, `${host} offers ${found}`).toBe('inspect-slot')
      }
      for (const gone of ['item-roll', 'item-reroll', 'fire-item', 'iron-reroll']) {
        await expect(act(page, gone), `${gone} is on the tray`).toHaveCount(0)
      }
    }
  })

  test('reading a slot changes nothing at all', async ({ page }) => {
    await boot(page, FLAT)
    const before = await state(page)
    await page.locator('#items .item-die').first().click()
    await expect(page.locator('#overlay')).toBeVisible()
    // The card, with the die's own faces on it.
    await expect(page.locator('#overlay .faces .face-chip').first()).toBeVisible()
    await act(page, 'close').click()
    const after = await state(page)
    expect(after).toEqual(before)
  })

  test('is not offered at all while the cascade is running', async ({ page }) => {
    // Never interruptive: a card opening over the middle of an attack would
    // cover the one thing the cascade exists to show. Hidden, not disabled.
    await boot(page, FLAT, { motion: true })
    await page.locator('.score-entry[data-hand="pair"]').click()
    await expect(page.locator('#items button')).toHaveCount(0)
    await expect(page.locator('#iron button')).toHaveCount(0)
    await expect.poll(() => animating(page), { timeout: 8000 }).toBe(false)
    // And back the instant the screen settles.
    await expect(page.locator('#items button[data-act="inspect-slot"]').first()).toBeVisible()
  })

  test('the faces themselves are art, and never eat a press', async ({ page }) => {
    await boot(page, FLAT)
    const inert = await page.evaluate(() =>
      [...document.querySelectorAll('.iron-face, .item-face')].map(
        (n) => getComputedStyle(n).pointerEvents,
      ),
    )
    expect(inert.length).toBeGreaterThan(0)
    for (const value of inert) expect(value).toBe('none')
  })

  test('REROLL throws the six and leaves the iron exactly as it was', async ({ page }) => {
    await boot(page, '?seed=5&room=deep&rolls=1&iron=3&items=splinter-fetish')
    const block = await page.locator('#iron .iron-die').getAttribute('data-block')
    const caption = await page.locator('#iron-caption').textContent()
    await dice(page).nth(0).click()
    await act(page, 'reroll').click()
    await settle(page)
    await expect(page.locator('#iron .iron-die')).toHaveAttribute('data-block', block!)
    await expect(page.locator('#iron-caption')).toHaveText(caption!)
  })
})
