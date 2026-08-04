import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  HAND_SIZE,
  LADDER,
  PLAIN_POUCH,
  RUSTED_PLATE,
  THE_GNAWING,
} from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Armor, Fight, Line, Turn } from '../src/lots/index.js'
import {
  advanceFight,
  assembleHand,
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
 * Is it fair? The skeleton's one fight is the whole of the depth's teeth,
 * and a bare player has to be able to get through it — art. 33's promise
 * that an arrangement can be finished means nothing if the horror in the
 * middle of it cannot be.
 *
 * This plays the Gnawing well rather than perfectly: hunt the biggest set
 * on the recast, then take the best-scoring claims until the hand is dry.
 * The band is wide on purpose. It is a tripwire under the tuning, not an
 * opinion about it.
 */

/** Every subset of the free dice, best-scoring claim first, until dry. */
function claimGreedily(start: Turn): Turn {
  let turn = start
  for (let pass = 0; pass < 6; pass++) {
    const free = unused(turn).map((landed) => landed.die)
    if (free.length === 0) break
    let best: { dice: readonly string[]; line: Line; score: number } | null = null
    for (let mask = 1; mask < 1 << free.length; mask++) {
      const chosen = free.filter((_, i) => (mask >> i) & 1)
      for (const line of claimable(turn, chosen, LADDER)) {
        const score = attack(claim(turn, chosen, line, LADDER)) - attack(turn)
        if (best === null || score > best.score) best = { dice: chosen, line, score }
      }
    }
    if (best === null || best.score <= 0) break
    turn = claim(turn, best.dice as never, best.line, LADDER)
  }
  return turn
}

/** Keep everything showing the most common value; throw the rest again. */
function keepSensibly(turn: Turn): Turn {
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

function winRate(armor: Armor, runs: number): number {
  const hand = assembleHand(PLAIN_POUCH, HAND_SIZE)
  let wins = 0
  for (let seed = 0; seed < runs; seed++) {
    const lot = lotFrom(seed as unknown as Seed)
    let fight: Fight = openFight(THE_GNAWING, hand, BARE_BODY.health, armor)
    while (fight.outcome === 'fighting') {
      const turn = claimGreedily(recast(keepSensibly(cast(fight.turn, lot)), lot))
      fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
    }
    if (fight.outcome === 'won') wins++
  }
  return wins / runs
}

describe('lots — is it fair? (art. 33, and the arithmetic agent)', () => {
  it('lets a bare player beat the Gnawing more often than not, and not always', () => {
    const bare = winRate(BARE_BODY.armor, 250)
    // Winnable: the skeleton's loop closes without the Rusted Plate.
    expect(bare).toBeGreaterThan(0.5)
    // And still a fight: a first run has to be able to die interestingly.
    expect(bare).toBeLessThan(0.95)
  })

  it('makes armor worth wearing without making the fight a formality (art. 47)', () => {
    const bare = winRate(BARE_BODY.armor, 250)
    const plated = winRate(RUSTED_PLATE.armor, 250)
    expect(plated).toBeGreaterThan(bare)
    expect(plated).toBeLessThanOrEqual(1)
  })
})
