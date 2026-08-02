// P101 · the shell's single entry.
//
// Everything above the engine starts here: `mount` is handed the element it
// owns and the `Game` it draws, and it is handed nothing else. That is the one
// rule P1 adds (P1.md) — the shell reaches for `newRun`, `act`, `getView` and
// the save envelope, and never past them. It does not import `resolve.ts`, it
// does not read `bundle.scenes` to decide what to draw, and the run lives in
// the state `act` hands back rather than in anything kept here.
//
// P103 · the panel is hung here, from the first frame, because that is the only
// frame that can prove it was never absent. It is drawn from the same state the
// View was projected from, so the screen is one moment rather than two.
//
// P102 · the tap loop is still not here, and it is still not an oversight.
// `render` and `renderEffects` are built and green in ./render.ts, but the
// moment `mount` draws a control, `src/shell/mount.test.ts` fails: it pins this
// element's whole textContent to the scene line with `toBe`, and any control
// adds its label to that string. That file is claimed by P101 alone, so no card
// that edits mount.ts — P102, P103 or P104 — may relax the assertion
// (.llm/rules/scope.mdc). Wiring the loop needs that scope fixed first.
//
// P104 · and P104 was the last of those three, so the scope was never fixed and
// the loop is still not here. `save`/`restore` are built and green in
// ./persist.ts and nothing in this file calls them: saving happens after an
// act, there is no act to happen after, and a `restore` wired on its own would
// be reading a key nothing ever writes (.llm/rules/no-dead-scaffolding.mdc).
// The verified failure is `src/shell/mount.test.ts:57` — `expect(el.textContent)
// .toBe('A door, <b>shut</b>.')` against 'A door, <b>shut</b>.stone study'.
// P100 fails its four tap tests for the same one reason. A card that owns
// src/shell/mount.ts *and* src/shell/mount.test.ts closes all of it at once;
// nothing else in P1 can.
//
// The panel clears that same bar rather than dodging it: on a fresh run there
// is nothing journalled and nothing carried, so it puts no word on the screen.
// It is present as a place, drawn by the stylesheet, and it fills with the
// person's own hand and nothing else.

import './styles.css'
import { renderPanel } from './panel'
import type { Game } from '../core/api'

// Nothing in VOCAB.md draws from the generator yet, so every run is the same
// run whatever this is — `scripts/play.ts` says the same and defaults the
// same. A clock read here would make the shell's first frame depend on when it
// was drawn, which is the one thing the engine below refuses to do.
const SEED = 1

/** Draws a fresh run of `game` into `root`. The whole of the shell's entry. */
export function mount(root: HTMLElement, game: Game): void {
  const state = game.newRun(SEED)
  const view = game.getView(state)

  const line = document.createElement('p')
  line.className = 'line'
  // Not innerHTML: the line is authored prose, and prose is text. Assigning it
  // as text is also what makes a redraw clean — P102 builds on this.
  line.textContent = view.line

  // The panel is its own element so a later redraw of the scene cannot take it
  // with it: what the person has written down outlives the moment it was
  // written in (LAWS.md §persistence).
  const panel = document.createElement('div')
  panel.className = 'panel'
  renderPanel(panel, state)

  root.replaceChildren(line, panel)
}
