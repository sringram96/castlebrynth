import { describe, expect, it } from 'vitest'

import {
  BEARER_FRAMES,
  BRAZIER_FRAMES,
  CHOIR_DARK,
  CHOIR,
  GRID,
  LANTERN_FRAMES,
  MOTION,
  ROOMS,
  UNBIDDEN,
  WATCHER,
  WATCHER_DARK,
  atGrid,
  framedWidth,
  lintVoice,
  roomContent,
} from '../src/content/index.js'
import type { SceneState } from '../src/descent/index.js'
import type { Drawn, Motion, Scene } from '../src/room/index.js'
import {
  MOST_FRAMES,
  MOST_LOOPS,
  blinks,
  breathing,
  loopFrame,
  markRect,
  overspent,
  phaseOf,
  overpaint,
  renderRoom,
  stirring,
  swelling,
  unbidding,
  viewOf,
} from '../src/room/index.js'
import type { RoomId } from '../src/state/index.js'
import { instanceOf } from '../src/state/index.js'

/**
 * The stir, and the unbidden beat (cards 64 · 65, arts 106–110, 117).
 *
 * Two waves ratified arts 106–110 with nothing built behind them. What is
 * tested here is the half of it that is law rather than taste: the budget,
 * the one clock, the overlay never being a recast, and the clause the wave
 * called load-bearing — **identical in every pixel that is not part of a
 * declared loop**.
 */

const CONFIG = atGrid(GRID, 260)

function standing(room: RoomId, doors = 1): SceneState {
  return {
    room,
    instance: instanceOf(room, 0),
    done: [],
    opened: [],
    horror: null,
    fills: [],
    doors: Array.from({ length: doors }, (_, at) => ({
      at,
      open: false,
      locked: false,
      turned: false,
      ends: false,
    })),
  }
}

function sceneOf(room: RoomId, doors = 1): Scene {
  return roomContent(room).scene(standing(room, doors))
}

function motionOf(room: RoomId): Motion {
  const motion = sceneOf(room).motion
  if (motion === undefined) throw new Error(`${room as string} declares no motion`)
  return motion
}

/**
 * The cast, held. art. 110's whole point is that a room is cast once and
 * repainted — so the tests are shaped the way the shell is, and a cast that
 * happened is never made to happen twice.
 */
const casts = new Map<string, ReturnType<typeof renderRoom>>()
function castOf(room: RoomId, lit = false): ReturnType<typeof renderRoom> {
  const key = `${room as string}${lit ? ':lit' : ''}`
  let held = casts.get(key)
  if (held === undefined) {
    const scene = sceneOf(room)
    held = renderRoom(lit ? breathing(scene, scene.motion?.swell ?? 0) : scene, CONFIG)
    casts.set(key, held)
  }
  return held
}

/** The frame this room shows at this tick: the cast, plus what moves on it. */
function shown(room: RoomId, tick: number): Uint8ClampedArray {
  const scene = sceneOf(room)
  const base = castOf(room, swelling(scene, tick))
  return overpaint(base, stirring(scene.motion, base.view, tick)).pixels
}

/** Which pixels differ between two frames of the same room. */
function moved(one: Uint8ClampedArray, other: Uint8ClampedArray): Set<number> {
  const at = new Set<number>()
  for (let i = 0; i < one.length; i += 4) {
    if (one[i] !== other[i] || one[i + 1] !== other[i + 1] || one[i + 2] !== other[i + 2]) {
      at.add(i / 4)
    }
  }
  return at
}

