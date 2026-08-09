/**
 * The two environmental rooms, on a phone.
 *
 * `test/unit/rooms.test.ts` proves the reducer cannot be cheated. This proves
 * the half that matters to a player: that a thumb can find these objects, work
 * them in the right order, watch the room answer, and leave — and that closing
 * the tab in the middle of any of it changes nothing.
 *
 * The reduced-motion block at the end is the promise the repository is built
 * on, applied to a new kind of press: the same taps reach the same state in the
 * same tick with every frame of the animation removed.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, screenName, settled, state, tappable } from './helpers.js'
import { fightItOut } from './play.js'

const say = (page: Page) => page.locator('#say')
const hp = (page: Page) => page.locator('#hp')

/** One of the room's objects, by the id the reducer switches on. */
const thing = (page: Page, id: string) => page.locator(`[data-interact="${id}"]`)

/** Every plate the midground is currently holding, in paint order. */
const plates = (page: Page) =>
  page.locator('#world [data-layer="midground"] img[data-prop]:not([data-prop="prop"])')

/** One of the room's objects as it is painted, by the id its plate carries. */
const plate = (page: Page, id: string) =>
  page.locator(`#world [data-layer="midground"] img[data-prop="${id}"]`)

/**
 * How much light is left in a plate, as the browser has computed it.
 *
 * The Reliquary's candles go out by treatment rather than by a second drawing,
 * so "the flame is out" is a number here rather than a filename. `none` is a
 * plate nothing has been done to.
 */
async function brightnessOf(page: Page, id: string): Promise<number> {
  return page.evaluate((prop) => {
    const el = document.querySelector(`img[data-prop="${prop}"]`)
    const filter = el ? getComputedStyle(el).filter : 'none'
    const found = /brightness\(([\d.]+)\)/.exec(filter)
    return found ? Number(found[1]) : 1
  }, id)
}

test.describe('the Reliquary', () => {
  test('arrives with its objects present and the way on already open', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3')

    await expect(say(page)).toContainText('A dead chapel')
    // The things the room is made of, each LOOK-able from the first frame. The
    // altar carries two, because it is two things to the player: a basin to
    // read, and the handle underneath it that the three marks are cut beside.
    for (const id of ['bell', 'brazier', 'altar', 'lever', 'chest']) {
      await expect(page.locator(`[data-detail="${id}"]`)).toBeVisible()
    }
    // Two verbs offered, and two withheld. The lever and the chest are not
    // greyed out — they are absent, because the room has nothing to say about
    // them yet and the three cuts beside the lever are what does the talking.
    await expect(thing(page, 'reliquary-bell')).toHaveText('RING')
    await expect(thing(page, 'reliquary-brazier')).toHaveText('PUT OUT')
    await expect(thing(page, 'reliquary-lever')).toHaveCount(0)
    await expect(thing(page, 'reliquary-chest')).toHaveCount(0)
    // Optional in the strongest sense: the way out is there before anything.
    await expect(act(page, 'go')).toBeVisible()
    await expect(act(page, 'go')).toHaveText('GO ON')
  })

  test('answers a real tap at each object, at 44px', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3')
    await tappable(page, thing(page, 'reliquary-bell'))
    await tappable(page, thing(page, 'reliquary-brazier'))
    await tappable(page, act(page, 'go'))
    // And once the lever is live, it too.
    await boot(page, '?room=reliquary&seed=3&reliquary=dark')
    await tappable(page, thing(page, 'reliquary-lever'))
  })

  test('opens the chest for bell, then dark, then lever — and pays once', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3')

    await thing(page, 'reliquary-bell').click()
    await expect(say(page)).toContainText('The bell answers once')
    // Spent: the verb is gone from the object rather than sitting there dead.
    await expect(thing(page, 'reliquary-bell')).toHaveCount(0)
    // Still not enough on its own.
    await expect(thing(page, 'reliquary-lever')).toHaveCount(0)

    await thing(page, 'reliquary-brazier').click()
    await expect(say(page)).toContainText('The flame folds into the wick')
    // The brazier turns round rather than going away — it is a light, not a
    // one-shot — and now the lever has something to say.
    await expect(thing(page, 'reliquary-brazier')).toHaveText('LIGHT')
    await expect(thing(page, 'reliquary-lever')).toHaveText('PULL')

    await thing(page, 'reliquary-lever').click()
    await expect(say(page)).toContainText('Something moves inside the altar')
    await expect(thing(page, 'reliquary-lever')).toHaveCount(0)
    await expect(thing(page, 'reliquary-chest')).toHaveText('TAKE')

    await thing(page, 'reliquary-chest').click()
    await expect(say(page)).toContainText('Inside:')
    await expect(thing(page, 'reliquary-chest')).toHaveCount(0)

    const after = await state(page)
    expect(after.run?.relics).toHaveLength(1)
    // The relic is carried, and it is on the tray where every relic is.
    await expect(page.locator(`.relic[data-relic-id="${after.run!.relics[0]}"]`)).toBeVisible()
  })

  test('cannot be made to pay twice by an impatient thumb', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3&reliquary=open', { motion: true })
    // With motion on, the sequence holds the *previous* room on screen while
    // it plays — so TAKE is still under the thumb for a few hundred ms after
    // it has already paid out. That is the press this has to survive, and the
    // only reason it does is that the reducer settled and saved before the
    // first frame of the chest opening was scheduled.
    const take = thing(page, 'reliquary-chest')
    await take.click()
    await take.click({ timeout: 2000 }).catch(() => {})
    await settled(page)
    expect((await state(page)).run?.relics).toHaveLength(1)
    await expect(thing(page, 'reliquary-chest')).toHaveCount(0)
  })

  test('can be walked straight through, and lands at the fork', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3')
    await act(page, 'go').click()
    expect((await state(page)).run?.roomId).toBe('fork')
    // Untouched and unpunished.
    expect((await state(page)).run?.hp).toBe(100)
    await expect(act(page, 'go')).toHaveCount(2)
  })
})

