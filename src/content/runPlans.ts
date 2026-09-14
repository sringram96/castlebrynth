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

import type { PlacementId, RoomRole, Territory, ThreatBand } from './roomTypes.js'

export type { PlacementId, RoomRole, Territory, ThreatBand } from './roomTypes.js'

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

  /**
   * Things the director stands in this room, beyond whatever the room itself is.
   *
   * Each one takes a **spare seat** in the chosen template's picture, in
   * declaration order — except `hint-carving`, which is prose and takes none. A
   * slot that asks for more seated placements than the room it resolved to has
   * seats is a content fault, and `validateRunMap` says so by name.
   */
  readonly placements?: readonly PlacementId[]
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
  /** For the report, the tests and the ledger. Never shown to a player. */
  readonly id: string
  readonly nodes: readonly RoomSlot[]
  readonly edges: readonly PlanEdge[]
  /**
   * The two nodes either of which may hold this run's treasure.
   *
   * **Always on different branches of a fork, and never on a spine.** Per seed
   * one of them becomes the treasure and the other resolves as an ordinary
   * chained bargain — so sometimes the Hand is behind the mouth you did not
   * take, and the strip will show that mouth for the rest of the run. A treasure
   * every route passes through is not a treasure, it is a step, and
   * `validateRunMap` fails a plan that puts one on a spine.
   *
   * Both candidates declare `placements: ['bargain-die']`. The generator swaps
   * the chosen one for the Hand, which is why neither the plan nor a template
   * ever names it.
   */
  readonly treasureCandidates: readonly [string, string]
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
  'left-fight': { label: 'GO ON', sense: 'Fight ahead.' },
  'right-work': { label: 'NARROW', sense: '2-bone toll.' },
  'ways-meet': { label: 'GO ON', sense: 'This passage rejoins the other. One of me arrives either way.' },
  stair: { label: 'STAIR', sense: 'Shorter route.' },
  // Amended: the deep way now *certainly* pays iron, and the printed-contract
  // law means it has to say so before the press rather than after the gate.
  deep: { label: 'DEEP', sense: 'Extra fight · iron in the cage.' },
  'gate-up': { label: 'GO ON', sense: 'The gate is up. The tunnel goes on.' },
  rejoin: { label: 'GO ON', sense: 'This tunnel rejoins the path to the door.' },
  through: { label: 'THROUGH', sense: 'The door is open.' },
  // Added by the crooked-bones wave, for the edges the two new grammars make.
  // Written in kind with the table above: each one says what the *transition* is,
  // never which two rooms it joins.
  'to-the-font': { label: 'GO ON', sense: 'Water somewhere ahead. The passage gives onto a chapel.' },
  'to-the-carver': { label: 'GO ON', sense: 'Somebody works down here. There is a light in it.' },
  'carver-out': { label: 'GO ON', sense: 'Past the table, the passage splits.' },
  'niche-on': { label: 'GO ON', sense: 'Past the alcove, the way carries on to the door.' },
  'niche-deep': { label: 'GO ON', sense: 'Past the alcove, the tunnel goes on, and something is in it.' },
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
  id: 'descent',
  nodes: [
    { id: 'a0', role: 'entrance', depth: 0, territory: 'threshold' },
    // The first of the two hints. Prose, no seat, no press beyond a LOOK: it
    // says the Hand exists and says nothing at all about where.
    { id: 'a1', role: 'transition', depth: 1, territory: 'ossuary', placements: ['hint-carving'] },
    { id: 'a2', role: 'junction', depth: 2, territory: 'ossuary' },
    { id: 'a3', role: 'encounter', depth: 3, territory: 'ossuary', threat: 'low' },
    { id: 'b3', role: 'toll', depth: 3, territory: 'ossuary', requiredTags: ['worked', 'mandatory'] },
    { id: 'a4', role: 'transition', depth: 4, territory: 'chapel' },
    { id: 'a5', role: 'recovery', depth: 5, territory: 'chapel' },
    { id: 'a6', role: 'find', depth: 6, territory: 'chapel', requiredTags: ['worked'] },
    { id: 'a7', role: 'junction', depth: 7, territory: 'chapel' },
    // **The amendment.** The stair leg now carries a room of its own, so the
    // safe route has one certain thing in it — a crooked bone, against the
    // deep's certain iron. This is the design answer to the 90%/41% split the
    // reel wave measured and reported: the short way was cheaper and paid
    // nothing, which made the long way the correct answer rather than the
    // expensive one.
    {
      id: 'a8s',
      role: 'find',
      depth: 8,
      territory: 'threshold',
      requiredTags: ['placed'],
      placements: ['bargain-die'],
    },
    { id: 'a8a', role: 'toll', depth: 8, territory: 'deep', requiredTags: ['worked', 'mandatory'] },
    {
      id: 'a8n',
      role: 'find',
      depth: 9,
      territory: 'deep',
      requiredTags: ['placed'],
      placements: ['bargain-die'],
    },
    { id: 'a8b', role: 'encounter', depth: 10, territory: 'deep', threat: 'medium' },
    { id: 'a9', role: 'keeper', depth: 11, territory: 'threshold', threat: 'keeper' },
    { id: 'a10', role: 'exit', depth: 12, territory: 'threshold' },
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
    { from: 'a7', to: 'a8s', kind: 'forward', way: 'stair' },
    { from: 'a7', to: 'a8a', kind: 'optional', way: 'deep' },
    { from: 'a8s', to: 'a9', kind: 'forward', way: 'niche-on' },
    { from: 'a8a', to: 'a8n', kind: 'forward', way: 'gate-up' },
    { from: 'a8n', to: 'a8b', kind: 'forward', way: 'niche-deep' },
    { from: 'a8b', to: 'a9', kind: 'return', way: 'rejoin' },
    { from: 'a9', to: 'a10', kind: 'forward', way: 'through' },
  ],
  treasureCandidates: ['a8s', 'a8n'],
}

