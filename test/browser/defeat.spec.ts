/**
 * A horror stopping, on a phone.
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
 * The frames of a death are up for 110–420 ms, and a poll from Node can easily
 * arrive after the thing it was looking for has gone — failing a build that is
 * perfectly correct, and failing it only when the machine is busy. So **every
 * claim about what was on screen mid-death is made by a sampler installed
 * before the moment it is watching**, and nothing here polls the DOM from Node
 * for a frame.
 *
 * It samples on `requestAnimationFrame` because one of these has to run from
 * an init script — the resume test's page is already inside a death when it
 * finishes loading — and at that point there is no element to observe.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, screenName, state } from './helpers.js'

/** A fight one lane from over, played to that lane by the fixture. */
const DOOMED = '?room=hollow&dying=1'

interface Seen {
  /** Every value `#enemy[data-defeat]` held, in order, with its arrival. */
  readonly frames: { step: string; at: number }[]
  /** Combat verbs that were ever on screen while it was dying. */
  readonly verbs: string[]
  /** Whether a reward screen was ever up over the top of the death. */
  readonly rewardOverDeath: boolean
  /** How dim the body got. */
  readonly dims: string[]
}

declare global {
  interface Window {
    __seen?: Seen
  }
}

/** Install the sampler before anything is painted. */
async function record(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const seen: Seen = { frames: [], verbs: [], rewardOverDeath: false, dims: [] }
    window.__seen = seen
    const start = performance.now()
    const sample = (): void => {
      const enemy = document.getElementById('enemy')
      const step = enemy?.dataset['defeat']
      if (step !== undefined) {
        const last = seen.frames[seen.frames.length - 1]
        if (!last || last.step !== step) {
          seen.frames.push({ step, at: Math.round(performance.now() - start) })
        }
        const dim = enemy?.style.getPropertyValue('--dim')
        if (dim && !seen.dims.includes(dim)) seen.dims.push(dim)
        for (const name of ['field', 'throw', 'smash', 'round']) {
          if (document.querySelector(`[data-act="${name}"]`) && !seen.verbs.includes(name)) {
            seen.verbs.push(name)
          }
        }
        const screen = document.getElementById('screen')
        if (screen && !screen.hidden && screen.dataset['screen'] === 'reward') {
          seen.rewardOverDeath = true
        }
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
}

const seen = (page: Page): Promise<Seen> =>
  page.evaluate(() => window.__seen ?? { frames: [], verbs: [], rewardOverDeath: false, dims: [] })

/** Wait for the fight to be packed away. */
async function finished(page: Page): Promise<void> {
  await expect
    .poll(async () => (await state(page)).run?.combat === undefined, { timeout: 9000 })
    .toBe(true)
}

test.describe('it stops, and you watch it', () => {
  test('the body plays through its frames', async ({ page }) => {
    await record(page)
    await boot(page, DOOMED, { motion: true })
    await finished(page)

    const watched = await seen(page)
    expect(watched.frames.length, 'no frame of a death was ever on screen').toBeGreaterThan(0)
    // The steps arrive in order and do not go backwards.
    const steps = watched.frames.map((f) => Number(f.step))
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    // And the light goes out of it.
    if (watched.dims.length > 1) {
      const dims = watched.dims.map(Number)
      expect(dims[dims.length - 1]!).toBeLessThan(dims[0]!)
    }
  })

  test('the tray offers nothing while it is dying', async ({ page }) => {
    await record(page)
    await boot(page, DOOMED, { motion: true })
    await finished(page)

    // Not greyed, not waiting: absent. The reducer refuses all four anyway;
    // this is the half of that rule the player can see.
    expect((await seen(page)).verbs).toEqual([])
  })

  test('no reward is ever shown over the top of it', async ({ page }) => {
    await record(page)
    await boot(page, DOOMED, { motion: true })
    await finished(page)
    expect((await seen(page)).rewardOverDeath).toBe(false)
  })

  test('the fight is never left standing in it', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await finished(page)
    // Either a reward screen or the room, and in both cases the fight is gone.
    expect(['reward', null]).toContain(await screenName(page))
    expect((await state(page)).run!.cleared).toContain('hollow')
  })

  test('an impatient thumb gets the same win, immediately', async ({ page }) => {
    await boot(page, DOOMED, { motion: true })
    await page.evaluate(() => window.castlebrynth?.settle())
    await finished(page)
    expect((await state(page)).run!.cleared).toContain('hollow')
  })
})

test.describe('a reload inside a death', () => {
  test('snaps to the settled frame and finishes the win', async ({ page }) => {
    await record(page)
    await boot(page, DOOMED, { motion: true })
    // Reload before it has finished. The kill is in the save — it was
    // committed by the smash that caused it — so there is nothing to
    // recompute and nothing to replay.
    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
    await finished(page)
    expect((await state(page)).run!.cleared).toContain('hollow')
  })
})

test.describe('every enemy in the slice has a visible end', () => {
  for (const [room, name] of [
    ['hollow', 'The Gnawing'],
    ['deep', 'The Marrow'],
    ['gate', 'The Warden'],
  ] as const) {
    test(`${name} is watched finishing`, async ({ page }) => {
      await record(page)
      await boot(page, `?room=${room}&dying=1`, { motion: true })
      await finished(page)
      const watched = await seen(page)
      expect(
        watched.frames.length,
        `${name} stopped being drawn without a death`,
      ).toBeGreaterThan(0)
      expect((await state(page)).run!.cleared).toContain(room)
    })
  }
})
