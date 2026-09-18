/**
 * The asset manifest.
 *
 * This is the only file that knows a filename. Declared dimensions are what
 * `npm run art` prints; `test/unit/assets.test.ts` holds them to the files on
 * disk, so a manifest that lies fails the build rather than laying out at the
 * wrong size for a frame and then jumping.
 *
 * Enemy art is **required**. There is no fallback body, no procedural mass,
 * and no "plainer fight". An enemy with no asset here fails validation.
 */

export const ASSET_ROOT = 'assets/'

export interface Asset {
  readonly id: string
  readonly file: string
  readonly width: number
  readonly height: number
}

const asset = (id: string, file: string, width: number, height: number): Asset => ({
  id,
  file,
  width,
  height,
})

export const ROOM_ART: Readonly<Record<string, Asset>> = {
  entry: asset('entry', 'rooms/entry.png', 480, 720),
  choir: asset('choir', 'rooms/choir.png', 480, 720),
  hall: asset('hall', 'rooms/hall.png', 480, 720),
  shrine: asset('shrine', 'rooms/shrine.png', 480, 720),
  deep: asset('deep', 'rooms/deep.png', 480, 720),
  gate: asset('gate', 'rooms/gate.png', 480, 720),
  brazier: asset('brazier', 'rooms/brazier.png', 480, 720),
  threshold: asset('threshold', 'rooms/threshold.png', 480, 720),
  sanctuary: asset('sanctuary', 'rooms/sanctuary.png', 480, 720),
  reliquary: asset('reliquary', 'rooms/reliquary.png', 480, 720),
  'chain-vault': asset('chain-vault', 'rooms/chain-vault.png', 480, 720),
  // The Bellworks, delivered as six finished paintings and built like every
  // other backdrop: cover-cropped to the scene, resampled and posterised by
  // `npm run art`. They arrived at master shape and master weight — 1024x1536
  // and 2.3-2.8 MB each — so they live in `docs/art-reference/masters/` and
  // what is served is the quarter-megabyte plate the pipeline makes of them.
  // Not one pixel of the delivery is authored, retouched or recoloured.
  'bellworks-hanging': asset('bellworks-hanging', 'rooms/bellworks-hanging.png', 480, 720),
  'bellworks-rope': asset('bellworks-rope', 'rooms/bellworks-rope.png', 480, 720),
  'bellworks-weight': asset('bellworks-weight', 'rooms/bellworks-weight.png', 480, 720),
  'bellworks-nest': asset('bellworks-nest', 'rooms/bellworks-nest.png', 480, 720),
  'bellworks-service': asset('bellworks-service', 'rooms/bellworks-service.png', 480, 720),
  'bellworks-balcony': asset('bellworks-balcony', 'rooms/bellworks-balcony.png', 480, 720),
}

/**
 * Props: the one object in a room that is pressed rather than looked at.
 *
 * Keyed `<art>.<frame>`, and every frame of a family is a **whole scene
 * plate** at the backdrop's own size rather than a trimmed sprite. That is the
 * point of them: the midground is cover-fitted exactly as the backdrop is, so
 * a family sits where it was painted at every viewport and swapping one frame
 * for another cannot move the object by a pixel. A trimmed plate could not
 * promise that — a die erupting out of a basin changes the silhouette every
 * frame, and the object would walk across the screen as its box changed.
 *
 * The font's basin is the first family: the still bowl, the instant the die
 * comes out of the blood, and one plate per face. `idle` and `emerge` are
 * states; `1`–`6` are results, and the one the run landed on stays on screen
 * for good, because it is painted from `run.ritual` rather than left behind by
 * the sequence that played it.
 */
