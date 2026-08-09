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
 * arrives with nothing standing in it, and every other plate arrives as its
 * subject alone on a flat black field.
 *
 * So the key here has no seeds, no radial threshold and no guesswork: black is
 * background, everything else is the subject. What is left of the key is
 * housekeeping — drop the specks, put back the shadowed pixels inside the
 * figure that fell under the threshold, and snap the resampled edge back to
 * the binary alpha the rest of the repository is built on.
 *
 * The hands are the exception to trimming. They stay the full scene, because
 * the foreground layer is `object-fit: cover` exactly like the backdrop is —
 * which is what makes the arm land in the corridor identically at every
 * viewport, with nothing to measure and nothing to drift.
 */
const CRAWLING = {
  master: 'docs/art-reference/masters/crawling-one/',
  hall: 'hall.png',
  /** Required, then optional. A pose that is absent is simply not built. */
  poses: ['far', 'mid', 'close', 'hit', 'far-hit', 'mid-hit'],
  hands: ['hand-rest', 'hand-thrust'],
  /**
   * Luminance at or above which a pixel is the subject.
   *
   * As low as it can be. The delivered fields are flat 0, and the subjects go
   * *very* dark in places — the shadow between two coils of the arm's leather
   * strapping, the underside of the creature's hide — so a threshold set to
   * clear the field comfortably instead eats the subject from the inside.
   * One is the whole margin there is, and `close` below is what puts back
   * what still falls through.
   */
  black: 2,
  /**
   * How wide a dark gap inside a subject may be and still be bridged.
   *
   * A shadow that runs from inside the figure out to the frame's edge is not
   * a hole and cannot be filled as one — the arm's coils and the creature's
   * flanks are both exactly that, which is why they came through the first
   * build shredded. Dilating and then eroding by the same amount seals a gap
   * up to twice this wide while leaving the silhouette where it was.
   */
  close: 3,
}

/**
 * Where a pose sits, as the compositor's own fractions.
 *
 * Read off the trim box, with one correction: a 480x720 scene shown in the
 * world box of a 390x844 phone loses a tenth of its width to the cover-crop,
 * so a fraction of the scene is not yet a fraction of what is on screen.
 *
 * This is what the plate itself says. Where it is *staged* — how big the
 * thing is at each reach — is a composition decision and lives in
 * `src/content/enemies.ts`; this is printed so that decision can be made
 * against a real number rather than by eye alone.
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

/**
 * Lift a subject off the black field it was delivered on.
 *
 * Four steps, in this order and for a reason:
 *
 *   1. threshold — black is background;
 *   2. close — dilate then erode by the same amount, sealing the dark seams
 *      that run out of the figure to the frame's edge. These are the ones a
 *      hole fill cannot reach, and they are most of the damage: the shadow
 *      between two coils of the arm's strapping, the creature's shaded flank
 *      where it leaves the frame;
 *   3. fill — put back any transparent region that does *not* touch the edge,
 *      which is the rest of the hide's own shadow;
 *   4. prune — a generator leaves a scatter of embers around a lit subject,
 *      and a floating speck beside a monster reads as a rendering fault
 *      rather than as detail. Last, so it judges finished shapes.
 *
 * Done at the master's own resolution, before the resample, so the edge that
 * gets averaged is the real one.
 */
function keyBlack(src, threshold, seal) {
  const { width, height, rgba } = src
  let mask = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) mask[i] = lum(rgba, i * 4) >= threshold ? 1 : 0
  mask = erode(dilate(mask, width, height, seal), width, height, seal)
  mask = pruneIslands(fillHoles(mask, width, height), width, height, 0.01)
  for (let i = 0; i < width * height; i++) rgba[i * 4 + 3] = mask[i] ? 255 : 0
  return src
}

/** Grow a mask by `passes` pixels in the four directions. */
function dilate(mask, width, height, passes) {
  let out = mask
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        next[i] =
          out[i] ||
          (x > 0 && out[i - 1]) ||
          (x < width - 1 && out[i + 1]) ||
          (y > 0 && out[i - width]) ||
          (y < height - 1 && out[i + width])
            ? 1
            : 0
      }
    }
    out = next
  }
  return out
}

