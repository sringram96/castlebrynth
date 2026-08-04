import type { Framebuffer } from './framebuffer.js'
import type { Projected, RoomShape, View } from './view.js'

/**
 * The four colours the box itself needs. Everything else about a room's
 * light and palette is authorial and lives with the scene (art. 21).
 */
export interface RoomPalette {
  /** The contour ink, laid exactly where surfaces meet (art. 18). */
  readonly edge: string
  /** The lit rim just under the ceiling cut. */
  readonly rim: string
  /** What the distance dither resolves to. */
  readonly dark: string
  /** The lighter second step of the distance dither. */
  readonly haze: string
  /** Structural near-black past the cutoff (art. 16). */
  readonly hollow: string
  /** The mouth's dithered breath (art. 16). */
  readonly breath: string
}

/**
 * Surfaces are textured in world space, so diminution is honest (art. 15).
 * The engine asks; the scene answers. No global light rule (art. 21).
 */
export interface SurfaceShaders {
  /** `side` is −1 for the left wall, +1 for the right; `height` is above the floor. */
  wall(side: -1 | 1, z: number, height: number): string
  ceiling(z: number, x: number): string
  floor(z: number, x: number): string
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
 * A room, as the renderer sees it: three authored numbers, the palette and
 * shaders that dress them, and the props standing in it.
 */
export interface Scene {
  readonly id: string
  readonly shape: RoomShape
  readonly palette: RoomPalette
  readonly surfaces: SurfaceShaders
  /** Props need the derived view to place themselves in world depth. */
  props(view: View): readonly Prop[]
}
