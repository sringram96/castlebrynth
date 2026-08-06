import { describe, expect, it } from 'vitest'

import {
  LOOKS,
  NOTICES,
  ROOM_BOOK,
  VERBS,
  WARDEN,
  WARDEN_KEY_ITEM,
} from '../src/content/index.js'
import type { Act, Bands } from '../src/descent/index.js'
import {
  actsIn,
  afforded,
  canOpen,
  chooseDoor,
  enterRoom,
  look,
  lockActFor,
  mayLeave,
  opens,
  sceneKey,
  sceneStateOf,
  stranded,
  summoned,
  turnedHere,
} from '../src/descent/index.js'
import { act } from '../src/descent/index.js'
import type { Chain, ChainNode } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import type { Ledgers } from '../src/state/index.js'
import { movedTo } from '../src/state/index.js'
import { DEALER, lookAround, opened, takeable } from './drift.js'

/**
 * **The key is turned** (card 67, arts 68, 70, 82, 97).
 *
 * The defect: the iron key opened the Warden's door by sitting in the
 * inventory. art. 80 constructs the whole depth around placing that key, and
 * the payoff was a passive check — looking is free and commitment is drama,
 * and a lock that opens itself is neither.
 *
 * What this file holds is the ceremony, in the order a thumb meets it: the
 * lock answers either way; only carrying does it summon a verb; the press
 * writes a deed; the deed is what the door reads. And the control the card
 * asked for: with the gate taken away nothing is stranded, so the gate is
 * doing the work rather than describing what would happen anyway.
 */

/** A run walked all the way down to the hall, by whatever road works. */
function atTheDoor(seed = 1): { ledgers: Ledgers; chain: Chain; node: ChainNode } {
  let { ledgers, chain } = opened(seed)
  for (;;) {
    const node = hereIn(chain)
    if (node === null) throw new Error(`seed ${seed} dealt no room`)
    // art. 68: a thumb looks at everything, here as everywhere. It stops
    // short of *pressing* in the hall — the press is what these tests are
    // about, so the walk delivers a run standing in front of an untouched
    // lock with the key on it.
    ledgers = lookAround(ledgers, node)
    if (node.room === WARDEN) return { ledgers, chain, node }
    for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)
    const door = node.doors[0]
    if (door === undefined || door.ends === true) throw new Error(`seed ${seed} never arrived`)
    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
    ledgers = walked.ledgers
    chain = walked.chain
  }
}

/** The same, with the run *standing* in the hall, as the shell stands in one. */
function inTheHall(seed = 1): { ledgers: Ledgers; chain: Chain; node: ChainNode } {
  const found = atTheDoor(seed)
  return {
    ...found,
    ledgers: {
      ...found.ledgers,
      run: movedTo(found.ledgers.run!, {
        room: found.node.room,
        instance: found.node.instance,
        step: found.node.step,
        beat: 0,
      }),
    },
  }
}

/** The run with everything looked at *except* the lock, and nothing turned. */
function unlooked(ledgers: Ledgers, node: ChainNode): Ledgers {
  return {
    ...ledgers,
    run: {
      ...ledgers.run!,
      looked: ledgers.run!.looked.filter((key) => !key.endsWith('|warden.lock')),
      did: ledgers.run!.did.filter((key) => !key.endsWith('|act.unlock')),
    },
  }
}

const verbsOn = (bands: Bands): readonly string[] =>
  bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act.verb] : []))

const unlockOf = (node: ChainNode): Act =>
  actsIn(ROOM_BOOK, node).find((one) => one.id === 'act.unlock')!

describe('card 67 — the lock answers before anything is offered (arts 68–69)', () => {
  it('names what it wants when nothing on you fits', () => {
    const { ledgers, chain, node } = inTheHall()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const lock = bands.tappables.find((one) => one.id === 'warden.lock')!
    // art. 69: looking is free and always answers, carrying or not.
    expect(look(ROOM_BOOK, bands, lock, []).text).toBe(LOOKS['warden.lock'])
    expect(look(ROOM_BOOK, bands, lock, []).text.length).toBeGreaterThan(0)
  })

  it('names what fits when the key is on you, and it is a different sentence', () => {
    const { ledgers, chain, node } = inTheHall()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const lock = bands.tappables.find((one) => one.id === 'warden.lock')!
    const answer = look(ROOM_BOOK, bands, lock, [WARDEN_KEY_ITEM]).text
    expect(answer).toBe(LOOKS['warden.lock.fits'])
    expect(answer).not.toBe(LOOKS['warden.lock'])
  })

  it('leaves every other answer alone, whatever is in the pocket', () => {
    const { ledgers, chain, node } = inTheHall()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    for (const target of bands.tappables) {
      if (target.id === 'warden.lock') continue
      expect(look(ROOM_BOOK, bands, target, [WARDEN_KEY_ITEM]).text, target.id).toBe(
        look(ROOM_BOOK, bands, target, []).text,
      )
    }
  })
})

