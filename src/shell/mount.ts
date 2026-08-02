// P108 · the tap loop. The shell's single entry, and the only place the run
// lives.
//
// P101 stood the shell up, P102 built the renderer, P103 the panel, P104 the
// save — and nothing called anything. This file drew one frame and the page had
// no controls on it. The loop was not missing by oversight: `src/shell/mount.
// test.ts` belonged to P101 alone while this file belonged to P102, P103 and
// P104, and it pinned this element's whole textContent to the scene line, so
// the moment any of those three drew a control they failed a test they were
// forbidden to touch (.llm/rules/scope.mdc). One card owns both files, and this
// is it.
//
// present → tap → act → present, and nothing else in it. `state` below is the
// run: `act` hands back the next world and this closure is the only thing above
// the engine holding one. `render` and `renderPanel` stay pure draws of what
// they are handed, which is what makes a full redraw per tap safe (P1.md · no
// framework) — the screen is a function of the state rather than a thing
// accumulated across taps.
//
// The shell touches GameAPI only (P1.md): `newRun`, `act`, `getView`, and the
// save envelope through ./persist. No import of resolve.ts, and nothing here
// reads the bundle to decide what to draw — `getView` already said.

import './styles.css'
import { renderPanel } from './panel'
import { save } from './persist'
import { render, renderEffects } from './render'
import type { Game } from '../core/api'
import type { ActionRef } from '../core/api-types'
import type { GameState } from '../core/types'

// Nothing in VOCAB.md draws from the generator yet, so every run is the same
// run whatever this is — `scripts/play.ts` says the same and defaults the
// same. A clock read here would make the shell's first frame depend on when it
// was drawn, which is the one thing the engine below refuses to do.
const SEED = 1

/**
 * Draws `game` into `root` and keeps it there: every tap goes back through
 * `act`, and the whole screen is drawn again from the state it returns.
 *
 * `storage` is where the run is kept when there is somewhere to keep it —
 * ./boot.ts passes the browser's, and a mount without one simply keeps nothing.
 * `opening` is the run to open on. Reading one back is `restore`'s job and
 * `restore` needs the Bundle whose fresh run it falls back to (persist.ts);
 * what arrives here is a Game, so the entry that has the bundle does the
 * reading and hands the answer down. Both are optional, and P100 mounts a fresh
 * run with two arguments.
 */
export function mount(
  root: HTMLElement,
  game: Game,
  storage?: Storage,
  opening?: GameState,
): void {
  // The run. Reassigned by a tap and read by a draw, and never copied anywhere
  // else — a second holder of this would be a second answer to "where am I".
  let state = opening ?? game.newRun(SEED)

  // Three elements, because the three things on the screen do not change
  // together: the scene is redrawn from every View, what the world said is
  // replaced by the next tap alone, and the panel outlives both (P103). Each
  // renderer replaces its own element's children wholly, so they need to be
  // separate elements for that to stay true of any of them.
  const scene = document.createElement('div')
  const said = document.createElement('div')
  const panel = document.createElement('div')
  panel.className = 'panel'

  // Declarations rather than consts because the two call each other: a tap
  // redraws, and a redraw hands this same tap to every control it builds.
  function draw(): void {
    render(scene, game.getView(state), tap)
    renderPanel(panel, state)
  }

  function tap(ref: ActionRef): void {
    const turn = game.act(state, ref)
    state = turn.state
    // This tap's effects and no other's: `renderEffects` replaces what the last
    // tap said, so the screen says what just happened rather than everything
    // that ever has (render.ts).
    renderEffects(said, turn.effects)
    draw()
    // After the redraw, not before it: what goes to storage is the world the
    // person is now looking at, so an app closed between two taps reopens on
    // the screen it closed on. A refused tap is saved too — the ledger moved,
    // and the world remembers being asked (LAWS.md §refusal).
    if (storage !== undefined) save(storage, state)
  }

  draw()
  // What the world said goes below the scene rather than above it: the controls
  // then keep their place on the screen whatever the answer is, and a control
  // that moves under a thumb between two taps is a tap the person did not mean
  // (styles.css · the 44px floor is about the same hand).
  root.replaceChildren(scene, said, panel)
}
