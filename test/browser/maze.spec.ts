import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { AREAS } from '../../src/content/areas.js'
import { exitUnlocked, roomAt } from '../../src/game/map.js'
import type { GameState, RunState } from '../../src/game/state.js'
import { act, boot, settled, tappable } from './helpers.js'
import { clearReward, fightItOut } from './play.js'

const runOf = async (page: Page): Promise<RunState> =>
  (await page.evaluate(() => (window.castlebrynth!.state() as GameState).run))!

// Read the map only to choose a reproducible journey. Every move and pickup
// below goes through its real button; no room, outcome or item is injected.
async function walk(page: Page, target: string): Promise<void> {
  const run = await runOf(page), queue = [[run.roomId]], seen = new Set<string>()
  let route: string[] | undefined
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i]!, id = path.at(-1)!
    if (id === target) { route = path.slice(1); break }
    if (seen.has(id)) continue
    seen.add(id)
    const node = run.map.nodes[id]!
    if (node.enemyId && !run.cleared.includes(id)) continue
    for (const exit of node.exits) if (exitUnlocked(run, exit) && !seen.has(exit.to)) queue.push([...path, exit.to])
  }
  expect(route, `no route from ${run.roomId} to ${target}`).toBeDefined()
  for (const to of route!) {
    const way = page.locator(`[data-act="go"][data-to="${to}"]`)
    await tappable(page, way)
    await way.click()
    await settled(page)
    await expect.poll(async () => (await runOf(page)).roomId).toBe(to)
  }
}

async function start(page: Page): Promise<void> {
  await boot(page, '', { plan: null })
  // Only the initial seed is controlled. This uses the production maze mode
  // and storage path, unlike ?maze=1, which is intentionally a no-save fixture.
  await page.evaluate(() => window.castlebrynth!.dispatch({ type: 'START_RUN', seed: 1 }))
  await settled(page)
}

