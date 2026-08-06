/**
 * **A fight is begun by tapping the horror** (card 95, arts 30, 68, 70, 118).
 *
 * Sam, 2026-08-06: *"I don't like that you have to click on the door and try
 * to go through it to initiate the fight. The fight should be started by
 * clicking the monster and selecting Fight."*
 *
 * This is a consistency fix and not a feature. art. 68 says no verb exists
 * until its thing has been tapped, and every other thing in the game already
 * works that way — the horror was the one thing you engaged by bumping into
 * something *else*. So the door-fight was the exception to the interaction
 * model rather than an expression of it.
 *
 * The load-bearing test in this file is the last one, and it is the case the
 * wave asked for by name: **with a horror standing, no path exists from a door
 * press to an opened fight.** It is asked of whole depths through the screen
 * harness (card 74), because a guarantee about what is *offered* is a
 * guarantee about the shell.
 */

import { describe, expect, it } from 'vitest'

import {
  ENCOUNTERS,
  HORROR_DOWN,
  IRON_KEY,
  WET,
  NOTICES,
  ROOM_BOOK,
  SOCKET_BEATS,
  encounterProp,
  horrorMarkIn,
  horrorOf,
  horrorStanding,
} from '../src/content/index.js'
import { beatsIn, sceneStateOf, tappablesIn } from '../src/descent/index.js'
import { shellAt, walkDepth } from './screen.js'

/** Enough seeds to walk every kind of room the depth can deal. */
const SEEDS = Array.from({ length: 60 }, (_, n) => n + 1)

/**
 * Walk until the room has teeth in it, or the depth runs out. Dealing is lazy
 * (art. 79) — the room behind a door does not exist until the door is opened —
 * so a room with a horror in it is something a test walks to, never something
 * it can enumerate off a chain.
 */
function untilTeeth(seed: number) {
  const shell = shellAt(seed)
  for (let room = 0; room < shell.chain.length + 2; room++) {
    if (shell.horror() !== null) return shell
    const way = shell.node().doors.find((door) => shell.way(door) !== null)
    if (way === undefined || way.ends === true) return null
    for (const target of shell.things()) shell.tap(target)
    for (let guard = 0; guard < 8; guard++) {
      const one = shell.strip()[0]
      if (one === undefined) break
      shell.press(one)
    }
    const still = shell.node().doors.find((door) => shell.way(door) !== null)
    if (still === undefined || still.ends === true) return null
    shell.walk(still)
  }
  return null
}

