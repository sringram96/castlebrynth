/**
 * Dev fixtures: reach any mode from a URL.
 *
 * Every mode must be reachable without playing to it, or the tests that cover
 * the ends of the game — dying, getting out, a fight one lane from over —
 * become forty presses long and nobody writes them. That is how the old build
 * ended up with a death screen nobody had ever automated.
 *
 *   ?seed=7                     a known run
 *   ?room=gate                  stand in the first room of the run built from
 *                               that authored template
 *   ?node=n8                    stand in one exact room of the generated map,
 *                               for when a template is used more than once
 *   ?bones=12                   a thinner pile
 *   ?specials=cinderbone,knuckle  named bones in the pile
 *   ?vials=2                    a stocked satchel
 *   ?charms=1
 *   ?enemyBones=3               a fight with most of its army already broken
 *   ?round=2                    the fight standing on a later round
 *   ?phase=thrown|fielded|rolled|smashed
 *   ?width=4                    what to field, when the phase needs one
 *   ?mode=combat                open the room's fight, or jump to an ending
 *   ?dying=1                    the room's enemy finished, mid-death — what a
 *                               save written a third of a second before the
 *                               win holds
 *   ?reliquary=solved           the chest open, its reward already taken
 *   ?reliquary=dark             bell rung and brazier out — the lever live
 *   ?vault=weighted             the cage down on the plate, gate still shut
 *   ?vault=open                 the gate up, and the way on with it
 *
 * A fixture builds a real run and hands it to the real reducer. **Every phase
 * below is reached by playing the actions that reach it** — FIELD, THROW,
 * SMASH — so a fixture cannot stand the game in a position it could not reach
 * on its own; it only skips the walk. Nothing here is a cheat worth hiding —
 * the whole game is client-side — and it is inert unless a parameter is
 * present.
 */

import { BONE_CEILING, isSpecialBoneId, newSpecial } from '../content/bones.js'
import type { SpecialBoneInstance } from '../content/bones.js'
import { firstNodeOf, roomAt } from './map.js'
import { maxWidth, newRun, reduce } from './reducer.js'
import type { Action } from './reducer.js'
import { SAVE_VERSION } from './state.js'
import type { CombatPhase, GameState, Mode } from './state.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

const MODES: readonly Mode[] = ['title', 'explore', 'combat', 'reward', 'dead', 'complete']
const PHASES: readonly CombatPhase[] = ['thrown', 'fielded', 'rolled', 'smashed']

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
  'specials',
  'vials',
  'charms',
  'enemyBones',
  'round',
  'phase',
  'width',
  'mode',
  'dying',
  'reliquary',
  'vault',
]

export function hasFixture(search: string): boolean {
  const p = new URLSearchParams(search)
  return KEYS.some((k) => p.has(k))
}

/**
 * Cut an enemy's army down to `keep` bones, army and line together.
 *
 * The army and the fielded line are two views of the same bones, and they have
 * to be cut as one: slicing them independently keeps `gnawing:common:0` in the
 * army while showing whichever bone happened to roll highest, and then killing
 * what is on screen removes nothing. Which is exactly the bug this helper
 * exists to make unwriteable.
 *
 * The bones kept are the ones at the **bottom** of the line, because a fixture
 * that stands a fight one lane from over wants the weakest survivors — and
 * `doomed` puts the last of them on a 1 so a wide line is certain to take it.
 */