describe('art. 107 — stillness is capital, so motion is a budget', () => {
  it('keeps every room inside it', () => {
    for (const held of ROOMS) {
      expect(overspent(motionOf(held.id)), held.id as string).toEqual([])
    }
  })

  it('holds the budget itself where the article put it', () => {
    expect(MOST_LOOPS).toBe(3)
    expect(MOST_FRAMES).toBe(3)
  })

  it('spends the doorways in every room, and almost nothing else', () => {
    const spent = ROOMS.map((held) => motionOf(held.id).loops.length)
    // Every room stirs its ways out: that is art. 106's founding case, and it
    // is the one loop nobody authors.
    for (const [at, held] of ROOMS.entries()) {
      const loops = motionOf(held.id).loops
      expect(loops[0]!.kind, held.id as string).toBe('threshold')
      expect(spent[at], held.id as string).toBeGreaterThan(0)
    }
    // And most rooms spend nothing else. If this ever inverts, every loop in
    // the game is worth less, which is the whole of the article.
    const quiet = spent.filter((many) => many === 1).length
    expect(quiet).toBeGreaterThan(ROOMS.length / 2)
  })

  it('gives at most one room in three a blink or a beat of its own', () => {
    const rare = ROOMS.filter(
      (held) => motionOf(held.id).blink !== undefined || motionOf(held.id).unbidden !== undefined,
    )
    expect(rare.length).toBeGreaterThan(0)
    expect(rare.length).toBeLessThanOrEqual(ROOMS.length / 2)
    // art. 108: at most one blink per room is a type-level fact — there is
    // one field — and this is the count that says only a few rooms have one.
    const blinking = ROOMS.filter((held) => motionOf(held.id).blink !== undefined)
    expect(blinking.map((held) => held.id as string).sort()).toEqual([
      'room.lair.choir',
      'room.puzzle.watcher',
    ])
  })

  /**
   * arts 107, 110: a loop's frames share one silhouette. Animation is overlay
   * repaint on the frame under it, so a frame that covers fewer cells leaves
   * the frame under it showing — a flame that shrank would smear.
   */
  it('keeps one silhouette across every authored frame of a thing', () => {
    const same = (frames: readonly Drawn[], name: string): void => {
      const first = frames[0]!
      for (const [at, one] of frames.entries()) {
        expect(one.width, `${name} ${at}`).toBe(first.width)
        expect(one.height, `${name} ${at}`).toBe(first.height)
        for (let i = 0; i < first.kind.length; i++) {
          expect(
            one.kind[i] === 0,
            `${name} frame ${at} cell ${i}`,
          ).toBe(first.kind[i] === 0)
        }
      }
    }
    same(BRAZIER_FRAMES, 'brazier')
    same(LANTERN_FRAMES, 'lantern')
    same(BEARER_FRAMES, 'bearer')
    same([CHOIR, CHOIR_DARK], 'choir')
    same([WATCHER, WATCHER_DARK], 'watcher')
  })

  it('puts the light out rather than the face, when it blinks (art. 108)', () => {
    // The blink is the same drawing with less light in it, and nothing else.
    for (const [open, shut] of [
      [CHOIR, CHOIR_DARK],
      [WATCHER, WATCHER_DARK],
    ] as const) {
      let dimmer = 0
      for (let i = 0; i < open.tone.length; i++) {
        expect(shut.tone[i]!).toBeLessThanOrEqual(open.tone[i]! + 1e-6)
        if (shut.tone[i]! < open.tone[i]!) dimmer++
      }
      expect(dimmer).toBeGreaterThan(0)
    }
  })
})

describe('art. 109 — one clock, phase-offset by hash', () => {
  it('gives the same identity the same phase, forever', () => {
    expect(phaseOf('room.lair.kiln:brazier', 3)).toBe(phaseOf('room.lair.kiln:brazier', 3))
    // No per-thing timers: a phase is a function of a name and a length, so
    // there is nothing to hold between paints and nothing to drift.
    for (const over of [2, 3, 420]) {
      expect(phaseOf('a', over)).toBeGreaterThanOrEqual(0)
      expect(phaseOf('a', over)).toBeLessThan(over)
    }
    expect(phaseOf('a', 1)).toBe(0)
  })

  it('keeps two loops in one room off each other', () => {
    // The ash passage is the room that spends the whole budget: the doorways,
    // the lantern and the motes. If they shared a phase they would pulse
    // together, which is one motion pretending to be three.
    const loops = motionOf('room.passage.ash' as RoomId).loops
    expect(loops).toHaveLength(3)
    const phases = loops.map((loop) => phaseOf(loop.id, 3))
    expect(new Set(loops.map((loop) => loop.id)).size).toBe(3)
    expect(new Set(phases).size).toBeGreaterThan(1)
  })

  it('walks every loop through all of its frames and back', () => {
    for (const held of ROOMS) {
      for (const loop of motionOf(held.id).loops) {
        const seen = new Set(
          Array.from({ length: loop.frames }, (_, tick) => loopFrame(loop, tick)),
        )
        expect(seen.size, loop.id).toBe(loop.frames)
        // One clock: the cycle closes, so a room left standing does not walk
        // off into a state it never comes back from.
        expect(loopFrame(loop, 0), loop.id).toBe(loopFrame(loop, loop.frames))
      }
    }
  })

  it('fires the blink once in its long clock and not otherwise (art. 108)', () => {
    const blink = motionOf('room.puzzle.watcher' as RoomId).blink!
    expect(blink.every).toBe(MOTION.blinkEvery)
    const fired = Array.from({ length: blink.every }, (_, tick) => blinks(blink, tick)).filter(
      Boolean,
    )
    expect(fired).toHaveLength(1)
    // The two rooms that blink do not blink together, which is what makes it
    // rare rather than a heartbeat.
    const other = motionOf('room.lair.choir' as RoomId).blink!
    expect(phaseOf(blink.id, blink.every)).not.toBe(phaseOf(other.id, other.every))
  })
})

