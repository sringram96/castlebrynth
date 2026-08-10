/**
 * Play a fight through the real interface.
 *
 * Every press below is a real press on a real button; the only thing read out
 * of the app is the table, which is what a player reads off the screen anyway.
 * The brain is the same heuristic policy the balance report uses, so a fight
 * the model says is winnable is proved winnable by a thumb.
 *
 * **No state is injected anywhere in this file.** A journey that reached its
 * end by writing a `GameState` would be proving that the reducer works, which
 * the unit suite already does, rather than that the game can be played.
 */

import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { drinkFor, fieldFor } from '../balance/policies.js'
import type { Table } from '../balance/policies.js'
import type { RolledBone, TieRule } from '../../src/game/state.js'
import { ENEMIES } from '../../src/content/enemies.js'
import { act, screenName, state } from './helpers.js'

/** Exactly what the screen is showing. Nothing the player cannot see. */
async function table(page: Page): Promise<Table> {
  const now = await state(page)
  const run = now.run!
  const combat = run.combat!
  return {
    enemyLine: combat.enemyLine as unknown as readonly RolledBone[],
    enemyBones: combat.enemyBones.length,
    tieRule: (ENEMIES[combat.enemyId]?.tieRule ?? 'mutual') as TieRule,
    commonBones: run.commonBones,
    specials: run.specials as never,
    vials: run.vials,
  }
}

/**
 * Stand exactly the named bones the policy wants, through the pouch.
 *
 * Every named bone is in the line by default, so this is a **withdrawal** pass
 * as often as a selection one — the row is toggled until its state matches the
 * decision, which is what a thumb in the pouch actually does.
 */
async function standSpecials(page: Page, want: readonly string[]): Promise<void> {
  const now = await state(page)
  const carried = now.run?.specials ?? []
  const wanted = new Set(want)
  if (carried.length === 0) return

  await act(page, 'pouch').click()
  for (const bone of carried) {
    const row = page.locator(`.pouch-row[data-instance-id="${bone.instanceId}"]`)
    if ((await row.count()) === 0) continue
    const standing = (await row.getAttribute('data-fielded')) === 'yes'
    if (standing === wanted.has(bone.instanceId)) continue
    const button = row.locator('[data-act="field-bone"], [data-act="withdraw-bone"]')
    if ((await button.count()) > 0) await button.first().click()
  }
  await act(page, 'close').click()
}

/**
 * One round: choose your modifiers, throw, and watch — then on to the next.
 *
 * Two presses, and the second one is the whole fight happening. There is no
 * commit step to walk through and no width to step to, because neither is a
 * decision the screen offers any more.
 *
 * Returns how many Vials it drank, because a caller checking a guaranteed
 * drop needs to know: a fight that pays one Vial and spends one leaves the
 * satchel exactly where it started, and an assertion that only looked at the
 * count would call that a missing drop.
 */
export async function takeRound(page: Page): Promise<number> {
  let drank = 0
  if (drinkFor(await table(page), 'heuristic') && (await act(page, 'drink').count()) > 0) {
    await act(page, 'drink').click()
    drank += 1
  }

  await standSpecials(page, fieldFor(await table(page), 'heuristic').specialIds)
  await act(page, 'throw').click()
  // Visible, not merely present. A winning throw puts a reward screen over the
  // tray, and the tray under it can still be holding a ROUND button that no
  // thumb could ever reach — counting it would hang the journey on a control
  // the player cannot see.
  if (await act(page, 'round').isVisible()) await act(page, 'round').click()
  return drank
}

export type FightEnd = 'won' | 'died'

export interface FightReport {
  readonly end: FightEnd
  /** Vials spent getting there. A caller checking a drop has to net these off. */
  readonly drank: number
}

/** Play a fight to its end, or fail loudly if it never ends. */
export async function fight(page: Page, maxRounds = 25): Promise<FightReport> {
  await act(page, 'fight').click()
  let drank = 0
  for (let round = 0; round < maxRounds; round++) {
    const screen = await screenName(page)
    if (screen === 'reward') return { end: 'won', drank }
    if (screen === 'dead') return { end: 'died', drank }
    // A win with nothing to give goes straight back to the room, and a fight
    // that is over has no verb of its own left on the tray.
    if (!(await act(page, 'throw').isVisible()) && !(await act(page, 'round').isVisible())) {
      return { end: (await screenName(page)) === 'dead' ? 'died' : 'won', drank }
    }
    drank += await takeRound(page)
  }
  expect(null, `the fight did not end in ${maxRounds} rounds`).not.toBeNull()
  return { end: 'died', drank }
}

/** The end alone, for a caller that does not care what it cost. */
export async function fightItOut(page: Page, maxRounds = 25): Promise<FightEnd> {
  return (await fight(page, maxRounds)).end
}

/** Take whatever a reward screen is offering, or leave it. */
export async function clearReward(page: Page, take = true): Promise<void> {
  if ((await screenName(page)) !== 'reward') return
  if (take) await page.locator('[data-act="take"]').first().click()
  else await act(page, 'skip').click()
  await expect(page.locator('#screen')).toBeHidden()
}