test.describe('the Chain Vault', () => {
  test('arrives shut, with no way on at all', async ({ page }) => {
    await boot(page, '?room=chain-vault&seed=3')

    await expect(say(page)).toContainText('ends at an iron gate')
    await expect(thing(page, 'vault-chain')).toHaveText('LOWER')
    await expect(thing(page, 'vault-lever')).toHaveText('PULL')
    // Not hidden by CSS — not rendered, because the reducer would refuse it.
    await expect(act(page, 'go')).toHaveCount(0)
    // The rule is on the wall, for anyone who looks.
    await page.locator('[data-detail="wall-panel"]').click()
    await expect(say(page)).toContainText('a weight falling, then a gate lifting')
  })

  test('answers a real tap at each control, at 44px', async ({ page }) => {
    await boot(page, '?room=chain-vault&seed=3')
    await tappable(page, thing(page, 'vault-chain'))
    await tappable(page, thing(page, 'vault-lever'))
  })

  test('costs six health for a lever pulled against nothing', async ({ page }) => {
    await boot(page, '?room=chain-vault&seed=3')
    await expect(hp(page)).toHaveText('100')

    await thing(page, 'vault-lever').click()
    await expect(say(page)).toContainText('The mechanism snaps back')
    await expect(hp(page)).toHaveText('94')
    // And it bought nothing: still shut, still no way on.
    await expect(act(page, 'go')).toHaveCount(0)
    expect((await state(page)).run?.hp).toBe(94)
  })

  test('opens the gate for cage, then lever — and lets you out', async ({ page }) => {
    await boot(page, '?room=chain-vault&seed=3')

    await thing(page, 'vault-chain').click()
    await expect(say(page)).toContainText('The cage drops onto the plate')
    // The control turns round with the object it moves.
    await expect(thing(page, 'vault-chain')).toHaveText('RAISE')
    await expect(act(page, 'go')).toHaveCount(0)

    await thing(page, 'vault-lever').click()
    await expect(say(page)).toContainText('The gate rises')
    // Cost nothing, and the machinery is spent.
    await expect(hp(page)).toHaveText('100')
    await expect(thing(page, 'vault-chain')).toHaveCount(0)
    await expect(thing(page, 'vault-lever')).toHaveCount(0)

    const go = act(page, 'go')
    await expect(go).toBeVisible()
    await tappable(page, go)
    await go.click()
    expect((await state(page)).run?.roomId).toBe('deep')
    await expect(say(page)).toContainText('The Marrow')
  })

  test('can kill you, and lands on the death the game already has', async ({ page }) => {
    await boot(page, '?room=chain-vault&hp=6&seed=3')
    await thing(page, 'vault-lever').click()
    expect(await screenName(page)).toBe('dead')
    await expect(page.locator('#screen')).toContainText('The chain mechanism')
    // One press back to a new run, exactly as any other death.
    await expect(act(page, 'start')).toBeVisible()
  })
})

