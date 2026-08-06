import { describe, expect, it } from 'vitest'

import {
  ALL_RIDERS,
  CASCADE,
  LADDER,
  LEECH_RIDER,
  PUSH_RIDER,
  THE_LEECH,
  THE_PUSHER,
  THE_SISTERS,
  saysFiring,
} from '../src/content/index.js'
import type { Beat, Die, Fight, Frame, Goods, Horror } from '../src/lots/index.js'
import {
  advanceFight,
  atOnce,
  cascadeBeats,
  claim,
  decide,
  groupsOf,
  openFight,
  withTurn,
} from '../src/lots/index.js'
import { SWIPE, turnOf } from './helpers.js'

/**
 * art. 119, section 2 (card 75): **the cascade.**
 *
 * The claimed dice lift one at a time, the line names itself with its
 * multiplier, the riders fire alone, and only then does the total climb.
 * Every one of those is a fact about the script, so every one of them is a
 * test about a value — which is the point of the script existing at all.
 *
 * The load-bearing assertion in this file is the last one: **the settled
 * frame agrees with the fight the engine already advanced to.** A beat whose
 * settled state is not the whole truth is a wrong beat, and this is where
 * that stops being a sentence in a rules file.
 */

const RIDERS: Goods = { talismans: [], riders: ALL_RIDERS }
const NO_GOODS: Goods = { talismans: [], riders: [] }

function horrorOf(health = 200): Horror {
  return { id: 'horror.test', health, intentFor: () => SWIPE }
}

/** A fight with one claim already made, and the whole event resolved. */
function played(
  values: readonly number[],
  line: Parameters<typeof claim>[2],
  options: {
    readonly dice?: readonly Die[]
    readonly goods?: Goods
    readonly health?: number
    readonly armor?: number
  } = {},
): { before: Fight; after: Fight; frames: readonly Frame[]; goods: Goods } {
  const goods = options.goods ?? NO_GOODS
  const opened = openFight(
    horrorOf(),
    { dice: [] },
    options.health ?? 60,
    options.armor ?? 0,
    goods,
  )
  const turn =
    options.dice === undefined ? turnOf(values) : turnOf(values, { dice: options.dice })
  const laid = turn.castings[0]!.map((one) => one.die)
  const before = withTurn(
    { ...opened, turn, hand: turn.hand, yourHealthMax: options.health ?? 60 },
    claim(turn, laid, line, LADDER, goods),
  )
  const resolution = decide(before.turn, 'end-turn', before.armor, goods)
  const after = advanceFight(before, resolution)
  return { before, after, frames: cascadeBeats(before, after, resolution, goods, CASCADE), goods }
}

const kinds = (frames: readonly Frame[]): readonly string[] =>
  frames.map((frame) => frame.beat.kind)

const only = <K extends Beat['kind']>(
  frames: readonly Frame[],
  kind: K,
): readonly Extract<Beat, { kind: K }>[] =>
  frames.flatMap((frame) =>
    frame.beat.kind === kind ? [frame.beat as Extract<Beat, { kind: K }>] : [],
  )

