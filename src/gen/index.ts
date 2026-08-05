/**
 * src/gen — the drift: the seeded blind chain, the room grammar, and
 * winnability by construction (arts 31–39, 77–82).
 *
 * Rooms are hand-authored and arrive from `src/content`; this module only
 * arranges them, and it arranges them lazily. A room is dealt when its door
 * is opened, derived from the seed plus the choices made — so the road not
 * taken is never computed, and nothing about it can leak (art. 79).
 *
 * The three signatures the shell knows have not moved: `deal`, `isWinnable`
 * and `explainWinnability`. What `deal` returns is now the run's history
 * graph replayed, rather than a whole depth laid out in advance.
 */

import type { RoomId, RunHistory, Seed } from '../state/index.js'
import { instanceOf } from '../state/index.js'
import { FRESH_DRIFT, locked, poolRooms, pools, pull, tallied } from './drift.js'
import type { Lot } from './lot.js'
import { SALT, lotAt, pick, pickAt, pickSome } from './lot.js'
import type {
  Catalog,
  Chain,
  ChainNode,
  DepthPlan,
  Door,
  Drift,
  Encounter,
  EncounterId,
  Fill,
  Grammar,
  InstanceId,
  KeyId,
  MercyPlan,
  RegionId,
  RoomTemplate,
  RoomType,
  Socket,
} from './types.js'

export type {
  Binding,
  Catalog,
  Chain,
  ChainNode,
  DepthLock,
  DepthPlan,
  Door,
  Drift,
  Encounter,
  EncounterId,
  EncounterKind,
  Fill,
  Grammar,
  InstanceId,
  KeyId,
  MercyPlan,
  Region,
  RegionId,
  RoomTemplate,
  RoomType,
  Scope,
  Socket,
  SocketId,
} from './types.js'
export type { Lot } from './lot.js'
export { lotFrom, reseed, shuffle } from './lot.js'
export { FRESH_DRIFT, NEUTRAL, tallyOf } from './drift.js'

/** A run that has opened no door yet. Every run starts here (art. 36). */
export const NO_HISTORY: RunHistory = { taken: [] }

/**
 * The catalog and the grammar, carried together. A door commits a room, and
 * committing a room means dealing one — so whatever walks the player through
 * a door has to be holding these.
 */
export interface Dealer {
  readonly catalog: Catalog
  readonly grammar: Grammar
}

export function dealerOf(catalog: Catalog, grammar: Grammar): Dealer {
  return { catalog, grammar }
}

/**
 * The run so far, dealt (arts 36, 79).
 *
 * With no history this is the Crossing and the doors in front of it. With a
 * history it is every room those choices dealt, in order, and the doors in
 * front of the last one. Nothing beyond that is computed — not the room
 * behind an untaken door, not the room behind the door you are about to
 * open. Replaying the same seed with the same choices replays the same
 * rooms, which is the whole of exact resume.
 */
