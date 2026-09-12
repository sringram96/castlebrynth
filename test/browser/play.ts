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
import type { TalismanId } from '../../src/content/dice.js'
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
    // The card prints only the lines the dice make and the player has not spent,
    // so the spent set is no longer a row to count — it is on the card as data,
    // standing in for the MENU press a player would make to check it.
    usedHands: ((await page.locator('#scorecard').getAttribute('data-spent')) ?? '')
      .split(',')
      .filter(Boolean) as NamedHandId[],
    enemyHp: await read('#enemy-hp', 'data-hp'),
    enemyMaxHp: await read('#enemy-hp', 'data-max'),
    enemyDamage: await read('#enemy-hits', 'data-damage'),
    bones: await read('#pile', 'data-bones'),
    vials: await read('.satchel-count', 'data-count'),
    // Off the bay it is standing in, like everything else here. The item dice
    // are deliberately not read: they have not been thrown when the decision
    // is due, and the policy may not know anything the screen does not show.
    talismans: (await page
      .locator('.talisman-slot')
      .evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLElement).dataset['talismanId']!),
      )) as TalismanId[],
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
  // The policy reasons about the whole table; the card draws only what is live.
  // Where the two disagree, play what is actually on the card — a journey is
  // about the game being finishable through real presses, not about the policy
  // being obeyed.
  const wanted = scoreEntry(page, hand as ScoreId)
  const press = (await wanted.count()) > 0 ? wanted : page.locator('#scorecard button.score-entry')
  await press.first().click()
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
    if ((await screenName(page)) === 'dead') return { end: 'died', drank }
    // A win goes straight back to the room — there is no reward screen — and a
    // fight that is over has no throw left on the tray. Visible, not merely
    // present: a control can be in the DOM under something no thumb can reach.
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

/**
 * Work whatever machinery this room has, in the order it offers it.
 *
 * **Real presses, and each verb pressed once.** A room's objects are offered as
 * the room's state allows — the Reliquary's handle only appears once the bell has
 * rung and the flame is out, and the Offertory's slot only once the candles are
 * dark — so one pass over the DOM can never reach the last of them. Several passes
 * can, and pressing each object at most once is what stops the second pass
 * relighting what the first put out.
 *
 * It is deliberately not clever: it does not know any room's order, it reads what
 * is on screen and presses it. A room whose clues do not actually lead anywhere
 * would leave the way shut here, which is the failure worth catching.
 */
export async function workTheRoom(page: Page, passes = 4): Promise<void> {
  const pressed = new Set<string>()
  for (let pass = 0; pass < passes; pass++) {
    const ids = (await page
      .locator('[data-act="interact"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset['interact']!))) as string[]
    const left = ids.filter((id) => !pressed.has(id))
    if (left.length === 0) return
    for (const id of left) {
      const button = page.locator(`[data-interact="${id}"]`)
      if ((await button.count()) === 0) continue
      pressed.add(id)
      await button.click()
    }
  }
}

/**
 * Pick up whatever is lying in this room, or walk away from it.
 *
 * There is no reward screen to clear. What a fight paid is on the floor of the
 * room it was fought in, with its own name on it and its own TAKE, and
 * `take: false` is not a press at all — it is simply not pressing anything,
 * which is what skipping is now.
 */
export async function clearReward(page: Page, take = true): Promise<void> {
  if (!take) return
  for (let guard = 0; guard < 4; guard++) {
    const buttons = page.locator('[data-act="take"]')
    if ((await buttons.count()) === 0) return
    await buttons.first().click()
  }
}

/** What is lying in this room, by the short name on each pill. */
export async function lootOnScreen(page: Page): Promise<string[]> {
  return (await page
    .locator('[data-act="look-loot"]')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset['loot']!))) as string[]
}