test.describe('the deep route, end to end', () => {
  test('runs fork → vault → Deep Way, and the stair still does not', async ({ page }) => {
    await boot(page, '?room=fork&seed=3')
    const deep = page.locator('[data-act="go"][data-to="chain-vault"]')
    await expect(deep).toHaveText('DEEP')
    await deep.click()
    expect((await state(page)).run?.roomId).toBe('chain-vault')

    await thing(page, 'vault-chain').click()
    await thing(page, 'vault-lever').click()
    await act(page, 'go').click()
    expect((await state(page)).run?.roomId).toBe('deep')

    // And the short way is untouched: straight to the door, no vault.
    await boot(page, '?room=fork&seed=3')
    const stair = page.locator('[data-act="go"][data-to="gate"]')
    await expect(stair).toHaveText('STAIR')
    await stair.click()
    expect((await state(page)).run?.roomId).toBe('gate')
  })

  test('puts the Reliquary between the chapel and the fork', async ({ page }) => {
    await boot(page, '?room=sanctuary&hp=40&seed=3')
    await act(page, 'ritual').click()
    await act(page, 'go').click()
    expect((await state(page)).run?.roomId).toBe('reliquary')
    await act(page, 'go').click()
    expect((await state(page)).run?.roomId).toBe('fork')
  })
})

/**
 * The same journeys with motion turned off at the media level.
 *
 * Not `motion=0`, which is the app's own switch, but the browser telling the
 * page that a person has asked for less movement. Every outcome below has to
 * be identical, because none of them was ever produced by an animation.
 */
test.describe('with motion reduced', () => {
  test.use({ reducedMotion: 'reduce' })

  test('solves the Reliquary to the same relic, in the same tick', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3', { motion: true })
    await thing(page, 'reliquary-bell').click()
    await thing(page, 'reliquary-brazier').click()
    await thing(page, 'reliquary-lever').click()
    await thing(page, 'reliquary-chest').click()

    const after = await state(page)
    expect(after.run?.relics).toHaveLength(1)
    await expect(say(page)).toContainText('Inside:')
    await expect(act(page, 'go')).toBeVisible()

    // Every object is where it was, at the position the save records, with
    // nothing moving and nothing missing. A swing that never ran costs the
    // room nothing, because the swing was never carrying anything.
    await expect(plates(page)).toHaveCount(4)
    for (const id of ['reliquary-altar', 'reliquary-bell', 'reliquary-brazier', 'reliquary-chest']) {
      await expect(plate(page, id)).toBeVisible()
      await expect(plate(page, id)).not.toHaveAttribute('data-move', /.*/)
    }
    await expect(plate(page, 'reliquary-bell')).toHaveAttribute('data-look', 'rung')
    await expect(plate(page, 'reliquary-brazier')).toHaveAttribute('data-look', 'out')
    await expect(plate(page, 'reliquary-chest')).toHaveAttribute('data-look', 'open')

    // The same seed and the same history reach the same relic with motion on.
    await boot(page, '?room=reliquary&seed=3&reliquary=solved')
    expect((await state(page)).run?.relics).toEqual(after.run?.relics)
  })

  test('opens the vault, and charges the same six for getting it wrong', async ({ page }) => {
    await boot(page, '?room=chain-vault&seed=3', { motion: true })
    await thing(page, 'vault-lever').click()
    await expect(hp(page)).toHaveText('94')

    await thing(page, 'vault-chain').click()
    await thing(page, 'vault-lever').click()
    await expect(hp(page)).toHaveText('94')
    await expect(act(page, 'go')).toBeVisible()
    await act(page, 'go').click()
    expect((await state(page)).run?.roomId).toBe('deep')
  })
})

/**
 * The midground, which is where all of this is painted.
 *
 * The plates have not been delivered — see `## HUMAN ART REQUIRED` — so what
 * is asserted here is the property that has to hold whether they land or not:
 * whatever the room paints, it never eats a press, and it is a function of the
 * save rather than something an animation left behind.
 */
