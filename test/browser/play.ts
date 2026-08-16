/**
 * Play a fight through the real interface.
 *
 * Every press below is a real press on a real button, and **every number the
 * policy reasons with is read off the screen** — the dice out of the crown,
 * the spent categories out of the scorecard, the enemy's two figures out of
 * the bar over the world. Nothing is read out of `GameState` and nothing is
 * injected into it: a journey that reached its end by writing state would be
 * proving that the reducer works, which the unit suite already does, rather
 * than that the game can be played.
 *
 * The brain is the same heuristic policy the balance report uses, so a fight
 * the model says is winnable is proved winnable by a thumb.
 */

import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { drinkFor, holdFor, scoreFor, shouldScore } from '../balance/policies.js'
import type { Table } from '../balance/policies.js'
import type { NamedHandId, ScoreId } from '../../src/combat/hands.js'
import type { DieValue } from '../../src/combat/roll.js'
import { act, dice, screenName, scoreEntry } from './helpers.js'

/** Exactly what the screen is showing. Nothing the player cannot see. */
async function table(page: Page): Promise<Table> {
  const read = async (selector: string, attribute: string): Promise<number> =>
    Number((await page.locator(selector).getAttribute(attribute)) ?? 0)

  return {
    dice: (await dice(page).evaluateAll((nodes) =>
      nodes.map((n) => Number((n as HTMLElement).dataset['value'])),
    )) as DieValue[],
    rollsUsed: await read('#crown', 'data-rolls'),
    usedHands: (await page
      .locator('.score-entry[data-used="yes"]')
      .evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLElement).dataset['hand']!),
      )) as NamedHandId[],
    enemyHp: await read('#enemy-hp', 'data-hp'),
    enemyMaxHp: await read('#enemy-hp', 'data-max'),
    enemyDamage: await read('#enemy-hits', 'data-damage'),
    bones: await read('#pile', 'data-bones'),
    vials: await read('.satchel-count', 'data-count'),
  }
}

/**
 * Hold exactly the dice the policy wants, through the crown.
 *
 * A pass over the row, toggling anything whose state does not match the
 * decision — which is what a thumb actually does, and which also proves the
 * hold state is legible from the DOM rather than only from a colour.
 */
async function hold(page: Page, want: readonly number[]): Promise<void> {
  const wanted = new Set(want)
  const row = dice(page)
  for (let index = 0; index < (await row.count()); index++) {
    const die = row.nth(index)
    if ((await die.getAttribute('data-act')) !== 'hold') continue
    const held = (await die.getAttribute('data-held')) === 'yes'
    if (held !== wanted.has(index)) await die.click()
  }
}

/**
 * One attack: throw, hold, throw again, and commit to a hand.
 *
 * Returns how many Vials it drank, because a caller checking a guaranteed
 * drop needs to know: a fight that pays one Vial and spends one leaves the
 * satchel exactly where it started, and an assertion that only looked at the
 * count would call that a missing drop.
 */
export async function takeAttack(page: Page): Promise<number> {
  let drank = 0
  if (drinkFor(await table(page), 'heuristic') && (await act(page, 'drink').count()) > 0) {
    await act(page, 'drink').click()
    drank += 1
  }

  await act(page, 'roll').click()

  // Up to the two throws the attack is given. The loop stops the moment the
  // policy is happy or REROLL stops being offered — which is the same thing
  // the tray is saying by not drawing the button.
  for (let throwsLeft = 2; throwsLeft > 0; throwsLeft--) {
    const now = await table(page)
    if (shouldScore(now, 'heuristic')) break
    await hold(page, holdFor(now, 'heuristic'))
    if (!(await act(page, 'reroll').isVisible())) break
    await act(page, 'reroll').click()
  }

  const hand = scoreFor(await table(page), 'heuristic')
  expect(hand, 'the scorecard offered nothing at all').toBeTruthy()
  await scoreEntry(page, hand as ScoreId).click()
  return drank
}

export type FightEnd = 'won' | 'died'

export interface FightReport {
  readonly end: FightEnd
  /** Vials spent getting there. A caller checking a drop has to net these off. */
  readonly drank: number
}

/** Play a fight to its end, or fail loudly if it never ends. */
export async function fight(page: Page, maxAttacks = 30): Promise<FightReport> {
  await act(page, 'fight').click()
  let drank = 0
  for (let attack = 0; attack < maxAttacks; attack++) {
    const screen = await screenName(page)
    if (screen === 'reward') return { end: 'won', drank }
    if (screen === 'dead') return { end: 'died', drank }
    // A win with nothing to give goes straight back to the room, and a fight
    // that is over has no throw left on the tray. Visible, not merely present:
    // a reward screen can sit over a tray that still holds a ROLL button no
    // thumb could reach.
    if (!(await act(page, 'roll').isVisible())) {
      return { end: (await screenName(page)) === 'dead' ? 'died' : 'won', drank }
    }
    drank += await takeAttack(page)
  }
  expect(null, `the fight did not end in ${maxAttacks} attacks`).not.toBeNull()
  return { end: 'died', drank }
}

/** The end alone, for a caller that does not care what it cost. */
export async function fightItOut(page: Page, maxAttacks = 30): Promise<FightEnd> {
  return (await fight(page, maxAttacks)).end
}

/** Take whatever a reward screen is offering, or leave it. */
export async function clearReward(page: Page, take = true): Promise<void> {
  if ((await screenName(page)) !== 'reward') return
  if (take) await page.locator('[data-act="take"]').first().click()
  else await act(page, 'skip').click()
  await expect(page.locator('#screen')).toBeHidden()
}
