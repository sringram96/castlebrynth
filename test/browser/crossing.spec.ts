/**
 * Movement, now that it lives in the picture.
 *
 * Three claims, and each of them is a thing the tray-GO could not have been
 * asked for:
 *
 *   - **a way out stands where the art says it stands.** The template declares
 *     an anchor, the map binds an edge to it, and the hotspot's centre lands on
 *     that fraction of the world box — measured, not eyeballed.
 *   - **a held exit renders nothing.** Not a greyed arch, not a dimmed label:
 *     absent. `exitsOpen` and the reducer's GO guard are the one statement of
 *     it and the view obeys.
 *   - **crossing is a beat**, and it decides nothing. The reducer moved the run
 *     and saved it before the first frame; a reload halfway across lands in the
 *     destination, settled, and motion off arrives in the same tick.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, state, wayTo, where } from './helpers.js'
import { fightItOut } from './play.js'

const animating = (page: Page): Promise<boolean> =>
  page.evaluate(() => window.castlebrynth?.animating() ?? false)

/** Where a hotspot's centre sits, as a fraction of the world box. */
async function centreOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const world = (await page.locator('#world').boundingBox())!
  const box = (await page.locator(selector).boundingBox())!
  return {
    x: (box.x + box.width / 2 - world.x) / world.width,
    y: (box.y + box.height / 2 - world.y) / world.height,
  }
}

test.describe('a way out stands where the art says', () => {
  test('lands the hotspot on the anchor the template declared', async ({ page }) => {
    await boot(page, '?room=entry')
    const to = (await state(page)).run!.map.nodes[(await state(page)).run!.roomId]!
    void to
    const at = await centreOf(page, '[data-act="go"]')
    // `entry`'s only anchor: the hall's vanishing point, below the far door.
    expect(at.x).toBeCloseTo(0.53, 1)
    expect(at.y).toBeCloseTo(0.55, 1)
  })

  test('seats two mouths where the junction was painted', async ({ page }) => {
    await boot(page, '?room=cleft')
    await expect(act(page, 'go')).toHaveCount(2)
    const left = await centreOf(
      page,
      `[data-act="go"][data-to="${(await (await wayTo(page, 'hollow')).getAttribute('data-to'))!}"]`,
    )
    const right = await centreOf(
      page,
      `[data-act="go"][data-to="${(await (await wayTo(page, 'offertory')).getAttribute('data-to'))!}"]`,
    )
    expect(left.x).toBeLessThan(0.4)
    expect(right.x).toBeGreaterThan(0.6)
    expect(left.y).toBeCloseTo(right.y, 1)
  })

  test('carries the label on the hotspot and the sense where way copy prints', async ({ page }) => {
    await boot(page, '?room=cleft')
    await expect(page.locator('[data-act="go"]').first()).toHaveText('GO ON')
    await expect(page.locator('[data-act="go"]').nth(1)).toHaveText('NARROW')
    // The sense line is still in the well, before the press, exactly where way
    // copy has always printed.
    await expect(page.locator('#well .routes')).toContainText('Something is feeding down there')
    await expect(page.locator('#well .routes')).toContainText('The quiet is doing a lot of work')
  })

  test('is not on the tray any more, in any room', async ({ page }) => {
    // The whole ruling, as an absence. Movement moved into the room, so the
    // beds carry MENU and whichever press the fight is waiting for and nothing
    // else — a GO in a bed would put the most important verb in the game in
    // the one region of the screen that is not the world.
    for (const room of ['entry', 'cleft', 'fork', 'reliquary']) {
      await boot(page, `?room=${room}`)
      await expect(page.locator('#beds [data-act="go"]')).toHaveCount(0)
      await expect(page.locator('#hits [data-act="go"]')).not.toHaveCount(0)
    }
  })
})

