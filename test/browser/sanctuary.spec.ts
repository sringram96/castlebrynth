/**
 * The Font, on a phone.
 *
 * `test/unit/sanctuary.test.ts` proves the room cannot be farmed. This proves
 * the other half — that a thumb can find it, press it once, read what it gave,
 * and leave — because a healing room the player does not notice is a healing
 * room that does not exist.
 *
 * The last block is the promise the whole repository is built on: with motion
 * turned off at the media level, the same press reaches the same numbers in
 * the same tick.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, screenName, state, tappable } from './helpers.js'
import { fightItOut } from './play.js'

/** Hurt, standing in the chapel, on a known seed. */
const inChapel = (page: Page, hp = 40, extra = '') =>
  boot(page, `?room=sanctuary&hp=${hp}&seed=3${extra}`)

const hp = (page: Page) => page.locator('#hp')

test.describe('the chapel is a room with one thing in it', () => {
  test('arrives with the font offered and no way on', async ({ page }) => {
    await inChapel(page)

    await expect(page.locator('#say')).toContainText('The hall opens into a chapel')
    // The one verb, and it is on the object rather than in the tray.
    const font = act(page, 'ritual')
    await expect(font).toBeVisible()
    await expect(font).toHaveText('ROLL')
    await expect(font).toHaveAttribute('aria-label', /roll the die/i)
    // Not offered and not greyed out: there is no way on to press yet.
    await expect(act(page, 'go')).toHaveCount(0)
    // And the well says what the thing is, the way it names an enemy.
    await expect(page.locator('#well')).toContainText('The Font')
    await expect(page.locator('#well')).toContainText('gives back a share of what I have already lost')
  })

  test('answers a real tap at its own centre, at 44px', async ({ page }) => {
    await inChapel(page)
    await tappable(page, act(page, 'ritual'))
  })

  test('leaves the room lookable without the details eating the press', async ({ page }) => {
    await inChapel(page)
    const details = page.locator('#hits .hit:not(.hit-ritual)')
    await expect(details).toHaveCount(2)
    for (let i = 0; i < 2; i++) {
      await details.nth(i).click()
      await expect(page.locator('#say')).not.toBeEmpty()
    }
    // Looking costs nothing and rolls nothing.
    const now = await state(page)
    expect(now.run!.hp).toBe(40)
    await expect(act(page, 'ritual')).toBeVisible()
  })

  test('the basin is world art on its own layer, under nothing that takes a press', async ({
    page,
  }) => {
    await inChapel(page)
    // The prop lives on the midground, which is below the enemy layer and
    // above the backdrop — and it is art, so it never takes a tap.
    const where = await page.evaluate(() => {
      const prop = document.getElementById('prop')
      if (!prop) return null
      const layer = prop.parentElement as HTMLElement
      return {
        layer: layer.dataset['layer'],
        z: Number(layer.style.zIndex),
        events: getComputedStyle(prop).pointerEvents,
      }
    })
    expect(where?.layer).toBe('midground')
    expect(where?.events).toBe('none')
    const backdropZ = await page.evaluate(
      () => Number((document.querySelector('.layer-backdrop') as HTMLElement).style.zIndex),
    )
    expect(where!.z).toBeGreaterThan(backdropZ)

    // And it is the still basin, because nothing has been rolled.
    await expect(page.locator('#prop')).toBeVisible()
    await expect(page.locator('#prop')).toHaveAttribute('src', /chalice-idle/)
  })

  test('the basin does not move when the frame changes', async ({ page }) => {
    // The plates are registered to a shared base at build time, and the layer
    // is cover-fitted rather than placed — so a frame swap is a swap and
    // nothing else. This is the room's one hard visual requirement.
    await inChapel(page)
    const before = await page.locator('#prop').boundingBox()

    await act(page, 'ritual').click()
    await expect(page.locator('#prop')).not.toHaveAttribute('src', /chalice-idle/)

    const after = await page.locator('#prop').boundingBox()
    expect(after).toEqual(before)
  })
})

