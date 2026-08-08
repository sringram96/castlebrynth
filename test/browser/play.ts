/**
 * Play a fight through the real interface.
 *
 * Every press below is a real press on a real button; the only thing read out
 * of the app is the table, which is what a player reads off the screen anyway.
 * The brain is the same heuristic policy the balance report uses, so a fight
 * the model says is winnable is proved winnable by a thumb.
 */

import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { bestClaim, keepFor } from '../balance/policies.js'
import type { Table } from '../balance/policies.js'
import { die } from '../../src/content/dice.js'
import { act, screenName, state } from './helpers.js'

async function table(page: Page): Promise<Table> {
  const now = await state(page)
  const run = now.run!
  const combat = run.combat as unknown as {
    roll: { slot: number; dieId: string; faceIndex: number; value: number }[]
    spentHands: string[]
  }
  return {
    dice: combat.roll.map((d) => {
      const face = die(d.dieId).faces[d.faceIndex]!
      return face.effect
        ? { slot: d.slot, value: face.value, effect: face.effect }
        : { slot: d.slot, value: face.value }
    }),
    relics: run.relics,
    spentHands: combat.spentHands as Table['spentHands'],
    hp: run.hp,
  }
}

/** Bring the on-screen marks to exactly `want`, by tapping dice. */
async function markExactly(page: Page, want: readonly number[]): Promise<void> {
  const now = await state(page)
  const marked = new Set(now.run!.combat!.selected)
  const wanted = new Set(want)
  for (const slot of new Set([...marked, ...wanted])) {
    if (marked.has(slot) === wanted.has(slot)) continue
    await page.locator(`.die[data-slot="${slot}"]`).click()
  }
}

/** One turn: roll, keep, reroll, choose, score. */
export async function takeTurn(page: Page): Promise<void> {
  await act(page, 'roll').click()

  await markExactly(page, keepFor(await table(page), 'heuristic'))
  if ((await act(page, 'reroll').count()) > 0) await act(page, 'reroll').click()

  await markExactly(page, bestClaim(await table(page), 'heuristic'))
  await act(page, 'score').click()
}

export type FightEnd = 'won' | 'died'

/** Play a fight to its end, or fail loudly if it never ends. */
export async function fightItOut(page: Page, maxTurns = 25): Promise<FightEnd> {
  await act(page, 'fight').click()
  for (let turn = 0; turn < maxTurns; turn++) {
    const screen = await screenName(page)
    if (screen === 'reward') return 'won'
    if (screen === 'dead') return 'died'
    // A boss with nothing to give goes straight back to the room.
    if ((await act(page, 'roll').count()) === 0 && (await act(page, 'score').count()) === 0) return 'won'
    await takeTurn(page)
  }
  expect(null, `the fight did not end in ${maxTurns} turns`).not.toBeNull()
  return 'died'
}
