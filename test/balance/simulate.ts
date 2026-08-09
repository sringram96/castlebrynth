/**
 * Deterministic simulation, over the real game.
 *
 * Every round below runs through the same reducer the browser does, so the
 * model and the runtime cannot drift apart: **this is not a second
 * implementation of combat**, it is the game with a policy where the thumb
 * goes. If a rule changes in `combat/clash.ts`, the report changes with it and
 * nobody has to remember to update a model.
 *
 * It is also completely separate from the UI. Nothing here imports from `ui/`
 * or `render/`, and the runtime imports nothing from here.
 */

import { maxWidth, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { TITLE } from '../../src/game/state.js'
import type { GameState, RunState } from '../../src/game/state.js'
import { newSpecial, totalBones } from '../../src/content/bones.js'
import type { SpecialBoneId } from '../../src/content/bones.js'
import { enemy } from '../../src/content/enemies.js'
import { room } from '../../src/content/rooms.js'
import { exitsOpen, legal, stateOf } from '../../src/content/interactions.js'
import { charmFor, drinkFor, fieldFor } from './policies.js'
import type { Table, Tier } from './policies.js'
import type { RewardId } from '../../src/content/rewards.js'

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/** Exactly what the screen shows when a decision is due. Nothing else. */
function tableOf(state: GameState): Table {
  const run = state.run!
  const combat = run.combat!
  return {
    enemyLine: combat.enemyLine,
    enemyBones: combat.enemyBones.length,
    tieRule: enemy(combat.enemyId).tieRule,
    commonBones: run.commonBones,
    specials: run.specials,
    charms: run.charms,
    vials: run.vials,
    charmUsed: combat.charmUsed,
  }
}

export interface FightResult {
  readonly enemyId: string
  readonly won: boolean
  readonly rounds: number
  /**
   * Bones of mine that actually broke. The headline number.
   *
   * Counted off the smash records rather than as a start-to-finish difference,
   * because a Vial drunk mid-fight puts bones back and a net figure would then
   * report a fight that cost four bones as costing minus one. What the player
   * feels is what broke.
   */
  readonly bonesLost: number
  /** The net change in the pile, Vials included. Sometimes positive. */
  readonly netBones: number
  /** Named bones lost, by name. A run-shaping loss, not an attrition one. */
  readonly specialsLost: readonly string[]
  readonly bonesLeft: number
  readonly charmsSpent: number
  readonly vialsDrunk: number
}

/**
 * Play one fight to its end.
 *
 * One pass: replaying a fight to recover its end state would run every fight
 * twice for no reason.
 */
export function simulateFight(
  state: GameState,
  tier: Tier,
  maxRounds = 40,
): { readonly result: FightResult; readonly state: GameState } {
  const before = state.run!
  const bonesBefore = totalBones(before)
  const specialsBefore = new Map(before.specials.map((s) => [s.instanceId, s.specialId]))
  const charmsBefore = before.charms
  const vialsBefore = before.vials

  let current = reduce(state, { type: 'FIGHT' })
  const enemyId = current.run?.combat?.enemyId ?? ''
  let rounds = 0
  let broken = 0

  for (; rounds < maxRounds; rounds++) {
    const combat = current.run?.combat
    if (!combat || current.mode !== 'combat') break

    // A killing smash parks the fight on the picture of the thing dying. There
    // is no picture in a simulation, so the model presses through it in the
    // same tick — the win it grants is the same win either way.
    if (combat.defeated) {
      current = reduce(current, { type: 'DEFEAT_DONE' })
      rounds++
      break
    }

    if (drinkFor(tableOf(current), tier)) current = reduce(current, { type: 'DRINK' })

    const decision = fieldFor(tableOf(current), tier)
    if (decision.width < 1) break
    current = play(
      current,
      { type: 'FIELD', width: decision.width, specialIds: decision.specialIds },
      { type: 'THROW' },
    )

    const rolled = current.run?.combat
    if (rolled?.phase === 'rolled') {
      const target = charmFor(tableOf(current), rolled.playerLine ?? [], tier)
      if (target) current = reduce(current, { type: 'CHARM', boneKey: target })
    }

    current = reduce(current, { type: 'SMASH' })
    const smash = current.run?.combat?.lastSmash
    if (smash) broken += smash.playerCommonLost + smash.playerSpecialsLost.length

    if (current.mode !== 'combat') {
      rounds++
      break
    }
    const after = current.run?.combat
    if (after?.defeated) {
      current = reduce(current, { type: 'DEFEAT_DONE' })
      rounds++
      break
    }
    if (after?.phase === 'smashed') current = reduce(current, { type: 'ROUND' })
  }

  const settled = current.run
  const aliveNow = new Set(settled?.specials.map((s) => s.instanceId) ?? [])
  const specialsLost = [...specialsBefore]
    .filter(([id]) => !aliveNow.has(id))
    .map(([, specialId]) => specialId)

  return {
    state: current,
    result: {
      enemyId,
      won: current.mode === 'reward' || current.mode === 'explore',
      rounds,
      bonesLost: broken,
      netBones: (settled ? totalBones(settled) : 0) - bonesBefore,
      specialsLost,
      bonesLeft: settled ? totalBones(settled) : 0,
      charmsSpent: charmsBefore - (settled?.charms ?? 0),
      vialsDrunk: vialsBefore - (settled?.vials ?? 0),
    },
  }
}

export interface Loadout {
  readonly bones?: number
  readonly specials?: readonly SpecialBoneId[]
  readonly charms?: number
  readonly vials?: number
}

/** Open a fight in a named room, with a chosen pile and satchel. */
export function fightIn(roomId: string, seed: number, loadout: Loadout = {}): GameState {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const run = started.run!
  const specials = (loadout.specials ?? []).map((id, i) => newSpecial(id, i))
  const total = loadout.bones ?? totalBones(run)
  const next: RunState = {
    ...run,
    roomId,
    path: [...run.path, roomId],
    specials,
    nextSpecialSerial: specials.length,
    commonBones: Math.max(0, total - specials.length),
    ...(loadout.charms !== undefined ? { charms: loadout.charms } : {}),
    ...(loadout.vials !== undefined ? { vials: loadout.vials } : {}),
  }
  return { ...started, run: next }
}

export interface RunResult {
  readonly reachedExit: boolean
  readonly diedIn?: string
  readonly rooms: number
  readonly bonesLeft: number
  readonly fights: readonly FightResult[]
  /** Named bones and satchel things actually acquired before the run ended. */
  readonly found: number
}

/**
 * A whole run.
 *
 * The deep way is the harder branch — an extra fight before the boss — so it
 * is the pessimistic reading of whether the slice can be finished. It takes
 * the first reward offered, which is what a first-time player does; the
 * heuristic tier prefers a named bone, which is what a player who has read the
 * cards does.
 */
export function simulateRun(seed: number, tier: Tier, { deep = true } = {}): RunResult {
  let state = reduce(TITLE, { type: 'START_RUN', seed })
  const fights: FightResult[] = []
  let found = 0

  const takeReward = (): void => {
    const offer = state.run?.offer
    if (!offer?.[0]) return
    // Naive takes the first card. Heuristic prefers a bone that rolls higher
    // than a common one — the reason to want a named bone at all.
    const wanted: RewardId =
      tier === 'heuristic'
        ? (offer.find((id) => id === 'knuckle') ??
          offer.find((id) => id === 'cinderbone') ??
          offer[0])
        : offer[0]
    state = reduce(state, { type: 'TAKE', id: wanted })
    found++
  }

  for (let step = 0; step < 60; step++) {
    if (state.mode === 'complete') {
      return {
        reachedExit: true,
        rooms: state.run!.path.length,
        bonesLeft: totalBones(state.run!),
        fights,
        found,
      }
    }
    if (state.mode === 'dead') {
      return {
        reachedExit: false,
        diedIn: state.run!.roomId,
        rooms: state.run!.path.length,
        bonesLeft: 0,
        fights,
        found,
      }
    }

    if (state.mode === 'reward') {
      takeReward()
      continue
    }

    const here = room(state.run!.roomId)

    if (here.enemy && !state.run!.cleared.includes(here.id)) {
      const fight = simulateFight(state, tier)
      fights.push(fight.result)
      state = fight.state
      if (state.mode === 'dead') {
        return {
          reachedExit: false,
          diedIn: here.id,
          rooms: state.run!.path.length,
          bonesLeft: 0,
          fights,
          found,
        }
      }
      takeReward()
      continue
    }

    // A room with a font is used on the way past. There is no decision in it —
    // the press costs nothing and the exits do not open until it is made — so
    // the policy tiers have nothing to disagree about here.
    if (here.ritual && state.run!.ritual?.roomId !== here.id) {
      state = reduce(state, { type: 'RITUAL_ROLL' })
      continue
    }

    // A room with machinery is worked on the way past, correctly.
    //
    // Deliberately no model of getting it wrong: the simulator does not misread
    // an enemy line either, and a report that quietly charged every run a bone
    // for a mistake the clues are written to prevent would be measuring the
    // model's ignorance rather than the slice's difficulty.
    const machinery = stateOf(state.run!.rooms, here.id)
    if (machinery && !exitsOpen(machinery)) {
      for (const thing of here.interactables ?? []) {
        if (legal(stateOf(state.run!.rooms, here.id)!, thing.id)) {
          state = reduce(state, { type: 'INTERACT', interactionId: thing.id })
        }
      }
      continue
    }

    const exits = here.exits
    // By the label, not by the destination. The deep way is a *choice at the
    // fork*, and what sits behind it is content's business.
    const chosen = deep ? (exits.find((e) => e.label === 'DEEP') ?? exits[0]) : exits[0]
    if (!chosen) break
    state = play(state, { type: 'GO', to: chosen.to })
  }

  return {
    reachedExit: state.mode === 'complete',
    rooms: state.run!.path.length,
    bonesLeft: state.run ? totalBones(state.run) : 0,
    fights,
    found,
  }
}

/** The widest legal line, for a test that wants the naive press by hand. */
export { maxWidth }
