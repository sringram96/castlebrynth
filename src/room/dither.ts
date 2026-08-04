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

/** Ordered 4×4 threshold. `threshold` runs 0..16; above 16 is solid. */
export function dither(x: number, y: number, threshold: number): boolean {
  return BAYER_4[y & 3]![x & 3]! < threshold
}

/** Deterministic spatial hash, 0..96. Not random: repeatable (art. 17). */
export function hash(x: number, y: number): number {
  let n = ((x | 0) * 73856093) ^ ((y | 0) * 19349663)
  n = (n ^ (n >> 13)) >>> 0
  return n % 97
}
