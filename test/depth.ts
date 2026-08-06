/**
 * A whole depth, played end to end.
 *
 * `test/drift.ts` walks a run and never fights; `test/lots.fairness.test.ts`
 * fights and never walks. Neither can answer the question the design file
 * keeps having to answer by hand — *does a run survive depth one?* — so this
 * is the two of them joined, and it is the only model any survival number in
 * DESIGN.md comes from.
 *
 * It plays the way `test/policy.ts` plays: keep the biggest set, recast,
 * claim greedily until the hand is dry. It takes every good it is offered
 * and drinks every mercy it stands in front of, because the number worth
 * knowing is what a depth costs a player who is doing everything right.
 *
 * Nothing here is content. The policies stand in for thumbs.
 */

import { ROOM_BOOK, horrorOf } from '../src/content/index.js'
import { act, chooseDoor } from '../src/descent/index.js'
import type { Chain, ChainNode, Door } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import { carryOut, openFightDoor, turnLots } from '../src/hinge/index.js'
import type { Fight, Goods, Horror } from '../src/lots/index.js'
import { advanceFight, cast, decide, recast, withTurn } from '../src/lots/index.js'
import type { EncounterId, Ledgers } from '../src/state/index.js'
import { DEALER, greet, lookAround, opened, takeable, type Policy } from './drift.js'
import { claimGreedily, keepSensibly } from './policy.js'

const NO_GOODS: Goods = { talismans: [], riders: [] }

/** How a run ended. `stuck` is a chain that offered nowhere to go. */
export type DepthOutcome = 'finished' | 'died' | 'refused' | 'stuck'

export interface DepthReport {
  readonly outcome: DepthOutcome
  /** How far down the run got, in rooms dealt. */
  readonly step: number
  readonly fights: number
  /** Which horrors it actually traded blows with, in order. */
  readonly fought: readonly string[]
  readonly health: number
  readonly met: readonly EncounterId[]
  readonly locked: string | null
}

/**
 * One fight, played out. The lots are the shell's own (`turnLots`), so the
 * dice a measured run throws are the dice a real run at that seed throws.
 */
function fightItOut(
  ledgers: Ledgers,
  node: ChainNode,
  door: Door,
  horror: Horror,
): { ledgers: Ledgers; won: boolean } {
  let fight: Fight = openFightDoor(ledgers, { door, horror }, NO_GOODS)
  // A horror that heals what it is not hit for could in principle outlast a
  // model that never claims. The guard is the test's, not the game's.
  let guard = 0
  while (fight.outcome === 'fighting' && guard++ < 300) {
    const lots = turnLots(ledgers.run!.seed, node.step, fight.turnNumber)
    const turn = claimGreedily(recast(keepSensibly(cast(fight.turn, lots(1))), lots(2)))
    fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
  }
  return { ledgers: carryOut(ledgers, fight), won: fight.outcome === 'won' }
}

export function playDepth(seed: number, policy: Policy): DepthReport {
  let { ledgers, chain } = opened(seed)
  ledgers = greet(ledgers, chain)
  let fights = 0
  const fought: string[] = []

  const report = (outcome: DepthOutcome, node: ChainNode | null): DepthReport => ({
    outcome,
    step: node?.step ?? 0,
    fights,
    fought,
    health: ledgers.run?.health ?? 0,
    met: ledgers.permanent.met,
    locked: (chain.drift.locked as string | null) ?? null,
  })

  for (;;) {
    const node = hereIn(chain)
    if (node === null) return report('stuck', null)
    // art. 68: a thumb looks before it takes, and looking is what summons
    // the verb. art. 40: and it drinks whatever the room offers for free.
    ledgers = lookAround(ledgers, node)
    for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)

    const at = Math.min(Math.max(0, policy(node.doors, chain)), node.doors.length - 1)
    const door = node.doors[at]
    if (door === undefined) return report('stuck', node)

    // art. 30: the fight is the door. Winning opens it; losing ends the run.
    if (door.fight !== undefined) {
      const horror = horrorOf(node.fills)
      if (horror !== null) {
        fights++
        fought.push(horror.id)
        const out = fightItOut(ledgers, node, door, horror)
        ledgers = out.ledgers
        if (!out.won) return report('died', node)
      }
    }

    if (door.ends === true) {
      // art. 3: the Warden's door refuses what it is not given.
      const held = new Set<string>(ledgers.run!.carried as readonly string[])
      const opens = door.demands.every((key) => held.has(key as string))
      return report(opens ? 'finished' : 'refused', node)
    }

    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
    ledgers = walked.ledgers
    chain = walked.chain
    ledgers = greet(ledgers, chain)
  }
}

/** How often a policy walks out of depth one, over `runs` seeds. */
export function survival(runs: number, policy: (seed: number) => Policy): number {
  let out = 0
  for (let seed = 1; seed <= runs; seed++) {
    if (playDepth(seed, policy(seed)).outcome === 'finished') out++
  }
  return out / runs
}
