// The heart. One tap, resolved.
//
// Everything a tap means is here: the first response whose gate passes, its
// deltas applied in DELTA_ORDER, and the lines the world spoke on the way.
// api.ts binds a bundle around this and calls it `act` — this file is the only
// place in the engine that decides what a word does.
//
// Pure (.llm/rules/purity.mdc). The state handed in is never touched, nothing
// is read from outside the arguments, and one scene and one state produce one
// turn, on any machine, forever.

import type { ActionRef, Effect, Turn } from './api-types'
import { DELTA_ORDER } from './cards'
import type { Gate, ObjectCard, ObjectDelta, Scene } from './cards'
import { hasFlag, hasItem, refKey, withFlag, withItem, withoutItem } from './types'
import type { GameState } from './types'

// Where addObject and removeObject persist. GameState has seven keys and no
// eighth (.llm/rules/determinism.mdc), so the object set is not stored at all —
// it is folded back out of the flags, under prefixes the vocabulary gives no
// author a way to write.
//
// Both are keyed by SCENE and object. A template dealt into two rooms does not
// empty a pool you never entered, which is the whole reason VOCAB.md makes
// addObject carry its scene (.llm/rules/affordance.mdc).
const ADDED = 'obj+:'
const REMOVED = 'obj-:'

const objKey = (prefix: string, scene: string, object: string): string =>
  `${prefix}${scene}:${object}`

/**
 * The scene's object set as it stands: what was authored, minus the hidden,
 * plus every addObject, minus every removeObject.
 *
 * Nothing else moves it. A flag on its own never does and a scene "moving on"
 * never does — every arrival and departure came from a delta that recorded its
 * cause (LAWS.md #affordance).
 */
export function visible(scene: Scene, state: GameState): readonly ObjectCard[] {
  return (
    scene.objects
      .filter(
        (object) =>
          object.hidden !== true || hasFlag(state, objKey(ADDED, scene.scene, object.id)),
      )
      // Minus last, and minus wins: a removal is not undone by a later add.
      // Gone is a thing the world remembers.
      .filter((object) => !hasFlag(state, objKey(REMOVED, scene.scene, object.id)))
  )
}

/**
 * One tap against one scene: the next world, and what the world said reaching
 * it.
 *
 * An object not in view, or an action it does not afford, resolves to the state
 * it was handed and no effects. That is a stale screen, not a thing to throw
 * about — the shell offers what the view listed.
 */
export function resolve(scene: Scene, state: GameState, ref: ActionRef): Turn {
  const object = visible(scene, state).find((candidate) => candidate.id === ref.object)
  const responses = object?.actions[ref.action]
  // Array.isArray rather than a presence check: `actions` is a plain object, so
  // a tap naming `constructor` or `toString` indexes the prototype and finds a
  // function where the type promises a response list.
  if (!Array.isArray(responses)) return { state, effects: [] }

  // The first response whose gate passes. Not the best, not the most specific,
  // the first (VOCAB.md).
  const response = responses.find((candidate) => passes(state, candidate.if))
  // A list that came through parseScene ends in a gateless fallback, so there is
  // always one to find.
  if (response === undefined) return { state, effects: [] }

  const effects: Effect[] = []
  let next = state

  // The table drives the loop, so deltas apply in VOCAB.md's order and never in
  // the order the file happened to write the keys in. This is the whole reason
  // the order is a table and not a convention: two authors, one run.
  for (const word of DELTA_ORDER) {
    switch (word) {
      case 'say':
        // The line the narrator speaks for taking this branch. A refusal's line
        // is its `say` too (VOCAB.md: `refuse: true`, the say carries it), but
        // it goes out on the `refused` effect instead — emitting both would put
        // the same sentence on the screen twice, and every consumer would have
        // to know to drop one.
        if (response.refuse !== true) effects.push({ kind: 'say', text: response.say })
        break

      case 'set':
        for (const flag of response.set ?? []) next = withFlag(next, flag)
        break

      case 'give':
        for (const item of response.give ?? []) next = withItem(next, item)
        break

      case 'take':
        for (const item of response.take ?? []) next = withoutItem(next, item)
        break

      case 'journal':
        if (response.journal !== undefined) {
          // An entry id, appended. The journal is the person's own record; the
          // refused ledger is the one that keeps a key once.
          next = { ...next, journal: [...next.journal, response.journal] }
          effects.push({ kind: 'journal', entry: response.journal })
        }
        break

      case 'refuse':
        // Applies and stops. The ledger remembers being asked and nothing else
        // in the world moves — and parseScene has already guaranteed there is
        // nothing else in this response to move (VOCAB.md, LAWS.md #refusal).
        if (response.refuse === true) {
          effects.push({ kind: 'refused', ref, line: response.say })
          return { state: ledger(next, refKey(ref)), effects }
        }
        break

      case 'goto':
        if (response.goto !== undefined) {
          next = { ...next, scene: response.goto }
          // Announced, not left to be discovered: a shell that had to diff two
          // states to notice it arrived would draw the new scene a turn late.
          effects.push({ kind: 'enter', scene: response.goto })
        }
        break

      case 'addObject':
        next = applyObject(next, ADDED, response.addObject)
        break

      case 'removeObject':
        next = applyObject(next, REMOVED, response.removeObject)
        break

      case 'end':
        if (response.end !== undefined) {
          effects.push({ kind: 'end', line: response.end.line, ...(response.end.note !== undefined ? { note: response.end.note } : {}) })
        }
        break
    }
  }

  return { state: next, effects }
}

/**
 * An affordance change, recorded against the scene it happened in. The `cause`
 * is authored for the reader of the content, not consumed here — the law it
 * satisfies is a content law, checked by the linter (LAWS.md #affordance).
 */
function applyObject(
  state: GameState,
  prefix: string,
  delta: ObjectDelta | undefined,
): GameState {
  if (delta === undefined) return state
  return withFlag(state, objKey(prefix, delta.scene, delta.object))
}

/**
 * A gate is a conjunction: every condition listed must hold. An empty gate has
 * nothing to fail and an absent one is the same gate — that is the fallback.
 *
 * There is no negation in the vocabulary and that is deliberate: "not yet
 * opened" is the fallback, reached by ordering the opened branch above it.
 */
function passes(state: GameState, gate: Gate | undefined): boolean {
  if (gate === undefined) return true
  return (
    (gate.flags ?? []).every((flag) => hasFlag(state, flag)) &&
    (gate.items ?? []).every((item) => hasItem(state, item))
  )
}

// Once, and never a duplicate: the world remembers being asked, not how many
// times it was asked. Never in place — the state handed in is not ours to touch
// (.llm/rules/purity.mdc).
function ledger(state: GameState, key: string): GameState {
  if (state.refused.includes(key)) return state
  return { ...state, refused: [...state.refused, key] }
}
