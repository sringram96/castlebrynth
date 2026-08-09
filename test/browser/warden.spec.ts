/**
 * The Warden, on a phone.
 *
 * `test/unit/presentation.test.ts` proves the lookup is a lookup: which drawing
 * belongs to which fact, and that no answer it gives is a rule. This is the
 * half that decides completion — that the drawings are actually *on the screen*
 * on the beats they belong to, and that putting them there costs the fight
 * nothing.
 *
 * Two claims run through every test below, and they are the two the whole
 * change is for:
 *
 *   1. **the picture follows the fight.** Its health picks the plate it stands
 *      in, the intent that resolved picks the plate it acts in, and its death
 *      is two plates it was drawn dying in.
 *   2. **the picture decides nothing.** RAISE has the defensive drawing and
 *      still costs the player nothing; JUDGE has the attacking drawing and
 *      still costs twenty; and a turn played with motion off ends on exactly
 *      the state a turn played with motion on ends on.
 *
 * ## Why there is a recorder
 *
 * The same reason `defeat.spec.ts` has one. The attack plate is up for about
 * 230 ms and an idle plate for 700, and a poll from Node can easily arrive
 * after the thing it was looking for has gone — failing a build that is
 * perfectly correct, and failing it only when the machine is busy. So every
 * claim about *what was on screen* is made by a sampler installed before the
 * moment it is watching, and nothing here polls the DOM from Node for a frame.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, settled, state } from './helpers.js'

/** The Warden's script. Turn 0 and 1 STRIKE 8, turn 2 RAISE 0, turn 3 JUDGE 20. */
const AT_THE_DOOR = '?room=gate&hp=90&enemyHp=300'
const strikeTurn = `${AT_THE_DOOR}&turn=0`
const raiseTurn = `${AT_THE_DOOR}&turn=2`
const judgeTurn = `${AT_THE_DOOR}&turn=3`

interface Seen {
  /** Every plate `#enemy` showed, in order, with when it arrived. */
  readonly plates: { plate: string; at: number }[]
  /** Every box it occupied. One entry means it never moved or resized. */
  readonly boxes: string[]
  /** Every value `#enemy[data-defeat]` held, in order. */
  readonly defeats: string[]
}

const RECORDER = (): void => {
  const started = performance.now()
  const seen = {
    plates: [] as { plate: string; at: number }[],
    boxes: [] as string[],
    defeats: [] as string[],
  }
  ;(window as unknown as { seen: typeof seen }).seen = seen

  const look = (): void => {
    const el = document.getElementById('enemy')
    if (!el || (el as HTMLImageElement).hidden) return
    const plate = (el.getAttribute('src') ?? '').split('/').pop() ?? ''
    if (plate && seen.plates.at(-1)?.plate !== plate) {
      seen.plates.push({ plate, at: Math.round(performance.now() - started) })
    }
    // The **layout** box, and deliberately not the painted one. A pose swap is
    // a change of source and must not be a change of geometry, so every frame
    // the Warden shows has to land in exactly one of these — but the camera
    // moves constantly and legitimately, and a client rect would record every
    // frame of the screen shake as the Warden having jumped. `offset*` is the
    // box the compositor placed; the shake is the player's head.
    const at = `${el.offsetLeft},${el.offsetTop},${el.offsetWidth},${el.offsetHeight}`
    if (!seen.boxes.includes(at)) seen.boxes.push(at)
    const step = el.dataset['defeat']
    if (step !== undefined && seen.defeats.at(-1) !== step) seen.defeats.push(step)
  }

  const tick = (): void => {
    look()
    requestAnimationFrame(tick)
  }
  tick()
}

const watch = (page: Page): Promise<void> => page.evaluate(RECORDER)
const recorded = (page: Page): Promise<Seen> =>
  page.evaluate(() => (window as unknown as { seen: Seen }).seen)

