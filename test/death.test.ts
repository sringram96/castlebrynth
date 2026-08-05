import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  CROSSING,
  GRAMMAR,
  HAND_SIZE,
  PLAIN_POUCH,
  ROOM_BOOK,
  THE_OSSUARY,
  WARDEN,
} from '../src/content/index.js'
import { act, chooseDoor, doors, enterRoom } from '../src/descent/index.js'
import { deal, hereIn } from '../src/gen/index.js'
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
import { DEALER, seedOf } from './drift.js'

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
  about: 'room.lair.den' as RoomId,
}

describe('death — art. 32 (every death reseeds), art. 11 (the permanent survives)', () => {
  it('burns the run, writes one line, and wakes you at the Crossing', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const ledgers = wake(permanent, seedOf(31))
    const chain = deal(seedOf(31), 1, CATALOG, GRAMMAR)

    // Get somewhere, take something, learn something. art. 80 puts the one
    // required thing somewhere in the path, so walk until it is underfoot.
    let here = { ledgers, chain }
    let taking: readonly { readonly id: string }[] = []
    for (let n = 0; n < 12; n++) {
      const node = hereIn(here.chain)!
      const bands = enterRoom(here.ledgers, here.chain, ROOM_BOOK, node.instance)
      // What burns at death is what the run *carries*, so this walks to a
      // thing that is picked up. art. 40's mercies are acts too and give
      // nothing to the hand — the breath is health, and health burns anyway.
      const acts = bands.tray
        .flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
        .filter((one) => one.gives.length > 0)
      if (acts.length > 0) {
        here = { ...here, ledgers: act(here.ledgers, acts[0]!) }
        taking = acts
        break
      }
      const walked = chooseDoor(here.ledgers, here.chain, ROOM_BOOK, doors(bands)[0]!, DEALER)
      here = { ledgers: walked.ledgers, chain: walked.chain }
    }
    expect(taking.length).toBeGreaterThan(0)
    const carrying = here.ledgers
    const knowing = {
      ...carrying,
      permanent: collect(learn(carrying.permanent, CLUE), THE_OSSUARY),
    }
    expect(knowing.run!.carried).toHaveLength(1)

    const woken = routeDeath(knowing, 'end.gnawing')

    // The run burned: nothing carried, back at the Crossing, whole again.
    expect(woken.run!.carried).toEqual([])
    expect(woken.run!.at).toEqual({
      room: CROSSING,
      instance: chain.start,
      step: 0,
      beat: 0,
    })
    // art. 36: the history burns with the run, so the next one is not this
    // one replayed from halfway down.
    expect(woken.run!.history.taken).toEqual([])
    expect(woken.run!.health).toBe(BARE_BODY.health)
    expect(woken.run!.seed).not.toBe(knowing.run!.seed)

    // The permanent survived: the clue, the keepsake, the Book (arts 10–11).
    expect(woken.permanent.known).toEqual([CLUE])
    expect(woken.permanent.keepsakes).toEqual([THE_OSSUARY])
    expect(woken.permanent.bookOfEnds).toEqual([
      { seed: knowing.run!.seed, depth: 1, cause: 'end.gnawing' },
    ])
  })

  it('reseeds the run, so the arrangement is not the one that killed you (art. 32)', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const first = wake(permanent, seedOf(31))
    const woken = routeDeath(first, 'end.gnawing')
    const before = deal(first.run!.seed, 1, CATALOG, GRAMMAR, { taken: [0, 0, 0, 0] })
    const after = deal(woken.run!.seed, 1, CATALOG, GRAMMAR, { taken: [0, 0, 0, 0] })
    expect(after.seed).not.toBe(before.seed)
    // The same choices off a new seed are a different road entirely.
    expect(after.nodes.map((node) => node.room)).not.toEqual(
      before.nodes.map((node) => node.room),
    )
    // Anchors never move, whatever the seed does (art. 37).
    expect(after.start).toBe(before.start)
    expect(after.nodes[0]!.room).toBe(CROSSING)
    // And the Warden still ends it, wherever the drift takes the run.
    const finished = deal(woken.run!.seed, 1, CATALOG, GRAMMAR, {
      taken: [0, 0, 0, 0, 0, 0, 0, 0],
    })
    expect(finished.nodes.at(-1)!.room).toBe(WARDEN)
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
