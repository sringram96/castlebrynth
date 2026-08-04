import type { Frame, RenderConfig } from './config.js'
import { focalLength, frameOf } from './config.js'

/**
 * art. 14: a room's shape is exactly three authored numbers. Nothing else
 * about the box is authored — focal length derives from lens, the depths
 * derive from the focal length, the frame derives from the device.
 */
export interface RoomShape {
  /** Field of view, in degrees. */
  readonly lens: number
  /** Half-width of the corridor, in world units. */
  readonly width: number
  /** Ceiling height above the eye, in world units. */
  readonly ceiling: number
}

/**
 * Where a thing stands, for the thumb: a billboard rectangle anchored at a
 * world point, sized in world units. arts 19 and 68 together — a thing is
 * painted at world coordinates, so the region that answers a tap on it is
 * derived from the same coordinates rather than authored twice.
 */
export interface WorldMark {
  readonly X: number
  /** Height above the eye line; the floor is at −eye, as everywhere else. */
  readonly Y: number
  readonly z: number
  /** In world units, so the mark diminishes with the thing (art. 19). */
  readonly width: number
  readonly height: number
}

/** A mark's rectangle in frame pixels, clipped to nothing outside the frame. */
export interface MarkRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * A world mark, projected. The anchor is the rectangle's bottom centre — a
 * thing stands on the point it is placed at.
 */
export function markRect(view: View, mark: WorldMark): MarkRect {
  const foot = view.project(mark.X, mark.Y, mark.z)
  const half = (view.f * mark.width) / mark.z / 2
  const tall = (view.f * mark.height) / mark.z
  return { x: foot.x - half, y: foot.y - tall, width: half * 2, height: tall }
}

/** Screen position and 1/z scale of a world point (art. 19). */
export interface Projected {
  readonly x: number
  readonly y: number
  readonly scale: number
}

/**
 * Everything derived from a shape and a configuration. The camera is a
 * person: fixed eye height, fixed horizon, one vanishing point (art. 13).
 * There is no camera X — the lean is PARKED (art. 8).
 */
export interface View {
  readonly config: RenderConfig
  readonly frame: Frame
  readonly shape: RoomShape
  /** Derived from lens; never authored (art. 14). */
  readonly f: number
  /** Eye height above the floor, in world units. */
  readonly eye: number
  /** The depth at which the walls meet the frame edge. */
  readonly z0: number
  /** The cutoff: past this is the mouth (art. 16). */
  readonly zMouth: number
  /**
   * Y is up: the floor sits at -eye, the ceiling at +ceiling.
   * sx = cx + f·X/z, sy = cy − f·Y/z.
   */
  project(X: number, Y: number, z: number): Projected
}

export function viewOf(shape: RoomShape, config: RenderConfig): View {
  const frame = frameOf(config)
  const f = focalLength(shape.lens, config.grid)
  const z0 = (f * shape.width) / frame.cx
  const zMouth = (f * shape.width) / (config.grid * config.mouth)
  return {
    config,
    frame,
    shape,
    f,
    eye: config.eye,
    z0,
    zMouth,
    project(X: number, Y: number, z: number): Projected {
      return { x: frame.cx + (f * X) / z, y: frame.cy - (f * Y) / z, scale: f / z }
    },
  }
}
