/**
 * The balance report.
 *
 * `npm run balance`. Deterministic: same seeds in, same table out, so a tuning
 * change is a diff rather than an impression.
 *
 * Three things matter about how this is read:
 *
 *   1. The **naive** column is the one to balance against. A fight tuned for a
 *      solver is miserable for somebody who has not internalised the rules,
 *      which is exactly the gap between a modelled 50–70% win band and a
 *      hands-on report of never winning once.
 *   2. **A green table is not a verdict.** Human completion of the deployed
 *      slice outranks simulation.
 *   3. The bands below are **provisional**. They were written before this
 *      implementation existed, and the honest thing to do with a target that
 *      predates its own simulator is to measure first and ratify second. Every
 *      row prints its distribution, and a row outside its band prints WATCH
 *      rather than failing the build — see the note at the foot of the table.
 *      Ratifying a band into a hard gate is a product decision and belongs in
 *      a commit that says so.
 */

import { fightIn, simulateFight, simulateRun } from './simulate.js'
import type { FightResult, Loadout, RunResult } from './simulate.js'
import type { Tier } from './policies.js'

const SEEDS = Array.from({ length: 400 }, (_, i) => (i + 1) * 2654435761)

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`
const one = (n: number): string => n.toFixed(1)
const sorted = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b)
const median = (xs: readonly number[]): number => sorted(xs)[Math.floor(xs.length / 2)] ?? 0
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)
const quantile = (xs: readonly number[], q: number): number =>
  sorted(xs)[Math.min(xs.length - 1, Math.max(0, Math.floor(xs.length * q)))] ?? 0

interface Band {
  readonly label: string
  readonly value: number
  readonly low: number
  readonly high: number
  readonly show: (n: number) => string
}

const bands: Band[] = []
function band(label: string, value: number, low: number, high: number, show = pct): number {
  bands.push({ label, value, low, high, show })
  return value
}

interface Cell {
  readonly win: number
  readonly rounds: number
  readonly cost: number
  readonly costP10: number
  readonly costP90: number
  readonly left: number
  readonly specials: number
  readonly charms: number
  readonly vials: number
}

function fightStats(room: string, tier: Tier, loadout: Loadout = {}): Cell {
  const results: FightResult[] = SEEDS.map(
    (seed) => simulateFight(fightIn(room, seed, loadout), tier).result,
  )
  const won = results.filter((r) => r.won)
  const costs = won.map((r) => r.bonesLost)
  return {
    win: won.length / results.length,
    rounds: median(results.map((r) => r.rounds)),
    cost: mean(costs),
    costP10: quantile(costs, 0.1),
    costP90: quantile(costs, 0.9),
    left: mean(won.map((r) => r.bonesLeft)),
    specials: results.reduce((n, r) => n + r.specialsLost.length, 0),
    charms: results.reduce((n, r) => n + r.charmsSpent, 0),
    vials: results.reduce((n, r) => n + r.vialsDrunk, 0),
  }
}

console.log(`\nCASTLEBRYNTH — THE WAR OF BONES — balance, ${SEEDS.length} seeds per cell\n`)

// ── the fights, one at a time, at the pile you reach them with ─────────
//
// The loadouts are what a run plausibly *arrives* carrying, not a best case.
// The Gnawing is met bare at thirty; the Marrow is met after one fight, so a
// few bones short; the Warden is met after two fights and a Font, with a
// couple of finds in the pile.
const first = {
  naive: fightStats('hollow', 'naive'),
  heuristic: fightStats('hollow', 'heuristic'),
}
const secondBare = {
  naive: fightStats('deep', 'naive', { bones: 24 }),
  heuristic: fightStats('deep', 'heuristic', { bones: 24 }),
}
const secondArmed = {
  naive: fightStats('deep', 'naive', { bones: 24, specials: ['knuckle'] }),
  heuristic: fightStats('deep', 'heuristic', { bones: 24, specials: ['knuckle'] }),
}
const boss = {
  naive: fightStats('gate', 'naive', {
    bones: 26,
    specials: ['knuckle', 'cinderbone'],
    charms: 1,
    vials: 1,
  }),
  heuristic: fightStats('gate', 'heuristic', {
    bones: 26,
    specials: ['knuckle', 'cinderbone'],
    charms: 1,
    vials: 1,
  }),
}
const bossBare = {
  naive: fightStats('gate', 'naive', { bones: 12 }),
  heuristic: fightStats('gate', 'heuristic', { bones: 12 }),
}

function fightRow(name: string, cell: { naive: Cell; heuristic: Cell }): void {
  const row = (tier: 'naive' | 'heuristic', c: Cell): string =>
    [
      `  ${tier.padEnd(10)}`,
      `win ${pct(c.win).padStart(4)}`,
      `rounds ${String(c.rounds).padStart(2)}`,
      `cost ${one(c.cost).padStart(5)} bones  (p10 ${c.costP10}, p90 ${c.costP90})`,
      `left ${one(c.left).padStart(5)}`,
      `named lost ${String(c.specials).padStart(3)}`,
    ].join('  ')
  console.log(name)
  console.log(row('naive', cell.naive))
  console.log(row('heuristic', cell.heuristic))
  console.log('')
}

fightRow('THE GNAWING — bare, 30 bones', first)
fightRow('THE MARROW — 24 bones, nothing named', secondBare)
fightRow('THE MARROW — 24 bones and a Knuckle', secondArmed)
fightRow('THE WARDEN — 26 bones, two named, a Charm, a Vial', boss)
fightRow('THE WARDEN — 12 bones, nothing else', bossBare)

// ── the provisional bands ──────────────────────────────────────────────
band('Gnawing — rounds to finish (naive)', first.naive.rounds, 2, 4, (n) => String(n))
band('Gnawing — bones spent (naive)', first.naive.cost, 4, 7, one)
band('Marrow bare — bones spent (naive)', secondBare.naive.cost, 7, 11, one)
band('Marrow armed — bones spent (naive)', secondArmed.naive.cost, 5, 9, one)
band('Warden developed — win (naive)', boss.naive.win, 0.45, 0.6)
band('Warden developed — bones spent on wins', boss.naive.cost, 12, 18, one)
band('Warden bare — win (naive)', bossBare.naive.win, 0, 0.25)

// ── whole runs ─────────────────────────────────────────────────────────
function runStats(tier: Tier, deep: boolean): {
  escape: number
  bones: number
  found: number
  died: Map<string, number>
} {
  const results: RunResult[] = SEEDS.map((seed) => simulateRun(seed, tier, { deep }))
  const died = new Map<string, number>()
  for (const r of results) {
    if (r.diedIn) died.set(r.diedIn, (died.get(r.diedIn) ?? 0) + 1)
  }
  return {
    escape: results.filter((r) => r.reachedExit).length / results.length,
    bones: mean(results.filter((r) => r.reachedExit).map((r) => r.bonesLeft)),
    found: mean(results.map((r) => r.found)),
    died,
  }
}

const safeNaive = runStats('naive', false)
const safeSolver = runStats('heuristic', false)
const deepNaive = runStats('naive', true)
const deepSolver = runStats('heuristic', true)

console.log('WHOLE RUNS')
for (const [name, s] of [
  ['safe · naive', safeNaive],
  ['safe · heuristic', safeSolver],
  ['deep · naive', deepNaive],
  ['deep · heuristic', deepSolver],
] as const) {
  const graves = [...s.died]
    .sort((a, b) => b[1] - a[1])
    .map(([roomId, n]) => `${roomId} ${pct(n / SEEDS.length)}`)
    .join(', ')
  console.log(
    `  ${name.padEnd(18)} out ${pct(s.escape).padStart(4)}  ` +
      `bones left ${one(s.bones).padStart(5)}  found ${one(s.found)}  ` +
      `died: ${graves || 'never'}`,
  )
}
console.log('')

band('safe route — escape (naive)', safeNaive.escape, 0.35, 0.75)
band('deep route — escape (naive)', deepNaive.escape, 0.2, 0.6)
band('a solver does better than a beginner', safeSolver.escape - safeNaive.escape, 0, 1, pct)

// ── the invariants ─────────────────────────────────────────────────────
//
// These are not provisional. They are the locked laws of the system read back
// out of four hundred simulated runs, and a failure here is a defect rather
// than a tuning conversation. They exit non-zero.
const broken: string[] = []

function invariant(label: string, ok: boolean): void {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`)
  if (!ok) broken.push(label)
}

