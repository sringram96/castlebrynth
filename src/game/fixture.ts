/**
 * Dev fixtures: reach any mode from a URL.
 *
 * Every mode must be reachable without playing to it, or the tests that cover
 * the ends of the game — dying, getting out, a fight on its last point of
 * health — become forty presses long and nobody writes them. That is how the
 * old build ended up with a death screen nobody had ever automated.
 *
 *   ?seed=7                  a known run
 *   ?room=gate               stand in the first room of the run built from
 *                            that authored template
 *   ?node=n8                 stand in one exact room of the generated map,
 *                            for when a template is used more than once
 *   ?hp=4                    hurt
 *   ?enemyHp=1               a fight one blow from over
 *   ?turn=2                  the fight standing on a chosen turn of the script
 *   ?reach=close             a thing that closes, already on top of you
 *   ?dice=careful,leech      a chosen loadout (padded to six with plain bones)
 *   ?relics=nail,plate       carrying something
 *   ?mode=combat             open the room's fight, or jump to an ending
 *   ?dying=1                 the room's enemy killed, mid-death — what a save
 *                            written a third of a second before the win holds
 *   ?reliquary=solved        the chest open, its relic already taken
 *   ?reliquary=dark          bell rung and brazier out — the lever live
 *   ?vault=weighted          the cage down on the plate, gate still shut
 *   ?vault=open              the gate up, and the way on with it
 *
 * A fixture builds a real run and hands it to the real reducer. It cannot
 * reach a state the game could not; it only skips the walk. Nothing here is a
 * cheat worth hiding — the whole game is client-side — and it is inert unless
 * a parameter is present.
 */

import { HAND_SIZE } from '../content/dice.js'
import { REACHES, turnAt } from '../content/enemies.js'
import type { Reach } from '../content/enemies.js'
import { firstNodeOf, roomAt } from './map.js'
import { MAX_HP, newRun, reduce } from './reducer.js'
import type { Action } from './reducer.js'
import { SAVE_VERSION } from './state.js'
import type { GameState, Mode } from './state.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

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
  return [
    'seed',
    'room',
    'node',
    'hp',
    'enemyHp',
    'turn',
    'reach',
    'dice',
    'relics',
    'mode',
    'dying',
    'reliquary',
    'vault',
  ].some((k) => p.has(k))
}

