/**
 * The art pipeline.
 *
 * Source masters live in `docs/art-reference/` and (for now) in the large
 * region PNGs the pre-reset build shipped. Neither is a runtime payload: the
 * masters are 1024x1536 and 2-4 MB each, which is roughly a hundred times
 * what a 390px-wide phone can use.
 *
 * This script turns masters into the two runtime asset kinds the compositor
 * knows about:
 *
 *   backdrop  an opaque 480x720 room image
 *   enemy     a cut-out sprite with binary alpha, at most 480 wide
 *
 * Run it with `npm run art`. It is deterministic: same masters in, same bytes
 * out, so the runtime assets are diffable and a rebuild is a no-op.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { decode, encode } from './png.mjs'

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..')
const OUT = join(ROOT, 'public/assets')

export const SCENE_WIDTH = 480
export const SCENE_HEIGHT = 720

// ── pixel helpers ──────────────────────────────────────────────────────

function read(path) {
  return decode(readFileSync(join(ROOT, path)))
}

function write(path, image, opts) {
  const full = join(OUT, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, encode(image.width, image.height, image.rgba, opts))
  return full
}

/** A box-filter resample. Averaging is what keeps the dither from aliasing. */
function resample(src, width, height) {
  const rgba = new Uint8Array(width * height * 4)
  const sx = src.width / width
  const sy = src.height / height
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let yy = y0; yy < y1 && yy < src.height; yy++) {
        for (let xx = x0; xx < x1 && xx < src.width; xx++) {
          const i = (yy * src.width + xx) * 4
          const w = src.rgba[i + 3] / 255
          r += src.rgba[i] * w
          g += src.rgba[i + 1] * w
          b += src.rgba[i + 2] * w
          a += src.rgba[i + 3]
          n += w
          }
      }
      const count = (y1 - y0) * (x1 - x0)
      const o = (y * width + x) * 4
      const k = n > 0 ? n : 1
      rgba[o] = Math.round(r / k)
      rgba[o + 1] = Math.round(g / k)
      rgba[o + 2] = Math.round(b / k)
      rgba[o + 3] = Math.round(a / count)
    }
  }
  return { width, height, rgba }
}

/** Crop in fractions of the source, so a crop reads the same at any master size. */
function crop(src, { x = 0, y = 0, width = 1, height = 1 }) {
  const x0 = Math.round(x * src.width)
  const y0 = Math.round(y * src.height)
  const w = Math.round(width * src.width)
  const h = Math.round(height * src.height)
  const rgba = new Uint8Array(w * h * 4)
  for (let yy = 0; yy < h; yy++) {
    const from = ((y0 + yy) * src.width + x0) * 4
    rgba.set(src.rgba.subarray(from, from + w * 4), yy * w * 4)
  }
  return { width: w, height: h, rgba }
}

/** Cover-crop to an aspect ratio, keeping the middle (or a named anchor). */
function coverCrop(src, aspect, anchorY = 0.5) {
  const want = src.width / aspect
  if (want <= src.height) {
    const h = Math.round(want)
    const y = Math.min(Math.max(0, (src.height - h) * anchorY), src.height - h)
    return crop(src, { y: y / src.height, height: h / src.height })
  }
  const w = Math.round(src.height * aspect)
  return crop(src, { x: (src.width - w) / 2 / src.width, width: w / src.width })
}

const lum = (rgba, i) => 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]

/**
 * Posterise, then let deflate do its job.
 *
 * Pixel art of this kind carries far fewer real colours than 24 bits; snapping
 * each channel to a step makes long runs of identical bytes, which is what the
 * PNG filter and deflate are good at. `steps` is chosen per asset by eye.
 */
function posterise(image, steps) {
  const q = 255 / (steps - 1)
  for (let i = 0; i < image.rgba.length; i += 4) {
    if (image.rgba[i + 3] === 0) {
      image.rgba[i] = 0
      image.rgba[i + 1] = 0
      image.rgba[i + 2] = 0
      continue
    }
    image.rgba[i] = Math.round(Math.round(image.rgba[i] / q) * q)
    image.rgba[i + 1] = Math.round(Math.round(image.rgba[i + 1] / q) * q)
    image.rgba[i + 2] = Math.round(Math.round(image.rgba[i + 2] / q) * q)
  }
  return image
}

