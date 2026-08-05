/**
 * Authored things — arts 100 and 115.
 *
 * A thing meant to be recognised is drawn once, by hand, as a small grid of
 * **indices into the room's ramp**, never as colours. Three consequences,
 * and each is load-bearing: a drawing cannot fall out of palette; one
 * drawing appears in the drowned and the burnt as one object in two keys;
 * and readable size is a property of the drawing rather than of the
 * projection.
 *
 * The alphabet (art. 100 as amended by the look wave):
 *
 * - `0`–`9` — a step on the room's ramp, dark to light
 * - `.` and space — nothing; the shape does not cover this cell
 * - `*` — **a light that carries**: a thing that emits rather than takes
 *   the room's light, so it ignores the rim and burns at the ramp's top
 * - `+` — **metal**, which answers light harder and narrower than stone
 *
 * And art. 115: **nothing is hand-shaded.** The authored indices say what a
 * thing is made of; they never say which side of it the candle found. Each
 * shape's distance-to-outside is computed once, the edge normal is that
 * field's gradient, and how hot an edge burns is that normal against the
 * direction the room's light comes from. One drawing therefore lights
 * itself correctly in a room lit from below and in a room lit from ahead,
 * where a painted highlight could only ever have been right in one of them.
 */

import type { Station } from './scene.js'

/** What a cell is made of, which is the whole of what an author declares. */
export const Cell = {
  Nothing: 0,
  Stone: 1,
  /** `*` — it emits. The room's light does not reach it because it is one. */
  Light: 2,
  /** `+` — it answers light harder and narrower than stone does. */
  Metal: 3,
} as const
export type CellKind = (typeof Cell)[keyof typeof Cell]

/** A thing, authored as text and prepared once. */
export interface Drawn {
  readonly width: number
  readonly height: number
  /** Where on the ramp each cell sits, 0..1. Meaningless where nothing. */
  readonly tone: Float32Array
  readonly kind: Uint8Array
  /** art. 115: how far inside the silhouette each cell lies, in cells. */
  readonly inside: Float32Array
  /** The edge normal — the gradient of `inside`, pointing outward. */
  readonly nx: Float32Array
  readonly ny: Float32Array
}

const drawings = new Map<string, Drawn>()

/**
 * Prepare an authored thing. Cached on the text itself, so a drawing used
 * by forty rooms is measured once and art. 17's determinism is free.
 */
export function drawn(rows: readonly string[]): Drawn {
  const key = rows.join('\n')
  const held = drawings.get(key)
  if (held !== undefined) return held
  const made = measure(rows)
  drawings.set(key, made)
  return made
}

function measure(rows: readonly string[]): Drawn {
  const height = rows.length
  const width = rows.reduce((most, row) => Math.max(most, row.length), 0)
  const tone = new Float32Array(width * height)
  const kind = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    const row = rows[y] ?? ''
    for (let x = 0; x < width; x++) {
      const at = y * width + x
      const ch = row[x] ?? '.'
      if (ch === '.' || ch === ' ') {
        kind[at] = Cell.Nothing
        continue
      }
      if (ch === '*') {
        kind[at] = Cell.Light
        tone[at] = 1
        continue
      }
      if (ch === '+') {
        kind[at] = Cell.Metal
        tone[at] = 0.62
        continue
      }
      const step = Number.parseInt(ch, 10)
      kind[at] = Cell.Stone
      tone[at] = Number.isNaN(step) ? 0.5 : step / 9
    }
  }

  const inside = distanceIn(kind, width, height)
  const { nx, ny } = normalsOf(inside, kind, width, height)
  return { width, height, tone, kind, inside, nx, ny }
}

/**
 * art. 115: distance-to-outside, by two chamfer passes. Cheap, exact
 * enough at this scale, and deterministic — which is the only property
 * art. 17 asks of it.
 */
function distanceIn(kind: Uint8Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height)
  const FAR = width + height
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : out[y * width + x]!
  for (let i = 0; i < out.length; i++) out[i] = kind[i] === Cell.Nothing ? 0 : FAR
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (kind[i] === Cell.Nothing) continue
      out[i] = Math.min(out[i]!, at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.4)
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x
      if (kind[i] === Cell.Nothing) continue
      out[i] = Math.min(out[i]!, at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.4)
    }
  }
  return out
}

/** The gradient of the distance field, pointing out of the shape. */
function normalsOf(
  inside: Float32Array,
  kind: Uint8Array,
  width: number,
  height: number,
): { nx: Float32Array; ny: Float32Array } {
  const nx = new Float32Array(width * height)
  const ny = new Float32Array(width * height)
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : inside[y * width + x]!
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (kind[i] === Cell.Nothing) continue
      // Outward is *down* the distance field, so the sign is inverted.
      const gx = at(x - 1, y) - at(x + 1, y)
      const gy = at(x, y - 1) - at(x, y + 1)
      const len = Math.hypot(gx, gy)
      if (len < 1e-6) continue
      nx[i] = gx / len
      ny[i] = gy / len
    }
  }
  return { nx, ny }
}

/**
 * art. 115: which way the room's light comes from, on the screen, given
 * where it stands. A billboard has no depth to catch a light in, so a
 * station in front of the viewer lights the whole face evenly and only the
 * stations that are *off* the view axis throw a direction worth having.
 *
 * Y is screen-down, so a light above gives a negative Y.
 */
export function lightFrom(station: Station): { x: number; y: number; strength: number } {
  switch (station) {
    case 'above':
      return { x: -0.25, y: -1, strength: 1 }
    case 'below':
      return { x: 0.25, y: 1, strength: 1 }
    case 'ahead':
      return { x: 0, y: -0.2, strength: 0.55 }
    case 'none':
      return { x: 0, y: -1, strength: 0.15 }
    case 'with':
    default:
      return { x: -0.4, y: -0.5, strength: 0.75 }
  }
}
