import { describe, expect, it } from 'vitest'

import {
  ALL_RIDERS,
  CASCADE,
  CATALOG_GOODS,
  LADDER,
  saysFiring,
} from '../src/content/index.js'
import type { Die, Face, Fight, Frame, Goods, Horror, Rider } from '../src/lots/index.js'
import {
  advanceFight,
  cascadeBeats,
  claim,
  decide,
  openFight,
  withTurn,
} from '../src/lots/index.js'
import type { Clock } from '../src/shell/beats.js'
import { playBeats } from '../src/shell/beats.js'
import { SWIPE, turnOf } from './helpers.js'
import { scriptedFight } from './beats.js'

/**
 * art. 119, section 4: **reduced motion, and the guard.**
 *
 * Five things the wave asked for by name, and the reason all five are
 * testable is that the script and the player are separate values: the script
 * is computed off an event that has already happened, and the player takes
 * frames, a clock and two callbacks and nothing else.
 *
 * What that separation buys is the first guarantee for free. `playBeats` has
 * no fight, no resolution, no lot and no engine in its signature, so a beat
 * **cannot** decide anything — it is a fact about the type rather than a
 * thing anybody has to keep remembering.
 */

const RIDERS: Goods = { talismans: [], riders: ALL_RIDERS }

/** A clock that never fires on its own. The test is the passage of time. */
function heldClock(): Clock & { tick(): boolean; readonly waiting: number } {
  let next: (() => void) | null = null
  let handle = 0
  return {
    after(_ms, run) {
      next = run
      return (handle += 1)
    },
    cancel() {
      next = null
    },
    tick() {
      const run = next
      next = null
      if (run === null) return false
      run()
      return true
    },
    get waiting() {
      return next === null ? 0 : 1
    },
  }
}

