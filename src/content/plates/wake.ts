/**
 * The waking corridor — the port of `reference/castlebrynth-wake-v3.html`.
 *
 * Everything authored lives here: the three numbers of the box (art. 14),
 * the world-space masonry, the palette school, and the props. `src/room`
 * computes; this file decides. The lean is not ported — it is PARKED
 * (art. 8).
 */

import type { Prop, RoomShape, Scene, SurfaceShaders, View } from '../../room/index.js'
import type { Feature } from './features.js'
import { hash } from '../../room/index.js'
import type { School } from '../palettes.js'
import { DEEP, MUTED, lookOf, shadingOf } from '../palettes.js'
import { AUTHORED_GRID, AUTHORED_HEIGHT, RENDER } from '../render.js'

/** art. 14: exactly three authored numbers. Focal length is derived. */
const SHAPE: RoomShape = { lens: 93, width: 11, ceiling: 7 }

/** Masonry, in world units — the texture is world-space, so it diminishes honestly (art. 15). */
const COURSE = 2.35
const BRICK = 6.5
const SLAT = 7.5
const FLAG_LENGTH = 9
const FLAG_WIDTH = 7.5

/** Colours that belong to one prop and not to the school. */
const BAR = '#000000'
const CLOAK = '#1a1c20'
const CLOAK_LIT = '#22262b'
const CLOAK_GRAIN = '#2a2f35'
const CLOAK_DARK = '#101215'
const PIP = '#141414'
const LINK = '#1a1d22'

/** Where things stand, as multiples of the depth where the walls leave the frame. */
const Z_GRATE = 1.7
const Z_TRAVELER = 2.15
const Z_BONES = 1.32
const Z_CHAIN = 1.15
/** The chain runs down this fraction of the frame. */
const CHAIN_DROP = 58 / AUTHORED_HEIGHT

/**
 * The masonry's grammar, in ramp steps. Every one of these was a colour
 * before the ramp wave and is an offset now: the seam is a groove rather
 * than a tone, so it stays a groove when the light moves across it; the
 * grime is a drop rather than a black speck, so it stops reading as a hole.
 *
 * Shared by the whole depth, exactly as the masonry itself is. What makes
 * one room not another is its ramp, not its grammar (art. 21).
 */
const STONE = deepen({
  /** How far a seam cuts below the stone either side of it. */
  seam: 2.9,
  /**
   * The four brick tones, as offsets. The old sets ran dark, mid, light,
   * mid, and these are those tones' own distances from the mid one, taken
   * off the ramps the schools converted to.
   */
  tone: [-1.25, 0, 1.1, 0],
  /** The pale cell — an inclusion, one course in eleven or so. */
  alt: 2.4,
  /**
   * A cell that came up wrong, and the broken corner. The old grime went
   * all the way to the ramp's dark end; a drop of two is enough to read as
   * a bad stone without punching a hole in the wall.
   */
  defect: 2,
  /** Low on the wall: what has stood in water, and what grew on it. */
  damp: 0.9,
  moss: 1.5,
  moss2: 0.9,
  /** The flagstones ran dark, mid, mid, light. */
  flagTone: [-1.15, 0, 0, 0.9],
  /** The slats ran dark, light, dark, darkest — the base is the dark one. */
  slatTone: [0, 0.95, 0, -1.5],
})

/**
 * art. 94: the grammar above is authored in the ten steps the first ramp
 * had. The ramp is sixty-four now, so every offset is carried up by the
 * same factor and the masonry reads exactly as it was drawn.
 */
function deepen<T extends Record<string, number | readonly number[]>>(
  grammar: T,
): { readonly [K in keyof T]: T[K] extends readonly number[] ? readonly number[] : number } {
  const out: Record<string, number | readonly number[]> = {}
  for (const [key, value] of Object.entries(grammar)) {
    out[key] = typeof value === 'number' ? value * DEEP : value.map((n) => n * DEEP)
  }
  return out as never
}

/**
 * The world-space masonry of the whole depth. Exported because the
 * skeleton's ordinary rooms are the same stone in a different light
 * (`plain.ts`), and art. 15 wants the texture in world space wherever it is
 * laid.
 *
 * Every shader answers a position on its surface's ramp, unlit and
 * unfogged. The cast adds the light and the distance and dithers once.
 */