// ── the cut-out ────────────────────────────────────────────────────────

/**
 * Cut a figure out of the scene it was painted into.
 *
 * The territory masters are whole compositions: the enemy stands in a corridor
 * rather than on a transparent field. Every one of them is lit the same way,
 * though — the figure is the brightest thing in the frame and the space
 * immediately around it falls to near black — so the cut is a luminance key
 * grown from seeds inside the figure and then closed up.
 *
 * The result is not a perfect matte and does not need to be. Every backdrop it
 * is composited over is near black at the edges of the figure, so what survives
 * of the original surround reads as the thing's own shadow.
 */
function cutout(src, { core, rim, falloff = 2.2, seed, dilate = 2, feather = 0 }) {
  const { width, height, rgba } = src
  // The threshold rises toward the edge of the window. In the middle it is
  // permissive, because the figure has dark parts that must stay connected to
  // its lit ones; at the edge it is severe, because the only thing out there
  // is the corridor the figure was painted standing in.
  const inside = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const dy = Math.abs(y / (height - 1) - 0.5) * 2
    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x / (width - 1) - 0.5) * 2
      const r = Math.min(1, Math.hypot(dx, dy) / Math.SQRT2 * 1.35)
      const t = core + (rim - core) * Math.pow(r, falloff)
      const i = y * width + x
      inside[i] = lum(rgba, i * 4) >= t ? 1 : 0
    }
  }

  // Grow one region from the seed boxes so lit walls elsewhere in the frame
  // are not collected. A figure is one connected thing; a corridor is not
  // connected to it except through pixels the threshold already rejected.
  const keep = new Uint8Array(width * height)
  const stack = []
  for (const box of seed) {
    const x0 = Math.round(box.x * width)
    const x1 = Math.round((box.x + box.width) * width)
    const y0 = Math.round(box.y * height)
    const y1 = Math.round((box.y + box.height) * height)
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * width + x
        if (inside[i] && !keep[i]) {
          keep[i] = 1
          stack.push(i)
        }
      }
    }
  }
  while (stack.length) {
    const i = stack.pop()
    const x = i % width
    const y = (i / width) | 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const j = ny * width + nx
      if (inside[j] && !keep[j]) {
        keep[j] = 1
        stack.push(j)
      }
    }
  }

  // Close the matte: dilate to swallow the dark seams between bones, then fill
  // any hole that does not touch the frame edge.
  let mask = keep
  for (let pass = 0; pass < dilate; pass++) {
    const next = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        if (mask[i]) {
          next[i] = 1
          continue
        }
        let n = 0
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          if (mask[ny * width + nx]) n++
        }
        next[i] = n >= 3 ? 1 : 0
      }
    }
    mask = next
  }
  mask = fillHoles(mask, width, height)
  mask = pruneIslands(mask, width, height)

  const out = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    if (!mask[i]) continue
    out[i * 4] = rgba[i * 4]
    out[i * 4 + 1] = rgba[i * 4 + 1]
    out[i * 4 + 2] = rgba[i * 4 + 2]
    out[i * 4 + 3] = 255
  }
  let image = trim({ width, height, rgba: out })
  if (feather > 0) image = darkenEdge(image, feather)
  return image
}

/**
 * Drop specks.
 *
 * Dilating a keyed matte leaves crumbs — a lit knuckle of the wall that the
 * key caught and the fill then grew. Anything under a fifth of the largest
 * piece is not part of the figure, and a floating crumb beside a monster reads
 * as a rendering fault rather than as detail.
 */
