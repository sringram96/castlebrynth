// H107 · the composition, and the only place the run lives.
//
// Five modules exist and none of them calls another. The narrator speaks
// (H103), the stage draws (H104), the panel reads (H105), the gesture layer
// counts taps (H106), and viewmap arranges (H102) — every one of them a total
// function of what it is handed, none of them holding a run. This is where the
// run is held, and it is held in exactly one place:
//
//     mount(el, bundle, saved?) -> { getState, dispatch, dispose }
//
// **The loop is three lines long**, and that is the whole design:
//
//     state = act(state, ref).state
//     view  = getView(state)
//     draw(view)
//
// Every tap is a full redraw of a page with one paragraph and five buttons
// (P1.md). There is no diff, no framework, no second copy of the world —
// `getView` already said what is true, and the screen is a function of it.
//
// **The shell touches GameAPI only** (P1.md): `newRun`, `act`, `getView`,
// bound to the bundle by `createGame`. Nothing here imports `resolve.ts` and
// nothing here reads `bundle.scenes` to decide what to draw. If this file
// needed something the API cannot give it, that would be a finding against the
// API and not a licence to reach past it.
//
// **Nothing fires on import.** `main.ts` is the one module in src/shell
// permitted a side effect on import (H101); this one touches a document only
// when `mount` is called, and only inside the element it was handed. That is
// the boundary the v3 build lost, and it is what lets an acceptance test
// import this module and build its own screen.

import { createGame } from '../core/api'
import type { ActionRef, Effect, View } from '../core/api-types'
import type { Bundle } from '../core/cards'
import type { GameState } from '../core/types'
import { createInput } from './input'
import { createNarrator } from './narrator'
import { createPanel } from './panel'
import { createScene } from './scene'
import { theme } from './theme'

/** A mounted run: what it is, how to spend a turn in it, and how to end it. */
export interface App {
  /**
   * The run as it stands. Plain data, never a copy — `act` returns a new state
   * and never writes through the one it was handed (api-types.ts), so what
   * comes back here is safe to keep, freeze, stringify or save.
   */
  readonly getState: () => GameState
  /**
   * Spend a turn from outside the screen — the same gesture a pressed action
   * button is, along the same single path (H106). Not a second way to reach
   * `act`: it *is* the press.
   */
  readonly dispatch: (ref: ActionRef) => void
  /**
   * Take the screen down: the keyboard listener off, and what was drawn
   * removed. A shell that left a listener on the document would go on playing
   * a run that had been torn down (H106).
   */
  readonly dispose: () => void
}

/**
 * The seed a mount opens on when it is handed no run.
 *
 * Entropy belongs to the shell and never to the engine, and inside the shell
 * it belongs to boot: H109 chooses a seed, records it in the state, and hands
 * that state in here. So this is the value for a mount that boot has not
 * spoken to — a fixed number, because a clock read in this file would make two
 * runs of the same taps two different runs and there would be nothing to
 * compare a replay against (.llm/rules/determinism.mdc).
 *
 * Nothing in P1 draws from the stream — no word in VOCAB.md reads the rng — so
 * which number it is cannot be observed from inside the game. It is stated
 * rather than hidden so that a run opened without boot is still reproducible.
 */
const OPENING_SEED = 1

/**
 * Stand a run up in `el` and draw it.
 *
 * `saved` is a run to resume — H108 read it back, H109 decides whether there
 * was one. Absent, the bundle's start scene opens on `OPENING_SEED`.
 *
 * The element is emptied and the frame put in it: `mount` owns the contents of
 * what it is handed for as long as it is mounted, the same way the entry owns
 * `#app` (H101). It draws once before returning, so there is no moment where a
 * mounted app is on screen and blank.
 */
