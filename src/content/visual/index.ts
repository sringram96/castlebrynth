/**
 * src/content/visual — the authored layer, as data.
 *
 * `src/content` has always been where tuning numbers and player-facing prose
 * live, and this is the same seam for pixels: which plates exist, and where
 * they stand. The engine in `src/visual` knows how to composite; it does not
 * know that a Marrow exists.
 */

export { PLATES } from './assets.js'
export { DRESSED_ROOMS, LANTERN, artFor, assetsWanted } from './rooms.js'
export { CANONICAL, canonicalArt } from './canonical.js'
export type { HorrorPlate } from './horrors.js'
export { horrorPlateAt, horrorPlateFor } from './horrors.js'
