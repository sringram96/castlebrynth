/**
 * Every state transition in the game, as one pure function.
 *
 * Nothing else in the codebase may produce a `GameState`. Views read state and
 * dispatch actions; they never compute an outcome, and they never decide which
 * mode they are in.
 *
 * The reducer is total: an action that does not apply to the current state
 * returns the state unchanged. That is a safety net, not a design — the UI's
 * rule is that an unavailable action is *not offered*, so a dispatch that
 * changes nothing should be unreachable from a press.
 */

import { STARTING_BONES, roomToRecover } from '../content/bones.js'
import { LOOT_REWARDS, reward } from '../content/rewards.js'
import type { RewardId } from '../content/rewards.js'
import { enemy } from '../content/enemies.js'
import type { Enemy } from '../content/enemies.js'
import { defeatOf } from '../content/defeat.js'
import { exitsOpen, legal, stateOf } from '../content/interactions.js'
import {
  legalScores,
  scoreDice,
  scoreName,
} from '../combat/hands.js'
import type { NamedHandId, ScoreId } from '../combat/hands.js'
import { MAX_ROLLS, activeDice, canonicalHeld, rerollDice, rollDice } from '../combat/roll.js'
import { roomAt } from './map.js'
import { generateRun } from './runGenerator.js'
import { RELIQUARY_CHANNEL, RITUAL_CHANNEL, RNG_CHANNEL, combatSalt, rngAt } from './rng.js'
import type { Rng } from './rng.js'
import { SAVE_VERSION } from './state.js'
import type {
  AttackRecord,
  CombatState,
  GameState,
  MetaState,
  RitualRoll,
  RoomInteractionState,
  RunState,
} from './state.js'

export type Action =
  | { readonly type: 'START_RUN'; readonly seed?: number }
  | { readonly type: 'TITLE' }
  | { readonly type: 'CONTINUE' }
  | { readonly type: 'LOOK'; readonly detailId: string }
  | { readonly type: 'GO'; readonly to: string }
  | { readonly type: 'FIGHT' }
  /** Throw the bones the pile can put up. Once per attack, and first. */
  | { readonly type: 'ROLL' }
  /**
   * Throw again, keeping what was held.
   *
   * It carries the decision, because the decision is the player's and the view
   * is not what makes it legal: `held` is a bare list of positions, and the
   * reducer canonicalises it — unique, in range, sorted — before a die moves.
   * A stale index from a wider roll changes nothing; a repeat of the same
   * index changes nothing; and a reroll with everything held is refused rather
   * than charged, because it is not a throw.
   *
   * The selection itself lives in the **view** until this moment. It is a
   * thought, not a move, and a reload before the press loses an unfinished
   * thought rather than granting another roll.
   */
  | { readonly type: 'REROLL'; readonly held: readonly number[] }
  /** Commit the dice as one hand. The whole attack, in one tick. */
  | { readonly type: 'SCORE'; readonly hand: ScoreId }
  | { readonly type: 'DRINK' }
  | { readonly type: 'TAKE'; readonly id: RewardId }
  /** Leave it. A reward screen may never force a change on the run. */
  | { readonly type: 'SKIP' }
  | { readonly type: 'RITUAL_ROLL' }
  /**
   * Work one of the room's objects.
   *
   * **One action for every object in every room**, carrying nothing but which
   * thing was pressed. Seven action types — RING, EXTINGUISH, PULL_LEVER — is
   * the same rule written seven times, and it puts the room's logic in whoever
   * dispatches: a view that has to know *which* action to send has already
   * decided what the press means. This carries an id, and `content/
   * interactions.ts` decides the rest.
   */
  | { readonly type: 'INTERACT'; readonly interactionId: string }
  /**
   * The death has been shown. Pack the fight away.
   *
   * The only way out of `combat.defeated`, and the one place a win is granted
   * for a horror whose death is played. It carries nothing: everything it
   * needs was decided by the SCORE that killed the thing, so a second press,
   * a stuck timer or a reload cannot make it pay twice.
   */
  | { readonly type: 'DEFEAT_DONE' }

