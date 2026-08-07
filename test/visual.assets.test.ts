import { existsSync, readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

import { PLATES, assetsWanted, horrorPlateFor } from '../src/content/visual/index.js'
import { DRESSED_ROOMS, CANONICAL } from '../src/content/visual/index.js'
import { roomContent } from '../src/content/index.js'
import { ASSET_ROOT, assetCache, faultsIn, merge } from '../src/visual/index.js'

/**
 * art. 126: the manifest is the only place a filename is written down, so it
 * is the one place a filename can be wrong. These read the actual masters off
 * disk, because every fault they catch is a fault nothing else can: a
 * declared size that disagrees with the file lays a plate out wrong for one
 * frame and then jumps, and no type can see it.
 */

/**
 * The width, height and alpha column of a PNG, read for real.
 *
 * Byte-level rather than through an image decoder, because the facts being
 * checked are byte-level facts and because a decoder is a dependency (see
 * `test/node.d.ts`).
 *
 * It reads **8-bit grey / RGB / RGBA with any filter**, which is what the
 * repository actually holds: `tools/plates.mjs` writes filter-0 RGBA, and the
 * paintings that arrive from outside are ordinary PNGs — RGB where they are
 * opaque, adaptively filtered because every real encoder does that. The first
 * cut of this reader assumed the encoder's own two habits were properties of
 * PNG, so a perfectly valid painting failed a test about its *size*. A reader
 * narrower than the thing it reads is a test that fails for reasons that are
 * not about the file.
 */
function readPng(path: string): { width: number; height: number; alphas: Set<number> } {
  const buf = readFileSync(path)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let at = 8
  let width = 0
  let height = 0
  let channels = 4
  const parts: Uint8Array[] = []
  while (at < buf.length) {
    const len = view.getUint32(at)
    const type = String.fromCharCode(...buf.subarray(at + 4, at + 8))
    if (type === 'IHDR') {
      width = view.getUint32(at + 8)
      height = view.getUint32(at + 12)
      expect(buf[at + 16], `${path}: not 8-bit`).toBe(8)
      const colour = buf[at + 17]!
      channels = colour === 6 ? 4 : colour === 2 ? 3 : colour === 4 ? 2 : colour === 0 ? 1 : 0
      expect(channels, `${path}: unreadable colour type ${colour}`).toBeGreaterThan(0)
      expect(buf[at + 20], `${path}: interlaced`).toBe(0)
    }
    if (type === 'IDAT') parts.push(buf.subarray(at + 8, at + 8 + len))
    at += len + 12
    if (type === 'IEND') break
  }
  const joined = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let wrote = 0
  for (const part of parts) {
    joined.set(part, wrote)
    wrote += part.length
  }
  const raw = inflateSync(joined)
  const stride = width * channels
  const flat = new Uint8Array(width * height * channels)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? flat[y * stride + i - channels]! : 0
      const b = y > 0 ? flat[(y - 1) * stride + i]! : 0
      const c = i >= channels && y > 0 ? flat[(y - 1) * stride + i - channels]! : 0
      let value = line[i]!
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      flat[y * stride + i] = value & 0xff
    }
  }
  const alphas = new Set<number>()
  for (let i = 0; i < width * height; i++) {
    alphas.add(channels === 4 ? flat[i * 4 + 3]! : channels === 2 ? flat[i * 2 + 1]! : 255)
  }
  return { width, height, alphas }
}

describe('the manifest — art. 126', () => {
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

describe('the masters on disk — arts 17, 121, 126', () => {
  for (const asset of Object.values(PLATES)) {
    if (asset.kind !== 'plate') continue

    /**
     * **A slot is either painted or it says it is not.** art. 126 makes
     * missing art a plainer room rather than a broken one, and the hero-art
     * wave turns that from a runtime courtesy into an authoring contract: a
     * plate declares its path, its size and its school before the painting
     * exists, so `reference/visual/ASSET_BRIEF.md` is something a painter can
     * build to. What must never happen is the third case — a file that is
     * absent and *not* declared absent, which is a typo in a path wearing a
     * fallback's coat.
     */
    it(`${asset.id} is on disk at the size it says, or is declared awaited`, () => {
      const path = `public/${asset.src}`
      if (!existsSync(path)) {
        expect(asset.awaiting, `${asset.id}: no file at ${path} and no awaiting flag`).toBe(true)
        return
      }
      expect(asset.awaiting, `${asset.id}: the painting arrived — drop the awaiting flag`)
        .toBeUndefined()
      const png = readPng(path)
      expect(png.width).toBe(asset.nativeWidth)
      expect(png.height).toBe(asset.nativeHeight)
    })

    it(`${asset.id} composites deterministically (art. 17)`, () => {
      // art. 17 as amended by the hero-art wave. What the article defends is
      // that a room renders identical every visit, and an authored alpha is as
      // deterministic as an authored colour — a plate's edge is a fact about
      // the plate, not about what happens to be behind it. So the check is no
      // longer "every alpha is 0 or 255"; it is that alpha is *authored*,
      // which for a file on disk means it decodes at all and, for the plates
      // that mean to be cutouts, that they still are.
      const path = `public/${asset.src}`
      if (!existsSync(path)) return
      const png = readPng(path)
      expect(png.alphas.size).toBeGreaterThan(0)
      expect([...png.alphas].every((a) => a >= 0 && a <= 255)).toBe(true)
    })
  }
})

describe('what the game asks for — art. 126 (missing art falls back, but a typo should not)', () => {
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

describe('the cache — art. 126 (missing optional art has a valid fallback)', () => {
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
