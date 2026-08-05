/**
 * The labyrinth, as data (arts 9, 31, 37, 77–83).
 *
 * Fourteen hand-authored rooms: two fixed anchors, three in the neutral pool,
 * and three each in the drowned, the burnt and the ossuary. `src/gen` deals
 * them lazily under the drift; this file is what it deals from.
 *
 * art. 34: every clue, name, and lock keys on a room's identity, never on
 * its position — so the arrangement may move and knowledge still holds. That
 * is also why every room here has its own school and its own props: a room
 * the player cannot tell from the last one is a room they cannot learn. Under
 * art. 82 that matters twice over, because a run may now deal the same room
 * more than once and recognising the repeat is the point.
 *
 * art. 83: a room declares sockets and never speaks for what fills them.
 * Nothing below assumes a horror, a key, or a merchant — the words those
 * things say live in `encounters.ts`, beside the things themselves.
 *
 * art. 70: a room's scene is a function of what has happened in it, and
 * under art. 82 that is what has happened in *this* instance of it.
 */

import type { Act, RoomBook, SceneState, SocketWords, Tappable } from '../descent/index.js'
import type {
  Catalog,
  DepthPlan,
  Fill,
  Grammar,
  KeyId,
  RoomTemplate,
  RoomType,
  Socket,
  SocketId,
} from '../gen/index.js'
import type { Horror } from '../lots/index.js'
import type { RoomId } from '../state/index.js'
import type { Prop, RoomShape, Scene, WorldMark } from '../room/index.js'
import {
  BURNT,
  DROWNED,
  ENCOUNTERS,
  IRON_KEY,
  OSSUARY,
  FLOOR_CHANCE,
  SAVIOR_CHANCE,
  WARDEN_KEY,
  WARDEN_KEY_ITEM,
  fillProps,
  fillWords,
} from './encounters.js'
import { horrorById } from './horrors.js'
import type { School } from './palettes.js'
import {
  ASH,
  BRINE,
  CHALK,
  EMBER,
  GRANITE,
  IRON,
  MUTED,
  NOIR,
  OCHRE,
  SILT,
  SLATE,
  SOOT,
  VERDIGRIS,
  WET,
} from './palettes.js'
import { plainScene } from './plates/plain.js'
import {
  alcove,
  ashBanks,
  blackDoor,
  boneDrifts,
  dragMark,
  doorway,
  dust,
  fontSteps,
  kilnMouth,
  motes,
  pyreStack,
  runnel,
  seep,
  standingWater,
  stairHead,
  sumpGrate,
  tallyMarks,
} from './plates/props.js'
import { WAKE } from './plates/wake.js'
import { ARRIVALS, BEATS, LABELS, LOOKS, NOUNS } from './prose.js'
import { RENDER } from './render.js'

export { WARDEN_KEY, WARDEN_KEY_ITEM } from './encounters.js'

const room = (s: string): RoomId => s as RoomId

export const CROSSING = room('room.crossing')
export const WARDEN = room('room.warden')

/** art. 14: the box is three authored numbers, and no more. */
const CORRIDOR = { lens: 93, width: 11, ceiling: 7 } as const
const LOW = { lens: 88, width: 9, ceiling: 5 } as const
const CHAMBER = { lens: 96, width: 12, ceiling: 8 } as const
const HALL = { lens: 100, width: 14, ceiling: 9 } as const

/** Which of the four boxes a room is, for the marks that derive from it. */
type ShapeKind = 'corridor' | 'low' | 'chamber' | 'hall'

const SHAPES: Readonly<Record<ShapeKind, RoomShape>> = {
  corridor: CORRIDOR,
  low: LOW,
  chamber: CHAMBER,
  hall: HALL,
}

/** The floor, in the world's own units — everything stands on it. */
const FLOOR = -RENDER.eye

/**
 * Where the door stands in each shape. A door is a thing in the world like
 * any other (art. 68), so it has a place, and its depth is chosen per shape
 * rather than derived: art. 16's cutoff is a render number, and a door the
 * player has to squint at is not a door they can tap.
 */
const DOOR_AT: Readonly<Record<ShapeKind, WorldMark>> = {
  corridor: { X: 0, Y: FLOOR, z: 34, width: 6.5, height: 8 },
  low: { X: 0, Y: FLOOR, z: 30, width: 5.5, height: 6.5 },
  chamber: { X: 0, Y: FLOOR, z: 36, width: 7, height: 9 },
  hall: { X: 0, Y: FLOOR, z: 38, width: 9, height: 11 },
}

