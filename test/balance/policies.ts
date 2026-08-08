/**
 * How a player might play, expressed as code.
 *
 * Two tiers, and the difference between them is the point. Balancing the first
 * fight against a solver that knows every trade-off produces a fight that is
 * miserable for somebody who has not internalised the ladder, which is exactly
 * the discrepancy the blueprint flags: a modelled 50-70% win band against a
 * hands-on report of never winning once.
 *
 *   naive      keeps the matching dice, scores the matching dice, stops there.
 *   heuristic  claims the best subset on the table, weighs a run against a
 *              group, and will not spend a marked face that would kill it.
 *
 * Nothing here is imported by the runtime. It is used by the balance report and
 * by the browser suite, which drives the real UI with it.
 */

import { preview } from '../../src/combat/scoring.js'
import type { HandName, Selected } from '../../src/combat/scoring.js'
import type { Value } from '../../src/content/dice.js'

export interface Table {
  /** One entry per die on the table, in slot order. */
  readonly dice: readonly {
    readonly slot: number
    readonly value: Value
    readonly effect?: { readonly kind: 'hurt' | 'heal'; readonly amount: number }
  }[]
  readonly relics: readonly string[]
  readonly spentHands: readonly HandName[]
  readonly hp: number
}

/**
 * Two tiers, and the gap between them is the thing being measured.
 *
 * `naive` is somebody on their first fight: they see the group of matching
 * dice, they keep it, they score it, and that is the whole plan. They do not
 * compare it against a straight, and they do not notice that leaving one die
 * out would score more.
 *
 * `heuristic` is somebody who has read the ladder: they weigh a run against a
 * group, they claim the best subset on the table, and they will not spend a
 * marked face that would kill them.
 *
 * There is deliberately no third "optimal-ish" tier. With the card, the
 * statuses and rolling goods all parked, a turn holds exactly one decision —
 * which subset to claim — and `heuristic` already claims the best one. A third
 * tier would differ only in the keep step, and would move nothing a number
 * here is used to set.
 */
export type Tier = 'naive' | 'heuristic'

const selectionOf = (table: Table, slots: readonly number[]): Selected[] =>
  slots.map((slot) => {
    const d = table.dice.find((x) => x.slot === slot)!
    return d.effect ? { value: d.value, effect: d.effect } : { value: d.value }
  })

/** Every non-empty subset of up to six dice: 63 of them, so just look at all. */
function subsets(slots: readonly number[]): number[][] {
  const out: number[][] = []
  for (let mask = 1; mask < 1 << slots.length; mask++) {
    const pick: number[] = []
    for (let i = 0; i < slots.length; i++) if (mask & (1 << i)) pick.push(slots[i]!)
    out.push(pick)
  }
  return out
}

/** The largest group of equal values, breaking ties toward the higher value. */
function biggestGroup(table: Table): number[] {
  const byValue = new Map<number, number[]>()
  for (const d of table.dice) byValue.set(d.value, [...(byValue.get(d.value) ?? []), d.slot])
  let group: number[] = []
  let groupValue = 0
  for (const [value, slots] of byValue) {
    if (slots.length > group.length || (slots.length === group.length && value > groupValue)) {
      group = slots
      groupValue = value
    }
  }
  return group
}

/**
 * The dice to score.
 *
 * The naive player scores the group they can see and nothing else — falling
 * back to their single highest die when nothing matches. They do not search.
 * The heuristic player claims the best subset on the table and will not spend
 * a marked face that would kill them, which is the one piece of arithmetic
 * everybody does after being bitten once.
 */
export function bestClaim(table: Table, tier: Tier): number[] {
  if (tier === 'naive') {
    const group = biggestGroup(table)
    if (group.length > 1) return group
    const highest = [...table.dice].sort((a, b) => b.value - a.value)[0]!
    return [highest.slot]
  }

  let best: number[] = [table.dice[0]!.slot]
  let bestDamage = -1
  for (const pick of subsets(table.dice.map((d) => d.slot))) {
    const p = preview(selectionOf(table, pick), table.relics, table.spentHands)
    if (p.cost - p.heal >= table.hp) continue
    if (p.damage > bestDamage) {
      bestDamage = p.damage
      best = pick
    }
  }
  return best
}

/**
 * What to keep before the reroll.
 *
 * Both tiers keep the largest group of equal values, because that is the shape
 * everybody sees first. Heuristic also keeps a run when it is longer than the
 * biggest group, which is the first thing a player learns after the ladder
 * stops being new.
 */
export function keepFor(table: Table, tier: Tier): number[] {
  const group = biggestGroup(table)
  if (tier === 'naive') return group.length > 1 ? group : []

  const values = [...new Set(table.dice.map((d) => d.value))].sort((a, b) => a - b)
  let run: number[] = []
  let best: number[] = []
  for (let i = 0; i < values.length; i++) {
    if (i > 0 && values[i]! - values[i - 1]! === 1) run.push(values[i]!)
    else run = [values[i]!]
    if (run.length > best.length) best = [...run]
  }
  if (best.length > group.length) {
    return best.map((value) => table.dice.find((d) => d.value === value)!.slot)
  }
  return group.length > 1 ? group : []
}
