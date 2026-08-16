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
 * ## The pile is the player
 *
 * A run's life is `run.bones`, and there is no second life field: no `hp`, no
 * `maxHp`, no shield, no armour. A hit removes bones from the pile, and
 * because an attack rolls `min(6, bones)`, being hurt directly narrows the
 * dice game. Enemies *do* carry an explicit `enemyHp`, deliberately — see
 * `docs/COMBAT.md`.
 */

import type { ScoreId, NamedHandId } from '../combat/hands.js'
import type { DieValue } from '../combat/roll.js'
import type { RewardId } from '../content/rewards.js'
import type { RunMap } from './map.js'

/**
 * Bumped whenever the shape below changes. Old saves are not migrated.
 *
 * **9.** The Yahtzee reset changed the run's life from a two-part pile to one
 * number and replaced the whole of `CombatState`, so a save written by 8 has a
 * shape this build cannot read. There is no migration ladder and there is not
 * going to be one: an old save is detected, discarded, and reported.
 */
export const SAVE_VERSION = 9

export type Mode = 'title' | 'explore' | 'combat' | 'reward' | 'dead' | 'complete'

/**
 * One settled exchange, in full.
 *
 * Written by SCORE before a frame of it is shown, and read by the presentation
 * in order. Every number the sequence says out loud is on here: the animation
 * reveals an outcome the reducer already computed, and it recomputes nothing.
 */
export interface AttackRecord {
  /** The faces that were on the table when the hand was scored. */
  readonly dice: readonly DieValue[]
  readonly hand: ScoreId
  readonly sum: number
  readonly multiplier: number
  readonly damage: number

  readonly enemyHpBefore: number
  readonly enemyHpAfter: number

  /** What it broke in answer. Zero when the attack finished it. */
  readonly retaliation: number
  readonly bonesBefore: number
  readonly bonesAfter: number
}

/**
 * A fight in progress.
 *
 * Small, serialisable, and with no phase enum: the position is derivable and
 * saying it twice is how two fields come to disagree.
 *
 *   `dice.length === 0`                 waiting for the initial ROLL
 *   `dice.length > 0 && rollsUsed < 3`  may SCORE or REROLL
 *   `dice.length > 0 && rollsUsed === 3` must SCORE
 *
 * What is *not* here is as deliberate: no held flags, because a hold is a
 * thought the view is editing and a reload may forget it; no enemy dice,
 * because the enemy rolls nothing; and no clock anywhere, because a frame is
 * not a fact about a run.
 */
export interface CombatState {
  readonly enemyId: string
  /** 1-based attack round. Round 1 is the fight opening. */
  readonly round: number

  readonly enemyHp: number
  readonly enemyMaxHp: number

  /** Named categories deliberately scored during this fight. CRAP is never here. */
  readonly usedHands: readonly NamedHandId[]

  /** The current attack's dice. Empty before the initial roll of a round. */
  readonly dice: readonly DieValue[]
  /** 0 before rolling, then 1..3. */
  readonly rollsUsed: 0 | 1 | 2 | 3

  /** The last settled exchange, for the copy and the beats. */
  readonly lastAttack?: AttackRecord
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
  /**
   * The pile. One number, and it is the player's whole life.
   *
   * It is also the width of the next attack: a hand rolls `min(6, bones)`, so
   * damage narrows the dice game rather than merely counting down. There is no
   * second life field anywhere and there is not to be one.
   */
  readonly bones: number

  // ── satchel ───────────────────────────────────────────────────────────
  /** The one consumable. */
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
  /** Everything ever found, so the title screen has something to say. */
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

export const EMPTY_META: MetaState = { runs: 0, wins: 0, seenRewards: [] }

export const TITLE: GameState = { version: SAVE_VERSION, mode: 'title', meta: EMPTY_META }
