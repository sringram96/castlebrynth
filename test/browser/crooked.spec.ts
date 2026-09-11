/**
 * The crooked bones, on a phone.
 *
 * `test/unit/crooked.test.ts` proves the reducer cannot be cheated. This proves
 * the half that decides completion: that a thumb can read a die on a table,
 * compare it with the six it is already throwing, pay for it, and walk away from
 * the one it did not want — and that every rule a monster has is legible before
 * a single press.
 *
 * Every grammar is walked down both branches with real presses. There are three
 * descents now and a suite that only ever walked one of them would be proving a
 * third of the game.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  act,
  boot,
  livingBones,
  settled,
  state,
  tappable,
  walkOn,
  wayLabelled,
  where,
} from './helpers.js'
import { clearReward, fightItOut, workTheRoom } from './play.js'

/** Every core die lying in this room, by what it is. */
const onOffer = (page: Page) => page.locator('[data-act="look-die"]')

/** The verb that takes one. Absent — never greyed — when the price is the pile. */
const claim = (page: Page) => page.locator('[data-act="claim"]')

/** The picker's six rows, one per slot of the hand. */
const slots = (page: Page) => page.locator('[data-act="pick-slot"]')

/** What the run's six slots are holding, off the state it is holding them in. */
async function hand(page: Page): Promise<string[]> {
  return (await page.evaluate(
    () => (window.castlebrynth?.state() as { run?: { hand: string[] } }).run?.hand ?? [],
  )) as string[]
}

/** The node of this run that the director put the treasure in. */
async function treasureNode(page: Page): Promise<string> {
  return (await page.evaluate(() => {
    const run = (
      window.castlebrynth?.state() as {
        run?: { map: { nodes: Record<string, { id: string; dice?: { kind: string }[] }> } }
      }
    ).run
    const found = Object.values(run!.map.nodes).find((n) =>
      (n.dice ?? []).some((d) => d.kind === 'treasure'),
    )
    return found!.id
  })) as string
}

test.describe('the Bone Carver', () => {
  test('lays two dice out, priced, and reads each one before any press', async ({ page }) => {
    await boot(page, '?room=carver', { plan: 'long-way' })

    await expect(page.locator('#say')).toContainText('Somebody works here')
    // Two dice, two prices, and the way on open from the first frame: nothing in
    // this room is held shut and walking past all of it is legal.
    await expect(onOffer(page)).toHaveCount(2)
    await expect(claim(page)).toHaveCount(2)
    await expect(act(page, 'go')).toBeVisible()

    // Both of them read, by a real tap, and each answers with its own name, its
    // own faces and its own price — before anything is committed.
    for (const index of [0, 1]) {
      const pill = onOffer(page).nth(index)
      await tappable(page, pill)
      await pill.click()
      await expect(page.locator('#say')).toContainText('Three of my bones.')
      // The faces are drawn under the line, off the die's own table.
      await expect(page.locator('#say .faces .face-chip')).toHaveCount(6)
    }
    // And the price is on the verb itself, before the verb charges.
    await expect(claim(page).first()).toHaveAttribute('aria-label', /Break 3 bones/)
    expect(await livingBones(page)).toBe(30)
  })

  test('buys one through the picker and leaves the other on the table', async ({ page }) => {
    await boot(page, '?room=carver', { plan: 'long-way' })
    const before = await hand(page)
    const wanted = await onOffer(page).first().getAttribute('data-die')

    await claim(page).first().click()
    // The picker: the six current dice, each with its faces, and one decision.
    await expect(page.locator('#overlay')).toHaveAttribute('data-overlay', 'picker')
    await expect(slots(page)).toHaveCount(6)
    await tappable(page, slots(page).nth(2))
    await slots(page).nth(2).click()

    // One transition: the price charged, the slot swapped, the seat emptied.
    expect(await livingBones(page)).toBe(27)
    const after = await hand(page)
    expect(after[2]).toBe(wanted)
    expect(after.filter((_, i) => i !== 2)).toEqual(before.filter((_, i) => i !== 2))
    await expect(page.locator('#say')).toContainText('I put the old one down')

    // The other die is still on the table, at its own price, and walking away
    // from it is walking away.
    await expect(onOffer(page)).toHaveCount(1)
    await expect(claim(page)).toHaveCount(1)
    await act(page, 'go').click()
    expect(await where(page)).not.toBe('carver')
    expect(await livingBones(page)).toBe(27)
  })

  test('cancels for nothing at all', async ({ page }) => {
    await boot(page, '?room=carver', { plan: 'long-way' })
    const before = await hand(page)

    await claim(page).first().click()
    await expect(page.locator('#overlay')).toHaveAttribute('data-overlay', 'picker')
    await act(page, 'close').click()

    // No charge, no swap, and the die exactly where it lay. Cancel is legal.
    await expect(page.locator('#overlay')).toBeHidden()
    expect(await livingBones(page)).toBe(30)
    expect(await hand(page)).toEqual(before)
    await expect(onOffer(page)).toHaveCount(2)
    await expect(claim(page)).toHaveCount(2)
  })

  test('survives a reload in the middle of the picker', async ({ page }) => {
    await boot(page, '?room=carver', { plan: 'long-way' })
    await claim(page).first().click()
    await expect(page.locator('#overlay')).toHaveAttribute('data-overlay', 'picker')

    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')

    // The picker is a thought, not a move. A reload loses the thought and nothing
    // else: the pile is untouched, the hand is what it was, and both dice are
    // still on the table.
    await expect(page.locator('#overlay')).toBeHidden()
    expect(await livingBones(page)).toBe(30)
    await expect(onOffer(page)).toHaveCount(2)
  })
})

