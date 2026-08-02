// P101 · the shell's single entry.
//
// Everything above the engine starts here: `mount` is handed the element it
// owns and the `Game` it draws, and it is handed nothing else. That is the one
// rule P1 adds (P1.md) — the shell reaches for `newRun`, `act`, `getView` and
// the save envelope, and never past them. It does not import `resolve.ts`, it
// does not read `bundle.scenes` to decide what to draw, and the run lives in
// the state `act` hands back rather than in anything kept here.
//
// This card draws the scene line and stops. P102 makes it a renderer, P103
// hangs the panel beside it and P104 gives it a save; building any of that
// now would be scaffolding for a card that has not run yet
// (.llm/rules/no-dead-scaffolding.mdc).

import type { Game } from '../core/api'

// Nothing in VOCAB.md draws from the generator yet, so every run is the same
// run whatever this is — `scripts/play.mjs` says the same and defaults the
// same. A clock read here would make the shell's first frame depend on when it
// was drawn, which is the one thing the engine below refuses to do.
const SEED = 1

/** Draws a fresh run of `game` into `root`. The whole of the shell's entry. */
export function mount(root: HTMLElement, game: Game): void {
  const view = game.getView(game.newRun(SEED))
  // Not innerHTML: the line is authored prose, and prose is text. Assigning it
  // as text is also what makes a redraw clean — P102 builds on this.
  root.textContent = view.line
}
