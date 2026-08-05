/**
 * art. 17: no alpha, no gradients. Atmosphere is ordered dither and
 * variation is a deterministic hash, so a room renders identical every
 * visit — the same seed of position, the same pixel, forever.
 */

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const

/**
 * Ordered 4×4 threshold. `threshold` runs 0..16; above 16 is solid.
 *
 * The box no longer dithers with this — see `ign` — but a sprite does. A
 * prop covers tens of pixels rather than a whole wall, and at that size the
 * lattice is the pattern the reference plate was authored against.
 */
export function dither(x: number, y: number, threshold: number): boolean {
  return BAYER_4[y & 3]![x & 3]! < threshold
}

/**
 * Interleaved gradient noise, 0..1. Deterministic like Bayer — the same
 * pixel gives the same value every render, so art. 17's identical-re-render
 * law still holds — but spatially scattered rather than gridded, so a
 * half-lit surface reads as a surface and not as a screen door.
 *
 * This is the only threshold the box dithers against.
 */
export function ign(x: number, y: number): number {
  return frac(52.9829189 * frac(0.06711056 * x + 0.00583715 * y))
}

function frac(v: number): number {
  return v - Math.floor(v)
}

/** Deterministic spatial hash, 0..96. Not random: repeatable (art. 17). */
export function hash(x: number, y: number): number {
  let n = ((x | 0) * 73856093) ^ ((y | 0) * 19349663)
  n = (n ^ (n >> 13)) >>> 0
  return n % 97
}
