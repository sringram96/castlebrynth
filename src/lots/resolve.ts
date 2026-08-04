/**
 * Armor and resolution (arts 46–47, 57, 65).
 *
 * The order is the demo's, and the demo wins ties about behaviour: the
 * claims total, then the on-use riders, then the intent minus armor with a
 * floor of nothing. art. 46: a turn without combos is a turn of armor and
 * patience, not a punishment.
 */

import { harm } from './combos.js'
import { claimedDice } from './card.js'
import { healedBy, ridersFired, shapeTriggers } from './goods.js'
import { casting } from './turn.js'
import type { Armor, Decision, Goods, Intent, Resolution, Turn } from './types.js'

/**
 * art. 47: armor blocks its value from every attack, automatically —
 * unless the intent corrodes it, and a corroding intent says so (art. 65).
 */
export function armorAgainst(intent: Intent, armor: Armor): Armor {
  return intent.effect !== undefined && intent.effect.kind === 'corrode' ? 0 : armor
}

/** Whether every die of this casting ended up inside a claim (art. 53). */
export function everyDieClaimed(turn: Turn): boolean {
  const laid = casting(turn)
  if (laid.length === 0) return false
  const spent = claimedDice(turn)
  return laid.every((landed) => spent.has(landed.die))
}

/**
 * The turn's whole attack: every claim summed (art. 45), then the shape
 * triggers that read the whole turn rather than one claim (art. 53). Each
 * trigger reads the turn independently, so two of them multiply twice.
 */
export function attack(turn: Turn, goods: Goods = { talismans: [], riders: [] }): number {
  let total = turn.claims.reduce((sum, claim) => sum + harm(claim), 0)
  if (total <= 0) return 0
  for (const talisman of shapeTriggers(goods.talismans, everyDieClaimed(turn))) {
    total *= talisman.shape?.times ?? 1
  }
  return total
}

/**
 * A turn, resolved. `harmTaken` is what the intent *will* take once armor
 * has eaten its share — the fight applies it only if the horror is still
 * standing, which is the demo's order and the reason a killing blow is not
 * also a killing blow taken.
 *
 * art. 41: FLEE is always offered, and flight neither deals nor takes.
 */
export function decide(
  turn: Turn,
  decision: Decision,
  armor: Armor,
  goods: Goods = { talismans: [], riders: [] },
): Resolution {
  const linesSpent = turn.claims.map((claim) => claim.line)
  if (decision === 'flee') {
    return {
      decision,
      harmDealt: 0,
      harmTaken: 0,
      healed: 0,
      blocked: 0,
      linesSpent,
      fled: true,
    }
  }
  const harmDealt = attack(turn, goods)
  const healed = healedBy(ridersFired(turn.claims, goods.riders))
  const standing = armorAgainst(turn.intent, armor)
  const blocked = Math.min(standing, turn.intent.amount)
  return {
    decision,
    harmDealt,
    // art. 46 and the demo alike: damage has a floor of nothing.
    harmTaken: Math.max(0, turn.intent.amount - standing),
    healed,
    blocked,
    linesSpent,
    fled: false,
  }
}
