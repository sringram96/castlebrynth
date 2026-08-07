/**
 * What art a scene has, as data — art. 126.
 *
 * A room is still a box, a school, a shape and its things (art. 93). This
 * file is what a room may additionally *carry*: authored material over its
 * surfaces, one thing it is about, what you are holding at the bottom of the
 * lens, and the small parts of any of those that move.
 *
 * Everything here is placement and identity. Nothing here is a filename, a
 * pixel, or a canvas — a scene's art can be written, read and tested without
 * a browser in the room, which is what makes the density affordable: the
 * expensive information lives in the raster, and the cheap information about
 * *where the raster goes* lives here where it can be checked.
 */

import type { WorldMark } from '../room/index.js'
import type { VisualLayer } from './layers.js'

/**
 * Where a thing is anchored.
 *
 * A **world** anchor is art. 19's: a world coordinate and a world size, so
 * the thing diminishes by 1/z like everything else in the box and the same
 * rectangle that paints it is the rectangle that answers a tap (art. 68).
 * Anything standing *in* the room is anchored this way.
 *
 * A **frame** anchor is for the two things that are not in the room: what
 * you are carrying, and the tray's own furniture. It is in fractions of the
 * frame rather than pixels, because art. 22 says nothing is fixed in device
 * pixels and art. 24 says the frame's height comes from the device — so a
 * lantern pinned to the bottom edge is still pinned to it on a taller phone.
 */
export type Anchor =
  | { readonly space: 'world'; readonly at: WorldMark }
  | {
      readonly space: 'frame'
      /** 0 is the left edge, 1 the right. */
      readonly x: number
      /** 0 is the top, 1 the bottom. */
      readonly y: number
      /** Which point of the thing lands on (x, y). */
      readonly origin: FrameOrigin
      /** Width as a fraction of the frame's width; height follows the master. */
      readonly width: number
    }

export type FrameOrigin =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/** One authored thing, placed. */
export interface PlacedPlate {
  /** An id in the manifest. Never a path (art. 126). */
  readonly asset: string
  readonly layer: VisualLayer
  readonly anchor: Anchor
  /**
   * A multiplier on the size the anchor works out to. Absent is 1, which is
   * what almost everything wants — the anchor is the statement of size and
   * this is the nudge.
   */
  readonly scale?: number
  /**
   * Ties are broken by declaration order, and a plate may say so explicitly
   * when the order it is declared in is not the order it wants. Absent is
   * "wherever I was declared", which is the honest default.
   */
  readonly order?: number
}

/**
 * arts 107, 127: **a patch is a one-shot or a loop that covers only the part
 * that changes.**
 *
 * This is art. 110's overlay repaint said about authored art instead of
 * about props: the base frame is cast once and held, and a candle that
 * gutters repaints forty pixels rather than two hundred and sixty rows. A
 * creature does not need twelve redraws to breathe — it needs two frames of
 * the part of it that breathes.
 *
 * art. 107 is unchanged and binding: three loops in a room, three authored
 * frames each, on the one world clock. A patch is not a way around the
 * budget, it is a way of paying less for the things already in it.
 */
export interface AnimatedPatch {
  readonly id: string
  /** Asset ids, in order. art. 107: at most three for a loop. */
  readonly frames: readonly string[]
  /**
   * How many ticks of the world clock (art. 109) each frame stands for. In
   * ticks and not milliseconds, because there is one clock and everything
   * that loops rides it — a patch with its own timer would drift.
   */
  readonly every: number
  readonly anchor: Anchor
  readonly layer: VisualLayer
  /**
   * When it runs. `idle` is a loop in a still room; `fight` runs only while
   * something is close; `event` is a one-shot the shell fires and does not
   * repeat (art. 107's second kind).
   */
  readonly trigger: PatchTrigger
  /**
   * art. 109: the phase offset, hashed from identity rather than timed, so
   * two candles in one room do not gutter together and the same room
   * breathes the same way every time you stand in it. Absent is derived
   * from the patch's own id, which is what almost everything wants.
   */
  readonly phase?: number
}

export type PatchTrigger = 'idle' | 'fight' | 'event'

/**
 * A room's authored layer, over and above its computed box.
 *
 * Every field is optional and the empty object is legal: a room with no
 * `SceneArt` is exactly the room the renderer drew before this wave, which
 * is what makes the migration additive rather than a rewrite (art. 126).
 */
export interface SceneArt {
  /** Material and architecture laid over the school's own surfaces. */
  readonly overlays?: readonly PlacedPlate[]
  /** art. 104: the one thing. If two things compete to be it, the room has none. */
  readonly hero?: PlacedPlate
  /** What you are carrying, at the bottom edge of the lens (art. 126). */
  readonly foreground?: PlacedPlate
  readonly patches?: readonly AnimatedPatch[]
}

/** Nothing authored. The honest default for a room that has not been dressed. */
export const NO_ART: SceneArt = {}

/**
 * art. 104: **one hero per room.** The type already allows only one `hero`,
 * so what this catches is the other half of the article — a room that piles
 * things onto the hero band and lets them fight over being the one thing.
 */
export function heroFaults(art: SceneArt): readonly string[] {
  const faults: string[] = []
  const heroes = (art.overlays ?? []).filter((one) => one.layer === 5)
  if (heroes.length > 0 && art.hero !== undefined) {
    faults.push(`two things compete to be the one thing: ${heroes.map((h) => h.asset).join(', ')}`)
  }
  if (heroes.length > 1) {
    faults.push(`${heroes.length} things on the hero band, so the room has no hero`)
  }
  return faults
}