/**
 * art. 83: the three sockets every room in this depth declares. A far one,
 * at the end the door is at, which takes whatever comes with teeth; a floor
 * one, near enough to reach, which takes whatever can be picked up; and —
 * since art. 40 was ruled — a mercy one, off to the near left, which takes
 * whatever is offered rather than taken.
 *
 * They are the same three everywhere on purpose. A socket is a place, and a
 * place the player learns to look is worth more than a place they have to
 * find — art. 34's learning loop applies to furniture as well as to rooms.
 * That the mercy socket is nearly always empty is the point of it: the room
 * where it is not is the room you were hoping for.
 */
export const FAR_SOCKET = 'socket.far' as SocketId
export const FLOOR_SOCKET = 'socket.floor' as SocketId
export const MERCY_SOCKET = 'socket.mercy' as SocketId

const SOCKET_AT: Readonly<Record<ShapeKind, Readonly<Record<string, WorldMark>>>> = {
  corridor: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 27, width: 5, height: 7 },
    [FLOOR_SOCKET]: { X: 6.5, Y: FLOOR + 1.5, z: 16, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -6.6, Y: FLOOR, z: 19, width: 4.2, height: 6.4 },
  },
  low: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 24, width: 4.4, height: 5.6 },
    [FLOOR_SOCKET]: { X: 5.4, Y: FLOOR + 1.5, z: 15, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -5.2, Y: FLOOR, z: 17, width: 3.8, height: 5.2 },
  },
  chamber: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 29, width: 5.5, height: 7.5 },
    [FLOOR_SOCKET]: { X: 7.2, Y: FLOOR + 1.5, z: 17, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -7.2, Y: FLOOR, z: 20, width: 4.6, height: 7 },
  },
  hall: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 31, width: 6.5, height: 9 },
    [FLOOR_SOCKET]: { X: 8.5, Y: FLOOR + 1.5, z: 19, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -8.6, Y: FLOOR, z: 22, width: 5, height: 8 },
  },
}

/** What a room is, beyond what the generator needs to place it. */
export interface RoomContent {
  readonly id: RoomId
  readonly type: RoomType
  readonly school: School
  readonly kind: ShapeKind
  readonly shape: RoomShape
  /** art. 70: the room as it stands now, not the room as it was authored. */
  scene(state: SceneState): Scene
  readonly tappables: readonly Tappable[]
  readonly acts: readonly Act[]
  /** Where this room's door stands, for the thumb and for the paint. */
  readonly door: WorldMark
  /** art. 83: where this room keeps each of its sockets. */
  readonly sockets: Readonly<Record<string, WorldMark>>
}

const tappable = (id: string, at: WorldMark): Tappable => ({ id, noun: NOUNS[id] ?? id, at })

/** How often a room fills its own far socket of its own accord (art. 83). */
const LAIR_CHANCE = 1
const STRAY_CHANCE = 0.06
/** Nothing ever waits in the two anchors: the Crossing opens, the door ends. */
const NEVER = 0

/** art. 70: whether a door out of this room already stands open. */
function opened(state: SceneState): boolean {
  return state.opened.length > 0
}

/** One room, as authored. The scene is assembled from it below. */
interface Authored {
  readonly id: string
  readonly type: RoomType
  readonly school: School
  readonly kind: ShapeKind
  /** The room's own props — never the sockets' (art. 83). */
  readonly dressing: (school: School, state: SceneState, at: WorldMark) => readonly Prop[]
  readonly tappables: readonly (readonly [string, WorldMark])[]
  /** The room's own acts. The skeleton's one act now belongs to a socket. */
  readonly acts?: readonly Act[]
  /** The reference plate, for the one room that has one. */
  readonly plate?: Scene
  /** How often teeth stand at the far end unasked. A lair is always a lair. */
  readonly teeth?: number
  /**
   * art. 40: how often a mercy is standing here of the dealer's own accord —
   * which is the Savior's rarity, seen from the room's side. The font's is
   * beside the point: its basin is bound, and a bound encounter takes the
   * socket before any chance is rolled.
   */
  readonly mercy?: number
  /**
   * art. 86: how often somebody is lying on this floor of the dealer's own
   * accord. The two anchors are the exception and both set it to nothing —
   * the Crossing is where you wake, and nothing is left in front of the
   * Warden's door.
   */
  readonly floor?: number
}

