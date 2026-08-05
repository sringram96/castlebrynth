import { ign } from './dither.js'
import type { Framebuffer } from './framebuffer.js'
import { colorOf, framebuffer, pokeRGB } from './framebuffer.js'
import { mixPacked, packRamp } from './ramp.js'
import type { Look, SurfaceShaders } from './scene.js'
import { Surface } from './scene.js'
import type { View } from './view.js'

/** The box, plus the buffers the props need to stand in it. */
export interface Cast {
  readonly target: Framebuffer
  /** Which surface each pixel first hit. */
  readonly surface: Uint8Array
  /** The depth each pixel first hit — ready for true occlusion (art. 19). */
  readonly depth: Float32Array
}

const FAR = 1e9

/** How dense the mouth's breath is at its centre, as a dither threshold. */
const BREATH = 0.25

/** Below this much light, the light's tint says nothing worth saying. */
const TINT_FLOOR = 0.15

/**
 * art. 15: the box is computed, not painted. Every pixel asks which of the
 * four planes it hits first, at what depth, and the scene's shaders answer
 * in world space — so diminution is honest and cannot be faked.
 *
 * What a shader answers is a position on the surface's ramp, not a colour.
 * The cast adds the light's lift and the air's drop to that scalar and then
 * dithers once, between the two adjacent steps it falls between. One dither
 * per pixel, never four; never between two colours far enough apart to read
 * as dots (art. 17, better served).
 */
export function castBox(view: View, look: Look, surfaces: SurfaceShaders): Cast {
  const { frame, shape, f, eye, zMouth, zBack, config } = view
  const { width: W, height: H, cx: CX, cy: CY } = frame
  const { palette, light, air } = look
  const target = framebuffer(W, H)
  const surface = new Uint8Array(W * H)
  const depth = new Float32Array(W * H)

  const breathX = config.grid * config.breath.x
  const breathY = config.grid * config.breath.y

  const wallRamp = packRamp(look.ramps.wall)
  const floorRamp = packRamp(look.ramps.floor)
  const ceilRamp = packRamp(look.ramps.ceiling)
  const lightTint = colorOf(light.tint)
  const airTint = colorOf(air.tint)
  const hollow = colorOf(palette.hollow)
  const breathTone = colorOf(palette.breath)

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const i = sy * W + sx
      const dx = sx - CX
      const dy = CY - sy // above the horizon is positive

      // First-hit depth against each of the four planes.
      const zR = dx > 0.01 ? (f * shape.width) / dx : FAR
      const zL = dx < -0.01 ? (f * -shape.width) / dx : FAR
      const zC = dy > 0.01 ? (f * shape.ceiling) / dy : FAR
      const zF = dy < -0.01 ? (f * eye) / -dy : FAR

      let z = FAR
      let s: number = Surface.Mouth
      if (zL > 0 && zL < z) {
        z = zL
        s = Surface.WallLeft
      }
      if (zR > 0 && zR < z) {
        z = zR
        s = Surface.WallRight
      }
      if (zC > 0 && zC < z) {
        z = zC
        s = Surface.Ceiling
      }
      if (zF > 0 && zF < z) {
        z = zF
        s = Surface.Floor
      }
      // art. 96: one more plane, and the same first-hit cast. A chamber ends
      // in a wall standing inside the fog — every ray reaches it at the same
      // depth, so it wins wherever it is nearer than the four.
      if (zBack < z) {
        z = zBack
        s = Surface.Back
      }

      if (z >= zMouth || s === Surface.Mouth) {
        // art. 16: past the cutoff, structural near-black with a breath.
        surface[i] = Surface.Mouth
        depth[i] = zMouth
        const e = Math.max(0, 1 - Math.hypot(dx / breathX, (sy - CY) / breathY))
        pokeRGB(target, i, ign(sx, sy) < e * BREATH ? breathTone : hollow)
        continue
      }

      surface[i] = s
      depth[i] = z

      let step: number
      let ramp: Int32Array
      if (s === Surface.WallLeft || s === Surface.WallRight) {
        const height = (dy * z) / f + eye
        step = surfaces.wall(s === Surface.WallLeft ? -1 : 1, z, height)
        ramp = wallRamp
      } else if (s === Surface.Back) {
        // The far wall takes the wall's own ramp: it is the same stone, seen
        // end-on rather than along (art. 93 — one school, four surfaces).
        step = surfaces.back((dx * z) / f, (dy * z) / f + eye)
        ramp = wallRamp
      } else if (s === Surface.Ceiling) {
        step = surfaces.ceiling(z, (dx * z) / f)
        ramp = ceilRamp
      } else {
        step = surfaces.floor(z, (dx * z) / f)
        ramp = floorRamp
      }

      // The light lifts along the ramp, falling off with distance from where
      // it stands — which, this wave, is where you stand.
      const lit = light.reach > 0 ? Math.max(0, 1 - z / light.reach) : 0
      step += lit * lit * light.lift

      // art. 17: distance is dither, not a gradient and never alpha. It is
      // now a drop down the same ramp rather than a second pattern laid over
      // the first.
      const fog = Math.max(0, z / zMouth - config.fog.start) * config.fog.gain * air.rate
      step -= fog

      // The one dither: between the two adjacent steps this pixel falls
      // between, against scattered noise rather than a lattice.
      const top = ramp.length - 1
      const p = Math.min(top, Math.max(0, step))
      const lo = Math.floor(p)
      let c = ramp[ign(sx, sy) < p - lo ? Math.min(top, lo + 1) : lo]!

      // Tint sparingly, and only after quantisation (art. 21: the light is
      // authorial; the ramp is what does the work).
      if (lit > TINT_FLOOR && light.tintAmt > 0) c = mixPacked(c, lightTint, light.tintAmt * lit * lit)
      if (fog > config.fog.tintAt) {
        c = mixPacked(c, airTint, Math.min(config.fog.tintCap, (fog - config.fog.tintAt) * config.fog.tintRate))
      }
      pokeRGB(target, i, c)
    }
  }

  inkContours(target, surface, frame, palette, config.grid * config.rim)
  return { target, surface, depth }
}

/**
 * art. 18: outlines are derived. The contour pass inks exactly where
 * surfaces meet — no authored line, no line that lies.
 */
function inkContours(
  target: Framebuffer,
  surface: Uint8Array,
  frame: { width: number; height: number; cx: number },
  palette: { edge: string; rim: string },
  rimReach: number,
): void {
  const { width: W, height: H, cx: CX } = frame
  const d = target.pixels
  const edge = colorOf(palette.edge)
  const rim = colorOf(palette.rim)
  for (let sy = 0; sy < H - 1; sy++) {
    for (let sx = 0; sx < W - 1; sx++) {
      const i = sy * W + sx
      if (surface[i] === surface[i + 1] && surface[i] === surface[i + W]) continue
      d[i * 4] = (edge >> 16) & 255
      d[i * 4 + 1] = (edge >> 8) & 255
      d[i * 4 + 2] = edge & 255
      if (
        surface[i] === Surface.Ceiling &&
        surface[i + W] !== Surface.Ceiling &&
        Math.abs(sx - CX) < rimReach
      ) {
        const k = (i + W) * 4
        d[k] = (rim >> 16) & 255
        d[k + 1] = (rim >> 8) & 255
        d[k + 2] = rim & 255
      }
    }
  }
}
