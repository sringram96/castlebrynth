/**
 * Every relic in the game.
 *
 * A relic is a passive rule outside the hand: one icon, one trigger, one
 * effect, one sentence. There is no talisman/level/wearable/trinket taxonomy —
 * armour is just a relic effect.
 *
 * Relics are *read* at scoring time and never write state another relic reads,
 * so the order they are held in cannot change an outcome. `test/unit/`
 * proves it.
 *
 * ## The copy law
 *
 * `rule` is the exact mechanic and `helpsWith` is a concrete play pattern.
 * Neither may be a metaphor. "Wants dice that repeat", "turns the dangerous
 * dice into a build" and "rare, and enormous" all described these relics
 * without telling a player what any of them does, and a strategy note that
 * cannot be checked against the screen is not a strategy note.
 */

import type { HandName } from '../combat/scoring.js'

export interface Relic {
  readonly id: string
  /** The exact mechanic, in one sentence. */
  readonly name: string
  readonly rule: string
  /** A concrete play pattern: which dice or hands this actually rewards. */
  readonly helpsWith: string
  readonly icon: string
  readonly effect: RelicEffect
}

export type RelicEffect =
  /** Adds to the multiplier of one named hand. */
  | { readonly kind: 'multiplier'; readonly hand: HandName; readonly plus: number }
  /** Adds flat damage the first time a family of hands is scored in a fight. */
  | { readonly kind: 'firstOfFight'; readonly hands: readonly HandName[]; readonly plus: number }
  /** Subtracts flat from every enemy attack. */
  | { readonly kind: 'armor'; readonly block: number }
  /**
   * Adds flat damage per **red** face in the scored selection.
   *
   * Red only, never green: the point of the relic is to pay you for the risk
   * you took, and a green face is not a risk. The implementation always counted
   * red faces alone; the copy used to say "each marked face", which named a
   * larger set than the code and left the two disagreeing.
   */
  | { readonly kind: 'perRedFace'; readonly plus: number }
  /** Heals when the scored selection is exactly N dice. */
  | { readonly kind: 'healOnExactly'; readonly dice: number; readonly heal: number }
  /** Doubles the final damage when every scored die shows the same value. */
  | { readonly kind: 'doubleIfUniform' }

export const RELICS: Readonly<Record<string, Relic>> = {
  knuckle: {
    id: 'knuckle',
    name: "Saint's Knuckle",
    rule: 'When your scored hand is a Pair, use ×3 instead of ×2.',
    helpsWith: 'Dice that roll repeated numbers.',
    icon: '✦',
    effect: { kind: 'multiplier', hand: 'pair', plus: 1 },
  },
  rosary: {
    id: 'rosary',
    name: 'Split Rosary',
    rule: 'The first Straight 3 or Straight 5 you score in each fight deals +12 damage.',
    helpsWith: 'Dice with several different numbers.',
    icon: '⛓',
    effect: { kind: 'firstOfFight', hands: ['straight3', 'straight5'], plus: 12 },
  },
  plate: {
    id: 'plate',
    name: 'Rusted Plate',
    rule: 'Every enemy hit against you deals 2 less damage, to a minimum of 0.',
    helpsWith: 'Long fights. It gives you more turns before you die.',
    icon: '▣',
    effect: { kind: 'armor', block: 2 },
  },
  thimble: {
    id: 'thimble',
    name: 'Blood Thimble',
    rule: 'Each red damage face included in the hand you SCORE adds +8 damage to your hit.',
    helpsWith:
      'Pusher and Runner. Their dangerous red faces become stronger attacks when you risk scoring them.',
    icon: '❥',
    effect: { kind: 'perRedFace', plus: 8 },
  },
  wax: {
    id: 'wax',
    name: 'Grave Wax',
    rule: 'Whenever you score exactly 3 dice, heal 2 HP.',
    helpsWith: 'Triples and Straight 3s.',
    icon: '✳',
    effect: { kind: 'healOnExactly', dice: 3, heal: 2 },
  },
  nail: {
    id: 'nail',
    name: 'Choir Nail',
    rule: 'If every die in the hand you SCORE shows the same number, double the final damage.',
    helpsWith: 'Triples and Quads made from the same number.',
    icon: '✚',
    effect: { kind: 'doubleIfUniform' },
  },
}

export const LOOT_RELICS: readonly string[] = Object.keys(RELICS)

export function relic(id: string): Relic {
  const found = RELICS[id]
  if (!found) throw new Error(`no such relic: ${id}`)
  return found
}
