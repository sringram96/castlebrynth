/**
 * src/visual — the compositor above the room renderer (arts 126–127).
 *
 * `src/room` computes the box: lens, width, ceiling, surfaces, thresholds,
 * mass, occlusion, contour. It is the stage and it did not need replacing.
 * This directory is what stands on it — authored plates, placed
 * deterministically, in a declared order, with the small moving parts
 * repainted alone.
 *
 * The seam is exactly one sentence: **perspective is computed; appearance
 * may be authored** (art. 126). Nothing here may move a surface, and nothing
 * in `src/room` may know that a plate exists.
 */

export type { AssetCache, AssetManifest, Decoder, Drawing, LoadedCache, PixelAsset, Plate, Ready } from './assets.js'
export { ASSET_ROOT, assetCache, faultsIn, imageDecoder, merge } from './assets.js'
export type { Composition, Draw } from './compositor.js'
export { composite } from './compositor.js'
export { paintFrame } from './canvas.js'
export type { VisualLayer } from './layers.js'
export { LAST_WORLD_LAYER, LAYER_NAMES, LAYER_ORDER, Layer, inTheWorld } from './layers.js'
export type { PatchMoment } from './patches.js'
export {
  MOST_PATCH_FRAMES,
  MOST_PATCH_LOOPS,
  overspentPatches,
  patchAsset,
  patchFrame,
  phaseOfPatch,
} from './patches.js'
export type {
  Anchor,
  AnimatedPatch,
  FrameOrigin,
  PatchTrigger,
  PlacedPlate,
  SceneArt,
} from './scene.js'
export { NO_ART, heroFaults } from './scene.js'
export type { Viewport } from './viewport.js'
export { MIN_FRAME_HEIGHT, crisp, frameHeightFor, viewportOf } from './viewport.js'
