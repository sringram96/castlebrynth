/**
 * The input contract, in a fight.
 *
 * Every visible verb is a real button that answers a real tap at its own
 * centre; art is `pointer-events: none`; an unavailable action is absent
 * rather than greyed. These are the failures a logical suite cannot see.
 */

import { expect, test } from '@playwright/test'

import { act, boot, bones, enemyBones, tappable, trayControls, valuesOf } from './helpers.js'

const PHASES = ['thrown', 'fielded', 'rolled', 'smashed'] as const

test.describe('every control answers a tap', () => {
  for (const phase of PHASES) {
    test(`in ${phase}`, async ({ page }) => {
      await boot(page, `?room=hollow&specials=knuckle&charms=1&vials=1&mode=combat&phase=${phase}`)
      const controls = await trayControls(page)
      expect(controls.length, 'the tray offered nothing').toBeGreaterThan(0)
      for (const control of controls) await tappable(page, control)
    })
  }

  test('exploring', async ({ page }) => {
    await boot(page, '?room=fork&vials=1&charms=1&specials=knuckle')
    for (const control of await trayControls(page)) await tappable(page, control)
  })
})

test.describe('art never eats a press', () => {
  test('the tray plate and every bone face are inert', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat&phase=rolled')
    const inert = await page.evaluate(() =>
      [...document.querySelectorAll('#tray-frame, .bone-face, .pip, #enemy, #backdrop')].map(
        (n) => getComputedStyle(n).pointerEvents,
      ),
    )
    expect(inert.length).toBeGreaterThan(0)
    for (const value of inert) expect(value).toBe('none')
  })
})

test.describe('an unavailable action is absent', () => {
  test('nothing on the tray is ever disabled', async ({ page }) => {
    for (const phase of PHASES) {
      await boot(page, `?room=hollow&mode=combat&phase=${phase}`)
      await expect(page.locator('#tray button[disabled]')).toHaveCount(0)
      await expect(page.locator('#tray [aria-disabled="true"]')).toHaveCount(0)
    }
  })

  test('a fight with no reward offers nothing to take', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat&phase=thrown')
    await expect(act(page, 'take')).toHaveCount(0)
    await expect(act(page, 'skip')).toHaveCount(0)
  })
})

test.describe('the lines are readable', () => {
  test('DOM order is lane order, on both sides', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=rolled&seed=12')

    for (const line of [bones(page), enemyBones(page)]) {
      const lanes = await line.evaluateAll((nodes) =>
        nodes.map((n) => Number((n as HTMLElement).dataset['lane'])),
      )
      expect(lanes).toEqual([...lanes].sort((a, b) => a - b))
      const values = await valuesOf(line)
      expect([...values].sort((a, b) => b - a)).toEqual(values)
    }
  })

  test('every bone states its number as text', async ({ page }) => {
    await boot(page, '?room=gate&specials=knuckle&mode=combat&phase=rolled&seed=3')
    for (const bone of await bones(page).all()) {
      const label = await bone.getAttribute('aria-label')
      const value = await bone.getAttribute('data-value')
      expect(label, 'a bone has no accessible name').toBeTruthy()
      expect(label).toContain(`rolled ${value}`)
    }
  })

  test('a named bone carries its name in its accessible name', async ({ page }) => {
    await boot(page, '?room=gate&specials=knuckle&mode=combat&phase=rolled&width=6&seed=3')
    const named = page.locator('#crown .bone[data-special-id="knuckle"]')
    if ((await named.count()) > 0) {
      await expect(named.first()).toHaveAttribute('aria-label', /^Knuckle, rolled \d/)
    }
  })

  test('a seven and an eight print their number, because no pattern says them', async ({ page }) => {
    await boot(page, '?room=fork&specials=knuckle')
    await act(page, 'menu').click()
    // The face key in MENU carries one through eight.
    const eight = page.locator('.face-key .bone-face[data-value="8"]')
    await expect(eight).toHaveCount(1)
    await expect(eight.locator('.bone-numeral')).toHaveText('8')
    await expect(page.locator('.face-key .bone-face[data-value="6"] .bone-numeral')).toHaveCount(0)
  })
})

test.describe('the well says what the phase wants', () => {
  const lines: Readonly<Record<string, string>> = {
    thrown: 'Choose how many bones to risk.',
    fielded: 'Throw them.',
    rolled: 'Line them up and smash.',
    smashed: 'What is broken is broken.',
  }

  for (const [phase, line] of Object.entries(lines)) {
    test(`${phase} asks for its decision`, async ({ page }) => {
      // The Marrow throughout: it carries reserves, so a smash leaves a fight
      // standing rather than a cleared room with nothing to say.
      await boot(page, `?room=deep&mode=combat&phase=${phase}`)
      await expect(page.locator('#well')).toContainText(line)
    })
  }

  test('shows both counts before anything is committed', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown')
    const read = page.locator('#field-read')
    await expect(read).toHaveAttribute('data-player-count', '6')
    // The Marrow fields six of its nine.
    await expect(read).toHaveAttribute('data-enemy-count', '6')
  })

  test('summarises a smash in the two numbers that matter', async ({ page }) => {
    // The Marrow, because it has reserves: a five-bone army can be wiped in
    // one round and there would be no fight left to read a summary in.
    await boot(page, '?room=deep&mode=combat&phase=smashed&seed=7')
    const summary = page.locator('#smash-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('LOST')
    await expect(summary).toContainText('BROKEN')
  })
})

test.describe('the enemy HUD', () => {
  test('counts bones rather than drawing a health bar', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown')
    const count = page.locator('#enemy-bones')
    await expect(count).toContainText('BONES')
    await expect(count).toHaveAttribute('data-bones', '9')
    // Nothing that used to be there.
    await expect(page.locator('#enemy-hp')).toHaveCount(0)
    await expect(page.locator('.meter')).toHaveCount(0)
    await expect(page.locator('#intent')).toHaveCount(0)
  })

  test('prints an encounter rule where there is one', async ({ page }) => {
    await boot(page, '?room=deep&mode=combat&phase=thrown')
    await expect(page.locator('#enemy-rule')).toBeVisible()
    await tappable(page, page.locator('#enemy-rule'))
  })
})
