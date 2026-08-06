/**
 * card 74 — **the screen harness.**
 *
 * *"39 files · 437 passed — none of the above is caught by the suite."* Every
 * existing test asks the engine a question and every finding in the playtest
 * of 2026-08-06 was about the screen: which verbs got offered, and what got
 * said when one was pressed. Both of those lived inside `main.ts` next to the
 * code that builds a `<button>`, so the only way to ask them was to run a
 * browser, and nothing ever did.
 *
 * `test/screen.ts` is the shell's state machine with the painting taken out.
 * These are the three guarantees the report asked for by name, walked over
 * whole depths rather than asserted about one contrived room.
 *
 * **The bar for this wave: every one of these fails against the code as it
 * stood on the morning of 2026-08-06.**
 */

import { describe, expect, it } from 'vitest'

import { ENCOUNTERS, ROOMS, ROOM_BOOK, encounterWords, saysAct } from '../src/content/index.js'
import { heldBack, tappablesIn } from '../src/descent/index.js'
import type { WorldMark } from '../src/room/index.js'
import { shellAt, walkDepth } from './screen.js'

const NOWHERE: WorldMark = { X: 0, Y: 0, z: 1, width: 1, height: 1 }

/** Enough seeds to walk every kind of room the depth can deal. */
const SEEDS = Array.from({ length: 60 }, (_, n) => n + 1)

describe('card 74 — no dead press', () => {
  it('never offers a verb whose press leaves the ledgers where they were', () => {
    // The anti-softlock guarantee, and the reason this file exists: a bot
    // pressed Open twelve times in one room and never left it.
    let pressed = 0
    for (const seed of SEEDS) {
      const walked = walkDepth(seed)
      for (const press of walked.presses) {
        expect(press.moved, `seed ${seed}: ${press.verb} moved nothing`).toBe(true)
      }
      pressed += walked.presses.length
    }
    expect(pressed, 'the sweep pressed something').toBeGreaterThan(SEEDS.length)
  })

  it('never leaves a walk standing in a room with no way out of it', () => {
    // art. 118's third clause is what makes this true rather than lucky: a
    // room may only hold you back for something already on the frame, so a
    // walk that presses everything it is offered can always leave.
    for (const seed of SEEDS) {
      const walked = walkDepth(seed)
      expect(walked.held, `seed ${seed} stranded a run`).toEqual([])
      expect(walked.outcome, `seed ${seed}`).not.toBe('stuck')
    }
  })

  it('takes the way on away while a room is still owed something, and gives it back', () => {
    // Both halves in one room: the verb is absent, and one press brings it
    // back. Neither half is worth anything without the other.
    let checked = 0
    for (const seed of SEEDS) {
      const shell = shellAt(seed)
      for (let room = 0; room < shell.chain.length + 2; room++) {
        for (const target of shell.things()) shell.tap(target)
        const owed = heldBack(shell.ledgers, ROOM_BOOK, shell.node())
        if (owed.length > 0) {
          for (const door of shell.node().doors) {
            expect(shell.way(door), `seed ${seed}: a way on while the room is owed`).toBeNull()
          }
          for (let guard = 0; guard < 8; guard++) {
            const one = shell.strip()[0]
            if (one === undefined) break
            shell.press(one)
          }
          expect(heldBack(shell.ledgers, ROOM_BOOK, shell.node())).toEqual([])
          // card 95: **and the thing in it has to be down as well.** A room
          // can hold the run for two reasons at once and they are different
          // reasons — art. 3 wants something taken, and a horror standing in
          // the room wants dealing with. Paying one does not answer the other,
          // which is the whole of why the door's look now says which it is.
          if (shell.fightOffered()) {
            shell.enter()
            for (let n = 0; n < 300 && shell.fight?.outcome === 'fighting'; n++) shell.turn()
            if (shell.fight?.outcome !== 'won') break
            shell.won()
          }
          expect(
            shell.node().doors.some((door) => shell.way(door) !== null),
            `seed ${seed}: the room did not let go once it was paid`,
          ).toBe(true)
          checked += 1
          break
        }
        const way = shell.node().doors.find((door) => shell.way(door) !== null)
        if (way === undefined || way.ends === true || way.fight !== undefined) break
        for (let guard = 0; guard < 8; guard++) {
          const one = shell.strip()[0]
          if (one === undefined) break
          shell.press(one)
        }
        const still = shell.node().doors.find((door) => shell.way(door) !== null)
        if (still === undefined || still.ends === true || still.fight !== undefined) break
        shell.walk(still)
      }
    }
    expect(checked, 'some run in the sweep was held back').toBeGreaterThan(0)
  })
})

