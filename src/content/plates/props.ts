/**
 * The signature props — one thing per room that the eye can name.
 *
 * art. 34 hangs knowledge on room identity, so a depth of identical boxes is
 * a depth that cannot be learned. Every ordinary room therefore gets its own
 * school (`palettes.ts`) and at least one prop standing in it at world
 * coordinates (art. 19).
 *
 * The laws these keep: no alpha and no gradients, so every soft edge is an
 * ordered dither and every variation is the deterministic hash (art. 17);
 * every authored pixel goes through `g`, so the GRID dial scales the props
 * with the box instead of stranding them (art. 23); and everything is placed
 * in world units and scaled 1/z by the projector, never by hand (art. 19).
 *
 * art. 26, first tier: the computed box plus sprites, deliberately basic now
 * and improved over time. The hero plates are a later phase.
 */

import type { Brush, Prop, View, WorldMark } from '../../room/index.js'
import { mix } from '../../room/index.js'
import type { School } from '../palettes.js'
import { alongSteps, lookOf } from '../palettes.js'
import { AUTHORED_GRID } from '../render.js'

/** An authored pixel, on whatever grid the dial is set to (art. 23). */
function pixel(view: View): (n: number) => number {
  return (n) => (n * view.config.grid) / AUTHORED_GRID
}

/**
 * How deep a room reads before it stops — the mouth swallowing it in a tube
 * (art. 16), or the far wall in a chamber (art. 96), whichever comes first.
 *
 * A prop that marches past the far wall paints floor onto stone: the cast
 * ends the room at `zBack`, so anything laid beyond it lands on a surface
 * that is nearer than the depth it was drawn for. Every prop that runs away
 * from the camera asks this rather than the cutoff.
 */
function reach(view: View): number {
  return Math.min(view.zMouth * 0.94, view.zBack - 0.6)
}

// ── The wet passage ────────────────────────────────────────────────────

/**
 * A runnel cut down the middle of the floor, with the water still in it. The
 * channel is world-space, so it narrows honestly with distance (art. 15).
 */
export function runnel(school: School): Prop {
  return {
    name: 'the water',
    z: 8,
    paint(b: Brush): void {
      const { eye } = b.view
      const g = pixel(b.view)
      for (let z = 3; z < reach(b.view); z += 0.4) {
        const left = b.project(-1.7, -eye, z)
        const right = b.project(1.7, -eye, z)
        const y = Math.round(left.y)
        for (let x = left.x; x < right.x; x++) {
          b.px(school.damp, x, y)
          if (b.dither(x, y, 6)) b.px(school.accent[0]!, x, y)
          if (b.hash(x | 0, y * 3) < 7) b.px(school.accent[1]!, x, y)
          if (b.hash(x | 0, y * 11) < 2) b.px(school.accent[3]!, x, y)
        }
        // The lip either side, inked so the cut reads as a cut (art. 18).
        b.px(school.edge, left.x - g(1), y)
        b.px(school.edge, right.x, y)
      }
    },
  }
}

/** Three seams in the ceiling with water coming out of them. */
export function seep(school: School): Prop {
  return {
    name: 'the seep',
    z: 30,
    paint(b: Brush): void {
      const { shape } = b.view
      const g = pixel(b.view)
      for (const [X, z] of [
        [-shape.width + 1.5, 16],
        [shape.width - 1.5, 27],
        [-shape.width + 2.5, Math.min(44, reach(b.view))],
      ] as const) {
        const top = b.project(X, shape.ceiling, z)
        const drop = Math.max(g(4), b.view.f / z / 1.4)
        for (let y = top.y; y < top.y + drop; y++) {
          const t = (y - top.y) / drop
          if (b.dither(top.x, y, 9 * (1 - t))) b.px(school.accent[2]!, top.x, y)
          if (b.dither(top.x + g(1), y, 4 * (1 - t))) b.px(school.accent[1]!, top.x + g(1), y)
        }
        b.px(school.accent[3]!, top.x, top.y + drop)
      }
    },
  }
}

// ── The alcove ─────────────────────────────────────────────────────────

/**
 * A square recess cut into the right wall. It is drawn on the wall plane
 * itself — one vertical span per depth step — so its shape is the
 * perspective's and not a drawn rectangle's.
 */
export function alcove(school: School): Prop {
  return {
    name: 'the alcove',
    z: 22,
    paint(b: Brush): void {
      const { shape, eye } = b.view
      const g = pixel(b.view)
      const wall = shape.width
      const near = 15
      const far = 26
      const low = -eye + 1.4
      const high = -eye + 6.2
      for (let z = near; z < far; z += 0.12) {
        const top = b.project(wall, high, z)
        const foot = b.project(wall, low, z)
        for (let y = top.y; y < foot.y; y++) {
          const deep = (z - near) / (far - near)
          b.px(b.dither(top.x, y, 5 * (1 - deep)) ? school.grime : school.hollow, top.x, y)
        }
        b.px(school.edge, top.x, top.y)
        b.px(school.edge, top.x, foot.y)
      }
      // The near lip catches what light there is.
      const lipTop = b.project(wall, high, near)
      const lipFoot = b.project(wall, low, near)
      for (let y = lipTop.y; y < lipFoot.y; y++) b.px(school.brickAlt, lipTop.x - g(1), y)
      for (let y = lipTop.y; y < lipFoot.y; y++) b.px(school.edge, lipTop.x, y)
    },
  }
}

