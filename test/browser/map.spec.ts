/**
 * The generated map, through the real interface.
 *
 * The unit suite proves the director builds a coherent descent. This proves
 * the thing that actually matters to a player: that the descent on screen is
 * that descent, that every button leads somewhere the map holds, and that a
 * reload lands in the *same* run rather than in a new one that happens to look
 * like it.
 *
 * Nothing below reads a template id off the DOM. The view carries a node and a
 * label, which is all it is allowed to know; the join back to *the vault*, *the
 * gate* is made through state, in `helpers.ts`.
 */

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { act, boot, state, wayTo, where } from './helpers.js'

/** Every destination the tray is currently offering. */
async function offered(page: Page): Promise<string[]> {
  return page.locator('[data-act="go"]').evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset['to'] ?? ''),
  )
}

test.describe('a run carries its map', () => {
  test('a fresh run has one, and is standing in a node of it', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()

    const now = await state(page)
    const map = now.run!.map
    expect(Object.keys(map.nodes).length).toBeGreaterThan(1)
    // The run is standing at a node, and the node is not the authored room —
    // that distinction is the whole architecture, so it is asserted plainly.
    expect(map.nodes[now.run!.roomId]).toBeDefined()
    expect(now.run!.roomId).not.toBe(map.nodes[now.run!.roomId]!.templateId)
    expect(await where(page)).toBe('entry')
    // And the room on screen is the one that node resolves to.
    await expect(page.locator('#say')).toContainText('The stair ends in a long hall')
  })

  test('every GO button leads to a room the map holds', async ({ page }) => {
    // Walked, not enumerated: at every stop of the descent, whatever the tray
    // is offering has to be a node of this run's map.
    await boot(page)
    await act(page, 'start').click()

    for (const stop of ['entry', 'passage', 'fork', 'chain-vault', 'deep', 'gate'] as const) {
      await boot(page, `?room=${stop}${stop === 'chain-vault' ? '&vault=open' : ''}`)
      const now = await state(page)
      for (const to of await offered(page)) {
        expect(now.run!.map.nodes[to], `${stop} offers a way to "${to}"`).toBeDefined()
      }
    }
  })

  test('the fork still offers STAIR and DEEP, and both reach the keeper', async ({ page }) => {
    await boot(page, '?room=fork')
    const labels = await page.locator('[data-act="go"]').allTextContents()
    expect(labels.sort()).toEqual(['DEEP', 'STAIR'])

    // Converging is a fact about the map, so it is read off the map: from
    // either destination, the room the Warden is standing in is reachable.
    const now = await state(page)
    const map = now.run!.map
    const keeper = Object.values(map.nodes).find((n) => n.templateId === 'gate')!
    const reaches = (from: string): boolean => {
      const seen = new Set<string>()
      const queue = [from]
      while (queue.length > 0) {
        const id = queue.shift()!
        if (seen.has(id)) continue
        seen.add(id)
        for (const exit of map.nodes[id]?.exits ?? []) queue.push(exit.to)
      }
      return seen.has(keeper.id)
    }
    for (const to of await offered(page)) expect(reaches(to), `${to} never reaches the door`).toBe(true)
  })

  test('walking the deep way and walking the stair arrive at the same room', async ({ page }) => {
    await boot(page, '?room=fork&seed=3')
    await (await wayTo(page, 'gate')).click()
    const short = (await state(page)).run!.roomId

    await boot(page, '?room=chain-vault&vault=open&seed=3')
    await act(page, 'go').click()
    expect(await where(page)).toBe('deep')
    const inTheTunnel = await state(page)
    const long = inTheTunnel.run!.map.nodes[inTheTunnel.run!.roomId]!.exits[0]!.to

    // The same node, not merely the same picture.
    expect(long).toBe(short)
  })
})

test.describe('a reload lands in the same run', () => {
  test('brings back the exact map, node for node', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    await act(page, 'go').click()
    const before = await state(page)

    await page.reload()
    await act(page, 'continue').click()
    const after = await state(page)

    expect(after.run!.map).toEqual(before.run!.map)
    expect(after.run!.roomId).toBe(before.run!.roomId)
    expect(after.run!.path).toEqual(before.run!.path)
  })

  test('never regenerates it: a second reload is the same map again', async ({ page }) => {
    await boot(page)
    await act(page, 'start').click()
    const first = JSON.stringify((await state(page)).run!.map)

    for (let i = 0; i < 2; i++) {
      await page.reload()
      await act(page, 'continue').click()
      expect(JSON.stringify((await state(page)).run!.map)).toBe(first)
    }
  })
})

test.describe('room state belongs to the room, not to the kind of room', () => {
  test('files a worked vault under its node, and says which template it is', async ({ page }) => {
    await boot(page, '?room=chain-vault')
    await page.locator('[data-interact="vault-chain"]').click()

    const now = await state(page)
    const nodeId = now.run!.roomId
    // Keyed by the node. If this were the template id, two vaults in one
    // descent would share a gate — which is the bug this refactor exists to
    // make unexpressible.
    expect(Object.keys(now.run!.rooms!)).toEqual([nodeId])
    expect(now.run!.rooms![nodeId]!.templateId).toBe('chain-vault')
    expect(nodeId).not.toBe('chain-vault')
  })

  test('files a cleared fight and a spent font under their nodes', async ({ page }) => {
    await boot(page, '?room=sanctuary&bones=12')
    await act(page, 'ritual').click()
    const chapel = await state(page)
    expect(chapel.run!.ritual!.roomId).toBe(chapel.run!.roomId)
    expect(chapel.run!.ritual!.roomId).not.toBe('sanctuary')

    // The same for a fight: what is filed is the room it happened in, not the
    // authored place it looked like.
    // `dying=1` stands in the beat after the attack that finished it, and the
    // kill was committed by that attack — so the record is already written.
    await boot(page, '?room=hollow&dying=1')
    const felled = await state(page)
    expect(felled.run!.cleared).toContain(felled.run!.roomId)
    expect(felled.run!.cleared).not.toContain('hollow')
  })
})
