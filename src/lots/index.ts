/**
 * src/lots — the dice engine: turn, ladder, claims, the card, armor, riders
 * (arts 41–65, as amended by the demo ruling of 2026-08-04).
 *
 * `reference/castlebrynth-lots-demo.html` is the playable spec, and where
 * prose and the demo disagree about behaviour, the demo wins.
 *
 * No tuning number lives here. Shapes are law and live here; the ladder's
 * multipliers, the hand's size, armor values, every horror's intent and
 * every die's faces arrive from `src/content` (art. 48).
 *
 * ## The API, in the order a fight uses it
 *
 * **Before the door** — `assembleHand(pouch, size)` (art. 60);
 * `armorFrom(worn, base)` (art. 47); `audit(die, plain)` (art. 54).
 *
 * **At the door** — `openFight(horror, hand, health, armor, goods)`. The
 * card is fresh here and nowhere else (art. 63).
 *
 * **The turn** — `openTurn(hand, intent, card)` states the intent before a
 * die is thrown (art. 42); `cast(turn, lot)`; `keep(turn, dice)`;
 * `recast(turn, lot)` — exactly one, by art. 41. `casting(turn)` is the
 * dice as they lie.
 *
 * **The claims** — `claimable(turn, dice, ladder)` says which lines a
 * selection could take (arts 63–64); `claim(turn, dice, line, ladder,
 * goods)` takes one; `disband(turn, line)` gives it back; `unused(turn)`
 * is what fit nothing (art. 45). `attack(turn, goods)` is the whole turn's
 * harm. `fitsNothing(turn, dice, ladder)` is art. 72's other half: whether
 * a selection owes the thumb an explanation instead of an offer.
 *
 * **The end of the turn** — `decide(turn, 'end-turn' | 'flee', armor,
 * goods)` yields a `Resolution`; `advanceFight(fight, resolution)` applies
 * it and opens the next turn. `withTurn(fight, turn)` keeps the fight and
 * the turn in step while the turn is still moving.
 *
 * The `Lot` is the caller's: a fight is deterministic in the lot it is
 * given, and the run's seed is `src/gen`'s to hold (art. 36).
 */

export type {
  Armor,
  BondId,
  Card,
  Casting,
  Claim,
  Decision,
  Die,
  DieId,
  Face,
  Fight,
  FightEvent,
  Goods,
  Hand,
  Horror,
  Intent,
  IntentEffect,
  Ladder,
  Landed,
  Line,
  Lot,
  Outcome,
  Pouch,
  Resolution,
  Rider,
  RiderEffect,
  RiderId,
  Talisman,
  TalismanId,
  TalismanSpecies,
  Tier,
  Turn,
  Value,
  Wearable,
  WearableId,
} from './types.js'
export { LINES } from './types.js'

export {
  CASTINGS_ALLOWED,
  assembleHand,
  cast,
  casting,
  castingsLeft,
  inspect,
  keep,
  openTurn,
  recast,
  throwDie,
} from './turn.js'

export type { Shape } from './combos.js'
export {
  NO_GOODS,
  assemble,
  bondIn,
  cursedValue,
  harm,
  shapeOf,
  shapesOf,
  tierFor,
  worth,
} from './combos.js'

export {
  claim,
  claimable,
  claimedDice,
  claims,
  disband,
  fitsNothing,
  freshCard,
  refill,
  sealed,
  selection,
  spend,
  unspent,
  unused,
} from './card.js'

export type { Audit } from './goods.js'
export { armorFrom, audit, healedBy, riderIds, ridersFired, shapeTriggers } from './goods.js'

export { armorAgainst, attack, decide, everyDieClaimed } from './resolve.js'

export { advanceFight, openFight, outcomeOf, withTurn } from './fight.js'
