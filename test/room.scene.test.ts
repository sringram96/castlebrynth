import { describe, expect, it } from 'vitest'

import {
  FAR_SOCKET,
  FLOOR_SOCKET,
  GRID,
  IRON_KEY,
  LABELS,
  RENDER,
  ROOMS,
  ROOM_BOOK,
  THINNEST,
  framedWidth,
  atGrid,
  roomContent,
} from '../src/content/index.js'
import type { SceneState } from '../src/descent/index.js'
import { act, chooseDoor, enterRoom, sceneKey, sceneStateOf } from '../src/descent/index.js'
import type { EncounterId } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import { markRect, renderRoom, viewOf } from '../src/room/index.js'
import type { RoomId } from '../src/state/index.js'
import { instanceOf } from '../src/state/index.js'
import {
  DEALER,
  lookAround, opened } from './drift.js'

/**
 * Rooms you can tell apart, and a world that remembers (arts 19, 21, 34,
 * 70).
 *
 * art. 34 hangs knowledge on room identity, so this is not a mood test: a
 * depth of identical boxes is a depth whose learning loop cannot run, and
 * death-as-progression rests on that loop.
 */
const CONFIG = atGrid(GRID, 260)

function bare(room: RoomId): SceneState {
  return {
    room,
    instance: instanceOf(room, 0),
    done: [],
    opened: [],
    horror: null,
    fills: [],
    doors: [],
  }
}

/** The same room, with something standing in one of its sockets (art. 83). */
function filled(room: RoomId, encounter: string, socket = FLOOR_SOCKET): SceneState {
  return {
    ...bare(room),
    fills: [{ socket, encounter: encounter as unknown as EncounterId }],
  }
}

function pixelsOf(state: SceneState): Uint8ClampedArray {
  return renderRoom(roomContent(state.room).scene(state), CONFIG).frame.pixels
}

function fnv(bytes: Uint8ClampedArray): string {
  let h = 2166136261 >>> 0
  for (const byte of bytes) {
    h ^= byte
    h = Math.imul(h, 16777619) >>> 0
  }
  return h.toString(16)
}

describe('rooms — art. 21 (palette is authorial), art. 19 (props stand somewhere)', () => {
  it('gives every room its own look, so no two rooms light the same', () => {
    // Under the ramp wave a room's colour is its ramps as much as its four
    // box tones, so the whole look is what has to differ.
    const looks = ROOMS.map((held) => JSON.stringify(held.scene(bare(held.id)).look))
    expect(new Set(looks).size).toBe(ROOMS.length)
  })

  it('dithers a surface only between two adjacent steps of its own ramp', () => {
    // The bug the ramp wave fixed, as a property: a wall pixel can only ever
    // take a wall-ramp colour, and the ramp's own neighbours are close
    // enough together that no dot reads as a dot.
    for (const held of ROOMS) {
      const { wall, floor, ceiling } = held.scene(bare(held.id)).look.ramps
      for (const one of [wall, floor, ceiling]) {
        expect(one.length, held.id as string).toBeGreaterThanOrEqual(7)
        expect(one.length, held.id as string).toBeLessThanOrEqual(14)
        for (let i = 1; i < one.length; i++) {
          const gap = Math.max(
            ...[16, 8, 0].map((shift) =>
              Math.abs(
                ((parseInt(one[i]!.slice(1), 16) >> shift) & 255) -
                  ((parseInt(one[i - 1]!.slice(1), 16) >> shift) & 255),
              ),
            ),
          )
          // Adjacent steps within a quarter of the byte range: a dithered
          // pair the eye blends instead of counting.
          expect(gap, `${held.id as string} step ${i}`).toBeLessThanOrEqual(64)
        }
      }
    }
  })

  it('stands at least one prop in every room, at world coordinates (art. 19)', () => {
    for (const held of ROOMS) {
      const scene = held.scene(bare(held.id))
      const props = scene.props(viewOf(scene.shape, CONFIG))
      expect(props.length, held.id as string).toBeGreaterThan(0)
      // A prop is somewhere: a depth, and a name a person could say.
      for (const prop of props) {
        expect(prop.z).toBeGreaterThan(0)
        expect(prop.name.length).toBeGreaterThan(0)
      }
    }
  })

  it('renders every room to different pixels — the eye can tell them apart', () => {
    const stamps = ROOMS.map((held) => fnv(pixelsOf(bare(held.id))))
    expect(new Set(stamps).size).toBe(ROOMS.length)
  })

  it('says its own name in its first candle (art. 34)', () => {
    for (const held of ROOMS) {
      const first = ROOM_BOOK.beats(held.id)[0] ?? ''
      const name = (LABELS[held.id as string] ?? '').replace(/^the /, '')
      expect(first.toLowerCase(), held.id as string).toContain(name.toLowerCase())
    }
  })

  it('puts every tappable somewhere inside the frame the room renders (art. 68)', () => {
    for (const held of ROOMS) {
      const scene = held.scene(bare(held.id))
      const view = viewOf(scene.shape, CONFIG)
      for (const target of held.tappables) {
        const rect = markRect(view, target.at)
        expect(rect.width, target.id).toBeGreaterThan(0)
        expect(rect.height, target.id).toBeGreaterThan(0)
        expect(rect.x + rect.width, target.id).toBeGreaterThan(0)
        expect(rect.x, target.id).toBeLessThan(view.frame.width)
        expect(rect.y, target.id).toBeLessThan(view.frame.height)
      }
      // The door is a thing in the world like any other, and it is in frame.
      const door = markRect(view, held.door)
      expect(door.x).toBeGreaterThan(0)
      expect(door.x + door.width).toBeLessThan(view.frame.width)
    }
  })
})

