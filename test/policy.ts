/**
 * A thumb inside a fight, as a function.
 *
 * `test/drift.ts` holds the policies that stand for how somebody walks; this
 * holds the ones that stand for how somebody plays a turn. They live in one
 * file because the claim every measurement in this repo makes is *the same
 * model, a different argument* — two copies of "plays it well" would be two
 * models, and a table built from both would be comparing nothing.
 *
 * Nothing here is content. It plays the ladder well rather than perfectly.
 */

import { BARE_BODY, LADDER } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Armor, Fight, Goods, Hand, Horror, Line, Turn } from '../src/lots/index.js'
import {
  NO_GOODS,
  advanceFight,
  attack,
  cast,
  casting,
  claim,
  claimable,
  decide,
  keep,
  openFight,
  recast,
  unused,
  withTurn,
} from '../src/lots/index.js'
import type { Seed } from '../src/state/index.js'

/**
 * A thumb inside the claim phase: the turn as it lies, and the company the
 * ladder is being read through (art. 53). A model that ignores the second
 * argument is a model of a player who does not know what they are carrying.
 */
export type Thumb = (turn: Turn, goods: Goods) => Turn

/**
 * Every subset of the free dice, best-scoring claim first, until dry.
 *
 * **The company is an argument** (the levels wave). It used to be assumed
 * away, which was harmless while every talisman in the game was an unplaced
 * fixture and is a lie the moment one of them levels a line: a model that
 * scores `run-4` at ×3 while the player's Cord scores it at ×4 is not
 * playing the player's ladder, so it picks the wrong claim and then reports
 * the wrong number for it. Both halves matter — the search reads the levels
 * and the claim is assembled with them (art. 53).
 */
export function claimGreedily(start: Turn, goods: Goods = NO_GOODS): Turn {
  let turn = start
  for (let pass = 0; pass < 6; pass++) {
    const free = unused(turn).map((landed) => landed.die)
    if (free.length === 0) break
    let best: { dice: readonly string[]; line: Line; score: number } | null = null
    for (let mask = 1; mask < 1 << free.length; mask++) {
      const chosen = free.filter((_, i) => (mask >> i) & 1)
      for (const line of claimable(turn, chosen, LADDER)) {
        const score = attack(claim(turn, chosen, line, LADDER, goods), goods) - attack(turn, goods)
        if (best === null || score > best.score) best = { dice: chosen, line, score }
      }
    }
    if (best === null || best.score <= 0) break
    turn = claim(turn, best.dice as never, best.line, LADDER, goods)
  }
  return turn
}

/** The greedy thumb, curried against a company — what a walk plays with. */
export function greedyWith(goods: Goods): (turn: Turn) => Turn {
  return (turn) => claimGreedily(turn, goods)
}

/**
 * The turtle: it only spends a line on a claim worth having, and ends the
 * turn on anything less. It is the player art. 65's `hunger` exists to
 * price, and the greedy model cannot measure that kind at all because the
 * greedy model never hesitates.
 */
export function claimIfWorth(floor: number): Thumb {
  return (start, goods = NO_GOODS) => {
    const free = unused(start).map((landed) => landed.die)
    let best: { dice: readonly string[]; line: Line; score: number } | null = null
    for (let mask = 1; mask < 1 << free.length; mask++) {
      const chosen = free.filter((_, i) => (mask >> i) & 1)
      for (const line of claimable(start, chosen, LADDER)) {
        const score = attack(claim(start, chosen, line, LADDER, goods), goods)
        if (best === null || score > best.score) best = { dice: chosen, line, score }
      }
    }
    if (best === null || best.score < floor) return start
    return claim(start, best.dice as never, best.line, LADDER, goods)
  }
}

/** Keep everything showing the most common value; throw the rest again. */
export function keepSensibly(turn: Turn): Turn {
  const laid = casting(turn)
  const counts = new Map<number, number>()
  for (const landed of laid) {
    counts.set(landed.face.value, (counts.get(landed.face.value) ?? 0) + 1)
  }
  let bestValue = 0
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value > bestValue)) {
      bestValue = value
      bestCount = count
    }
  }
  if (bestCount < 2) return turn
  return keep(
    turn,
    laid.filter((landed) => landed.face.value === bestValue).map((landed) => landed.die),
  )
}

/**
 * What one fight, played `runs` times, actually did — not only whether it
 * was won.
 *
 * **Card 89's findings could not be seen from a win rate.** *Fights end in
 * ~3.5 turns, so escalation never fires and the ladder's top is decorative*
 * is four statements about the *shape* of a fight, and the one number this
 * file used to return says nothing about any of them. So the model is
 * unchanged and the readout is wider: the same loop, reporting the turns it
 * took, whether the script came round, whether the telegraphed blow ever
 * landed, and which lines were spent.
 */