console.log('INVARIANTS')
invariant(
  'every fight ends: no cell ran to its round guard',
  [first, secondBare, secondArmed, boss, bossBare].every(
    (c) => c.naive.rounds < 40 && c.heuristic.rounds < 40,
  ),
)
invariant(
  'the first fight is winnable bare, nearly always',
  first.naive.win >= 0.9,
)
invariant(
  'a developed run beats the boss more often than a bare one',
  boss.naive.win > bossBare.naive.win,
)
invariant(
  'reading the line is worth something: the solver spends fewer bones',
  boss.heuristic.cost <= boss.naive.cost,
)
invariant(
  'the boss is the hardest fight in the slice',
  boss.naive.win < first.naive.win && boss.naive.win < secondArmed.naive.win,
)
invariant(
  'the deep route costs more than the safe one',
  deepNaive.escape <= safeNaive.escape,
)
console.log('')

// ── the table ──────────────────────────────────────────────────────────
console.log('PROVISIONAL BANDS  (WATCH is a conversation, not a failure)')
let watching = 0
for (const g of bands) {
  const inside = g.value >= g.low && g.value <= g.high
  if (!inside) watching++
  console.log(
    `  ${inside ? 'in  ' : 'WATCH'}  ${g.label.padEnd(42)} ` +
      `${g.show(g.value).padStart(7)}   want ${g.show(g.low)}–${g.show(g.high)}`,
  )
}
console.log('')

if (watching > 0) {
  console.log(
    `${watching} band${watching === 1 ? '' : 's'} outside its provisional range.\n` +
      'These numbers were written before the simulator existed. Either the\n' +
      'content moves or the band does — and whichever it is, it belongs in a\n' +
      'commit that says which and why. See docs/COMBAT.md § Balance.\n',
  )
}

if (broken.length > 0) {
  console.error(`\n${broken.length} invariant(s) broken:\n  ${broken.join('\n  ')}\n`)
  process.exitCode = 1
}