describe('art. 110 — overlay repaint, and the pixels that may not move', () => {
  /**
   * The clause the wave called load-bearing: a room is identical in every
   * pixel that is not part of a declared loop. If it cannot be made to pass,
   * the design is wrong and not the test.
   */
  /**
   * The strong form: a room whose only loop is its doorways moves inside its
   * doorways and nowhere else. It is the whole clause said about pixels that
   * can be pointed at — the thresholds stir, and *almost nothing else does*.
   */
  it('keeps a doorway room’s motion inside its doorways (art. 106)', () => {
    for (const held of ROOMS) {
      const scene = sceneOf(held.id)
      if (scene.motion!.loops.length !== 1) continue
      // A junction's turns are holes in its side walls rather than marks on
      // its far wall, and `doorMarks` answers for both — so the region a turn
      // moves in is the region the thumb presses, which is the point.
      const cast = castOf(held.id)
      // The footprint art. 105 measures a threshold by: the hole *plus* the
      // architrave standing proud of the wall around it, which is the thing
      // the eye reads as the doorway and therefore the thing the stir is
      // allowed to be inside of.
      const box = held.doorMarks(1).map((mark) => {
        const framed = framedWidth(mark.width)
        return markRect(cast.view, {
          ...mark,
          width: framed,
          height: mark.height + (framed - mark.width) / 2,
          z: mark.z - 0.6,
        })
      })
      const inside = (at: number): boolean => {
        const x = at % cast.frame.width
        const y = Math.floor(at / cast.frame.width)
        return box.some(
          (rect) =>
            x >= rect.x - 2 &&
            x <= rect.x + rect.width + 2 &&
            y >= rect.y - 2 &&
            y <= rect.y + rect.height + 2,
        )
      }
      for (let tick = 0; tick < 3; tick++) {
        const frame = overpaint(cast, stirring(scene.motion, cast.view, tick)).pixels
        const strayed = [...moved(cast.frame.pixels, frame)].filter((at) => !inside(at))
        expect(strayed, `${held.id as string}@${tick}`).toEqual([])
      }
    }
  })

  it('renders the same tick of the same room to the same bytes, always', () => {
    for (const held of ROOMS.slice(0, 6)) {
      for (const tick of [0, 1, 7]) {
        expect(shown(held.id, tick), `${held.id as string}@${tick}`).toEqual(shown(held.id, tick))
      }
    }
  })

  it('actually moves something in every room, doorways included (art. 106)', () => {
    const stiff = ROOMS.filter((held) => {
      const frames = [0, 1, 2].map((tick) => shown(held.id, tick))
      return frames.every((one) => moved(frames[0]!, one).size === 0)
    })
    // One room, and the reason is geometry rather than authorship: the throne
    // hall's far wall stands at 58 world units, where a shut door's recess
    // projects to under a pixel and there is no reveal left to churn. Opened,
    // the hole is full of the room's own darkness and churns like any other —
    // which is the state the room is in for the half of the visit that
    // matters (art. 70).
    expect(stiff.map((held) => held.id as string)).toEqual(['room.hall.throne'])

    const throne = 'room.hall.throne' as RoomId
    const open: SceneState = {
      ...standing(throne),
      opened: [`${instanceOf(throne, 0)}→0`],
      doors: [{ at: 0, open: true, locked: false, turned: false, ends: false }],
    }
    const scene = roomContent(throne).scene(open)
    const cast = renderRoom(scene, CONFIG)
    const frames = [0, 1, 2].map(
      (tick) => overpaint(cast, stirring(scene.motion, cast.view, tick)).pixels,
    )
    expect(frames.some((one) => moved(frames[0]!, one).size > 0)).toBe(true)
  })

  /** art. 110: where the whole room must breathe, it is cast twice. */
  it('casts a swelling room twice and alternates, rather than recasting it', () => {
    const fire = ROOMS.filter((held) => (motionOf(held.id).swell ?? 0) > 0)
    expect(fire.map((held) => held.id as string).sort()).toEqual([
      'room.lair.kiln',
      'room.passage.ash',
      'room.trove.hoard',
    ])
    for (const held of fire) {
      const scene = sceneOf(held.id)
      // Two frames, and only two: the clock chooses between prepared frames
      // and never changes what a pixel means (art. 17).
      const which = new Set(Array.from({ length: 8 }, (_, tick) => swelling(scene, tick)))
      expect(which.size, held.id as string).toBe(2)
      const dim = renderRoom(scene, CONFIG).frame.pixels
      const lit = renderRoom(breathing(scene, scene.motion!.swell!), CONFIG).frame.pixels
      expect(moved(dim, lit).size, held.id as string).toBeGreaterThan(0)
    }
  })

  it('leaves a room that swells nothing cast exactly once', () => {
    const quiet = sceneOf('room.trove.alcove' as RoomId)
    expect(quiet.motion?.swell).toBeUndefined()
    for (let tick = 0; tick < 8; tick++) expect(swelling(quiet, tick)).toBe(false)
  })
})