const AUTHORED: readonly Authored[] = [
  {
    id: 'room.crossing',
    type: 'crossing',
    school: MUTED,
    kind: 'corridor',
    // The reference plate, unchanged: it wins ties about intent, and the
    // room parity test measures it byte for byte.
    plate: WAKE,
    dressing: () => [],
    tappables: [
      ['crossing.grate', { X: 0, Y: 4, z: 17.7, width: 7.5, height: 4 }],
      ['crossing.bones', { X: -1, Y: FLOOR, z: 13.8, width: 17, height: 2.4 }],
      ['crossing.traveler', { X: 10.4, Y: FLOOR, z: 22.4, width: 5, height: 3.2 }],
      ['crossing.chain', { X: -9.8, Y: 0, z: 12, width: 2, height: 8 }],
    ],
    // The Crossing opens every run (art. 37). Nothing waits in it, and
    // nobody is lying in it: the traveler against its wall is authored
    // scenery and not a socket, because the first room may not be the room
    // that hands you your sixth bone (arts 55–56).
    teeth: NEVER,
    mercy: NEVER,
    floor: NEVER,
  },
  {
    id: 'room.trove.alcove',
    type: 'trove',
    school: OCHRE,
    kind: 'low',
    dressing: (school, state, at) => [alcove(school), dust(school), doorway(school, opened(state), at)],
    tappables: [['alcove.dust', { X: 7.2, Y: FLOOR, z: 22.5, width: 3.4, height: 1.6 }]],
  },
  {
    id: 'room.passage.stair',
    type: 'passage',
    school: GRANITE,
    kind: 'corridor',
    dressing: (school, state, at) => [stairHead(school), doorway(school, opened(state), at)],
    tappables: [['stair.tread', { X: 0, Y: FLOOR, z: 24, width: 7, height: 2.4 }]],
  },
  /**
   * arts 37, 40: the Sanctum, and the neutral pool's third room. A place, not
   * a being — what heals here is bound to the room and is here every time the
   * room is (`enc.basin`), which is exactly what makes it a place. It says
   * nothing about its basin; the basin says its own words (art. 83).
   */
  {
    id: 'room.sanctum.font',
    type: 'sanctum',
    school: VERDIGRIS,
    kind: 'low',
    dressing: (school, state, at) => [fontSteps(school), doorway(school, opened(state), at)],
    tappables: [['font.step', { X: 0, Y: FLOOR - 1.2, z: 15, width: 8, height: 2.4 }]],
    // Nothing waits in a font, and nothing floats into it: its mercy socket
    // is spoken for by the thing bound to it. Nobody died here either — it
    // is the one room in the depth that is kind.
    teeth: NEVER,
    mercy: NEVER,
    floor: NEVER,
  },
  {
    id: 'room.passage.drip',
    type: 'passage',
    school: WET,
    kind: 'corridor',
    dressing: (school, state, at) => [
      runnel(school),
      seep(school),
      doorway(school, opened(state), at),
    ],
    tappables: [['drip.water', { X: 0, Y: FLOOR, z: 11, width: 6, height: 2.2 }]],
  },
  {
    id: 'room.lair.cistern',
    type: 'lair',
    school: BRINE,
    kind: 'chamber',
    dressing: (school, state, at) => [standingWater(school), doorway(school, opened(state), at)],
    tappables: [['cistern.water', { X: 0, Y: FLOOR, z: 13, width: 12, height: 2.4 }]],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.trove.sump',
    type: 'trove',
    school: SILT,
    kind: 'low',
    dressing: (school, state, at) => [sumpGrate(school), doorway(school, opened(state), at)],
    tappables: [['sump.grate', { X: 0, Y: FLOOR, z: 24, width: 5, height: 2 }]],
  },
  {
    id: 'room.passage.ash',
    type: 'passage',
    school: ASH,
    kind: 'corridor',
    dressing: (school, state, at) => [
      ashBanks(school),
      motes(school),
      doorway(school, opened(state), at),
    ],
    tappables: [['ash.ash', { X: -8.5, Y: FLOOR, z: 15, width: 5, height: 2 }]],
  },
  {
    id: 'room.lair.kiln',
    type: 'lair',
    school: EMBER,
    kind: 'chamber',
    dressing: (school, state, at) => [kilnMouth(school), doorway(school, opened(state), at)],
    tappables: [['kiln.mouth', { X: -12, Y: FLOOR + 2, z: 19, width: 3, height: 7 }]],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.omen.pyre',
    type: 'omen',
    school: SOOT,
    kind: 'chamber',
    dressing: (school, state, at) => [pyreStack(school), doorway(school, opened(state), at)],
    tappables: [['pyre.timber', { X: 0, Y: FLOOR + 2, z: 21, width: 5.5, height: 4.5 }]],
  },
  {
    id: 'room.lair.den',
    type: 'lair',
    school: NOIR,
    kind: 'low',
    dressing: (school, state, at) => [dragMark(school), doorway(school, opened(state), at)],
    tappables: [['den.drag', { X: -3, Y: FLOOR, z: 18, width: 9, height: 2 }]],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.passage.bonefield',
    type: 'passage',
    school: CHALK,
    kind: 'corridor',
    dressing: (school, state, at) => [boneDrifts(school), doorway(school, opened(state), at)],
    tappables: [['bonefield.bone', { X: 8.5, Y: FLOOR, z: 15, width: 5, height: 2 }]],
  },
  {
    id: 'room.puzzle.tally',
    type: 'puzzle',
    school: SLATE,
    kind: 'low',
    dressing: (school, state, at) => [tallyMarks(school), doorway(school, opened(state), at)],
    tappables: [['tally.marks', { X: 8.6, Y: FLOOR + 3, z: 20, width: 2.4, height: 4 }]],
  },
  {
    id: 'room.warden',
    type: 'warden',
    school: IRON,
    kind: 'hall',
    dressing: (school, _state, at) => [blackDoor(school, at)],
    tappables: [
      // The lock is a small thing on a large one, and both answer (art. 69).
      ['warden.lock', { X: 0, Y: -7.4, z: 38, width: 2.4, height: 2.6 }],
      ['warden.door', { X: 0, Y: FLOOR, z: 38, width: 8, height: 9.6 }],
    ],
    // The Warden's door ends the depth. Nothing stands in front of it.
    teeth: NEVER,
    mercy: NEVER,
    floor: NEVER,
  },
]

