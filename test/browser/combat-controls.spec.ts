import { expect, test } from '@playwright/test'

import { act, boot, dice, state } from './helpers.js'

test.describe('the combat controls', () => {
  test.beforeEach(async ({ page }) => {
    await boot(page, '?room=hollow')
    await expect(act(page, 'fight')).toBeVisible()
    await act(page, 'fight').click()
  })

  test('shows the intent before the first roll, and explains it on a tap', async ({ page }) => {
    await expect(act(page, 'roll')).toBeVisible()
    const intent = page.locator('#intent')
    await expect(intent).toBeVisible()
    await expect(intent).toContainText('BITE')
    await expect(intent).toContainText('6')

    await intent.click()
    await expect(page.locator('#say')).toContainText('It bites')
  })

  test('rolls exactly six dice, and holding never changes that', async ({ page }) => {
    await expect(dice(page)).toHaveCount(6)
    await act(page, 'roll').click()
    await expect(dice(page)).toHaveCount(6)

    for (let i = 0; i < 6; i++) await dice(page).nth(i).click()
    await expect(dice(page)).toHaveCount(6)
    await expect(page.locator('#crown')).toHaveAttribute('data-count', '6')

    await act(page, 'reroll').click()
    await expect(dice(page)).toHaveCount(6)
  })

  test('a die shows a face its own die has, and says so', async ({ page }) => {
    await act(page, 'roll').click()
    for (let i = 0; i < 6; i++) {
      const die = dice(page).nth(i)
      const value = Number(await die.getAttribute('data-value'))
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
      await expect(die.locator('.die-face')).toHaveAttribute('data-value', String(value))
    }
  })

  test('choosing a die is visible, reversible, and drives the preview', async ({ page }) => {
    await act(page, 'roll').click()
    const first = dice(page).nth(0)
    await expect(first).toHaveAttribute('data-selected', 'no')
    await expect(page.locator('#well')).toContainText('Pick dice')

    await first.click()
    await expect(first).toHaveAttribute('data-selected', 'yes')
    await expect(page.locator('#score')).toBeVisible()

    await first.click()
    await expect(first).toHaveAttribute('data-selected', 'no')
    await expect(page.locator('#score')).toHaveCount(0)
  })

  test('the preview names the hand and shows every term of the sum', async ({ page }) => {
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await dice(page).nth(1).click()

    const score = page.locator('#score')
    await expect(score).toBeVisible()
    const a = Number(await dice(page).nth(0).getAttribute('data-value'))
    const b = Number(await dice(page).nth(1).getAttribute('data-value'))
    await expect(score.locator('.term-sum')).toHaveText(String(a + b))

    const multiplier = Number(await score.locator('.term-mult').textContent())
    const damage = Number(await score.locator('.term-damage').textContent())
    expect(damage).toBe((a + b) * multiplier)
    // Two equal dice are a Pair and nothing else is, which is the smallest
    // piece of the ladder a player has to learn.
    expect(await score.getAttribute('data-hand')).toBe(a === b ? 'pair' : 'any')
  })

  test('rerolling changes only the dice that were not chosen', async ({ page }) => {
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await dice(page).nth(2).click()

    const before = await dice(page).evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).dataset['value']),
    )
    await act(page, 'reroll').click()
    const after = await dice(page).evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).dataset['value']),
    )

    expect(after[0]).toBe(before[0])
    expect(after[2]).toBe(before[2])
    // And the chosen dice stay chosen: one mark, not two.
    await expect(dice(page).nth(0)).toHaveAttribute('data-selected', 'yes')
    await expect(dice(page).nth(2)).toHaveAttribute('data-selected', 'yes')
  })

  test('offers one reroll, and then does not offer it', async ({ page }) => {
    await act(page, 'roll').click()
    await expect(act(page, 'reroll')).toBeVisible()
    await act(page, 'reroll').click()
    // Absent, not greyed. A press that cannot do anything is not offered.
    await expect(act(page, 'reroll')).toHaveCount(0)
  })

  test('scoring commits exactly the previewed damage and the enemy answers', async ({ page }) => {
    await act(page, 'roll').click()
    await dice(page).nth(0).click()
    await dice(page).nth(1).click()

    const damage = Number(await page.locator('#score .term-damage').textContent())
    const before = await state(page)
    const enemyBefore = before.run!.combat!.enemyHp

    await act(page, 'score').click()

    const after = await state(page)
    expect(after.run!.combat!.enemyHp).toBe(enemyBefore - damage)
    // 6 through, because the Gnawing bites for 6 and nothing blocks it yet.
    expect(after.run!.hp).toBe(before.run!.hp - 6)
    await expect(page.locator('#say')).toContainText('BITE')
    // And the next turn starts clean.
    expect(after.run!.combat!.phase).toBe('intent')
    expect(after.run!.combat!.selected).toEqual([])
    await expect(act(page, 'roll')).toBeVisible()
  })

  test('SCORE is never a press that does nothing', async ({ page }) => {
    await act(page, 'roll').click()
    const before = await state(page)
    await act(page, 'score').click()
    const after = await state(page)
    // With nothing chosen the press cannot land, and the game says what to do
    // rather than pretending something happened.
    expect(after.run!.combat!.enemyHp).toBe(before.run!.combat!.enemyHp)
    await expect(page.locator('#well')).toContainText('Pick dice')

    // One die is always a legal hand, so the press is never dead for long.
    await dice(page).nth(0).click()
    await act(page, 'score').click()
    const scored = await state(page)
    expect(scored.run!.combat!.enemyHp).toBeLessThan(before.run!.combat!.enemyHp)
  })

  test('a marked face states its cost on the die and in the preview', async ({ page }) => {
    // The Pusher's marked 1 costs 7 health, and it says so on the face.
    await boot(page, '?room=hollow&dice=pusher,pusher,pusher,pusher,pusher,pusher')
    await act(page, 'fight').click()
    await act(page, 'roll').click()

    const marked = page.locator('.die .mark-hurt').first()
    if ((await marked.count()) > 0) {
      await expect(marked).toHaveText('−7')
      const slot = await marked.locator('xpath=ancestor::button').getAttribute('data-slot')
      await page.locator(`.die[data-slot="${slot}"]`).click()
      await expect(page.locator('.toll-hurt')).toContainText('−7 HP')
    }
  })

  test('a dead enemy never gets to answer', async ({ page }) => {
    // `enemyHp` opens the fight, so the room's FIGHT verb is already spent.
    await boot(page, '?room=hollow&enemyHp=1')
    await act(page, 'roll').click()
    const before = await state(page)
    await dice(page).nth(0).click()
    await act(page, 'score').click()

    await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'reward')
    const after = await state(page)
    expect(after.run!.hp).toBe(before.run!.hp)
  })
})
