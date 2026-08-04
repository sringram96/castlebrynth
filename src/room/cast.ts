import { dither } from './dither.js'
import type { Framebuffer } from './framebuffer.js'
import { colorOf, framebuffer, poke } from './framebuffer.js'
import type { RoomPalette, SurfaceShaders } from './scene.js'
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

/**
 * art. 15: the box is computed, not painted. Every pixel asks which of the
 * four planes it hits first, at what depth, and the scene's shaders answer
 * in world space — so diminution is honest and cannot be faked.
 */
export function castBox(
  view: View,
  palette: RoomPalette,
  surfaces: SurfaceShaders,
): Cast {
  const { frame, shape, f, eye, zMouth, config } = view
  const { width: W, height: H, cx: CX, cy: CY } = frame
  const target = framebuffer(W, H)
  const surface = new Uint8Array(W * H)
  const depth = new Float32Array(W * H)

  const breathX = config.grid * config.breath.x
  const breathY = config.grid * config.breath.y

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

      if (z >= zMouth || s === Surface.Mouth) {
        // art. 16: past the cutoff, structural near-black with a breath.
        surface[i] = Surface.Mouth
        depth[i] = zMouth
        const e = Math.max(0, 1 - Math.hypot(dx / breathX, (sy - CY) / breathY))
        poke(target, i, dither(sx, sy, e * 4) ? palette.breath : palette.hollow)
        continue
      }

      surface[i] = s
      depth[i] = z

      let c: string
      if (s === Surface.WallLeft || s === Surface.WallRight) {
        const height = (dy * z) / f + eye
        c = surfaces.wall(s === Surface.WallLeft ? -1 : 1, z, height)
      } else if (s === Surface.Ceiling) {
        c = surfaces.ceiling(z, (dx * z) / f)
      } else {
        c = surfaces.floor(z, (dx * z) / f)
      }

      // art. 17: distance is dither, not a gradient and never alpha.
      const fog = Math.max(0, z / zMouth - config.fog.start) * config.fog.gain
      if (dither(sx, sy, fog)) c = palette.dark
      else if (dither(sx + 2, sy, fog * config.fog.second)) c = palette.haze
      poke(target, i, c)
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
  palette: RoomPalette,
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
