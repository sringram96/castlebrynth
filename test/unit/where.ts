/**
 * Naming a room the way a person does, in a world where rooms have node ids.
 *
 * Every test in this directory wants to say *the hollow*, *the gate*, *the
 * chain vault* — those are authored templates. What a press carries, and what
 * `run.roomId` holds, is a **node** of the generated map. This is the one place
 * the two are joined for a test, so that no spec quietly assumes the ids are
 * the same thing. They are not, and the day a template appears twice in one
 * descent is the day that assumption becomes a wrong test rather than a
 * failing one.
 */

import { firstNodeOf } from '../../src/game/map.js'
import { generateRun, generateRunPlan } from '../../src/game/runGenerator.js'
import type { GameState, RunState } from '../../src/game/state.js'

/**
 * A seed whose descent is built from a named grammar.
 *
 * There are three grammars now and the seed chooses, so a spec that walks rooms
 * in order has to say **which descent** it is walking or it is asserting against
 * whichever one the number happened to pick. It asks the real generator what each
 * seed produces rather than hard-coding an answer, so the day a fourth grammar
 * changes the distribution, every spec still walks the descent it meant.
 */
export function seedFor(planId: string, from = 1): number {
  for (let seed = from; seed < from + 500; seed++) {
    if (generateRunPlan(seed).id === planId) return seed
  }
  throw new Error(`no seed near ${from} produces the ${planId} grammar`)
}

/** The grammar a seed produces, for a spec that wants to say which it got. */
export function planOf(seed: number): string {
  return generateRunPlan(seed).id
}

/**
 * The first seed at or after `from` whose descent contains a named room.
 *
 * The three grammars do not agree about which rooms exist: there is no Font in
 * THE TITHE and no Reliquary in THE LONG WAY. A spec that stands in the
 * Reliquary is not a spec about grammars, so rather than pinning one it asks for
 * **a descent that has the room in it** — which keeps a loop over seeds looping
 * over genuinely different runs instead of quietly over one.
 */
export function seedWith(templateId: string, from = 1): number {
  for (let seed = from; seed < from + 500; seed++) {
    if (firstNodeOf(generateRun(seed), templateId)) return seed
  }
  throw new Error(`no seed near ${from} builds a descent with a ${templateId} in it`)
}

/** The node of this run that used a named authored template. */
export function nodeOf(run: RunState, templateId: string): string {
  const found = firstNodeOf(run.map, templateId)
  if (!found) throw new Error(`this run has no ${templateId} in it`)
  return found.id
}

/**
 * The same run, standing in that room.
 *
 * Assembled rather than walked, which is what these fixtures always did — the
 * only change is that the room being stood in is one the director actually
 * built, so nothing here can put the run somewhere the map does not go.
 */
export function standIn(state: GameState, templateId: string): GameState {
  const run = state.run!
  const roomId = nodeOf(run, templateId)
  return { ...state, run: { ...run, roomId, path: [...run.path, roomId] } }
}