/** Shrink a mask by `passes` pixels. The frame's edge counts as inside, so a
 *  figure that runs off the plate is not eaten back from the crop. */
function erode(mask, width, height, passes) {
  let out = mask
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        next[i] =
          out[i] &&
          (x === 0 || out[i - 1]) &&
          (x === width - 1 || out[i + 1]) &&
          (y === 0 || out[i - width]) &&
          (y === height - 1 || out[i + width])
            ? 1
            : 0
      }
    }
    out = next
  }
  return out
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
    if (!existsSync(join(ROOT, file))) continue
    const hand = id.startsWith('hand-')
    // The same crop as the corridor, so a plate stays registered with it.
    const plate = hardenAlpha(
      resample(
        coverCrop(keyBlack(read(file), CRAWLING.black, CRAWLING.close), SCENE_WIDTH / SCENE_HEIGHT, 0.5),
        SCENE_WIDTH,
        SCENE_HEIGHT,
      ),
    )
    const box = bounds(plate)
    if (!box) throw new Error(`crawling-one/${id}.png is entirely transparent`)
    if (!hand) stances[id] = stanceOf(box, SCENE_WIDTH, SCENE_HEIGHT)

    // A hand keeps the whole frame; a pose is trimmed to its own silhouette.
    const sprite = posterise(hand ? plate : trim(plate), 32)
    const path = write(
      hand ? `hands/${id.replace(/^hand-/, '')}.png` : `enemies/crawling-${id}.png`,
      sprite,
      { cutout: true },
    )
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

  console.log('\ncrawling-one — what the plates themselves say, before staging:')
  for (const [id, s] of Object.entries(stances)) {
    console.log(`  ${id.padEnd(10)} { width: ${s.width}, at: ${s.at}, foot: ${s.foot} },`)
  }
  return report
}

/**
 * The Font: the chapel, and the die in the blood.
 *
 * The second authored set, built the way `BRIEF.md` in the masters folder
 * describes and the way the Crawling One is built: the room arrives with
 * nothing in it, and the basin arrives on a flat black field, once per frame.
 * So the key is the same one — threshold, close, hole-fill, prune — with no
 * seeds, no radial threshold and nothing set by eye.
 *
 * The one difference, and it is the whole reason props exist as a layer:
 * **nothing here is trimmed.** Every frame stays the full scene, exactly as
 * the hands do, and the compositor cover-fits it exactly as it cover-fits the
 * backdrop. A trimmed plate is registered by its own silhouette, and this
 * silhouette changes every frame — the die climbs out of the blood and turns —
 * so trimming would walk the basin across the screen while the die tumbled.
 * Whole frames cost bytes and buy the one property the room cannot do without.
 */
const SANCTUARY = {
  master: 'docs/art-reference/masters/sanctuary/',
  room: 'sanctuary.png',
  /** `idle` and `emerge` are the states; `1`–`6` are what it can land on. */
  frames: ['idle', 'emerge', '1', '2', '3', '4', '5', '6'],
  file: (frame) => `chalice-${frame}.png`,
  // The same two numbers as the Crawling One, and for the same reasons: the
  // delivered field is flat 0 and the subject goes very dark in places, so the
  // threshold is as low as it can be and the close puts back what falls
  // through. See `keyBlack`.
  black: 2,
  close: 3,
  /**
   * Where the basin stands in the room, and how big it is.
   *
   * All three in the scene's own fractions, measured off the chapel: the
   * flagstones in front of the altar steps run to about `foot`, and a font is
   * a thing you could get both arms around rather than a thing the size of the
   * nave. The master is a portrait — the object fills its whole frame — so
   * without this the basin arrives four times the size of the room it is in.
   *
   * This is the only place the composition is decided. Every plate is scaled
   * and seated by it, which is also what registers the eight with each other.
   */
  stance: { width: 0.3, at: 0.5, foot: 0.9 },
  /** The same as everything else. Staged at 0.3 the set costs 284 KB. */
  steps: 32,
}

/**
 * Where a plate's subject stands, measured off its own base.
 *
 * The bottom band of the opaque mask and nothing else: for the font that is
 * the plinth, which is the one feature every frame shares — the bowl fills and
 * empties, the die climbs out of it, the splash throws pixels to one side, and
 * through all of it the thing is standing on the same stone.
 *
 * Returns the base's centre, its width and the floor it stands on, in the
 * plate's own pixels.
 */
