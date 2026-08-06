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
  Bleeding,
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
/**
 * `yourHealthMax` defaults to what you walked in with, which is right for
 * the demo fixtures and wrong for a run: a body's ceiling is a stat
 * (art. 60), not the number it happened to be standing at. The descent wave
 * surfaced it — a run that had paid a priced act's price (art. 119) entered
 * a fight with its ceiling quietly clamped to its current health, so a leech
 * rider could not heal it back to whole and a *resumed* fight (which
 * restores `run.healthMax`) disagreed with a fresh one about the same body.
 * `openFightDoor` passes the run's own ceiling; everything with no run
 * behind it keeps the old default.
 */
export function openFight(
  horror: Horror,
  hand: Hand,
  yourHealth: number,
  armor: Armor,
  goods: Goods = NO_GOODS,
  yourHealthMax: number = yourHealth,
): Fight {
  const card: Card = freshCard()
  const intent = horror.intentFor(1)
  return {
    horror,
    horrorHealth: horror.health,
    yourHealth,
    yourHealthMax,
    armor,
    card,
    // art. 65: nothing is running in you at the door. A bleed is something a
    // horror opens, and no horror has had a turn yet.
    bleed: null,
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
 * A resolved turn, applied.
 *
 * **The one declared order** (arts 45, 51, 65, 86). Every effect resolves
 * at exactly one place in it, and the order is the demo's extended rather
 * than rearranged — the three effects the company wave adds slot in where
 * the thing they attack already lived:
 *
 *  1. the claims land — `harmDealt` off the horror;
 *  2. **hunger**, if the turn claimed nothing — the horror takes it back;
 *  3. the riders fire — heals, then the cost faces (art. 86);
 *  4. a horror at nothing is dead, and a killing blow is not also a killing
 *     blow taken;
 *  5. armor eats its share, and the intent strikes;
 *  6. a body at nothing is dead;
 *  7. **bleed** refreshes off this intent, then **ticks** — before the next
 *     intent shows, so a turn opens with what it already costs you visible;
 *  8. **bind** takes its die off the turn that is opening.
 *
 * art. 44: what is left of the hand returns whole.
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

  let horrorHealth = Math.max(0, fight.horrorHealth - resolution.harmDealt)
  if (resolution.harmDealt > 0) events.push({ kind: 'dealt', amount: resolution.harmDealt })
  // art. 65 (`hunger`): a turn that landed nothing feeds it — never past
  // what it started with, because a horror that heals above its own health
  // is a horror whose bar lies (art. 57).
  if (resolution.fed > 0) {
    horrorHealth = Math.min(fight.horror.health, horrorHealth + resolution.fed)
    events.push({ kind: 'fed', amount: resolution.fed })
  }
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

  // art. 65 (`bleed`): stacks refresh, never add. A fresh bleed replaces
  // whatever was running rather than stacking on it.
  let bleed: Bleeding | null = resolution.bleeds ?? fight.bleed
  // And it ticks at the top of the turn, before the intent shows: what a
  // turn already costs you is part of reading the turn (arts 42, 57).
  if (bleed !== null && bleed.turns > 0) {
    const bit = Math.max(0, bleed.amount - fight.armor)
    if (bit > 0) {
      yourHealth -= bit
      events.push({ kind: 'bled', amount: bit })
    }
    bleed = bleed.turns <= 1 ? null : { amount: bleed.amount, turns: bleed.turns - 1 }
    if (yourHealth <= 0) {
      events.push({ kind: 'ended', outcome: 'lost' })
      return {
        ...fight,
        horrorHealth,
        yourHealth,
        bleed,
        outcome: 'lost',
        events: [...fight.events, ...events],
      }
    }
  }

  // art. 44: the hand returns whole; only the card carries the turn's cost.
  // art. 65 (`bind`): except for what this intent took off it.
  const turnNumber = fight.turnNumber + 1
  const intent = fight.horror.intentFor(turnNumber)
  if (resolution.binds.length > 0) events.push({ kind: 'bound', dice: resolution.binds })
  events.push({ kind: 'turn-opened', turnNumber, intent })
  return {
    ...fight,
    horrorHealth,
    yourHealth,
    bleed,
    turnNumber,
    turn: openTurn(fight.hand, intent, fight.card, resolution.binds),
    events: [...fight.events, ...events],
  }
}

/** Where a fight stands, for a caller that would rather not read events. */
export function outcomeOf(fight: Fight): Outcome {
  return fight.outcome
}
