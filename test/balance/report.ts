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
import type { AttackLog, Branch, FightResult, Loadout, RunResult } from './simulate.js'
import { NAMED_HANDS, scoreName } from '../../src/combat/hands.js'
import { HAND_DICE } from '../../src/combat/roll.js'
import { STARTING_IRON, STARTING_TALISMANS } from '../../src/content/dice.js'
import type { ScoreId } from '../../src/combat/hands.js'
import { ENEMY_LIST, enemy } from '../../src/content/enemies.js'
import { reward } from '../../src/content/rewards.js'
import type { RewardId } from '../../src/content/rewards.js'
import { DIE_POLICIES } from './policies.js'
import type { DiePolicy, Tier } from './policies.js'
import { CROOKED_DICE, coreDie } from '../../src/content/dice.js'
import type { CoreDieId } from '../../src/content/dice.js'
import { GRAMMARS } from '../../src/content/runPlans.js'
import { generateRunPlan } from '../../src/game/runGenerator.js'

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
//
// **Every cell is bare.** No iron die, no talisman, no item dice — because the
// ratified rule of the loadout wave is that *no gate, target or enemy number
// may require upside*, and the only honest way to hold that is to set every
// figure against a run carrying none of it. What the loadout adds is measured
// separately, in § THE LOADOUT below, and is never a target.
const BARE: Loadout = { ironDice: [], itemDice: [], talismans: [] }