function footprint(image, band = 0.04) {
  const box = bounds(image)
  if (!box) return null
  const from = Math.max(box.y0, box.y1 - Math.round(image.height * band))
  let x0 = image.width
  let x1 = -1
  for (let y = from; y <= box.y1; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.rgba[(y * image.width + x) * 4 + 3] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
    }
  }
  return { cx: (x0 + x1 + 1) / 2, bottom: box.y1 + 1, width: x1 - x0 + 1 }
}

/**
 * Stand a plate's subject on a chosen spot, at a chosen size.
 *
 * Two jobs in one resample, because they are the same arithmetic:
 *
 *   1. **register the family.** The frames were painted separately, so the
 *      basin drifts and changes size between them — and this room's whole
 *      promise is that it does not move while the die tumbles. Measuring each
 *      plate's own base and mapping it onto one shared base removes that.
 *   2. **stage it.** How big the object is in the room is a composition
 *      decision, and the master is a portrait of the thing rather than a
 *      picture of it standing in a chapel. `stance` is that decision, in the
 *      scene's own fractions, in one place.
 *
 * **Nothing is drawn, retouched or repainted.** The plate is measured, scaled
 * and moved, which is what `CLAUDE.md` § *No art in the polish sweep* reserves
 * to code: placement is the pipeline's job and the pixels are the painter's.
 */
function standOn(image, from, to, width, height) {
  const scale = to.width / from.width
  const scaled = resample(image, Math.round(image.width * scale), Math.round(image.height * scale))
  const dx = Math.round(to.cx - from.cx * scale)
  const dy = Math.round(to.bottom - from.bottom * scale)
  const out = new Uint8Array(width * height * 4)
  for (let y = 0; y < scaled.height; y++) {
    const ty = y + dy
    if (ty < 0 || ty >= height) continue
    for (let x = 0; x < scaled.width; x++) {
      const tx = x + dx
      if (tx < 0 || tx >= width) continue
      const s = (y * scaled.width + x) * 4
      const d = (ty * width + tx) * 4
      out[d] = scaled.rgba[s]
      out[d + 1] = scaled.rgba[s + 1]
      out[d + 2] = scaled.rgba[s + 2]
      out[d + 3] = scaled.rgba[s + 3]
    }
  }
  return { width, height, rgba: out }
}

