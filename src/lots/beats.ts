/**
 * The beats (art. 119).
 *
 * **A fight event resolves in beats, and each beat says one thing.** The
 * playtest called the fight a spreadsheet, and card 69 fixed half of that —
 * nothing *said* what happened. This is the other half: nothing *showed* it.
 * A claim resolved instantly and silently, so the most interesting decision
 * in the game — which line to spend, and what it costs you to spend it —
 * passed in a single frame.
 *
 * What this module is, and what it deliberately is not:
 *
 * - It is a **script**, computed once, from a fight event that has already
 *   happened. Every frame carries the numbers the screen should be showing
 *   once that frame has landed, so playing the script is reading it out. No
 *   caller ever has to ask the engine anything while a timeline is running,
 *   which is art. 119's first consequence made structural rather than
 *   remembered.
 * - It is **not a player**. Nothing here holds a timer, touches a DOM or
 *   knows what a millisecond feels like. `src/main.ts` walks the frames; the
 *   durations arrive from `src/content` like every other tuning number.
 * - It is **not prose**. A beat names an event, exactly as a `FightEvent`
 *   does; the words are content's and bound by rules/voice.md.
 *
 * **Reduced motion is not a second path** (art. 116). `atOnce` maps the same
 * script's delays to zero, so a still world plays every beat in the same
 * order and lands on the same frame — there is one timeline, and no way for
 * two of them to disagree about an outcome.
 */

import { casting } from './turn.js'
import type { Casting, DieId, Face, Fight } from './types.js'

/** Which body a beat is landing on, for the flash and the shake (art. 119). */
export type Hit = 'none' | 'them' | 'you'

/**
 * What the screen reads once a frame has landed.
 *
 * It is the whole of art. 119's promise written down: the numbers were
 * computed before the first frame, so showing a beat is reading a field off
 * it rather than asking the engine anything.
 */
export interface Shown {
  /** art. 57's running total, as the cascade builds it. */
  readonly attack: number
  readonly horrorHealth: number
  readonly yourHealth: number
  /** Section 1: which dice have settled. The rest are still in the air. */
  readonly landed: readonly DieId[]
  /** Section 2: which claimed dice have lifted, in the order they lifted. */
  readonly lifted: readonly DieId[]
  readonly hit: Hit
}

/**
 * One thing a beat says. The union is deliberately as flat as `FightEvent`'s:
 * a beat is an event at the grain a player can read, and the grain is finer
 * in exactly one place — a claim, which arrives as its dice, then its line,
 * then its riders, then its total (art. 119).
 */
export type Beat =
  /**
   * Section 1: the dice are in the air. `spin` is which turn of the tumble
   * this is, so a die that has not landed can show a face without anybody
   * rolling one — the real faces are already cast (art. 36) and the tumble
   * is a picture of a decision that has been made.
   */
  | { readonly kind: 'tumble'; readonly spin: number }
  /** Section 1: this die settles on its face. Dice do not appear; they land. */
  | { readonly kind: 'land'; readonly die: DieId; readonly face: Face }
  /**
   * art. 119: the settled state, which is where every timeline ends. It is
   * a beat rather than an absence because art. 1 asks a one-shot to *end* in
   * its settled state — a mark that is cleared by the beat after it can
   * never be left standing, and this is the beat after the last one.
   */
  | { readonly kind: 'settled' }

/** How long each kind of beat waits, in ms. All of it is tuning (art. 119). */
export interface Timings {
  /**
   * Section 1: how many turns of the tumble play before the first die
   * settles. Without them the first die lands having never been in the air.
   */
  readonly tumbles: number
  /** Section 1: the stagger, so five dice read as five events. */
  readonly land: number
}

/**
 * One beat, when it shows, and what the screen reads once it has.
 *
 * `shows` is the whole of art. 119's promise: the numbers are not computed
 * by the player as it goes, they were computed before the first frame and
 * written down here. A frame is therefore also a *test* — the last one must
 * agree with the fight the engine already advanced to, and `test/beats` says
 * so out loud.
 */