test.describe('a chained bargain', () => {
  test('reads its die and its price, and takes it at twenty bones', async ({ page }) => {
    await boot(page, '?room=niche&bones=20')
    await expect(page.locator('#say')).toContainText('something chained in it')
    await expect(onOffer(page)).toHaveCount(1)

    await onOffer(page).first().click()
    await expect(page.locator('#say')).toContainText('Three of my bones.')
    await expect(page.locator('#say .faces .face-chip')).toHaveCount(6)

    await claim(page).first().click()
    await slots(page).nth(0).click()
    expect(await livingBones(page)).toBe(17)
    await expect(onOffer(page)).toHaveCount(0)
  })

  test('is never lethal: at three bones there is no press at all', async ({ page }) => {
    await boot(page, '?room=niche&bones=3')
    // The die is still readable — a rule is never hidden — and the verb is
    // **absent**, not greyed. The refusal is the pill's own name.
    await expect(onOffer(page)).toHaveCount(1)
    await expect(claim(page)).toHaveCount(0)
    await expect(onOffer(page).first()).toHaveAttribute('aria-label', /I have three\. No\./)

    await onOffer(page).first().click()
    await expect(page.locator('#say')).toContainText('It wants three. I have three. No.')
    expect(await livingBones(page)).toBe(3)
  })

  test('is takeable at four, which is the line', async ({ page }) => {
    await boot(page, '?room=niche&bones=4')
    await expect(claim(page)).toHaveCount(1)
    await claim(page).first().click()
    await slots(page).nth(5).click()
    expect(await livingBones(page)).toBe(1)
    expect(await where(page)).toBe('niche')
  })

  test('leaves it chained when it is walked past, and says so', async ({ page }) => {
    await boot(page, '?room=niche&bones=20')
    await act(page, 'go').click()
    expect(await where(page)).not.toBe('niche')
    expect(await livingBones(page)).toBe(20)
  })
})

