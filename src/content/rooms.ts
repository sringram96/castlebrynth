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
import type {
  Blink,
  Drawn,
  Loop,
  Mass,
  Motion,
  Prop,
  RoomShape,
  Scene,
  Unbidden,
  WorldMark,
} from '../room/index.js'
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
import type { Feature } from './plates/features.js'
import {
  blindArcade,
  brickedUp,
  crack,
  layered,
  niche,
  pilasters,
  stringCourse,
  turnFrame,
} from './plates/features.js'
import { plainScene } from './plates/plain.js'
import {
  alcove,
  ashBanks,
  boneDrifts,
  dragMark,
  dust,
  fontSteps,
  kilnMouth,
  moteDrift,
  motes,
  passing,
  pyreStack,
  ripple,
  runnel,
  seep,
  sifting,
  sparks,
  standingWater,
  starTwinkle,
  stairHead,
  sumpGrate,
  tallyMarks,
  thing,
  threshold,
  turnStir,
  framedWidth,
} from './plates/props.js'
import {
  BEARER,
  BEARER_FRAMES,
  BELL,
  BOTTLE,
  BRAZIER,
  BRAZIER_FRAMES,
  CAGE,
  CAPS,
  CHOIR,
  CHOIR_DARK,
  COINS,
  HANGED,
  KNIFE,
  LANTERN,
  LANTERN_FRAMES,
  MANY,
  RING,
  SKULL,
  STATUE,
  THRONE,
  URN,
  WATCHER,
  WATCHER_DARK,
} from './plates/bestiary.js'
import { WAKE, masonry, wakeProps } from './plates/wake.js'
import { ARRIVALS, BEATS, LABELS, LOOKS, NOUNS } from './prose.js'
import { MOTION, RENDER } from './render.js'

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
/**
 * art. 96: the junction — a chamber whose side apertures are wide and
 * full-height, and the room where the labyrinth finally has lefts and
 * rights. It is deliberately shorter than a chamber: a room that ends soon
 * and opens sideways is a place you turn in, where the same proportions
 * ending far away would read as a corridor with dents in it.
 */
const JUNCTION = { lens: 96, width: 12, ceiling: 8, back: 34 } as const

/**
 * Where a junction's turns stand. `from` and `to` say how much of the wall
 * is gone; `throat` is how far the turn runs before there is nothing left
 * to see, which is why the outer edge of each opening is dark and the inner
 * edge is the wall the turn ends in (art. 96).
 */
const TURN = { from: 14, to: 26, throat: 7 } as const

/** Which of the boxes a room is, for the marks that derive from it. */
type ShapeKind =
  | 'corridor'
  | 'low'
  | 'chamber'
  | 'hall'
  | 'great'
  | 'vault'
  | 'open'
  | 'junction'

const SHAPES: Readonly<Record<ShapeKind, RoomShape>> = {
  corridor: CORRIDOR,
  low: LOW,
  chamber: CHAMBER,
  hall: HALL,
  great: GREAT,
  vault: VAULT,
  open: OPEN,
  junction: { ...JUNCTION, turns: { left: TURN } },
}

/**
 * arts 70, 96: a junction opens the ways it actually has.
 *
 * The turns are the exits, so a room that offers one way on has one hole in
 * it and a room that offers two has two. Casting a second aperture for a
 * door the chain never dealt would be pixels promising something the thumb
 * cannot press, which is the same defect art. 97 was written about from the
 * other side — a tap region standing over nothing.
 *
 * One door is a corner: you turn left, and that is the whole of the choice.
 * Three is a left, a right, and the way straight on, which is the only time
 * a junction wears an ordinary threshold as well.
 */
function shapeFor(kind: ShapeKind, doors: number): RoomShape {
  if (kind !== 'junction') return SHAPES[kind]
  return { ...JUNCTION, turns: doors >= 2 ? { left: TURN, right: TURN } : { left: TURN } }
}

/**
 * arts 68, 96: where a turn stands, for the thumb.
 *
 * A turn is not a billboard — it is a hole in a wall running away from the
 * camera — so the rectangle that answers for it is derived from where that
 * hole actually lands on the frame rather than authored beside it. The two
 * ends of the aperture project to `f·W/from` and `f·W/to`; this is the
 * world mark whose projection is exactly that span, which is what keeps the
 * region over the hole at every lens and every dial (arts 22–23).
 */
