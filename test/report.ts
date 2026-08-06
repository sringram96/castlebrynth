/**
 * The table in DESIGN.md, generated (card 89).
 *
 * **Ground truth is the harness.** Every survival number the design file
 * quotes has, until now, been produced by a one-off script that was thrown
 * away, so re-baselining after a tuning pass meant writing the script again
 * and hoping it was the same script. This is that script, kept — one place
 * where the reference hands are derived, the rows are named, and the bands
 * are stated, so a number in DESIGN.md and a number in the suite can never
 * mean two different things.
 *
 * It sits beside `test/policy.ts` (how a turn is played), `test/drift.ts`
 * (how a run is walked) and `test/depth.ts` (the two joined) and adds only
 * the reading: which hands, against which horrors, and what the answer was.
 *
 * **The reference hands are derived, never asserted** — the wave is explicit
 * about it. The waking hand is art. 55's six bones. The found hand is the
 * *median* accumulation halfway down, taken off the actual drop machinery
 * over hundreds of seeds. The returning hand is the median haul a whole
 * failed run deposits. If the drops change, these change with them, and the
 * table stops agreeing with the game only if somebody stops running it.
 *
 * Nothing here is content, and nothing here is a bar: `median finds` is a
 * *report*. The wave's boundary is explicit that density is tuned as content
 * off a measured median and never guaranteed by a test.
 */

import {
  ALL_RIDERS,
  BARE_BODY,
  CASCADE,
  HAND_SIZE,
  LADDER,
  LEVEL_CAP,
  PLAIN_POUCH,
  ROLLING_CAP,
  ROLLING_GOODS,
  THE_GNAWING,
  THE_KINDLED,
  THE_MARROW,
  THE_SILT_MOTHER,
  THE_WARDEN,
} from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type {
  Armor,
  Die,
  Fight,
  Goods,
  Hand,
  Horror,
  Line,
  Talisman,
  Trinket,
  Wearable,
} from '../src/lots/index.js'
import {
  NO_GOODS,
  advanceFight,
  armorFrom,
  assembleHand,
  cascadeBeats,
  cast,
  decide,
  keptAtRecast,
  openFight,
  recast,
  rollBeats,
  withTurn,
} from '../src/lots/index.js'
import type { Seed } from '../src/state/index.js'
import { coinFlip } from './drift.js'
import { playDepth, type Carrying, type DepthReport } from './depth.js'
import { claimGreedily, keepSensibly, statsOf, type FightStats, type Thumb } from './policy.js'

// ── The reference hands (the wave's three bands) ───────────────────────

/** A hand, what it wears, and what it carries — one row's left column. */
export interface Reference {
  readonly label: string
  readonly hand: Hand
  readonly armor: Armor
  readonly goods: Goods
  /** What it woke with, for handing to a depth walk (art. 60). */
  readonly carrying: Carrying
}

export function referenceOf(label: string, carrying: Carrying): Reference {
  // `opened` builds the pouch the same way: what earlier runs found first,
  // then the plain bones, and the pouch's order *is* the hand (art. 60).
  const pouch = { dice: [...(carrying.dice ?? []), ...PLAIN_POUCH.dice] }
  return {
    label,
    hand: assembleHand(pouch, HAND_SIZE),
    armor: armorFrom(carrying.worn ?? [], BARE_BODY.armor),
    goods: {
      talismans: carrying.keepsakes ?? [],
      riders: ALL_RIDERS,
      levelCap: LEVEL_CAP,
      // card 93: empty on every reference hand the wave's own bands are
      // stated at, which is the point — a rolling good is measured as an
      // extra *row* beside them and never folded into one of them.
      trinkets: carrying.trinkets ?? [],
      trinketCap: ROLLING_CAP,
    },
    carrying,
  }
}

/** art. 55: six plain bones, and the hand is full at the waking. */
export const WAKING: Reference = referenceOf('the waking hand', {})

// ── Deriving the other two off the drop machinery ──────────────────────