test.describe('the treasure', () => {
  test('is the Hand of Saint Orrin, unpriced, on one branch of one fork', async ({ page }) => {
    await boot(page, '?room=niche')
    const node = await treasureNode(page)

    // The node the seed chose, stood in by name. Which one it is is the whole
    // point — sometimes it is behind the mouth the run did not take.
    await boot(page, `?node=${node}&bones=1`)
    await expect(onOffer(page)).toHaveCount(1)
    await expect(onOffer(page).first()).toHaveAttribute('data-offer', 'treasure')
    await expect(onOffer(page).first()).toHaveAttribute('data-die', 'hand-of-orrin')
    // Unpriced: no price attribute, and takeable on a single bone, because what it
    // cost was the road.
    await expect(onOffer(page).first()).not.toHaveAttribute('data-price', /./)
    await expect(claim(page)).toHaveCount(1)

    await onOffer(page).first().click()
    await expect(page.locator('#say')).toContainText('It cost what it cost to get here')
    await claim(page).first().click()
    await slots(page).nth(0).click()
    expect((await hand(page))[0]).toBe('hand-of-orrin')
    expect(await livingBones(page)).toBe(1)
  })

  test('leaves an ordinary bargain in the alcove it did not choose', async ({ page }) => {
    await boot(page, '?room=niche')
    const treasure = await treasureNode(page)
    const other = (await page.evaluate(() => {
      const run = (
        window.castlebrynth?.state() as {
          run?: { map: { nodes: Record<string, { id: string; dice?: { kind: string }[] }> } }
        }
      ).run
      return Object.values(run!.map.nodes)
        .filter((n) => (n.dice ?? []).some((d) => d.kind === 'bargain'))
        .map((n) => n.id)
    })) as string[]

    expect(other).not.toContain(treasure)
    await boot(page, `?node=${other[0]}`)
    await expect(onOffer(page).first()).toHaveAttribute('data-offer', 'bargain')
    await expect(onOffer(page).first()).toHaveAttribute('data-price', '3')
  })

  test('says it exists, twice, and never says where', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    // The entry hall's one LOOK. The negative-space audit demoted the skull's own
    // hotspot and folded its line into this one, so the first hint rides the
    // sentence it was written on rather than asking for the hotspot back.
    await page.locator('[data-detail="candles"]').click()
    await expect(page.locator('#say')).toContainText('the same hand, scratched smaller')

    // And the carving at the transition, cut by the plan rather than the room.
    await act(page, 'go').click()
    const carving = page.locator('[data-detail="carving"]')
    await expect(carving).toHaveCount(1)
    await tappable(page, carving)
    await carving.click()
    await expect(page.locator('#say')).toContainText('Somebody came down here for it')
  })
})

