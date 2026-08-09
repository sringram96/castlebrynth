/**
 * The death of The Gnawing, on a phone.
 *
 * `test/unit/defeat.test.ts` proves the fight parks on a state with one way
 * out of it. This is the half that decides completion: that a player *sees*
 * something die, that the tray offers them nothing to press while it happens,
 * and that the game is never left standing in it.
 *
 * Motion is on throughout — everywhere else in this suite it is off, because
 * everywhere else the question is what the game does rather than how long it
 * takes. Here the several hundred milliseconds are the feature.
 *
 * ## Why there is a recorder
 *
 * The same reason `motion.spec.ts` has one: the frames of the death are up for
 * 110, 110, 160 and 280 ms, and a poll from Node can easily arrive after the
 * thing it was looking for has gone — failing a build that is perfectly
 * correct, and failing it only when the machine is busy. So **every claim
 * about what was on screen mid-death is made by a sampler installed before the
 * moment it is watching**, and nothing here polls the DOM from Node for a
 * frame.
 *
 * It samples on `requestAnimationFrame` rather than on a MutationObserver,
 * unlike `motion.spec.ts`. One of these has to run from an init script — the
 * resume test's page is already inside a death when it finishes loading — and
 * at that point there is no element to observe. A frame here is never shorter
 * than 110 ms, which is six samples.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, screenName, settled, state } from './helpers.js'

/** A fight against the Gnawing, one blow from over, with it on top of you. */
const DOOMED = '?room=hollow&enemyHp=1&reach=close'

interface Seen {
  /** Every value `#enemy[data-defeat]` held, in order, with its arrival. */
  readonly frames: { step: string; at: number }[]
  /** Combat verbs that were live on the tray at any point while it was dying. */
  readonly verbs: string[]
  /** Whether the enemy bar was still declaring an intent while it died. */
  readonly intent: boolean
  /** Every health the enemy bar showed while it was dying. */
  readonly enemyHp: string[]
  /** Whether any full screen was up over the death. */
  readonly screen: boolean
  /** Milliseconds from the start of watching to the win, or null. */
  readonly wonAt: number | null
}

/**
 * The observer.
 *
 * One function, used two ways: evaluated after a boot when the death has not
 * started yet, and installed as an init script when the *boot itself* lands
 * inside one. Both watch `document.documentElement`, because at init time
 * there is not yet a body to watch.
 */
const RECORDER = (): void => {
  const started = performance.now()
  const since = (): number => Math.round(performance.now() - started)
  const seen = {
    frames: [] as { step: string; at: number }[],
    verbs: [] as string[],
    intent: false,
    enemyHp: [] as string[],
    screen: false,
    wonAt: null as number | null,
  }
  ;(window as unknown as { seen: typeof seen }).seen = seen

  const look = (): void => {
    const enemy = document.getElementById('enemy')
    const step = enemy?.dataset['defeat']
    if (step !== undefined) {
      if (seen.frames.at(-1)?.step !== step) seen.frames.push({ step, at: since() })
      // Only the three verbs that move a fight. MENU is not one of them: it
      // opens a reference, changes no state, and stays reachable throughout.
      for (const name of ['roll', 'reroll', 'score']) {
        const found = document.querySelector<HTMLElement>(`#tray [data-act="${name}"]`)
        if (found && found.offsetParent !== null && !seen.verbs.includes(name)) seen.verbs.push(name)
      }
      if (document.getElementById('intent')) seen.intent = true
      const hp = document.getElementById('enemy-hp')?.textContent
      if (hp && !seen.enemyHp.includes(hp)) seen.enemyHp.push(hp)
      const over = document.getElementById('screen')
      if (over && !over.hidden && over.dataset['screen']) seen.screen = true
    }
    const screen = document.getElementById('screen')
    const won =
      screen?.dataset['screen'] === 'reward' || document.querySelector('#tray [data-act="go"]') !== null
    if (won && seen.wonAt === null) seen.wonAt = since()
  }

  // Sample every frame until the win has been seen and held for a moment, so
  // the record is complete and the page is not left spinning a loop.
  let after = 0
  const tick = (): void => {
    look()
    if (seen.wonAt !== null && ++after > 30) return
    requestAnimationFrame(tick)
  }
  tick()
}

