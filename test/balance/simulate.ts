/**
 * Deterministic simulation, over the real game.
 *
 * Every fight below runs through the same reducer the browser does, so the
 * model and the runtime cannot drift apart: this is not a second implementation
 * of combat, it is the game with a policy where the thumb goes.
 *
 * It is also completely separate from the UI. Nothing here imports from `ui/`
 * or `render/`, and the runtime imports nothing from here.
 */

import { reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { TITLE } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { die } from '../../src/content/dice.js'
import { room } from '../../src/content/rooms.js'
import { bestClaim, keepFor } from './policies.js'
import type { Table, Tier } from './policies.js'

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

function tableOf(state: GameState): Table {
  const run = state.run!
  const combat = run.combat!
  return {
    dice: combat.roll.map((d) => {
      const face = die(d.dieId).faces[d.faceIndex]!
      return face.effect
        ? { slot: d.slot, value: face.value, effect: face.effect }
        : { slot: d.slot, value: face.value }
    }),
    relics: run.relics,
    spentHands: combat.spentHands,
    hp: run.hp,
  }
}

function markExactly(state: GameState, want: readonly number[]): GameState {
  const have = new Set(state.run!.combat!.selected)
  const wanted = new Set(want)
  let next = state
  for (const slot of new Set([...have, ...wanted])) {
    if (have.has(slot) === wanted.has(slot)) continue
    next = reduce(next, { type: 'SELECT', slot })
  }
  return next
}

export interface FightResult {
  readonly won: boolean
  readonly turns: number
  readonly hp: number
  /** Turns where the best available claim dealt nothing. Must always be zero. */
  readonly emptyTurns: number
  readonly damagePerTurn: number
}

/**
 * Play one fight to its end, returning both the statistics and the state it
 * ended in. One pass: replaying a fight to recover its end state would run
 * every fight twice for no reason.
 */
export function simulateFight(
  state: GameState,
  tier: Tier,
  maxTurns = 40,
): { readonly result: FightResult; readonly state: GameState } {
  let current = reduce(state, { type: 'FIGHT' })
  let turns = 0
  let emptyTurns = 0
  let dealt = 0

  for (; turns < maxTurns; turns++) {
    if (current.mode !== 'combat') break
    const before = current.run!.combat!.enemyHp

    current = reduce(current, { type: 'ROLL' })
    current = markExactly(current, keepFor(tableOf(current), tier))
    current = reduce(current, { type: 'REROLL' })
    current = markExactly(current, bestClaim(tableOf(current), tier))
    current = reduce(current, { type: 'SCORE' })

    const after = current.run?.combat?.enemyHp ?? 0
    const hit = before - after
    dealt += hit
    if (hit <= 0) emptyTurns++
    if (current.mode !== 'combat') {
      turns++
      break
    }
  }

  return {
    state: current,
    result: {
      won: current.mode === 'reward' || current.mode === 'explore',
      turns,
      hp: current.run?.hp ?? 0,
      emptyTurns,
      damagePerTurn: turns > 0 ? dealt / turns : 0,
    },
  }
}

/** Open a fight in a named room, with a chosen loadout. */
export function fightIn(
  roomId: string,
  seed: number,
  loadout: { dice?: readonly string[]; relics?: readonly string[]; hp?: number } = {},
): GameState {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const run = started.run!
  return {
    ...started,
    run: {
      ...run,
      roomId,
      path: [...run.path, roomId],
      ...(loadout.dice ? { dice: [...loadout.dice] } : {}),
      ...(loadout.relics ? { relics: [...loadout.relics] } : {}),
      ...(loadout.hp !== undefined ? { hp: loadout.hp } : {}),
    },
  }
}

export interface RunResult {
  readonly reachedExit: boolean
  readonly diedIn?: string
  readonly rooms: number
  readonly hp: number
  readonly fights: readonly FightResult[]
}

/**
 * A whole run, taking the long way.
 *
 * The deep way is the harder branch — an extra fight before the boss — so this
 * is the pessimistic reading of whether the slice can be finished. It also
 * takes the first reward offered, which is what a first-time player does.
 */
export function simulateRun(seed: number, tier: Tier, { deep = true } = {}): RunResult {
  let state = reduce(TITLE, { type: 'START_RUN', seed })
  const fights: FightResult[] = []

  const takeReward = () => {
    const offer = state.run?.offer
    if (offer?.[0]) state = reduce(state, { type: 'TAKE', id: offer[0] })
  }

  for (let step = 0; step < 20; step++) {
    const here = room(state.run!.roomId)

    if (here.ending || state.mode === 'complete') {
      return { reachedExit: true, rooms: state.run!.path.length, hp: state.run!.hp, fights }
    }
    if (state.mode === 'dead') {
      return {
        reachedExit: false,
        diedIn: state.run!.roomId,
        rooms: state.run!.path.length,
        hp: 0,
        fights,
      }
    }

    // A win that dropped something opens the reward screen; take the first.
    if (state.mode === 'reward') {
      takeReward()
      continue
    }

    if (here.enemy && !state.run!.cleared.includes(here.id)) {
      const fight = simulateFight(state, tier)
      fights.push(fight.result)
      state = fight.state
      if (state.mode === 'dead') {
        return {
          reachedExit: false,
          diedIn: here.id,
          rooms: state.run!.path.length,
          hp: 0,
          fights,
        }
      }
      takeReward()
      continue
    }

    const exits = here.exits
    const chosen = deep ? (exits.find((e) => e.to === 'deep') ?? exits[0]) : exits[0]
    if (!chosen) break
    state = play(state, { type: 'GO', to: chosen.to })
  }

  return {
    reachedExit: state.mode === 'complete',
    rooms: state.run!.path.length,
    hp: state.run?.hp ?? 0,
    fights,
  }
}
