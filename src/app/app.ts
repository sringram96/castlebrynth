/**
 * The root controller.
 *
 * It owns exactly three things: the current state, the dispatcher, and when to
 * repaint. It computes no outcome — `reduce` does that — and it draws no
 * pixel; the views do.
 *
 * There is one dispatcher and one path from a press to a state change, which
 * is the whole answer to the class of bug this reset exists to fix.
 */

import { intentAt } from '../content/enemies.js'
import { reduce } from '../game/reducer.js'
import type { Action } from '../game/reducer.js'
import { save } from '../game/save.js'
import type { GameState } from '../game/state.js'
import { mountWorld } from '../render/compositor.js'
import type { World } from '../render/compositor.js'
import { TRAY_ART, url } from '../render/assets.js'
import { mountTray, renderTray } from '../ui/trayView.js'
import type { Tray } from '../ui/trayView.js'
import { renderWorld } from '../ui/worldView.js'
import { renderInspect, renderScreen } from '../ui/screens.js'
import { flash, shake } from '../render/animation.js'

export interface AppOptions {
  readonly root: HTMLElement
  readonly initial: GameState
  readonly discarded?: string | undefined
  /** Off in tests, so a journey never waits on a transition. */
  readonly persist?: boolean
}

export class App {
  private state: GameState
  private readonly world: World
  private readonly tray: Tray
  private readonly screen: HTMLElement
  private readonly overlay: HTMLElement
  private readonly discarded: string | undefined
  private readonly persist: boolean
  private inspecting = false

  constructor(options: AppOptions) {
    this.state = options.initial
    this.discarded = options.discarded
    this.persist = options.persist ?? true

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
    const before = this.state
    const next = reduce(before, action)
    if (next === before) return
    this.state = next
    if (this.persist) save(next)
    this.reactTo(before, next, action)
    this.render()
  }

  get current(): GameState {
    return this.state
  }

  /**
   * Feedback for what already happened.
   *
   * Animation is downstream of the reducer by construction: it reads two
   * settled states and reveals the difference. It cannot change an outcome
   * because it does not have one to change.
   */
  private reactTo(before: GameState, after: GameState, action: Action): void {
    if (action.type !== 'SCORE') return
    const enemyBefore = before.run?.combat?.enemyHp ?? 0
    const enemyAfter = after.run?.combat?.enemyHp ?? 0
    if (enemyAfter < enemyBefore) flash(this.world, enemyBefore - enemyAfter)
    const hpBefore = before.run?.hp ?? 0
    const hpAfter = after.run?.hp ?? 0
    // The frame is the player's body. It moves only when the blow lands on you.
    if (hpAfter < hpBefore) shake(this.world, hpBefore - hpAfter)
  }

  private render(): void {
    const on = {
      onLook: (detailId: string) => this.dispatch({ type: 'LOOK', detailId }),
      onIntent: () => {
        const combat = this.state.run?.combat
        if (combat) this.say(intentAt(combat.enemyId, combat.turn).explain)
      },
    }
    renderWorld(this.world, this.state, on)

    renderTray(this.tray, this.state, {
      // One mark. Choosing a die keeps it across the reroll and puts it in the
      // hand you score, because that is the one thing a tap on a die means.
      onDie: (slot) => this.dispatch({ type: 'SELECT', slot }),
      onInspect: () => this.openInspect(),
      onFight: () => this.dispatch({ type: 'FIGHT' }),
      onRoll: () => this.dispatch({ type: 'ROLL' }),
      onReroll: () => this.dispatch({ type: 'REROLL' }),
      onScore: () => this.dispatch({ type: 'SCORE' }),
      onGo: (to) => this.dispatch({ type: 'GO', to }),
      onTakeGift: (id) => this.dispatch({ type: 'TAKE_GIFT', id }),
    })

    renderScreen(
      this.screen,
      this.state,
      {
        onStart: () => this.dispatch({ type: 'START_RUN' }),
        onContinue: () => this.dispatch({ type: 'CONTINUE' }),
        onTitle: () => this.dispatch({ type: 'TITLE' }),
        onTake: (id) => this.dispatch({ type: 'TAKE', id }),
      },
      this.discarded,
    )

    if (this.inspecting) renderInspect(this.overlay, this.state, () => this.closeInspect())
  }

  private openInspect(): void {
    this.inspecting = true
    this.overlay.hidden = false
    renderInspect(this.overlay, this.state, () => this.closeInspect())
  }

  private closeInspect(): void {
    this.inspecting = false
    this.overlay.hidden = true
    this.overlay.replaceChildren()
  }

  private say(line: string): void {
    const node = this.world.hud.querySelector<HTMLElement>('#say')
    if (!node) return
    node.textContent = line
    node.hidden = false
  }
}