describe('the world remembers — art. 70 (prose confirms, pixels prove)', () => {
  /** The room the dealer put this run's key in, and the run standing in it. */
  function atTheKey() {
    let { ledgers, chain } = opened(7)
    for (let n = 0; n < 12; n++) {
      const node = hereIn(chain)!
      // art. 68: a thumb looks before it takes, so the walk that gets here
      // taps everything on the way — which is what summons the verbs.
      if (node.fills.some((fill) => fill.encounter === IRON_KEY)) {
        return { ledgers: lookAround(ledgers, node), chain, node }
      }
      const walked = chooseDoor(ledgers, chain, ROOM_BOOK, node.doors[0]!, DEALER)
      ledgers = walked.ledgers
      chain = walked.chain
    }
    throw new Error('the key was never dealt')
  }

  it('keys the frame on what has happened here, not on the room id alone', () => {
    const { ledgers, chain, node } = atTheKey()
    const before = sceneStateOf(ledgers, ROOM_BOOK, node)
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    const after = sceneStateOf(act(ledgers, taking[0]!), ROOM_BOOK, node)

    // The bug art. 70 names: one key for two states is one frame for two rooms.
    expect(sceneKey(before)).not.toBe(sceneKey(after))
    expect(before.done).toEqual([])
    expect(after.done).toEqual(['act.take-key'])
    // art. 82: the key of the frame names the instance, so a second copy of
    // the room is not painted with the first one's losses.
    expect(sceneKey(before)).toContain(node.instance as string)
  })

  it('takes the key out of the room when the key is taken', () => {
    const { ledgers, chain, node } = atTheKey()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    const before = sceneStateOf(ledgers, ROOM_BOOK, node)
    const after = sceneStateOf(act(ledgers, taking[0]!), ROOM_BOOK, node)

    const propsIn = (state: SceneState): readonly string[] => {
      const scene = roomContent(node.room).scene(state)
      return scene.props(viewOf(scene.shape, CONFIG)).map((prop) => prop.name)
    }
    expect(propsIn(before)).toContain('the key')
    expect(propsIn(after)).not.toContain('the key')
    // And the pixels say so, which is the half prose cannot do.
    expect(fnv(pixelsOf(after))).not.toBe(fnv(pixelsOf(before)))
  })

  it('paints what a socket holds, and paints nothing when it holds nothing (art. 83)', () => {
    const room = 'room.passage.stair' as RoomId
    const propsIn = (state: SceneState): readonly string[] => {
      const scene = roomContent(room).scene(state)
      return scene.props(viewOf(scene.shape, CONFIG)).map((prop) => prop.name)
    }
    // The room's authored prose and pixels assume nothing about its sockets.
    expect(propsIn(bare(room))).not.toContain('the key')
    expect(propsIn(bare(room))).not.toContain('the wet shape')
    // Fill them, and the same room shows what is standing in it.
    expect(propsIn(filled(room, 'enc.iron-key'))).toContain('the key')
    expect(propsIn(filled(room, 'enc.gnawing', FAR_SOCKET))).toContain('the wet shape')
    expect(fnv(pixelsOf(filled(room, 'enc.gnawing', FAR_SOCKET)))).not.toBe(
      fnv(pixelsOf(bare(room))),
    )
  })

  it('leaves an opened door standing open', () => {
    const room = 'room.trove.alcove' as RoomId
    const bareRoom = bare(room)
    const way = { at: 0, open: false, locked: false, ends: false }
    const shut: SceneState = { ...bareRoom, doors: [way] }
    const open: SceneState = {
      ...shut,
      opened: [`${shut.instance}→0`],
      doors: [{ ...way, open: true }],
    }
    expect(sceneKey(open)).not.toBe(sceneKey(shut))
    expect(fnv(pixelsOf(open))).not.toBe(fnv(pixelsOf(shut)))
  })

  it('draws every door it offers, and each one in its own state (arts 31, 97)', () => {
    const room = 'room.trove.alcove' as RoomId
    const ways = (n: number, open = -1): SceneState => ({
      ...bare(room),
      doors: Array.from({ length: n }, (_, at) => ({
        at,
        open: at === open,
        locked: false,
        ends: false,
      })),
    })
    const named = (state: SceneState): readonly string[] => {
      const scene = roomContent(room).scene(state)
      return scene.props(viewOf(scene.shape, CONFIG)).map((prop) => prop.name)
    }
    // The defect this fixes: three doors offered, one door drawn, and two tap
    // regions standing over nothing at all.
    for (const n of [1, 2, 3]) {
      expect(named(ways(n)).filter((name) => name === 'the door')).toHaveLength(n)
    }
    // And a door's state is its own: opening the middle one of three is not
    // the same room as opening the first (art. 70, per door).
    expect(fnv(pixelsOf(ways(3, 1)))).not.toBe(fnv(pixelsOf(ways(3, 0))))
    expect(fnv(pixelsOf(ways(3, 1)))).not.toBe(fnv(pixelsOf(ways(3))))
  })

  it('keeps the threshold grammar whatever the room asks for (art. 97)', () => {
    for (const held of ROOMS) {
      for (const count of [1, 2, 3]) {
        const marks = held.doorMarks(count)
        expect(marks, held.id as string).toHaveLength(count)
        for (const mark of marks) {
          // Taller than wide, always — wider-than-tall reads as furniture.
          expect(Math.min(mark.width, mark.height * THINNEST), held.id as string).toBeLessThan(
            mark.height,
          )
          // Standing on the floor: a thing that floats is a thing.
          expect(mark.Y, held.id as string).toBe(-RENDER.eye)
        }
        // art. 105: no door stands in front of another, and the footprint
        // that has to clear is the architrave's — two frames that touch read
        // as one wide barrier however far apart their holes are.
        const sorted = [...marks].sort((one, other) => one.X - other.X)
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i]!.X - sorted[i - 1]!.X
          expect(gap, held.id as string).toBeGreaterThan(
            (framedWidth(sorted[i]!.width) + framedWidth(sorted[i - 1]!.width)) / 2,
          )
        }
      }
    }
  })

  it('keeps a wounded horror wounded in the frame key, as it always did', () => {
    const room = 'room.trove.alcove' as RoomId
    const whole: SceneState = { ...bare(room), horror: 150 }
    const hurt: SceneState = { ...bare(room), horror: 40 }
    expect(sceneKey(whole)).not.toBe(sceneKey(hurt))
  })
})
