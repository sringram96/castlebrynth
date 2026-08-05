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

import type {
  Act,
  DoorState,
  RoomBook,
  SceneState,
  SocketWords,
  Tappable,
} from '../descent/index.js'
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
import type { Mass, Prop, RoomShape, Scene, WorldMark } from '../room/index.js'
import { dune } from '../room/index.js'
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
  sandOf,
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
  THRONE_STONE,
  VERDIGRIS,
  WET,
} from './palettes.js'
import { plainScene } from './plates/plain.js'
import {
  alcove,
  ashBanks,
  boneDrifts,
  dragMark,
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
  thing,
  threshold,
  framedWidth,
} from './plates/props.js'
import {
  BELL,
  BOTTLE,
  BRAZIER,
  CAGE,
  CAPS,
  CHOIR,
  COINS,
  HANGED,
  KNIFE,
  LANTERN,
  MANY,
  RING,
  SKULL,
  STATUE,
  THRONE,
  WATCHER,
} from './plates/bestiary.js'
import { WAKE } from './plates/wake.js'
import { ARRIVALS, BEATS, LABELS, LOOKS, NOUNS } from './prose.js'
import { RENDER } from './render.js'

export { WARDEN_KEY, WARDEN_KEY_ITEM } from './encounters.js'

const room = (s: string): RoomId => s as RoomId

export const CROSSING = room('room.crossing')
export const WARDEN = room('room.warden')

/**
 * art. 14 as amended: three authored numbers for the proportions, and a
 * shape. `back` is the shape — art. 96's chamber, the depth its far wall
 * stands at, which says where the room stops and nothing about how wide it
 * is. A room without one is a tube and ends in the mouth.
 *
 * Every room in this depth is a chamber, and the reason is art. 97. A door
 * is a hole, and a hole needs something to be a hole *in*: a threshold
 * standing at the end of a tube is a frame hanging in fog, which is a thing
 * and not a way out. The wall is what makes the door read, and it is worth
 * more than the endlessness the tube was buying.
 */
const CORRIDOR = { lens: 93, width: 11, ceiling: 7, back: 40 } as const
const LOW = { lens: 88, width: 9, ceiling: 5, back: 34 } as const
const CHAMBER = { lens: 96, width: 12, ceiling: 8, back: 43 } as const
const HALL = { lens: 100, width: 14, ceiling: 9, back: 47 } as const
/** art. 96: a throne hall is wide and tall and stops a long way off. */
const GREAT = { lens: 104, width: 17, ceiling: 13, back: 58 } as const
/** A sewer: narrow, low, and it ends soon. */
const VAULT = { lens: 84, width: 8, ceiling: 4, back: 27 } as const
/** art. 96: the open — no walls, no ceiling, and the sky instead. */
const OPEN = { lens: 100, width: 40, ceiling: 40, open: true } as const

/** Which of the four boxes a room is, for the marks that derive from it. */
type ShapeKind = 'corridor' | 'low' | 'chamber' | 'hall' | 'great' | 'vault' | 'open'

const SHAPES: Readonly<Record<ShapeKind, RoomShape>> = {
  corridor: CORRIDOR,
  low: LOW,
  chamber: CHAMBER,
  hall: HALL,
  great: GREAT,
  vault: VAULT,
  open: OPEN,
}

/**
 * art. 100: fire is fire. A light that carries is the one thing in a drawing
 * the school does not colour, because it is not taking the room's light — it
 * is making it, and a green flame in the drowned would be a lie about what
 * is burning.
 */
const FIRE = '#ffb14a'

/** The floor, in the world's own units — everything stands on it. */
const FLOOR = -RENDER.eye

/**
 * Where the doors stand in each shape. A door is a thing in the world like
 * any other (art. 68), so it has a place, and its depth is chosen per shape
 * rather than derived: art. 16's cutoff is a render number, and a door the
 * player has to squint at is not a door they can tap.
 *
 * The height is the number that matters. The first cut authored doors eight
 * world units tall against an eye standing at fourteen — half-height holes
 * that read as boxes because nothing that size is a way through a wall. A
 * threshold is a person's height and more, so its head clears the eye by the
 * margin a real door does, and art. 97's taller-than-wide falls out of the
 * height rather than being asked for.
 */
