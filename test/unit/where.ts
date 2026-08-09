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
import type { GameState, RunState } from '../../src/game/state.js'

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
