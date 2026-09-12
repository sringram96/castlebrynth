import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Actions are found by intent, never by position on the screen. */
export const act = (page: Page, name: string): Locator => page.locator(`[data-act="${name}"]`)

/** The attack: up to six bones in the crown, in the order they were thrown. */
export const dice = (page: Page): Locator => page.locator('#crown .bone')

/** The values on the table, in the order they are standing. */
export async function valuesOf(line: Locator): Promise<number[]> {
  return (await line.evaluateAll((nodes) =>
    nodes.map((n) => Number((n as HTMLElement).dataset['value'])),
  )) as number[]
}

/** One entry of the scorecard, by the hand it is for. */
export const scoreEntry = (page: Page, hand: string): Locator =>
  page.locator(`.score-entry[data-hand="${hand}"]`)

/** Every hand the scorecard is currently offering as a real button. */
export async function scoresOnOffer(page: Page): Promise<string[]> {
  return (await page
    .locator('button.score-entry')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset['hand']!))) as string[]
}

/**
 * Every hand this fight has already spent.
 *
 * Read off the card's own data rather than off a drawn row: the card prints
 * only the lines the dice make and the player has not used, so a spent hand has
 * no cell to find. The player gets the same fact from MENU, which carries the
 * whole table.
 */
export async function scoresSpent(page: Page): Promise<string[]> {
  const spent = (await page.locator('#scorecard').getAttribute('data-spent')) ?? ''
  return spent.split(',').filter(Boolean)
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
export async function boot(
  page: Page,
  fixture = '',
  { motion = false, plan = 'descent' as string | null } = {},
): Promise<void> {
  // Motion is off unless a test asks for it. These specs are about what the
  // game does, and waiting out a smash sequence on every round of every
  // journey buys nothing — `test/browser/motion.spec.ts` is where the beats
  // themselves are asserted, and it opts in.
  //
  // **And the grammar is pinned.** There are three descents now and the seed
  // chooses, so a spec that presses DESCEND and then walks rooms by name would be
  // asserting against whichever of the three the clock dealt it — which is a
  // flaky suite, not a thorough one. `?plan=` is not a fixture: it changes nothing
  // but the seed that press uses, so the run is still one the game could deal.
  // The descent is the default because it is the grammar the slice grew up as; a
  // spec about another one names it, and `plan: null` takes whatever comes.
  const extra = [...(motion ? [] : ['motion=0']), ...(plan ? [`plan=${plan}`] : [])]
  const query = [fixture.replace(/^\?/, ''), ...extra].filter(Boolean).join('&')
  await page.goto(`/${query ? `?${query}` : ''}`)
  await expect(page.locator('body')).toHaveAttribute('data-assets', 'ready')
}

/** Wait for any transition to finish, the way an impatient thumb would. */
export async function settled(page: Page): Promise<void> {
  await page.evaluate(() => window.castlebrynth?.settle())
}

/**
 * Start a run and walk to the first fight. Nothing is handed out on the way.
 *
 * Three ways on now, and the third is a **choice**: the Cleft divides, and the
 * left mouth is the one with the Gnawing behind it. Taken through the map
 * rather than by position, because a button carries a node id and nothing
 * else — the view is not allowed to know which authored place is behind it.
 */
export async function toFirstFight(page: Page): Promise<void> {
  await act(page, 'start').click()
  await act(page, 'go').click()
  await act(page, 'go').click()
  await (await wayTo(page, 'hollow')).click()
  await expect(act(page, 'fight')).toBeVisible()
}

/** The same walk, taking the Cleft's other mouth: the toll rather than the fight. */
export async function toOffertory(page: Page): Promise<void> {
  await act(page, 'start').click()
  await act(page, 'go').click()
  await act(page, 'go').click()
  await (await wayTo(page, 'offertory')).click()
  expect(await where(page)).toBe('offertory')
}


/** Read the state the app is holding. Assertions still go against the DOM. */
export async function state(page: Page): Promise<{
  mode: string
  run?: {
    roomId: string
    map: { start: string; nodes: Record<string, { id: string; templateId: string }> }
    bones: number
    vials: number
    cleared: string[]
    offer?: string[]
    combat?: {
      enemyId: string
      round: number
      enemyHp: number
      enemyMaxHp: number
      usedHands: string[]
      dice: number[]
      rollsUsed: number
      lastAttack?: {
        dice: number[]
        hand: string
        sum: number
        multiplier: number
        damage: number
        enemyHpBefore: number
        enemyHpAfter: number
        retaliation: number
        bonesBefore: number
        bonesAfter: number
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
 * The way out with a given label, which is the only thing a player can read.
 *
 * A hotspot carries a destination node and a word. `wayTo` picks by destination,
 * through the map, and is right whenever a spec means *the room behind this*;
 * this is right whenever it means *the mouth the player is looking at* — and since
 * both legs of the Split now have a room of their own on them, STAIR and DEEP are
 * what those two mouths are, not the names of what is immediately behind them.
 */
export const wayLabelled = (page: Page, label: string): Locator =>
  page.locator('[data-act="go"]').filter({ hasText: label })

/**
 * Press on until the run is standing in a named authored room.
 *
 * Presses the way out, one room at a time, and stops when it arrives. Rooms that
 * hold their exits shut are the caller's problem — this is for walking a leg of a
 * descent whose middle is not what the spec is about, which is what the alcoves
 * on both legs of the Split made every *other* spec need.
 */
export async function walkOn(page: Page, templateId: string, max = 6): Promise<void> {
  for (let step = 0; step < max; step++) {
    if ((await where(page)) === templateId) return
    await act(page, 'go').first().click()
  }
  expect(await where(page), `never walked on to ${templateId}`).toBe(templateId)
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
  hold: 34,
  drink: 28,
  'inspect-reward': 28,
  // The talisman sits in the second of the same three painted bays and is the
  // same exception for the same reason: the plate's relic pitch is 55 of 730,
  // which is 32px on a phone. Growing it to 44 would overlap its neighbour.
  'inspect-talisman': 28,
  // Reading a slot on the rail. The iron and the item dice keep the crown's
  // own pitch — 66⅔ of 730, which is 38px on a phone — because the rail has to
  // read as one row of objects at one height. Growing the read target to 44
  // would make it wider than the die beside it and start the overlap the
  // crown's pitch exists to prevent. It is the full 44px tall.
  'inspect-slot': 34,
}

/**
 * Controls that are honestly shorter than the touch floor.
 *
 * **There are none, and that is new.** The scorecard was the one entry here:
 * eight entries and a fallback could not each be 44px tall inside a painted
 * recess 194px wide, so 20px was carried as a documented exception. The card
 * left the recess — see `#sheet` — and every entry is the full 44px, so the
 * exception went with it rather than being widened to fit four more hands.
 */
const MIN_HEIGHT: Readonly<Record<string, number>> = {}

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

  const floorHeight = MIN_HEIGHT[want] ?? 44
  expect(
    height,
    `[${want}] touch target is under ${floorHeight}px tall`,
  ).toBeGreaterThanOrEqual(floorHeight - 0.5)
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

/**
 * Watch an attribute change, and record every value it takes, in order.
 *
 * The cascade is a **sequence** — the dice pop, then the readout resolves the
 * line, then the item dice fire, then the talisman, then the blow, then the
 * answer — and a poll would only ever catch whichever beat happened to be up
 * when it looked. A `MutationObserver` catches all of them, so a test can
 * assert what happened *before* what rather than only what the screen ended on.
 *
 * The watch is installed before the press and read after it. It survives the
 * element being replaced, because it observes a stable ancestor and reads the
 * attribute off whichever node currently carries it.
 *
 * Nothing here can affect an outcome: every beat it records is a picture of a
 * record the reducer settled before the first of them was scheduled.
 */
export async function watch(page: Page, selector: string, attribute: string): Promise<void> {
  await page.evaluate(
    ([sel, attr]) => {
      const seen: string[] = []
      const read = (): void => {
        const node = document.querySelector(sel as string) as HTMLElement | null
        const value = node?.getAttribute(attr as string) ?? ''
        if (value && seen[seen.length - 1] !== value) seen.push(value)
      }
      read()
      const observer = new MutationObserver(read)
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: [attr as string],
      })
      const store = window as unknown as Record<string, unknown>
      store['__watched'] = seen
      store['__watcher'] = observer
    },
    [selector, attribute],
  )
}

/** Everything the watch has seen since it was installed, oldest first. */
export async function watched(page: Page): Promise<string[]> {
  return (await page.evaluate(() => {
    const store = window as unknown as Record<string, unknown>
    return (store['__watched'] as string[] | undefined) ?? []
  })) as string[]
}

/**
 * Watch for numbers popping, and record what popped and what it popped on.
 *
 * The other half of the readout ruling: a number appears **on the thing that
 * made it**, and it is gone again inside a second. A poll cannot see that, and
 * a screenshot cannot say which element it was anchored to — so this records
 * every `.pop` as it is inserted, with the id of the host it was inserted into.
 */
export async function watchPops(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: { on: string; text: string }[] = []
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.classList.contains('pop')) continue
          const host = node.parentElement
          const on =
            host?.dataset['index'] !== undefined
              ? `${host.className.split(' ')[0]}:${host.dataset['index']}`
              : (host?.className.split(' ')[0] ?? '?')
          seen.push({ on, text: node.textContent ?? '' })
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    ;(window as unknown as Record<string, unknown>)['__pops'] = seen
  })
}

/** Every number that popped since the watch was installed, oldest first. */
export async function pops(page: Page): Promise<{ on: string; text: string }[]> {
  return (await page.evaluate(() => {
    const store = window as unknown as Record<string, unknown>
    return (store['__pops'] as { on: string; text: string }[] | undefined) ?? []
  })) as { on: string; text: string }[]
}
