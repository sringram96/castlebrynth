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

import { HAND_SIZE, LOOT_DICE, STARTING_DICE, die, isDieId } from '../content/dice.js'
import { LOOT_RELICS, relic } from '../content/relics.js'
import { enemy, intentAt, reachAfter } from '../content/enemies.js'
import { defeatOf } from '../content/defeat.js'
import { FIRST_ROOM, room } from '../content/rooms.js'
import { exitsOpen, legal, stateOf } from '../content/interactions.js'
import { Rng, reroll, roll, toggle } from '../combat/dice.js'
import { resolve } from '../combat/resolve.js'
import { SAVE_VERSION } from './state.js'
import type { CombatState, GameState, MetaState, RitualRoll, RoomInteractionState, RunState } from './state.js'

/**
 * The body.
 *
 * Health carries between fights and there is no free healing, so this number
 * is really "how many fights before the boss". A hundred buys three, with
 * enough margin that a bad round of dice is a setback rather than the run.
 */
export const MAX_HP = 100

export type Action =
  | { readonly type: 'START_RUN'; readonly seed?: number }
  | { readonly type: 'TITLE' }
  | { readonly type: 'CONTINUE' }
  | { readonly type: 'LOOK'; readonly detailId: string }
  | { readonly type: 'GO'; readonly to: string }
  | { readonly type: 'FIGHT' }
  | { readonly type: 'ROLL' }
  | { readonly type: 'SELECT'; readonly slot: number }
  | { readonly type: 'REROLL' }
  | { readonly type: 'SCORE' }
  | { readonly type: 'TAKE'; readonly id: string }
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
 * What each face of the font gives back, as a share of what is **missing**.
 *
 * A share of the wound, not a share of the body. Six flat health is a gift to
 * a player who is nearly dead and nothing at all to a player who is nearly
 * whole; a share of the wound is worth the most to whoever needs it the most,
 * which is what a healing room in a push-your-luck game is for. It also cannot
 * be farmed: a player at full health gets nothing however well they roll.
 *
 * Written out rather than derived. The curve is a decision, and a decision
 * that lives in a formula is a decision nobody can see.
 */
export const HEAL_FRACTIONS: Readonly<Record<RitualRoll, number>> = {
  1: 0.19,
  2: 0.35,
  3: 0.51,
  4: 0.68,
  5: 0.84,
  6: 1.0,
}

/**
 * The pools a ritual could pour into.
 *
 * There is one, and there is deliberately a table with one row in it: the
 * ritual is meant to grow a choice of target — health, armour, whatever the
 * game grows next — and the only part of that which is hard is keeping the
 * arithmetic away from the room, the view and the sequence. This is where it
 * is kept. Adding a stat is a row here and a target on the action.
 */
const POOLS = {
  hp: (run: RunState) => ({ now: run.hp, max: run.maxHp }),
} as const

export type Recoverable = keyof typeof POOLS

/**
 * How much of a missing pool one face gives back.
 *
 * Two guarantees the fractions alone do not give:
 *
 *   - **six is whole.** Not "100% of a number that rounded" — the whole of
 *     what is missing, so `six restores you` has no edge case at any HP.
 *   - **a face never gives nothing.** If anything is missing at all, the
 *     worst roll still returns at least one point. A ritual that can answer a
 *     press with zero is a press the player will think failed.
 */
export function recovered(roll: RitualRoll, missing: number): number {
  if (missing <= 0) return 0
  const fraction = HEAL_FRACTIONS[roll]
  if (fraction >= 1) return missing
  return Math.max(1, Math.round(missing * fraction))
}

/** One face, applied to one pool. The only place the two ever meet. */
export function applyRecovery(
  stat: Recoverable,
  roll: RitualRoll,
  run: RunState,
): { readonly missingBefore: number; readonly healed: number; readonly value: number } {
  const { now, max } = POOLS[stat](run)
  const missingBefore = max - now
  const healed = recovered(roll, missingBefore)
  return { missingBefore, healed, value: Math.min(max, now + healed) }
}

const NUMBER: readonly string[] = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

/**
 * What the room says about what just happened.
 *
 * The face is already on screen and readable, so the line does not repeat it
 * as a digit — it names it, states the health, and stops.
 */
function ritualSay(roll: RitualRoll, healed: number): string {
  if (healed === 0) return `The die turns. ${NUMBER[roll]}. There is nothing left for it to mend.`
  if (roll === 6) return `${NUMBER[roll]}. The wound closes completely.`
  return `${NUMBER[roll]}. The basin gives back ${healed} HP.`
}

// ── helpers ────────────────────────────────────────────────────────────

