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
  ossuary: asset('ossuary', 'rooms/ossuary.png', 480, 720),
  shrine: asset('shrine', 'rooms/shrine.png', 480, 720),
  deep: asset('deep', 'rooms/deep.png', 480, 720),
  gate: asset('gate', 'rooms/gate.png', 480, 720),
  brazier: asset('brazier', 'rooms/brazier.png', 480, 720),
  threshold: asset('threshold', 'rooms/threshold.png', 480, 720),
}

export const ENEMY_ART: Readonly<Record<string, Asset>> = {
  gnawing: asset('gnawing', 'enemies/gnawing.png', 242, 253),
  marrow: asset('marrow', 'enemies/marrow.png', 348, 679),
  warden: asset('warden', 'enemies/warden.png', 357, 568),
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

export function enemyArt(id: string): Asset {
  const found = ENEMY_ART[id]
  if (!found) throw new Error(`no combat art for enemy "${id}"`)
  return found
}

export function allAssets(): readonly Asset[] {
  return [...Object.values(ROOM_ART), ...Object.values(ENEMY_ART), TRAY_ART]
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
