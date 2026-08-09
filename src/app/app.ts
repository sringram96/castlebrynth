/**
 * The root controller.
 *
 * It owns exactly four things: the current state, the dispatcher, when to
 * repaint, and the presentation of a change that has already happened. It
 * computes no outcome — `reduce` does that — and it draws no pixel; the views
 * do.
 *
 * There is one dispatcher and one path from a press to a state change, which
 * is the whole answer to the class of bug this reset exists to fix.
 *
 * ## Motion is downstream of the reducer, always
 *
 * A press reduces, persists, and *then* plays. The authoritative state is
 * already saved before the first frame of any sequence, so a reload mid-throw
 * lands on the settled truth and a replay of the same seed is identical. What
 * a sequence may do is hold the *previous* state on screen for a few hundred
 * milliseconds — see `presenting` — because a SCORE whose next turn paints
 * over it instantly is a score the player never saw.
 */

import { enemy, intentAt } from '../content/enemies.js'
import type { Reach } from '../content/enemies.js'
import { preview } from '../combat/scoring.js'
import { selectionOf } from '../combat/resolve.js'
import { reduce } from '../game/reducer.js'
import type { Action } from '../game/reducer.js'
import { save } from '../game/save.js'
import type { CombatState, GameState } from '../game/state.js'
import { mountWorld } from '../render/compositor.js'
import type { World } from '../render/compositor.js'
import { TRAY_ART, enemyArt, enemyPose, url } from '../render/assets.js'
import { mountTray, paintTumble, renderTray } from '../ui/trayView.js'
import type { Tray } from '../ui/trayView.js'
import { renderWorld } from '../ui/worldView.js'
import { renderOverlay, renderScreen } from '../ui/screens.js'
import type { Overlay } from '../ui/screens.js'
import {
  Sequence,
  confirm,
  enemyAdvance,
  enemyContact,
  enemyHit,
  fireFace,
  orbChange,
  pulseRelic,
  reducedMotion,
  shake,
  tumble,
  tumbleDuration,
  weaponThrust,
} from '../render/animation.js'

/**
 * The beats of a score, in milliseconds from the press.
 *
 * They are named because the order is the point: you chose these dice, they
 * made this hand, this relic added to it, this red face cost you that, the
 * blow landed, and only then did the thing hit back. A player who watches this
 * once should be able to describe what they did.
 */
const SCORE = {
  chosen: 0,
  relics: 190,
  faces: 330,
  /** The arm draws back. One frame of anticipation and no more. */
  wind: 395,
  /** And goes in. Forty-five milliseconds of travel, so it reads as violence. */
  thrust: 440,
  /** Full extension. The blade arrives, the flesh blows white, the number. */
  landed: 480,
  rest: 580,
  answer: 720,
  next: 950,
} as const

/**
 * The extra beats of a thing coming one reach nearer.
 *
 * They start after the strike has been allowed to read: an advance that
 * happens on the same frame as the impact is an advance nobody saw, because
 * the eye is on the white flesh and the number. The uncomfortable pause
 * between `SCORE.rest` and `gather` is the point of the whole encounter.
 */
const APPROACH = {
  gather: 700,
  /** The hard cut. No tween, no interpolation — the next authored picture. */
  arrive: 772,
  next: 1000,
} as const

/**
 * And of it arriving.
 *
 * Longer, uglier and much larger than an advance, because the difference
 * between *it is closer* and *it is on me* is the only thing this fight has to
 * say. Three discrete enlargements, held.
 */
const CONTACT = {
  hold: 700,
  ladder: [790, 880, 960],
  landed: 1050,
  next: 1500,
} as const

/**
 * The authored impact plate for a fight, when there is one it can be used in.
 *
 * A source swap changes no placement, so a bright plate can only stand in for
 * a pose whose box it shares — which for this encounter means the reach it was
 * painted at, and no other. Anywhere else the sprite's own brightness makes
 * the frame instead, and the difference is exactly what the plate buys.
 */
function brightPlate(combat: CombatState): string | undefined {
  const art = enemy(combat.enemyId).art
  const lit = enemyPose(art, 'hit')
  if (!lit) return undefined
  const standing = enemyArt(art, combat.approach)
  return lit.width === standing.width && lit.height === standing.height ? url(lit) : undefined
}