test.describe('a held exit renders nothing', () => {
  test('while the thing in the room is alive', async ({ page }) => {
    await boot(page, '?room=hollow')
    await expect(act(page, 'go')).toHaveCount(0)
    // And nothing disabled, anywhere, standing in for it.
    await expect(page.locator('#hits button[disabled]')).toHaveCount(0)
    await expect(page.locator('#hits [aria-disabled="true"]')).toHaveCount(0)
  })

  test('while the font is unresolved', async ({ page }) => {
    await boot(page, '?room=sanctuary&bones=12')
    await expect(act(page, 'go')).toHaveCount(0)
    await act(page, 'ritual').click()
    await expect(act(page, 'go')).toHaveCount(1)
  })

  test('while a toll is unpaid', async ({ page }) => {
    await boot(page, '?room=offertory')
    await expect(act(page, 'go')).toHaveCount(0)
    await page.locator('[data-interact="offertory-candles"]').click()
    await expect(act(page, 'go')).toHaveCount(0)
    await page.locator('[data-interact="offertory-altar"]').click()
    await expect(act(page, 'go')).toHaveCount(1)
  })

  test('and appears the moment the room lets go of it', async ({ page }) => {
    await boot(page, '?room=hollow&bones=30')
    await expect(act(page, 'go')).toHaveCount(0)
    expect(await fightItOut(page)).toBe('won')
    await expect(act(page, 'go')).toHaveCount(1)
  })
})

test.describe('crossing is a beat, and it decides nothing', () => {
  test('holds the room being left, then lands on the one being entered', async ({ page }) => {
    await boot(page, '?room=entry', { motion: true })
    const from = await where(page)
    await act(page, 'go').click()

    // The press has returned and the run has already moved: the state is the
    // destination before a frame of the crossing has run.
    expect(await where(page)).toBe('passage')
    expect(from).toBe('entry')
    expect(await animating(page)).toBe(true)

    await expect.poll(() => animating(page), { timeout: 6000 }).toBe(false)
    expect(await where(page)).toBe('passage')
    // Nothing of the transition is left on the world when it settles.
    await expect(page.locator('#world')).not.toHaveClass(/crossing|dark/)
  })

  test('a reload mid-crossing lands in the destination, settled', async ({ page }) => {
    // Played rather than fixtured, because a fixture rebuilds itself from the
    // URL and would prove nothing about the save.
    await boot(page, '', { motion: true })
    await act(page, 'start').click()
    await act(page, 'go').click()
    // Mid-beat: the dark has not lifted and the sequence has not finished.
    expect(await animating(page)).toBe(true)

    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
    await act(page, 'continue').click()

    expect(await where(page)).toBe('passage')
    expect(await animating(page)).toBe(false)
    await expect(page.locator('#world')).not.toHaveClass(/crossing|dark/)
    await expect(act(page, 'go')).toHaveCount(1)
  })

  test('motion off arrives in the same tick', async ({ page }) => {
    await boot(page, '?room=entry')
    await act(page, 'go').click()
    expect(await animating(page)).toBe(false)
    expect(await where(page)).toBe('passage')
    await expect(page.locator('#world')).not.toHaveClass(/crossing|dark/)
  })

  test('reduced motion arrives in the same tick too', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await boot(page, '?room=entry', { motion: true })
    await act(page, 'go').click()
    expect(await animating(page)).toBe(false)
    expect(await where(page)).toBe('passage')
  })

  test('offers nothing in the world while it is playing, and everything after', async ({
    page,
  }) => {
    // The same ruling the defeat sequence keeps: while a beat is playing there
    // is no move to make, so none is offered — hidden, never disabled. The
    // room on screen is the one being left and its ways lead where the run has
    // already gone.
    await boot(page, '?room=entry', { motion: true })
    await act(page, 'go').click()
    await expect(page.locator('#hits')).toBeHidden()

    // A thumb that presses anyway waits out the doorway and lands on the room
    // it arrived in, rather than on a button that leads back where it came
    // from. Two ways on at the Cleft, so the first of them.
    await act(page, 'go').first().click()
    expect(await where(page)).toBe('cleft')
  })
})

