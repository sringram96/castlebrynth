/**
 * art. 118 — **nothing may be a dead press.**
 *
 * The defect this closes is the only one in the playtest of 2026-08-06 that
 * could end a session: a bot pressed Open twelve times in one room, was told
 * *"Something here is still yours to take"* every time, and never left. The
 * strip was unchanged, the world was unchanged, and nothing on the frame
 * named what was owed.
 *
 * Every assertion below fails against the code as it stood that morning.
 */

import { describe, expect, it } from 'vitest'

import { ENCOUNTERS, LOOKS, NOTICES, ROOMS, ROOM_BOOK, encounterWords } from '../src/content/index.js'
import type { Act, Tappable } from '../src/descent/index.js'
import {
  act,
  actsIn,
  chooseDoor,
  enterRoom,
  heldBack,
  look,
  mayLeave,
  moves,
  tappablesIn,
  withholding,
} from '../src/descent/index.js'
import { wayOn } from '../src/shell/strip.js'
import type { Bands } from '../src/descent/index.js'
import type { WorldMark } from '../src/room/index.js'
import { hereIn } from '../src/gen/index.js'
import { wounded } from '../src/state/index.js'
import { DEALER, greet, lookAround, opened, takeable, walkTo } from './drift.js'

/** Anywhere; these tests ask what a socket *says*, never where it stands. */
const NOWHERE: WorldMark = { X: 0, Y: 0, z: 1, width: 1, height: 1 }

const trayActs = (bands: Bands): readonly string[] =>
  bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act.id] : []))

/** Every act the game can ever offer, and the things it can be looked at on. */
function everyContext(): readonly {
  readonly where: string
  readonly acts: readonly Act[]
  readonly tappables: readonly Tappable[]
}[] {
  return [
    ...ROOMS.map((room) => ({
      where: room.id as string,
      acts: room.acts,
      tappables: room.tappables,
    })),
    ...ENCOUNTERS.map((who) => {
      const words = encounterWords(who.id, NOWHERE)
      return { where: who.id as string, acts: words.acts, tappables: words.tappables }
    }),
  ]
}

describe('art. 118 — an act that cannot change anything is not offered', () => {
  it('withholds a mercy from a whole body and gives it back to an open one', () => {
    const found = walkTo(1, (node) => node.type === 'sanctum')
    expect(found, 'seed 1 walks through a sanctum').not.toBeNull()
    const { ledgers, chain, node } = found!
    expect(ledgers.run!.health).toBe(ledgers.run!.healthMax)

    const drink = actsIn(ROOM_BOOK, node).find((one) => one.heals !== undefined)!
    expect(moves(ledgers, drink), 'a whole body moves nothing by drinking').toBe(false)
    expect(trayActs(enterRoom(ledgers, chain, ROOM_BOOK, node.instance))).not.toContain(drink.id)

    const hurt = { ...ledgers, run: wounded(ledgers.run!, 7) }
    expect(moves(hurt, drink)).toBe(true)
    expect(trayActs(enterRoom(hurt, chain, ROOM_BOOK, node.instance))).toContain(drink.id)
  })

  it('takes the door verb away rather than offering a press that fails', () => {
    // art. 80 puts the depth's required key somewhere in the path, and the
    // room it lands in is exactly the room the bot could not escape.
    const held = walkTo(1, (node) => heldBack(opened(1).ledgers, ROOM_BOOK, node).length > 0)
    expect(held, 'seed 1 holds a room back for something').not.toBeNull()
    const { chain, node } = held!
    let ledgers = lookAround(held!.ledgers, node)

    const owed = heldBack(ledgers, ROOM_BOOK, node)
    expect(owed.length, 'the room is owed something').toBeGreaterThan(0)
    expect(node.doors.length).toBeGreaterThan(0)

    // art. 118: no door of this room offers a way on while it is owed.
    for (const door of node.doors) {
      expect(wayOn(ledgers, ROOM_BOOK, node, door, false)).toBeNull()
      expect(mayLeave(ledgers, ROOM_BOOK, node, door)).toBe(false)
    }
    // And the door's own answer is what says so — a stop, naming nothing.
    expect((NOTICES['door.held'] ?? '').length).toBeGreaterThan(0)

    // Take what is owed and the way on appears. One press, not twelve.
    for (const one of owed) ledgers = act(ledgers, one)
    expect(heldBack(ledgers, ROOM_BOOK, node)).toEqual([])
    const ways = node.doors.map((door) => wayOn(ledgers, ROOM_BOOK, node, door, false))
    expect(ways.some((way) => way !== null), 'the room lets go once it is paid').toBe(true)

    void chain
  })

  it('never offers a verb whose press would leave the ledgers untouched', () => {
    // The strongest form of the article, asked of a whole walk: every act the
    // strip is holding, in every room of a depth, actually does something.
    let { ledgers, chain } = opened(7)
    ledgers = greet(ledgers, chain)
    let pressed = 0
    for (let n = 0; n < chain.length + 2; n++) {
      const node = hereIn(chain)
      if (node === null) break
      ledgers = lookAround(ledgers, node)
      for (const offer of enterRoom(ledgers, chain, ROOM_BOOK, node.instance).tray) {
        if (offer.kind !== 'act') continue
        const after = act(ledgers, offer.act)
        expect(after, `${offer.act.id} in ${node.instance} is a dead press`).not.toBe(ledgers)
        ledgers = after
        pressed += 1
      }
      const door = node.doors[0]
      if (door === undefined || door.ends === true) break
      if (wayOn(ledgers, ROOM_BOOK, node, door, false) === null) break
      const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
      ledgers = walked.ledgers
      chain = walked.chain
      ledgers = greet(ledgers, chain)
    }
    expect(pressed, 'the walk pressed something').toBeGreaterThan(0)
  })
})

