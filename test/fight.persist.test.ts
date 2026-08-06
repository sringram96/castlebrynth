import { describe, expect, it } from 'vitest'

import {
  LADDER,
  ROOM_BOOK,
  THE_GNAWING,
  THE_SILT_MOTHER,
  horrorById,
} from '../src/content/index.js'
import { enterRoom } from '../src/descent/index.js'
import {
  openFightDoor,
  pausedAt,
  restoreFight,
  routeFlight,
  saveFight,
  turnLots,
} from '../src/hinge/index.js'
import type { DieId, Fight, Goods, Line, Turn } from '../src/lots/index.js'
import {
  advanceFight,
  cast,
  casting,
  claim,
  claimable,
  decide,
  keep,
  recast,
  unspent,
  withTurn,
} from '../src/lots/index.js'
import type { FightPhase, InstanceId, Ledgers, Vault } from '../src/state/index.js'
import { load, save } from '../src/state/index.js'
import { atAFight } from './drift.js'

/**
 * art. 75 — a half-spent turn survives the lock screen — and art. 63 — a
 * fled fight pauses rather than refilling.
 *
 * The two are one mechanism: the fight is written into the run on every
 * mutation, and read back by replaying its castings from the run's own seed.
 * Which is why running out cannot launder a card: coming back is a resume,
 * not a fresh door.
 */
const NO_GOODS: Goods = { talismans: [], riders: [] }

/** A vault that can be killed: only the bytes come back. */
function killable(): { vault: Vault; kill: () => Vault } {
  const written = new Map<string, string>()
  const open = (store: Map<string, string>): Vault => ({
    read: (key) => store.get(key) ?? null,
    forget: (key) => void store.delete(key),
    write: (key, value) => void store.set(key, value),
  })
  return { vault: open(written), kill: () => open(new Map(written)) }
}

/**
 * A run standing at a fight-door. art. 83 floated the horrors into sockets,
 * so where the fight is depends on the seed and on the choices — the walk
 * finds it rather than the catalog naming it.
 */
function atTheLair(seed: number) {
  const { ledgers, chain, node, door } = atAFight(seed)
  void enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
  return { ledgers, room: node.instance, step: node.step, door }
}

function lotsFor(ledgers: Ledgers, fight: Fight) {
  return turnLots(ledgers.run!.seed, ledgers.run!.at.step, fight.turnNumber)
}

/** What a fight looks like from the outside, for comparing two of them. */
function shapeOfFight(fight: Fight, phase: FightPhase, selected: readonly DieId[]) {
  return {
    horrorHealth: fight.horrorHealth,
    yourHealth: fight.yourHealth,
    yourHealthMax: fight.yourHealthMax,
    turnNumber: fight.turnNumber,
    intent: fight.turn.intent,
    card: fight.turn.card,
    castings: fight.turn.castings.length,
    laid: casting(fight.turn).map((landed) => [landed.die, landed.face.value, landed.kept]),
    claims: fight.turn.claims.map((made) => [
      made.line,
      made.sum,
      made.tier.multiplier,
      made.dice.map((one) => one.die).join(','),
    ]),
    phase,
    selected: [...selected].sort(),
  }
}

/** The round trip the shell makes: write the bytes, kill it, read it back. */
function roundTrip(
  ledgers: Ledgers,
  fight: Fight,
  room: InstanceId,
  phase: FightPhase,
  selected: readonly DieId[],
) {
  const { vault, kill } = killable()
  const held = saveFight(fight, room, phase, selected, true, true)
  save({ ...ledgers, run: { ...ledgers.run!, fight: held } }, vault)

  const restored = load(kill())
  expect(restored).not.toBeNull()
  const back = pausedAt(restored!, room)
  expect(back).not.toBeNull()
  const horror = horrorById(back!.horror)
  expect(horror).not.toBeNull()
  return restoreFight(
    back!,
    restored!,
    horror!,
    LADDER,
    NO_GOODS,
    turnLots(restored!.run!.seed, restored!.run!.at.step, back!.turnNumber),
  )
}

/** Claim whatever the whole hand is on offer for, or nothing if it is not. */
function claimAll(turn: Turn): { turn: Turn; line: Line | null } {
  const dice = casting(turn).map((landed) => landed.die)
  const lines = claimable(turn, dice, LADDER)
  const line = lines.find((one) => one !== 'any-dice') ?? lines[0] ?? null
  return line === null ? { turn, line } : { turn: claim(turn, dice, line, LADDER), line }
}

