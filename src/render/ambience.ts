/**
 * The room, still breathing.
 *
 * A backdrop that never moves is a photograph, and the slice's rooms were
 * photographs. This is the smallest thing that fixes that: a handful of
 * overlay plates on the midground, each cycling a short loop on its own fixed
 * clock, so a candle gutters at a different rate from a chain swinging and the
 * room stops reading as one still image with buttons on it.
 *
 * **It decides nothing, and it can decide nothing.** There is no reducer here,
 * no state, no draw, and no way to reach any of them — the whole file is a
 * timer, an `<img>`, and a list of filenames. That is deliberate and it is the
 * same guarantee `animation.ts` makes: ambience is not a beat in a sequence
 * that is revealing an outcome, it is wallpaper that moves, and the game is
 * identical with every frame of it missing.
 *
 * Which is exactly what happens today. The plates have not been painted, so
 * `ambientArt` answers nothing, every loop below builds zero elements, and the
 * rooms run without them. `ART_DIRECTION.md`: scenery may degrade.
 */

import { ambientArt, url } from './assets.js'
import type { World } from './compositor.js'
import { reducedMotion } from './animation.js'

/** One looping overlay: how many frames it has, and how long each is up. */
interface Loop {
  readonly family: string
  readonly frames: number
  readonly hold: number
}

/**
 * What each room has moving in it.
 *
 * The numbers are the whole design. They are deliberately coprime-ish and
 * nowhere near each other — 180 against 420 against 700 — because loops that
 * share a period resynchronise, and five overlays blinking together is a
 * lighting cue rather than a room. None of them is random: a generator here
 * would make the picture a thing the run could not reproduce, which is the one
 * rule every file in `render/` is held to.
 */
/*
 * Keyed by the **authored template**, not by a node of the generated map: a
 * room's mood is a property of the place, so two uses of one template gutter
 * the same way. `app.ts` passes `roomAt(run).id`.
 */
const AMBIENCE: Readonly<Record<string, readonly Loop[]>> = {
  reliquary: [
    { family: 'candle', frames: 3, hold: 180 },
    { family: 'chain', frames: 3, hold: 420 },
    { family: 'drip', frames: 3, hold: 300 },
    { family: 'embers', frames: 4, hold: 240 },
    { family: 'window', frames: 2, hold: 700 },
  ],
  'chain-vault': [
    { family: 'fire', frames: 3, hold: 200 },
    { family: 'chain', frames: 3, hold: 450 },
    { family: 'smoke', frames: 4, hold: 320 },
    { family: 'shaft', frames: 2, hold: 800 },
  ],
}

export function hasAmbience(templateId: string): boolean {
  return AMBIENCE[templateId] !== undefined
}

/**
 * The loops that are running, and the room they belong to.
 *
 * One of these is built at mount and lives as long as the app does. It holds
 * every timer it starts, which is the only reason a room change cannot leak
 * one — a controller that started intervals and forgot them would keep an
 * empty chapel guttering behind a fight for the rest of the session.
 */
export class RoomAmbience {
  private showing: string | undefined
  private animated = false
  private timers: number[] = []

  constructor(private readonly world: World) {}

  /**
   * Put the room's ambience up, or take it down.
   *
   * Idempotent for the same room: called on every paint, and a paint happens
   * several times a second during a sequence, so rebuilding here would restart
   * every loop from frame zero and the room would twitch in time with the
   * score. It rebuilds only when the room — or whether motion is on at all —
   * actually changes.
   */
  show(templateId: string | undefined): void {
    const animated = !reducedMotion()
    if (templateId === this.showing && animated === this.animated) return
    this.stop()
    this.showing = templateId
    this.animated = animated
    if (!templateId) return

    for (const loop of AMBIENCE[templateId] ?? []) {
      const frames = Array.from({ length: loop.frames }, (_, i) =>
        ambientArt(templateId, loop.family, i + 1),
      ).filter((a): a is NonNullable<typeof a> => a !== undefined)
      // Half a loop is worse than none: the missing frames would fall back to
      // whatever was up and the overlay would stutter. All or nothing.
      if (frames.length !== loop.frames) continue

      const node = document.createElement('img')
      node.className = 'ambient'
      node.alt = ''
      node.dataset['ambient'] = loop.family
      node.src = url(frames[0]!)
      this.world.midground.append(node)

      // With motion off the overlay is a still plate and stays on frame one.
      // Nothing is lost: none of it was ever information.
      if (!animated) continue
      let index = 0
      this.timers.push(
        window.setInterval(() => {
          index = (index + 1) % frames.length
          node.src = url(frames[index]!)
        }, loop.hold),
      )
    }
  }

  /** Every timer, and every plate. Called on room change and on teardown. */
  stop(): void {
    for (const timer of this.timers) window.clearInterval(timer)
    this.timers = []
    for (const node of this.world.midground.querySelectorAll('img[data-ambient]')) node.remove()
    this.showing = undefined
  }
}
