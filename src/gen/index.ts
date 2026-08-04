/**
 * src/gen — the seeded blind chain, the room grammar, the winnability check
 * (arts 31–39).
 *
 * Rooms are hand-authored and arrive from `src/content`; this module only
 * arranges them, under constraints, and proves the arrangement can be
 * finished.
 *
 * This is the interim dealer. It deals a single path — a seeded shuffle
 * with hard placement — behind the signatures the real grammar engine will
 * keep: `deal`, `isWinnable`, `explainWinnability`. Art. 31's two-to-three
 * doors per room wait for that engine; the debt is written down in
 * DESIGN.md.
 */

import type { RoomId, Seed } from '../state/index.js'

/** art. 36: one seed derives the whole arrangement, so resume is exact. */
export interface Lot {
  next(): number
}

/**
 * A seeded source of chance. The same seed yields the same sequence on any
 * machine, which is the whole of art. 36: senses are stable, resume is
 * exact, and rerolling the labyrinth costs a death.
 */
export function lotFrom(seed: Seed): Lot {
  let state = (seed as number) >>> 0
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

/** art. 32: every death reseeds, and the next seed follows from this one. */
export function reseed(seed: Seed): Seed {
  const lot = lotFrom(seed)
  return (Math.floor(lot.next() * 0x7fffffff) || 1) as unknown as Seed
}

/** art. 37: the taxonomy the generator deals. Length is tuning, not law. */
export type RoomType =
  | 'passage'
  | 'lair'
  | 'puzzle'
  | 'trove'
  | 'omen'
  | 'sanctum'
  | 'merchant'
  | 'savior'
  | 'crossing'
  | 'warden'

declare const keyBrand: unique symbol
/** What a lock demands. art. 33: it must exist upstream of the lock. */
export type KeyId = string & { readonly [keyBrand]: 'key' }

/** A hand-authored room, as the generator deals it (art. 9). */
export interface RoomTemplate {
  readonly id: RoomId
  readonly type: RoomType
  /** Keys this room can hand over. */
  readonly grants: readonly KeyId[]
  /** What this room's door demands before it opens. */
  readonly demands: readonly KeyId[]
  /**
   * How a door into this room reads from the other side — one line, true
   * and incomplete (rules/voice.md). Authored in content; carried here.
   */
  readonly sense: string
  /** art. 30: set when this room's door is a fight rather than a walk. */
  readonly fight?: string
  /** art. 37: the Warden's door ends the depth instead of committing a room. */
  readonly ends?: boolean
}

export interface Catalog {
  readonly rooms: readonly RoomTemplate[]
}

/**
 * art. 31: a depth is a chain of rooms joined by doors; at each room, 2–3
 * doors, each sensed in one line. No map UI exists.
 */
export interface Door {
  /** art. 35: a door commits exactly one room. No hidden multi-room lanes. */
  readonly to: RoomId
  /** True, and incomplete — one line, authored in content (rules/voice.md). */
  readonly sense: string
  readonly demands: readonly KeyId[]
  /** art. 30: this door is a fight; the horror is content's to name. */
  readonly fight?: string
  /** art. 37: the Warden's door — past it the depth is finished. */
  readonly ends?: boolean
}

export interface ChainNode {
  readonly room: RoomId
  readonly type: RoomType
  readonly doors: readonly Door[]
}

/** Fixed anchors: the Crossing opens every run, the Warden's door ends it. */
export interface Chain {
  readonly seed: Seed
  readonly depth: number
  readonly start: RoomId
  readonly nodes: readonly ChainNode[]
}

/**
 * art. 38: rules, not templates. Every number here is tuning and arrives
 * from content; the generator only obeys.
 */
export interface Grammar {
  /** Pairs that may not stand next to each other. */
  readonly adjacencyBans: readonly (readonly [RoomType, RoomType])[]
  /** Types that must appear at least once per depth. */
  readonly guarantees: readonly RoomType[]
  /** Keys in the first half, locks in the last half. */
  readonly keyBand: readonly [number, number]
  readonly lockBand: readonly [number, number]
  readonly fightBand: readonly [number, number]
  /** art. 39: soft type-weights per depth — quiet shallow, teeth deep. */
  readonly weights: Readonly<Record<RoomType, number>>
}

/** A seeded shuffle. Fisher–Yates, so the same seed deals the same hand. */
export function shuffle<T>(items: readonly T[], lot: Lot): readonly T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(lot.next() * (i + 1))
    const a = out[i]!
    const b = out[j]!
    out[i] = b
    out[j] = a
  }
  return out
}