export interface FightStats {
  readonly runs: number
  readonly wins: number
  readonly winRate: number
  /** Turns the fight ran, per run — the shape card 89 is about. */
  readonly turns: readonly number[]
  readonly meanTurns: number
  readonly medianTurns: number
  /** Fights that outlived the script once, so the escalation was charged. */
  readonly escalated: number
  /** Fights that reached the turn the telegraphed intent is scheduled for. */
  readonly ranFull: number
  /** Of those, the ones where it actually resolved against the player. */
  readonly telegraphLanded: number
  /** art. 63: how many times each line of the ladder was spent, over `runs`. */
  readonly lines: Readonly<Record<string, number>>
}

/**
 * One horror, one hand, one way of playing, `runs` seeds.
 *
 * Every per-horror number in DESIGN.md is this function with a different
 * argument, so two numbers beside each other always mean the same thing.
 * What it cannot answer is what a *depth* costs; `test/depth.ts` does that.
 */
export function statsOf(
  horror: Horror,
  hand: Hand,
  armor: Armor,
  runs: number,
  play: Thumb = claimGreedily,
  goods: Goods = NO_GOODS,
  health: number = BARE_BODY.health,
): FightStats {
  let wins = 0
  let escalated = 0
  let ranFull = 0
  let telegraphLanded = 0
  const turns: number[] = []
  const lines: Record<string, number> = {}
  for (let seed = 0; seed < runs; seed++) {
    const lot = lotFrom(seed as unknown as Seed)
    let fight: Fight = openFight(horror, hand, health, armor, goods)
    // art. 119 §3: which turn the tell is scheduled for. It is read off the
    // horror rather than handed in, so a script whose big beat moves does
    // not need this file changed with it.
    let telegraphAt = 0
    for (let at = 1; at <= 24 && telegraphAt === 0; at++) {
      if (horror.intentFor(at).telegraph === true) telegraphAt = at
    }
    // art. 65: a horror that heals what it is not hit for can in principle
    // outlast a player who never claims. The guard is the test's, not the
    // game's — a real turn always ends.
    let guard = 0
    let loops = 0
    while (fight.outcome === 'fighting' && guard++ < 300) {
      const at = fight.turnNumber
      const turn = play(recast(keepSensibly(cast(fight.turn, lot)), lot), goods)
      for (const made of turn.claims) lines[made.line] = (lines[made.line] ?? 0) + 1
      // card 93: the amend roll is handed the same lot the castings came off.
      // A company carrying no rolling good never draws from it, so every row
      // this file has ever printed is the row it printed before the wave — and
      // a row that *does* carry one is a new row rather than a moved one.
      fight = advanceFight(
        withTurn(fight, turn),
        decide(turn, 'end-turn', fight.armor, goods, lot),
      )
      // The blow landed if the horror survived the claims to throw it: the
      // demo's order says a killing blow is not also a killing blow taken.
      if (at === telegraphAt && fight.outcome !== 'won') telegraphLanded++
      if (at === telegraphAt) ranFull++
      loops = at
    }
    turns.push(loops)
    // The script came round: the fight outlived it, so the escalation was
    // charged at least once. `intentFor` loops on the script's own length,
    // which is why this is asked of the horror and not of a constant.
    if (loops > scriptLengthOf(horror)) escalated++
    if (fight.outcome === 'won') wins++
  }
  const sorted = [...turns].sort((a, b) => a - b)
  return {
    runs,
    wins,
    winRate: wins / runs,
    turns,
    meanTurns: turns.reduce((sum, n) => sum + n, 0) / Math.max(1, turns.length),
    medianTurns: sorted[Math.floor(sorted.length / 2)] ?? 0,
    escalated,
    ranFull,
    telegraphLanded,
    lines,
  }
}

/**
 * How long a scripted horror's script is, asked rather than declared: the
 * first turn whose intent repeats the opening one in verb, amount and
 * effect is where the loop came round. Content holds the arrays; this only
 * has a `Horror`, and a `Horror` is `intentFor` and nothing else.
 */
function scriptLengthOf(horror: Horror): number {
  const first = horror.intentFor(1)
  for (let at = 2; at <= 24; at++) {
    const one = horror.intentFor(at)
    // The escalation makes a repeat louder, never different — so the verb
    // and the effect coming round again is the loop, whatever the number.
    if (one.verb === first.verb && JSON.stringify(one.effect) === JSON.stringify(first.effect)) {
      return at - 1
    }
  }
  return 24
}

/** How often the player walks out of that one fight. The old readout. */
export function winRateOf(
  horror: Horror,
  hand: Hand,
  armor: Armor,
  runs: number,
  play: Thumb = claimGreedily,
  goods: Goods = NO_GOODS,
): number {
  return statsOf(horror, hand, armor, runs, play, goods).winRate
}