export const PROP_ART: Readonly<Record<string, Asset>> = {
  'chalice.idle': asset('chalice.idle', 'props/chalice-idle.png', 480, 720),
  'chalice.emerge': asset('chalice.emerge', 'props/chalice-emerge.png', 480, 720),
  'chalice.1': asset('chalice.1', 'props/chalice-1.png', 480, 720),
  'chalice.2': asset('chalice.2', 'props/chalice-2.png', 480, 720),
  'chalice.3': asset('chalice.3', 'props/chalice-3.png', 480, 720),
  'chalice.4': asset('chalice.4', 'props/chalice-4.png', 480, 720),
  'chalice.5': asset('chalice.5', 'props/chalice-5.png', 480, 720),
  'chalice.6': asset('chalice.6', 'props/chalice-6.png', 480, 720),
  // The Reliquary's four objects. **Three of them are one plate each, and that
  // is the delivery rather than an oversight**: a settled altar, a lit candle
  // stand and a shut chest, and nothing else. So a frame for those is the
  // object's *portrait*, not its position — where each of them is standing is
  // carried by `platesFor`'s `look` and drawn by CSS, and the states with no
  // authored plate (`brazier.out`, `chest.open`) are treatments of the plate
  // that is here rather than rows that point at files nobody painted.
  // `## HUMAN ART REQUIRED` in POLISH_PROGRESS.md is what is still owed.
  //
  // **The bell is the one that is a family now.** Its swing was delivered as a
  // sheet of positions, so the four `ring` frames are authored pictures of a
  // bell part-way over rather than a rotation CSS puts on a still one, and
  // `idle` is the bell hanging — before it is rung and after it has settled.
  // They are registered to each other on the bar, so a frame swap turns the
  // bell and moves nothing else.
  //
  // There is no `lever` family and no `lever.*` row, because no lever was
  // painted. The room's PULL sits on the altar, which is where the mechanism
  // it works has always been.
  'altar.still': asset('altar.still', 'props/reliquary-altar-still.png', 480, 720),
  'bell.idle': asset('bell.idle', 'props/reliquary-bell-idle.png', 480, 720),
  'bell.ring-1': asset('bell.ring-1', 'props/reliquary-bell-ring-1.png', 480, 720),
  'bell.ring-2': asset('bell.ring-2', 'props/reliquary-bell-ring-2.png', 480, 720),
  'bell.ring-3': asset('bell.ring-3', 'props/reliquary-bell-ring-3.png', 480, 720),
  'bell.ring-4': asset('bell.ring-4', 'props/reliquary-bell-ring-4.png', 480, 720),
  'brazier.lit': asset('brazier.lit', 'props/reliquary-brazier-lit.png', 480, 720),
  'chest.closed': asset('chest.closed', 'props/reliquary-chest-closed.png', 480, 720),
  // The Chain Vault's objects go here when they land, keyed the same way:
  // `cage.lowering-1`, `gate.open` and the rest. None of them has been painted,
  // so `propArt` answers nothing for that room and it runs with an empty
  // midground. Every verb is still a button on the object and every outcome is
  // still in the word band, which is the degradation `ART_DIRECTION.md` allows
  // for scenery.
}

/**
 * Ambient overlay frames, keyed `<room template>.<family>.<n>`.
 *
 * Whole scene plates like every other overlay in the game, and numbered from
 * one. Empty for the same reason `PROP_ART` is: none of them has been painted.
 *
 * **What a room does while nobody is pressing anything is a treatment now**, not
 * a family of plates — see `render/ambience.ts` and `docs/ART_DIRECTION.md`
 * § *Quiet motion*. This table and the pipeline behind it stay armed for the
 * day the painted mote and ember plates land, and `roomAssets` still fetches
 * whatever is in it; what was deleted is the loop driver that resolved nothing.
 */
export const AMBIENT_ART: Readonly<Record<string, Asset>> = {}

/**
 * Enemy sprites, keyed `<art>` or `<art>.<pose>`.
 *
 * A thing that closes carries one plate per reach plus one for the instant it
 * is struck. Its plain key is the pose it stands in outside a fight, which is
 * the same plate as `far` — content asserts that the two agree, so a room you
 * walk into and a fight you open cannot show it in two different places.
 */
export const ENEMY_ART: Readonly<Record<string, Asset>> = {
  gnawing: asset('gnawing', 'enemies/crawling-far.png', 240, 179),
  'gnawing.far': asset('gnawing.far', 'enemies/crawling-far.png', 240, 179),
  'gnawing.mid': asset('gnawing.mid', 'enemies/crawling-mid.png', 436, 562),
  'gnawing.close': asset('gnawing.close', 'enemies/crawling-close.png', 480, 708),
  'gnawing.hit': asset('gnawing.hit', 'enemies/crawling-hit.png', 480, 708),
  marrow: asset('marrow', 'enemies/marrow.png', 348, 679),
  // The Warden: ten authored plates, every one of them a **whole scene** at the
  // backdrop's own size rather than a trimmed sprite. Same size, same box, same
  // registration, so a pose swap changes the drawing and moves nothing — which
  // is the only way ten silhouettes this different can be one standing figure.
  // `SCENE` below is what says so, and `isScenePlate` is how the renderer asks.
  //
  // The plain key is the plate it stands in before the fight opens, and the
  // full-health idle is that plate — so walking into the gate and opening the
  // fight cannot show it two ways.
  warden: asset('warden', 'enemies/warden-idle-full-1.png', 480, 720),
  'warden.idle.full.1': asset('warden.idle.full.1', 'enemies/warden-idle-full-1.png', 480, 720),
  'warden.idle.full.2': asset('warden.idle.full.2', 'enemies/warden-idle-full-2.png', 480, 720),
  'warden.idle.mid.1': asset('warden.idle.mid.1', 'enemies/warden-idle-mid-1.png', 480, 720),
  'warden.idle.mid.2': asset('warden.idle.mid.2', 'enemies/warden-idle-mid-2.png', 480, 720),
  'warden.idle.low.1': asset('warden.idle.low.1', 'enemies/warden-idle-low-1.png', 480, 720),
  'warden.idle.low.2': asset('warden.idle.low.2', 'enemies/warden-idle-low-2.png', 480, 720),
  'warden.attack': asset('warden.attack', 'enemies/warden-attack.png', 480, 720),
  'warden.defense': asset('warden.defense', 'enemies/warden-defense.png', 480, 720),
  'warden.defeat.1': asset('warden.defeat.1', 'enemies/warden-defeat-1.png', 480, 720),
  'warden.defeat.2': asset('warden.defeat.2', 'enemies/warden-defeat-2.png', 480, 720),
}

