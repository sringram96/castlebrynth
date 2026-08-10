import { expect, test } from '@playwright/test'

import {
  act,
  boot,
  bones,
  enemyBones,
  livingBones,
  screenName,
  state,
  toFirstFight,
  valuesOf,
  where,
} from './helpers.js'
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

  test('starting a run lands in the first room with thirty bones', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()

    await expect(page.locator('#screen')).toBeHidden()
    await expect(page.locator('#backdrop')).toBeVisible()
    await expect(page.locator('#tray')).toBeVisible()
    await expect(page.locator('#say')).toContainText('The stair ends in a long hall')

    // The pile is the life, and it reads at arm's length.
    await expect(page.locator('#pile')).toHaveText('30')
    await expect(page.locator('#pile')).toHaveAttribute('aria-label', '30 living bones')
    // Out of a fight there is no line. Six sockets pretending to be a hand
    // would be the old game's furniture left standing.
    await expect(bones(page)).toHaveCount(0)
  })

  test('carries no trace of the game this replaced', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    const body = await page.locator('body').innerHTML()
    for (const gone of ['data-act="roll"', 'data-act="reroll"', 'data-act="score"', 'score-formula']) {
      expect(body, `${gone} is still in the DOM`).not.toContain(gone)
    }
    const run = (await state(page)).run as unknown as Record<string, unknown>
    expect(run).not.toHaveProperty('hp')
    expect(run).not.toHaveProperty('dice')
    expect(run).not.toHaveProperty('relics')
  })

  test('looking is free, always answers, and never commits', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()

    const before = await livingBones(page)
    const details = page.locator('#hits .hit')
    const count = await details.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await details.nth(i).click()
      await expect(page.locator('#say')).toBeVisible()
      await expect(page.locator('#say')).not.toBeEmpty()
    }

    expect(await livingBones(page)).toBe(before)
    expect(await where(page)).toBe('entry')
  })

  test('MENU states the army, the satchel and the four rules', async ({ page }) => {
    await boot(page, '?room=fork&specials=knuckle&vials=2&charms=1')

    await act(page, 'menu').click()
    const overlay = page.locator('#overlay')

    await expect(overlay.locator('#army-total')).toContainText('BONES')
    await expect(overlay).toContainText('Common bones')
    await expect(overlay).toContainText('Knuckle')
    await expect(overlay).toContainText('4, 5, 6, 6, 7, 8.')

    await expect(overlay).toContainText('Vial')
    await expect(overlay).toContainText('Charm')
    await expect(overlay).toContainText('5 common bones back, up to 30 in all')

    // The whole game, in four lines, and nothing else. No scoring ladder.
    await expect(overlay.locator('#rules li')).toHaveCount(4)
    await expect(overlay).toContainText('The enemy throws first.')
    await expect(overlay).toContainText('High kills low. Ties kill both.')
    await expect(overlay).not.toContainText('FULL HOUSE')
    await expect(overlay).not.toContainText('multiplier')

    await act(page, 'close').click()
    await expect(overlay).toBeHidden()
  })

  test('the enemy is visible before any combat control appears', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)

    // Still exploring: no line, no verb, and the monster already fills the
    // scene. This is the P0 the reset exists to fix.
    await expect(act(page, 'field')).toHaveCount(0)
    await expect(bones(page)).toHaveCount(0)
    const enemy = page.locator('#enemy')
    await expect(enemy).toBeVisible()
    await expect(enemy).toHaveAttribute('data-enemy', 'present')

    // And the well says what it is, before the fight is entered.
    await expect(page.locator('#well')).toContainText('The Gnawing')
  })
})