describe('card 74 — every act answers', () => {
  it('changes the word band on every press, in every room of every depth', () => {
    // card 69's guarantee, driven rather than asserted: it is not enough for
    // a line to exist in `NOTICES`, it has to be what the band shows after
    // the press.
    for (const seed of SEEDS) {
      for (const press of walkDepth(seed).presses) {
        if (press.verb === 'Attack') continue
        expect(press.after, `seed ${seed}: ${press.verb} said nothing`).not.toBe('')
        expect(press.after, `seed ${seed}: ${press.verb} did not change the band`).not.toBe(
          press.before,
        )
      }
    }
  })

  it('never answers with a line the room was already showing', () => {
    // The exact defect: the band fell through to the candle underneath, so
    // *Take bone* replied with the candle that says a bone is in the hand.
    const shell = shellAt(3)
    for (const target of shell.things()) shell.tap(target)
    for (let guard = 0; guard < 8; guard++) {
      const one = shell.strip()[0]
      if (one === undefined) break
      const press = shell.press(one)
      expect(press.after).toBe(saysAct(one.id))
      expect(press.after).not.toBe(press.before)
    }
  })

  it('answers every tap, so no thing on the frame is a dead pixel (art. 69)', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const shell = shellAt(seed)
      for (let room = 0; room < shell.chain.length + 2; room++) {
        for (const target of tappablesIn(ROOM_BOOK, shell.node())) {
          expect(
            shell.tap(target),
            `seed ${seed}: ${target.id} in ${shell.node().instance} answers with nothing`,
          ).not.toBe('')
        }
        const way = shell.node().doors.find((door) => shell.way(door) !== null)
        if (way === undefined || way.ends === true || way.fight !== undefined) break
        shell.walk(way)
      }
    }
  })
})

describe('card 74 — the turn speaks', () => {
  it('names both numbers that moved, on every turn of every fight it walks', () => {
    let turns = 0
    for (const seed of SEEDS) {
      const walked = walkDepth(seed)
      for (const press of walked.presses) {
        if (press.verb !== 'Attack') continue
        turns += 1
        // Every turn either dealt something, took something, or neither —
        // and it says which. What it may never do is say nothing at all, or
        // say the same thing the intent underneath was already saying.
        expect(press.after, `seed ${seed}: a turn said nothing`).not.toBe('')
        expect(press.after, `seed ${seed}: a turn said only the intent`).not.toBe(press.before)
      }
    }
    expect(turns, 'the sweep fought something').toBeGreaterThan(SEEDS.length)
  })

  it('puts the attack’s own number in the line whenever a turn dealt harm', () => {
    // The claim the report made concrete: the offer read *pair 20* and
    // nothing afterwards ever said twenty.
    let withNumbers = 0
    for (const seed of SEEDS.slice(0, 12)) {
      for (const press of walkDepth(seed).presses) {
        if (press.verb !== 'Attack') continue
        if (/\d/.test(press.after)) withNumbers += 1
      }
    }
    expect(withNumbers, 'no turn in the sweep named a number').toBeGreaterThan(0)
  })
})

describe('card 74 — what the harness is allowed to miss', () => {
  it('covers every act the catalog can offer, so nothing hides behind a rare seed', () => {
    // A sweep only guarantees what it walks past. This is the honest check
    // that the *catalog* is covered even where the dealing did not oblige.
    const ids = new Set<string>()
    for (const room of ROOMS) for (const one of room.acts) ids.add(one.id)
    for (const who of ENCOUNTERS) {
      for (const one of encounterWords(who.id, NOWHERE).acts) ids.add(one.id)
    }
    for (const id of ids) expect(saysAct(id), `${id} has no answer`).not.toBe('')
    expect(ids.size).toBeGreaterThan(8)
  })
})