/** Where the alcove's contents lie, so the key and the dust share a shelf. */
const SHELF = { X: 8.4, z: 20.5 } as const

/**
 * The iron key, lying where the room's boon socket is (art. 83). It belongs
 * to no room: art. 80 unbinds required items from rooms and puts them in the
 * path when the lock ahead demands one, so it is drawn wherever the room
 * that received it keeps its socket.
 *
 * art. 70: when it is taken this prop is simply not in the scene, and the
 * floor it lay on is the floor again.
 */
export function theKey(school: School, mark: WorldMark): Prop {
  return {
    name: 'the key',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const at = b.project(mark.X, mark.Y, mark.z)
      const s = Math.max(g(1), b.view.f / mark.z / 5)
      const x = at.x - s * 3
      const y = at.y
      // The shadow it sits in.
      for (let j = y + s; j < y + s * 2; j++) {
        for (let i = x - s; i < x + s * 7; i++) if (b.dither(i, j, 8)) b.px(school.edge, i, j)
      }
      // Shaft, bow, three teeth.
      b.rect(school.bone[0]!, x, y, s * 6, s)
      b.rect(school.coin, x, y, s * 2, s)
      b.rect(school.bone[1]!, x + s * 5, y - s, s, s)
      b.rect(school.bone[1]!, x + s * 5, y + s, s, s)
      b.rect(school.bone[1]!, x + s * 3, y + s, s, s)
      b.px(school.bone[2]!, x + s, y)
      b.px(school.accent[3]!, x, y)
    },
  }
}

/** The dust, and the shape of something lifted out of it. */
export function dust(school: School): Prop {
  return {
    name: 'the dust',
    z: SHELF.z + 1,
    paint(b: Brush): void {
      const { eye } = b.view
      const g = pixel(b.view)
      const at = b.project(SHELF.X - 1.2, -eye, SHELF.z + 2)
      const s = Math.max(g(3), b.view.f / SHELF.z / 2)
      for (let j = at.y - s / 2; j < at.y + s / 2; j++) {
        for (let i = at.x - s; i < at.x + s; i++) {
          if (b.dither(i, j, 7)) b.px(school.flag[3]!, i, j)
          if (b.hash(i | 0, j | 0) < 5) b.px(school.bone[0]!, i, j)
        }
      }
    },
  }
}

// ── The low room ───────────────────────────────────────────────────────

/**
 * The drag mark: a wide smear worn into the floor, from the door at the far
 * end to the near corner and back. Two passes, so it reads as travelled.
 */
export function dragMark(school: School): Prop {
  return {
    name: 'the drag mark',
    z: 10,
    paint(b: Brush): void {
      const { eye } = b.view
      const g = pixel(b.view)
      for (let z = 4; z < reach(b.view); z += 0.3) {
        // It wanders left as it comes toward you.
        const along = Math.min(1, z / 40)
        const centre = -6.5 + along * 6.5
        const half = 2.2 + (1 - along) * 1.1
        const left = b.project(centre - half, -eye, z)
        const right = b.project(centre + half, -eye, z)
        const y = Math.round(left.y)
        for (let x = left.x; x < right.x; x++) {
          const across = 1 - Math.abs(x - (left.x + right.x) / 2) / ((right.x - left.x) / 2 || 1)
          if (b.dither(x, y, across * 10)) b.px(school.grime, x, y)
          if (b.dither(x + g(2), y, across * 3)) b.px(school.damp, x, y)
        }
      }
      // Where it turns, the stone is bare.
      const turn = b.project(-6.5, -eye, 42)
      const s = Math.max(g(2), b.view.f / 42)
      for (let j = turn.y - s; j < turn.y + s; j++) {
        for (let i = turn.x - s * 2; i < turn.x + s * 2; i++) {
          if (b.dither(i, j, 9)) b.px(school.brickAlt, i, j)
        }
      }
    },
  }
}

// ── The ash passage ────────────────────────────────────────────────────

/** Ash banked against both walls, deep at the far end and thin near you. */
export function ashBanks(school: School): Prop {
  return {
    name: 'the ash',
    z: 12,
    paint(b: Brush): void {
      const { eye, shape } = b.view
      for (let z = 3; z < reach(b.view); z += 0.35) {
        const deep = Math.min(1, z / 55)
        const bank = 1.4 + deep * 3.6
        for (const side of [-1, 1] as const) {
          const outer = b.project(side * shape.width, -eye, z)
          const inner = b.project(side * (shape.width - bank), -eye, z)
          const y = Math.round(outer.y)
          const from = Math.min(outer.x, inner.x)
          const to = Math.max(outer.x, inner.x)
          for (let x = from; x < to; x++) {
            const into = side < 0 ? (to - x) / (to - from || 1) : (x - from) / (to - from || 1)
            if (b.dither(x, y, into * 12)) b.px(school.bone[0]!, x, y)
            if (b.dither(x, y, into * 5)) b.px(school.bone[1]!, x, y)
            if (b.hash(x | 0, y * 5) < 3) b.px(school.grime, x, y)
          }
        }
      }
    },
  }
}

