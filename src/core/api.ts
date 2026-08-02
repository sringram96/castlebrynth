// H006b · GameAPI — the whole of what a shell is handed.
//
// The engine below this line resolves one tap against one scene (H006a). This
// file is the only thing above it: it holds the bundle, finds the scene the
// state is standing in, and projects a View a shell can draw. Nothing else is
// added — a shell never sees a Bundle, never reads a Response, and never
// learns that object sets are folded out of reserved flags (api-types.ts).
//
// `createGame` exists because P0.md freezes `act(state, ref, input?)` with no
// bundle parameter, and GameState may not carry the bundle
// (.llm/rules/state-is-json.mdc — a save is the state, and saves stay small).
// Binding the content at construction is the only way to honour both. The
// standalone `newRun(seed, bundle)` keeps P0.md's literal signature available
// for the caller that has a bundle in hand and no game yet.
//
// Pure (.llm/rules/purity.mdc): nothing here reads a clock, draws, or writes
// through its arguments, so the same seed and the same taps are the same run,
// on any machine, forever.

import type { Act, GetView, View, ViewObject } from './api-types'
import type { Bundle, ObjectCard, Scene } from './cards'
import { resolve, visible } from './resolve'
import { emptyState } from './types'
import type { GameState } from './types'

/** A game with its content bound: the three calls P0.md freezes, and nothing else. */
export interface Game {
  /** A fresh run of this bundle. The bundle is already held, so only the seed. */
  readonly newRun: (seed: number) => GameState
  readonly act: Act
  readonly getView: GetView
}

/** A fresh run at the bundle's start scene, remembering nothing yet. */
export function newRun(seed: number, bundle: Bundle): GameState {
  return emptyState(bundle.start, seed)
}

/**
 * Binds a bundle to the API. Everything a shell does, it does through this.
 *
 * The bundle is captured by closure and never copied: it is readonly content
 * (H003a) that nothing here writes to, and copying it per game would make two
 * games of one world two worlds.
 */
export function createGame(bundle: Bundle): Game {
  return {
    newRun: (seed) => newRun(seed, bundle),

    // Two parameters against a three-parameter type: the object is a Game, so
    // callers may pass `input` and always could. No word in VOCAB.md reads it
    // (api-types.ts), and a parameter this file named but never read would be
    // scaffolding (.llm/rules/no-dead-scaffolding.mdc).
    act: (state, ref) => {
      const scene = sceneOf(bundle, state.scene)
      // A state standing in a scene this bundle has not got is a save from
      // another world. There is nothing here to tap, so the tap is the same
      // no-op an unknown object is — a stale screen, not a thing to throw
      // about. resolve says the same of an object not in view.
      if (scene === undefined) return { state, effects: [] }
      return resolve(scene, state, ref)
    },

    getView: (state) => view(bundle, state),
  }
}

/**
 * The moment, from state alone: the line under it, and what is in view with
 * what each thing affords.
 *
 * No prose beyond the scene's line and no state: a ViewObject is an id and a
 * list of action names, which is exactly what a shell needs to offer a tap and
 * hand it back to `act`.
 */
function view(bundle: Bundle, state: GameState): View {
  const scene = sceneOf(bundle, state.scene)
  // Same reasoning as `act`, and it has to be the same: a screen that offered
  // taps `act` would refuse to resolve would be a lie about the world. A world
  // that is not there has no line and nothing standing in it.
  if (scene === undefined) return { line: '', scene: state.scene, objects: [] }

  return {
    line: scene.line,
    scene: state.scene,
    // `visible` is the one authority on the object set (H006a) — authored,
    // minus hidden, plus every addObject, minus every removeObject.
    objects: visible(scene, state).map(afforded),
  }
}

// The action names in the order the author wrote them, which is the order a
// shell will print them in. `name` and the responses stay behind: prose is the
// world's to speak, through Effects, not the view's to leak.
function afforded(object: ObjectCard): ViewObject {
  return { id: object.id, actions: Object.keys(object.actions) }
}

// `scenes` is a plain object and a scene id is content: `goto: constructor`
// compiles, and a hand-edited save may name anything at all. An inherited name
// would hand back a function where the type promises a Scene, so the lookup
// asks whether the bundle actually has one. resolve guards `actions` the same
// way, and for the same reason.
function sceneOf(bundle: Bundle, id: string): Scene | undefined {
  return Object.hasOwn(bundle.scenes, id) ? bundle.scenes[id] : undefined
}