test.describe('the room is art, and the art is not the interface', () => {
  test('never lets a plate take a tap', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3&reliquary=dark')
    for (const node of await plates(page).all()) {
      expect(await node.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    }
    // Which is the only reason the object underneath is still pressable.
    await tappable(page, thing(page, 'reliquary-lever'))
  })

  /**
   * The four objects, on screen.
   *
   * The Reliquary's art arrived as a portrait of each object rather than as a
   * family of positions, so what has to be proved here is not that a frame swap
   * lands — there are no frame swaps — but that **the room is four things and
   * stays four things**. A plate that resolved to nothing would vanish quietly:
   * `propArt` answers `undefined` by contract and the view filters it out.
   */
  const OBJECTS = ['reliquary-altar', 'reliquary-bell', 'reliquary-brazier', 'reliquary-chest']

  test('shows the altar, the bell, the candles and the chest, all at once', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3')
    await expect(plates(page)).toHaveCount(4)
    for (const id of OBJECTS) await expect(plate(page, id)).toBeVisible()

    // Four objects, four drawings. One source used twice would be one object
    // painted twice, which is the pile the composition exists to avoid.
    const sources = await plates(page).evaluateAll((els) =>
      els.map((el) => el.getAttribute('src') ?? ''),
    )
    expect(new Set(sources).size).toBe(4)

    // And they are four *places*: every pair of the room's controls is far
    // enough apart that a thumb cannot mean both.
    const spots = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('#hits button')].map((el) => {
        const r = el.getBoundingClientRect()
        return { id: el.dataset['interact'] ?? `look:${el.dataset['detail']}`, x: r.x + r.width / 2, y: r.y + r.height / 2 }
      }),
    )
    expect(spots.length).toBeGreaterThanOrEqual(7)
    for (const a of spots) {
      for (const b of spots) {
        if (a.id >= b.id) continue
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} and ${b.id} are the same tap`).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('answers a real tap at every one of them, at 44px', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3&reliquary=solved')
    // The far side of the puzzle, where the room has the fewest verbs left —
    // so what is checked is that the LOOKs are still on the objects and still
    // reachable once the actions have gone.
    for (const id of ['bell', 'brazier', 'altar', 'lever', 'chest']) {
      await tappable(page, page.locator(`[data-detail="${id}"]`))
    }
    await tappable(page, act(page, 'go'))
  })

  test('swings the bell when it is rung, and puts it back down', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3', { motion: true })
    const bell = plate(page, 'reliquary-bell')
    // Still, until it is rung. Nothing in this room moves on arrival.
    expect(await bell.evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName))).toEqual([])

    await thing(page, 'reliquary-bell').click()
    await expect(bell).toHaveAttribute('data-move', 'swing')
    // Actually turning, not merely labelled as turning.
    const turned = await bell.evaluate((el) => getComputedStyle(el).transform)
    expect(turned).not.toBe('none')

    // And it settles: the bell is still in the room, still the same drawing,
    // with nothing left running on it and nothing left rotating it.
    await settled(page)
    await expect(bell).toBeVisible()
    await expect(bell).not.toHaveAttribute('data-move', /.*/)
    await expect(bell).toHaveAttribute('data-look', 'rung')
    expect(await bell.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
  })

  test('takes the light out of the candles, and gives it back', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3')
    const candles = plate(page, 'reliquary-brazier')
    await expect(candles).toHaveAttribute('data-look', 'lit')
    expect(await brightnessOf(page, 'reliquary-brazier')).toBeGreaterThan(0.9)

    await thing(page, 'reliquary-brazier').click()
    await settled(page)
    // Same plate, visibly dead. The object never leaves the room.
    await expect(candles).toBeVisible()
    await expect(candles).toHaveAttribute('data-look', 'out')
    expect(await brightnessOf(page, 'reliquary-brazier')).toBeLessThan(0.6)

    await thing(page, 'reliquary-brazier').click()
    await settled(page)
    await expect(candles).toHaveAttribute('data-look', 'lit')
    expect(await brightnessOf(page, 'reliquary-brazier')).toBeGreaterThan(0.9)
  })

  test('knocks the chest when the mechanism goes, and leaves it standing', async ({ page }) => {
    await boot(page, '?room=reliquary&seed=3&reliquary=dark', { motion: true })
    const chest = plate(page, 'reliquary-chest')
    await expect(chest).toHaveAttribute('data-look', 'closed')

    await thing(page, 'reliquary-lever').click()
    await expect(chest).toHaveAttribute('data-move', 'knock')

    await settled(page)
    // The chest has no painted open state — see `## HUMAN ART REQUIRED` — so
    // what the player is told is the word band and the verb, and what must not
    // happen is the chest disappearing because a plate was asked for that
    // nobody painted.
    await expect(chest).toBeVisible()
    await expect(chest).toHaveAttribute('data-look', 'open')
    await expect(thing(page, 'reliquary-chest')).toHaveText('TAKE')
  })

  test('is still four objects with the app’s motion switch off', async ({ page }) => {
    // `motion=0` settles every sequence instantly. The room is a function of
    // the save either way, so the picture is the finished picture at once.
    await boot(page, '?room=reliquary&seed=3')
    await thing(page, 'reliquary-bell').click()
    await thing(page, 'reliquary-brazier').click()
    await thing(page, 'reliquary-lever').click()
    await expect(plates(page)).toHaveCount(4)
    for (const id of OBJECTS) await expect(plate(page, id)).toBeVisible()
    // Nothing is left mid-move, because no move was ever started.
    for (const id of OBJECTS) await expect(plate(page, id)).not.toHaveAttribute('data-move', /.*/)
    await thing(page, 'reliquary-chest').click()
    expect((await state(page)).run?.relics).toHaveLength(1)
    await expect(act(page, 'go')).toBeVisible()
  })
})

