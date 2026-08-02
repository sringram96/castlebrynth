// H102 · View → render structs. The shape of the moment, not its meaning.
//
// Zero game rules (.llm/rules/layering.mdc). No gate is evaluated here, no
// action is decided here, nothing is remembered between calls. `getView`
// already said what is true; this only says how it is arranged for a screen.
// Everything below is a total function of its arguments: hand it the same View
// twice and it draws the same twice, which is what the card means by
// idempotent.
//
// It imports **types** from src/core and nothing else — never `resolve.ts`.
// A shell that could resolve would eventually resolve, and then the rule
// would be in two places (.llm/rules/layering.mdc).

import type { View } from '../core/api-types'

/**
 * One thing in the scene, ready to draw: the id to hand back to `act`, a
 * label to print, the taps it affords, and whether it is the one selected.
 */
export interface Block {
  /** The View's id, unchanged. `act` is called with this, never with `label`. */
  readonly id: string
  /** What to print on it. Cosmetic — never sent anywhere. */
  readonly label: string
  /**
   * Action names in the author's order, **verbatim**. These are half of an
   * `ActionRef`; a mangled one is a tap that resolves to nothing, so they are
   * passed through untouched and prettified only at the moment of printing.
   */
  readonly actions: readonly string[]
  readonly selected: boolean
}

/**
 * An id, made printable: `dead-portal` → `dead portal`.
 *
 * The View carries no prose for an object — `getView` keeps the authored
 * `name` back on purpose, because prose is the world's to speak through
 * Effects and not the view's to leak (src/core/api.ts). So the shell prints
 * the id, softened. Lowercase is the mock's own choice (`.obj` is
 * `text-transform: lowercase`), kept here rather than in a stylesheet so that
 * what a test reads is what a thumb sees.
 *
 * Idempotent by construction: the output contains no separator and no run of
 * spaces left to fold, so `label(label(x)) === label(x)`.
 */
export function label(id: string): string {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Every object in view, in view order, one block each.
 *
 * Nothing is filtered. An object with no actions still gets a block, because
 * the first tap is free and describes (GAME.md #input) and tappability is
 * constant for an object's lifetime on screen (LAWS.md #affordance). A shell
 * that hid the actionless would be deciding affordance, which is the engine's
 * job and no longer a decision content could see.
 *
 * `selectedId` is the shell's own memory handed in, not memory kept here.
 */
export function blocks(view: View, selectedId?: string | null): readonly Block[] {
  return view.objects.map((object) => ({
    id: object.id,
    label: label(object.id),
    actions: object.actions,
    selected: object.id === selectedId,
  }))
}

/**
 * The selected block, or `null` when nothing is selected and when the
 * selection has gone out of view — a thing removed by a delta leaves the
 * panel with nothing to show, which is a stale screen and not an error
 * (src/core/api.ts says the same of a tap on an object that is not there).
 */
export function selectedBlock(view: View, selectedId?: string | null): Block | null {
  if (selectedId === undefined || selectedId === null) return null
  return blocks(view, selectedId).find((block) => block.selected) ?? null
}

/**
 * The writing at the top, in reading order: the arrival line first, then the
 * line it stands under (src/core/api-types.ts). One or two short lines, which
 * is what GAME.md #frame asks for and no more.
 *
 * Blank lines are dropped: an unknown scene has an empty `line`
 * (src/core/api.ts), and a reserved-height narrator showing one blank line
 * would read as a bug rather than as silence.
 */
export function narratorLines(view: View): readonly string[] {
  return [view.enter, view.line].filter(
    (line): line is string => typeof line === 'string' && line.trim() !== '',
  )
}
