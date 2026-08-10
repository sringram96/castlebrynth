/**
 * The whole of the game's state, as plain serialisable data.
 *
 * Two scopes and no rituals: `meta` survives a death, `run` does not. Both are
 * ordinary objects. Every transition is a pure function in `reducer.ts`, and
 * nothing outside that file may mutate any of this.
 *
 * `mode` is the journey's state machine. It is explicit because every
 * session-ending bug this reset exists to fix — the death screen you could get
 * stuck on, the choosing screen with no way out, the tab that ate its own
 * press — was a mode the shell had to infer from four other fields.
 *
 * ## There is no health here
 *
 * A run's life is a physical army of bones. `hp`, `maxHp`, `enemyHp` and
 * `enemyMaxHp` are gone, and are not to come back behind another name: a bone
 * counter that behaves like a health bar is the old game wearing the new one's
 * coat. See `docs/COMBAT.md`.
 */

import type { BoneProfileId, SpecialBoneInstance } from '../content/bones.js'
import type { RewardId } from '../content/rewards.js'
import type { RunMap } from './map.js'

/**
 * Bumped whenever the shape below changes. Old saves are not migrated.
 *
 * **8, and it skipped nothing.** Two changes reached 7 independently — the
 * generated map, and the War of Bones — and a save written by either of them
 * has a shape this build cannot read. A version that two different schemas
 * both claim is worse than no version at all: it is the one number whose whole
 * job is to say *I know what this is*.
 */
export const SAVE_VERSION = 8

export type Mode = 'title' | 'explore' | 'combat' | 'reward' | 'dead' | 'complete'

/**
 * The two model phases of a round. See `docs/COMBAT.md`.
 *
 * **Choose your modifiers, then throw and watch what it costs.** That is the
 * whole round, and each phase is one of those two sentences:
 *
 * - `thrown` — its line is up and yours is not committed. Drink, or change
 *   which named bones stand in the line. Nothing here is a number to nudge.
 * - `smashed` — it has been thrown and read. The wreckage is on the plate.
 *
 * There were four. `fielded` and `rolled` split the throw across two presses
 * so a width could be committed and then a Charm spent, and both of those
 * decisions are gone: the line is always as wide as the pile allows, and
 * throwing and finding out is one uninterrupted beat. A phase whose only
 * content is confirming a decision already taken is a phase that exists to be
 * pressed through.
 */
export type CombatPhase = 'thrown' | 'smashed'

/** How an enemy answers a lane whose two bones show the same number. */
export type TieRule = 'mutual' | 'warden-holds'

/**
 * One bone in an enemy's army.
 *
 * `priority` is the enemy's *authored* fielding order, and it is content
 * rather than an opinion formed at runtime: "best first" must be a number
 * somebody wrote down, not a heuristic that can quietly change what a fight
 * feels like. It is also the stable tie-break when two enemy bones roll the
 * same value, so no hidden rearrangement happens after the throw.
 */
export interface EnemyBoneInstance {
  readonly boneId: string
  readonly profile: BoneProfileId
  readonly priority: number
}

/**
 * One bone that has been thrown and is standing in a line.
 *
 * `boneKey` is its identity for the length of the round — a Charm targets one,
 * a smash breaks one — and it is never a screen position. For a common bone it
 * is ephemeral (`common:r3:0`); for a special it carries the run-long
 * `specialInstanceId` alongside, because that is the thing that dies.
 *
 * `faceIndex` travels with `value` so a bone that rolled the second of two
 * sevens is distinguishable from one that rolled the first, even though the
 * two resolve identically.
 */
export interface RolledBone {
  readonly boneKey: string
  readonly profile: BoneProfileId
  readonly faceIndex: number
  readonly value: number
  /** Set when this is a player special. Its death removes this instance. */
  readonly specialInstanceId?: string
  /**
   * Which named bone it is, carried on the bone rather than looked up.
   *
   * A dead special is removed from the pile the instant it breaks, so a view
   * that resolved the name through `run.specials` would find nothing exactly
   * when the name matters most — on the frame the Cinderbone is lying broken
   * in its lane. The bone knows what it is.
   */
  readonly specialId?: string
  /** Set when this is an enemy bone. Its death removes this id from the army. */
  readonly enemyBoneId?: string
}

