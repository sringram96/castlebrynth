import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  GRAMMAR,
  GRID,
  HAND_SIZE,
  LABELS,
  PLAIN_POUCH,
  ROOMS,
  ROOM_BOOK,
  atGrid,
  roomContent,
} from '../src/content/index.js'
import type { SceneState } from '../src/descent/index.js'
import { act, enterRoom, sceneKey, sceneStateOf } from '../src/descent/index.js'
import { deal } from '../src/gen/index.js'
import { markRect, renderRoom, viewOf } from '../src/room/index.js'
import type { RoomId } from '../src/state/index.js'
import { firstPermanent, wake } from '../src/state/index.js'
import { seedOf } from './helpers.js'

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
  return { room, done: [], opened: [], horror: null }
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
  it('gives every room its own palette, so no two rooms light the same', () => {
    const palettes = ROOMS.map((held) => JSON.stringify(held.scene(bare(held.id)).palette))
    expect(new Set(palettes).size).toBe(ROOMS.length)
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
  function atTheAlcove() {
    const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), seedOf(7))
    const chain = deal(seedOf(7), 1, CATALOG, GRAMMAR)
    const trove = chain.nodes.find((node) => node.type === 'trove')!
    return { ledgers, chain, room: trove.room }
  }

  it('keys the frame on what has happened, not on the room id alone', () => {
    const { ledgers, chain, room } = atTheAlcove()
    const before = sceneStateOf(ledgers, ROOM_BOOK, room)
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, room)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    const after = sceneStateOf(act(ledgers, taking[0]!), ROOM_BOOK, room)

    // The bug art. 70 names: one key for two states is one frame for two rooms.
    expect(sceneKey(before)).not.toBe(sceneKey(after))
    expect(before.done).toEqual([])
    expect(after.done).toEqual(['act.take-key'])
  })

  it('takes the key out of the room when the key is taken', () => {
    const { ledgers, chain, room } = atTheAlcove()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, room)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    const before = sceneStateOf(ledgers, ROOM_BOOK, room)
    const after = sceneStateOf(act(ledgers, taking[0]!), ROOM_BOOK, room)

    const propsIn = (state: SceneState): readonly string[] => {
      const scene = roomContent(room).scene(state)
      return scene.props(viewOf(scene.shape, CONFIG)).map((prop) => prop.name)
    }
    expect(propsIn(before)).toContain('the key')
    expect(propsIn(after)).not.toContain('the key')
    // And the pixels say so, which is the half prose cannot do.
    expect(fnv(pixelsOf(after))).not.toBe(fnv(pixelsOf(before)))
  })

  it('leaves an opened door standing open', () => {
    const { room } = atTheAlcove()
    const shut = bare(room)
    const open: SceneState = { ...shut, opened: [`${room}→somewhere`] }
    expect(sceneKey(open)).not.toBe(sceneKey(shut))
    expect(fnv(pixelsOf(open))).not.toBe(fnv(pixelsOf(shut)))
  })

  it('keeps a wounded horror wounded in the frame key, as it always did', () => {
    const { room } = atTheAlcove()
    const whole: SceneState = { ...bare(room), horror: 150 }
    const hurt: SceneState = { ...bare(room), horror: 40 }
    expect(sceneKey(whole)).not.toBe(sceneKey(hurt))
  })
})
