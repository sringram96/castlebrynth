import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  END_LINES,
  GRAMMAR,
  HAND_SIZE,
  PLAIN_POUCH,
  ROOM_BOOK,
  lintVoice,
} from '../src/content/index.js'
import { enterRoom } from '../src/descent/index.js'
import { deal } from '../src/gen/index.js'
import { routeDeath } from '../src/hinge/index.js'
import type { Ledgers, Seed } from '../src/state/index.js'
import { THE_SCRAWL, firstPermanent, wake } from '../src/state/index.js'

/**
 * **The scrawl loop** (card 68, the mind wave).
 *
 * rules/voice.md as amended: the amnesia is canon. Death is forgetting, the
 * permanent ledger is what is written down and what he still knows, and the
 * two ends of that meet here — *every ending is him scrawling one line in a
 * last moment of clarity, and every waking opens on the last thing he wrote,
 * which he does not remember writing.*
 *
 * The whole of it is testable without a browser, because none of it is
 * presentation: the Book is state, the waking is a room, and the candle is
 * the join.
 */

const seedOf = (n: number): Seed => n as unknown as Seed

function woken(seed = 3): { ledgers: Ledgers; first: string } {
  const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), seedOf(seed))
  return { ledgers, first: firstCandle(ledgers, seed) }
}

/** The first thing the game says, standing where the player stands. */
function firstCandle(ledgers: Ledgers, seed: number): string {
  const chain = deal(seedOf(seed), 1, CATALOG, GRAMMAR, ledgers.run!.history)
  return enterRoom(ledgers, chain, ROOM_BOOK, chain.start).beats[0] ?? ''
}

describe('the scrawl loop — the waking opens on the last thing he wrote', () => {
  it('opens the first waking on the oldest scrawl there is', () => {
    // The first words of the game, before a room says anything of its own.
    expect(woken().first).toBe(END_LINES[THE_SCRAWL.cause])
    expect(woken().first).toBe('you must find him')
  })

  it('opens the next waking on the line the death wrote', () => {
    const { ledgers } = woken(11)
    // He dies to the Gnawing, and gets one line down.
    const after = routeDeath(ledgers, 'end.gnawing')
    expect(after.permanent.bookOfEnds.at(-1)?.cause).toBe('end.gnawing')
    // And wakes reading it, with no memory of having written it.
    expect(firstCandle(after, after.run!.seed as unknown as number))
      .toBe(END_LINES['end.gnawing'])
  })

  it('keeps the Crossing’s own words after it, in order', () => {
    const { ledgers, first } = woken(5)
    const chain = deal(seedOf(5), 1, CATALOG, GRAMMAR, ledgers.run!.history)
    const beats = enterRoom(ledgers, chain, ROOM_BOOK, chain.start).beats
    // The scrawl, and then the room — a room's own candles are untouched by
    // being read second.
    expect(beats[0]).toBe(first)
    expect(beats.slice(1, 1 + ROOM_BOOK.beats(chain.nodes[0]!.room).length))
      .toEqual(ROOM_BOOK.beats(chain.nodes[0]!.room))
  })

  it('says it only at the waking — no other room opens on his handwriting', () => {
    const { ledgers } = woken(7)
    const chain = deal(seedOf(7), 1, CATALOG, GRAMMAR, { taken: [0, 0, 0] })
    for (const node of chain.nodes.slice(1)) {
      const beats = enterRoom(ledgers, chain, ROOM_BOOK, node.instance).beats
      for (const said of Object.values(END_LINES)) expect(beats).not.toContain(said)
    }
  })

  /**
   * A note that lies to the next man is worse than no note at all. The two
   * that carry a lesson are checked against the scripts they are about in
   * `test/lots.*`; what is checked here is that every cause the game can end
   * on has a line to write, because a waking with nothing to open on would
   * silently drop the loop.
   */
  it('has a line for every ending the game can write', () => {
    for (const cause of ['end.gnawing', 'end.marrow', 'end.warden', 'end.kept', 'end.abandoned']) {
      expect(END_LINES[cause], cause).toBeTruthy()
      expect(ROOM_BOOK.scrawl(cause), cause).toBe(END_LINES[cause])
    }
    // And an ending nobody authored says nothing rather than saying its id.
    expect(ROOM_BOOK.scrawl('end.nonesuch')).toBe('')
  })

  it('holds every scrawl to the written voice, not the thinking one', () => {
    for (const [cause, said] of Object.entries(END_LINES)) {
      expect(lintVoice(said, 'scrawl'), cause).toEqual([])
    }
  })
})