describe('art. 119 §4 — reduced motion, and the guard', () => {
  /**
   * **Same outcome either way.** The whole claim of art. 116 in one test: a
   * scripted fight played with motion and without it ends on the same body,
   * the same Book line and the same bytes in the vault. If these ever came
   * apart, the setting would be changing what is true (art. 116 forbids it)
   * rather than how it is shown.
   */
  it('lands the same fight, the same Book line and the same vault either way', () => {
    for (const seed of [3, 11, 29, 47]) {
      const moving = scriptedFight(seed, { still: false })
      const still = scriptedFight(seed, { still: true })
      expect(still.outcome, `seed ${seed}`).toBe(moving.outcome)
      expect(still.yourHealth, `seed ${seed}`).toBe(moving.yourHealth)
      expect(still.horrorHealth, `seed ${seed}`).toBe(moving.horrorHealth)
      expect(still.turns, `seed ${seed}`).toBe(moving.turns)
      expect(still.bookLine, `seed ${seed}`).toBe(moving.bookLine)
      expect(still.vault, `seed ${seed}`).toBe(moving.vault)
      // And the beats themselves, which is the stronger claim: not two paths
      // that happen to agree, but one script read at two speeds.
      expect(still.beats, `seed ${seed}`).toEqual(moving.beats)
    }
  })

  it('reads the whole script in one turn of the loop when the world is still', () => {
    const { frames } = oneExchange()
    const clock = heldClock()
    const shown: Frame[] = []
    let landed = false
    const player = playBeats(frames, {
      clock,
      still: true,
      show: (frame) => void shown.push(frame),
      lands: () => void (landed = true),
    })
    // Nothing was ever scheduled, and everything was already shown.
    expect(clock.waiting).toBe(0)
    expect(landed).toBe(true)
    expect(player.running).toBe(false)
    // The same beats, showing the same numbers — the delays are the only
    // thing `atOnce` touches, and touching them is the whole of art. 116.
    expect(shown.map((frame) => frame.beat)).toEqual(frames.map((frame) => frame.beat))
    expect(shown.map((frame) => frame.shows)).toEqual(frames.map((frame) => frame.shows))
    expect(shown.every((frame) => frame.after === 0)).toBe(true)
  })

  /**
   * **Nothing is decided mid-timeline.** The outcome was computed before the
   * first frame, so reading the script cannot move it: the fight the beats
   * were built from is the same object afterwards, and the frames themselves
   * are untouched. (What this does not prove is that nobody *adds* an engine
   * call to `showFrame` later; what stops that is the signature above, which
   * has nowhere to put one.)
   */
  it('decides nothing while it plays — the script is read, never recomputed', () => {
    const { before, after, frames, resolution } = oneExchange()
    const script = JSON.stringify(frames)
    const fightBefore = JSON.stringify(before)
    const clock = heldClock()
    const player = playBeats(frames, {
      clock,
      still: false,
      show: () => {},
      lands: () => {},
    })
    let guard = 0
    while (player.running && guard++ < 500) clock.tick()
    expect(JSON.stringify(frames)).toBe(script)
    expect(JSON.stringify(before)).toBe(fightBefore)
    // And the same event, resolved again, gives the same script — a timeline
    // that consulted a lot could not promise this (arts 17, 36).
    expect(cascadeBeats(before, after, resolution, RIDERS, CASCADE)).toEqual(frames)
  })

  /**
   * **Every rider that fires gets a beat**, and every beat says something.
   * art. 54 asks a power to be declared; art. 119 asks it to be *seen*, and a
   * good that shipped without a word would fire in silence forever.
   */
  it('gives every rider on every die that ships a beat, and a word', () => {
    const book = new Map<string, Rider>(ALL_RIDERS.map((one) => [one.id as string, one]))
    let checked = 0
    for (const good of CATALOG_GOODS) {
      const die = good as Die
      if (!Array.isArray(die.faces)) continue
      for (const face of die.faces) {
        if (face.rider === undefined) continue
        const rider = book.get(face.rider as string)
        expect(rider, face.rider as string).toBeDefined()
        // Claimed on its own face, so the rider is spent in a claim (art. 51).
        // The face itself, not a face of the same value: a die may show the
        // same number twice and charge for only one of them (art. 51).
        const { frames } = oneExchange({
          dice: [die, die],
          values: [face.value, face.value],
          showing: [face, face],
        })
        const fired = frames.flatMap((frame) =>
          frame.beat.kind === 'rider' && frame.beat.rider === face.rider ? [frame.beat] : [],
        )
        expect(fired.length, face.rider as string).toBeGreaterThan(0)
        for (const beat of fired) expect(saysFiring(beat), face.rider as string).not.toBe('')
        checked += 1
      }
    }
    // A guard on the guard: a catalog that stopped carrying riders would
    // otherwise make this test pass by testing nothing.
    expect(checked).toBeGreaterThan(0)
  })

  /**
   * **Every beat ends settled.** No element is left mid-transform once a
   * fight event completes: nothing lifted, nothing struck, and the numbers
   * are the fight the engine advanced to.
   */
  it('ends settled — nothing lifted, nothing struck, the numbers the engine has', () => {
    const { frames, after } = oneExchange()
    const last = frames.at(-1)
    expect(last?.beat.kind).toBe('settled')
    expect(last?.shows.lifted).toEqual([])
    expect(last?.shows.hit).toBe('none')
    expect(last?.shows.horrorHealth).toBe(after.horrorHealth)
    expect(last?.shows.yourHealth).toBe(after.yourHealth)
    // And every mark in the middle is cleared by the beat after it, which is
    // what makes the settled beat the guarantee rather than the hope.
    const marked = frames.filter((frame) => frame.shows.hit !== 'none')
    for (const frame of marked) {
      const at = frames.indexOf(frame)
      expect(frames[at + 1], 'a mark with no beat after it').toBeDefined()
    }
  })

  /**
   * **Timers do not leak.** art. 36 says close mid-anything and resume
   * exactly, so a cascade that is interrupted — fled, reloaded, closed —
   * cancels every scheduled beat, and what is left is the settled state and
   * never a half-played one.
   */
  it('cancels every scheduled beat when a cascade is dropped', () => {
    const { frames } = oneExchange()
    const clock = heldClock()
    let landed = 0
    const player = playBeats(frames, {
      clock,
      still: false,
      show: () => {},
      lands: () => void (landed++),
    })
    clock.tick()
    clock.tick()
    expect(player.running).toBe(true)
    expect(player.pending).toBe(1)
    player.stop()
    expect(player.pending).toBe(0)
    expect(player.running).toBe(false)
    // A dropped timeline never lands: the caller dropped it because the
    // ledger it would have settled into is going away (flight, death, a wipe).
    expect(landed).toBe(0)
    // And nothing it had scheduled can still fire.
    expect(clock.tick()).toBe(false)
  })

  /**
   * art. 1: skippable, with a settled end state. Every entry point in the
   * shell lands the timeline before it does anything else, and landing it
   * shows the settled frame rather than throwing it away.
   */
  it('skips to the settled state on a tap, and lands there exactly once', () => {
    const { frames } = oneExchange()
    const clock = heldClock()
    const shown: Frame[] = []
    let landed = 0
    const player = playBeats(frames, {
      clock,
      still: false,
      show: (frame) => void shown.push(frame),
      lands: () => void (landed++),
    })
    clock.tick()
    player.land()
    expect(landed).toBe(1)
    expect(player.pending).toBe(0)
    expect(shown.at(-1)).toEqual(frames.at(-1))
    // Landing twice is landing once: an entry point may call it whenever.
    player.land()
    expect(landed).toBe(1)
  })
})

// ── The fixture ────────────────────────────────────────────────────────

const HORROR: Horror = {
  id: 'horror.test',
  health: 200,
  intentFor: () => SWIPE,
}

function oneExchange(
  options: {
    readonly dice?: readonly Die[]
    readonly values?: readonly number[]
    readonly showing?: readonly Face[]
  } = {},
): {
  before: Fight
  after: Fight
  frames: readonly Frame[]
  resolution: ReturnType<typeof decide>
} {
  const values = options.values ?? [4, 4, 4]
  const opened = openFight(HORROR, { dice: [] }, 60, 2, RIDERS)
  const turn =
    options.dice === undefined
      ? turnOf(values)
      : turnOf(values, {
          dice: options.dice,
          ...(options.showing === undefined ? {} : { showing: options.showing }),
        })
  const laid = turn.castings[0]!.map((one) => one.die)
  const line = values.length === 3 ? 'triple' : 'pair'
  const before = withTurn(
    { ...opened, turn, hand: turn.hand, yourHealthMax: 60 },
    claim(turn, laid, line, LADDER, RIDERS),
  )
  const resolution = decide(before.turn, 'end-turn', before.armor, RIDERS)
  const after = advanceFight(before, resolution)
  return {
    before,
    after,
    resolution,
    frames: cascadeBeats(before, after, resolution, RIDERS, CASCADE),
  }
}
