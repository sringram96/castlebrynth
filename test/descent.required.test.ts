import { describe, expect, it } from 'vitest'

import {
  CATALOG,
  DEPTH_ONE,
  IRON_KEY,
  NOTICES,
  ROOMS,
  ROOM_BOOK,
  WARDEN_KEY_ITEM,
} from '../src/content/index.js'
import { actsIn, chooseDoor, enterRoom, heldBack, mayLeave } from '../src/descent/index.js'
import type { Chain } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import type { Policy } from './drift.js'
import {
  DEALER,
  alwaysLeft,
  alwaysRight,
  avoiding,
  coinFlip,
  leaning,
  opened,
  playRun,
  runOf,
  takeable, lookAround } from './drift.js'
import { BURNT, DROWNED, OSSUARY } from '../src/content/index.js'

/**
 * arts 3 and 80 — winnability by construction.
 *
 * The old law proved this by search: lay out a whole depth, then check that
 * every lock had its key upstream. Art. 80 replaces the search with a
 * construction. Required items are unbound from rooms — there is no key
 * room — and when the dealer has committed to a lock ahead it puts the key
 * into the player's path before it. Stranding stops being something the
 * generator avoids and becomes something it cannot express.
 *
 * Art. 3's door refusal stays as the belt to that suspender: a required
 * thing lying unclaimed still refuses the room's doors, so a player cannot
 * walk past what the dealer put there for them.
 */
const LOCK = DEPTH_ONE.locks[0]!

/** The policies a run can be played with, including two that fight the drift. */
const POLICIES: readonly (readonly [string, (seed: number) => Policy])[] = [
  ['always-left', () => alwaysLeft],
  ['always-right', () => alwaysRight],
  ['lean-drowned', () => leaning(DROWNED)],
  ['lean-burnt', () => leaning(BURNT)],
  ['lean-ossuary', () => leaning(OSSUARY)],
  ['avoid-ossuary', () => avoiding(OSSUARY)],
  ['coin-flip', (seed) => coinFlip(seed)],
]

/** Which step of a run the key was dealt into, or -1 if it never was. */
function keyAt(chain: Chain): number {
  return chain.nodes.findIndex((node) =>
    node.fills.some((fill) => fill.encounter === IRON_KEY),
  )
}

describe('art. 80 — the key is unbound, and arrives before its lock', () => {
  it('binds the required thing to no room at all', () => {
    // There is no key room: nothing a room offers of its own hands anything
    // over, and nothing a room offers of its own is required.
    //
    // Restated by card 67, and strengthened rather than relaxed. A room may
    // now author an act — the Warden's hall authors `Unlock` — and what
    // art. 80 actually forbids is a room *granting* a required thing, so
    // that is what this asks. The key still floats and is still placed by
    // the dealer alone; the ceremony that turns it belongs to the door.
    for (const held of ROOMS) {
      for (const one of held.acts) {
        expect(one.gives, `${held.id as string} / ${one.id}`).toEqual([])
        expect(one.takes ?? [], `${held.id as string} / ${one.id}`).toEqual([])
        expect(one.required, `${held.id as string} / ${one.id}`).toBe(false)
      }
    }
    // The thing that grants it is an encounter, and it floats.
    const key = CATALOG.encounters.find((one) => one.id === IRON_KEY)!
    expect(key.binding).toBe('floating')
    expect(key.scope).toBe('unique')
    expect(key.grants).toEqual([WARDEN_KEY_ITEM])
    expect(key.at).toBeUndefined()
  })

  it('declares every room able to hold it, so the last chance is never a dead one', () => {
    for (const template of CATALOG.rooms) {
      expect(
        template.sockets.some((socket) => socket.accepts === 'boon'),
        template.id as string,
      ).toBe(true)
    }
  })

  /**
   * The property art. 80 claims, across a thousand runs per policy: the key
   * is dealt into the path, once, strictly before the lock it opens.
   */
  it('places it exactly once, before the lock, in every run of every policy', () => {
    for (const [name, make] of POLICIES) {
      for (let seed = 1; seed <= 1000; seed++) {
        const chain = runOf(seed, make(seed))
        const at = keyAt(chain)
        expect(at, `${name} seed ${seed}`).toBeGreaterThanOrEqual(0)
        expect(at, `${name} seed ${seed}`).toBeLessThan(LOCK.at)
        const placings = chain.nodes.flatMap((node) =>
          node.fills.filter((fill) => fill.encounter === IRON_KEY),
        )
        expect(placings, `${name} seed ${seed}`).toHaveLength(1)
      }
    }
  })

  it('spreads it through the depth rather than always the same room', () => {
    const steps = new Set<number>()
    const rooms = new Set<string>()
    for (let seed = 1; seed <= 400; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      const at = keyAt(chain)
      steps.add(at)
      rooms.add(chain.nodes[at]!.room as string)
    }
    // Just in time is not the same as at the last moment: it lands early
    // sometimes and late sometimes, and in most of the rooms there are.
    expect(steps.size).toBeGreaterThan(4)
    expect(rooms.size).toBeGreaterThan(5)
  })
})

