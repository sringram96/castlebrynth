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

import {
  ENEMY_ART,
  HAND_ART,
  PROP_ART,
  ROOM_ART,
  TRAY_ART,
  allAssets,
  enemyArt,
  handArt,
  propArt,
  roomArt,
} from '../../src/render/assets.js'
import { ENEMIES, REACHES } from '../../src/content/enemies.js'
import { ROOMS, room } from '../../src/content/rooms.js'

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

  /**
   * The payload ceiling.
   *
   * Raised once, from 4 MB to 4.5 MB, when the Reliquary and the Chain Vault
   * were added. The measured numbers, so the decision is auditable rather than
   * a number somebody nudged:
   *
   *   before  3.748 MB   nine rooms
   *   after   4.248 MB   eleven rooms — the two backdrops cost 512 KB
   *
   * It was not spent on new *kinds* of asset. A backdrop in this game costs
   * ~250 KB and always has; nine of them were 2.2 MB before either of these
   * rooms existed, so growing an eight-room slice by two rooms costs a quarter
   * more backdrop and there is no version of that which fits under 4 MB.
   *
   * Compression was tried first, as `ART_DIRECTION.md` requires. Posterising
   * the two new plates harder saves real bytes — 32 steps 512 KB, 16 steps
   * 328 KB, 12 steps 272 KB — and every one of those still misses 4 MB while
   * banding two of the darkest, most gradient-heavy images in the game and
   * making them the only rooms in the slice not built at 32. Buying 122 KB with
   * a visible seam in the art direction is the wrong trade in a game whose
   * systems are in service of the art.
   *
   * The headroom left is deliberately less than one backdrop: another room
   * cannot be added without this conversation happening again.
   */
  it('keeps the runtime art payload inside its budget', () => {
    const total = allAssets().reduce((sum, a) => sum + png(a.file).bytes, 0)
    expect(total).toBeLessThan(4.5 * 1024 * 1024)
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
    // A thing that closes carries one file per reach, keyed `<art>.<reach>`.
    // They belong to the enemy whose art they are named for, so the roster is
    // compared on the base id and a pose family cannot go unnoticed.
    const used = new Set(Object.values(ENEMIES).map((e) => e.art))
    const held = new Set(Object.keys(ENEMY_ART).map((key) => key.split('.')[0]!))
    expect([...held].sort()).toEqual([...used].sort())
  })

  it('gives a thing that closes a file for every reach, or none at all', () => {
    // Half a pose family is the failure this catches: a `close` plate that
    // landed while `mid` did not silently falls back to the plain sprite, and
    // the encounter reads as the thing changing shape as it comes.
    for (const e of Object.values(ENEMIES)) {
      if (!e.approach) continue
      const posed = REACHES.filter((reach) => ENEMY_ART[`${e.art}.${reach}`])
      expect(
        posed.length === 0 || posed.length === REACHES.length,
        `${e.id} has plates for ${posed.join(', ')} and not the rest`,
      ).toBe(true)
      for (const key of posed) expect(png(enemyArt(e.art, key).file).bytes).toBeGreaterThan(0)
    }
  })

  it('gives the impact plate the box of a pose it can actually stand in', () => {
    // The bright frame is a source swap and changes no placement, so it is
    // only ever shown where its dimensions match the plate it replaces. A
    // `hit` that matches nothing is a plate that would never appear.
    for (const e of Object.values(ENEMIES)) {
      const lit = ENEMY_ART[`${e.art}.hit`]
      if (!lit) continue
      const fits = REACHES.filter((reach) => {
        const at = ENEMY_ART[`${e.art}.${reach}`]
        return at && at.width === lit.width && at.height === lit.height
      })
      expect(fits.length, `${e.id}'s impact plate fits no reach`).toBeGreaterThan(0)
    }
  })
})

