/**
 * The stir — arts 106–110, built.
 *
 * Three articles were ratified with nothing behind them for two waves, and
 * this is what they are made of:
 *
 * - **One world clock** (art. 109). Every loop in the game ticks on the same
 *   integer, and each instance offsets its phase deterministically from its
 *   own identity. No per-thing timers and no drift between visits: the same
 *   room breathes the same way every time you stand in it, which is what
 *   art. 28's "desynced" is actually made of.
 * - **Overlay repaint** (art. 110). A room's box, surfaces, features and
 *   light are cast once and cached; animation is repaint on top of that
 *   frame, never a recast. Where the whole room must breathe — torchlight
 *   swelling — the room is cast *twice*, a lift apart, and the two frames
 *   alternate. Motion never changes what a pixel *means*, only which prepared
 *   frame shows, so art. 17 holds unamended.
 * - **Stillness is capital** (art. 107). Motion is a budget and not a
 *   feature: at most three loops in a room, of at most three authored frames,
 *   and at most one blink. `overspent` is that budget as a function, so the
 *   law is checkable rather than quotable.
 *
 * Nothing here knows what a brazier is. A loop is frames and an identity; the
 * pixels are content's, exactly as everywhere else.
 */

import { hash } from './dither.js'
import type { Prop, Scene } from './scene.js'
import type { View } from './view.js'

/**
 * art. 107: which of the three a loop is, because only three things in a room
 * may run one — the thresholds' stir, one hero element, and one field or mass
 * drifting.
 */
export type LoopKind = 'threshold' | 'hero' | 'drift'

/** art. 107: at most three loops in a room, and at most three frames in one. */
export const MOST_LOOPS = 3
export const MOST_FRAMES = 3

/** One loop: a few authored frames on the world clock (arts 107, 109). */
export interface Loop {
  readonly kind: LoopKind
  /**
   * art. 109: what this loop's phase is offset by. Two loops in one room
   * carry different identities, so they never pulse together; one loop in two
   * instances of one room carries the same one, so it breathes the same way
   * every visit.
   */
  readonly id: string
  readonly frames: number
  paint(frame: number, view: View): readonly Prop[]
}

/**
 * art. 108: the blink. A single-frame event on a very long clock, and the
 * rarest motion reads the largest — eyes going out in a doorway once a minute
 * outweighs any loop in the room. At most one per room, and only where it
 * means something.
 */
export interface Blink {
  readonly id: string
  /** How many ticks apart. The long clock is the whole of the effect. */
  readonly every: number
  paint(view: View): readonly Prop[]
}

/**
 * art. 117: what a room does of its own accord. Rarely, deterministic per
 * instance, and never required reading — the pixels are the beat and the line
 * beside them is content's.
 */
export interface Unbidden {
  readonly id: string
  /** How many ticks it plays for, after which the room is as it was. */
  readonly frames: number
  paint(frame: number, view: View): readonly Prop[]
}

/** Everything that moves in a room, which for most rooms is one loop. */
export interface Motion {
  readonly loops: readonly Loop[]
  readonly blink?: Blink
  readonly unbidden?: Unbidden
  /**
   * art. 110: how many ramp steps this room's light swells by on the slow
   * clock. The one case where an overlay cannot do the work — a room lit by
   * something that flickers has to be cast twice, because the light reaches
   * every surface and a surface's colour is the cast's to decide (art. 15).
   */
  readonly swell?: number
}

/**
 * art. 109: a phase, from an identity. The same deterministic hash the box's
 * variation uses, walked over the text — so nothing anywhere in the game
 * needs a second source of not-quite-randomness (art. 17).
 */
export function phaseOf(id: string, over: number): number {
  if (over <= 1) return 0
  let n = 0
  for (let i = 0; i < id.length; i++) n = (n * 97 + hash(i, id.charCodeAt(i))) >>> 0
  return n % over
}

/** Which authored frame of this loop shows on this tick (art. 109). */
export function loopFrame(loop: Loop, tick: number): number {
  if (loop.frames <= 1) return 0
  return (((tick + phaseOf(loop.id, loop.frames)) % loop.frames) + loop.frames) % loop.frames
}

/** art. 108: whether the blink fires on this tick. One frame, and then not. */
export function blinks(blink: Blink, tick: number): boolean {
  if (blink.every <= 0) return false
  return (((tick + phaseOf(blink.id, blink.every)) % blink.every) + blink.every) % blink.every === 0
}

/**
 * art. 110: the overlay a room repaints on this tick, on top of the frame the
 * cast already made. Empty for a room that spends nothing, which is most of
 * what stillness being capital means.
 */
export function stirring(
  motion: Motion | undefined,
  view: View,
  tick: number,
): readonly Prop[] {
  if (motion === undefined) return []
  const laid = motion.loops.flatMap((loop) => loop.paint(loopFrame(loop, tick), view))
  const eyes =
    motion.blink !== undefined && blinks(motion.blink, tick) ? motion.blink.paint(view) : []
  // art. 19: painted near over far, like every other prop in the game.
  return [...laid, ...eyes].sort((one, other) => other.z - one.z)
}

/** art. 117: the unbidden beat's own pixels, `frame` ticks into it. */
export function unbidding(
  motion: Motion | undefined,
  view: View,
  frame: number,
): readonly Prop[] {
  const one = motion?.unbidden
  if (one === undefined || frame < 0 || frame >= one.frames) return []
  return [...one.paint(frame, view)].sort((a, other) => other.z - a.z)
}

/**
 * art. 110: the same room with its light a half-step up — the second of the
 * two frames a swelling room alternates between. It is a *cast*, not an
 * overlay, because the light reaches every surface and what colour a surface
 * takes is the cast's to decide (art. 15).
 */
export function breathing(scene: Scene, steps: number): Scene {
  return {
    ...scene,
    look: {
      ...scene.look,
      light: { ...scene.look.light, lift: scene.look.light.lift + steps },
    },
  }
}

/** Which of a swelling room's two cast frames shows on this tick. */
export function swelling(scene: Scene, tick: number): boolean {
  const steps = scene.motion?.swell
  if (steps === undefined || steps === 0) return false
  return (tick + phaseOf(`${scene.id}:swell`, 2)) % 2 === 1
}

/**
 * art. 107 as a function: what a room has overspent, said plainly. Empty is a
 * room inside the budget.
 *
 * Every added motion devalues every other, so this is not a style guide — it
 * is the article, and the test that reads it is where the article binds.
 */
export function overspent(motion: Motion): readonly string[] {
  const wrong: string[] = []
  if (motion.loops.length > MOST_LOOPS) wrong.push(`${motion.loops.length} loops`)
  for (const loop of motion.loops) {
    if (loop.frames > MOST_FRAMES) wrong.push(`${loop.id}: ${loop.frames} frames`)
    if (loop.frames < 1) wrong.push(`${loop.id}: no frames`)
  }
  // Only three *things* in a room may run a loop, and they are named things:
  // the thresholds' stir, one hero element, one field or mass drifting.
  for (const kind of ['threshold', 'hero', 'drift'] as const) {
    const many = motion.loops.filter((loop) => loop.kind === kind)
    if (many.length > 1) wrong.push(`${many.length} ${kind} loops`)
  }
  const ids = new Set(motion.loops.map((loop) => loop.id))
  if (ids.size !== motion.loops.length) wrong.push('two loops on one identity')
  return wrong
}
