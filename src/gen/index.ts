/**
 * src/gen — the seeded blind chain, the room grammar, the winnability check
 * (arts 31–39).
 *
 * Stubs only. Rooms are hand-authored and arrive from `src/content`; this
 * module only arranges them, under constraints, and proves the arrangement
 * can be finished.
 */

import type { RoomId, Seed } from '../state/index.js'

const unimplemented = (): never => {
  throw new Error('not implemented')
}

/** art. 36: one seed derives the whole arrangement, so resume is exact. */
export interface Lot {
  next(): number
}

export function lotFrom(seed: Seed): Lot {
  return unimplemented()
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

/** art. 32: every death reseeds. Each run is a fresh arrangement. */
export function deal(
  seed: Seed,
  depth: number,
  catalog: Catalog,
  grammar: Grammar,
): Chain {
  return unimplemented()
}

/**
 * art. 33: every arrangement must be winnable — on any path the player can
 * be forced down, whatever a lock demands exists upstream of it. Blind play
 * cannot dodge cruelty, so mercy lives in the math.
 */
export function isWinnable(chain: Chain, catalog: Catalog): boolean {
  return unimplemented()
}

/** Why a chain failed the check, so a failing seed can be read, not guessed. */
export interface Unwinnable {
  readonly room: RoomId
  readonly demanded: KeyId
  readonly reason: 'no-upstream-grant' | 'forced-past-grant' | 'unreachable'
}

export function explainWinnability(
  chain: Chain,
  catalog: Catalog,
): readonly Unwinnable[] {
  return unimplemented()
}
