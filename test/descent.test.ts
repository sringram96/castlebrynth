import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  GRAMMAR,
  HAND_SIZE,
  PLAIN_POUCH,
  ROOM_BOOK,
  WARDEN,
  WARDEN_KEY_ITEM,
} from '../src/content/index.js'
import {
  act,
  canOpen,
  chooseDoor,
  doors,
  enterRoom,
  look,
  nextBeat,
  recall,
  remember,
} from '../src/descent/index.js'
import { deal } from '../src/gen/index.js'
import { firstPermanent, wake } from '../src/state/index.js'
import { seedOf } from './helpers.js'

/**
 * A room plays — arts 5–9 and 29. Beats one candle at a time, taps free and
 * always answering, doors as sensed lines, and no way back anywhere.
 */
function opened() {
  const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), seedOf(3))
  const chain = deal(seedOf(3), 1, CATALOG, GRAMMAR)
  return { ledgers, chain }
}

describe('descent — arts 5–6 (tapping never harms), art. 9 (forward only), art. 29 (the bands)', () => {
  it('opens a room on its first candle, and moves one at a time (art. 29)', () => {
    const { ledgers, chain } = opened()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, chain.start)
    expect(bands.word?.index).toBe(0)
    expect(bands.word?.last).toBe(false)

    const second = nextBeat(bands)
    expect(second.word?.index).toBe(1)

    // The last candle stays lit: there is no next, and no error either.
    let last = second
    for (let n = 0; n < 10; n++) last = nextBeat(last)
    expect(last.word?.last).toBe(true)
    expect(last.word?.index).toBe(bands.beats.length - 1)
  })

  it('recalls the word without spending it — presentation fades, knowledge does not', () => {
    const { ledgers, chain } = opened()
    const bands = nextBeat(enterRoom(ledgers, chain, ROOM_BOOK, chain.start))
    expect(recall(bands)).toEqual(bands.word)
    expect(recall(bands)).toEqual(bands.word)
  })

  it('answers every tap, always, and changes nothing by it (arts 5–6)', () => {
    const { ledgers, chain } = opened()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, chain.start)
    expect(bands.tappables.length).toBeGreaterThan(0)
    for (const target of bands.tappables) {
      const answer = look(ROOM_BOOK, bands, target)
      expect(answer.text.length).toBeGreaterThan(0)
      expect(answer.index).toBe(-1)
    }
    // Looking is not a move: the ledgers are the same object as before.
    expect(ledgers.run?.at.beat).toBe(0)
  })

  it('offers the doors in front of you, and only those (art. 31)', () => {
    const { ledgers, chain } = opened()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, chain.start)
    const ahead = doors(bands)
    expect(ahead).toHaveLength(1)
    expect(ahead[0]!.sense.length).toBeGreaterThan(0)
    expect(ahead[0]!.to).toBe(chain.nodes[1]!.room)
  })

  it('walks forward, and never back (art. 9)', () => {
    const { ledgers, chain } = opened()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, chain.start)
    const moved = chooseDoor(ledgers, chain, doors(bands)[0]!)
    expect(moved.run!.at.room).toBe(chain.nodes[1]!.room)
    expect(moved.run!.at.step).toBe(1)
    expect(moved.run!.at.beat).toBe(0)
    // Nothing in the chain points back at where you were.
    for (const node of chain.nodes) {
      for (const door of node.doors) expect(door.to).not.toBe(chain.start)
    }
  })

  it('takes the key with the one act there is, once (art. 7)', () => {
    const { ledgers, chain } = opened()
    const trove = chain.nodes.find((node) => node.type === 'trove')!
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, trove.room)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    expect(taking).toHaveLength(1)

    const holding = act(ledgers, taking[0]!)
    expect(holding.run!.carried).toEqual([WARDEN_KEY_ITEM])

    // Taken once: the tray stops offering it (art. 5 — it stops offering,
    // it does not punish).
    const again = enterRoom(holding, chain, ROOM_BOOK, trove.room)
    expect(again.tray.filter((offer) => offer.kind === 'act')).toEqual([])
  })

  it("refuses the Warden's door without the key, and opens it with (arts 7, 33)", () => {
    const { ledgers, chain } = opened()
    const warden = chain.nodes.find((node) => node.room === WARDEN)!
    const gate = warden.doors[0]!
    expect(gate.ends).toBe(true)
    expect(gate.demands).toHaveLength(1)
    expect(canOpen(ledgers, gate)).toBe(false)

    const trove = chain.nodes.find((node) => node.type === 'trove')!
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, trove.room)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    const holding = act(ledgers, taking[0]!)
    expect(canOpen(holding, gate)).toBe(true)
  })

  it('writes the candle you are on into the run, so a reload finds it (art. 36)', () => {
    const { ledgers, chain } = opened()
    const bands = nextBeat(enterRoom(ledgers, chain, ROOM_BOOK, chain.start))
    const kept = remember(ledgers, bands)
    expect(kept.run!.at.beat).toBe(1)

    // And coming back to the room resumes on that candle, not the first.
    const resumed = enterRoom(kept, chain, ROOM_BOOK, chain.start)
    expect(resumed.word?.index).toBe(1)
  })
})
