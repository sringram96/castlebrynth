/**
 * The skeleton labyrinth, as data (arts 9, 31, 33, 37).
 *
 * Six hand-authored rooms and nothing else: the Crossing that opens every
 * run, two Passages, a Trove holding the key, a Lair whose door is the
 * Gnawing, and the Warden's door that ends the depth. `src/gen` arranges
 * them; this file is what it arranges.
 *
 * art. 34: every clue, name, and lock keys on a room's identity, never on
 * its position — so the arrangement may move and knowledge still holds. That
 * is also why every room here has its own school and its own props: a room
 * the player cannot tell from the last one is a room they cannot learn.
 *
 * art. 70: a room's scene is a function of what has happened in it. The key
 * is a prop until it is taken, and then it is not.
 */

import type { Act, RoomBook, SceneState, Tappable } from '../descent/index.js'
import type { Catalog, Grammar, KeyId, RoomTemplate } from '../gen/index.js'
import type { Horror } from '../lots/index.js'
import type { ItemId, RoomId } from '../state/index.js'
import type { RoomShape, Scene, WorldMark } from '../room/index.js'
import { THE_GNAWING } from './horrors.js'
import { ASH, IRON, MUTED, NOIR, OCHRE, WET } from './palettes.js'
import { plainScene } from './plates/plain.js'
import {
  alcove,
  ashBanks,
  blackDoor,
  dragMark,
  doorway,
  dust,
  motes,
  runnel,
  seep,
  theKey,
} from './plates/props.js'
import { WAKE } from './plates/wake.js'
import { BEATS, DOOR_SENSES, LABELS, LOOKS, NOUNS, VERBS } from './prose.js'
import { RENDER } from './render.js'

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

/** The floor, in the world's own units — everything stands on it. */
const FLOOR = -RENDER.eye

/**
 * Where the door stands in each shape. A door is a thing in the world like
 * any other (art. 68), so it has a place, and its depth is chosen per shape
 * rather than derived: art. 16's cutoff is a render number, and a door the
 * player has to squint at is not a door they can tap.
 */
const DOOR_AT: Readonly<Record<'corridor' | 'low' | 'hall', WorldMark>> = {
  corridor: { X: 0, Y: FLOOR, z: 34, width: 6.5, height: 8 },
  low: { X: 0, Y: FLOOR, z: 30, width: 5.5, height: 6.5 },
  hall: { X: 0, Y: FLOOR, z: 38, width: 9, height: 11 },
}

/** What a room is, beyond what the generator needs to place it. */
export interface RoomContent {
  readonly id: RoomId
  /** art. 70: the room as it stands now, not the room as it was authored. */
  scene(state: SceneState): Scene
  readonly shape: RoomShape
  readonly tappables: readonly Tappable[]
  readonly acts: readonly Act[]
  /** Where this room's door stands, for the thumb and for the paint. */
  readonly door: WorldMark
  /** art. 30: set when this room's door is a fight rather than a walk. */
  readonly horror?: Horror
}

const tappable = (id: string, at: WorldMark): Tappable => ({ id, noun: NOUNS[id] ?? id, at })

/**
 * The skeleton's one act (art. 7), and the one required thing in the depth
 * (art. 3): the Warden's lock demands it, and movement is forward only, so
 * the room will not let it be left behind.
 */
const TAKE_THE_KEY: Act = {
  id: 'act.take-key',
  // art. 66: a control is a plain imperative verb, two words or fewer.
  verb: VERBS['act.take-key'] ?? 'Take',
  needs: [],
  gives: [WARDEN_KEY_ITEM],
  required: true,
}

