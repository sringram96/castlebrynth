/**
 * The strip: a map that only knows what you saw.
 *
 * The reel is the frame the whole product hangs on, and until now a run could
 * not read itself back: you could see the mouth of a road you did not take for
 * exactly as long as you stood in front of it. MAP is that record, and what is
 * under test is as much what it refuses to show as what it shows.
 *
 *   - a frame per room stood in, in order, the current one bordered;
 *   - beside a junction that was walked out of, the mouth that was not taken,
 *     carrying the word that was on its hotspot;
 *   - **nothing at all ahead** — no sockets, no count, no silhouette;
 *   - the same strip on the death screen, as the run's epitaph.
 *
 * Both branches of the Cleft are walked, because a strip that only ever showed
 * the left-hand mouth would pass a test written against one route.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, nodeFor, screenName, state, wayTo, where } from './helpers.js'

/** Every frame the strip is showing, top to bottom. */
async function frames(page: Page): Promise<{ node: string; name: string; current: boolean }[]> {
  return page.locator('#strip .strip-row').evaluateAll((rows) =>
    rows.map((row) => ({
      node: (row as HTMLElement).dataset['node'] ?? '',
      name: row.querySelector('.strip-name')?.textContent ?? '',
      current: (row as HTMLElement).dataset['current'] === 'yes',
    })),
  )
}

/** Every untaken mouth on the strip, with the frame it branches off. */
async function mouths(page: Page): Promise<{ from: string; label: string; to: string }[]> {
  return page.locator('#strip .strip-mouth').evaluateAll((marks) =>
    marks.map((mark) => ({
      from: (mark.closest('.strip-row') as HTMLElement).dataset['node'] ?? '',
      label: mark.textContent ?? '',
      to: (mark as HTMLElement).dataset['mouth'] ?? '',
    })),
  )
}

const openMap = async (page: Page): Promise<void> => {
  await act(page, 'map').click()
  await expect(page.locator('#strip')).toBeVisible()
}

test.describe('MAP is a reading and never a move', () => {
  test('is offered out of a fight, and never inside one', async ({ page }) => {
    await boot(page, '?room=fork')
    await expect(act(page, 'map')).toBeVisible()
    // Inside a fight the bed is empty: the fight is the room, and a map of the
    // corridor behind you is not a decision in it. Hidden, not disabled.
    await boot(page, '?room=deep&rolls=1')
    await expect(act(page, 'map')).toHaveCount(0)
  })

  test('changes nothing at all', async ({ page }) => {
    await boot(page, '?room=fork&vials=1')
    const before = await state(page)
    await openMap(page)
    await act(page, 'close').click()
    await expect(page.locator('#overlay')).toBeHidden()
    expect(await state(page)).toEqual(before)
  })
})

test.describe('the strip is the rooms that were stood in', () => {
  test('gives one frame per room walked, in order, the last one current', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    expect(await where(page)).toBe('cleft')

    await openMap(page)
    const seen = await frames(page)
    const run = (await state(page)).run!
    expect(seen.map((f) => f.node)).toEqual(run.path)
    expect(seen.filter((f) => f.current)).toHaveLength(1)
    // Most recent at the bottom: a descent runs down.
    expect(seen.at(-1)!.current).toBe(true)
    expect(seen.at(-1)!.node).toBe(run.roomId)
    // A room you have stood in is not a hidden place, so it carries its name.
    for (const frame of seen) expect(frame.name.length).toBeGreaterThan(0)
  })

  test('shows nothing of the rooms ahead', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await openMap(page)

    const run = (await state(page)).run!
    const drawn = new Set((await frames(page)).map((f) => f.node))
    const unwalked = Object.keys(run.map.nodes).filter((id) => !run.path.includes(id))
    expect(unwalked.length, 'this run has nowhere left to go').toBeGreaterThan(4)
    for (const id of unwalked) expect(drawn.has(id), `${id} is on the strip`).toBe(false)
    // Not even as an empty socket or a count of what is left.
    expect(await page.locator('#strip .strip-row').count()).toBe(run.path.length)
    await expect(page.locator('#overlay')).toContainText('nothing I have seen')
  })
})

test.describe('a junction remembers the road it did not take', () => {
  test('walking left leaves the right-hand mouth on the strip, with its label', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    const cleft = (await state(page)).run!.roomId
    const notTaken = await nodeFor(page, 'offertory')
    // The doorway's own label, not the whole hotspot: in the picture the button
    // also carries an arrow and, at a fork, its consequence. The strip records
    // the way, and the way is the label.
    const label = await (await wayTo(page, 'offertory')).locator('.exit-label').textContent()

    await (await wayTo(page, 'hollow')).click()
    expect(await where(page)).toBe('hollow')

    await openMap(page)
    const marks = await mouths(page)
    expect(marks).toHaveLength(1)
    expect(marks[0]).toEqual({ from: cleft, label: label!, to: notTaken })
    // A mouth says which way, never where to: the room behind it is not named.
    await expect(page.locator('#strip')).not.toContainText('Offertory')
  })

  test('walking right leaves the left-hand mouth, and the same is true', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    const cleft = (await state(page)).run!.roomId
    const notTaken = await nodeFor(page, 'hollow')

    await (await wayTo(page, 'offertory')).click()
    expect(await where(page)).toBe('offertory')

    await openMap(page)
    const marks = await mouths(page)
    expect(marks.map((m) => ({ from: m.from, to: m.to }))).toEqual([{ from: cleft, to: notTaken }])
  })

  test('gives the room being stood in no mouths at all', async ({ page }) => {
    // Standing at a fork, its two ways out are in the picture under the thumb.
    // The strip is a record of where the run has been, never a plan.
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    await act(page, 'go').click()
    expect(await where(page)).toBe('cleft')
    await openMap(page)
    expect(await mouths(page)).toEqual([])
  })
})

test.describe('the death screen carries the same strip', () => {
  test('prints the run as its epitaph, beside what it was carrying', async ({ page }) => {
    await boot(page, '?room=deep&mode=dead')
    expect(await screenName(page)).toBe('dead')
    const run = (await state(page)).run!
    await expect(page.locator('#screen #strip')).toBeVisible()
    expect((await frames(page)).map((f) => f.node)).toEqual(run.path)
    // The frames are the rooms the screen already counts.
    await expect(page.locator('#run-summary')).toContainText(`${run.path.length}`)
    // And the way on is still a real button on the screen when it opens.
    await expect(act(page, 'start')).toBeVisible()
  })
})