test.describe('one rule each, printed before the press', () => {
  test('the Gnawing climbs 2 → 4 → 8 as it closes, with the ladder up from frame one', async ({
    page,
  }) => {
    await boot(page, '?room=hollow')
    // Before FIGHT is pressed. The whole ladder, in the brief, as chips.
    await expect(page.locator('#brief-ladder')).toContainText('FAR 2')
    await expect(page.locator('#brief-ladder')).toContainText('MID 4')
    await expect(page.locator('#brief-ladder')).toContainText('CLOSE 8')
    await expect(page.locator('#well')).toContainText('It is getting closer')

    for (const [round, breaks] of [
      [1, '2'],
      [2, '4'],
      [3, '8'],
    ] as const) {
      await boot(page, `?room=hollow&round=${round}`)
      await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', breaks)
      await expect(page.locator('#enemy-hits')).toHaveAttribute('data-rule', 'stage')
      // And the ladder is still on screen while the fight is running, so the
      // number is a position on something the player has read.
      await expect(page.locator('#enemy-ladder')).toContainText('CLOSE 8')
    }
  })

  test('the Gnawing actually takes the rung it is showing', async ({ page }) => {
    await boot(page, '?room=hollow&rolls=3&dice=1,1,2,3,4,6&iron=none')
    expect(await livingBones(page)).toBe(30)
    await page.locator('.score-entry[data-hand="pair"]').click()
    await settled(page)
    // FAR, which breaks two.
    expect(await livingBones(page)).toBe(28)
    // Round two is MID, which breaks four.
    await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', '4')
  })

  test('the Marrow steps down as it is worn away', async ({ page }) => {
    for (const [hp, breaks] of [
      [120, '5'],
      [81, '5'],
      [80, '4'],
      [41, '4'],
      [40, '3'],
    ] as const) {
      await boot(page, `?room=deep&mode=combat&enemyHp=${hp}`)
      await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', breaks)
      await expect(page.locator('#enemy-hits')).toHaveAttribute('data-rule', 'wounds')
    }
  })

  test('the Marrow takes less once it has been opened up', async ({ page }) => {
    await boot(page, '?room=deep&enemyHp=30&rolls=3&dice=1,1,2,3,4,6&iron=none&bones=30')
    await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', '3')
    await page.locator('.score-entry[data-hand="pair"]').click()
    await settled(page)
    expect(await livingBones(page)).toBe(27)
  })

  test('the Warden breaks eight, and twelve for a CRAP', async ({ page }) => {
    // The card says it in capitals before the first ROLL, and the ladder carries
    // both rungs.
    await boot(page, '?room=gate')
    await expect(page.locator('#well')).toContainText('CRAP IT AND IT BREAKS TWELVE')
    await expect(page.locator('#brief-ladder')).toContainText('CRAP 12')

    // A named line: eight.
    await boot(page, '?room=gate&bones=30&rolls=3&dice=1,1,2,3,4,6&iron=0')
    await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', '8')
    await page.locator('.score-entry[data-hand="pair"]').click()
    await settled(page)
    expect(await livingBones(page)).toBe(22)

    // The same dice with PAIR already spent: nothing named fits, CRAP is the
    // answer, and the door charges four more for it.
    await boot(page, '?room=gate&bones=30&rolls=3&dice=1,1,2,3,4,6&iron=0&used=pair')
    await expect(page.locator('.score-entry[data-hand="crap"]')).toBeVisible()
    await page.locator('.score-entry[data-hand="crap"]').click()
    await settled(page)
    expect(await livingBones(page)).toBe(18)
    const record = (await state(page)).run!.combat!.lastAttack!
    expect(record.hand).toBe('crap')
    expect(record.retaliation).toBe(12)
  })
})

test.describe('every grammar, down both branches', () => {
  for (const plan of ['descent', 'long-way', 'tithe'] as const) {
    for (const mouth of ['first', 'second'] as const) {
      test(`${plan}: door to an ending, taking the ${mouth} mouth at every fork`, async ({
        page,
      }) => {
        test.setTimeout(120_000)
        await boot(page, '', { plan })
        await act(page, 'start').click()

        for (let step = 0; step < 40; step++) {
          if ((await page.locator('#screen').isVisible()) && step > 0) break
          // Whatever this room is holding shut, dealt with by a real press: a
          // fight fought, a font rolled, machinery worked in the order the carved
          // clues give.
          if ((await act(page, 'fight').count()) > 0) {
            if ((await fightItOut(page)) === 'died') break
            await clearReward(page)
          }
          if ((await act(page, 'ritual').count()) > 0) await act(page, 'ritual').click()
          await workTheRoom(page)
          await clearReward(page)

          const ways = act(page, 'go')
          const count = await ways.count()
          if (count === 0) break
          await ways.nth(mouth === 'second' ? Math.min(1, count - 1) : 0).click()
        }

        // Out, or dead. Never stuck: a descent that cannot be finished or lost is
        // a descent nobody can play.
        const screen = await page.locator('#screen').getAttribute('data-screen')
        expect(['complete', 'dead'], `${plan} never finished`).toContain(screen)
      })
    }
  }
})

