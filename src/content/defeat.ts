/**
 * How a horror dies, on screen.
 *
 * A fight does not end on the frame its last point of health leaves. The
 * reducer decides the kill in full and then holds the fight open — `combat.
 * defeated` — while the picture of it plays, so the win arrives *after* the
 * thing has visibly stopped rather than over the top of it.
 *
 * This file is the whole of that content: which horrors have a death worth
 * watching, what plates it is made of, how long each one is up, and where the
 * body sits while it goes. Nothing here decides an outcome — every number is a
 * duration or a placement, and a horror with no entry dies exactly as it did
 * before this file existed. That fallback is the point of keeping the table
 * sparse: a defeat sequence is authored art, and an enemy that has none must
 * not be held on a blank screen waiting for it.
 *
 * It is content rather than `render/` because the reducer has to read it: *is
 * this a death that gets played* is the one thing about a defeat that is not
 * presentation, and game logic may not import from `render/`.
 */

import type { Stance } from './enemies.js'

/**
 * One authored beat of a death.
 *
 * The frame is a picture plus where that picture sits, because a thing giving
 * out does not do it in the box it was standing and fighting in — it drops,
 * it shrinks, and the light goes out of it. Those three are the animation when
 * the plates are stand-ins, and they are the staging when they are not.
 */
export interface DefeatFrame {
  /**
   * The authored plate for this beat, as an enemy art pose — the `<pose>` half
   * of an `ENEMY_ART` key — or nothing to hold the plate it died standing in.
   *
   * Naming one is the whole of the swap, and the two deaths below are the two
   * halves of that: the Warden names `defeat.1` and `defeat.2` and is therefore
   * staged at identity, while the Gnawing names nothing and has its collapse
   * made for it out of `scale`, `drop` and `dim`. See `## HUMAN ART REQUIRED`
   * in `POLISH_PROGRESS.md` for the plates the Gnawing is still waiting on.
   */
  readonly pose?: string
  /** How long this frame is up, in milliseconds. */
  readonly hold: number
  /** Its width, as a multiple of the stance it died in. */
  readonly scale: number
  /** How far it sinks, as a fraction of the world's height. */
  readonly drop: number
  /** How lit it is. 1 is untouched; the ladder runs down into the dark. */
  readonly dim: number
  /**
   * Use the authored impact plate — the thing blown out white — if one exists
   * for the pose it is standing in. The same rule and the same plate as the
   * instant it is struck, because the first frame of a death *is* a hit.
   */
  readonly lit?: boolean
}

export interface Defeat {
  /**
   * The freeze, in milliseconds after the killing blow lands.
   *
   * The blade arrives, the number rises, and then nothing moves for a moment.
   * It is the cheapest beat in the sequence and it is what makes the collapse
   * read as a consequence rather than as the next frame of an animation.
   */
  readonly still: number
  /** In order. The last one is the held picture of a dead thing. */
  readonly frames: readonly DefeatFrame[]
}

/**
 * The Gnawing, giving out.
 *
 * Four frames and 660 ms: struck, slumping, ruined, gone. The last one is held
 * three times as long as the first, because the beat the player is actually
 * being given is the silence after it stops — the three before it are just
 * enough motion to make that silence land.
 *
 * The plates are the ones the encounter already ships (see `DefeatFrame.pose`),
 * so what is authored here is the staging: it sinks a seventh of the world's
 * height, loses a quarter of its width and almost all of its light.
 */
const GNAWING: Defeat = {
  still: 140,
  frames: [
    // Still threatening, and struck. The white plate the impact uses, held
    // rather than flashed — this is the frame where it has not fallen yet.
    { hold: 110, scale: 1, drop: 0, dim: 1, lit: true },
    // It recoils and drops. Two hundredths of the frame; barely a movement,
    // and the first time in the encounter it has gone backwards.
    { hold: 110, scale: 0.98, drop: 0.02, dim: 0.78 },
    // Collapsing. The step is much larger than the one before it, which is
    // what stops the sequence reading as an even fade.
    { hold: 160, scale: 0.9, drop: 0.07, dim: 0.5 },
    // Down, and dark. Held.
    { hold: 280, scale: 0.76, drop: 0.14, dim: 0.26 },
  ],
}

