/**
 * Look at a master, large — the eyeball half of the plate recipe (art. 126).
 *
 *     node tools/preview.mjs                     # every master, ×6, on a sheet
 *     node tools/preview.mjs horrors/marrow 8    # one master, ×8
 *
 * A master is authored at the frame's own scale (art. 22): forty pixels of
 * skull is a lot of skull and almost nothing to look at on a monitor. This
 * writes the same deterministic bytes `tools/plates.mjs` writes, scaled by a
 * whole number with nearest neighbour, onto a flat dark ground — so what a
 * plate looks like can be judged before it is placed, and judged at the
 * density the reference is judged at.
 *
 * It writes into a scratch directory and never into `public/`. Nothing here
 * ships, nothing here is loaded by the game, and no runtime filename lives in
 * this file (art. 126 keeps that in `src/content/visual/assets.ts`).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { encode, fromText } from './png.mjs'
import { MASTERS } from './masters.mjs'

/** The ground a plate is judged against: the darkest step of a room, not white. */
const GROUND = [0x0b, 0x0a, 0x09, 0xff]

const [asked, askedScale] = process.argv.slice(2)
const scale = Math.max(1, Number.parseInt(askedScale ?? '6', 10) || 6)
const out = join(process.cwd(), '.preview')
mkdirSync(out, { recursive: true })

const chosen = asked === undefined ? MASTERS : MASTERS.filter((m) => m.path.startsWith(asked))
if (chosen.length === 0) {
  console.error(`no master matching "${asked}"`)
  process.exit(1)
}

for (const master of chosen) {
  const { width, height, rgba } = fromText(master.rows, master.palette)
  const big = new Uint8Array(width * scale * height * scale * 4)
  for (let y = 0; y < height * scale; y++) {
    for (let x = 0; x < width * scale; x++) {
      const from = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 4
      const to = (y * width * scale + x) * 4
      const opaque = rgba[from + 3] === 255
      for (let c = 0; c < 4; c++) big[to + c] = opaque ? rgba[from + c] : GROUND[c]
    }
  }
  const file = join(out, `${master.path.replace(/\//g, '-')}`)
  writeFileSync(file, encode(width * scale, height * scale, big))
  console.log(`${file}  ${width}×${height} ×${scale}`)
}
