/**
 * Shared air: the territory's grade, and the card that names it.
 *
 * The oldest open item on the visual list was that every room lived in its own
 * light, so crossing from bone country into the chapel read as changing decks
 * rather than as going further down. Two things answer it, and neither of them
 * touches a pixel of `public/`:
 *
 *   - **one grade per territory**, over the world box, so rooms of one stretch
 *     share a palette. It is derived from the room being painted and carries
 *     no state.
 *   - **a card on first entry**, once per territory per run, riding the beat
 *     the dark lifts on. Derived from the path; with motion off it never
 *     appears at all and the say line carries the place, as it always has.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, state, wayTo, where } from './helpers.js'

const animating = (page: Page): Promise<boolean> =>
  page.evaluate(() => window.castlebrynth?.animating() ?? false)

const territory = (page: Page): Promise<string | null> =>
  page.locator('#grade').getAttribute('data-territory')

/**
 * Watch the grade and the dark together.
 *
 * The claim is about **order** — the palette changes under the dark rather
 * than at the cut — and a poll would only ever catch whichever beat happened
 * to be up when it looked.
 */
async function watchAir(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: string[] = []
    const read = (): void => {
      const world = document.getElementById('world')
      const grade = document.getElementById('grade')
      if (!world || !grade) return
      const value = `${world.classList.contains('dark') ? 'dark' : 'lit'}:${
        grade.dataset['territory'] ?? '-'
      }`
      if (seen[seen.length - 1] !== value) seen.push(value)
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.body, { attributes: true, subtree: true })
    ;(window as unknown as Record<string, unknown>)['__air'] = seen
  })
}

const air = (page: Page): Promise<string[]> =>
  page.evaluate(
    () => ((window as unknown as Record<string, unknown>)['__air'] as string[] | undefined) ?? [],
  )

/** Every territory card that was shown, in order, with its text. */
async function watchCards(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: string[] = []
    const read = (): void => {
      const card = document.getElementById('territory-card')
      if (card && !card.hidden && card.classList.contains('showing')) {
        const text = card.textContent ?? ''
        if (seen[seen.length - 1] !== text) seen.push(text)
      }
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.body, { attributes: true, childList: true, subtree: true })
    ;(window as unknown as Record<string, unknown>)['__cards'] = seen
  })
}

const cards = (page: Page): Promise<string[]> =>
  page.evaluate(
    () => ((window as unknown as Record<string, unknown>)['__cards'] as string[] | undefined) ?? [],
  )