function pruneIslands(mask, width, height, minShare = 0.2) {
  const label = new Int32Array(width * height).fill(-1)
  const sizes = []
  for (let start = 0; start < width * height; start++) {
    if (!mask[start] || label[start] >= 0) continue
    const id = sizes.length
    let size = 0
    const stack = [start]
    label[start] = id
    while (stack.length) {
      const i = stack.pop()
      size++
      const x = i % width
      const y = (i / width) | 0
      if (x > 0 && mask[i - 1] && label[i - 1] < 0) (label[i - 1] = id), stack.push(i - 1)
      if (x < width - 1 && mask[i + 1] && label[i + 1] < 0) (label[i + 1] = id), stack.push(i + 1)
      if (y > 0 && mask[i - width] && label[i - width] < 0) (label[i - width] = id), stack.push(i - width)
      if (y < height - 1 && mask[i + width] && label[i + width] < 0)
        (label[i + width] = id), stack.push(i + width)
    }
    sizes.push(size)
  }
  const biggest = Math.max(0, ...sizes)
  const out = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    if (mask[i] && sizes[label[i]] >= biggest * minShare) out[i] = 1
  }
  return out
}

function fillHoles(mask, width, height) {
  const outsideAir = new Uint8Array(width * height)
  const stack = []
  const push = (i) => {
    if (!mask[i] && !outsideAir[i]) {
      outsideAir[i] = 1
      stack.push(i)
    }
  }
  for (let x = 0; x < width; x++) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    push(y * width)
    push(y * width + width - 1)
  }
  while (stack.length) {
    const i = stack.pop()
    const x = i % width
    const y = (i / width) | 0
    if (x > 0) push(i - 1)
    if (x < width - 1) push(i + 1)
    if (y > 0) push(i - width)
    if (y < height - 1) push(i + width)
  }
  const filled = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) filled[i] = mask[i] || !outsideAir[i] ? 1 : 0
  return filled
}

/** Trim fully transparent margins so the sprite's box is its silhouette. */
function trim(image) {
  const { width, height, rgba } = image
  let x0 = width
  let x1 = -1
  let y0 = height
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return image
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  const out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * width + x0) * 4
    out.set(rgba.subarray(from, from + w * 4), y * w * 4)
  }
  return { width: w, height: h, rgba: out }
}

/**
 * Darken the outermost ring of opaque pixels.
 *
 * The alpha stays binary — art direction here is a hard edge, not a soft one —
 * but a hard edge cut out of a lit scene keeps a rim of whatever it was
 * standing in front of. Rolling those pixels toward black turns that rim into
 * the sprite's own contour instead of a halo of somebody else's wall.
 */
function darkenEdge(image, rings) {
  const { width, height, rgba } = image
  for (let ring = 0; ring < rings; ring++) {
    const edge = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        if (rgba[i * 4 + 3] === 0) continue
        const bare =
          x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
          rgba[(i - 1) * 4 + 3] === 0 || rgba[(i + 1) * 4 + 3] === 0 ||
          rgba[(i - width) * 4 + 3] === 0 || rgba[(i + width) * 4 + 3] === 0
        if (bare) edge.push(i)
      }
    }
    const k = 0.45 + ring * 0.2
    for (const i of edge) {
      rgba[i * 4] = Math.round(rgba[i * 4] * k)
      rgba[i * 4 + 1] = Math.round(rgba[i * 4 + 1] * k)
      rgba[i * 4 + 2] = Math.round(rgba[i * 4 + 2] * k)
      rgba[i * 4 + 3] = 254 // marks the ring so a second pass sees it as inside
    }
    for (const i of edge) rgba[i * 4 + 3] = 255
  }
  return image
}

// ── what the slice ships ───────────────────────────────────────────────

/**
 * Backdrops: one opaque room image each, composed at build time.
 *
 * Only two masters are whole scenes — the ossuary hall and the jungle depth.
 * Everything else the old build shipped is a *plate*: a cut-out prop it used
 * to place inside a computed perspective box. The reset has no computed box,
 * so a room's identity has to be baked instead of assembled per frame.
 *
 * So a room is a base scene plus a few plates, composited here and shipped as
 * one picture. The runtime draws one image and knows nothing about it, and
 * each room gets a different silhouette, a different focal object and a
 * different lighting story rather than being one backdrop with new metadata.
 */