describe('art. 3 — a run can never be walked into unwinnable', () => {
  it('marks the one thing the depth requires, and marks nothing else', () => {
    let required = 0
    for (let seed = 1; seed <= 50; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      for (const node of chain.nodes) {
        for (const one of actsIn(ROOM_BOOK, node)) {
          // Every act declares the flag rather than leaving it inferred.
          expect(typeof one.required).toBe('boolean')
          if (one.required) {
            required++
            expect(one.gives).toEqual([WARDEN_KEY_ITEM])
          }
        }
      }
      expect(required, `seed ${seed}`).toBeGreaterThan(0)
      required = 0
    }
  })

  it('names what a room still holds back, and stops naming it once taken', () => {
    const { ledgers, chain } = opened(11)
    let here = { ledgers, chain }
    // Walk to the room the dealer put the key in, taking nothing on the way.
    while (keyAt(here.chain) !== here.chain.nodes.length - 1) {
      const node = hereIn(here.chain)!
      const walked = chooseDoor(here.ledgers, here.chain, ROOM_BOOK, node.doors[0]!, DEALER)
      here = { ledgers: walked.ledgers, chain: walked.chain }
    }
    const node = hereIn(here.chain)!
    // art. 3 holds the door whether or not you have looked yet — the refusal
    // is about what the room still owes the run, not about what the tray is
    // currently offering. That is the point of the belt and the suspender.
    expect(heldBack(here.ledgers, ROOM_BOOK, node).map((one) => one.id)).toEqual([
      'act.take-key',
    ])
    expect(mayLeave(here.ledgers, ROOM_BOOK, node)).toBe(false)

    // art. 68: and the verb that satisfies it arrives by looking.
    here = { ...here, ledgers: lookAround(here.ledgers, node) }
    const bands = enterRoom(here.ledgers, here.chain, ROOM_BOOK, node.instance)
    const taking = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    expect(taking.map((one) => one.id)).toEqual(['act.take-key'])
  })

  it('refuses to commit a door while a required thing lies in the room', () => {
    const { ledgers, chain } = opened(11)
    let here = { ledgers, chain }
    while (keyAt(here.chain) !== here.chain.nodes.length - 1) {
      const node = hereIn(here.chain)!
      const walked = chooseDoor(here.ledgers, here.chain, ROOM_BOOK, node.doors[0]!, DEALER)
      here = { ledgers: walked.ledgers, chain: walked.chain }
    }
    const node = hereIn(here.chain)!
    expect(() =>
      chooseDoor(here.ledgers, here.chain, ROOM_BOOK, node.doors[0]!, DEALER),
    ).toThrow(/art\. 3/)

    // And the line the shell says is a stop, not a hint: it names nothing.
    const said = NOTICES['door.held'] ?? ''
    expect(said.length).toBeGreaterThan(0)
    expect(said.toLowerCase()).not.toContain('key')
    expect(said.toLowerCase()).not.toContain('iron')
  })

  it('lets a room with nothing required in it be left at once (art. 4)', () => {
    const { ledgers, chain } = opened(11)
    let here = { ledgers, chain }
    for (let n = 0; n < 3; n++) {
      const node = hereIn(here.chain)!
      if (takeable(here.ledgers, node).some((one) => one.required)) break
      expect(mayLeave(here.ledgers, ROOM_BOOK, node), node.instance as string).toBe(true)
      const walked = chooseDoor(here.ledgers, here.chain, ROOM_BOOK, node.doors[0]!, DEALER)
      here = { ledgers: walked.ledgers, chain: walked.chain }
    }
  })

  /**
   * The proof: no run reaches the lock without what opens it. Played through
   * the real acts and the real doors, under every policy, over a thousand
   * seeds each — which is the adversarial part, because two of these
   * policies are trying to steer the drift somewhere it does not want to go.
   */
  it('leaves no seeded run under any policy that reaches the lock keyless', () => {
    for (const [name, make] of POLICIES) {
      for (let seed = 1; seed <= 1000; seed++) {
        const played = playRun(seed, make(seed), true)
        expect(played.refused, `${name} seed ${seed}`).toBe(false)
        expect(played.ledgers.run!.carried, `${name} seed ${seed}`).toContain(WARDEN_KEY_ITEM)
      }
    }
  })

  /**
   * And the control, so the test is not vacuous: with art. 3 switched off, a
   * player who takes nothing walks the whole depth and is refused at the
   * end — which is the playtest, reproduced. The law is doing the work.
   */
  it('strands the same runs the moment the law is switched off', () => {
    let refused = 0
    for (let seed = 1; seed <= 100; seed++) {
      if (playRun(seed, coinFlip(seed), false, false).refused) refused++
    }
    expect(refused).toBe(100)
  })

  /**
   * The other half of the belt: obeying art. 3 while refusing to take
   * anything does not strand either. The run simply stops in the room the
   * key is in, because the room will not let it leave.
   */
  it('stops a run in the room rather than letting it walk past what it needs', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const played = playRun(seed, coinFlip(seed), true, false)
      expect(played.refused, `seed ${seed}`).toBe(false)
      const node = hereIn(played.chain)!
      expect(heldBack(played.ledgers, ROOM_BOOK, node).length, `seed ${seed}`).toBe(1)
      expect(node.step).toBeLessThan(LOCK.at)
    }
  })
})
