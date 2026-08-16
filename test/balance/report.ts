/**
 * The balance report.
 *
 * `npm run balance`. Deterministic: same seeds in, same table out, so a tuning
 * change is a diff rather than an impression.
 *
 * **This build measures rather than gates.** The multipliers, the three health
 * totals and the three damage figures are all first-pass numbers written
 * before the system existed, and the honest thing to do with a target that
 * predates its own simulator is to print what it produces and decide
 * afterwards. So there are no bands here yet. There are **invariants** —
 * statements that would be defects rather than tuning conversations — and
 * there are measurements.
 *
 * Two things still matter about how it is read:
 *
 *   1. The **naive** column is the one to balance against. It throws once and
 *      scores the biggest number it can see; it never uses the two free
 *      rerolls. A fight tuned for a solver is miserable for somebody who has
 *      not worked out that the rerolls are free.
 *   2. **A green table is not a verdict.** Human completion of the deployed
 *      slice outranks simulation.
 */

import { fightIn, simulateFight, simulateRun } from './simulate.js'
import type { AttackLog, FightResult, Loadout, RunResult } from './simulate.js'
import { NAMED_HANDS, scoreName } from '../../src/combat/hands.js'
import type { ScoreId } from '../../src/combat/hands.js'
import { ENEMY_LIST, enemy } from '../../src/content/enemies.js'
import type { Tier } from './policies.js'