// ── the font ───────────────────────────────────────────────────────────

/**
 * What a face of the font gives back, in bones.
 *
 * `d6 + 2`, capped by the room left under the ceiling. Flat and legible: a
 * player can read the die and know the answer before the basin says it, which
 * is what a healing room in a push-your-luck game is for. The worst face is
 * still worth three bones, so a press is never a wasted press unless the pile
 * is already full — and at full it says so plainly rather than paying nothing
 * and looking broken.
 */
export const FONT_BONUS = 2

export function fontRestore(roll: RitualRoll, room: number): number {
  return Math.max(0, Math.min(roll + FONT_BONUS, room))
}

/** What one Vial puts back, before the ceiling is applied. */
export const VIAL_BONES = 5

const NUMBER: readonly string[] = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

/**
 * What the room says about what just happened.
 *
 * The face is already on screen and readable, so the line names it rather than
 * repeating it as a digit, states the bones, and stops.
 */
function ritualSay(roll: RitualRoll, restored: number): string {
  if (restored === 0) return `${NUMBER[roll]}. The basin turns. The pile is already full.`
  if (restored === 1) return `${NUMBER[roll]}. One bone clatters back into the pile.`
  return `${NUMBER[roll]}. ${restored} bones clatter back into the pile.`
}

// ── helpers ────────────────────────────────────────────────────────────

const remember = (meta: MetaState, rewards: readonly string[]): MetaState => ({
  ...meta,
  seenRewards: [...new Set([...meta.seenRewards, ...rewards])],
})

/** The run's generator, positioned by how much of the run has happened. */
function rngFor(run: RunState, salt: number): Rng {
  return rngAt(run.seed, salt)
}

/**
 * Where one draw of a fight sits: the path, the round, which roll, which
 * channel.
 *
 * Four terms rather than three, because an attack draws up to three times
 * before it is scored. Derived and never stored, so a reload before ROLL and a
 * press of ROLL land on the same faces, and a REROLL replayed with the same
 * held positions lands on the same faces again.
 */
function fightRng(run: RunState, round: number, rollNumber: number, channel: number): Rng {
  return rngFor(run, combatSalt(run.path.length, round, rollNumber, channel))
}

/**
 * Where the font's one draw sits in the same stream.
 *
 * The same rule as a fight: seed plus history, derived rather than stored, so
 * a save can never disagree with it. There is no round here — the room is one
 * press — so the position is the path length and a constant of its own.
 */
function ritualSalt(run: RunState): number {
  return run.path.length * 1013 + RITUAL_CHANNEL
}

/** And the reliquary's, with a constant that keeps it clear of both. */
function reliquarySalt(run: RunState): number {
  return run.path.length * 1013 + RELIQUARY_CHANNEL
}

/**
 * Draw one id, weighted, and take it out of the pool.
 *
 * Rarity lives on the reward rather than in a table curated per enemy, so the
 * cadence of the whole slice can be read in `content/rewards.ts`. Within one
 * offer the draw is without replacement, so a screen never shows the same card
 * twice — and a pool that runs dry simply offers fewer.
 */
function drawWeighted(pool: RewardId[], rng: Rng): RewardId | undefined {
  if (pool.length === 0) return undefined
  const total = pool.reduce((sum, id) => sum + reward(id).weight, 0)
  let ticket = rng.next() * total
  for (let i = 0; i < pool.length; i++) {
    ticket -= reward(pool[i]!).weight
    if (ticket < 0) return pool.splice(i, 1)[0]!
  }
  return pool.pop()!
}

/**
 * What is in the chest, or nothing because there is nothing left to give.
 *
 * A single found object, so it is drawn and granted in the same tick the chest
 * is opened, and `rooms[].rewardId` records which — a reload reads that rather
 * than drawing again. An empty answer is a real one, and the room says so
 * plainly rather than leaving it looking like the offer screen failed.
 */
