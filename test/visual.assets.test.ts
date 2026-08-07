import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

import { PLATES, assetsWanted, horrorPlateFor } from '../src/content/visual/index.js'
import { DRESSED_ROOMS, CANONICAL } from '../src/content/visual/index.js'
import { roomContent } from '../src/content/index.js'
import { ASSET_ROOT, assetCache, faultsIn, merge } from '../src/visual/index.js'

/**
 * art. 121: the manifest is the only place a filename is written down, so it
 * is the one place a filename can be wrong. These read the actual masters off
 * disk, because every fault they catch is a fault nothing else can: a
 * declared size that disagrees with the file lays a plate out wrong for one
 * frame and then jumps, and no type can see it.
 */

/**
 * The width, height and alpha column of a PNG, read for real.
 *
 * Byte-level rather than through an image decoder, because the two facts
 * being checked are byte-level facts and because a decoder is a dependency
 * (see `test/node.d.ts`). Only what `tools/png.mjs` writes has to be
 * readable: 8-bit RGBA, filter 0, one or more IDAT chunks.
 */
function readPng(path: string): { width: number; height: number; alphas: Set<number> } {
  const buf = readFileSync(path)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let at = 8
  let width = 0
  let height = 0
  const parts: Uint8Array[] = []
  while (at < buf.length) {
    const len = view.getUint32(at)
    const type = String.fromCharCode(...buf.subarray(at + 4, at + 8))
    if (type === 'IHDR') {
      width = view.getUint32(at + 8)
      height = view.getUint32(at + 12)
      expect(buf[at + 16], `${path}: not 8-bit`).toBe(8)
      expect(buf[at + 17], `${path}: not RGBA`).toBe(6)
    }
    if (type === 'IDAT') parts.push(buf.subarray(at + 8, at + 8 + len))
    at += len + 12
  }
  const joined = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let wrote = 0
  for (const part of parts) {
    joined.set(part, wrote)
    wrote += part.length
  }
  const raw = inflateSync(joined)
  const alphas = new Set<number>()
  const stride = width * 4 + 1
  for (let y = 0; y < height; y++) {
    // Filter byte 0 (none) is what the encoder writes, so the bytes are
    // readable without running a filter chain.
    expect(raw[y * stride], `${path}: unexpected PNG filter`).toBe(0)
    for (let x = 0; x < width; x++) alphas.add(raw[y * stride + 1 + x * 4 + 3]!)
  }
  return { width, height, alphas }
}

describe('the manifest — art. 121', () => {
  it('validates', () => {
    expect(faultsIn(PLATES)).toEqual([])
  })

  it('keeps every master under the asset root, and names no path anywhere else', () => {
    for (const asset of Object.values(PLATES)) {
      if (asset.kind !== 'plate') continue
      expect(asset.src.startsWith(ASSET_ROOT), asset.id).toBe(true)
      // Relative, so the same build runs at a domain root, in a project
      // subdirectory and off a file:// URL (vite is `base: './'`).
      expect(asset.src.startsWith('/'), `${asset.id} is absolute`).toBe(false)
    }
  })

  it('refuses a manifest whose ids disagree with its keys', () => {
    expect(
      faultsIn({
        wrong: { kind: 'plate', id: 'right', src: `${ASSET_ROOT}a.png`, nativeWidth: 1, nativeHeight: 1, school: 'x' },
      }).length,
    ).toBeGreaterThan(0)
  })

  it('refuses a plate outside the asset root, and one with no school', () => {
    expect(
      faultsIn({
        loose: { kind: 'plate', id: 'loose', src: '/elsewhere/a.png', nativeWidth: 1, nativeHeight: 1, school: 'x' },
      }).length,
    ).toBeGreaterThan(0)
    expect(
      faultsIn({
        keyless: { kind: 'plate', id: 'keyless', src: `${ASSET_ROOT}a.png`, nativeWidth: 1, nativeHeight: 1, school: '' },
      }).length,
    ).toBeGreaterThan(0)
  })

  it('refuses a drawing whose text disagrees with its declared size, or leaves the alphabet', () => {
    expect(
      faultsIn({
        d: { kind: 'drawing', id: 'd', rows: ['123'], nativeWidth: 9, nativeHeight: 1 },
      }).length,
    ).toBeGreaterThan(0)
    expect(
      faultsIn({
        d: { kind: 'drawing', id: 'd', rows: ['1x3'], nativeWidth: 3, nativeHeight: 1 },
      }).length,
    ).toBeGreaterThan(0)
  })

  it('refuses two manifests that declare the same id', () => {
    expect(() => merge(PLATES, PLATES)).toThrow()
  })
})

describe('the masters on disk — arts 17, 121', () => {
  for (const asset of Object.values(PLATES)) {
    if (asset.kind !== 'plate') continue
    it(`${asset.id} is the size it says it is`, () => {
      const png = readPng(`public/${asset.src}`)
      expect(png.width).toBe(asset.nativeWidth)
      expect(png.height).toBe(asset.nativeHeight)
    })

    it(`${asset.id} carries binary alpha only (art. 17)`, () => {
      // The whole reason art. 17 survives this wave unamended: a plate is a
      // cutout, so a pixel's colour never depends on what is behind it. A
      // single value between 0 and 255 would make the room's re-render
      // depend on what it was composited over.
      const png = readPng(`public/${asset.src}`)
      for (const alpha of png.alphas) expect([0, 255]).toContain(alpha)
    })
  }
})

describe('what the game asks for — art. 121 (missing art falls back, but a typo should not)', () => {
  it('has a manifest entry for every plate a dressed room places', () => {
    for (const id of assetsWanted()) {
      expect(PLATES[id], `no manifest entry for ${id}`).toBeDefined()
    }
  })

  it('has a manifest entry for every horror that has been plated', () => {
    const plate = horrorPlateFor(CANONICAL.horror)
    expect(plate).not.toBeNull()
    expect(PLATES[plate!.asset]).toBeDefined()
  })

  it('dresses only rooms that exist', () => {
    for (const room of DRESSED_ROOMS) {
      expect(() => roomContent(room as never)).not.toThrow()
    }
  })
})

describe('the cache — art. 121 (missing optional art has a valid fallback)', () => {
  it('answers null for art that never arrived, and says which', async () => {
    const cache = assetCache(async () => {
      throw new Error('no such plate')
    })
    await cache.load(PLATES)
    // Every plate failed to decode, and nothing threw.
    expect(cache.get('horror.marrow')).toBeNull()
    expect(cache.missing).toContain('horror.marrow')
  })

  it('holds what did decode', async () => {
    const cache = assetCache(async (src) => ({ image: { src }, width: 4, height: 4 }))
    await cache.load(PLATES)
    expect(cache.get('horror.marrow')?.width).toBe(4)
    expect(cache.missing).toEqual([])
  })

  it('holds a drawing without decoding anything', async () => {
    const cache = assetCache(async () => {
      throw new Error('a drawing must never be fetched')
    })
    await cache.load({
      d: { kind: 'drawing', id: 'd', rows: ['12', '34'], nativeWidth: 2, nativeHeight: 2 },
    })
    expect(cache.get('d')?.asset.kind).toBe('drawing')
    // art. 100: its text is the master, so there is nothing to fetch and
    // nothing that can fail to arrive.
    expect(cache.get('d')?.image).toBeNull()
  })
})