describe('art. 119 §2 — the cascade (each beat says one thing)', () => {
  it('lifts each claimed die alone, then names the line, then climbs', () => {
    const { frames } = played([4, 4, 4], 'triple')
    expect(kinds(frames).filter((kind) => kind === 'lift')).toHaveLength(3)
    const order = kinds(frames)
    expect(order.indexOf('line')).toBeGreaterThan(order.lastIndexOf('lift'))
    expect(order.indexOf('climb')).toBeGreaterThan(order.indexOf('line'))
    expect(order.at(-1)).toBe('settled')
  })

  it('climbs the running total off the dice, and only off the dice', () => {
    const { frames } = played([4, 4, 4], 'triple')
    const lifts = frames.filter((frame) => frame.beat.kind === 'lift')
    expect(lifts.map((frame) => frame.shows.attack)).toEqual([4, 8, 12])
    // Each lift carries its own `+n`, which is what the die shows in its own
    // moment — the running total is the sum of them and nothing else.
    expect(only(frames, 'lift').map((beat) => beat.value)).toEqual([4, 4, 4])
  })

  /**
   * art. 119: the line names its multiplier a beat *before* the total climbs
   * by it, so the climb reads as an answer to something rather than as a
   * number changing on its own.
   */
  it('names the multiplier before spending it, then climbs to the whole harm', () => {
    const { frames, after } = played([4, 4, 4], 'triple')
    const line = frames.findIndex((frame) => frame.beat.kind === 'line')
    expect(frames[line]?.shows.attack).toBe(12)
    expect(only(frames, 'line')[0]?.tier.multiplier).toBe(LADDER.triple.multiplier)
    expect(frames.at(-1)?.shows.attack).toBe(12 * LADDER.triple.multiplier)
    expect(after.horrorHealth).toBe(200 - 12 * LADDER.triple.multiplier)
  })

  /**
   * art. 64: a composite is a single claim, and its *shape* is the thing
   * worth seeing. A player should be able to see why it was a full house.
   */
  it('resolves a composite group by group, largest group first', () => {
    const { frames } = played([3, 3, 3, 5, 5], 'full-house')
    const groups = only(frames, 'lift').map((beat) => beat.group)
    expect(groups).toEqual([0, 0, 0, 1, 1])
    // And the gap between the groups is longer than the gap inside one, or
    // the shape reads as five dice rather than as a triple and a pair.
    const lifts = frames.filter((frame) => frame.beat.kind === 'lift')
    expect(lifts[3]?.after).toBe(CASCADE.group)
    expect(lifts[1]?.after).toBe(CASCADE.lift)
  })

  it('leaves a set or a run in one piece, because it is one shape', () => {
    expect(groupsOf({ ...played([2, 3, 4], 'run-3').before.turn.claims[0]! })).toHaveLength(1)
    expect(groupsOf({ ...played([4, 4, 4], 'triple').before.turn.claims[0]! })).toHaveLength(1)
  })

  /**
   * art. 119's second consequence: **a rider gets its own beat.** An effect
   * that fires silently inside a total is an effect the player never learns.
   */
  it('fires each rider alone, and says something every time one does', () => {
    // The Leech heals on its stained face; the Pusher's 1 is a cost face.
    const { frames } = played([1, 1], 'pair', {
      dice: [THE_PUSHER, THE_LEECH],
      goods: RIDERS,
    })
    const riders = only(frames, 'rider')
    expect(riders.map((beat) => beat.rider)).toContain(PUSH_RIDER)
    for (const beat of riders) expect(saysFiring(beat)).not.toBe('')
    // Alone: no two riders share a frame, and each waits the rider's gap.
    const at = frames.filter((frame) => frame.beat.kind === 'rider')
    for (const frame of at) expect(frame.after).toBe(CASCADE.rider)
  })

  it('charges heals against the ceiling and costs against what the heals left', () => {
    // Health well under the ceiling, so the Leech's heal actually lands.
    const { frames, after } = played([1, 6], 'any-dice', {
      dice: [THE_PUSHER, THE_LEECH],
      goods: RIDERS,
      health: 40,
    })
    const riders = frames.filter((frame) => frame.beat.kind === 'rider')
    expect(riders.length).toBeGreaterThan(0)
    // Whatever the riders did, the last of them agrees with the engine about
    // the body — armour never touches a cost face (art. 86).
    expect(frames.at(-1)?.shows.yourHealth).toBe(after.yourHealth)
  })

  /** art. 52: the sisters pay only together, so the ghost gets its own beat. */
  it('gives the bond its own beat, inside the sum it joins', () => {
    const { frames } = played([5, 5], 'pair', { dice: [...THE_SISTERS] })
    const bond = only(frames, 'bond')
    expect(bond).toHaveLength(1)
    expect(bond[0]?.value).toBe(5)
    expect(saysFiring(bond[0]!)).not.toBe('')
    // It lands before the line, because the sum has to be whole before the
    // tier is named — and after the lifts, because it is a third sister and
    // not a fourth die.
    const order = kinds(frames)
    expect(order.indexOf('bond')).toBeGreaterThan(order.lastIndexOf('lift'))
    expect(order.indexOf('bond')).toBeLessThan(order.indexOf('line'))
    const at = frames.findIndex((frame) => frame.beat.kind === 'bond')
    expect(frames[at]?.shows.attack).toBe(15)
  })

  it('answers the press at once, and staggers everything after it', () => {
    const { frames } = played([4, 4, 4], 'triple')
    expect(frames[0]?.after).toBe(0)
    for (const frame of frames.slice(1)) expect(frame.after).toBeGreaterThan(0)
  })

  /**
   * The article, asserted. The beats reveal what is already true, so the
   * settled frame is the fight the engine advanced to — not an approximation
   * of it, and not an arithmetic of the cascade's own.
   */
  it('ends on the fight the engine already advanced to', () => {
    for (const [values, line] of [
      [[4, 4, 4], 'triple'],
      [[3, 3, 3, 5, 5], 'full-house'],
      [[1, 2, 3, 4, 5], 'run-5'],
      [[2], 'any-dice'],
    ] as const) {
      const { frames, after } = played(values, line)
      expect(frames.at(-1)?.beat.kind, line).toBe('settled')
      expect(frames.at(-1)?.shows.horrorHealth, line).toBe(after.horrorHealth)
      expect(frames.at(-1)?.shows.yourHealth, line).toBe(after.yourHealth)
      // Nothing is left mid-transform: no die lifted, nothing struck.
      expect(frames.at(-1)?.shows.lifted, line).toEqual([])
      expect(frames.at(-1)?.shows.hit, line).toBe('none')
    }
  })

  /** art. 116: the same timeline, every delay zero, the same settled state. */
  it('collapses with motion reduced, beat for beat and number for number', () => {
    const { frames } = played([3, 3, 3, 5, 5], 'full-house', {
      dice: [THE_PUSHER, THE_PUSHER, THE_PUSHER, THE_LEECH, THE_LEECH],
      goods: RIDERS,
    })
    const still = atOnce(frames)
    expect(still.map((frame) => frame.beat)).toEqual(frames.map((frame) => frame.beat))
    expect(still.map((frame) => frame.shows)).toEqual(frames.map((frame) => frame.shows))
    expect(still.every((frame) => frame.after === 0)).toBe(true)
  })

  /** art. 69: silence is a bug, and a rider with no words is a silent power. */
  it('has a word for every rider that ships', () => {
    for (const rider of ALL_RIDERS) {
      expect(
        saysFiring({ kind: 'rider', die: 'bone.0' as never, rider: rider.id, effect: rider.onUse }),
        rider.id as string,
      ).not.toBe('')
    }
    expect(LEECH_RIDER).toBeDefined()
  })
})
