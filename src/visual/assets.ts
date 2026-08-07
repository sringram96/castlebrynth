/**
 * Assets are data — art. 126.
 *
 * Two species of authored thing, and the difference between them is the
 * whole of the amendment:
 *
 * A **drawing** is art. 100 unchanged: a small grid of indices into the
 * *room's* ramp, authored as text on the alphabet in `src/room/drawn.ts`. It
 * has no colours of its own, so one drawing appears in the drowned and the
 * burnt as one object in two keys. Everything already in `src/content/plates`
 * is one of these and none of it moves.
 *
 * A **plate** is art. 126's new thing: a raster master with its own palette,
 * authored for one school and painted as it was drawn. It is what buys the
 * density of `reference/visual/canonical-screen.png`, which no ramp-indexed
 * grid was ever going to reach — the reference hoards its detail at eyes and
 * hands and teeth, and that detail is *colour* information as much as shape.
 *
 * The price of a plate is that it belongs to the school it was drawn for, so
 * `school` is not optional decoration: a plate with no school is a plate that
 * will eventually be painted into a room it clashes with. The manifest
 * validator holds it to that.
 *
 * **Binary alpha, always** (art. 17 as amended). A plate's pixels are opaque
 * or absent, never in between, so a pixel's colour still never depends on
 * what happens to be behind it. That is the whole reason art. 17 survives
 * this wave intact rather than being loosened into a tolerance, and
 * `tools/plate.ts` refuses to write a master that breaks it.
 *
 * Nothing below knows a filename. Gameplay names an asset by id; the
 * manifest is the only place a path is written down.
 */

/**
 * Where every raster master lives, **relative to the page**. Vite is
 * configured `base: './'` — the URL is the whole install, and the same build
 * has to run at a domain root, in a project subdirectory and off a `file://`
 * URL — so a leading slash here would be a plate that loads on one of those
 * three and 404s on the other two. The base is joined on at decode time and
 * nowhere else.
 */
export const ASSET_ROOT = 'assets/visual/'

/** A raster master, authored for one school and painted as drawn (art. 126). */
export interface Plate {
  readonly kind: 'plate'
  readonly id: string
  /** Under `ASSET_ROOT`. The one place a filename is written down. */
  readonly src: string
  readonly nativeWidth: number
  readonly nativeHeight: number
  /**
   * art. 126: which school it was drawn in. A plate is in one key, so the
   * room it stands in has to be in that key too.
   */
  readonly school: string
}

/** A ramp-indexed drawing — art. 100, unchanged, named as an asset. */
export interface Drawing {
  readonly kind: 'drawing'
  readonly id: string
  /** The alphabet is `src/room/drawn.ts`'s: digits, `.`, ` `, `*`, `+`. */
  readonly rows: readonly string[]
  readonly nativeWidth: number
  readonly nativeHeight: number
}

export type PixelAsset = Plate | Drawing

/** A manifest is assets by id. One id, one asset, one place it is declared. */
export type AssetManifest = Readonly<Record<string, PixelAsset>>

/**
 * What is wrong with a manifest, in the words a test prints. Empty is a
 * manifest that validates.
 */
export function faultsIn(manifest: AssetManifest): readonly string[] {
  const faults: string[] = []
  const seen = new Set<string>()
  for (const [key, asset] of Object.entries(manifest)) {
    if (asset.id !== key) faults.push(`${key}: declared under a different id (${asset.id})`)
    if (seen.has(asset.id)) faults.push(`${asset.id}: declared twice`)
    seen.add(asset.id)
    if (asset.nativeWidth <= 0 || asset.nativeHeight <= 0) {
      faults.push(`${asset.id}: has no size`)
    }
    if (asset.kind === 'plate') {
      if (!asset.src.startsWith(ASSET_ROOT)) {
        faults.push(`${asset.id}: src is outside ${ASSET_ROOT}`)
      }
      // art. 126: a plate is in one key, and a key it does not name is a key
      // nothing can check it against.
      if (asset.school.length === 0) faults.push(`${asset.id}: names no school`)
      continue
    }
    // A drawing's declared size is what the compositor lays out against, so a
    // drawing whose text disagrees with it is a drawing that will be placed
    // at the wrong size and look like a bug in the projection.
    const height = asset.rows.length
    const width = asset.rows.reduce((most, row) => Math.max(most, row.length), 0)
    if (height !== asset.nativeHeight || width !== asset.nativeWidth) {
      faults.push(
        `${asset.id}: declared ${asset.nativeWidth}×${asset.nativeHeight}, drawn ${width}×${height}`,
      )
    }
    const bad = asset.rows.join('').match(/[^0-9.*+ ]/g)
    if (bad !== null) faults.push(`${asset.id}: not in the alphabet: ${[...new Set(bad)].join('')}`)
  }
  return faults
}