test.describe('the first fight', () => {
  test('the enemy throws first, and its line is public before any decision', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)
    await act(page, 'fight').click()

    // Face-up, sorted, and up *before* FIELD exists as a press.
    const line = await valuesOf(enemyBones(page))
    expect(line.length).toBeGreaterThan(0)
    expect([...line].sort((a, b) => b - a)).toEqual(line)
    for (const value of line) expect(value).toBeGreaterThanOrEqual(1)

    // Every one of them is readable as text, not only as pips.
    for (let i = 0; i < line.length; i++) {
      await expect(enemyBones(page).nth(i)).toHaveAttribute(
        'aria-label',
        `Its bone, rolled ${line[i]}`,
      )
    }
    await expect(act(page, 'field')).toBeVisible()
  })

  test('the width can be reduced below six, and FIELD commits exactly that', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)
    await act(page, 'fight').click()

    const stepper = page.locator('#width')
    await expect(stepper).toHaveAttribute('data-width', '6')
    await act(page, 'width-down').click()
    await act(page, 'width-down').click()
    await expect(stepper).toHaveAttribute('data-width', '4')
    await expect(bones(page)).toHaveCount(4)

    await act(page, 'field').click()
    expect((await state(page)).run!.combat!.field).toEqual({ width: 4, specialIds: [] })
    // Committed, and face-down: no value has been decided.
    await expect(bones(page)).toHaveCount(4)
    for (const value of await valuesOf(bones(page))) expect(Number.isNaN(value)).toBe(true)
  })

  test('the stepper stops at one and at the pile, and is absent at its ends', async ({ page }) => {
    await boot(page, '?room=hollow&bones=2&mode=combat')
    await expect(page.locator('#width')).toHaveAttribute('data-width', '2')
    // Two bones alive: there is no seventh, and there is no third.
    await expect(act(page, 'width-up')).toHaveCount(0)
    await act(page, 'width-down').click()
    await expect(page.locator('#width')).toHaveAttribute('data-width', '1')
    await expect(act(page, 'width-down')).toHaveCount(0)
  })

  test('THROW rolls exactly the committed width, sorted high to low', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)
    await act(page, 'fight').click()
    await act(page, 'width-down').click()
    await act(page, 'field').click()
    await act(page, 'throw').click()

    const line = await valuesOf(bones(page))
    expect(line).toHaveLength(5)
    expect([...line].sort((a, b) => b - a)).toEqual(line)
    for (const value of line) expect(value).toBeGreaterThanOrEqual(1)
  })

  test('there is one throw: no REROLL exists anywhere', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat&phase=rolled')
    await expect(act(page, 'reroll')).toHaveCount(0)
    await expect(act(page, 'throw')).toHaveCount(0)
    await expect(act(page, 'smash')).toBeVisible()
  })

  test('one phase, one verb: the four are never on screen together', async ({ page }) => {
    const verbs = ['field', 'throw', 'smash', 'round']
    for (const phase of ['thrown', 'fielded', 'rolled']) {
      await boot(page, `?room=hollow&mode=combat&phase=${phase}`)
      let showing = 0
      for (const verb of verbs) showing += await act(page, verb).count()
      expect(showing, `${phase} offers ${showing} combat verbs`).toBe(1)
    }
  })

  test('SMASH resolves the lanes exactly, and the dead stay dead', async ({ page }) => {
    await boot(page, '?room=hollow&mode=combat&phase=rolled&seed=9')

    const mine = await valuesOf(bones(page))
    const theirs = await valuesOf(enemyBones(page))
    const paired = Math.min(mine.length, theirs.length)

    await act(page, 'smash').click()

    // Every paired lane, checked against the two numbers that were on screen.
    for (let lane = 0; lane < paired; lane++) {
      const myBone = bones(page).nth(lane)
      const itsBone = enemyBones(page).nth(lane)
      const myBroken = (await myBone.getAttribute('data-broken')) === 'yes'
      const itsBroken = (await itsBone.getAttribute('data-broken')) === 'yes'
      if (mine[lane]! > theirs[lane]!) {
        expect(myBroken, `lane ${lane}: mine won and broke`).toBe(false)
        expect(itsBroken, `lane ${lane}: mine won and its bone lived`).toBe(true)
      } else if (mine[lane]! < theirs[lane]!) {
        expect(myBroken, `lane ${lane}: mine lost and lived`).toBe(true)
      } else {
        // A normal tie kills both.
        expect(myBroken && itsBroken, `lane ${lane}: a tie spared somebody`).toBe(true)
      }
    }

    // Unpaired bones fought nothing, and the screen says so.
    for (let lane = paired; lane < mine.length; lane++) {
      await expect(bones(page).nth(lane)).toHaveAttribute('data-safe', 'yes')
    }

    // And the casualties are gone from the pile, for good.
    const smash = (await state(page)).run!.combat!.lastSmash!
    const lost = smash.playerCommonLost + smash.playerSpecialsLost.length
    expect(await livingBones(page)).toBe(30 - lost)

    if ((await act(page, 'round').count()) > 0) {
      await act(page, 'round').click()
      // A new round, a new line, and nothing resurrected.
      expect((await state(page)).run!.combat!.round).toBe(2)
      expect(await livingBones(page)).toBe(30 - lost)
    }
  })

  test('the first fight can be won by pressing buttons', async ({ page }) => {
    await boot(page)
    await toFirstFight(page)
    expect(await fightItOut(page)).toBe('won')
    if ((await screenName(page)) === 'reward') {
      await expect(page.locator('#offers .offer').first()).toBeVisible()
    }
  })
})
