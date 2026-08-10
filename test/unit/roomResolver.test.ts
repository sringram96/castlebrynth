/**
 * Choosing a room.
 *
 * The resolver is the one place authored content is selected rather than
 * written, so what is tested is exactly the set of promises that makes that
 * safe: it never answers with a room that does not fit, it answers the same
 * way twice for the same seed, it prefers not to repeat itself, and when there
 * is nothing to answer with it says so loudly rather than picking the nearest
 * thing.
 *
 * Repetition avoidance is the one preference in the file, and the tests state
 * it as a preference: a library with one candidate repeats it, and that is
 * correct. A run must never fail because the writing has not caught up.
 */

import { describe, expect, it } from 'vitest'

import { Rng } from '../../src/game/rng.js'
import { ENEMY_LIST } from '../../src/content/enemies.js'
import { ROOM_LIBRARY } from '../../src/content/rooms.js'
import { canHost, candidatesFor, fits, preferFresh, resolveEncounter, resolveRoom } from '../../src/content/roomResolver.js'
import type { RoomRequest } from '../../src/content/roomResolver.js'
import type { RoomTemplate } from '../../src/content/roomTypes.js'

/** A request the current library can actually answer: the first fight. */
const ENCOUNTER: RoomRequest = {
  role: 'encounter',
  territory: 'ossuary',
  depth: 2,
  entrances: 1,
  exits: 1,
}

const ask = (patch: Partial<RoomRequest> = {}): RoomRequest => ({ ...ENCOUNTER, ...patch })

const template = (id: string): RoomTemplate => ROOM_LIBRARY.find((t) => t.id === id)!

describe('what the resolver will accept', () => {
  it('answers a request the library can meet', () => {
    expect(resolveRoom(ENCOUNTER, new Rng(1)).id).toBe('hollow')
  })

  it('refuses a role no template claims', () => {
    // `worked` is declared vocabulary that nothing takes as its primary job —
    // the Reliquary and the vault carry it as a tag. A plan that asked for one
    // must fail rather than quietly receive a `find`.
    expect(() => resolveRoom(ask({ role: 'worked' }), new Rng(1))).toThrow(/no room template fits/)
    expect(candidatesFor(ask({ role: 'worked' }))).toEqual([])
  })

  it('refuses the right role in the wrong territory', () => {
    expect(() => resolveRoom(ask({ territory: 'chapel' }), new Rng(1))).toThrow(/territory=chapel/)
  })

  it('refuses a room whose art cannot carry that many ways', () => {
    // The Hollow was painted as one corridor. Two exits is a second GO button
    // drawn onto a wall, and the topology is what says so.
    expect(fits(template('hollow'), ask({ exits: 2 }))).toBe(false)
    expect(fits(template('hollow'), ask({ entrances: 2 }))).toBe(false)
    expect(() => resolveRoom(ask({ exits: 2 }), new Rng(1))).toThrow(/exits=2/)
    // And the Split, which was painted as two, refuses to be one.
    expect(fits(template('fork'), { role: 'junction', territory: 'chapel', depth: 5, entrances: 1, exits: 1 })).toBe(false)
    expect(fits(template('fork'), { role: 'junction', territory: 'chapel', depth: 5, entrances: 1, exits: 2 })).toBe(true)
  })

  it('enforces a required tag', () => {
    const worked: RoomRequest = {
      role: 'find',
      territory: 'chapel',
      depth: 4,
      entrances: 1,
      exits: 1,
      requiredTags: ['worked'],
    }
    expect(resolveRoom(worked, new Rng(1)).id).toBe('reliquary')
    expect(() => resolveRoom({ ...worked, requiredTags: ['frozen'] }, new Rng(1))).toThrow(
      /requires=frozen/,
    )
  })

  it('enforces a forbidden tag', () => {
    const noWork: RoomRequest = {
      role: 'find',
      territory: 'chapel',
      depth: 4,
      entrances: 1,
      exits: 1,
      forbiddenTags: ['worked'],
    }
    expect(candidatesFor(noWork)).toEqual([])
    expect(() => resolveRoom(noWork, new Rng(1))).toThrow(/forbids=worked/)
  })

  it('never answers with a room that does not fit, over every request the library can be asked', () => {
    // The whole library, crossed with every role and territory it declares.
    for (const role of new Set(ROOM_LIBRARY.map((t) => t.role))) {
      for (const territory of new Set(ROOM_LIBRARY.map((t) => t.territory))) {
        for (const exits of [0, 1, 2]) {
          const request = ask({ role, territory, exits, entrances: 1 })
          if (candidatesFor(request).length === 0) {
            expect(() => resolveRoom(request, new Rng(3))).toThrow()
            continue
          }
          const chosen = resolveRoom(request, new Rng(3))
          expect(fits(chosen, request), `${chosen.id} does not fit ${role}/${territory}/${exits}`).toBe(true)
        }
      }
    }
  })
})