/** Motes, hanging where nothing moves them. */
export function motes(school: School): Prop {
  return {
    name: 'the motes',
    z: 6,
    paint(b: Brush): void {
      const { frame } = b.view
      for (let n = 0; n < 40; n++) {
        const x = (b.hash(n * 7, 3) / 97) * frame.width
        const y = (b.hash(n * 13, 11) / 97) * frame.height
        b.px(b.hash(n, n * 3) < 30 ? school.bone[1]! : school.bone[0]!, x, y)
      }
    },
  }
}

// ── The stair ──────────────────────────────────────────────────────────

/** Short flights going down at the far end, and the flights do not line up. */
export function stairHead(school: School): Prop {
  return {
    name: 'the stair',
    z: 26,
    paint(b: Brush): void {
      const { eye } = b.view
      const g = pixel(b.view)
      let drop = 0
      const last = Math.min(46, reach(b.view))
      for (let z = 20; z < last; z += 1.6) {
        // Each flight steps down, and each starts a little off the last.
        const skew = ((z / 8) | 0) % 2 === 0 ? -1.1 : 1.1
        const left = b.project(skew - 3.2, -eye - drop, z)
        const right = b.project(skew + 3.2, -eye - drop, z)
        const y = Math.round(left.y)
        for (let x = left.x; x < right.x; x++) {
          b.px(b.dither(x, y, 7) ? school.flag[3]! : school.flag[1]!, x, y)
        }
        b.px(school.edge, left.x, y)
        b.px(school.edge, right.x - g(1), y)
        for (let x = left.x; x < right.x; x++) b.px(school.brickAlt, x, y - g(1))
        drop += 0.42
      }
    },
  }
}

// ── The cistern ────────────────────────────────────────────────────────

/** Black water lying flat across the whole floor, and giving one line back. */
export function standingWater(school: School): Prop {
  return {
    name: 'the standing water',
    z: 9,
    paint(b: Brush): void {
      const { eye, shape } = b.view
      for (let z = 3; z < reach(b.view); z += 0.3) {
        const left = b.project(-shape.width + 0.4, -eye, z)
        const right = b.project(shape.width - 0.4, -eye, z)
        const y = Math.round(left.y)
        for (let x = left.x; x < right.x; x++) {
          b.px(school.damp, x, y)
          if (b.dither(x, y, 3)) b.px(school.hollow, x, y)
          // The one line it gives back, straight down the middle.
          if (Math.abs(x - (left.x + right.x) / 2) < 1 && b.hash(x | 0, y * 3) < 40) {
            b.px(school.accent[2]!, x, y)
          }
        }
      }
    },
  }
}

// ── The sump ───────────────────────────────────────────────────────────

/** A grate the floor tilts toward, with the silt banked in a tidemark. */
export function sumpGrate(school: School): Prop {
  return {
    name: 'the grate',
    z: 24,
    paint(b: Brush): void {
      const { eye, shape } = b.view
      const g = pixel(b.view)
      const at = b.project(0, -eye, 24)
      const s = Math.max(g(2), b.view.f / 24 / 2)
      for (let j = at.y - s * 1.4; j < at.y + s * 1.4; j++) {
        for (let i = at.x - s * 3; i < at.x + s * 3; i++) {
          b.px(b.dither(i, j, 4) ? school.hollow : school.iron, i, j)
        }
      }
      for (let i = at.x - s * 3; i < at.x + s * 3; i += Math.max(1, g(3))) {
        for (let j = at.y - s * 1.4; j < at.y + s * 1.4; j++) b.px(school.brickAlt, i, j)
      }
      // The tidemark, at knee height on both walls.
      for (const side of [-1, 1] as const) {
        for (let z = 6; z < reach(b.view); z += 0.5) {
          const mark = b.project(side * shape.width, -eye + 1.9, z)
          b.px(school.bone[0]!, mark.x, mark.y)
          if (b.dither(mark.x, mark.y + g(1), 8)) b.px(school.accent[1]!, mark.x, mark.y + g(1))
        }
      }
    },
  }
}

// ── The kiln ───────────────────────────────────────────────────────────

/** A brick mouth in the left wall, tall enough to walk into, and dark. */
export function kilnMouth(school: School): Prop {
  return {
    name: 'the kiln mouth',
    z: 20,
    paint(b: Brush): void {
      const { shape, eye } = b.view
      const g = pixel(b.view)
      const wall = -shape.width
      const near = 13
      const far = 25
      for (let z = near; z < far; z += 0.12) {
        const arc = Math.sin((Math.PI * (z - near)) / (far - near))
        const top = b.project(wall, -eye + 1 + 6.4 * arc, z)
        const foot = b.project(wall, -eye, z)
        for (let y = top.y; y < foot.y; y++) {
          b.px(b.dither(top.x, y, 3) ? school.grime : school.hollow, top.x, y)
        }
        b.px(school.edge, top.x, top.y)
        // The brick ring around it keeps a little of the heat.
        b.px(school.accent[0]!, top.x, top.y - g(1))
        if (b.dither(top.x, top.y - g(2), 5)) b.px(school.accent[1]!, top.x, top.y - g(2))
      }
    },
  }
}

// ── The pyre ───────────────────────────────────────────────────────────

