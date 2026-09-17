import { expect, test } from '@playwright/test'
import { act, boot, dice, state, tappable } from './helpers.js'

for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
  test(`exploration controls fit below the art at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size)
    await boot(page, '?room=entry&bones=12&vials=2')
    await act(page, 'words').click()
    const world = (await page.locator('#world').boundingBox())!
    const controls = (await page.locator('#explore-controls').boundingBox())!
    expect(controls.y).toBeGreaterThanOrEqual(world.y + world.height - 1)
    expect(world.height).toBeGreaterThan(size.height * 0.9)
    for (const button of await page.locator('#explore-controls button').all()) {
      await tappable(page, button)
      const bounds = (await button.boundingBox())!
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width)
    }
    await act(page, 'drink').click()
    await expect(page.locator('#explore-pile')).toHaveText('17 BONES')
    await expect(page.locator('#say')).toBeVisible()
    await expect(page.locator('#tray')).toBeHidden()
  })
}

test('the tray appears for an encounter and leaves after the last blow', async ({ page }) => {
  await boot(page, '?room=hollow')
  await expect(page.locator('#tray')).toBeVisible()
  await expect(page.locator('#explore-controls')).toBeHidden()
  await act(page, 'fight').click()
  await act(page, 'roll').click()
  await expect(dice(page)).toHaveCount(6)
  await boot(page, '?room=hollow&rolls=3&enemyHp=1&dice=6,6,6,6,6,6')
  await act(page, 'score').first().click()
  await expect(page.locator('#tray')).toBeHidden()
  await expect(page.locator('#explore-controls')).toBeVisible()
  await expect(act(page, 'go')).toBeVisible()
})

test('holding teaches itself and scoring states the damage before the press', async ({ page }) => {
  await boot(page, '?room=deep&rolls=1&dice=6,6,6,4,4,3')
  const fullHouse = page.locator('[data-hand="full-house"].score-entry')
  await expect(fullHouse.locator('.score-damage')).toHaveText('58 DMG')
  await expect(fullHouse).toHaveAccessibleName(/Attack with FULL HOUSE.*58 damage/)
  await expect(act(page, 'reroll')).toHaveText('REROLL · 2')
  await dice(page).first().click()
  await expect(dice(page).first()).toHaveAttribute('aria-pressed', 'true')
  await expect(dice(page).first().locator('.held-label')).toHaveText('HELD')
  await act(page, 'reroll').click()
  await expect(act(page, 'reroll')).toHaveText('REROLL · 1')
  await expect(dice(page).first()).toHaveAttribute('data-value', '6')
})

test('healing and dangerous room actions state their consequences on the button', async ({ page }) => {
  await boot(page, '?room=sanctuary&bones=12')
  await expect(act(page, 'ritual')).toContainText('RESTORE')
  await expect(act(page, 'ritual')).toContainText('+3–8 bones')
  await boot(page, '?room=offertory&offertory=dark&bones=12')
  const offer = page.locator('[data-interact="offertory-altar"]')
  await expect(offer).toContainText('−2 bones')
  await offer.click()
  expect((await state(page)).run!.bones).toBe(10)
  await expect(page.locator('#explore-pile')).toHaveText('10 BONES')
  await boot(page, '?room=chain-vault')
  await expect(page.locator('[data-interact="vault-lever"]')).toContainText('−1 bone')
  await page.locator('[data-interact="vault-chain"]').click()
  await expect(page.locator('[data-interact="vault-lever"]')).not.toContainText('−1 bone')
})

test('a talisman stays visible and inspectable while the tray is hidden', async ({ page }) => {
  // The tray goes away between encounters; what the run is carrying does not.
  // A talisman is found in the world and its rule applies to every fight after,
  // so hiding it until the next one would be hiding a rule rather than a place.
  await boot(page, '?room=reliquary&reliquary=open')
  await expect(page.locator('#tray')).toBeHidden()
  await act(page, 'take').click()
  const bay = page.locator('#explore-controls .talisman-slot')
  await expect(bay).toBeVisible()
  await expect(bay).toHaveAttribute('data-talisman-id', 'pair-talisman')
  await expect(bay).toHaveAccessibleName(/Pair/i)
  // Inspecting it is read-only, exactly as it is on the tray.
  const before = await state(page)
  await bay.click()
  await expect(page.locator('#overlay')).toBeVisible()
  expect((await state(page)).run).toEqual(before.run)
})

test('the six-die build stays visible and readable between fights', async ({ page }) => {
  // The tray is what a fight is played on and it goes away with the fight. The
  // build does not: a slot bought with a bone and given up for is on screen in
  // the room, in slot order, with the crooked ones marked as crooked.
  await boot(page, '?room=entry&hand=jawbone,bone,long-bone,bone,bone,bone')
  const hand = page.locator('#explore-hand')
  await expect(hand).toBeVisible()
  await expect(hand.locator('.explore-die')).toHaveCount(6)
  await expect(hand.locator('[data-slot="0"]')).toHaveAttribute('data-die-id', 'jawbone')
  await expect(hand.locator('[data-slot="0"]')).toHaveAttribute('data-plain', 'no')
  await expect(hand.locator('[data-slot="1"]')).toHaveAttribute('data-plain', 'yes')
  await expect(hand.locator('[data-slot="2"]')).toHaveAttribute('data-die-id', 'long-bone')
  // The strip says the whole build out loud, because six marks are a picture.
  await expect(hand).toHaveAccessibleName(/Jawbone · Bone ×4 · Long Bone/)
  // And it is a readout, not a verb: nothing in the row is a press that is not
  // one of the verbs beside it.
  await expect(hand.locator('button')).toHaveCount(0)

  // MENU, two along, is where each of the six is read at a size a person can
  // read — name, faces and the one sentence they all share.
  await act(page, 'menu').click()
  const overlay = page.locator('#overlay')
  await expect(overlay).toBeVisible()
  await expect(overlay.locator('#hand-slots')).toContainText('Jawbone')
  const jaw = overlay.locator('#hand-dice [data-reward-id="jawbone"]')
  await expect(jaw.locator('.face-chip')).toHaveText(['1', '1', '1', '6', '6', '6'])
  await expect(overlay.locator('#hand-dice [data-reward-id="bone"] .card-name')).toHaveText('Bone ×4')
})

test('every control in the row is still reachable with a full satchel on a small phone', async ({
  page,
}) => {
  // The narrowest case the row has: the pile, the six, a Vial, a talisman and
  // the three verbs, at 320px. Nothing may be pushed off the right edge.
  await page.setViewportSize({ width: 320, height: 740 })
  await boot(page, '?room=entry&bones=12&vials=2&talismans=pair-talisman')
  for (const button of await page.locator('#explore-controls button').all()) {
    await tappable(page, button)
  }
  // The six are what yields at this width, and only here: a readout gives way
  // to a verb, never the other way round. MENU is still in the row and still
  // names the build.
  await expect(page.locator('#explore-hand')).toBeHidden()
  await expect(act(page, 'menu')).toBeVisible()
})