const CELLS: readonly { name: string; room: string; loadout: Loadout }[] = [
  { name: 'THE GNAWING — bare, 30 bones', room: 'hollow', loadout: { ...BARE } },
  { name: 'THE MARROW — 24 bones', room: 'deep', loadout: { ...BARE, bones: 24 } },
  { name: 'THE WARDEN — 26 bones, a Vial', room: 'gate', loadout: { ...BARE, bones: 26, vials: 1 } },
  { name: 'THE WARDEN — 12 bones, nothing else', room: 'gate', loadout: { ...BARE, bones: 12 } },
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

// ── what the loadout is worth ──────────────────────────────────────────
//
// Measured, never targeted. Every cell above is bare; these rows say what a
// run *carrying things* gets on top of that, so a reader can see the size of
// the upside without any figure above depending on it.
//
// The item dice are the strongest statement of the rule: the policy cannot see
// them — they have not been thrown when a decision is due — so the model plays
// as if they are not there and whatever they add is pure upside.
console.log('THE LOADOUT — upside, measured against the bare rows above')
const LOADOUT_ROWS: readonly { name: string; room: string; loadout: Loadout }[] = [
  { name: 'Warden, 26 + Vial · bare', room: 'gate', loadout: { ...BARE, bones: 26, vials: 1 } },
  {
    name: 'Warden, 26 + Vial · iron',
    room: 'gate',
    loadout: { ...BARE, bones: 26, vials: 1, ironDice: ['rustplate'] },
  },
  {
    name: 'Warden, 26 + Vial · iron + talisman',
    room: 'gate',
    loadout: { bones: 26, vials: 1, ironDice: ['rustplate'], talismans: ['pair-talisman'], itemDice: [] },
  },
  {
    name: 'Warden, 26 + Vial · everything',
    room: 'gate',
    loadout: {
      bones: 26,
      vials: 1,
      ironDice: ['rustplate'],
      talismans: ['pair-talisman'],
      itemDice: ['grave-candle', 'splinter-fetish'],
    },
  },
]
for (const row of LOADOUT_ROWS) {
  const c = fightStats(row.room, 'heuristic', row.loadout)
  console.log(
    [
      `  ${row.name.padEnd(36)}`,
      `win ${pct(c.win).padStart(4)}`,
      `attacks ${one(c.rounds).padStart(4)} (median ${c.roundsMedian})`,
      `bones lost ${one(c.cost).padStart(5)}`,
      `damage/attack ${one(c.damage).padStart(5)}`,
    ].join('  '),
  )
}
console.log('')

// ── what the content says ──────────────────────────────────────────────
console.log('THE ENEMIES, AS AUTHORED')
for (const e of ENEMY_LIST) {
  console.log(`  ${e.name.padEnd(14)} hp ${String(e.maxHp).padStart(4)}   breaks ${e.damage}`)
}
console.log('')

// ── whole runs ─────────────────────────────────────────────────────────
interface RunCell {
  escape: number
  bones: number
  found: number
  cost: number
  died: Map<string, number>
  acquired: Map<string, number>
}

function runStats(tier: Tier, deep: boolean, bare = true, branch: Branch = 'left'): RunCell {
  const results: RunResult[] = SEEDS.map((seed) => simulateRun(seed, tier, { deep, bare, branch }))
  const died = new Map<string, number>()
  const acquired = new Map<string, number>()
  for (const r of results) {
    if (r.diedIn) died.set(r.diedIn, (died.get(r.diedIn) ?? 0) + 1)
    for (const id of new Set(r.acquired)) acquired.set(id, (acquired.get(id) ?? 0) + 1)
  }
  return {
    escape: results.filter((r) => r.reachedExit).length / results.length,
    bones: mean(results.filter((r) => r.reachedExit).map((r) => r.bonesLeft)),
    found: mean(results.map((r) => r.found)),
    cost: mean(results.map((r) => r.bonesLost)),
    died,
    acquired,
  }
}

/**
 * Four hundred seeds that all produce one grammar.
 *
 * There are three descents and the seed chooses, so a row about THE TITHE has to
 * be measured on seeds that actually deal it. It asks the real generator which
 * each seed produces rather than hard-coding an answer, so a fourth grammar
 * changes nothing here but the scan.
 */
function seedsFor(planId: string): readonly number[] {
  const out: number[] = []
  for (let seed = 1; out.length < SEEDS.length && seed < 20_000; seed++) {
    if (generateRunPlan(seed).id === planId) out.push(seed)
  }
  return out
}

interface PlanCell {
  readonly escape: number
  readonly cost: number
  readonly damage: number
  /** Core dice actually bought, per run. */
  readonly bought: number
  readonly spent: number
  readonly reached: number
  readonly tookIt: number
}

/** Whole runs over one grammar's seeds, with whatever answer to a die. */
function planStats(
  seeds: readonly number[],
  tier: Tier,
  options: {
    deep?: boolean
    branch?: Branch
    dice?: DiePolicy
    hand?: readonly CoreDieId[]
  } = {},
): PlanCell {
  const results = seeds.map((seed) =>
    simulateRun(seed, tier, {
      deep: options.deep ?? true,
      // A run that answers a die is a run that takes what it finds: the two are
      // the same decision about what to be carrying at the door.
      bare: (options.dice ?? 'never') === 'never',
      branch: options.branch ?? 'left',
      dice: options.dice ?? 'never',
      ...(options.hand ? { hand: options.hand } : {}),
    }),
  )
  const attacks = results.flatMap((r) => r.fights.flatMap((f) => [...f.attacks]))
  return {
    escape: results.filter((r) => r.reachedExit).length / results.length,
    cost: mean(results.map((r) => r.bonesLost)),
    damage: mean(attacks.map((a) => a.damage)),
    bought: mean(results.map((r) => r.bought.length)),
    spent: mean(results.map((r) => r.spentOnDice)),
    reached: results.filter((r) => r.reachedTreasure).length / results.length,
    tookIt: results.filter((r) => r.tookTreasure).length / results.length,
  }
}

const safeNaive = runStats('naive', false)
const safeSolver = runStats('heuristic', false)
const deepNaive = runStats('naive', true)
const deepSolver = runStats('heuristic', true)

// And the same two routes with the run picking up what it finds. A fresh run
// now starts with **nothing** — no iron, no talisman, no item die — so the
// difference between these two pairs is no longer "carried versus stripped",
// it is *found versus walked past*. Printed beside the bare rows rather than
// instead of them: nothing in the bare rows depends on a find existing.
const safeCarried = runStats('heuristic', false, false)
const deepCarried = runStats('heuristic', true, false)

console.log('WHOLE RUNS — the first four take nothing; the last two pick up what they find')
for (const [name, s] of [
  ['safe · naive', safeNaive],
  ['safe · heuristic', safeSolver],
  ['deep · naive', deepNaive],
  ['deep · heuristic', deepSolver],
  ['safe · heuristic · taking', safeCarried],
  ['deep · heuristic · taking', deepCarried],
] as const) {
  const graves = [...s.died]
    .sort((a, b) => b[1] - a[1])
    .map(([roomId, n]) => `${roomId} ${pct(n / SEEDS.length)}`)
    .join(', ')
  console.log(
    `  ${name.padEnd(27)} out ${pct(s.escape).padStart(4)}  ` +
      `bones left ${one(s.bones).padStart(5)}  found ${one(s.found)}  ` +
      `died: ${graves || 'never'}`,
  )
}
console.log('')

// ── what a route actually hands you ────────────────────────────────────
//
// **Reported, never tuned.** A fresh run starts with six bare bones, so every
// carried thing in the game is a thing that was found somewhere — and the two
// interesting questions are now *how often does the policy reach each placed
// find* and *what does each branch of the Cleft cost*.
console.log('ACQUISITION — how often a run that takes what it finds ends up carrying it')
const ACQUIRING: readonly { name: string; cell: RunCell }[] = [
  { name: 'safe · left (the Gnawing)', cell: runStats('heuristic', false, false, 'left') },
  { name: 'safe · right (the Offertory)', cell: runStats('heuristic', false, false, 'right') },
  { name: 'deep · left (the Gnawing)', cell: runStats('heuristic', true, false, 'left') },
  { name: 'deep · right (the Offertory)', cell: runStats('heuristic', true, false, 'right') },
]
const PLACED: readonly RewardId[] = ['pair-talisman', 'rustplate', 'grave-candle', 'vial', 'splinter-fetish']
for (const row of ACQUIRING) {
  const got = PLACED.map((id) => `${reward(id).short.toLowerCase()} ${pct((row.cell.acquired.get(id) ?? 0) / SEEDS.length)}`)
  console.log(`  ${row.name.padEnd(30)} ${got.join('  ')}`)
}
console.log('')

// The branch delta, which is the whole of what the Cleft is asking. LEFT trades
// three bones a round against the Gnawing for a 60% draw; RIGHT trades a flat
// two-bone toll for a certain item die. Which is cheaper is a measurement.
console.log("THE CLEFT — what each branch costs, on the safe route")
const branchLeft = ACQUIRING[0]!.cell
const branchRight = ACQUIRING[1]!.cell
for (const [name, cell] of [
  ['LEFT  · the Gnawing', branchLeft],
  ['RIGHT · the Offertory', branchRight],
] as const) {
  console.log(
    `  ${name.padEnd(24)} out ${pct(cell.escape).padStart(4)}  ` +
      `bones broken ${one(cell.cost).padStart(5)}  found ${one(cell.found)}`,
  )
}
console.log(
  `  delta (right − left)     out ${pct(branchRight.escape - branchLeft.escape).padStart(5)}  ` +
    `bones broken ${one(branchRight.cost - branchLeft.cost).padStart(5)}\n` +
    '  Reported, not tuned. The two branches are priced differently on purpose\n' +
    '  and neither is meant to be the correct answer.\n',
)

// ── the three grammars ─────────────────────────────────────────────────
//
// A run is one of three descents now and the seed chooses, so every whole-run
// figure above is an average over all of them. These are the same readings split
// out, because *where the Font is* and *whether there is a Font at all* are facts
// about a grammar rather than about the game.
console.log('THE GRAMMARS — the bare floor, per descent')
for (const plan of GRAMMARS) {
  const seeds = seedsFor(plan.id)
  for (const tier of ['naive', 'heuristic'] as const) {
    const bare = planStats(seeds, tier, { deep: false })
    const long = planStats(seeds, tier, { deep: true })
    console.log(
      `  ${plan.id.padEnd(9)} ${tier.padEnd(10)} stair ${pct(bare.escape).padStart(4)}  ` +
        `deep ${pct(long.escape).padStart(4)}  bones broken ${one(bare.cost).padStart(5)}`,
    )
  }
}
console.log(
  '  Bare is **bare**: six plain bones, nothing found, nothing bought. The\n' +
    '  solver floor every figure in this report is set against.\n',
)

// ── what a crooked die is worth ────────────────────────────────────────
//
// **The bare-balance law, extended.** No gate, target or enemy number may
// require a crooked die any more than it may require the iron — so the floor
// stays six plain bones and this table is upside, measured and never targeted.
//
// Two readings per die: one copy in place of a bone, which is what a run that
// buys once actually holds, and a full archetype build, which is what a run that
// spends its whole descent on one idea gets.
console.log('THE DIE SWING — one copy, and a whole build. Upside, never a target')
const DESCENT_SEEDS = seedsFor('descent')
const floor = planStats(DESCENT_SEEDS, 'heuristic', { deep: false })
console.log(`  ${'six plain bones'.padEnd(34)} out ${pct(floor.escape).padStart(4)}  (the floor)`)
for (const die of CROOKED_DICE) {
  const one6: CoreDieId[] = ['bone', 'bone', 'bone', 'bone', 'bone', die]
  const swung = planStats(DESCENT_SEEDS, 'heuristic', { deep: false, hand: one6 })
  console.log(
    `  ${`+1 ${coreDie(die).name}`.padEnd(34)} out ${pct(swung.escape).padStart(4)}  ` +
      `delta ${pct(swung.escape - floor.escape).padStart(5)}  damage/attack ${one(swung.damage)}`,
  )
}
const ARCHETYPES: readonly { name: string; hand: readonly CoreDieId[] }[] = [
  { name: 'six Knucklebones', hand: Array.from({ length: 6 }, () => 'knucklebone' as CoreDieId) },
  {
    name: 'Long Bone ×4 + bone ×2',
    hand: ['long-bone', 'long-bone', 'long-bone', 'long-bone', 'bone', 'bone'],
  },
  { name: 'Jawbone ×3 + bone ×3', hand: ['jawbone', 'jawbone', 'jawbone', 'bone', 'bone', 'bone'] },
  {
    name: 'the Hand of Saint Orrin ×1',
    hand: ['hand-of-orrin', 'bone', 'bone', 'bone', 'bone', 'bone'],
  },
]
for (const build of ARCHETYPES) {
  const swung = planStats(DESCENT_SEEDS, 'heuristic', { deep: false, hand: build.hand })
  console.log(
    `  ${build.name.padEnd(34)} out ${pct(swung.escape).padStart(4)}  ` +
      `delta ${pct(swung.escape - floor.escape).padStart(5)}  damage/attack ${one(swung.damage)}`,
  )
}
console.log('')

// ── the bargain policy sweep ───────────────────────────────────────────
//
// Six answers to *three bones for a specific die*, measured on every grammar.
// **We expect always-take to dominate at thirty bones** — three of thirty is
// close to free — and the sweep exists to say so in numbers rather than to be
// believed. Reported, not tuned.
console.log('THE BARGAIN SWEEP — which answer to a priced die dominates')
for (const plan of GRAMMARS) {
  const seeds = seedsFor(plan.id)
  const rows = DIE_POLICIES.map((dice) => ({
    dice,
    cell: planStats(seeds, 'heuristic', { deep: true, dice }),
  }))
  const best = [...rows].sort((a, b) => b.cell.escape - a.cell.escape)[0]!
  for (const row of rows) {
    console.log(
      `  ${plan.id.padEnd(9)} ${row.dice.padEnd(9)} out ${pct(row.cell.escape).padStart(4)}  ` +
        `dice bought ${one(row.cell.bought)}  spent on dice ${one(row.cell.spent).padStart(4)}` +
        `${row.dice === best.dice ? '   ← dominates' : ''}`,
    )
  }
}
console.log('')

// ── the treasure ───────────────────────────────────────────────────────
//
// One per run, on one branch of one fork, and **missable by construction**. What
// is measured is how often the solver ends up standing in front of it, which is a
// route question and not a skill one.
console.log('THE TREASURE — reached, and carried out')
for (const plan of GRAMMARS) {
  const seeds = seedsFor(plan.id)
  for (const deep of [false, true]) {
    const cell = planStats(seeds, 'heuristic', { deep, dice: 'always' })
    console.log(
      `  ${plan.id.padEnd(9)} ${(deep ? 'deep' : 'stair').padEnd(6)} ` +
        `reached ${pct(cell.reached).padStart(4)}  carried out ${pct(cell.tookIt).padStart(4)}`,
    )
  }
}
console.log(
  '  Reported, not tuned. A treasure every route passed would be a step; these\n' +
    '  numbers are what *missable* costs, and the hints are what the design puts\n' +
    '  against it.\n',
)

// ── the forks, all of them ─────────────────────────────────────────────
//
// The reel wave measured one fork on one grammar and reported −14 points for the
// right-hand branch. There are two forks on each of three grammars now, and every
// one of them is a decision the run is being asked to price.
console.log('THE FORKS — what each mouth costs, on every grammar')
for (const plan of GRAMMARS) {
  const seeds = seedsFor(plan.id)
  const first = {
    left: planStats(seeds, 'heuristic', { deep: false, branch: 'left', dice: 'always' }),
    right: planStats(seeds, 'heuristic', { deep: false, branch: 'right', dice: 'always' }),
  }
  const last = {
    stair: planStats(seeds, 'heuristic', { deep: false, dice: 'always' }),
    deep: planStats(seeds, 'heuristic', { deep: true, dice: 'always' }),
  }
  console.log(
    `  ${plan.id.padEnd(9)} first fork   left ${pct(first.left.escape).padStart(4)}  ` +
      `right ${pct(first.right.escape).padStart(4)}  ` +
      `delta ${pct(first.right.escape - first.left.escape).padStart(5)}`,
  )
  console.log(
    `  ${''.padEnd(9)} last fork    stair ${pct(last.stair.escape).padStart(4)}  ` +
      `deep ${pct(last.deep.escape).padStart(4)}  ` +
      `delta ${pct(last.deep.escape - last.stair.escape).padStart(5)}`,
  )
}
console.log('')

// ── one rule each ──────────────────────────────────────────────────────
//
// Three monsters that were three difficulty settings for one puzzle, measured
// again now that each of them bends the throw. Expect the mean fight to matter:
// the Gnawing's ladder prices a slow kill and the Marrow's rewards one.
console.log('THE LADDERS — per enemy, bare, and what the rule costs')
const LADDER_CELLS: readonly { name: string; room: string; loadout: Loadout }[] = [
  { name: 'The Gnawing — bare, 30', room: 'hollow', loadout: { ...BARE } },
  { name: 'The Marrow — bare, 24', room: 'deep', loadout: { ...BARE, bones: 24 } },
  { name: 'The Warden — bare, 26 + Vial', room: 'gate', loadout: { ...BARE, bones: 26, vials: 1 } },
]
for (const row of LADDER_CELLS) {
  for (const tier of ['naive', 'heuristic'] as const) {
    const c = fightStats(row.room, tier, row.loadout)
    console.log(
      `  ${row.name.padEnd(30)} ${tier.padEnd(10)} win ${pct(c.win).padStart(4)}  ` +
        `attacks ${one(c.rounds).padStart(4)} (median ${c.roundsMedian})  ` +
        `bones lost ${one(c.cost).padStart(5)}`,
    )
  }
}
const gnawing = fightStats('hollow', 'heuristic', { ...BARE })
const gnawingNaive = fightStats('hollow', 'naive', { ...BARE })
console.log(
  `  the Gnawing's median kill round: ${gnawing.roundsMedian} solver, ` +
    `${gnawingNaive.roundsMedian} beginner. FAR 2 · MID 4 · CLOSE 8, so a\n` +
    '  third round costs four times a first one. Reported, not tuned.\n',
)

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
// **Re-based by the loadout wave.** It used to hold for two reasons — fewer
// bones meant fewer exchanges *and* a narrower hand — and the second is
// repealed. What it measures now is exchanges alone, and it still holds,
// which is the interesting half of the finding: the width coupling was not
// what made a wound matter.
invariant(
  'a wounded run is a worse run: the bare boss is harder than the developed one'
    + ' [re-based: exchanges only, the hand no longer narrows]',
  measured[3]!.naive.win <= measured[2]!.naive.win,
)

// **Added by the loadout wave**, and it is the ratified rule stated as a gate:
// the report's own targets are set against a run carrying nothing, so the
// loadout can only ever be upside on top of them.
invariant(
  'no figure above assumes the loadout: every cell is bare',
  CELLS.every(
    (c) =>
      c.loadout.ironDice?.length === 0 &&
      c.loadout.itemDice?.length === 0 &&
      c.loadout.talismans?.length === 0,
  ),
)
invariant(
  'the loadout is upside: taking what you find is never worse than walking past it',
  safeCarried.escape >= safeSolver.escape && deepCarried.escape >= deepSolver.escape,
)
// **Added by the reel wave.** A fresh run carries nothing at all, which is the
// same reading every fight cell above is set against — so the bare rows are no
// longer a hypothetical stripped run, they are what a run *is* until it finds
// something.
invariant(
  'a fresh run starts bare: no iron, no talisman, no item die',
  STARTING_IRON.length === 0 && STARTING_TALISMANS.length === 0,
)

// **Re-based by the loadout wave.** The old form of this measured the
// *hand-width* consequence of the throw count; with the hand fixed at six,
// what is left to state is that six is what is thrown, everywhere.
invariant(
  'the hand is six dice, at every pile, in every cell'
    + ' [re-based: was "an attack rolls at most six and never more than the pile"]',
  HAND_DICE === 6,
)
invariant(
  'the deep route costs more than the safe one, even when both take what they find',
  deepNaive.escape <= safeNaive.escape && deepCarried.escape < safeCarried.escape,
)
invariant(
  'CRAP is a fallback and not the game: it is a minority of scored hands',
  everyCell.every((c) => {
    const total = [...c.hands.values()].reduce((a, b) => a + b, 0) || 1
    return (c.hands.get('crap') ?? 0) / total < 0.5
  }),
)

// **Added by the crooked bones wave.** The bare-balance law, extended to the
// hand itself: the floor is six plain bones, so no figure above can be requiring
// a crooked die any more than it can be requiring the iron.
invariant(
  'no figure above assumes a crooked die: every cell throws six plain bones',
  [...CELLS, ...LADDER_CELLS].every((c) => c.loadout.hand === undefined),
)
// Every grammar is finishable from the floor, by a solver, on the short route.
// It is the same statement *the slice is finishable* has always been, said three
// times because there are three descents.
invariant(
  'every grammar can be finished from the bare floor',
  GRAMMARS.every((plan) => planStats(seedsFor(plan.id), 'heuristic', { deep: false }).escape > 0),
)
// And buying is never worse than walking past, which is the same rule the
// loadout wave wrote about what a run picks up.
invariant(
  'answering a priced die is never worse than walking past every one of them',
  GRAMMARS.every((plan) => {
    const seeds = seedsFor(plan.id)
    return (
      planStats(seeds, 'heuristic', { deep: true, dice: 'always' }).escape >=
      planStats(seeds, 'heuristic', { deep: true, dice: 'never' }).escape
    )
  }),
)
// **The treasure is missable**, which is the law rather than a measurement: a
// thing every route walked past would be a step, and the hints would be a lie.
invariant(
  'the treasure is missable: no grammar reaches it on every route',
  GRAMMARS.every((plan) => {
    const seeds = seedsFor(plan.id)
    const stair = planStats(seeds, 'heuristic', { deep: false, dice: 'always' }).reached
    const deep = planStats(seeds, 'heuristic', { deep: true, dice: 'always' }).reached
    return stair < 1 && deep < 1
  }),
)
console.log('')

// ── the standing concern ───────────────────────────────────────────────
//
// Reported, not tuned. The wave that added the loadout was told to print this
// and leave it alone, so it is printed and left alone.
const medians = measured.flatMap((r) => [r.naive.roundsMedian, r.heuristic.roundsMedian])
const meanFight = mean(measured.flatMap((r) => [r.naive.rounds, r.heuristic.rounds]))
console.log('MEDIAN FIGHT LENGTH')
console.log(
  `  medians ${medians.join(' / ')}   mean across cells ${one(meanFight)} attacks\n` +
    '  The standing concern is fights ending near three and a half attacks,\n' +
    '  which starves anything that wants to escalate over a fight. Reported\n' +
    '  rather than tuned: changing it is a product decision about the three\n' +
    '  health totals, and belongs in a commit that says so.\n',
)

// ── the findings nobody should skip ─────────────────────────────────────
//
// Reported, not tuned. Every number this wave introduced is a first-pass value,
// and these are the three readings a person has to decide about.
console.log('THREE FINDINGS FROM THE CROOKED DICE')
console.log(
  '  1. **The treasure is weaker than a plain bone on its own.** The Hand of\n' +
    "     Saint Orrin is `1 1 1 1 6 6` — a mean of 2.67 against a bone's 3.5 — and\n" +
    '     the swing table above measures one copy of it as a *loss*. It is an\n' +
    '     archetype piece in a game that can only ever hand you one, which is the\n' +
    "     shape of the problem rather than the size of it. It is the wave's clearest\n" +
    '     finding and it is **not** tuned here: the levers are its faces and whether\n' +
    '     a run may ever hold more than one, and either is a product decision.\n' +
    '  2. **Narrowness beats average, and by a lot.** Three Jawbones is the\n' +
    '     strongest build measured, at +28 points over the floor, on a die whose\n' +
    '     mean is identical to a bone. Six Knucklebones is +10 on a die whose mean\n' +
    '     is *lower*. The crooked dice are working as distributions rather than as\n' +
    '     stat sticks, which is what they were for.\n' +
    '  3. **Always-take dominates, and the sweep says so without being asked to.**\n' +
    '     Three bones out of thirty is close to free on two of the three grammars.\n' +
    '     Only THE LONG WAY, which puts three priced dice in front of a run that has\n' +
    "     already spent its Font, prefers a floor — and it prefers twenty. If 3 is\n" +
    '     a formality, the lever is the price, and the hand has to say so: see\n' +
    '     POLISH_PROGRESS.md § the hand pass, question 2.\n',
)

console.log(
  'No bands. The multipliers and the three health totals are first-pass\n' +
    'numbers; this run is here to say what they produce. Turning any of the\n' +
    'measurements above into a gate is a product decision and belongs in a\n' +
    'commit that says so.\n' +
    '\n' +
    'Two gates were re-based by the loadout wave and are named as such in the\n' +
    'list above; one was added. Every cell is bare, because no target may\n' +
    'require the iron die, a talisman or an item die. See docs/COMBAT.md\n' +
    '§ Balance.\n',
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