function chestReward(run: RunState, rng: Rng): RewardId | undefined {
  return drawWeighted([...LOOT_REWARDS], rng)
}

/** What the room says about a press that changed something. */
function interactionSay(after: RoomInteractionState, id: string, found?: RewardId): string {
  if (after.templateId === 'reliquary') {
    if (id === 'reliquary-bell') return 'The bell answers once. Something shifts behind the altar.'
    if (id === 'reliquary-brazier') {
      return after.brazier === 'out'
        ? 'The flame folds into the wick. In the dark, the handle under the basin catches the red window-light.'
        : 'The flame returns.'
    }
    if (id === 'reliquary-lever') return 'Something moves inside the altar. The chest answers.'
    return found ? `Inside: ${reward(found).name}.` : 'The chest is empty.'
  }
  if (id === 'vault-chain') {
    return after.cage === 'lowered'
      ? 'The cage drops onto the plate. Something heavy unlocks inside the wall.'
      : 'The chain takes the weight again. The plate comes back up.'
  }
  return 'The weight holds. The lever stays down. The gate rises.'
}

/** What the vault kills you with, when it does. */
const VAULT_CAUSE = 'The chain mechanism.'

/**
 * Take one bone out of the pile, for something that is not a fight.
 *
 * One helper, so every non-combat cost in the game — the vault's backlash
 * today, whatever wants one next — spends the pile the same way. The pile is
 * one number now, so this is one subtraction, and it answers whether there was
 * anything left to take.
 */
export function loseOneBone(run: RunState): {
  readonly run: RunState
  readonly took: boolean
} {
  if (run.bones <= 0) return { run, took: false }
  return { run: { ...run, bones: run.bones - 1 }, took: true }
}

/**
 * Put bones back, never above the ceiling.
 *
 * The one place recovery arithmetic lives. It answers with what it actually
 * gave, because zero is a real answer and the copy has to be able to say so.
 */
function recover(run: RunState, wanted: number): { readonly run: RunState; readonly gave: number } {
  const gave = Math.max(0, Math.min(wanted, roomToRecover(run)))
  return { run: gave === 0 ? run : { ...run, bones: run.bones + gave }, gave }
}

/**
 * A run at its waking.
 *
 * Thirty bones, an empty satchel, and no trace of the run before it. Note what
 * is absent: `combat`, `offer` and `cause`, which is the invariant the
 * stuck-on-death bug turned on.
 */
export function newRun(seed: number): RunState {
  // The descent is generated here, once, and stored. Everything after this
  // point reads the map; nothing anywhere rebuilds it. See `runGenerator.ts`.
  const map = generateRun(seed >>> 0)
  const run: RunState = {
    seed: seed >>> 0,
    map,
    roomId: map.start,
    bones: STARTING_BONES,
    vials: 0,
    looked: [],
    cleared: [],
    path: [map.start],
    say: '',
  }
  return { ...run, say: roomAt(run).arrival }
}

// ── the fight ──────────────────────────────────────────────────────────

/** Open a fight against the room's enemy. It rolls nothing. */
function beginCombat(run: RunState): CombatState {
  const id = roomAt(run).enemy
  if (!id) throw new Error(`${run.roomId} has no enemy`)
  const e = enemy(id)
  return {
    enemyId: id,
    round: 1,
    enemyHp: e.maxHp,
    enemyMaxHp: e.maxHp,
    usedHands: [],
    dice: [],
    rollsUsed: 0,
    log: e.rule ? [e.tell, e.rule] : [e.tell],
  }
}

/** Whether a fight is live: open, not won, not being watched dying. */
function live(state: GameState, run: RunState | undefined): run is RunState {
  return state.mode === 'combat' && !!run?.combat && !run.combat.defeated
}

