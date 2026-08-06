import { describe, expect, it } from 'vitest'

import { ROOM_BOOK } from '../src/content/index.js'
import type { Pick } from '../src/descent/index.js'
import {
  actsIn,
  doors,
  enterRoom,
  isPicked,
  looking,
  onArrival,
  picking,
  pickedDoor,
  summoned,
  tappablesIn,
} from '../src/descent/index.js'
import type { Chain, ChainNode, Door } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import type { Ledgers } from '../src/state/index.js'
import { hasLooked } from '../src/state/index.js'
import { opened } from './drift.js'

/**
 * The pick follows the thumb (card 63, art. 71 as strengthened 2026-08-06).
 *
 * **The act strip serves the last look.** The defect: a picked door stayed
 * picked, so tapping an urn and pressing the door verb still sitting in the
 * strip took you through a door you were not looking at. Attention moved and
 * the commit did not.
 *
 * What the shell does with these answers is the shell's; what is law is here.
 */

/** The first room on any of these seeds that offers a choice of doors. */
function crossroads(): { ledgers: Ledgers; chain: Chain; node: ChainNode } {
  for (let seed = 1; seed <= 200; seed++) {
    const { ledgers, chain } = opened(seed)
    const node = hereIn(chain)
    if (node !== null && node.doors.length > 1) return { ledgers, chain, node }
  }
  throw new Error('no seed in two hundred opened on a room with a choice')
}

/**
 * The act strip, as `roomActs` builds it: the verbs looking has summoned, and
 * then the door verb — *if* a door is picked.
 */
function strip(ledgers: Ledgers, chain: Chain, node: ChainNode, held: Pick): readonly string[] {
  const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
  const summonedVerbs = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act.id] : []))
  const door = pickedDoor(held, doors(bands))
  return [...summonedVerbs, ...(door === null ? [] : ['open'])]
}

/** Standing where the shell stands, so `looking` keys on this room. */
function standing(ledgers: Ledgers, node: ChainNode): Ledgers {
  return {
    ...ledgers,
    run: {
      ...ledgers.run!,
      at: { room: node.room, instance: node.instance, step: node.step, beat: 0 },
    },
  }
}

describe('art. 71 — the act strip serves the last look', () => {
  it('picks the first door on arrival, so leaving costs what it always did', () => {
    const { chain, node } = crossroads()
    const held = onArrival(node.doors)
    expect(held).toBe(node.doors[0]!.at)
    expect(pickedDoor(held, node.doors)).toBe(node.doors[0])
    void chain
  })

  it('releases the pick the moment anything else is tapped', () => {
    const { ledgers, chain, node } = crossroads()
    const target = tappablesIn(ROOM_BOOK, node)[0]!

    const held = picking({ kind: 'door', door: node.doors[1]! })
    expect(strip(ledgers, chain, node, held)).toContain('open')

    // The urn. The thumb is looking at it now, so the door lets go.
    const after = picking({ kind: 'thing', id: target.id })
    expect(after).toBeNull()
    expect(pickedDoor(after, node.doors)).toBeNull()
    expect(strip(ledgers, chain, node, after)).not.toContain('open')
  })

  it('re-picks in one tap, and the door it commits is the one picked', () => {
    const { ledgers, chain, node } = crossroads()
    const target = tappablesIn(ROOM_BOOK, node)[0]!
    const second = node.doors[1]!

    let held = picking({ kind: 'door', door: second })
    held = picking({ kind: 'thing', id: target.id })
    expect(strip(ledgers, chain, node, held)).not.toContain('open')

    held = picking({ kind: 'door', door: second })
    expect(strip(ledgers, chain, node, held)).toContain('open')
    // And it is *that* door — never whichever one the strip felt like.
    expect(pickedDoor(held, node.doors)!.at).toBe(second.at)
  })

  it('never commits a door the room is not offering (art. 31)', () => {
    const { node } = crossroads()
    const stale: Pick = 97
    expect(pickedDoor(stale, node.doors)).toBeNull()
    expect(pickedDoor(onArrival([]), [])).toBeNull()
  })

  it('outlines exactly the door that is picked, and no other (art. 70)', () => {
    const { node } = crossroads()
    const held = picking({ kind: 'door', door: node.doors[1]! })
    const lit = node.doors.filter((door: Door) => isPicked(held, door))
    expect(lit).toEqual([node.doors[1]])
    expect(node.doors.filter((door: Door) => isPicked(null, door))).toEqual([])
  })
})

describe('art. 68 — the summons is knowledge, and the pick is attention', () => {
  /**
   * The one thing this ruling may not cost: a verb looking summoned lives on
   * the ledger and survives the pick's release. A tap releases the door *and*
   * summons the take, in the same press.
   */
  it('leaves a summoned Take standing when the pick is released', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { ledgers, chain } = opened(seed)
      const node = hereIn(chain)
      if (node === null || node.doors.length === 0) continue
      const one = actsIn(ROOM_BOOK, node).find((held) => held.about !== undefined)
      if (one === undefined) continue
      const target = tappablesIn(ROOM_BOOK, node).find((held) => held.id === one.about)
      if (target === undefined) continue

      const before = standing(ledgers, node)
      expect(summoned(before.run, node.instance, one)).toBe(false)

      // The one press: the door lets go, and the verb arrives.
      const held = picking({ kind: 'thing', id: target.id })
      const after = looking(before, target)
      expect(held).toBeNull()
      expect(hasLooked(after.run, node.instance, target.id)).toBe(true)
      expect(summoned(after.run, node.instance, one)).toBe(true)
      expect(strip(after, chain, node, held)).toContain(one.id)
      expect(strip(after, chain, node, held)).not.toContain('open')
      // And re-picking the door does not un-summon it.
      const back = picking({ kind: 'door', door: node.doors[0]! })
      expect(strip(after, chain, node, back)).toContain(one.id)
      expect(strip(after, chain, node, back)).toContain('open')
      return
    }
    throw new Error('no seed in two hundred opened on a room with a summonable act')
  })
})
