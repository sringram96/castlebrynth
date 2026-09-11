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
import { breakFor, enemy } from '../../src/content/enemies.js'
import type { ScoreId } from '../../src/combat/hands.js'
import type { IronDieId, ItemDieId, TalismanId } from '../../src/content/dice.js'
import { firstNodeOf, roomAt } from '../../src/game/map.js'
import { legal, stateOf } from '../../src/content/interactions.js'
import { canTake } from '../../src/game/reducer.js'
import type { RewardId } from '../../src/content/rewards.js'
import { buyFor, drinkFor, holdFor, scoreFor, shouldScore } from './policies.js'
import type { DiePolicy, Table, Tier } from './policies.js'
import { generateRunPlan } from '../../src/game/runGenerator.js'
import { claimedIn } from '../../src/game/reducer.js'
import type { CoreDieId } from '../../src/content/dice.js'

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
    // **The rung it is standing on**, not the enemy's nominal figure. A policy may
    // only know what the screen shows, and what the screen shows is `breakFor` of
    // the turn in front of it.
    enemyDamage: breakFor(enemy(combat.enemyId), combat),
    bones: run.bones,
    vials: run.vials,
    talismans: run.talismans,
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
      won: current.mode === 'explore',
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
  /**
   * What the run is carrying, when a cell wants to say.
   *
   * Omitted means *whatever a fresh run starts with*, which is the six, the
   * iron die and the talisman. A cell that passes `ironDice: []` and
   * `talismans: []` is the **bare** reading: the fight with no upside at all,
   * which is the reading a gate is allowed to be set against. See
   * `docs/COMBAT.md` § Balance.
   */
  readonly ironDice?: readonly IronDieId[]
  readonly itemDice?: readonly ItemDieId[]
  readonly talismans?: readonly TalismanId[]
  /**
   * What the six slots hold, when a cell wants to say.
   *
   * Omitted means **six bare bones**, which is the floor every figure in the
   * report is set against: no gate, target or enemy number may require a crooked
   * die any more than it may require the iron. The die swing table is what says
   * what one is worth, and it is never a target.
   */
  readonly hand?: readonly CoreDieId[]
}

/**
 * Open a fight in a named room, with a chosen pile, satchel and loadout.
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
    ...(loadout.ironDice !== undefined ? { ironDice: loadout.ironDice } : {}),
    ...(loadout.itemDice !== undefined ? { itemDice: loadout.itemDice } : {}),
    ...(loadout.talismans !== undefined ? { talismans: loadout.talismans } : {}),
    ...(loadout.hand !== undefined ? { hand: loadout.hand } : {}),
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
  /** Exactly what was picked up, so acquisition can be reported per thing. */
  readonly acquired: readonly RewardId[]
  /** Bones that actually broke, fights and rooms together. */
  readonly bonesLost: number
  /** Core dice actually bought, in the order they were put into the hand. */
  readonly bought: readonly CoreDieId[]
  /** Bones handed over for them. A toll the old report had no row for. */
  readonly spentOnDice: number
  /** What the six slots held when the run ended. */
  readonly hand: readonly CoreDieId[]
  /** Whether the run ever stood in the room the treasure was chained in. */
  readonly reachedTreasure: boolean
  /** And whether it walked out carrying it. */
  readonly tookTreasure: boolean
  /** Which grammar the seed dealt. */
  readonly plan: string
}

/** Which way the policy takes at the Cleft. `left` is the fight. */
export type Branch = 'left' | 'right'

/**
 * A whole run.
 *
 * The deep way is the harder branch — an extra fight before the boss — so it
 * is the pessimistic reading of whether the slice can be finished.
 */
