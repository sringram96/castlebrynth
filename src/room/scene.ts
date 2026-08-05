import type { Framebuffer } from './framebuffer.js'
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
}

/**
 * The room's light, as a lift along the ramp. One station only — the light
 * that stands where you do, falling off with distance — because the light
 * stations are a later wave; this is the existing light, expressed.
 */
export interface Light {
  /** How far the lift reaches, in world units. Zero is a room with no light. */
  readonly reach: number
  /** How many ramp steps it lifts at its brightest. */
  readonly lift: number
  /** What colour lit pixels are nudged toward, sparingly, after quantisation. */
  readonly tint: string
  /** How far toward it. Small: the ramp should be doing the work. */
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
}

/** Which surface a pixel first hit. Also the contour pass's alphabet. */
export const Surface = {
  Mouth: 0,
  WallLeft: 1,
  WallRight: 2,
  Ceiling: 3,
  Floor: 4,
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
  readonly look: Look
  readonly surfaces: SurfaceShaders
  /** Props need the derived view to place themselves in world depth. */
  props(view: View): readonly Prop[]
}
