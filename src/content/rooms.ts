/**
 * The skeleton labyrinth, as data (arts 9, 31, 33, 37).
 *
 * Six hand-authored rooms and nothing else: the Crossing that opens every
 * run, two Passages, a Trove holding the key, a Lair whose door is the
 * Gnawing, and the Warden's door that ends the depth. `src/gen` arranges
 * them; this file is what it arranges.
 *
 * art. 34: every clue, name, and lock keys on a room's identity, never on
 * its position — so the arrangement may move and knowledge still holds.
 */

import type { Act, RoomBook, Tappable } from '../descent/index.js'
import type { Catalog, Grammar, KeyId, RoomTemplate } from '../gen/index.js'
import type { Horror } from '../lots/index.js'
import type { ItemId, RoomId } from '../state/index.js'
import type { Scene } from '../room/index.js'
import { THE_GNAWING } from './horrors.js'
import { MUTED, NOIR } from './palettes.js'
import { plainScene } from './plates/plain.js'
import { WAKE } from './plates/wake.js'
import { BEATS, DOOR_SENSES, LABELS, LOOKS, NOUNS } from './prose.js'

const room = (s: string): RoomId => s as RoomId

/** The one lock in the depth, and the one key that opens it (art. 33). */
export const WARDEN_KEY = 'key.warden' as KeyId
/** The same thing, carried: run ledgers hold items, doors demand keys. */
export const WARDEN_KEY_ITEM = 'key.warden' as ItemId

export const CROSSING = room('room.crossing')
export const WARDEN = room('room.warden')

/** art. 14: the box is three authored numbers, and no more. */
const CORRIDOR = { lens: 93, width: 11, ceiling: 7 } as const
const LOW = { lens: 88, width: 9, ceiling: 5 } as const
const HALL = { lens: 100, width: 14, ceiling: 9 } as const

/** What a room is, beyond what the generator needs to place it. */
export interface RoomContent {
  readonly id: RoomId
  readonly scene: Scene
  readonly tappables: readonly Tappable[]
  readonly acts: readonly Act[]
  /** art. 30: set when this room's door is a fight rather than a walk. */
  readonly horror?: Horror
}

const tappable = (id: string): Tappable => ({ id, noun: NOUNS[id] ?? id })

/** The skeleton's one act: the key must be collectible (art. 7). */
const TAKE_THE_KEY: Act = {
  id: 'act.take-key',
  verb: LABELS['act.take-key'] ?? 'take the key',
  needs: [],
  gives: [WARDEN_KEY_ITEM],
}

export const ROOMS: readonly RoomContent[] = [
  {
    id: CROSSING,
    scene: WAKE,
    tappables: ['crossing.grate', 'crossing.bones', 'crossing.traveler', 'crossing.chain'].map(
      tappable,
    ),
    acts: [],
  },
  {
    id: room('room.passage.drip'),
    scene: plainScene('room.passage.drip', MUTED, CORRIDOR),
    tappables: [tappable('drip.water')],
    acts: [],
  },
  {
    id: room('room.trove.alcove'),
    scene: plainScene('room.trove.alcove', MUTED, LOW),
    tappables: [tappable('alcove.key'), tappable('alcove.dust')],
    acts: [TAKE_THE_KEY],
  },
  {
    id: room('room.lair.gnawing'),
    scene: plainScene('room.lair.gnawing', NOIR, LOW),
    tappables: [tappable('lair.drag')],
    acts: [],
    horror: THE_GNAWING,
  },
  {
    id: room('room.passage.ash'),
    scene: plainScene('room.passage.ash', NOIR, CORRIDOR),
    tappables: [tappable('ash.ash')],
    acts: [],
  },
  {
    id: WARDEN,
    scene: plainScene('room.warden', NOIR, HALL),
    tappables: [tappable('warden.lock'), tappable('warden.door')],
    acts: [],
  },
]

/**
 * The same six rooms as the generator deals them (art. 9): an identity, a
 * type, what they hand over, what their door demands, and the one line the
 * door reads as from the other side.
 */
export const CATALOG: Catalog = {
  rooms: [
    template('room.crossing', 'crossing', [], []),
    template('room.passage.drip', 'passage', [], []),
    template('room.trove.alcove', 'trove', [WARDEN_KEY], []),
    template('room.lair.gnawing', 'lair', [], [], 'horror.gnawing'),
    template('room.passage.ash', 'passage', [], []),
    { ...template('room.warden', 'warden', [], [WARDEN_KEY]), ends: true },
  ],
}

function template(
  id: string,
  type: RoomTemplate['type'],
  grants: readonly KeyId[],
  demands: readonly KeyId[],
  fight?: string,
): RoomTemplate {
  const base: RoomTemplate = {
    id: room(id),
    type,
    grants,
    demands,
    sense: DOOR_SENSES[id] ?? '',
  }
  return fight === undefined ? base : { ...base, fight }
}

/**
 * art. 38: rules, not templates. The interim dealer honours the bands and
 * the guarantees; the adjacency bans and the weights wait for the real
 * grammar engine, and are declared empty rather than invented.
 */
export const GRAMMAR: Grammar = {
  adjacencyBans: [],
  guarantees: ['crossing', 'warden'],
  keyBand: [0, 0.5],
  lockBand: [0.5, 1],
  fightBand: [1, 1],
  weights: {
    passage: 1,
    lair: 1,
    puzzle: 0,
    trove: 1,
    omen: 0,
    sanctum: 0,
    merchant: 0,
    savior: 0,
    crossing: 0,
    warden: 0,
  },
}

const byId = new Map<string, RoomContent>(ROOMS.map((held) => [held.id as string, held]))

export function roomContent(id: RoomId): RoomContent {
  const held = byId.get(id as string)
  if (held === undefined) throw new Error(`no room authored for ${id}`)
  return held
}

/** art. 30: which horror stands behind this room's door, if any. */
export function horrorAt(id: RoomId): Horror | null {
  return byId.get(id as string)?.horror ?? null
}

/**
 * The book the descent reads from. Content answers what a room says; the
 * engine only decides when it is said.
 */
export const ROOM_BOOK: RoomBook = {
  beats: (id) => BEATS[id as string] ?? [],
  tappables: (id) => roomContent(id).tappables,
  look: (_id, target) => LOOKS[target] ?? '',
  acts: (id) => roomContent(id).acts,
}