/**
 * What went in this round.
 *
 * Recorded as *width plus named specials* rather than as a list of bones,
 * because common bones are anonymous: there is no such thing as "that one".
 * The remainder — `width - specialIds.length` — is drawn from the pile.
 *
 * **The width is not a choice and the specials are.** Every round throws as
 * many bones as the pile can put up; what the player decides in the modifier
 * step is which of their named bones stand among them, and a Knuckle in the
 * line is four faces of 6-or-better and one more thing that can break forever.
 */
export interface PlayerField {
  readonly width: number
  readonly specialIds: readonly string[]
}

/** What one high-to-low pairing did. */
export type LaneOutcome =
  | 'player'
  | 'enemy'
  | 'both'
  | 'safe-player'
  | 'safe-enemy'
  | 'warden-hold'

export interface LaneResult {
  readonly lane: number
  readonly player?: RolledBone
  readonly enemy?: RolledBone
  readonly result: LaneOutcome
}

/**
 * What a smash cost, in full.
 *
 * The record is authoritative and is written by the reducer before a frame of
 * it is shown. The presentation reads lanes off this in order; it never
 * recomputes a casualty, and it never decides one.
 *
 * `stoppedAtLane` is the run ending mid-smash. Lanes after it did not resolve
 * and are not retroactively anything — they simply never happened.
 */
export interface SmashRecord {
  readonly lanes: readonly LaneResult[]
  readonly playerCommonLost: number
  readonly playerSpecialsLost: readonly string[]
  readonly enemyBonesLost: readonly string[]
  /** Lanes an enemy tie rule kept. The Warden's whole encounter, as a count. */
  readonly heldTies: number
  readonly stoppedAtLane?: number
}

export interface CombatState {
  readonly enemyId: string
  /** 1-based. Round 1 is the fight opening, and its enemy line is already up. */
  readonly round: number
  readonly phase: CombatPhase

  /** Its living army. Casualties are removed here and never return. */
  readonly enemyBones: readonly EnemyBoneInstance[]
  /** How many it started with, so a band can be computed without content. */
  readonly enemyStartCount: number
  /** Face-up and sorted, before the player commits anything. */
  readonly enemyLine: readonly RolledBone[]

  /**
   * What went in, and what it rolled. Both are set by THROW and neither exists
   * before it — which is exactly what `thrown` means: it has thrown, you have
   * not.
   */
  readonly field?: PlayerField
  readonly playerLine?: readonly RolledBone[]

  readonly lastSmash?: SmashRecord
  /**
   * It is dead, and the fight is being held open on the picture of that.
   *
   * A flag, not a clock. There is no frame index and no start time here,
   * because a frame is not a fact about the run: the sequence in `app/app.ts`
   * owns which picture is up, `content/defeat.ts` owns how long each one is,
   * and a reload lands on this flag and plays out from the settled frame.
   */
  readonly defeated?: boolean
  /** What just happened, for the word band and the beats. */
  readonly log: readonly string[]
}

/** What a die in a font can land on. */
export type RitualRoll = 1 | 2 | 3 | 4 | 5 | 6

/**
 * A ritual the run has already resolved.
 *
 * The authoritative record of one press: what it rolled, what that gave back,
 * and how much room there was at the moment it was rolled. It exists so the
 * answer cannot be recomputed — a reload replays no draw, a second press finds
 * the room already answered, and the sequence on screen is reading this rather
 * than deciding anything.
 */
export interface RitualState {
  /** The **node** it was rolled in, so two fonts in one run are two fonts. */
  readonly roomId: string
  readonly roll: RitualRoll
  /** Common bones actually put back. Zero is a real answer, at the ceiling. */
  readonly restored: number
  /** How many bones short of the ceiling the pile was, before the press. */
  readonly missingBefore: number
}

/**
 * What a room's objects have been left doing.
 *
 * A ritual is one press and one answer, so `RitualState` records a *result*.
 * These rooms are the other shape: several objects, each with its own settled
 * position, and an order between them that is the puzzle. So this records
 * **where everything is standing**, and nothing else.
 *
 * A discriminated union rather than a bag of optional fields, because the two
 * rooms share no object: a `brazier` on a vault would be a state the game
 * cannot reach, and `templateId` is what stops it being expressible.
 *
 * `templateId` is the one place in the whole of state where a *template* id
 * appears, and it is here because it is answering "what kind of machinery is
 * this", not "which room". Which room is the key these are stored under in
 * `run.rooms`, and that key is a **node** id — so two runs through the same
 * Reliquary template are two chests, two levers and two relics.
 *
 * What is deliberately absent is any clock. No frame index, no elapsed time, no
 * "is animating" — the settled position is the whole truth, every picture is
 * derived from it, and a reload paints the room from this and nothing else.
 * That is the same rule `combat.defeated` is built on.
 */