interface DoorPlan {
  /** How tall, in world units, floor to lintel. */
  readonly high: number
  /** The widest a single door here may be; art. 97 narrows it if it must. */
  readonly wide: number
}

const DOOR_PLAN: Readonly<Record<ShapeKind, DoorPlan>> = {
  corridor: { high: 17, wide: 7.6 },
  low: { high: 14, wide: 6.6 },
  chamber: { high: 17.5, wide: 8 },
  hall: { high: 19, wide: 9 },
  great: { high: 24, wide: 11 },
  vault: { high: 10.5, wide: 4.6 },
  // art. 96: an open room's way on is a gap in nothing, so its threshold
  // stands free on the ground and is the one place a frame is the whole wall.
  open: { high: 20, wide: 8.5 },
}

/**
 * art. 97: a door is a hole, so its depth is the wall's depth and is never
 * authored beside it. A threshold standing anywhere else is a frame in mid
 * air, which is the thing the article refuses.
 */
function doorDepth(kind: ShapeKind): number {
  return SHAPES[kind].back ?? DOOR_PLAN[kind].high * 2
}

/** art. 96: an open room has no wall, so its threshold stands on the ground. */
const OPEN_DOOR_AT = 34

/** How much room the doors leave themselves against the walls. */
const DOOR_MARGIN = 0.8
/**
 * The gap art. 105 keeps between two of them, in world units. It has to clear
 * both architraves and leave wall between them: three frames that touch read
 * as one wide barrier, which is the same failure as one thing cut in half.
 */
const DOOR_GAP = 1.7
/** And never narrower than this: past it a hole stops reading as a way on. */
const NARROWEST = 2.2

/**
 * Where each of a room's doors stands, given how many it offers (art. 31).
 *
 * The thumb and the paint both come through here, so a door's tap region is
 * derived from the coordinates it is painted at rather than authored twice
 * (art. 68). Two or three doors share the far end by slicing it, and art. 105
 * keeps them from standing in front of one another: each takes its own slot
 * and gives up width rather than overlap, because overlap at this scale is
 * mush and not depth.
 */
export function doorMarks(kind: ShapeKind, count: number): readonly WorldMark[] {
  const plan = DOOR_PLAN[kind]
  const n = Math.max(1, count)
  const span = SHAPES[kind].open === true ? 26 : 2 * (SHAPES[kind].width - DOOR_MARGIN)
  const slot = span / n
  // A narrow room's doors need a proportionally narrower gap: the law is
  // that wall shows between two architraves, not that a fixed number of
  // world units does (art. 105).
  const gap = Math.min(DOOR_GAP, slot * 0.3)
  // The widest that still leaves wall between the architraves — measured on
  // the framed footprint, because that is what the eye reads as the thing.
  let width = plan.wide
  while (width > NARROWEST && framedWidth(width) + gap > slot) width -= 0.1
  return Array.from({ length: n }, (_, i) => ({
    X: -span / 2 + slot * (i + 0.5),
    Y: FLOOR,
    z: SHAPES[kind].open === true ? OPEN_DOOR_AT : doorDepth(kind),
    width,
    height: plan.high,
  }))
}

/** art. 37: the Warden's door, which is the one door its hall ever offers. */
const WARDEN_DOOR = doorMarks('hall', 1)[0]!

/**
 * art. 97: the lock lives *on* the frame, so the thing that answers for it
 * sits where the frame is — beside the aperture and a little above centre,
 * which is where `threshold` paints it.
 */
function lockOn(door: WorldMark): WorldMark {
  return {
    X: door.X + door.width / 2 + 0.7,
    Y: door.Y + door.height * 0.42,
    z: door.z,
    width: 2.4,
    height: 2.6,
  }
}

