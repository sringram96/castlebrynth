/**
 * The balance report.
 *
 * `npm run balance`. Deterministic: same seeds in, same table out, so a tuning
 * change is a diff rather than an impression.
 *
 * The blueprint's gates are printed with the numbers, and each row says pass or
 * fail against them. Two things matter about how this is read:
 *
 *   1. The **naive** column is the one to balance against. A fight tuned for
 *      a solver is miserable for somebody who has not internalised the ladder,
 *      which is exactly the gap between a modelled 50-70% win band and a
 *      hands-on report of never winning once.
 *   2. **A green table is not a verdict.** Human completion of the deployed
 *      slice outranks simulation until onboarding is stable.
 */

import { fightIn, simulateFight, simulateRun } from './simulate.js'
import type { FightResult } from './simulate.js'
import type { Tier } from './policies.js'

const SEEDS = Array.from({ length: 400 }, (_, i) => (i + 1) * 2654435761)

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`
const median = (xs: readonly number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)

interface Gate {
  readonly label: string
  readonly value: number
  readonly low: number
  readonly high: number
  readonly show?: (n: number) => string
}

const gates: Gate[] = []
function gate(label: string, value: number, low: number, high: number, show = pct): number {
  gates.push({ label, value, low, high, show })
  return value
}

function fightStats(room: string, tier: Tier, loadout: Parameters<typeof fightIn>[2] = {}) {
  const results: FightResult[] = SEEDS.map((seed) => simulateFight(fightIn(room, seed, loadout), tier).result)
  return {
    win: results.filter((r) => r.won).length / results.length,
    turns: median(results.map((r) => r.turns)),
    dpt: mean(results.map((r) => r.damagePerTurn)),
    hpLeft: mean(results.filter((r) => r.won).map((r) => r.hp)),
    empty: results.reduce((n, r) => n + r.emptyTurns, 0),
    // Only meaningful against a thing that closes: how often it got to take a
    // step at all, and how often it finished the walk.
    moved: results.filter((r) => r.turns > 1).length / results.length,
    reached: results.filter((r) => !r.won).length / results.length,
  }
}

console.log(`\nCASTLEBRYNTH — balance, ${SEEDS.length} seeds per cell\n`)

// ── the fights, one at a time, at the loadout you reach them with ──────
const first = { naive: fightStats('hollow', 'naive'), heuristic: fightStats('hollow', 'heuristic') }
const second = {
  naive: fightStats('deep', 'naive', { dice: ['careful', 'plain', 'plain', 'plain', 'plain', 'plain'], relics: ['knuckle'] }),
  heuristic: fightStats('deep', 'heuristic', { dice: ['careful', 'plain', 'plain', 'plain', 'plain', 'plain'], relics: ['knuckle'] }),
}
const boss = {
  naive: fightStats('gate', 'naive', { dice: ['careful', 'leech', 'plain', 'plain', 'plain', 'plain'], relics: ['knuckle', 'plate'] }),
  heuristic: fightStats('gate', 'heuristic', { dice: ['careful', 'leech', 'plain', 'plain', 'plain', 'plain'], relics: ['knuckle', 'plate'] }),
}

console.log('fight            naive   heuristic   turns   dmg/turn (n/h)   hp left')
console.log('───────────────────────────────────────────────────────────────')
for (const [name, cell] of [
  ['the Gnawing', first],
  ['the Marrow', second],
  ['the Warden', boss],
] as const) {
  console.log(
    `${name.padEnd(16)} ${pct(cell.naive.win).padStart(6)}   ${pct(cell.heuristic.win).padStart(9)}` +
      `   ${String(cell.heuristic.turns).padStart(5)}   ${cell.naive.dpt.toFixed(0).padStart(6)}/${cell.heuristic.dpt.toFixed(0).padEnd(7)}` +
      `   ${cell.heuristic.hpLeft.toFixed(0).padStart(7)}`,
  )
}

// The blueprint's bands are per fight; these are the bands actually aimed at,
// and the difference is recorded in RESET_PROGRESS.md. In short: a single
// fight entered at full health cannot be made losable without an enemy that
// out-damages six dice, and a tutorial fight that kills one player in five
// contradicts the blueprint's own human target. So the *fights* are gated on
// being winnable and quick, and the *run* carries the risk — which is where
// "how far do I push" lives anyway.
gate('first fight — naive', first.naive.win, 0.9, 1)
gate('first fight — heuristic', first.heuristic.win, 0.95, 1)
gate('second fight — naive', second.naive.win, 0.85, 1)
gate('boss — naive, two rewards', boss.naive.win, 0.85, 1)
// The first fight is a count now, not a pool: three scores and it is on you.
// A median of 1 would mean nobody ever sees it move; anything over 3 would
// mean the ladder is not being enforced.
gate('median first fight turns', first.heuristic.turns, 2, 3, String)
gate('first fight — it is seen coming', first.naive.moved, 0.6, 1)
gate('first fight — it reaches somebody', first.naive.reached, 0.02, 0.25)
gate('median normal fight turns', second.heuristic.turns, 4, 7, String)
gate('median boss turns', boss.heuristic.turns, 4, 8, String)
gate('turns with no productive action', first.heuristic.empty + second.heuristic.empty + boss.heuristic.empty, 0, 0, String)

// ── whole runs, taking the harder branch ───────────────────────────────
const runs = {
  'naive/stair': SEEDS.map((s) => simulateRun(s, 'naive', { deep: false })),
  'naive/deep': SEEDS.map((s) => simulateRun(s, 'naive')),
  'heuristic/stair': SEEDS.map((s) => simulateRun(s, 'heuristic', { deep: false })),
  'heuristic/deep': SEEDS.map((s) => simulateRun(s, 'heuristic')),
}
console.log('\nwhole run — the stair is the safe way, the deep way is a fight more')
console.log('───────────────────────────────────────────────────────────────')
for (const tier of Object.keys(runs) as (keyof typeof runs)[]) {
  const all = runs[tier]
  const out = all.filter((r) => r.reachedExit)
  const died = new Map<string, number>()
  for (const r of all) if (r.diedIn) died.set(r.diedIn, (died.get(r.diedIn) ?? 0) + 1)
  const where = [...died.entries()].map(([room, n]) => `${room} ${pct(n / all.length)}`).join(', ')
  console.log(
    `${tier.padEnd(16)} out ${pct(out.length / all.length).padStart(4)}` +
      `   hp left ${mean(out.map((r) => r.hp)).toFixed(0).padStart(2)}` +
      `   died: ${where || 'never'}`,
  )
}
// ── how often the labyrinth actually gives you something ───────────────
//
// The pacing target of the polish sweep: a safe run usually finds nothing or
// one thing, a deep run one or two, and finding nothing at all stays possible.
// If either average creeps toward "every fight pays", the find has stopped
// being an event. This is a pacing guide, not a reason to invent loot.
console.log('\nupgrades before the boss — a find should be an event, not a step')
console.log('───────────────────────────────────────────────────────────────')
for (const tier of Object.keys(runs) as (keyof typeof runs)[]) {
  const all = runs[tier]
  const share = (n: number) => pct(all.filter((r) => r.upgrades === n).length / all.length)
  console.log(
    `${tier.padEnd(16)} average ${mean(all.map((r) => r.upgrades)).toFixed(2)}` +
      `   none ${share(0).padStart(4)}   one ${share(1).padStart(4)}   two ${share(2).padStart(4)}`,
  )
}
const upgrades = (key: keyof typeof runs) => mean(runs[key].map((r) => r.upgrades))
gate('upgrades — naive, the stair', upgrades('naive/stair'), 0.4, 0.9, (n) => n.toFixed(2))
gate('upgrades — naive, the deep way', upgrades('naive/deep'), 0.9, 1.6, (n) => n.toFixed(2))

const outRate = (key: keyof typeof runs) => runs[key].filter((r) => r.reachedExit).length / SEEDS.length
// Re-based for the same reason as the deep-way row below it, and it is worth
// stating plainly because it is a real change to the slice rather than a
// tuning drift:
//
//   the safe route is now, for a first-timer, almost entirely the first
//   fight.
//
// It used to be three fights of attrition with the boss finishing off anyone
// who arrived worn down. The Gnawing no longer wears anybody down — it costs
// nothing unless it costs everything — so a first-timer reaches the Warden at
// full health and beats it. This row therefore tracks *surviving the hollow*
// and little else, and the band says so.
//
// Whether the boss should be a real threat to a first-timer again is a
// product decision, not a tuning one. It would mean changing the Warden, and
// nothing in this wave was asked to.
gate('whole run — naive, the stair', outRate('naive/stair'), 0.85, 0.97)
// Re-based when the first fight stopped charging rent: the Gnawing used to
// take 18–24 HP off every run on the way past and the boss inherited it. It
// now costs nothing unless it costs everything, so a first-timer reaches the
// fork nearly whole. The gap between the two rows below is the fork's meaning
// and is the number to watch; the absolute rate is downstream of it.
gate('whole run — naive, the deep way', outRate('naive/deep'), 0.6, 0.85)
gate(
  'the fork still costs something',
  outRate('naive/stair') - outRate('naive/deep'),
  0.1,
  0.4,
)
gate('whole run — heuristic, the stair', outRate('heuristic/stair'), 0.9, 1)
gate('whole run — heuristic, the deep way', outRate('heuristic/deep'), 0.8, 1)

// ── the verdict ────────────────────────────────────────────────────────
console.log('\ngate                              value   want          ')
console.log('───────────────────────────────────────────────────────────────')
let failed = 0
for (const g of gates) {
  const show = g.show ?? pct
  const ok = g.value >= g.low && g.value <= g.high
  if (!ok) failed++
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${g.label.padEnd(30)} ${show(g.value).padStart(5)}   ${show(g.low)}–${show(g.high)}`,
  )
}
console.log(
  failed === 0
    ? '\nall gates green. This is not completion: humans on the deployed slice are.\n'
    : `\n${failed} gate(s) outside their band.\n`,
)
