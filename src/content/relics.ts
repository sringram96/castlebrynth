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
 */

import type { HandName } from '../combat/scoring.js'

export interface Relic {
  readonly id: string
  readonly name: string
  /** The one sentence. */
  readonly rule: string
  /** What kind of build it points at. */
  readonly buildHint: string
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
  /** Adds flat damage per marked hurt face in the scored selection. */
  | { readonly kind: 'perMarkedFace'; readonly plus: number }
  /** Heals when the scored selection is exactly N dice. */
  | { readonly kind: 'healOnExactly'; readonly dice: number; readonly heal: number }
  /** Doubles the final damage when every scored die shows the same value. */
  | { readonly kind: 'doubleIfUniform' }

export const RELICS: Readonly<Record<string, Relic>> = {
  knuckle: {
    id: 'knuckle',
    name: "Saint's Knuckle",
    rule: 'Pairs score at ×3 instead of ×2.',
    buildHint: 'Wants dice that repeat.',
    icon: '✦',
    effect: { kind: 'multiplier', hand: 'pair', plus: 1 },
  },
  rosary: {
    id: 'rosary',
    name: 'Split Rosary',
    rule: 'The first Straight you score each fight deals +12 damage.',
    buildHint: 'Wants dice that spread.',
    icon: '⛓',
    effect: { kind: 'firstOfFight', hands: ['straight3', 'straight5'], plus: 12 },
  },
  plate: {
    id: 'plate',
    name: 'Rusted Plate',
    rule: 'Block 2 damage from every enemy attack.',
    buildHint: 'Buys turns. Good when a fight is going long.',
    icon: '▣',
    effect: { kind: 'armor', block: 2 },
  },
  thimble: {
    id: 'thimble',
    name: 'Blood Thimble',
    rule: 'Each marked face you score deals +8 damage.',
    buildHint: 'Turns the dangerous dice into a build.',
    icon: '❥',
    effect: { kind: 'perMarkedFace', plus: 8 },
  },
  wax: {
    id: 'wax',
    name: 'Grave Wax',
    rule: 'Score exactly 3 dice and heal 2.',
    buildHint: 'A small, steady drip. Wants Triples and Straight 3s.',
    icon: '✳',
    effect: { kind: 'healOnExactly', dice: 3, heal: 2 },
  },
  nail: {
    id: 'nail',
    name: 'Choir Nail',
    rule: 'If every die you score shows the same value, double the damage.',
    buildHint: 'Wants Triples and Quads. Rare, and enormous.',
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
