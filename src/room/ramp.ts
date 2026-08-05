/**
 * The ramp — one per surface, and dither only ever between two adjacent
 * steps on it.
 *
 * The bug this fixes was visible on a phone: at GRID 240, roughly three
 * device pixels to a game pixel, four separate dither passes with the same
 * 4×4 matrix compounded into a lattice, and each pass dithered between
 * colours far enough apart that a dot read as a dot. A screen door over
 * every surface.
 *
 * The fix is to stop choosing colours. A surface pixel resolves to a single
 * scalar — a position on its ramp — and every authored thing about it
 * (material variation, seams, grime, gradients, inclusions, light, fog) is
 * an offset along that ramp. One dither at the end, between the two adjacent
 * steps the scalar falls between.
 *
 * art. 17 is untouched and better served: still no alpha, still no
 * gradients, brightness is still dither density, and the same pixel gives
 * the same value every render.
 *
 * Reference: `reference/castlebrynth-ramp-shading.html`, whose `shade()` is
 * the whole technique in one function.
 */

import { colorOf } from './framebuffer.js'

/** A ramp: a dark end, a light end, and the steps between them. */
export type Ramp = readonly string[]

/**
 * A ramp as it is authored. Nine or ten steps per surface: fewer than seven
 * bands visibly, more than about fourteen stops reading as pixel art.
 */
export interface RampSpec {
  readonly dark: string
  readonly light: string
  /** How many steps. */
  readonly steps: number
  /** The bend, weighting more steps toward the dark end — where this game lives. */
  readonly bend: number
}

/** Linear interpolation between two `#rrggbb`, in bytes. */
export function mix(a: string, b: string, t: number): string {
  const packed = mixPacked(colorOf(a), colorOf(b), t)
  return `#${packed.toString(16).padStart(6, '0')}`
}

/**
 * The same, on packed 24-bit colours — what the cast loop actually runs.
 * `t` past 1 extrapolates, which is how a ramp is given headroom; the
 * channels are clamped so it can never wrap.
 */
export function mixPacked(a: number, b: number, t: number): number {
  const r = byte(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t)
  const g = byte(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t)
  const l = byte((a & 255) * (1 - t) + (b & 255) * t)
  return ((r << 16) | (g << 8) | l) >>> 0
}

function byte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)))
}

/** Build the ramp a spec describes. */
export function ramp(spec: RampSpec): Ramp {
  const top = Math.max(1, spec.steps - 1)
  const out: string[] = []
  for (let i = 0; i < spec.steps; i++) {
    out.push(mix(spec.dark, spec.light, Math.pow(i / top, spec.bend)))
  }
  return out
}

/** A ramp as packed colours, for the per-pixel loop. */
export function packRamp(r: Ramp): Int32Array {
  const out = new Int32Array(r.length)
  for (let i = 0; i < r.length; i++) out[i] = colorOf(r[i]!)
  return out
}

/**
 * Where a tone already sits on a ramp, as a step. This is how the fourteen
 * authored schools were converted: a room's dominant stone is projected onto
 * its own new ramp, so the room starts from exactly where it stood before
 * and the offsets move it from there.
 */
export function stepOf(spec: RampSpec, tone: string): number {
  return Math.max(0, spec.steps - 1) * Math.pow(alongRamp(spec.dark, spec.light, tone), 1 / spec.bend)
}

/**
 * How far along `dark`→`light` a tone lies, 0..1. The mean of the three
 * channels' fractions, skipping any channel whose ends are too close
 * together to say anything.
 */
export function alongRamp(dark: string, light: string, tone: string): number {
  const d = colorOf(dark)
  const l = colorOf(light)
  const c = colorOf(tone)
  let sum = 0
  let n = 0
  for (const shift of [16, 8, 0]) {
    const d0 = (d >> shift) & 255
    const l0 = (l >> shift) & 255
    if (Math.abs(l0 - d0) < 6) continue
    sum += (((c >> shift) & 255) - d0) / (l0 - d0)
    n++
  }
  if (n === 0) return 0.5
  return Math.min(1, Math.max(0, sum / n))
}

/**
 * The same ramp, carried `by` further past its light end along its own
 * line. Headroom for the light to lift into, in the ramp's own hue — the
 * one direction that cannot take a school out of key with itself. Clamped
 * so no channel runs past 255, which shortens the reach rather than
 * bending the hue.
 */
export function extend(dark: string, light: string, by: number): string {
  const d = colorOf(dark)
  const l = colorOf(light)
  let reach = by
  for (const shift of [16, 8, 0]) {
    const d0 = (d >> shift) & 255
    const l0 = (l >> shift) & 255
    if (l0 > d0) reach = Math.min(reach, (255 - l0) / (l0 - d0))
  }
  return mix(dark, light, 1 + Math.max(0, reach))
}

/** The darkest of a set of tones, by the sum of its channels. */
export function darkest(tones: readonly string[]): string {
  return tones.reduce((held, one) => (weight(one) < weight(held) ? one : held))
}

/** The lightest of a set of tones. */
export function lightest(tones: readonly string[]): string {
  return tones.reduce((held, one) => (weight(one) > weight(held) ? one : held))
}

function weight(hex: string): number {
  const n = colorOf(hex)
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114
}