const REG = 'docs/art-reference/masters/regions/'
const HALL = `${REG}ossuary/hall.png`
const DEPTH = `${REG}jungle-hell/depth.png`

const BACKDROPS = [
  {
    // The front door. The hall, closed off by a gate too big for it.
    id: 'threshold',
    base: HALL,
    over: [{ from: `${REG}ossuary/gate.png`, cx: 0.5, cy: 0.5, w: 1.04 }],
  },
  {
    // The establishing shot: the hall itself, and bones underfoot.
    id: 'entry',
    base: HALL,
    over: [{ from: `${REG}ossuary/skull-pile-candles.png`, cx: 0.5, cy: 0.93, w: 1.0 }],
  },
  {
    // The choir: an arch of skulls set across the corridor, facing out.
    id: 'choir',
    base: HALL,
    over: [
      { from: `${REG}ossuary/archway-skulls.png`, cx: 0.5, cy: 0.45, w: 1.06 },
      { from: `${REG}ossuary/bone-stack.png`, cx: 0.24, cy: 0.9, w: 0.16 },
    ],
  },
  {
    // The hollow: walls packed with niches, and something hanging overhead.
    id: 'ossuary',
    base: HALL,
    over: [
      { from: `${REG}ossuary/niche-skulls.png`, cx: 0.14, cy: 0.52, w: 0.62 },
      { from: `${REG}ossuary/niche-skulls.png`, cx: 0.86, cy: 0.52, w: 0.62, flip: true },
      { from: `${REG}ossuary/hanging-skull-cluster.png`, cx: 0.5, cy: 0.14, w: 0.86 },
    ],
  },
  {
    // The split: a shrine somebody knelt at, and a ledge of candles beside it.
    id: 'shrine',
    base: HALL,
    over: [
      { from: `${REG}ossuary/pillar-skulls.png`, cx: 0.09, cy: 0.5, w: 0.46 },
      { from: `${REG}ossuary/shrine.png`, cx: 0.53, cy: 0.58, w: 0.8 },
      { from: `${REG}ossuary/candle-ledge.png`, cx: 0.87, cy: 0.66, w: 0.5 },
    ],
  },
  {
    // The deep way: warm, wet, and lit from its own fires.
    id: 'deep',
    base: DEPTH,
    over: [
      { from: `${REG}jungle-hell/left-frame.png`, cx: 0.1, cy: 0.5, w: 0.5 },
      { from: `${REG}jungle-hell/brazier.png`, cx: 0.78, cy: 0.62, w: 0.46 },
      { from: `${REG}jungle-hell/floor-bank.png`, cx: 0.5, cy: 0.94, w: 1.1 },
    ],
  },
  {
    // The door, and everything built around it.
    id: 'gate',
    base: DEPTH,
    over: [
      { from: `${REG}jungle-hell/right-frame.png`, cx: 0.9, cy: 0.5, w: 0.5 },
      { from: `${REG}jungle-hell/gate.png`, cx: 0.5, cy: 0.53, w: 0.98 },
    ],
  },
  {
    // Out.
    id: 'brazier',
    base: DEPTH,
    over: [
      { from: `${REG}jungle-hell/shrine.png`, cx: 0.5, cy: 0.56, w: 0.82 },
      { from: `${REG}jungle-hell/brazier.png`, cx: 0.15, cy: 0.66, w: 0.4 },
    ],
  },
]

/**
 * Enemies, cut from the territory masters.
 *
 * The seeds are boxes known to be inside the figure and outside everything
 * else; the threshold is the luminance the surround falls below. Both were
 * found by eye against the preview this script writes, which is the only
 * honest way to set them.
 */
