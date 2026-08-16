/**
 * Feedback for outcomes that have already been decided.
 *
 * Nothing here rolls, branches, or reads a game rule. Every function is handed
 * a number the reducer already computed, or a node it should move, and reveals
 * it. That is what makes determinism structural: **an animation has no outcome
 * to change.** The intermediate faces a bone shows while tumbling come from a
 * counter, not from a generator, and the bone always settles onto the face the
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

/** The stagger between one bone leaving the hand and the next. */
const STAGGER = 28
/** How long a single bone tumbles before it snaps onto its face. */
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

/** How long a throw of `count` bones takes on screen, in ms. */
export function tumbleDuration(count: number): number {
  return TUMBLE + Math.max(0, count - 1) * STAGGER
}

export interface Tumble {
  /** The bone buttons to throw. Every committed bone, every time. */
  readonly bones: readonly HTMLElement[]
  /**
   * Paint an intermediate face on a bone, or restore its settled one at
   * `step === undefined`.
   *
   * Injected, so this file never learns how a bone is drawn — and so the faces
   * that flicker past are the caller's deterministic function of the lane, not
   * anything this file could have randomised.
   */
  readonly paint?: (bone: HTMLElement, step: number | undefined) => void
}

/**
 * Throw bones.
 *
 * Each one lifts, turns and drops onto its face, one after another. The
 * stagger is the whole reason it reads as several objects landing rather than
 * one row changing value.
 */
export function tumble(sequence: Sequence, { bones, paint }: Tumble): void {
  bones.forEach((bone, index) => {
    const delay = index * STAGGER
    sequence.at(delay, () => {
      bone.classList.remove('bone-settle')
      bone.classList.add('bone-rolling')
    })
    for (let step = 0; step < FLICKERS; step++) {
      sequence.at(delay + (TUMBLE / (FLICKERS + 1)) * step, () => paint?.(bone, step))
    }
    sequence.at(delay + TUMBLE, () => {
      paint?.(bone, undefined)
      bone.classList.remove('bone-rolling')
      bone.classList.add('bone-settle')
    })
  })
  // The settle class is only there to play its snap once; it is cleared with
  // the next throw, and nothing reads it.
}

/** The bones you just lost or got back, over the pile that holds them. */
export function pileChange(orb: HTMLElement, delta: number): void {
  if (delta === 0) return
  const tag = document.createElement('b')
  tag.className = `pile-delta pile-delta-${delta < 0 ? 'lost' : 'back'}`
  tag.textContent = `${delta < 0 ? '−' : '+'}${Math.abs(delta)}`
  orb.append(tag)
  if (reducedMotion()) {
    tag.remove()
    return
  }
  tag.addEventListener('animationend', () => tag.remove(), { once: true })
}

/**
 * How long the bright frame stays on. Punctuation, not a state.
 *
 * The casualties were decided before any of this ran, so there is nothing
 * for a long flash to wait for. It is one frame of white flesh at the instant the
 * blade arrives and then it is gone.
 */
const IMPACT = 130

/**
 * The blow you landed.
 *
 * The thing blows out bright and the frame takes a small kick, on the same
 * frame, because they are one event.
 *
 * **There is no number.** Damage does not exist: what happened is that some of
 * its bones broke, and those bones are on screen breaking. A figure rising off
 * the enemy would be the old game's arithmetic drawn over the top of the new
 * game's physical fact. `count` decides how hard the frame kicks and nothing
 * else.
 *
 * `bright` is an authored plate of the thing lit white, when one exists for
 * the pose it is standing in — it has to share that pose's box, because this
 * swaps the source and touches no placement. Without one, the same frame is
 * made by driving the sprite's own brightness, which is weaker and is why the
 * plate exists.
 */
export function enemyHit(world: World, count: number, bright?: string): void {
  if (reducedMotion() || count <= 0) return

  const was = world.enemy.getAttribute('src')
  if (bright) {
    world.enemy.src = bright
    world.enemy.classList.add('lit')
  } else {
    world.enemy.classList.add('struck')
  }
  world.root.classList.add('kicked')
  window.setTimeout(() => {
    // Back to the plate it was on, not to whatever a later paint has decided —
    // this beat is over before the next one runs, and putting back exactly what
    // was taken is what keeps that true even if it is not.
    if (bright && was) world.enemy.src = was
    world.enemy.classList.remove('struck', 'lit')
    world.root.classList.remove('kicked')
  }, IMPACT)
}

/**
 * The player's arm, going in.
 *
 * Three poses and nothing between them: back a couple of pixels, out to full
 * extension, back to rest. A hand that glides is a hand attached to nobody —
 * the whole read is that it is fast enough to be violent, and the only way to
 * get that out of two authored plates is to give the second one almost no
 * time.
 *
 * Two things move together and deliberately so: the arm plate swaps on the
 * foreground layer, and the whole frame leans with it. The frame is the
 * player's head — a body that drives a knife forward drives its head forward
 * too, so the camera is not standing in for the arm, it is the rest of the
 * same movement.
 *
 * Both arm plates are already mounted by the paint. All this does is say which
 * one is uncovered, so nothing here knows an asset name and a settled sequence
 * lands on the resting arm without having to put anything back.
 */
export function weaponThrust(world: World, pose: 'wind' | 'thrust' | 'rest'): void {
  if (reducedMotion()) return
  world.foreground.classList.remove('wind', 'thrust')
  world.root.classList.remove('wind', 'thrust')
  if (pose === 'rest') return
  world.foreground.classList.add(pose)
  world.root.classList.add(pose)
}

/**
 * The thing dragging itself one reach nearer.
 *
 * Two pokes with the picture changing between them, because the picture
 * changing *is* the animation. `gather` is the 40–80 ms of it bunching where
 * it stands; the caller then paints the next authored reach — a hard cut, no
 * tween, nothing interpolated — and `arrive` is the pixel or two of it
 * settling into the new composition.
 *
 * The discontinuity is the effect. It should look like you blinked and it
 * covered six feet.
 */
export function enemyAdvance(world: World, phase: 'gather' | 'arrive'): void {
  if (reducedMotion()) return
  if (phase === 'gather') {
    world.enemy.classList.remove('settling')
    world.enemy.classList.add('gathering')
    return
  }
  world.enemy.classList.remove('gathering')
  void world.enemy.offsetWidth
  world.enemy.classList.add('settling')
  window.setTimeout(() => world.enemy.classList.remove('settling'), 220)
}

/**
 * The blow that landed on you.
 *
 * The frame is the player's body, so this is the one effect that moves the
 * whole world. Spending it anywhere else spends it for nothing. `weight` is
 * how many bones of yours broke — it decides how hard, and it is not a
 * damage number by another name: nothing reads it back.
 */
export function shake(world: World, weight: number): void {
  if (reducedMotion()) return
  world.root.classList.remove('struck')
  // Reading offsetWidth restarts the animation when two blows land in a row.
  void world.root.offsetWidth
  world.root.dataset['blow'] = String(weight)
  world.root.classList.add('struck')
  window.setTimeout(() => world.root.classList.remove('struck'), 320)
}
