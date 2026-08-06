/**
 * card 49 — **the doors speak** (art. 31 as amended 2026-08-06).
 *
 * The Descent had commit, answer and change and was missing *perceive* and
 * *predict*, and half of the reason was in the law rather than in the code:
 * art. 31 parked the senses, so every choice was between identical unknowns
 * and the drift was asking art. 77's twenty questions in a language the
 * player could not read.
 *
 * Art. 77 already specified the mechanism — **a door's sense is its region
 * tag, leaking** — so this wave unparked it rather than inventing it. What
 * is tested here is the two rules that keep it honest, and they are tested
 * against the *catalog* rather than against a walk, because a sense that
 * named its region would name it on whichever seed happened to deal it.
 */

import { describe, expect, it } from 'vitest'

import { DEPTH_ONE, LABELS, NOTICES, SENSES, saysDoor } from '../src/content/index.js'
import type { Door, InstanceId } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import { coinFlip, runOf } from './drift.js'

const instance = (id: string): InstanceId => id as InstanceId

/** Every pool a depth can tag a door with, the neutral one included. */
const POOLS: readonly string[] = ['', ...DEPTH_ONE.regions.map((one) => one.id as string)]

/**
 * art. 31: **a sense is not a label.** It never ranks the doors against each
 * other and it never says *danger* — the player learns the vocabulary by
 * descending, which is art. 10's knowledge doing its job on the one thing in
 * the game nobody has ever been able to learn.
 */
const RANKING =
  /\b(danger|dangerous|deadly|safe|safer|safest|worse|worst|better|best|avoid|beware|careful|choose|pick this|right one|wrong one)\b/i

describe('art. 31 — every door carries a sense', () => {
  it('authors a vocabulary for every pool the depth can tag a door with', () => {
    for (const pool of POOLS) {
      const said = SENSES[pool]
      expect(said, `${pool === '' ? 'the neutral pool' : pool} has no senses`).toBeDefined()
      // More than one, or every door of a region says the same sentence and
      // a crossroads reads as one door drawn three times.
      expect(said!.length, pool).toBeGreaterThan(1)
      for (const line of said!) expect(line.trim().length, pool).toBeGreaterThan(0)
    }
  })

  /**
   * art. 69: silence is a bug, and a door is a thing on the frame like any
   * other. Walked rather than reasoned about: every door of every room of a
   * hundred runs, including the last one, which has no tag to leak.
   */
  it('answers every door of every room of a hundred runs (arts 6, 69)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      for (const node of chain.nodes) {
        for (const door of node.doors) {
          const said = saysDoor(door, node.instance)
          expect(said.length, `seed ${seed} / ${node.instance as string} / ${door.at}`)
            .toBeGreaterThan(0)
        }
      }
    }
  })

  /**
   * art. 31: **a sense is not a label.** It never names the region. The
   * player is meant to work out that wax and singed hair go together, and a
   * line that said *the burnt* would hand that over for nothing and spend
   * the whole of what art. 77's twenty questions are for.
   */
  it('never names the region it comes from, and never ranks a door', () => {
    for (const [pool, lines] of Object.entries(SENSES)) {
      // The words the region wears where the game does name it — the
      // arrival's own label (art. 78). None of them may appear here.
      const named = (LABELS[pool] ?? '')
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .map((word) => word.toLowerCase())
      for (const line of lines) {
        const said = line.toLowerCase()
        for (const word of named) {
          expect(said.includes(word), `${pool}: "${line}" names its own region`).toBe(false)
        }
        expect(RANKING.test(line), `${pool}: "${line}" ranks or warns`).toBe(false)
      }
    }
  })

  /**
   * art. 31: **a sense is true and partial.** It says what the region smells
   * like, never what the room contains — and it cannot, because under
   * art. 79 the room behind the door does not exist until the door is
   * opened. So no sense may name a room, a horror or a thing that is dealt.
   */
  it('names no room and no horror — there is nothing back there yet (art. 79)', () => {
    const forbidden = Object.entries(LABELS)
      .filter(([key]) => key.startsWith('room.') || key.startsWith('horror.'))
      .map(([, said]) => said.toLowerCase().replace(/^the /, ''))
    for (const [pool, lines] of Object.entries(SENSES)) {
      for (const line of lines) {
        const said = line.toLowerCase()
        for (const name of forbidden) {
          if (name.length < 5) continue
          expect(said.includes(name), `${pool}: "${line}" names ${name}`).toBe(false)
        }
      }
    }
  })
})

