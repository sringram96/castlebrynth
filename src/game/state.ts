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
 */

import type { Value } from '../content/dice.js'
import type { Reach } from '../content/enemies.js'
import type { HandName } from '../combat/scoring.js'

/** Bumped whenever the shape below changes. Old saves are not migrated. */
export const SAVE_VERSION = 4

export type Mode = 'title' | 'explore' | 'combat' | 'reward' | 'dead' | 'complete'

/** The three model phases of a turn. See docs/COMBAT.md. */
export type Phase = 'intent' | 'rolled' | 'rerolled'

/**
 * One die on the table.
 *
 * `slot` is its identity for the length of a fight — two Plain Bones are two
 * different dice and holding one must never hold the other. Nothing in the UI
 * is allowed to use a screen position as an identity.
 */
export interface RolledDie {
  readonly slot: number
  readonly dieId: string
  /** Which face came up, so the value and its keyword travel together. */
  readonly faceIndex: number
  readonly value: Value
}

export interface CombatState {
  readonly enemyId: string
  readonly enemyHp: number
  readonly enemyMaxHp: number
  /** 0-based. The intent is `intentAt(enemyId, turn)`. */
  readonly turn: number
  readonly phase: Phase
  /** Exactly `run.dice.length` entries, always. */
  readonly roll: readonly RolledDie[]
  /**
   * The dice you have chosen.
   *
   * One mark, not two. A chosen die is kept across the reroll *and* is the
   * hand you score — because those are the same thing a player means when
   * they tap a die, and a tap that means one of two things depending on a
   * phase they cannot see is a tap they will get wrong.
   */
  readonly selected: readonly number[]
  /** Hand families already scored, read only by first-of-fight relics. */
  readonly spentHands: readonly HandName[]
  /**
   * How far away the thing is standing, when it is a thing that closes.
   *
   * This is gameplay, not staging: it decides how many attacks are left before
   * contact, so it lives here and the reducer is the only thing that moves it.
   * Absent for an enemy with no approach ladder.
   *
   * Nothing in `render/` may own or advance it. A reload paints the reach the
   * save records, which is why the composition on screen can never disagree
   * with the number of turns the player has left.
   */
  readonly approach?: Reach
  /** Set once, when it arrived. Terminal: the run ended on this. */
  readonly reached?: boolean
  /** What just happened, for the word band and the beats. */
  readonly log: readonly string[]
}

/** What a die in a font can land on. */
export type RitualRoll = 1 | 2 | 3 | 4 | 5 | 6

/**
 * A ritual the run has already resolved.
 *
 * The authoritative record of one press: what it rolled, what that gave back,
 * and what was missing at the moment it was rolled. It exists so the answer
 * cannot be recomputed — a reload replays no draw, a second press finds the
 * room already answered, and the sequence on screen is reading this rather
 * than deciding anything.
 *
 * `missingBefore` is not needed to apply the heal; it is kept because it is
 * the only thing that makes the number legible after the fact, and because a
 * future ritual that recovers something other than health will want it.
 */
export interface RitualState {
  readonly roomId: string
  readonly roll: RitualRoll
  readonly healed: number
  readonly missingBefore: number
}

export interface RunState {
  readonly seed: number
  readonly roomId: string
  readonly hp: number
  readonly maxHp: number
  /** Six ids. Ordered; the order is the crown's order. */
  readonly dice: readonly string[]
  readonly relics: readonly string[]
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
  /** The three things on offer, when `mode === 'reward'`. */
  readonly offer?: readonly string[]
  /** Why the run ended. */
  readonly cause?: string
}

export interface MetaState {
  readonly runs: number
  readonly wins: number
  /** Everything ever carried, so the title screen has something to say. */
  readonly seenDice: readonly string[]
  readonly seenRelics: readonly string[]
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

export const EMPTY_META: MetaState = { runs: 0, wins: 0, seenDice: [], seenRelics: [] }

export const TITLE: GameState = { version: SAVE_VERSION, mode: 'title', meta: EMPTY_META }
