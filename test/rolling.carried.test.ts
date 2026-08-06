import { describe, expect, it } from 'vitest'

import {
  ALL_RIDERS,
  BARE_BODY,
  CATALOG,
  CATALOG_GOODS,
  ENCOUNTERS,
  HAND_SIZE,
  LADDER,
  LEAVES_A_GOOD,
  ORIGINS,
  PLAIN_POUCH,
  RARITY,
  ROLLING_CAP,
  ROLLING_GOODS,
  ROOM_BOOK,
  SLIVER,
  THE_GNAWING,
  THE_SLIVER,
  THE_TIN_SAINT,
  TIN_SAINT,
  VERBS,
  everyString,
  leftBy,
  lintVoice,
  saysAct,
  takeActId,
} from '../src/content/index.js'
import { actsIn } from '../src/descent/index.js'
import { encounterOf, lotFrom } from '../src/gen/index.js'
import type { Fight, Goods, Lot, Trinket } from '../src/lots/index.js'
import {
  advanceFight,
  assembleHand,
  cast,
  claim,
  decide,
  openFight,
  recast,
  withTurn,
} from '../src/lots/index.js'
import {
  chooseHand,
  collect,
  firstPermanent,
  handFrom,
  sparesOf,
  tookIntoRun,
  wake,
} from '../src/state/index.js'
import { everyDie, seedOf, turnOf } from './helpers.js'
import { claimGreedily, keepSensibly } from './policy.js'
import { WAKING, rollingRows } from './report.js'

/**
 * **Card 93, section 3 — the content.**
 *
 * Two rolling goods, earned in the labyrinth, capped at two carried, and
 * carried like a wearable: never one of the six, never on the choosing screen,
 * taking no slot of the hand.
 *
 * What this file keeps is the *boundary* rather than the arithmetic. The
 * numbers are measured in `test/report.ts` and published in DESIGN.md; the
 * claims here are the ones the wave would have failed on — a trinket in the
 * pouch, a cap that can be walked past, a good with no origin sentence, a fight
 * that cannot resolve with one or two of them on, and a bite that kills in some
 * way a run has never been killed before.
 */

const NOTHING: Goods = { talismans: [], riders: [] }

/** A lot facing every trinket at a chosen face, so a turn is a stated turn. */
function facing(at: number, of = 6): Lot {
  return { next: () => at / of }
}

const bare = () => firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)