/**
 * The one scene size, which every whole-frame plate in the game is built at.
 *
 * Backdrops, props, ambience, the player's arm and the Warden's ten plates are
 * all this box, because all of them are cover-fitted by the same four CSS
 * lines. It is declared once here so the renderer can *ask* whether a plate is
 * a whole scene rather than being told, in content, twice.
 */
export const SCENE = { width: 480, height: 720 } as const

/**
 * Whether a plate is the whole scene rather than a trimmed silhouette.
 *
 * The distinction the compositor needs, and the only honest place to take it
 * from is the art itself. A trimmed sprite is registered *by* its silhouette —
 * it has to be given a width and a foot, because its box says nothing about
 * where the thing stands. A scene plate is registered by the frame, so it wants
 * no coordinate at all: it is cover-fitted exactly as the backdrop is, and the
 * subject lands where it was painted at every viewport.
 *
 * Deriving it from the dimensions rather than declaring it in content means the
 * two can never disagree. A plate built at the scene size *is* a scene plate,
 * and there is no way to ship one and stage it as though it were not.
 */
export function isScenePlate(a: Asset): boolean {
  return a.width === SCENE.width && a.height === SCENE.height
}

/**
 * The player's own arm, on the foreground layer.
 *
 * Two poses and nothing between them. They are whole scene frames rather than
 * trimmed sprites, and the foreground is `object-fit: cover` exactly as the
 * backdrop is — so the arm lands in the corridor identically at every viewport
 * with no number to measure and none to drift.
 */
export const HAND_ART: Readonly<Record<string, Asset>> = {
  rest: asset('hand.rest', 'hands/rest.png', 480, 720),
  thrust: asset('hand.thrust', 'hands/thrust.png', 480, 720),
}

export const TRAY_ART: Asset = asset('tray', 'ui/tray.png', 730, 364)

/**
 * The bones, the satchel, and the breakage — when they are painted.
 *
 * Both tables are **deliberately empty**. Every row here would name a file, and
 * `test/unit/assets.test.ts` holds a row to a real file of the declared size,
 * so a manifest that promises art nobody has drawn fails the build rather than
 * shipping a broken `<img>` into the middle of a smash.
 *
 * What is owed is written down instead, in full, under `## HUMAN ART REQUIRED`
 * in `POLISH_PROGRESS.md`: a bone body with faces 1–6 and a held state, and a
 * Vial plate.
 *
 * Until then the bones are drawn from the pip geometry in `ui/components.ts` —
 * which is the same mechanism the game has always drawn a face with, not a new
 * stand-in — and every one of them states its number as data as well as as a
 * pattern. Adding a row here and a file on disk is the whole of the swap;
 * nothing outside this file names a bone's filename.
 */
export const BONE_ART: Readonly<Record<string, Asset>> = {}

export const SATCHEL_ART: Readonly<Record<string, Asset>> = {}

/** One face of one bone, or nothing because it was never painted. */
export function boneArt(face: string): Asset | undefined {
  return BONE_ART[face]
}

/** One satchel icon, or nothing because it was never painted. */
export function satchelArt(id: string): Asset | undefined {
  return SATCHEL_ART[id]
}

export function url(a: Asset): string {
  return `${ASSET_ROOT}${a.file}`
}