export function deal(
  seed: Seed,
  depth: number,
  catalog: Catalog,
  grammar: Grammar,
  history: RunHistory = NO_HISTORY,
): Chain {
  const plan = planFor(catalog, depth)
  if (plan === null || plan.length <= 0 || catalog.rooms.length === 0) {
    return { seed, depth, length: 0, start: '' as InstanceId, nodes: [], drift: FRESH_DRIFT }
  }

  const taken = history.taken
  const templates = new Map<string, RoomTemplate>(
    catalog.rooms.map((room) => [room.id as string, room]),
  )
  const encounters = new Map<string, Encounter>(
    catalog.encounters.map((one) => [one.id as string, one]),
  )
  const keyed = new Set<string>(plan.locks.map((lock) => lock.key as string))

  const nodes: ChainNode[] = []
  let drift: Drift = FRESH_DRIFT

  // ── Which room, out of which pool ────────────────────────────────────

  const anchor = (type: RoomType): RoomTemplate | null =>
    catalog.rooms.find((room) => room.type === type) ?? null

  const fightsSoFar = (): number =>
    nodes.filter((node) =>
      node.fills.some((fill) => encounters.get(fill.encounter as string)?.kind === 'horror'),
    ).length

  /** Rooms still to be dealt after this one, before the Warden's room. */
  const middlesLeft = (step: number): number => Math.max(0, plan.length - 2 - step)

  const banned = (before: RoomType | undefined, type: RoomType): boolean =>
    before !== undefined &&
    grammar.adjacencyBans.some(([one, other]) => one === before && other === type)

  /** art. 38: the fight band is a pressure, not a solved constraint. */
  const bandSteer = (template: RoomTemplate, step: number): number => {
    const [least, most] = grammar.fightBand
    const fights = fightsSoFar()
    const left = middlesLeft(step)
    const brings = template.sockets.some(
      (socket) => socket.accepts === 'horror' && socket.chance >= 1,
    )
    // The pull is scaled by how little room is left to pay the debt in. A
    // band that leaned this hard from the first room would not be a band —
    // it would be a template with extra steps (art. 38).
    const urgency = 1 / Math.max(1, left)
    if (brings) {
      if (fights >= most) return 1 / (1 + grammar.bandPull)
      if (fights + left < least) return 1 + grammar.bandPull * 4
      if (fights < least) return 1 + grammar.bandPull * urgency
      return 1
    }
    if (fights + left < least) return 1 / (1 + grammar.bandPull * 4)
    if (fights >= most) return 1 + grammar.bandPull
    return 1
  }

  /** Types the depth still owes. The anchors pay themselves (art. 37). */
  const owedTypes = (): readonly RoomType[] =>
    grammar.guarantees.filter(
      (type) =>
        type !== 'crossing' && type !== 'warden' && !nodes.some((node) => node.type === type),
    )

  const guaranteeSteer = (template: RoomTemplate, step: number): number => {
    const owed = owedTypes()
    if (owed.length === 0) return 1
    if (owed.includes(template.type)) {
      return 1 + (grammar.bandPull * 4) / Math.max(1, middlesLeft(step))
    }
    // The depth owes exactly as many rooms as it has left to deal.
    return owed.length > middlesLeft(step) ? 0 : 1
  }

  const roomWeight = (template: RoomTemplate, step: number): number => {
    const before = nodes[step - 1]
    if (banned(before?.type, template.type)) return 0
    let weight = plan.tendencies[template.type] ?? 0
    // art. 82: rooms may repeat within a run, but not back to back.
    if (before !== undefined && before.room === template.id) weight *= grammar.clumpPenalty
    return weight * bandSteer(template, step) * guaranteeSteer(template, step)
  }

  const chooseRoom = (step: number): { template: RoomTemplate; region: RegionId | null } => {
    const lot = lotAt(seed, depth, taken, step, SALT.room)
    const offered = pools(drift, plan)
    const drawnAt = pickAt(offered, (one) => pull(drift, one, grammar), lot)
    const region = drawnAt < 0 ? null : (offered[drawnAt] ?? null)
    const pool = poolRooms(plan, region)
      .map((id) => templates.get(id))
      .filter((held): held is RoomTemplate => held !== undefined)
    const candidates = pool.length > 0 ? pool : middles(catalog)
    const chosen =
      pick(candidates, (held) => roomWeight(held, step), lot) ??
      // Mercy in the math (art. 38): a pool the pressures have zeroed out
      // still deals a room rather than stranding the run.
      pick(candidates, (held) => plan.tendencies[held.type] ?? 1, lot) ??
      candidates[0]
    if (chosen === undefined) throw new Error(`depth ${depth} has no room to deal at step ${step}`)
    return { template: chosen, region }
  }

  /**
   * arts 37, 40: a room type the depth owes and has not paid yet, if this
   * step is inside its band. The depth may owe several; the first unpaid one
   * whose band covers this step is the one dealt.
   */
  const owedMercy = (step: number): MercyPlan | null =>
    plan.mercies.find(
      (one) =>
        step >= one.band[0] &&
        step <= one.band[1] &&
        !nodes.some((node) => node.type === one.type),
    ) ?? null

  /**
   * The mercy, dealt out of the neutral pool (art. 77) so that no lean of the
   * drift can steer a run away from it. The chance rises as the band closes
   * and reaches certainty at its last step, exactly as art. 80's key does —
   * the same shape of promise, kept about a room instead of an item.
   */
  const mercyAt = (step: number): { template: RoomTemplate; region: RegionId | null } | null => {
    const owed = owedMercy(step)
    if (owed === null) return null
    const pool = poolRooms(plan, null)
      .map((id) => templates.get(id))
      .filter((held): held is RoomTemplate => held !== undefined && held.type === owed.type)
    if (pool.length === 0) return null
    const lot = lotAt(seed, depth, taken, step, SALT.mercy)
    const chances = owed.band[1] - step + 1
    if (chances > 1 && lot.next() >= 1 / chances) return null
    const chosen = pick(pool, () => 1, lot) ?? pool[0]
    return chosen === undefined ? null : { template: chosen, region: null }
  }

  // ── What stands in the room ──────────────────────────────────────────

  const placedAlready = (): Set<string> => {
    const seen = new Set<string>()
    for (const node of nodes) {
      for (const fill of node.fills) {
        seen.add(fill.encounter as string)
        // art. 89: the side of a fork you did not take is spent too. It was
        // offered and it closed; a run does not get to be offered it twice.
        if (fill.orElse !== undefined) seen.add(fill.orElse as string)
      }
    }
    return seen
  }

  /** art. 78: a region's encounters wake when that region locks. */
  const awake = (one: Encounter): boolean =>
    one.region === null || one.region === drift.locked

  const once = (one: Encounter): boolean => one.scope !== 'repeats'

  /** Whether this step is inside the band the encounter declared, if any. */
  const inBand = (one: Encounter, step: number): boolean =>
    one.band === undefined || (step >= one.band[0] && step <= one.band[1])

  const fillSockets = (step: number, template: RoomTemplate): readonly Fill[] => {
    const lot = lotAt(seed, depth, taken, step, SALT.fills)
    const free: Socket[] = [...template.sockets]
    const fills: Fill[] = []
    const placed = placedAlready()

    /**
     * art. 89: a good that names an alternative brings it into the same
     * socket, when the alternative is itself free to be dealt here. Both are
     * marked placed — a fork spends two goods to make one decision, and the
     * side you leave is spent as surely as the side you take.
     */
    const forkFor = (one: Encounter): Encounter | null => {
      if (one.orElse === undefined) return null
      const other = encounters.get(one.orElse as string)
      if (other === undefined || other === one) return null
      if (keyed.has(other.id as string)) return null
      if (!awake(other) || !inBand(other, step)) return null
      if (once(other) && placed.has(other.id as string)) return null
      return other
    }

    const stand = (socket: Socket, one: Encounter): void => {
      const other = forkFor(one)
      fills.push(
        other === null
          ? { socket: socket.id, encounter: one.id }
          : { socket: socket.id, encounter: one.id, orElse: other.id },
      )
      free.splice(free.indexOf(socket), 1)
      placed.add(one.id as string)
      if (other !== null) placed.add(other.id as string)
    }

    // art. 83: a bound encounter stands where it is bound, when it is awake.
    for (const one of catalog.encounters) {
      if (one.binding !== 'bound' || one.at !== template.id) continue
      if (!awake(one) || !inBand(one, step)) continue
      if (once(one) && placed.has(one.id as string)) continue
      const socket = free.find((held) => held.accepts === one.kind)
      if (socket !== undefined) stand(socket, one)
    }

    // art. 80: keys arrive just in time, and before anything optional can
    // take the socket they need. The chance rises as the lock comes closer
    // and reaches certainty at the last room that can hold it, so the run
    // cannot be dealt into a refusal.
    for (const lock of plan.locks) {
      if (lock.at <= step || placed.has(lock.key as string)) continue
      const one = encounters.get(lock.key as string)
      if (one === undefined) continue
      const socket = free.find((held) => held.accepts === one.kind)
      if (socket === undefined) continue
      const chances = lock.at - step
      const keyLot = lotAt(seed, depth, taken, step, SALT.key + lock.at * 97)
      if (chances <= 1 || keyLot.next() < 1 / chances) stand(socket, one)
    }

    // Whatever floats, by the socket's own chance (art. 83).
    for (const socket of [...free]) {
      if (!free.includes(socket)) continue
      if (lot.next() >= socket.chance) continue
      const offers = catalog.encounters.filter(
        (one) =>
          one.binding === 'floating' &&
          one.kind === socket.accepts &&
          !keyed.has(one.id as string) &&
          awake(one) &&
          inBand(one, step) &&
          !(once(one) && placed.has(one.id as string)),
      )
      const drawn = pick(offers, (one) => one.weight, lot)
      if (drawn !== null) stand(socket, drawn)
    }

    return fills
  }

  // ── The doors in front of you ────────────────────────────────────────

  const fightIn = (fills: readonly Fill[]): string | undefined => {
    for (const fill of fills) {
      const one = encounters.get(fill.encounter as string)
      if (one?.kind === 'horror' && one.horror !== undefined) return one.horror
    }
    return undefined
  }

  const doorCount = (lot: Lot): number =>
    pick([1, 2, 3], (n) => grammar.doorWeights[n - 1] ?? 0, lot) ?? 1

  const dealDoors = (
    step: number,
    template: RoomTemplate,
    fills: readonly Fill[],
  ): readonly Door[] => {
    // art. 37: the Warden's door ends the depth. It commits no room, so it
    // is one door and it carries no tag — there is nothing left to lean.
    if (step >= plan.length - 1) {
      return [{ at: 0, region: null, demands: template.demands, ends: true }]
    }
    const lot = lotAt(seed, depth, taken, step, SALT.doors)
    const wanted = doorCount(lot)
    const tagLot = lotAt(seed, depth, taken, step, SALT.tags)
    const offered = pools(drift, plan)
    const tags: readonly (RegionId | null)[] =
      drift.locked !== null
        ? Array.from({ length: wanted }, () => drift.locked)
        : pickSome(offered, wanted, (one) => pull(drift, one, grammar), tagLot)
    const fight = fightIn(fills)
    return tags.map((region, at) => {
      const base: Door = { at, region, demands: template.demands }
      return fight === undefined ? base : { ...base, fight }
    })
  }

  // ── The replay ───────────────────────────────────────────────────────

  const dealAt = (step: number, announces: RegionId | null): ChainNode => {
    const last = step >= plan.length - 1
    const fixed = step === 0 ? anchor('crossing') : last ? anchor('warden') : null
    // The anchors first (art. 37), then what the depth owes (art. 40), then
    // the ordinary weighted draw.
    const drawn =
      fixed !== null
        ? { template: fixed, region: null }
        : (mercyAt(step) ?? chooseRoom(step))
    const template = drawn.template
    const fills = fillSockets(step, template)
    return {
      // art. 82: the instance is where you stand, and where you stand in a
      // forward-only run is exactly how far down you are.
      instance: instanceOf(template.id, step),
      room: template.id,
      type: template.type,
      step,
      region: drawn.region,
      doors: dealDoors(step, template, fills),
      fills,
      announces,
    }
  }

  nodes.push(dealAt(0, null))
  for (let i = 0; i < taken.length; i++) {
    if (nodes.length >= plan.length) break
    const here = nodes[i]
    const door = here?.doors[taken[i] ?? -1]
    // A choice that is not on the table ends the replay rather than
    // inventing one, and the Warden's door commits no room (art. 37).
    if (door === undefined || door.ends === true) break
    const before = drift.locked
    drift = tallied(drift, door.region)
    drift = locked(drift, plan, lotAt(seed, depth, taken, i, SALT.lock))
    // art. 78: the first room after the lock announces the arrival.
    const announces = before === null && drift.locked !== null ? drift.locked : null
    nodes.push(dealAt(i + 1, announces))
  }

  return {
    seed,
    depth,
    length: plan.length,
    start: nodes[0]?.instance ?? ('' as InstanceId),
    nodes,
    drift,
  }
}

