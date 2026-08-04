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
import type { School } from '../palettes.js'
import { AUTHORED_GRID } from '../render.js'

/** An authored pixel, on whatever grid the dial is set to (art. 23). */
function pixel(view: View): (n: number) => number {
  return (n) => (n * view.config.grid) / AUTHORED_GRID
}

/** How deep a room reads before the mouth swallows it. */
function reach(view: View): number {
  return view.zMouth * 0.94
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
        [-shape.width + 2.5, 44],
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
 * The iron key, lying in the dust at the back of the alcove. art. 70: when
 * it is taken this prop is simply not in the scene, and the floor it lay on
 * is the floor again.
 */
export function theKey(school: School): Prop {
  return {
    name: 'the key',
    z: SHELF.z,
    paint(b: Brush): void {
      const { eye } = b.view
      const g = pixel(b.view)
      const at = b.project(SHELF.X, -eye + 1.5, SHELF.z)
      const s = Math.max(g(1), b.view.f / SHELF.z / 5)
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

// ── The door at the far end ────────────────────────────────────────────

/**
 * The door every ordinary room ends in. art. 70: an opened door stands open
 * — the slab is gone and what is left is the hollow behind it, with the jamb
 * still inked. Prose confirms; pixels prove.
 */
export function doorway(school: School, open: boolean, mark: WorldMark): Prop {
  return {
    name: 'the door',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const foot = b.project(mark.X, mark.Y, mark.z)
      const half = (b.view.f * mark.width) / mark.z / 2
      const tall = (b.view.f * mark.height) / mark.z
      const x0 = foot.x - half
      const x1 = foot.x + half
      const y0 = foot.y - tall
      const y1 = foot.y

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (open) {
            // Nothing behind it but the going-on, breathing (art. 16).
            b.px(b.dither(x, y, 3) ? school.breath : school.hollow, x, y)
          } else {
            const grain = b.hash(x | 0, (y / 3) | 0)
            b.px(grain < 8 ? school.grime : school.slat[grain % 4]!, x, y)
          }
        }
      }
      // The jamb, and the lintel above it.
      for (let y = y0; y < y1; y++) {
        b.px(school.edge, x0, y)
        b.px(school.edge, x1 - g(1), y)
      }
      for (let x = x0; x < x1; x++) b.px(open ? school.edge : school.brickAlt, x, y0)
      if (!open) {
        // A seam down the middle, and the ring you would pull.
        for (let y = y0 + g(2); y < y1; y++) b.px(school.edge, (x0 + x1) / 2, y)
        b.rect(school.iron, (x0 + x1) / 2 + g(2), (y0 + y1) / 2, g(3), g(1))
      }
    },
  }
}

/**
 * The Warden's door: black iron, one lock, and no seam. It is not the same
 * object as an ordinary door and does not open in this depth.
 */
export function blackDoor(school: School, mark: WorldMark): Prop {
  return {
    name: 'the black door',
    z: mark.z,
    paint(b: Brush): void {
      const g = pixel(b.view)
      const foot = b.project(mark.X, mark.Y, mark.z)
      const half = (b.view.f * mark.width) / mark.z / 2
      const tall = (b.view.f * mark.height) / mark.z
      const x0 = foot.x - half
      const x1 = foot.x + half
      const y0 = foot.y - tall
      const y1 = foot.y

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          b.px(b.hash(x | 0, y | 0) < 6 ? school.grime : school.iron, x, y)
        }
      }
      // Three bands across it, and the rivets in them.
      for (const at of [0.22, 0.52, 0.82]) {
        const y = y0 + tall * at
        b.rect(school.brickAlt, x0, y, x1 - x0, g(2))
        for (let x = x0 + g(2); x < x1; x += g(6)) b.px(school.bone[0]!, x, y)
      }
      for (let y = y0; y < y1; y++) {
        b.px(school.edge, x0, y)
        b.px(school.edge, x1 - g(1), y)
      }
      for (let x = x0; x < x1; x++) b.px(school.edge, x, y0)

      // The lock: one keyhole, cut for three teeth.
      const cx = (x0 + x1) / 2
      const cy = y0 + tall * 0.62
      b.rect(school.brickAlt, cx - g(4), cy - g(5), g(9), g(11))
      b.rect(school.edge, cx - g(3), cy - g(4), g(7), g(9))
      b.rect(school.hollow, cx - g(1), cy - g(2), g(3), g(6))
      b.px(school.accent[2]!, cx - g(1), cy - g(2))
      b.px(school.accent[1]!, cx, cy + g(2))
    },
  }
}