/**
 * art. 83: what stands in the sockets, painted where the sockets are. The
 * room does not know what these are and does not have to — it declares the
 * places, and the encounters bring their own pixels.
 */
function socketProps(one: Authored, state: SceneState): readonly Prop[] {
  const marks = SOCKET_AT[one.kind]
  return state.fills.flatMap((fill) =>
    fillProps(
      fill,
      one.school,
      marks[fill.socket as string] ?? DOOR_AT[one.kind],
      state.done,
    ),
  )
}

function contentOf(one: Authored): RoomContent {
  const shape = SHAPES[one.kind]
  const door = DOOR_AT[one.kind]
  return {
    id: room(one.id),
    type: one.type,
    school: one.school,
    kind: one.kind,
    shape,
    scene: (state) => {
      const base =
        one.plate ??
        plainScene(one.id, one.school, shape, () => one.dressing(one.school, state, door))
      const laid = socketProps(one, state)
      if (laid.length === 0) return base
      // art. 19: painted near over far, so the list is declared far to near.
      return {
        ...base,
        props: (view) => [...base.props(view), ...laid].sort((a, b) => b.z - a.z),
      }
    },
    tappables: one.tappables.map(([id, at]) => tappable(id, at)),
    acts: one.acts ?? [],
    door,
    sockets: SOCKET_AT[one.kind],
  }
}

export const ROOMS: readonly RoomContent[] = AUTHORED.map(contentOf)

// ── The catalog the dealer deals from ──────────────────────────────────

function socketsOf(one: Authored): readonly Socket[] {
  return [
    { id: FAR_SOCKET, accepts: 'horror', chance: one.teeth ?? STRAY_CHANCE },
    // arts 80, 86: the floor is where the dead are. The key still goes in
    // ahead of anything optional — the dealer places it because it must, and
    // this chance is only about what lies here when nothing is owed.
    { id: FLOOR_SOCKET, accepts: 'boon', chance: one.floor ?? FLOOR_CHANCE },
    // art. 40: and the mercy socket, which is the Savior's whole rarity.
    { id: MERCY_SOCKET, accepts: 'mercy', chance: one.mercy ?? SAVIOR_CHANCE },
  ]
}

function template(one: Authored): RoomTemplate {
  const demands: readonly KeyId[] = one.type === 'warden' ? [WARDEN_KEY] : []
  const base: RoomTemplate = {
    id: room(one.id),
    type: one.type,
    sockets: socketsOf(one),
    demands,
  }
  return one.type === 'warden' ? { ...base, ends: true } : base
}

/**
 * art. 81: depth length is a content variable — fixed rooms per depth,
 * authored per depth, changeable without touching the engine. So is the door
 * count that forces the lock (art. 78) and how many regions there are
 * (art. 77). All three of them are here, and nowhere else.
 */
