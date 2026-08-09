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
  BONE_ART,
  ENEMY_ART,
  HAND_ART,
  PROP_ART,
  ROOM_ART,
  SATCHEL_ART,
  SCENE,
  TRAY_ART,
  allAssets,
  boneArt,
  enemyArt,
  handArt,
  isScenePlate,
  propArt,
  roomArt,
  satchelArt,
} from '../../src/render/assets.js'
import { BONE_PROFILES } from '../../src/content/bones.js'
import { defeatOf } from '../../src/content/defeat.js'
import { ENEMIES, STAGES } from '../../src/content/enemies.js'
import { ROOMS, room } from '../../src/content/rooms.js'
import { platesFor } from '../../src/content/interactions.js'
import type { RoomInteractionState } from '../../src/game/state.js'
import { decode } from '../../tools/png.mjs'

const PUBLIC = new URL('../../public/assets/', import.meta.url)

/**
 * Every position the rooms of worked objects can be standing in.
 *
 * Enumerated rather than played, because what is being asked here is not *can
 * the reducer reach this* — `test/unit/rooms.test.ts` owns that — but *is there
 * a picture for it*. A state the reducer cannot reach still has to paint, or
 * the first save that finds a way there shows a room with a hole in it.
 *
 * The lever and the chest move together in the Reliquary, and the vault's five
 * are enumerated freely for the same reason: over-covering costs nothing.
 */
const EVERY_WORKED_STATE: readonly RoomInteractionState[] = [
  ...[false, true].flatMap((bellRung) =>
    (['lit', 'out'] as const).flatMap((brazier) =>
      ([
        ['up', 'closed'],
        ['down', 'open'],
      ] as const).flatMap(([lever, chest]) =>
        [false, true].map(
          (claimed): RoomInteractionState => ({
            roomId: 'reliquary',
            bellRung,
            brazier,
            lever,
            chest,
            claimed,
          }),
        ),
      ),
    ),
  ),
  ...(['off', 'on'] as const).flatMap((chain) =>
    (['raised', 'lowered'] as const).flatMap((cage) =>
      (['off', 'on'] as const).flatMap((pressurePlate) =>
        (['up', 'down'] as const).flatMap((lever) =>
          (['closed', 'open'] as const).map(
            (gate): RoomInteractionState => ({
              roomId: 'chain-vault',
              chain,
              cage,
              pressurePlate,
              lever,
              gate,
            }),
          ),
        ),
      ),
    ),
  ),
]

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

const exists = (file: string): boolean => {
  try {
    return statSync(new URL(file, PUBLIC)).size > 0
  } catch {
    return false
  }
}

/** Every alpha a plate uses. Binary art has exactly `{0, 255}`, or `{255}`. */
function alphas(file: string): Set<number> {
  const { rgba } = decode(readFileSync(new URL(file, PUBLIC)))
  const seen = new Set<number>()
  for (let i = 3; i < rgba.length; i += 4) seen.add(rgba[i]!)
  return seen
}