export function median(of: readonly number[]): number {
  if (of.length === 0) return 0
  const sorted = [...of].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/**
 * The median accumulation, turned back into a hand.
 *
 * Two halves, and both are needed: **how many** goods a run holds at that
 * point is the median count over seeds, and **which** goods is the
 * commonest haul *of that size* — a real run's, taken whole.
 *
 * **Taking the commonest goods one at a time was the first attempt and it
 * was wrong.** A traveler's bone is dealt at twice a talisman's weight, so
 * ranking every good by how often it turns up and keeping the top three
 * produces a hand of three bones — a haul almost nobody has, because a run
 * that finds three things usually finds three *different kinds* of thing.
 * The mistake mattered: it is the difference between a reference hand with
 * armour in it and one without, and against the keeper that is most of the
 * difference there is (DESIGN.md, the levels wave). A composition is not
 * the sum of its marginals, and the honest fix is to read a whole haul off
 * a run that actually had one.
 *
 * **How the whole haul is chosen was a second bug, and card 93 surfaced it
 * rather than writing it.** Ranking the compositions by *how many runs held
 * exactly that composition* sounds right and is a knife edge: there are
 * hundreds of possible two-good hauls, so at four hundred seeds the winner is
 * a two-vote lead and the tie behind it is broken **alphabetically**. Two of
 * the compositions in that tie were `bone.leech + bone.pusher` and
 * `bone.pusher + the plate`, which measure 0.205 and 0.353 on the road — so
 * the published ratchet row was decided by which id sorted first, and adding
 * any content anywhere could flip it. It did: two rare rows in the boon pool
 * moved one count by one and the reference hand lost its armour.
 *
 * So a haul is still taken **whole**, from a run that actually had one, and
 * *which* whole haul is chosen by how **representative** it is: the summed
 * frequency of its own goods across every haul of that size. A composition
 * made of the things runs commonly find beats one made of two rarities that
 * happened to land together twice, and the answer stops moving when the
 * catalog grows. Ties still break on the key, so the same sample still yields
 * the same hand (art. 36's discipline, applied to a measurement).
 */
function medianCarry(hauls: readonly DepthReport['haul'][]): Carrying {
  const want = median(hauls.map((haul) => haul.count))
  const sized = hauls.filter((haul) => haul.count === want)
  const idsOf = (haul: DepthReport['haul']): readonly string[] =>
    [...haul.dice, ...haul.keepsakes, ...haul.worn, ...haul.trinkets].map(
      (good) => good.id as string,
    )
  // How often each good turns up among the hauls of the median size. This is
  // the marginal, and it is used only to *rank whole hauls* — never to build
  // one, which is the mistake the paragraph above is about.
  const often = new Map<string, number>()
  for (const haul of sized) {
    for (const id of idsOf(haul)) often.set(id, (often.get(id) ?? 0) + 1)
  }
  const scored = sized.map((haul) => ({
    haul,
    key: [...idsOf(haul)].sort().join('+'),
    score: idsOf(haul).reduce((total, id) => total + (often.get(id) ?? 0), 0),
  }))
  const best = scored.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))[0]?.haul
  if (best === undefined) return {}
  return {
    dice: best.dice,
    keepsakes: best.keepsakes,
    worn: best.worn,
    trinkets: best.trinkets,
  }
}

/** What a walk of `runs` first wakings actually did, kept for every row. */
export interface Descents {
  readonly reports: readonly DepthReport[]
  readonly reachedTheDoor: number
  readonly finished: number
  /** The median haul, at the halfway room and standing at the last door. */
  readonly findsAtMid: number
  readonly findsAtHall: number
  readonly turnsPerFight: readonly number[]
}

export function descend(runs: number, carrying: Carrying = {}, from = 1): Descents {
  const reports: DepthReport[] = []
  for (let seed = from; seed < from + runs; seed++) {
    reports.push(playDepth(seed, coinFlip(seed), carrying))
  }
  const mid = reports.map((one) => one.findsAtMid).filter((n): n is number => n !== null)
  const hall = reports.map((one) => one.findsAtHall).filter((n): n is number => n !== null)
  return {
    reports,
    reachedTheDoor: reports.filter((one) => one.reachedTheDoor).length / runs,
    finished: reports.filter((one) => one.outcome === 'finished').length / runs,
    findsAtMid: median(mid),
    findsAtHall: median(hall),
    turnsPerFight: reports.flatMap((one) => one.turnsPerFight),
  }
}

/**
 * The found hand and the returning hand, both off one walk of first runs.
 *
 * The found hand is what the middle run is holding **halfway down**, which
 * is where the wave points it at the region uniques. The returning hand is
 * what a whole run deposits, which is the ratchet: the run burned and this
 * did not (arts 11, 60).
 */