/** Every plate seen, as its pose: `warden-idle-mid-2.png` → `idle-mid-2`. */
const poses = (seen: Seen): string[] =>
  seen.plates.map((p) => p.plate.replace(/^warden-/, '').replace(/\.png$/, ''))

/** Roll, put the whole hand in, and score it. One turn of the fight. */
async function takeATurn(page: Page): Promise<void> {
  await act(page, 'roll').click()
  for (const slot of [0, 1, 2, 3, 4, 5]) await page.locator(`.die[data-slot="${slot}"]`).click()
  await watch(page)
  await act(page, 'score').click()
}

/** Wait until the recorder has seen a pose, so nothing is polled from Node. */
async function sees(page: Page, pose: string, timeout = 6000): Promise<void> {
  await expect
    .poll(async () => poses(await recorded(page)), { timeout })
    .toContain(pose)
}

/**
 * Wait for the turn to end on its own.
 *
 * Not `settle()`: that ends a sequence early, which is a different claim. These
 * tests are about the beats happening, so the sequence is left to run out and
 * the poll is tight enough to measure how long that took.
 */
async function quiet(page: Page): Promise<void> {
  await expect
    .poll(async () => await page.evaluate(() => window.castlebrynth?.animating()), {
      timeout: 6000,
      intervals: [40],
    })
    .toBe(false)
}

test.describe('the Warden deteriorates as it is beaten', () => {
  test('stands whole at the door before a blow is struck', async ({ page }) => {
    // The room, not the fight: no `enemyHp`, so nothing has opened yet. The
    // boss is visible before any combat control is — and the plate it is
    // standing in is the full-health one, because it has not been touched.
    //
    // Recorded from an init script rather than asserted against the DOM: the
    // loop is running, so by the time Node could look it may legitimately be
    // showing the band's second plate. The claim is what it *opened* on.
    await page.addInitScript(RECORDER)
    await boot(page, '?room=gate&hp=90', { motion: true })
    await expect(act(page, 'fight')).toBeVisible()
    expect(poses(await recorded(page))[0]).toBe('idle-full-1')
  })

  test('breathes: two full-health plates, cut between, and nothing else', async ({ page }) => {
    await boot(page, AT_THE_DOOR, { motion: true })
    await watch(page)
    // Both plates of the band, which is the loop running. 700 ms apiece, so a
    // second and a half is two swaps with room to spare.
    await sees(page, 'idle-full-2')
    await sees(page, 'idle-full-1')

    const seen = await recorded(page)
    // And only that band. A loop that wandered into another one would mean the
    // health it is reading is not the health on the bar.
    expect(new Set(poses(seen))).toEqual(new Set(['idle-full-1', 'idle-full-2']))
    // The whole reason the plates are whole scenes: swapping one for another
    // moves nothing. If this ever holds two boxes, the boss is jumping.
    expect(seen.boxes, 'the Warden changed size or place between idle frames').toHaveLength(1)
  })

  test('uses the middle plates once it is under two thirds', async ({ page }) => {
    await boot(page, `${AT_THE_DOOR.replace('enemyHp=300', 'enemyHp=150')}`, { motion: true })
    await expect(page.locator('#enemy')).toHaveAttribute('src', /warden-idle-mid-1\.png$/)
    await watch(page)
    await sees(page, 'idle-mid-2')
    const seen = await recorded(page)
    expect(new Set(poses(seen))).toEqual(new Set(['idle-mid-1', 'idle-mid-2']))
    expect(seen.boxes).toHaveLength(1)
  })

  test('uses the last plates once it is under a third', async ({ page }) => {
    await boot(page, `${AT_THE_DOOR.replace('enemyHp=300', 'enemyHp=60')}`, { motion: true })
    await expect(page.locator('#enemy')).toHaveAttribute('src', /warden-idle-low-1\.png$/)
    await watch(page)
    await sees(page, 'idle-low-2')
    const seen = await recorded(page)
    expect(new Set(poses(seen))).toEqual(new Set(['idle-low-1', 'idle-low-2']))
    expect(seen.boxes).toHaveLength(1)
  })

  test('reconstructs the right plate from a reload, with no frame in the save', async ({ page }) => {
    // The claim `render/` is built on, applied to a health ladder: the settled
    // picture is a function of the save and nothing else, so there is no
    // animation clock to recover and every reload lands on the first plate of
    // the band the health says.
    for (const [enemyHp, plate] of [
      [235, 'warden-idle-full-1.png'],
      [175, 'warden-idle-mid-1.png'],
      [75, 'warden-idle-low-1.png'],
    ] as const) {
      await boot(page, `?room=gate&mode=combat&enemyHp=${enemyHp}`)
      await expect(page.locator('#enemy')).toHaveAttribute('src', new RegExp(`${plate}$`))
    }
  })
})

