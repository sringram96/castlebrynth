/**
 * The shapes and the sums (arts 45, 48, 52–53, 64).
 *
 * A selection of dice makes exactly the shapes it makes; the ladder says
 * what each shape is worth. Shapes are law and live here — every multiplier
 * is tuning and arrives from `src/content/ladder.ts`.
 */

import type {
  BondId,
  Claim,
  Goods,
  Intent,
  Ladder,
  Landed,
  Line,
  Talisman,
  Tier,
  Value,
} from './types.js'
import { LINES } from './types.js'

/** The company of nothing, for a bare hand (art. 55). */
export const NO_GOODS: Goods = { talismans: [], riders: [] }

/**
 * What a selection looks like, stripped of everything but its arithmetic:
 * the count signature (descending), whether the values run consecutively,
 * and how many dice there are.
 */
export interface Shape {
  /** Counts of each distinct value, descending, joined: "32" is a full house. */
  readonly signature: string
  readonly consecutive: boolean
  readonly size: number
}

export function shapeOf(values: readonly Value[]): Shape {
  const counts = new Map<number, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  const signature = [...counts.values()].sort((a, b) => b - a).join('')
  const sorted = [...values].sort((a, b) => a - b)
  const distinct = counts.size === values.length
  const consecutive =
    distinct && sorted.every((value, i) => i === 0 || value === sorted[i - 1]! + 1)
  return { signature, consecutive, size: values.length }
}

/**
 * art. 48: every line this selection *is*. art. 64: a composite is a single
 * claim, so a full house offers the full house and never the triple and the
 * pair inside it. art. 46: ANY DICE is always in the list — the deliberate
 * floor, spendable like any line.
 */
export function shapesOf(values: readonly Value[]): readonly Line[] {
  if (values.length === 0) return []
  const { signature, consecutive, size } = shapeOf(values)
  const lines: Line[] = []
  if (size === 2 && signature === '2') lines.push('pair')
  if (size === 3 && signature === '3') lines.push('triple')
  if (size === 4 && signature === '4') lines.push('quad')
  if (size === 5 && signature === '5') lines.push('quint')
  if (size === 4 && signature === '22') lines.push('two-pair')
  if (size === 5 && signature === '32') lines.push('full-house')
  if (size === 6 && signature === '222') lines.push('three-pairs')
  if (size === 6 && signature === '33') lines.push('two-triples')
  if (consecutive && size === 3) lines.push('run-3')
  if (consecutive && size === 4) lines.push('run-4')
  if (consecutive && size === 5) lines.push('run-5')
  // art. 48: six in a row is the straight, and keeps its own tier.
  if (consecutive && size === 6) lines.push('straight')
  lines.push('any-dice')
  return LINES.filter((line) => lines.includes(line))
}

// ── The sum ────────────────────────────────────────────────────────────

/**
 * What one face is worth inside a claim. art. 65: a cursing intent counts a
 * value at nothing, and it does so *before* any talisman reads it — covet
 * beats the Ossuary. art. 53: value modifiers apply when summing.
 */
export function worth(
  value: Value,
  cursed: Value | null,
  talismans: readonly Talisman[],
): number {
  if (cursed !== null && value === cursed) return 0
  let worthSoFar: number = value
  for (const talisman of talismans) {
    if (talisman.species !== 'value' || talisman.value === undefined) continue
    if (talisman.value.of === value) worthSoFar *= talisman.value.times
  }
  return worthSoFar
}

/**
 * art. 52 (amended): a bond triggers when both dice are spent in the same
 * claim at equal value. The Sisters are canon — a ghost sister joins and the
 * pair scores at triple tier on the PAIR line. The ruling of 2026-08-04
 * binds it further: the bond fires only on the exact two-die pair claim,
 * never inside a composite, and the ghost is taxed by a curse like any face.
 */
export function bondIn(line: Line, dice: readonly Landed[]): BondId | null {
  if (line !== 'pair' || dice.length !== 2) return null
  const [one, other] = dice as readonly [Landed, Landed]
  if (one.face.value !== other.face.value) return null
  const bonds = dice.map((landed) => landed.bond)
  if (bonds[0] === undefined || bonds[0] !== bonds[1]) return null
  return bonds[0]
}

/** art. 53: ladder modifiers apply when tiering — one tier is one multiplier. */
export function tierFor(
  line: Line,
  ladder: Ladder,
  talismans: readonly Talisman[],
  bonded: boolean,
): Tier {
  const base = bonded ? ladder.triple : ladder[line]
  let multiplier = base.multiplier
  for (const talisman of talismans) {
    if (talisman.species !== 'ladder' || talisman.ladder === undefined) continue
    const reads = talisman.ladder.lines
    if (reads !== undefined && !reads.includes(line)) continue
    multiplier += talisman.ladder.tiers
  }
  return multiplier === base.multiplier ? base : { name: base.name, multiplier }
}

/**
 * art. 45: harm is sum × tier, and nothing else multiplies a single claim.
 * The shape triggers that read the whole turn come later (art. 53).
 */
export function harm(claim: Claim): number {
  return claim.sum * claim.tier.multiplier
}

/** One claim, assembled: the sum, the tier, and the bond if one joined. */
export function assemble(
  line: Line,
  dice: readonly Landed[],
  ladder: Ladder,
  cursed: Value | null,
  goods: Goods,
): Claim {
  const bond = bondIn(line, dice)
  let sum = 0
  for (const landed of dice) sum += worth(landed.face.value, cursed, goods.talismans)
  if (bond !== null) {
    // The ghost sister shows the same face, and is taxed by the same curse.
    sum += worth(dice[0]!.face.value, cursed, goods.talismans)
  }
  const tier = tierFor(line, ladder, goods.talismans, bond !== null)
  return bond === null ? { line, dice, sum, tier } : { line, dice, sum, tier, bond }
}

/** art. 65: which value this turn's intent counts at nothing, if any. */
export function cursedValue(intent: Intent): Value | null {
  const effect = intent.effect
  return effect !== undefined && effect.kind === 'curse' ? effect.value : null
}