describe('art. 118 — a withheld act says what withholds it', () => {
  it('gives the basin a second answer while the breath is being kept', () => {
    const { ledgers, chain, node } = walkTo(1, (one) => one.type === 'sanctum')!
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const kept = tappablesIn(ROOM_BOOK, node).find((one) =>
      withholding(ledgers, ROOM_BOOK, node, one.id),
    )
    expect(kept, 'the whole body is being kept from something').toBeDefined()

    const withheld = look(ROOM_BOOK, bands, kept!, [], true).text
    const plain = look(ROOM_BOOK, bands, kept!, [], false).text
    // art. 69: it answers either way, and art. 118: the two answers differ.
    expect(withheld.length).toBeGreaterThan(0)
    expect(plain.length).toBeGreaterThan(0)
    expect(withheld).not.toBe(plain)

    // Open, the verb is back and nothing is being withheld to explain.
    const hurt = { ...ledgers, run: wounded(ledgers.run!, 7) }
    expect(withholding(hurt, ROOM_BOOK, node, kept!.id)).toBe(false)
  })

  it('authors a kept answer for every act that can be withheld', () => {
    // Every mercy in the catalog is an act art. 40 can hold back, so every
    // one owes a second sentence. This is the clause that stops a new mercy
    // shipping as an absence with nothing behind it.
    const mercies = everyContext().flatMap((context) =>
      context.acts.filter((one) => one.heals !== undefined),
    )
    expect(mercies.length).toBeGreaterThan(0)
    for (const one of mercies) {
      expect(one.about, `${one.id} is about a thing`).toBeDefined()
      expect(
        (LOOKS[`${one.about}.kept`] ?? '').length,
        `${one.about} has no answer for a withheld ${one.id}`,
      ).toBeGreaterThan(0)
    }
  })
})

describe('art. 118 — a stop is only ever for something on the frame', () => {
  it('keeps every required act about a thing that context can be looked at for', () => {
    // The clause that makes the other two safe: art. 3 may stay silent about
    // *which* thing, but it may not hold a run for a thing no tap reaches.
    let required = 0
    for (const context of everyContext()) {
      for (const one of context.acts) {
        if (!one.required) continue
        required += 1
        expect(one.about, `${one.id} in ${context.where} is required and about nothing`).toBeDefined()
        expect(
          context.tappables.map((held) => held.id),
          `${context.where} holds the run back for ${one.about}, which nothing on its frame answers for`,
        ).toContain(one.about)
      }
    }
    expect(required, 'the depth requires something of somebody').toBeGreaterThan(0)
  })

  it('holds no dealt room back for a thing it does not also put on the frame', () => {
    // The same clause asked of rooms as dealt rather than as authored: a
    // socket's required act has to be tappable in whatever room it lands in.
    for (let seed = 1; seed <= 40; seed++) {
      let { ledgers, chain } = opened(seed)
      for (let n = 0; n < chain.length + 2; n++) {
        const node = hereIn(chain)
        if (node === null) break
        const reachable = new Set(tappablesIn(ROOM_BOOK, node).map((one) => one.id))
        for (const one of heldBack(ledgers, ROOM_BOOK, node)) {
          expect(
            reachable.has(one.about ?? ''),
            `seed ${seed}: ${node.instance} is held for ${one.id}, which no tap reaches`,
          ).toBe(true)
        }
        ledgers = lookAround(ledgers, node)
        for (const one of takeable(ledgers, node).filter((held) => held.required)) {
          ledgers = act(ledgers, one)
        }
        const door = node.doors[0]
        if (door === undefined || door.ends === true) break
        const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
        ledgers = walked.ledgers
        chain = walked.chain
      }
    }
  })
})
