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
import { AMBIENT_CAP, MOTE_CAP, ROOM_LIBRARY, ambienceFor, ambientSeat } from './rooms.js'
import type { AmbientKind, Composition, RoomRole, RoomTemplate, Territory, ThreatBand } from './roomTypes.js'
import type { Rng } from '../game/rng.js'

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

// ── the negative-space law ──────────────────────────────────────────────
//
// Crowding has two axes and the law governs both. It lives here, beside `fits`,
// because it is the same kind of statement: **what a picture can hold.** A
// composition already says that about ways in and out and about what may stand
// in the frame; this says it about furniture and about presses.

/** What one frame class allows. Provisional first-pass numbers, reported. */
export interface FrameBudget {
  /** Furniture seated into the painting, at its authoring-time maximum. */
  readonly plates: number
  /** Hotspots of any kind besides the ways out. */
  readonly presses: number
}

/**
 * The budget of every frame class, keyed by the class itself.
 *
 * **`composition` is the frame class.** There is deliberately no second field:
 * a template already declares what its picture can hold, and a room carrying
 * both a `composition` and a `frameClass` would be a room that could disagree
 * with itself about its own painting.
 *
 * The wave that wrote this law named four classes; the library has seven
 * compositions, so `junction` and `threshold` are this table's own and are
 * reported as such. `duel` is the strictest reading of what the wave asked for:
 * *the enemy, and the enemy* — a keeper's frame holds the thing standing in it
 * and nothing else at all.
 *
 * Every number is first-pass and provisional, exactly as the tray's geometry
 * and the territory grades are. What is **not** provisional is that a breach
 * throws rather than reading as noise on a phone.
 */
export const FRAME_BUDGETS: Readonly<Record<Composition, FrameBudget>> = {
  cramped: { plates: 2, presses: 3 },
  'long-axis': { plates: 4, presses: 5 },
  altar: { plates: 4, presses: 5 },
  vertical: { plates: 3, presses: 4 },
  junction: { plates: 2, presses: 4 },
  threshold: { plates: 1, presses: 2 },
  duel: { plates: 0, presses: 0 },
}

/**
 * How much open painting has to be left between two seated things.
 *
 * The other half of the negative-space law, and it is geometry rather than a
 * count: a frame can be inside both budgets and still read as a pile if the
 * three things in it are touching. The 44 px non-overlap rule says *a thumb
 * cannot mean both*; this says *the eye can see the room between them*.
 *
 * First-pass numbers, asserted in `test/unit/anchors.test.ts` at the phone's own
 * geometry, exactly as the tray's seating is. **Ways out are not held to it** —
 * they stand where the picture puts them, they are mandated by topology rather
 * than chosen, and the 44 px law already keeps them clear of everything.
 */
export const CLEAR_WATER = 8

/** And the focal detail, which is the one thing the eye should find, gets more. */
export const FOCAL_MOAT = 16

/**
 * The furniture seated into one picture, at its authoring-time maximum.
 *
 * Everything that occupies **a place in the frame**: the objects that can be
 * worked, the ritual if there is one, and the spots a found thing can lie in —
 * the Marrow's floor counts two, because two things can be lying on it. A
 * backdrop is not furniture and a way out is not furniture.
 */
export function platesIn(t: RoomTemplate): number {
  return (t.interactables?.length ?? 0) + (t.ritual ? 1 : 0) + (t.lootAt?.length ?? 0)
}

/**
 * Every hotspot a room can put on its picture except the ways out.
 *
 * **Exits are counted by topology and excluded.** They are mandated — one per
 * slot the map may attach, asserted in `test/unit/anchors.test.ts` — and a
 * budget that counted them would be a budget that punished a junction for
 * being a junction.
 *
 * A found thing counts once. Its name and its TAKE are two presses on one
 * object rather than two objects, and the 44 px law already holds them apart.
 */
export function pressesIn(t: RoomTemplate): number {
  return (
    t.details.length +
    (t.interactables?.length ?? 0) +
    (t.ritual ? 1 : 0) +
    (t.lootAt?.length ?? 0)
  )
}

const KINDS: readonly AmbientKind[] = ['flicker', 'glow', 'sway', 'drift']

const whole = (n: number): boolean => Number.isInteger(n) && n > 0

/**
 * Everything wrong with the authored library, as sentences.
 *
 * Pure and total over content alone — it takes no map, no run and no state, so
 * it can be called from a test, from the director, and from a tool. Every
 * message names the template and the number, because a budget breach is a thing
 * somebody has to go and fix in a file rather than a thing to work around.
 */
export function contentProblems(library: readonly RoomTemplate[] = ROOM_LIBRARY): readonly string[] {
  const out: string[] = []

  for (const t of library) {
    const budget = FRAME_BUDGETS[t.composition]
    if (!budget) {
      out.push(`${t.id}: no frame budget for composition "${t.composition}"`)
      continue
    }

    const plates = platesIn(t)
    if (plates > budget.plates) {
      out.push(`${t.id}: ${plates} plates in a ${t.composition} frame, which holds ${budget.plates}`)
    }
    const presses = pressesIn(t)
    if (presses > budget.presses) {
      out.push(
        `${t.id}: ${presses} presses in a ${t.composition} frame, which holds ${budget.presses}`,
      )
    }

    // And the quiet-motion law, which is welded to the one above: a room may
    // breathe only inside the space the budgets cleared.
    const sources = ambienceFor(t)
    if (sources.length > AMBIENT_CAP) {
      out.push(
        `${t.id}: ${sources.length} ambient sources, and a room holds ${AMBIENT_CAP} ` +
          `(its territory's counts as one)`,
      )
    }
    for (const a of sources) {
      if (!KINDS.includes(a.kind)) out.push(`${t.id}: ambient kind "${a.kind}" is not one anybody wrote`)
      if (!whole(a.amplitude)) {
        out.push(`${t.id}: ambient ${a.kind} has amplitude ${a.amplitude}, and amplitudes are whole`)
      }
      if (!whole(a.tick)) {
        out.push(`${t.id}: ambient ${a.kind} ticks every ${a.tick}, and ticks are whole`)
      }
      if (a.kind === 'drift') {
        if (a.target !== 'world') {
          out.push(`${t.id}: drift falls through the world box and cannot be seated on "${a.target}"`)
        }
      } else if (ambientSeat(t, a.target) === undefined) {
        out.push(`${t.id}: ambient ${a.kind} is seated on "${a.target}", which is not in this room`)
      }
    }
  }

  if (!whole(MOTE_CAP) || MOTE_CAP > 8) {
    out.push(`the mote cap is ${MOTE_CAP}; dust that accumulates is weather`)
  }

  return out
}

/**
 * The same walk, loudly.
 *
 * Called from `generateRun`, so a template that breaks the law fails at the
 * press of START naming itself — which is the same treatment `validateRunMap`
 * gives a broken descent, for the same reason: the alternative is a phone full
 * of noise and nobody able to say which file it came from.
 */
export function assertContent(): void {
  const problems = contentProblems()
  if (problems.length > 0) {
    throw new Error(`the room library breaks the negative-space law:\n  ${problems.join('\n  ')}`)
  }
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
