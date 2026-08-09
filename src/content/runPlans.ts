/**
 * The abstract shape of a descent, before any room has been chosen.
 *
 * A plan is a run's *drama* with none of its places in it: ten slots that say
 * only what kind of moment each one is, and the edges between them. Nothing
 * here names an authored room, and nothing here is a picture. That separation
 * is the point — the plan below can be reshaped without touching a single room
 * template, and a room template can be added without touching the plan.
 *
 * ## What a way says
 *
 * An edge carries a `way`, which is a key into `WAYS`. The label and the line
 * under it are **authored copy**, exactly as a room's arrival line is, and they
 * live here because they describe the *transition* rather than either room: "the
 * body is down, the corridor continues behind it" is a thing you can only say
 * about leaving a fight. The director never writes a sentence; it looks one up,
 * and `validateRunMap` fails a plan that names a way nobody wrote.
 */

import type { RoomRole, Territory, ThreatBand } from './roomTypes.js'

export type { RoomRole, Territory, ThreatBand } from './roomTypes.js'

/**
 * One moment in a descent, before a room has been chosen for it.
 *
 * `territory` and `threat` are optional in the type and given for every slot in
 * the grammar below — an unstated territory would leave the resolver free to
 * put the chapel anywhere, and this first plan is deliberately not free.
 */
export interface RoomSlot {
  readonly id: string
  readonly role: RoomRole
  readonly depth: number

  readonly threat?: ThreatBand
  readonly territory?: Territory

  readonly requiredTags?: readonly string[]
  readonly forbiddenTags?: readonly string[]
}

/**
 * One way on.
 *
 * `forward` is the spine. `optional` is a branch the player may decline —
 * the deep way. `return` is the branch coming back to the spine, and it is a
 * distinct word because "the tunnel rejoins the path to the door" is a promise
 * the validator checks: an optional branch that did not rejoin would be a run
 * whose long route never reached the keeper.
 */
export type PlanEdgeKind = 'forward' | 'optional' | 'return'

export interface PlanEdge {
  readonly from: string
  readonly to: string
  readonly kind: PlanEdgeKind
  /** Which authored line goes on the button. A key into `WAYS`. */
  readonly way: string
}

export interface RunPlan {
  readonly nodes: readonly RoomSlot[]
  readonly edges: readonly PlanEdge[]
}

/** What a way on says, before the press. */
export interface Way {
  /** Two words or fewer — it goes on a button. */
  readonly label: string
  /** One line, given before the press, so a fork is a decision. */
  readonly sense: string
}

/**
 * Every line the game can put on a way on.
 *
 * Authored, and keyed by what the transition *is* rather than by which two
 * rooms it happens to join — so a plan that puts a different encounter before
 * the chapel still says "the body is down" and still reads.
 */
export const WAYS: Readonly<Record<string, Way>> = {
  'hall-on': { label: 'GO ON', sense: 'The hall continues to a dark archway.' },
  'into-the-fight': { label: 'GO ON', sense: 'Something is breathing in the room ahead.' },
  'past-the-body': { label: 'GO ON', sense: 'The body is down. The corridor continues behind it.' },
  'chapel-on': { label: 'GO ON', sense: 'The chapel opens onto a dead one.' },
  'chapel-out': { label: 'GO ON', sense: 'The chapel gives onto the passage again.' },
  stair: { label: 'STAIR', sense: 'Shorter route to the door.' },
  deep: { label: 'DEEP', sense: 'One more fight. More danger, better chance of an upgrade.' },
  'gate-up': { label: 'GO ON', sense: 'The gate is up. The tunnel goes on.' },
  rejoin: { label: 'GO ON', sense: 'This tunnel rejoins the path to the door.' },
  through: { label: 'THROUGH', sense: 'The door is open.' },
}

export function way(id: string): Way {
  const found = WAYS[id]
  if (!found) throw new Error(`no such way: ${id}`)
  return found
}

/**
 * The descent.
 *
 * One authored grammar, and for now the only one — the first director's job is
 * to reproduce the run the slice already had, so that the architecture is what
 * changed and nothing else. Read down the depths:
 *
 *     entrance → transition → encounter → recovery → find → junction
 *                                                             ├──────→ keeper → exit
 *                                                             └→ toll → encounter ─┘
 *
 * Two things about the ordering are deliberate rather than incidental. The
 * recovery slot sits between the first fight and the junction because the
 * junction's question is *how much health am I willing to spend*, and that is
 * only a question if the player has just been told the answer. And the toll
 * sits in front of the deep encounter rather than after it, so the long way is
 * paid for before it is fought.
 */
export const DESCENT: RunPlan = {
  nodes: [
    { id: 'n1', role: 'entrance', depth: 0, territory: 'threshold' },
    { id: 'n2', role: 'transition', depth: 1, territory: 'ossuary' },
    { id: 'n3', role: 'encounter', depth: 2, territory: 'ossuary', threat: 'low' },
    { id: 'n4', role: 'recovery', depth: 3, territory: 'chapel' },
    { id: 'n5', role: 'find', depth: 4, territory: 'chapel', requiredTags: ['worked'] },
    { id: 'n6', role: 'junction', depth: 5, territory: 'chapel' },
    { id: 'n7', role: 'toll', depth: 6, territory: 'deep', requiredTags: ['worked', 'mandatory'] },
    { id: 'n8', role: 'encounter', depth: 7, territory: 'deep', threat: 'medium' },
    { id: 'n9', role: 'keeper', depth: 8, territory: 'threshold', threat: 'keeper' },
    { id: 'n10', role: 'exit', depth: 9, territory: 'threshold' },
  ],
  // Order matters at the junction and only there: the first edge out of a slot
  // is the primary bed on the tray, and the short way is the one a player who
  // presses the big button gets.
  edges: [
    { from: 'n1', to: 'n2', kind: 'forward', way: 'hall-on' },
    { from: 'n2', to: 'n3', kind: 'forward', way: 'into-the-fight' },
    { from: 'n3', to: 'n4', kind: 'forward', way: 'past-the-body' },
    { from: 'n4', to: 'n5', kind: 'forward', way: 'chapel-on' },
    { from: 'n5', to: 'n6', kind: 'forward', way: 'chapel-out' },
    { from: 'n6', to: 'n9', kind: 'forward', way: 'stair' },
    { from: 'n6', to: 'n7', kind: 'optional', way: 'deep' },
    { from: 'n7', to: 'n8', kind: 'forward', way: 'gate-up' },
    { from: 'n8', to: 'n9', kind: 'return', way: 'rejoin' },
    { from: 'n9', to: 'n10', kind: 'forward', way: 'through' },
  ],
}