/** How a multiplier prints. `2`, `1.25`, `0.5` — never `2.00`. */
function showMultiplier(multiplier: number): string {
  return String(multiplier)
}

/** What an exchange did, in beats, for the word band. */
function attackSay(e: Enemy, record: AttackRecord): readonly string[] {
  const beats: string[] = [
    `${scoreName(record.hand)}. ${record.sum} × ${showMultiplier(record.multiplier)} — ${record.damage}.`,
    `${e.name}: ${record.enemyHpBefore} → ${Math.max(0, record.enemyHpAfter)}.`,
  ]
  if (record.enemyHpAfter <= 0) {
    beats.push('It stops.')
  } else if (record.bonesAfter === 0) {
    beats.push(`It breaks ${record.retaliation}. That was all of them.`)
  } else {
    beats.push(
      `It breaks ${record.retaliation} of mine. ${record.bonesBefore} → ${record.bonesAfter} bones.`,
    )
  }
  return beats
}

/**
 * What a win offers, if it offers anything.
 *
 * Two decisions, in this order, both off the run's own generator so a reload
 * cannot change either:
 *
 *   1. **did it drop?** — `rewardChance`, and the number is always drawn, so
 *      whether a fight paid can never depend on what was left in the pool;
 *   2. **what?** — `rewardChoices` drawn without replacement from the enemy's
 *      table, weighted by rarity.
 *
 * Nothing is padded *up*: if one thing remains, one is offered. An empty
 * return is a real answer — the fight gave nothing — and the room says so
 * plainly rather than leaving it looking like the offer screen failed.
 */
export function offerFor(run: RunState, enemyId: string, rng: Rng): readonly RewardId[] {
  // An enemy that declares no reward gives none. That is content saying so,
  // not a table that happened to run dry — the boss stands at the way out, and
  // the open door is the reward.
  const e = enemy(enemyId)
  if (e.rewards.length === 0 || e.rewardChoices === 0) return []
  if (rng.next() >= e.rewardChance) return []

  const pool = [...e.rewards]
  const out: RewardId[] = []
  while (out.length < e.rewardChoices) {
    const drawn = drawWeighted(pool, rng)
    if (!drawn) break
    out.push(drawn)
  }
  return out
}

/**
 * The fight is over and the room is yours.
 *
 * The one place a win is granted, called from exactly two: the SCORE that
 * emptied a health total with no death to show, and the `DEFEAT_DONE` that
 * ends one that had. Both hand it the same `run` — the pile already settled —
 * and both get the same answer, because everything it draws on comes from the
 * run's own generator at a fixed position. A death that is watched and a death
 * that is skipped pay identically, and neither can pay twice: `combat` is gone
 * from the state it returns, so a second call has no fight left to win.
 *
 * The guaranteed drop is applied **first and once**, inside here, so the
 * Marrow's Vial does not ride on the 70% that decides whether a screen opens.
 */
function victory(state: GameState, run: RunState, combat: CombatState): GameState {
  const e = enemy(combat.enemyId)
  const paid = e.drop ? grant(run, e.drop) : run
  const dropped = e.drop ? ` It leaves a ${reward(e.drop).name}.` : ''

  const rng = fightRng(paid, combat.round, 0, RNG_CHANNEL.reward)
  const offer = offerFor(paid, combat.enemyId, rng)
  const { combat: _gone, ...rest } = paid
  const meta = e.drop ? remember(state.meta, [e.drop]) : state.meta
  const cleared = { ...rest, cleared: [...paid.cleared, paid.roomId], say: '' }

  // A fight with nothing left to give goes straight back to the room. Said
  // plainly, so an empty-handed win never reads as the reward screen having
  // failed to open.
  if (offer.length === 0) {
    return {
      ...state,
      mode: 'explore',
      meta,
      run: { ...cleared, say: `${e.name} is finished.${dropped || ' Nothing useful on it.'}` },
    }
  }
  return { ...state, mode: 'reward', meta, run: { ...cleared, offer } }
}