function turnMark(side: -1 | 1, shape: { readonly width: number; readonly ceiling: number }): WorldMark {
  const mid = (TURN.from + TURN.to) / 2
  const near = 1 / TURN.from
  const far = 1 / TURN.to
  return {
    X: side * mid * shape.width * ((near + far) / 2),
    Y: FLOOR,
    z: mid,
    width: mid * shape.width * (near - far),
    // Full-height: floor to ceiling, which is what makes it a way through
    // the wall rather than a niche in it (art. 96).
    height: RENDER.eye + shape.ceiling,
  }
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
 * art. 105: how far off the centre line the Crossing's shaft of light
 * stands, so its doors read *beside* it rather than through it. Far enough
 * that the leftmost of three thresholds is clear of the pool, and no
 * further: the shaft is still the room's hero and a hero pushed into the
 * corner is a hero nobody looks at.
 */
const SHAFT_ASIDE = -7.4

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
  // art. 96: only ever used for the way *straight on*, when a junction
  // offers one. Its lefts and rights are holes and not doors.
  junction: { high: 17.5, wide: 8 },
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
  // art. 96: a junction deals directions. One way on is a corner, two are a
  // left and a right, and three put the way straight on between them — so
  // the middle of three is the only threshold a junction ever wears, and the
  // outer two are the holes themselves.
  if (kind === 'junction') {
    const left = turnMark(-1, JUNCTION)
    const right = turnMark(1, JUNCTION)
    if (n === 1) return [left]
    if (n === 2) return [left, right]
    return [left, ...backWallMarks(kind, n - 2), right]
  }
  return backWallMarks(kind, n)
}

/**
 * The doors that are holes in the wall at the end of the room — which is
 * every door in the game except a junction's turns.
 */