for (const width of [320, 390, 430]) {
  test(`the maze map and six casting bones remain tappable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await boot(page, 'maze=1&bones=12&vials=2&talismans=pair-talisman&iron=rustplate&items=splinter-fetish', { plan: null })
    await expect(page.locator('#explore-hand .explore-die')).toHaveCount(6)
    for (const button of await page.locator('#explore-controls button').all()) await tappable(page, button)
    const world = (await page.locator('#world').boundingBox())!
    expect(world.height).toBeGreaterThan(844 * .75)
    await act(page, 'map').click()
    await tappable(page, act(page, 'close'))
    await act(page, 'close').click()
  })
}

test('a phone can discover a lock, collect its key, retrace a route and resume its map', async ({ page }) => {
  test.setTimeout(45_000)
  await start(page)
  const initial = await runOf(page)
  expect(initial.map.layout).toBe('maze')
  await act(page, 'map').click()
  await expect(page.locator('.map-area-body [data-map-node][data-visited="true"]')).toHaveCount(1)
  await expect(page.locator('.map-area-body [data-map-node][data-visited="false"]')).toHaveCount(1)
  await expect(page.locator('.map-area-tabs button')).toHaveCount(1)
  await act(page, 'close').click()

  const keyRoom = Object.values(initial.map.nodes).find(n => n.key === 'bone-key')!
  const gate = Object.values(initial.map.nodes).find(n => n.exits.some(e => e.to === 'ossuary:keeper' && e.requiresKey))!
  await walk(page, gate.id)
  const lock = act(page, 'inspect-lock')
  await tappable(page, lock)
  await expect(lock).toHaveAccessibleName(/Requires Bone Key/)
  await lock.click()
  expect((await runOf(page)).roomId).toBe(gate.id)
  await expect(page.locator('[data-act="go"][data-to="ossuary:keeper"]')).toHaveCount(0)
  await walk(page, keyRoom.id)
  await tappable(page, act(page, 'take-key'))
  await act(page, 'take-key').click()
  await expect(act(page, 'take-key')).toHaveCount(0)
  await walk(page, gate.id)
  await expect(page.locator('[data-act="go"][data-to="ossuary:keeper"]')).toBeVisible()
  await walk(page, 'stair')
  const before = await runOf(page)
  await page.reload()
  await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
  await act(page, 'continue').click()
  const after = await runOf(page)
  expect(after.map).toEqual(before.map)
  expect(after.keys).toEqual(['bone-key'])
  expect(after.path).toEqual(before.path)
  await act(page, 'map').click()
  await expect(page.locator('.map-keys')).toContainText('Bone Key')
  await expect(page.locator('.map-area-body [data-map-node][data-current="true"]')).toHaveCount(1)
  await expect(page.locator('.map-area-body [data-map-node][data-visited="true"]'))
    .toHaveCount(new Set(after.path).size)
  await tappable(page, act(page, 'close'))
  await tappable(page, act(page, 'map-area'))
  await page.screenshot({ path: test.info().outputPath('discovered-map.png') })
  await page.locator('.maze-map-panel').evaluate(node => { node.scrollTop = node.scrollHeight })
  await tappable(page, act(page, 'close'))
  await act(page, 'close').click()
  expect((await runOf(page)).roomId).toBe('stair')
})

test('all three areas, keys and section bosses lead to the ending through real presses', async ({ page }) => {
  test.setTimeout(120_000)
  await start(page)
  for (const [index, area] of AREAS.entries()) {
    const run = await runOf(page)
    const members = Object.values(run.map.nodes).filter(n => n.area === area.id)
    const cache = members.find(n => n.dice?.length)!
    await walk(page, cache.id)
    await act(page, 'claim').click()
    await page.locator(`[data-act="pick-slot"][data-slot="${index}"]`).click()
    const keyRoom = members.find(n => n.key)!
    await walk(page, keyRoom.id)
    if (area.id === 'bellworks') await page.screenshot({ path: test.info().outputPath('bellworks-key.png') })
    await act(page, 'take-key').click()
    const font = members.find(n => roomAt(run, n.id).ritual)!
    await walk(page, font.id)
    if ((await runOf(page)).bones < 30) await act(page, 'ritual').click()
    const boss = members.find(n => n.sectionBoss)!
    await walk(page, boss.id)
    expect(await fightItOut(page)).toBe('won')
    await clearReward(page)
    await walk(page, keyRoom.id)
    await expect(act(page, 'take-key')).toHaveCount(0)
    await walk(page, boss.id)
    await expect(act(page, 'fight')).toHaveCount(0)
    expect((await runOf(page)).cleared).toContain(boss.id)
  }
  await act(page, 'map').click()
  await expect(act(page, 'map-area')).toHaveCount(3)
  await page.locator('[data-act="map-area"][data-area="ossuary"]').click()
  await expect(page.locator('.map-area-body h2')).toHaveText('THE OSSUARY')
  await tappable(page, act(page, 'close'))
  await act(page, 'close').click()
  await walk(page, 'out')
  await expect(page.locator('#screen')).toHaveAttribute('data-screen', 'complete')
  expect((await runOf(page)).keys).toHaveLength(3)
})

test.describe('a way that is shut looks shut', () => {
  const barriers = (page: Page) => page.locator('.passage-barrier')
  const backdrop = (page: Page) => page.locator('#backdrop')

  test('fills a fallen arch with rubble, and a gated one with a gate', async ({ page }) => {
    // Seed 1's Chained Alcove has no way north and the painting has an arch
    // there, so the arch is full of stone. Before this it was a corridor that
    // simply offered no button, which reads as a wall that was never a way.
    await boot(page, '?maze=1&seed=1&node=ossuary:2:0')
    await expect(barriers(page)).toHaveCount(1)
    const rubble = barriers(page).first()
    await expect(rubble).toHaveAttribute('data-passage', 'north')
    await expect(rubble).toHaveAttribute('data-state', 'sealed')
    await expect(rubble).toHaveAttribute('src', /passages\/rubble/)

    // And a way that exists but wants a key is a gate rather than a hole.
    await boot(page, '?maze=1&seed=1&node=bellworks:2:0')
    const gate = barriers(page).first()
    await expect(gate).toHaveAttribute('data-state', 'locked')
    await expect(gate).toHaveAttribute('src', /passages\/locked/)
  })

  test('is art and never a press: the lock keeps its own button', async ({ page }) => {
    await boot(page, '?maze=1&seed=1&node=bellworks:2:0')
    // Every barrier is inert, and the verb that *is* live sits on it rather
    // than at the compass seat a direction would have.
    for (const plate of await barriers(page).all()) {
      expect(await plate.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    }
    const lock = act(page, 'inspect-lock').first()
    await tappable(page, lock)
    const [seat, press] = await Promise.all([
      barriers(page).first().boundingBox(),
      lock.boundingBox(),
    ])
    // The press is on the thing it is about: the gate's box contains the
    // button's middle.
    expect(press!.x + press!.width / 2).toBeGreaterThan(seat!.x)
    expect(press!.x + press!.width / 2).toBeLessThan(seat!.x + seat!.width)
    expect(press!.y + press!.height / 2).toBeGreaterThan(seat!.y)
    expect(press!.y + press!.height / 2).toBeLessThan(seat!.y + seat!.height)
  })

  test('repaints the hall rather than patching it, and puts it back', async ({ page }) => {
    // The hall's arch is most of its frame, so its shut state is a painting of
    // the room rather than a plate over it — and no barrier is drawn on top.
    await boot(page, '?maze=1&seed=1&node=ossuary:0:0')
    await expect(backdrop(page)).toHaveAttribute('src', /hall-locked/)
    await expect(backdrop(page)).toHaveAttribute('data-passage', 'north')
    await expect(backdrop(page)).toHaveAttribute('data-state', 'locked')
    await expect(barriers(page)).toHaveCount(0)
    // The door is the picture, so the lock's press is on the door.
    await tappable(page, act(page, 'inspect-lock').first())

    // A hall you can walk out of is the hall, unmarked.
    await boot(page, '?maze=1&seed=1&node=ossuary:1:1')
    await expect(backdrop(page)).not.toHaveAttribute('data-passage', /.*/)
  })

  test('draws nothing in an authored fixture, where the doors are painted open', async ({ page }) => {
    await boot(page, '?room=reliquary')
    await expect(barriers(page)).toHaveCount(0)
    await expect(backdrop(page)).not.toHaveAttribute('data-passage', /.*/)
  })
})