test.describe('one press, and the room is spent', () => {
  test('rolls, heals a share of the wound, and opens the way on', async ({ page }) => {
    await inChapel(page, 40)
    const before = await state(page)
    expect(before.run!.hp).toBe(40)

    await act(page, 'ritual').click()

    const after = await state(page)
    const ritual = (after.run as unknown as { ritual: { roll: number; healed: number } }).ritual
    expect(ritual.roll).toBeGreaterThanOrEqual(1)
    expect(ritual.roll).toBeLessThanOrEqual(6)
    // A share of the 60 that was missing, not the number on the die.
    expect(ritual.healed).toBeGreaterThanOrEqual(11)
    expect(after.run!.hp).toBe(40 + ritual.healed)
    expect(after.run!.hp).toBeLessThanOrEqual(100)

    // The orb carries it, the band says it in words, and the basin is left
    // showing the face it landed on — the number is readable off the die
    // rather than only off a sentence.
    await expect(hp(page)).toHaveAttribute('data-hp', String(after.run!.hp))
    await expect(page.locator('#say')).toContainText(
      ritual.roll === 6 ? 'The wound closes completely' : `${ritual.healed} HP`,
    )
    await expect(page.locator('#prop')).toHaveAttribute(
      'src',
      new RegExp(`chalice-${ritual.roll}\\.png`),
    )

    // The verb is gone and the way on has arrived.
    await expect(act(page, 'ritual')).toHaveCount(0)
    await expect(act(page, 'go')).toBeVisible()
  })

  test('cannot be pressed twice, however fast the thumb is', async ({ page }) => {
    await inChapel(page, 25)
    const font = act(page, 'ritual')
    await font.click()
    const once = await state(page)

    // The control is gone, so a second press is not even reachable — and
    // dispatching the action by hand, which is more than a player can do,
    // still changes nothing.
    await expect(font).toHaveCount(0)
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.castlebrynth?.dispatch({ type: 'RITUAL_ROLL' }))
    }
    const twice = await state(page)
    expect(twice.run!.hp).toBe(once.run!.hp)
    expect((twice.run as unknown as { ritual: unknown }).ritual).toEqual(
      (once.run as unknown as { ritual: unknown }).ritual,
    )
  })

  test('GO ON reaches the fork the run has always had', async ({ page }) => {
    await inChapel(page, 40)
    await act(page, 'ritual').click()
    await act(page, 'go').click()

    // The Reliquary sits between the two now. It is optional in every sense —
    // the way on is offered on arrival — so the chapel still leads to the fork
    // in one press from here.
    await expect(page.locator('#say')).toContainText('A dead chapel')
    await act(page, 'go').click()

    await expect(page.locator('#say')).toContainText('The passage splits')
    // Both routes, untouched by any of this. The deep way now has the Chain
    // Vault in front of its fight; it is still the same decision at the fork.
    await expect(page.locator('[data-to="gate"]')).toBeVisible()
    await expect(page.locator('[data-to="chain-vault"]')).toBeVisible()
  })

  test('gives a whole body nothing, and still lets it past', async ({ page }) => {
    await inChapel(page, 100)
    await act(page, 'ritual').click()

    const after = await state(page)
    expect(after.run!.hp).toBe(100)
    await expect(page.locator('#say')).toContainText('nothing left for it to mend')
    await expect(act(page, 'go')).toBeVisible()
  })

  test('a reload cannot reroll it or heal again', async ({ page }) => {
    // A URL fixture turns persistence off — deliberately, so a test run never
    // inherits a half-finished session — so the one test about a *save* has to
    // walk: start a run, beat the Gnawing with real presses, and press the
    // font. What that costs is control of the health it arrives on; the claim
    // here is about the record surviving, and the arithmetic is covered above.
    test.setTimeout(90_000)
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    expect(await fightItOut(page), 'lost to the Gnawing').toBe('won')
    if ((await screenName(page)) === 'reward') {
      await page.locator('[data-act="take"]').first().click()
    }

    await act(page, 'go').click()
    expect((await state(page)).run!.roomId).toBe('sanctuary')

    await act(page, 'ritual').click()
    const before = await state(page)

    await page.reload()
    await act(page, 'continue').click()

    const after = await state(page)
    expect(after.run!.hp).toBe(before.run!.hp)
    expect((after.run as unknown as { ritual: unknown }).ritual).toEqual(
      (before.run as unknown as { ritual: unknown }).ritual,
    )
    // Still spent on the far side of the reload, still open, and still showing
    // the face it landed on rather than an unpressed basin.
    await expect(act(page, 'ritual')).toHaveCount(0)
    await expect(act(page, 'go')).toBeVisible()
    const rolled = (before.run as unknown as { ritual: { roll: number } }).ritual.roll
    await expect(page.locator('#prop')).toHaveAttribute('src', new RegExp(`chalice-${rolled}\\.png`))

    // And the action itself is refused, which is the exploit this closes: a
    // reload is the one moment a player could hope the room had forgotten.
    await page.evaluate(() => window.castlebrynth?.dispatch({ type: 'RITUAL_ROLL' }))
    expect((await state(page)).run!.hp).toBe(before.run!.hp)
  })
})