/** Two manifests, joined. Throws on a collision rather than picking a winner. */
export function merge(...manifests: readonly AssetManifest[]): AssetManifest {
  const out: Record<string, PixelAsset> = {}
  for (const manifest of manifests) {
    for (const [id, asset] of Object.entries(manifest)) {
      if (out[id] !== undefined) throw new Error(`two assets declared as ${id}`)
      out[id] = asset
    }
  }
  return out
}

// ── The cache ──────────────────────────────────────────────────────────

/**
 * A raster master, decoded and held. `image` is whatever the host draws
 * with — an `HTMLImageElement` in the browser, a stub in a test — so this
 * module never mentions the DOM and the compositor stays testable in node.
 */
export interface Ready {
  readonly asset: PixelAsset
  readonly image: unknown
  readonly width: number
  readonly height: number
}

/** How a host turns a `src` into something it can draw. */
export type Decoder = (src: string) => Promise<{ image: unknown; width: number; height: number }>

/**
 * The preloaded cache. Nothing is fetched during a paint and nothing is
 * allocated per frame: a plate is decoded once, at the load, and after that
 * the compositor only ever asks whether it is here.
 *
 * **Missing art is not an error.** `get` answers null and the compositor
 * leaves the band empty, so a scene whose hero has not been drawn yet
 * renders as the computed room it was always going to be. That is the
 * fallback art. 126 requires, and it is why art. 26's first tier is a floor
 * rather than a failure.
 */
export interface AssetCache {
  get(id: string): Ready | null
  /** Which ids were asked for and did not arrive. For the dev harness. */
  readonly missing: readonly string[]
}

export interface LoadedCache extends AssetCache {
  load(manifest: AssetManifest): Promise<void>
}

export function assetCache(decode: Decoder): LoadedCache {
  const held = new Map<string, Ready>()
  const missing = new Set<string>()
  return {
    get missing(): readonly string[] {
      return [...missing].sort()
    },
    get(id: string): Ready | null {
      const found = held.get(id)
      if (found !== undefined) return found
      missing.add(id)
      return null
    },
    async load(manifest: AssetManifest): Promise<void> {
      await Promise.all(
        Object.values(manifest).map(async (asset) => {
          // A drawing has nothing to decode: its text *is* the master, and
          // `standing()` already knows how to paint one. It is held so that
          // one lookup answers for both species.
          if (asset.kind === 'drawing') {
            held.set(asset.id, {
              asset,
              image: null,
              width: asset.nativeWidth,
              height: asset.nativeHeight,
            })
            return
          }
          try {
            const decoded = await decode(asset.src)
            held.set(asset.id, { asset, ...decoded })
          } catch {
            // art. 126: missing optional art falls back, it does not throw.
            // A plate that will not decode is a plate that is not there, and
            // the room stands without it.
            missing.add(asset.id)
          }
        }),
      )
    },
  }
}

/**
 * The browser's decoder. The only function in `src/visual` that knows an
 * `Image`, and the only one that knows where the page is installed.
 */
export function imageDecoder(base = './'): Decoder {
  return async (src) =>
    await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = (): void =>
        resolve({ image: img, width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = (): void => reject(new Error(`no plate at ${src}`))
      img.src = `${base.endsWith('/') ? base : `${base}/`}${src}`
    })
}
