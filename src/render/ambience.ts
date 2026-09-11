/**
 * The room, still breathing — on the art's own grid, in time.
 *
 * A room with no enemy in it was perfectly still, which reads as a slide rather
 * than as a place. This is the smallest thing that fixes that, and the law it
 * obeys is the pixel grid extended into time: **ambient motion moves like a
 * sprite cycle, never like CSS.** One shared clock at 5 Hz, whole pixels of
 * travel, whole quanta of light, transforms and opacity only. No easing curve,
 * no blur, no sub-pixel position, and no layout write.
 *
 * **It decides nothing, and it can decide nothing.** There is no reducer here,
 * no state, no draw, and no way to reach any of them — the whole file is a
 * clock, a handful of `<i>` elements and an integer. That is the same guarantee
 * `animation.ts` makes: ambience is not a beat in a sequence revealing an
 * outcome, it is the room, and the game is identical with every frame of it
 * missing. Which is exactly what happens with motion off: **nothing is mounted
 * at all.** Ceremony vanishes whole rather than resolving to a still version of
 * itself, because a still version would imply it had been carrying something.
 *
 * ## What replaced what
 *
 * This file used to drive a family of painted overlay plates and built nothing,
 * because none of them was ever delivered. The plates are still owed — see
 * `POLISH_PROGRESS.md` § HUMAN ART REQUIRED — and what ships until they land is
 * a **treatment**, in the same family as the territory grade: light on the
 * palette's own tokens, seated on an object the room already declares, stepped
 * by this clock. No pixel was authored for any of it.
 */

import type { SeatedAmbient } from '../content/rooms.js'
import type { World } from './compositor.js'
import { reducedMotion } from './animation.js'

/** The base rate. Every ambient runs on this or on an integer divisor of it. */
export const AMBIENT_HZ = 5

/** Which is this many milliseconds a step, and the only clock in the file. */
export const AMBIENT_STEP_MS = 1000 / AMBIENT_HZ

/** How many steps a light's cycle has. Four, and the pattern is never smooth. */
export const AMBIENT_STEPS = 4

/**
 * One quantum of light, as a fraction of opacity.
 *
 * The whole reason a light here is an integer: `--lit` is a **count** of these,
 * computed in TypeScript and multiplied by this in the stylesheet, so there is
 * no fractional opacity anywhere for a transition to interpolate through.
 *
 * It is written onto every source as `--quantum` rather than typed into the
 * stylesheet as well, because a number written down twice is a number that will
 * disagree with itself — the same rule the tray's geometry is held to.
 */
export const LIGHT_QUANTUM = 0.02

/**
 * How lit a swaying thing is, and it does not change.
 *
 * A `sway` moves; it does not gutter. The band is a constant dim light and what
 * steps is where it is standing, which is the difference between something
 * hanging in a draught and something on fire.
 */
const SWAY_LIT = 3

/**
 * How a kind of light steps, in quanta, before its amplitude is applied.
 *
 * Fixed lists, exactly as the font's flicker and the crown's tumble are fixed
 * lists. Nothing in presentation may draw a number: a generator here would make
 * the picture a thing the run could not reproduce.
 *
 * `flicker` is deliberately uneven and never repeats a neighbour — a flame that
 * breathes smoothly is a lamp. `glow` is even and rises and falls.
 */
const LIGHT: Readonly<Record<string, readonly number[]>> = {
  flicker: [2, 1, 3, 2],
  glow: [2, 3, 4, 3],
}

/** How a sway steps, in multiples of its amplitude. Out, back, out, back. */
const SWAY: readonly number[] = [0, 1, 0, -1]

/**
 * Where the motes stand across the box, and how far down each one starts.
 *
 * Six columns and six offsets, authored rather than drawn, so the dust in the
 * ossuary is the same dust on every run and in every replay. The two lists are
 * deliberately out of step with each other — six motes that share a phase are a
 * rainfall cue rather than air.
 */
const MOTE_COLUMNS: readonly number[] = [0.13, 0.29, 0.41, 0.58, 0.72, 0.88]
const MOTE_STARTS: readonly number[] = [0, 0.41, 0.17, 0.73, 0.55, 0.88]

/** A mote is one pixel. It is dust, and dust is one pixel. */
const MOTE_PX = 1

/** One mounted source: its element, its clock divisor, and where it is up to. */
interface Running {
  readonly node: HTMLElement
  readonly source: SeatedAmbient
  readonly motes: readonly HTMLElement[]
  /** Where each mote is, in whole pixels down the box. */
  fallen: number[]
  step: number
}

/**
 * The room's ambience, and the one clock that drives it.
 *
 * Built once at mount and living as long as the app does. It holds every
 * element it makes and the single frame request that steps them, which is the
 * only reason a room change cannot leak one — a controller that started timers
 * and forgot them would keep an empty chapel guttering behind a fight for the
 * rest of the session.
 */
export class RoomAmbience {
  private showing: string | undefined
  private running = false
  private mounted: Running[] = []
  private frame: number | undefined
  private last = 0
  private counter = 0
  private box = { width: 0, height: 0 }

  constructor(private readonly world: World) {
    // Fully stopped when the page is hidden. `requestAnimationFrame` already
    // pauses in a background tab in every browser that ships this game, and the
    // listener is what makes that a promise rather than a happy accident.
    document.addEventListener('visibilitychange', this.visibility)
  }

