/**
 * What is standing in the way.
 *
 * A maze room is four compass seats and a run rarely gets four exits, so the
 * ways a room does *not* offer were invisible: a wall you cannot pass looked
 * exactly like a wall that was never a way at all. These hold the two halves
 * of the answer — that every opening a painting has is declared against the
 * painting, and that what is drawn in one is a picture of a rule the reducer
 * already settled rather than a second opinion about it.
 */

import { describe, expect, it } from 'vitest'

import { PASSAGE_SEATS } from '../../src/content/passages.js'
import { DIRECTIONS } from '../../src/content/areas.js'
import { ROOM_ART, HALL_ART, PASSAGE_ART } from '../../src/render/assets.js'
import { hallBackdrop, passagesIn } from '../../src/render/passages.js'
import { exitUnlocked, exitsAvailable, roomAt } from '../../src/game/map.js'
import { reduce } from '../../src/game/reducer.js'
import type { GameState } from '../../src/game/state.js'

const TITLE = { mode: 'title', meta: { runs: 0, wins: 0 } } as unknown as GameState
const start = (seed = 1): GameState => reduce(TITLE, { type: 'START_RUN', seed })
const stand = (state: GameState, roomId: string): GameState => ({
  ...state,
  run: { ...state.run!, roomId, path: [...state.run!.path, roomId] },
})

describe('the openings a painting has', () => {
  it('names a real backdrop, so no plate is seated on a room nobody painted', () => {
    for (const art of Object.keys(PASSAGE_SEATS)) {
      expect(ROOM_ART[art], `${art} has seats and no backdrop`).toBeDefined()
    }
  })

  it('names each direction once, and seats every box inside the frame', () => {
    for (const [art, seats] of Object.entries(PASSAGE_SEATS)) {
      const named = seats.map((s) => s.direction)
      expect(new Set(named).size, `${art} seats a direction twice`).toBe(named.length)
      for (const seat of seats) {
        expect(DIRECTIONS, `${art} seats a direction that is not one`).toContain(seat.direction)
        // The box is a centre and a size, so what has to be on screen is the
        // middle of it: a barrier may bleed off the frame the way the arch it
        // fills does, but its centre may not be outside the picture.
        expect(seat.x, `${art} ${seat.direction} is off the frame`).toBeGreaterThan(0)
        expect(seat.x, `${art} ${seat.direction} is off the frame`).toBeLessThan(1)
        expect(seat.y, `${art} ${seat.direction} is off the frame`).toBeGreaterThan(0)
        expect(seat.y, `${art} ${seat.direction} is off the frame`).toBeLessThan(1)
        expect(seat.width).toBeGreaterThan(0)
        expect(seat.height).toBeGreaterThan(0)
      }
    }
  })

  it('has a plate for each of the two reasons a way is shut', () => {
    expect(PASSAGE_ART.rubble.file).toContain('passages/')
    expect(PASSAGE_ART.locked.file).toContain('passages/')
    expect(HALL_ART.sealed.file).toContain('hall-collapsed')
    expect(HALL_ART.locked.file).toContain('hall-locked')
  })
})

describe('a barrier is a picture of a rule, never a second opinion', () => {
  it('agrees with the reducer about every opening, over a whole maze', () => {
    // The claim that matters: nothing here decides. For every room of several
    // seeded mazes, what the view would draw is derived from the same two
    // functions the reducer's GO guard uses, so a drawn gate and a refused
    // press cannot come apart.
    let shut = 0
    let open = 0
    for (let seed = 1; seed <= 12; seed++) {
      const state = start(seed)
      for (const id of Object.keys(state.run!.map.nodes)) {
        const at = stand(state, id)
        const here = roomAt(at.run!)
        const available = exitsAvailable(at.run!, here)
        for (const seat of passagesIn(at)) {
          const exit = here.exits.find((e) => e.direction === seat.direction)
          const truth = !exit
            ? 'sealed'
            : !available
              ? 'guarded'
              : exitUnlocked(at.run!, exit)
                ? 'open'
                : 'locked'
          expect(seat.state, `${id} ${seat.direction}`).toBe(truth)
          if (seat.state === 'open') open++
          else shut++
        }
      }
    }
    // And it is not a feature nobody sees: a maze shuts roughly as many of its
    // painted openings as it opens.
    expect(shut).toBeGreaterThan(50)
    expect(open).toBeGreaterThan(50)
  })

  it('draws nothing at all in an authored fixture', () => {
    // The reels seat their ways out on painted features rather than compass
    // seats, so an opening there is a door somebody drew open and a plate over
    // it would be a lie. `layout` is the whole of the test.
    const classic = reduce(TITLE, { type: 'START_RUN', seed: 1, layout: 'classic' })
    expect(classic.run!.map.layout).toBeUndefined()
    expect(passagesIn(classic)).toEqual([])
    expect(hallBackdrop(classic)).toBeUndefined()
  })

  it('gives the hall a repaint rather than a patch, and only when it is shut', () => {
    // The one painting whose shut state is a painting: its arch is most of the
    // frame, so a plate laid over it would read as a patch on a wall.
    const state = start(1)
    const halls = Object.keys(state.run!.map.nodes).filter(
      (id) => roomAt(stand(state, id).run!).art === 'hall',
    )
    expect(halls.length, 'seed 1 has no hall to check').toBeGreaterThan(0)
    for (const id of halls) {
      const at = stand(state, id)
      const north = passagesIn(at).find((s) => s.direction === 'north')
      const swapped = hallBackdrop(at)
      if (!north || north.state === 'open') expect(swapped, id).toBeUndefined()
      else expect(swapped?.file, id).toContain(north.state === 'sealed' ? 'collapsed' : 'locked')
    }
  })
})
