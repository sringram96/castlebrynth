/**
 * Masses — arts 102 and 103.
 *
 * A substance lying in the room is **one continuous form**, not a heap of
 * copies: eight dune sprites read as eight small piles, because that is what
 * they are. And it is **geometry, not a painting**. A mass is a height on
 * the floor, so the floor stops being a flat plane and becomes a plane plus
 * a height, and the cast marches each downward ray until it drops below that
 * surface.
 *
 * Painting a crest in screen space and filling beneath it fails three ways
 * at once — the crest runs flat across the frame instead of receding, its
 * size agrees with nothing else in the room, and it cannot hide what stands
 * behind it. Once it is geometry the rest is free: it takes the box's
 * perspective, it occludes correctly, it meets the walls where the walls
 * are, it takes the same light and the same air, and art. 18's contour
 * separates it from what is behind it without being drawn.
 *
 * art. 103: it is shaded by its **slope**. A face tilting away from the
 * viewer catches the room's light, a face tilting toward them falls into its
 * own shadow, and the crest takes a lit lip — that read is what makes a
 * shape legible as a solid rather than as a stain.
 */

import type { Ramp } from './ramp.js'

/**
 * A substance lying in a room. `height` answers in world units above the
 * floor, for any point on it — that is the whole interface, because a mass
 * is a surface and not a list of things.
 */
export interface Mass {
  readonly name: string
  /** How high the substance lies above the floor at a point on it. */
  height(x: number, z: number): number
  /** Its own material's ramp — sand is not the flagstones under it. */
  readonly ramp: Ramp
  /** Where its own substance sits on that ramp, unlit, in steps. */
  readonly base: number
  /** How many steps a fully lit face lifts, and a fully shadowed one drops. */
  readonly relief: number
  /** Past this depth there is none of it. Zero means it runs the whole room. */
  readonly until?: number
}

/** How far apart two samples are taken to read the surface's slope. */
const SLOPE_STEP = 0.35

/**
 * The surface normal at a point, from the height field itself. Nothing about
 * a mass's shading is authored (art. 103) — the slope is measured off the
 * same function the rays are marched against, so the light can never
 * disagree with the silhouette.
 */
export function slopeAt(mass: Mass, x: number, z: number): { nx: number; nz: number; ny: number } {
  const dx = (mass.height(x + SLOPE_STEP, z) - mass.height(x - SLOPE_STEP, z)) / (2 * SLOPE_STEP)
  const dz = (mass.height(x, z + SLOPE_STEP) - mass.height(x, z - SLOPE_STEP)) / (2 * SLOPE_STEP)
  // The surface is y = h(x, z), so its normal is (−∂h/∂x, 1, −∂h/∂z).
  const len = Math.hypot(dx, 1, dz) || 1
  return { nx: -dx / len, ny: 1 / len, nz: -dz / len }
}

/**
 * March a downward ray against the mass, from the camera outward, and answer
 * the depth at which it drops below the surface — or null if it never does,
 * which is the ordinary floor's business.
 *
 * The ray's height above the floor falls monotonically with depth, so the
 * march is a straight walk followed by a bisection to sharpen the hit. It is
 * deterministic to the step, which is all art. 17 asks of it.
 */
export function marchMass(
  mass: Mass,
  /** Height above the floor at depth 1, per unit of depth — always negative. */
  slope: number,
  eye: number,
  /** Screen-x per unit of depth, so a ray leans sideways as it goes. */
  lean: number,
  until: number,
  step = 0.6,
): number | null {
  let last = 0
  for (let z = step; z < until; z += step) {
    const above = eye + slope * z
    if (above <= mass.height(lean * z, z)) {
      // Between `last` and `z`. Six halvings puts the seam under a pixel.
      let lo = last
      let hi = z
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2
        if (eye + slope * mid <= mass.height(lean * mid, mid)) hi = mid
        else lo = mid
      }
      return hi
    }
    last = z
  }
  return null
}

/**
 * A dune: a long gentle windward slope and a short steep slip face, banked
 * against both walls (art. 103). Not a symmetrical hill — sand does not do
 * that, and a symmetrical hill is the tell that a mass was invented rather
 * than observed.
 *
 * `crest` is where the ridge runs, in depth; `deep` is how high it stands at
 * the walls, which is where a room starts to look buried rather than
 * decorated.
 */
export function dune(
  ramp: Ramp,
  base: number,
  options: {
    readonly crest: number
    readonly high: number
    readonly banked: number
    readonly halfWidth: number
    /** Where it starts. Nearer than this the floor is still the floor. */
    readonly from?: number
    readonly until?: number
    readonly relief?: number
    /** How deep the wind's ripples cut across it. */
    readonly ripple?: number
  },
): Mass {
  const { crest, high, banked, halfWidth } = options
  const from = options.from ?? 0
  const ripple = options.ripple ?? 0.22
  return {
    name: 'the sand',
    ramp,
    base,
    relief: options.relief ?? 3.2,
    ...(options.until === undefined ? {} : { until: options.until }),
    height(x, z) {
      if (z <= from) return 0
      // Along the room: a long haul up to the crest, then a short face down.
      // Sand is not a symmetrical hill, and a symmetrical hill is the tell
      // that a mass was invented rather than looked at (art. 103).
      const at = z - from
      const run = Math.max(0.001, crest - from)
      const along =
        z < crest ? Math.pow(at / run, 1.6) : Math.max(0, 1 - (z - crest) / (run * 0.32))
      // Across it: lowest down the middle, banked where it meets the walls.
      const across = Math.pow(Math.min(1, Math.abs(x) / halfWidth), 2.1)
      const body = high * along + banked * across * Math.min(1, at / (run * 0.5))
      // The wind's ripples, which are geometry like everything else here —
      // a flat mass shades flat, and a mass that shades flat is a stain.
      const wind = ripple * Math.sin(z * 1.55 + x * 0.42) * Math.sin(x * 0.9 - z * 0.3)
      return Math.max(0, body + (body > 0.05 ? wind : 0))
    },
  }
}