export function mount(el: HTMLElement, bundle: Bundle, saved?: GameState): App {
  const game = createGame(bundle)

  // The run, and the two things derived from it. Three `let`s and no fourth:
  // everything else on screen is drawn from these, and the only screen state
  // that is not the world's — which thing is selected, which pane is showing —
  // is kept by the modules that own it (H105, H106) and never mirrored here.
  let state: GameState = saved ?? game.newRun(OPENING_SEED)
  let view: View = game.getView(state)
  // What the world said on the way to this view. Held so that a redraw which
  // is not a turn — a selection, a settled highlight, the outline switch —
  // speaks the same line again rather than blanking it. The narrator swaps
  // only on change (H103), so redrawing costs nothing and flashes nothing.
  let spoken: readonly Effect[] = []
  // The wireframe tell (H104). Screen state, not world state: it is a
  // placeholder's apology and it does not belong in a save.
  let outlines = true

  const narrator = createNarrator()

  // The panel is built before the gesture layer and reaches forward to it,
  // because the two are a genuine cycle rather than an ordering accident: the
  // panel hands its presses to the gesture layer, and the gesture layer snaps
  // the panel to ACT on a selection (GAME.md #frame). One of them has to name
  // the other before it exists, and the arrow below is the only adapter in the
  // file — `input.select` and `input.press` are shaped to be handed straight
  // to the stage and the panel, and an adapter is a second place a tap could
  // be counted (H106). It is never called before `input` exists: nothing here
  // can be pressed until it has been drawn, and drawing is the last thing
  // `mount` does.
  const panel = createPanel({
    onAction: (ref) => input.press(ref),
    onOutline: (on) => {
      outlines = on
      stage.setOutlines(on)
      render(input.selectedId)
    },
  })

  const input = createInput({
    // Read fresh at the instant of every gesture, never cached: the view after
    // a turn is not the view before it (H106).
    view: () => view,
    dispatch,
    show: panel.show,
    redraw: render,
  })

  const stage = createScene({ onSelect: input.select })

  const frame = document.createElement('div')
  frame.className = 'shell-frame'
  // The mock's `#app` rule (mock/slice-mvp.html, which MVP.md ratifies as the
  // specification): a column of writing, scene, panel. Fixed to the viewport
  // rather than sized at 100dvh because this shell ships no stylesheet — there
  // is no page reset to lean on, and a frame that added a scrollbar to the
  // margin of the body it sits in would not be the full-bleed still GAME.md
  // #frame asks for. H115 repaints; the three-part column is the frame itself.
  Object.assign(frame.style, {
    position: 'fixed',
    inset: '0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: theme.color.bg,
    color: theme.color.text,
    fontFamily: theme.type.ui,
  })
  frame.append(narrator.el, stage.el, panel.el)
  el.replaceChildren(frame)

  // The keyboard fallback (H106) — on the document, because a key pressed with
  // nothing focused never reaches a div. It is the one listener this file
  // attaches, and `dispose` is why it is kept.
  const detach = input.listen(el.ownerDocument)

  render(null)

  return {
    getState: () => state,
    // The press, not a private path beside it: one gesture, one `act`.
    dispatch: input.press,
    dispose: () => {
      detach()
      // Only what was drawn. `mount` emptied the element on the way in, but
      // what is in it now is this frame, and taking back exactly what was put
      // there leaves anything a later mount has drawn alone.
      frame.remove()
    },
  }

  /**
   * One tap, spent.
   *
   * This is the whole loop, and every line of it is required to be in this
   * order: `act` produces the next world and what the world said reaching it,
   * `getView` reads the moment off that world alone, and the screen is drawn
   * from both. Nothing is computed about the run in between — a shell that
   * worked out what a delta meant would be the second place a rule lives
   * (.llm/rules/layering.mdc).
   *
   * Called from exactly one place: H106's `press`, which is reached from a
   * pressed action button, from the keyboard fallback, and from the `dispatch`
   * this module returns. `press` settles the selection afterwards and may
   * redraw a second time, inside the same synchronous gesture, so nothing is
   * ever painted with a stale ring on it.
   */
  function dispatch(ref: ActionRef): void {
    const turn = game.act(state, ref)
    state = turn.state
    view = game.getView(state)
    spoken = turn.effects
    render(input.selectedId)

    // ── autosave hook point ────────────────────────────────────────────────
    // H109 fills this: the run is written after every act, through
    // src/platform/storage (H108). It is here rather than anywhere else
    // because this is the one line in the shell where the world has moved —
    // there is no other path to `act` — and because the state is complete by
    // now and the screen already agrees with it.
    //
    // It is left as a hook and not as an empty function: an autosave nobody
    // has written yet is not an abstraction to stand up in advance
    // (.llm/rules/no-dead-scaffolding.mdc), and persistence is H109's card.
  }

  /**
   * Draw the moment. Idempotent: same state, same selection, same screen,
   * however many times it is called.
   *
   * Everything on screen is redrawn from `view` and `state`, in frame order.
   * The narrator gets what the world said this turn; the stage and the panel
   * get the selection, which is the shell's own memory handed in and never
   * kept here (H102, H106).
   */
  function render(selectedId: string | null): void {
    narrator.render(view, spoken)
    stage.render(view, selectedId)
    panel.render({ view, state, selectedId, outline: outlines })
  }
}
