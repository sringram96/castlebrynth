import type { Framebuffer } from './framebuffer.js'
import type { Mass } from './mass.js'
import type { Ramp } from './ramp.js'
import type { Projected, RoomShape, View } from './view.js'

/**
 * The four colours the box itself needs, none of which are on a ramp: the
 * contour ink, the rim, and the two the mouth is made of. Everything a
 * surface takes comes off its ramp instead (see `SurfaceRamps`).
 */
export interface RoomPalette {
  /** The contour ink, laid exactly where surfaces meet (art. 18). */
  readonly edge: string
  /** The lit rim just under the ceiling cut. */
  readonly rim: string
  /** Structural near-black past the cutoff (art. 16). */
  readonly hollow: string
  /** The mouth's dithered breath (art. 16). */
  readonly breath: string
}

/** One ramp per surface. A surface pixel never takes a colour off another. */
export interface SurfaceRamps {
  readonly wall: Ramp
  readonly floor: Ramp
  readonly ceiling: Ramp
  /** art. 96: an open room's sky. Absent everywhere a room has a ceiling. */
  readonly sky?: Ramp
}

/**
 * art. 113: where a light *stands*. A station is a place in the room and
 * never a direction, so the lift falls off from somewhere — which is the
 * lever that inverts a room. Lit from below, the ceiling becomes the
 * darkest surface in the frame.
 */
export type Station =
  /** The light that stands where you do. */
  | 'with'
  /** Overhead — a grate, a hole in the roof, a hanging lamp. */
  | 'above'
  /** Underfoot — water throwing it up, embers, something down there. */
  | 'below'
  /** At the far end, so the room is lit from where you are going. */
  | 'ahead'
  /** None. The ramp and the air are the whole of it. */
  | 'none'

/**
 * The room's light: a station, a reach, and a colour (art. 113). The colour
 * is applied after quantisation and in proportion to how lit a pixel is, so
 * light warms what it reaches and leaves the rest to the ramp.
 *
 * art. 114: at sixty-four steps the palette stops carrying identity on its
 * own, so this is where a region is recognised — the drowned lit from below
 * through water, the burnt from its embers, the ossuary close and with you.
 */
export interface Light {
  /** art. 113: where it stands. */
  readonly station: Station
  /** How far the lift reaches, in world units. Zero is a room with no light. */
  readonly reach: number
  /** How many ramp steps it lifts at its brightest. */
  readonly lift: number
  /** What colour lit pixels are nudged toward, after quantisation. */
  readonly tint: string
  /** How far toward it. The ramp should still be doing most of the work. */
  readonly tintAmt: number
}

/** The air between you and the far end: a drop along the ramp, and a colour. */
export interface Air {
  /** What heavy fog nudges toward — the same darkness the mouth is (art. 16). */
  readonly tint: string
  /** How thick this room's air is, against the configuration's fog. */
  readonly rate: number
}

/**
 * Everything authorial about how a room is lit and coloured (art. 21),
 * gathered in one place: no global light rule, so this is a school and not
 * a setting.
 */
export interface Look {
  readonly palette: RoomPalette
  readonly ramps: SurfaceRamps
  readonly light: Light
  readonly air: Air
}

/**
 * Surfaces are textured in world space, so diminution is honest (art. 15).
 * The engine asks; the scene answers. No global light rule (art. 21).
 *
 * The answer is a position on the surface's ramp, unlit and unfogged — the
 * material's own scalar. Light and distance are added by the cast; the one
 * dither comes after both.
 */
export interface SurfaceShaders {
  /** `side` is −1 for the left wall, +1 for the right; `height` is above the floor. */
  wall(side: -1 | 1, z: number, height: number): number
  ceiling(z: number, x: number): number
  floor(z: number, x: number): number
  /**
   * art. 96: the far wall of a chamber, across the end of the room. `x` runs
   * across it and `height` up it — the same two questions a side wall
   * answers, asked of the plane the room stops at.
   */
  back(x: number, height: number): number
  /**
   * art. 96: the sky of an open room, given how far above the horizon the
   * ray went. Answers a position on the sky's own ramp; the stars are the
   * cast's, because a field is scattered and never drawn (art. 101).
   */
  sky?(up: number, across: number): number
}

/** Which surface a pixel first hit. Also the contour pass's alphabet. */
export const Surface = {
  Mouth: 0,
  WallLeft: 1,
  WallRight: 2,
  Ceiling: 3,
  Floor: 4,
  /** art. 96: the wall a chamber ends in. A tube never has one. */
  Back: 5,
  /** art. 96: what an open room has instead of a ceiling. */
  Sky: 6,
  /** art. 102: the substance lying on the floor, which the rays hit. */
  Mass: 7,
} as const
export type SurfaceId = (typeof Surface)[keyof typeof Surface]

/**
 * What a prop is handed to paint itself: the projector, the frame, and the
 * two marks (a pixel, a rectangle) plus the deterministic noise. Props are
 * painted at world coordinates and scaled 1/z (art. 19).
 */
export interface Brush {
  readonly view: View
  readonly target: Framebuffer
  project(X: number, Y: number, z: number): Projected
  px(color: string, x: number, y: number): void
  rect(color: string, x: number, y: number, w: number, h: number): void
  dither(x: number, y: number, threshold: number): boolean
  hash(x: number, y: number): number
  /** The depth already written at a pixel — the z-buffer stands ready (art. 19). */
  depthAt(x: number, y: number): number
}

/** A sprite at a world depth. Sorted far to near, painted near over far. */
export interface Prop {
  readonly name: string
  /** World depth of the prop's anchor, for the paint order (art. 19). */
  readonly z: number
  paint(brush: Brush): void
}

/**
 * A room, as the renderer sees it: three authored numbers, the look and
 * shaders that dress them, and the props standing in it.
 */
export interface Scene {
  readonly id: string
  readonly shape: RoomShape
  /**
   * art. 102: a substance lying in the room, as a height on the floor. The
   * cast marches every downward ray against it, so it occludes correctly,
   * meets the walls where the walls are, and takes the same light and the
   * same air as everything else — none of which is available to a crest
   * painted in screen space.
   */
  readonly mass?: Mass
  readonly look: Look
  readonly surfaces: SurfaceShaders
  /** Props need the derived view to place themselves in world depth. */
  props(view: View): readonly Prop[]
}