export type RoomInteractionState =
  | {
      readonly templateId: 'reliquary'
      readonly bellRung: boolean
      readonly brazier: 'lit' | 'out'
      readonly lever: 'up' | 'down'
      readonly chest: 'closed' | 'open'
      readonly claimed: boolean
      /**
       * What was inside, once it has been taken.
       *
       * Recorded rather than recomputed, for the same reason `RitualState`
       * records its roll: the draw happened once, in the reducer, and a reload
       * that re-derived it would be a second draw that is merely *likely* to
       * agree. Absent when the chest was empty — `claimed` is what says the
       * press happened, and an empty chest is a real answer.
       */
      readonly rewardId?: RewardId
    }
  | {
      readonly templateId: 'chain-vault'
      readonly chain: 'off' | 'on'
      readonly cage: 'raised' | 'lowered'
      readonly pressurePlate: 'off' | 'on'
      readonly lever: 'up' | 'down'
      readonly gate: 'closed' | 'open'
    }

export interface RunState {
  readonly seed: number
  /**
   * The descent, settled.
   *
   * Generated once by `START_RUN` and never again — not on a render, a
   * navigation, a reload, a CONTINUE or a fixture. The seed is what makes
   * generation reproducible; this is what makes the run *true*, and after the
   * press of START it is the only authority on where anything leads.
   */
  readonly map: RunMap
  /**
   * Which room of the map. A **node** id, not a template id.
   *
   * Everything below that names a room names one of these, for the reason
   * `game/map.ts` gives at length: a template used twice is two rooms, and
   * every scrap of per-room state has to be able to tell them apart.
   */
  readonly roomId: string

  // ── life ──────────────────────────────────────────────────────────────
  /** Anonymous bones. There is no such thing as *that* common bone. */
  readonly commonBones: number
  /** Named bones, each a distinct object, because each one's death matters. */
  readonly specials: readonly SpecialBoneInstance[]
  /** So two Cinderbones can never share an instance id. Monotonic. */
  readonly nextSpecialSerial: number

  // ── satchel ───────────────────────────────────────────────────────────
  /**
   * The one consumable. Charms are gone with the phase they were spent in —
   * a reroll needs a moment between seeing your throw and living with it, and
   * there is no such moment any more.
   */
  readonly vials: number

  /** Which details have been looked at, in the node being stood in. */
  readonly looked: readonly string[]
  /** Nodes whose enemy is already dead. */
  readonly cleared: readonly string[]
  /** Nodes visited, in order. */
  readonly path: readonly string[]
  /** What the last press said. The word band reads this. */
  readonly say: string
  readonly combat?: CombatState
  /** The ritual this run has resolved, and what it gave. */
  readonly ritual?: RitualState
  /**
   * Where each room's objects have been left, keyed by **node** id.
   *
   * Node, not template — so the same authored room used twice in one descent
   * has two independent chests. `stateOf` is where the two ids meet: the key
   * says which room, and the template says how that kind of room opens.
   *
   * Sparse on purpose: a room that has not been touched has no entry, and its
   * opening position is content rather than something a new run has to write
   * out. `initialRoomState` in `content/interactions.ts` is that opening
   * position, and it is the one place it is stated.
   */
  readonly rooms?: Readonly<Record<string, RoomInteractionState>>
  /** The things on offer, when `mode === 'reward'`. */
  readonly offer?: readonly RewardId[]
  /** Why the run ended. */
  readonly cause?: string
}

export interface MetaState {
  readonly runs: number
  readonly wins: number
  /** Everything ever carried, so the title screen has something to say. */
  readonly seenBones: readonly string[]
  readonly seenRewards: readonly string[]
}

export interface GameState {
  readonly version: number
  readonly mode: Mode
  readonly meta: MetaState
  readonly run?: RunState
  /**
   * Where CONTINUE goes.
   *
   * Boot always lands on the title, so the mode a reload interrupted has to be
   * carried somewhere the title screen is not overwriting. Deriving it instead
   * — *there is combat state, so we were fighting* — is what put the old build
   * back into a fight it had already died in.
   */
  readonly resume?: Mode
}

export const EMPTY_META: MetaState = { runs: 0, wins: 0, seenBones: [], seenRewards: [] }

export const TITLE: GameState = { version: SAVE_VERSION, mode: 'title', meta: EMPTY_META }
