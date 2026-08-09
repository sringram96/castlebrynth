/**
 * Dev fixtures: reach any mode from a URL.
 *
 * Every mode must be reachable without playing to it, or the tests that cover
 * the ends of the game — dying, getting out, a fight on its last point of
 * health — become forty presses long and nobody writes them. That is how the
 * old build ended up with a death screen nobody had ever automated.
 *
 *   ?seed=7                  a known run
 *   ?room=gate               start standing somewhere else
 *   ?hp=4                    hurt
 *   ?enemyHp=1               a fight one blow from over
 *   ?reach=close             a thing that closes, already on top of you
 *   ?dice=careful,leech      a chosen loadout (padded to six with plain bones)
 *   ?relics=nail,plate       carrying something
 *   ?mode=combat             open the room's fight, or jump to an ending
 *
 * A fixture builds a real run and hands it to the real reducer. It cannot
 * reach a state the game could not; it only skips the walk. Nothing here is a
 * cheat worth hiding — the whole game is client-side — and it is inert unless
 * a parameter is present.
 */

import { HAND_SIZE } from '../content/dice.js'
import { REACHES } from '../content/enemies.js'
import type { Reach } from '../content/enemies.js'
import { ROOMS, room } from '../content/rooms.js'
import { MAX_HP, newRun, reduce } from './reducer.js'
import { SAVE_VERSION } from './state.js'
import type { GameState, Mode } from './state.js'

const MODES: readonly Mode[] = ['title', 'explore', 'combat', 'reward', 'dead', 'complete']

const list = (raw: string | null): string[] =>
  raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []

const num = (raw: string | null): number | undefined => {
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export function hasFixture(search: string): boolean {
  const p = new URLSearchParams(search)
  return ['seed', 'room', 'hp', 'enemyHp', 'reach', 'dice', 'relics', 'mode'].some((k) => p.has(k))
}

export function applyFixture(base: GameState, search: string): GameState {
  const p = new URLSearchParams(search)
  if (!hasFixture(search)) return base

  const seed = num(p.get('seed')) ?? 1
  let state: GameState = reduce({ ...base, mode: 'title' }, { type: 'START_RUN', seed })
  let run = state.run ?? newRun(seed)

  const roomId = p.get('room')
  if (roomId && ROOMS[roomId]) {
    run = { ...run, roomId, path: [...run.path, roomId], say: room(roomId).arrival, looked: [] }
  }

  const dice = list(p.get('dice'))
  if (dice.length > 0) {
    const filled = [...dice]
    while (filled.length < HAND_SIZE) filled.push('plain')
    run = { ...run, dice: filled.slice(0, HAND_SIZE) }
  }

  const relics = list(p.get('relics'))
  if (relics.length > 0) run = { ...run, relics }

  const hp = num(p.get('hp'))
  if (hp !== undefined) run = { ...run, hp: Math.max(0, Math.min(hp, MAX_HP)) }

  state = { version: SAVE_VERSION, mode: 'explore', meta: state.meta, run }

  const wanted = p.get('mode')
  const mode = wanted && (MODES as readonly string[]).includes(wanted) ? (wanted as Mode) : undefined

  if ((mode === 'combat' || p.has('enemyHp') || p.has('reach')) && room(run.roomId).enemy) {
    state = reduce(state, { type: 'FIGHT' })
    const enemyHp = num(p.get('enemyHp'))
    // Standing where the fight would have put it after N turns. It is the
    // same state the reducer produces by playing to it — the reach, and the
    // turn that goes with it, because an approaching enemy advances exactly
    // once per turn and a fixture that split them would be a state the game
    // cannot reach.
    const wantedReach = p.get('reach')
    const turn = wantedReach ? REACHES.indexOf(wantedReach as Reach) : -1
    const combat = state.run?.combat
    if (combat && (enemyHp !== undefined || turn > 0)) {
      state = {
        ...state,
        run: {
          ...state.run!,
          combat: {
            ...combat,
            ...(enemyHp !== undefined ? { enemyHp: Math.max(1, enemyHp) } : {}),
            ...(turn > 0 && combat.approach ? { approach: REACHES[turn]!, turn } : {}),
          },
        },
      }
    }
    return state
  }

  if (mode === 'dead') {
    return {
      ...state,
      mode: 'dead',
      run: { ...state.run!, hp: 0, cause: 'A fixture. Nothing killed me.' },
    }
  }
  if (mode === 'complete') {
    return { ...state, mode: 'complete', meta: { ...state.meta, wins: state.meta.wins + 1 } }
  }
  if (mode === 'title') return { ...state, mode: 'title', resume: 'explore' }

  return state
}