const remember = (meta: MetaState, dice: readonly string[], relics: readonly string[]): MetaState => ({
  ...meta,
  seenDice: [...new Set([...meta.seenDice, ...dice])],
  seenRelics: [...new Set([...meta.seenRelics, ...relics])],
})

/**
 * The run's generator, positioned by how much of the run has happened.
 *
 * A run is `seed` plus its history, so a fight replays identically after a
 * reload. The cursor is derived from the path length, the turn and the phase
 * rather than stored, so a save can never disagree with it.
 */
function rngFor(run: RunState, salt: number): Rng {
  return new Rng((run.seed + salt * 0x9e3779b1) >>> 0)
}

function combatSalt(run: RunState, combat: CombatState, extra: number): number {
  return run.path.length * 1013 + combat.turn * 31 + extra
}

/**
 * Where the font's one draw sits in the same stream.
 *
 * The same rule as a fight: seed plus history, derived rather than stored, so
 * a save can never disagree with it. There is no turn here — the room is one
 * press — so the position is the path length and a constant of its own, and
 * the constant is what keeps it clear of `combatSalt`'s `turn * 31 + extra`.
 */
function ritualSalt(run: RunState): number {
  return run.path.length * 1013 + 977
}

/**
 * Where the reliquary's one draw sits in the same stream.
 *
 * Seed plus history, exactly as a fight and the font are, with a constant of
 * its own that keeps it clear of both — `ritualSalt`'s 977 and `combatSalt`'s
 * `turn * 31 + extra`. Derived rather than stored, so the chest cannot be
 * re-rolled by a reload, and cannot quietly agree with the font because the
 * two rooms happened to sit the same distance along the path.
 */
function reliquarySalt(run: RunState): number {
  return run.path.length * 1013 + 613
}

/**
 * What is in the chest, or nothing because there is nothing left to give.
 *
 * The existing relic pool, minus what is already carried. No new relic, no new
 * species, and no offer screen: this is a single found object, so it is drawn
 * and granted in the same tick the chest is opened, and `rooms[].rewardId`
 * records which — a reload reads that rather than drawing again.
 *
 * An empty answer is a real one. A run that already carries every relic finds
 * an empty chest and is told so plainly, which is the same call `offerFor`
 * makes when a fight has nothing left to pay with.
 */
function chestReward(run: RunState, rng: Rng): string | undefined {
  const owned = new Set([...run.relics, ...run.dice])
  const pool = LOOT_RELICS.filter((id) => !owned.has(id))
  return pool.length === 0 ? undefined : pool[rng.int(pool.length)]
}

