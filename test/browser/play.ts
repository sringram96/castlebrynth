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

import { charmFor, drinkFor, fieldFor } from '../balance/policies.js'
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
    charms: run.charms,
    vials: run.vials,
    charmUsed: combat.charmUsed,
  }
}

/** Set the width stepper to `want`, one press at a time. */
async function stepTo(page: Page, want: number): Promise<void> {
  for (let guard = 0; guard < 12; guard++) {
    const stepper = page.locator('#width')
    if ((await stepper.count()) === 0) return
    const now = Number(await stepper.getAttribute('data-width'))
    if (now === want) return
    const button = now > want ? act(page, 'width-down') : act(page, 'width-up')
    if ((await button.count()) === 0) return
    await button.click()
  }
}

/** Put the named bones in the line, through the pouch, as a player would. */
async function fieldSpecials(page: Page, want: readonly string[]): Promise<void> {
  if (want.length === 0) return
  await act(page, 'pouch').click()
  for (const instanceId of want) {
    const row = page.locator(`.pouch-row[data-instance-id="${instanceId}"]`)
    if ((await row.count()) === 0) continue
    if ((await row.getAttribute('data-fielded')) === 'yes') continue
    const button = row.locator('[data-act="field-bone"]')
    if ((await button.count()) > 0) await button.click()
  }
  await act(page, 'close').click()
}

/**
 * One round: field, throw, maybe a Charm, smash, and on to the next.
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

  const decision = fieldFor(await table(page), 'heuristic')
  await fieldSpecials(page, decision.specialIds)
  await stepTo(page, decision.width)
  await act(page, 'field').click()

  await act(page, 'throw').click()

  const rolled = (await state(page)).run?.combat
  if (rolled?.phase === 'rolled' && rolled.playerLine) {
    const target = charmFor(
      await table(page),
      rolled.playerLine as unknown as readonly RolledBone[],
      'heuristic',
    )
    if (target && (await act(page, 'charm').count()) > 0) {
      // Two presses, always: arm the Charm, then choose the bone. A single tap
      // on a bone may never spend one.
      await act(page, 'charm').click()
      await page.locator(`.bone[data-bone-key="${cssEscape(target)}"]`).click()
    }
  }

  await act(page, 'smash').click()
  if ((await act(page, 'round').count()) > 0) await act(page, 'round').click()
  return drank
}

function cssEscape(value: string): string {
  return value.replace(/[^\w-]/g, (c) => `\\${c}`)
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
    if ((await act(page, 'field').count()) === 0 && (await act(page, 'round').count()) === 0) {
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
