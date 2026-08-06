/**
 * Walking a run under a scripted policy.
 *
 * The drift cannot be proven per-seed (art. 38, amended): a single run says
 * nothing about whether the labyrinth leans, and a single seed says nothing
 * about whether the band holds. So the tests drive thousands of runs through
 * policies that stand for the ways a person plays — always the same door,
 * always toward one region, a coin flip — and ask about the distribution.
 *
 * Nothing here is content. The policies are stand-ins for thumbs.
 */

import {
  BARE_BODY,
  CATALOG,
  GRAMMAR,
  HAND_SIZE,
  PLAIN_POUCH,
  ROOM_BOOK,
} from '../src/content/index.js'
import { act, actsIn, chooseDoor, mayLeave, opens, tappablesIn } from '../src/descent/index.js'
import type { Catalog, Chain, ChainNode, Door, Grammar, RegionId } from '../src/gen/index.js'
import { NO_HISTORY, deal, dealerOf, hereIn, lotFrom, meetings } from '../src/gen/index.js'
import type { Ledgers, RunHistory, Seed } from '../src/state/index.js'
import { collect, firstPermanent, lookedAt, meet, movedTo, tookDoor, wake } from '../src/state/index.js'
import type { Die, Talisman, Wearable } from '../src/lots/index.js'

export const DEALER = dealerOf(CATALOG, GRAMMAR)
export const seedOf = (n: number): Seed => n as unknown as Seed

/** A thumb, as a function: which of the doors in front of you it opens. */
export type Policy = (doors: readonly Door[], chain: Chain) => number

/** The corridor-hugger: always the first door, whatever it is tagged. */
export const alwaysLeft: Policy = () => 0

/** The last door, which is a different blind habit from the first. */
export const alwaysRight: Policy = (doors) => doors.length - 1

/** The committed player: this region whenever it is offered, else the first. */
export function leaning(region: RegionId): Policy {
  return (doors) => {
    const at = doors.findIndex((door) => door.region === region)
    return at < 0 ? 0 : at
  }
}

/** The player who refuses to commit: never this region if there is a choice. */
export function avoiding(region: RegionId): Policy {
  return (doors) => {
    const at = doors.findIndex((door) => door.region !== region)
    return at < 0 ? 0 : at
  }
}

/** No plan at all. Seeded, so a failing run can be run again (art. 36). */
export function coinFlip(seed: number): Policy {
  const lot = lotFrom(seedOf(seed))
  return (doors) => Math.floor(lot.next() * doors.length)
}

/** Whether this room's door ends the depth rather than committing a room. */
function spent(node: ChainNode | null): boolean {
  return node === null || node.doors.length === 0 || node.doors[0]?.ends === true
}

/**
 * One run, dealt to its end under a policy. Nothing about the road not taken
 * is ever asked for — the walk only ever opens a door that is in front of it.
 */
export function runOf(seed: number, policy: Policy, depth = 1): Chain {
  return runWith(CATALOG, GRAMMAR, seed, policy, depth)
}

/**
 * The same, against a catalog and a grammar the caller made up. art. 39's
 * tendencies are content, so the only way to show they weight anything is to
 * change them and watch the distribution move.
 */
export function runWith(
  catalog: Catalog,
  grammar: Grammar,
  seed: number,
  policy: Policy,
  depth = 1,
): Chain {
  let history: RunHistory = NO_HISTORY
  let chain = deal(seedOf(seed), depth, catalog, grammar, history)
  while (chain.nodes.length < chain.length && !spent(hereIn(chain))) {
    const node = hereIn(chain)
    if (node === null) break
    const at = Math.min(Math.max(0, policy(node.doors, chain)), node.doors.length - 1)
    history = { taken: [...history.taken, at] }
    chain = deal(seedOf(seed), depth, catalog, grammar, history)
  }
  return chain
}

/** How the run went, in the terms the distributional laws are stated in. */
export interface Report {
  readonly chain: Chain
  readonly rooms: readonly string[]
  readonly types: readonly string[]
  readonly fights: number
  readonly locked: RegionId | null
  readonly lockedAfter: number
  readonly announcements: number
  readonly doorCounts: readonly number[]
}