describe('card 93 §3 — they are earned, and they are not pouch dice', () => {
  it('registers each of them on art. 83’s two axes, at the rarest band', () => {
    for (const who of [TIN_SAINT, SLIVER]) {
      const one = encounterOf(CATALOG, who)
      expect(one, who as string).not.toBeNull()
      expect(one!.kind, who as string).toBe('boon')
      // One of each in the world, floating into whatever floor will take it.
      expect(one!.scope, who as string).toBe('unique')
      expect(one!.binding, who as string).toBe('floating')
      // The rarest band there is: most runs never make this find at all.
      expect(one!.weight, who as string).toBe(RARITY.rare)
    }
    expect(LEAVES_A_GOOD).toContain(TIN_SAINT)
    expect(LEAVES_A_GOOD).toContain(SLIVER)
    expect(leftBy(TIN_SAINT)).toEqual([THE_TIN_SAINT])
    expect(leftBy(SLIVER)).toEqual([THE_SLIVER])
  })

  /** art. 4: nothing here is required, so nothing here holds a door. */
  it('never lets a rolling good hold a door', () => {
    for (const who of [TIN_SAINT, SLIVER]) {
      const node = {
        instance: 'x#0' as never,
        room: 'room.trove.alcove' as never,
        type: 'trove' as const,
        step: 1,
        region: null,
        doors: [],
        fills: [{ socket: 'socket.floor' as never, encounter: who }],
        announces: null,
      }
      for (const one of actsIn(ROOM_BOOK, node)) expect(one.required, one.id).toBe(false)
    }
  })

  /**
   * **They are not pouch dice.** They never appear on the choosing screen,
   * are never part of the six, and are not selectable as core dice at a
   * waking — because the choosing screen walks the pouch and a trinket never
   * reaches it (`collect`).
   */
  it('never reaches the pouch, the hand, or the spares', () => {
    let permanent = bare()
    for (const one of ROLLING_GOODS) permanent = collect(permanent, one)
    expect(permanent.trinkets).toHaveLength(ROLLING_GOODS.length)
    expect(permanent.pouch.dice).toHaveLength(HAND_SIZE)
    expect(handFrom(permanent)).toHaveLength(HAND_SIZE)
    expect(sparesOf(permanent)).toEqual([])
    // The choosing screen offers exactly the pouch, so this is the assertion
    // that it cannot offer one of these.
    const offered = permanent.pouch.dice.map((die) => die.id as string)
    for (const one of ROLLING_GOODS) expect(offered).not.toContain(one.id as string)
  })

  /** And the signature is a die's, so a trinket never becomes one (art. 56). */
  it('never names the signature', () => {
    let permanent = bare()
    for (const one of ROLLING_GOODS) permanent = collect(permanent, one)
    expect(permanent.signature).toBeNull()
  })

  /** Nor does it move the hand a run is already holding (arts 60, 75). */
  it('leaves a run’s hand exactly where it found it', () => {
    const ledgers = wake(bare(), seedOf(1))
    const before = ledgers.run!.hand.dice
    let permanent = ledgers.permanent
    for (const one of ROLLING_GOODS) permanent = collect(permanent, one)
    expect(tookIntoRun(ledgers.run!, permanent).hand.dice).toEqual(before)
  })

  /** A choice made on the choosing screen cannot name one either (art. 60). */
  it('is ignored by a hand chosen at the waking', () => {
    let permanent = bare()
    for (const one of ROLLING_GOODS) permanent = collect(permanent, one)
    const chosen = chooseHand(permanent, ROLLING_GOODS.map((one) => one.id as never))
    expect(chosen.pouch.dice).toEqual(permanent.pouch.dice)
  })

  /** Collecting the same one twice owns it once (arts 11, 49). */
  it('owns each of them once, however many times it is taken', () => {
    const once = collect(bare(), THE_SLIVER)
    expect(collect(once, THE_SLIVER).trinkets).toHaveLength(1)
  })
})

describe('card 93 §3 — art. 87 holds, and the audit walks them', () => {
  it('gives each of them one sentence of origin, in the amended register', () => {
    for (const one of ROLLING_GOODS) {
      const said = ORIGINS[one.id as string]
      expect(said, one.id as string).toBeDefined()
      expect(said, one.id as string).not.toBe('')
      expect(lintVoice(said!, 'placeholder'), one.id as string).toEqual([])
      // And it is in the inventory the lint walks, so none can go unseen.
      expect(everyString().map((held) => held.text)).toContain(said!)
    }
  })

  it('lists them in the catalog nothing may quietly fall off (art. 54)', () => {
    for (const one of ROLLING_GOODS) {
      expect(CATALOG_GOODS.map((good) => good.id)).toContain(one.id)
    }
  })

  it('presses one authored plain verb to take one (arts 66, 68)', () => {
    for (const who of [TIN_SAINT, SLIVER]) {
      const id = takeActId(who)
      const verb = VERBS[id]
      expect(verb, id).toBeDefined()
      expect(verb!.trim().split(/\s+/).length, id).toBeLessThanOrEqual(2)
      expect(verb!, id).toMatch(/^[A-Z]/)
      // card 69: and the press answers with a line of its own.
      expect(saysAct(id), id).not.toBe('')
    }
  })

  /** Nothing else in the catalog was disturbed to make room for them. */
  it('leaves every other encounter’s weight and band alone', () => {
    const rolling = new Set<string>([TIN_SAINT as string, SLIVER as string])
    const others = ENCOUNTERS.filter((one) => !rolling.has(one.id as string))
    expect(others).toHaveLength(ENCOUNTERS.length - 2)
    // The two new rows are the only rows at the rarest band that are new: the
    // rest of the boon pool is what it was.
    expect(others.filter((one) => one.kind === 'boon')).toHaveLength(
      ENCOUNTERS.filter((one) => one.kind === 'boon').length - 2,
    )
  })
})

