import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Actions are found by intent, never by position on the screen. */
export const act = (page: Page, name: string): Locator => page.locator(`[data-act="${name}"]`)

/** Your line: the six lanes of the crown. */
export const bones = (page: Page): Locator => page.locator('#crown .bone')

/** Its line: the strip above the tray, lane-aligned with yours. */
export const enemyBones = (page: Page): Locator => page.locator('#enemy-line .bone-enemy')

/** The values of a line, in the order they are standing. */
export async function valuesOf(line: Locator): Promise<number[]> {
  return (await line.evaluateAll((nodes) =>
    nodes.map((n) => Number((n as HTMLElement).dataset['value'])),
  )) as number[]
}

/**
 * Open the page.
 *
 * Every test gets its own browser context, so the store starts empty without
 * anything being cleared — which matters, because a clear that re-ran on every
 * navigation would wipe the save a reload is supposed to find.
 *
 * `fixture` is a query string from src/game/fixture.ts, used to stand
 * somewhere the walk would take forty presses to reach.
 */
export async function boot(page: Page, fixture = '', { motion = false } = {}): Promise<void> {
  // Motion is off unless a test asks for it. These specs are about what the
  // game does, and waiting out a smash sequence on every round of every
  // journey buys nothing — `test/browser/motion.spec.ts` is where the beats
  // themselves are asserted, and it opts in.
  const query = motion ? fixture : `${fixture ? `${fixture}&` : '?'}motion=0`
  await page.goto(`/${query}`)
  await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
}

/** Wait for any transition to finish, the way an impatient thumb would. */
export async function settled(page: Page): Promise<void> {
  await page.evaluate(() => window.castlebrynth?.settle())
}

/** Start a run and walk to the first fight. Nothing is handed out on the way. */
export async function toFirstFight(page: Page): Promise<void> {
  await act(page, 'start').click()
  await act(page, 'go').click()
  await act(page, 'go').click()
  await expect(act(page, 'fight')).toBeVisible()
}

/** Read the state the app is holding. Assertions still go against the DOM. */
export async function state(page: Page): Promise<{
  mode: string
  run?: {
    roomId: string
    map: { start: string; nodes: Record<string, { id: string; templateId: string }> }
    commonBones: number
    specials: { instanceId: string; specialId: string }[]
    charms: number
    vials: number
    cleared: string[]
    offer?: string[]
    combat?: {
      enemyId: string
      round: number
      phase: string
      charmUsed: boolean
      enemyBones: { boneId: string }[]
      enemyLine: { boneKey: string; value: number }[]
      playerLine?: { boneKey: string; value: number; specialInstanceId?: string }[]
      field?: { width: number; specialIds: string[] }
      lastSmash?: {
        playerCommonLost: number
        playerSpecialsLost: string[]
        enemyBonesLost: string[]
        heldTies: number
        stoppedAtLane?: number
      }
      defeated?: boolean
    }
  }
}> {
  return (await page.evaluate(() => window.castlebrynth?.state())) as never
}

/** How many bones are alive, off the pile the player is looking at. */
export async function livingBones(page: Page): Promise<number> {
  return Number(await page.locator('#pile').getAttribute('data-bones'))
}

/** Which files the loader has actually decoded. The loading spec reads it. */
export async function decoded(page: Page): Promise<string[]> {
  return (await page.evaluate(() => window.castlebrynth?.loaded() ?? [])) as string[]
}

/**
 * Which authored room the run is standing in.
 *
 * `run.roomId` is a node of the generated map, and a node id is not something
 * a test should ever be written against — it is the director's, and it changes
 * when the plan does. What a spec means is *the vault*, *the gate*, so this is
 * the one place the join is made, and the state the assertion reads is the
 * state the game is actually holding.
 */
export async function where(page: Page): Promise<string | undefined> {
  const now = await state(page)
  return now.run ? now.run.map.nodes[now.run.roomId]?.templateId : undefined
}

/** The node of this run that used a named authored template. */
export async function nodeFor(page: Page, templateId: string): Promise<string> {
  const now = await state(page)
  const found = Object.values(now.run!.map.nodes).find((n) => n.templateId === templateId)
  if (!found) throw new Error(`this run has no ${templateId} in it`)
  return found.id
}

/**
 * The GO button that leads to a named authored room.
 *
 * Selected through the map rather than by reading a template id off the DOM,
 * because the button carries a destination and nothing else — the view is not
 * allowed to know which authored place is on the other side of it.
 */
export async function wayTo(page: Page, templateId: string): Promise<Locator> {
  return page.locator(`[data-act="go"][data-to="${await nodeFor(page, templateId)}"]`)
}

/**
 * How wide a control's target may be, by kind.
 *
 * Everything is at least 44px tall. Width is the honest exception: the six
 * crown bays are painted 66⅔ of 730 apart and the three satchel bays 55 apart,
 * so on a phone the pitch is 39px and 32px. Targets grown to 44px wide would
 * have to overlap each other, and a tap landing on the neighbouring bone is a
 * worse failure than a slightly narrow one. The floor is the painted pitch,
 * they are the full 44px in the other axis, and they never overlap.
 *
 * See POLISH_PROGRESS.md § P2 — this is the one accepted deviation from the
 * 44 × 44 rule, and it is a property of the plate, not of the code.
 */
const MIN_WIDTH: Readonly<Record<string, number>> = {
  'inspect-bone': 34,
  'charm-bone': 34,
  drink: 28,
  charm: 28,
  pouch: 28,
  'inspect-reward': 28,
}

/**
 * Every visible control must answer a real tap at its own centre.
 *
 * `elementFromPoint` is the assertion that matters: a button can be visible,
 * enabled, the right size and still sit under a positioning container that
 * eats the press. That is the bug this suite exists for.
 */
export async function tappable(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox()
  expect(box, 'control has no box').not.toBeNull()
  const { x, y, width, height } = box!
  const want = (await locator.getAttribute('data-act')) ?? 'button'

  expect(height, `[${want}] touch target is under 44px tall`).toBeGreaterThanOrEqual(43.5)
  const floor = MIN_WIDTH[want] ?? 44
  expect(width, `[${want}] touch target is under ${floor}px wide`).toBeGreaterThanOrEqual(floor - 0.5)

  const viewport = page.viewportSize()!
  expect(x, `[${want}] runs off the left edge`).toBeGreaterThanOrEqual(-0.5)
  expect(y, `[${want}] runs off the top edge`).toBeGreaterThanOrEqual(-0.5)
  expect(x + width, `[${want}] runs off the right edge`).toBeLessThanOrEqual(viewport.width + 0.5)
  expect(y + height, `[${want}] runs off the bottom edge`).toBeLessThanOrEqual(viewport.height + 0.5)

  const hit = await page.evaluate(
    ([cx, cy]) => {
      const el = document.elementFromPoint(cx as number, cy as number)
      if (!el) return null
      const button = el.closest('button')
      return button ? (button.dataset['act'] ?? 'button') : `<${el.tagName.toLowerCase()}>`
    },
    [x + width / 2, y + height / 2],
  )
  expect(hit, `something is on top of [${want}]`).toBe(want)
}

/**
 * Which full screen is up, or null.
 *
 * Read through visibility as well as the attribute: a screen that is hidden is
 * not up, whatever it last called itself.
 */
export async function screenName(page: Page): Promise<string | null> {
  const screen = page.locator('#screen')
  if (!(await screen.isVisible())) return null
  return screen.getAttribute('data-screen')
}

/** Every control the tray is currently offering. */
export async function trayControls(page: Page): Promise<Locator[]> {
  const found = await page.locator('#tray button:visible').all()
  return found
}
