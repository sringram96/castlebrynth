import { describe, expect, it } from 'vitest'

import {
  CATALOG,
  LEAVES_A_GOOD,
  PLATE,
  ROOM_BOOK,
  RUSTED_PLATE,
  SISTERS_BOND,
  SISTER_ELDER,
  SISTER_YOUNGER,
  THE_CORD,
  THE_SISTERS,
  leftBy,
  lostId,
  takeActId,
} from '../src/content/index.js'
import { act, actsIn, beatsIn, sceneStateOf } from '../src/descent/index.js'
import type { Chain, ChainNode } from '../src/gen/index.js'
import { encounterOf } from '../src/gen/index.js'
import type { Ledgers } from '../src/state/index.js'
import { coinFlip, playRun } from './drift.js'

/**
 * Where the goods come from (cards 19, 20) and what a fork is (art. 89).
 *
 * The catalog is placed by the same registry everything else is placed by
 * (art. 83), so the tests here are about the *run*: does a person who walks
 * one find anybody, does the build depend on who, and does the fork actually
 * close the door it says it closes.
 */

/** Every good an actual walk of this seed could have picked up. */
function offeredIn(chain: Chain): readonly string[] {
  const found: string[] = []
  for (const node of chain.nodes) {
    for (const fill of node.fills) {
      for (const who of [fill.encounter, ...(fill.orElse === undefined ? [] : [fill.orElse])]) {
        for (const good of leftBy(who)) found.push(good.id as string)
      }
    }
  }
  return found
}

/** Which step of the run an encounter was dealt at, or -1. */
function stepOfEncounter(chain: Chain, who: string): number {
  for (const node of chain.nodes) {
    for (const fill of node.fills) {
      if ((fill.encounter as string) === who || (fill.orElse as string) === who) return node.step
    }
  }
  return -1
}

/** A run walked with a policy, taking everything it is offered. */
function greedyRun(seed: number): { ledgers: Ledgers; chain: Chain } {
  const played = playRun(seed, coinFlip(seed), true)
  return { ledgers: played.ledgers, chain: played.chain }
}

describe('cards 19–20 — the goods are found rather than fixtured', () => {
  it('places the Sisters, a talisman and the plate through the registry (art. 83)', () => {
    for (const who of [SISTER_ELDER, SISTER_YOUNGER, PLATE]) {
      expect(encounterOf(CATALOG, who), who as string).not.toBeNull()
    }
    expect(leftBy(SISTER_ELDER)[0]).toBe(THE_SISTERS[0])
    expect(leftBy(SISTER_YOUNGER)[0]).toBe(THE_SISTERS[1])
    expect(leftBy(PLATE)[0]).toBe(RUSTED_PLATE)
    // art. 52: the bond is exact-pair only, and both halves carry it.
    expect(THE_SISTERS[0].bond).toBe(SISTERS_BOND)
    expect(THE_SISTERS[1].bond).toBe(SISTERS_BOND)
    // art. 53: one talisman of the ladder species ships.
    expect(THE_CORD.species).toBe('ladder')
    expect(THE_CORD.ladder?.tiers).toBe(1)
  })

  /**
   * art. 52's carry, made true of the run: finding one half has to mean the
   * other is somewhere *below*. The halves are banded apart, so no run can
   * hand you both before it has made you walk for the second.
   */
  it('never offers both halves of the Sisters in a run’s first half', () => {
    let sawElder = 0
    let sawYounger = 0
    let sawBoth = 0
    for (let seed = 1; seed <= 400; seed++) {
      const chain = greedyRun(seed).chain
      const half = Math.floor(chain.length / 2)
      const elder = stepOfEncounter(chain, SISTER_ELDER as string)
      const younger = stepOfEncounter(chain, SISTER_YOUNGER as string)
      if (elder >= 0) sawElder++
      if (younger >= 0) sawYounger++
      if (elder >= 0 && younger >= 0) sawBoth++
      // Neither half is ever dealt outside its band, and the younger is
      // never in the first half of the road.
      if (younger >= 0) expect(younger, `seed ${seed}`).toBeGreaterThanOrEqual(half)
      if (elder >= 0 && younger >= 0) expect(elder, `seed ${seed}`).toBeLessThan(younger)
    }
    // And the axis is not decoration: both halves do get dealt, and a run
    // occasionally holds them both — after walking for the second.
    expect(sawElder).toBeGreaterThan(0)
    expect(sawYounger).toBeGreaterThan(0)
    expect(sawBoth).toBeGreaterThan(0)
  })

  it('never deals one good twice in a run — every good is unique (art. 83)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const offered = offeredIn(greedyRun(seed).chain)
      expect(new Set(offered).size, `seed ${seed}`).toBe(offered.length)
    }
  })

  /**
   * Card 20's integration test: a run's shape depends on who you found. Both
   * halves of that — that somebody is findable, and that the build varies —
   * are properties of many runs rather than of one.
   */
  it('lets a seeded run meet a traveler and walk out with three goods or more', () => {
    let best = 0
    let withATraveler = 0
    let bestSeed = -1
    for (let seed = 1; seed <= 400; seed++) {
      const { ledgers, chain } = greedyRun(seed)
      const met = LEAVES_A_GOOD.filter((who) => ledgers.permanent.met.includes(who))
      if (met.some((who) => (who as string).startsWith('enc.traveler.'))) withATraveler++
      const carried =
        ledgers.permanent.pouch.dice.length -
        5 +
        ledgers.permanent.keepsakes.length +
        ledgers.permanent.wearables.length
      if (carried > best) {
        best = carried
        bestSeed = seed
      }
      expect(offeredIn(chain).length, `seed ${seed}`).toBeGreaterThanOrEqual(carried)
    }
    expect(withATraveler, 'no run in four hundred met a traveler').toBeGreaterThan(0)
    expect(best, `best build was ${best} goods (seed ${bestSeed})`).toBeGreaterThanOrEqual(3)
  })

  it('leaves plenty of runs with a different build from their neighbours', () => {
    const builds = new Set<string>()
    for (let seed = 1; seed <= 120; seed++) {
      const { ledgers } = greedyRun(seed)
      builds.add(
        [
          ...ledgers.permanent.pouch.dice.slice(5).map((die) => die.id as string),
          ...ledgers.permanent.keepsakes.map((one) => one.id as string),
          ...ledgers.permanent.wearables.map((one) => one.id as string),
        ]
          .sort()
          .join('+'),
      )
    }
    // A run's shape depends on who you found, so a hundred and twenty runs
    // may not all be the same run.
    expect(builds.size).toBeGreaterThan(4)
  })
})