export function masonry(
  school: School,
  shape: RoomShape,
  eye: number,
  /**
   * art. 99, tier two: architecture on the wall planes, flush with them and
   * shaded by this same cast. A feature answers after the grammar has, so it
   * can cut into the stone, stand proud of it, or replace it outright.
   */
  features: {
    readonly left?: Feature
    readonly right?: Feature
    readonly back?: Feature
  } = {},
): SurfaceShaders {
  const tall = eye + shape.ceiling
  const base = shadingOf(school).base
  return {
    wall(side, z, height) {
      const course = Math.floor(height / COURSE)
      const offset = ((course % 2) * BRICK) / 2
      const u = z + offset
      const b = Math.floor(u / BRICK)
      const fu = u / BRICK - b
      const fv = height / COURSE - course
      if (fv < 0.1 || fu < 0.075) return base.wall - STONE.seam
      const id = b * 13 + course * 7 + (side > 0 ? 101 : 0)
      let step = base.wall + STONE.tone[hash(id, 3) % 4]!
      if (hash(b * 5, course * 3 + id) < 9) step += STONE.alt
      if (hash(id, (fv * 9) | 0) < 3) step -= STONE.defect
      if (height < 0.3 * tall && hash(id, b) < 24) step -= STONE.damp
      if (height < 0.45 * tall && hash(id * 3, course) < 7) {
        step -= hash(b, id) < 40 ? STONE.moss : STONE.moss2
      }
      // a broken corner, once in a while
      if (hash(id, 1) < 7 && fv > 0.5 && fu > 0.8) step -= STONE.defect
      // art. 99: and then the architecture, at world coordinates on this
      // plane. It answers last so it can cut through the grammar, and it
      // answers a step like everything else so the light finds it honestly.
      const cut = (side < 0 ? features.left : features.right)?.(z, height, step)
      return cut ?? step
    },
    floor(z, x) {
      const fz = Math.floor(z / FLAG_LENGTH)
      const fx = Math.floor((x + 40) / FLAG_WIDTH) + (fz % 2)
      if (z / FLAG_LENGTH - fz < 0.07 || ((x + 40) / FLAG_WIDTH) % 1 < 0.08) {
        return base.floor - STONE.seam
      }
      let step = base.floor + STONE.flagTone[hash(fz * 7, fx * 5) % 4]!
      if (hash(fz, fx * 11) < 8) step -= STONE.defect
      return step
    },
    ceiling(z, x) {
      const s = Math.floor(z / SLAT)
      if (z / SLAT - s < 0.1) return base.ceiling - STONE.seam
      let step = base.ceiling + STONE.slatTone[hash(s * 9, Math.floor(x / 3)) % 4]!
      if (hash(s, (x * 2) | 0) < 9) step -= STONE.defect
      return step
    },
    // art. 96: the sky of an open room. Darkest overhead and opening a
    // little toward the horizon, which is where the light that is left goes.
    sky(up) {
      return Math.max(0, 1 - Math.min(1, up * 2.4)) * 9 * DEEP * 0.42
    },
    // art. 96: the far wall is the same masonry, coursed the same way and
    // laid across the end instead of along the sides. It runs on `x` where a
    // side wall runs on `z`, so the courses line up where the two meet and
    // the corner reads as a corner rather than as a change of material.
    back(x, height) {
      const course = Math.floor(height / COURSE)
      const offset = ((course % 2) * BRICK) / 2
      const u = x + offset + 40
      const b = Math.floor(u / BRICK)
      const fu = u / BRICK - b
      const fv = height / COURSE - course
      if (fv < 0.1 || fu < 0.075) return base.wall - STONE.seam
      const id = b * 13 + course * 7 + 211
      let step = base.wall + STONE.tone[hash(id, 3) % 4]!
      if (hash(b * 5, course * 3 + id) < 9) step += STONE.alt
      if (hash(id, (fv * 9) | 0) < 3) step -= STONE.defect
      if (height < 0.3 * tall && hash(id, b) < 24) step -= STONE.damp
      if (height < 0.45 * tall && hash(id * 3, course) < 7) {
        step -= hash(b, id) < 40 ? STONE.moss : STONE.moss2
      }
      if (hash(id, 1) < 7 && fv > 0.5 && fu > 0.8) step -= STONE.defect
      const cut = features.back?.(x, height, step)
      return cut ?? step
    },
  }
}

