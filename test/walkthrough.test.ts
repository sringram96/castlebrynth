import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  GRAMMAR,
  HAND_SIZE,
  LEAVES_A_GOOD,
  ORIGINS,
  PLAIN_POUCH,
  ROOM_BOOK,
  SOCKET_BEATS,
  leftBy,
  lostId,
  saysDie,
  takeActId,
} from '../src/content/index.js'
import type { Act } from '../src/descent/index.js'
import {
  act,
  actsIn,
  beatsIn,
  chooseDoor,
  mayLeave,
  sceneStateOf,
} from '../src/descent/index.js'
import type { Chain, ChainNode } from '../src/gen/index.js'
import { deal, hereIn, meetings } from '../src/gen/index.js'
import { routeDeath } from '../src/hinge/index.js'
import type { Ledgers, Seed } from '../src/state/index.js'
import {
  firstPermanent,
  hasMet,
  load,
  memoryVault,
  meet,
  movedTo,
  save,
  wake,
} from '../src/state/index.js'
import { DEALER } from './drift.js'

/**
 * The wave's acceptance walk, end to end and deterministic.
 *
 * Wake with five dice and a visible empty slot → meet a traveler → take
 * their die → it becomes the signature and fills the slot → inspect it and
 * read both the declared distribution and the one-sentence origin → find a
 * forked trove and feel the loss → die, and confirm the die and the meeting
 * survive.
 *
 * It walks through the same calls `src/main.ts` makes, in the same order, so
 * a shell change that breaks the walk breaks this rather than a playtest.
 */

const seedOf = (n: number): Seed => n as unknown as Seed

/** Standing in a room, as the shell stands in one. */
function standing(ledgers: Ledgers, node: ChainNode): Ledgers {
  return {
    ...ledgers,
    run: movedTo(ledgers.run!, {
      room: node.room,
      instance: node.instance,
      step: node.step,
      beat: 0,
    }),
  }
}

/** art. 84: the shell's `greet`, which writes the meetings down on arrival. */
function greet(ledgers: Ledgers, node: ChainNode | null): Ledgers {
  let permanent = ledgers.permanent
  for (const who of meetings(node)) permanent = meet(permanent, who)
  return permanent === ledgers.permanent ? ledgers : { ...ledgers, permanent }
}

/**
 * The bone a dead traveler is holding out, if this room holds one. A
 * traveler's die specifically — the walk is about art. 86's claim that the
 * sixth bone comes off a person, and a talisman on the floor is not that.
 */
function boneOnTheFloor(ledgers: Ledgers, node: ChainNode): Act | null {
  const done = new Set(ledgers.run!.did)
  return (
    actsIn(ROOM_BOOK, node).find(
      (one) =>
        one.id.startsWith('act.take.traveler.') &&
        (one.takes ?? []).length > 0 &&
        !done.has(`${node.instance}|${one.id}`),
    ) ?? null
  )
}

/**
 * A run walked door by door, taking what it is required to take and
 * whatever else it is offered, stopping at the first room that answers
 * `stop`.
 */
function walkUntil(
  seed: number,
  stop: (node: ChainNode, ledgers: Ledgers) => boolean,
  options: { readonly takeGoods?: boolean } = {},
): { ledgers: Ledgers; chain: Chain; node: ChainNode } | null {
  let ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), seedOf(seed))
  let chain = deal(seedOf(seed), 1, CATALOG, GRAMMAR, ledgers.run!.history)
  ledgers = greet(ledgers, hereIn(chain))
  for (;;) {
    const node = hereIn(chain)
    if (node === null) return null
    if (stop(node, ledgers)) return { ledgers, chain, node }
    // art. 3: take what the room requires before its doors will commit.
    for (const one of actsIn(ROOM_BOOK, node)) {
      if (one.required) ledgers = act(ledgers, one)
      else if (options.takeGoods === true && (one.takes ?? []).length > 0) {
        ledgers = act(ledgers, one)
      }
    }
    if (!mayLeave(ledgers, ROOM_BOOK, node)) return null
    const door = node.doors[0]
    if (door === undefined || door.ends === true) return null
    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
    ledgers = walked.ledgers
    chain = walked.chain
    ledgers = greet(ledgers, hereIn(chain))
  }
}

/** The first seed whose road puts a traveler's bone in front of the player. */
function firstBone(): { ledgers: Ledgers; chain: Chain; node: ChainNode; one: Act } {
  for (let seed = 1; seed <= 400; seed++) {
    const at = walkUntil(seed, (node, ledgers) => boneOnTheFloor(ledgers, node) !== null)
    if (at === null) continue
    const one = boneOnTheFloor(at.ledgers, at.node)
    if (one !== null) return { ...at, one }
  }
  throw new Error('no run in four hundred put a bone on the floor')
}

/** The first seed whose road puts a fork in front of the player. */
function firstFork(): { ledgers: Ledgers; chain: Chain; node: ChainNode } {
  for (let seed = 1; seed <= 600; seed++) {
    const at = walkUntil(seed, (node) => node.fills.some((fill) => fill.orElse !== undefined))
    if (at !== null) return at
  }
  throw new Error('no run in six hundred put a fork in the road')
}