function planFor(catalog: Catalog, depth: number): DepthPlan | null {
  return catalog.depths.find((plan) => plan.depth === depth) ?? null
}

function middles(catalog: Catalog): readonly RoomTemplate[] {
  return catalog.rooms.filter((room) => room.type !== 'crossing' && room.type !== 'warden')
}

// ── Winnability, by construction (arts 33, 80) ─────────────────────────

/**
 * art. 33: every arrangement must be winnable. Under art. 80 this is no
 * longer a search over a laid-out depth — the key is placed into the path
 * ahead of its lock, so a chain cannot be dealt into a refusal. This is the
 * assertion of that, not the mechanism: it reads a run as dealt and says
 * whether anything in it was ever demanded before it was offered.
 */
export function isWinnable(chain: Chain, catalog: Catalog): boolean {
  return explainWinnability(chain, catalog).length === 0
}

/** Why a run failed the check, so a failing seed can be read, not guessed. */
export interface Unwinnable {
  readonly room: RoomId
  readonly demanded: KeyId
  readonly reason: 'no-upstream-grant' | 'forced-past-grant'
}

export function explainWinnability(chain: Chain, catalog: Catalog): readonly Unwinnable[] {
  const encounters = new Map<string, Encounter>(
    catalog.encounters.map((one) => [one.id as string, one]),
  )
  const anywhere = new Set<string>(
    catalog.encounters.flatMap((one) => (one.grants ?? []).map((item) => item as string)),
  )
  const failures: Unwinnable[] = []
  const held = new Set<string>()

  for (const node of chain.nodes) {
    // The room is entered before its doors are tried, so what stands in its
    // sockets is yours to take before any of them is asked for.
    for (const fill of node.fills) {
      for (const item of encounters.get(fill.encounter as string)?.grants ?? []) {
        held.add(item as string)
      }
    }
    for (const gate of node.doors) {
      for (const demanded of gate.demands) {
        if (held.has(demanded as string)) continue
        failures.push({
          room: node.room,
          demanded,
          // The key exists, but this run put it downstream of its own lock.
          reason: anywhere.has(demanded as string) ? 'forced-past-grant' : 'no-upstream-grant',
        })
      }
    }
  }
  return failures
}