test.describe('the Warden is seen doing what it did', () => {
  test('throws its arms wide for STRIKE, and still deals eight', async ({ page }) => {
    await boot(page, strikeTurn, { motion: true })
    await expect(page.locator('#intent')).toHaveText('STRIKE 8')
    await takeATurn(page)
    await sees(page, 'attack')
    await quiet(page)

    // Idle, then the attack, then back to an idle. The order is the assertion:
    // an attack plate that never went away would be a fight stuck mid-swing.
    const seen = await recorded(page)
    const shown = poses(seen)
    expect(shown[0], 'the turn did not open on an idle plate').toMatch(/^idle-/)
    expect(shown).toContain('attack')
    expect(shown.at(-1), 'the Warden was left standing in its attack').toMatch(/^idle-/)
    expect(seen.boxes, 'the Warden moved when it swung').toHaveLength(1)

    // And it cost exactly what it always cost. Eight, off ninety.
    await settled(page)
    expect((await state(page)).run!.hp).toBe(82)
  })

  test('draws itself up for RAISE, deals nothing, and still announces JUDGE', async ({ page }) => {
    await boot(page, raiseTurn, { motion: true })
    await expect(page.locator('#intent')).toHaveText('RAISE')
    await takeATurn(page)
    await sees(page, 'defense')
    await quiet(page)

    const seen = await recorded(page)
    const shown = poses(seen)
    expect(shown[0]).toMatch(/^idle-/)
    expect(shown).toContain('defense')
    // Never the attack plate on this turn. The trap the mapping exists to
    // avoid is reading the *next* intent — which on this turn is JUDGE, and
    // would show the Warden lunging on the one turn it does nothing.
    expect(shown, 'RAISE was drawn as an attack').not.toContain('attack')
    expect(shown.at(-1)).toMatch(/^idle-/)
    expect(seen.boxes).toHaveLength(1)

    await settled(page)
    // The pose is not armour. Zero damage to the player, and the telegraph it
    // was always a telegraph for.
    expect((await state(page)).run!.hp).toBe(90)
    await expect(page.locator('#intent')).toHaveText('JUDGE 20')
  })

  test('throws its arms wide for JUDGE, and still deals twenty', async ({ page }) => {
    await boot(page, judgeTurn, { motion: true })
    await expect(page.locator('#intent')).toHaveText('JUDGE 20')
    await takeATurn(page)
    await sees(page, 'attack')
    await quiet(page)

    const seen = await recorded(page)
    expect(poses(seen)).toContain('attack')
    expect(poses(seen).at(-1)).toMatch(/^idle-/)
    expect(seen.boxes).toHaveLength(1)

    await settled(page)
    expect((await state(page)).run!.hp).toBe(70)
  })

  test('adds nothing to the turn: the same score, the same length', async ({ page }) => {
    // The presentation lives inside the existing beats and may not lengthen
    // them. A turn is still over inside the second it always took.
    await boot(page, strikeTurn, { motion: true })
    await takeATurn(page)
    const started = Date.now()
    await quiet(page)
    expect(Date.now() - started, 'the turn grew a beat').toBeLessThan(1400)
  })
})