  /**
   * Put the room's ambience up, or take it down.
   *
   * Idempotent for the same room in the same condition: it is called on every
   * paint, and a paint happens several times a second during a sequence, so
   * rebuilding here would restart every cycle from step zero and the room would
   * twitch in time with the score.
   *
   * `running` is *explore, idle, motion on* and the caller owns it. When it is
   * false **nothing is mounted** — not a frozen element, not a dimmed one. A
   * cascade, a crossing, a fight and an open MAP all own the picture while they
   * are up, and ambience is the one thing on screen with no claim to it.
   */
  show(room: { readonly id: string; readonly sources: readonly SeatedAmbient[] } | undefined, running: boolean): void {
    const live = running && !reducedMotion() && room !== undefined && room.sources.length > 0
    const id = live ? room.id : undefined
    if (id === this.showing && live === this.running) return
    this.stop()
    this.showing = id
    this.running = live
    if (!live || !room) return

    // Measured once, on the way up, and never again while the room is showing.
    // Every position below is a whole pixel off these two numbers, so nothing
    // in the step loop reads layout and nothing in it writes any.
    this.box = { width: this.world.root.clientWidth, height: this.world.root.clientHeight }

    for (const source of room.sources) this.mounted.push(this.mount(source))
    this.step()
    this.start()
  }

  /** Every element, and the clock. Called on room change and on teardown. */
  stop(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    this.frame = undefined
    this.last = 0
    this.counter = 0
    for (const node of this.world.root.querySelectorAll('[data-ambient]')) node.remove()
    this.mounted = []
    this.showing = undefined
    this.running = false
  }

  // ── mounting ─────────────────────────────────────────────────────────

  private mount(source: SeatedAmbient): Running {
    const node = document.createElement('i')
    node.className = 'ambient'
    node.dataset['ambient'] = source.kind
    node.dataset['target'] = source.target
    node.style.setProperty('--quantum', String(LIGHT_QUANTUM))
    if (source.kind === 'sway') node.style.setProperty('--lit', String(SWAY_LIT))

    // Seated on the object the content named, in whole pixels off the box this
    // room is being painted into. A fraction of the world is not a whole pixel
    // of it, and the grid law is about the pixel rather than about the fraction.
    if (source.at) {
      node.style.left = `${Math.round(source.at.x * this.box.width)}px`
      node.style.top = `${Math.round(source.at.y * this.box.height)}px`
    }

    const motes: HTMLElement[] = []
    const fallen: number[] = []
    if (source.kind === 'drift') {
      MOTE_COLUMNS.forEach((column, index) => {
        const mote = document.createElement('i')
        mote.className = 'mote'
        mote.dataset['mote'] = String(index)
        mote.style.left = `${Math.round(column * this.box.width)}px`
        mote.style.width = `${MOTE_PX}px`
        mote.style.height = `${MOTE_PX}px`
        node.append(mote)
        motes.push(mote)
        fallen.push(Math.round((MOTE_STARTS[index] ?? 0) * this.box.height))
      })
    }

    // A **direct child of the world box**, exactly as the territory grade is,
    // and for exactly the same reason: a blend mode mixes with the stacking
    // context it sits in, so a light nested inside a layer would blend with
    // that layer's own contents rather than with the picture. It carries the
    // fx layer's depth minus one — under the territory's air, over the room.
    node.style.zIndex = '3'
    this.world.root.append(node)
    return { node, source, motes, fallen, step: 0 }
  }

  // ── the clock ────────────────────────────────────────────────────────

  private start(): void {
    if (this.frame !== undefined || document.hidden) return
    this.last = 0
    this.frame = requestAnimationFrame(this.beat)
  }

  /**
   * One rAF gate, and every ambient in the room hangs off it.
   *
   * A timer per source is what the old plate loop did and it is what makes five
   * overlays drift out of phase with the frame. One gate means every step in
   * the room lands on the same paint, and a source that runs slower does it by
   * dividing this clock rather than by keeping its own.
   */
  private beat = (now: number): void => {
    this.frame = requestAnimationFrame(this.beat)
    if (this.last !== 0 && now - this.last < AMBIENT_STEP_MS) return
    this.last = now
    this.counter += 1
    this.step()
  }

  /** Advance whatever is due, and nothing else. */
  private step(): void {
    for (const running of this.mounted) {
      if (this.counter % running.source.tick !== 0) continue
      running.step = (running.step + 1) % AMBIENT_STEPS
      this.paint(running)
    }
  }

  /**
   * One step of one source, as attributes and custom properties.
   *
   * Transforms and opacity only, and both of them integers before the
   * stylesheet multiplies them by one step: `--lit` is a count of quanta and
   * `--shift` is a count of pixels. There is nothing here for a browser to
   * interpolate and nothing here that can land between two pixels.
   */
  private paint(running: Running): void {
    const { node, source, step } = running
    node.dataset['step'] = String(step)

    const light = LIGHT[source.kind]
    if (light) {
      node.style.setProperty('--lit', String((light[step] ?? 0) * source.amplitude))
      return
    }

    if (source.kind === 'sway') {
      node.style.setProperty('--shift', String((SWAY[step] ?? 0) * source.amplitude))
      return
    }

    // Dust. Each mote falls by its amplitude in whole pixels and comes back in
    // at the top — six of them, forever, and never a seventh.
    running.motes.forEach((mote, index) => {
      const next = ((running.fallen[index] ?? 0) + source.amplitude) % Math.max(1, this.box.height)
      running.fallen[index] = next
      mote.style.top = `${next}px`
    })
  }

  private visibility = (): void => {
    if (document.hidden) {
      if (this.frame !== undefined) cancelAnimationFrame(this.frame)
      this.frame = undefined
      return
    }
    if (this.running) this.start()
  }
}