export function reportOf(chain: Chain): Report {
  const fights = chain.nodes.filter((node) =>
    node.fills.some((fill) => fill.socket === ('socket.far' as unknown as string)),
  ).length
  const lockedAfter = chain.nodes.findIndex((node) => node.announces !== null)
  return {
    chain,
    rooms: chain.nodes.map((node) => node.room as string),
    types: chain.nodes.map((node) => node.type),
    fights,
    locked: chain.drift.locked,
    lockedAfter,
    announcements: chain.nodes.filter((node) => node.announces !== null).length,
    doorCounts: chain.nodes.filter((node) => node.doors[0]?.ends !== true).map((n) => n.doors.length),
  }
}

// ── Walking with a run on the ledger, for art. 3 ───────────────────────

/**
 * A fresh run at the Crossing, and the chain as dealt for it.
 *
 * `carrying` is what the player wakes with — a pouch grown by earlier runs,
 * and the wearables off them. Empty is a first waking (art. 55), which is
 * what almost every test wants; the exception is the measurement that asks
 * what a *taught* run's odds are, and that one has to be able to say so.
 */
export function opened(
  seed: number,
  carrying: {
    readonly dice?: readonly Die[]
    readonly worn?: readonly Wearable[]
    readonly keepsakes?: readonly Talisman[]
  } = {},
): { ledgers: Ledgers; chain: Chain } {
  let permanent = firstPermanent(
    { dice: [...(carrying.dice ?? []), ...PLAIN_POUCH.dice] },
    HAND_SIZE,
    BARE_BODY,
  )
  for (const wearable of carrying.worn ?? []) permanent = collect(permanent, wearable)
  // art. 53: a keepsake is permanent, so a returning run brings it down —
  // and the levels wave is the first thing that makes that measurable.
  for (const kept of carrying.keepsakes ?? []) permanent = collect(permanent, kept)
  const ledgers = wake(permanent, seedOf(seed))
  return { ledgers, chain: deal(seedOf(seed), 1, CATALOG, GRAMMAR, ledgers.run!.history) }
}

/**
 * art. 84: standing in a room with something in it is meeting it, and that
 * crosses to the permanent at once. This is what the shell does on arrival.
 */
export function greet(ledgers: Ledgers, chain: Chain): Ledgers {
  let permanent = ledgers.permanent
  for (const who of meetings(hereIn(chain))) permanent = meet(permanent, who)
  return permanent === ledgers.permanent ? ledgers : { ...ledgers, permanent }
}

/**
 * art. 68 (strengthened): a thumb looks before it takes, and an act about a
 * thing does not exist until the thing has been tapped. Every walk in these
 * tests therefore looks at everything in the room first — which is what a
 * player does, and what the shell records on each tap.
 */
export function lookAround(ledgers: Ledgers, node: ChainNode): Ledgers {
  let run = ledgers.run
  if (run === null) return ledgers
  for (const target of tappablesIn(ROOM_BOOK, node)) {
    run = lookedAt(run, node.instance, target.id)
  }
  return { ...ledgers, run }
}

/** What a room offers that the run has not taken yet. */
export function takeable(ledgers: Ledgers, node: ChainNode) {
  return actsIn(ROOM_BOOK, node).filter(
    (one) => !(ledgers.run?.did ?? []).includes(`${node.instance}|${one.id}`),
  )
}

/**
 * A whole run, played by a policy, with the law switched on or off.
 *
 * With the law on this is what a player can do: take what is required before
 * leaving, then open a door. With it off it is what the playtest did — walk
 * past everything — which is the control that keeps the test honest.
 */
