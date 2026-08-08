/**
 * Hand recognition and the damage formula.
 *
 * Seven hands, and the smallest one always applies, so there is no such thing
 * as an illegal selection: a selection that forms nothing better is ANY, and
 * ANY always scores. That is what makes the SCORE button impossible to press
 * for nothing.
 *
 * Everything here is a pure function of the selection and the relics held. The
 * preview the player reads and the damage that lands are the same call.
 */

import type { Value } from '../content/dice.js'
import { relic } from '../content/relics.js'
import type { Relic } from '../content/relics.js'

export type HandName = 'any' | 'pair' | 'triple' | 'straight3' | 'fullHouse' | 'quad' | 'straight5'

export interface Hand {
  readonly name: HandName
  readonly label: string
  readonly multiplier: number
  readonly requirement: string
}

export const HANDS: Readonly<Record<HandName, Hand>> = {
  any: { name: 'any', label: 'ANY', multiplier: 1, requirement: 'anything else' },
  pair: { name: 'pair', label: 'PAIR', multiplier: 2, requirement: '2 equal' },
  triple: { name: 'triple', label: 'TRIPLE', multiplier: 3, requirement: '3 equal' },
  straight3: {
    name: 'straight3',
    label: 'STRAIGHT 3',
    multiplier: 3,
    requirement: '3 in a row',
  },
  fullHouse: {
    name: 'fullHouse',
    label: 'FULL HOUSE',
    multiplier: 5,
    requirement: '3 equal + 2 equal',
  },
  quad: { name: 'quad', label: 'QUAD', multiplier: 6, requirement: '4 equal' },
  straight5: {
    name: 'straight5',
    label: 'STRAIGHT 5',
    multiplier: 6,
    requirement: '5 in a row',
  },
}

/** The ladder in the order a player should learn it. */
export const LADDER: readonly HandName[] = [
  'any',
  'pair',
  'triple',
  'straight3',
  'fullHouse',
  'quad',
  'straight5',
]

function consecutive(values: readonly Value[]): boolean {
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  if (sorted.length !== values.length) return false
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]! - sorted[i - 1]! !== 1) return false
  }
  return true
}

function counts(values: readonly Value[]): number[] {
  const tally = new Map<number, number>()
  for (const v of values) tally.set(v, (tally.get(v) ?? 0) + 1)
  return [...tally.values()].sort((a, b) => b - a)
}

/**
 * The best hand this selection *exactly* forms.
 *
 * Exactly, because a hand is the set of dice you chose and not a subset the
 * engine found inside it: choosing five dice and being told you made a pair
 * would mean three of them scored at ×2 for no reason.
 */
export function recognise(values: readonly Value[]): Hand {
  const n = values.length
  if (n === 0) return HANDS.any
  const shape = counts(values)

  if (n === 5 && consecutive(values)) return HANDS.straight5
  if (n === 4 && shape[0] === 4) return HANDS.quad
  if (n === 5 && shape[0] === 3 && shape[1] === 2) return HANDS.fullHouse
  if (n === 3 && shape[0] === 3) return HANDS.triple
  if (n === 3 && consecutive(values)) return HANDS.straight3
  if (n === 2 && shape[0] === 2) return HANDS.pair
  return HANDS.any
}

/** One term of the damage formula, so the tray can attribute every number. */
export interface DamageTerm {
  readonly label: string
  readonly amount: number
  /** The relic that produced it, for the pulse. */
  readonly relicId?: string
}

export interface Preview {
  readonly hand: Hand
  readonly sum: number
  readonly multiplier: number
  /** Flat additions after the multiply. */
  readonly bonuses: readonly DamageTerm[]
  readonly damage: number
  /** Health this selection costs (marked hurt faces). */
  readonly cost: number
  /** Health this selection gives back (marked heal faces, Grave Wax). */
  readonly heal: number
  /** Relics that contributed, so the UI can pulse exactly those. */
  readonly firedRelics: readonly string[]
}

export interface Marked {
  readonly kind: 'hurt' | 'heal'
  readonly amount: number
}

export interface Selected {
  readonly value: Value
  readonly effect?: Marked
}

/**
 * What this selection would do, computed once. The tray shows it and SCORE
 * commits it — they are the same number because they are the same call.
 *
 * `spentHands` is the set of hand families already scored this fight, which is
 * only read by first-of-fight relics. It is not a card: nothing is ever made
 * unavailable by it.
 */
export function preview(
  selection: readonly Selected[],
  relicIds: readonly string[],
  spentHands: readonly HandName[] = [],
): Preview {
  const values = selection.map((s) => s.value)
  const hand = recognise(values)
  const sum = values.reduce((a, b) => a + b, 0)
  const relics = relicIds.map(relic)

  let multiplier = hand.multiplier
  const bonuses: DamageTerm[] = []
  const fired = new Set<string>()
  let cost = 0
  let heal = 0

  for (const s of selection) {
    if (!s.effect) continue
    if (s.effect.kind === 'hurt') cost += s.effect.amount
    else heal += s.effect.amount
  }
  const markedHurts = selection.filter((s) => s.effect?.kind === 'hurt').length

  for (const r of relics) {
    const e = r.effect
    switch (e.kind) {
      case 'multiplier':
        if (hand.name === e.hand) {
          multiplier += e.plus
          fired.add(r.id)
        }
        break
      case 'armor':
        // Read when the enemy swings, not here.
        break
      case 'perMarkedFace':
        if (markedHurts > 0) {
          bonuses.push({ label: r.name, amount: e.plus * markedHurts, relicId: r.id })
          fired.add(r.id)
        }
        break
      case 'firstOfFight':
        if (e.hands.includes(hand.name) && !spentHands.includes(hand.name)) {
          bonuses.push({ label: r.name, amount: e.plus, relicId: r.id })
          fired.add(r.id)
        }
        break
      case 'healOnExactly':
        if (selection.length === e.dice) {
          heal += e.heal
          fired.add(r.id)
        }
        break
      case 'doubleIfUniform':
        break
    }
  }

  let damage = sum * multiplier
  for (const b of bonuses) damage += b.amount

  // Doubling is applied last, on purpose: it doubles the whole reading the
  // player was shown, which is the only version anyone can hold in their head.
  const uniform = values.length > 1 && new Set(values).size === 1
  for (const r of relics) {
    if (r.effect.kind === 'doubleIfUniform' && uniform) {
      damage *= 2
      fired.add(r.id)
    }
  }

  return {
    hand,
    sum,
    multiplier,
    bonuses,
    damage,
    cost,
    heal,
    firedRelics: [...fired],
  }
}

/** Flat block from relics, subtracted from every enemy blow. */
export function armorOf(relicIds: readonly string[]): number {
  let block = 0
  for (const id of relicIds) {
    const e = relic(id).effect
    if (e.kind === 'armor') block += e.block
  }
  return block
}

export function relicsOf(ids: readonly string[]): readonly Relic[] {
  return ids.map(relic)
}
