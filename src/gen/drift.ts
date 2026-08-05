/**
 * The drift (arts 77–78).
 *
 * A depth holds a few regions plus a neutral pool. Every door dealt carries
 * a hidden region tag; opening one tallies that region. Pools weight by the
 * tally, so the labyrinth leans as the player leans — twenty questions, not
 * a fork in a road. No single door means much; the pattern of doors means
 * everything.
 *
 * Then the lock is forced: at a door count content chooses, the leading
 * region takes the rest of the depth. Every run arrives somewhere, and
 * arrival is the payoff of commitment.
 */

import type { Lot } from './lot.js'
import type { DepthPlan, Drift, Grammar, RegionId } from './types.js'

/** The neutral pool tallies under the empty string: it leans nowhere. */
export const NEUTRAL = ''

/** A run before its first door. Nothing has been said yet. */
export const FRESH_DRIFT: Drift = { tally: {}, locked: null, opened: 0 }

/** art. 77: a door opened is a region tallied. */
export function tallied(drift: Drift, region: RegionId | null): Drift {
  const key = region ?? NEUTRAL
  return {
    tally: { ...drift.tally, [key]: (drift.tally[key] ?? 0) + 1 },
    locked: drift.locked,
    opened: drift.opened + 1,
  }
}

export function tallyOf(drift: Drift, region: RegionId | null): number {
  return drift.tally[region ?? NEUTRAL] ?? 0
}

/**
 * art. 78: the lock is forced. At the door count content sets, the leading
 * region takes the depth; ties break deterministically from the seed, by the
 * lot the caller hands in.
 *
 * The neutral pool is never a candidate. Leaning nowhere is a way of
 * choosing nothing, and art. 78 says every run arrives *somewhere* — so a
 * player who only ever took neutral doors still arrives, at whichever region
 * the seed names.
 */
export function locked(drift: Drift, plan: DepthPlan, lot: Lot): Drift {
  if (drift.locked !== null) return drift
  if (drift.opened < plan.lockAt) return drift
  if (plan.regions.length === 0) return drift
  let best = -1
  let leaders: RegionId[] = []
  for (const region of plan.regions) {
    const count = tallyOf(drift, region.id)
    if (count > best) {
      best = count
      leaders = [region.id]
    } else if (count === best) {
      leaders.push(region.id)
    }
  }
  const chosen = leaders[Math.floor(lot.next() * leaders.length)] ?? leaders[0]
  return chosen === undefined ? drift : { ...drift, locked: chosen }
}

/**
 * art. 77: how much a pool is worth to the dealer right now. One, plus the
 * pull times what the player has said about it. A pull of zero is a
 * labyrinth that does not listen.
 */
export function pull(drift: Drift, region: RegionId | null, grammar: Grammar): number {
  return 1 + grammar.driftPull * tallyOf(drift, region)
}

/**
 * Every pool a depth can deal from, region tags first and the neutral pool
 * last as `null`. After the lock there is only one (art. 78).
 */
export function pools(drift: Drift, plan: DepthPlan): readonly (RegionId | null)[] {
  if (drift.locked !== null) return [drift.locked]
  return [...plan.regions.map((region) => region.id), null]
}

/** The rooms a pool holds. An unknown region holds nothing. */
export function poolRooms(plan: DepthPlan, region: RegionId | null): readonly string[] {
  if (region === null) return plan.neutral as readonly string[]
  return (plan.regions.find((held) => held.id === region)?.rooms ?? []) as readonly string[]
}