/** The middle value. Robust to one frame having been painted a size out. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const half = sorted.length >> 1
  return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2
}

function buildSanctuary() {
  const dir = join(ROOT, SANCTUARY.master)
  const room = join(dir, SANCTUARY.room)
  const frames = SANCTUARY.frames.filter((f) => existsSync(join(dir, SANCTUARY.file(f))))

  if (!existsSync(room) && frames.length === 0) {
    console.log(
      `\nsanctuary: no plates yet — ${SANCTUARY.master}BRIEF.md is what they have to be.\n` +
        '           the room runs on a stand-in backdrop and no basin until they land.',
    )
    return []
  }
  if (frames.length > 0 && frames.length !== SANCTUARY.frames.length) {
    // Half a family is worse than none: the missing frames would fall back to
    // the idle basin, and the die would appear to vanish on those faces.
    const missing = SANCTUARY.frames.filter((f) => !frames.includes(f))
    throw new Error(`sanctuary is missing chalice frames: ${missing.join(', ')}`)
  }

  const report = []
  if (existsSync(room)) {
    const scene = posterise(
      resample(
        coverCrop(read(SANCTUARY.master + SANCTUARY.room), SCENE_WIDTH / SCENE_HEIGHT, 0.5),
        SCENE_WIDTH,
        SCENE_HEIGHT,
      ),
      32,
    )
    for (let i = 3; i < scene.rgba.length; i += 4) scene.rgba[i] = 255
    report.push({
      id: 'room.sanctuary',
      path: write('rooms/sanctuary.png', scene),
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
    })
  }

  // Key every frame first, at the master's own resolution, and measure where
  // each one is standing. Nothing is written until all eight have been read,
  // because the shared base they are moved onto is a property of the family.
  const keyed = frames.map((frame) => {
    const image = keyBlack(read(SANCTUARY.master + SANCTUARY.file(frame)), SANCTUARY.black, SANCTUARY.close)
    const stood = footprint(image)
    if (!stood) throw new Error(`sanctuary/${SANCTUARY.file(frame)} is entirely transparent`)
    return { frame, image, stood }
  })

  // Where every plate is going: the staged base, in scene pixels. One target
  // for all eight, which is what makes them register with each other — a
  // family that each landed on its own base would still drift.
  const shared = {
    cx: SANCTUARY.stance.at * SCENE_WIDTH,
    bottom: SANCTUARY.stance.foot * SCENE_HEIGHT,
    width: SANCTUARY.stance.width * SCENE_WIDTH,
  }
  // How far apart the masters were before any of that, so a repaint that
  // fixes it can see it has. A family delivered already registered reports the
  // same scale on every row.
  const drift = median(keyed.map((k) => k.stood.width))
  console.log('\nsanctuary — where each plate was standing, and what it was scaled by:')

  for (const { frame, image, stood } of keyed) {
    // Straight from the master to the scene, in one resample: the two are the
    // same 2:3, so there is no crop to do and no reason to filter twice.
    const plate = posterise(
      hardenAlpha(standOn(image, stood, shared, SCENE_WIDTH, SCENE_HEIGHT)),
      SANCTUARY.steps,
    )
    let opaque = 0
    for (let i = 3; i < plate.rgba.length; i += 4) if (plate.rgba[i] === 255) opaque++
    console.log(
      `  ${frame.padEnd(7)} base ${String(Math.round(stood.width)).padStart(4)}px wide at ` +
        `(${Math.round(stood.cx)}, ${stood.bottom}) — ${((stood.width / drift - 1) * 100).toFixed(1)}% ` +
        `off the family — scaled ${(shared.width / stood.width).toFixed(4)}`,
    )
    report.push({
      id: `chalice.${frame}`,
      path: write(`props/chalice-${frame}.png`, plate, { cutout: true }),
      width: plate.width,
      height: plate.height,
      coverage: +(opaque / (plate.width * plate.height)).toFixed(3),
    })
  }

  return report
}

/**
 * The two environmental rooms.
 *
 * Built the way the Font is and for the same reasons, with one difference that
 * is the whole point of them: the Font is a room plus *one* family of frames,
 * and these are a room plus *several independent objects*, each of which can be
 * in a different position while the others hold still.
 *
 * That changes nothing about the pipeline and everything about the delivery
 * contract. Every plate of every family must register to the same 1024 × 1536
 * canvas as the room — not to its own silhouette, and not to a shared base the
 * way the chalice's plinth is measured, because these objects do not share a
 * base. A bell hanging in the left aisle and a chest on the floor under it have
 * nothing in common to measure against, so the registration has to arrive
 * already correct and the pipeline only resamples.
 *
 * Which is why there is no `standOn` here: nothing is staged, nothing is
 * measured, nothing is moved. Master in, cover-crop, resample, key, posterise,
 * out. If two frames are aligned at 1024 × 1536 they are aligned at 480 × 720,
 * and no per-frame CSS offset exists anywhere to paper over it if they are not.
 */
const ROOMS = [
  {
    id: 'reliquary',
    master: 'docs/art-reference/masters/reliquary/',
    /** `<family>: [frames]`, and a family is built only if it is whole. */
    props: {
      bell: ['idle', 'ring-1', 'ring-2', 'settle'],
      brazier: ['lit', 'dim', 'out', 'igniting'],
      lever: ['up', 'pulling', 'down'],
      chest: ['closed', 'opening', 'open'],
    },
    ambient: { candle: 3, chain: 3, drip: 3, embers: 4, window: 2 },
  },
  {
    id: 'chain-vault',
    master: 'docs/art-reference/masters/chain-vault/',
    props: {
      chain: ['off', 'pulling', 'on'],
      cage: ['raised', 'lowering-1', 'lowering-2', 'lowered'],
      plate: ['off', 'on'],
      lever: ['up', 'pull-1', 'pull-2', 'down'],
      gate: ['closed', 'opening-1', 'opening-2', 'open'],
      panel: ['still'],
    },
    ambient: { fire: 3, chain: 3, smoke: 4, shaft: 2 },
  },
]

