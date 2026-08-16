/**
 * Dev fixtures: reach any mode from a URL.
 *
 * Every mode must be reachable without playing to it, or the tests that cover
 * the ends of the game — dying, getting out, a fight one attack from over —
 * become forty presses long and nobody writes them. That is how the old build
 * ended up with a death screen nobody had ever automated.
 *
 *   ?seed=7                     a known run
 *   ?room=gate                  stand in the first room of the run built from
 *                               that authored template
 *   ?node=n8                    stand in one exact room of the generated map,
 *                               for when a template is used more than once
 *   ?bones=12                   a thinner pile — and so a narrower attack
 *   ?vials=2                    a stocked satchel
 *   ?round=2                    the fight standing on a later attack
 *   ?enemyHp=20                 a fight one good hand from over
 *   ?rolls=1                    the dice down, with two throws still in hand
 *   ?dice=6,6,6,4,4,3           exactly these faces on the table
 *   ?used=pair,triple           those two categories already spent
 *   ?mode=combat                open the room's fight, or jump to an ending
 *   ?dying=1                    the room's enemy finished, mid-death — what a
 *                               save written a third of a second before the
 *                               win holds
 *   ?reliquary=solved           the chest open, its reward already taken
 *   ?reliquary=dark             bell rung and brazier out — the lever live
 *   ?vault=weighted             the cage down on the plate, gate still shut
 *   ?vault=open                 the gate up, and the way on with it
 *
 * A fixture builds a real run and hands it to the real reducer. **Everything
 * that can be played is played** — FIGHT, ROLL, REROLL, SCORE — so a fixture
 * cannot stand the game in a position it could not reach on its own; it only
 * skips the walk. The four escape hatches are `enemyHp`, `dice`, `used` and
 * the terminal modes, which are exactly the states a bounded journey cannot
 * reliably reach: no sequence of honest presses puts a named face on a die.
 *
 * Nothing here is a cheat worth hiding — the whole game is client-side — and
 * it is inert unless a parameter is present.
 */

import { BONE_CEILING } from '../content/bones.js'
import { isNamedHandId, legalScores } from '../combat/hands.js'
import type { NamedHandId } from '../combat/hands.js'
import { MAX_ROLLS } from '../combat/roll.js'
import type { DieValue } from '../combat/roll.js'
import { firstNodeOf, roomAt } from './map.js'
import { newRun, reduce } from './reducer.js'
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

const KEYS: readonly string[] = [
  'seed',
  'room',
  'node',
  'bones',
  'vials',
  'round',
  'enemyHp',
  'rolls',
  'dice',
  'used',
  'mode',
  'dying',
  'reliquary',
  'vault',
]

export function hasFixture(search: string): boolean {
  const p = new URLSearchParams(search)
  return KEYS.some((k) => p.has(k))
}

/** Stand the enemy on an exact total. The one thing an attack cannot aim at. */
function standEnemyAt(state: GameState, hp: number): GameState {
  const combat = state.run?.combat
  if (!combat) return state
  const enemyHp = Math.max(1, Math.min(Math.floor(hp), combat.enemyMaxHp))
  return { ...state, run: { ...state.run!, combat: { ...combat, enemyHp } } }
}

/** Put exact faces on the table, with a throw count that admits to it. */
function standDiceAt(state: GameState, faces: readonly DieValue[]): GameState {
  const combat = state.run?.combat
  if (!combat || faces.length === 0) return state
  const rollsUsed = combat.rollsUsed === 0 ? 1 : combat.rollsUsed
  return {
    ...state,
    run: { ...state.run!, combat: { ...combat, dice: faces, rollsUsed } },
  }
}

/** Spend named categories, as a fight that had already used them would have. */
function standUsedAt(state: GameState, hands: readonly NamedHandId[]): GameState {
  const combat = state.run?.combat
  if (!combat) return state
  return {
    ...state,
    run: { ...state.run!, combat: { ...combat, usedHands: [...new Set(hands)] } },
  }
}