export interface Frame {
  readonly beat: Beat
  /**
   * Milliseconds to wait after the previous frame. The first frame of any
   * timeline is zero: a press answers at once, and the stagger is between
   * the beats rather than in front of them.
   */
  readonly after: number
  readonly shows: Shown
}

/**
 * art. 116: **the same timeline, with every delay zero.** Not a second path
 * and not a filter over the first — the identical script, read at once, so
 * a player who never sees a frame of motion sees every beat's settled state
 * and misses nothing (art. 107, which this is the test of).
 */
export function atOnce(frames: readonly Frame[]): readonly Frame[] {
  return frames.map((frame) => (frame.after === 0 ? frame : { ...frame, after: 0 }))
}

/** The numbers as a fight stands, with nothing in the air (art. 119). */
export function restingAt(fight: Fight): Shown {
  return {
    attack: fight.turn.claims.reduce((sum, made) => sum + made.sum * made.tier.multiplier, 0),
    horrorHealth: fight.horrorHealth,
    yourHealth: fight.yourHealth,
    landed: casting(fight.turn).map((one) => one.die),
    lifted: [],
    hit: 'none',
  }
}

/**
 * Section 1: **dice do not appear, they land** (card 75).
 *
 * Each rolling die cycles faces and settles, staggered, so five dice read as
 * five events rather than as one table refreshing. And a **reroll re-tumbles
 * only the dice being rerolled**: the held dice sit perfectly still, which is
 * what makes holding feel like a decision that already happened, and it is
 * the cheapest legibility in the wave (art. 41 — keeping is planning).
 *
 * `still` is the dice that do not tumble. On a first casting it is empty; on
 * a recast it is what the thumb kept. A recast that keeps everything —
 * art. 41's way of declining the second casting — has nothing in the air at
 * all, and its timeline is one settled frame.
 */
export function rollBeats(
  fight: Fight,
  still: ReadonlySet<string>,
  timings: Timings,
): readonly Frame[] {
  const laid: Casting = casting(fight.turn)
  const rest = restingAt(fight)
  const tumbling = laid.filter((one) => !still.has(one.die as string))
  if (tumbling.length === 0) return [{ beat: { kind: 'settled' }, after: 0, shows: rest }]

  const frames: Frame[] = []
  // A held die never left the table, so it is settled from the first frame.
  let landed: DieId[] = laid.filter((one) => still.has(one.die as string)).map((one) => one.die)
  const at = (): Shown => ({ ...rest, landed: [...landed] })
  for (let spin = 0; spin < Math.max(0, timings.tumbles); spin++) {
    frames.push({
      beat: { kind: 'tumble', spin },
      after: frames.length === 0 ? 0 : timings.land,
      shows: at(),
    })
  }
  for (const one of tumbling) {
    landed = [...landed, one.die]
    frames.push({
      beat: { kind: 'land', die: one.die, face: one.face },
      after: frames.length === 0 ? 0 : timings.land,
      shows: at(),
    })
  }
  frames.push({ beat: { kind: 'settled' }, after: timings.land, shows: rest })
  return frames
}

/** Which face a die that is still in the air shows on this turn of the tumble.
 *
 * art. 119: **nothing is decided during an animation.** This is not a roll —
 * the die's real face was cast from the run's own lot before the first frame
 * (art. 36) — it is a deterministic picture of a die in the air, hashed off
 * the die's identity and the spin so that the same throw tumbles the same way
 * every time it is replayed (art. 75).
 */
export function tumblingFace(die: DieId, spin: number, faces: number): number {
  let n = 0
  const id = `${die as string}:${spin}`
  for (let i = 0; i < id.length; i++) n = (n * 131 + id.charCodeAt(i) * (i + 7)) >>> 0
  return faces <= 0 ? 0 : n % faces
}
