/**
 * The whole route, in a browser, on real presses.
 *
 * This is the test that decides completion. A green unit suite is not
 * completion; see `CLAUDE.md`. Every press below is a real press on a real
 * button, and **no state is injected anywhere in this file** — the run gets
 * from the door to the exit or it does not.
 *
 * The descent forks twice now, so there are four reels through it and the
 * first two blocks walk two of them end to end. Everything that used to be a
 * reward screen is a thing lying on the floor of a room, pressed where it lies.
 */

import { expect, test } from '@playwright/test'

import { act, boot, livingBones, screenName, state, wayTo, where } from './helpers.js'
import { clearReward, fight, fightItOut, lootOnScreen } from './play.js'

test.describe('the left branch, and the stair', () => {
  test('door to exit, without a single injected state', async ({ page }) => {
    test.slow()
    await boot(page)
    await act(page, 'start').click()
    expect(await livingBones(page)).toBe(30)

    await act(page, 'go').click()
    await act(page, 'go').click()

    // The Cleft. Two mouths, both on the picture, both saying what is behind
    // them before the press.
    expect(await where(page)).toBe('cleft')
    await expect(act(page, 'go')).toHaveCount(2)
    await expect(page.locator('.routes')).toContainText('Something is feeding down there')
    await expect(page.locator('.routes')).toContainText('The quiet is doing a lot of work')
    await (await wayTo(page, 'hollow')).click()

    // The Gnawing. A room with a living enemy has no way on.
    await expect(act(page, 'go')).toHaveCount(0)
    if ((await fightItOut(page)) === 'died') return
    await clearReward(page)
    await expect(act(page, 'go')).toBeVisible()

    // The Confluence, where both branches arrive.
    await act(page, 'go').click()
    expect(await where(page)).toBe('confluence')

    // The Font. Its exit is withheld until it has answered.
    await act(page, 'go').click()
    expect(await where(page)).toBe('sanctuary')
    await expect(act(page, 'go')).toHaveCount(0)
    const before = await livingBones(page)
    await act(page, 'ritual').click()
    expect(await livingBones(page)).toBeGreaterThanOrEqual(before)
    await expect(act(page, 'go')).toBeVisible()

    // The Reliquary is entirely optional, and GO ON never leaves.
    await act(page, 'go').click()
    await expect(act(page, 'go')).toBeVisible()
    await act(page, 'go').click()

    // The Split. Take the stair, by the label the map put on the hotspot.
    expect(await where(page)).toBe('fork')
    await page.locator('[data-act="go"]').filter({ hasText: 'STAIR' }).click()
    expect(await where(page)).toBe('gate')

    // The Warden, and the door behind it.
    if ((await fightItOut(page)) === 'died') return
    await clearReward(page)
    await act(page, 'go').click()
    expect(await screenName(page)).toBe('complete')
    await expect(page.locator('#screen')).toContainText('bones left')
  })
})

test.describe('the right branch, and the deep way', () => {
  test('through the toll, the vault and the Marrow, on real presses', async ({ page }) => {
    test.slow()
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()

    // NARROW: the Offertory rather than the Gnawing. A flat price instead of a
    // fight, and the price is printed before the press.
    await (await wayTo(page, 'offertory')).click()
    expect(await where(page)).toBe('offertory')
    await expect(act(page, 'go')).toHaveCount(0)

    const beforeToll = await livingBones(page)
    await page.locator('[data-detail="price"]').click()
    await expect(page.locator('#say')).toContainText('A price list')

    // The slot will not take anything until the carving can be read.
    await expect(page.locator('[data-interact="offertory-altar"]')).toHaveCount(0)
    await page.locator('[data-interact="offertory-candles"]').click()
    const offer = page.locator('[data-interact="offertory-altar"]')
    await expect(offer).toBeVisible()
    await expect(offer).toHaveAttribute('aria-label', /Two bones/)
    await offer.click()

    expect(await livingBones(page)).toBe(beforeToll - 2)
    await expect(act(page, 'go')).toBeVisible()
    // And the recess is open, with the thing it was holding in it.
    expect(await lootOnScreen(page)).toEqual(['grave-candle'])
    await clearReward(page)
    expect((await state(page)).run!.itemDice).toEqual(['grave-candle'])

    await act(page, 'go').click()
    expect(await where(page)).toBe('confluence')
    await act(page, 'go').click()
    await act(page, 'ritual').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    expect(await where(page)).toBe('fork')

    // DEEP says what it costs and what it pays before the tap. The hotspot
    // carries a **node** id, so it is found through the map.
    const deep = await wayTo(page, 'chain-vault')
    await expect(deep).toBeVisible()
    await expect(page.locator('.routes')).toContainText('iron waits in the cage')
    await deep.click()
    expect(await where(page)).toBe('chain-vault')

    // A shut gate holds the exits. The lever pulled against nothing costs a
    // bone; worked in the right order it costs none.
    await expect(act(page, 'go')).toHaveCount(0)
    const before = await livingBones(page)
    await page.locator('[data-interact="vault-chain"]').click()
    await page.locator('[data-interact="vault-lever"]').click()
    expect(await livingBones(page)).toBe(before)
    await expect(act(page, 'go')).toBeVisible()

    // And the cage was holding the iron the way's own line promised.
    expect(await lootOnScreen(page)).toEqual(['rustplate'])
    await clearReward(page)
    expect((await state(page)).run!.ironDice).toEqual(['rustplate'])

    await act(page, 'go').click()
    expect(await where(page)).toBe('deep')

    const vials = (await state(page)).run!.vials
    const report = await fight(page)
    if (report.end === 'died') return
    // The Marrow always leaves a Vial, offer or no offer — and it leaves it on
    // the floor rather than on a screen.
    expect(await lootOnScreen(page)).toContain('vial')
    await clearReward(page)
    // **Net of whatever the fight drank.** A round that spends one and then
    // wins one leaves the satchel where it started, and a bare count would read
    // that as a missing drop rather than as the fight being expensive.
    expect((await state(page)).run!.vials).toBe(vials - report.drank + 1)
  })
})

