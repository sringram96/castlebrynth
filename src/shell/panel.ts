// P103 · the panel that is always there.
//
// The journal and what you carry, read straight off GameState — two of its
// seven keys and never the other five. Everything about the scene still comes
// from `getView`: this file is handed a state, not a bundle, and it draws the
// person's own record rather than anything about where they are standing.
//
// It shows no flags. Flags are the engine's memory, not the person's, and the
// reserved `obj+:` / `obj-:` entries in particular are bookkeeping that stands
// for an object appearing or going (.llm/rules/determinism.mdc) — a screen
// that printed them would be showing the machine. `refused`, `rng` and `seed`
// are the same: the world remembers being asked, and the person need not.
//
// Full redraw and every node built fresh, as render.ts draws the scene: the
// panel is short, and a rebuilt list cannot keep an entry the state no longer
// has.

import type { GameState } from '../core/types'

/**
 * Draws the panel into `root`, wholly: the journal in order, newest last, and
 * what the person carries.
 *
 * Both lists are drawn whether or not they have anything in them. That is the
 * point of the panel — a person learns where their record will be before it
 * has anything in it, and an empty journal reads as an empty journal rather
 * than as a sentence about being empty (CANON.md · the narrator does not
 * exist).
 */
export function renderPanel(root: HTMLElement, state: GameState): void {
  root.replaceChildren(entries('journal', state.journal), entries('carried', state.items))
}

// The list order is the state's order, untouched: `journal` is appended to
// (resolve.ts), so its order is already oldest to newest, and reversing it here
// would be the shell deciding how the person's own record reads.
function entries(className: string, lines: readonly string[]): HTMLElement {
  const list = document.createElement('ul')
  list.className = className
  for (const line of lines) list.append(entry(line))
  return list
}

function entry(text: string): HTMLElement {
  const item = document.createElement('li')
  // Not innerHTML: an entry is authored prose, and a note with an angle bracket
  // in it is a note rather than markup.
  item.textContent = text
  return item
}
