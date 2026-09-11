/**
 * The strip, and the territory cards, as derivations.
 *
 * Both are the same claim twice: **the wave adds no state.** Where the run has
 * been is `run.path`; what led out of each of those rooms is `run.map`; which
 * stretch of the descent a room is in is the node's own `territory`. If any of
 * this needed a field in the save it would be a different wave.
 *
 * The other half is what the strip is *not allowed* to know. It shows the
 * rooms that have been stood in and the mouths that were read and not taken.
 * It shows nothing ahead — no sockets, no count, no shape of the plan — and
 * that is asserted here rather than left to the view.
 */

import { describe, expect, it } from 'vitest'

import { newRun, reduce } from '../../src/game/reducer.js'
import { nodeAt, roomAt } from '../../src/game/map.js'
import { firstEntryToTerritory, stripOf, territoryAt } from '../../src/game/strip.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { GameState, RunState } from '../../src/game/state.js'

const start = (seed = 1): GameState => ({
  version: SAVE_VERSION,
  mode: 'explore',
  meta: EMPTY_META,
  run: newRun(seed),
})

/** Walk one edge out of the room the run is standing in, by its index. */
function walk(state: GameState, choice = 0): GameState {
  const run = state.run!
  const exits = roomAt(run).exits
  const to = exits[choice]?.to
  if (!to) throw new Error('nowhere to go')
  // The map's own edge, followed straight — these tests are about the strip,
  // not about whether a room lets you leave, so the move is made on the run
  // rather than pressed through a gate the room may be holding shut.
  return { ...state, run: { ...run, roomId: to, path: [...run.path, to] } }
}

const at = (run: RunState, templateId: string): boolean => roomAt(run).id === templateId

describe('the strip is the path, and only the path', () => {
  it('gives one frame per room stood in, oldest first', () => {
    let state = start()
    state = walk(state)
    state = walk(state)
    const frames = stripOf(state.run!)
    expect(frames).toHaveLength(state.run!.path.length)
    expect(frames.map((f) => f.nodeId)).toEqual([...state.run!.path])
  })

  it('names each frame, because a room you have stood in is not hidden', () => {
    const state = walk(start())
    for (const frame of stripOf(state.run!)) {
      expect(frame.name.length, frame.nodeId).toBeGreaterThan(0)
      expect(frame.name).toBe(roomAt(state.run!, frame.nodeId).name)
    }
  })

  it('marks exactly one frame as the one being stood in, and it is the last', () => {
    const state = walk(walk(start()))
    const frames = stripOf(state.run!)
    expect(frames.filter((f) => f.current)).toHaveLength(1)
    expect(frames.at(-1)!.current).toBe(true)
    expect(frames.at(-1)!.nodeId).toBe(state.run!.roomId)
  })

  it('shows nothing at all of the rooms ahead', () => {
    const state = walk(start())
    const frames = stripOf(state.run!)
    const visited = new Set(state.run!.path)
    for (const frame of frames) expect(visited.has(frame.nodeId)).toBe(true)
    // Every node of the map that has not been stood in is absent — no socket,
    // no placeholder, not even a count of them.
    const drawn = new Set(frames.map((f) => f.nodeId))
    for (const id of Object.keys(state.run!.map.nodes)) {
      if (!visited.has(id)) expect(drawn.has(id), `${id} is on the strip`).toBe(false)
    }
  })
})

describe('a junction remembers the mouth that was not taken', () => {
  it('derives the untaken way out of a departed junction, with its own label', () => {
    // Walk to the Cleft and take its first mouth. The other one is a road the
    // player read and did not take, and the strip is where it is remembered.
    let state = start()
    while (!at(state.run!, 'cleft')) state = walk(state)
    const cleft = state.run!.roomId
    const exits = roomAt(state.run!).exits
    expect(exits.length, 'the cleft is not a fork in this run').toBe(2)

    state = walk(state, 0)
    const frame = stripOf(state.run!).find((f) => f.nodeId === cleft)!
    expect(frame.mouths).toHaveLength(1)
    expect(frame.mouths[0]!.to).toBe(exits[1]!.to)
    // Labelled with the word that was on the hotspot, and nothing else. It
    // does not name the room behind it.
    expect(frame.mouths[0]!.label).toBe(exits[1]!.label)
    expect(frame.mouths[0]!.label).not.toContain(roomAt(state.run!, exits[1]!.to).name)
  })

  it('takes the other mouth and remembers the other road', () => {
    let state = start()
    while (!at(state.run!, 'cleft')) state = walk(state)
    const cleft = state.run!.roomId
    const exits = roomAt(state.run!).exits
    state = walk(state, 1)
    const frame = stripOf(state.run!).find((f) => f.nodeId === cleft)!
    expect(frame.mouths.map((m) => m.to)).toEqual([exits[0]!.to])
  })

  it('gives the room being stood in no mouths at all', () => {
    // Its ways out are in the picture, under the thumb. The strip is a record
    // of where the run has been, never a plan of where it may go.
    let state = start()
    while (!at(state.run!, 'cleft')) state = walk(state)
    expect(stripOf(state.run!).at(-1)!.mouths).toEqual([])
  })

  it('gives a corridor no mouths, because it had one way on', () => {
    const state = walk(start())
    const first = stripOf(state.run!)[0]!
    expect(first.mouths).toEqual([])
  })
})

describe('a territory is entered once', () => {
  it('calls the first room of a run a first entry', () => {
    const state = start()
    expect(firstEntryToTerritory(state.run!)).toBe(true)
    expect(territoryAt(state.run!)).toBe('threshold')
  })

  it('is true on the first room of a new stretch and false after it', () => {
    let state = start()
    const seen = new Set<string>()
    const firsts: string[] = []
    for (let step = 0; step < 6; step++) {
      const territory = territoryAt(state.run!)
      const first = firstEntryToTerritory(state.run!)
      expect(first, `${territory} at step ${step}`).toBe(!seen.has(territory))
      if (first) firsts.push(territory)
      seen.add(territory)
      state = walk(state)
    }
    // The descent's own grammar: it starts at the threshold and goes into
    // bone country, and each of those is named exactly once.
    expect(firsts[0]).toBe('threshold')
    expect(new Set(firsts).size).toBe(firsts.length)
  })

  it('does not name the threshold twice when the run comes back up to it', () => {
    // The keeper and the way out are threshold rooms, and the run started in
    // one. First is first: the card belongs to the room the run started in.
    let state = start()
    for (let step = 0; step < 10 && !at(state.run!, 'gate'); step++) state = walk(state)
    if (!at(state.run!, 'gate')) return
    expect(territoryAt(state.run!)).toBe('threshold')
    expect(firstEntryToTerritory(state.run!)).toBe(false)
  })
})

describe('nothing here reads anything the save does not already hold', () => {
  it('derives a strip from a run with no path but a room', () => {
    const run = { ...newRun(3), path: [] as readonly string[] }
    const frames = stripOf(run)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.nodeId).toBe(run.roomId)
    expect(frames[0]!.current).toBe(true)
  })

  it('reads a node territory off the map the run was built with', () => {
    const run = newRun(5)
    for (const id of Object.keys(run.map.nodes)) {
      expect(territoryAt(run, id)).toBe(nodeAt(run.map, id).territory)
    }
  })

  it('does not need a reducer to answer either question', () => {
    // Both derivations are pure functions of a settled run: no action, no
    // draw, no clock. A reload lands on the same strip.
    const run = reduce(start(), { type: 'LOOK', detailId: 'nothing' }).run!
    expect(stripOf(run).map((f) => f.nodeId)).toEqual([...run.path])
  })
})