export function referenceHands(runs = 400): {
  found: Reference
  returning: Reference
  taught: Reference
  first: Descents
  second: Descents
} {
  const first = descend(runs)
  const mid = first.reports
    .filter((one) => one.findsAtMid !== null)
    .map((one) => haulAtCount(one, one.findsAtMid ?? 0))
  // **A full failed run**, which is the wave's phrase and matters: a run
  // that died in the second room deposited what a second room holds, and
  // the hand a player comes back with is the one a run that *went the whole
  // way* left them. Averaging the two together would describe nobody.
  const whole = first.reports.filter((one) => one.reachedTheDoor).map((one) => one.haul)
  const returning = referenceOf('the returning hand', medianCarry(whole))
  // **And the taught hand: the same thing again.** The wave asks for the
  // returning hand *taught*, and DESIGN.md has used that word since the
  // company wave to mean a player carrying what earlier runs found rather
  // than a player who happens to be good — knowledge is not arithmetic
  // (art. 116), so the only thing "taught" can move in a model is the
  // pouch. So this is run two's deposit on top of run one's, derived the
  // same way and off the same machinery.
  const second = descend(runs, returning.carrying, 10_000)
  const again = second.reports.filter((one) => one.reachedTheDoor).map((one) => one.haul)
  return {
    found: referenceOf('the found hand', medianCarry(mid)),
    returning,
    taught: referenceOf('the taught hand', combined(returning.carrying, medianCarry(again))),
    first,
    second,
  }
}

/** Two hauls, laid end to end — what a player is holding at the third waking. */
function combined(one: Carrying, other: Carrying): Carrying {
  return {
    dice: [...(one.dice ?? []), ...(other.dice ?? [])],
    keepsakes: [...(one.keepsakes ?? []), ...(other.keepsakes ?? [])],
    worn: [...(one.worn ?? []), ...(other.worn ?? [])],
    trinkets: [...(one.trinkets ?? []), ...(other.trinkets ?? [])],
  }
}

/**
 * A haul cut back to what the run was holding at the halfway room.
 *
 * The walk records the *count* at that point and the whole haul at the end,
 * and goods are collected in the order they are found, so the first `n` of
 * the haul is what was in hand halfway down. It is an approximation in
 * exactly one place — a run that found a die and a plate in the same room —
 * and nothing in the table turns on the order within a room.
 */
function haulAtCount(report: DepthReport, n: number): DepthReport['haul'] {
  const all = [
    ...report.haul.dice,
    ...report.haul.keepsakes,
    ...report.haul.worn,
    ...report.haul.trinkets,
  ]
  const held = all.slice(0, n)
  const dice = held.filter((one): one is Die => 'faces' in one)
  const keepsakes = held.filter((one): one is Talisman => 'species' in one)
  // card 93: a rolling good is told apart by `rolls`, the one field only it
  // has — which is why its faces do not live under `faces` (`collect`).
  const trinkets = held.filter((one): one is Trinket => 'rolls' in one)
  const worn = held.filter(
    (one): one is Wearable => !('faces' in one) && !('species' in one) && !('rolls' in one),
  )
  return { dice, keepsakes, worn, trinkets, count: held.length }
}

// ── The rows ───────────────────────────────────────────────────────────

/** Every horror a row can be run against, in the order the table prints. */
export const HORROR_ROWS: readonly { readonly label: string; readonly horror: Horror }[] = [
  { label: 'the Gnawing', horror: THE_GNAWING },
  { label: 'the Marrow', horror: THE_MARROW },
  { label: 'the Silt Mother', horror: THE_SILT_MOTHER },
  { label: 'the Kindled', horror: THE_KINDLED },
  { label: 'the Warden', horror: THE_WARDEN },
]

export interface Row extends FightStats {
  readonly hand: string
  readonly horror: string
  /** art. 119: what the beats cost in wall-clock, at the shipped `Timings`. */
  readonly beatSeconds: number
}

export function rowFor(
  reference: Reference,
  horror: Horror,
  label: string,
  runs: number,
  play: Thumb = claimGreedily,
): Row {
  const stats = statsOf(horror, reference.hand, reference.armor, runs, play, reference.goods)
  return {
    ...stats,
    hand: reference.label,
    horror: label,
    beatSeconds: beatSecondsOf(horror, reference, Math.min(runs, 60)),
  }
}

// ── The rolling goods, as extra rows (card 93) ─────────────────────────

/**
 * card 93: **what one rolling good is worth at a reference hand.**
 *
 * It is a *row*, and the wave is explicit about why: the rolling goods are an
 * add-on, no band may move because of them, and the honest way to report a
 * thing nothing is tuned around is beside the table rather than inside it. So
 * this takes a hand the bands are already stated at, plays it with and without
 * the good, and reports the difference — the same shape the levels wave used
 * for a talisman, and the same shape the fork was restored with.
 *
 * `marginal` is the number DESIGN.md prints. `with` and `without` are kept so
 * that a row can be read without trusting the subtraction.
 */
