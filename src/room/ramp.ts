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
 * art. 119 §3: **the flash.** A ramp read `steps` higher, so a thing drawn
 * as ramp indices (art. 100) jumps to the top of its own ramp without ever
 * being given a colour it does not already own — art. 17 unamended, because
 * every pixel is still a step on the ramp it was already on.
 *
 * It saturates at the light end rather than wrapping: a thing already lit
 * cannot be lit further, which is what a ramp having a top means.
 */
export function lifted(tones: Ramp, steps: number): Ramp {
  if (steps <= 0 || tones.length === 0) return tones
  return tones.map((_, at) => tones[Math.min(tones.length - 1, at + steps)]!)
}

/**
 * A ramp as it is authored (art. 94 as amended by the look wave).
 *
 * The old nine-or-ten was a consequence of quantising hard at every step.
 * Once the upper ramp blends (art. 95) the step count stops being a
 * legibility bar and becomes headroom, so a ramp is deep — sixty-four —
 * and it **turns**: the dark end goes cool and desaturated, the light end
 * warm and saturated, through a mid the school itself names. That single
 * change is most of the visible gain and costs nothing anywhere else.
 */
export interface RampSpec {
  readonly dark: string
  readonly light: string
  /** How many steps. */
  readonly steps: number
  /** The bend, weighting more steps toward the dark end — where this game lives. */
  readonly bend: number
  /**
   * How far the ends turn, in degrees of hue: the dark end this far one way
   * and the light end this far the other. Positive turns the dark toward
   * blue and the light toward amber, which is the direction stone under a
   * flame actually goes.
   */
  readonly turn?: number
  /** How much saturation the dark loses and the light gains, 0..1. */
  readonly heat?: number
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

/**
 * Build the ramp a spec describes: three stops in HSL — a cool desaturated
 * dark, the school's own mid, a warm saturated light — walked at the spec's
 * bend so more steps land in the dark, where this game lives.
 *
 * A ramp with no `turn` and no `heat` is the straight interpolation the
 * first cut built, so the two ends of this function are one function.
 */
export function ramp(spec: RampSpec): Ramp {
  const top = Math.max(1, spec.steps - 1)
  const turn = spec.turn ?? 0
  const heat = spec.heat ?? 0
  const dark = turned(spec.dark, turn, -heat)
  const light = turned(spec.light, -turn, heat)
  // The mid is the school's own straight midpoint, unturned: the ends move
  // and the material the room is actually made of stays where it was put.
  const mid = mix(spec.dark, spec.light, 0.5)
  const out: string[] = []
  for (let i = 0; i < spec.steps; i++) {
    const t = Math.pow(i / top, spec.bend)
    out.push(t < 0.5 ? mixHSL(dark, mid, t * 2) : mixHSL(mid, light, (t - 0.5) * 2))
  }
  return out
}

/** A tone turned in hue and pushed in saturation — the ramp's ends (art. 94). */
export function turned(hex: string, degrees: number, saturate: number): string {
  const [h, s, l] = toHSL(colorOf(hex))
  return fromHSL((h + degrees / 360 + 1) % 1, Math.min(1, Math.max(0, s + saturate)), l)
}

/** Interpolate through HSL, so a hue turn reads as a turn and not as mud. */
export function mixHSL(a: string, b: string, t: number): string {
  const [h0, s0, l0] = toHSL(colorOf(a))
  const [h1, s1, l1] = toHSL(colorOf(b))
  // Round the short way, so a ramp never takes the long road through green.
  let dh = h1 - h0
  if (dh > 0.5) dh -= 1
  if (dh < -0.5) dh += 1
  return fromHSL((h0 + dh * t + 1) % 1, s0 + (s1 - s0) * t, l0 + (l1 - l0) * t)
}

function toHSL(packed: number): [number, number, number] {
  const r = ((packed >> 16) & 255) / 255
  const g = ((packed >> 8) & 255) / 255
  const b = (packed & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const span = max - min
  if (span === 0) return [0, 0, l]
  const s = l > 0.5 ? span / (2 - max - min) : span / (max + min)
  let h: number
  if (max === r) h = (g - b) / span + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / span + 2
  else h = (r - g) / span + 4
  return [h / 6, s, l]
}

function fromHSL(h: number, s: number, l: number): string {
  if (s === 0) {
    const v = byte(l * 255)
    return `#${((v << 16) | (v << 8) | v).toString(16).padStart(6, '0')}`
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = byte(channel(p, q, h + 1 / 3) * 255)
  const g = byte(channel(p, q, h) * 255)
  const b = byte(channel(p, q, h - 1 / 3) * 255)
  return `#${(((r << 16) | (g << 8) | b) >>> 0).toString(16).padStart(6, '0')}`
}

function channel(p: number, q: number, t: number): number {
  const at = (t + 1) % 1
  if (at < 1 / 6) return p + (q - p) * 6 * at
  if (at < 1 / 2) return q
  if (at < 2 / 3) return p + (q - p) * (2 / 3 - at) * 6
  return p
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
