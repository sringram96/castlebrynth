import { describe, expect, it } from 'vitest'

import { GRID, RENDER, ROOMS, ROOM_BOOK, atGrid, masonry, roomContent } from '../src/content/index.js'
import type { SceneState } from '../src/descent/index.js'
import { renderRoom, Surface, viewOf } from '../src/room/index.js'
import type { RoomId } from '../src/state/index.js'
import { instanceOf } from '../src/state/index.js'

/**
 * art. 96's third shape, built: a chamber whose side apertures are wide and
 * full-height, where a door is a direction you turn rather than an item you
 * pick.
 *
 * The load-bearing claim is that the hole is **geometry**. An opening
 * painted on a side wall would run flat across the frame instead of
 * receding, would agree in size with nothing else in the room, and could not
 * hide what stands behind it — the three failures art. 102 named for masses,
 * word for word. So what is asserted here is what the cast did, not what the
 * pixels look like.
 */
const CONFIG = atGrid(GRID, 260)

const JUNCTIONS = ROOMS.filter((held) => held.kind === 'junction')

function standing(room: RoomId, doors: number): SceneState {
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
      ends: false,
    })),
  }
}

function cast(room: RoomId, doors: number) {
  const scene = roomContent(room).scene(standing(room, doors))
  return { scene, room: renderRoom(scene, CONFIG) }
}

/** Which frame columns any of these surfaces was first hit in. */
function columnsOf(surface: Uint8Array, width: number, ...want: readonly number[]): Set<number> {
  const found = new Set<number>()
  for (let i = 0; i < surface.length; i++) {
    if (want.includes(surface[i]!)) found.add(i % width)
  }
  return found
}

