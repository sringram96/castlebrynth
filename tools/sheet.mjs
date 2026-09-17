/**
 * Cut a delivered contact sheet into registered masters.
 *
 * `BRIEF.md` asks for a moving family **registered**: every plate painted where
 * the object stands, on the same 1024 × 1536 canvas as `background.png`, so the
 * pipeline only cover-crops, keys and resamples. The Reliquary's swing arrived
 * the other way — six bells on one landscape sheet, each drawn in its own cell
 * at its own place — and a sheet is not a family. This turns one into the
 * other, once, deterministically: same sheet in, same bytes out.
 *
 * ## What it does, and what it refuses to do
 *
 * It **measures, scales, translates and composites onto black.** It does not
 * draw, retouch, repaint or recolour, for the same reason `stageOn` in
 * `art.mjs` does not: placement is the pipeline's job and the pixels are the
 * painter's. Every output pixel here is an area-average of the painter's own,
 * over black, exactly as a plate painted on black would have been delivered.
 *
 * ## Registration, and why it is not the bounding box
 *
 * `stageOn` seats a portrait by its **opaque box**, which is right for an
 * object painted once and wrong for one that swings: a tilted bell has a wider,
 * shorter box than a hanging one, so seating each frame by its own box scales
 * and moves the bell on every frame and it climbs the ceiling on the way over.
 * That is the failure `BRIEF.md` names.
 *
 * So the frames are registered on **the bar**: every plate is placed so the
 * gudgeon the bell turns on lands on the same point, and the skirt does the
 * travelling. That is a bell on a yoke, and it is not what the sheet was drawn
 * as — the painter turned each bell about roughly its own middle, so the bar
 * itself wanders 70px across the six cells and the bell would wag its mount.
 *
 * Two halves, and only the first is a search:
 *
 *   - **the angle** is solved, by laying the rest frame's silhouette over each
 *     other frame at every half-degree and keeping the best overlap. It comes
 *     back as an angle and a shift about the middle of the cell.
 *   - **the axis** is declared, off the rest frame's own bar. It is not solved,
 *     because that solve is `P = C + (I − Rθ)⁻¹ t` and its determinant is
 *     `2(1 − cos θ)`: at the four-degree end of the swing a pixel of slop in
 *     the shift becomes two hundred pixels of slop in the axis, which is
 *     exactly the frame whose placement has to be quietest.
 *
 * Moving a drawing from one centre of rotation to another is a translation —
 * `(I − Rθ)(pivot − centre) − shift` — so the correction multiplies that
 * inverse straight back out, and every plate is still the painter's pixels.
 *
 * Run it with `npm run sheet`. It writes masters, not runtime art: `npm run
 * art` is what turns those into `public/assets/props/`.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { decode, encode } from './png.mjs'

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..')

/** The masters' canvas, and the scene the placement below is in fractions of. */
const MASTER = { width: 1024, height: 1536 }
const SCENE = { width: 480, height: 720 }

/**
 * The Reliquary's bell, as it was delivered.
 *
 * Six cells on a 3 × 2 grid of 512, and the poses measured off them — the tilt
 * is the angle from the bar to the middle of the skirt:
 *
 *     cell 0   −0.1°   hanging still      cell 3   −0.1°   hanging still
 *     cell 1   −8.1°   swung left         cell 4  +12.6°   swung far right
 *     cell 2  −13.0°   swung far left     cell 5   +4.5°   swung right
 *
 * `frames` names the five that ship and the order they were chosen in: the
 * rest pose, then a decaying alternation — 13° over, 12.6° back, 8°, 4.5° —
 * which is the swing `bell-swing` in the stylesheet used to draw as a rotation
 * and is now four plates a painter drew.
 *
 * **Cell 3 does not ship.** It is a second render of the rest pose, and two
 * renders of one pose are not one pose: its box is six pixels shorter than
 * cell 0's, so ending the swing on it would pop. One rest plate serves both
 * the bell that has not been rung and the bell that has — `bell-settle` in
 * `BRIEF.md` — because this delivery draws them the same.
 */