function props(view: View): readonly Prop[] {
  const school = MUTED
  const { z0, f, eye, frame, shape } = view
  const halfWidth = shape.width
  const ceiling = shape.ceiling
  /** An authored pixel, on whatever grid the dial is set to. */
  const g = (n: number): number => (n * view.config.grid) / AUTHORED_GRID

  const zGrate = z0 * Z_GRATE
  const zTraveler = z0 * Z_TRAVELER
  const zBones = z0 * Z_BONES
  const zChain = z0 * Z_CHAIN

  const shaft: Prop = {
    name: 'the grate',
    z: zGrate,
    paint(b) {
      const g0 = b.project(-3.4, ceiling, zGrate + 3)
      const g1 = b.project(3.4, ceiling, zGrate + 3)
      const h0 = b.project(-3.4, ceiling, zGrate)
      const h1 = b.project(3.4, ceiling, zGrate)
      b.rect(school.iron, g0.x, g0.y - g(1), g1.x - g0.x, h0.y - g0.y + g(2))
      for (let x = g0.x + g(2); x < g1.x - g(1); x += g(4)) {
        b.rect(BAR, x, g0.y, g(1.6), h0.y - g0.y)
      }
      b.rect(school.accent[1], h0.x, h0.y, h1.x - h0.x, g(1))

      // the light, falling
      const floorY = b.project(-3.4, -eye, zGrate).y
      const topY = g0.y
      const cx = (h0.x + h1.x) / 2
      for (let y = topY; y < floorY; y++) {
        const t = (y - topY) / (floorY - topY)
        const half = ((h1.x - h0.x) / 2) * (1 + t * 1.6)
        for (let x = cx - half; x < cx + half; x++) {
          const e = 1 - Math.abs(x - cx) / half
          if (b.dither(x, y, e * 6.5 * (1 - t * 0.45))) {
            b.px(t < 0.5 ? school.accent[1] : school.accent[0], x, y)
          }
          if (b.dither(x + g(2), y, e * 1.8)) b.px(school.accent[2], x, y)
        }
      }

      // the pool it lands in
      const p0 = b.project(-4.5, -eye, zGrate - 0.5)
      const p1 = b.project(4.5, -eye, zGrate + 4)
      const pcx = (p0.x + p1.x) / 2
      const pcy = (p0.y + p1.y) / 2
      const rx = (p1.x - p0.x) / 2
      const ry = Math.max(g(2), (p0.y - p1.y) / 2)
      for (let y = pcy - ry; y < pcy + ry; y++) {
        for (let x = pcx - rx; x < pcx + rx; x++) {
          const d = Math.hypot((x - pcx) / rx, (y - pcy) / ry)
          if (d < 1 && b.dither(x, y, (1 - d) * 11)) b.px(school.accent[1], x, y)
          if (d < 1 && b.dither(x + g(1), y, (1 - d) * 4)) b.px(school.accent[2], x, y)
        }
      }
      b.px(school.accent[3], pcx - g(2), pcy)
      b.px(school.accent[3], pcx + g(3), pcy + g(2))
    },
  }

  const traveler: Prop = {
    name: 'the traveler',
    z: zTraveler,
    paint(b) {
      const near = b.project(halfWidth - 0.6, -eye, zTraveler)
      const far = b.project(halfWidth - 0.6, -eye, zTraveler + 7)
      const top = b.project(halfWidth - 0.6, -eye + 2.1, zTraveler + 3)
      const x0 = Math.min(near.x, far.x)
      const x1 = Math.max(near.x, far.x)
      const ay = near.y
      const ty = top.y

      for (let y = ay; y < ay + g(4); y++) {
        for (let x = x0 - g(3); x < x1 + g(2); x++) {
          if (b.dither(x, y, 8)) b.px(school.edge, x, y) // contact
        }
      }
      b.rect(CLOAK, x0, ty + g(3), x1 - x0, ay - ty - g(3))
      b.rect(CLOAK_LIT, x0 + (x1 - x0) * 0.2, ty, (x1 - x0) * 0.55, g(4))
      for (let y = ty; y < ay; y++) {
        for (let x = x0; x < x1; x++) {
          if (b.hash(x, y) < 6) b.px(CLOAK_GRAIN, x, y)
        }
      }
      b.rect(CLOAK_DARK, x0 + g(4), ty + g(5), (x1 - x0) * 0.6, g(1))
      for (let x = x0 - g(1); x < x1 + g(1); x++) b.px(school.edge, x, ay)
      for (let y = ty - g(1); y < ay; y++) b.px(school.edge, x1, y)
      for (let x = x0 + g(1); x < x1 - g(4); x++) b.px(school.accent[2], x, ty - g(1))
      for (let y = ty; y < ay - g(2); y++) b.px(school.accent[1], x0 - g(1), y)

      const s = f / zTraveler / 9
      b.rect(school.bone[0], x0 - 7 * s - g(4), ay - g(4), 8 * s + g(3), g(3))
      b.px(school.bone[2], x0 - 7 * s - g(3), ay - g(4))
      b.px(school.coin, x0 + g(5), ty + g(2))
      b.px(school.coin, x0 + g(9), ty + g(2))
      b.px(school.bone[2], x0 + g(5), ty + g(1))
    },
  }

  /**
   * art. 27: UI is diegetic where possible — the wake's signature choice is
   * bones on the floor, not a menu. Six of them; the pale one is yours.
   */
  const bones: Prop = {
    name: 'the bones',
    z: zBones,
    paint(b) {
      const s = Math.max(g(6), (f / zBones) * 0.62)
      const laid = [-8.5, -5.7, -2.9, -0.1, 2.7, 6.3]
      laid.forEach((worldX, k) => {
        const pale = k === laid.length - 1
        const at = b.project(worldX, -eye, zBones)
        const x = at.x - s / 2
        const y = at.y - s
        for (let j = at.y; j < at.y + g(3); j++) {
          for (let i = x - g(1); i < x + s + g(1); i++) {
            if (b.dither(i, j, 9)) b.px(school.edge, i, j)
          }
        }
        b.rect(pale ? school.bone[1] : school.bone[0], x, y, s, s)
        b.rect(pale ? school.bone[2] : school.bone[1], x, y, s, g(1))
        b.rect(pale ? school.bone[2] : school.bone[1], x, y, g(1), s)
        b.rect(school.edge, x, y + s, s + g(1), g(1))
        for (let j = y + g(1); j < y + s; j++) b.px(school.edge, x + s, j)
        if (!pale) {
          b.px(PIP, x + s * 0.3, y + s * 0.3)
          b.px(PIP, x + s * 0.65, y + s * 0.65)
        } else {
          b.px(school.accent[2], x + s * 0.7, y + s * 0.2)
        }
        b.px(school.accent[1], x + g(1), y - g(1))
      })
    },
  }

  const chain: Prop = {
    name: 'the chain',
    z: zChain,
    paint(b) {
      const x0 = b.project(-halfWidth + 1.2, ceiling, zChain).x
      const drop = Math.round(frame.height * CHAIN_DROP)
      for (let y = 0; y < drop; y++) {
        const x = x0 + Math.sin(y / g(9)) * g(1.5)
        b.px(school.iron, x, y)
        if (y % g(6) < g(3)) b.px(LINK, x + g(1), y)
      }
    },
  }

  // art. 19 asks for far to near, and this list is not: the traveler stands
  // behind the grate but is laid over the light falling from it, exactly as
  // the reference does. The light is atmosphere, not a sprite — but the law
  // does not say so, so the order is the reference's and the question is
  // open.
  return [shaft, traveler, bones, chain]
}

export const WAKE: Scene = {
  id: 'crossing.wake',
  shape: SHAPE,
  look: lookOf(MUTED),
  surfaces: masonry(MUTED, SHAPE, RENDER.eye),
  props,
}
