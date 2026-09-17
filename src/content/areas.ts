/** Exploration content. Keys open passages; none alter a combat roll. */
import type { Territory } from './roomTypes.js'

export type AreaId = 'ossuary' | 'bellworks' | 'deep'
export type KeyId = 'bone-key' | 'bell-clapper' | 'warden-seal'
export type Direction = 'north' | 'east' | 'south' | 'west'

export const KEYS: Readonly<Record<KeyId, { readonly name: string; readonly purpose: string }>> = {
  'bone-key': { name: 'Bone Key', purpose: 'Opens the Ossuary keeper’s door. Kept after use.' },
  'bell-clapper': { name: 'Bell Clapper', purpose: 'Releases the Bellworks keeper’s gate. Kept after use.' },
  'warden-seal': { name: 'Warden Seal', purpose: 'Opens the last door in the Deep. Kept after use.' },
}

export interface Area {
  readonly id: AreaId
  readonly name: string
  readonly territory: Territory
  readonly key: KeyId
  readonly boss: string
  readonly bossRoom: string
  readonly rooms: readonly string[]
  readonly keyRoom: string
  readonly loops: number
}

export const AREAS: readonly Area[] = [
  { id: 'ossuary', name: 'The Ossuary', territory: 'ossuary', key: 'bone-key',
    boss: 'gnawing', bossRoom: 'maze-ossuary-keeper', loops: 1,
    rooms: ['maze-bone-walk', 'maze-candle-court', 'maze-burial-gallery'], keyRoom: 'maze-bone-reliquary' },
  { id: 'bellworks', name: 'The Bellworks', territory: 'chapel', key: 'bell-clapper',
    boss: 'marrow', bossRoom: 'maze-bellworks-keeper', loops: 2,
    rooms: ['maze-hanging-bell', 'maze-rope-passage', 'maze-counterweight', 'maze-service-passage', 'maze-bell-balcony'], keyRoom: 'maze-clapper-store' },
  { id: 'deep', name: 'The Deep', territory: 'deep', key: 'warden-seal',
    boss: 'warden', bossRoom: 'maze-deep-keeper', loops: 3,
    rooms: ['maze-deep-walk', 'maze-chain-well', 'maze-dead-hearth'], keyRoom: 'maze-seal-vault' },
]

export function areaById(id: AreaId): Area { return AREAS.find(area => area.id === id)! }

export const DIRECTIONS: readonly Direction[] = ['north', 'east', 'south', 'west']
export const COMPASS: Readonly<Record<Direction, {
  readonly dx: number; readonly dy: number; readonly opposite: Direction; readonly arrow: string
  readonly at: { readonly x: number; readonly y: number }
}>> = {
  north: { dx: 0, dy: -1, opposite: 'south', arrow: '↑', at: { x: .5, y: .16 } },
  east: { dx: 1, dy: 0, opposite: 'west', arrow: '→', at: { x: .90, y: .46 } },
  south: { dx: 0, dy: 1, opposite: 'north', arrow: '↓', at: { x: .5, y: .92 } },
  west: { dx: -1, dy: 0, opposite: 'east', arrow: '←', at: { x: .10, y: .46 } },
}