test.describe('rooms of one territory share air', () => {
  test('grades the world by the stretch of the descent it is in', async ({ page }) => {
    for (const [fixture, want] of [
      ['?room=entry', 'threshold'],
      ['?room=hollow', 'ossuary'],
      ['?room=sanctuary', 'chapel'],
      ['?room=chain-vault', 'deep'],
      ['?room=gate', 'threshold'],
    ] as const) {
      await boot(page, fixture)
      expect(await territory(page), fixture).toBe(want)
    }
  })

  test('gives two rooms of one territory the same air', async ({ page }) => {
    await boot(page, '?room=hollow')
    const bone = await territory(page)
    await boot(page, '?room=cleft')
    expect(await territory(page)).toBe(bone)
    // And the stretch below it a different one.
    await boot(page, '?room=sanctuary')
    expect(await territory(page)).not.toBe(bone)
  })

  test('is a grade over the picture, and never a control', async ({ page }) => {
    await boot(page, '?room=fork')
    const grade = page.locator('#grade')
    expect(await grade.evaluate((n) => getComputedStyle(n).pointerEvents)).toBe('none')
    // It is a treatment on top of the art, not a piece of it: the backdrop
    // underneath is the file that was painted.
    await expect(page.locator('#backdrop')).toHaveJSProperty('complete', true)
  })

  test('crosses over inside the dark, not at the cut', async ({ page }) => {
    // The threshold giving way to bone country, walked. The crossing's dark is
    // where a change of territory belongs: a palette change under a cut reads
    // as travel, and the same change under a slide reads as a slideshow.
    await boot(page, '?room=entry', { motion: true })
    expect(await territory(page)).toBe('threshold')
    await watchAir(page)

    await act(page, 'go').click()
    await expect.poll(() => animating(page), { timeout: 8000 }).toBe(false)
    // **And wait for the transition to be off the world.** `animating` reports
    // the presentation frame, which clears on the crossing's `land` beat — but
    // the dark is not lifted until `open`, a beat later. Reading the record in
    // between catches a frame that is still dark and calls the settled air a
    // failure. It was a real flake, about one run in three.
    await expect(page.locator('#world')).not.toHaveClass(/crossing|dark|arriving/)

    const seen = await air(page)
    const arrived = seen.findIndex((s) => s.endsWith(':ossuary'))
    expect(arrived, `the air never reached the ossuary: ${seen.join(' → ')}`).toBeGreaterThan(0)
    // The whole claim, in one assertion: the first frame carrying the new
    // territory was a **dark** one. The palette moved inside the travel beat.
    expect(seen[arrived], `the air changed in the open: ${seen.join(' → ')}`).toBe('dark:ossuary')
    // And the lights come back up on the destination's own air.
    expect(seen.at(-1)).toBe('lit:ossuary')
  })

  test('keeps the air still when the stretch does not change', async ({ page }) => {
    // Bone country to bone country: the dark still happens, because crossing a
    // threshold is always a beat — but the palette does not move, which is the
    // half that makes a territory read as one place.
    await boot(page, '?room=cleft', { motion: true })
    expect(await territory(page)).toBe('ossuary')
    await watchAir(page)
    await (await wayTo(page, 'offertory')).click()
    await expect.poll(() => where(page)).toBe('offertory')
    await expect.poll(() => animating(page), { timeout: 8000 }).toBe(false)
    // **And wait for the transition to be off the world.** `animating` reports
    // the presentation frame, which clears on the crossing's `land` beat — but
    // the dark is not lifted until `open`, a beat later. Reading the record in
    // between catches a frame that is still dark and calls the settled air a
    // failure. It was a real flake, about one run in three.
    await expect(page.locator('#world')).not.toHaveClass(/crossing|dark|arriving/)

    const seen = await air(page)
    expect(seen.some((s) => s.startsWith('dark:')), seen.join(' → ')).toBe(true)
    for (const beat of seen) expect(beat.endsWith(':ossuary'), seen.join(' → ')).toBe(true)
    expect(await territory(page)).toBe('ossuary')
  })
})

test.describe('a stretch of the descent names itself once', () => {
  test('names the threshold on the first room of a run', async ({ page }) => {
    await boot(page, '', { motion: true })
    await watchCards(page)
    await act(page, 'start').click()
    await expect.poll(() => cards(page)).toContain('THE THRESHOLD')
  })

  test('names the next stretch on the way into it, and never again', async ({ page }) => {
    await boot(page, '', { motion: true })
    await watchCards(page)
    await act(page, 'start').click()
    // entry → passage is the threshold giving way to bone country.
    await act(page, 'go').click()
    await expect.poll(() => where(page), { timeout: 8000 }).toBe('passage')
    await expect.poll(() => cards(page)).toContain('THE OSSUARY')

    // passage → cleft is bone country to bone country. It is named once.
    await act(page, 'go').click()
    await expect.poll(() => where(page), { timeout: 8000 }).toBe('cleft')
    const seen = await cards(page)
    expect(seen.filter((c) => c === 'THE OSSUARY')).toHaveLength(1)
    expect(new Set(seen).size).toBe(seen.length)
  })

  test('never appears with motion off', async ({ page }) => {
    await boot(page)
    await watchCards(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await expect.poll(() => where(page)).toBe('passage')
    expect(await cards(page)).toEqual([])
    await expect(page.locator('#territory-card')).toBeHidden()
    // Nothing is lost: the room still says where it is, in settled text.
    await expect(page.locator('#say')).not.toBeEmpty()
    expect((await state(page)).run!.say.length).toBeGreaterThan(0)
  })

  test('is a word over the arrival and never a press', async ({ page }) => {
    await boot(page, '', { motion: true })
    await act(page, 'start').click()
    const card = page.locator('#territory-card')
    expect(await card.evaluate((n) => getComputedStyle(n).pointerEvents)).toBe('none')
    // And the room underneath is live while it is up: nothing waits for it.
    await expect(act(page, 'go')).toBeVisible()
  })
})
