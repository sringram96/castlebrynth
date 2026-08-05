import { hash, ign } from './dither.js'
import type { Framebuffer } from './framebuffer.js'
import { colorOf, framebuffer, pokeRGB } from './framebuffer.js'
import { mixPacked, packRamp } from './ramp.js'
import type { Mass } from './mass.js'
import { marchMass, slopeAt } from './mass.js'
import type { Look, Station, SurfaceShaders } from './scene.js'
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
export function castBox(
  view: View,
  look: Look,
  surfaces: SurfaceShaders,
  /** art. 102: the substance lying on the floor, if any lies here. */
  mass?: Mass,
): Cast {
  const { frame, shape, f, eye, zMouth, zBack, config } = view
  const { width: W, height: H, cx: CX, cy: CY } = frame
  const { palette, light, air } = look
  const target = framebuffer(W, H)
  const surface = new Uint8Array(W * H)
  const depth = new Float32Array(W * H)

  const breathX = config.grid * config.breath.x
  const breathY = config.grid * config.breath.y
  const atStation = stationAt(view, light.station)
  const open = shape.open === true

  const wallRamp = packRamp(look.ramps.wall)
  const floorRamp = packRamp(look.ramps.floor)
  const ceilRamp = packRamp(look.ramps.ceiling)
  const skyRamp = packRamp(look.ramps.sky ?? look.ramps.ceiling)
  const massRamp = packRamp(mass?.ramp ?? look.ramps.floor)
  const lightTint = colorOf(light.tint)
  const airTint = colorOf(air.tint)
  const hollow = colorOf(palette.hollow)
  const breathTone = colorOf(palette.breath)
  const starTone = colorOf(palette.rim)

  /**
   * The tail every surface shares: the light's lift from its station, the
   * air's drop, the hybrid dither, and the two tints. One statement of it,
   * because the open room's ground is the same floor as any other floor.
   */
  const resolve = (
    i: number,
    sx: number,
    sy: number,
    z: number,
    atX: number,
    atY: number,
    step0: number,
    ramp: Int32Array,
  ): void => {
    // art. 113: the lift falls off from where the light *stands*, not from
    // the camera. This is the lever that inverts a room — lit from below,
    // the ceiling becomes the darkest surface in the frame.
    const lit =
      light.reach > 0
        ? Math.max(
            0,
            1 - Math.hypot(atX - atStation.X, atY - atStation.Y, z - atStation.z) / light.reach,
          )
        : 0
    let step = step0 + lit * lit * light.lift

    // art. 17: distance is a drop down the same ramp, never a second
    // pattern laid over the first and never alpha.
    const fog = Math.max(0, z / zMouth - config.fog.start) * config.fog.gain * air.rate
    step -= fog

    // art. 95, the hybrid: one treatment, chosen by where on the ramp the
    // scalar landed. Across the upper ramp a pixel blends between the two
    // adjacent steps; in the darkest fifth it dithers between them instead,
    // because banding is a fact about dark values on a real panel and
    // nothing is bought by paying the dither's cost above it.
    const top = ramp.length - 1
    const p = Math.min(top, Math.max(0, step))
    const lo = Math.floor(p)
    const hi = Math.min(top, lo + 1)
    let c =
      p < top * config.blendAbove
        ? ramp[ign(sx, sy) < p - lo ? hi : lo]!
        : mixPacked(ramp[lo]!, ramp[hi]!, p - lo)

    // Tint after quantisation, in proportion to lit-ness (art. 113).
    if (lit > TINT_FLOOR && light.tintAmt > 0) c = mixPacked(c, lightTint, light.tintAmt * lit * lit)
    if (fog > config.fog.tintAt) {
      c = mixPacked(
        c,
        airTint,
        Math.min(config.fog.tintCap, (fog - config.fog.tintAt) * config.fog.tintRate),
      )
    }
    pokeRGB(target, i, c)
  }

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const i = sy * W + sx
      const dx = sx - CX
      const dy = CY - sy // above the horizon is positive

      // art. 96: an open room has no walls and no ceiling, so the ray hits
      // the ground or it hits the sky and there is nothing else to ask.
      if (open) {
        const zG = dy < -0.01 ? (f * eye) / -dy : FAR
        if (zG >= zMouth) {
          // Far enough along the ground that the air has taken it, or above
          // the horizon entirely: the sky, and the field scattered in it.
          surface[i] = dy < -0.01 ? Surface.Mouth : Surface.Sky
          depth[i] = zMouth
          if (dy < -0.01) {
            pokeRGB(target, i, hollow)
            continue
          }
          // art. 101: the stars are a field — no outline, no footprint,
          // nothing to identify — so they are scattered, deterministically,
          // which is the one thing scatter is actually for.
          const up = dy / f
          const step = surfaces.sky?.(up, dx / f) ?? 0
          const top = skyRamp.length - 1
          const p = Math.min(top, Math.max(0, step))
          const lo = Math.floor(p)
          const hi = Math.min(top, lo + 1)
          const sky = mixPacked(skyRamp[lo]!, skyRamp[hi]!, p - lo)
          pokeRGB(target, i, hash(sx * 7, sy * 13) < 2 && up > 0.06 ? starTone : sky)
          continue
        }
        surface[i] = Surface.Floor
        depth[i] = zG
        const gx = (dx * zG) / f
        resolve(i, sx, sy, zG, gx, (dy * zG) / f, surfaces.floor(zG, gx), floorRamp)
        continue
      }

      // art. 102: before the planes, the substance. A downward ray marches
      // until it drops below the surface lying on the floor, so the mass
      // occludes the walls and the far wall exactly the way a solid does —
      // which is the whole reason it is geometry and not a painting.
      if (mass !== undefined && dy < -0.01) {
        const hit = marchMass(mass, dy / f, eye, dx / f, Math.min(zMouth, mass.until ?? zMouth))
        if (hit !== null) {
          surface[i] = Surface.Mass
          depth[i] = hit
          const mx = (dx * hit) / f
          // art. 103: shaded by its slope. A face tilting away from the
          // viewer catches the light; one tilting toward them falls into
          // its own shadow; the crest takes the lit lip that read gives.
          const n = slopeAt(mass, mx, hit)
          resolve(i, sx, sy, hit, mx, (dy * hit) / f, mass.base + n.nz * mass.relief, massRamp)
          continue
        }
      }

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

      // Where this pixel actually is in the room, which the station needs.
      const atX = (dx * z) / f
      const atY = (dy * z) / f

      let step: number
      let ramp: Int32Array
      if (s === Surface.WallLeft || s === Surface.WallRight) {
        step = surfaces.wall(s === Surface.WallLeft ? -1 : 1, z, atY + eye)
        ramp = wallRamp
      } else if (s === Surface.Back) {
        // The far wall takes the wall's own ramp: it is the same stone, seen
        // end-on rather than along (art. 93 — one school, four surfaces).
        step = surfaces.back(atX, atY + eye)
        ramp = wallRamp
      } else if (s === Surface.Ceiling) {
        step = surfaces.ceiling(z, atX)
        ramp = ceilRamp
      } else {
        step = surfaces.floor(z, atX)
        ramp = floorRamp
      }

      resolve(i, sx, sy, z, atX, atY, step, ramp)
    }
  }

  inkContours(target, surface, frame, palette, config.grid * config.rim)
  return { target, surface, depth }
}

/**
 * art. 113: a station is a *place*, so it resolves to a world point and the
 * lift is Euclidean distance from it. Coordinates are the projector's: the
 * eye at the origin, the floor at −eye, the ceiling at +ceiling.
 *
 * The two ends of the room a station can sit at are its far end — the wall
 * if it has one, the cutoff if it does not — and a little way in front of
 * the camera, so a light "with you" still falls off along the corridor
 * exactly as it did before there were stations at all.
 */
function stationAt(view: View, station: Station): { X: number; Y: number; z: number } {
  const { shape, eye, zMouth, zBack } = view
  const end = Math.min(zBack, zMouth)
  switch (station) {
    case 'above':
      return { X: 0, Y: shape.ceiling, z: end * 0.42 }
    case 'below':
      return { X: 0, Y: -eye, z: end * 0.42 }
    case 'ahead':
      return { X: 0, Y: 0, z: end }
    case 'none':
      return { X: 0, Y: 0, z: -1e9 }
    case 'with':
    default:
      return { X: 0, Y: 0, z: 0 }
  }
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