/** Timber stacked in a square, burnt through and still holding its shape. */
export function pyreStack(school: School): Prop {
  return {
    name: 'the pyre',
    z: 21,
    paint(b: Brush): void {
      const { eye } = b.view
      const g = pixel(b.view)
      const z = 21
      for (let layer = 0; layer < 7; layer++) {
        const y = -eye + layer * 0.6
        const across = layer % 2 === 0
        for (let n = -2; n <= 2; n++) {
          const a = across ? b.project(n * 0.9, y, z - 2.6) : b.project(-2.4, y, z + n * 0.9)
          const c = across ? b.project(n * 0.9, y, z + 2.6) : b.project(2.4, y, z + n * 0.9)
          const steps = Math.max(2, Math.abs(c.x - a.x) + Math.abs(c.y - a.y))
          for (let t = 0; t <= steps; t++) {
            const x = a.x + ((c.x - a.x) * t) / steps
            const yy = a.y + ((c.y - a.y) * t) / steps
            b.px(b.hash(x | 0, yy | 0) < 20 ? school.grime : school.slat[layer % 4]!, x, yy)
            b.px(school.edge, x, yy + g(1))
          }
        }
      }
    },
  }
}

// ── The bonefield ──────────────────────────────────────────────────────

/** Bone banked against both walls, the way ash banks elsewhere, and paler. */
export function boneDrifts(school: School): Prop {
  return {
    name: 'the bone',
    z: 13,
    paint(b: Brush): void {
      const { eye, shape } = b.view
      for (let z = 3; z < reach(b.view); z += 0.3) {
        const deep = Math.min(1, z / 50)
        const bank = 1.2 + deep * 3.2
        for (const side of [-1, 1] as const) {
          const outer = b.project(side * shape.width, -eye, z)
          const inner = b.project(side * (shape.width - bank), -eye, z)
          const y = Math.round(outer.y)
          const from = Math.min(outer.x, inner.x)
          const to = Math.max(outer.x, inner.x)
          for (let x = from; x < to; x++) {
            const into = side < 0 ? (to - x) / (to - from || 1) : (x - from) / (to - from || 1)
            if (b.dither(x, y, into * 13)) b.px(school.bone[1]!, x, y)
            if (b.dither(x, y, into * 6)) b.px(school.bone[2]!, x, y)
            // Nothing in it matches: a long one every so often, inked.
            if (b.hash(x | 0, y * 7) < 4) b.px(school.edge, x, y)
          }
        }
      }
    },
  }
}

// ── The tally ──────────────────────────────────────────────────────────

/** Scratches down the right wall, cut in groups of five. The last has four. */
export function tallyMarks(school: School): Prop {
  return {
    name: 'the tally',
    z: 18,
    paint(b: Brush): void {
      const { shape, eye } = b.view
      const g = pixel(b.view)
      let group = 0
      const last = Math.min(44, reach(b.view))
      for (let z = 8; z < last; z += 1.1) {
        const at = group % 5
        // The gate across each finished group of five.
        const top = b.project(shape.width, -eye + 4.4, z)
        const foot = b.project(shape.width, -eye + 1.6, z)
        for (let y = top.y; y < foot.y; y++) {
          b.px(school.bone[2]!, top.x, y)
          b.px(school.edge, top.x + g(1), y)
        }
        if (at === 4) {
          const mid = b.project(shape.width, -eye + 3, z - 2.2)
          const steps = Math.max(2, Math.abs(top.x - mid.x) + Math.abs(top.y - mid.y))
          for (let t = 0; t <= steps; t++) {
            b.px(
              school.bone[1]!,
              mid.x + ((top.x - mid.x) * t) / steps,
              mid.y + ((top.y - mid.y) * t) / steps,
            )
          }
        }
        // The last group stops one short.
        if (z > last - 4 && at >= 3) break
        group++
      }
    },
  }
}

// ── The font ───────────────────────────────────────────────────────────

/**
 * Three shallow steps down into a floor that holds a hand's depth of water.
 * The room's own prop, and only the room's: what stands *in* the font is
 * whatever fills its mercy socket, and it brings its own pixels (art. 83).
 */
export function fontSteps(school: School): Prop {
  return {
    name: 'the steps',
    z: 15,
    paint(b: Brush): void {
      const { eye } = b.view
      const g = pixel(b.view)
      /** The pool, cut square into the floor: half-width, ends, and depth. */
      const half = 4.2
      const near = 13
      const far = 25
      const deep = 1.6

      // What lies at the bottom of it. Still, and dark: the light in this
      // room is what the basin holds, not what the floor does.
      for (let z = near; z < far; z += 0.25) {
        const left = b.project(-half, -eye - deep, z)
        const right = b.project(half, -eye - deep, z)
        const y = Math.round(left.y)
        for (let x = left.x; x < right.x; x++) {
          b.px(school.damp, x, y)
          if (b.dither(x, y, 4)) b.px(school.accent[0]!, x, y)
          if (b.hash(x | 0, y * 7) < 2) b.px(school.accent[1]!, x, y)
        }
      }
      // The sides it is cut into, inked at the lip, so it reads as a hole in
      // the floor and not as a patch of colour on it.
      for (let z = near; z < far; z += 0.25) {
        for (const side of [-1, 1] as const) {
          const lip = b.project(side * half, -eye, z)
          const bed = b.project(side * half, -eye - deep, z)
          for (let y = lip.y; y < bed.y; y++) {
            b.px(b.dither(lip.x, y, 5) ? school.grime : school.brickAlt, lip.x, y)
          }
          b.px(school.edge, lip.x, lip.y)
        }
      }
      // The far end of the cut, so it closes rather than running into the mouth.
      const backLip = b.project(0, -eye, far)
      const backBed = b.project(0, -eye - deep, far)
      const backHalf = (b.view.f * half) / far
      for (let x = backLip.x - backHalf; x < backLip.x + backHalf; x++) {
        for (let y = backLip.y; y < backBed.y; y++) {
          b.px(b.dither(x, y, 4) ? school.grime : school.brickAlt, x, y)
        }
        b.px(school.edge, x, backLip.y)
      }
      // And three treads down the near side. Each one narrower than the one
      // above it, and each one worn pale in the middle.
      for (let n = 0; n < 3; n++) {
        const y = -eye - (deep * (n + 1)) / 3
        const w = half - 0.4 - n * 0.55
        const z = near - 1.9 + n * 0.6
        const left = b.project(-w, y, z)
        const right = b.project(w, y, z)
        const row = Math.round(left.y)
        for (let x = left.x; x < right.x; x++) {
          const across = 1 - Math.abs(x - (left.x + right.x) / 2) / ((right.x - left.x) / 2 || 1)
          // Worn pale down the middle, where the knees go.
          b.px(b.dither(x, row, 2 + across * 9) ? school.brickAlt : school.flag[3]!, x, row)
        }
        for (let x = left.x; x < right.x; x++) b.px(school.edge, x, row + g(1))
        b.px(school.bone[0]!, left.x, row)
        b.px(school.bone[0]!, right.x - g(1), row)
      }
    },
  }
}

