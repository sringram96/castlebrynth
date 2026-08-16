/**
 * Deterministic simulation, over the real game.
 *
 * Every press below runs through the same reducer the browser does, so the
 * model and the runtime cannot drift apart: **this is not a second
 * implementation of combat**, it is the game with a policy where the thumb
 * goes. If a multiplier changes in `combat/hands.ts`, the report changes with
 * it and nobody has to remember to update a model.
 *
 * It is also completely separate from the UI. Nothing here imports from `ui/`
 * or `render/`, and the runtime imports nothing from here.
 */

import { reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { TITLE } from '../../src/game/state.js'
import type { GameState, RunState } from '../../src/game/state.js'
import { enemy } from '../../src/content/enemies.js'
import type { ScoreId } from '../../src/combat/hands.js'
import { firstNodeOf, roomAt } from '../../src/game/map.js'
import { exitsOpen, legal, stateOf } from '../../src/content/interactions.js'
import { drinkFor, holdFor, scoreFor, shouldScore } from './policies.js'
import type { Table, Tier } from './policies.js'

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/** Exactly what the screen shows when a decision is due. Nothing else. */
function tableOf(state: GameState): Table {
  const run = state.run!
  const combat = run.combat!
  return {
    dice: combat.dice,
    rollsUsed: combat.rollsUsed,
    usedHands: combat.usedHands,
    enemyHp: combat.enemyHp,
    enemyMaxHp: combat.enemyMaxHp,
    enemyDamage: enemy(combat.enemyId).damage,
    bones: run.bones,
    vials: run.vials,
  }
}

/** One scored exchange, as the three facts the report is built out of. */
export interface AttackLog {
  readonly hand: ScoreId
  readonly damage: number
  /** How many of the three throws it took. */
  readonly rollsUsed: number
}

export interface FightResult {
  readonly enemyId: string
  readonly won: boolean
  /** Attacks scored. One per exchange. */
  readonly rounds: number
  /**
   * Bones of mine that actually broke. The headline number.
   *
   * Counted off the attack records rather than as a start-to-finish
   * difference, because a Vial drunk mid-fight puts bones back and a net
   * figure would then report a fight that cost four bones as costing minus
   * one. What the player feels is what broke.
   */
  readonly bonesLost: number
  /** The net change in the pile, Vials included. Sometimes positive. */
  readonly netBones: number
  readonly bonesLeft: number
  readonly vialsDrunk: number
  readonly attacks: readonly AttackLog[]
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
  maxRounds = 60,
): { readonly result: FightResult; readonly state: GameState } {
  const bonesBefore = state.run!.bones

  let current = reduce(state, { type: 'FIGHT' })
  const enemyId = current.run?.combat?.enemyId ?? ''
  const attacks: AttackLog[] = []
  let broken = 0
  // Counted as presses, not as a difference: the Marrow pays a Vial on the
  // way out, so a satchel that starts and ends at one may have been emptied
  // and refilled — and a net figure would report that as never having drunk.
  let drank = 0

  for (let round = 0; round < maxRounds; round++) {
    const combat = current.run?.combat
    if (!combat || current.mode !== 'combat') break

    // A killing attack parks the fight on the picture of the thing dying.
    // There is no picture in a simulation, so the model presses through it in
    // the same tick — the win it grants is the same win either way.
    if (combat.defeated) {
      current = reduce(current, { type: 'DEFEAT_DONE' })
      break
    }

    if (drinkFor(tableOf(current), tier)) {
      const filled = reduce(current, { type: 'DRINK' })
      if (filled !== current) drank++
      current = filled
    }
    if ((current.run?.bones ?? 0) === 0) break

    current = reduce(current, { type: 'ROLL' })
    if ((current.run?.combat?.dice.length ?? 0) === 0) break

    // Throw, hold, throw again — up to the three the attack is given.
    for (;;) {
      const table = tableOf(current)
      if (shouldScore(table, tier)) break
      const next = reduce(current, { type: 'REROLL', held: holdFor(table, tier) })
      if (next === current) break
      current = next
    }

    const table = tableOf(current)
    const hand = scoreFor(table, tier)
    if (!hand) break
    current = reduce(current, { type: 'SCORE', hand })

    const record = current.run?.combat?.lastAttack
    if (record) {
      attacks.push({ hand: record.hand, damage: record.damage, rollsUsed: table.rollsUsed })
      broken += record.retaliation
    }

    if (current.mode !== 'combat') break
  }

  const settled = current.run
  return {
    state: current,
    result: {
      enemyId,
      won: current.mode === 'reward' || current.mode === 'explore',
      rounds: attacks.length,
      bonesLost: broken,
      netBones: (settled?.bones ?? 0) - bonesBefore,
      bonesLeft: settled?.bones ?? 0,
      vialsDrunk: drank,
      attacks,
    },
  }
}

export interface Loadout {
  readonly bones?: number
  readonly vials?: number
}

/**
 * Open a fight in a named room, with a chosen pile and satchel.
 *
 * Named by its **authored template** — `hollow`, `deep`, `gate` — because that
 * is what the report's rows are about, and resolved to whichever node of this
 * run's map used it. The model never invents a room: it stands the run in one
 * the director actually built.
 */
export function fightIn(templateId: string, seed: number, loadout: Loadout = {}): GameState {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const run = started.run!
  const node = firstNodeOf(run.map, templateId)
  if (!node) throw new Error(`this run has no ${templateId} in it`)
  const next: RunState = {
    ...run,
    roomId: node.id,
    path: [...run.path, node.id],
    ...(loadout.bones !== undefined ? { bones: loadout.bones } : {}),
    ...(loadout.vials !== undefined ? { vials: loadout.vials } : {}),
  }
  return { ...started, run: next }
}

export interface RunResult {
  readonly reachedExit: boolean
  /** Which authored room the run ended in. Template, not node: the report is
   *  about which *fight* kills people, not which instance of it. */
  readonly diedIn?: string
  readonly rooms: number
  readonly bonesLeft: number
  readonly fights: readonly FightResult[]
  /** Satchel things actually acquired before the run ended. */
  readonly found: number
}

/**
 * A whole run.
 *
 * The deep way is the harder branch — an extra fight before the boss — so it
 * is the pessimistic reading of whether the slice can be finished.
 */
export function simulateRun(seed: number, tier: Tier, { deep = true } = {}): RunResult {
  let state = reduce(TITLE, { type: 'START_RUN', seed })
  const fights: FightResult[] = []
  let found = 0

  const takeReward = (): void => {
    const offer = state.run?.offer
    if (!offer?.[0]) return
    state = reduce(state, { type: 'TAKE', id: offer[0] })
    found++
  }

  for (let step = 0; step < 60; step++) {
    // The room the run is standing in, joined from the generated map. There is
    // no second map here and there could not be one: the model walks the exits
    // the reducer would accept, or it walks nothing.
    const here = roomAt(state.run!)

    if (here.ending || state.mode === 'complete') {
      return {
        reachedExit: true,
        rooms: state.run!.path.length,
        bonesLeft: state.run!.bones,
        fights,
        found,
      }
    }
    if (state.mode === 'dead') {
      return {
        reachedExit: false,
        diedIn: roomAt(state.run!).id,
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

    if (here.enemy && !state.run!.cleared.includes(here.instanceId)) {
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
    if (here.ritual && state.run!.ritual?.roomId !== here.instanceId) {
      state = reduce(state, { type: 'RITUAL_ROLL' })
      continue
    }

    // A room with machinery is worked on the way past, correctly.
    //
    // Deliberately no model of getting it wrong: the simulator does not misread
    // a scorecard either, and a report that quietly charged every run a bone
    // for a mistake the clues are written to prevent would be measuring the
    // model's ignorance rather than the slice's difficulty.
    const machinery = stateOf(state.run!.rooms, here.instanceId, here.id)
    if (machinery && !exitsOpen(machinery)) {
      for (const thing of here.interactables ?? []) {
        if (legal(stateOf(state.run!.rooms, here.instanceId, here.id)!, thing.id)) {
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
    bonesLeft: state.run?.bones ?? 0,
    fights,
    found,
  }
}