const BELL = {
  sheet: 'docs/art-reference/visual/reliquary/reference-bell-swing-sheet.png',
  out: 'docs/art-reference/masters/reliquary/',
  grid: { cols: 3, rows: 2, width: 512, height: 512 },
  /** `<name>: <cell>`, rest first — every other frame registers against it. */
  frames: { idle: 0, 'ring-1': 2, 'ring-2': 4, 'ring-3': 1, 'ring-4': 5 },
  rest: 'idle',
  /**
   * Where the rest frame's opaque box lands, in fractions of the 480 × 720
   * scene. The same three numbers a `stance` in `art.mjs` carries, and set the
   * same way — by eye against the room — with one difference that matters:
   * they are read off **the rest frame only**, and every other frame inherits
   * that scale and is placed by its pivot rather than by its own box.
   *
   * The bell hangs top-left over the altar, where it has always hung. `top`
   * rather than `foot` because this bell is mounted on a bar rather than swung
   * from a chain: what has to stay put is the bar at the ceiling, and the lip
   * is the end that moves.
   *
   * **`top` is 0, so the hanger meets the top edge of the frame.** There is no
   * chain and no beam painted above the yoke, so a bell with sky over it floats;
   * a bell whose mount runs off the top of the picture is held by something the
   * frame does not show. That is a placement answering an art problem, which is
   * the only way this file is allowed to answer one.
   *
   * **`at` is set for the swing rather than for the rest pose**, and that is the
   * one number a still bell would get wrong. Registering on the bar means the
   * body travels: the far frames put the skirt 26px left and 19px right of
   * where it hangs, so the family sweeps 143px of the scene rather than the 98
   * it occupies standing. A 390 × 844 phone — the viewport every layout claim
   * in `ART_DIRECTION.md` is made about — sees the scene from x 62 to x 418,
   * because cover-fit eats the rest. So the sweep sits inside that with a few
   * pixels to spare, and that is as far left as the bell goes: the portrait it
   * replaced hung 21px further out, and had no swing to fit.
   */
  place: { width: 0.205, at: 0.288, top: 0.0 },
  /**
   * The bar, in the rest cell's own pixels, and the axis the family turns about.
   *
   * Measured off cell 0 rather than guessed: its opaque span is 29–57 px wide
   * and centred on 255.0 from row 7 down to row 27 — the hanger above the
   * headstock — and then jumps to 165 px at row 30 and holds it to row 57,
   * which is the crossbar with a cap on each end. So the axis runs across the
   * middle of that band.
   *
   * It is the gudgeon a bell actually turns on, and it is **not** where this
   * delivery drew the turn: the painter rotated each bell about roughly its own
   * middle, so the bar itself wanders 70 px across the six cells. Registering
   * here is what nails it and lets the skirt do the swinging.
   */
  pivot: { x: 255, y: 43 },
}

// ── pixels ─────────────────────────────────────────────────────────────

const read = (path) => decode(readFileSync(join(ROOT, path)))

/** One cell of the sheet, as its own image. */
function cellOf(sheet, grid, index) {
  const cx = (index % grid.cols) * grid.width
  const cy = Math.floor(index / grid.cols) * grid.height
  const rgba = new Uint8Array(grid.width * grid.height * 4)
  for (let y = 0; y < grid.height; y++) {
    const from = ((cy + y) * sheet.width + cx) * 4
    rgba.set(sheet.rgba.subarray(from, from + grid.width * 4), y * grid.width * 4)
  }
  return { width: grid.width, height: grid.height, rgba }
}

/** The opaque box, which is what a placement is measured against. */
function bounds(image, threshold = 128) {
  let x0 = image.width
  let y0 = image.height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.rgba[(y * image.width + x) * 4 + 3] < threshold) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) throw new Error('an entirely transparent cell')
  return { x0, y0, x1, y1, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

/** A silhouette, at a reduction, for the solve to work on. */
function mask(image, step) {
  const w = Math.ceil(image.width / step)
  const h = Math.ceil(image.height / step)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = 0
      let n = 0
      for (let yy = y * step; yy < Math.min((y + 1) * step, image.height); yy++) {
        for (let xx = x * step; xx < Math.min((x + 1) * step, image.width); xx++) {
          if (image.rgba[(yy * image.width + xx) * 4 + 3] >= 128) hit++
          n++
        }
      }
      out[y * w + x] = hit * 2 >= n ? 1 : 0
    }
  }
  return { width: w, height: h, data: out }
}

/** Rotate a silhouette about its own centre. Nearest sample: it is a mask. */
function spin(m, theta) {
  const cx = (m.width - 1) / 2
  const cy = (m.height - 1) / 2
  const cos = Math.cos(-theta)
  const sin = Math.sin(-theta)
  const out = new Uint8Array(m.width * m.height)
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const dx = x - cx
      const dy = y - cy
      const sx = Math.round(cx + dx * cos - dy * sin)
      const sy = Math.round(cy + dx * sin + dy * cos)
      if (sx < 0 || sy < 0 || sx >= m.width || sy >= m.height) continue
      out[y * m.width + x] = m.data[sy * m.width + sx]
    }
  }
  return { width: m.width, height: m.height, data: out }
}