/**
 * The basin: copper on a plinth, standing where the room keeps its mercy
 * socket. art. 70 — once the breath is taken it is drawn empty and tipped,
 * because prose confirms and pixels prove.
 */
export function stillBasin(school: School, mark: WorldMark, spent: boolean): Prop {
  return {
    name: spent ? 'the empty basin' : 'the basin',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const foot = b.project(mark.X, mark.Y, mark.z)
      const half = (b.view.f * mark.width) / mark.z / 2
      const tall = (b.view.f * mark.height) / mark.z
      /** The lip of the bowl, how deep the bowl is, and the stem under it. */
      const rim = foot.y - tall * 0.62
      const cup = Math.max(g(3), tall * 0.24)
      const stem = Math.max(g(1), half * 0.18)
      // A spent basin is dry rather than gone: dull copper, and no light.
      const metal = spent ? school.iron : school.coin
      const shade = spent ? school.grime : school.brickAlt

      // The foot it stands on.
      b.rect(shade, foot.x - half * 0.46, foot.y - g(2), half * 0.92, g(2))
      b.rect(school.edge, foot.x - half * 0.46, foot.y - g(1), half * 0.92, g(1))

      // The stem.
      for (let y = rim + cup; y < foot.y - g(2); y++) {
        for (let x = foot.x - stem; x < foot.x + stem; x++) {
          b.px(b.dither(x, y, 5) ? school.grime : shade, x, y)
        }
        b.px(school.edge, foot.x - stem, y)
        b.px(school.edge, foot.x + stem, y)
      }

      // The bowl: wide at the lip, narrowing to the stem.
      for (let y = rim; y < rim + cup; y++) {
        const down = (y - rim) / (cup || 1)
        const w = half * (1 - 0.74 * down)
        for (let x = foot.x - w; x < foot.x + w; x++) {
          b.px(b.dither(x, y, 3 + 9 * (1 - down)) ? metal : school.iron, x, y)
        }
        b.px(school.edge, foot.x - w, y)
        b.px(school.edge, foot.x + w, y)
      }

      if (spent) {
        // Nothing in it. The inside is the dark the room is made of, and the
        // tidemark is the only trace of what stood here (art. 70).
        for (let x = foot.x - half + g(1); x < foot.x + half - g(1); x++) {
          b.px(school.hollow, x, rim)
          if (b.dither(x, rim + g(1), 6)) b.px(school.bone[0]!, x, rim + g(1))
        }
        b.px(school.edge, foot.x - half, rim)
        b.px(school.edge, foot.x + half - g(1), rim)
        return
      }
      // Full to the lip, and the one thing in this room with any light in it.
      for (let x = foot.x - half + g(1); x < foot.x + half - g(1); x++) {
        b.px(school.accent[2]!, x, rim)
        if (b.hash(x | 0, 17) < 34) b.px(school.accent[3]!, x, rim - g(1))
        b.px(b.dither(x, rim + g(1), 7) ? school.accent[1]! : school.accent[0]!, x, rim + g(1))
      }
    },
  }
}

/**
 * The Savior, standing in a room that is not its own (art. 83). A seated
 * figure with its hands open — the one shape in the depth that is not
 * between you and the door.
 */
export function theMender(school: School, mark: WorldMark): Prop {
  return {
    name: 'the mender',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const foot = b.project(mark.X, mark.Y, mark.z)
      const half = (b.view.f * mark.width) / mark.z / 2
      const tall = (b.view.f * mark.height) / mark.z * 0.72
      const top = foot.y - tall

      for (let y = top; y < foot.y; y++) {
        const down = (y - top) / (tall || 1)
        // Narrow at the head, wide where it is sitting.
        const w = half * (0.2 + 0.62 * down * down)
        for (let x = foot.x - w; x < foot.x + w; x++) {
          const across = 1 - Math.abs(x - foot.x) / (w || 1)
          b.px(b.dither(x, y, 3 + across * 9) ? school.slat[1]! : school.hollow, x, y)
        }
        b.px(school.edge, foot.x - w, y)
        b.px(school.edge, foot.x + w, y)
      }
      // The hands, open, at the height a kneeling person's would meet.
      const hands = top + tall * 0.62
      for (const side of [-1, 1] as const) {
        b.rect(school.bone[1]!, foot.x + side * half * 0.4, hands, Math.max(1, g(2)), Math.max(1, g(2)))
      }
      // And the one lit thing between them.
      b.px(school.accent[3]!, foot.x, hands)
      b.px(school.accent[2]!, foot.x, hands + g(1))
    },
  }
}