describe('card 67 — Unlock is summoned, and only then (art. 68)', () => {
  it('is not on the strip before the lock has been looked at', () => {
    const { ledgers, chain, node } = inTheHall()
    const blind = unlooked(ledgers, node)
    expect(canOpen(blind, node.doors[0]!)).toBe(true)
    const bands = enterRoom(blind, chain, ROOM_BOOK, node.instance)
    expect(verbsOn(bands)).not.toContain(VERBS['act.unlock'])
    expect(summoned(blind.run, node.instance, unlockOf(node))).toBe(false)
  })

  /**
   * arts 7, 68: "only then, **and only carrying**". A verb you cannot press
   * is the same defect as a verb you have not earned, so it gets the same
   * answer — it is not there. What the player gets instead is the lock,
   * which says what it wants.
   */
  it('is not on the strip without the key, however hard the lock is looked at', () => {
    const { ledgers, chain, node } = inTheHall()
    const empty: Ledgers = {
      ...ledgers,
      run: { ...ledgers.run!, carried: [] },
    }
    const bands = enterRoom(empty, chain, ROOM_BOOK, node.instance)
    expect(summoned(empty.run, node.instance, unlockOf(node))).toBe(true)
    expect(afforded(empty.run, unlockOf(node))).toBe(false)
    expect(verbsOn(bands)).not.toContain(VERBS['act.unlock'])
  })

  it('is on the strip once both are true', () => {
    const { ledgers, chain, node } = inTheHall()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    expect(verbsOn(bands)).toContain(VERBS['act.unlock'])
  })

  it('persists for the instance — leave and come back and it is still there', () => {
    const { ledgers, chain, node } = inTheHall()
    // art. 70: looking is written down, so the summons survives a repaint,
    // a reload, and anything else that rebuilds the bands from the ledger.
    const again = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const third = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    expect(verbsOn(again)).toEqual(verbsOn(third))
    expect(verbsOn(again)).toContain(VERBS['act.unlock'])
  })
})

describe('card 67 — the press writes a deed, and the deed is what the door reads', () => {
  it('opens nothing by existing: the key alone leaves the door shut', () => {
    const { ledgers, node } = inTheHall()
    const door = node.doors[0]!
    expect(door.demands.length).toBeGreaterThan(0)
    // The key is on you — art. 80 saw to that — and the door still does not
    // give. That one line is the whole of what this card changed.
    expect(canOpen(ledgers, door)).toBe(true)
    expect(turnedHere(ledgers, ROOM_BOOK, node, door)).toBe(false)
    expect(opens(ledgers, ROOM_BOOK, node, door)).toBe(false)
    expect(mayLeave(ledgers, ROOM_BOOK, node, door)).toBe(false)
  })

  it('turns it on the press, and the door gives afterwards', () => {
    const { ledgers, node } = inTheHall()
    const door = node.doors[0]!
    const turned = act(ledgers, unlockOf(node))
    expect(turned.run!.did).toContain(`${node.instance}|act.unlock`)
    expect(turnedHere(turned, ROOM_BOOK, node, door)).toBe(true)
    expect(opens(turned, ROOM_BOOK, node, door)).toBe(true)
    expect(mayLeave(turned, ROOM_BOOK, node, door)).toBe(true)
  })

  it('changes the lock’s pixels, and the frame cached behind them (art. 70)', () => {
    const { ledgers, node } = inTheHall()
    const before = sceneStateOf(ledgers, ROOM_BOOK, node)
    expect(before.doors[0]!.locked).toBe(true)
    expect(before.doors[0]!.turned).toBe(false)

    const after = sceneStateOf(act(ledgers, unlockOf(node)), ROOM_BOOK, node)
    // It still wears a lock — a lock that vanishes is a lock that was never
    // there — and the lock is open.
    expect(after.doors[0]!.locked).toBe(true)
    expect(after.doors[0]!.turned).toBe(true)
    // And the room is a different room to the frame cache, or the pixels
    // would never be recast (art. 70's own bug, in the shell).
    expect(sceneKey(after)).not.toBe(sceneKey(before))
  })

  it('answers with the turning, in words the act authored for itself', () => {
    expect(NOTICES['answer.act.unlock']).toBeDefined()
    expect((NOTICES['answer.act.unlock'] ?? '').length).toBeGreaterThan(0)
  })

  it('writes the deed against the instance, never against the template (art. 82)', () => {
    const { ledgers, node } = inTheHall()
    const turned = act(ledgers, unlockOf(node))
    const elsewhere: ChainNode = { ...node, instance: `${node.room}#99` as typeof node.instance }
    expect(turnedHere(turned, ROOM_BOOK, node, node.doors[0]!)).toBe(true)
    expect(turnedHere(turned, ROOM_BOOK, elsewhere, elsewhere.doors[0]!)).toBe(false)
  })

  it('refuses the walk itself, not only the verb that would have started it', () => {
    const { ledgers, chain, node } = inTheHall()
    // The belt to the suspender: the tray offers no verb, and the engine
    // would refuse one anyway.
    expect(() => chooseDoor(ledgers, chain, ROOM_BOOK, node.doors[0]!, DEALER)).toThrow(
      /lock has not been turned/,
    )
  })
})

