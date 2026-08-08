/**
 * Content validation.
 *
 * Enemy art is a build-time requirement, not a runtime fallback. This is the
 * test that makes "you cannot see the bad guy" impossible to ship again: the
 * old build declared a plated horror and shipped no image for it, and nothing
 * anywhere failed.
 */

import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { ENEMY_ART, ROOM_ART, TRAY_ART, allAssets, enemyArt, roomArt } from '../../src/render/assets.js'
import { ENEMIES } from '../../src/content/enemies.js'
import { ROOMS } from '../../src/content/rooms.js'

const PUBLIC = new URL('../../public/assets/', import.meta.url)

function png(file: string): { width: number; height: number; bytes: number } {
  const path = new URL(file, PUBLIC)
  const head = readFileSync(path).subarray(0, 33)
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength)
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    bytes: statSync(path).size,
  }
}

describe('the manifest', () => {
  it('points at files that exist and declares their true size', () => {
    for (const asset of allAssets()) {
      const real = png(asset.file)
      expect({ id: asset.id, w: real.width, h: real.height }).toEqual({
        id: asset.id,
        w: asset.width,
        h: asset.height,
      })
    }
  })

  it('keeps the runtime art payload inside its budget', () => {
    const total = allAssets().reduce((sum, a) => sum + png(a.file).bytes, 0)
    expect(total).toBeLessThan(4 * 1024 * 1024)
  })
})

describe('every enemy has combat art', () => {
  it('has a manifest entry and a file for each enemy in the roster', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(() => enemyArt(e.art)).not.toThrow()
      expect(png(enemyArt(e.art).file).bytes).toBeGreaterThan(0)
    }
  })

  it('has no enemy art nothing uses, and no enemy using art nothing has', () => {
    const used = new Set(Object.values(ENEMIES).map((e) => e.art))
    expect([...Object.keys(ENEMY_ART)].sort()).toEqual([...used].sort())
  })

  it('gives every enemy a silhouette large enough to dominate the scene', () => {
    // The blueprint's floor is that the opponent is unmissable before the first
    // roll. Width is a fraction of the world box; the sprite's own aspect does
    // the rest, and the browser suite checks the rendered result.
    for (const e of Object.values(ENEMIES)) {
      expect(e.width).toBeGreaterThanOrEqual(0.35)
      expect(e.width).toBeLessThanOrEqual(1)
      expect(e.foot).toBeGreaterThan(0.5)
    }
  })
})

describe('every room has a backdrop', () => {
  it('has a manifest entry and a file for each room', () => {
    for (const r of Object.values(ROOMS)) {
      expect(() => roomArt(r.art)).not.toThrow()
      expect(png(roomArt(r.art).file).bytes).toBeGreaterThan(0)
    }
  })

  it('gives every room its own backdrop, so no two rooms are one place', () => {
    const arts = Object.values(ROOMS).map((r) => r.art)
    expect(new Set(arts).size).toBe(arts.length)
  })

  it('ships every backdrop at the one scene size', () => {
    for (const asset of Object.values(ROOM_ART)) {
      expect([asset.width, asset.height]).toEqual([480, 720])
    }
  })

  it('ships the tray frame', () => {
    expect(png(TRAY_ART.file).bytes).toBeGreaterThan(0)
  })
})