export const DEPTH_ONE: DepthPlan = {
  depth: 1,
  length: 9,
  lockAt: 4,
  regions: [
    {
      id: DROWNED,
      rooms: [room('room.passage.drip'), room('room.lair.cistern'), room('room.trove.sump')],
    },
    {
      id: BURNT,
      rooms: [room('room.passage.ash'), room('room.lair.kiln'), room('room.omen.pyre')],
    },
    {
      id: OSSUARY,
      rooms: [room('room.lair.den'), room('room.passage.bonefield'), room('room.puzzle.tally')],
    },
  ],
  neutral: [
    room('room.trove.alcove'),
    room('room.passage.stair'),
    // art. 40: neutral, not regional, so the drift can lean a run anywhere
    // it likes and the run still gets its breath (arts 77–78).
    room('room.sanctum.font'),
  ],
  // art. 39: the shallow leans quiet. Passages are the bread; teeth are the
  // exception the band keeps honest.
  tendencies: {
    passage: 3,
    lair: 1.6,
    puzzle: 2,
    trove: 2,
    omen: 2,
    // The font is never dealt by the ordinary draw. It arrives by the
    // promise below and by nothing else, which is what makes the promise
    // legible: switch `mercies` off and no run holds a Sanctum at all.
    sanctum: 0,
    merchant: 0,
    savior: 0,
    crossing: 0,
    warden: 0,
  },
  // art. 80: the depth is committed to the Warden's lock from the first
  // room, so the key goes into the path ahead of it, wherever the path goes.
  locks: [{ at: 8, demands: [WARDEN_KEY], key: IRON_KEY }],
  /**
   * art. 40: every run gets one breath, and it falls in the middle of the
   * road rather than at either end of it.
   *
   * The band is [2, 3] and it is bounded above by `lockAt`, not by taste:
   * art. 78 hands every room from step 4 down to the locked region, so the
   * neutral pool can only be dealt from before then. Steps 1–3 are the whole
   * of that window and the font sits at the back of it — late enough that a
   * fight is usually behind you, early enough that the depth's teeth are all
   * still ahead. Widening it means moving `lockAt`, which is a drift
   * question and not a mercy one.
   */
  mercies: [{ type: 'sanctum', band: [2, 3] }],
}

export const CATALOG: Catalog = {
  rooms: AUTHORED.map(template),
  encounters: ENCOUNTERS,
  depths: [DEPTH_ONE],
}

/**
 * art. 38 (amended): rules, not templates. None of these solve anything —
 * they are the pressures the dealer leans with, and whether they held is a
 * question asked of a thousand runs rather than of one.
 */
export const GRAMMAR: Grammar = {
  // Two fights back to back is the one rhythm the depth never plays.
  adjacencyBans: [['lair', 'lair']],
  guarantees: ['crossing', 'warden', 'lair'],
  fightBand: [1, 3],
  // art. 31: two doors is the ordinary room, one is a corridor moment, and
  // three is a crossroads.
  doorWeights: [1, 6, 3],
  clumpPenalty: 0.05,
  driftPull: 1.4,
  bandPull: 3,
}

const byId = new Map<string, RoomContent>(ROOMS.map((held) => [held.id as string, held]))

export function roomContent(id: RoomId): RoomContent {
  const held = byId.get(id as string)
  if (held === undefined) throw new Error(`no room authored for ${id}`)
  return held
}

/** art. 83: where a room keeps one of its sockets, for the thing in it. */
export function socketMark(id: RoomId, socket: SocketId): WorldMark {
  const held = roomContent(id)
  return held.sockets[socket as string] ?? held.door
}

/** art. 30: which horror stands in this room right now, if any. */
export function horrorOf(fills: readonly Fill[]): Horror | null {
  for (const fill of fills) {
    const one = ENCOUNTERS.find((held) => held.id === fill.encounter)
    if (one?.kind === 'horror' && one.horror !== undefined) return horrorById(one.horror)
  }
  return null
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
  // art. 83: the room is handed over so the thing can stand somewhere, and
  // for nothing else — every word below comes from the encounter.
  socket: (id, fill): SocketWords => fillWords(fill, socketMark(id, fill.socket)),
  arrival: (region) => ARRIVALS[region as string] ?? [],
}

/** The name a room answers to, for the beat that opens it (art. 34). */
export function roomName(id: RoomId): string {
  return LABELS[id as string] ?? (id as string)
}
