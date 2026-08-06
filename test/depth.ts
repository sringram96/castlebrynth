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

import { ALL_RIDERS, LEVEL_CAP, ROOM_BOOK, horrorIn, horrorOf } from '../src/content/index.js'
import { act, chooseDoor, opens } from '../src/descent/index.js'
import type { Chain, ChainNode, Door } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import { carryOut, openFightDoor, turnLots } from '../src/hinge/index.js'
import type { Die, Fight, Goods, Horror, Talisman, Wearable } from '../src/lots/index.js'
import { advanceFight, cast, decide, recast, withTurn } from '../src/lots/index.js'
import type { EncounterId, Ledgers, PermanentLedger } from '../src/state/index.js'
import { DEALER, greet, lookAround, opened, takeable, type Policy } from './drift.js'
import { claimGreedily, keepSensibly } from './policy.js'

/** What a player wakes with — a pouch earlier runs grew, and what they wear. */
export interface Carrying {
  readonly dice?: readonly Die[]
  readonly worn?: readonly Wearable[]
  /** art. 53: keepsakes are permanent, so a returning run brings them down. */
  readonly keepsakes?: readonly Talisman[]
}

/**
 * The company this run is fighting with, read off the ledger it is standing
 * on (art. 53, and `goods()` in the shell).
 *
 * **The levels wave found this hard-coded to nothing.** A run that picked
 * the Cord up off a floor fought the next horror without it, so the whole
 * talisman half of the growth basket was invisible to every number in
 * DESIGN.md. Reading the ledger is what makes a measured run the run.
 */
function companyOf(permanent: PermanentLedger): Goods {
  return { talismans: permanent.keepsakes, riders: ALL_RIDERS, levelCap: LEVEL_CAP }
}

/**
 * What a run is holding that it did not wake with — the haul (arts 11, 60).
 *
 * A death burns the run and leaves this standing, which is the ratchet the
 * levels wave measures: what a losing run deposits is what the next one
 * descends with.
 */
export interface Haul {
  readonly dice: readonly Die[]
  readonly keepsakes: readonly Talisman[]
  readonly worn: readonly Wearable[]
  /** How many goods of any kind. The number the median-finds row reports. */
  readonly count: number
}

function haulOver(before: PermanentLedger, after: PermanentLedger): Haul {
  const had = new Set(before.pouch.dice.map((die) => die.id as string))
  const wore = new Set(before.wearables.map((one) => one.id as string))
  const kept = new Set(before.keepsakes.map((one) => one.id as string))
  const dice = after.pouch.dice.filter((die) => !had.has(die.id as string))
  const keepsakes = after.keepsakes.filter((one) => !kept.has(one.id as string))
  const worn = after.wearables.filter((one) => !wore.has(one.id as string))
  return { dice, keepsakes, worn, count: dice.length + keepsakes.length + worn.length }
}

/** How a run ended. `stuck` is a chain that offered nowhere to go. */
export type DepthOutcome = 'finished' | 'died' | 'refused' | 'stuck'

export interface DepthReport {
  readonly outcome: DepthOutcome
  /**
   * Whether the run got to the last room alive.
   *
   * Before the Warden was a being this was the same question as `finished`,
   * and it is the like-for-like number for anything measuring what the road
   * costs rather than what the keeper does (card 29 against card 31).
   */
  readonly reachedTheDoor: boolean
  /** How far down the run got, in rooms dealt. */
  readonly step: number
  readonly fights: number
  /** Which horrors it actually traded blows with, in order. */
  readonly fought: readonly string[]
  readonly health: number
  readonly met: readonly EncounterId[]
  readonly locked: string | null
  /** What the run picked up, whether or not it walked out with its life. */
  readonly haul: Haul
  /**
   * The same count, taken halfway down and at the last door — the two
   * places the levels wave reports the median from. `atTheHall` is null on
   * a run that never reached it, so a median is taken over runs that got
   * there rather than being dragged down by ones that did not.
   */
  readonly findsAtMid: number | null
  readonly findsAtHall: number | null
  /** How many turns each of this run's fights took, in order. */
  readonly turnsPerFight: readonly number[]
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
): { ledgers: Ledgers; won: boolean; turns: number } {
  // The company is the run's own (art. 53) — what it found on the way down
  // is what it is holding when the next thing comes close.
  const goods = companyOf(ledgers.permanent)
  let fight: Fight = openFightDoor(ledgers, { door, horror }, goods)
  // A horror that heals what it is not hit for could in principle outlast a
  // model that never claims. The guard is the test's, not the game's.
  let guard = 0
  let turns = 0
  while (fight.outcome === 'fighting' && guard++ < 300) {
    const lots = turnLots(ledgers.run!.seed, node.step, fight.turnNumber)
    turns = fight.turnNumber
    const turn = claimGreedily(recast(keepSensibly(cast(fight.turn, lots(1))), lots(2)), goods)
    fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor, goods))
  }
  return { ledgers: carryOut(ledgers, fight), won: fight.outcome === 'won', turns }
}

export function playDepth(seed: number, policy: Policy, carrying: Carrying = {}): DepthReport {
  let { ledgers, chain } = opened(seed, carrying)
  const woke = ledgers.permanent
  ledgers = greet(ledgers, chain)
  let fights = 0
  const fought: string[] = []
  const turnsPerFight: number[] = []
  let findsAtMid: number | null = null
  let findsAtHall: number | null = null

  const report = (outcome: DepthOutcome, node: ChainNode | null): DepthReport => ({
    outcome,
    reachedTheDoor: node?.type === 'warden',
    step: node?.step ?? 0,
    fights,
    fought,
    health: ledgers.run?.health ?? 0,
    met: ledgers.permanent.met,
    locked: (chain.drift.locked as string | null) ?? null,
    haul: haulOver(woke, ledgers.permanent),
    findsAtMid,
    findsAtHall,
    turnsPerFight,
  })

  for (;;) {
    const node = hereIn(chain)
    if (node === null) return report('stuck', null)
    // art. 68: a thumb looks before it takes, and looking is what summons
    // the verb. art. 40: and it drinks whatever the room offers for free.
    ledgers = lookAround(ledgers, node)
    for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)

    // The median-finds row, taken where the wave asks for it: halfway down,
    // and standing at the last door. It is a *report*, never a bar — art. 3
    // and the no-mandated-offers boundary both mean nothing here may hold a
    // run to a count.
    const held = haulOver(woke, ledgers.permanent).count
    if (findsAtMid === null && node.step * 2 >= chain.length) findsAtMid = held
    if (node.type === 'warden') findsAtHall = held

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
        turnsPerFight.push(out.turns)
        if (!out.won) return report('died', node)
      }
    }

    if (door.ends === true) {
      // art. 3, and card 67: the last door refuses what it is not given —
      // and, now, what has not been turned. The walk has already pressed
      // every act the room offered, so a run holding the key has turned it.
      if (!opens(ledgers, ROOM_BOOK, node, door)) return report('refused', node)
      // card 31: and turning it wakes the keeper. A depth is finished by
      // beating the thing the door was built for, not by opening the door.
      const keeper = horrorIn(node)
      if (keeper !== null) {
        fights++
        fought.push(keeper.id)
        const out = fightItOut(ledgers, node, door, keeper)
        ledgers = out.ledgers
        turnsPerFight.push(out.turns)
        if (!out.won) return report('died', node)
      }
      return report('finished', node)
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