const ENEMIES = [
  {
    // The Gnawing: the maw filling the corridor. One seed, on the brow. The
    // lower jaw is a separate island across an open mouth and floats when it is
    // seeded too, which reads as a rendering fault; the head alone is the brief
    // (low, wide, jaw-heavy, eyes and teeth readable at phone scale).
    id: 'enemy.gnawing',
    from: 'docs/art-reference/visual/territory-close-maw.png',
    window: { x: 0.06, y: 0.08, width: 0.8, height: 0.72 },
    core: 15,
    rim: 150,
    falloff: 5.5,
    seed: [{ x: 0.45, y: 0.278, width: 0.225, height: 0.111 }],
    dilate: 3,
    feather: 2,
    width: 460,
  },
  {
    // The Marrow: the keeper of the ossuary. Its hands hang free of the body,
    // so each gets a seed of its own.
    id: 'enemy.marrow',
    from: 'docs/art-reference/visual/territory-ossuary-keeper.png',
    window: { x: 0.18, y: 0.02, width: 0.66, height: 0.94 },
    core: 20,
    rim: 165,
    falloff: 5.5,
    seed: [
      { x: 0.364, y: 0.213, width: 0.151, height: 0.074 },
      { x: 0.394, y: 0.351, width: 0.242, height: 0.106 },
      { x: 0.061, y: 0.702, width: 0.121, height: 0.107 },
      { x: 0.758, y: 0.638, width: 0.181, height: 0.107 },
      { x: 0.455, y: 0.83, width: 0.121, height: 0.127 },
    ],
    dilate: 3,
    feather: 2,
    width: 400,
  },
  {
    // The Warden: robes on a dark door, so the key runs much lower and the
    // face, both hands and the skirt are all seeded.
    id: 'enemy.warden',
    from: 'docs/art-reference/visual/territory-gate-warden.png',
    window: { x: 0.11, y: 0.13, width: 0.78, height: 0.84 },
    core: 9,
    rim: 120,
    falloff: 5.5,
    seed: [
      { x: 0.449, y: 0.202, width: 0.115, height: 0.072 },
      { x: 0.077, y: 0.44, width: 0.115, height: 0.072 },
      { x: 0.833, y: 0.44, width: 0.129, height: 0.072 },
      { x: 0.449, y: 0.619, width: 0.128, height: 0.179 },
    ],
    dilate: 4,
    feather: 2,
    width: 470,
  },
]

/** Mirror an image horizontally. Two of a plate is two of a thing. */
function flipX(src) {
  const { width, height, rgba } = src
  const out = new Uint8Array(rgba.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + (width - 1 - x)) * 4
      const to = (y * width + x) * 4
      out[to] = rgba[from]
      out[to + 1] = rgba[from + 1]
      out[to + 2] = rgba[from + 2]
      out[to + 3] = rgba[from + 3]
    }
  }
  return { width, height, rgba: out }
}

/** Alpha-over, clipped to the canvas. The plates carry real alpha. */
function over(canvas, plate, cx, cy) {
  const x0 = Math.round(cx * canvas.width - plate.width / 2)
  const y0 = Math.round(cy * canvas.height - plate.height / 2)
  for (let y = 0; y < plate.height; y++) {
    const ty = y0 + y
    if (ty < 0 || ty >= canvas.height) continue
    for (let x = 0; x < plate.width; x++) {
      const tx = x0 + x
      if (tx < 0 || tx >= canvas.width) continue
      const s = (y * plate.width + x) * 4
      const a = plate.rgba[s + 3] / 255
      if (a === 0) continue
      const d = (ty * canvas.width + tx) * 4
      canvas.rgba[d] = Math.round(plate.rgba[s] * a + canvas.rgba[d] * (1 - a))
      canvas.rgba[d + 1] = Math.round(plate.rgba[s + 1] * a + canvas.rgba[d + 1] * (1 - a))
      canvas.rgba[d + 2] = Math.round(plate.rgba[s + 2] * a + canvas.rgba[d + 2] * (1 - a))
      canvas.rgba[d + 3] = 255
    }
  }
}