/**
 * art. 32: every death reseeds. Each run is a fresh arrangement of the
 * authored rooms — shuffled, then placed hard: the Crossing first, the
 * Warden's door last, whatever grants a key in the first half, and a
 * fight-door standing between the key and the lock (art. 38).
 *
 * The placement is hard rather than sampled-and-rejected, so `isWinnable`
 * can never be false for a chain this function dealt. That is the point:
 * blind play cannot dodge cruelty, so mercy lives in the math (art. 33).
 */
export function deal(seed: Seed, depth: number, catalog: Catalog, grammar: Grammar): Chain {
  const lot = lotFrom(seed)
  const rooms = catalog.rooms
  const crossings = rooms.filter((room) => room.type === 'crossing')
  const wardens = rooms.filter((room) => room.type === 'warden')
  const middles = rooms.filter((room) => room.type !== 'crossing' && room.type !== 'warden')

  const shuffled = shuffle(middles, lot)
  const keys = shuffled.filter((room) => room.grants.length > 0)
  const fights = shuffled.filter((room) => room.grants.length === 0 && room.fight !== undefined)
  const quiet = shuffled.filter(
    (room) => room.grants.length === 0 && room.fight === undefined,
  )

  // art. 38: the key band is the first half, the fight sits between the key
  // and the lock. Everything else is filler, split either side of them.
  const [, keyBandEnd] = grammar.keyBand
  const before = Math.min(quiet.length, Math.max(0, Math.round(quiet.length * keyBandEnd)))
  const order: readonly RoomTemplate[] = [
    ...crossings.slice(0, 1),
    ...quiet.slice(0, before),
    ...keys,
    ...fights,
    ...quiet.slice(before),
    ...wardens.slice(0, 1),
  ]

  const nodes: ChainNode[] = order.map((room, i) => {
    const next = order[i + 1]
    const doors: Door[] = []
    if (next !== undefined) {
      doors.push(door(next.id, next.sense, room.demands, room.fight, false))
    } else if (room.ends === true) {
      // art. 37: the Warden's door ends the depth. It commits no room.
      doors.push(door(room.id, room.sense, room.demands, room.fight, true))
    }
    return { room: room.id, type: room.type, doors }
  })

  return {
    seed,
    depth,
    start: nodes[0]?.room ?? ('' as RoomId),
    nodes,
  }
}

function door(
  to: RoomId,
  sense: string,
  demands: readonly KeyId[],
  fight: string | undefined,
  ends: boolean,
): Door {
  const base: Door = { to, sense, demands }
  if (fight !== undefined && ends) return { ...base, fight, ends: true }
  if (fight !== undefined) return { ...base, fight }
  if (ends) return { ...base, ends: true }
  return base
}

/**
 * art. 33: every arrangement must be winnable — on any path the player can
 * be forced down, whatever a lock demands exists upstream of it. Blind play
 * cannot dodge cruelty, so mercy lives in the math.
 */
export function isWinnable(chain: Chain, catalog: Catalog): boolean {
  return explainWinnability(chain, catalog).length === 0
}

/** Why a chain failed the check, so a failing seed can be read, not guessed. */
export interface Unwinnable {
  readonly room: RoomId
  readonly demanded: KeyId
  readonly reason: 'no-upstream-grant' | 'forced-past-grant' | 'unreachable'
}

export function explainWinnability(chain: Chain, catalog: Catalog): readonly Unwinnable[] {
  const templates = new Map<string, RoomTemplate>(
    catalog.rooms.map((room) => [room.id as string, room]),
  )
  const known = new Set<string>(chain.nodes.map((node) => node.room as string))
  const failures: Unwinnable[] = []
  const held = new Set<string>()

  for (const node of chain.nodes) {
    // The room is entered before its door is tried, so its grants are yours.
    for (const key of templates.get(node.room)?.grants ?? []) held.add(key)
    for (const gate of node.doors) {
      if (gate.ends !== true && !known.has(gate.to as string)) {
        failures.push({ room: node.room, demanded: '' as KeyId, reason: 'unreachable' })
        continue
      }
      for (const demanded of gate.demands) {
        if (held.has(demanded)) continue
        const granted = catalog.rooms.some((room) => room.grants.includes(demanded))
        failures.push({
          room: node.room,
          demanded,
          // The key exists but the chain put it downstream of its own lock.
          reason: granted ? 'forced-past-grant' : 'no-upstream-grant',
        })
      }
    }
  }
  return failures
}

/** Where a room stands in a dealt chain, or -1 when it is not in it. */
export function stepOf(chain: Chain, room: RoomId): number {
  return chain.nodes.findIndex((node) => node.room === room)
}

/** The node a room is, in the chain as dealt. */
export function nodeAt(chain: Chain, room: RoomId): ChainNode | null {
  return chain.nodes.find((node) => node.room === room) ?? null
}