export function applyFixture(base: GameState, search: string): GameState {
  const p = new URLSearchParams(search)
  if (!hasFixture(search)) return base

  const seed = num(p.get('seed')) ?? 1
  let state: GameState = reduce({ ...base, mode: 'title' }, { type: 'START_RUN', seed })
  let run = state.run ?? newRun(seed)

  // Standing somewhere else in *this run's map*.
  //
  // `?room=` names an authored template and lands on the first node of the
  // descent that used it — which is the convenience that has always been
  // wanted, and stays unambiguous while a template appears once. `?node=`
  // names one exact room, and is the answer when it does not: a fixture that
  // silently picked one of two Reliquaries would be worse than no fixture.
  const wantedNode = p.get('node')
  const wantedTemplate = p.get('room')
  const node = wantedNode
    ? run.map.nodes[wantedNode]
    : wantedTemplate
      ? firstNodeOf(run.map, wantedTemplate)
      : undefined
  if (node) {
    run = { ...run, roomId: node.id, path: [...run.path, node.id], looked: [] }
    run = { ...run, say: roomAt(run).arrival }
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

  // Standing in a half-worked room.
  //
  // *Played*, not assembled: every one of these presses goes through the real
  // reducer, so a fixture cannot reach a position the game could not — the
  // lever fixture below only opens the chest because the bell and the brazier
  // were genuinely dealt with first, in that order.
  const stage = p.get('reliquary')
  if (stage && roomAt(run).id === 'reliquary') {
    const press = (id: string): void => {
      state = reduce({ version: SAVE_VERSION, mode: 'explore', meta: state.meta, run }, {
        type: 'INTERACT',
        interactionId: id,
      })
      run = state.run ?? run
    }
    press('reliquary-bell')
    press('reliquary-brazier')
    if (stage === 'solved' || stage === 'open') {
      press('reliquary-lever')
      if (stage === 'solved') press('reliquary-chest')
    }
  }

  const vault = p.get('vault')
  if (vault && roomAt(run).id === 'chain-vault') {
    const press = (id: string): void => {
      state = reduce({ version: SAVE_VERSION, mode: 'explore', meta: state.meta, run }, {
        type: 'INTERACT',
        interactionId: id,
      })
      run = state.run ?? run
    }
    press('vault-chain')
    if (vault === 'open') press('vault-lever')
  }

  state = { version: SAVE_VERSION, mode: 'explore', meta: state.meta, run }

  const wanted = p.get('mode')
  const mode = wanted && (MODES as readonly string[]).includes(wanted) ? (wanted as Mode) : undefined

  // Standing inside a death.
  //
  // Not assembled: *played*. The fight is opened, a die is chosen, the enemy is
  // stood on its last point of health and the killing hand is scored through
  // the real reducer — so this is the state a save holds if the tab is closed
  // in the two-thirds of a second between the blow and the win, and there is
  // no way for it to be a state the game could not produce.
  if (p.has('dying') && roomAt(run).enemy) {
    const rolled = play(state, { type: 'FIGHT' }, { type: 'ROLL' }, { type: 'SELECT', slot: 0 })
    const combat = rolled.run!.combat!
    const doomed = { ...rolled, run: { ...rolled.run!, combat: { ...combat, enemyHp: 1 } } }
    return reduce(doomed, { type: 'SCORE' })
  }

  if (
    (mode === 'combat' || p.has('enemyHp') || p.has('turn') || p.has('reach')) &&
    roomAt(run).enemy
  ) {
    state = reduce(state, { type: 'FIGHT' })
    const enemyHp = num(p.get('enemyHp'))
    // Standing where the fight would have put it. Both the reach *and* the
    // turn that goes with it, from the same content the reducer reads — a
    // fixture that set one without the other would be a position the game
    // cannot reach, and the turn is what decides when it steps again.
    //
    // It lands on the *first* turn at that reach, which is where the fight
    // arrives. Getting it to move from there takes as many scores as the
    // content says, exactly as playing to it would.
    const wantedReach = p.get('reach')
    const combat = state.run?.combat
    const reach =
      wantedReach && combat?.approach && (REACHES as readonly string[]).includes(wantedReach)
        ? (wantedReach as Reach)
        : undefined
    const turn = reach ? turnAt(combat!.enemyId, reach) : -1
    // Which turn of the script it is standing on.
    //
    // The other end of the same idea as `enemyHp`: a fight is a health and a
    // position in a cycle, and standing it somewhere the walk would take three
    // scores to reach is the whole reason this file exists. A boss whose
    // telegraph is on turn 2 cannot otherwise be looked at without playing to
    // it, which is how the old build ended up with beats nobody had automated.
    //
    // Refused for a thing that closes: its turn is not free — `reachAfter` ties
    // it to where the thing is standing, and setting one without the other
    // would be a position the game cannot reach. `reach` is that fixture.
    const wantedTurn = num(p.get('turn'))
    const onTurn =
      wantedTurn !== undefined && combat && !combat.approach && wantedTurn >= 0
        ? Math.floor(wantedTurn)
        : undefined
    if (combat && (enemyHp !== undefined || turn > 0 || onTurn !== undefined)) {
      state = {
        ...state,
        run: {
          ...state.run!,
          combat: {
            ...combat,
            ...(enemyHp !== undefined ? { enemyHp: Math.max(1, enemyHp) } : {}),
            ...(onTurn !== undefined ? { turn: onTurn } : {}),
            ...(reach && turn > 0 ? { approach: reach, turn } : {}),
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
