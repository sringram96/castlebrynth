import { describe, expect, it } from 'vitest'

import { IRON_KEY, ROOM_BOOK, WARDEN_KEY_ITEM } from '../src/content/index.js'
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
import { hereIn } from '../src/gen/index.js'
import { DEALER, alwaysLeft, opened, takeable } from './drift.js'

/**
 * A room plays — arts 5–9 and 29. Beats one candle at a time, taps free and
 * always answering, doors as sensed lines, and no way back anywhere.
 */
function standing(seed = 3) {
  const { ledgers, chain } = opened(seed)
  return { ledgers, chain, at: chain.nodes[0]!.instance }
}

/** Walk on until the room the dealer put the key in (art. 80). */
function atTheKey(seed = 3) {
  let here = standing(seed)
  for (let n = 0; n < 12; n++) {
    const node = hereIn(here.chain)!
    if (node.fills.some((fill) => fill.encounter === IRON_KEY)) {
      return { ledgers: here.ledgers, chain: here.chain, node }
    }
    const walked = chooseDoor(here.ledgers, here.chain, ROOM_BOOK, node.doors[0]!, DEALER)
    here = { ledgers: walked.ledgers, chain: walked.chain, at: walked.chain.nodes.at(-1)!.instance }
  }
  throw new Error('the key was never dealt')
}

describe('descent — arts 5–6 (tapping never harms), art. 9 (forward only), art. 29 (the bands)', () => {
  it('opens a room on its first candle, and moves one at a time (art. 29)', () => {
    const { ledgers, chain } = standing()
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
    const { ledgers, chain } = standing()
    const bands = nextBeat(enterRoom(ledgers, chain, ROOM_BOOK, chain.start))
    expect(recall(bands)).toEqual(bands.word)
    expect(recall(bands)).toEqual(bands.word)
  })

  it('answers every tap, always, and changes nothing by it (arts 5–6)', () => {
    const { ledgers, chain } = standing()
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

  it('offers the doors in front of you, and only those (arts 31, 79)', () => {
    const { ledgers, chain } = standing()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, chain.start)
    const ahead = doors(bands)
    expect(ahead.length).toBeGreaterThanOrEqual(1)
    expect(ahead.length).toBeLessThanOrEqual(3)
    // A door is an index and a hidden tag. It does not name a room, because
    // the room behind it does not exist yet (art. 79).
    for (const door of ahead) expect('to' in door).toBe(false)
    // And nothing beyond this room has been dealt at all.
    expect(chain.nodes).toHaveLength(1)
  })

  it('walks forward, and never back (arts 9, 79)', () => {
    const { ledgers, chain } = standing()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, chain.start)
    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, doors(bands)[0]!, DEALER)
    const arrived = walked.chain.nodes.at(-1)!
    expect(walked.ledgers.run!.at.room).toBe(arrived.room)
    expect(walked.ledgers.run!.at.instance).toBe(arrived.instance)
    expect(walked.ledgers.run!.at.step).toBe(1)
    expect(walked.ledgers.run!.at.beat).toBe(0)
    // Opening the door dealt the room, and wrote the choice down (art. 36).
    expect(walked.chain.nodes).toHaveLength(2)
    expect(walked.ledgers.run!.history.taken).toEqual([0])
  })

  it('takes the key from the socket the dealer put it in, once (arts 7, 80)', () => {
    const { ledgers, chain, node } = atTheKey()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    expect(taking.map((one) => one.id)).toEqual(['act.take-key'])

    const holding = act(ledgers, taking[0]!)
    expect(holding.run!.carried).toEqual([WARDEN_KEY_ITEM])

    // Taken once: the tray stops offering it (art. 5 — it stops offering,
    // it does not punish).
    const again = enterRoom(holding, chain, ROOM_BOOK, node.instance)
    expect(again.tray.filter((offer) => offer.kind === 'act')).toEqual([])
  })

  it("refuses the Warden's door without the key, and opens it with (arts 7, 33)", () => {
    const { ledgers, chain, node } = atTheKey()
    const gate = { at: 0, region: null, demands: chain.nodes[0]!.doors[0]!.demands }
    const warden = { ...gate, demands: ['key.warden'] as never, ends: true as const }
    expect(canOpen(ledgers, warden)).toBe(false)

    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    expect(canOpen(act(ledgers, taking[0]!), warden)).toBe(true)
  })

  it('keeps a room dealt twice apart, so what you took here is gone from here (art. 82)', () => {
    // Two instances of one template: the deed is written against the
    // instance, so the second copy still has what the first one lost.
    const { ledgers, chain, node } = atTheKey()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    const holding = act(ledgers, taking[0]!)
    expect(holding.run!.did).toEqual([`${node.instance}|act.take-key`])
    // A different instance of the same template has not lost anything.
    const elsewhere = { ...node, instance: `${node.room}#99` as typeof node.instance }
    expect(takeable(holding, elsewhere).map((one) => one.id)).toContain('act.take-key')
  })

  it('writes the candle you are on into the run, so a reload finds it (art. 36)', () => {
    const { ledgers, chain } = standing()
    const bands = nextBeat(enterRoom(ledgers, chain, ROOM_BOOK, chain.start))
    const kept = remember(ledgers, bands)
    expect(kept.run!.at.beat).toBe(1)

    // And coming back to the room resumes on that candle, not the first.
    const resumed = enterRoom(kept, chain, ROOM_BOOK, chain.start)
    expect(resumed.word?.index).toBe(1)
  })
})