/** One whole attack, played: throw once, then score whatever the dice allow. */
function playAttack(state: GameState): GameState {
  const rolled = reduce(state, { type: 'ROLL' })
  const combat = rolled.run?.combat
  if (!combat || combat.dice.length === 0) return rolled
  const choice = legalScores(combat.dice, combat.usedHands)[0]
  return choice ? reduce(rolled, { type: 'SCORE', hand: choice }) : rolled
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

  const bones = num(p.get('bones'))
  if (bones !== undefined) {
    run = { ...run, bones: Math.max(0, Math.min(Math.floor(bones), BONE_CEILING)) }
  }

  const vials = num(p.get('vials'))
  if (vials !== undefined) run = { ...run, vials: Math.max(0, Math.floor(vials)) }

  // Standing in a half-worked room.
  //
  // *Played*, not assembled: every one of these presses goes through the real
  // reducer, so a fixture cannot reach a position the game could not — the
  // lever fixture below only opens the chest because the bell and the brazier
  // were genuinely dealt with first, in that order.
  const press = (id: string): void => {
    state = reduce({ version: SAVE_VERSION, mode: 'explore', meta: state.meta, run }, {
      type: 'INTERACT',
      interactionId: id,
    })
    run = state.run ?? run
  }

  const stage = p.get('reliquary')
  if (stage && roomAt(run).id === 'reliquary') {
    press('reliquary-bell')
    press('reliquary-brazier')
    if (stage === 'solved' || stage === 'open') {
      press('reliquary-lever')
      if (stage === 'solved') press('reliquary-chest')
    }
  }

  const vault = p.get('vault')
  if (vault && roomAt(run).id === 'chain-vault') {
    press('vault-chain')
    if (vault === 'open') press('vault-lever')
  }

  state = { version: SAVE_VERSION, mode: 'explore', meta: state.meta, run }

  const wanted = p.get('mode')
  const mode = wanted && (MODES as readonly string[]).includes(wanted) ? (wanted as Mode) : undefined

  // Standing inside a death.
  //
  // Not assembled: *played*. The fight is opened, the thing is stood on its
  // last point of health, and a real attack is scored through the reducer — so
  // this is the state a save holds if the tab is closed in the two-thirds of a
  // second between the killing hand and the win.
  if (p.has('dying') && roomAt(run).enemy) {
    return playAttack(standEnemyAt(reduce(state, { type: 'FIGHT' }), 1))
  }

  const wantsFight =
    mode === 'combat' ||
    p.has('round') ||
    p.has('enemyHp') ||
    p.has('rolls') ||
    p.has('dice') ||
    p.has('used')

  if (wantsFight && roomAt(run).enemy) {
    state = reduce(state, { type: 'FIGHT' })

    // Rounds are *fought*, not set: each one is a real ROLL and a real SCORE,
    // so the round counter can never disagree with what the fight has spent.
    const rounds = Math.max(1, Math.floor(num(p.get('round')) ?? 1))
    for (let r = 1; r < rounds; r++) {
      if (state.mode !== 'combat' || !state.run?.combat || state.run.combat.defeated) break
      state = playAttack(state)
    }

    // The three escape hatches, applied after the rounds, because they are the
    // things a bounded journey cannot honestly play to.
    const enemyHp = num(p.get('enemyHp'))
    if (enemyHp !== undefined && state.run?.combat && !state.run.combat.defeated) {
      state = standEnemyAt(state, enemyHp)
    }

    const used = list(p.get('used')).filter(isNamedHandId)
    if (used.length > 0 && state.run?.combat) state = standUsedAt(state, used)

    // And the throws, walked to by the presses that reach them. `held: []`
    // every time, so each reroll is a whole new throw.
    const rolls = Math.max(0, Math.min(Math.floor(num(p.get('rolls')) ?? 0), MAX_ROLLS))
    if (rolls > 0 && state.mode === 'combat') {
      state = reduce(state, { type: 'ROLL' })
      for (let r = 1; r < rolls; r++) state = reduce(state, { type: 'REROLL', held: [] })
    }

    const faces = list(p.get('dice'))
      .map((raw) => Number(raw))
      .filter((n): n is DieValue => Number.isInteger(n) && n >= 1 && n <= 6) as DieValue[]
    if (faces.length > 0 && state.run?.combat) state = standDiceAt(state, faces)

    return state
  }

  if (mode === 'dead') {
    return {
      ...state,
      mode: 'dead',
      run: { ...state.run!, bones: 0, cause: 'A fixture. Nothing killed me.' },
    }
  }
  if (mode === 'complete') {
    return { ...state, mode: 'complete', meta: { ...state.meta, wins: state.meta.wins + 1 } }
  }
  if (mode === 'title') return { ...state, mode: 'title', resume: 'explore' }

  return state
}
