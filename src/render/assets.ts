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
}

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
  warden: asset('warden', 'enemies/warden.png', 357, 568),
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

export function url(a: Asset): string {
  return `${ASSET_ROOT}${a.file}`
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
 * Everything the runtime loads, once each.
 *
 * By file, not by manifest row: a pose family names its opening plate twice —
 * once plainly and once as `far` — and that is one download and one entry in
 * the payload budget, not two.
 */
export function allAssets(): readonly Asset[] {
  const seen = new Set<string>()
  return [
    ...Object.values(ROOM_ART),
    ...Object.values(ENEMY_ART),
    ...Object.values(PROP_ART),
    ...Object.values(HAND_ART),
    TRAY_ART,
  ].filter((a) => !seen.has(a.file) && seen.add(a.file))
}

/**
 * Decode everything before the first frame.
 *
 * Room and enemy art are both mandatory, so a failure here is loud: the boot
 * reports it rather than showing an empty room or an absent opponent.
 */
export async function preload(): Promise<readonly string[]> {
  const failures: string[] = []
  await Promise.all(
    allAssets().map(
      (a) =>
        new Promise<void>((done) => {
          const img = new Image()
          img.onload = () => done()
          img.onerror = () => {
            failures.push(a.id)
            done()
          }
          img.src = url(a)
        }),
    ),
  )
  return failures
}