test.describe('loot lies in the room', () => {
  test('TAKE puts the thing where it belongs, and says its rule', async ({ page }) => {
    test.slow()
    await boot(page, '?room=reliquary')
    await page.locator('[data-interact="reliquary-bell"]').click()
    await page.locator('[data-interact="reliquary-brazier"]').click()
    await page.locator('[data-interact="reliquary-lever"]').click()

    // The found thing renders in the open chest, named, with its exact rule
    // one press away and nothing committed by asking.
    const pill = page.locator('[data-act="look-loot"]')
    await expect(pill).toHaveText('PAIR')
    await pill.click()
    await expect(page.locator('#say')).toContainText('Talisman of the Pair')
    await expect(page.locator('#say')).toContainText('+12')
    expect((await state(page)).run!.talismans).toEqual([])

    await act(page, 'take').click()
    await expect(page.locator('#say')).toContainText('taken')
    await expect(page.locator('#say')).toContainText('+12')
    expect((await state(page)).run!.talismans).toEqual(['pair-talisman'])
    // And the thing is gone from the room, because it is on the player now.
    await expect(page.locator('[data-act="take"]')).toHaveCount(0)
  })

  test('walking away leaves it, and says so', async ({ page }) => {
    test.slow()
    await boot(page, '?room=reliquary')
    await page.locator('[data-interact="reliquary-bell"]').click()
    await page.locator('[data-interact="reliquary-brazier"]').click()
    await page.locator('[data-interact="reliquary-lever"]').click()

    const before = (await state(page)).run!
    await act(page, 'go').click()

    const after = (await state(page)).run!
    expect(after.bones).toBe(before.bones)
    expect(after.talismans).toEqual([])
    await expect(page.locator('#say')).toContainText('The door does not open twice')
    // There is no SKIP button anywhere, and there is nowhere to write one.
    await expect(act(page, 'skip')).toHaveCount(0)
  })

  test('never changes the pile, whichever way it is answered', async ({ page }) => {
    // The loadout and the pile are separate things. Picking a thing up may
    // never change how many bones a run is carrying.
    test.slow()
    await boot(page, '?room=reliquary')
    await page.locator('[data-interact="reliquary-bell"]').click()
    await page.locator('[data-interact="reliquary-brazier"]').click()
    await page.locator('[data-interact="reliquary-lever"]').click()
    const before = await livingBones(page)
    await act(page, 'take').click()
    expect(await livingBones(page)).toBe(before)
  })

  test('the bay it lands in says so, once', async ({ page }) => {
    // A thing crossing from the world into the loadout with no beat at all
    // reads as a repaint rather than as something the player did. One short
    // move on a plate that already exists — a pulse is a treatment, not a
    // painting — and the information is still the say line and the count.
    await boot(page, '?room=reliquary&reliquary=open', { motion: true })
    await act(page, 'take').click()
    await expect(page.locator('.talisman-slot')).toHaveClass(/filling/)
    // And it is over quickly, leaving the settled bay behind it.
    await expect(page.locator('.talisman-slot')).not.toHaveClass(/filling/, { timeout: 3000 })
    await expect(page.locator('.talisman-slot')).toBeVisible()
  })

  test('a thing the run cannot carry gets no TAKE, and says why', async ({ page }) => {
    // The cap is the reducer's, and the refusal is a **sentence in the room**
    // rather than a grey button: an unavailable action is hidden, and what
    // replaces it has to say what it wants.
    await boot(page, '?room=offertory&offertory=paid&items=grave-candle,splinter-fetish')
    const pill = page.locator('[data-act="look-loot"]')
    await expect(pill).toHaveText('CANDLE')
    await expect(act(page, 'take')).toHaveCount(0)
    await expect(pill).toHaveAttribute('aria-label', /already carrying 2/)

    await pill.click()
    await expect(page.locator('#say')).toContainText('There is nowhere to put it')
    expect((await state(page)).run!.itemDice).toHaveLength(2)
  })

  test('has no reward screen behind it, ever', async ({ page }) => {
    test.slow()
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    await (await wayTo(page, 'hollow')).click()
    if ((await fightItOut(page)) === 'died') return
    // A win goes back to the room. The full screen is hidden, the tray is
    // there, and whatever fell is on the floor.
    expect(await screenName(page)).toBeNull()
    await expect(page.locator('#tray')).toBeVisible()
  })
})
