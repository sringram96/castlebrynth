import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  END_LINES,
  GRAMMAR,
  HAND_SIZE,
  LEAVES_A_GOOD,
  LOOKS,
  ORIGINS,
  PLAIN_POUCH,
  ROOM_BOOK,
  SOCKET_BEATS,
  THE_WARDEN,
  WARDEN,
  WARDEN_KEEPER,
  WARDEN_KEY_ITEM,
  encounterOfHorror,
  endLineOf,
  horrorIn,
  leftBy,
  lostId,
  saysDie,
  takeActId,
} from '../src/content/index.js'
import type { Act, Bands } from '../src/descent/index.js'
import {
  act,
  actsIn,
  beatsIn,
  chooseDoor,
  enterRoom,
  look,
  mayLeave,
  opens,
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
import { DEALER, lookAround } from './drift.js'

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
    // art. 68: the walk taps everything in the room, the way a thumb does,
    // so the verbs a look summons are on the strip when it stops.
    ledgers = lookAround(ledgers, node)
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

/**
 * A run walked to the bottom, standing in the hall with everything looked
 * at and nothing pressed. It stops short of the lock on purpose — the press
 * is what the last leg of the walk is about.
 */
function atTheWardensDoor(): { ledgers: Ledgers; chain: Chain; node: ChainNode } {
  const at = walkUntil(1, (node) => node.room === WARDEN)
  if (at === null) throw new Error('the first road did not reach the bottom')
  return { ...at, ledgers: standing(at.ledgers, at.node) }
}

const verbsIn = (bands: Bands): readonly string[] =>
  bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act.verb] : []))

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
    // The run burned: a fresh road, nothing carried, a line in the Book under
    // the one that was already in it (art. 11, the reason wave).
    expect(woken.run!.carried).toEqual([])
    expect(woken.run!.history.taken).toEqual([])
    expect(woken.permanent.bookOfEnds).toHaveLength(2)
    // The collection did not, and neither did the meeting (arts 11, 84).
    expect(woken.permanent.signature).toBe(bone.id)
    expect(woken.permanent.pouch.dice.map((die) => die.id)).toContain(bone.id)
    expect(hasMet(woken.permanent, who)).toBe(true)
    // And the next descent goes down with a full hand of six (art. 60).
    expect(woken.run!.hand.dice).toHaveLength(HAND_SIZE)
    void node
  })

  /**
   * The company wave's leg of the walk (cards 67, 31), and the last one:
   * carry the key to the bottom, look at the lock, turn it, meet the thing
   * the door was built for, lose to it, and confirm that the two things
   * art. 11 promises survive — the line in the Book and the face you have
   * now seen — come back off disk.
   */
  it('turns the key, meets the Warden, and dies to it', () => {
    const found = atTheWardensDoor()
    const door = found.node.doors[0]!

    // art. 80 put the key in the path, and it is on you. It opens nothing.
    expect(found.ledgers.run!.carried).toContain(WARDEN_KEY_ITEM)
    expect(opens(found.ledgers, ROOM_BOOK, found.node, door)).toBe(false)

    // art. 69: the lock answers, and it answers differently for a hand with
    // the key in it. That answer is what summons the verb (art. 68).
    const bands = enterRoom(found.ledgers, found.chain, ROOM_BOOK, found.node.instance)
    const lock = bands.tappables.find((one) => one.id === 'warden.lock')!
    expect(look(ROOM_BOOK, bands, lock, found.ledgers.run!.carried).text).toBe(
      LOOKS['warden.lock.fits'],
    )
    const unlock = actsIn(ROOM_BOOK, found.node).find((one) => one.id === 'act.unlock')!
    expect(verbsIn(bands)).toContain(unlock.verb)

    // The press. The deed is written, and the door gives at last.
    const turned = act(found.ledgers, unlock)
    expect(opens(turned, ROOM_BOOK, found.node, door)).toBe(true)

    // card 31: and turning it is what wakes the keeper.
    const keeper = horrorIn(found.node)!
    expect(keeper.id).toBe(THE_WARDEN.id)
    const met = { ...turned, permanent: meet(turned.permanent, encounterOfHorror(keeper.id)!) }
    expect(hasMet(met.permanent, WARDEN_KEEPER)).toBe(true)

    // A bare five at the bottom of a depth loses to it, which is the point
    // of it. The Book takes the keeper's own line and not the door's.
    const dead = routeDeath(met, endLineOf(keeper.id))
    expect(dead.permanent.bookOfEnds.at(-1)).toMatchObject({ cause: 'end.warden.keeper' })
    expect(END_LINES['end.warden.keeper']).toBeDefined()

    // arts 11, 84: and both of them come back off disk.
    const vault = memoryVault()
    save(dead, vault)
    const restored = load(vault)
    expect(restored).not.toBeNull()
    expect(restored!.permanent.bookOfEnds.at(-1)?.cause).toBe('end.warden.keeper')
    expect(hasMet(restored!.permanent, WARDEN_KEEPER)).toBe(true)
    // The run burned with it — a fresh road, nothing carried (arts 11, 32).
    expect(restored!.run!.carried).toEqual([])
    expect(restored!.run!.history.taken).toEqual([])
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
    expect(restored!.permanent.bookOfEnds).toHaveLength(2)
  })
})