/** Where a room's door stands when nothing has said how many there are. */
const DOOR_AT: Readonly<Record<ShapeKind, WorldMark>> = {
  corridor: doorMarks('corridor', 1)[0]!,
  low: doorMarks('low', 1)[0]!,
  chamber: doorMarks('chamber', 1)[0]!,
  hall: doorMarks('hall', 1)[0]!,
  great: doorMarks('great', 1)[0]!,
  vault: doorMarks('vault', 1)[0]!,
  open: doorMarks('open', 1)[0]!,
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
  great: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 40, width: 8, height: 11 },
    [FLOOR_SOCKET]: { X: 10.5, Y: FLOOR + 1.5, z: 21, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -10.5, Y: FLOOR, z: 25, width: 5.4, height: 8.5 },
  },
  vault: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 19, width: 3.6, height: 4.6 },
    [FLOOR_SOCKET]: { X: 5, Y: FLOOR + 1.2, z: 14, width: 3, height: 1.8 },
    [MERCY_SOCKET]: { X: -5, Y: FLOOR, z: 16, width: 3.2, height: 4.2 },
  },
  open: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 26, width: 7, height: 9.5 },
    [FLOOR_SOCKET]: { X: 9, Y: FLOOR + 1.5, z: 17, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -10, Y: FLOOR, z: 21, width: 5, height: 8 },
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
  /**
   * arts 31, 68, 97: where each of this room's doors stands, given how many
   * it offers. The thumb asks the same question the paint does and gets the
   * same answer, so a tap region can never drift off the door it is for.
   */
  doorMarks(count: number): readonly WorldMark[]
  /** art. 83: where this room keeps each of its sockets. */
  readonly sockets: Readonly<Record<string, WorldMark>>
}

const tappable = (id: string, at: WorldMark): Tappable => ({ id, noun: NOUNS[id] ?? id, at })

/** How often a room fills its own far socket of its own accord (art. 83). */
const LAIR_CHANCE = 1
const STRAY_CHANCE = 0.06
/** Nothing ever waits in the two anchors: the Crossing opens, the door ends. */
const NEVER = 0