// ── What stands in a socket (art. 83) ──────────────────────────────────

/**
 * A shape at the far end, before it is a fight. art. 70: prose confirms,
 * pixels prove — a room the drift has put a horror into looks like a room
 * with a horror in it, and looks that way before anything is committed.
 *
 * It is deliberately a mass and no more. The advance (`src/hinge`) is what
 * brings it to the lens; this is the thing standing where the word says it
 * stands.
 */
export function lurker(school: School, mark: WorldMark, tall: boolean): Prop {
  return {
    name: tall ? 'the tall shape' : 'the wet shape',
    z: mark.z,
    paint(b: Brush): void {
      const foot = b.project(mark.X, mark.Y, mark.z)
      const half = (b.view.f * mark.width) / mark.z / 2
      const high = (b.view.f * mark.height * (tall ? 1.35 : 1)) / mark.z
      for (let y = foot.y - high; y < foot.y; y++) {
        const down = (y - (foot.y - high)) / high
        const reachOut = half * (tall ? 0.4 + 0.3 * down : 0.5 + 0.5 * Math.sin(Math.PI * down))
        for (let x = foot.x - reachOut; x < foot.x + reachOut; x++) {
          const edge = 1 - Math.abs(x - foot.x) / (reachOut || 1)
          if (b.dither(x, y, 2 + edge * 12)) b.px(school.hollow, x, y)
          else if (b.dither(x + 2, y, edge * 4)) b.px(school.edge, x, y)
        }
      }
    },
  }
}

// ── The threshold (art. 97) ────────────────────────────────────────────

/**
 * art. 97: a door is a hole, not a thing. The playtest read the old door as a
 * chest and was right to — it was a filled dark rectangle standing on the
 * floor, which is what a chest is. The grammar that fixes it never varies
 * between rooms, so the frame is learned once and read for the rest of the
 * game:
 *
 * - taller than wide, always (`THINNEST` enforces it here, whatever a mark
 *   asks for), because wider-than-tall reads as furniture;
 * - standing on the floor, interrupting the floor line, because a thing that
 *   floats is a thing;
 * - recessed, and honestly — the reveal is the aperture projected twice, at
 *   the wall and at the plane `RECESS` behind it, so the jambs narrow by the
 *   same perspective as everything else and the darkness has depth;
 * - framed, an architrave standing `PROUD` of the wall, which nothing that is
 *   not a way out may wear;
 * - dark inside, in the room's own darkness — the bottom of the wall's own
 *   ramp, tinted by the air (arts 94, 97).
 *
 * State varies and the grammar does not: open, shut, locked with the lock on
 * the frame, and the Warden's, which is the same hole with black iron in it.
 */
export interface ThresholdState {
  /** art. 70: an opened door stands open, and the way on is what shows. */
  readonly open: boolean
  /** art. 97: locked with the lock *on* the frame, never inside it. */
  readonly locked: boolean
  /** art. 37: the Warden's, which is iron and does not open in this depth. */
  readonly warden: boolean
}

/** The widest a threshold may be, as a fraction of its height (art. 97). */
export const THINNEST = 0.52

/** How far the reveal goes back, and how far the architrave stands proud. */
const RECESS = 2.2
const PROUD = 0.6
/**
 * The architrave's width, as a fraction of the aperture's — so a narrow door
 * in a room offering three wears a narrow frame rather than a frame wider
 * than its own hole.
 */
const JAMB = 0.2
/** And never thinner than this, or the frame stops reading at depth. */
const JAMB_LEAST = 0.55

/**
 * How much room a threshold actually takes: the hole plus the frame around
 * it. art. 105 spaces things by their footprint, and a threshold's footprint
 * is the architrave — two frames that touch read as one wide barrier however
 * far apart their apertures are.
 */
export function framedWidth(width: number): number {
  return width + 2 * Math.max(JAMB_LEAST, width * JAMB)
}

/** A world rectangle standing on the floor, projected at a depth. */
function aperture(
  b: Brush,
  mark: WorldMark,
  half: number,
  high: number,
  z: number,
): { x0: number; x1: number; y0: number; y1: number } {
  const top = b.project(mark.X - half, mark.Y + high, z)
  const foot = b.project(mark.X + half, mark.Y, z)
  return { x0: top.x, x1: foot.x, y0: top.y, y1: foot.y }
}

