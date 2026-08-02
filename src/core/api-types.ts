// H001b · the API half of the contract.
//
// Types only — H006b implements them and the shell (P1) consumes them. This
// file is the whole of what a shell is handed: a View to draw, and the Effects
// the world produced on the way to it. A shell never sees a Bundle, never
// reads a Response, and never learns that object sets are folded out of
// reserved flags. Naming the boundary in its own file is what keeps that true.
//
// Everything here is JSON, like the state it is about (.llm/rules/determinism.mdc).
// An effect list stringifies into a transcript, which is how the root
// acceptance compares two runs of the same seed line for line.

import type { Bundle } from './cards'
import type { GameState } from './types'

/** One tap: the thing, and what you did to it. `refKey` makes it a ledger key. */
export interface ActionRef {
  readonly object: string
  readonly action: string
}

/**
 * What the world produced this turn, in the order it produced it.
 *
 * A discriminated union on `kind`, so a shell that has not handled a member
 * fails to compile rather than dropping it in silence.
 *
 * `journal` and `enter` are announced rather than left to be discovered: a
 * shell that had to diff two states to notice an entry arrived would show it
 * a turn late, and would show nothing at all for an entry written twice.
 */
export type Effect =
  | { readonly kind: 'say'; readonly text: string }
  | { readonly kind: 'refused'; readonly ref: ActionRef; readonly line: string }
  | { readonly kind: 'journal'; readonly entry: string }
  | { readonly kind: 'enter'; readonly scene: string }
  | { readonly kind: 'end'; readonly line: string; readonly note?: string }

/**
 * One thing in view: what the free tap says about it, and the taps it affords.
 *
 * `tap` is prose, and it is the one piece of prose the view carries. The free
 * tap is bedrock (GAME.md #input) — it describes, selects and surfaces actions,
 * and it never advances the world. A shell that had to call `act` to learn what
 * a thing looks like could not offer a free tap at all.
 */
export interface ViewObject {
  readonly id: string
  readonly tap: string
  readonly actions: readonly string[]
}

/** Everything needed to draw the moment, and nothing else. */
export interface View {
  /** The line for having just arrived, when the scene speaks one apart. */
  readonly enter?: string
  readonly line: string
  readonly scene: string
  readonly objects: readonly ViewObject[]
}

/** What one tap produced: the next world, and what the world said reaching it. */
export interface Turn {
  readonly state: GameState
  readonly effects: readonly Effect[]
}

/** A fresh run at the bundle's start scene. */
export type NewRun = (seed: number, bundle: Bundle) => GameState

/**
 * One tap. Returns new state — the state handed in is never touched.
 *
 * An object not in view, or an action it does not afford, is a no-op that
 * returns the same state and no effects. The shell offers what `getView`
 * listed, so a miss is a stale screen, not a thing to throw about.
 *
 * `input` is the free-text half of a tap. No word in VOCAB.md reads it, so
 * nothing in P0 passes one; it is in the signature because P0.md freezes this
 * signature, and a shell that grows a text field may not also need a new
 * `act` for it.
 */
export type Act = (state: GameState, ref: ActionRef, input?: string) => Turn

/** The moment, from state alone. Never mutates. */
export type GetView = (state: GameState) => View
