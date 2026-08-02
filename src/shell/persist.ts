// P104 · the run survives the app closing.
//
// One key, overwritten. Not a history — a person has one run, and the only
// question this file answers on opening is "where was I", not "where have I
// ever been". A second slot would be a feature nobody asked for and a second
// thing to keep coherent (.llm/rules/no-dead-scaffolding.mdc).
//
// The envelope is `src/core/save.ts`'s and not a second one: `serialize` says
// what goes to storage and `parse` is the boundary that reads it back. All
// this file adds is the key it lives under and the decision about what a lie
// means here — a new run, quietly.
//
// `Storage` arrives as a parameter rather than being reached for. That is what
// keeps this testable outside a browser, and it is also the honest shape: the
// shell's entry knows it is in a browser, this file only knows it has somewhere
// to put a string.
//
// The shell touches GameAPI only (P1.md): `newRun` for the fallback, and the
// save envelope. Nothing here imports resolve.ts or reads `bundle.scenes` —
// `newRun` is the one authority on what a fresh run of a bundle is.

import { newRun } from '../core/api'
import type { Bundle } from '../core/cards'
import { parse, serialize } from '../core/save'
import type { GameState } from '../core/types'

/** The one key a run lives under. The acceptance imports it; so does nothing else. */
export const SAVE_KEY = 'castlebrynth.run'

// The seed a recovered-from-nothing run opens on. The same constant `mount`
// opens a fresh run with, and for the same reason: nothing in VOCAB.md draws
// from the generator yet, so every seed is the same run, and reading a clock
// here would make a restore depend on when it happened — the one thing the
// engine below refuses to do (.llm/rules/purity.mdc).
const SEED = 1

/**
 * Writes `state` over whatever was there.
 *
 * Called after every act, so it is the cheapest thing that can be: one
 * stringify of a state that is already JSON (.llm/rules/determinism.mdc).
 */
export function save(storage: Storage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(serialize(state)))
}

/**
 * The run as it was left, or a fresh one.
 *
 * Every way this can go wrong goes the same way: nothing stored, a half-written
 * string, a save from a version that no longer exists, a file somebody edited
 * by hand. `parse` already answers all of them with null (save.ts), and null
 * has exactly one recovery — begin again. A corrupt save is not an error state
 * the person should ever see; it is a new run, and it says nothing about
 * itself.
 */
export function restore(storage: Storage, bundle: Bundle): GameState {
  const raw = storage.getItem(SAVE_KEY)
  // No key and an unreadable one are the same answer, so they take the same
  // path: `parse` is only asked about text that exists, and both fall through.
  const state = raw === null ? null : parse(raw)
  return state ?? newRun(SEED, bundle)
}
