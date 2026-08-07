/**
 * The asset manifest — every authored plate the game ships (art. 126).
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

import type { AssetManifest, Plate } from '../../visual/index.js'
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
 * A slot that has been declared and not yet painted into.
 *
 * Everything about it is settled — the path, the size, the school, and (in
 * `rooms.ts` and `horrors.ts`) where it stands and which band it is on. The
 * only thing missing is the file, and art. 126 says a missing file is a
 * plainer room rather than a broken one. So the brief in
 * `reference/visual/ASSET_BRIEF.md` and this manifest are the same statement
 * twice, and a delivered painting is a `git add` and the deletion of one word.
 */
const awaited = (
  id: string,
  file: string,
  nativeWidth: number,
  nativeHeight: number,
  school: string,
): Plate => ({
  kind: 'plate',
  id,
  src: `${ASSET_ROOT}${file}`,
  nativeWidth,
  nativeHeight,
  school,
  awaiting: true,
})

/**
 * art. 126: the first slice. Five masters, and each is here to prove one
 * thing the architecture claims:
 *
 * - `ossuary.bone-stack` — an authored overlay standing in a computed room;
 * - `horror.marrow` — a focal plate at a world coordinate, which the fight
 *   then brings closer without a second screen (art. 30);
 * - `patch.candle.*` — two frames of a thing five pixels wide, repainted
 *   without recasting the room (arts 110, 127);
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
  /**
   * **The Marrow, and this slot is the whole wave.** The plate that stood here
   * was thirty-seven pixels across: it proved the architecture and it was
   * never going to look like `reference/visual/canonical-screen.png`, because
   * the density that reference has is *stored information* and thirty-seven
   * pixels cannot store it (art. 126 says so in as many words, and the first
   * cut of this wave still tried).
   *
   * So it is declared at the size it is drawn at when it has arrived — 896
   * across, which is 0.70 of the lens on a phone at three device pixels to one
   * — and it is never upscaled past that. Standing off down the corridor the
   * same file is drawn at about 86 pixels, so the silhouette has to survive a
   * tenfold shrink while the detail rewards the arrival. That is the hardest
   * requirement in the brief and it is stated there as one.
   *
   * Until it lands the hinge draws the authored body in
   * `src/content/plates/bestiary.ts` exactly as it did before any of this,
   * which is art. 26's first tier doing the job it is a floor for.
   */
  'horror.marrow': awaited('horror.marrow', 'horrors/marrow.png', 896, 1152, 'ossuary'),
  'patch.candle.a': plate('patch.candle.a', 'patches/candle-a.png', 5, 13, 'ossuary'),
  'patch.candle.b': plate('patch.candle.b', 'patches/candle-b.png', 5, 13, 'ossuary'),
  /**
   * The one plate with no region in its name. It is not in the box — it is
   * between you and the box — so it comes down every corridor with you and
   * belongs to no school's key but its own.
   */
  'hand.lantern': plate('hand.lantern', 'ui/lantern.png', 21, 38, 'carried'),

  // ── The hero-art wave: the painted screen ────────────────────────────
  //
  // Every entry below is a slot with no painting in it yet. The size, the
  // path, the school, the band and the placement are all settled — see
  // `reference/visual/ASSET_BRIEF.md`, which is this list said in the words a
  // painter needs — and until the file lands the compositor drops the id and
  // the room renders as the computed box it always was (art. 126).
  //
  // They are declared *now* rather than when the art arrives because a slot
  // nobody has measured is a slot the art will not fit.

  /**
   * **The room, painted.** It covers the frame (art. 24's cover anchor), so
   * its aspect is 2:3 and what overflows is cropped — top and bottom on a
   * short screen, sides on a tall narrow one. The safe zone that follows is
   * the central 86% of width and 76% of height, measured across the phones in
   * the brief rather than guessed, and the brief states it as a rule the
   * composition is built to rather than a surprise it discovers.
   */
  'ossuary.hall': awaited('ossuary.hall', 'regions/ossuary/hall.png', 1024, 1536, 'ossuary'),

  /**
   * **The carved reliquary the interface sits in.** Its aspect is what sets
   * the tray band's height (4:3), so of every number in the brief this is the
   * one that may not drift: the recesses in it are where the live controls are
   * positioned from, in fractions of this file.
   *
   * It is 4:3 and not the reference's three-and-a-quarter-to-one because that
   * proportion gives a 120-pixel band on a 390-pixel phone, and the live tray
   * has to hold a rail, up to eight dice at a size a thumb can hit, a running
   * total and three verbs — measured, about 265 pixels. The reference's tray is
   * an illustration at 1088 across; this is the same object at the size a hand
   * holds.
   */
  'tray.reliquary': awaited('tray.reliquary', 'ui/reliquary.png', 1536, 1152, 'carried'),

  /**
   * **What you are holding.** art. 126's second frame-anchored thing, and the
   * reason it is `weapon.` rather than `hand.` is that a different weapon is a
   * different file in the same pose: the grip is authored once and every
   * weapon after this one registers against it.
   */
  'weapon.knife': awaited('weapon.knife', 'ui/knife.png', 896, 1152, 'carried'),

  /**
   * **The six faces, one die.** art. 128 draws whatever hand it is given, so
   * these are sized for the largest a die is ever drawn (60 CSS pixels at
   * three device pixels to one) and never upscaled past it. One body, six
   * faces: the silhouette and the wear are identical in all six and only the
   * pips move, or six dice on a table read as six different objects.
   */
  'die.bone.1': awaited('die.bone.1', 'ui/die-1.png', 256, 256, 'carried'),
  'die.bone.2': awaited('die.bone.2', 'ui/die-2.png', 256, 256, 'carried'),
  'die.bone.3': awaited('die.bone.3', 'ui/die-3.png', 256, 256, 'carried'),
  'die.bone.4': awaited('die.bone.4', 'ui/die-4.png', 256, 256, 'carried'),
  'die.bone.5': awaited('die.bone.5', 'ui/die-5.png', 256, 256, 'carried'),
  'die.bone.6': awaited('die.bone.6', 'ui/die-6.png', 256, 256, 'carried'),
  /** Card 94's other material, painted: cold iron, blank, the glyph drawn on. */
  'die.iron': awaited('die.iron', 'ui/die-iron.png', 256, 256, 'carried'),

  /**
   * art. 107: the hall's candle, and it is the only thing in the room that
   * moves. Three frames sharing one silhouette — the fire moves through the
   * flame rather than the flame changing shape — and the wax and the sconce
   * are painted into `ossuary.hall`, because a patch covers only what changes
   * (art. 127).
   */
  'patch.hall.candle.a': awaited('patch.hall.candle.a', 'patches/hall-candle-a.png', 128, 192, 'ossuary'),
  'patch.hall.candle.b': awaited('patch.hall.candle.b', 'patches/hall-candle-b.png', 128, 192, 'ossuary'),
  'patch.hall.candle.c': awaited('patch.hall.candle.c', 'patches/hall-candle-c.png', 128, 192, 'ossuary'),
}
