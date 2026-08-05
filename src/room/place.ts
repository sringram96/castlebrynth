/**
 * Standing an authored thing in a room — arts 19, 100, 105 and 115.
 *
 * The drawing is a grid of ramp indices (`drawn.ts`); this is what turns
 * one into pixels at a world coordinate. Everything it does is derived:
 * the size from the world mark and the projection, the colour from the
 * room's ramp, the rim from the shape's own distance field against the
 * room's light, and the contour from the silhouette. Nothing here is
 * authored twice.
 */

import type { Drawn } from './drawn.js'
import { Cell, lightFrom } from './drawn.js'
import { mix } from './ramp.js'
import type { Brush, Prop } from './scene.js'
import type { WorldMark } from './view.js'

/** What a thing needs beyond its drawing to stand somewhere. */
export interface Standing {
  readonly name: string
  readonly at: WorldMark
  readonly art: Drawn
  /** The ramp it takes its colours off — the room's, so it stays in key. */
  readonly ramp: readonly string[]
  /** The ink its contour is drawn in (art. 18 applied to a thing). */
  readonly edge: string
  /**
   * art. 100: past this depth the drawing is not placed at all, rather than
   * shrunk into noise. Readable size is a property of the drawing.
   */
  readonly readableTo?: number
  /** What a light that carries burns as, if this thing has any `*` in it. */
  readonly glow?: string
}

/** art. 115: how far in from the edge the rim reaches, in cells. */
const RIM_REACH = 2.2
/** How many ramp steps, as a fraction of the ramp, a full rim lifts. */
const RIM_LIFT = 0.3
/** Metal answers harder and narrower than stone does. */
const METAL_LIFT = 0.5
const METAL_REACH = 1.4

/**
 * A drawn thing, standing at a world mark. Returns null past the distance
 * its drawing stops being readable at (art. 100) — a thing not placed is
 * better than a thing shrunk into three grey pixels.
 */
export function standing(one: Standing, station: Parameters<typeof lightFrom>[0]): Prop | null {
  if (one.readableTo !== undefined && one.at.z > one.readableTo) return null
  return {
    name: one.name,
    z: one.at.z,
    paint(b: Brush): void {
      const { art, ramp } = one
      const foot = b.project(one.at.X, one.at.Y, one.at.z)
      const half = (b.view.f * one.at.width) / one.at.z / 2
      const tall = (b.view.f * one.at.height) / one.at.z
      const x0 = Math.round(foot.x - half)
      const x1 = Math.round(foot.x + half)
      const y0 = Math.round(foot.y - tall)
      const y1 = Math.round(foot.y)
      if (x1 <= x0 || y1 <= y0) return

      const lamp = lightFrom(station)
      const lampLen = Math.hypot(lamp.x, lamp.y) || 1
      const lx = lamp.x / lampLen
      const ly = lamp.y / lampLen
      const top = ramp.length - 1

      /** Which cell of the drawing a screen pixel lands on. Nearest, so it stays sharp. */
      const cellAt = (x: number, y: number): number => {
        const cx = Math.floor(((x - x0) / (x1 - x0)) * art.width)
        const cy = Math.floor(((y - y0) / (y1 - y0)) * art.height)
        if (cx < 0 || cy < 0 || cx >= art.width || cy >= art.height) return -1
        return cy * art.width + cx
      }

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = cellAt(x, y)
          if (i < 0) continue
          const kind = art.kind[i]!

          if (kind === Cell.Nothing) {
            // art. 100: a sprite carries its own contour, derived from its
            // silhouette. Ink where nothing meets something, one pixel, in
            // screen space — so it stays one pixel at every distance.
            const touches =
              filled(art, cellAt(x - 1, y)) ||
              filled(art, cellAt(x + 1, y)) ||
              filled(art, cellAt(x, y - 1)) ||
              filled(art, cellAt(x, y + 1))
            if (touches) b.px(one.edge, x, y)
            continue
          }

          // A light that carries is not lit by the room — it *is* the light.
          if (kind === Cell.Light) {
            b.px(one.glow ?? ramp[top]!, x, y)
            continue
          }

          // art. 115: the rim, derived. How far in this cell is, against
          // which way it faces, against where the room's light stands.
          const reach = kind === Cell.Metal ? METAL_REACH : RIM_REACH
          const lift = kind === Cell.Metal ? METAL_LIFT : RIM_LIFT
          const edgeness = Math.max(0, 1 - Math.max(0, art.inside[i]! - 1) / reach)
          const facing = Math.max(0, art.nx[i]! * lx + art.ny[i]! * ly)
          const t = Math.min(1, Math.max(0, art.tone[i]! + edgeness * facing * lamp.strength * lift))
          const p = t * top
          const lo = Math.floor(p)
          const hi = Math.min(top, lo + 1)
          b.px(mix(ramp[lo]!, ramp[hi]!, p - lo), x, y)
        }
      }
    },
  }
}

function filled(art: Drawn, i: number): boolean {
  return i >= 0 && art.kind[i] !== Cell.Nothing
}
