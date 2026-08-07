/**
 * The asset manifest — every authored plate the game ships (art. 121).
 *
 * This is the **only** file in the repository that knows a filename.
 * Gameplay names a thing by id; placement names a thing by id; the fixture
 * names a thing by id. If a master moves on disk, it moves here and nowhere
 * else.
 *
 * The masters themselves are authored in `tools/masters.mjs` and written by
 * `node tools/plates.mjs`. `nativeWidth`/`nativeHeight` are what that
 * command prints — they are declared rather than read off the file because
 * layout happens before a decode finishes, and a plate whose declared size
 * is a lie is a plate that lays out at the wrong size for one frame and then
 * jumps. `test/visual.assets.test.ts` holds the declarations to the files.
 */

import type { AssetManifest } from '../../visual/index.js'
import { ASSET_ROOT } from '../../visual/index.js'

const plate = (
  id: string,
  file: string,
  nativeWidth: number,
  nativeHeight: number,
  school: string,
): AssetManifest[string] => ({
  kind: 'plate',
  id,
  src: `${ASSET_ROOT}${file}`,
  nativeWidth,
  nativeHeight,
  school,
})

/**
 * art. 121: the first slice. Five masters, and each is here to prove one
 * thing the architecture claims:
 *
 * - `ossuary.bone-stack` — an authored overlay standing in a computed room;
 * - `horror.marrow` — a focal plate at a world coordinate, which the fight
 *   then brings closer without a second screen (art. 30);
 * - `patch.candle.*` — two frames of a thing five pixels wide, repainted
 *   without recasting the room (arts 110, 122);
 * - `hand.lantern` — what you are carrying, anchored to the frame rather
 *   than to the room.
 *
 * What still has to be drawn to reach `reference/visual/canonical-screen.png`
 * is listed in DESIGN.md. It is a long list and this is deliberately not it.
 */
export const PLATES: AssetManifest = {
  'ossuary.bone-stack': plate(
    'ossuary.bone-stack',
    'regions/ossuary/bone-stack.png',
    48,
    26,
    'ossuary',
  ),
  'horror.marrow': plate('horror.marrow', 'horrors/marrow.png', 37, 48, 'ossuary'),
  'patch.candle.a': plate('patch.candle.a', 'patches/candle-a.png', 5, 13, 'ossuary'),
  'patch.candle.b': plate('patch.candle.b', 'patches/candle-b.png', 5, 13, 'ossuary'),
  /**
   * The one plate with no region in its name. It is not in the box — it is
   * between you and the box — so it comes down every corridor with you and
   * belongs to no school's key but its own.
   */
  'hand.lantern': plate('hand.lantern', 'ui/lantern.png', 21, 38, 'carried'),
}
