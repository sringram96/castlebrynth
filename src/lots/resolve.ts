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
import { healedBy, ridersFired, shapeTriggers, woundedBy } from './goods.js'
import { addedBy, bittenBy, rollAmends, turnedBy } from './rolling.js'
import { casting } from './turn.js'
import type {
  Armor,
  Bleeding,
  Decision,
  DieId,
  Goods,
  Intent,
  Lot,
  Resolution,
  Turn,
} from './types.js'

/**
 * art. 47: armor blocks its value from every attack, automatically —
 * unless the intent corrodes it, and a corroding intent says so (art. 65).
 */
export function armorAgainst(intent: Intent, armor: Armor): Armor {
  return intent.effect !== undefined && intent.effect.kind === 'corrode' ? 0 : armor
}

/**
 * art. 65 (`bind`): which die this turn's intent takes off the next turn.
 *
 * It reads the dice **as they lie** rather than the hand, because that is
 * what "your highest" means to somebody looking at the table — the intent
 * was declared before the first casting (art. 42), so the player knew the
 * rule and threw anyway, and that is the decision the effect is for.
 *
 * Ties break on the order the dice were cast in, which is the hand's own
 * order: deterministic, so art. 75 replays a bound turn as the turn it was.
 * A turn with nothing on the table binds nothing — a die that never landed
 * cannot be the highest one.
 */
export function bindsFrom(turn: Turn): readonly DieId[] {
  const effect = turn.intent.effect
  if (effect === undefined || effect.kind !== 'bind') return []
  const laid = casting(turn)
  let taken = laid[0]
  if (taken === undefined) return []
  for (const landed of laid) {
    const beats =
      effect.rule === 'highest'
        ? landed.face.value > taken.face.value
        : landed.face.value < taken.face.value
    if (beats) taken = landed
  }
  return [taken.die]
}

/** art. 65 (`bleed`): the bleed this intent opens, if it opens one. */
export function bleedFrom(intent: Intent): Bleeding | null {
  const effect = intent.effect
  if (effect === undefined || effect.kind !== 'bleed') return null
  // A bleed of no turns is not a bleed; content that authors one gets
  // nothing rather than a tick that never fires.
  if (effect.turns <= 0 || effect.amount <= 0) return null
  return { amount: effect.amount, turns: effect.turns }
}

/**
 * art. 65 (`hunger`): what this turn gives back to the horror.
 *
 * The test is **a claim landed**, not harm dealt: a claim that scored
 * nothing (every face cursed, say) is still a turn the player committed,
 * and hunger is about hesitation rather than about arithmetic. art. 46
 * keeps the floor spendable, so the only way to feed it is to choose to.
 */
export function hungerFrom(turn: Turn): number {
  const effect = turn.intent.effect
  if (effect === undefined || effect.kind !== 'hunger') return 0
  return turn.claims.length === 0 ? Math.max(0, effect.amount) : 0
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
 *
 * **card 93: the one seam the rolling goods have.** The lot is last and it is
 * optional, because a run carrying no rolling good never reaches for it — the
 * amendments are rolled after the claims have already scored, they amend the
 * three numbers below rather than being a fourth, and `amends` is empty on
 * every fight in the game that carries none. A caller that hands over a
 * company with trinkets in it and no lot is refused rather than quietly
 * played without them (`rollAmends`).
 */
export function decide(
  turn: Turn,
  decision: Decision,
  armor: Armor,
  goods: Goods = { talismans: [], riders: [] },
  lot?: Lot,
): Resolution {
  const linesSpent = turn.claims.map((claim) => claim.line)
  if (decision === 'flee') {
    // art. 41: flight neither deals nor takes — and an intent that never
    // landed binds nothing, opens no bleed, and is not fed. What is already
    // running keeps running: the fight pauses, it does not heal (art. 63).
    //
    // card 93: nothing rolls either. Running is not an attack, and the goods
    // roll at Attack — so flight cannot be a free look at what they would
    // have thrown.
    return {
      decision,
      harmDealt: 0,
      harmTaken: 0,
      healed: 0,
      hurt: 0,
      blocked: 0,
      linesSpent,
      fled: true,
      binds: [],
      bleeds: null,
      fed: 0,
      amends: [],
    }
  }
  // card 93: **after the line, never inside it.** The claims have already
  // scored — tier, sum, talismans and all — and the amendments move what that
  // came to. Nothing here reaches back into combo detection: a face is an
  // effect or a null, never a number a line could be made of.
  const amends = rollAmends(turn, goods, lot)
  const harmDealt = attack(turn, goods) + addedBy(amends)
  const fired = ridersFired(turn.claims, goods.riders)
  const healed = healedBy(fired)
  // art. 86: a cost face is charged where the riders fire, not where the
  // intent lands. Armor does not touch it — armor is what the horror has to
  // get through, and this did not come from the horror (art. 47). card 93: a
  // trinket's bite is the same species of thing and is charged in the same
  // place, so the death it causes reads like any other (`endLineFor`).
  const hurt = woundedBy(fired) + bittenBy(amends)
  // card 93: and what a `block` face turned aside stands beside the armor
  // rather than inside it — a corroding intent eats the body stat and not a
  // thing that happened at score time (`turnedBy`).
  const standing = armorAgainst(turn.intent, armor) + turnedBy(amends)
  const blocked = Math.min(standing, turn.intent.amount)
  return {
    decision,
    harmDealt,
    // art. 46 and the demo alike: damage has a floor of nothing.
    harmTaken: Math.max(0, turn.intent.amount - standing),
    healed,
    hurt,
    blocked,
    linesSpent,
    fled: false,
    binds: bindsFrom(turn),
    bleeds: bleedFrom(turn.intent),
    fed: hungerFrom(turn),
    amends,
  }
}