/**
 * The far side of a reload.
 *
 * These walk the route rather than standing on a fixture, because a fixture
 * deliberately does not persist — `main.ts` passes `persist: !hasFixture`, so a
 * test run can never inherit a half-finished session. Which means the only
 * honest way to prove a room survives the tab closing is to get there the way
 * a player does and then actually close it.
 */
test.describe('across a real reload', () => {
  /** Start, beat the Gnawing, use the font, and step into the dead chapel. */
  async function walkToReliquary(page: Page): Promise<void> {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    expect(await fightItOut(page), 'lost to the Gnawing').toBe('won')
    if ((await screenName(page)) === 'reward') {
      await page.locator('[data-act="take"]').first().click()
    }
    await act(page, 'go').click()
    await act(page, 'ritual').click()
    await act(page, 'go').click()
    expect((await state(page)).run!.roomId).toBe('reliquary')
  }

  test('brings the Reliquary back solved, claimed and unrepeatable', async ({ page }) => {
    await walkToReliquary(page)

    await thing(page, 'reliquary-bell').click()
    await thing(page, 'reliquary-brazier').click()
    await thing(page, 'reliquary-lever').click()
    await thing(page, 'reliquary-chest').click()
    const before = await state(page)
    const midground = await plates(page).evaluateAll((els) =>
      els.map((el) => `${(el as HTMLElement).dataset['prop']}=${el.getAttribute('src') ?? ''}`),
    )

    await page.reload()
    await act(page, 'continue').click()

    const after = await state(page)
    expect(after.run!.roomId).toBe('reliquary')
    expect(after.run!.relics).toEqual(before.run!.relics)
    // Nothing left to press, and nothing that could pay a second time.
    for (const id of ['reliquary-bell', 'reliquary-lever', 'reliquary-chest']) {
      await expect(thing(page, id)).toHaveCount(0)
    }
    // And the picture is the same picture, derived from the save rather than
    // left behind by the sequence that played it.
    const painted = await plates(page).evaluateAll((els) =>
      els.map((el) => `${(el as HTMLElement).dataset['prop']}=${el.getAttribute('src') ?? ''}`),
    )
    expect(painted).toEqual(midground)
    await act(page, 'go').click()
    expect((await state(page)).run!.roomId).toBe('fork')
  })

  test('brings the Chain Vault back shut when it was shut, and open when it was open', async ({
    page,
  }) => {
    await walkToReliquary(page)
    await act(page, 'go').click()
    await page.locator('[data-act="go"][data-to="chain-vault"]').click()
    expect((await state(page)).run!.roomId).toBe('chain-vault')

    // Half-worked: the cage is down, the gate is not up, and there is no exit.
    await thing(page, 'vault-chain').click()
    await expect(act(page, 'go')).toHaveCount(0)

    await page.reload()
    await act(page, 'continue').click()

    await expect(thing(page, 'vault-chain')).toHaveText('RAISE')
    await expect(act(page, 'go')).toHaveCount(0)
    // A reload is not a way through a shut gate.
    expect((await state(page)).run!.roomId).toBe('chain-vault')

    // Finish it, and reload again on the open side.
    await thing(page, 'vault-lever').click()
    await expect(act(page, 'go')).toBeVisible()

    await page.reload()
    await act(page, 'continue').click()

    await expect(act(page, 'go')).toBeVisible()
    await expect(thing(page, 'vault-lever')).toHaveCount(0)
    await act(page, 'go').click()
    expect((await state(page)).run!.roomId).toBe('deep')
  })
})
