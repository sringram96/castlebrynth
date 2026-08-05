import { describe, expect, it } from 'vitest'

import { BARE_BODY, LADDER, THE_GNAWING, horrorOf } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Fight } from '../src/lots/index.js'
import { advanceFight, cast, casting, claim, claimable, decide, withTurn } from '../src/lots/index.js'
import {
  advance,
  carryOut,
  openFightDoor,
  pausedAt,
  routeDeath,
  routeFlight,
  routeTurn,
  saveFight,
} from '../src/hinge/index.js'
import { atAFight, seedOf } from './drift.js'

/**
 * The hinge — art. 30. A fight is the room with the thing come close: the
 * door is a fight, winning opens it, fleeing discards it, and dying routes
 * the whole run to the Crossing.
 */
function atTheLair() {
  // art. 83: horrors float into sockets, so there is no lair to look up —
  // the fight is wherever this run's choices put one.
  const { ledgers, chain, node, door } = atAFight(4)
  return { ledgers, chain, lair: node, door }
}

/** One turn, played the plainest way: cast, claim what is there, end. */
function playTurn(fight: Fight, seed: number, decision: 'end-turn' | 'flee' = 'end-turn') {
  const lot = lotFrom(seedOf(seed))
  let turn = cast(fight.turn, lot)
  const dice = casting(turn).map((landed) => landed.die)
  const line = claimable(turn, dice, LADDER)[0]
  if (line !== undefined && decision === 'end-turn') turn = claim(turn, dice, line, LADDER)
  const resolved = decide(turn, decision, fight.armor)
  return { fight: advanceFight(withTurn(fight, turn), resolved), resolved }
}

describe('hinge — art. 30 (no battle screen), arts 11 and 32 (death routes on)', () => {
  it('finds the horror in the room it stands in, and nowhere else (arts 30, 83)', () => {
    const { chain, lair, door } = atTheLair()
    expect(door.fight).toBe(horrorOf(lair.fills)?.id)
    expect(horrorOf(lair.fills)).not.toBeNull()
    // Every door out of this room is that fight, and only rooms with
    // something in the socket have one at all.
    for (const gate of lair.doors) expect(gate.fight).toBe(door.fight)
    for (const node of chain.nodes) {
      if (node.instance === lair.instance) continue
      if (horrorOf(node.fills) !== null) continue
      for (const gate of node.doors) expect(gate.fight).toBeUndefined()
    }
  })

  it('opens the door on a fresh fight carrying the run’s own body (arts 47, 63)', () => {
    const { ledgers, door } = atTheLair()
    const fight = openFightDoor(ledgers, { door, horror: THE_GNAWING })
    expect(fight.horrorHealth).toBe(THE_GNAWING.health)
    expect(fight.yourHealth).toBe(ledgers.run!.health)
    expect(fight.armor).toBe(ledgers.run!.armor)
    expect(fight.hand).toEqual(ledgers.run!.hand)
  })

  it('paints the horror into the same room rather than a battle screen (art. 30)', () => {
    const { ledgers, door } = atTheLair()
    const staged = advance(openFightDoor(ledgers, { door, horror: THE_GNAWING }))
    expect(staged.closeness).toBe(1)
    expect(staged.prop.name).toBe(THE_GNAWING.id)
    expect(typeof staged.prop.paint).toBe('function')
  })

  it('routes a turn that neither killed nor died back into the fight', () => {
    const { ledgers, door } = atTheLair()
    const { fight, resolved } = playTurn(openFightDoor(ledgers, { door, horror: THE_GNAWING }), 21)
    expect(routeTurn(fight, resolved)).toBe('fight-continues')
  })

  it('routes a win back into the room, with the door open', () => {
    const { ledgers, door } = atTheLair()
    const straw = { ...THE_GNAWING, health: 4 }
    const { fight, resolved } = playTurn(openFightDoor(ledgers, { door, horror: straw }), 22)
    expect(fight.outcome).toBe('won')
    expect(routeTurn(fight, resolved)).toBe('room-continues')
  })

  it('routes flight back into the room, and pauses the fight there (art. 63)', () => {
    const { ledgers, lair, door } = atTheLair()
    const { fight, resolved } = playTurn(
      openFightDoor(ledgers, { door, horror: THE_GNAWING }),
      23,
      'flee',
    )
    expect(routeTurn(fight, resolved)).toBe('fled')

    // The ruling of 2026-08-04 is repealed: a fled fight pauses. What the
    // run keeps is the fight as it stood, not the absence of one.
    const paused = routeFlight(
      ledgers,
      saveFight(fight, lair.instance, 'pre', [], true, false),
    )
    expect(paused.run!.fight).not.toBeNull()
    expect(pausedAt(paused, lair.instance)!.horrorHealth).toBe(fight.horrorHealth)
    expect(pausedAt(paused, lair.instance)!.engaged).toBe(false)
    // And it belongs to its own door: another room has no fight waiting.
    // And it belongs to its own instance: art. 82 lets a run deal the same
    // room twice, and a fight down there is not waiting for you up here.
    expect(pausedAt(paused, `${lair.room}#99` as typeof lair.instance)).toBeNull()
  })

  it('carries the wounds out of the fight and into the run (art. 30)', () => {
    const { ledgers, door } = atTheLair()
    const { fight } = playTurn(openFightDoor(ledgers, { door, horror: THE_GNAWING }), 24)
    const after = carryOut(ledgers, fight)
    expect(after.run!.health).toBe(fight.yourHealth)
    expect(after.run!.health).toBeLessThan(ledgers.run!.health)
    // The room did not move: a fight is the room with the thing come close.
    expect(after.run!.at).toEqual(ledgers.run!.at)
  })

  it('routes a death to a fresh waking, reseeded, with the Book one line longer', () => {
    const { ledgers } = atTheLair()
    const woken = routeDeath(ledgers, 'end.gnawing')
    expect(woken.permanent.bookOfEnds).toHaveLength(1)
    expect(woken.permanent.bookOfEnds[0]).toMatchObject({ cause: 'end.gnawing', depth: 1 })
    expect(woken.run!.seed).not.toBe(ledgers.run!.seed)
    expect(woken.run!.health).toBe(BARE_BODY.health)
    expect(woken.run!.carried).toEqual([])
    expect(woken.run!.at.step).toBe(0)
    // art. 36: the history burns with the run — the reseed is a new road.
    expect(woken.run!.history.taken).toEqual([])
  })
})