function buildBackdrops() {
  const report = []
  for (const b of BACKDROPS) {
    const base = read(b.base)
    const canvas = resample(coverCrop(base, SCENE_WIDTH / SCENE_HEIGHT, 0.5), SCENE_WIDTH, SCENE_HEIGHT)
    for (let i = 3; i < canvas.rgba.length; i += 4) canvas.rgba[i] = 255

    for (const layer of b.over ?? []) {
      const master = read(layer.from)
      const width = Math.max(1, Math.round(layer.w * SCENE_WIDTH))
      const height = Math.max(1, Math.round((width * master.height) / master.width))
      const plate = resample(layer.flip ? flipX(master) : master, width, height)
      over(canvas, plate, layer.cx, layer.cy)
    }

    const finished = posterise(canvas, 32)
    for (let i = 3; i < finished.rgba.length; i += 4) finished.rgba[i] = 255
    const path = write(`rooms/${b.id}.png`, finished)
    report.push({ id: `room.${b.id}`, path, width: SCENE_WIDTH, height: SCENE_HEIGHT })
  }
  return report
}

function buildEnemies() {
  const report = []
  for (const e of ENEMIES) {
    const src = read(e.from)
    const window = crop(src, e.window)
    // Cut at a working size rather than at the master's: the matte is cleaner
    // when the dither has already been averaged away.
    const scale = e.width / window.width
    const small = resample(window, e.width, Math.round(window.height * scale))
    const cut = posterise(
      cutout(small, {
        core: e.core,
        rim: e.rim,
        falloff: e.falloff,
        seed: e.seed,
        dilate: e.dilate,
        feather: e.feather,
      }),
      32,
    )
    const path = write(`enemies/${e.id.replace(/^enemy\./, '')}.png`, cut, { cutout: true })
    let opaque = 0
    for (let i = 3; i < cut.rgba.length; i += 4) if (cut.rgba[i] === 255) opaque++
    report.push({
      id: e.id,
      path,
      width: cut.width,
      height: cut.height,
      coverage: +(opaque / (cut.width * cut.height)).toFixed(3),
    })
  }
  return report
}

/**
 * The Crawling One: the encounter's authored plates.
 *
 * Everything else in this file cuts a figure out of a scene it was painted
 * into, because that is the only thing the pre-reset masters allow. This set
 * is authored the other way round and is much better for it: the corridor
 * arrives with nothing standing in it, and each pose arrives on a transparent
 * canvas of the *same frame*, with the creature already where it belongs.
 *
 * So there is no key here and no seeds. The pipeline resamples, snaps the
 * alpha back to binary, trims, and reads the placement straight off the trim
 * box — which means nobody ever hand-tunes a coordinate, and a repaint that
 * moves the thing six inches left moves it six inches left in the game.
 *
 * The plates are not in the repository yet. `docs/art-reference/masters/
 * crawling-one/BRIEF.md` is the contract they have to meet, and until they
 * land this build is skipped rather than failing: the encounter runs on the
 * existing sprite, staged at each reach.
 */
const CRAWLING = {
  master: 'docs/art-reference/masters/crawling-one/',
  hall: 'hall.png',
  /** Required, then optional. A pose that is absent is simply not built. */
  poses: ['far', 'mid', 'close', 'hit', 'far-hit', 'mid-hit'],
  hands: ['hand-rest', 'hand-thrust'],
}

/**
 * Where a pose sits, as the compositor's own fractions.
 *
 * Read off the trim box, with one correction: a 480x720 scene shown in the
 * world box of a 390x844 phone loses a tenth of its width to the cover-crop,
 * so a fraction of the scene is not yet a fraction of what is on screen.
 */
const WORLD_ASPECT = 390 / (844 - 390 * (364 / 730))
function stanceOf(box, width, height) {
  const visible = WORLD_ASPECT / (SCENE_WIDTH / SCENE_HEIGHT)
  const centre = (box.x0 + box.x1 + 1) / 2 / width
  return {
    width: +((box.x1 - box.x0 + 1) / width / visible).toFixed(3),
    at: +(0.5 + (centre - 0.5) / visible).toFixed(3),
    foot: +(((box.y1 + 1) / height)).toFixed(3),
  }
}

/** The opaque box of an image. `null` when nothing in it is opaque. */
function bounds(image) {
  const { width, height, rgba } = image
  let x0 = width
  let x1 = -1
  let y0 = height
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 }
}

/**
 * Snap a resampled alpha back to binary.
 *
 * Averaging a hard edge produces soft pixels, and this repository's plates are
 * binary by contract — a pixel's colour never depends on what is behind it, so
 * a room renders identically every visit. The threshold is the middle.
 */