export interface AppOptions {
  readonly root: HTMLElement
  readonly initial: GameState
  readonly discarded?: string | undefined
  /** Off in tests, so a journey never waits on a transition. */
  readonly persist?: boolean
  /**
   * Whether presentation takes time.
   *
   * On by default. A browser journey that cares about flow rather than feel
   * turns it off and every sequence resolves in the same tick — which is the
   * same path `prefers-reduced-motion` takes, so the reduced-motion promise is
   * exercised by most of the suite rather than by one test.
   */
  readonly motion?: boolean
}

export class App {
  private state: GameState
  private readonly world: World
  private readonly tray: Tray
  private readonly screen: HTMLElement
  private readonly overlay: HTMLElement
  private readonly discarded: string | undefined
  private readonly persist: boolean
  private readonly motion: boolean
  /**
   * What the overlay is showing, if anything.
   *
   * Presentation only, and deliberately not in `GameState`: opening the menu
   * or looking closely at a die is not a move, does not survive a reload, and
   * must never be something a save can be stuck inside.
   */
  private opened: Overlay | undefined
  /**
   * A state to paint *instead of* the settled one, while a sequence runs.
   *
   * Never saved, never reduced, and never anything but a frame of a transition
   * between two real states. It is how the crown can still hold the hand you
   * scored while `this.state` is already the next turn.
   */
  private presenting: GameState | undefined
  private sequence: Sequence | undefined

  constructor(options: AppOptions) {
    this.state = options.initial
    this.discarded = options.discarded
    this.persist = options.persist ?? true
    this.motion = options.motion ?? true

    const root = options.root
    root.replaceChildren()

    const worldRoot = document.createElement('div')
    worldRoot.id = 'world'
    const trayRoot = document.createElement('div')
    trayRoot.id = 'tray'
    this.screen = document.createElement('div')
    this.screen.id = 'screen'
    this.overlay = document.createElement('div')
    this.overlay.id = 'overlay'
    this.overlay.hidden = true

    root.append(worldRoot, trayRoot, this.screen, this.overlay)

    this.world = mountWorld(worldRoot)
    this.tray = mountTray(trayRoot, url(TRAY_ART))
    this.render()
  }

  /** The one way a press becomes a state change. */
  dispatch = (action: Action): void => {
    // A press always arrives at a settled screen. Nothing is ever locked out
    // waiting for a transition — an impatient thumb finishes it instead.
    this.settle()

    const before = this.state
    const next = reduce(before, action)
    if (next === before) return
    this.state = next
    if (this.persist) save(next)
    this.play(before, next, action)
  }

  get current(): GameState {
    return this.state
  }

  /** Whether a transition is on screen. Tests read it; nothing else does. */
  get animating(): boolean {
    return this.presenting !== undefined
  }

  /** End any running sequence at once, and land on the settled state. */
  settle(): void {
    if (!this.sequence) return
    const running = this.sequence
    this.sequence = undefined
    running.settle()
  }

  // ── presentation ─────────────────────────────────────────────────────

  private get animated(): boolean {
    return this.motion && !reducedMotion()
  }

  private start(): Sequence {
    const sequence = new Sequence(this.animated)
    this.sequence = sequence
    return sequence
  }

  private play(before: GameState, after: GameState, action: Action): void {
    switch (action.type) {
      case 'ROLL':
        return this.playThrow(after, after.run!.combat!.roll.map((d) => d.slot))
      case 'REROLL': {
        // Only what was thrown. If all six tumble, the player cannot see what
        // holding accomplished, which is the whole decision of the phase.
        const held = new Set(before.run!.combat!.selected)
        return this.playThrow(after, after.run!.combat!.roll.map((d) => d.slot).filter((s) => !held.has(s)))
      }
      case 'SCORE':
        return this.playScore(before, after)
      default:
        this.render()
    }
  }

  private playThrow(after: GameState, slots: readonly number[]): void {
    // The dice are already showing the reducer's faces; the tumble is played
    // over the truth rather than towards it.
    this.render()
    if (!this.animated) return
    const dice = slots
      .map((slot) => this.tray.crown.querySelector<HTMLElement>(`.die[data-slot="${slot}"]`))
      .filter((node): node is HTMLElement => node !== null)
    if (dice.length === 0) return

    const sequence = this.start()
    tumble(sequence, { dice, paint: paintTumble })
    sequence.at(tumbleDuration(dice.length), () => {
      this.sequence = undefined
    })
  }