export function simulateRun(
  seed: number,
  tier: Tier,
  {
    deep = true,
    bare = false,
    branch = 'left' as Branch,
    dice = 'never' as DiePolicy,
    hand = undefined as readonly CoreDieId[] | undefined,
  } = {},
): RunResult {
  let state = reduce(TITLE, { type: 'START_RUN', seed })
  if (hand) state = { ...state, run: { ...state.run!, hand } }
  const fights: FightResult[] = []
  const acquired: RewardId[] = []
  const bought: CoreDieId[] = []
  const worked = new Set<string>()
  let bonesLost = 0
  let spentOnDice = 0
  let reachedTreasure = false
  let tookTreasure = false

  /**
   * Answer whatever core dice are lying in this room.
   *
   * The picker is presentation-local, so the model does here exactly what a thumb
   * does: read the die, read the price, and either hand over the bones or walk on.
   * `CLAIM_DIE` is one transition, so there is no half-bought state to model.
   */
  const answerDice = (): void => {
    for (;;) {
      const run = state.run
      if (!run) return
      const here = roomAt(run)
      const claimed = new Set(claimedIn(run))
      const next = here.dice.findIndex((_, index) => !claimed.has(index))
      if (next < 0) return
      const offer = here.dice[next]!
      if (offer.kind === 'treasure') reachedTreasure = true
      const slot = buyFor(
        { die: offer.die, ...(offer.price !== undefined ? { price: offer.price } : {}), bones: run.bones, hand: run.hand },
        dice,
      )
      if (slot === undefined) return
      const after = reduce(state, { type: 'CLAIM_DIE', index: next, slot })
      if (after === state) return
      spentOnDice += offer.price ?? 0
      bought.push(offer.die)
      if (offer.kind === 'treasure') tookTreasure = true
      state = after
    }
  }

  /** Every reading the report wants, whichever way the run ended. */
  const readings = (): Omit<RunResult, 'reachedExit' | 'rooms' | 'bonesLeft' | 'fights' | 'found' | 'acquired' | 'bonesLost' | 'diedIn'> => ({
    bought,
    spentOnDice,
    hand: state.run?.hand ?? [],
    reachedTreasure,
    tookTreasure,
    plan: generateRunPlan(seed).id,
  })

  /**
   * Pick up everything lying in this room that the run can carry.
   *
   * The **bare** reading is now the run that picks nothing up. It used to be a
   * run whose starting loadout was stripped; a fresh run starts with nothing at
   * all, so what "bare" means is *found nothing and took nothing* — which is
   * still the reading a gate is allowed to be set against, and is still the
   * pessimistic one. See docs/COMBAT.md § Balance.
   */
  const takeLoot = (): void => {
    if (bare) return
    for (;;) {
      const run = state.run
      if (!run) return
      const index = (run.loot?.[run.roomId] ?? []).findIndex(
        (l) => !l.taken && canTake(run, l.id),
      )
      if (index < 0) return
      const id = run.loot![run.roomId]![index]!.id
      const next = reduce(state, { type: 'TAKE', index })
      if (next === state) return
      state = next
      acquired.push(id)
    }
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
        found: acquired.length,
        acquired,
        bonesLost,
        ...readings(),
      }
    }
    if (state.mode === 'dead') {
      return {
        reachedExit: false,
        diedIn: roomAt(state.run!).id,
        rooms: state.run!.path.length,
        bonesLeft: 0,
        fights,
        found: acquired.length,
        acquired,
        bonesLost,
        ...readings(),
      }
    }

    if (here.enemy && !state.run!.cleared.includes(here.instanceId)) {
      const before = state.run!.bones
      const fight = simulateFight(state, tier)
      fights.push(fight.result)
      state = fight.state
      bonesLost += fight.result.bonesLost
      void before
      if (state.mode === 'dead') {
        return {
          reachedExit: false,
          diedIn: here.id,
          rooms: state.run!.path.length,
          bonesLeft: 0,
          fights,
          found: acquired.length,
          acquired,
          bonesLost,
          ...readings(),
        }
      }
      takeLoot()
      continue
    }

    // A room with a font is used on the way past. There is no decision in it —
    // the press costs nothing and the exits do not open until it is made — so
    // the policy tiers have nothing to disagree about here.
    if (here.ritual && state.run!.ritual?.roomId !== here.instanceId) {
      state = reduce(state, { type: 'RITUAL_ROLL' })
      continue
    }

    // A room with machinery is worked on the way past, correctly, **once**.
    //
    // Deliberately no model of getting it wrong: the simulator does not misread
    // a scorecard either, and a report that quietly charged every run a bone
    // for a mistake the clues are written to prevent would be measuring the
    // model's ignorance rather than the slice's difficulty.
    //
    // One pass, in declaration order, is enough for every worked room in the
    // slice — the order the objects are written in is the order they have to
    // happen in, which is the same fact the carved clues state. The visited set
    // is what stops a second pass toggling a brazier the first pass put out,
    // and it is why an **optional** room is worked too: the Reliquary costs
    // nothing and holds the Talisman, so a policy that walked past it would be
    // reporting the model's indifference as an acquisition rate.
    if (!worked.has(here.instanceId) && (here.interactables?.length ?? 0) > 0) {
      worked.add(here.instanceId)
      const before = state.run!.bones
      for (const thing of here.interactables ?? []) {
        const now = stateOf(state.run!.rooms, here.instanceId, here.id)
        if (now && legal(now, thing.id)) {
          state = reduce(state, { type: 'INTERACT', interactionId: thing.id })
        }
      }
      // A toll is a cost like any other and the report counts it as one. The
      // Offertory's two bones are what the right-hand branch trades the
      // Gnawing's three-a-round for, and the delta is the whole reason the
      // branch reading exists.
      bonesLost += Math.max(0, before - (state.run?.bones ?? 0))
      if (state.mode === 'dead') {
        return {
          reachedExit: false,
          diedIn: here.id,
          rooms: state.run!.path.length,
          bonesLeft: 0,
          fights,
          found: acquired.length,
          acquired,
          bonesLost,
          ...readings(),
        }
      }
      continue
    }

    // Anything a room has already revealed and left lying about is picked up
    // on the way past — the chest's find, the cage's iron, the recess's candle.
    takeLoot()
    // And whatever is for sale in it is answered: the Carver's table, a chained
    // alcove, the treasure. Which is the whole of Part 4's measurement.
    answerDice()

    const exits = here.exits
    // By the label, not by the destination. Which way is a *choice at a
    // junction*, and what sits behind it is content's business.
    //
    //   DEEP    the Split's long way, an extra toll and an extra fight
    //   NARROW  the Cleft's right-hand branch: a flat toll instead of a fight
    const chosen =
      exits.find((e) => e.label === 'NARROW') && branch === 'right'
        ? exits.find((e) => e.label === 'NARROW')!
        : deep
          ? (exits.find((e) => e.label === 'DEEP') ?? exits[0])
          : exits[0]
    if (!chosen) break
    state = play(state, { type: 'GO', to: chosen.to })
  }

  return {
    reachedExit: state.mode === 'complete',
    rooms: state.run!.path.length,
    bonesLeft: state.run?.bones ?? 0,
    fights,
    found: acquired.length,
    acquired,
    bonesLost,
    ...readings(),
  }
}
