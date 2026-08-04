import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  GRAMMAR,
  HAND_SIZE,
  NOTICES,
  PLAIN_POUCH,
  ROOMS,
  ROOM_BOOK,
  WARDEN_KEY_ITEM,
} from '../src/content/index.js'
import { act, canOpen, chooseDoor, doors, enterRoom, heldBack, mayLeave } from '../src/descent/index.js'
import type { Chain, Door } from '../src/gen/index.js'
import { deal } from '../src/gen/index.js'
import type { Ledgers, RoomId } from '../src/state/index.js'
import { firstPermanent, movedTo, wake } from '../src/state/index.js'
import { seedOf } from './helpers.js'

/**
 * art. 3 — a run cannot become unwinnable through no fault of the player's
 * understanding — read together with art. 9, which says there is no back.
 *
 * art. 33 binds the generator and holds: the key is always upstream of its
 * lock. What it never said is that the player is *carrying* it. The playtest
 * walked past the key and through the door, and the run was over before it
 * could be known to be over.
 */
function opened(seed: number) {
  const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), seedOf(seed))
  return { ledgers, chain: deal(seedOf(seed), 1, CATALOG, GRAMMAR) }
}

/**
 * Every way through a chain, under the law. At each room the required acts
 * must be done before any door commits; a door only opens if what it demands
 * is carried. Returns the rooms that could be reached with a door that
 * refused for want of a key — a stranded run.
 */
function bareWalk(ledgers: Ledgers, chain: Chain, door: Door): Ledgers {
  const step = chain.nodes.findIndex((node) => node.room === door.to)
  return {
    ...ledgers,
    run: movedTo(ledgers.run!, { room: door.to, step, beat: 0 }),
  }
}

function stranded(chain: Chain, ledgers: Ledgers, obeyTheLaw: boolean): readonly RoomId[] {
  const dead: RoomId[] = []
  const seen = new Set<string>()
  const walk = (here: Ledgers): void => {
    const room = here.run!.at.room
    const stamp = `${room}|${[...here.run!.carried].sort().join(',')}`
    if (seen.has(stamp)) return
    seen.add(stamp)

    // arts 3, 68: taking stays a deliberate act, so both branches exist —
    // the player may take, and (without the law) may also walk on.
    const acts = ROOM_BOOK.acts(room).filter(
      (one) => !one.gives.every((item) => here.run!.carried.includes(item)),
    )
    for (const one of acts) walk(act(here, one))

    if (obeyTheLaw && !mayLeave(here, ROOM_BOOK, room)) return

    const bands = enterRoom(here, chain, ROOM_BOOK, room)
    const ahead = doors(bands)
    if (ahead.length === 0) return
    let moved = false
    for (const door of ahead) {
      if (!canOpen(here, door)) continue
      moved = true
      // The Warden's door ends the depth rather than committing a room.
      if (door.ends === true) continue
      // Without the law, the walk is the bare move `chooseDoor` used to be:
      // this is the skeleton the playtest played, reproduced exactly.
      walk(obeyTheLaw ? chooseDoor(here, chain, ROOM_BOOK, door) : bareWalk(here, chain, door))
    }
    // Every door here refused, and there is no back (art. 9).
    if (!moved) dead.push(room)
  }
  walk(ledgers)
  return dead
}

describe('art. 3 — a run can never be walked into unwinnable', () => {
  it('marks the one thing the depth requires, and marks nothing else', () => {
    const required = ROOMS.flatMap((held) => held.acts.filter((one) => one.required))
    expect(required.map((one) => one.id)).toEqual(['act.take-key'])
    expect(required[0]!.gives).toEqual([WARDEN_KEY_ITEM])
    // Every act declares the flag rather than leaving it to be inferred.
    for (const held of ROOMS) {
      for (const one of held.acts) expect(typeof one.required).toBe('boolean')
    }
  })

  it('names what a room still holds back, and stops naming it once taken', () => {
    const { ledgers, chain } = opened(11)
    const trove = chain.nodes.find((node) => node.type === 'trove')!
    expect(heldBack(ledgers, ROOM_BOOK, trove.room).map((one) => one.id)).toEqual([
      'act.take-key',
    ])
    expect(mayLeave(ledgers, ROOM_BOOK, trove.room)).toBe(false)

    const bands = enterRoom(ledgers, chain, ROOM_BOOK, trove.room)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    const holding = act(ledgers, taking[0]!)
    expect(heldBack(holding, ROOM_BOOK, trove.room)).toEqual([])
    expect(mayLeave(holding, ROOM_BOOK, trove.room)).toBe(true)
  })

  it('refuses to commit a door while a required thing lies in the room', () => {
    const { ledgers, chain } = opened(11)
    const trove = chain.nodes.find((node) => node.type === 'trove')!
    const standing: Ledgers = {
      ...ledgers,
      run: { ...ledgers.run!, at: { room: trove.room, step: 1, beat: 0 } },
    }
    const bands = enterRoom(standing, chain, ROOM_BOOK, trove.room)
    const door = doors(bands)[0]!
    expect(() => chooseDoor(standing, chain, ROOM_BOOK, door)).toThrow(/art\. 3/)

    // And the line the shell says is a stop, not a hint: it names nothing.
    const said = NOTICES['door.held'] ?? ''
    expect(said.length).toBeGreaterThan(0)
    expect(said.toLowerCase()).not.toContain('key')
    expect(said.toLowerCase()).not.toContain('alcove')
  })

  it('lets a room with nothing required in it be left at once (art. 4)', () => {
    const { ledgers, chain } = opened(11)
    for (const node of chain.nodes) {
      if (node.type === 'trove') continue
      expect(mayLeave(ledgers, ROOM_BOOK, node.room), node.room as string).toBe(true)
    }
  })

  /**
   * The proof: no sequence of legal door choices reaches a lock without what
   * opens it. Searched over the carried-set as well as the room, so a path
   * that skipped a take is a path the search would have found.
   */
  it('leaves no seeded run that can be walked into a refusal', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { ledgers, chain } = opened(seed)
      expect(stranded(chain, ledgers, true), `seed ${seed}`).toEqual([])
    }
  })

  /**
   * And the control, so the test is not vacuous: with the law switched off,
   * the same chains strand — which is the playtest, reproduced.
   */
  it('strands the same runs the moment the law is switched off', () => {
    const failing = []
    for (let seed = 1; seed <= 20; seed++) {
      const { ledgers, chain } = opened(seed)
      if (stranded(chain, ledgers, false).length > 0) failing.push(seed)
    }
    expect(failing).toHaveLength(20)
  })
})
