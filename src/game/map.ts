/**
 * The generated map: where the places are, and what joins them.
 *
 * This is the other half of the split `content/roomTypes.ts` describes. A
 * template is a *place*; a `RunRoom` is **one use of that place in one run**,
 * and the difference is not cosmetic:
 *
 *     node: n7   template: reliquary
 *     node: n12  template: reliquary
 *
 * are two rooms. They must have their own looked state, their own worked
 * objects, their own cleared flag and their own chest — and the only thing that
 * makes that true is that everything keyed by "which room" is keyed by the
 * **node id**, never by the template id. `run.roomId`, `run.cleared`,
 * `run.path` and the keys of `run.rooms` are all node ids. The template id
 * appears in exactly one place in state: the `templateId` discriminant inside
 * a room's interaction record, where it says which *kind* of machinery is being
 * described.
 *
 * ## The join
 *
 * Nothing outside this file joins a node to its template. `roomAt(run)` is the
 * one seam: views, the reducer and the balance model all ask it for the room
 * they are standing in and get authored content and generated topology already
 * fused. That is what keeps generation out of `ui/` — a view that had to know
 * a map existed would be a view that could be given a wrong one.
 */

import { template } from '../content/rooms.js'
import type { RoomRole, RoomTemplate, Territory } from '../content/roomTypes.js'
import type { RunState } from './state.js'

/** One way on, as the map generated it. */
export interface MapExit {
  /** Two words or fewer — it goes on a button. */
  readonly label: string
  /** A **node** id. Never a template id. */
  readonly to: string
  /** One line, given before the press, so a fork is a decision. */
  readonly sense: string
}

/**
 * One room of one run.
 *
 * It holds generated facts and nothing else: who it is, which authored place it
 * is standing in, where it sits in the descent, what leads out of it, and what
 * was put in it. The prose, the art, the details and the machinery are all the
 * template's, and duplicating any of them here would be a second copy of the
 * writing that a save could hold a stale version of.
 *
 * `role` and `territory` are the exceptions, and they are duplicated on
 * purpose: they are what the *slot* asked for, so keeping them lets
 * `validateRunMap` catch a resolver that answered a request with the wrong kind
 * of room, which is precisely the bug that would otherwise be invisible.
 */
export interface RunRoom {
  readonly id: string
  readonly templateId: string

  readonly role: RoomRole
  readonly territory: Territory
  readonly depth: number

  readonly exits: readonly MapExit[]

  /** What is standing here, if anything is. */
  readonly enemyId?: string
}

export interface RunMap {
  readonly start: string
  readonly nodes: Readonly<Record<string, RunRoom>>
  /** The territories the descent passes through, in order, without repeats. */
  readonly territorySequence: readonly Territory[]
}

/**
 * An authored place and the run's use of it, fused.
 *
 * Everything the reducer and the views used to get from `room(id)`, plus the
 * three things only the map knows: which instance this is, where it leads, and
 * what was put in it.
 */
export interface ResolvedRoom extends RoomTemplate {
  /** The node id. This — not `id` — is what run state is keyed by. */
  readonly instanceId: string
  readonly depth: number
  readonly exits: readonly MapExit[]
  readonly enemy?: string
}

export function nodeAt(map: RunMap, nodeId: string): RunRoom {
  const found = map.nodes[nodeId]
  if (!found) throw new Error(`no such room in this run: ${nodeId}`)
  return found
}

/**
 * The room the run is standing in, or any other node of the same run.
 *
 * The one place a node and a template ever meet.
 */
export function roomAt(run: RunState, nodeId: string = run.roomId): ResolvedRoom {
  const node = nodeAt(run.map, nodeId)
  // The authored enemy is dropped and the generated one put back, so a node
  // that was given nothing shows nothing even if its template names a fight.
  // The map is what decides who is standing here.
  const { enemy: _authored, ...place } = template(node.templateId)
  return {
    ...place,
    instanceId: node.id,
    depth: node.depth,
    exits: node.exits,
    ...(node.enemyId ? { enemy: node.enemyId } : {}),
  }
}

/**
 * The first node in the descent that used a given template.
 *
 * For fixtures and tests, which want to say *stand me at the gate* without
 * knowing what the director called it. Ambiguous by construction when a
 * template is used twice, which is why `?node=` exists beside `?room=`.
 */
export function firstNodeOf(map: RunMap, templateId: string): RunRoom | undefined {
  return Object.values(map.nodes)
    .filter((n) => n.templateId === templateId)
    .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))[0]
}