/**
 * **G2 — THE LONG WAY.** Heal early, pay for it all the way down.
 *
 *     b0 → b1 → b2 Font → b3 ⌥ ┬→ b4 the Gnawing ─┐
 *                             └→ b5 the Offertory ─┴→ b6 → b7 Carver → b8 ⌥
 *                                                                         │
 *       b9 niche ───────────────────────────────── LEFT ───────────────────┤
 *          └──────────────→ b11 Door → b12 Out ←── b10c niche ← b10b ← b10 ┘
 *
 * The Font comes **first**, before either fight, which inverts the question the
 * whole of G1 is built around: you are told what you have to spend before you
 * have spent anything, and then there is nothing to top up with for the rest of
 * the descent. The Carver sits late, so the bones the run is still holding at b7
 * are the build — the longest stretch of attrition in the game is the price of a
 * good hand at the door.
 *
 * **Recorded quality debt:** b3 and b8 are both chapel junctions, and the Split
 * is the only chapel junction that has been painted — so one descent shows the
 * same picture twice. A second junction painting is owed; see
 * `POLISH_PROGRESS.md` § HUMAN ART REQUIRED. Nothing was drawn to hide it.
 */
export const LONG_WAY: RunPlan = {
  id: 'long-way',
  nodes: [
    { id: 'b0', role: 'entrance', depth: 0, territory: 'threshold' },
    { id: 'b1', role: 'transition', depth: 1, territory: 'ossuary', placements: ['hint-carving'] },
    { id: 'b2', role: 'recovery', depth: 2, territory: 'chapel' },
    { id: 'b3', role: 'junction', depth: 3, territory: 'chapel' },
    { id: 'b4', role: 'encounter', depth: 4, territory: 'ossuary', threat: 'low' },
    { id: 'b5', role: 'toll', depth: 4, territory: 'ossuary', requiredTags: ['worked', 'mandatory'] },
    { id: 'b6', role: 'transition', depth: 5, territory: 'chapel' },
    { id: 'b7', role: 'exchange', depth: 6, territory: 'chapel' },
    { id: 'b8', role: 'junction', depth: 7, territory: 'chapel' },
    {
      id: 'b9',
      role: 'find',
      depth: 8,
      territory: 'chapel',
      requiredTags: ['placed'],
      placements: ['bargain-die'],
    },
    { id: 'b10', role: 'toll', depth: 8, territory: 'deep', requiredTags: ['worked', 'mandatory'] },
    { id: 'b10b', role: 'encounter', depth: 9, territory: 'deep', threat: 'medium' },
    {
      id: 'b10c',
      role: 'find',
      depth: 10,
      territory: 'deep',
      requiredTags: ['placed'],
      placements: ['bargain-die'],
    },
    { id: 'b11', role: 'keeper', depth: 11, territory: 'threshold', threat: 'keeper' },
    { id: 'b12', role: 'exit', depth: 12, territory: 'threshold' },
  ],
  edges: [
    { from: 'b0', to: 'b1', kind: 'forward', way: 'hall-on' },
    { from: 'b1', to: 'b2', kind: 'forward', way: 'to-the-font' },
    { from: 'b2', to: 'b3', kind: 'forward', way: 'chapel-out' },
    { from: 'b3', to: 'b4', kind: 'forward', way: 'left-fight' },
    { from: 'b3', to: 'b5', kind: 'forward', way: 'right-work' },
    { from: 'b4', to: 'b6', kind: 'forward', way: 'past-the-body' },
    { from: 'b5', to: 'b6', kind: 'forward', way: 'ways-meet' },
    { from: 'b6', to: 'b7', kind: 'forward', way: 'to-the-carver' },
    { from: 'b7', to: 'b8', kind: 'forward', way: 'carver-out' },
    { from: 'b8', to: 'b9', kind: 'forward', way: 'stair' },
    { from: 'b8', to: 'b10', kind: 'optional', way: 'deep' },
    { from: 'b9', to: 'b11', kind: 'forward', way: 'niche-on' },
    { from: 'b10', to: 'b10b', kind: 'forward', way: 'gate-up' },
    { from: 'b10b', to: 'b10c', kind: 'forward', way: 'past-the-body' },
    { from: 'b10c', to: 'b11', kind: 'return', way: 'rejoin' },
    { from: 'b11', to: 'b12', kind: 'forward', way: 'through' },
  ],
  treasureCandidates: ['b9', 'b10c'],
}

