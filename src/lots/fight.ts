/**
 * The fight (arts 41–42, 57, 63).
 *
 * A headless state machine against an intent script. It emits structured
 * events and never a word of prose — the voice lives in content and is
 * bound by rules/voice.md.
 *
 * The card belongs to the fight and refills between fights, never within
 * one (art. 63): `openFight` is the refill.
 */

import { freshCard } from './card.js'
import { harm } from './combos.js'
import { openTurn } from './turn.js'
import type {
  Armor,
  Card,
  Fight,
  FightEvent,
  Goods,
  Hand,
  Horror,
  Outcome,
  Resolution,
  Turn,
} from './types.js'

const NO_GOODS: Goods = { talismans: [], riders: [] }

/** art. 63: a fresh card at the door, every time. */
export function openFight(
  horror: Horror,
  hand: Hand,
  yourHealth: number,
  armor: Armor,
  goods: Goods = NO_GOODS,
): Fight {
  const card: Card = freshCard()
  const intent = horror.intentFor(1)
  return {
    horror,
    horrorHealth: horror.health,
    yourHealth,
    yourHealthMax: yourHealth,
    armor,
    card,
    turnNumber: 1,
    turn: openTurn(hand, intent, card),
    hand,
    goods,
    outcome: 'fighting',
    events: [{ kind: 'turn-opened', turnNumber: 1, intent }],
  }
}

/**
 * The turn moves; the fight follows. Claiming spends the card, so the fight
 * takes the turn's card as the truth (art. 63).
 */
export function withTurn(fight: Fight, turn: Turn): Fight {
  return { ...fight, turn, card: turn.card }
}

/**
 * A resolved turn, applied. The order is the demo's: the claims land, the
 * riders fire, and only a horror still standing gets to strike back.
 * art. 44: the hand returns whole for the next turn.
 */
export function advanceFight(fight: Fight, resolution: Resolution): Fight {
  if (fight.outcome !== 'fighting') throw new Error('the fight is over')
  const events: FightEvent[] = []
  for (const claim of fight.turn.claims) {
    events.push({ kind: 'claimed', line: claim.line, harm: harm(claim) })
  }

  if (resolution.fled) {
    events.push({ kind: 'ended', outcome: 'fled' })
    return { ...fight, outcome: 'fled', events: [...fight.events, ...events] }
  }

  const horrorHealth = Math.max(0, fight.horrorHealth - resolution.harmDealt)
  if (resolution.harmDealt > 0) events.push({ kind: 'dealt', amount: resolution.harmDealt })
  let yourHealth = fight.yourHealth
  if (resolution.healed > 0) {
    yourHealth = Math.min(fight.yourHealthMax, yourHealth + resolution.healed)
    events.push({ kind: 'healed', amount: resolution.healed })
  }
  // art. 86: the cost faces are charged on the riders' beat, because that is
  // what they are — riders (art. 51). The claims have already landed, so a
  // die whose price kills you still kills the horror first: the demo's order
  // says a killing blow is not also a killing blow taken, and a cost face is
  // not a special case of that.
  if (resolution.hurt > 0) {
    yourHealth -= resolution.hurt
    events.push({ kind: 'cost', amount: resolution.hurt })
  }

  if (horrorHealth <= 0) {
    events.push({ kind: 'ended', outcome: 'won' })
    return {
      ...fight,
      horrorHealth,
      yourHealth,
      outcome: 'won',
      events: [...fight.events, ...events],
    }
  }

  if (resolution.blocked > 0) events.push({ kind: 'blocked', amount: resolution.blocked })
  yourHealth -= resolution.harmTaken
  if (resolution.harmTaken > 0) events.push({ kind: 'struck', amount: resolution.harmTaken })

  if (yourHealth <= 0) {
    events.push({ kind: 'ended', outcome: 'lost' })
    return {
      ...fight,
      horrorHealth,
      yourHealth,
      outcome: 'lost',
      events: [...fight.events, ...events],
    }
  }

  // art. 44: the hand returns whole; only the card carries the turn's cost.
  const turnNumber = fight.turnNumber + 1
  const intent = fight.horror.intentFor(turnNumber)
  events.push({ kind: 'turn-opened', turnNumber, intent })
  return {
    ...fight,
    horrorHealth,
    yourHealth,
    turnNumber,
    turn: openTurn(fight.hand, intent, fight.card),
    events: [...fight.events, ...events],
  }
}

/** Where a fight stands, for a caller that would rather not read events. */
export function outcomeOf(fight: Fight): Outcome {
  return fight.outcome
}