/**
 * The Warden, stopping.
 *
 * The same framework and the opposite staging, which is what the framework was
 * for. The Gnawing's death is *staged* — its frames name no plate, so the
 * sequence makes the collapse out of the sprite it died standing in by shrinking
 * it, dropping it and taking the light out of it. The Warden's death is
 * **painted**: two authored plates, one of it giving way and one of it down in
 * its own robe, each the whole 480x720 scene.
 *
 * So every staging number here is the identity. `scale: 1`, `drop: 0`,
 * `dim: 1` on both frames is not an oversight — it is the statement that this
 * death needs no help. Shrinking a plate that already draws a collapsed figure
 * would collapse it twice, and moving a scene-registered plate would slide the
 * whole picture off the door it is standing in front of.
 *
 * 120 + 180 + 420 = 720 ms, and the last frame is more than twice the first.
 * The body is the beat; the fall is the punctuation that makes it land.
 */
const WARDEN: Defeat = {
  still: 120,
  frames: [
    // Still on its feet, and no longer holding itself up.
    { pose: 'defeat.1', hold: 180, scale: 1, drop: 0, dim: 1 },
    // Down. Held, and the last thing the fight has to say.
    { pose: 'defeat.2', hold: 420, scale: 1, drop: 0, dim: 1 },
  ],
}

/**
 * The Marrow, coming apart.
 *
 * Staged rather than painted, exactly as the Gnawing's is, and for the same
 * reason: the encounter ships one plate and no death family, so the collapse
 * is made out of that plate by shrinking it, dropping it and taking the light
 * out of it. A thing whose whole body is other people's bones should not
 * simply vanish when the last of them breaks, and until there are drawings of
 * it giving way this is the honest substitute — the fight visibly ends.
 *
 * Five frames rather than four, and the drop is larger than the Gnawing's: it
 * is standing upright in the room rather than crawling along the floor of it,
 * so it has further to go. The plates it wants are recorded under
 * `## HUMAN ART REQUIRED` in `POLISH_PROGRESS.md`.
 */
const MARROW: Defeat = {
  still: 130,
  frames: [
    // Struck, and still standing. No impact plate exists for it, so this beat
    // is the sprite's own brightness — weaker than a painted one, which is
    // exactly why the painted one is owed.
    { hold: 110, scale: 1, drop: 0, dim: 1, lit: true },
    // The first thing to go. Barely a movement, and the first time in the
    // fight it has gone backwards.
    { hold: 120, scale: 0.98, drop: 0.03, dim: 0.8 },
    // It loses its height. The step is much larger than the one before it,
    // which is what stops the sequence reading as an even fade.
    { hold: 150, scale: 0.88, drop: 0.12, dim: 0.54 },
    { hold: 150, scale: 0.72, drop: 0.22, dim: 0.34 },
    // A heap, and dark. Held, and the last thing the fight has to say.
    { hold: 300, scale: 0.6, drop: 0.3, dim: 0.2 },
  ],
}

/**
 * Every horror whose death is played out. Keyed by enemy id.
 *
 * All three of the slice's enemies are here. The sparse fallback in `defeatOf`
 * remains as a defensive path — a save from a build that had an entry this one
 * does not must still resolve — but no shipped fight may reach it, and
 * `test/unit/defeat.test.ts` is what says so.
 */
export const DEFEATS: Readonly<Record<string, Defeat>> = {
  gnawing: GNAWING,
  marrow: MARROW,
  warden: WARDEN,
}

/** The death of a horror, or nothing because it has not been authored. */
export function defeatOf(enemyId: string): Defeat | undefined {
  return DEFEATS[enemyId]
}

/**
 * How long a death takes, from the killing blow to the win, in milliseconds.
 *
 * Zero for a horror that has none — which is the arithmetic saying the same
 * thing the reducer does: nothing is held open for a picture that does not
 * exist.
 */
export function defeatDuration(enemyId: string): number {
  const death = defeatOf(enemyId)
  if (!death) return 0
  return death.frames.reduce((total, frame) => total + frame.hold, death.still)
}

/**
 * Where the body sits on one frame of its death.
 *
 * Relative to the stance it died in, never absolute, so a horror killed at the
 * far end of the hall collapses at the far end of the hall. An absolute box
 * here would make every death happen in the same place, which for a thing that
 * closes the distance would undo the whole encounter.
 */
export function defeatStance(base: Stance, frame: DefeatFrame): Stance {
  return {
    width: base.width * frame.scale,
    foot: base.foot + frame.drop,
    ...(base.at !== undefined ? { at: base.at } : {}),
  }
}