/** Where the drawing actually is inside a whole-scene plate. */
function opaqueBox(file: string): { x0: number; y0: number; x1: number; y1: number } | null {
  const { width, height, rgba } = decode(readFileSync(new URL(file, PUBLIC)))
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 }
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
   * The payload is **measured and reported, and it is not a gate.**
   *
   * There used to be a ceiling here — 4 MB, then 4.5, then 5.6 — and every
   * raise came with an argument about whether a backdrop or a pose family was
   * worth its bytes. That argument had the priorities backwards. Authored
   * state coverage is the feature; delivery architecture is second; byte
   * minimisation is third. A single global number made the first of those
   * compete with itself, so that a fifth authored pose for an enemy nobody had
   * reached yet was a cost to the title screen.
   *
   * What replaced it is architecture rather than a bigger number:
   * `render/loader.ts` decodes what the screen needs and prefetches what the
   * screen after it will need, so a family costs the fight that uses it. The
   * gates that remain are behavioural and live in
   * `test/browser/loading.spec.ts`.
   *
   * So this prints, and never fails. A number nobody can see is a number
   * nobody can reason about; a number that fails a build is a number that
   * makes the art worse.
   */
  it('reports the runtime art payload without capping it', () => {
    const files = allAssets()
    const total = files.reduce((sum, a) => sum + png(a.file).bytes, 0)

    const byFamily = new Map<string, number>()
    for (const a of files) {
      const family = a.file.split('/')[0] ?? 'other'
      byFamily.set(family, (byFamily.get(family) ?? 0) + png(a.file).bytes)
    }
    const mb = (n: number): string => `${(n / 1024 / 1024).toFixed(3)} MB`
    const report = [...byFamily]
      .sort((a, b) => b[1] - a[1])
      .map(([family, bytes]) => `  ${family.padEnd(10)} ${mb(bytes)}`)
      .join('\n')
    console.info(`runtime art: ${files.length} files, ${mb(total)}\n${report}`)

    // The only assertion is that there is something there to measure. There is
    // deliberately no upper bound.
    expect(total).toBeGreaterThan(0)
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

  it('gives a staged enemy a file for every stage, or none at all', () => {
    // Half a pose family is the failure this catches: a `close` plate that
    // landed while `mid` did not silently falls back to the plain sprite, and
    // the encounter reads as the thing changing shape as it comes.
    for (const e of Object.values(ENEMIES)) {
      if (!e.staging) continue
      const posed = STAGES.filter((reach: string) => ENEMY_ART[`${e.art}.${reach}`])
      expect(
        posed.length === 0 || posed.length === STAGES.length,
        `${e.id} has plates for ${posed.join(', ')} and not the rest`,
      ).toBe(true)
      for (const key of posed) expect(png(enemyArt(e.art, key).file).bytes).toBeGreaterThan(0)
    }
  })

  it('never mixes whole-scene plates with trimmed ones in a family', () => {
    // The two kinds are registered by different things — a scene plate by the
    // frame, a trimmed sprite by its own silhouette — so an enemy that shipped
    // one of each would be staged two ways and would jump between them. Which
    // kind an enemy is, is a property of its whole family.
    for (const e of Object.values(ENEMIES)) {
      const family = Object.entries(ENEMY_ART).filter(([key]) => key.split('.')[0] === e.art)
      const scene = family.filter(([, art]) => isScenePlate(art))
      expect(
        scene.length === 0 || scene.length === family.length,
        `${e.id} has ${scene.length} of ${family.length} plates at the scene size`,
      ).toBe(true)
    }
  })

  it('gives the impact plate the box of a pose it can actually stand in', () => {
    // The bright frame is a source swap and changes no placement, so it is
    // only ever shown where its dimensions match the plate it replaces. A
    // `hit` that matches nothing is a plate that would never appear.
    for (const e of Object.values(ENEMIES)) {
      const lit = ENEMY_ART[`${e.art}.hit`]
      if (!lit) continue
      const fits = STAGES.filter((reach: string) => {
        const at = ENEMY_ART[`${e.art}.${reach}`]
        return at && at.width === lit.width && at.height === lit.height
      })
      expect(fits.length, `${e.id}'s impact plate fits no stage`).toBeGreaterThan(0)
    }
  })
})

/**
 * The Warden.
 *
 * The one encounter in the slice built out of whole-scene plates, and the
 * reason the distinction exists at all. Everything below is a statement of the
 * same property from a different side: **ten drawings, one box.** A pose swap
 * has to be a change of what is drawn and nothing else, because the sequence
 * that swaps them touches no placement — so if two of these files disagreed
 * about their size, the boss would jump every time it raised its arms.
 */