describe('the junction — art. 96 (a door is a direction you turn)', () => {
  it('deals junctions to more than one region, and never the same mix twice', () => {
    // art. 77 as extended: a region carries a mix of shapes, and a depth of
    // one shape is a depth of one room. This is the shape half of that.
    expect(JUNCTIONS.length).toBeGreaterThan(1)
    const shapes = new Set(ROOMS.map((held) => held.kind))
    expect(shapes.has('junction')).toBe(true)
    expect(shapes.size).toBeGreaterThan(4)
  })

  it('cuts a real hole: the wall stops and the turn stands behind it', () => {
    for (const held of JUNCTIONS) {
      const { room } = cast(held.id, 2)
      const width = room.frame.width
      const turns = columnsOf(room.surface, width, Surface.Turn)
      expect(turns.size, held.id as string).toBeGreaterThan(8)
      // Mirrored: a junction offering two ways offers one either side.
      const cx = width / 2
      expect([...turns].some((x) => x < cx), held.id as string).toBe(true)
      expect([...turns].some((x) => x > cx), held.id as string).toBe(true)
    }
  })

  it('opens the ways it has, and no more (arts 70, 96)', () => {
    for (const held of JUNCTIONS) {
      const width = cast(held.id, 1).room.frame.width
      const one = columnsOf(cast(held.id, 1).room.surface, width, Surface.Turn)
      const two = columnsOf(cast(held.id, 2).room.surface, width, Surface.Turn)
      // A corner: one way on, one hole, and it is on the left.
      expect([...one].every((x) => x < width / 2), held.id as string).toBe(true)
      expect(two.size, held.id as string).toBeGreaterThan(one.size)
    }
  })

  it('puts the room behind the turn, not the far wall (a plane is infinite, a wall is not)', () => {
    for (const held of JUNCTIONS) {
      const { room } = cast(held.id, 2)
      const width = room.frame.width
      const turns = columnsOf(room.surface, width, Surface.Turn)
      const backs = columnsOf(room.surface, width, Surface.Back)
      // The far wall stands between the turns and nowhere else. If it were
      // let through a hole it would be standing outside the room.
      for (const x of backs) expect(turns.has(x), `${held.id as string} at ${x}`).toBe(false)
      expect(backs.size, held.id as string).toBeGreaterThan(0)
    }
  })

  it('sees round no corner: past the turn is the mouth (arts 16, 96)', () => {
    for (const held of JUNCTIONS) {
      const { room } = cast(held.id, 2)
      const width = room.frame.width
      const turns = columnsOf(room.surface, width, Surface.Turn)
      const dark = columnsOf(room.surface, width, Surface.Mouth)
      // A chamber has no mouth in it: it ends in a wall standing inside the
      // fog (art. 96). So every dark pixel in one of these rooms is a pixel
      // looking down a turn, which is the one honest thing a cast can say
      // about a corridor it cannot see the end of.
      expect(dark.size, held.id as string).toBeGreaterThan(4)
      // And it lies *outside* the turn's own far wall on each side: the
      // steeper the sight line, the further down the corridor it goes.
      const cx = width / 2
      for (const side of [-1, 1] as const) {
        const onSide = (x: number): boolean => (side < 0 ? x < cx : x > cx)
        const wall = [...turns].filter(onSide)
        const away = [...dark].filter(onSide)
        expect(wall.length, held.id as string).toBeGreaterThan(0)
        expect(away.length, held.id as string).toBeGreaterThan(0)
        const outer = side < 0 ? Math.min(...wall) : Math.max(...wall)
        for (const x of away) {
          expect(side < 0 ? x < outer : x > outer, `${held.id as string} at ${x}`).toBe(true)
        }
      }
    }
  })

  it('recedes, which is the whole reason it is cast and not painted', () => {
    for (const held of JUNCTIONS) {
      const { room } = cast(held.id, 2)
      const width = room.frame.width
      // The aperture is a trapezoid, not a rectangle: the near end of the
      // opening is taller on the frame than the far end. A painted hole
      // would be the same height at both, which is the tell.
      const heights = new Map<number, number>()
      for (let i = 0; i < room.surface.length; i++) {
        const s = room.surface[i]!
        if (s !== Surface.Turn && s !== Surface.Mouth) continue
        const x = i % width
        if (x > width / 2) continue
        heights.set(x, (heights.get(x) ?? 0) + 1)
      }
      const columns = [...heights.keys()].sort((a, b) => a - b)
      const nearest = heights.get(columns[0]!)!
      const furthest = heights.get(columns[columns.length - 1]!)!
      expect(nearest, held.id as string).toBeGreaterThan(furthest)
    }
  })

  it('draws no threshold over a turn, and one over the way straight on (arts 96, 97)', () => {
    for (const held of JUNCTIONS) {
      const doorsIn = (n: number): number => {
        const scene = held.scene(standing(held.id, n))
        return scene
          .props(viewOf(scene.shape, CONFIG))
          .filter((prop) => prop.name === 'the door').length
      }
      // A left and a right are directions, so nothing is drawn on them: the
      // wall's own architrave (art. 99) is the whole of what says way out.
      expect(doorsIn(1), held.id as string).toBe(0)
      expect(doorsIn(2), held.id as string).toBe(0)
      // Three is a left, a right, and the way straight on — and only the
      // last of those is a hole in a wall you are looking at.
      expect(doorsIn(3), held.id as string).toBe(1)
    }
  })

  it('answers for a turn where the turn actually is (art. 68)', () => {
    for (const held of JUNCTIONS) {
      const scene = held.scene(standing(held.id, 2))
      const view = viewOf(scene.shape, CONFIG)
      const room = renderRoom(scene, CONFIG)
      const marks = held.doorMarks(2)
      const turns = columnsOf(room.surface, room.frame.width, Surface.Turn)
      for (const mark of marks) {
        const rect = { x: view.project(mark.X, mark.Y, mark.z).x }
        // The region the thumb presses sits over pixels the cast actually
        // put a hole in — the defect art. 97 was written about, from the
        // other side: a tap region standing over nothing.
        expect(turns.has(Math.round(rect.x)), held.id as string).toBe(true)
      }
    }
  })
})

describe('the fourteen, re-authored — arts 69, 99, 104', () => {
  it('answers every tappable with a line: silence is a bug (art. 69)', () => {
    for (const held of ROOMS) {
      for (const target of held.tappables) {
        expect(ROOM_BOOK.look(held.id, target.id).length, `${held.id as string}/${target.id}`)
          .toBeGreaterThan(0)
        // art. 111: and the answer names the thing before it says anything
        // atmospheric, so the noun is there to be named.
        expect(target.noun, target.id).not.toBe(target.id)
      }
    }
  })

  it('gives every room architecture on its walls, not just a colour (arts 98–99)', () => {
    // A grammar alone is the last room in a different colour, so the bar is
    // that each room's *walls* answer differently from the same school's
    // bare masonry. Features live on the wall plane, so this is a question
    // asked of the shader rather than of the prop list.
    for (const held of ROOMS) {
      if (held.kind === 'open') continue
      const scene = held.scene(standing(held.id, 1))
      const bare = masonry(held.school, scene.shape, RENDER.eye)
      let moved = 0
      for (let z = 3; z < 33; z += 0.5) {
        for (let h = 0.5; h < RENDER.eye + scene.shape.ceiling; h += 0.5) {
          for (const side of [-1, 1] as const) {
            if (Math.abs(scene.surfaces.wall(side, z, h) - bare.wall(side, z, h)) > 1e-9) moved++
          }
          if (Math.abs(scene.surfaces.back(z - 16, h) - bare.back(z - 16, h)) > 1e-9) moved++
        }
      }
      expect(moved, held.id as string).toBeGreaterThan(30)
    }
  })
})