/**
 * Record every animation frame of a crossing: the scale the world is at, how
 * opaque the void is, and which classes are on.
 *
 * A poll cannot ask this question. The defect these tests exist for was a
 * *single frame* — the frame the scale snapped back on — and the only way to
 * catch a one-frame discontinuity is to look at every frame.
 */
async function recordCrossing(page: Page): Promise<void> {
  await page.evaluate(() => {
    const frames: { t: number; scale: number; veil: number; cls: string }[] = []
    const world = document.getElementById('world')!
    // **The frame clock, not the wall clock.** A CSS animation advances on the
    // timestamp the compositor hands `requestAnimationFrame`, and under load the
    // two diverge badly: callbacks arrive in bursts 1ms apart in wall time while
    // the animation has moved a whole delayed frame between them. Timing the
    // movement against `performance.now()` measured the browser's scheduling
    // rather than the animation, and called an honest ease a snap.
    const read = (t: number): void => {
      const m = new DOMMatrixReadOnly(getComputedStyle(world).transform)
      frames.push({
        t,
        scale: m.a,
        veil: Number(getComputedStyle(world, '::before').opacity),
        cls: world.className,
      })
      requestAnimationFrame(read)
    }
    requestAnimationFrame(read)
    ;(window as unknown as Record<string, unknown>)['__frames'] = frames
  })
}

/**
 * Wait for the crossing to be over **and off the world**.
 *
 * `animating()` goes false on the sequence's last beat, which is the frame the
 * classes are removed on — a frame too early to ask what the world came to
 * rest at. Nothing of the transition being left is the claim the older tests in
 * this file already make; this waits for it before measuring.
 */
async function settled(page: Page): Promise<void> {
  await expect.poll(() => animating(page), { timeout: 6000 }).toBe(false)
  await expect(page.locator('#world')).not.toHaveClass(/crossing|dark|arriving/)
}

interface Frame {
  readonly t: number
  readonly scale: number
  readonly veil: number
  readonly cls: string
}

const framesOf = (page: Page): Promise<Frame[]> =>
  page.evaluate(
    () => ((window as unknown as Record<string, unknown>)['__frames'] as Frame[] | undefined) ?? [],
  )