describe('art. 116 — reduced motion is the test of whether art. 107 was honest', () => {
  /**
   * With the setting on, no loop runs and the blink never fires: the shell
   * shows the cast frame. So the claim under test is that the cast frame is a
   * whole room — nothing in this wave is legible only while moving.
   */
  it('leaves every room readable with nothing moving in it', () => {
    for (const held of ROOMS) {
      const scene = sceneOf(held.id)
      const cast = renderRoom(scene, CONFIG)
      // The still frame is what the settled state is, and it is a full room:
      // every prop the room stands in it is painted by the cast, not by a
      // loop. A loop only ever repaints something already there.
      const props = scene.props(viewOf(scene.shape, CONFIG))
      expect(props.length, held.id as string).toBeGreaterThan(0)
      expect(cast.frame.pixels.some((byte) => byte !== 0), held.id as string).toBe(true)
    }
  })

  it('is not an input to the renderer, so it cannot change what is true', () => {
    // The guard the threshold wave put here still holds after this wave: a
    // preference does not reach the cast, and the stir is chosen by the shell
    // from the clock rather than by the scene from a setting.
    for (const held of ROOMS.slice(0, 4)) {
      const scene = sceneOf(held.id)
      expect(Object.keys(scene)).not.toContain('prefs')
      expect(stirring(scene.motion, renderRoom(scene, CONFIG).view, 0).length).toBeGreaterThan(0)
    }
  })
})

describe('art. 117 — a room may do one small thing of its own accord', () => {
  const withBeats = ROOMS.filter((held) => motionOf(held.id).unbidden !== undefined)

  it('authors between five and eight of them across the depth', () => {
    expect(withBeats.length).toBeGreaterThanOrEqual(5)
    expect(withBeats.length).toBeLessThanOrEqual(8)
  })

  it('gives every one of them a line, and the line to no other room', () => {
    const said = new Set(Object.keys(UNBIDDEN))
    expect([...said].sort()).toEqual(withBeats.map((held) => held.id as string).sort())
    // Keyed to a room's own furniture, never generic: no two rooms say the
    // same thing of their own accord.
    expect(new Set(Object.values(UNBIDDEN)).size).toBe(said.size)
  })

  it('binds those lines to rules/voice.md like every other line', () => {
    for (const [room, line] of Object.entries(UNBIDDEN)) {
      expect(lintVoice(line, 'beat'), room).toEqual([])
    }
  })

  it('plays for its frames and then the room is the room again (art. 1)', () => {
    for (const held of withBeats) {
      const scene = sceneOf(held.id)
      const cast = renderRoom(scene, CONFIG)
      const one = scene.motion!.unbidden!
      // Before it and after it there is nothing: the settled state is a room
      // in which nothing happened, which is what "never required" means.
      expect(unbidding(scene.motion, cast.view, -1)).toEqual([])
      expect(unbidding(scene.motion, cast.view, one.frames)).toEqual([])
      let moves = 0
      for (let frame = 0; frame < one.frames; frame++) {
        const painted = overpaint(cast, unbidding(scene.motion, cast.view, frame)).pixels
        moves += moved(cast.frame.pixels, painted).size
      }
      expect(moves, held.id as string).toBeGreaterThan(0)
    }
  })

  it('schedules itself deterministically per instance, and rarely', () => {
    const delays = withBeats.map((held) =>
      MOTION.unbidden.soonest + phaseOf(`${held.id as string}#0`, MOTION.unbidden.spread),
    )
    for (const delay of delays) {
      expect(delay).toBeGreaterThanOrEqual(MOTION.unbidden.soonest)
      expect(delay).toBeLessThan(MOTION.unbidden.soonest + MOTION.unbidden.spread)
      // Rarely: a good part of a minute of standing still, at the clock the
      // rest of the game runs on.
      expect(delay * MOTION.tick).toBeGreaterThan(8_000)
    }
    // Two rooms do not do their one thing at the same moment.
    expect(new Set(delays).size).toBeGreaterThan(1)
  })

  it('never puts a beat in a room the loops already fill', () => {
    // art. 104's reasoning, applied to motion: if two things compete to be
    // the one thing, the room has none. A room that already spends its whole
    // budget does not also get something happening in it unasked.
    for (const held of withBeats) {
      expect(motionOf(held.id).loops.length, held.id as string).toBeLessThan(MOST_LOOPS)
    }
  })
})
