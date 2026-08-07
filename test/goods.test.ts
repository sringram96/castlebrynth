import { describe, expect, it } from 'vitest'

import {
  CATALOG,
  GRAMMAR,
  IRON_KEY,
  LEECH_BONE,
  RARITY,
  LEAVES_A_GOOD,
  PLAIN_POUCH,
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
import type { Lot } from '../src/gen/index.js'
import { pickBanded } from '../src/gen/index.js'
import type { Chain, ChainNode } from '../src/gen/index.js'
import { encounterOf } from '../src/gen/index.js'
import type { Ledgers } from '../src/state/index.js'
import { coinFlip, playRun, runWith } from './drift.js'

/**
 * Where the goods come from (cards 19, 20) and what a fork is (art. 89).
 *
 * The catalog is placed by the same registry everything else is placed by
 * (art. 83), so the tests here are about the *run*: does a person who walks
 * one find anybody, does the build depend on who, and does the fork actually
 * close the door it says it closes.
 */

/**
 * Every good an actual walk of this seed could have picked up.
 *
 * It asks the *acts* rather than the fills, because card 88 made a room able
 * to author one: the covered font's fork hands over a talisman from the
 * room itself, and a count that only read sockets would have said a run
 * carried something nothing offered it. `actsIn` is the same list the tray
 * builds from, so this cannot drift off what a thumb can actually reach.
 */
function offeredIn(chain: Chain): readonly string[] {
  const found: string[] = []
  for (const node of chain.nodes) {
    for (const one of actsIn(ROOM_BOOK, node)) {
      for (const good of one.takes ?? []) found.push(good.id as string)
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
    let deepestElder = -1
    let shallowestYounger = Number.POSITIVE_INFINITY
    for (let seed = 1; seed <= 400; seed++) {
      const chain = greedyRun(seed).chain
      const half = Math.floor(chain.length / 2)
      const elder = stepOfEncounter(chain, SISTER_ELDER as string)
      const younger = stepOfEncounter(chain, SISTER_YOUNGER as string)
      if (elder >= 0) sawElder++
      if (younger >= 0) sawYounger++
      if (elder >= 0) deepestElder = Math.max(deepestElder, elder)
      if (younger >= 0) shallowestYounger = Math.min(shallowestYounger, younger)
      // Neither half is ever dealt outside its band, and the younger is
      // never in the first half of the road.
      if (younger >= 0) expect(younger, `seed ${seed}`).toBeGreaterThanOrEqual(half)
      if (elder >= 0 && younger >= 0) expect(elder, `seed ${seed}`).toBeLessThan(younger)
    }
    // And the axis is not decoration: both halves do get dealt…
    expect(sawElder).toBeGreaterThan(0)
    expect(sawYounger).toBeGreaterThan(0)
    /**
     * …and the two bands are **disjoint and in order**, which is the claim
     * art. 52's carry actually rests on: finding one half means the other is
     * somewhere *below*, so a run that holds both walked for the second.
     *
     * **This replaces a count that was a coin toss** (card 93). The assertion
     * used to be *some run in this sample held both*, and both halves are dealt
     * at the rarest band there is — one run in about two thousand holds the
     * pair, so a four-hundred-seed sample saw it or did not depending on the
     * pool, and card 93's two extra boon rows were enough to tip it from seen to
     * unseen. Nothing about the bands or the weights moved; what moved is that
     * the structural claim is now checked structurally instead of sampled for.
     */
    expect(deepestElder).toBeLessThan(shallowestYounger)
  })

  /**
   * art. 83's scope axis, asked of the dealer: a good that floats into a
   * socket is `unique` and is never *dealt* twice in one run.
   *
   * It is asked of the fills rather than of the acts, and card 88 is why.
   * A room may author a good now, and art. 82 lets a run be dealt the same
   * room twice — so the covered font's counting stone can be *offered* by
   * two instances of one room, which is a fact about the arrangement and
   * not about the dealer's scopes. What may never happen is collecting it
   * twice, and that is the test below.
   */
  it('never deals one socketed good twice in a run — every good is unique (art. 83)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const offered: string[] = []
      for (const node of greedyRun(seed).chain.nodes) {
        for (const fill of node.fills) {
          for (const who of [fill.encounter, ...(fill.orElse === undefined ? [] : [fill.orElse])]) {
            for (const good of leftBy(who)) offered.push(good.id as string)
          }
        }
      }
      expect(new Set(offered).size, `seed ${seed}`).toBe(offered.length)
    }
  })

  /**
   * arts 82, 118 (card 88): **and no run walks out holding one good twice.**
   *
   * `collect` is idempotent by id, so a second take was always a silent
   * no-op — which is exactly the dead press art. 118 bans, and it became
   * reachable the moment a room could author a good. The strip does not
   * offer an act whose whole payload is already on the ledger, so a second
   * covered font in one run has nothing under its cloth to press for.
   */
  it('never lets a greedy run collect one good twice (arts 82, 118)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { permanent } = greedyRun(seed).ledgers
      const carried = [
        ...permanent.pouch.dice.map((die) => die.id as string),
        ...permanent.keepsakes.map((kept) => kept.id as string),
        ...permanent.wearables.map((worn) => worn.id as string),
      ]
      expect(new Set(carried).size, `seed ${seed}`).toBe(carried.length)
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
      // The bare pouch is what you woke with, so what you *found* is
      // everything past it — read off the pouch rather than written down,
      // because art. 55's number is content's and has moved once already.
      const carried =
        ledgers.permanent.pouch.dice.length -
        PLAIN_POUCH.dice.length +
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

/**
 * **art. 125 — a weight names a band, and a band is a share of finds**
 * (ruled 2026-08-07, the mend's third wave).
 *
 * The debt this closes was arithmetic nobody wrote down. `weight` was a share
 * of the whole pool, so adding a seventh good at `uncommon` made the six
 * already there rarer *and* made the whole uncommon band heavier than the
 * common one: the catalog's effective mix had drifted to 40 / 47 / 13 against
 * bands declared 6 / 3 / 1, and the two words had swapped places. Fine at
 * eight goods, wrong at thirty.
 *
 * These are asked of `pickBanded` directly rather than of a thousand runs,
 * because the article is a claim about a draw and a draw is a pure function.
 * The distributional half — that a run still finds one or two goods and that
 * the bands land where they are declared — is `playRun` above.
 */
describe('art. 125 — rarity is a band', () => {
  /** A lot that walks the unit interval, so a draw is a measurement. */
  const sweeping = (steps: number): { lot: Lot; at: () => number } => {
    let n = 0
    return { lot: { next: () => (n++ + 0.5) / steps }, at: () => n }
  }

  const shares = (items: readonly { id: string; weight: number }[], steps = 20_000) => {
    const { lot } = sweeping(steps)
    const seen = new Map<string, number>()
    for (let n = 0; n < steps; n++) {
      const drawn = pickBanded(items, (one) => one.weight, lot)!
      seen.set(drawn.id, (seen.get(drawn.id) ?? 0) + 1)
    }
    return (id: string): number => (seen.get(id) ?? 0) / steps
  }

  it('gives a band its declared share however many goods are in it', () => {
    const three = [
      { id: 'a', weight: 6 },
      { id: 'b', weight: 6 },
      { id: 'c', weight: 6 },
      { id: 'r', weight: 2 },
    ]
    const share = shares(three)
    // The rare band is one good and takes 2/8 of the draws.
    expect(share('r')).toBeCloseTo(0.25, 2)
    // The common band is three goods sharing 6/8, uniformly.
    for (const id of ['a', 'b', 'c']) expect(share(id)).toBeCloseTo(0.25, 2)
  })

  /**
   * The load-bearing one: **adding a good dilutes its own band and nothing
   * else.** Under the old relative draw the rare good below would have gone
   * from 2/8 to 2/14 for a reason nobody chose.
   */
  it('leaves every other band exactly where it was when a band grows', () => {
    const before = shares([
      { id: 'a', weight: 6 },
      { id: 'b', weight: 6 },
      { id: 'r', weight: 2 },
    ])
    const after = shares([
      { id: 'a', weight: 6 },
      { id: 'b', weight: 6 },
      { id: 'c', weight: 6 },
      { id: 'd', weight: 6 },
      { id: 'r', weight: 2 },
    ])
    expect(after('r')).toBeCloseTo(before('r'), 2)
    // And the common band's members each got their fair share of the dilution.
    expect(after('a')).toBeCloseTo(before('a') / 2, 2)
  })

  it('gives an empty band away to the bands that still have something', () => {
    const share = shares([{ id: 'r', weight: 2 }])
    expect(share('r')).toBeCloseTo(1, 5)
    expect(pickBanded([], () => 6, { next: () => 0.5 })).toBeNull()
  })

  /** A weight of zero is a ban, exactly as it is for `pick` (art. 125). */
  it('treats a weight of nothing as a ban and not as a discouragement', () => {
    const share = shares([
      { id: 'banned', weight: 0 },
      { id: 'kept', weight: 3 },
    ])
    expect(share('banned')).toBe(0)
    expect(share('kept')).toBe(1)
  })

  /**
   * One draw, not two. A banded draw consumes exactly what `pick` consumed,
   * so no seeded sequence changes length under the ruling — which is why the
   * pre-rolling transcript's *fights* half still matches byte for byte.
   */
  it('consumes exactly one draw, like the pick it replaces', () => {
    const { lot, at } = sweeping(4)
    pickBanded([{ id: 'a', weight: 6 }, { id: 'r', weight: 1 }], (one) => one.weight, lot)
    expect(at()).toBe(1)
  })

  /**
   * And the catalog is banded rather than scattered: every good on the floor
   * declares one of the three shares and nothing in between, so the article
   * has something to be about.
   */
  it('bands the whole boon catalog on the declared shares', () => {
    const bands = new Set<number>(Object.values(RARITY))
    for (const one of CATALOG.encounters) {
      if (one.kind !== 'boon' || one.binding !== 'floating') continue
      // The iron key is placed by art. 80 rather than drawn, so it is the
      // one row in this socket that answers to no band.
      if ((one.id as string) === (IRON_KEY as string)) continue
      expect(bands, `${one.id as string}`).toContain(one.weight)
    }
  })
})

/**
 * **art. 89 as amended — the fork's frequency is declared** (2026-08-07).
 *
 * The debt: *"a lever whose frequency is an accident of three other numbers
 * is not being pulled on purpose."* It is two declared numbers multiplied
 * now — the chance an initiator is dealt, which art. 125 makes a band, times
 * `GRAMMAR.forkChance`. The measured rate is asserted here so that a content
 * change which moves it moves a test with it, rather than moving it quietly.
 */
describe('art. 89 — how often a fork is met, on purpose', () => {
  const RUNS = 800

  const forksIn = (chance: number): { runs: number; per: number } => {
    const grammar = { ...GRAMMAR, forkChance: chance }
    let withFork = 0
    let forks = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      let any = false
      for (const node of runWith(CATALOG, grammar, seed, coinFlip(seed)).nodes) {
        for (const fill of node.fills) {
          if (fill.orElse === undefined) continue
          forks += 1
          any = true
        }
      }
      if (any) withFork += 1
    }
    return { runs: withFork / RUNS, per: forks / RUNS }
  }

  it('meets one in about a sixth of runs, which is the chosen rate', () => {
    const met = forksIn(GRAMMAR.forkChance)
    expect(met.runs).toBeGreaterThan(0.12)
    expect(met.runs).toBeLessThan(0.22)
    // And almost never twice: a fork is a decision, not a room type.
    expect(met.per).toBeLessThan(met.runs * 1.25)
  })

  /**
   * The number is doing work rather than sitting there. Turning it down
   * turns the rate down; turning it off means no fork is ever formed, and
   * the goods that would have paired still get dealt on their own.
   */
  it('is the knob it says it is', () => {
    expect(forksIn(0).runs).toBe(0)
    expect(forksIn(0.5).runs).toBeLessThan(forksIn(1).runs)
  })

  /**
   * **And it does not pay for itself out of art. 125.** The chance is asked
   * *after* the ordinary draw, so it cannot promote the goods that can fork
   * — if it could, a fork would be financing itself out of the rarity bands
   * and the two rules would not compose.
   *
   * It is *near* rather than *exactly* equal, and the reason is honest: a
   * fork that forms spends its partner, so the pool the rest of the run
   * draws from differs downstream. That is the fork costing two goods, which
   * is what art. 89 says a fork is. What would be a defect is a systematic
   * lift, and 0.6% of a rate is not one.
   */
  it('leaves the initiators as rare as their band says, whatever the chance', () => {
    const dealtWith = (chance: number): number => {
      const grammar = { ...GRAMMAR, forkChance: chance }
      let seen = 0
      for (let seed = 1; seed <= RUNS; seed++) {
        for (const node of runWith(CATALOG, grammar, seed, coinFlip(seed)).nodes) {
          for (const fill of node.fills) {
            if (fill.encounter === LEECH_BONE || fill.encounter === SISTER_ELDER) seen += 1
          }
        }
      }
      return seen / RUNS
    }
    const off = dealtWith(0)
    const on = dealtWith(1)
    expect(Math.abs(on - off) / off).toBeLessThan(0.05)
  })
})
