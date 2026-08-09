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

import {
  BONE_CEILING,
  STARTING_BONES,
  isSpecialBoneId,
  newSpecial,
  roomToRecover,
  specialBone,
  totalBones,
} from '../content/bones.js'
import type { SpecialBoneInstance } from '../content/bones.js'
import { LOOT_REWARDS, isBoneReward, reward } from '../content/rewards.js'
import type { RewardId } from '../content/rewards.js'
import { armyOf, armySize, enemy } from '../content/enemies.js'
import { defeatOf } from '../content/defeat.js'
import { FIRST_ROOM, room } from '../content/rooms.js'
import { exitsOpen, legal, stateOf } from '../content/interactions.js'
import {
  LINE_WIDTH,
  enemyField,
  recharmLine,
  rollEnemyLine,
  rollPlayerLine,
} from '../combat/line.js'
import { resolveSmash } from '../combat/clash.js'
import { RELIQUARY_CHANNEL, RITUAL_CHANNEL, RNG_CHANNEL, combatSalt, rngAt } from './rng.js'
import type { Rng } from './rng.js'
import { SAVE_VERSION } from './state.js'
import type {
  CombatState,
  EnemyBoneInstance,
  GameState,
  MetaState,
  RitualRoll,
  RolledBone,
  RoomInteractionState,
  RunState,
  SmashRecord,
} from './state.js'

export type Action =
  | { readonly type: 'START_RUN'; readonly seed?: number }
  | { readonly type: 'TITLE' }
  | { readonly type: 'CONTINUE' }
  | { readonly type: 'LOOK'; readonly detailId: string }
  | { readonly type: 'GO'; readonly to: string }
  | { readonly type: 'FIGHT' }
  /**
   * Commit the whole field in one action.
   *
   * Width and specials arrive together because they are one decision. While
   * the phase is `thrown` the player is editing a **draft** that lives in the
   * view — nudging a stepper, lighting a bone in the pouch — and none of that
   * is a move: a reload before FIELD loses nothing but an unfinished thought,
   * and a save can never hold a half-selected army. This is the tick where the
   * decision becomes a fact, and the reducer validates all of it at once
   * rather than duplicating the rules across a run of little actions.
   */
  | { readonly type: 'FIELD'; readonly width: number; readonly specialIds: readonly string[] }
  | { readonly type: 'THROW' }
  | { readonly type: 'CHARM'; readonly boneKey: string }
  | { readonly type: 'SMASH' }
  | { readonly type: 'ROUND' }
  | { readonly type: 'DRINK' }
  | { readonly type: 'TAKE'; readonly id: RewardId }
  /** Leave it. A reward screen may never force a change to the army. */
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
   * needs was decided by the SMASH that killed the thing, so a second press,
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
 *
 * It restores **common bones only**. Nothing in the game resurrects a named
 * special: that is the whole weight of fielding one.
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

const remember = (meta: MetaState, bones: readonly string[], rewards: readonly string[]): MetaState => ({
  ...meta,
  seenBones: [...new Set([...meta.seenBones, ...bones])],
  seenRewards: [...new Set([...meta.seenRewards, ...rewards])],
})

/** The run's generator, positioned by how much of the run has happened. */
function rngFor(run: RunState, salt: number): Rng {
  return rngAt(run.seed, salt)
}

