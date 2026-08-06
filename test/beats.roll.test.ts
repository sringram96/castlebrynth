import { describe, expect, it } from 'vitest'

import { CASCADE } from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Frame } from '../src/lots/index.js'
import {
  atOnce,
  cast,
  casting,
  keep,
  openFight,
  recast,
  restingAt,
  rollBeats,
  tumblingFace,
  withTurn,
} from '../src/lots/index.js'
import { SWIPE, handOf, seedOf } from './helpers.js'

/**
 * art. 119, section 1 (card 75): **dice do not appear, they land.**
 *
 * The script is what the tests can hold: it is computed off a casting that
 * has already happened, so everything about it — how many events a hand
 * reads as, which dice sit still through a reroll, what the numbers say when
 * the last frame lands — is a fact about a value rather than about a timer.
 */

const HORROR = {
  id: 'horror.test',
  health: 100,
  intentFor: () => SWIPE,
}

const NOTHING: ReadonlySet<string> = new Set<string>()

function thrown(seed = 4): ReturnType<typeof openFight> {
  const fight = openFight(HORROR, handOf(5), 40, 0)
  return withTurn(fight, cast(fight.turn, lotFrom(seedOf(seed))))
}

const kinds = (frames: readonly Frame[]): readonly string[] =>
  frames.map((frame) => frame.beat.kind)

describe('art. 119 §1 — the roll (the dice have weight)', () => {
  it('lands each die on its own beat, so five dice read as five events', () => {
    const fight = thrown()
    const frames = rollBeats(fight, NOTHING, CASCADE)
    expect(kinds(frames).filter((kind) => kind === 'land')).toHaveLength(5)
    // The tumble comes first, or the first die lands having never been in
    // the air; the settled state comes last, always (art. 1).
    expect(kinds(frames).slice(0, CASCADE.tumbles)).toEqual(
      Array.from({ length: CASCADE.tumbles }, () => 'tumble'),
    )
    expect(kinds(frames).at(-1)).toBe('settled')
  })

  it('staggers them, and answers the press with the first frame at once', () => {
    const frames = rollBeats(thrown(), NOTHING, CASCADE)
    expect(frames[0]?.after).toBe(0)
    for (const frame of frames.slice(1)) expect(frame.after).toBe(CASCADE.land)
  })

  it('lands them in the order they lie, one at a time and never in a lump', () => {
    const fight = thrown()
    const laid = casting(fight.turn).map((one) => one.die)
    const frames = rollBeats(fight, NOTHING, CASCADE)
    const settling = frames.flatMap((frame) =>
      frame.beat.kind === 'land' ? [frame.beat.die] : [],
    )
    expect(settling).toEqual(laid)
    // And each frame knows exactly how many have arrived, so nothing on
    // screen can be ahead of the beat that put it there.
    let seen = 0
    for (const frame of frames) {
      if (frame.beat.kind === 'land') seen += 1
      if (frame.beat.kind !== 'settled') expect(frame.shows.landed).toHaveLength(seen)
    }
  })

  it('re-tumbles only the dice being rerolled — what was kept sits still', () => {
    const fight = thrown()
    const laid = casting(fight.turn)
    const held = [laid[0]!.die, laid[2]!.die]
    const after = withTurn(fight, recast(keep(fight.turn, held), lotFrom(seedOf(9))))
    const frames = rollBeats(after, new Set(held.map(String)), CASCADE)

    const settling = frames.flatMap((frame) =>
      frame.beat.kind === 'land' ? [frame.beat.die as string] : [],
    )
    expect(settling).toHaveLength(3)
    for (const one of held) expect(settling).not.toContain(one as string)
    // A held die never left the table, so it is settled from the very first
    // frame — that stillness is the whole of what the beat is for (art. 41).
    for (const one of held) expect(frames[0]?.shows.landed).toContain(one)
  })

  it('has nothing in the air when the second casting is declined (art. 41)', () => {
    const fight = thrown()
    const all = casting(fight.turn).map((one) => one.die)
    const after = withTurn(fight, recast(keep(fight.turn, all), lotFrom(seedOf(9))))
    const frames = rollBeats(after, new Set(all.map(String)), CASCADE)
    expect(kinds(frames)).toEqual(['settled'])
  })

  it('ends on the fight as it actually stands — the settled state is the truth', () => {
    const fight = thrown()
    const frames = rollBeats(fight, NOTHING, CASCADE)
    expect(frames.at(-1)?.shows).toEqual(restingAt(fight))
    expect(frames.at(-1)?.shows.landed).toEqual(casting(fight.turn).map((one) => one.die))
  })

  /**
   * art. 116: the same timeline, with every delay zero. Not a second script
   * and not a filter — the identical beats, in the identical order, showing
   * the identical numbers. A player who never sees a frame of motion sees
   * every settled state and misses nothing (art. 107).
   */
  it('collapses to the same beats with motion reduced, showing the same numbers', () => {
    const frames = rollBeats(thrown(), NOTHING, CASCADE)
    const still = atOnce(frames)
    expect(still.map((frame) => frame.beat)).toEqual(frames.map((frame) => frame.beat))
    expect(still.map((frame) => frame.shows)).toEqual(frames.map((frame) => frame.shows))
    expect(still.every((frame) => frame.after === 0)).toBe(true)
  })

  /**
   * art. 119: **nothing is decided during an animation.** The tumbling face
   * is a picture of a die in the air, not a throw: it is hashed off the
   * die's identity and the spin, so the same throw tumbles the same way
   * every time art. 75 replays it.
   */
  it('tumbles deterministically, and never off a lot', () => {
    const fight = thrown()
    const die = casting(fight.turn)[0]!.die
    for (let spin = 0; spin < 8; spin++) {
      expect(tumblingFace(die, spin, 6)).toBe(tumblingFace(die, spin, 6))
      expect(tumblingFace(die, spin, 6)).toBeGreaterThanOrEqual(0)
      expect(tumblingFace(die, spin, 6)).toBeLessThan(6)
    }
    // And it moves: a die that showed one face for every turn of the tumble
    // would not be in the air at all.
    const faces = new Set(Array.from({ length: 8 }, (_, spin) => tumblingFace(die, spin, 6)))
    expect(faces.size).toBeGreaterThan(1)
  })
})