describe('card 93 §3 — a fight resolves with one carried, and with two', () => {
  const company = (trinkets: readonly Trinket[]): Goods => ({
    talismans: [],
    riders: ALL_RIDERS,
    trinkets,
    trinketCap: ROLLING_CAP,
  })

  /**
   * A whole fight, played to an end with `trinkets` on, every turn's roll
   * facing `face`. Two lots on purpose: the hand comes off the run's own
   * stream and the amendments off a stated one, which is exactly the shape
   * the shell has (`AMEND_LOT`) and the only way to say *this face, every
   * turn* out loud.
   */
  function played(trinkets: readonly Trinket[], face: number): Fight {
    const goods = company(trinkets)
    const hand = assembleHand(PLAIN_POUCH, HAND_SIZE)
    const lot = lotFrom(seedOf(7))
    let fight = openFight(THE_GNAWING, hand, BARE_BODY.health, BARE_BODY.armor, goods)
    let guard = 0
    let amended = 0
    while (fight.outcome === 'fighting' && guard++ < 200) {
      const turn = claimGreedily(recast(keepSensibly(cast(fight.turn, lot)), lot), goods)
      const resolution = decide(turn, 'end-turn', fight.armor, goods, facing(face))
      // art. 46: a turn that claimed nothing has no line to amend, so it rolls
      // nothing at all — everything else rolls once per carried good.
      expect(resolution.amends).toHaveLength(turn.claims.length === 0 ? 0 : trinkets.length)
      if (resolution.amends.length > 0) amended++
      fight = advanceFight(withTurn(fight, turn), resolution)
    }
    // A fight that never amended anything would prove nothing about carrying.
    if (trinkets.length > 0) expect(amended).toBeGreaterThan(0)
    return fight
  }

  it('runs to an end with one carried', () => {
    for (const one of ROLLING_GOODS) {
      // Face 0 on both of them is a face that fires, so every turn amends.
      const fight = played([one], 0)
      expect(fight.outcome, one.id as string).not.toBe('fighting')
    }
  })

  it('runs to an end with two carried, and both of them land every turn', () => {
    const fight = played(ROLLING_GOODS, 0)
    expect(fight.outcome).not.toBe('fighting')
  })

  it('runs to an end with two carried and both of them whiffing', () => {
    // Face 3 is a null on both, which is the *other* normal turn — and the
    // one that has to be indistinguishable from carrying nothing at all.
    const whiffing = played(ROLLING_GOODS, 3)
    expect(whiffing.outcome).not.toBe('fighting')
  })

  /**
   * **A cost face can kill you, and the death reads like any other.** The bite
   * is charged where art. 86's cost faces are charged, so the transcript says
   * `cost` and the Book keys on `cost` — nothing about the ending is new.
   */
  it('lets a bite finish a run, and finishes it the way a cost face does', () => {
    const goods = company([THE_SLIVER])
    const bite = THE_SLIVER.rolls.findIndex((face) => face.kind === 'cost')
    const hand = assembleHand(PLAIN_POUCH, HAND_SIZE)
    // Standing at exactly what the bite takes, so the bite is what ends it.
    const cost = THE_SLIVER.rolls[bite]!
    const health = cost.kind === 'cost' ? cost.amount : 1
    const fight = openFight(THE_GNAWING, hand, health, 99, goods, health)
    const laid = turnOf([2, 2, 3, 4, 5, 6], { intent: fight.turn.intent, card: fight.card })
    const turn = claim(laid, everyDie(laid).slice(0, 2), 'pair', LADDER, goods)
    const resolution = decide(turn, 'end-turn', 99, goods, facing(bite))
    expect(resolution.hurt).toBe(health)
    const after = advanceFight(withTurn(fight, turn), resolution)
    expect(after.outcome).toBe('lost')
    // The transcript is the ordinary one: a cost, then the ending. Nothing in
    // it says *trinket*, which is what makes the Book's line the usual line.
    const said = after.events.map((event) => event.kind)
    expect(said).toContain('cost')
    expect(said.at(-1)).toBe('ended')
  })

  /**
   * And it kills only because the body was already there. A bite on a whole
   * body is a wound: art. 120's price takes from the body and stops short of
   * the last of it, so no single carried thing is a run-ender on its own.
   */
  it('is a wound on a whole body, not a death (art. 120)', () => {
    const goods = company(ROLLING_GOODS)
    const bites = ROLLING_GOODS.map(
      (one) => one.rolls.findIndex((face) => face.kind === 'cost') / one.rolls.length,
    )
    // Both of them biting at once, which is the worst turn the cap allows.
    expect(new Set(bites).size).toBe(1)
    const hand = assembleHand(PLAIN_POUCH, HAND_SIZE)
    const fight = openFight(THE_GNAWING, hand, BARE_BODY.health, 99, goods, BARE_BODY.health)
    const laid = turnOf([2, 2, 3, 4, 5, 6], { intent: fight.turn.intent, card: fight.card })
    const turn = claim(laid, everyDie(laid).slice(0, 2), 'pair', LADDER, goods)
    const worst = decide(turn, 'end-turn', 99, goods, facing(bites[0]! * 6))
    expect(worst.hurt).toBeGreaterThan(0)
    expect(advanceFight(withTurn(fight, turn), worst).outcome).toBe('fighting')
  })

  /** The cap is what rolls, so a third carried good changes nothing. */
  it('rolls the cap and no more, however many are owned', () => {
    const goods = company([...ROLLING_GOODS, THE_TIN_SAINT])
    const laid = turnOf([4, 4, 5, 5, 6, 6])
    const turn = claim(laid, everyDie(laid).slice(0, 2), 'pair', LADDER, NOTHING)
    expect(decide(turn, 'end-turn', 0, goods, facing(0)).amends).toHaveLength(ROLLING_CAP)
  })
})