/** The same two numbers, and the same reasons, as everything else keyed here. */
const ROOM_KEY = { black: 2, close: 3 }

/** Master → runtime for one whole-scene plate. The only path either kind takes. */
function scenePlate(file, { opaque }) {
  const src = read(file)
  if (opaque) {
    const scene = posterise(
      resample(coverCrop(src, SCENE_WIDTH / SCENE_HEIGHT, 0.5), SCENE_WIDTH, SCENE_HEIGHT),
      32,
    )
    for (let i = 3; i < scene.rgba.length; i += 4) scene.rgba[i] = 255
    return scene
  }
  // Keyed at the master's own resolution, so the edge that gets averaged by the
  // resample is the real one — and never trimmed, so the object stays where it
  // was painted.
  return posterise(
    hardenAlpha(
      resample(
        coverCrop(keyBlack(src, ROOM_KEY.black, ROOM_KEY.close), SCENE_WIDTH / SCENE_HEIGHT, 0.5),
        SCENE_WIDTH,
        SCENE_HEIGHT,
      ),
    ),
    32,
  )
}

function buildRooms() {
  const report = []
  for (const room of ROOMS) {
    const dir = join(ROOT, room.master)
    const background = join(dir, 'background.png')
    const missing = []

    if (existsSync(background)) {
      report.push({
        id: `room.${room.id}`,
        path: write(`rooms/${room.id}.png`, scenePlate(`${room.master}background.png`, { opaque: true })),
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
      })
    } else {
      missing.push('background.png')
    }

    // A family is built only if every frame of it is there. Half a family is
    // worse than none: the absent frames fall back to whatever plate was up,
    // so the object would freeze mid-swing on exactly the states that matter.
    for (const [family, frames] of Object.entries(room.props)) {
      const files = frames.map((f) => `${family}-${f}.png`)
      const held = files.filter((f) => existsSync(join(dir, f)))
      if (held.length === 0) {
        missing.push(...files)
        continue
      }
      if (held.length !== files.length) {
        throw new Error(
          `${room.id} has ${held.length} of ${files.length} ${family} frames — ` +
            `missing ${files.filter((f) => !held.includes(f)).join(', ')}`,
        )
      }
      for (const [i, file] of files.entries()) {
        const plate = scenePlate(room.master + file, { opaque: false })
        let opaque = 0
        for (let j = 3; j < plate.rgba.length; j += 4) if (plate.rgba[j] === 255) opaque++
        report.push({
          id: `${room.id}.${family}.${frames[i]}`,
          path: write(`props/${room.id}-${family}-${frames[i]}.png`, plate, { cutout: true }),
          width: plate.width,
          height: plate.height,
          coverage: +(opaque / (plate.width * plate.height)).toFixed(3),
        })
      }
    }

    for (const [family, count] of Object.entries(room.ambient)) {
      const files = Array.from({ length: count }, (_, i) => `ambient-${family}-${i + 1}.png`)
      const held = files.filter((f) => existsSync(join(dir, f)))
      if (held.length === 0) {
        missing.push(...files)
        continue
      }
      if (held.length !== files.length) {
        throw new Error(`${room.id} has a partial ${family} ambience loop`)
      }
      for (const [i, file] of files.entries()) {
        const plate = scenePlate(room.master + file, { opaque: false })
        report.push({
          id: `${room.id}.ambient.${family}.${i + 1}`,
          path: write(`ambient/${room.id}-${family}-${i + 1}.png`, plate, { cutout: true }),
          width: plate.width,
          height: plate.height,
        })
      }
    }

    if (missing.length > 0) {
      console.log(
        `\n${room.id}: ${missing.length} master${missing.length === 1 ? '' : 's'} not painted yet — ` +
          `${room.master}BRIEF.md is what they have to be.\n` +
          `          the room runs without them. see '## HUMAN ART REQUIRED' in POLISH_PROGRESS.md.`,
      )
    }
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
  const built = [
    ...buildBackdrops(),
    ...buildEnemies(),
    ...buildCrawling(),
    ...buildSanctuary(),
    ...buildRooms(),
    ...buildUi(),
  ]
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