/**
 * The first seeded run that deals a fork, walked without taking anything —
 * so the room is found standing as the dealer left it, and the deeds the
 * test writes are the only deeds on it.
 */
function findAFork(): { ledgers: Ledgers; chain: Chain; node: ChainNode; seed: number } {
  for (let seed = 1; seed <= 600; seed++) {
    const played = playRun(seed, coinFlip(seed), true, false)
    const at = played.chain.nodes.find((one) =>
      one.fills.some((fill) => fill.orElse !== undefined),
    )
    if (at !== undefined) {
      return { ledgers: played.ledgers, chain: played.chain, node: at, seed }
    }
  }
  throw new Error('no run in six hundred dealt a fork')
}

describe('art. 89 — the fork', () => {
  it('deals both goods into one socket, and the run spends both', () => {
    const { node } = findAFork()
    const fill = node.fills.find((one) => one.orElse !== undefined)!
    expect(leftBy(fill.encounter).length).toBeGreaterThan(0)
    expect(leftBy(fill.orElse!).length).toBeGreaterThan(0)
    expect(fill.encounter).not.toBe(fill.orElse)
  })

  it('states the terms before either verb is on the strip (arts 66, 68)', () => {
    const { node } = findAFork()
    const said = beatsIn(ROOM_BOOK, node)
    const terms = 'Two things lie here. What you take closes what you leave.'
    expect(said).toContain(terms)
    // Said first, and said once — before anything either side of the fork
    // has to say about itself (the labyrinth never explains itself twice).
    const fill = node.fills.find((one) => one.orElse !== undefined)!
    const own = ROOM_BOOK.beats(node.room)
    expect(said.indexOf(terms)).toBeGreaterThanOrEqual(own.length)
    expect(said.filter((one) => one === terms)).toHaveLength(1)
    // And two verbs the thumb can tell apart.
    const takes = actsIn(ROOM_BOOK, node).filter((one) => one.id.startsWith('act.take.'))
    expect(takes).toHaveLength(2)
    expect(takes[0]!.verb).not.toBe(takes[1]!.verb)
    expect(takes[0]!.forfeits).toContain(takeActId(fill.orElse!))
    void fill
  })

  it('takes one and closes the other, irrevocably (art. 89)', () => {
    const found = findAFork()
    const fill = found.node.fills.find((one) => one.orElse !== undefined)!
    // Stand where the fork is, so the deeds are written against it.
    const ledgers: Ledgers = {
      ...found.ledgers,
      run: {
        ...found.ledgers.run!,
        at: { ...found.ledgers.run!.at, instance: found.node.instance, step: found.node.step },
      },
    }
    const mine = actsIn(ROOM_BOOK, found.node).find(
      (one) => one.id === takeActId(fill.encounter),
    )!
    const theirs = actsIn(ROOM_BOOK, found.node).find(
      (one) => one.id === takeActId(fill.orElse!),
    )!

    const before = ledgers.permanent.pouch.dice.length + ledgers.permanent.wearables.length
    const after = act(ledgers, mine)
    const taken =
      after.permanent.pouch.dice.length + after.permanent.wearables.length
    expect(taken).toBe(before + 1)

    // The other is gone from the run: pressing it does nothing at all.
    const pressed = act(after, theirs)
    expect(pressed.permanent).toBe(after.permanent)
    expect(pressed.run!.did).toEqual(after.run!.did)
    // …and it is gone because the take wrote it off, not because the tray
    // happened to stop drawing it.
    expect(after.run!.did).toContain(`${found.node.instance}|${takeActId(fill.orElse!)}`)
    expect(after.run!.did).toContain(`${found.node.instance}|${lostId(fill.orElse!)}`)
  })

  it('shows the loss in the room when you stand in it again (arts 70, 89)', () => {
    const found = findAFork()
    const fill = found.node.fills.find((one) => one.orElse !== undefined)!
    const ledgers: Ledgers = {
      ...found.ledgers,
      run: {
        ...found.ledgers.run!,
        at: { ...found.ledgers.run!.at, instance: found.node.instance, step: found.node.step },
      },
    }
    const mine = actsIn(ROOM_BOOK, found.node).find(
      (one) => one.id === takeActId(fill.encounter),
    )!

    const before = sceneStateOf(ledgers, ROOM_BOOK, found.node)
    expect(before.done).toEqual([])

    const after = sceneStateOf(act(ledgers, mine), ROOM_BOOK, found.node)
    // What you carried out, and what closed behind you. Both are in the
    // scene, and the second is what art. 89 owes the pixels.
    expect(after.done).toContain(takeActId(fill.encounter))
    expect(after.done).toContain(lostId(fill.orElse!))
    // Neither is on the strip any more.
    const left = actsIn(ROOM_BOOK, found.node).filter(
      (one) => !after.done.includes(one.id),
    )
    expect(left.map((one) => one.id)).not.toContain(takeActId(fill.orElse!))
  })
})