test.describe('the Warden stops', () => {
  const DOOMED = '?room=gate&hp=90&enemyHp=1'

  test('plays both authored plates of its death, in order', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await act(page, 'roll').click()
    await page.locator('.die[data-slot="0"]').click()
    await watch(page)
    await act(page, 'score').click()

    await sees(page, 'defeat-2')
    const seen = await recorded(page)
    const shown = poses(seen)
    // It gives way, then it is down. Neither skipped, and in that order.
    expect(shown.indexOf('defeat-1')).toBeGreaterThanOrEqual(0)
    expect(shown.indexOf('defeat-2')).toBeGreaterThan(shown.indexOf('defeat-1'))
    expect(seen.defeats).toEqual(['0', '1'])
    // Drawn falling, not staged falling: it is placed identically on both
    // frames, because the collapse is in the pixels.
    expect(seen.boxes, 'an authored death was staged on top of itself').toHaveLength(1)
  })

  test('resumes from a reload on the body, and finishes the win by itself', async ({ page }) => {
    // `?dying` is the state a save holds if the tab is closed in the moment
    // between the blow and the way out, played through the real reducer. The
    // recorder is armed before the navigation, because the page is already
    // inside the death by the time it finishes loading.
    //
    // The last plate, not the first: the collapse already happened, and the
    // half worth keeping is the body.
    await page.addInitScript(RECORDER)
    await boot(page, '?room=gate&dying=1', { motion: true })
    await expect(act(page, 'go').first()).toBeVisible({ timeout: 8000 })

    const seen = await recorded(page)
    expect(poses(seen), 'a resume replayed the collapse').toEqual(['defeat-2'])
    expect(seen.boxes).toHaveLength(1)
    expect((await state(page)).run!.combat).toBeUndefined()
  })

  test('finishes into the way out, and the way out ends the run', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await act(page, 'roll').click()
    await page.locator('.die[data-slot="0"]').click()
    await act(page, 'score').click()

    // No loot, and no extra room. The boss holds the exit; escape is the pay.
    await expect(act(page, 'go').first()).toBeVisible({ timeout: 8000 })
    expect((await state(page)).run!.combat).toBeUndefined()
    await act(page, 'go').first().click()
    await expect.poll(async () => (await state(page)).mode).toBe('complete')
  })
})

test.describe('with motion off', () => {
  test('never loops, and settles on the plate its health says', async ({ page }) => {
    await boot(page, `${AT_THE_DOOR.replace('enemyHp=300', 'enemyHp=150')}`)
    await watch(page)
    // Long enough for two swaps if there were any. There are none: reduced
    // motion gets the first plate of the band and no loop at all.
    await page.waitForTimeout(1800)
    const seen = await recorded(page)
    expect(poses(seen)).toEqual(['idle-mid-1'])
  })

  test('reaches exactly the state motion reaches, on every turn of the script', async ({ page }) => {
    // The promise the whole of `render/` is built on. Nothing above may have
    // put a decision inside a sequence, so a fixture played with the pictures
    // and without them has to land on the same numbers.
    for (const [fixture, name] of [
      [strikeTurn, 'STRIKE'],
      [raiseTurn, 'RAISE'],
      [judgeTurn, 'JUDGE'],
    ] as const) {
      await boot(page, fixture, { motion: true })
      await takeATurn(page)
      await settled(page)
      const animated = await state(page)

      await boot(page, fixture)
      await act(page, 'roll').click()
      for (const slot of [0, 1, 2, 3, 4, 5]) await page.locator(`.die[data-slot="${slot}"]`).click()
      await act(page, 'score').click()
      const still = await state(page)

      expect(still, `${name} resolved differently without its pictures`).toEqual(animated)
    }
  })
})