/**
 * The way a blocked passage is drawn, and the hall's two shut states.
 *
 * **Two manifests rather than one, because they are two different kinds of
 * picture.** A barrier is a seated overlay — one plate stretched over whichever
 * painted opening it is filling, the way a prop is seated — and there are two
 * of them for the two reasons a way can be shut: fallen in, or gated. The hall
 * is the exception that proves it: its north arch is most of its painting, so
 * a plate laid over it would be a patch on a wall, and what the delivery gave
 * instead is **the whole room repainted** with the arch collapsed and with it
 * gated. So the hall swaps its backdrop and every other room takes an overlay.
 *
 * `guarded` — a live thing in the room holding the way — draws the gate, not
 * the rubble: the passage is there and something is standing in it.
 */
export const PASSAGE_ART: Readonly<Record<'rubble' | 'locked', Asset>> = {
  rubble: asset('passage.rubble', 'passages/rubble.png', 240, 360),
  locked: asset('passage.locked', 'passages/locked.png', 240, 360),
}

export const HALL_ART: Readonly<Record<'sealed' | 'locked', Asset>> = {
  sealed: asset('hall.sealed', 'rooms/hall-collapsed.png', 480, 720),
  locked: asset('hall.locked', 'rooms/hall-locked.png', 480, 720),
}

export function roomArt(id: string): Asset {
  const found = ROOM_ART[id]
  if (!found) throw new Error(`no backdrop for room art "${id}"`)
  return found
}

/**
 * The sprite for an enemy, at a reach if one has been painted for it.
 *
 * A thing that closes wants a painting per reach — `gnawing.far`, `.mid`,
 * `.close` — because the composition at arm's length is not the composition at
 * the end of the hall scaled up. Until those exist the one sprite is staged at
 * each reach by the compositor, which is a stand-in and reads as one: the
 * brief is recorded under `## HUMAN ART REQUIRED` in `POLISH_PROGRESS.md`.
 *
 * Adding `gnawing.close` to the manifest is the whole of the swap. Nothing
 * else in the codebase names a reach's file.
 */
export function enemyArt(id: string, reach?: string): Asset {
  const found = enemyPose(id, reach) ?? ENEMY_ART[id]
  if (!found) throw new Error(`no combat art for enemy "${id}"`)
  return found
}

/**
 * One named plate of an enemy, or nothing because it was never painted.
 *
 * Separate from `enemyArt` because the two questions differ: *what do I draw*
 * always has an answer and falls back to the plain sprite, while *is there a
 * plate for this* must be able to say no — the impact frame is shown only when
 * one exists for the pose the thing is actually standing in.
 */
export function enemyPose(id: string, pose: string | undefined): Asset | undefined {
  return pose ? ENEMY_ART[`${id}.${pose}`] : undefined
}

/**
 * One frame of a room's prop, or nothing because it was never painted.
 *
 * It must be able to say no. A room whose focal object has no plate is still a
 * playable room — the verb is a button in the world, the outcome is in the
 * word band and the health orb — and it degrades to exactly that rather than
 * to a broken image. `ART_DIRECTION.md`'s rule applies: scenery may degrade,
 * the opponent may not, and a font is scenery you can press.
 */
export function propArt(id: string, frame: string): Asset | undefined {
  return PROP_ART[`${id}.${frame}`]
}

export function handArt(pose: string): Asset {
  const found = HAND_ART[pose]
  if (!found) throw new Error(`no hand art for pose "${pose}"`)
  return found
}

/**
 * Every distinct file the game ships, once each.
 *
 * By file, not by manifest row: a pose family names its opening plate twice —
 * once plainly and once as `far` — and that is one file on disk, not two.
 *
 * **This is a validation and reporting list, not a preload list.** It used to
 * be the thing the boot decoded, and it was the boot's cost. Loading is now
 * staged — see `render/loader.ts` — and what this is for is `npm run art`
 * printing the payload and `test/unit/assets.test.ts` holding every row to a
 * real file of the declared size.
 *
 * The total bytes are **measured and reported, never capped**. A global
 * ceiling makes authored pose coverage compete with itself, and coverage is
 * the feature. See `docs/ART_DIRECTION.md`.
 */
export function allAssets(): readonly Asset[] {
  const seen = new Set<string>()
  return [
    ...Object.values(ROOM_ART),
    ...Object.values(PASSAGE_ART),
    ...Object.values(HALL_ART),
    ...Object.values(ENEMY_ART),
    ...Object.values(PROP_ART),
    ...Object.values(AMBIENT_ART),
    ...Object.values(HAND_ART),
    ...Object.values(BONE_ART),
    ...Object.values(SATCHEL_ART),
    TRAY_ART,
  ].filter((a) => !seen.has(a.file) && seen.add(a.file))
}
