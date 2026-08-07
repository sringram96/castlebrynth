/**
 * Which frame a patch is showing — arts 107, 109, 116, 127.
 *
 * Pure arithmetic on the world clock, so a patch's state is a function of
 * the tick and its own identity and of nothing else. Two things follow, and
 * both are law rather than convenience: the same room breathes the same way
 * every time you stand in it (art. 109), and a test can ask what is on
 * screen at tick 41 without a canvas (art. 17's determinism, one level out).
 */

import type { AnimatedPatch } from './scene.js'

/** What the clock and the moment are, as a patch needs them. */
export interface PatchMoment {
  /** The world clock's tick count (art. 109). */
  readonly tick: number
  /** art. 116: with the world held still, loops stop and one-shots settle. */
  readonly still: boolean
  /** art. 30: whether something has come close. */
  readonly inFight: boolean
  /**
   * art. 107: the tick an `event` patch was fired on, by id. A one-shot that
   * has never fired is absent, and an absent one-shot shows nothing at all —
   * it is not a loop paused on frame zero, it is a thing that has not
   * happened.
   */
  readonly fired?: Readonly<Record<string, number>>
}

/**
 * art. 109: the phase, hashed from identity. Deterministic and cheap; the
 * only property asked of it is that two patches with different ids land on
 * different offsets more often than not.
 */
export function phaseOfPatch(patch: AnimatedPatch): number {
  if (patch.phase !== undefined) return patch.phase
  let h = 2166136261
  for (let i = 0; i < patch.id.length; i++) {
    h ^= patch.id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % Math.max(1, patch.frames.length * Math.max(1, patch.every))
}

/**
 * Which frame this patch shows now, or null for a patch that is not running.
 *
 * art. 116 is the interesting case. With the world held still a **loop** shows
 * its first frame — art. 107 says the settled state is the whole truth, and
 * for a loop the settled state is the frame it was authored from. A
 * **one-shot** that has fired shows its *last* frame, because for a one-shot
 * the settled state is what it ends in (art. 1), not what it starts from. A
 * player who never sees a frame of motion has still missed nothing.
 */
export function patchFrame(patch: AnimatedPatch, moment: PatchMoment): number | null {
  if (patch.frames.length === 0) return null
  if (patch.trigger === 'fight' && !moment.inFight) return null

  if (patch.trigger === 'event') {
    const at = moment.fired?.[patch.id]
    if (at === undefined) return null
    if (moment.still) return patch.frames.length - 1
    const step = Math.floor((moment.tick - at) / Math.max(1, patch.every))
    if (step < 0) return null
    // A one-shot plays once and ends settled. It does not wrap.
    return Math.min(step, patch.frames.length - 1)
  }

  if (moment.still) return 0
  const span = Math.max(1, patch.every)
  const step = Math.floor((moment.tick + phaseOfPatch(patch)) / span)
  return ((step % patch.frames.length) + patch.frames.length) % patch.frames.length
}

/** Which asset a patch is showing now, or null. */
export function patchAsset(patch: AnimatedPatch, moment: PatchMoment): string | null {
  const at = patchFrame(patch, moment)
  return at === null ? null : (patch.frames[at] ?? null)
}

/**
 * art. 107: **the budget, counted.** At most three things in a room may run a
 * loop, and a loop is at most three authored frames. Patches are the cheap
 * way to pay for a motion; they are not a way of having more of them, and
 * this is the function that says so out loud.
 */
export const MOST_PATCH_LOOPS = 3
export const MOST_PATCH_FRAMES = 3

export function overspentPatches(patches: readonly AnimatedPatch[]): readonly string[] {
  const faults: string[] = []
  const loops = patches.filter((one) => one.trigger !== 'event')
  if (loops.length > MOST_PATCH_LOOPS) {
    faults.push(`${loops.length} looping patches, and art. 107 allows ${MOST_PATCH_LOOPS}`)
  }
  for (const patch of loops) {
    if (patch.frames.length > MOST_PATCH_FRAMES) {
      faults.push(`${patch.id}: ${patch.frames.length} frames, and art. 107 allows ${MOST_PATCH_FRAMES}`)
    }
  }
  return faults
}