export const ROOMS: readonly RoomContent[] = [
  {
    id: CROSSING,
    // The reference plate, unchanged: it wins ties about intent, and the
    // room parity test measures it byte for byte.
    scene: () => WAKE,
    shape: WAKE.shape,
    tappables: [
      tappable('crossing.grate', { X: 0, Y: 4, z: 17.7, width: 7.5, height: 4 }),
      tappable('crossing.bones', { X: -1, Y: FLOOR, z: 13.8, width: 17, height: 2.4 }),
      tappable('crossing.traveler', { X: 10.4, Y: FLOOR, z: 22.4, width: 5, height: 3.2 }),
      tappable('crossing.chain', { X: -9.8, Y: 0, z: 12, width: 2, height: 8 }),
    ],
    acts: [],
    door: DOOR_AT.corridor,
  },
  {
    id: room('room.passage.drip'),
    scene: (state) =>
      plainScene('room.passage.drip', WET, CORRIDOR, () => [
        runnel(WET),
        seep(WET),
        doorway(WET, opened(state), DOOR_AT.corridor),
      ]),
    shape: CORRIDOR,
    tappables: [tappable('drip.water', { X: 0, Y: FLOOR, z: 11, width: 6, height: 2.2 })],
    acts: [],
    door: DOOR_AT.corridor,
  },
  {
    id: room('room.trove.alcove'),
    scene: (state) =>
      plainScene('room.trove.alcove', OCHRE, LOW, () => [
        alcove(OCHRE),
        dust(OCHRE),
        // art. 70: taken is gone. The floor it lay on is the floor again.
        ...(state.done.includes('act.take-key') ? [] : [theKey(OCHRE)]),
        doorway(OCHRE, opened(state), DOOR_AT.low),
      ]),
    shape: LOW,
    tappables: [
      tappable('alcove.key', { X: 8.4, Y: -12.5, z: 20.5, width: 3.4, height: 2 }),
      tappable('alcove.dust', { X: 7.2, Y: FLOOR, z: 22.5, width: 3.4, height: 1.6 }),
    ],
    acts: [TAKE_THE_KEY],
    door: DOOR_AT.low,
  },
  {
    id: room('room.lair.gnawing'),
    scene: (state) =>
      plainScene('room.lair.gnawing', NOIR, LOW, () => [
        dragMark(NOIR),
        doorway(NOIR, opened(state), DOOR_AT.low),
      ]),
    shape: LOW,
    tappables: [tappable('lair.drag', { X: -3, Y: FLOOR, z: 18, width: 9, height: 2 })],
    acts: [],
    door: DOOR_AT.low,
    horror: THE_GNAWING,
  },
  {
    id: room('room.passage.ash'),
    scene: (state) =>
      plainScene('room.passage.ash', ASH, CORRIDOR, () => [
        ashBanks(ASH),
        motes(ASH),
        doorway(ASH, opened(state), DOOR_AT.corridor),
      ]),
    shape: CORRIDOR,
    tappables: [tappable('ash.ash', { X: -8.5, Y: FLOOR, z: 15, width: 5, height: 2 })],
    acts: [],
    door: DOOR_AT.corridor,
  },
  {
    id: WARDEN,
    scene: () =>
      plainScene('room.warden', IRON, HALL, () => [blackDoor(IRON, DOOR_AT.hall)]),
    shape: HALL,
    tappables: [
      // The lock is a small thing on a large one, and both answer (art. 69).
      tappable('warden.lock', { X: 0, Y: -7.4, z: 38, width: 2.4, height: 2.6 }),
      tappable('warden.door', { X: 0, Y: FLOOR, z: 38, width: 8, height: 9.6 }),
    ],
    acts: [],
    door: DOOR_AT.hall,
  },
]

/** art. 70: whether the one door out of this room already stands open. */
function opened(state: SceneState): boolean {
  return state.opened.length > 0
}

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

/** The horrors the depth can deal, by identity — for restoring a fight. */
export function horrorById(id: string): Horror | null {
  return ROOMS.find((held) => held.horror?.id === id)?.horror ?? null
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

/** The name a room answers to, for the beat that opens it (art. 34). */
export function roomName(id: RoomId): string {
  return LABELS[id as string] ?? (id as string)
}
