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
import { LOOT_RELICS } from '../content/relics.js'
import { enemy, intentAt } from '../content/enemies.js'
import { FIRST_ROOM, room } from '../content/rooms.js'
import { Rng, reroll, roll, toggle } from '../combat/dice.js'
import { resolve } from '../combat/resolve.js'
import { SAVE_VERSION } from './state.js'
import type { CombatState, GameState, MetaState, RunState } from './state.js'

export const MAX_HP = 60

export type Action =
  | { readonly type: 'START_RUN'; readonly seed?: number }
  | { readonly type: 'TITLE' }
  | { readonly type: 'CONTINUE' }
  | { readonly type: 'LOOK'; readonly detailId: string }
  | { readonly type: 'GO'; readonly to: string }
  | { readonly type: 'TAKE_GIFT'; readonly id: string }
  | { readonly type: 'FIGHT' }
  | { readonly type: 'ROLL' }
  | { readonly type: 'SELECT'; readonly slot: number }
  | { readonly type: 'REROLL' }
  | { readonly type: 'SCORE' }
  | { readonly type: 'TAKE'; readonly id: string }

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
    log: [e.tell],
  }
}

/**
 * The three things a win offers.
 *
 * Drawn without replacement from the enemy's table, skipping anything already
 * carried, and padded from the general pools if the table runs short. Two
 * relics and a die, or two dice and a relic — the point is that the three
 * point at different builds, not that the catalogue is large.
 */
export function offerFor(run: RunState, enemyId: string, rng: Rng): readonly string[] {
  const owned = new Set([...run.relics, ...run.dice])
  const table = enemy(enemyId).rewards.filter((id) => !owned.has(id))
  const spare = [...LOOT_RELICS, ...LOOT_DICE].filter((id) => !owned.has(id) && !table.includes(id))
  const pool = [...table, ...spare]
  const out: string[] = []
  while (out.length < 3 && pool.length > 0) {
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

// ── the reducer ────────────────────────────────────────────────────────

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TITLE': {
      // Stepping back to the door remembers where you were, so CONTINUE means
      // the same thing whether you got here by pressing TITLE or by reloading.
      const resume = state.mode === 'title' ? state.resume : state.mode
      return { ...state, mode: 'title', ...(resume ? { resume } : {}) }
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

    case 'TAKE_GIFT': {
      const run = state.run
      if (!run || state.mode !== 'explore') return state
      const gift = room(run.roomId).gift
      if (!gift || !gift.includes(action.id) || run.cleared.includes(run.roomId)) return state
      return {
        ...state,
        meta: remember(state.meta, isDieId(action.id) ? [action.id] : [], isDieId(action.id) ? [] : [action.id]),
        run: {
          ...run,
          dice: isDieId(action.id) ? equip(run.dice, action.id) : run.dice,
          relics: isDieId(action.id) ? run.relics : [...run.relics, action.id],
          cleared: [...run.cleared, run.roomId],
          say: isDieId(action.id)
            ? `${die(action.id).name}. ${die(action.id).rule}`
            : `Taken. The other one stays where it is.`,
        },
      }
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
      if (!run || !combat || combat.phase !== 'intent') return state
      const rolled = roll(run.dice, rngFor(run, combatSalt(run, combat, 1)))
      return {
        ...state,
        run: { ...run, combat: { ...combat, phase: 'rolled', roll: rolled, selected: [] } },
      }
    }

    case 'REROLL': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase !== 'rolled') return state
      // The chosen dice are kept, exactly as they lie, and stay chosen. Every
      // other die is thrown once.
      const thrown = reroll(combat.roll, combat.selected, rngFor(run, combatSalt(run, combat, 2)))
      return { ...state, run: { ...run, combat: { ...combat, phase: 'rerolled', roll: thrown } } }
    }

    case 'SELECT': {
      const run = state.run
      const combat = run?.combat
      if (!run || !combat || combat.phase === 'intent') return state
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

      const out = resolve(run, combat)

      if (out.died) {
        return {
          ...state,
          mode: 'dead',
          run: {
            ...run,
            hp: 0,
            combat: { ...combat, enemyHp: out.enemyHp, log: out.beats },
            cause: out.blow
              ? `${enemy(combat.enemyId).name} — ${out.blow.verb}.`
              : 'My own dice.',
          },
        }
      }

      if (out.won) {
        const rng = rngFor(run, combatSalt(run, combat, 7))
        const offer = offerFor(run, combat.enemyId, rng)
        const cleared = { ...run, hp: out.hp, cleared: [...run.cleared, run.roomId], say: '' }
        // A fight with nothing left to give goes straight back to the room.
        if (offer.length === 0) {
          const { combat: _gone, ...rest } = cleared
          return { ...state, mode: 'explore', run: { ...rest, say: 'It stops. Nothing left of it worth taking.' } }
        }
        const { combat: _done, ...rest } = cleared
        return { ...state, mode: 'reward', run: { ...rest, offer } }
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
          say: found ? `${die(action.id).name}. ${die(action.id).rule}` : 'Taken.',
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
