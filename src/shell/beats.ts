/**
 * The beat player (art. 119).
 *
 * `src/lots/beats.ts` computes the script; this reads it out. It is the only
 * thing in the game that holds a timer for a fight event, and it is the whole
 * of what art. 119's guarantees rest on:
 *
 * - **Nothing is decided during an animation.** Look at what this function
 *   takes: frames, a clock, and two callbacks. There is no fight here, no
 *   resolution, no lot and no engine — so a beat *cannot* decide anything,
 *   and that is a fact about the type rather than a thing to remember. The
 *   engine was asked before the first frame or it was not asked at all.
 * - **art. 116 gets no second path.** Reduced motion is `atOnce` applied to
 *   the same frames, and a delay of nothing is not a short wait but no wait:
 *   the loop falls straight through to the settled state in the same turn of
 *   the event loop it started in. One timeline, read at two speeds.
 * - **Timers do not leak.** There is exactly one outstanding handle at any
 *   moment and `pending` says so out loud, so the test that art. 36 asks for
 *   — close mid-anything, resume exactly — is a number this module reports
 *   rather than an audit somebody has to do by hand.
 *
 * It lives in `src/shell` rather than in `src/lots` because a clock is not
 * part of the dice engine, and it takes its clock rather than reaching for
 * `setTimeout` because a test cannot wait 4 seconds to find out whether a
 * cascade cancelled cleanly.
 */

import type { Frame } from '../lots/index.js'
import { atOnce } from '../lots/index.js'

/** A source of delay. The shell's is `setTimeout`; a test's is a list. */
export interface Clock {
  after(ms: number, run: () => void): number
  cancel(handle: number): void
}

/** The clock the browser has. Nothing else in here knows about a browser. */
export const REAL_CLOCK: Clock = {
  after: (ms, run) => setTimeout(run, ms) as unknown as number,
  cancel: (handle) => clearTimeout(handle),
}

export interface Playing {
  /** How many frames have shown. */
  readonly at: number
  readonly running: boolean
  /** How many timers are outstanding. Never more than one, and zero at rest. */
  readonly pending: number
  /**
   * art. 1: **skippable, with a settled end state.** Every entry point in
   * the shell calls this before it does anything else, so a timeline is
   * never something the player has to wait out — and because the settled
   * state is the whole truth (art. 119), skipping it costs nothing.
   */
  land(): void
  /**
   * art. 36: drop the timeline whole. A timeline is never written down — it
   * is presentation over a ledger that is already settled — so this cannot
   * lose anything, and every scheduled beat goes with it.
   */
  stop(): void
}

export interface Reading {
  readonly clock: Clock
  /** art. 116: whether this player has asked for the world to hold still. */
  readonly still: boolean
  /** Paint one frame. The first frame gets `first`, because it answers a press. */
  show(frame: Frame, first: boolean): void
  /** What happens once the last frame has landed. */
  lands(): void
}

/**
 * Read a script out. Returns the handle the shell holds while it runs; the
 * whole thing may already have finished by the time it comes back, which is
 * exactly what a still world looks like from here.
 */
export function playBeats(frames: readonly Frame[], reading: Reading): Playing {
  const script = reading.still ? atOnce(frames) : frames
  let at = 0
  let running = true
  let handle: number | undefined
  let pending = 0

  const clear = (): void => {
    if (handle !== undefined) {
      reading.clock.cancel(handle)
      handle = undefined
      pending = 0
    }
  }

  const finish = (): void => {
    clear()
    if (!running) return
    running = false
    reading.lands()
  }

  const step = (): void => {
    handle = undefined
    pending = 0
    // eslint-disable-next-line no-constant-condition -- the wait is the exit.
    for (;;) {
      const frame = script[at]
      if (frame === undefined) return finish()
      const first = at === 0
      at += 1
      reading.show(frame, first)
      const next = script[at]
      if (next === undefined) return finish()
      // A delay of nothing is not a shorter wait, it is no wait. This is the
      // whole of art. 116 in the player: with the world held still the loop
      // runs to the settled state without ever reaching the clock.
      if (next.after > 0) {
        pending = 1
        handle = reading.clock.after(next.after, step)
        return
      }
    }
  }

  step()

  return {
    get at() {
      return at
    },
    get running() {
      return running
    },
    get pending() {
      return pending
    },
    land(): void {
      if (!running) return
      clear()
      // The settled state, arrived at rather than waited for: the last frame
      // *is* the settled state (art. 119), so showing it is the whole skip.
      const last = script[script.length - 1]
      if (last !== undefined && at < script.length) {
        at = script.length
        reading.show(last, false)
      }
      finish()
    },
    stop(): void {
      clear()
      running = false
    },
  }
}