function backWallMarks(kind: ShapeKind, n: number): readonly WorldMark[] {
  const plan = DOOR_PLAN[kind]
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
  junction: doorMarks('junction', 1)[0]!,
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
    // Brought forward from 22 by the threshold wave: it stood across the
    // middle of the watcher, so anything dealt into it covered the room's
    // one thing and the neck stopped answering (arts 69, 104–105).
    [MERCY_SOCKET]: { X: -9.5, Y: FLOOR, z: 15, width: 5, height: 8 },
  },
  great: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 40, width: 8, height: 11 },
    [FLOOR_SOCKET]: { X: 10.5, Y: FLOOR + 1.5, z: 21, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -10.5, Y: FLOOR, z: 25, width: 5.4, height: 8.5 },
  },
  vault: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 19, width: 3.6, height: 4.6 },
    [FLOOR_SOCKET]: { X: 5, Y: FLOOR + 1.2, z: 14, width: 3, height: 1.8 },
    // Moved back from 16 by the threshold wave: it stood exactly where the
    // sewer's caps stand, so anything the dealer put in it covered the
    // middle of them and the caps stopped answering (arts 69, 105). Nothing
    // has ever been dealt into it — the Savior is that rare — which is
    // precisely why nobody had run into it.
    [MERCY_SOCKET]: { X: -5, Y: FLOOR, z: 21, width: 3.2, height: 4.2 },
  },
  open: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 26, width: 7, height: 9.5 },
    [FLOOR_SOCKET]: { X: 9, Y: FLOOR + 1.5, z: 17, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -10, Y: FLOOR, z: 21, width: 5, height: 8 },
  },
  // art. 105: a junction's things stand *this* side of its turns. Anything
  // placed level with an opening is a thing standing in a doorway, and the
  // one order a room resolves in puts the exits before the things in it
  // (art. 104).
  junction: {
    [FAR_SOCKET]: { X: 0, Y: FLOOR, z: 30, width: 5.5, height: 7.5 },
    [FLOOR_SOCKET]: { X: 6.8, Y: FLOOR + 1.5, z: 11.5, width: 3.4, height: 2 },
    [MERCY_SOCKET]: { X: -6.8, Y: FLOOR, z: 12, width: 4.4, height: 6.8 },
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

// ── What a room spends its stillness on (arts 106–110, 117) ────────────

/**
 * art. 107: **stillness is capital.** Small animations have large effects
 * only because the world is still, so what a room may run is a budget and not
 * a feature — the doorways' stir, one hero element, and one field or mass
 * drifting.
 *
 * What is authored here is the room's *own* two. Every room with a way out
 * spends the doorways' stir, so `motionOf` adds that one rather than have it
 * written down twenty-two times.
 */
interface Moves {
  readonly loops?: readonly Loop[]
  readonly blink?: Blink
  readonly unbidden?: Unbidden
  /** art. 110: how many ramp steps this room's light swells by. */
  readonly swell?: number
}

const notNull = <T,>(one: T | null): one is T => one !== null

/**
 * art. 107's hero loop: a thing that burns. Its authored frames share one
 * silhouette (see `bestiary.ts`), so the flame moves and the lamp does not,
 * and the room's light swells with it (art. 110) — which is the half of fire
 * an overlay cannot paint.
 */
function fireLoop(
  school: School,
  id: string,
  frames: readonly Drawn[],
  mark: WorldMark,
  name: string,
  readableTo = 46,
): Loop {
  return {
    kind: 'hero',
    id,
    frames: frames.length,
    paint: (frame) => [thing(school, frames[frame]!, mark, name, readableTo, FIRE)].filter(notNull),
  }
}

/**
 * art. 107's drift: a field or a mass, turning over. The prop is the room's
 * own prop at a phase rather than a second drawing of it — running water is
 * the same channel at the same width and what the clock moves is the light on
 * it.
 */
function driftLoop(
  school: School,
  id: string,
  of: (school: School, phase: number) => Prop,
  frames = 3,
): Loop {
  return { kind: 'drift', id, frames, paint: (frame) => [of(school, frame)] }
}

/**
 * art. 108: the blink. The lit points go out for one frame, on a very long
 * clock, and nothing else in the room is allowed to be that rare.
 */
function blinkOf(
  school: School,
  id: string,
  dark: Drawn,
  mark: WorldMark,
  name: string,
  readableTo = 52,
): Blink {
  return {
    id,
    every: MOTION.blinkEvery,
    paint: () => [thing(school, dark, mark, name, readableTo)].filter(notNull),
  }
}

/** art. 117: a room doing one small thing of its own accord. */
function unbiddenOf(id: string, paint: Unbidden['paint']): Unbidden {
  return { id, frames: MOTION.unbidden.frames, paint }
}

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
  /**
   * arts 106–110, 117: what this room spends its stillness on, beyond the
   * doorways every room stirs. Absent on most of them, and that is the point
   * of the ones it is not absent on.
   */
  readonly moves?: (school: School) => Moves
  /** art. 99: the architecture on this room's walls, if it has any yet. */
  readonly built?: {
    readonly left?: Feature
    readonly right?: Feature
    readonly back?: Feature
  }
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
    /**
     * The reference plate — with its shaft moved aside, and only here.
     *
     * PR #44 recorded the debt and art. 105 is what it owes: the shaft was
     * composed against a mouth, and once the Crossing ended in a wall its
     * doors stood *behind* it and read through it. Supporting things stand
     * aside from the hero, never across it — and here the shaft is the hero
     * and the doors are the exits, which a room resolves *before* the one
     * thing in it (art. 104).
     *
     * The fix belongs to the room and not to the plate. `WAKE` rendered as
     * itself is a tube with no doors in it, where a shaft down the middle is
     * the right composition and always was; the defect appeared when the
     * shape changed under it, so the shape is where it is answered. The
     * reference still wins ties about intent, and the golden plate does not
     * move.
     */
    plate: { ...WAKE, props: wakeProps(SHAFT_ASIDE) },
    built: {
      // art. 99: the corridor you wake in is ribbed, and the stone behind
      // you is unbroken — so the crack is on the wall the chain hangs from,
      // where it is the first thing the room admits about itself.
      left: layered(crack(20, 15, 1, 23), pilasters(11, 1.9, 3)),
      right: stringCourse(9.5, 0.85),
      back: stringCourse(9.5, 0.85),
    },
    dressing: () => [],
    // art. 117: the grate lets go of what it has been holding. The room you
    // wake in is the one room every run stands in, so it is the first place
    // the labyrinth gets to do something nobody asked it to.
    moves: (school) => ({
      unbidden: unbiddenOf('room.crossing:grate', (frame) => [
        sifting(
          school,
          { X: SHAFT_ASIDE, Y: 3.4, z: 17.7, width: 5.6, height: 13 },
          frame,
          MOTION.unbidden.frames,
        ),
      ]),
    }),
    tappables: [
      // art. 68: the region answers for the thing where the thing stands, so
      // the grate's mark moves with the shaft rather than staying behind.
      ['crossing.grate', { X: SHAFT_ASIDE, Y: 4, z: 17.7, width: 7.5, height: 4 }],
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
    // art. 99: the alcove *is* architecture, so it is a recess cut into the
    // wall plane and not a thing painted on it — which is the difference
    // between a hole that recedes with the wall and a rectangle that does
    // not. A second, smaller one further along says the room was built for
    // keeping things in, and both of them are empty now.
    built: {
      right: layered(niche(21, 4.5, 12.5, 6.5), niche(30, 5, 10, 3.6)),
      left: stringCourse(8.6, 0.8),
    },
    dressing: (school) => [
      dust(school),
      // art. 104: the one thing, at a size that reads, and nearer the camera
      // at the frame's edge so it stands aside from the exits (art. 105).
      thing(school, COINS, { X: -7.2, Y: FLOOR, z: 11.5, width: 3.8, height: 2 }, 'the coins'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    // art. 117: the far niche gives up a little of what is in it, which is
    // the room's own furniture doing the room's own kind of nothing.
    moves: (school) => ({
      unbidden: unbiddenOf('room.trove.alcove:niche', (frame) => [
        sifting(
          school,
          { X: 8.4, Y: FLOOR + 6.2, z: 30, width: 2.6, height: 6.2 },
          frame,
          MOTION.unbidden.frames,
          1,
        ),
      ]),
    }),
    tappables: [
      ['alcove.dust', { X: 7.2, Y: FLOOR, z: 22.5, width: 3.4, height: 1.6 }],
      ['alcove.coins', { X: -7.2, Y: FLOOR, z: 11.5, width: 3.8, height: 2 }],
    ],
  },
  {
    id: 'room.passage.stair',
    type: 'passage',
    school: GRANITE,
    kind: 'junction',
    // art. 99: a course at landing height, and the stone cracked above it
    // where the flights stopped lining up. It is on the wall the room ends
    // in, because a junction's side walls are mostly hole and what little of
    // them is left belongs to the architraves (arts 96–97).
    built: { back: layered(stringCourse(10.5, 0.8), crack(5.5, 15, 1, 31)) },
    dressing: (school) => [stairHead(school)],
    // art. 117: grit slides off a tread and keeps going without you, which is
    // what the room's second candle already says it does.
    moves: (school) => ({
      unbidden: unbiddenOf('room.passage.stair:tread', (frame) => [
        sifting(
          school,
          { X: 0, Y: FLOOR + 1.4, z: 24, width: 5.2, height: 3.4 },
          frame,
          MOTION.unbidden.frames,
          2,
        ),
      ]),
    }),
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
    // art. 99: a blind arcade round the water at the height a person kneels,
    // and a course above it. This is the one room in the depth that was
    // *built* to be come to, and the architecture is where that is said —
    // art. 104's one thing here is the basin bound to its mercy socket, so
    // the walls carry the room and nothing else stands in it (art. 83).
    built: {
      left: layered(stringCourse(10, 0.7), blindArcade(6.5, 3.6, 0.5, 6.2)),
      right: layered(stringCourse(10, 0.7), blindArcade(6.5, 3.6, 0.5, 6.2, 3.2)),
      back: stringCourse(10, 0.7),
    },
    dressing: (school) => [fontSteps(school)],
    // arts 107, 117: a hand of water, and the two things water does — the
    // sheet turning over on the slow clock, and once, a ring crossing it
    // that nobody threw anything into.
    moves: (school) => ({
      loops: [driftLoop(school, 'room.sanctum.font:water', fontSteps)],
      unbidden: unbiddenOf('room.sanctum.font:ring', (frame) => [
        ripple(
          school,
          { X: 0, Y: FLOOR - 1.6, z: 18, width: 3.6, height: 0 },
          frame,
          MOTION.unbidden.frames,
        ),
      ]),
    }),
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
    kind: 'junction',
    // art. 99: the water comes in through the wall the room ends in, and it
    // has been coming in long enough to have opened it.
    built: { back: layered(crack(-4, 18, 0, 47), stringCourse(4.5, 0.7)) },
    dressing: (school) => [
      runnel(school),
      seep(school),
    ],
    // art. 107: the water in the cut is the one thing here that was never
    // still, so it is what this room spends its drift on.
    moves: (school) => ({ loops: [driftLoop(school, 'room.passage.drip:runnel', runnel)] }),
    tappables: [['drip.water', { X: 0, Y: FLOOR, z: 11, width: 6, height: 2.2 }]],
  },
  {
    id: 'room.lair.cistern',
    type: 'lair',
    school: BRINE,
    kind: 'chamber',
    // art. 99: a tank, so it is coursed round at the height the water once
    // stood and arcaded above it — and the arcade wears no architrave, so
    // nothing in it can be taken for a way out (art. 97).
    built: {
      left: layered(stringCourse(5.5, 0.9), blindArcade(9, 5, 7, 14)),
      right: layered(stringCourse(5.5, 0.9), blindArcade(9, 5, 7, 14, 4.5)),
      back: stringCourse(5.5, 0.9),
    },
    dressing: (school) => [
      standingWater(school),
      // art. 104: the cage is the one thing, and it stands off to the side
      // of whatever the far socket puts at the end of the room (art. 105).
      thing(school, CAGE, { X: -8.4, Y: FLOOR, z: 15, width: 4.4, height: 5 }, 'the cage'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    // art. 107: black water lies flat and does not lie still. The one line it
    // gives back is what moves, which is the only thing it ever had.
    moves: (school) => ({
      loops: [driftLoop(school, 'room.lair.cistern:water', standingWater)],
    }),
    tappables: [
      ['cistern.water', { X: 0, Y: FLOOR, z: 13, width: 12, height: 2.4 }],
      ['cistern.cage', { X: -8.4, Y: FLOOR, z: 15, width: 4.4, height: 5 }],
    ],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.trove.sump',
    type: 'trove',
    school: SILT,
    kind: 'low',
    // art. 99: a tidemark, coursed — the silt line the beats name, cut into
    // the wall rather than painted along it — and a way out somebody closed
    // when the depth started losing things down here.
    built: {
      left: layered(brickedUp(19, 7, 11), stringCourse(4.2, 0.6)),
      right: layered(crack(24, 14, 1, 53), stringCourse(4.2, 0.6)),
    },
    dressing: (school) => [
      sumpGrate(school),
      thing(school, SKULL, { X: -7.2, Y: FLOOR, z: 11.5, width: 2.6, height: 2.9 }, 'the skull'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['sump.grate', { X: 0, Y: FLOOR, z: 24, width: 5, height: 2 }],
      ['sump.skull', { X: -7.2, Y: FLOOR, z: 11.5, width: 2.6, height: 2.9 }],
    ],
  },
  {
    id: 'room.passage.ash',
    type: 'passage',
    school: ASH,
    kind: 'corridor',
    // art. 99: pilasters the ash has climbed, and a course above the reach
    // of it, so the wall says where the ash has got to without a word.
    built: {
      left: layered(stringCourse(12, 0.9), pilasters(9.5, 2.2, 2)),
      right: layered(stringCourse(12, 0.9), pilasters(9.5, 2.2, 6.5)),
    },
    dressing: (school) => [
      ashBanks(school),
      motes(school),
      // art. 104: somebody else is down here, and their lantern is the only
      // light in the room that is not the room's (art. 100's `*`).
      thing(
        school,
        BEARER,
        { X: 8.4, Y: FLOOR, z: 14, width: 4.4, height: 6.2 },
        'the lantern-bearer',
        40,
        FIRE,
      ),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    // arts 107, 110: the whole budget, and the room that earns it. The lantern
    // is the only light in here, so the fire moves *and* the light it throws
    // swells with it — which is the case art. 110 says has to be cast twice —
    // and the ash on the air turns over beside it.
    moves: (school) => ({
      loops: [
        fireLoop(
          school,
          'room.passage.ash:lantern',
          BEARER_FRAMES,
          { X: 8.4, Y: FLOOR, z: 14, width: 4.4, height: 6.2 },
          'the lantern-bearer',
          40,
        ),
        driftLoop(school, 'room.passage.ash:motes', moteDrift),
      ],
      swell: MOTION.swell,
    }),
    tappables: [
      ['ash.ash', { X: -8.5, Y: FLOOR, z: 15, width: 5, height: 2 }],
      ['ash.bearer', { X: 8.4, Y: FLOOR, z: 14, width: 4.4, height: 6.2 }],
    ],
  },
  {
    id: 'room.lair.kiln',
    type: 'lair',
    school: EMBER,
    kind: 'chamber',
    // art. 99: the kiln is not the only thing that was fired here. The
    // arches down the right are bricked flues, and the left wall has gone
    // where the heat was worst.
    built: {
      left: layered(crack(22, 20, 2, 67), stringCourse(13, 0.8)),
      right: blindArcade(10, 4.2, 0.5, 7, 4),
    },
    dressing: (school) => [
      kilnMouth(school),
      thing(
        school,
        BRAZIER,
        { X: -4.5, Y: FLOOR, z: 11, width: 4, height: 5.2 },
        'the brazier',
        44,
        FIRE,
      ),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    // arts 107, 110, 117: the brazier burns, the room breathes with it, and
    // once, without being asked, it throws something.
    moves: (school) => ({
      loops: [
        fireLoop(
          school,
          'room.lair.kiln:brazier',
          BRAZIER_FRAMES,
          { X: -4.5, Y: FLOOR, z: 11, width: 4, height: 5.2 },
          'the brazier',
          44,
        ),
      ],
      swell: MOTION.swell,
      unbidden: unbiddenOf('room.lair.kiln:sparks', (frame) => [
        sparks(
          school,
          { X: -4.5, Y: FLOOR, z: 11, width: 4, height: 5.2 },
          frame,
          MOTION.unbidden.frames,
          FIRE,
        ),
      ]),
    }),
    tappables: [
      ['kiln.mouth', { X: -12, Y: FLOOR + 2, z: 19, width: 3, height: 7 }],
      ['kiln.brazier', { X: -4.5, Y: FLOOR, z: 11, width: 4, height: 5.2 }],
    ],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.omen.pyre',
    type: 'omen',
    school: SOOT,
    kind: 'junction',
    // art. 99: the soot climbs the wall the room ends in, and stops at a
    // course somebody laid before any of this.
    built: { back: layered(stringCourse(9, 0.9), niche(0, 11, 16, 4.2)) },
    dressing: (school) => [pyreStack(school)],
    // art. 117: the stack settles a little further into itself. Nothing here
    // is burning any more, and it has not finished falling either.
    moves: (school) => ({
      unbidden: unbiddenOf('room.omen.pyre:ash', (frame) => [
        sifting(
          school,
          { X: 0, Y: FLOOR + 3.8, z: 21, width: 4.8, height: 4 },
          frame,
          MOTION.unbidden.frames,
          3,
        ),
      ]),
    }),
    tappables: [['pyre.timber', { X: 0, Y: FLOOR + 2, z: 21, width: 5.5, height: 4.5 }]],
  },
  {
    id: 'room.lair.den',
    type: 'lair',
    school: NOIR,
    kind: 'junction',
    // art. 96: the drag mark turns at the corner, and now there is a corner
    // for it to turn at. The wall it ends in has been gone over.
    built: { back: crack(2, 19, 0, 83) },
    dressing: (school) => [dragMark(school)],
    tappables: [['den.drag', { X: -3, Y: FLOOR, z: 18, width: 9, height: 2 }]],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.passage.bonefield',
    type: 'passage',
    school: CHALK,
    kind: 'low',
    // art. 99: loculi, which is what a wall of a bonefield is — three
    // shelves cut for people, and nothing on any of them now.
    built: {
      right: layered(niche(13, 3.5, 6.5, 4.4), niche(21, 3.5, 6.5, 4.4), niche(29, 3.5, 6.5, 4.4)),
      left: layered(stringCourse(7.5, 0.7), pilasters(8, 1.7, 1)),
    },
    dressing: (school) => [
      boneDrifts(school),
      thing(school, URN, { X: -7.2, Y: FLOOR, z: 11.5, width: 3, height: 3.7 }, 'the urn'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['bonefield.bone', { X: 8.5, Y: FLOOR, z: 15, width: 5, height: 2 }],
      ['bonefield.urn', { X: -7.2, Y: FLOOR, z: 11.5, width: 3, height: 3.7 }],
    ],
  },
  {
    id: 'room.puzzle.tally',
    type: 'puzzle',
    school: SLATE,
    kind: 'low',
    // art. 99: the tally is cut into the right-hand wall, so the wall gets a
    // course to cut it under and the left gets the crack that says how long
    // whoever cut it was down here.
    built: {
      right: stringCourse(7.8, 0.7),
      left: layered(crack(16, 13, 1, 97), crack(26, 15, 3, 41)),
    },
    dressing: (school) => [
      tallyMarks(school),
      // art. 104: it was rung for something, and it is hung too low to ring.
      thing(school, BELL, { X: -7.2, Y: FLOOR + 5.4, z: 12, width: 2.9, height: 3.2 }, 'the bell'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    tappables: [
      ['tally.marks', { X: 8.6, Y: FLOOR + 3, z: 20, width: 2.4, height: 4 }],
      ['tally.bell', { X: -7.2, Y: FLOOR + 5.4, z: 12, width: 2.9, height: 3.2 }],
    ],
  },
  {
    id: 'room.hall.throne',
    type: 'omen',
    school: THRONE_STONE,
    kind: 'great',
    // art. 99: a blind arcade down both walls and a course above it. The
    // arcade wears no architrave, so nothing in it can be mistaken for a way
    // out — art. 97 is what makes the two readable side by side.
    built: {
      left: layered(stringCourse(14.5), blindArcade(11, 6.4, 1, 12.5)),
      right: layered(stringCourse(14.5), blindArcade(11, 6.4, 1, 12.5, 5.5)),
      back: stringCourse(14.5),
    },
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
    built: { left: crack(11, 12, 1, 29), right: stringCourse(11, 0.7) },
    dressing: (school) => [
      runnel(school),
      thing(school, CAPS, { X: -5.4, Y: FLOOR, z: 16, width: 4.2, height: 2.6 }, 'the caps'),
      thing(school, BOTTLE, { X: 4.8, Y: FLOOR, z: 14, width: 1.4, height: 2 }, 'the bottle'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    // art. 107: the channel runs, here as in the wet passage. One prop, one
    // phase, two rooms — the same water in a different key (art. 100).
    moves: (school) => ({ loops: [driftLoop(school, 'room.passage.sewer:channel', runnel)] }),
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
    // arts 101, 117: the field this room is famous for, twinkling — and once,
    // a band of it going out and coming back. The barrow never says what
    // that was, because the roof is the thing this room does not have.
    moves: (school) => ({
      loops: [driftLoop(school, 'room.open.barrow:stars', starTwinkle)],
      unbidden: unbiddenOf('room.open.barrow:passing', (frame) => [
        passing(school, frame, MOTION.unbidden.frames),
      ]),
    }),
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
    // art. 99: niches down one wall, and every one of them is empty.
    built: {
      left: layered(niche(14, 6, 11, 3.4), niche(23, 6, 11, 3.4), niche(32, 6, 11, 3.4)),
      right: pilasters(9, 1.8, 3),
    },
    dressing: (school) => [
      thing(school, CAGE, { X: -8.8, Y: FLOOR, z: 15, width: 4.6, height: 5.2 }, 'the cage'),
      thing(school, CHOIR, { X: 8.6, Y: FLOOR, z: 24, width: 7.5, height: 9.5 }, 'the choir', 50),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    // art. 108: the blink, and the whole budget spent on one frame. Too many
    // faces, and once a minute every one of them goes out at once.
    moves: (school) => ({
      blink: blinkOf(
        school,
        'room.lair.choir:faces',
        CHOIR_DARK,
        { X: 8.6, Y: FLOOR, z: 24, width: 7.5, height: 9.5 },
        'the choir',
        50,
      ),
    }),
    tappables: [
      ['choir.cage', { X: -8.8, Y: FLOOR, z: 15, width: 4.6, height: 5.2 }],
      ['choir.faces', { X: 8.6, Y: FLOOR, z: 24, width: 7.5, height: 9.5 }],
    ],
    teeth: LAIR_CHANCE,
  },
  {
    id: 'room.trove.hoard',
    type: 'trove',
    school: OCHRE,
    kind: 'chamber',
    // art. 99: the lantern the beats name burns *in* something, and a niche
    // is what that is — architecture on the wall plane, so the recess
    // recedes with the wall instead of sitting on it.
    built: {
      left: layered(niche(19, 4.5, 9.5, 4.2), stringCourse(12, 0.8)),
      right: layered(crack(20, 15, 1, 29), stringCourse(12, 0.8)),
    },
    dressing: (school) => [
      thing(school, COINS, { X: 1.5, Y: FLOOR, z: 16, width: 5, height: 2.6 }, 'the coins'),
      thing(school, LANTERN, { X: -6.5, Y: FLOOR + 5.5, z: 19, width: 2.2, height: 2.4 }, 'the lantern', 46, FIRE),
      thing(school, KNIFE, { X: 7, Y: FLOOR, z: 21, width: 2, height: 2 }, 'the knife'),
      thing(school, RING, { X: -2.5, Y: FLOOR, z: 12, width: 1.2, height: 1.4 }, 'the ring'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    // arts 107, 110: the lantern in the niche is still burning, which is the
    // strangest thing in a room nobody has been in.
    moves: (school) => ({
      loops: [
        fireLoop(
          school,
          'room.trove.hoard:lantern',
          LANTERN_FRAMES,
          { X: -6.5, Y: FLOOR + 5.5, z: 19, width: 2.2, height: 2.4 },
          'the lantern',
          46,
        ),
      ],
      swell: MOTION.swell,
    }),
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
    // art. 99: a way out that somebody closed, and the wrong masonry inside
    // the frame is what says so — without a word of prose.
    built: {
      right: layered(brickedUp(24, 9, 17.5), stringCourse(19, 0.8)),
      left: layered(crack(18, 20, 3, 41), pilasters(11, 2, 4)),
    },
    dressing: (school) => [
      thing(school, WATCHER, { X: -9.5, Y: FLOOR, z: 26, width: 8.5, height: 11.5 }, 'the watcher', 52),
      thing(school, SKULL, { X: 6.5, Y: FLOOR, z: 15, width: 1.8, height: 2 }, 'the skull'),
    ].filter((one): one is NonNullable<typeof one> => one !== null),
    // art. 108: it is not looking at you yet, and once in a long while it is
    // not looking at anything. One frame, and it outweighs every loop here.
    moves: (school) => ({
      blink: blinkOf(
        school,
        'room.puzzle.watcher:neck',
        WATCHER_DARK,
        { X: -9.5, Y: FLOOR, z: 26, width: 8.5, height: 11.5 },
        'the watcher',
        52,
      ),
    }),
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
    // art. 99: the scoring does not stop at the floor. Both walls are opened
    // low down, at the height of whatever made it.
    built: {
      left: layered(crack(14, 6.5, 0, 71), crack(25, 5.5, 0, 19)),
      right: crack(20, 7, 0, 37),
    },
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
    // art. 99: a way out that somebody closed. It says what happened here
    // without a word of prose, which is the whole argument for the tier.
    built: { left: crack(16, 19, 2), right: stringCourse(17.5, 0.8) },
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
    // art. 99: the depth's one piece of ceremony. Pilasters down both walls
    // on a wide pitch and a course at the height of the door's top band, so
    // the hall reads as built for the door rather than as a room that
    // happens to have one at the end of it.
    built: {
      left: layered(stringCourse(19, 1.2), pilasters(13, 2.6, 4)),
      right: layered(stringCourse(19, 1.2), pilasters(13, 2.6, 4)),
      back: stringCourse(19, 1.2),
    },
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
function thresholds(one: Authored, state: SceneState, stir = 0): readonly Prop[] {
  // art. 96: a tube has no far wall, so it has nothing for a door to be a
  // hole in — its way on is the mouth. Painting a threshold there would put a
  // frame in mid air, which is the thing art. 97 refuses, so this refuses it
  // instead of drawing it. Nothing declares a tube today; the guard is here
  // so that the day something does, it fails visibly rather than floating.
  if (SHAPES[one.kind].back === undefined && SHAPES[one.kind].open !== true) return []
  const ways = waysOf(state)
  const marks = doorMarks(one.kind, ways.length)
  // art. 21: the school is the room's, so one drawing serves the drowned and
  // the burnt as one threshold in two keys (art. 100).
  return ways.flatMap((door, i) =>
    // art. 96: a junction's lefts and rights are not thresholds. They are
    // holes cast into the walls, and painting a frame over them in screen
    // space would run flat across the frame instead of receding — the same
    // failure art. 102 refused for masses. What the wall says about a turn is
    // the architrave, and that is a feature on the wall plane (art. 99).
    isTurn(one.kind, i, ways.length)
      ? []
      : [
          threshold(
            one.school,
            marks[i]!,
            { open: door.open, locked: door.locked, warden: door.ends },
            stir,
          ),
        ],
  )
}

/**
 * art. 106: **the thresholds stir, and almost nothing else does.** Every room
 * with a way out spends this loop, so it is built here rather than authored
 * twenty-two times — and a junction's turns are in it too, because a turn is
 * a doorway that happens to have been cast rather than drawn (art. 96).
 *
 * It is the one constant motion in an ordinary room. A glance finds the exits
 * without a word being written, which is the whole of what it buys.
 */
function doorwayLoop(one: Authored, state: SceneState): Loop {
  return {
    kind: 'threshold',
    id: `${one.id}:doorways`,
    frames: 3,
    paint: (frame) => [
      ...thresholds(one, state, frame),
      ...(one.kind === 'junction' ? [turnStir(one.school, frame)] : []),
    ],
  }
}

/** arts 106–110: everything that moves in this room, the doorways included. */
function motionOf(one: Authored, state: SceneState): Motion {
  const own = one.moves?.(one.school) ?? {}
  return {
    loops: [doorwayLoop(one, state), ...(own.loops ?? [])],
    ...(own.blink === undefined ? {} : { blink: own.blink }),
    ...(own.unbidden === undefined ? {} : { unbidden: own.unbidden }),
    ...(own.swell === undefined ? {} : { swell: own.swell }),
  }
}

/** The doors a room is standing with, or the one every authored room has. */
function waysOf(state: SceneState): readonly DoorState[] {
  return state.doors.length > 0
    ? state.doors
    : [{ at: 0, open: false, locked: false, ends: false }]
}

/** art. 96: whether this door of this room is a direction rather than a door. */
function isTurn(kind: ShapeKind, at: number, count: number): boolean {
  if (kind !== 'junction') return false
  return at === 0 || (count >= 2 && at === count - 1)
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

/**
 * arts 97, 99: what this room's walls carry, with a junction's architraves
 * laid over whatever else it authored.
 *
 * The frame answers first, because an architrave stands proud of everything
 * on the wall around it — a string course that ran across a doorway's jamb
 * would be a course the mason laid through a door.
 */
function builtOn(one: Authored, shape: RoomShape): NonNullable<Authored['built']> {
  const built = one.built ?? {}
  if (one.kind !== 'junction') return built
  const frame = turnFrame(TURN.from, TURN.to)
  return {
    ...built,
    ...(shape.turns?.left === undefined
      ? {}
      : { left: built.left === undefined ? frame : layered(frame, built.left) }),
    ...(shape.turns?.right === undefined
      ? {}
      : { right: built.right === undefined ? frame : layered(frame, built.right) }),
  }
}

function contentOf(one: Authored): RoomContent {
  const door = DOOR_AT[one.kind]
  return {
    id: room(one.id),
    type: one.type,
    school: one.school,
    kind: one.kind,
    shape: SHAPES[one.kind],
    scene: (state) => {
      // art. 96: a junction opens the ways it actually has, so its box is a
      // function of how many doors the chain dealt it. Every other room's
      // box is the same box whatever it offers.
      const shape = shapeFor(one.kind, waysOf(state).length)
      // The reference plate keeps its props, its light and its palette, and
      // takes the room's shape. WAKE is authored as a tube and stays one
      // wherever it is rendered as itself — it still wins ties about the box
      // — but the room the Crossing *is* ends in a wall like every other,
      // because its doors are holes and a hole needs a wall (arts 96, 97).
      const base = one.plate
        ? {
            ...one.plate,
            shape,
            // art. 99: a plate is a room like any other, so its walls carry
            // architecture like any other. The shaders are rebuilt rather
            // than the plate's reused, because a feature is a question about
            // the wall plane and the plate's shaders never had one.
            surfaces: masonry(one.school, shape, RENDER.eye, one.built ?? {}),
          }
        : plainScene(
            one.id,
            one.school,
            shape,
            () => one.dressing(one.school, state),
            one.buried?.(one.school, shape),
            builtOn(one, shape),
          )
      // art. 97: every door the room offers is a threshold, and every
      // threshold is drawn. This is the room's, not the dressing's — the
      // grammar never varies between rooms, so no room gets to author it.
      const ways = thresholds(one, state)
      const laid = [...ways, ...socketProps(one, state)]
      // arts 106–110: and what moves in it, which for most rooms is its
      // doorways and nothing else. The scene carries the loops; the shell
      // repaints them on the world clock, over the frame the cast made.
      const motion = motionOf(one, state)
      if (laid.length === 0) return { ...base, motion }
      // art. 19: painted near over far, so the list is declared far to near.
      return {
        ...base,
        motion,
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
