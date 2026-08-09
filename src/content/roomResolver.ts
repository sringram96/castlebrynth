/**
 * Choosing an authored place for an abstract moment.
 *
 * The whole of the director's creativity is here, and it is deliberately very
 * small: **it chooses among things people wrote, and it never writes one.**
 * There is no weighting model, no scoring function and no fallback — a request
 * that no authored room can satisfy is a loud throw naming the request, because
 * the alternative is a run quietly built out of the nearest wrong room.
 *
 * Two questions, two functions, and the second one is the reason the first is
 * not enough:
 *
 *   - `resolveRoom` — *which place belongs at this moment?*
 *   - `resolveEncounter` — *and what, if anything, may stand in it?* Art
 *     constrains this. A thing that crawls the length of a hall cannot be put
 *     in a room whose picture has no hall in it, and that is enforced here
 *     rather than hoped for.
 */

import { ENEMY_LIST, enemy } from './enemies.js'
import { ROOM_LIBRARY } from './rooms.js'
import type { RoomRole, RoomTemplate, Territory, ThreatBand } from './roomTypes.js'
import type { Rng } from '../combat/dice.js'

export interface RoomRequest {
  readonly role: RoomRole
  readonly territory: Territory

  readonly depth: number

  /** How many ways in the map is about to attach. The art has to hold them. */
  readonly entrances: number
  readonly exits: number

  readonly requiredTags?: readonly string[]
  readonly forbiddenTags?: readonly string[]

  /**
   * What was chosen just now, so the descent does not stutter.
   *
   * A preference and never a rule: if the only compatible room is the one used
   * a moment ago, it is used again. Repetition is a quality problem; an
   * incompatible room is a correctness one, and they are not traded off.
   */
  readonly recentTemplates?: readonly string[]
}

/** Whether one authored place can take one request. Pure, and total. */
export function fits(template: RoomTemplate, request: RoomRequest): boolean {
  if (template.role !== request.role) return false
  if (template.territory !== request.territory) return false

  const { topology } = template
  if (request.entrances < topology.minEntrances || request.entrances > topology.maxEntrances) return false
  if (request.exits < topology.minExits || request.exits > topology.maxExits) return false

  const tags = new Set(template.tags)
  for (const tag of request.requiredTags ?? []) if (!tags.has(tag)) return false
  for (const tag of request.forbiddenTags ?? []) if (tags.has(tag)) return false

  return true
}

/** Everything that could stand at this moment, in library order. */
export function candidatesFor(request: RoomRequest): readonly RoomTemplate[] {
  return ROOM_LIBRARY.filter((t) => fits(t, request))
}

function describe(request: RoomRequest): string {
  const bits = [
    `role=${request.role}`,
    `territory=${request.territory}`,
    `depth=${request.depth}`,
    `entrances=${request.entrances}`,
    `exits=${request.exits}`,
  ]
  if (request.requiredTags?.length) bits.push(`requires=${request.requiredTags.join('+')}`)
  if (request.forbiddenTags?.length) bits.push(`forbids=${request.forbiddenTags.join('+')}`)
  return bits.join(' ')
}

/**
 * One authored place for one abstract moment.
 *
 * Deterministic for a given request and generator: the same seed walks the same
 * plan and lands on the same rooms, which is what makes a saved map worth
 * saving and a balance run worth reading.
 */
export function resolveRoom(request: RoomRequest, rng: Rng): RoomTemplate {
  const candidates = candidatesFor(request)
  if (candidates.length === 0) throw new Error(`no room template fits: ${describe(request)}`)

  const pool = preferFresh(candidates, request.recentTemplates ?? [])
  return pool[rng.int(pool.length)]!
}

/**
 * The candidates worth drawing from, given what was just used.
 *
 * Avoiding a repeat is a **preference**, and this is the whole of it: drop the
 * recent ones if dropping them leaves anything, and otherwise draw from all of
 * them. One candidate repeats, and that is correct — a run is never allowed to
 * fail because the writing has not caught up with the plan.
 *
 * Its own function so that the rule can be stated and tested independently of
 * how many interchangeable rooms happen to exist today.
 */
export function preferFresh(
  candidates: readonly RoomTemplate[],
  recent: readonly string[],
): readonly RoomTemplate[] {
  const used = new Set(recent)
  const fresh = candidates.filter((t) => !used.has(t.id))
  return fresh.length > 0 ? fresh : candidates
}

/**
 * Whether an authored picture can hold an authored encounter.
 *
 * The one invariant the art has over generation: every tag an enemy needs must
 * be a tag the room's composition can carry. The Gnawing needs a hall with its
 * far end in frame; the Warden needs a doorway it can fill. A room with no
 * `encounterTags` at all can hold nothing, which is the honest default for a
 * chapel painted around a basin.
 */
export function canHost(template: RoomTemplate, enemyId: string): boolean {
  const held = new Set(template.encounterTags ?? [])
  return enemy(enemyId).encounterTags.every((tag) => held.has(tag))
}

/**
 * What stands in this room, or nothing because nothing does.
 *
 * The seam, built now and barely used yet. Today every encounter template names
 * its own enemy and this only has to agree with it — but the agreement is
 * *checked*, so the day a template stops naming one, the choice is already a
 * function of the picture and the slot's threat band rather than of a table
 * somebody has to remember to update.
 */
export function resolveEncounter(
  template: RoomTemplate,
  slot: { readonly threat?: ThreatBand },
  rng: Rng,
): string | undefined {
  const threat = slot.threat ?? template.threat
  if (!template.enemy && threat === undefined) return undefined

  const compatible = ENEMY_LIST.filter(
    (e) => canHost(template, e.id) && (threat === undefined || e.threat === threat),
  )

  if (template.enemy) {
    // An authored room with an authored enemy the room cannot hold is a content
    // fault, and it is louder here than it would be on screen.
    if (!compatible.some((e) => e.id === template.enemy)) {
      throw new Error(
        `${template.id} (${template.composition}) cannot host its own enemy ${template.enemy}`,
      )
    }
    return template.enemy
  }

  if (compatible.length === 0) {
    throw new Error(`no ${threat} encounter fits ${template.id} (${template.composition})`)
  }
  return compatible[rng.int(compatible.length)]!.id
}