export function playRun(
  seed: number,
  policy: Policy,
  obeyTheLaw: boolean,
  greedy = true,
): { ledgers: Ledgers; chain: Chain; refused: boolean } {
  let { ledgers, chain } = opened(seed)
  ledgers = greet(ledgers, chain)
  for (;;) {
    const node = hereIn(chain)
    if (node === null) break
    ledgers = lookAround(ledgers, node)
    if (greedy) for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)
    if (obeyTheLaw && !mayLeave(ledgers, ROOM_BOOK, node)) break
    const gate = node.doors[Math.min(Math.max(0, policy(node.doors, chain)), node.doors.length - 1)]
    if (gate === undefined) break
    if (gate.ends === true) {
      // The Warden's door: it refuses what it is not given, and — card 67 —
      // what has not been turned. A greedy walk presses everything the room
      // offers, so a run carrying the key has turned the lock by now.
      return { ledgers, chain, refused: !opens(ledgers, ROOM_BOOK, node, gate) }
    }
    const walked = obeyTheLaw
      ? chooseDoor(ledgers, chain, ROOM_BOOK, gate, DEALER)
      : bareWalk(ledgers, chain, gate)
    ledgers = walked.ledgers
    chain = walked.chain
    ledgers = greet(ledgers, chain)
  }
  return { ledgers, chain, refused: false }
}

/**
 * A run walked forward until it is standing in a room a predicate names.
 *
 * Only what the room *requires* is taken on the way (art. 3), so nothing
 * optional is spent before the thing under test is reached — and the room it
 * stops in has been looked at, because a verb that has not been summoned is
 * a verb that is not there (art. 68).
 */
export function walkTo(
  seed: number,
  wanted: (node: ChainNode) => boolean,
  policy: Policy = alwaysLeft,
): { ledgers: Ledgers; chain: Chain; node: ChainNode } | null {
  let { ledgers, chain } = opened(seed)
  ledgers = greet(ledgers, chain)
  for (let n = 0; n < chain.length + 2; n++) {
    const node = hereIn(chain)
    if (node === null) return null
    if (wanted(node)) return { ledgers: lookAround(ledgers, node), chain, node }
    ledgers = lookAround(ledgers, node)
    for (const one of takeable(ledgers, node).filter((held) => held.required)) {
      ledgers = act(ledgers, one)
    }
    const door = node.doors[Math.min(Math.max(0, policy(node.doors, chain)), node.doors.length - 1)]
    if (door === undefined || door.ends === true) return null
    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
    ledgers = walked.ledgers
    chain = walked.chain
    ledgers = greet(ledgers, chain)
  }
  return null
}

/** A run standing in a room with teeth in it, and the door that is the fight. */
export interface AtAFight {
  readonly ledgers: Ledgers
  readonly chain: Chain
  readonly node: ChainNode
  readonly door: Door
}

/**
 * Walk a run until something with teeth stands in the room (art. 83).
 *
 * There is no lair to look up any more: horrors float into sockets, so where
 * a fight is depends on the seed and on the choices. Every depth has at
 * least one (art. 38's guarantee), so this always finds one.
 */
export function atAFight(seed: number, policy: Policy = alwaysLeft): AtAFight {
  let { ledgers, chain } = opened(seed)
  for (;;) {
    const node = hereIn(chain)
    if (node === null) throw new Error(`seed ${seed} dealt no room`)
    const gate = node.doors.find((door) => door.fight !== undefined)
    if (gate !== undefined) return { ledgers, chain, node, door: gate }
    ledgers = lookAround(ledgers, node)
    for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)
    const door = node.doors[Math.min(Math.max(0, policy(node.doors, chain)), node.doors.length - 1)]
    if (door === undefined || door.ends === true) {
      throw new Error(`seed ${seed} held no fight`)
    }
    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
    ledgers = walked.ledgers
    chain = walked.chain
  }
}

/**
 * The move `chooseDoor` used to be, before art. 3: the choice goes into the
 * history and the run stands wherever that lands it, whatever was left lying
 * on the floor. This is the playtest, reproduced — the control that proves
 * the law is doing the work rather than describing what happens anyway.
 */
function bareWalk(ledgers: Ledgers, chain: Chain, gate: Door): { ledgers: Ledgers; chain: Chain } {
  const run = ledgers.run!
  const moved = tookDoor(run, gate.at)
  const dealt = deal(run.seed, run.depth, CATALOG, GRAMMAR, moved.history)
  const arrived = dealt.nodes.at(-1)!
  return {
    ledgers: {
      ...ledgers,
      run: movedTo(moved, {
        room: arrived.room,
        instance: arrived.instance,
        step: arrived.step,
        beat: 0,
      }),
    },
    chain: dealt,
  }
}