function standArmyAt(state: GameState, keep: number, doomed = false): GameState {
  const combat = state.run?.combat
  if (!combat) return state
  const kept = combat.enemyLine.slice(-Math.max(1, Math.min(keep, combat.enemyLine.length)))
  const ids = new Set(kept.map((b) => b.enemyBoneId))
  return {
    ...state,
    run: {
      ...state.run!,
      combat: {
        ...combat,
        enemyBones: combat.enemyBones.filter((b) => ids.has(b.boneId)),
        enemyLine: doomed ? kept.map((b) => ({ ...b, value: 1, faceIndex: 0 })) : kept,
      },
    },
  }
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

  // The pile. Specials are instantiated exactly as TAKE would instantiate
  // them, serial and all, so a fixture's Cinderbone is the same object a found
  // one is and dies the same way.
  const specials: SpecialBoneInstance[] = []
  for (const id of list(p.get('specials'))) {
    if (isSpecialBoneId(id)) specials.push(newSpecial(id, specials.length))
  }
  if (specials.length > 0) {
    run = { ...run, specials, nextSpecialSerial: specials.length }
  }

  const bones = num(p.get('bones'))
  if (bones !== undefined) {
    const common = Math.max(0, Math.min(Math.floor(bones), BONE_CEILING) - run.specials.length)
    run = { ...run, commonBones: Math.max(0, common) }
  } else if (specials.length > 0) {
    // Taking a bone at the ceiling transmutes a common one, so a fixture that
    // adds specials without naming a total keeps the total where it was.
    run = { ...run, commonBones: Math.max(0, run.commonBones - specials.length) }
  }

  const vials = num(p.get('vials'))
  if (vials !== undefined) run = { ...run, vials: Math.max(0, Math.floor(vials)) }
  const charms = num(p.get('charms'))
  if (charms !== undefined) run = { ...run, charms: Math.max(0, Math.floor(charms)) }

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
  // Not assembled: *played*. The fight is opened, the army is stood down to
  // its last bone and a real round is fought through the reducer — so this is
  // the state a save holds if the tab is closed in the two-thirds of a second
  // between the last break and the win.
  if (p.has('dying') && roomAt(run).enemy) {
    const opened = reduce(state, { type: 'FIGHT' })
    // One enemy bone left, standing on a 1. Both are positions the fight
    // reaches on its own — a wide line against a single low bone is an
    // ordinary last round — so this only skips the rounds that get there.
    const doomed = standArmyAt(opened, 1, true)
    return play(
      doomed,
      { type: 'FIELD', width: maxWidth(doomed.run!), specialIds: [] },
      { type: 'THROW' },
      { type: 'SMASH' },
    )
  }

  const wantsFight =
    mode === 'combat' || p.has('enemyBones') || p.has('round') || p.has('phase') || p.has('width')

  if (wantsFight && roomAt(run).enemy) {
    state = reduce(state, { type: 'FIGHT' })

    // Rounds are *fought*, not set: each one is a real FIELD/THROW/SMASH, so
    // the enemy line a fixture lands on is the line those rounds produced and
    // the round counter can never disagree with the army standing behind it.
    const rounds = Math.max(1, Math.floor(num(p.get('round')) ?? 1))
    for (let r = 1; r < rounds; r++) {
      const here = state.run?.combat
      if (!here || here.defeated || state.mode !== 'combat') break
      state = play(
        state,
        { type: 'FIELD', width: maxWidth(state.run!), specialIds: [] },
        { type: 'THROW' },
        { type: 'SMASH' },
        { type: 'ROUND' },
      )
    }

    // How much of its army is left. Applied after the rounds, because it is the
    // one thing a fixture cannot honestly play to in a bounded number of steps.
    const enemyBones = num(p.get('enemyBones'))
    if (enemyBones !== undefined && state.run?.combat && !state.run.combat.defeated) {
      state = standArmyAt(state, Math.floor(enemyBones))
    }

    // And the phase, walked to by the actions that reach it.
    const wantedPhase = p.get('phase')
    const phase =
      wantedPhase && (PHASES as readonly string[]).includes(wantedPhase)
        ? (wantedPhase as CombatPhase)
        : undefined
    if (phase && phase !== 'thrown' && state.run?.combat && state.mode === 'combat') {
      const width = Math.max(
        1,
        Math.min(Math.floor(num(p.get('width')) ?? maxWidth(state.run)), maxWidth(state.run)),
      )
      const specialIds = state.run.specials.slice(0, width).map((s) => s.instanceId)
      state = reduce(state, { type: 'FIELD', width, specialIds })
      if (phase === 'rolled' || phase === 'smashed') state = reduce(state, { type: 'THROW' })
      if (phase === 'smashed') state = reduce(state, { type: 'SMASH' })
    } else if (!phase && p.has('width') && state.run?.combat) {
      const width = Math.max(1, Math.min(Math.floor(num(p.get('width'))!), maxWidth(state.run)))
      state = reduce(state, { type: 'FIELD', width, specialIds: [] })
    }
    return state
  }

  if (mode === 'dead') {
    return {
      ...state,
      mode: 'dead',
      run: {
        ...state.run!,
        commonBones: 0,
        specials: [],
        cause: 'A fixture. Nothing killed me.',
      },
    }
  }
  if (mode === 'complete') {
    return { ...state, mode: 'complete', meta: { ...state.meta, wins: state.meta.wins + 1 } }
  }
  if (mode === 'title') return { ...state, mode: 'title', resume: 'explore' }

  return state
}