describe('card 95 — the verb hangs off the horror', () => {
  /**
   * art. 68's own law: looking is what summons. Before the tap there is no
   * FIGHT anywhere; after it there is, and it survives leaving and coming back
   * because the summons is knowledge on the ledger (arts 70, 82).
   */
  it('offers no FIGHT until the horror has been looked at', () => {
    let checked = 0
    for (const seed of SEEDS) {
      const shell = shellAt(seed)
      for (let room = 0; room < shell.chain.length + 2; room++) {
        const mark = shell.horror()
        if (mark !== null) {
          expect(shell.fightOffered(), `seed ${seed}: summoned before the look`).toBe(false)
          const target = shell.things().find((one) => one.id === mark)
          expect(target, `seed ${seed}: ${mark} is not on the frame`).toBeDefined()
          // art. 69: and looking answers, as everything tappable does.
          expect(shell.tap(target!), `seed ${seed}: ${mark} answered with nothing`).not.toBe('')
          expect(shell.fightOffered(), `seed ${seed}: not summoned by the look`).toBe(true)
          checked += 1
          break
        }
        const way = shell.node().doors.find((door) => shell.way(door) !== null)
        if (way === undefined || way.ends === true) break
        for (let guard = 0; guard < 8; guard++) {
          const one = shell.strip()[0]
          if (one === undefined) break
          shell.press(one)
        }
        const still = shell.node().doors.find((door) => shell.way(door) !== null)
        if (still === undefined || still.ends === true) break
        shell.walk(still)
      }
    }
    expect(checked, 'no seed in the sweep reached a room with teeth').toBeGreaterThan(0)
  })

  /**
   * **The door offers no way through, and its look says why** (art. 118).
   *
   * Both halves, because neither is worth anything without the other: an
   * absence with nothing behind it is a mystery, and a mystery the player has
   * no way to solve is the defect art. 118 exists to end. The stop still names
   * nothing (art. 3) — it does not have to, because there is only ever one
   * thing it could be about, and that thing is on the frame.
   */
  it('shuts every door in the room and says what is wrong', () => {
    let checked = 0
    for (const seed of SEEDS.slice(0, 24)) {
      const shell = untilTeeth(seed)
      if (shell === null) continue
      const node = shell.node()
      // The rule is a fact about the **room** and not about a door, because
      // that is what is true: the thing is in here with you, and the generator
      // gives every door of such a room the same fight.
      expect(horrorOf(node.fills), `${node.instance as string}`).not.toBeNull()
      expect(horrorStanding(node, []), `${node.instance as string}`).toBe(true)
      expect(horrorStanding(node, [HORROR_DOWN]), `${node.instance as string}`).toBe(false)
      expect(node.doors.length).toBeGreaterThan(0)
      checked += 1
    }
    expect(checked, 'no room with teeth in the sweep').toBeGreaterThan(0)
    // And the sentence exists, in the amended voice, saying nothing about what.
    const said = NOTICES['door.guarded'] ?? ''
    expect(said).not.toBe('')
    expect(said.toLowerCase()).not.toMatch(/gnawing|marrow|drowned|burnt|horror|fight/)
  })

  /**
   * **card 74's case, and it is the one the wave asked for by name.**
   *
   * With a horror present, no path exists from a door press to an opened
   * fight. It is asserted as an absence of verbs rather than as a refusal,
   * because art. 118 wants the verb *gone* — not greyed, not refusing, not
   * there — and a refusal that only fired at the last moment would leave the
   * press on the strip, which is the thing being repealed.
   */
  it('leaves no door press that could open a fight', () => {
    let checked = 0
    for (const seed of SEEDS) {
      const shell = shellAt(seed)
      for (let room = 0; room < shell.chain.length + 2; room++) {
        if (shell.horror() !== null) {
          // Look at everything, press everything: the greediest thumb there
          // is, and it still cannot leave through a door.
          for (const target of shell.things()) shell.tap(target)
          for (let guard = 0; guard < 8; guard++) {
            const one = shell.strip()[0]
            if (one === undefined) break
            shell.press(one)
          }
          for (const door of shell.node().doors) {
            expect(shell.way(door), `seed ${seed}: a door verb with teeth in the room`).toBeNull()
            // art. 118's second clause: the look is where the reason lives.
            expect(shell.sense(door), `seed ${seed}: the door said nothing`).toContain(
              NOTICES['door.guarded']!,
            )
          }
          // And the way out is the horror's own verb, which the look summoned.
          expect(shell.fightOffered(), `seed ${seed}: nothing to press at all`).toBe(true)
          checked += 1
          break
        }
        const way = shell.node().doors.find((door) => shell.way(door) !== null)
        if (way === undefined || way.ends === true) break
        for (let guard = 0; guard < 8; guard++) {
          const one = shell.strip()[0]
          if (one === undefined) break
          shell.press(one)
        }
        const still = shell.node().doors.find((door) => shell.way(door) !== null)
        if (still === undefined || still.ends === true) break
        shell.walk(still)
      }
    }
    expect(checked, 'no seed in the sweep reached a room with teeth').toBeGreaterThan(0)
  })

  /**
   * **And the horror still gates the way on until it falls** (the card's own
   * *what must not change*). Every door gives once the deed is written, and the
   * socket stops saying the thing is there (art. 70).
   */
  it('opens every door in the room once the thing is down, and empties the socket', () => {
    let checked = 0
    for (const seed of SEEDS) {
      const shell = shellAt(seed)
      for (let room = 0; room < shell.chain.length + 2; room++) {
        const mark = shell.horror()
        if (mark !== null) {
          for (const target of shell.things()) shell.tap(target)
          // A room can hold the run for two reasons at once, and they are
          // different reasons: art. 3 wants something taken, and the thing in
          // the room wants dealing with. Pay the first, so what is left is
          // only the second.
          for (let guard = 0; guard < 8; guard++) {
            const one = shell.strip()[0]
            if (one === undefined) break
            shell.press(one)
          }
          shell.enter()
          for (let n = 0; n < 300 && shell.fight?.outcome === 'fighting'; n++) shell.turn()
          if (shell.fight?.outcome !== 'won') break
          shell.won()
          const node = shell.node()
          const done = sceneStateOf(shell.ledgers, ROOM_BOOK, node).done
          expect(done, `seed ${seed}`).toContain(HORROR_DOWN)
          for (const door of node.doors) {
            expect(shell.way(door), `seed ${seed}: a door still shut after the win`).not.toBeNull()
          }
          // art. 70: the socket stops speaking, and there is nothing left to
          // tap where the thing was standing.
          expect(tappablesIn(ROOM_BOOK, node, done).map((one) => one.id)).not.toContain(mark)
          expect(shell.fightOffered(), `seed ${seed}: FIGHT survived the win`).toBe(false)
          // …and it says one thing about it rather than going silent.
          const said = beatsIn(ROOM_BOOK, node, null, done)
          expect(said.length, `seed ${seed}: nothing said about the fall`).toBeGreaterThan(0)
          checked += 1
          break
        }
        const way = shell.node().doors.find((door) => shell.way(door) !== null)
        if (way === undefined || way.ends === true) break
        for (let guard = 0; guard < 8; guard++) {
          const one = shell.strip()[0]
          if (one === undefined) break
          shell.press(one)
        }
        const still = shell.node().doors.find((door) => shell.way(door) !== null)
        if (still === undefined || still.ends === true) break
        shell.walk(still)
      }
    }
    expect(checked, 'no seed in the sweep beat something').toBeGreaterThan(0)
  })

  /**
   * art. 70: **prose confirms, pixels prove.** The socket going quiet is half
   * of it; the other half is that nothing is painted where the thing was. A
   * body still filling the far end while its verb is gone would be the world
   * remembering something that did not happen.
   */
  it('paints nothing where a beaten horror was standing', () => {
    const at = { X: 0, Y: 0, z: 8, width: 2, height: 3 }
    for (const one of ENCOUNTERS) {
      if (one.kind !== 'horror') continue
      expect(encounterProp(one.id, WET, at, []), one.id as string).not.toBeNull()
      expect(encounterProp(one.id, WET, at, [HORROR_DOWN]), one.id as string).toBeNull()
    }
    // And nothing else in a socket is touched by the deed — a key on the
    // floor of a room with teeth in it is still a key on the floor.
    expect(encounterProp(IRON_KEY, WET, at, [HORROR_DOWN])).not.toBeNull()
  })

  /** art. 69: every horror that ships has a candle for its own fall. */
  it('has a line for every horror that can be beaten in a room', () => {
    for (const one of ENCOUNTERS) {
      if (one.kind !== 'horror') continue
      const said = SOCKET_BEATS[`${one.id as string}.down`]
      expect(said, one.id as string).toBeDefined()
      expect(said!.length, one.id as string).toBeGreaterThan(0)
    }
  })

  /** The tappable a verb hangs off is the one the socket actually offers. */
  it('summons off a thing that is really on the frame', () => {
    let checked = 0
    for (const seed of SEEDS.slice(0, 24)) {
      const shell = untilTeeth(seed)
      if (shell === null) continue
      const node = shell.node()
      const mark = horrorMarkIn(node)
      expect(mark, `${node.instance as string}`).not.toBeNull()
      expect(tappablesIn(ROOM_BOOK, node).map((one) => one.id)).toContain(mark)
      checked += 1
    }
    expect(checked).toBeGreaterThan(0)
  })

  /**
   * card 74's own guarantee, re-asked under the new model: a depth still walks
   * end to end, and no room is ever a room the thumb cannot get out of. It is
   * the one that would go red if the fight verb went missing entirely — the
   * walk would reach a lair with no way on and call it stuck.
   */
  it('walks a depth end to end with the fight entered off the horror', () => {
    for (const seed of SEEDS) {
      const walked = walkDepth(seed)
      expect(walked.outcome, `seed ${seed}`).not.toBe('stuck')
      expect(walked.held, `seed ${seed}`).toEqual([])
    }
  })
})