/** One room, as authored. The scene is assembled from it below. */
interface Authored {
  readonly id: string
  readonly type: RoomType
  readonly school: School
  readonly kind: ShapeKind
  /** The room's own props — never the sockets' (art. 83). */
  readonly dressing: (school: School, state: SceneState) => readonly Prop[]
  readonly tappables: readonly (readonly [string, WorldMark])[]
  /** The room's own acts. The skeleton's one act now belongs to a socket. */
  readonly acts?: readonly Act[]
  /** The reference plate, for the one room that has one. */
  readonly plate?: Scene
  /** art. 102: what lies on this room's floor, as a height and not a heap. */
  readonly buried?: (school: School, shape: RoomShape) => Mass
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
    dressing: (school) => [alcove(school), dust(school)],
    tappables: [['alcove.dust', { X: 7.2, Y: FLOOR, z: 22.5, width: 3.4, height: 1.6 }]],
  },
  {
    id: 'room.passage.stair',
    type: 'passage',
    school: GRANITE,
    kind: 'corridor',
    dressing: (school) => [stairHead(school)],
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
    dressing: (school) => [fontSteps(school)],
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
    dressing: (school) => [
      runnel(school),
      seep(school),
    ],
    tappables: [['drip.water', { X: 0, Y: FLOOR, z: 11, width: 6, height: 2.2 }]],
  },
  {
    id: 'room.lair.cistern',
    type: 'lair',
    school: BRINE,
    kind: 'chamber',
    dressing: (school) => [standingWater(school)],
    tappables: [['cistern.water', { X: 0, Y: FLOOR, z: 13, width: 12, height: 2.4 }]],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.trove.sump',
    type: 'trove',
    school: SILT,
    kind: 'low',
    dressing: (school) => [sumpGrate(school)],
    tappables: [['sump.grate', { X: 0, Y: FLOOR, z: 24, width: 5, height: 2 }]],
  },
  {
    id: 'room.passage.ash',
    type: 'passage',
    school: ASH,
    kind: 'corridor',
    dressing: (school) => [
      ashBanks(school),
      motes(school),
    ],
    tappables: [['ash.ash', { X: -8.5, Y: FLOOR, z: 15, width: 5, height: 2 }]],
  },
  {
    id: 'room.lair.kiln',
    type: 'lair',
    school: EMBER,
    kind: 'chamber',
    dressing: (school) => [kilnMouth(school)],
    tappables: [['kiln.mouth', { X: -12, Y: FLOOR + 2, z: 19, width: 3, height: 7 }]],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.omen.pyre',
    type: 'omen',
    school: SOOT,
    kind: 'chamber',
    dressing: (school) => [pyreStack(school)],
    tappables: [['pyre.timber', { X: 0, Y: FLOOR + 2, z: 21, width: 5.5, height: 4.5 }]],
  },
  {
    id: 'room.lair.den',
    type: 'lair',
    school: NOIR,
    kind: 'low',
    dressing: (school) => [dragMark(school)],
    tappables: [['den.drag', { X: -3, Y: FLOOR, z: 18, width: 9, height: 2 }]],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.passage.bonefield',
    type: 'passage',
    school: CHALK,
    kind: 'corridor',
    dressing: (school) => [boneDrifts(school)],
    tappables: [['bonefield.bone', { X: 8.5, Y: FLOOR, z: 15, width: 5, height: 2 }]],
  },
  {
    id: 'room.puzzle.tally',
    type: 'puzzle',
    school: SLATE,
    kind: 'low',
    dressing: (school) => [tallyMarks(school)],
    tappables: [['tally.marks', { X: 8.6, Y: FLOOR + 3, z: 20, width: 2.4, height: 4 }]],
  },
  {
    id: 'room.hall.throne',
    type: 'omen',
    school: THRONE_STONE,
    kind: 'great',
    dressing: (school) => [
      thing(school, THRONE, { X: 0, Y: FLOOR, z: 44, width: 11, height: 15 }, 'the throne', 60),
      thing(school, BRAZIER, { X: -9, Y: FLOOR, z: 30, width: 4.6, height: 6 }, 'the brazier', 46, FIRE),
      thing(school, BRAZIER, { X: 9, Y: FLOOR, z: 30, width: 4.6, height: 6 }, 'the brazier', 46, FIRE),
      thing(school, BELL, { X: -13, Y: FLOOR + 9, z: 22, width: 4, height: 4.4 }, 'the bell'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['throne.seat', { X: 0, Y: FLOOR, z: 44, width: 11, height: 15 }],
      ['throne.bell', { X: -13, Y: FLOOR + 9, z: 22, width: 4, height: 4.4 }],
    ],
    teeth: STRAY_CHANCE,
  },
  {
    id: 'room.passage.sewer',
    type: 'passage',
    school: SILT,
    kind: 'vault',
    dressing: (school) => [
      runnel(school),
      thing(school, CAPS, { X: -5.4, Y: FLOOR, z: 16, width: 4.2, height: 2.6 }, 'the caps'),
      thing(school, BOTTLE, { X: 4.8, Y: FLOOR, z: 14, width: 1.4, height: 2 }, 'the bottle'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['sewer.channel', { X: 0, Y: FLOOR, z: 13, width: 3.4, height: 1.6 }],
      ['sewer.caps', { X: -5.4, Y: FLOOR, z: 16, width: 4.2, height: 2.6 }],
    ],
  },
  {
    id: 'room.open.barrow',
    type: 'omen',
    school: SLATE,
    kind: 'open',
    dressing: (school) => [
      thing(school, STATUE, { X: -16, Y: FLOOR, z: 23, width: 7, height: 10.5 }, 'the statue', 56),
      thing(school, STATUE, { X: 17, Y: FLOOR, z: 27, width: 7, height: 10.5 }, 'the statue', 56),
      thing(school, HANGED, { X: 11, Y: FLOOR + 8, z: 16, width: 5, height: 10 }, 'the hanged'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['barrow.sky', { X: 0, Y: FLOOR + 22, z: 30, width: 26, height: 12 }],
      ['barrow.statue', { X: -16, Y: FLOOR, z: 23, width: 7, height: 10.5 }],
      ['barrow.hanged', { X: 11, Y: FLOOR + 8, z: 16, width: 5, height: 10 }],
    ],
    teeth: NEVER,
  },
  {
    id: 'room.lair.choir',
    type: 'lair',
    school: CHALK,
    kind: 'chamber',
    dressing: (school) => [
      thing(school, CAGE, { X: -8.8, Y: FLOOR, z: 27, width: 4.6, height: 5.2 }, 'the cage'),
      thing(school, CHOIR, { X: 8.6, Y: FLOOR, z: 24, width: 7.5, height: 9.5 }, 'the choir', 50),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['choir.cage', { X: -8.8, Y: FLOOR, z: 27, width: 4.6, height: 5.2 }],
      ['choir.faces', { X: 8.6, Y: FLOOR, z: 24, width: 7.5, height: 9.5 }],
    ],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.trove.hoard',
    type: 'trove',
    school: OCHRE,
    kind: 'chamber',
    dressing: (school) => [
      thing(school, COINS, { X: 1.5, Y: FLOOR, z: 16, width: 5, height: 2.6 }, 'the coins'),
      thing(school, LANTERN, { X: -6.5, Y: FLOOR + 5.5, z: 19, width: 2.2, height: 2.4 }, 'the lantern', 46, FIRE),
      thing(school, KNIFE, { X: 7, Y: FLOOR, z: 21, width: 2, height: 2 }, 'the knife'),
      thing(school, RING, { X: -2.5, Y: FLOOR, z: 12, width: 1.2, height: 1.4 }, 'the ring'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['hoard.coins', { X: 1.5, Y: FLOOR, z: 16, width: 5, height: 2.6 }],
      ['hoard.lantern', { X: -6.5, Y: FLOOR + 5.5, z: 19, width: 2.2, height: 2.4 }],
      ['hoard.ring', { X: -2.5, Y: FLOOR, z: 12, width: 1.2, height: 1.4 }],
    ],
    floor: 0.5,
  },
  {
    id: 'room.puzzle.watcher',
    type: 'puzzle',
    school: VERDIGRIS,
    kind: 'hall',
    dressing: (school) => [
      thing(school, WATCHER, { X: -9.5, Y: FLOOR, z: 26, width: 8.5, height: 11.5 }, 'the watcher', 52),
      thing(school, SKULL, { X: 6.5, Y: FLOOR, z: 15, width: 1.8, height: 2 }, 'the skull'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['watcher.neck', { X: -9.5, Y: FLOOR, z: 26, width: 8.5, height: 11.5 }],
      ['watcher.skull', { X: 6.5, Y: FLOOR, z: 15, width: 1.8, height: 2 }],
    ],
  },
  {
    id: 'room.lair.crawl',
    type: 'lair',
    school: SOOT,
    kind: 'low',
    dressing: (school) => [
      dragMark(school),
      thing(school, MANY, { X: -1, Y: FLOOR, z: 17, width: 10, height: 6.6 }, 'the many', 46),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [['crawl.legs', { X: -1, Y: FLOOR, z: 17, width: 10, height: 6.6 }]],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.trove.buried',
    type: 'trove',
    school: OCHRE,
    kind: 'hall',
    // art. 102: one form, and the rays hit it. Not eight dune sprites,
    // which would read as eight small piles because that is what they are.
    buried: (school, shape) => {
      const sand = sandOf(school)
      return dune(sand.ramp, sand.base, {
        // It comes in from the far end, so the floor you are standing on is
        // still floor and the room is visibly being taken rather than gone.
        from: 11,
        crest: 30,
        high: 5.4,
        // art. 103: banked against the walls, which is most of what makes a
        // room look buried rather than decorated.
        banked: 8,
        halfWidth: shape.width,
        until: 44,
        relief: 9,
        ripple: 0.3,
      })
    },
    dressing: (school) => [
      // art. 103: anything standing in a mass stands at the mass's height.
      thing(school, SKULL, { X: -6.5, Y: FLOOR + 2.4, z: 19, width: 1.9, height: 2.1 }, 'the skull'),
      thing(school, BOTTLE, { X: 5.2, Y: FLOOR + 1.9, z: 16, width: 1.5, height: 2.1 }, 'the bottle'),
      thing(school, HANGED, { X: 9, Y: FLOOR + 11, z: 24, width: 5, height: 10 }, 'the hanged'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['buried.sand', { X: 0, Y: FLOOR + 1.5, z: 14, width: 12, height: 3 }],
      ['buried.skull', { X: -6.5, Y: FLOOR + 2.4, z: 19, width: 1.9, height: 2.1 }],
    ],
    floor: 0.55,
  },
  {
    id: 'room.warden',
    type: 'warden',
    school: IRON,
    kind: 'hall',
    dressing: () => [],
    tappables: [
      // The lock is a small thing on a large one, and both answer (art. 69).
      // Both derive from where the threshold actually stands, so neither can
      // drift off the door when the shape changes under them (art. 68).
      ['warden.lock', lockOn(WARDEN_DOOR)],
      ['warden.door', WARDEN_DOOR],
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
/**
 * art. 97: the room's thresholds, one per door offered. A room that ends in
 * one door and a crossroads that offers three are the same grammar at
 * different widths — which is the article's point, and why this lives here
 * rather than in any room's dressing.
 *
 * A room with no doors dealt yet paints the one it must have: the far end of
 * an authored room is a way on whether or not the chain has said so.
 */
function thresholds(one: Authored, state: SceneState): readonly Prop[] {
  // art. 96: a tube has no far wall, so it has nothing for a door to be a
  // hole in — its way on is the mouth. Painting a threshold there would put a
  // frame in mid air, which is the thing art. 97 refuses, so this refuses it
  // instead of drawing it. Nothing declares a tube today; the guard is here
  // so that the day something does, it fails visibly rather than floating.
  if (SHAPES[one.kind].back === undefined && SHAPES[one.kind].open !== true) return []
  const ways: readonly DoorState[] =
    state.doors.length > 0 ? state.doors : [{ at: 0, open: false, locked: false, ends: false }]
  const marks = doorMarks(one.kind, ways.length)
  // art. 21: the school is the room's, so one drawing serves the drowned and
  // the burnt as one threshold in two keys (art. 100).
  return ways.map((door, i) =>
    threshold(one.school, marks[i]!, {
      open: door.open,
      locked: door.locked,
      warden: door.ends,
    }),
  )
}

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
      // The reference plate keeps its props, its light and its palette, and
      // takes the room's shape. WAKE is authored as a tube and stays one
      // wherever it is rendered as itself — it still wins ties about the box
      // — but the room the Crossing *is* ends in a wall like every other,
      // because its doors are holes and a hole needs a wall (arts 96, 97).
      const base = one.plate
        ? { ...one.plate, shape }
        : plainScene(
            one.id,
            one.school,
            shape,
            () => one.dressing(one.school, state),
            one.buried?.(one.school, shape),
          )
      // art. 97: every door the room offers is a threshold, and every
      // threshold is drawn. This is the room's, not the dressing's — the
      // grammar never varies between rooms, so no room gets to author it.
      const ways = thresholds(one, state)
      const laid = [...ways, ...socketProps(one, state)]
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
    doorMarks: (count) => doorMarks(one.kind, count),
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
      rooms: [
        room('room.passage.drip'),
        room('room.lair.cistern'),
        room('room.trove.sump'),
        room('room.passage.sewer'),
      ],
    },
    {
      id: BURNT,
      rooms: [
        room('room.passage.ash'),
        room('room.lair.kiln'),
        room('room.omen.pyre'),
        room('room.lair.crawl'),
      ],
    },
    {
      id: OSSUARY,
      rooms: [
        room('room.lair.den'),
        room('room.passage.bonefield'),
        room('room.puzzle.tally'),
        room('room.lair.choir'),
      ],
    },
  ],
  neutral: [
    room('room.trove.alcove'),
    room('room.passage.stair'),
    // The look wave's new kinds: a hall that stops a long way off, ground
    // with a sky over it, a hoard, and something with a long neck.
    room('room.hall.throne'),
    room('room.open.barrow'),
    room('room.trove.hoard'),
    room('room.puzzle.watcher'),
    room('room.trove.buried'),
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
