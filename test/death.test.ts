import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  GRAMMAR,
  HAND_SIZE,
  PLAIN_POUCH,
  ROOM_BOOK,
  THE_OSSUARY,
  WARDEN,
} from '../src/content/index.js'
import { act, chooseDoor, doors, enterRoom } from '../src/descent/index.js'
import { deal } from '../src/gen/index.js'
import { routeDeath } from '../src/hinge/index.js'
import type { Clue, ClueId, RoomId, Vault } from '../src/state/index.js'
import {
  collect,
  finish,
  firstPermanent,
  learn,
  load,
  memoryVault,
  save,
  snapshot,
  wake,
} from '../src/state/index.js'
import { seedOf } from './helpers.js'

/**
 * Death is the progression system (arts 11, 32). The run burns, one line
 * goes into the Book of Ends, the chain reseeds, and everything that
 * matters is still there after a reload.
 */
function killable(): { vault: Vault; kill: () => Vault } {
  const written = new Map<string, string>()
  const open = (store: Map<string, string>): Vault => ({
    read: (key) => store.get(key) ?? null,
    write: (key, value) => void store.set(key, value),
  })
  return { vault: open(written), kill: () => open(new Map(written)) }
}

const CLUE: Clue = {
  id: 'clue.gnawing.bellow' as ClueId,
  about: 'room.lair.gnawing' as RoomId,
}

describe('death — art. 32 (every death reseeds), art. 11 (the permanent survives)', () => {
  it('burns the run, writes one line, and wakes you at the Crossing', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const ledgers = wake(permanent, seedOf(31))
    const chain = deal(seedOf(31), 1, CATALOG, GRAMMAR)

    // Get somewhere, take something, learn something.
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, chain.start)
    const walked = chooseDoor(ledgers, chain, doors(bands)[0]!)
    const trove = chain.nodes.find((node) => node.type === 'trove')!
    const taking = enterRoom(walked, chain, ROOM_BOOK, trove.room).tray.flatMap((offer) =>
      offer.kind === 'act' ? [offer.act] : [],
    )
    const carrying = act(walked, taking[0]!)
    const knowing = {
      ...carrying,
      permanent: collect(learn(carrying.permanent, CLUE), THE_OSSUARY),
    }
    expect(knowing.run!.carried).toHaveLength(1)

    const woken = routeDeath(knowing, 'end.gnawing')

    // The run burned: nothing carried, back at the Crossing, whole again.
    expect(woken.run!.carried).toEqual([])
    expect(woken.run!.at).toEqual({ room: chain.start, step: 0, beat: 0 })
    expect(woken.run!.health).toBe(BARE_BODY.health)
    expect(woken.run!.seed).not.toBe(knowing.run!.seed)

    // The permanent survived: the clue, the keepsake, the Book (arts 10–11).
    expect(woken.permanent.known).toEqual([CLUE])
    expect(woken.permanent.keepsakes).toEqual([THE_OSSUARY])
    expect(woken.permanent.bookOfEnds).toEqual([
      { seed: knowing.run!.seed, depth: 1, cause: 'end.gnawing' },
    ])
  })

  it('reseeds the chain, so the arrangement is not the one that killed you (art. 32)', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const first = wake(permanent, seedOf(31))
    const woken = routeDeath(first, 'end.gnawing')
    const before = deal(first.run!.seed, 1, CATALOG, GRAMMAR)
    const after = deal(woken.run!.seed, 1, CATALOG, GRAMMAR)
    expect(after.seed).not.toBe(before.seed)
    // Anchors never move, whatever the seed does (art. 37).
    expect(after.start).toBe(before.start)
    expect(after.nodes.at(-1)!.room).toBe(WARDEN)
  })

  it('leaves the permanent intact and the run virgin across a reload (arts 11, 36)', () => {
    const { vault, kill } = killable()
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const ledgers = { ...wake(permanent, seedOf(32)) }
    const grown = {
      ...ledgers,
      permanent: collect(learn(ledgers.permanent, CLUE), THE_OSSUARY),
    }
    const woken = routeDeath(grown, 'end.gnawing')
    save(woken, vault)

    const restored = load(kill())
    expect(restored).not.toBeNull()
    expect(snapshot(restored!)).toEqual(snapshot(woken))
    expect(restored!.permanent.bookOfEnds).toHaveLength(1)
    expect(restored!.permanent.known).toEqual([CLUE])
    expect(restored!.permanent.keepsakes).toEqual([THE_OSSUARY])
    expect(restored!.run!.carried).toEqual([])
    expect(restored!.run!.fight).toBeNull()
  })

  it("writes a different line for the Warden's door, and keeps the Book (art. 11)", () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const ledgers = wake(permanent, seedOf(33))
    const died = routeDeath(ledgers, 'end.gnawing')
    const finished = finish(died, 'end.warden')
    expect(finished.bookOfEnds.map((line) => line.cause)).toEqual(['end.gnawing', 'end.warden'])

    // And a fresh waking off the finish keeps every line of it.
    const again = wake(finished, seedOf(34))
    expect(again.permanent.bookOfEnds).toHaveLength(2)
    expect(again.run!.at.step).toBe(0)
  })

  it('makes the first die you collect your signature, and only the first (art. 56)', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    expect(permanent.signature).toBeNull()
    const pale = PLAIN_POUCH.dice.at(-1)!
    const signed = collect(permanent, pale)
    expect(signed.signature).toBe(pale.id)
    // Already in the pouch: taking it names it, and does not duplicate it.
    expect(signed.pouch.dice).toHaveLength(PLAIN_POUCH.dice.length)
    const later = collect(signed, PLAIN_POUCH.dice[0]!)
    expect(later.signature).toBe(pale.id)
  })
})
