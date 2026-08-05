/**
 * Features — art. 99, tier two.
 *
 * Architecture placed at world coordinates on the wall plane and **flush
 * with it**, shading by the same cast as the stone around it. Not sprites:
 * a feature answers the same question the masonry answers — where on this
 * surface's ramp does this point sit — so it takes the room's light and the
 * room's air without being told to, and it recedes because the wall does.
 *
 * This is the tier that makes walls differ by more than colour, and the one
 * the game had none of. A room with only its grammar is the last room in a
 * different colour (art. 98).
 *
 * Every feature is a function of where it is on the wall. `along` runs the
 * plane — depth for a side wall, across for the far wall — and `height` is
 * measured up from the floor. Answering `null` means "this feature is not
 * here", and the stone underneath is left exactly as the grammar drew it.
 */

import { hash } from '../../room/index.js'
import { DEEP } from '../palettes.js'

/**
 * A feature, as the wall sees it. It is handed the step the grammar already
 * decided so it can cut into it, stand proud of it, or replace it outright —
 * which is what a bricked-up doorway has to do.
 */
export type Feature = (along: number, height: number, base: number) => number | null

/** Everything below is authored in the ten steps the first ramp had. */
const d = (n: number): number => n * DEEP

/**
 * A string course: one band of stone running the length of the wall, proud
 * of it, with the wall in shadow directly under the lip. The single cheapest
 * thing that stops a wall reading as wallpaper.
 */
export function stringCourse(at: number, thick = 1.1): Feature {
  return (along, height, base) => {
    if (height < at - thick || height > at + thick) return null
    const up = (height - (at - thick)) / (2 * thick)
    // Proud at the top, and the wall under the lip loses the light.
    if (up > 0.78) return base - d(2.4)
    return base + d(1.3 + 0.7 * (1 - up))
  }
}

/**
 * A pilaster: a flat column standing proud of the wall, floor to ceiling.
 * Repeated on a pitch, because one pilaster is a mistake and six are a room.
 */
export function pilasters(pitch: number, wide: number, from = 0): Feature {
  return (along, height, base) => {
    const at = along - from
    const cycle = ((at % pitch) + pitch) % pitch
    if (cycle > wide) return null
    const across = cycle / wide
    // Lit down the middle of the shaft and shadowed at both arrises, which
    // is the read that makes a flat band look like a column.
    const edge = Math.min(across, 1 - across) * 2
    if (edge < 0.12) return base - d(1.9)
    return base + d(0.6 + 1.6 * edge)
  }
}

/**
 * A blind arcade: arches sunk into the wall that go nowhere. It is what a
 * throne hall has instead of doors it does not need, and the reason a
 * threshold still reads as a threshold beside one is art. 97 — an arcade
 * wears no architrave, and nothing that is not a way out may (art. 97).
 */
export function blindArcade(
  pitch: number,
  wide: number,
  low: number,
  high: number,
  from = 0,
): Feature {
  return (along, height, base) => {
    if (height < low || height > high) return null
    const at = along - from
    const cycle = ((at % pitch) + pitch) % pitch
    const half = wide / 2
    const mid = pitch / 2
    const off = Math.abs(cycle - mid)
    if (off > half) return null
    // The arch: a half-round head on a straight-sided opening.
    const springs = low + (high - low) * 0.62
    const room =
      height <= springs ? half : half * Math.sqrt(Math.max(0, 1 - ((height - springs) / (high - springs)) ** 2))
    if (off > room) return null
    // The jamb catches a little; the back of the recess takes none of it.
    const into = 1 - off / Math.max(0.001, room)
    return base - d(2.6 + 2.4 * into)
  }
}

/**
 * A niche: a square recess cut into the wall, dark at the back and lipped at
 * its own edge. Where a room keeps something, or used to.
 */
export function niche(at: number, low: number, high: number, wide: number): Feature {
  return (along, height, base) => {
    const off = Math.abs(along - at)
    if (off > wide / 2 || height < low || height > high) return null
    const lip = off > wide / 2 - 0.35 || height < low + 0.3 || height > high - 0.3
    return lip ? base + d(1.4) : base - d(5.2)
  }
}

/**
 * A crack, walking down the wall. Deterministic per room, so art. 17 holds:
 * the same crack every visit, and it is a crack rather than noise because it
 * *walks* — a run of connected cells, not a scatter of dark ones.
 */
export function crack(at: number, top: number, bottom: number, seed = 11): Feature {
  return (along, height, base) => {
    if (height > top || height < bottom) return null
    // Where the crack has wandered to by this height.
    const step = Math.floor((top - height) * 1.8)
    let x = at
    for (let i = 0; i <= step; i++) x += (hash(seed, i * 7) % 5) / 9 - 0.22
    const off = Math.abs(along - x)
    const wide = 0.16 + (hash(seed, step) % 4) / 22
    if (off > wide) return null
    return base - d(off > wide * 0.55 ? 2.4 : 6)
  }
}

/**
 * A bricked-up doorway: a threshold's frame with the **wrong masonry**
 * inside it. It says something happened here without a word of prose, and it
 * is the one feature that has to replace the grammar rather than offset it —
 * a fill that shares the wall's courses is a patch nobody notices.
 */
export function brickedUp(at: number, wide: number, high: number, low = 0): Feature {
  const unit = 2.1
  const course = 1.15
  return (along, height, base) => {
    const off = Math.abs(along - at)
    if (off > wide / 2 || height < low || height > low + high) return null
    // The frame it kept, proud of the wall like any architrave (art. 97) —
    // and this one is a lie, which is the point of it.
    if (off > wide / 2 - 0.5 || height > low + high - 0.5) return base + d(1.5)
    // Inside: smaller stones, laid on their own courses, out of step with
    // everything around them.
    const row = Math.floor((height - low) / course)
    const u = off + ((row % 2) * unit) / 2
    const b = Math.floor(u / unit)
    if ((height - low) / course - row < 0.14 || u / unit - b < 0.12) return base - d(3.4)
    return base - d(0.4) + d(((hash(b * 3, row * 5) % 5) - 2) * 0.35)
  }
}

/**
 * The architrave around a junction's turn (arts 96, 97).
 *
 * A turn is a way out, and art. 97 says a way out is framed — an architrave
 * standing proud of the wall around the aperture, and nothing that is not a
 * way out may wear one. The hole itself is geometry and is cast, not drawn
 * (art. 96); this is the band of proud stone on the wall either side of it,
 * which is the whole of what the wall has to say about it.
 *
 * There is no lintel, because a junction's aperture is full-height and there
 * is no wall above it to put one on.
 */
export function turnFrame(from: number, to: number, thick = 1.4): Feature {
  return (along, _height, base) => {
    const off = along < from ? from - along : along > to ? along - to : 0
    if (off <= 0 || off > thick) return null
    // Proud, and falling away from the opening rather than a flat band.
    return base + d(0.7 + 1.5 * (1 - off / thick))
  }
}

/** Lay several features on one wall, nearest the eye winning. */
export function layered(...features: readonly Feature[]): Feature {
  return (along, height, base) => {
    for (const one of features) {
      const said = one(along, height, base)
      if (said !== null) return said
    }
    return null
  }
}