describe('card 67 — the gate is doing the work (the control)', () => {
  /**
   * The control the card asked for. Take the deed-gate away and the same
   * run walks straight through — so the gate is what stops it, and not some
   * other refusal that happens to be standing in the same place. And with
   * the gate on, the run is still never *stranded*: what it needs is a
   * press, and the press is available.
   */
  it('walks through the moment the gate is removed, and is refused with it', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { ledgers, node } = inTheHall(seed)
      const door = node.doors[0]!
      expect(opens(ledgers, ROOM_BOOK, node, door), `seed ${seed} gated`).toBe(false)
      // The control: a door that demands nothing is the door this one was
      // before the card, and it opens on the key alone.
      const ungated = { ...door, demands: [] }
      expect(opens(ledgers, ROOM_BOOK, node, ungated), `seed ${seed} ungated`).toBe(true)
    }
  })

  it('strands nobody: the run always holds the key and the press is offered', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { ledgers, chain, node } = inTheHall(seed)
      // art. 80 put the key in the path, so the hall is never a dead end —
      // and `stranded` agrees, which is what keeps the End run valve off
      // the strip in the one room it would be most alarming in.
      expect(canOpen(ledgers, node.doors[0]!), `seed ${seed}`).toBe(true)
      expect(stranded(ledgers, ROOM_BOOK, node), `seed ${seed}`).toBe(false)
      const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
      expect(verbsOn(bands), `seed ${seed}`).toContain(VERBS['act.unlock'])
    }
  })

  it('is stranded, and says so, when the key is genuinely not on you', () => {
    const { ledgers, node } = inTheHall()
    const empty: Ledgers = { ...ledgers, run: { ...ledgers.run!, carried: [] } }
    expect(stranded(empty, ROOM_BOOK, node)).toBe(true)
    expect(NOTICES['door.locked']).toBeDefined()
  })
})

describe('card 67 — it generalises: every lock is a deed-gated door', () => {
  it('gives every locked door in the catalog something authored to turn it', () => {
    // A lock with nothing to turn it never opens, deliberately — so content
    // may not ship one. This is what stops a future lock from quietly
    // regressing to the passive check this card removed.
    for (let seed = 1; seed <= 60; seed++) {
      let { ledgers, chain } = opened(seed)
      for (;;) {
        const node = hereIn(chain)
        if (node === null) break
        for (const door of node.doors) {
          if (door.demands.length === 0) continue
          expect(lockActFor(ROOM_BOOK, node, door), `${node.room as string}/${door.at}`).not.toBeNull()
        }
        ledgers = lookAround(ledgers, node)
        for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)
        const door = node.doors[0]
        if (door === undefined || door.ends === true) break
        const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
        ledgers = walked.ledgers
        chain = walked.chain
      }
    }
  })

  it('leaves every unlocked door exactly as it was', () => {
    // The gate is about locks and nothing else: an ordinary door needs no
    // deed, asks for none, and is unchanged by all of this.
    for (const seed of [3, 11, 29]) {
      let { ledgers, chain } = opened(seed)
      for (;;) {
        const node = hereIn(chain)
        if (node === null) break
        for (const door of node.doors) {
          if (door.demands.length > 0) continue
          expect(opens(ledgers, ROOM_BOOK, node, door), `${node.room as string}/${door.at}`).toBe(
            true,
          )
        }
        ledgers = lookAround(ledgers, node)
        for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)
        const door = node.doors[0]
        if (door === undefined || door.ends === true) break
        const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
        ledgers = walked.ledgers
        chain = walked.chain
      }
    }
  })
})