/** Where a round's draw sits: the path, the round, and which channel. */
function fightRng(run: RunState, round: number, channel: number): Rng {
  return rngFor(run, combatSalt(run.path.length, round, channel))
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
 * Which rewards a run may still be offered.
 *
 * Everything, nearly always: Vials and Charms stack, and two Cinderbones are a
 * real thing to be carrying. The one exclusion is the corner where a special
 * has nowhere to go — thirty bones already, and not one of them common to
 * transmute — because an offer that cannot be taken is not an offer.
 */
function eligible(run: RunState, ids: readonly RewardId[]): readonly RewardId[] {
  const full = totalBones(run) >= BONE_CEILING && run.commonBones === 0
  return full ? ids.filter((id) => !isBoneReward(id)) : ids
}

/**
 * Draw one id, weighted, and take it out of the pool.
 *
 * Rarity lives on the reward — a Vial is six times as likely as a Knuckle —
 * rather than in a table curated per enemy, so the cadence of the whole slice
 * can be read in `content/rewards.ts`. Within one offer the draw is without
 * replacement, so a screen never shows the same card twice.
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
  return drawWeighted([...eligible(run, LOOT_REWARDS)], rng)
}

/** What the room says about a press that changed something. */
function interactionSay(after: RoomInteractionState, id: string, found?: RewardId): string {
  if (after.roomId === 'reliquary') {
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
 * **Common first, then the oldest living special.** One helper, so every
 * non-combat cost in the game — the vault's backlash today, whatever wants one
 * next — spends the pile the same way and names what it took in the same
 * words. A cost can therefore still kill a run made entirely of specials,
 * which is the honest reading of *dead stays dead*.
 */
export function loseOneBone(run: RunState): {
  readonly run: RunState
  readonly lost: { readonly kind: 'common' } | { readonly kind: 'special'; readonly name: string }
  readonly took: boolean
} {
  if (run.commonBones > 0) {
    return { run: { ...run, commonBones: run.commonBones - 1 }, lost: { kind: 'common' }, took: true }
  }
  const oldest = run.specials[0]
  if (!oldest) return { run, lost: { kind: 'common' }, took: false }
  return {
    run: { ...run, specials: run.specials.slice(1) },
    lost: { kind: 'special', name: specialBone(oldest.specialId).name },
    took: true,
  }
}

/**
 * Put common bones back, never above the ceiling.
 *
 * The one place recovery arithmetic lives. It answers with what it actually
 * gave, because zero is a real answer and the copy has to be able to say so.
 */
function recover(run: RunState, wanted: number): { readonly run: RunState; readonly gave: number } {
  const gave = Math.max(0, Math.min(wanted, roomToRecover(run)))
  return { run: gave === 0 ? run : { ...run, commonBones: run.commonBones + gave }, gave }
}

/**
 * Put a named bone in the pile.
 *
 * At the ceiling with a common bone to spare, one common bone becomes the
 * special and the total does not move — **no replacement picker, no loadout
 * screen**. The player asked for the bone; making them then choose which
 * anonymous bone to sacrifice is a decision with no information in it.
 */
function addSpecial(run: RunState, id: string): RunState {
  if (!isSpecialBoneId(id)) return run
  const instance = newSpecial(id, run.nextSpecialSerial)
  const transmute = totalBones(run) >= BONE_CEILING && run.commonBones > 0
  return {
    ...run,
    commonBones: transmute ? run.commonBones - 1 : run.commonBones,
    specials: [...run.specials, instance],
    nextSpecialSerial: run.nextSpecialSerial + 1,
  }
}

/**
 * A run at its waking.
 *
 * Thirty common bones, an empty satchel, and no trace of the run before it.
 * Note what is absent: `combat`, `offer` and `cause`, which is the invariant
 * the stuck-on-death bug turned on.
 */
export function newRun(seed: number): RunState {
  return {
    seed: seed >>> 0,
    roomId: FIRST_ROOM,
    commonBones: STARTING_BONES,
    specials: [],
    nextSpecialSerial: 0,
    charms: 0,
    vials: 0,
    looked: [],
    cleared: [],
    path: [FIRST_ROOM],
    say: room(FIRST_ROOM).arrival,
  }
}

// ── the fight ──────────────────────────────────────────────────────────

/** The enemy's line for a round, thrown and standing in order. */
function throwEnemy(
  run: RunState,
  enemyBones: readonly EnemyBoneInstance[],
  round: number,
): readonly RolledBone[] {
  return rollEnemyLine(enemyField(enemyBones), fightRng(run, round, RNG_CHANNEL.enemyThrow))
}

/** Open a fight against the room's enemy. Its line is up before FIELD is. */
function beginCombat(run: RunState): CombatState {
  const id = room(run.roomId).enemy
  if (!id) throw new Error(`${run.roomId} has no enemy`)
  const e = enemy(id)
  const bones = armyOf(id)
  return {
    enemyId: id,
    round: 1,
    phase: 'thrown',
    enemyBones: bones,
    enemyStartCount: bones.length,
    enemyLine: throwEnemy(run, bones, 1),
    charmUsed: false,
    log: e.rule ? [e.tell, e.rule] : [e.tell],
  }
}

/** How many bones the player could legally field right now. */
export function maxWidth(run: RunState): number {
  return Math.min(LINE_WIDTH, totalBones(run))
}

/**
 * Whether a field is one the game could accept.
 *
 * Every rule of the commitment, in one place, so the view and the reducer
 * cannot drift apart: the view calls this to decide whether FIELD may be
 * offered, and the reducer calls it to decide whether to honour a press.
 */
export function fieldLegal(
  run: RunState,
  width: number,
  specialIds: readonly string[],
): boolean {
  if (!Number.isInteger(width)) return false
  if (width < 1 || width > maxWidth(run)) return false
  if (new Set(specialIds).size !== specialIds.length) return false
  const alive = new Set(run.specials.map((s) => s.instanceId))
  if (!specialIds.every((id) => alive.has(id))) return false
  if (specialIds.length > width) return false
  return width - specialIds.length <= run.commonBones
}

/** What a smash cost, in one line, for the word band. */
function smashSay(record: SmashRecord, names: readonly string[]): readonly string[] {
  const beats: string[] = []
  const lost = record.playerCommonLost + record.playerSpecialsLost.length
  beats.push(
    lost === 0
      ? 'Nothing of mine breaks.'
      : `${lost} of mine ${lost === 1 ? 'breaks' : 'break'}.`,
  )
  for (const name of names) beats.push(`${name} is gone.`)
  if (record.enemyBonesLost.length > 0) {
    beats.push(
      `${record.enemyBonesLost.length} of its bones ${
        record.enemyBonesLost.length === 1 ? 'breaks' : 'break'
      }.`,
    )
  }
  if (record.heldTies > 0) {
    beats.push(record.heldTies === 1 ? 'It held the tie.' : `It held ${record.heldTies} ties.`)
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
 *      table, weighted by rarity, skipping anything that cannot be taken.
 *
 * Nothing is padded *up*: if one eligible thing remains, one is offered. An
 * empty return is a real answer — the fight gave nothing — and the room says
 * so plainly rather than leaving it looking like the offer screen failed.
 */
export function offerFor(run: RunState, enemyId: string, rng: Rng): readonly RewardId[] {
  // An enemy that declares no reward gives none. That is content saying so,
  // not a table that happened to run dry — the boss stands at the way out, and
  // the open door is the reward.
  const e = enemy(enemyId)
  if (e.rewards.length === 0 || e.rewardChoices === 0) return []
  if (rng.next() >= e.rewardChance) return []

  const pool = [...eligible(run, e.rewards)]
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
 * The one place a win is granted, called from exactly two: the SMASH that
 * emptied an army with no death to show, and the `DEFEAT_DONE` that ends one
 * that had. Both hand it the same `run` — the pile already settled — and both
 * get the same answer, because everything it draws on comes from the run's own
 * generator at a fixed position. A death that is watched and a death that is
 * skipped pay identically, and neither can pay twice: `combat` is gone from
 * the state it returns, so a second call has no fight left to win.
 *
 * The guaranteed drop is applied **first and once**, inside here, so the
 * Marrow's Vial does not ride on the 70% that decides whether a screen opens.
 */
function victory(state: GameState, run: RunState, combat: CombatState): GameState {
  const e = enemy(combat.enemyId)
  const paid = e.drop ? grant(run, e.drop) : run
  const dropped = e.drop ? ` It leaves a ${reward(e.drop).name}.` : ''

  const rng = fightRng(paid, combat.round, RNG_CHANNEL.reward)
  const offer = offerFor(paid, combat.enemyId, rng)
  const { combat: _gone, ...rest } = paid
  const meta = e.drop ? remember(state.meta, [], [e.drop]) : state.meta
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
  const kind = reward(id).kind
  if (kind === 'charm') return { ...run, charms: run.charms + 1 }
  if (kind === 'vial') return { ...run, vials: run.vials + 1 }
  return addSpecial(run, id)
}

/**
 * The run is over, on the lane it ended on.
 *
 * Zero bones outranks everything, including an enemy that would have been
 * emptied by a later lane in the same smash. That lane did not resolve.
 */
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
      const live: readonly string[] = ['explore', 'combat', 'reward']
      const resume = state.mode === 'title' ? state.resume : state.mode
      return { ...state, mode: 'title', ...(resume && live.includes(resume) ? { resume } : {}) }
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
      const detail = room(run.roomId).details.find((d) => d.id === action.detailId)
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
      const here = room(run.roomId)
      // A room with a living enemy has no exits. The fight is the way out.
      if (here.enemy && !run.cleared.includes(run.roomId)) return state
      // A room with an unresolved ritual has none either, for the same reason:
      // the thing in the middle of it *is* the room. The exit is withheld here,
      // in state, rather than hidden by a view — so no dispatch, no fixture and
      // no reload can walk past it.
      if (here.ritual && run.ritual?.roomId !== run.roomId) return state
      // And a room whose machinery is still shut holds its exits the same way.
      if (!exitsOpen(stateOf(run.rooms, run.roomId))) return state
      if (!here.exits.some((e) => e.to === action.to)) return state

      const next = room(action.to)
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
      if (!room(run.roomId).enemy || run.cleared.includes(run.roomId)) return state
      if (totalBones(run) === 0) return state
      return { ...state, mode: 'combat', run: { ...run, combat: beginCombat(run), say: '' } }
    }

    case 'FIELD': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || state.mode !== 'combat') return state
      if (combat.phase !== 'thrown' || combat.defeated) return state
      if (!fieldLegal(run, action.width, action.specialIds)) return state

      // Sorted, so the committed record is stable however the pouch was
      // tapped — two players who chose the same two bones committed the same
      // thing, and a save cannot record the order of their thumbs.
      const specialIds = [...action.specialIds].sort()
      const { playerLine: _unthrown, lastSmash: _old, ...rest } = combat
      return {
        ...state,
        run: {
          ...run,
          combat: { ...rest, phase: 'fielded', field: { width: action.width, specialIds } },
        },
      }
    }

    case 'THROW': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase !== 'fielded' || !combat.field || combat.defeated) {
        return state
      }
      const playerLine = rollPlayerLine(
        combat.field,
        run,
        combat.round,
        fightRng(run, combat.round, RNG_CHANNEL.playerThrow),
      )
      return { ...state, run: { ...run, combat: { ...combat, phase: 'rolled', playerLine } } }
    }

    case 'CHARM': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase !== 'rolled' || combat.defeated) return state
      if (combat.charmUsed || run.charms <= 0) return state
      const line = combat.playerLine
      if (!line || !line.some((b) => b.boneKey === action.boneKey)) return state

      return {
        ...state,
        run: {
          ...run,
          charms: run.charms - 1,
          combat: {
            ...combat,
            charmUsed: true,
            playerLine: recharmLine(
              line,
              action.boneKey,
              fightRng(run, combat.round, RNG_CHANNEL.charm),
            ),
          },
        },
      }
    }

    case 'SMASH': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase !== 'rolled' || combat.defeated) return state
      const playerLine = combat.playerLine
      if (!playerLine) return state

      const { record, pool } = resolveSmash({
        pool: {
          commonBones: run.commonBones,
          specials: run.specials,
          enemyBones: combat.enemyBones,
        },
        playerLine,
        enemyLine: combat.enemyLine,
        tieRule: enemy(combat.enemyId).tieRule,
      })

      const namesLost = record.playerSpecialsLost.map((instanceId) => {
        const found = run.specials.find((s) => s.instanceId === instanceId)
        return found ? specialBone(found.specialId).name : 'A bone'
      })

      const settled: RunState = {
        ...run,
        commonBones: pool.commonBones,
        specials: pool.specials,
      }
      const after: CombatState = {
        ...combat,
        phase: 'smashed',
        enemyBones: pool.enemyBones,
        lastSmash: record,
        log: smashSay(record, namesLost),
      }

      // Zero outranks a win. If the last lane that resolved took the player's
      // final bone, the run is over even when the enemy has nothing standing
      // either — and any lane after it never happened.
      if (totalBones(settled) === 0) {
        const named = namesLost.length > 0 ? ` ${namesLost[namesLost.length - 1]} last.` : ''
        return died(state, settled, after, `${enemy(combat.enemyId).name} — the last of my bones.${named}`)
      }

      if (pool.enemyBones.length === 0) {
        // A horror whose death has been authored keeps the fight open on it.
        // The room is *not* cleared, no offer is drawn and no screen changes:
        // the state says only that the thing is finished and is being watched
        // finishing, and `DEFEAT_DONE` is the single transition out.
        if (defeatOf(combat.enemyId)) {
          return { ...state, run: { ...settled, combat: { ...after, defeated: true } } }
        }
        return victory(state, { ...settled, combat: after }, after)
      }

      return { ...state, run: { ...settled, combat: after } }
    }

    case 'ROUND': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase !== 'smashed' || combat.defeated) return state
      // Terminal in either direction has no next round. Neither is reachable
      // from a settled `smashed` — both are handled in SMASH — but the reducer
      // is total and says so rather than relying on that.
      if (combat.enemyBones.length === 0 || totalBones(run) === 0) return state

      const round = combat.round + 1
      const { field: _spent, playerLine: _thrown, lastSmash: _read, ...rest } = combat
      return {
        ...state,
        run: {
          ...run,
          combat: {
            ...rest,
            round,
            phase: 'thrown',
            enemyLine: throwEnemy(run, combat.enemyBones, round),
            log: [`It throws again.`],
          },
        },
      }
    }

    case 'DRINK': {
      const run = state.run
      if (!run || run.vials <= 0) return state
      // Not while the result of a smash is being read, and not over a death.
      // Everywhere else — the room, and any phase in which the player still
      // has a decision to make — it is legal.
      if (state.mode === 'combat') {
        const combat = run.combat
        if (!combat || combat.defeated || combat.phase === 'smashed') return state
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
          say: `${gave} ${gave === 1 ? 'bone' : 'bones'} back. ${totalBones(filled)} in all.`,
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
      const here = room(run.roomId)
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
      const here = room(run.roomId)
      // The room has to declare it. An id that belongs to another room — a
      // stale press, a hand-made dispatch — is not a thing you are standing in
      // front of.
      if (!here.interactables?.some((i) => i.id === action.interactionId)) return state
      const before = stateOf(run.rooms, run.roomId)
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

      if (before.roomId === 'reliquary') {
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
              meta: found ? remember(state.meta, [], [found]) : state.meta,
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
      // it. One bone, every time, and it takes the named one when there is
      // nothing anonymous left to take.
      if (before.pressurePlate === 'off') {
        const { run: paid, lost, took } = loseOneBone(run)
        const gone = totalBones(paid) === 0
        const what =
          lost.kind === 'special' ? ` ${lost.name} snaps.` : ' One of my bones snaps.'
        const hurt: RunState = {
          ...paid,
          say: took
            ? `The mechanism snaps back. The chain catches my hand.${what}`
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
        meta: remember(state.meta, isBoneReward(action.id) ? [action.id] : [], [action.id]),
        run: {
          // A pickup repeats the thing's actual rule. "Charm. Taken." confirms
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
  // a stale `ROLL` from a bookmarked console, a dispatch from a build that had
  // a verb this one does not. Falling off the end would return `undefined` and
  // hand the app a state with no mode, which is the class of bug the explicit
  // `mode` field exists to make impossible.
  return state
}

/** The living pile, for anything outside the reducer that needs the number. */
export function livingBones(state: GameState): number {
  return state.run ? totalBones(state.run) : 0
}

/** Everything the run is carrying, named, for a summary screen. */
export function carriedNames(run: RunState): readonly string[] {
  const counted = new Map<string, number>()
  for (const s of run.specials) {
    const name = specialBone(s.specialId).name
    counted.set(name, (counted.get(name) ?? 0) + 1)
  }
  const out = [...counted].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
  if (run.charms > 0) out.push(run.charms > 1 ? `Charm ×${run.charms}` : 'Charm')
  if (run.vials > 0) out.push(run.vials > 1 ? `Vial ×${run.vials}` : 'Vial')
  return out
}

/** How many bones an enemy stood up with, for a band. Content, not state. */
export { armySize }

/** Re-exported so views ask one module about a special's name. */
export { specialBone }

/** The reward table, for the balance simulation's policies. */
export type { SpecialBoneInstance }
