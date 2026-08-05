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
  /**
   * art. 96: where the room ends, if it ends. A **chamber** authors the
   * depth of its far wall — the only fourth number, and it says where the
   * room stops rather than how wide it is. Left out, the room is a **tube**:
   * no far wall, and the mouth is the way on (art. 16).
   *
   * Shape sits above proportion. The three dials make a room bigger or
   * smaller; this is what makes it a place you stand in rather than one you
   * pass through.
   */
  readonly back?: number
  /**
   * art. 96: the **open** — no walls and no ceiling. A ray hits the ground
   * or it hits the sky, and the sky is a ramp with a scattered field in it
   * (art. 101). Everything else about the box is unchanged: the camera is
   * still a person, the horizon is still fixed, and the ground still
   * diminishes honestly.
   */
  readonly open?: boolean
  /**
   * art. 96: the **junction** — a chamber whose side apertures are wide and
   * full-height, where a door is a direction you turn rather than an item you
   * pick. Declared per wall, because a junction that offers one way on is a
   * corner and still a junction: the room deals the turns it has ways out of,
   * and never one it does not (art. 70 — the pixels may not offer what the
   * chain does not).
   */
  readonly turns?: { readonly left?: Turn; readonly right?: Turn }
}

/**
 * One of art. 96's turns, as the cast sees it: a stretch of side wall that
 * is not there, and a corridor going out behind it.
 *
 * It is geometry and not a painting, for the reason art. 102 gives about
 * masses: an opening painted on a side wall would run flat across the frame
 * instead of receding, would agree in size with nothing else in the room,
 * and could not hide what stands behind it. Cast, all three stop being
 * true — the floor and the ceiling run on into the turn by themselves, the
 * jamb narrows by the same perspective as everything else, and art. 18's
 * contour inks the hole without anybody drawing it.
 */
export interface Turn {
  /** Where along the wall the aperture starts and stops, in depth. */
  readonly from: number
  readonly to: number
  /**
   * How far out the turn runs before there is nothing left to see: past it
   * is the mouth (art. 16), because you cannot see round a corner and the
   * game already has a way of saying so.
   */
  readonly throat: number
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
   * art. 96: where the far wall stands, or Infinity in a tube. A chamber's
   * wall stands *inside* the fog — the room ends, which is what makes it a
   * place — so past this depth there is nothing to cast.
   */
  readonly zBack: number
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
    zBack: shape.back ?? Infinity,
    project(X: number, Y: number, z: number): Projected {
      return { x: frame.cx + (f * X) / z, y: frame.cy - (f * Y) / z, scale: f / z }
    },
  }
}