// ── Reading a dealt run ────────────────────────────────────────────────

/** Where an instance stands in the run as dealt, or -1 when it is not in it. */
export function stepOf(chain: Chain, instance: InstanceId): number {
  return chain.nodes.findIndex((node) => node.instance === instance)
}

/** The node an instance is, in the run as dealt (art. 82). */
export function nodeAt(chain: Chain, instance: InstanceId): ChainNode | null {
  return chain.nodes.find((node) => node.instance === instance) ?? null
}

/** Where the run stands now: the last room dealt. */
export function hereIn(chain: Chain): ChainNode | null {
  return chain.nodes.at(-1) ?? null
}

/**
 * art. 84: who this room puts in front of you, so a meeting can be kept.
 * Both halves of a fork count — you stood in the room with both of them, and
 * a meeting is about standing there, not about what you walked out with.
 */
export function meetings(node: ChainNode | null): readonly EncounterId[] {
  return (
    node?.fills.flatMap((fill) =>
      fill.orElse === undefined ? [fill.encounter] : [fill.encounter, fill.orElse],
    ) ?? []
  )
}

/** The encounter an id names, for content and the shell to read (art. 83). */
export function encounterOf(catalog: Catalog, id: EncounterId): Encounter | null {
  return catalog.encounters.find((one) => one.id === id) ?? null
}
