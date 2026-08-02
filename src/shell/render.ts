// P102 · the renderer. A View goes in, the whole screen comes out.
//
// The shell touches GameAPI only (P1.md). This file is handed a View that
// `getView` has already composed and a sink to hand taps back through: it does
// not import resolve.ts, it does not read `bundle.scenes` to decide what to
// draw, and it keeps nothing between calls. The screen is a function of the
// View, and the run lives in the state `act` returned.
//
// Full redraw every tap, and every node built fresh. There is one paragraph
// and five buttons on this screen (P1.md · no framework) — a diff would cost
// more to read than the nodes it saved, and a screen rebuilt whole cannot
// carry a stale node or a listener closed over last turn's ref.

import type { ActionRef, Effect, View } from '../core/api-types'

/** Draws the moment into `root`, wholly. Each control taps back through `onTap`. */
export function render(root: HTMLElement, view: View, onTap: (ref: ActionRef) => void): void {
  const frame: HTMLElement[] = []

  // Arrival above the line it stands under: `enter` is what just happened and
  // the line is where you now are. Absent for every scene in P1 — it is drawn
  // when a scene speaks one because the contract says a scene may
  // (api-types.ts), and drawing `undefined` is a word the shell would be
  // adding of its own (CANON.md).
  if (view.enter !== undefined) frame.push(para('enter', view.enter))
  frame.push(para('line', view.line))
  frame.push(acts(view, onTap))

  root.replaceChildren(...frame)
}

/**
 * Draws what the world said this turn into `root`, wholly.
 *
 * Effects are announced rather than left to be discovered (api-types.ts), so
 * they are drawn in the order the world produced them and cleared by the next
 * turn — the screen says what this tap did, not what every tap has done.
 */
export function renderEffects(root: HTMLElement, effects: readonly Effect[]): void {
  const spoken: HTMLElement[] = []
  for (const effect of effects) {
    const node = drawn(effect)
    if (node !== null) spoken.push(node)
  }
  root.replaceChildren(...spoken)
}

// One control per object/action pair, in the order the author wrote them —
// `getView` hands the actions back in authored order (api.ts) and this is the
// order they are printed in.
function acts(view: View, onTap: (ref: ActionRef) => void): HTMLElement {
  const list = document.createElement('div')
  list.className = 'acts'
  for (const object of view.objects) {
    for (const action of object.actions) {
      list.append(control(object.id, action, onTap))
    }
  }
  return list
}

function control(object: string, action: string, onTap: (ref: ActionRef) => void): HTMLElement {
  const button = document.createElement('button')
  button.className = 'act'
  // The ref, on the control that carries it: a tap hands back exactly what
  // `act` is asked for, so the screen can never offer a tap it cannot name.
  button.dataset['object'] = object
  button.dataset['action'] = action
  // The label is the two ids and nothing else. The shell has no prose to add
  // and is not allowed any (CANON.md) — `name` stays behind the API (api.ts).
  button.textContent = `${object} ${action}`
  button.addEventListener('click', () => onTap({ object, action }))
  return button
}

// A discriminated union, exhaustively: a member left unhandled here fails to
// compile rather than vanishing from the screen (api-types.ts).
function drawn(effect: Effect): HTMLElement | null {
  switch (effect.kind) {
    case 'say':
      return para('said', effect.text)
    // Marked, not worded: the refusal is the world's own line (LAWS.md
    // §refusal) and `refused` is how the stylesheet tells it apart from a
    // thing that happened.
    case 'refused':
      return para('said refused', effect.line)
    case 'journal':
      return para('noted', effect.entry)
    // An `enter` carries a scene id, not prose. The line for having arrived
    // comes back on the next View (api-types.ts), so drawing this one would
    // put an id on the screen and say the arrival twice.
    case 'enter':
      return null
  }
}

function para(className: string, text: string): HTMLElement {
  const p = document.createElement('p')
  p.className = className
  // Not innerHTML: authored prose is text, and a line with an angle bracket in
  // it is a line rather than markup.
  p.textContent = text
  return p
}