/**
 * **G3 — THE TITHE.** No Font anywhere, and the Carver in the third room.
 *
 *     c0 → c1 ⌥ ┬→ c2 the Gnawing ──┐
 *               └→ c3 Carver ────────┴→ c4 → c5 Reliquary → c6 ⌥
 *                                                               │
 *       c7 niche ───────────────────── STAIR ───────────────────┤
 *          └────────→ c9 Door → c10 Out ←── c8c ← c8b niche ← c8 ┘
 *
 * The grammar with **nothing to heal with**. There is no recovery room on any
 * route, and the only things that can change what happens at the door are the
 * Carver's table and what is chained in the niches — so the thirty bones a run
 * starts with are its whole budget, and every one of them spent on a die is one
 * the Warden does not have to break.
 *
 * That is why `validateDescent`'s recovery rule is **re-based** rather than
 * deleted: what the rule was protecting is that a run reaches the keeper having
 * been somewhere it could change what it is carrying, and the Reliquary at c5 is
 * on every route. See `game/mapValidation.ts`.
 */
export const TITHE: RunPlan = {
  id: 'tithe',
  nodes: [
    { id: 'c0', role: 'entrance', depth: 0, territory: 'threshold' },
    { id: 'c1', role: 'junction', depth: 1, territory: 'ossuary' },
    { id: 'c2', role: 'encounter', depth: 2, territory: 'ossuary', threat: 'low' },
    { id: 'c3', role: 'exchange', depth: 2, territory: 'ossuary' },
    { id: 'c4', role: 'transition', depth: 3, territory: 'chapel', placements: ['hint-carving'] },
    { id: 'c5', role: 'find', depth: 4, territory: 'chapel', requiredTags: ['worked'] },
    { id: 'c6', role: 'junction', depth: 5, territory: 'chapel' },
    {
      id: 'c7',
      role: 'find',
      depth: 6,
      territory: 'threshold',
      requiredTags: ['placed'],
      placements: ['bargain-die'],
    },
    { id: 'c8', role: 'toll', depth: 6, territory: 'deep', requiredTags: ['worked', 'mandatory'] },
    {
      id: 'c8b',
      role: 'find',
      depth: 7,
      territory: 'deep',
      requiredTags: ['placed'],
      placements: ['bargain-die'],
    },
    { id: 'c8c', role: 'encounter', depth: 8, territory: 'deep', threat: 'medium' },
    { id: 'c9', role: 'keeper', depth: 9, territory: 'threshold', threat: 'keeper' },
    { id: 'c10', role: 'exit', depth: 10, territory: 'threshold' },
  ],
  edges: [
    { from: 'c0', to: 'c1', kind: 'forward', way: 'hall-on' },
    { from: 'c1', to: 'c2', kind: 'forward', way: 'left-fight' },
    { from: 'c1', to: 'c3', kind: 'forward', way: 'right-work' },
    { from: 'c2', to: 'c4', kind: 'forward', way: 'past-the-body' },
    { from: 'c3', to: 'c4', kind: 'forward', way: 'ways-meet' },
    { from: 'c4', to: 'c5', kind: 'forward', way: 'chapel-on' },
    { from: 'c5', to: 'c6', kind: 'forward', way: 'chapel-out' },
    { from: 'c6', to: 'c7', kind: 'forward', way: 'stair' },
    { from: 'c6', to: 'c8', kind: 'optional', way: 'deep' },
    { from: 'c7', to: 'c9', kind: 'forward', way: 'niche-on' },
    { from: 'c8', to: 'c8b', kind: 'forward', way: 'gate-up' },
    { from: 'c8b', to: 'c8c', kind: 'forward', way: 'niche-deep' },
    { from: 'c8c', to: 'c9', kind: 'return', way: 'rejoin' },
    { from: 'c9', to: 'c10', kind: 'forward', way: 'through' },
  ],
  treasureCandidates: ['c7', 'c8b'],
}

/**
 * Every grammar the director may choose, in a stable order.
 *
 * Three, and **a fourth is explicitly rejected by this wave**. The point of
 * three is that a run stops being one shape with two branches in it: where the
 * Font is, where the Carver is, and whether there is a Font at all are now facts
 * about *this descent* rather than about the game.
 *
 * The only fixed law across all three is the one the validator already held:
 * the keeper and the way out are in the threshold. Everything else — the
 * territory sequence, where the recovery is, how many rooms the legs of the last
 * fork have — each grammar declares for itself.
 */
export const GRAMMARS: readonly RunPlan[] = [DESCENT, LONG_WAY, TITHE]
