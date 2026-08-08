/**
 * Feedback for outcomes that have already been decided.
 *
 * Nothing here rolls, branches, or reads a game rule. Every function is handed
 * a number the reducer already computed, or a node it should move, and reveals
 * it. That is what makes determinism structural: **an animation has no outcome
 * to change.** The intermediate faces a die shows while tumbling come from a
 * counter, not from a generator, and the die always settles onto the face the
 * reducer chose.
 *
 * With `prefers-reduced-motion`, or with `motion: false`, every effect resolves
 * immediately to its settled state and nothing is lost — the settled state is
 * always the whole truth, which is the property that lets the tests turn all of
 * this off and still be testing the game.
 */

import type { World } from './compositor.js'

export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** The stagger between one die leaving the hand and the next. */
const STAGGER = 28
/** How long a single die tumbles before it snaps onto its face. */
const TUMBLE = 300
/** How many intermediate faces flicker past on the way. */
const FLICKERS = 3

/**
 * A run of timed steps that can always be brought to its end at once.
 *
 * Every sequence in the game is one of these, and every one of them can be
 * settled — by a press, by reduced motion, by a test. There is no path where a
 * missed callback leaves the interface locked, because `settle` runs the whole
 * remainder synchronously and is called from the dispatcher before any action.
 */
export class Sequence {
  private timers: number[] = []
  private steps: (() => void)[] = []
  private done = false

  constructor(private readonly animated: boolean) {}

  /** Schedule `run` for `at` ms from the start, or run it now if unanimated. */
  at(at: number, run: () => void): this {
    if (this.done) return this
    if (!this.animated) {
      run()
      return this
    }
    const index = this.steps.length
    this.steps.push(run)
    this.timers.push(
      window.setTimeout(() => {
        if (this.done) return
        this.steps[index] = noop
        run()
      }, at),
    )
    return this
  }

  /** Run everything still pending, immediately, and cancel the clock. */
  settle(): void {
    if (this.done) return
    this.done = true
    for (const timer of this.timers) window.clearTimeout(timer)
    const pending = this.steps
    this.steps = []
    for (const step of pending) step()
  }

  get finished(): boolean {
    return this.done
  }
}

const noop = (): void => {}

/** How long a throw of `count` dice takes on screen, in ms. */
export function tumbleDuration(count: number): number {
  return TUMBLE + Math.max(0, count - 1) * STAGGER
}

export interface Tumble {
  /** The die buttons to throw. Dice that were held are simply not passed. */
  readonly dice: readonly HTMLElement[]
  /**
   * Paint an intermediate face on a die, or restore its settled one at
   * `step === undefined`.
   *
   * Injected, so this file never learns how a die is drawn — and so the faces
   * that flicker past are the caller's deterministic function of the slot, not
   * anything this file could have randomised.
   */
  readonly paint?: (die: HTMLElement, step: number | undefined) => void
}

/**
 * Throw dice.
 *
 * Each die lifts, turns and drops onto its face, one after another. The
 * stagger is the whole reason it reads as six objects landing rather than one
 * row changing value.
 */
export function tumble(sequence: Sequence, { dice, paint }: Tumble): void {
  dice.forEach((die, index) => {
    const delay = index * STAGGER
    sequence.at(delay, () => {
      die.classList.remove('die-settle')
      die.classList.add('die-rolling')
    })
    for (let step = 0; step < FLICKERS; step++) {
      sequence.at(delay + (TUMBLE / (FLICKERS + 1)) * step, () => paint?.(die, step))
    }
    sequence.at(delay + TUMBLE, () => {
      paint?.(die, undefined)
      die.classList.remove('die-rolling')
      die.classList.add('die-settle')
    })
  })
  // The settle class is only there to play its snap once; it is cleared with
  // the next throw, and nothing reads it.
}

/** The dice you chose, confirming that they are the hand. */
export function confirm(dice: readonly HTMLElement[]): void {
  for (const die of dice) {
    die.classList.remove('die-scoring')
    void die.offsetWidth
    die.classList.add('die-scoring')
  }
}

/** The relic that contributed, in its own bay, at the moment its term lands. */
export function pulseRelic(host: HTMLElement, relicId: string): void {
  const bay = host.querySelector<HTMLElement>(`.relic[data-relic-id="${relicId}"]`)
  if (!bay) return
  bay.classList.remove('relic-triggered')
  void bay.offsetWidth
  bay.classList.add('relic-triggered')
  window.setTimeout(() => bay.classList.remove('relic-triggered'), 620)
}

/** A red or green face doing what it said it would, on the die that did it. */
export function fireFace(die: HTMLElement): void {
  const mark = die.querySelector<HTMLElement>('.mark')
  if (!mark) return
  mark.classList.remove('mark-fired')
  void mark.offsetWidth
  mark.classList.add('mark-fired')
  window.setTimeout(() => mark.classList.remove('mark-fired'), 520)
}

/** The health you just spent or gained, over the orb that holds it. */
export function orbChange(orb: HTMLElement, delta: number): void {
  if (delta === 0) return
  const tag = document.createElement('b')
  tag.className = `orb-delta orb-delta-${delta < 0 ? 'hurt' : 'heal'}`
  tag.textContent = `${delta < 0 ? '−' : '+'}${Math.abs(delta)}`
  orb.append(tag)
  if (reducedMotion()) {
    tag.remove()
    return
  }
  tag.addEventListener('animationend', () => tag.remove(), { once: true })
}

/** The blow you landed: the enemy brightens for a frame and the number rises. */
export function flash(world: World, damage: number): void {
  const number = document.createElement('b')
  number.className = 'hit-number'
  number.textContent = String(damage)
  number.dataset['damage'] = String(damage)
  world.fx.append(number)

  if (reducedMotion()) {
    number.remove()
    return
  }

  world.enemy.classList.add('struck')
  number.addEventListener('animationend', () => number.remove(), { once: true })
  window.setTimeout(() => world.enemy.classList.remove('struck'), 180)
}

/**
 * The blow that landed on you.
 *
 * The frame is the player's body, so this is the one effect that moves the
 * whole world. Spending it anywhere else spends it for nothing.
 */
export function shake(world: World, damage: number): void {
  if (reducedMotion()) return
  world.root.classList.remove('struck')
  // Reading offsetWidth restarts the animation when two blows land in a row.
  void world.root.offsetWidth
  world.root.dataset['blow'] = String(damage)
  world.root.classList.add('struck')
  window.setTimeout(() => world.root.classList.remove('struck'), 320)
}