describe('the player is holding something', () => {
  it('ships both arm poses, at the scene size the foreground covers with', () => {
    // Whole scene frames, not trimmed sprites: the foreground is cover-fitted
    // exactly as the backdrop is, which is what puts the arm in the corridor
    // at every viewport without a coordinate anywhere.
    for (const pose of ['rest', 'thrust']) {
      const art = handArt(pose)
      expect(png(art.file).bytes).toBeGreaterThan(0)
      expect([art.width, art.height]).toEqual([480, 720])
    }
  })

  it('gives an enemy that closes an arm to close on it with', () => {
    // The strike is the other half of the approach: the thing comes at you and
    // you put something in it. An encounter with one and not the other is half
    // an encounter.
    const closing = Object.values(ENEMIES).filter((e) => e.approach)
    expect(closing.length).toBeGreaterThan(0)
    expect(Object.keys(HAND_ART).sort()).toEqual(['rest', 'thrust'])
  })

  it('gives every enemy a silhouette large enough to dominate the scene', () => {
    // The blueprint's floor is that the opponent is unmissable before the first
    // roll. Width is a fraction of the world box; the sprite's own aspect does
    // the rest, and the browser suite checks the rendered result.
    //
    // A thing that closes is measured at the reach it ends on. At `far` it is
    // *supposed* to look like it is a long way off — that is the encounter —
    // but it still has to be a legible shape rather than a speck, so its
    // opening stance carries a floor of its own.
    for (const e of Object.values(ENEMIES)) {
      const widest = e.approach ? e.approach.stances.close.width : e.width
      expect(widest, `${e.id} never dominates`).toBeGreaterThanOrEqual(0.35)
      expect(e.width, `${e.id} opens invisibly`).toBeGreaterThanOrEqual(e.approach ? 0.3 : 0.35)
      // Only a thing on top of you may be wider than the frame it is in.
      expect(e.width).toBeLessThanOrEqual(1)
      expect(e.foot).toBeGreaterThan(0.5)
    }
  })

  it('never shrinks or stalls on the way in', () => {
    // Every step has to be big enough that nobody wonders whether it moved.
    for (const e of Object.values(ENEMIES)) {
      if (!e.approach) continue
      const { far, mid, close } = e.approach.stances
      expect(mid.width, `${e.id} barely moves to mid`).toBeGreaterThan(far.width * 1.5)
      expect(close.width, `${e.id} barely moves to close`).toBeGreaterThan(mid.width * 1.5)
      expect(mid.foot).toBeGreaterThan(far.foot)
      expect(close.foot).toBeGreaterThanOrEqual(mid.foot)
      // Its still pose is where the fight opens, so walking in and starting a
      // fight cannot make it jump.
      expect({ width: e.width, foot: e.foot }).toEqual(far)
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

  it('gives the chapel a backdrop of its own', () => {
    // The room the font stands in. It is currently a stand-in composed from
    // the ossuary plates — see `## HUMAN ART REQUIRED` — and what has to be
    // true of it is what has to be true of every room: it exists, it is the
    // scene size, and it is not another room's picture.
    const art = roomArt(room('sanctuary').art)
    expect(png(art.file).bytes).toBeGreaterThan(0)
    expect([art.width, art.height]).toEqual([480, 720])
  })
})

/**
 * The room's focal object.
 *
 * Props are optional in a way an enemy is not: a room whose basin has not been
 * painted is still a playable room, because the verb is a button and the
 * outcome is in the word band and the health orb. What is *not* optional is
 * that a family which exists is whole and registered — half a family would
 * make the die vanish on the faces that are missing, and a family whose frames
 * disagreed about their box would move the basin as the die tumbled.
 */
describe('a room prop is whole, registered, and does not move', () => {
  /** Every frame a ritual room can ask for, by family. */
  const wanted = (art: string): readonly string[] => [
    'idle',
    'emerge',
    ...['1', '2', '3', '4', '5', '6'],
  ].map((frame) => `${art}.${frame}`)

  it('has a frame for every face, or no frames at all', () => {
    for (const r of Object.values(ROOMS)) {
      if (!r.ritual) continue
      const keys = wanted(r.ritual.art)
      const held = keys.filter((key) => PROP_ART[key])
      expect(
        held.length === 0 || held.length === keys.length,
        `${r.id} has ${held.length} of ${keys.length} chalice frames`,
      ).toBe(true)
    }
  })

  it('holds every frame at one box, so the object cannot move between them', () => {
    for (const r of Object.values(ROOMS)) {
      if (!r.ritual) continue
      const frames = wanted(r.ritual.art)
        .map((key) => PROP_ART[key])
        .filter((a): a is NonNullable<typeof a> => a !== undefined)
      if (frames.length === 0) continue
      const boxes = new Set(frames.map((a) => `${a.width}x${a.height}`))
      expect([...boxes], `${r.id}'s frames are not one box`).toHaveLength(1)
      // Whole scene plates, cover-fitted exactly as the backdrop is. That is
      // what removes every coordinate from the room.
      expect([frames[0]!.width, frames[0]!.height]).toEqual([480, 720])
      for (const frame of frames) expect(png(frame.file).bytes).toBeGreaterThan(0)
    }
  })

  it('names no prop art that no room asks for', () => {
    const asked = new Set(
      Object.values(ROOMS)
        .filter((r) => r.ritual)
        .flatMap((r) => wanted(r.ritual!.art)),
    )
    for (const key of Object.keys(PROP_ART)) expect([...asked]).toContain(key)
  })

  it('answers with nothing rather than throwing when a frame is unpainted', () => {
    // The room degrades; it does not break. `ART_DIRECTION.md`: scenery may
    // degrade, the opponent may not, and a font is scenery you can press.
    expect(() => propArt('chalice', 'idle')).not.toThrow()
    expect(propArt('nothing-at-all', '4')).toBeUndefined()
  })
})