/** How much of two silhouettes coincide, with one shifted. Jaccard. */
function overlap(a, b, dx, dy) {
  let both = 0
  let either = 0
  for (let y = 0; y < a.height; y++) {
    const sy = y - dy
    for (let x = 0; x < a.width; x++) {
      const sx = x - dx
      const av = sx >= 0 && sy >= 0 && sx < a.width && sy < a.height ? a.data[sy * a.width + sx] : 0
      const bv = b.data[y * b.width + x]
      if (av && bv) both++
      if (av || bv) either++
    }
  }
  return either === 0 ? 0 : both / either
}

/** The centre of mass, so the shift search starts somewhere sensible. */
function centroid(m) {
  let sx = 0
  let sy = 0
  let n = 0
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      if (!m.data[y * m.width + x]) continue
      sx += x
      sy += y
      n++
    }
  }
  return { x: sx / n, y: sy / n, n }
}

/**
 * The rotation that lays the rest frame over this one.
 *
 * Coarse on a reduced silhouette, then refined at a finer one around the
 * answer — the bells are separate renders rather than one drawing rotated, so
 * the overlap peaks below 1 and what is wanted is where the peak *is*.
 *
 * It returns the angle and the shift **about the middle of the cell**, and
 * deliberately does not solve for where the painter's own centre of rotation
 * was. That inversion exists — `P = C + (I − Rθ)⁻¹ t` — and it is useless: its
 * determinant is `2(1 − cos θ)`, so at the four-degree end of a swing a pixel
 * of slop in `t` becomes two hundred pixels of slop in `P`. The pivot is
 * declared instead, off the bar, and the ill-conditioned step never happens —
 * `(I − Rθ)` multiplies it back out in `shiftTo` below.
 */
function solveSpin(restImage, frameImage, { step = 4, span = 22, fine = 2 } = {}) {
  const search = (stepPx, thetas, window) => {
    const a = mask(restImage, stepPx)
    const b = mask(frameImage, stepPx)
    const to = centroid(b)
    let best = { score: -1, theta: 0, dx: 0, dy: 0 }
    for (const theta of thetas) {
      const spun = spin(a, theta)
      const from = centroid(spun)
      // Centroids land the shift within a pixel or two at this reduction, so
      // the window is around that rather than around the origin.
      const cx = Math.round(to.x - from.x)
      const cy = Math.round(to.y - from.y)
      for (let dy = cy - window; dy <= cy + window; dy++) {
        for (let dx = cx - window; dx <= cx + window; dx++) {
          const score = overlap(spun, b, dx, dy)
          if (score > best.score) best = { score, theta, dx, dy }
        }
      }
    }
    return { ...best, dx: best.dx * stepPx, dy: best.dy * stepPx }
  }

  // Half a degree over the whole plausible span, then a twelfth of one around
  // the answer at a finer silhouette.
  const coarse = search(
    step,
    Array.from({ length: span * 4 + 1 }, (_, i) => ((i - span * 2) * Math.PI) / 360),
    4,
  )
  const around = Array.from({ length: 25 }, (_, i) => coarse.theta + ((i - 12) * Math.PI) / 2160)
  const best = search(fine, around, 5)
  return { theta: best.theta, score: best.score, shift: { x: best.dx, y: best.dy } }
}

/**
 * Where to put this frame so the bell turns about the bar.
 *
 * The painter drew each bell turning about roughly its own middle, which is
 * what a bell rocking on a table does rather than one hung in a belfry. Every
 * frame is still *some* rotation of the rest pose, though, and two rotations
 * of the same thing by the same angle about two different centres differ by a
 * translation — so moving the drawing is the whole of the correction, and
 * nothing is redrawn to get it.
 *
 * `(I − Rθ)(pivot − centre) − shift` is that translation.
 */
function shiftTo(pivot, centre, spin) {
  const cos = Math.cos(spin.theta)
  const sin = Math.sin(spin.theta)
  const v = { x: pivot.x - centre.x, y: pivot.y - centre.y }
  const turned = { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos }
  return { x: v.x - turned.x - spin.shift.x, y: v.y - turned.y - spin.shift.y }
}

/**
 * Draw one cell onto the master canvas, scaled and shifted, over black.
 *
 * An area average, weighted by alpha, which is the same filter `resample` in
 * `art.mjs` uses and for the same reason: a box filter is what keeps an edge
 * from crawling when it lands between pixels. The result is opaque, because a
 * master is a painting on a black field rather than a cut-out — `art.mjs` is
 * what keys it back out.
 */