export interface RollingRow {
  readonly good: string
  readonly hand: string
  readonly horror: string
  readonly without: number
  readonly with: number
  readonly marginal: number
}

/** One good (or a pair of them, at the cap), against one hand and one horror. */
export function rollingRow(
  reference: Reference,
  horror: Horror,
  horrorLabel: string,
  carried: readonly Trinket[],
  label: string,
  runs: number,
): RollingRow {
  const bare = statsOf(horror, reference.hand, reference.armor, runs, claimGreedily, {
    ...reference.goods,
    trinkets: [],
  })
  const held = statsOf(horror, reference.hand, reference.armor, runs, claimGreedily, {
    ...reference.goods,
    trinkets: carried,
    trinketCap: ROLLING_CAP,
  })
  return {
    good: label,
    hand: reference.label,
    horror: horrorLabel,
    without: bare.winRate,
    with: held.winRate,
    marginal: held.winRate - bare.winRate,
  }
}

/**
 * Every rolling good on its own, then both of them at the cap — which is the
 * row that says what the cap is actually holding back.
 */
export function rollingRows(
  reference: Reference,
  horror: Horror,
  horrorLabel: string,
  runs: number,
): readonly RollingRow[] {
  const each = ROLLING_GOODS.map((one) =>
    rollingRow(reference, horror, horrorLabel, [one], one.id as string, runs),
  )
  return [
    ...each,
    rollingRow(reference, horror, horrorLabel, ROLLING_GOODS, 'both, at the cap', runs),
  ]
}

// ── The wall-clock (art. 119) ──────────────────────────────────────────

/**
 * **How long a fight takes, in seconds of beats.**
 *
 * The wave's budget is a wall-clock one — 75 seconds for an ordinary fight,
 * 120 for the Warden — and the lever it names if the budget busts is the
 * beats' *durations*, never the turn count. So the number has to be
 * measured off the same script the shell plays: every frame of the roll, the
 * recast and the cascade, summed, at the shipped `CASCADE` timings.
 *
 * What it deliberately excludes is the thumb. A press's own deliberation is
 * a person and not a number this repo holds, so `THINKING` is stated here as
 * an allowance rather than measured, and the table reports both — the beats
 * alone, which is what the wave's lever moves, and the beats plus three
 * presses a turn, which is what a phone in a hand feels.
 */
export const THINKING = 1200

export function beatSecondsOf(horror: Horror, reference: Reference, runs: number): number {
  let total = 0
  for (let seed = 0; seed < runs; seed++) {
    total += beatMsOf(horror, reference, seed)
  }
  return total / Math.max(1, runs) / 1000
}

function beatMsOf(horror: Horror, reference: Reference, seed: number): number {
  const lot = lotFrom(seed as unknown as Seed)
  const goods = reference.goods
  let fight: Fight = openFight(horror, reference.hand, BARE_BODY.health, reference.armor, goods)
  let ms = 0
  let guard = 0
  while (fight.outcome === 'fighting' && guard++ < 300) {
    const first = cast(fight.turn, lot)
    ms += spanOf(rollBeats(withTurn(fight, first), new Set(), CASCADE))
    const held = keepSensibly(first)
    const still = new Set<string>(keptAtRecast(held).map((die) => die as string))
    const thrown = recast(held, lot)
    ms += spanOf(rollBeats(withTurn(fight, thrown), still, CASCADE))
    const turn = claimGreedily(thrown, goods)
    const before = withTurn(fight, turn)
    const resolution = decide(turn, 'end-turn', fight.armor, goods)
    const after = advanceFight(before, resolution)
    ms += spanOf(cascadeBeats(before, after, resolution, goods, CASCADE))
    fight = after
  }
  return ms
}

function spanOf(frames: readonly { readonly after: number }[]): number {
  return frames.reduce((total, frame) => total + frame.after, 0)
}

/** How many presses a fight of `turns` turns costs the thumb (art. 41). */
export const PRESSES_PER_TURN = 3

export function withThinking(beatSeconds: number, meanTurns: number): number {
  return beatSeconds + (meanTurns * PRESSES_PER_TURN * THINKING) / 1000
}

// ── The ladder's usage (card 89: is the top decorative?) ───────────────

/** Which lines a row actually spent, most-used first. */
export function ladderUsage(stats: FightStats): readonly { line: Line; share: number }[] {
  const total = Object.values(stats.lines).reduce((sum, n) => sum + n, 0)
  return (Object.keys(LADDER) as Line[])
    .map((line) => ({ line, share: total === 0 ? 0 : (stats.lines[line] ?? 0) / total }))
    .sort((a, b) => b.share - a.share)
}

export { NO_GOODS }