export function threshold(school: School, mark: WorldMark, state: ThresholdState): Prop {
  return {
    name: state.warden ? 'the black door' : 'the door',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const look = lookOf(school)
      const wall = look.ramps.wall
      // art. 97: the room's own darkness, which is the bottom of the wall's
      // ramp with the air's tint in it — never one shared black hole.
      // Fractions of the ramp rather than indices into it: art. 94 made the
      // ramp sixty-four steps deep, and the bottom of a ramp is where it
      // starts, not where its first three entries happen to be.
      const inside = mix(alongSteps(wall, 0), look.air.tint, 0.45)
      const reveal = [
        mix(alongSteps(wall, 0.08), look.air.tint, 0.3),
        mix(alongSteps(wall, 0.16), look.air.tint, 0.22),
      ] as const

      // Taller than wide, always — whatever the mark asked for.
      const high = mark.height
      const half = Math.min(mark.width, high * THINNEST) / 2

      const jamb = Math.max(JAMB_LEAST, half * 2 * JAMB)
      const near = aperture(b, mark, half, high, mark.z)
      const back = aperture(b, mark, half, high, mark.z + RECESS)
      const arch = aperture(b, mark, half + jamb, high + jamb, mark.z - PROUD)

      // ── The architrave, standing proud of the wall ────────────────────
      // Nothing that is not a way out may wear one (art. 97), so this ring is
      // the whole of what says "way out" before a word is read — which means
      // it has to read in every school. Its stone comes off the light end of
      // the room's own wall ramp rather than off a named tone, so a frame is
      // proud in the drowned and the burnt alike (arts 94, 100).
      const face = alongSteps(wall, 0.78)
      const turn = alongSteps(wall, 0.58)
      for (let y = arch.y0; y < arch.y1; y++) {
        for (let x = arch.x0; x < arch.x1; x++) {
          if (x > near.x0 && x < near.x1 && y > near.y0) continue
          b.px(b.hash(x | 0, (y / 2) | 0) < 26 ? turn : face, x, y)
        }
      }
      // Its own outline, and the inner edge where it meets the hole.
      for (let y = arch.y0; y < arch.y1; y++) {
        b.px(school.edge, arch.x0, y)
        b.px(school.edge, arch.x1 - g(1), y)
      }
      for (let x = arch.x0; x < arch.x1; x++) b.px(school.edge, x, arch.y0)
      // The lintel catches what light there is; the sill it stands on is inked
      // so the threshold interrupts the floor line rather than hovering on it.
      for (let x = arch.x0; x < arch.x1; x++) b.px(school.bone[0]!, x, arch.y0 + g(1))
      for (let x = arch.x0; x < arch.x1; x++) b.px(school.edge, x, arch.y1 - g(1))

      // ── The hole, and the reveal going back into it ───────────────────
      for (let y = near.y0; y < near.y1; y++) {
        for (let x = near.x0; x < near.x1; x++) {
          const deep = x > back.x0 && x < back.x1 && y > back.y0 && y < back.y1
          if (deep) continue
          // A jamb, the soffit, or the sill: each face turned a different way,
          // so each takes a different step (art. 103's read, on a small solid).
          const side = x <= back.x0 || x >= back.x1
          b.px(b.dither(x, y, side ? 7 : 4) ? reveal[0] : reveal[1], x, y)
        }
      }

      if (state.open) {
        // art. 70: an opened door stands open, and what is behind it is the
        // going-on — this room's darkness, breathing (art. 16).
        for (let y = back.y0; y < back.y1; y++) {
          for (let x = back.x0; x < back.x1; x++) {
            b.px(b.dither(x, y, 3) ? school.breath : inside, x, y)
          }
        }
      } else if (state.warden) {
        // Black iron, three bands, no seam. Not the same object as a door.
        for (let y = back.y0; y < back.y1; y++) {
          for (let x = back.x0; x < back.x1; x++) {
            b.px(b.hash(x | 0, y | 0) < 6 ? school.grime : school.iron, x, y)
          }
        }
        const tall = back.y1 - back.y0
        for (const at of [0.22, 0.52, 0.82]) {
          const y = back.y0 + tall * at
          b.rect(school.brickAlt, back.x0, y, back.x1 - back.x0, g(2))
          for (let x = back.x0 + g(2); x < back.x1; x += g(6)) b.px(school.bone[0]!, x, y)
        }
      } else {
        // A leaf, set back inside the frame. The grain runs with the boards.
        for (let y = back.y0; y < back.y1; y++) {
          for (let x = back.x0; x < back.x1; x++) {
            const grain = b.hash(x | 0, (y / 3) | 0)
            b.px(grain < 8 ? school.grime : school.slat[grain % 4]!, x, y)
          }
        }
        // A seam down the middle, and the ring you would pull.
        const mid = (back.x0 + back.x1) / 2
        for (let y = back.y0 + g(2); y < back.y1; y++) b.px(school.edge, mid, y)
        b.rect(school.iron, mid + g(2), (back.y0 + back.y1) / 2, g(3), g(1))
      }

      // Where the hole is cut, inked — the one line that says it is a hole
      // and not a panel hung on the wall (art. 18 applied to a thing).
      for (let y = near.y0; y < near.y1; y++) {
        b.px(school.edge, near.x0, y)
        b.px(school.edge, near.x1 - g(1), y)
      }
      for (let x = near.x0; x < near.x1; x++) b.px(school.edge, x, near.y0)

      // ── The lock, on the frame (art. 97) ─────────────────────────────
      if (!state.locked) return
      const plate = arch.x1 - Math.max(g(2), (arch.x1 - near.x1) / 2)
      const at = near.y0 + (near.y1 - near.y0) * 0.58
      b.rect(school.iron, plate - g(2), at - g(3), g(5), g(7))
      b.rect(school.edge, plate - g(1), at - g(2), g(3), g(5))
      b.px(school.coin, plate, at - g(1))
      b.px(school.accent[2]!, plate, at + g(1))
    },
  }
}

