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
  'past-the-body': { label: 'GO ON', sense: 'The body is down. The corridor continues behind it.' },
  'chapel-on': { label: 'GO ON', sense: 'The chapel opens onto a dead one.' },
  'chapel-out': { label: 'GO ON', sense: 'The chapel gives onto the passage again.' },
  // The first fork. Left is a fight; right is a price. Both stated before the
  // press, because the run hides places and never rules.
  'left-fight': { label: 'GO ON', sense: 'Something is feeding down there. I can hear it.' },
  'right-work': { label: 'NARROW', sense: 'Quieter. Narrower. The quiet is doing a lot of work.' },
  'ways-meet': { label: 'GO ON', sense: 'This passage rejoins the other. One of me arrives either way.' },
  stair: { label: 'STAIR', sense: 'Shorter route to the door.' },
  // Amended: the deep way now *certainly* pays iron, and the printed-contract
  // law means it has to say so before the press rather than after the gate.
  deep: { label: 'DEEP', sense: 'One more fight. Pay at the gate; iron waits in the cage.' },
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
 * The descent. A **directed acyclic graph**, with two decision points.
 *
 *                          ┌→ a3  encounter (the Gnawing) ─┐
 *     a0 → a1 → a2 junction┤                               ├→ a4 → a5 → a6 → a7 junction
 *                          └→ b3  toll (the Offertory) ────┘                     │
 *                                                                                │
 *                    ┌───────────────────────────────────── stair ───────────────┤
 *                    ↓                                                           ↓
 *                   a9 keeper → a10 exit ←──── rejoin ──── a8b ← a8a toll ← deep ┘
 *
 * **Forward only.** The maze feeling is not backtracking — it is seeing the
 * mouth of a road you cannot take this run, and the unchosen branch is what the
 * next run is for. There is no cycle anywhere in here and `validateRunMap`
 * asserts it; a loop wave, if there is one, deletes that assertion rather than
 * arguing with this comment.
 *
 * Two forks, and they ask different questions:
 *
 *   - **the Cleft (a2)** asks *what do I want to be carrying*. Left is a fight
 *     and a sixty-percent draw; right is a flat two-bone toll and a certain
 *     item die. Route is build.
 *   - **the Split (a7)** asks *how much health am I willing to spend*, which is
 *     only a question if the run has just been told the answer — which is why
 *     the recovery slot sits in front of it, exactly as it always has.
 *
 * A third fork was considered and is **not** here; it is recorded as an open
 * question in `docs/PRODUCT.md` rather than smuggled in.
 *
 * The territory grammar is unchanged: threshold → ossuary → chapel → deep →
 * threshold, and both branches of the Cleft are in the ossuary so the run reads
 * as one stretch of bone country whichever it takes.
 */
export const DESCENT: RunPlan = {
  nodes: [
    { id: 'a0', role: 'entrance', depth: 0, territory: 'threshold' },
    { id: 'a1', role: 'transition', depth: 1, territory: 'ossuary' },
    { id: 'a2', role: 'junction', depth: 2, territory: 'ossuary' },
    { id: 'a3', role: 'encounter', depth: 3, territory: 'ossuary', threat: 'low' },
    { id: 'b3', role: 'toll', depth: 3, territory: 'ossuary', requiredTags: ['worked', 'mandatory'] },
    { id: 'a4', role: 'transition', depth: 4, territory: 'chapel' },
    { id: 'a5', role: 'recovery', depth: 5, territory: 'chapel' },
    { id: 'a6', role: 'find', depth: 6, territory: 'chapel', requiredTags: ['worked'] },
    { id: 'a7', role: 'junction', depth: 7, territory: 'chapel' },
    { id: 'a8a', role: 'toll', depth: 8, territory: 'deep', requiredTags: ['worked', 'mandatory'] },
    { id: 'a8b', role: 'encounter', depth: 9, territory: 'deep', threat: 'medium' },
    { id: 'a9', role: 'keeper', depth: 10, territory: 'threshold', threat: 'keeper' },
    { id: 'a10', role: 'exit', depth: 11, territory: 'threshold' },
  ],
  // Order matters at a junction and only there: the first edge out of a slot
  // binds to the first exit anchor in the room's picture, and it is the way a
  // player who presses the obvious thing gets.
  edges: [
    { from: 'a0', to: 'a1', kind: 'forward', way: 'hall-on' },
    { from: 'a1', to: 'a2', kind: 'forward', way: 'hall-on' },
    { from: 'a2', to: 'a3', kind: 'forward', way: 'left-fight' },
    { from: 'a2', to: 'b3', kind: 'forward', way: 'right-work' },
    { from: 'a3', to: 'a4', kind: 'forward', way: 'past-the-body' },
    { from: 'b3', to: 'a4', kind: 'forward', way: 'ways-meet' },
    { from: 'a4', to: 'a5', kind: 'forward', way: 'hall-on' },
    { from: 'a5', to: 'a6', kind: 'forward', way: 'chapel-on' },
    { from: 'a6', to: 'a7', kind: 'forward', way: 'chapel-out' },
    { from: 'a7', to: 'a9', kind: 'forward', way: 'stair' },
    { from: 'a7', to: 'a8a', kind: 'optional', way: 'deep' },
    { from: 'a8a', to: 'a8b', kind: 'forward', way: 'gate-up' },
    { from: 'a8b', to: 'a9', kind: 'return', way: 'rejoin' },
    { from: 'a9', to: 'a10', kind: 'forward', way: 'through' },
  ],
}