describe('what the resolver decides', () => {
  it('is a pure function of the request and the generator', () => {
    for (const seed of [1, 2, 99, 4242]) {
      expect(resolveRoom(ENCOUNTER, new Rng(seed)).id).toBe(resolveRoom(ENCOUNTER, new Rng(seed)).id)
    }
  })

  it('repeats rather than fails when it is the only candidate', () => {
    // Preference, not validity. There is one ossuary encounter today, so asking
    // for one having just used it still answers.
    const again = resolveRoom(ask({ recentTemplates: ['hollow'] }), new Rng(1))
    expect(again.id).toBe('hollow')
  })

  it('avoids what was just used, whenever avoiding it leaves anything', () => {
    // Stated against the rule itself rather than against the library, because
    // the library has no interchangeable pair in it yet — and the rule is what
    // has to be right the day it does.
    const two = [template('sanctuary'), template('reliquary')]
    expect(preferFresh(two, ['sanctuary']).map((t) => t.id)).toEqual(['reliquary'])
    expect(preferFresh(two, ['reliquary']).map((t) => t.id)).toEqual(['sanctuary'])
    expect(preferFresh(two, []).map((t) => t.id)).toEqual(['sanctuary', 'reliquary'])
    // Both recent, so there is nothing fresh to prefer: draw from all of them
    // rather than from none.
    expect(preferFresh(two, ['sanctuary', 'reliquary'])).toHaveLength(2)
    // And the one-candidate case, which is the whole library today.
    expect(preferFresh([template('hollow')], ['hollow']).map((t) => t.id)).toEqual(['hollow'])
  })

  it('draws only from the preferred pool, on every seed', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const chosen = resolveRoom(ask({ recentTemplates: ['hollow'] }), new Rng(seed))
      expect(preferFresh(candidatesFor(ask()), ['hollow'])).toContain(chosen)
    }
  })
})

describe('what may stand in a room', () => {
  it('lets a picture hold only the encounters it was painted for', () => {
    expect(canHost(template('hollow'), 'gnawing')).toBe(true)
    expect(canHost(template('hollow'), 'warden')).toBe(false)
    expect(canHost(template('gate'), 'warden')).toBe(true)
    expect(canHost(template('gate'), 'gnawing')).toBe(false)
    expect(canHost(template('deep'), 'marrow')).toBe(true)
    // A chapel painted around a basin holds nothing at all.
    expect(canHost(template('sanctuary'), 'marrow')).toBe(false)
    expect(canHost(template('reliquary'), 'gnawing')).toBe(false)
  })

  it('agrees with every authored room that names its own fight', () => {
    for (const t of ROOM_LIBRARY) {
      if (!t.enemy) continue
      expect(canHost(t, t.enemy), `${t.id} cannot hold ${t.enemy}`).toBe(true)
    }
  })

  it('gives every encounter somewhere it can stand, and somewhere it cannot', () => {
    for (const e of ENEMY_LIST) {
      const homes = ROOM_LIBRARY.filter((t) => canHost(t, e.id))
      expect(homes.length, `${e.id} has nowhere to stand`).toBeGreaterThan(0)
      expect(homes.length, `${e.id} fits everywhere, so the rule means nothing`).toBeLessThan(
        ROOM_LIBRARY.length,
      )
    }
  })

  it('puts nothing in a room with nothing to put', () => {
    expect(resolveEncounter(template('passage'), {}, new Rng(1))).toBeUndefined()
    expect(resolveEncounter(template('reliquary'), {}, new Rng(1))).toBeUndefined()
  })

  it('answers with the authored fight when the room names one', () => {
    expect(resolveEncounter(template('hollow'), { threat: 'low' }, new Rng(1))).toBe('gnawing')
    expect(resolveEncounter(template('gate'), { threat: 'keeper' }, new Rng(1))).toBe('warden')
  })

  it('refuses a threat band the room was not built for', () => {
    expect(() => resolveEncounter(template('hollow'), { threat: 'keeper' }, new Rng(1))).toThrow(
      /cannot host its own enemy/,
    )
  })
})