test.describe('a standing horror breathes, on the room\'s own clock', () => {
  /** How far the plate has been moved, as the browser has computed it. */
  const breath = (page: Page): Promise<string> =>
    page.locator('#world .layer-enemy').evaluate((el) => getComputedStyle(el).translate)

  /** The count of pixels the ticker has written, which is the breath itself. */
  const written = (page: Page): Promise<string> =>
    page
      .locator('#world .layer-enemy')
      .evaluate((el) => (el as HTMLElement).style.getPropertyValue('--breath'))

  test('moves one whole pixel, in steps, and inside the fight', async ({ page }) => {
    // **The one ambient allowed inside a fight.** A fight owns the picture and what
    // is standing in it *is* the fight — dust falling through a cascade has no claim
    // on the frame; the opponent has nothing but.
    await boot(page, '?room=hollow&mode=combat', { motion: true })
    // Past anything the arrival itself was playing, so what is sampled below is the
    // ticker rather than the tail of a sequence.
    await page.waitForTimeout(400)

    const counts = new Set<string>()
    const offsets = new Set<string>()
    for (let sample = 0; sample < 28; sample++) {
      counts.add(await written(page))
      offsets.add(await breath(page))
      await page.waitForTimeout(120)
    }
    // It actually moves, and the only counts it is ever written at are zero and one:
    // a count of whole pixels, multiplied by one pixel in the stylesheet.
    expect([...counts].sort(), `saw counts ${[...counts].join(' | ')}`).toEqual(['0', '1'])

    // And nothing lands between two pixels. There is no transition on `translate`,
    // so every computed position is a whole number of them.
    for (const offset of offsets) {
      if (offset === 'none') continue
      for (const part of offset.split(' ')) {
        expect(Number(part.replace('px', '')), `${offset} is not a whole pixel`).toBe(
          Math.round(Number(part.replace('px', ''))),
        )
      }
    }
  })

  test('holds perfectly still with motion reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=hollow&mode=combat', { motion: true })
    await page.waitForTimeout(400)
    // Ceremony vanishes whole rather than resolving to a slower version of itself:
    // the count is never written at all, so the plate has nothing to multiply.
    for (let sample = 0; sample < 6; sample++) {
      expect(await written(page)).toBe('')
      await page.waitForTimeout(120)
    }
  })

  test('does not breathe while it is dying', async ({ page }) => {
    // A thing that is giving out does not breathe, and the death's own frames own
    // that picture — `content/defeat.ts`, not the ticker.
    await boot(page, '?room=gate&dying=1', { motion: true })
    for (let sample = 0; sample < 5; sample++) {
      expect(await written(page)).toBe('')
      await page.waitForTimeout(120)
    }
  })
})

test.describe('the strip shows the mouth that was not taken', () => {
  test('remembers the deep way after the stair is taken', async ({ page }) => {
    await boot(page, '?room=fork')
    await wayLabelled(page, 'STAIR').click()
    await act(page, 'map').click()
    // The road the run read and did not take, carrying the word that was on the
    // hotspot and nothing about what is behind it.
    const mouths = page.locator('#strip .strip-mouth')
    await expect(mouths).toContainText(['DEEP'])
    await act(page, 'close').click()
  })
})

test.describe('motion off reaches the same hand, in the same tick', () => {
  test('buys the same die either way', async ({ page }) => {
    const buy = async (): Promise<string[]> => {
      await claim(page).first().click()
      await slots(page).nth(3).click()
      return hand(page)
    }

    await boot(page, '?room=niche&bones=20', { motion: true, plan: 'descent' })
    const withMotion = await buy()

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=niche&bones=20', { motion: true, plan: 'descent' })
    expect(await buy()).toEqual(withMotion)
    expect(await livingBones(page)).toBe(17)
  })

  test('shows the same ladder with every beat removed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=hollow&round=3', { motion: true })
    await expect(page.locator('#enemy-hits')).toHaveAttribute('data-damage', '8')
    await expect(page.locator('#enemy-ladder')).toContainText('CLOSE 8')
  })
})

test.describe('the hand is six, and nothing sits outside it', () => {
  test('never grows a seventh slot, however many dice are bought', async ({ page }) => {
    await boot(page, '?room=carver', { plan: 'long-way' })
    expect(await hand(page)).toHaveLength(6)
    await claim(page).first().click()
    await slots(page).nth(0).click()
    expect(await hand(page)).toHaveLength(6)
    await claim(page).first().click()
    await slots(page).nth(1).click()
    expect(await hand(page)).toHaveLength(6)
    // And there is no screen anywhere that lists what was put down.
    await act(page, 'menu').click()
    await expect(page.locator('#hand-slots')).toHaveAttribute('data-slots', '6')
    await expect(page.locator('#overlay')).not.toContainText('spare')
  })
})
