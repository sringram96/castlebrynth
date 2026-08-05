/**
 * What the dealer deals, as types. Every number in here is tuning and
 * arrives from `src/content`; the engine declares the shape and obeys.
 */

import type { EncounterId, InstanceId, ItemId, RoomId, Seed } from '../state/index.js'

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
/** What a lock demands. art. 80: whatever grants it arrives before it. */
export type KeyId = string & { readonly [keyBrand]: 'key' }

declare const regionBrand: unique symbol
/** art. 77: one of a depth's regions. How many there are is content. */
export type RegionId = string & { readonly [regionBrand]: 'region' }

declare const socketBrand: unique symbol
/** art. 83: a place in a room the room's own prose does not speak for. */
export type SocketId = string & { readonly [socketBrand]: 'socket' }

/**
 * art. 82's two identities and art. 84's meeting are all written onto a
 * ledger, so they are declared with the ledgers in `src/state` and used
 * here: `InstanceId` is where you stand, `EncounterId` is who you met.
 */
export type { EncounterId, InstanceId } from '../state/index.js'

/**
 * art. 83: what a socket will take. A socket is not a slot for anything —
 * a horror does not stand where a boon lies, and neither of them stands
 * where a mercy is offered (art. 40).
 */
export type EncounterKind = 'horror' | 'boon' | 'mercy'

/** art. 83, axis one: bound to a room, or floating into sockets. */
export type Binding = 'bound' | 'floating'

/**
 * art. 83, axis two: how an encounter repeats. `repeats` is free, `unique`
 * is once per run, and `remembers` is unique *and* carries a memory of the
 * player on the permanent ledger (art. 84). Nothing that remembers ships
 * yet — the merchant awaits the economy — but the axis is declared.
 */
export type Scope = 'repeats' | 'unique' | 'remembers'

/** art. 83: rooms declare sockets; the sockets carry their own words. */
export interface Socket {
  readonly id: SocketId
  readonly accepts: EncounterKind
  /**
   * How often the dealer fills it of its own accord, 0–1. A lair's horror
   * socket is 1; a boon socket is 0 until the economy gives the labyrinth
   * something to leave lying about. The just-in-time key (art. 80) ignores
   * this number — it fills a free socket because it must.
   */
  readonly chance: number
}

/**
 * A hand-authored room, as the generator deals it (art. 9).
 *
 * It grants nothing: art. 80 unbinds required items from rooms, so there is
 * no key room. What a room offers beyond its own walls arrives in a socket.
 */
export interface RoomTemplate {
  readonly id: RoomId
  readonly type: RoomType
  readonly sockets: readonly Socket[]
  /** What this room's doors demand before they open. */
  readonly demands: readonly KeyId[]
  /** art. 37: the Warden's door ends the depth instead of committing a room. */
  readonly ends?: boolean
}

/** art. 83: an encounter, on both of its axes. */
export interface Encounter {
  readonly id: EncounterId
  readonly kind: EncounterKind
  readonly binding: Binding
  readonly scope: Scope
  /**
   * art. 78: the region whose lock activates it. Null floats free of the
   * drift and may be dealt at any time.
   */
  readonly region: RegionId | null
  /** Weight against its peers when a socket is filled. */
  readonly weight: number
  /** art. 83: which room a bound encounter is bound to. */
  readonly at?: RoomId
  /** art. 30: the horror behind it, by identity, when it is a fight. */
  readonly horror?: string
  /** What a boon puts in your hands when its act is done. */
  readonly grants?: readonly ItemId[]
}

/** art. 77: a region of a depth, and the rooms its pool holds. */
export interface Region {
  readonly id: RegionId
  readonly rooms: readonly RoomId[]
}

/**
 * art. 80: a lock the depth is committed to before the player reaches it.
 * The dealer knows it is coming, so it puts what opens it in the path.
 */
export interface DepthLock {
  /** Which step the lock stands at. The Warden's door is the last room. */
  readonly at: number
  readonly demands: readonly KeyId[]
  /** The boon that satisfies it — placed just in time, never bound. */
  readonly key: EncounterId
}

/**
 * arts 37, 40: a room type the depth owes, dealt from the neutral pool
 * inside a band of steps.
 *
 * The soft type-weights (art. 39) lean; they do not promise. A mercy has to
 * be promised — a depth that deals no Sanctum is a depth with no healing in
 * it — so this is the room-shaped twin of art. 80's just-in-time key: the
 * dealer knows it owes one, and pays inside the band, with certainty at the
 * band's last step.
 *
 * The band is content's to set and content's to keep honest: art. 78 hands
 * the rest of the depth to the locked region, so a band that reached past
 * `lockAt` would be asking the dealer to deal a neutral room after the lock.
 * Keep `band[1]` below `lockAt`.
 */