test.describe('a crossing is one movement, not an animation and a cut', () => {
  test('never jumps: no frame moves the world more than the ease would', async ({ page }) => {
    // The whole of the complaint, as a number. The old sequence declared its
    // transition on `.crossing`, so removing the class took the transition with
    // it and the scale went from 1.035 to 1 **in one frame** — a 3.5% jolt, and
    // the reason the arrival read as a terse change of scenery rather than as
    // the end of a movement.
    //
    // The ceiling is **per millisecond, not per frame**, because a frame is not
    // a fixed quantity of time: under a loaded four-worker run this browser
    // delivers frames three times slower than it does alone, and a fixed
    // per-frame budget either fails on a slow machine or passes a snap on a
    // fast one. The two curves are 0.035 of travel over 340ms (ease-in) and
    // over 420ms (ease-out); an ease peaks at about twice its average rate, so
    // the fastest honest movement is near 0.21 per second. `PEAK` is that with
    // a fifth of headroom, `FLOOR` absorbs subpixel rounding, and a snap — the
    // whole 0.035 inside one frame — clears it by four times over.
    const PEAK = 0.00025
    const FLOOR = 0.001
    // A pair further apart than this says nothing: the browser stalled, and
    // over a long enough gap the honest ease really does travel that far.
    const STALLED = 100

    await boot(page, '?room=entry', { motion: true })
    await recordCrossing(page)
    await act(page, 'go').click()
    await settled(page)

    const frames = await framesOf(page)
    let judged = 0
    for (let i = 1; i < frames.length; i++) {
      const now = frames[i]!
      const before = frames[i - 1]!
      const dt = now.t - before.t
      if (dt <= 0 || dt > STALLED) continue
      judged++
      const jump = Math.abs(now.scale - before.scale)
      const allowed = PEAK * dt + FLOOR
      expect(
        jump,
        `${dt.toFixed(0)}ms frame moved ${jump.toFixed(5)}, over the ${allowed.toFixed(5)} an ` +
          `ease could (${before.cls || 'settled'} → ${now.cls || 'settled'})`,
      ).toBeLessThan(allowed)
    }
    // A run too slow to have judged anything must say so rather than pass on an
    // empty loop.
    expect(judged, 'every frame pair was stalled: nothing was actually measured').
      toBeGreaterThan(6)
  })

  test('hands the movement over under a void that is already solid', async ({ page }) => {
    // The swap itself must never be on screen. The room being left stops
    // leaning and the room being entered starts settling in the same beat, and
    // that beat is behind full black — otherwise the handover is a visible
    // stutter and the destination is glimpsed before it is revealed.
    await boot(page, '?room=entry', { motion: true })
    await recordCrossing(page)
    await act(page, 'go').click()
    await settled(page)

    const frames = await framesOf(page)
    const handover = frames.findIndex((f) => f.cls.includes('arriving'))
    expect(handover, 'the arrival never took over the movement').toBeGreaterThan(0)
    expect(frames[handover]!.veil, 'the handover happened in the open').toBe(1)
  })

  test('is still settling when the dark lifts on it', async ({ page }) => {
    // What makes the two halves one crossing rather than two events: you come
    // up out of the dark into a room that is *still moving*. A destination that
    // has already finished settling by the time it is visible is a slideshow
    // advancing, which is the framing the dark exists to avoid.
    await boot(page, '?room=entry', { motion: true })
    await recordCrossing(page)
    await act(page, 'go').click()
    await settled(page)

    const frames = await framesOf(page)
    // The first frame on which the void is no longer solid: the reveal.
    const lifting = frames.findIndex((f, i) => i > 0 && f.veil < 1 && frames[i - 1]!.veil === 1)
    expect(lifting, 'the void never lifted').toBeGreaterThan(0)
    expect(frames[lifting]!.scale, 'the room was already at rest when it was revealed').
      toBeGreaterThan(1)
    // And it does come to rest, rather than being left mid-movement.
    expect(frames[frames.length - 1]!.scale).toBe(1)
  })

  test('closes the void over frames rather than in one', async ({ page }) => {
    // A cut through black, still — the two rooms are never on screen together —
    // but a cut does not have to arrive as a pop. The void used to be a
    // pseudo-element conjured by the class, which has nothing to fade from.
    await boot(page, '?room=entry', { motion: true })
    await recordCrossing(page)
    await act(page, 'go').click()
    await settled(page)

    const frames = await framesOf(page)
    // **Both edges**, counted separately. Checking only that partial frames
    // exist somewhere passes on a void that slams shut and then fades open,
    // which is half the defect and reads as the worse half: the moment the room
    // is taken away is the one the eye is already on.
    let closing = 0
    let lifting = 0
    for (let i = 1; i < frames.length; i++) {
      const now = frames[i]!.veil
      const before = frames[i - 1]!.veil
      if (now <= 0 || now >= 1) continue
      if (now > before) closing++
      if (now < before) lifting++
    }
    expect(closing, 'the void slammed shut in a single frame').toBeGreaterThan(2)
    expect(lifting, 'the void vanished in a single frame').toBeGreaterThan(2)
  })

  test('and motion off still has no crossing at all', async ({ page }) => {
    // The parity that outranks all of the above: with motion off there is no
    // sequence, so there is no veil, no lean and no settle — the destination is
    // simply the screen, in the tick of the press.
    await boot(page, '?room=entry')
    await recordCrossing(page)
    await act(page, 'go').click()
    expect(await where(page)).toBe('passage')

    const frames = await framesOf(page)
    for (const f of frames) {
      expect(f.veil).toBe(0)
      expect(f.scale).toBe(1)
    }
  })
})