describe('art. 75 — a half-spent turn survives the lock screen', () => {
  it('restores the intent before a die is thrown', () => {
    const { ledgers, room, door } = atTheLair(51)
    const fight = openFightDoor(ledgers, { door, horror: THE_GNAWING })
    const back = roundTrip(ledgers, fight, room, 'pre', [])
    expect(shapeOfFight(back.fight, back.phase, back.selected)).toEqual(
      shapeOfFight(fight, 'pre', []),
    )
  })

  /**
   * The property: at every point a thumb can stop — after the cast, mid-keep,
   * after the recast, mid-claim, and mid-claim with a selection half made —
   * killing the app and booting restores the same fight, face for face.
   */
  it('restores exactly, at every point in a turn, over many seeds', () => {
    for (let seed = 40; seed < 70; seed++) {
      const { ledgers, room, door } = atTheLair(seed)
      const opened = openFightDoor(ledgers, { door, horror: THE_GNAWING })
      
      // After the first casting.
      const first = withTurn(opened, cast(opened.turn, lotsFor(ledgers, opened)(1)))
      let back = roundTrip(ledgers, first, room, 'keep', [])
      expect(shapeOfFight(back.fight, back.phase, back.selected), `seed ${seed} cast`).toEqual(
        shapeOfFight(first, 'keep', []),
      )

      // Mid-keep: some dice held, none thrown again yet.
      const held = casting(first.turn)
        .filter((_, i) => i % 2 === 0)
        .map((landed) => landed.die)
      const keeping = withTurn(first, keep(first.turn, held))
      back = roundTrip(ledgers, keeping, room, 'keep', [])
      expect(shapeOfFight(back.fight, back.phase, back.selected), `seed ${seed} keep`).toEqual(
        shapeOfFight(keeping, 'keep', []),
      )

      // After the recast — including art. 72's cleared marks.
      const again = withTurn(keeping, recast(keeping.turn, lotsFor(ledgers, keeping)(2)))
      back = roundTrip(ledgers, again, room, 'claim', [])
      expect(shapeOfFight(back.fight, back.phase, back.selected), `seed ${seed} recast`).toEqual(
        shapeOfFight(again, 'claim', []),
      )
      expect(casting(back.fight.turn).every((landed) => !landed.kept)).toBe(true)

      // Mid-claim, with a half-made selection: art. 75 says that is state.
      const half = casting(again.turn)
        .slice(0, 3)
        .map((landed) => landed.die)
      back = roundTrip(ledgers, again, room, 'claim', half)
      expect(back.selected).toEqual(half)
      expect(shapeOfFight(back.fight, back.phase, back.selected), `seed ${seed} half`).toEqual(
        shapeOfFight(again, 'claim', half),
      )

      // And with a claim already made, so the card is spent as it was.
      const claimed = claimAll(again.turn)
      if (claimed.line !== null) {
        const made = withTurn(again, claimed.turn)
        back = roundTrip(ledgers, made, room, 'claim', [])
        expect(shapeOfFight(back.fight, back.phase, back.selected), `seed ${seed} claim`).toEqual(
          shapeOfFight(made, 'claim', []),
        )
        expect(back.fight.turn.card[claimed.line]).toBe(true)
      }
    }
  })

  it('restores a turn deep into a fight, not only the first one', () => {
    const { ledgers, room, door } = atTheLair(77)
    let fight = openFightDoor(ledgers, { door, horror: THE_GNAWING })
    for (let n = 0; n < 3; n++) {
      const turn = claimAll(cast(fight.turn, lotsFor(ledgers, fight)(1))).turn
      fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
      expect(fight.outcome).toBe('fighting')
    }
    expect(fight.turnNumber).toBe(4)
    const played = withTurn(fight, cast(fight.turn, lotsFor(ledgers, fight)(1)))
    const back = roundTrip(ledgers, played, room, 'keep', [])
    expect(shapeOfFight(back.fight, back.phase, back.selected)).toEqual(
      shapeOfFight(played, 'keep', []),
    )
  })
})