function hardenAlpha(image) {
  for (let i = 3; i < image.rgba.length; i += 4) {
    image.rgba[i] = image.rgba[i] >= 128 ? 255 : 0
  }
  return image
}

function buildCrawling() {
  const dir = join(ROOT, CRAWLING.master)
  if (!existsSync(join(dir, CRAWLING.hall))) {
    console.log(
      `\ncrawling-one: no plates yet — ${CRAWLING.master}BRIEF.md is what they have to be.\n` +
        '            the encounter runs on the existing sprite until they land.',
    )
    return []
  }

  const report = []
  const hall = posterise(
    resample(coverCrop(read(CRAWLING.master + CRAWLING.hall), SCENE_WIDTH / SCENE_HEIGHT, 0.5), SCENE_WIDTH, SCENE_HEIGHT),
    32,
  )
  for (let i = 3; i < hall.rgba.length; i += 4) hall.rgba[i] = 255
  report.push({
    id: 'room.hall',
    path: write('rooms/hall.png', hall),
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
  })

  const stances = {}
  for (const id of [...CRAWLING.poses, ...CRAWLING.hands]) {
    const file = `${CRAWLING.master}${id}.png`
    if (!existsSync(join(ROOT, `${CRAWLING.master}${id}.png`))) continue
    // The same crop as the corridor, so a pose stays registered with it.
    const plate = hardenAlpha(
      resample(coverCrop(read(file), SCENE_WIDTH / SCENE_HEIGHT, 0.5), SCENE_WIDTH, SCENE_HEIGHT),
    )
    const box = bounds(plate)
    if (!box) throw new Error(`crawling-one/${id}.png is entirely transparent`)
    stances[id] = stanceOf(box, SCENE_WIDTH, SCENE_HEIGHT)

    const sprite = posterise(trim(plate), 32)
    const kind = id.startsWith('hand-') ? 'hands' : 'enemies'
    const path = write(`${kind}/crawling-${id.replace(/^hand-/, '')}.png`, sprite, { cutout: true })
    let opaque = 0
    for (let i = 3; i < sprite.rgba.length; i += 4) if (sprite.rgba[i] === 255) opaque++
    report.push({
      id: `crawling.${id}`,
      path,
      width: sprite.width,
      height: sprite.height,
      coverage: +(opaque / (sprite.width * sprite.height)).toFixed(3),
    })
  }

  console.log('\ncrawling-one stances — paste into the ladder in src/content/enemies.ts:')
  for (const [id, s] of Object.entries(stances)) {
    console.log(`  ${id.padEnd(10)} { width: ${s.width}, at: ${s.at}, foot: ${s.foot} },`)
  }
  return report
}

/** The tray frame: one authored plate, scaled to a phone-sensible width. */
function buildUi() {
  const report = []
  const reliquary = read('docs/art-reference/masters/ui/reliquary.png')
  const tray = posterise(resample(reliquary, 730, 364), 32)
  report.push({ id: 'ui.tray', path: write('ui/tray.png', tray), width: 730, height: 364 })
  return report
}

function main() {
  if (!existsSync(join(ROOT, 'docs/art-reference/masters/regions/ossuary/hall.png'))) {
    throw new Error('the region masters are missing; nothing to build from')
  }
  const built = [...buildBackdrops(), ...buildEnemies(), ...buildCrawling(), ...buildUi()]
  let bytes = 0
  for (const item of built) {
    const size = readFileSync(item.path).length
    bytes += size
    const where = item.path.slice(item.path.indexOf('public/'))
    console.log(
      `${item.id.padEnd(18)} ${String(item.width).padStart(4)}x${String(item.height).padEnd(4)}` +
        ` ${String(Math.round(size / 1024)).padStart(5)}K` +
        (item.coverage !== undefined ? `  coverage ${item.coverage}` : '') +
        `  ${where}`,
    )
  }
  console.log(`\ntotal runtime art: ${(bytes / 1024 / 1024).toFixed(2)} MB`)
}

main()