function composite(cell, { scale, offsetX, offsetY }) {
  const rgba = new Uint8Array(MASTER.width * MASTER.height * 4)
  const inv = 1 / scale
  for (let y = 0; y < MASTER.height; y++) {
    const v0 = (y - offsetY) * inv
    const v1 = v0 + inv
    for (let x = 0; x < MASTER.width; x++) {
      const u0 = (x - offsetX) * inv
      const u1 = u0 + inv
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = Math.floor(v0); sy < Math.ceil(v1); sy++) {
        if (sy < 0 || sy >= cell.height) continue
        for (let sx = Math.floor(u0); sx < Math.ceil(u1); sx++) {
          if (sx < 0 || sx >= cell.width) continue
          const i = (sy * cell.width + sx) * 4
          const w = cell.rgba[i + 3] / 255
          r += cell.rgba[i] * w
          g += cell.rgba[i + 1] * w
          b += cell.rgba[i + 2] * w
          a += w
          n++
        }
      }
      if (n === 0) continue
      const o = (y * MASTER.width + x) * 4
      const cover = a / n
      // Over black: what the painter's alpha uncovers is the black field, and
      // nothing else is added. The plate is opaque when it leaves here.
      rgba[o] = a > 0 ? Math.round((r / a) * cover) : 0
      rgba[o + 1] = a > 0 ? Math.round((g / a) * cover) : 0
      rgba[o + 2] = a > 0 ? Math.round((b / a) * cover) : 0
      rgba[o + 3] = 255
    }
  }
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
  return { width: MASTER.width, height: MASTER.height, rgba }
}

// ── the run ────────────────────────────────────────────────────────────

function cutBell(set) {
  const sheet = read(set.sheet)
  const cells = Object.fromEntries(
    Object.entries(set.frames).map(([name, index]) => [name, cellOf(sheet, set.grid, index)]),
  )
  const rest = cells[set.rest]
  const restBox = bounds(rest)

  // One scale for the whole family, off the rest frame, so no frame is ever
  // resized by how wide its own tilt happens to make it.
  const toMaster = MASTER.width / SCENE.width
  const scale = (set.place.width * SCENE.width * toMaster) / restBox.width
  const restLeft = (set.place.at - set.place.width / 2) * SCENE.width * toMaster
  const offsetX = restLeft - restBox.x0 * scale
  const offsetY = set.place.top * SCENE.height * toMaster - restBox.y0 * scale

  const centre = { x: (rest.width - 1) / 2, y: (rest.height - 1) / 2 }
  const solved = {}
  for (const [name, cell] of Object.entries(cells)) {
    if (name === set.rest) continue
    solved[name] = solveSpin(rest, cell)
  }

  const report = []
  for (const [name, cell] of Object.entries(cells)) {
    const s = solved[name]
    const shift = s ? shiftTo(set.pivot, centre, s) : { x: 0, y: 0 }
    const image = composite(cell, {
      scale,
      offsetX: offsetX + shift.x * scale,
      offsetY: offsetY + shift.y * scale,
    })
    const path = join(ROOT, set.out, `bell-${name}.png`)
    writeFileSync(path, encode(image.width, image.height, image.rgba))
    report.push({
      name,
      cell: set.frames[name],
      deg: s ? (s.theta * 180) / Math.PI : 0,
      fit: s ? s.score : 1,
      shift,
    })
  }
  // Where the bar ends up on screen, which is the one number the room has to
  // agree with: the hotspot in `content/rooms.ts` hangs off the same picture.
  const onScreen = {
    x: (set.pivot.x * scale + offsetX) / toMaster,
    y: (set.pivot.y * scale + offsetY) / toMaster,
  }
  return { report, pivot: set.pivot, onScreen }
}

const { report, pivot, onScreen } = cutBell(BELL)
console.log(`the bell — ${report.length} plates from ${BELL.sheet.split('/').pop()}`)
for (const r of report) {
  console.log(
    `  bell-${r.name.padEnd(7)} cell ${r.cell}  ${r.deg >= 0 ? '+' : ''}${r.deg.toFixed(1)}°`.padEnd(34) +
      `fit ${(r.fit * 100).toFixed(1)}%  shift ${r.shift.x.toFixed(1)}, ${r.shift.y.toFixed(1)}`,
  )
}
console.log(
  `  pivot ${pivot.x.toFixed(1)}, ${pivot.y.toFixed(1)} in the cell — ` +
    `${onScreen.x.toFixed(1)}, ${onScreen.y.toFixed(1)} of ${SCENE.width}x${SCENE.height} on screen`,
)
console.log('  npm run art builds these into public/assets/props/')