// ── The travelers, and what they left (arts 86–89) ─────────────────────

/**
 * A traveler, lying where they stopped. art. 86: every die past the bare
 * five came off one of these, and the body is the sentence the die is
 * written under — you are looking at what the labyrinth did to the person
 * ahead of you.
 *
 * art. 70: the body stays after the bone is taken. What changes is the hand,
 * which opens and holds nothing — an act that changes state changes the
 * scene, and the change here is the one worth seeing.
 */
export function deadTraveler(school: School, mark: WorldMark, taken: boolean): Prop {
  return {
    name: 'the traveler',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const foot = b.project(mark.X, mark.Y, mark.z)
      const half = (b.view.f * mark.width) / mark.z / 2
      const deep = Math.max(g(3), (b.view.f * mark.height) / mark.z * 0.42)

      // The mass: a long low shape against the wall, wider at the shoulder
      // and tapering to where the legs went out.
      for (let y = foot.y - deep; y < foot.y; y++) {
        const up = (foot.y - y) / (deep || 1)
        const w = half * (0.35 + 0.65 * (1 - up) ** 0.7)
        for (let x = foot.x - w; x < foot.x + w; x++) {
          const across = 1 - Math.abs(x - foot.x) / (w || 1)
          b.px(b.dither(x, y, 3 + across * 8) ? school.slat[0]! : school.hollow, x, y)
          if (b.hash(x | 0, y * 5) < 6) b.px(school.grime, x, y)
        }
        b.px(school.edge, foot.x - w, y)
        b.px(school.edge, foot.x + w, y)
      }

      // The cloak has gone stiff: one hard fold along the length of it.
      for (let x = foot.x - half * 0.8; x < foot.x + half * 0.8; x++) {
        if (b.dither(x, foot.y - deep * 0.55, 9)) b.px(school.slat[1]!, x, foot.y - deep * 0.55)
      }

      // The skull, small and pale, at the end nearest the wall.
      const head = Math.max(g(1), half * 0.16)
      b.rect(school.bone[0]!, foot.x - half * 0.86, foot.y - deep * 0.9, head * 2, head * 2)
      b.px(school.edge, foot.x - half * 0.86, foot.y - deep * 0.9)
      b.px(school.hollow, foot.x - half * 0.86 + head, foot.y - deep * 0.9 + head)

      // And the hand, at the other end. Closed on a bone, or open on nothing.
      const hand = foot.x + half * 0.66
      const at = foot.y - deep * 0.28
      if (taken) {
        // art. 70: open, and holding nothing. The fingers are the only thing
        // in the room that moved, and they moved because you did.
        b.px(school.bone[0]!, hand - g(1), at)
        b.px(school.bone[0]!, hand + g(1), at)
        b.px(school.edge, hand, at + g(1))
        return
      }
      b.rect(school.bone[1]!, hand - g(1), at, Math.max(g(1), head), Math.max(g(1), head))
      b.px(school.bone[2]!, hand, at)
      b.px(school.edge, hand - g(1), at + Math.max(g(1), head))
    },
  }
}

/**
 * A good, lying on the floor where the socket keeps it. Deliberately the
 * same shape whatever it is: art. 68 says a tap investigates, and the tap is
 * where you find out which of them it is — the floor only ever tells you
 * that something is there.
 */
export function goodOnFloor(school: School, mark: WorldMark): Prop {
  return {
    name: 'the find',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const at = b.project(mark.X, mark.Y, mark.z)
      const s = Math.max(g(1), b.view.f / mark.z / 6)

      // What it is sitting in.
      for (let j = at.y + s; j < at.y + s * 2; j++) {
        for (let i = at.x - s * 2; i < at.x + s * 3; i++) {
          if (b.dither(i, j, 7)) b.px(school.edge, i, j)
        }
      }
      // A small pale mass with one lit corner. No more than that: the shape
      // is the thumb's business and the word band's, not the floor's.
      b.rect(school.bone[0]!, at.x - s, at.y - s, s * 3, s * 2)
      b.rect(school.bone[1]!, at.x - s, at.y - s, s * 2, s)
      b.px(school.bone[2]!, at.x, at.y - s)
      b.px(school.edge, at.x - s, at.y + s)
      b.px(school.edge, at.x + s * 2, at.y - s)
    },
  }
}

/**
 * art. 89: what a forfeited good leaves. The thing is gone and the dust it
 * lay in is not — prose confirms, pixels prove, and this is the pixel that
 * proves the fork was final.
 */
export function leftMark(school: School, mark: WorldMark): Prop {
  return {
    name: 'the mark',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const at = b.project(mark.X, mark.Y, mark.z)
      const s = Math.max(g(1), b.view.f / mark.z / 6)
      // The clean shape of it, in a floor that is dirty everywhere else.
      for (let j = at.y - s; j < at.y + s; j++) {
        for (let i = at.x - s; i < at.x + s * 2; i++) {
          b.px(b.dither(i, j, 10) ? school.hollow : school.grime, i, j)
        }
      }
      b.px(school.edge, at.x - s, at.y - s)
      b.px(school.edge, at.x + s * 2 - g(1), at.y - s)
      b.px(school.edge, at.x - s, at.y + s - g(1))
      b.px(school.edge, at.x + s * 2 - g(1), at.y + s - g(1))
    },
  }
}