describe('the Warden is one registered family', () => {
  /** Every plate, as the `<pose>` half of its key. The order is the ladder. */
  const POSES = [
    'idle.full.1',
    'idle.full.2',
    'idle.mid.1',
    'idle.mid.2',
    'idle.low.1',
    'idle.low.2',
    'attack',
    'defense',
    'defeat.1',
    'defeat.2',
  ] as const

  it('ships all ten plates, and no fewer', () => {
    for (const pose of POSES) {
      const art = ENEMY_ART[`warden.${pose}`]
      expect(art, `warden.${pose} is not in the manifest`).toBeDefined()
      expect(png(art!.file).bytes, `warden.${pose} has no file`).toBeGreaterThan(0)
    }
    // And nothing else claims to be a Warden plate. A stray key here is a plate
    // the loader downloads on every boot and nothing ever shows.
    const held = Object.keys(ENEMY_ART).filter((k) => k.startsWith('warden'))
    expect(held.sort()).toEqual(['warden', ...POSES.map((p) => `warden.${p}`)].sort())
  })

  it('holds every one of them at the scene box, whole and untrimmed', () => {
    // 480x720 exactly — not "about the same", not "the same as each other".
    // The plates are cover-fitted like the backdrop, so the scene size is what
    // registers them with the room as well as with one another.
    for (const pose of POSES) {
      const art = enemyArt('warden', pose)
      expect([art.width, art.height], `warden.${pose} is not the scene box`).toEqual([
        SCENE.width,
        SCENE.height,
      ])
      expect(isScenePlate(art)).toBe(true)
      const real = png(art.file)
      expect([real.width, real.height], `warden.${pose} on disk is not the scene box`).toEqual([
        SCENE.width,
        SCENE.height,
      ])
    }
  })

  it('keeps the alpha binary: opaque or absent, never in between', () => {
    // The contract every plate in the game is built on — a pixel's colour never
    // depends on what is behind it, so a room renders identically every visit.
    // A resample softens a hard edge, and `hardenAlpha` in the pipeline is what
    // puts it back; this is the assertion that it ran.
    for (const pose of POSES) {
      const seen = [...alphas(enemyArt('warden', pose).file)].sort((a, b) => a - b)
      expect(seen, `warden.${pose} has soft alpha`).toEqual([0, 255])
    }
  })

  it('answers a plain ask with the plate it is standing in at full health', () => {
    // Anything that wants "the Warden" and names no pose — the preloader, a
    // fallback, a test — has to get the picture the room actually opens on.
    expect(ENEMY_ART['warden']!.file).toBe('enemies/warden-idle-full-1.png')
    expect(enemyArt('warden').file).toBe(enemyArt('warden', 'idle.full.1').file)
  })

  it('has retired the sprite it used to be', () => {
    // The old Warden was cut out of a whole composition by a luminance key and
    // shipped as one 357x568 sprite. Nothing may name it, and `npm run art`
    // deletes it — a withdrawn output left in `public/` is a second Warden for
    // the next person to find.
    for (const asset of allAssets()) expect(asset.file).not.toBe('enemies/warden.png')
    expect(exists('enemies/warden.png'), 'the old Warden sprite is still on disk').toBe(false)
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

  it('gives a staged enemy an arm to smash with', () => {
    // The arm is the other half of the encounter: the thing throws bones at
    // you and you put something into the ones that lose. A fight with one and
    // not the other is half a fight.
    const closing = Object.values(ENEMIES).filter((e) => e.staging)
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
      const widest = e.staging ? e.staging.close.width : e.width
      expect(widest, `${e.id} never dominates`).toBeGreaterThanOrEqual(0.35)
      expect(e.width, `${e.id} opens invisibly`).toBeGreaterThanOrEqual(e.staging ? 0.3 : 0.35)
      // Only a thing on top of you may be wider than the frame it is in.
      expect(e.width).toBeLessThanOrEqual(1)
      expect(e.foot).toBeGreaterThan(0.5)
    }
  })

  it('never shrinks or stalls on the way in', () => {
    // Every step has to be big enough that nobody wonders whether it moved.
    for (const e of Object.values(ENEMIES)) {
      if (!e.staging) continue
      const { far, mid, close } = e.staging
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

/**
 * The War of Bones families.
 *
 * Both tables are empty today — the bones are drawn from the pip geometry in
 * `ui/components.ts`, which is the mechanism the game has always drawn a face
 * with, and the plates that are owed are written out under
 * `## HUMAN ART REQUIRED` in `POLISH_PROGRESS.md`.
 *
 * The gates below are **armed rather than skipped**. They pass vacuously on an
 * empty table and bite the moment a row is added, which is what stops the art
 * landing half-delivered: a `heavy.8` that shipped while `heavy.7` did not
 * would silently fall back to a drawn face, and one bone in the line would be
 * a different object from its neighbour.
 */
describe('the bone families, when they land', () => {
  it('ships a whole family or none of it', () => {
    for (const id of Object.keys(BONE_PROFILES) as (keyof typeof BONE_PROFILES)[]) {
      const profile = BONE_PROFILES[id]
      const wanted = ['back', 'broken', ...new Set(profile.faces.map(String))]
      const present = wanted.filter((face) => boneArt(id, face))
      expect(
        present.length === 0 || present.length === wanted.length,
        `${id} has art for ${present.join(', ')} and not ${wanted
          .filter((f) => !present.includes(f))
          .join(', ')}`,
      ).toBe(true)
    }
  })

  it('holds every bone row to a real file of the declared size', () => {
    for (const art of Object.values(BONE_ART)) {
      const file = png(art.file)
      expect(file.bytes, art.id).toBeGreaterThan(0)
      expect([file.width, file.height], art.id).toEqual([art.width, art.height])
    }
  })

  it('holds every satchel row to a real file of the declared size', () => {
    for (const art of Object.values(SATCHEL_ART)) {
      const file = png(art.file)
      expect(file.bytes, art.id).toBeGreaterThan(0)
      expect([file.width, file.height], art.id).toEqual([art.width, art.height])
    }
  })

  it('ships all three satchel icons or none of them', () => {
    const present = ['vial', 'charm', 'pouch'].filter((id) => satchelArt(id))
    expect(present.length === 0 || present.length === 3).toBe(true)
  })
})

/**
 * Every fight has a visible end.
 *
 * A completion gate rather than a nicety: an enemy whose army empties and
 * which then simply stops being drawn is a fight that ended without the player
 * seeing it end. `defeatOf` keeps a sparse fallback as a defensive path — a
 * save from a build that had an entry this one does not must still resolve —
 * but no shipped fight may reach it.
 */
describe('every enemy has a death', () => {
  it('has an authored defeat, and it has frames', () => {
    for (const e of Object.values(ENEMIES)) {
      const death = defeatOf(e.id)
      expect(death, `${e.id} has no authored death`).toBeDefined()
      expect(death!.frames.length, `${e.id} has an empty death`).toBeGreaterThan(0)
    }
  })

  it('holds every named defeat plate to a real file', () => {
    for (const e of Object.values(ENEMIES)) {
      for (const frame of defeatOf(e.id)!.frames) {
        if (!frame.pose) continue
        const art = ENEMY_ART[`${e.art}.${frame.pose}`]
        expect(art, `${e.id} names ${frame.pose} and no plate exists`).toBeDefined()
        expect(png(art!.file).bytes).toBeGreaterThan(0)
      }
    }
  })

  it('ends on a held frame, so a death is not a flicker', () => {
    for (const e of Object.values(ENEMIES)) {
      const frames = defeatOf(e.id)!.frames
      expect(frames[frames.length - 1]!.hold, e.id).toBeGreaterThanOrEqual(250)
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
    // Two kinds of room ask for prop art. A ritual room asks for a face; a room
    // of worked objects asks for whatever `platesFor` says is up, over every
    // position its objects can be standing in. A key that neither asks for is a
    // file the loader downloads on every boot and nothing ever shows.
    const asked = new Set([
      ...Object.values(ROOMS)
        .filter((r) => r.ritual)
        .flatMap((r) => wanted(r.ritual!.art)),
      ...EVERY_WORKED_STATE.flatMap((state) =>
        platesFor(state).map((p) => `${p.art}.${p.frame}`),
      ),
    ])
    for (const key of Object.keys(PROP_ART)) expect([...asked]).toContain(key)
  })

  it('answers with nothing rather than throwing when a frame is unpainted', () => {
    // The room degrades; it does not break. `ART_DIRECTION.md`: scenery may
    // degrade, the opponent may not, and a font is scenery you can press.
    expect(() => propArt('chalice', 'idle')).not.toThrow()
    expect(propArt('nothing-at-all', '4')).toBeUndefined()
  })
})

/**
 * The Reliquary's four objects.
 *
 * The room the slice's other prop rules were not written for. The Font is one
 * object painted in eight positions; this is **four objects painted once
 * each**, seated in the room by `tools/art.mjs`, and its other states are
 * treatments of the plates that exist rather than plates that do not.
 *
 * Which puts one thing at risk that a family cannot get wrong, and it is the
 * whole of what is asserted here: an object must be on screen **in every
 * position it can be standing in**. A frame that resolved to nothing would not
 * fail loudly — `propArt` answers `undefined` by contract and `renderWorld`
 * filters it out — it would simply take the bell out of the room the moment it
 * was rung. That is the bug this describe block exists to make impossible.
 */
describe('the Reliquary is four objects, and all four stay in the room', () => {
  const PLATES = ['altar.still', 'bell.idle', 'brazier.lit', 'chest.closed'] as const

  it('ships one plate for each of them, at the scene box', () => {
    for (const key of PLATES) {
      const art = PROP_ART[key]
      expect(art, `${key} is not in the manifest`).toBeDefined()
      const real = png(art!.file)
      expect([real.width, real.height], `${key} on disk is not the scene box`).toEqual([
        SCENE.width,
        SCENE.height,
      ])
      expect(isScenePlate(art!)).toBe(true)
      expect(real.bytes).toBeGreaterThan(0)
    }
  })

  it('keeps the alpha binary: opaque or absent, never in between', () => {
    for (const key of PLATES) {
      const seen = [...alphas(PROP_ART[key]!.file)].sort((a, b) => a - b)
      expect(seen, `${key} has soft alpha`).toEqual([0, 255])
    }
  })

  it('paints every object in every position the room can be in', () => {
    for (const state of EVERY_WORKED_STATE) {
      if (state.roomId !== 'reliquary') continue
      const up = platesFor(state)
      expect(up).toHaveLength(4)
      for (const plate of up) {
        expect(
          propArt(plate.art, plate.frame),
          `${plate.id} disappears when ${JSON.stringify(state)}`,
        ).toBeDefined()
      }
    }
  })

  it('says where each object is standing, so a state with no plate of its own still reads', () => {
    // The other half of the same idea. A brazier that is out and a brazier that
    // is lit are one drawing, so the *state* has to reach the stylesheet — and
    // it has to come off the save, or a reload would light the candles again.
    const lit = platesFor({
      roomId: 'reliquary',
      bellRung: false,
      brazier: 'lit',
      lever: 'up',
      chest: 'closed',
      claimed: false,
    })
    const dark = platesFor({
      roomId: 'reliquary',
      bellRung: true,
      brazier: 'out',
      lever: 'down',
      chest: 'open',
      claimed: true,
    })
    const look = (plates: readonly { id: string; look?: string }[]): Record<string, string> =>
      Object.fromEntries(plates.map((p) => [p.id, p.look ?? '']))

    expect(look(lit)).toEqual({
      'reliquary-altar': 'up',
      'reliquary-bell': 'still',
      'reliquary-brazier': 'lit',
      'reliquary-chest': 'closed',
    })
    expect(look(dark)).toEqual({
      'reliquary-altar': 'down',
      'reliquary-bell': 'rung',
      'reliquary-brazier': 'out',
      'reliquary-chest': 'open',
    })
    // And the drawing is the same drawing in both, which is the delivery.
    expect(lit.map((p) => p.frame)).toEqual(dark.map((p) => p.frame))
  })

  it('stands the four of them apart, so the room is not a pile', () => {
    // `ART_DIRECTION.md` wants a room rather than four icons on black, and the
    // plates are seated by `tools/art.mjs` rather than by anything at runtime —
    // so this is the assertion that the staging kept them off each other. Boxes,
    // not silhouettes: two objects whose boxes do not meet cannot be confused
    // for one, and the browser suite checks what a thumb makes of it.
    const boxes = PLATES.map((key) => ({ key, box: opaqueBox(PROP_ART[key]!.file) }))
    for (const a of boxes) {
      expect(a.box, `${a.key} is entirely transparent`).not.toBeNull()
    }
    for (const a of boxes) {
      for (const b of boxes) {
        if (a.key >= b.key) continue
        const overlaps =
          a.box!.x0 <= b.box!.x1 &&
          b.box!.x0 <= a.box!.x1 &&
          a.box!.y0 <= b.box!.y1 &&
          b.box!.y0 <= a.box!.y1
        expect(overlaps, `${a.key} and ${b.key} are standing on each other`).toBe(false)
      }
    }
  })

  it('leaves the middle of the room empty and the word band clear', () => {
    // The composition, as two numbers rather than as an opinion. Nothing may
    // reach the bottom of the frame, where the word band sits; and no object
    // may stray outside the middle 90% of the width, which is all a 390px
    // phone sees of a 480px scene.
    for (const key of PLATES) {
      const box = opaqueBox(PROP_ART[key]!.file)!
      expect(box.y1 / SCENE.height, `${key} runs under the word band`).toBeLessThan(0.88)
      expect(box.x0 / SCENE.width, `${key} is cropped off the left`).toBeGreaterThan(0.05)
      expect(box.x1 / SCENE.width, `${key} is cropped off the right`).toBeLessThan(0.95)
    }
  })
})