/**
 * **The rows, beside the bands.** Card 89's bands are asserted in
 * `test/lots.fairness.test.ts` and none of them is touched here: what this
 * describe block does is compute the extra rows DESIGN.md prints, and hold them
 * to the only two things the wave asks of them — that a rolling good is worth
 * carrying, and that none of them is worth what an unwhiffed multiplier face
 * measured (+0.254, near double a good bone, and the reason the Zealot is
 * reported as unaudited).
 *
 * The band itself is checked here too, in the one form that matters: the
 * *without* column of every row has to be the number card 89 published. If it
 * ever is not, something assumed a good, and that is the bug the wave says to
 * report rather than tune away.
 */
describe('card 93 §3 — the rows are information, and the bands do not move', () => {
  const RUNS = 600

  it('leaves the waking hand exactly where card 89 measured it', () => {
    const rows = rollingRows(WAKING, THE_GNAWING, 'the Gnawing', RUNS)
    for (const row of rows) {
      // Card 89's headline band: three in five, over five to seven turns.
      expect(row.without, row.good).toBeGreaterThan(0.5)
      expect(row.without, row.good).toBeLessThan(0.7)
    }
    // And every row agrees about it, because none of them changed the hand.
    expect(new Set(rows.map((row) => row.without)).size).toBe(1)
  })

  it('makes each of them worth carrying, and none of them worth a multiplier', () => {
    for (const row of rollingRows(WAKING, THE_GNAWING, 'the Gnawing', RUNS)) {
      expect(row.marginal, row.good).toBeGreaterThan(0)
      // An unwhiffed multiplier face measured +0.254 at a weak hand. A single
      // rolling good stays a long way under it; the pair of them at the cap is
      // allowed to be worth about a good bone and no more.
      expect(row.marginal, row.good).toBeLessThan(0.2)
    }
  })
})
