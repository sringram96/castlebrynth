/**
 * Build the plate masters (art. 121).
 *
 *     node tools/plates.mjs
 *
 * Deterministic: the same authored text gives the same bytes, so a rebuild
 * is a no-op in the diff and a changed plate is a changed plate. It also
 * prints each master's size, which is what `src/content/visual` has to
 * declare — a manifest whose `nativeWidth` disagrees with the file is a
 * plate that will be laid out at the wrong size, and `faultsIn` cannot catch
 * that one because it cannot open the file.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { encode, fromText } from './png.mjs'
import { MASTERS } from './masters.mjs'

const root = join(process.cwd(), 'public', 'assets', 'visual')

for (const master of MASTERS) {
  const { width, height, rgba } = fromText(master.rows, master.palette)
  const out = join(root, master.path)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, encode(width, height, rgba))
  console.log(`${master.path}  ${width}×${height}`)
}
