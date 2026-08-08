import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Actions are found by intent, never by position on the screen. */
export const act = (page: Page, name: string): Locator => page.locator(`[data-act="${name}"]`)

export const dice = (page: Page): Locator => page.locator('#crown .die')

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
export async function boot(page: Page, fixture = ''): Promise<void> {
  await page.goto(`/${fixture}`)
  await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
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
    hp: number
    roomId: string
    dice: string[]
    relics: string[]
    combat?: { enemyHp: number; phase: string; roll: unknown[]; selected: number[] }
  }
}> {
  return (await page.evaluate(() => window.castlebrynth?.state())) as never
}

/**
 * How wide a control's target may be, by kind.
 *
 * Everything is at least 44px tall. Width is the honest exception: the six
 * crown bays are painted 66⅔ of 730 apart and the three relic bays 55 apart,
 * so on a phone the pitch is 39px and 32px. Targets grown to 44px wide would
 * have to overlap each other, and a tap landing on the neighbouring die is a
 * worse failure than a slightly narrow one. The floor is the painted pitch,
 * they are the full 44px in the other axis, and they never overlap.
 *
 * See POLISH_PROGRESS.md § P2 — this is the sweep's one accepted deviation
 * from the 44 × 44 rule, and it is a property of the plate, not of the code.
 */
const MIN_WIDTH: Readonly<Record<string, number>> = {
  die: 34,
  'inspect-die': 34,
  'inspect-relic': 28,
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