  /**
   * The score, as a chain of events rather than a change of numbers.
   *
   * The reducer has already produced the next turn — `phase: 'intent'`, an
   * empty table — and rendering it now would erase the hand before anyone saw
   * it land. So the frames below are built *from the state before the press*,
   * with one number advanced at a time, and the settled state is painted last.
   * No frame is ever saved, and none of them is consulted by anything.
   */
  private playScore(before: GameState, after: GameState): void {
    const run = before.run!
    const combat = run.combat!
    // The same call the well made for the preview, so what is revealed is
    // exactly what the player was shown before they committed.
    const p = preview(selectionOf(combat), run.relics, combat.spentHands)

    const enemyAfter = Math.max(0, combat.enemyHp - p.damage)
    const dealt = combat.enemyHp - enemyAfter
    const faceDelta = p.heal - p.cost
    const afterFaces = Math.max(0, Math.min(run.maxHp, run.hp + faceDelta))
    const answer = Math.max(0, afterFaces - (after.run?.hp ?? afterFaces))

    // Where the thing ended up, read off the two authoritative states and
    // nowhere else. The sequence below has no say in any of it: if the reducer
    // did not move it, nothing here can, and if the reducer says it arrived,
    // the player is already dead whether or not a single frame plays.
    const settledCombat = after.run?.combat
    const advancedTo =
      combat.approach !== undefined &&
      settledCombat?.approach !== undefined &&
      settledCombat.approach !== combat.approach
        ? settledCombat.approach
        : undefined
    const reached = settledCombat?.reached === true

    const frame = (patch: Partial<CombatState>, hp = run.hp): GameState => ({
      ...before,
      run: { ...run, hp, combat: { ...combat, ...patch } },
    })

    this.presenting = before
    this.render()
    if (!this.animated) {
      this.presenting = undefined
      this.render()
      if (dealt > 0) enemyHit(this.world, dealt)
      if (answer > 0) shake(this.world, answer)
      return
    }

    const sequence = this.start()

    sequence.at(SCORE.chosen, () => {
      confirm(
        combat.selected
          .map((slot) => this.tray.crown.querySelector<HTMLElement>(`.die[data-slot="${slot}"]`))
          .filter((node): node is HTMLElement => node !== null),
      )
      this.tray.well.querySelector('.score-hand')?.classList.add('score-confirm')
    })

    // Only the relics that actually contributed, in their own bays, as their
    // term is read out.
    sequence.at(SCORE.relics, () => {
      for (const id of p.firedRelics) pulseRelic(this.tray.relics, id)
    })

    // A red or green face fires on the die that carries it, not in a log line
    // the player has to go looking for afterwards.
    sequence.at(SCORE.faces, () => {
      if (faceDelta === 0 && p.cost === 0) return
      for (const slot of combat.selected) {
        const die = this.tray.crown.querySelector<HTMLElement>(`.die[data-slot="${slot}"]`)
        if (die?.querySelector('.mark')) fireFace(die)
      }
      orbChange(this.tray.orb, faceDelta)
    })

    // The arm. Back, then in — and a hand that lands on nothing is a hand that
    // did not swing, so a score that deals no damage never plays the strike.
    if (dealt > 0) {
      sequence.at(SCORE.wind, () => weaponThrust(this.world, 'wind'))
      sequence.at(SCORE.thrust, () => weaponThrust(this.world, 'thrust'))
      sequence.at(SCORE.rest, () => weaponThrust(this.world, 'rest'))
    }

    sequence.at(SCORE.landed, () => {
      this.presenting = frame({ enemyHp: enemyAfter }, afterFaces)
      this.render()
      // Exactly at full extension: the flesh goes white, the number rises and
      // the frame kicks, all on the same frame. Damage of zero gets none of
      // it — a convincing hit for a hand that did nothing is a lie.
      if (dealt > 0) enemyHit(this.world, dealt, brightPlate(combat))
    })

    sequence.at(SCORE.answer, () => {
      if (answer <= 0) return
      this.presenting = frame({ enemyHp: enemyAfter }, after.run?.hp ?? afterFaces)
      this.render()
      shake(this.world, answer)
    })

    if (reached) return this.playContact(sequence, frame, enemyAfter, afterFaces)
    if (advancedTo) return this.playAdvance(sequence, frame, enemyAfter, afterFaces, advancedTo)

    // Only now does the next turn — or the reward, or the death screen — take
    // the screen. A terminal screen that arrives before its own blow lands is
    // the fight ending without the player seeing how, so the last beat is the
    // same length whether or not the enemy got to answer.
    sequence.at(SCORE.next, () => this.finish())
  }