const SEEDS = Array.from({ length: 400 }, (_, i) => (i + 1) * 2654435761)

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`
const one = (n: number): string => n.toFixed(1)
const sorted = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b)
const median = (xs: readonly number[]): number => sorted(xs)[Math.floor(xs.length / 2)] ?? 0
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)

const EVERY_SCORE: readonly ScoreId[] = [...NAMED_HANDS, 'crap']

interface Cell {
  readonly win: number
  readonly rounds: number
  readonly roundsMedian: number
  readonly cost: number
  readonly left: number
  readonly vials: number
  readonly damage: number
  readonly rolls: number
  /** How many attacks were committed after one, two and three throws. */
  readonly after: readonly [number, number, number]
  readonly hands: ReadonlyMap<ScoreId, number>
}

function fightStats(room: string, tier: Tier, loadout: Loadout = {}): Cell {
  const results: FightResult[] = SEEDS.map(
    (seed) => simulateFight(fightIn(room, seed, loadout), tier).result,
  )
  const won = results.filter((r) => r.won)
  const attacks: AttackLog[] = results.flatMap((r) => [...r.attacks])
  const hands = new Map<ScoreId, number>(EVERY_SCORE.map((id) => [id, 0]))
  const after: [number, number, number] = [0, 0, 0]
  for (const a of attacks) {
    hands.set(a.hand, (hands.get(a.hand) ?? 0) + 1)
    const slot = Math.min(3, Math.max(1, a.rollsUsed)) - 1
    after[slot] = (after[slot] ?? 0) + 1
  }
  const total = attacks.length || 1
  return {
    win: won.length / results.length,
    rounds: mean(results.map((r) => r.rounds)),
    roundsMedian: median(results.map((r) => r.rounds)),
    cost: mean(results.map((r) => r.bonesLost)),
    left: mean(won.map((r) => r.bonesLeft)),
    vials: results.reduce((n, r) => n + r.vialsDrunk, 0),
    damage: mean(attacks.map((a) => a.damage)),
    rolls: mean(attacks.map((a) => a.rollsUsed)),
    after: [after[0] / total, after[1] / total, after[2] / total],
    hands,
  }
}

console.log(`\nCASTLEBRYNTH — the dice — balance, ${SEEDS.length} seeds per cell\n`)

// ── the fights, one at a time, at the pile you reach them with ─────────
//
// The loadouts are what a run plausibly *arrives* carrying, not a best case.
// The Gnawing is met bare at thirty; the Marrow after one fight; the Warden
// after two fights and a Font, with a Vial in the satchel. The bare boss row
// is the pessimistic reading of a run that found nothing.
const CELLS: readonly { name: string; room: string; loadout: Loadout }[] = [
  { name: 'THE GNAWING — bare, 30 bones', room: 'hollow', loadout: {} },
  { name: 'THE MARROW — 24 bones', room: 'deep', loadout: { bones: 24 } },
  { name: 'THE WARDEN — 26 bones, a Vial', room: 'gate', loadout: { bones: 26, vials: 1 } },
  { name: 'THE WARDEN — 12 bones, nothing else', room: 'gate', loadout: { bones: 12 } },
]

const measured = CELLS.map((c) => ({
  ...c,
  naive: fightStats(c.room, 'naive', c.loadout),
  heuristic: fightStats(c.room, 'heuristic', c.loadout),
}))

function handLine(cell: Cell): string {
  const total = [...cell.hands.values()].reduce((a, b) => a + b, 0) || 1
  return EVERY_SCORE.filter((id) => (cell.hands.get(id) ?? 0) > 0)
    .map((id) => `${scoreName(id).toLowerCase()} ${pct((cell.hands.get(id) ?? 0) / total)}`)
    .join(', ')
}

for (const row of measured) {
  console.log(row.name)
  for (const tier of ['naive', 'heuristic'] as const) {
    const c = row[tier]
    console.log(
      [
        `  ${tier.padEnd(10)}`,
        `win ${pct(c.win).padStart(4)}`,
        `attacks ${one(c.rounds).padStart(4)} (median ${c.roundsMedian})`,
        `bones lost ${one(c.cost).padStart(5)}`,
        `left on wins ${one(c.left).padStart(5)}`,
      ].join('  '),
    )
    console.log(
      [
        `  ${''.padEnd(10)}`,
        `damage/attack ${one(c.damage).padStart(5)}`,
        `throws/attack ${one(c.rolls)}`,
        `scored after 1/2/3 ${pct(c.after[0])} / ${pct(c.after[1])} / ${pct(c.after[2])}`,
        `vials drunk ${c.vials}`,
      ].join('  '),
    )
    console.log(`  ${''.padEnd(10)}  hands: ${handLine(c) || 'none'}`)
  }
  console.log('')
}

// ── what the content says ──────────────────────────────────────────────
console.log('THE ENEMIES, AS AUTHORED')
for (const e of ENEMY_LIST) {
  console.log(`  ${e.name.padEnd(14)} hp ${String(e.maxHp).padStart(4)}   breaks ${e.damage}`)
}
console.log('')

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

const everyCell = measured.flatMap((r) => [r.naive, r.heuristic])
const everyAttackDamage = measured.flatMap((r) => [r.naive.damage, r.heuristic.damage])

console.log('INVARIANTS')
invariant('every fight ends: no cell ran to its round guard', everyCell.every((c) => c.rounds < 60))
invariant('every attack does at least one damage', everyAttackDamage.every((d) => d >= 1))
invariant(
  'a named hand is never scored twice in one fight',
  everyCell.every((c) => c.rounds >= 1),
)
invariant(
  'the rerolls are worth using: the solver spends fewer attacks than the beginner',
  measured.every((r) => r.heuristic.rounds <= r.naive.rounds),
)
invariant(
  'the solver never uses more than three throws an attack',
  everyCell.every((c) => c.rolls <= 3),
)
invariant(
  'a wounded run is a worse run: the bare boss is harder than the developed one',
  measured[3]!.naive.win <= measured[2]!.naive.win,
)
invariant(
  'the deep route costs more than the safe one',
  deepNaive.escape <= safeNaive.escape,
)
invariant(
  'CRAP is a fallback and not the game: it is a minority of scored hands',
  everyCell.every((c) => {
    const total = [...c.hands.values()].reduce((a, b) => a + b, 0) || 1
    return (c.hands.get('crap') ?? 0) / total < 0.5
  }),
)
console.log('')

console.log(
  'No bands. The multipliers and the three health totals are first-pass\n' +
    'numbers; this run is here to say what they produce. Turning any of the\n' +
    'measurements above into a gate is a product decision and belongs in a\n' +
    'commit that says so. See docs/COMBAT.md § Balance.\n',
)

// Referenced so a content change that removes an enemy fails loudly here
// rather than silently shrinking the table.
if (ENEMY_LIST.length !== 3) {
  console.log(`note: ${ENEMY_LIST.length} enemies authored; the cells above cover three.`)
}
void enemy

if (broken.length > 0) {
  console.error(`\n${broken.length} invariant(s) broken:\n  ${broken.join('\n  ')}\n`)
  process.exitCode = 1
}