describe('the walk — five bones, a traveler, a fork, and a death', () => {
  it('wakes with five dice and one empty slot (arts 55, 60)', () => {
    const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), seedOf(1))
    expect(ledgers.run!.hand.dice).toHaveLength(5)
    expect(ledgers.permanent.handSize).toBe(6)
    // What the tray draws: a slot per die, then the shortfall as empties.
    expect(ledgers.permanent.handSize - ledgers.run!.hand.dice.length).toBe(1)
    // And nothing at all is signed yet.
    expect(ledgers.permanent.signature).toBeNull()
  })

  it('meets a traveler, and the meeting is written the moment you stand there', () => {
    const { ledgers, node } = firstBone()
    const dead = node.fills
      .flatMap((fill) => [fill.encounter, ...(fill.orElse === undefined ? [] : [fill.orElse])])
      .filter((who) => LEAVES_A_GOOD.includes(who))
    expect(dead.length).toBeGreaterThan(0)
    for (const who of dead) expect(hasMet(ledgers.permanent, who), who as string).toBe(true)
    // The room says nothing about them; they say their own candle (art. 83).
    const said = beatsIn(ROOM_BOOK, node)
    for (const who of dead) {
      for (const words of SOCKET_BEATS[who as string] ?? []) expect(said).toContain(words)
    }
  })

  it('takes their die: it signs the run and fills the slot (arts 56, 86)', () => {
    const { ledgers, one } = firstBone()
    const bone = one.takes![0]!
    expect(ledgers.permanent.signature).toBeNull()
    expect(ledgers.run!.hand.dice).toHaveLength(5)

    const after = act(ledgers, one)
    // The signature is the first die you collect, and it is a dead
    // traveler's — there is no other kind.
    expect(after.permanent.signature).toBe(bone.id)
    expect(after.permanent.pouch.dice.map((die) => die.id)).toContain(bone.id)
    // And the hole in the hand is closed, now rather than at the next waking.
    expect(after.run!.hand.dice).toHaveLength(HAND_SIZE)
    expect(after.run!.hand.dice.at(-1)!.id).toBe(bone.id)
  })

  it('answers a tap with the declared distribution and the origin (arts 54, 87)', () => {
    const { ledgers, one } = firstBone()
    const bone = one.takes![0]!
    const inHand = act(ledgers, one).run!.hand.dice.at(-1)!
    const said = saysDie(inHand)
    // Every face, in order, as the die declares them (arts 50, 54).
    expect(said).toContain(inHand.faces.map((face) => face.value).join(' '))
    // And the one sentence that says why those are the faces (art. 87).
    expect(said).toContain(ORIGINS[bone.id as string])
  })

  it('offers a fork, states the terms first, and closes what you leave (art. 89)', () => {
    const found = firstFork()
    const fill = found.node.fills.find((one) => one.orElse !== undefined)!
    const ledgers = standing(found.ledgers, found.node)

    // The terms, before either verb is on the strip (arts 66, 68).
    const said = beatsIn(ROOM_BOOK, found.node)
    const terms = SOCKET_BEATS['fork']![0]!
    const takes = actsIn(ROOM_BOOK, found.node).filter((one) => one.id.startsWith('act.take.'))
    expect(said).toContain(terms)
    expect(takes).toHaveLength(2)

    const mine = takes.find((one) => one.id === takeActId(fill.encounter))!
    const theirs = takes.find((one) => one.id === takeActId(fill.orElse!))!
    const kept = mine.takes![0]!
    const lost = theirs.takes![0]!

    const after = act(ledgers, mine)
    const held = [
      ...after.permanent.pouch.dice.map((die) => die.id as string),
      ...after.permanent.keepsakes.map((one) => one.id as string),
      ...after.permanent.wearables.map((one) => one.id as string),
    ]
    expect(held).toContain(kept.id as string)
    // The loss, and it is final: pressing the other verb does nothing.
    expect(held).not.toContain(lost.id as string)
    expect(act(after, theirs).permanent).toBe(after.permanent)

    // art. 70: and the room shows it when you stand in it again.
    const scene = sceneStateOf(after, ROOM_BOOK, found.node)
    expect(scene.done).toContain(mine.id)
    expect(scene.done).toContain(lostId(fill.orElse!))
  })

  it('keeps the die and the meeting through the death that burns the run', () => {
    const { ledgers, one, node } = firstBone()
    const bone = one.takes![0]!
    const who = LEAVES_A_GOOD.find((id) => leftBy(id)[0]?.id === bone.id)!
    const carrying = act(ledgers, one)
    expect(hasMet(carrying.permanent, who)).toBe(true)

    const woken = routeDeath(carrying, 'end.gnawing')
    // The run burned: a fresh road, nothing carried, one line in the Book.
    expect(woken.run!.carried).toEqual([])
    expect(woken.run!.history.taken).toEqual([])
    expect(woken.permanent.bookOfEnds).toHaveLength(1)
    // The collection did not, and neither did the meeting (arts 11, 84).
    expect(woken.permanent.signature).toBe(bone.id)
    expect(woken.permanent.pouch.dice.map((die) => die.id)).toContain(bone.id)
    expect(hasMet(woken.permanent, who)).toBe(true)
    // And the next descent goes down with a full hand of six (art. 60).
    expect(woken.run!.hand.dice).toHaveLength(HAND_SIZE)
    void node
  })

  it('survives the vault too — the bone and the meeting come back off disk', () => {
    const { ledgers, one } = firstBone()
    const bone = one.takes![0]!
    const vault = memoryVault()
    save(routeDeath(act(ledgers, one), 'end.gnawing'), vault)

    const restored = load(vault)
    expect(restored).not.toBeNull()
    expect(restored!.permanent.signature).toBe(bone.id)
    expect(restored!.permanent.pouch.dice.map((die) => die.id)).toContain(bone.id)
    expect(restored!.permanent.met.length).toBeGreaterThan(0)
    expect(restored!.permanent.bookOfEnds).toHaveLength(1)
  })
})
