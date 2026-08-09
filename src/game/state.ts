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

/** Bumped whenever the shape below changes. Old saves are not migrated. */
export const SAVE_VERSION = 7

export type Mode = 'title' | 'explore' | 'combat' | 'reward' | 'dead' | 'complete'

/**
 * The four model phases of a round. See `docs/COMBAT.md`.
 *
 * The enemy has already thrown when a round begins, which is why the opening
 * phase is called `thrown` rather than something that implies the player is
 * waiting to be dealt to. The threat is public before any decision is made.
 */
export type CombatPhase = 'thrown' | 'fielded' | 'rolled' | 'smashed'

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
 * What the player committed to risk this round.
 *
 * Recorded as *width plus named specials* rather than as a list of bones,
 * because common bones are anonymous: there is no such thing as "that one".
 * The remainder — `width - specialIds.length` — is drawn from the pile.
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

  /** Set by FIELD. Absent until then, which is what `thrown` means. */
  readonly field?: PlayerField
  /** Set by THROW. Absent until then, which is what `fielded` means. */
  readonly playerLine?: readonly RolledBone[]

  /** One Charm per fight, spent or not. Carried across every round. */
  readonly charmUsed: boolean
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
 * What is deliberately absent is any clock. No frame index, no elapsed time, no
 * "is animating" — the settled position is the whole truth, every picture is
 * derived from it, and a reload paints the room from this and nothing else.
 * That is the same rule `combat.defeated` is built on.
 */
export type RoomInteractionState =
  | {
      readonly roomId: 'reliquary'
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
      readonly roomId: 'chain-vault'
      readonly chain: 'off' | 'on'
      readonly cage: 'raised' | 'lowered'
      readonly pressurePlate: 'off' | 'on'
      readonly lever: 'up' | 'down'
      readonly gate: 'closed' | 'open'
    }

export interface RunState {
  readonly seed: number
  readonly roomId: string

  // ── life ──────────────────────────────────────────────────────────────
  /** Anonymous bones. There is no such thing as *that* common bone. */
  readonly commonBones: number
  /** Named bones, each a distinct object, because each one's death matters. */
  readonly specials: readonly SpecialBoneInstance[]
  /** So two Cinderbones can never share an instance id. Monotonic. */
  readonly nextSpecialSerial: number

  // ── satchel ───────────────────────────────────────────────────────────
  readonly charms: number
  readonly vials: number

  /** Which details have been looked at, per room instance. */
  readonly looked: readonly string[]
  /** Rooms whose enemy is already dead. */
  readonly cleared: readonly string[]
  /** Rooms visited, in order. */
  readonly path: readonly string[]
  /** What the last press said. The word band reads this. */
  readonly say: string
  readonly combat?: CombatState
  /** The ritual this run has resolved, and what it gave. */
  readonly ritual?: RitualState
  /**
   * Where each room's objects have been left, keyed by room id.
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