export interface MercyPlan {
  readonly type: RoomType
  /** The first and last step it may be dealt at, both inclusive. */
  readonly band: readonly [number, number]
}

/**
 * One depth, as content authors it. arts 77–81: how many regions there are,
 * how long the depth is, and when the lock is forced are all knobs here and
 * nowhere in the engine.
 */
export interface DepthPlan {
  readonly depth: number
  /** art. 81: fixed rooms per depth, counting the Crossing and the Warden. */
  readonly length: number
  /** art. 78: the door count at which one region locks. */
  readonly lockAt: number
  readonly regions: readonly Region[]
  /** art. 77: the pool that belongs to no region and leans nowhere. */
  readonly neutral: readonly RoomId[]
  /** art. 39: this depth's tendencies — quiet shallow, teeth deep. */
  readonly tendencies: Readonly<Record<RoomType, number>>
  readonly locks: readonly DepthLock[]
  /** arts 37, 40: the room types this depth owes, and where they may fall. */
  readonly mercies: readonly MercyPlan[]
}

export interface Catalog {
  readonly rooms: readonly RoomTemplate[]
  readonly encounters: readonly Encounter[]
  readonly depths: readonly DepthPlan[]
}

/**
 * art. 38 (amended): rules, not templates. The mercy is in the construction
 * and the rhythm obligations are distributional — these are the pressures
 * the dealer leans with, not constraints it solves.
 */
export interface Grammar {
  /** Types that may not stand next to each other. A hard zero. */
  readonly adjacencyBans: readonly (readonly [RoomType, RoomType])[]
  /** Types the depth owes at least once. Steered, hard only at the last room. */
  readonly guarantees: readonly RoomType[]
  /** art. 38: how many fights a depth should hold. A band, tested across seeds. */
  readonly fightBand: readonly [number, number]
  /** art. 31: how often a room offers one, two, or three doors. */
  readonly doorWeights: readonly [number, number, number]
  /** art. 82: how hard the dealer leans off repeating the room it just dealt. */
  readonly clumpPenalty: number
  /** art. 77: how hard the tally leans the pools. Zero is a labyrinth that ignores you. */
  readonly driftPull: number
  /** art. 38: how hard an unmet band pulls the weights back toward itself. */
  readonly bandPull: number
}

/**
 * art. 31 (amended): one to three doors — one is a corridor moment, three a
 * crossroads. A door is a choice and nothing more: it does not name the room
 * behind it, because under art. 79 that room does not exist until the door
 * is opened.
 */
export interface Door {
  /** Which door of this room it is. The index *is* the choice (art. 36). */
  readonly at: number
  /**
   * art. 77: the hidden region tag. The player never sees it; a door's sense
   * would be exactly this leaking, and senses are parked with the hints.
   */
  readonly region: RegionId | null
  readonly demands: readonly KeyId[]
  /** art. 30: this door is a fight; the horror is content's to name. */
  readonly fight?: string
  /** art. 37: the Warden's door — past it the depth is finished. */
  readonly ends?: boolean
}

/** art. 83: what stands in one of a room's sockets, this time. */
export interface Fill {
  readonly socket: SocketId
  readonly encounter: EncounterId
}

/** One room, as dealt: an instance of a template, with what stands in it. */
export interface ChainNode {
  /** art. 82: where you are standing. Scene state keys on this. */
  readonly instance: InstanceId
  /** art. 82: what you recognise. Knowledge keys on this (art. 34). */
  readonly room: RoomId
  readonly type: RoomType
  readonly step: number
  /** Which pool it came out of. Null is the neutral pool (art. 77). */
  readonly region: RegionId | null
  readonly doors: readonly Door[]
  readonly fills: readonly Fill[]
  /** art. 78: set on the first room dealt after the lock. The arrival. */
  readonly announces: RegionId | null
}

/** art. 77: what the pattern of doors has said so far, and what it settled. */
export interface Drift {
  /** Tally per region. The neutral pool tallies under the empty string. */
  readonly tally: Readonly<Record<string, number>>
  /** art. 78: null until the forced lock, and never null after it. */
  readonly locked: RegionId | null
  /** How many doors have been opened. */
  readonly opened: number
}

/**
 * The run's history graph, replayed (arts 36, 79). `nodes` holds every room
 * dealt, in order, and each node's doors hold every door offered; the door
 * taken at step *i* is `history.taken[i]`. Nothing past the last node exists.
 */
export interface Chain {
  readonly seed: Seed
  readonly depth: number
  /** art. 81: how many rooms this depth is. */
  readonly length: number
  readonly start: InstanceId
  readonly nodes: readonly ChainNode[]
  readonly drift: Drift
}