test.describe('the throw is a reveal, not a decision', () => {
  test('with motion on, the health lands after the die does', async ({ page }) => {
    await boot(page, '?room=sanctuary&hp=40&seed=3', { motion: true })
    await act(page, 'ritual').click()

    // Mid-sequence: the reducer has already healed and already saved, and the
    // orb is still showing the old number.
    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(true)
    const settled = await state(page)
    expect(settled.run!.hp).toBeGreaterThan(40)
    await expect(hp(page)).toHaveAttribute('data-hp', '40')

    // And it arrives on its own, without anything being pressed.
    await expect(hp(page)).toHaveAttribute('data-hp', String(settled.run!.hp), { timeout: 4000 })
    await expect(act(page, 'go')).toBeVisible()
  })

  test('an impatient thumb settles the throw and never rolls twice', async ({ page }) => {
    await boot(page, '?room=sanctuary&hp=40&seed=3', { motion: true })
    await act(page, 'ritual').click()
    const decided = await state(page)

    // The press that lands during the sequence: it ends it, and it does not
    // start another one.
    await page.evaluate(() => window.castlebrynth?.settle())
    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(false)

    const after = await state(page)
    expect(after.run!.hp).toBe(decided.run!.hp)
    expect((after.run as unknown as { ritual: unknown }).ritual).toEqual(
      (decided.run as unknown as { ritual: unknown }).ritual,
    )
    await expect(act(page, 'go')).toBeVisible()
  })

  test('reduced motion reaches exactly the same state, immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=sanctuary&hp=40&seed=3', { motion: true })
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      true,
    )

    await act(page, 'ritual').click()
    // Nothing is held back: the whole outcome is on screen in the same tick.
    expect(await page.evaluate(() => window.castlebrynth?.animating())).toBe(false)

    const after = await state(page)
    const ritual = (after.run as unknown as { ritual: { roll: number; healed: number } }).ritual
    expect(after.run!.hp).toBe(40 + ritual.healed)
    await expect(hp(page)).toHaveAttribute('data-hp', String(after.run!.hp))
    await expect(page.locator('#say')).not.toBeEmpty()
    await expect(act(page, 'go')).toBeVisible()

    // The same seed, with motion, decides the same face — the sequence is
    // reading the roll, never making it.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await boot(page, '?room=sanctuary&hp=40&seed=3', { motion: true })
    await act(page, 'ritual').click()
    const moved = await state(page)
    expect((moved.run as unknown as { ritual: unknown }).ritual).toEqual(ritual)
  })
})