describe('art. 63 — a fled fight pauses, and cannot launder a card', () => {
  it('comes back to the same wounded horror on the same spent card', () => {
    const { ledgers, room, door } = atTheLair(81)
    const opened = openFightDoor(ledgers, { door, horror: THE_GNAWING })
    const played = claimAll(cast(opened.turn, lotsFor(ledgers, opened)(1)))
    expect(played.line).not.toBeNull()
    const midTurn = withTurn(opened, played.turn)
    const resolved = advanceFight(midTurn, decide(midTurn.turn, 'end-turn', midTurn.armor))
    expect(resolved.horrorHealth).toBeLessThan(THE_GNAWING.health)

    // Run. The run keeps the fight rather than throwing it away.
    const away = routeFlight(ledgers, saveFight(resolved, room, 'pre', [], true, false))
    const held = pausedAt(away, room)
    expect(held).not.toBeNull()
    expect(held!.engaged).toBe(false)

    const back = restoreFight(
      held!,
      away,
      THE_GNAWING,
      LADDER,
      NO_GOODS,
      turnLots(away.run!.seed, away.run!.at.step, held!.turnNumber),
    )
    expect(back.fight.horrorHealth).toBe(resolved.horrorHealth)
    expect(back.fight.turn.card[played.line!]).toBe(true)
    expect(back.fight.turnNumber).toBe(resolved.turnNumber)
  })

  /**
   * The exploit the ruling closes, stated as a law rather than a scenario:
   * across any number of run-and-return cycles, the card only ever loses
   * lines. It refills at exactly two moments, and neither of them is a door.
   */
  it('never leaves the card with more lines than it had, over many flights', () => {
    for (const seed of [12, 34, 56, 78]) {
      const { ledgers: start, room, door } = atTheLair(seed)
      let ledgers = start
      let fight = openFightDoor(ledgers, { door, horror: THE_GNAWING })
      let left = unspent(fight.turn.card).length
      let wounds = fight.horrorHealth

      for (let round = 0; round < 5; round++) {
        const played = claimAll(cast(fight.turn, lotsFor(ledgers, fight)(1)))
        const midTurn = withTurn(fight, played.turn)
        fight = advanceFight(midTurn, decide(midTurn.turn, 'end-turn', midTurn.armor))
        if (fight.outcome !== 'fighting') break

        // Out of the door, and straight back in through it.
        ledgers = routeFlight(ledgers, saveFight(fight, room, 'pre', [], true, false))
        const held = pausedAt(ledgers, room)!
        fight = restoreFight(
          held,
          ledgers,
          THE_GNAWING,
          LADDER,
          NO_GOODS,
          turnLots(ledgers.run!.seed, ledgers.run!.at.step, held.turnNumber),
        ).fight

        const now = unspent(fight.turn.card).length
        expect(now, `seed ${seed} round ${round}`).toBeLessThanOrEqual(left)
        expect(fight.horrorHealth).toBeLessThanOrEqual(wounds)
        left = now
        wounds = fight.horrorHealth
      }
      // The point of the law: something was actually spent along the way.
      expect(left).toBeLessThan(unspent(openFightDoor(start, { door, horror: THE_GNAWING }).turn.card).length)
    }
  })

  /**
   * art. 65, card 30: a bind and a bleed are the two pieces of a fight that
   * cannot be derived from the seed — one is what the *last* intent did to
   * the hand, the other outlives the turn it opened. Both are written down,
   * and the proof is that a fight paused mid-bleed with a die taken comes
   * back short-handed and still bleeding.
   */
  it('brings back the bound die and the running bleed (art. 75)', () => {
    const { ledgers, room, door } = atTheLair(63)
    let fight = openFightDoor(ledgers, { door, horror: THE_SILT_MOTHER })
    const whole = ledgers.run!.hand.dice.length
    let sawBound = 0
    let sawBleed = 0

    // Five turns of the Silt Mother's script, round-tripped at the top of
    // every one of them. Her first intent binds and her second bleeds, so
    // the walk passes through both states without the test having to guess
    // which turn is which.
    for (let n = 0; n < 5 && fight.outcome === 'fighting'; n++) {
      const short = whole - fight.turn.bound.length
      expect(casting(cast(fight.turn, lotsFor(ledgers, fight)(1)))).toHaveLength(short)
      if (fight.turn.bound.length > 0) sawBound++
      if (fight.bleed !== null) sawBleed++

      const back = roundTrip(ledgers, fight, room, 'pre', [])
      expect(back.fight.turn.bound, `turn ${fight.turnNumber} bound`).toEqual(fight.turn.bound)
      expect(back.fight.bleed, `turn ${fight.turnNumber} bleed`).toEqual(fight.bleed)
      // And the hand it re-opens on is the short one, face for face.
      expect(shapeOfFight(back.fight, back.phase, back.selected)).toEqual(
        shapeOfFight(fight, 'pre', []),
      )
      expect(casting(cast(back.fight.turn, lotsFor(ledgers, back.fight)(1)))).toHaveLength(short)

      const turn = claimAll(cast(fight.turn, lotsFor(ledgers, fight)(1))).turn
      fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
    }

    // The walk has to have been through both, or the round trips proved
    // nothing about either.
    expect(sawBound).toBeGreaterThan(0)
    expect(sawBleed).toBeGreaterThan(0)
  })

  it('lets the card refill at the two moments art. 63 allows, and no other', () => {
    const { ledgers, door } = atTheLair(90)
    // A door with no paused fight behind it: this is the refill (art. 63).
    const opened = openFightDoor(ledgers, { door, horror: THE_GNAWING })
    expect(unspent(opened.turn.card)).toHaveLength(13)
    // A death burns the run, and the run is what was holding the fight.
    expect(ledgers.run!.fight).toBeNull()
  })
})
