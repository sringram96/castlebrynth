// H006a · the heart. One tap, resolved.
//
// Everything a tap means is here: the first response whose gate passes, its
// deltas applied in DELTA_ORDER, and the lines the world spoke on the way.
// H006b binds a bundle around this and calls it `act` — this file is the only
// place in the engine that decides what a word does.
//
// Pure (.llm/rules/purity.mdc). The state handed in is never touched, nothing
// is read from outside the arguments, and one scene and one state produce one
// turn, on any machine, forever.

import type { ActionRef, Effect, Turn } from './api-types'
import { DELTA_ORDER } from './cards'
import type { Gate, ObjectCard, Scene } from './cards'
import { hasFlag, hasItem, refKey, withFlag, withItem, withoutFlag, withoutItem } from './types'
import type { GameState } from './types'

// Where addObject and removeObject persist. GameState has seven keys and no
// eighth (.llm/rules/state-is-json.mdc), so the object set is not stored at
// all — it is folded back out of the flags, under a prefix the vocabulary
// gives no author a way to write. `setFlag: "obj+:ash"` in content is a
// content bug; these two names are the engine's.
const ADDED = 'obj+:'
const REMOVED = 'obj-:'

/**
 * The scene's object set as it stands: what was authored, minus the hidden,
 * plus every addObject, minus every removeObject (VOCAB.md §object sets).
 *
 * Nothing else moves it. A flag on its own never does and a scene "moving on"
 * never does — if the pool is gone you drained it, and you were there
 * (LAWS.md §affordance).
 */
export function visible(scene: Scene, state: GameState): readonly ObjectCard[] {
  return (
    scene.objects
      .filter((object) => object.hidden !== true || hasFlag(state, ADDED + object.id))
      // Minus last, and minus wins: VOCAB.md's set algebra is "plus every
      // addObject minus every removeObject recorded so far", so a removal is
      // not undone by a later add. Gone is a thing the world remembers.
      .filter((object) => !hasFlag(state, REMOVED + object.id))
  )
}

/**
 * One tap against one scene: the next world, and what the world said reaching
 * it.
 *
 * An object not in view, or an action it does not afford, resolves to the
 * state it was handed and no effects. That is a stale screen, not a thing to
 * throw about — the shell offers what the view listed (api-types.ts).
 */
export function resolve(scene: Scene, state: GameState, ref: ActionRef): Turn {
  const object = visible(scene, state).find((candidate) => candidate.id === ref.object)
  const responses = object?.actions[ref.action]
  // Array.isArray rather than a presence check: `actions` is a plain object,
  // so a tap naming `constructor` or `toString` indexes the prototype and
  // finds a function where the type promises a response list.
  if (!Array.isArray(responses)) return { state, effects: [] }

  // The first response whose gate passes. Not the best, not the most specific,
  // the first (VOCAB.md §responses).
  const response = responses.find((candidate) => passes(state, candidate.gate))
  // A list that came through parseScene ends in a gateless fallback, so there
  // is always one to find. A list that did not is content the engine has never
  // seen, and a tap that matches nothing at all is nothing at all.
  if (response === undefined) return { state, effects: [] }

  const effects: Effect[] = []
  // say is not a delta — it is the line the narrator speaks for taking this
  // branch, so it leads, and a refusal may carry one (VOCAB.md's own example
  // does). Refuse purity is about deltas; the prose still gets said.
  if (response.say !== undefined) effects.push({ kind: 'say', text: response.say })

  // Delta 1, and the only one that ends the turn. A refusal applies and stops:
  // the ledger remembers being asked and nothing else in the world moves
  // (VOCAB.md §refuse purity, LAWS.md §refusal).
  if (response.refuse !== undefined) {
    effects.push({ kind: 'refused', ref, line: response.refuse })
    return { state: ledger(state, refKey(ref)), effects }
  }

  let next = state
  // The table drives the loop, so deltas apply in VOCAB.md's order and never
  // in the order the file happened to write the keys in. This is the whole
  // reason the order is a table and not a convention: two authors, one run.
  for (const word of DELTA_ORDER) {
    switch (word) {
      case 'refuse':
        // Returned above. A refusal never reaches the rest of the table.
        break
      case 'setFlag':
        for (const flag of response.setFlag ?? []) next = withFlag(next, flag)
        break
      case 'clearFlag':
        for (const flag of response.clearFlag ?? []) next = withoutFlag(next, flag)
        break
      case 'addItem':
        for (const item of response.addItem ?? []) next = withItem(next, item)
        break
      case 'removeItem':
        for (const item of response.removeItem ?? []) next = withoutItem(next, item)
        break
      case 'addObject':
        for (const id of response.addObject ?? []) next = withFlag(next, ADDED + id)
        break
      case 'removeObject':
        for (const id of response.removeObject ?? []) next = withFlag(next, REMOVED + id)
        break
      case 'journal':
        for (const entry of response.journal ?? []) {
          // Appended, as VOCAB.md says. The journal is the person's own record
          // and the ledger is the one that keeps a key once.
          next = { ...next, journal: [...next.journal, entry] }
          effects.push({ kind: 'journal', entry })
        }
        break
      case 'goto':
        if (response.goto !== undefined) {
          next = { ...next, scene: response.goto }
          // Announced, not left to be discovered: a shell that had to diff two
          // states to notice it arrived would draw the new scene a turn late
          // (api-types.ts).
          effects.push({ kind: 'enter', scene: response.goto })
        }
        break
    }
  }

  return { state: next, effects }
}

/**
 * A gate is a conjunction: every condition listed must hold. An empty gate has
 * nothing to fail and an absent one is the same gate — that is the fallback
 * (VOCAB.md §gates).
 */
function passes(state: GameState, gate: Gate | undefined): boolean {
  if (gate === undefined) return true
  return (
    (gate.flag ?? []).every((flag) => hasFlag(state, flag)) &&
    (gate.notFlag ?? []).every((flag) => !hasFlag(state, flag)) &&
    (gate.item ?? []).every((item) => hasItem(state, item)) &&
    (gate.notItem ?? []).every((item) => !hasItem(state, item))
  )
}

// Once, and never a duplicate: the world remembers being asked, not how many
// times it was asked. Never in place — the state handed in is not ours to
// touch (.llm/rules/purity.mdc).
function ledger(state: GameState, key: string): GameState {
  if (state.refused.includes(key)) return state
  return { ...state, refused: [...state.refused, key] }
}