/** Put one reward where it belongs. The only place a TAKE means anything. */
function grant(run: RunState, id: RewardId): RunState {
  return reward(id).kind === 'vial' ? { ...run, vials: run.vials + 1 } : run
}

/** The run is over, with the fight it ended in still on the plate. */
function died(state: GameState, run: RunState, combat: CombatState, cause: string): GameState {
  return { ...state, mode: 'dead', run: { ...run, combat, cause } }
}

// ── the reducer ────────────────────────────────────────────────────────

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TITLE': {
      // Stepping back to the door remembers where you were, so CONTINUE means
      // the same thing whether you got here by pressing TITLE or by reloading.
      // Only a *live* mode is remembered: a run that has ended is not
      // somewhere the door may offer to send you back to.
      const alive: readonly string[] = ['explore', 'combat', 'reward']
      const resume = state.mode === 'title' ? state.resume : state.mode
      return { ...state, mode: 'title', ...(resume && alive.includes(resume) ? { resume } : {}) }
    }

    case 'START_RUN': {
      // Death to a new run is one press. It builds the run synchronously and
      // enters explore in the same transition — no intermediate screen, no
      // reload, and nothing of the old run survives. `resume` is dropped with
      // it, because there is no longer anything to go back to.
      const seed = action.seed ?? ((Date.now() ^ (state.meta.runs * 2654435761)) >>> 0)
      const meta = { ...state.meta, runs: state.meta.runs + 1 }
      return { version: SAVE_VERSION, mode: 'explore', meta, run: newRun(seed) }
    }

    case 'CONTINUE': {
      if (!state.run || !state.resume) return state
      return { ...state, mode: state.resume }
    }

    case 'LOOK': {
      const run = state.run
      if (!run) return state
      const detail = roomAt(run).details.find((d) => d.id === action.detailId)
      if (!detail) return state
      return {
        ...state,
        run: {
          ...run,
          say: detail.says,
          looked: run.looked.includes(action.detailId) ? run.looked : [...run.looked, action.detailId],
        },
      }
    }

    case 'GO': {
      const run = state.run
      if (!run || state.mode !== 'explore') return state
      const here = roomAt(run)
      // A room with a living enemy has no exits. The fight is the way out.
      if (here.enemy && !run.cleared.includes(run.roomId)) return state
      // A room with an unresolved ritual has none either, for the same reason:
      // the thing in the middle of it *is* the room. The exit is withheld here,
      // in state, rather than hidden by a view — so no dispatch, no fixture and
      // no reload can walk past it.
      if (here.ritual && run.ritual?.roomId !== run.roomId) return state
      // And a room whose machinery is still shut holds its exits the same way,
      // for the same reason. The check is here, in state, rather than in the
      // view that draws the button — so no dispatch, no fixture and no reload
      // can walk through a gate that is down.
      if (!exitsOpen(stateOf(run.rooms, run.roomId, here.id))) return state
      // The **generated** exits, not the template's — a template has none. The
      // reducer is the authority on where a press may go, and the map is the
      // authority it reads.
      if (!here.exits.some((e) => e.to === action.to)) return state

      const next = roomAt(run, action.to)
      const moved: RunState = {
        ...run,
        roomId: action.to,
        path: [...run.path, action.to],
        looked: [],
        say: next.arrival,
      }
      if (next.ending) {
        return {
          ...state,
          mode: 'complete',
          meta: { ...state.meta, wins: state.meta.wins + 1 },
          run: moved,
        }
      }
      return { ...state, mode: 'explore', run: moved }
    }

    case 'FIGHT': {
      const run = state.run
      if (!run || state.mode !== 'explore' || run.combat) return state
      if (!roomAt(run).enemy || run.cleared.includes(run.roomId)) return state
      if (run.bones === 0) return state
      return { ...state, mode: 'combat', run: { ...run, combat: beginCombat(run), say: '' } }
    }

    /**
     * The bones the pile can put up, thrown.
     *
     * `min(6, bones)` of them, and never more than are alive — which is the
     * whole of the wounded rule. A player down to four bones rolls four dice,
     * a Full House stops being reachable, and no line of code anywhere says so
     * on purpose.
     */
    case 'ROLL': {
      const run = state.run
      const combat = run?.combat
      if (!live(state, run) || !combat) return state
      if (combat.dice.length > 0 || combat.rollsUsed !== 0) return state

      const width = activeDice(run.bones)
      if (width === 0) return state

      const dice = rollDice(width, fightRng(run, combat.round, 1, RNG_CHANNEL.playerRoll))
      return {
        ...state,
        run: { ...run, say: '', combat: { ...combat, dice, rollsUsed: 1, log: [] } },
      }
    }

    /**
     * Throw the unheld bones again.
     *
     * Refused rather than charged when everything is held: a throw in which
     * nothing moves is not a throw, and spending one of two rerolls on it
     * would be the interface taking a press the player did not mean to make.
     */
    case 'REROLL': {
      const run = state.run
      const combat = run?.combat
      if (!live(state, run) || !combat) return state
      if (combat.dice.length === 0) return state
      if (combat.rollsUsed < 1 || combat.rollsUsed >= MAX_ROLLS) return state

      const held = canonicalHeld(action.held, combat.dice.length)
      if (held.length === combat.dice.length) return state

      const rollNumber = combat.rollsUsed + 1
      const dice = rerollDice(
        combat.dice,
        held,
        fightRng(run, combat.round, rollNumber, RNG_CHANNEL.playerRoll),
      )
      return {
        ...state,
        run: {
          ...run,
          say: '',
          combat: { ...combat, dice, rollsUsed: rollNumber as 2 | 3, log: [] },
        },
      }
    }

    /**
     * The attack, committed.
     *
     * The legal set is recomputed here and the request is checked against it,
     * because the UI's claim that a score is legal is not what makes it legal.
     * Everything after that is arithmetic with no randomness in it at all:
     * damage is `max(1, floor(sum × multiplier))`, the hit lands, and a thing
     * still standing breaks exactly `enemy.damage` bones in answer.
     */
    case 'SCORE': {
      const run = state.run
      const combat = run?.combat
      if (!live(state, run) || !combat) return state
      if (combat.dice.length === 0) return state
      if (!legalScores(combat.dice, combat.usedHands).includes(action.hand)) return state

      const e = enemy(combat.enemyId)
      const { sum, multiplier, damage } = scoreDice(combat.dice, action.hand)
      const enemyHp = Math.max(0, combat.enemyHp - damage)
      const killed = enemyHp === 0

      // A dead thing does not answer. The kill happened first, and it happened
      // whatever the pile was down to.
      const retaliation = killed ? 0 : e.damage
      const bones = Math.max(0, run.bones - retaliation)

      const record: AttackRecord = {
        dice: combat.dice,
        hand: action.hand,
        sum,
        multiplier,
        damage,
        enemyHpBefore: combat.enemyHp,
        enemyHpAfter: enemyHp,
        retaliation,
        bonesBefore: run.bones,
        bonesAfter: bones,
      }

      // CRAP is never written down. It is what the legal set *is* when nothing
      // named qualifies, so it cannot be spent and cannot run out.
      const usedHands: readonly NamedHandId[] =
        action.hand === 'crap' ? combat.usedHands : [...combat.usedHands, action.hand]

      const settled: RunState = { ...run, bones }
      const after: CombatState = {
        ...combat,
        enemyHp,
        usedHands,
        dice: [],
        rollsUsed: 0,
        lastAttack: record,
        log: attackSay(e, record),
      }

      if (killed) {
        // A horror whose death has been authored keeps the fight open on it.
        // The room is *not* cleared, no offer is drawn and no screen changes:
        // the state says only that the thing is finished and is being watched
        // finishing, and `DEFEAT_DONE` is the single transition out.
        if (defeatOf(combat.enemyId)) {
          return { ...state, run: { ...settled, combat: { ...after, defeated: true } } }
        }
        return victory(state, { ...settled, combat: after }, after)
      }

      if (bones === 0) {
        return died(state, settled, after, `${e.name} — the last of my bones.`)
      }

      // The next attack begins here, in the same tick. There is no ROUND
      // button: the score *is* the commitment, and what follows it is another
      // empty table waiting for ROLL.
      return {
        ...state,
        run: { ...settled, combat: { ...after, round: combat.round + 1 } },
      }
    }

    case 'DRINK': {
      const run = state.run
      if (!run || run.vials <= 0) return state
      // Everywhere the player still has a decision to make. Not over a death,
      // and not on a screen that is not the room or the fight.
      if (state.mode === 'combat') {
        if (!run.combat || run.combat.defeated) return state
      } else if (state.mode !== 'explore') {
        return state
      }
      if (roomToRecover(run) === 0) return state

      const { run: filled, gave } = recover(run, VIAL_BONES)
      return {
        ...state,
        run: {
          ...filled,
          vials: run.vials - 1,
          say: `${gave} ${gave === 1 ? 'bone' : 'bones'} back. ${filled.bones} in all.`,
        },
      }
    }

    case 'DEFEAT_DONE': {
      const run = state.run
      const combat = run?.combat
      // Once. A fight that is not being held open on a death has nothing here
      // to finish — which covers the second timer, the reload that fired one
      // of its own, and the press that arrived after the win already landed.
      if (!run || !combat || !combat.defeated || state.mode !== 'combat') return state
      return victory(state, run, combat)
    }

    case 'RITUAL_ROLL': {
      const run = state.run
      if (!run || state.mode !== 'explore') return state
      const here = roomAt(run)
      if (!here.ritual) return state
      // Once. The room has already answered, so a second press has nothing
      // left to decide — which is the same sentence that makes a reload
      // unable to reroll it and a held thumb unable to farm it.
      if (run.ritual?.roomId === run.roomId) return state

      const roll = (rngFor(run, ritualSalt(run)).int(6) + 1) as RitualRoll
      const missingBefore = roomToRecover(run)
      const { run: filled, gave } = recover(run, fontRestore(roll, missingBefore))
      return {
        ...state,
        run: {
          ...filled,
          ritual: { roomId: run.roomId, roll, restored: gave, missingBefore },
          say: ritualSay(roll, gave),
        },
      }
    }

    case 'INTERACT': {
      const run = state.run
      if (!run || state.mode !== 'explore') return state
      const here = roomAt(run)
      // The room has to declare it. An id that belongs to another room — a
      // stale press, a hand-made dispatch — is not a thing you are standing in
      // front of.
      if (!here.interactables?.some((i) => i.id === action.interactionId)) return state
      const before = stateOf(run.rooms, run.roomId, here.id)
      if (!before) return state
      // And it has to be offered *now*. This is the same call the view makes to
      // decide whether to draw a button at all, so a press that reaches here
      // illegally — a double tap, a repeat of a spent action — changes nothing.
      if (!legal(before, action.interactionId)) return state

      const id = action.interactionId
      const put = (next: RoomInteractionState, rest: Partial<RunState> = {}): GameState => ({
        ...state,
        run: {
          ...run,
          ...rest,
          rooms: { ...run.rooms, [run.roomId]: next },
          say: rest.say ?? interactionSay(next, id),
        },
      })

      if (before.templateId === 'reliquary') {
        switch (id) {
          case 'reliquary-bell':
            return put({ ...before, bellRung: true })
          case 'reliquary-brazier':
            return put({ ...before, brazier: before.brazier === 'lit' ? 'out' : 'lit' })
          case 'reliquary-lever':
            // The chest is authoritatively open *here*, in the same tick as the
            // lever going down, and is in the save before a frame of the stone
            // moving has been scheduled.
            return put({ ...before, lever: 'down', chest: 'open' })
          default: {
            const found = chestReward(run, rngFor(run, reliquarySalt(run)))
            const next: RoomInteractionState = {
              ...before,
              claimed: true,
              ...(found ? { rewardId: found } : {}),
            }
            // Granted in the same transition it is drawn in. There is no offer
            // to re-enter and no second press to make, which is the whole of
            // why this cannot pay twice: `claimed` is already true.
            const paid = found ? grant(run, found) : run
            return {
              ...state,
              meta: found ? remember(state.meta, [found]) : state.meta,
              run: {
                ...paid,
                rooms: { ...run.rooms, [run.roomId]: next },
                say: interactionSay(next, id, found),
              },
            }
          }
        }
      }

      if (id === 'vault-chain') {
        const lowering = before.cage === 'raised'
        return put({
          ...before,
          chain: lowering ? 'on' : 'off',
          cage: lowering ? 'lowered' : 'raised',
          pressurePlate: lowering ? 'on' : 'off',
        })
      }

      // The lever. Nothing on the plate means the mechanism has nothing to bear
      // against, and it comes back through your hand — and it takes a bone for
      // it. One bone, every time.
      if (before.pressurePlate === 'off') {
        const { run: paid, took } = loseOneBone(run)
        const gone = paid.bones === 0
        const hurt: RunState = {
          ...paid,
          say: took
            ? 'The mechanism snaps back. The chain catches my hand. One of my bones snaps.'
            : 'The mechanism snaps back. There is nothing left of me for it to take.',
          ...(gone ? { cause: VAULT_CAUSE } : {}),
        }
        // A room may kill you, and it uses the death the game already has. The
        // player can make this mistake as many times as they have bones for.
        return { ...state, ...(gone ? { mode: 'dead' as const } : {}), run: hurt }
      }
      return put({ ...before, lever: 'down', gate: 'open' })
    }

    case 'TAKE': {
      const run = state.run
      if (!run || state.mode !== 'reward' || !run.offer || !run.offer.includes(action.id)) return state
      const { offer: _taken, ...rest } = run
      const taken = reward(action.id)
      const paid = grant(rest, action.id)
      return {
        ...state,
        mode: 'explore',
        meta: remember(state.meta, [action.id]),
        run: {
          // A pickup repeats the thing's actual rule. "Vial. Taken." confirms
          // a press and explains nothing, and sending the player to MENU to
          // find out what they just chose is the same failure again.
          ...paid,
          say: `${taken.name} taken. ${taken.rule}`,
        },
      }
    }

    case 'SKIP': {
      const run = state.run
      if (!run || state.mode !== 'reward' || !run.offer) return state
      const { offer: _left, ...rest } = run
      return { ...state, mode: 'explore', run: { ...rest, say: 'I leave it where it fell.' } }
    }
  }

  // Total, including for an action the union does not contain.
  //
  // TypeScript makes the switch above exhaustive, so this line is unreachable
  // from typed code — and it is here precisely for the code that is not typed:
  // a stale `THROW` from a bookmarked console, a dispatch from a build that
  // had a verb this one does not. Falling off the end would return `undefined`
  // and hand the app a state with no mode, which is the class of bug the
  // explicit `mode` field exists to make impossible.
  return state
}

/** The living pile, for anything outside the reducer that needs the number. */
export function livingBones(state: GameState): number {
  return state.run?.bones ?? 0
}

/** Everything the run is carrying, named, for a summary screen. */
export function carriedNames(run: RunState): readonly string[] {
  return run.vials > 0 ? [run.vials > 1 ? `Vial ×${run.vials}` : 'Vial'] : []
}