const watch = (page: Page): Promise<void> => page.evaluate(RECORDER)
const arm = (page: Page): Promise<void> => page.addInitScript(RECORDER)

/** Wait for the win the recorder saw, and hand back everything it recorded. */
async function played(page: Page): Promise<Seen> {
  await expect
    .poll(async () => (await page.evaluate(() => (window as unknown as { seen: Seen }).seen)).wonAt, {
      timeout: 8000,
    })
    .not.toBeNull()
  return page.evaluate(() => (window as unknown as { seen: Seen }).seen)
}

/** Roll, choose one die, and put it in. Enough to kill a thing on 1 HP. */
async function killIt(page: Page): Promise<void> {
  await act(page, 'roll').click()
  await page.locator('.die[data-slot="0"]').click()
  await watch(page)
  await act(page, 'score').click()
}

test.describe('the Gnawing gives out', () => {
  test('plays every authored frame of its death before the win', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await killIt(page)
    const seen = await played(page)

    // Four frames, in order, and none of them skipped. This is the assertion
    // the whole feature exists for: killing it is a thing that happens on
    // screen rather than a screen that replaces another one.
    expect(seen.frames.map((f) => f.step)).toEqual(['0', '1', '2', '3'])

    // And it is short. A death long enough to notice waiting through is worse
    // than no death at all.
    const first = seen.frames[0]!.at
    const last = seen.frames.at(-1)!.at
    expect(last - first, 'the collapse drags').toBeLessThan(900)
    expect(seen.wonAt!, 'the win arrives before the body has settled').toBeGreaterThan(last)
  })

  test('offers nothing to press while it is dying', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await killIt(page)
    const seen = await played(page)

    expect(seen.verbs, 'a combat verb was live over a corpse').toEqual([])
    expect(seen.intent, 'a dead thing was still declaring its next move').toBe(false)
    // MENU is not a move and never goes away.
    expect(await act(page, 'menu').count()).toBe(1)
  })

  test('shows the health gone, and no win, for the whole of the fall', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await killIt(page)
    const seen = await played(page)

    // The enemy bar reads zero from the first frame of the death to the last,
    // and no reward screen is allowed over the top of it. Those two together
    // are what "the win does not arrive early" means on a screen.
    expect(seen.enemyHp).toEqual(['0 / 140'])
    expect(seen.screen, 'a screen opened over the death').toBe(false)
    expect((await state(page)).run!.combat).toBeUndefined()
  })

  test('lands on the same win when an impatient thumb ends it early', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await killIt(page)
    await settled(page)

    // The promise the whole of `render/` is built on, applied to a death: the
    // outcome was decided and saved before the first frame, so settling in the
    // middle of it loses the pictures and nothing else.
    const now = await state(page)
    expect(now.mode === 'reward' || now.mode === 'explore').toBe(true)
    expect(now.run!.combat).toBeUndefined()
    expect(await page.locator('#enemy[data-defeat]').count()).toBe(0)
  })

  test('never soft-locks: there is always a way on afterwards', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await killIt(page)
    await played(page)

    const screen = await screenName(page)
    if (screen === 'reward') await expect(act(page, 'take').first()).toBeVisible()
    else await expect(act(page, 'go').first()).toBeVisible()
  })
})

test.describe('a reload that landed inside the death', () => {
  test('snaps to the settled frame and finishes the win by itself', async ({ page }) => {
    // `?dying` is the state a save holds if the tab is closed in the moment
    // between the blow and the win — built by playing the killing hand through
    // the real reducer. Booting into it must resolve, not wait. The recorder
    // is armed before the navigation, because by the time Node could look the
    // held frame may already have done its job.
    await arm(page)
    await boot(page, '?room=hollow&dying=1', { motion: true })
    const seen = await played(page)

    // The last frame, not the first: the collapse already happened, and the
    // half worth keeping is the body.
    expect(seen.frames.map((f) => f.step), 'a resume replayed the collapse').toEqual(['3'])
    expect(seen.verbs).toEqual([])
    expect(seen.intent).toBe(false)
    expect(seen.enemyHp).toEqual(['0 / 140'])
    expect((await state(page)).run!.combat).toBeUndefined()
  })
})