describe('art. 17, art. 36 — a sense is a fact about the door', () => {
  /**
   * The same door says the same thing every time it is tapped and every
   * time it is come back to, because the choice is hashed off the door's own
   * identity rather than drawn from a lot. A sense that moved between taps
   * would be a labyrinth that changed its story, which is worse than one
   * that says nothing.
   */
  it('says the same thing every time the same door is tapped', () => {
    const chain = runOf(7, coinFlip(7))
    for (const node of chain.nodes) {
      for (const door of node.doors) {
        const once = saysDoor(door, node.instance)
        for (let n = 0; n < 5; n++) expect(saysDoor(door, node.instance)).toBe(once)
      }
    }
  })

  /**
   * art. 31: a crossroads is three doors, and the drift can tag all three
   * with one region. Three identical sentences would read as one door drawn
   * three times, so the line is a function of *which* door as well as of the
   * tag.
   */
  it('gives three doors of one region three different sentences', () => {
    const region = DEPTH_ONE.regions[0]!.id
    const at = instance('room.crossing|0')
    const said = new Set(
      [0, 1, 2].map((n) => saysDoor({ at: n, region, demands: [] } as Door, at)),
    )
    expect(said.size).toBeGreaterThan(1)
  })

  /**
   * art. 37: the last door of the depth commits no room and carries no tag —
   * there is nothing left to lean toward — so it answers with what it is
   * rather than with a sense it does not have.
   */
  it("gives the Warden's door its own line rather than a neutral sense", () => {
    const chain = runOf(3, coinFlip(3))
    const last = hereIn(chain)
    const ends = last?.doors.find((door) => door.ends === true)
    if (ends !== undefined) {
      expect(saysDoor(ends, last!.instance)).toBe(NOTICES['door.last'])
    }
    // And asked of the shape directly, so the test says something whichever
    // seed it is handed.
    const door: Door = { at: 0, region: null, demands: [], ends: true }
    expect(saysDoor(door, instance('room.warden|8'))).toBe(NOTICES['door.last'])
    expect(SENSES['']).not.toContain(NOTICES['door.last'])
  })
})

describe('art. 77 — the lean is felt, never displayed', () => {
  /**
   * The tally is not shown in any form, ever. This is the one thing card 49
   * could most easily have broken: a sense is the tally leaking *one door at
   * a time*, and the moment anything says how many of a region have been
   * taken, no single door means much and the pattern of doors means nothing.
   *
   * So no sense may carry a number, a quantity or a comparison. *One* is
   * allowed only as the pronoun the door itself wears — *this one*, *the
   * last one* — because that is him pointing at a door rather than counting
   * doors, and every sense has to be able to point at its own door.
   */
  it('puts no number and no quantity in a sense', () => {
    const counting =
      /\d|\b(two|three|four|five|six|seven|eight|nine|ten|half|most|least|more|fewer|many|several|another)\b/i
    const counted = /(?<!\b(this|that|last|other)\s)\bone\b/i
    for (const [pool, lines] of Object.entries(SENSES)) {
      for (const line of lines) {
        expect(counting.test(line), `${pool}: "${line}" counts something`).toBe(false)
        expect(counted.test(line), `${pool}: "${line}" uses "one" as a number`).toBe(false)
      }
    }
  })
})