  /**
   * It survived, so it comes one reach nearer.
   *
   * Three beats and a hard cut in the middle. Nothing is interpolated between
   * the two authored compositions, and nothing here chooses the destination —
   * `to` came out of the reducer before the first of these was scheduled.
   */
  private playAdvance(
    sequence: Sequence,
    frame: (patch: Partial<CombatState>, hp?: number) => GameState,
    enemyHp: number,
    hp: number,
    to: Reach,
  ): void {
    sequence.at(APPROACH.gather, () => enemyAdvance(this.world, 'gather'))
    sequence.at(APPROACH.arrive, () => {
      this.presenting = frame({ enemyHp, approach: to }, hp)
      this.render()
      enemyAdvance(this.world, 'arrive')
    })
    sequence.at(APPROACH.next, () => this.finish())
  }

  /**
   * It was already at `close`, and it survived.
   *
   * The largest motion in the encounter, and the only one that leaves the
   * established composition. It reveals a death the reducer committed before
   * any of this was scheduled — settling it early lands on exactly the same
   * screen, which is the promise the whole file is built around.
   */
  private playContact(
    sequence: Sequence,
    frame: (patch: Partial<CombatState>, hp?: number) => GameState,
    enemyHp: number,
    hp: number,
  ): void {
    // It holds still first. The stillness is what makes the next 260 ms read.
    sequence.at(CONTACT.hold, () => enemyAdvance(this.world, 'gather'))
    CONTACT.ladder.forEach((at, step) => {
      sequence.at(at, () => {
        this.presenting = frame({ enemyHp }, hp)
        this.render()
        enemyContact(this.world, step + 1)
        shake(this.world, step + 1)
      })
    })
    sequence.at(CONTACT.landed, () => {
      this.presenting = frame({ enemyHp, reached: true }, hp)
      this.render()
    })
    sequence.at(CONTACT.next, () => this.finish())
  }

  /** Drop the transition and paint the settled truth. Always the last beat. */
  private finish(): void {
    this.presenting = undefined
    this.sequence = undefined
    weaponThrust(this.world, 'rest')
    this.render()
  }

  // ── painting ─────────────────────────────────────────────────────────

  private render(): void {
    const state = this.presenting ?? this.state
    const on = {
      onLook: (detailId: string) => this.dispatch({ type: 'LOOK', detailId }),
      onIntent: () => {
        const combat = this.state.run?.combat
        if (combat) this.say(intentAt(combat.enemyId, combat.turn).explain)
      },
    }
    renderWorld(this.world, state, on)

    renderTray(this.tray, state, {
      // One mark. Choosing a die keeps it across the reroll and puts it in the
      // hand you score, because that is the one thing a tap on a die means.
      onDie: (slot) => this.dispatch({ type: 'SELECT', slot }),
      onInspectDie: (id) => this.open({ kind: 'die', id }),
      onInspectRelic: (id) => this.open({ kind: 'relic', id }),
      onMenu: () => this.open({ kind: 'menu' }),
      onFight: () => this.dispatch({ type: 'FIGHT' }),
      onRoll: () => this.dispatch({ type: 'ROLL' }),
      onReroll: () => this.dispatch({ type: 'REROLL' }),
      onScore: () => this.dispatch({ type: 'SCORE' }),
      onGo: (to) => this.dispatch({ type: 'GO', to }),
    })

    renderScreen(
      this.screen,
      state,
      {
        onStart: () => this.dispatch({ type: 'START_RUN' }),
        onContinue: () => this.dispatch({ type: 'CONTINUE' }),
        onTitle: () => this.dispatch({ type: 'TITLE' }),
        onTake: (id) => this.dispatch({ type: 'TAKE', id }),
      },
      this.discarded,
    )

    if (this.opened) renderOverlay(this.overlay, this.opened, state, () => this.close())
  }

  private open(view: Overlay): void {
    this.opened = view
    this.overlay.hidden = false
    renderOverlay(this.overlay, view, this.state, () => this.close())
  }

  private close(): void {
    this.opened = undefined
    this.overlay.hidden = true
    this.overlay.replaceChildren()
    delete this.overlay.dataset['overlay']
  }

  private say(line: string): void {
    const node = this.world.hud.querySelector<HTMLElement>('#say')
    if (!node) return
    node.textContent = line
    node.hidden = false
  }
}