/** What the room says about a press that changed something. */
function interactionSay(after: RoomInteractionState, id: string, reward?: string): string {
  if (after.roomId === 'reliquary') {
    if (id === 'reliquary-bell') return 'The bell answers once. Something shifts behind the altar.'
    if (id === 'reliquary-brazier') {
      return after.brazier === 'out'
        ? 'The flame folds into the wick. In the dark, the handle under the basin catches the red window-light.'
        : 'The flame returns.'
    }
    if (id === 'reliquary-lever') return 'Something moves inside the altar. The chest answers.'
    return reward ? `Inside: ${relic(reward).name}.` : 'The chest is empty.'
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

/** What a lever pulled against nothing costs. */
export const VAULT_BACKLASH = 6

/**
 * A run at its waking.
 *
 * Note what is absent: `combat`, `offer` and `cause`. A new run carries no
 * trace of the one before it, which is the invariant the stuck-on-death bug
 * turned on.
 */
export function newRun(seed: number): RunState {
  return {
    seed: seed >>> 0,
    roomId: FIRST_ROOM,
    hp: MAX_HP,
    maxHp: MAX_HP,
    dice: [...STARTING_DICE],
    relics: [],
    looked: [],
    cleared: [],
    path: [FIRST_ROOM],
    say: room(FIRST_ROOM).arrival,
  }
}

/** Open a fight against the room's enemy. */
function beginCombat(run: RunState): CombatState {
  const id = room(run.roomId).enemy
  if (!id) throw new Error(`${run.roomId} has no enemy`)
  const e = enemy(id)
  return {
    enemyId: id,
    enemyHp: e.hp,
    enemyMaxHp: e.hp,
    turn: 0,
    phase: 'intent',
    roll: [],
    selected: [],
    spentHands: [],
    // A thing that closes always opens the fight at the far end of the room:
    // nothing has survived yet, so this is the same call every later turn
    // makes. There is no action anywhere that can put it back.
    ...(e.approach ? { approach: reachAfter(id, 0)! } : {}),
    log: [e.tell],
  }
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
 *      table, skipping anything already carried and padded from the general
 *      pools if the table runs short.
 *
 * Nothing is padded *up*: if one eligible thing remains, one is offered. An
 * empty return is a real answer — the fight gave nothing — and the room says
 * so plainly rather than leaving it looking like the offer screen failed.
 */
export function offerFor(run: RunState, enemyId: string, rng: Rng): readonly string[] {
  // An enemy that declares no reward gives none. That is content saying so,
  // not a table that happened to run dry — the boss stands at the way out, and
  // a die you cannot spend is not a reward.
  const e = enemy(enemyId)
  if (e.rewards.length === 0 || e.rewardChoices === 0) return []
  if (rng.next() >= e.rewardChance) return []

  const owned = new Set([...run.relics, ...run.dice])
  const table = e.rewards.filter((id) => !owned.has(id))
  const spare = [...LOOT_RELICS, ...LOOT_DICE].filter((id) => !owned.has(id) && !table.includes(id))
  const pool = [...table, ...spare]
  const out: string[] = []
  while (out.length < e.rewardChoices && pool.length > 0) {
    out.push(pool.splice(rng.int(pool.length), 1)[0]!)
  }
  return out
}

/**
 * Equip a found die over the plainest thing in the hand.
 *
 * The hand is six and stays six. There is no replace-picker because in the
 * slice there cannot be a hard choice: a run finds at most three dice against
 * six plain bones, so a found die never displaces another found die. If a
 * later run can fill the hand, this is where the picker goes.
 */
function equip(dice: readonly string[], id: string): readonly string[] {
  const next = [...dice]
  const plain = next.indexOf('plain')
  next[plain >= 0 ? plain : next.length - 1] = id
  return next.slice(0, HAND_SIZE)
}

/**
 * The fight is over and the room is yours.
 *
 * The one place a win is granted, called from exactly two: the SCORE that
 * killed a horror with no death to show, and the `DEFEAT_DONE` that ends one
 * that had. Both hand it the same `run` — health already settled — and both
 * get the same answer, because everything it draws on comes from the run's own
 * generator at a fixed position. A death that is watched and a death that is
 * skipped pay identically, and neither can pay twice: `combat` is gone from
 * the state it returns, so a second call has no fight left to win.
 */
function victory(state: GameState, run: RunState, combat: CombatState): GameState {
  const rng = rngFor(run, combatSalt(run, combat, 7))
  const offer = offerFor(run, combat.enemyId, rng)
  const { combat: _gone, ...rest } = run
  const cleared = { ...rest, cleared: [...run.cleared, run.roomId], say: '' }
  // A fight with nothing left to give goes straight back to the room.
  if (offer.length === 0) {
    return {
      ...state,
      mode: 'explore',
      // Said plainly, so an empty-handed win never reads as the reward
      // screen having failed to open.
      run: { ...cleared, say: `${enemy(combat.enemyId).name} is dead. Nothing useful on it.` },
    }
  }
  return { ...state, mode: 'reward', run: { ...cleared, offer } }
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
      // And a room whose machinery is still shut holds its exits the same way,
      // for the same reason. The check is here, in state, rather than in the
      // view that draws the button — so no dispatch, no fixture and no reload
      // can walk through a gate that is down.
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
      return { ...state, mode: 'combat', run: { ...run, combat: beginCombat(run), say: '' } }
    }

    case 'ROLL': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase !== 'intent' || combat.defeated) return state
      const rolled = roll(run.dice, rngFor(run, combatSalt(run, combat, 1)))
      return {
        ...state,
        run: { ...run, combat: { ...combat, phase: 'rolled', roll: rolled, selected: [] } },
      }
    }

    case 'REROLL': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase !== 'rolled' || combat.defeated) return state
      // The chosen dice are kept, exactly as they lie, and stay chosen. Every
      // other die is thrown once.
      const thrown = reroll(combat.roll, combat.selected, rngFor(run, combatSalt(run, combat, 2)))
      return { ...state, run: { ...run, combat: { ...combat, phase: 'rerolled', roll: thrown } } }
    }

    case 'SELECT': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase === 'intent' || combat.defeated) return state
      if (!combat.roll.some((d) => d.slot === action.slot)) return state
      return {
        ...state,
        run: { ...run, combat: { ...combat, selected: toggle(combat.selected, action.slot) } },
      }
    }

    case 'SCORE': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase === 'intent' || combat.selected.length === 0) return state
      // A dead thing takes no more damage. This is what makes the death
      // sequence safe to leave running: every press that reaches the reducer
      // while it plays finds a fight with nothing left to resolve, so an
      // impatient thumb cannot score the same hand twice into a corpse.
      if (combat.defeated) return state

      const out = resolve(run, combat)

      // Where the enemy stands after this score, and whether it is standing on
      // you. Both are already decided; every branch below only records them.
      const moved = {
        ...(out.approach ? { approach: out.approach } : {}),
        ...(out.reached ? { reached: true } : {}),
      }

      if (out.died) {
        return {
          ...state,
          mode: 'dead',
          run: {
            ...run,
            hp: 0,
            combat: { ...combat, enemyHp: out.enemyHp, ...moved, log: out.beats },
            cause: out.reached
              ? enemy(combat.enemyId).approach!.cause
              : out.blow
                ? `${enemy(combat.enemyId).name} — ${out.blow.verb}.`
                : 'My own dice.',
          },
        }
      }

      if (out.won) {
        // The face costs and heals of the killing hand still happened, so the
        // health settles here whichever way the win is taken.
        const settled = { ...run, hp: out.hp }

        // A horror whose death has been authored keeps the fight open on it.
        // The room is *not* cleared, no offer is drawn and no screen changes:
        // the state says only that the thing is dead and is being watched
        // dying, and `DEFEAT_DONE` is the single transition out.
        if (defeatOf(combat.enemyId)) {
          return {
            ...state,
            run: {
              ...settled,
              combat: { ...combat, enemyHp: out.enemyHp, ...moved, defeated: true, log: out.beats },
            },
          }
        }

        return victory(state, settled, combat)
      }

      const nextTurn = combat.turn + 1
      return {
        ...state,
        run: {
          ...run,
          hp: out.hp,
          combat: {
            ...combat,
            enemyHp: out.enemyHp,
            ...moved,
            turn: nextTurn,
            phase: 'intent',
            roll: [],
            selected: [],
            spentHands: combat.spentHands.includes(out.preview.hand.name)
              ? combat.spentHands
              : [...combat.spentHands, out.preview.hand.name],
            log: out.beats,
          },
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
      // For now the only damaged thing a run carries is its body, so the
      // target is not offered. When there is a second pool, the choice
      // arrives on the action and nothing below has to change.
      const { missingBefore, healed, value } = applyRecovery('hp', roll, run)
      return {
        ...state,
        run: {
          ...run,
          hp: value,
          ritual: { roomId: run.roomId, roll, healed, missingBefore },
          say: ritualSay(roll, healed),
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
            const reward = chestReward(run, rngFor(run, reliquarySalt(run)))
            const next: RoomInteractionState = {
              ...before,
              claimed: true,
              ...(reward ? { rewardId: reward } : {}),
            }
            // Granted in the same transition it is drawn in. There is no offer
            // to re-enter and no second press to make, which is the whole of
            // why this cannot pay twice: `claimed` is already true.
            return {
              ...state,
              meta: reward ? remember(state.meta, [], [reward]) : state.meta,
              run: {
                ...run,
                relics: reward ? [...run.relics, reward] : run.relics,
                rooms: { ...run.rooms, [run.roomId]: next },
                say: interactionSay(next, id, reward),
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
      // against, and it comes back through your hand.
      if (before.pressurePlate === 'off') {
        const hp = Math.max(0, run.hp - VAULT_BACKLASH)
        const hurt: RunState = {
          ...run,
          hp,
          say: `The mechanism snaps back. The chain catches my hand. ${VAULT_BACKLASH} HP.`,
          ...(hp === 0 ? { cause: VAULT_CAUSE } : {}),
        }
        // A room may kill you, and it uses the death the game already has. The
        // player can make this mistake as many times as they have blood for.
        return { ...state, ...(hp === 0 ? { mode: 'dead' as const } : {}), run: hurt }
      }
      return put({ ...before, lever: 'down', gate: 'open' })
    }

    case 'TAKE': {
      const run = state.run
      if (!run || state.mode !== 'reward' || !run.offer || !run.offer.includes(action.id)) return state
      const { offer: _taken, ...rest } = run
      const found = isDieId(action.id)
      return {
        ...state,
        mode: 'explore',
        meta: remember(state.meta, found ? [action.id] : [], found ? [] : [action.id]),
        run: {
          ...rest,
          dice: found ? equip(run.dice, action.id) : run.dice,
          relics: found ? run.relics : [...run.relics, action.id],
          // A pickup repeats the thing's actual rule. "Blood Thimble. Taken."
          // confirms a press and explains nothing, and sending the player to
          // MENU to find out what they just chose is the same failure again.
          say: found
            ? `${die(action.id).name} taken. ${die(action.id).rule}`
            : `${relic(action.id).name} taken. ${relic(action.id).rule}`,
        },
      }
    }
  }
}

/** The intent the player is being shown, or nothing when no fight is on. */
export function currentIntent(state: GameState) {
  const combat = state.run?.combat
  return combat ? intentAt(combat.enemyId, combat.turn) : undefined
}
