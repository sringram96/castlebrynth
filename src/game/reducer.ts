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

import { STARTING_BONES, roomToRecover } from '../content/bones.js'
import { LOOT_REWARDS, ironDieOf, itemDieOf, reward } from '../content/rewards.js'
import type { RewardId } from '../content/rewards.js'
import {
  CORE_RULE,
  HAND_SLOTS,
  IRON_CAP,
  ITEM_CAP,
  STARTING_HAND,
  STARTING_IRON,
  STARTING_TALISMANS,
  coreDie,
  ironDie,
  isCoreDieId,
  itemDie,
  talisman,
} from '../content/dice.js'
import type { CoreDieId, TalismanId } from '../content/dice.js'
import { breakFor, enemy } from '../content/enemies.js'
import type { Enemy } from '../content/enemies.js'
import { defeatOf } from '../content/defeat.js'
import { exitsOpen, legal, stateOf } from '../content/interactions.js'
import {
  legalScores,
  scoreName,
} from '../combat/hands.js'
import type { NamedHandId, ScoreId } from '../combat/hands.js'
import {
  answerAfterBlock,
  blockOf,
  itemCostOf,
  itemFlatsOf,
  rollItems,
  rollIron,
  talismanFlatOf,
  talismansFor,
  totalsFor,
} from '../combat/loadout.js'
import { MAX_ROLLS, canonicalHeld, rerollHand, rollHand } from '../combat/roll.js'
import { roomAt } from './map.js'
import type { DieOffer, ResolvedRoom } from './map.js'
import { generateRun } from './runGenerator.js'
import { RELIQUARY_CHANNEL, RITUAL_CHANNEL, RNG_CHANNEL, combatSalt, nodeSalt, rngAt } from './rng.js'
import type { Rng } from './rng.js'
import { SAVE_VERSION } from './state.js'
import type {
  AttackRecord,
  CombatState,
  GameState,
  LootItem,
  MetaState,
  RitualRoll,
  RoomInteractionState,
  RunState,
} from './state.js'

export type Action =
  | { readonly type: 'START_RUN'; readonly seed?: number }
  | { readonly type: 'TITLE' }
  | { readonly type: 'CONTINUE' }
  | { readonly type: 'LOOK'; readonly detailId: string }
  | { readonly type: 'GO'; readonly to: string }
  | { readonly type: 'FIGHT' }
  /** Throw the bones the pile can put up. Once per attack, and first. */
  | { readonly type: 'ROLL' }
  /**
   * Throw again, keeping what was held.
   *
   * It carries the decision, because the decision is the player's and the view
   * is not what makes it legal: `held` is a bare list of positions, and the
   * reducer canonicalises it — unique, in range, sorted — before a die moves.
   * A stale index from a wider roll changes nothing; a repeat of the same
   * index changes nothing; and a reroll with everything held is refused rather
   * than charged, because it is not a throw.
   *
   * The selection itself lives in the **view** until this moment. It is a
   * thought, not a move, and a reload before the press loses an unfinished
   * thought rather than granting another roll.
   */
  | { readonly type: 'REROLL'; readonly held: readonly number[] }
  /** Commit the dice as one hand. The whole attack, in one tick. */
  | { readonly type: 'SCORE'; readonly hand: ScoreId }
  /**
   * Put a found die into one of the six slots, in place of what was there.
   *
   * The whole of the progression model, as one action: the run carries six
   * slots and a found die **replaces** one of them. There is no ADD_DIE and
   * there is nowhere to write one — the array is six long and this action
   * cannot lengthen it.
   *
   * The economy that finds a die is the next wave's, and deliberately not
   * here. What lands now is the shape, the transition and its coverage; see
   * `docs/COMBAT.md` § Open questions.
   */
  | { readonly type: 'REPLACE_DIE'; readonly slot: number; readonly die: CoreDieId }
  /**
   * Take the nth core die lying in this room, in place of one of the six.
   *
   * **One transition for the whole of it**: the price charges, the slot is
   * swapped, and the seat is marked claimed, all in the same tick, so there is no
   * state anywhere in which a run has paid and not been given the die. That is
   * the whole reason this exists beside `REPLACE_DIE` rather than being two
   * dispatches — and it is why the picker that chooses the slot is
   * presentation-local: opening it commits nothing, and cancelling leaves the die
   * exactly where it lay, uncharged.
   *
   * It is **never lethal**. A press is not offered when the pile is not strictly
   * bigger than the price, and it is refused here as well, because the view's
   * claim that a press is legal is not what makes it legal.
   */
  | { readonly type: 'CLAIM_DIE'; readonly index: number; readonly slot: number }
  | { readonly type: 'DRINK' }
  /**
   * Pick up the nth thing lying in this room.
   *
   * By **position in the room**, not by what it is: two Vials beside one body
   * are two objects, and a press has to be able to say which one it was. There
   * is no reward screen behind this and no offer to close — the thing was in
   * the room before the press and the run is carrying it after, and that is
   * the whole of the transition.
   */
  | { readonly type: 'TAKE'; readonly index: number }
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
 * What a face of the font gives back, in bones.
 *
 * `d6 + 2`, capped by the room left under the ceiling. Flat and legible: a
 * player can read the die and know the answer before the basin says it, which
 * is what a healing room in a push-your-luck game is for. The worst face is
 * still worth three bones, so a press is never a wasted press unless the pile
 * is already full — and at full it says so plainly rather than paying nothing
 * and looking broken.
 */
export const FONT_BONUS = 2

export function fontRestore(roll: RitualRoll, room: number): number {
  return Math.max(0, Math.min(roll + FONT_BONUS, room))
}

/** What one Vial puts back, before the ceiling is applied. */
export const VIAL_BONES = 5

const NUMBER: readonly string[] = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

/**
 * What the room says about what just happened.
 *
 * The face is already on screen and readable, so the line names it rather than
 * repeating it as a digit, states the bones, and stops.
 */
function ritualSay(roll: RitualRoll, restored: number): string {
  if (restored === 0) return `${NUMBER[roll]}. The basin turns. The pile is already full.`
  if (restored === 1) return `${NUMBER[roll]}. One bone clatters back into the pile.`
  return `${NUMBER[roll]}. ${restored} bones clatter back into the pile.`
}

// ── helpers ────────────────────────────────────────────────────────────

const remember = (meta: MetaState, rewards: readonly string[]): MetaState => ({
  ...meta,
  seenRewards: [...new Set([...meta.seenRewards, ...rewards])],
})

/** The run's generator, positioned by how much of the run has happened. */
function rngFor(run: RunState, salt: number): Rng {
  return rngAt(run.seed, salt)
}

/**
 * Where one draw of a fight sits: the path, the round, which roll, which
 * channel.
 *
 * Four terms rather than three, because an attack draws up to three times
 * before it is scored. Derived and never stored, so a reload before ROLL and a
 * press of ROLL land on the same faces, and a REROLL replayed with the same
 * held positions lands on the same faces again.
 */
function fightRng(run: RunState, round: number, rollNumber: number, channel: number): Rng {
  return rngFor(run, combatSalt(run.roomId, round, rollNumber, channel))
}

/**
 * Where the font's one draw sits in the same stream.
 *
 * The same rule as a fight: seed plus **which room**, derived rather than
 * stored, so a save can never disagree with it. There is no round here — the
 * room is one press — so the position is the node's own identity and a
 * constant of its own.
 *
 * It used to be the path length, which was an honest position only while the
 * descent was a line. The map is a DAG: both branches of the Cleft arrive at
 * the same confluence by routes of the same length today and might not
 * tomorrow, and a draw that changed with how you walked to a room would be a
 * chest you could shake. Two lines of insurance, recorded rather than debated.
 */
function ritualSalt(run: RunState): number {
  return (nodeSalt(run.roomId) + RITUAL_CHANNEL) >>> 0
}

/** And the reliquary's, with a constant that keeps it clear of both. */
function reliquarySalt(run: RunState): number {
  return (nodeSalt(run.roomId) + RELIQUARY_CHANNEL) >>> 0
}

/**
 * Draw one id, weighted, and take it out of the pool.
 *
 * Rarity lives on the reward rather than in a table curated per enemy, so the
 * cadence of the whole slice can be read in `content/rewards.ts`. Within one
 * offer the draw is without replacement, so a screen never shows the same card
 * twice — and a pool that runs dry simply offers fewer.
 */
function drawWeighted(pool: RewardId[], rng: Rng): RewardId | undefined {
  if (pool.length === 0) return undefined
  const total = pool.reduce((sum, id) => sum + reward(id).weight, 0)
  let ticket = rng.next() * total
  for (let i = 0; i < pool.length; i++) {
    ticket -= reward(pool[i]!).weight
    if (ticket < 0) return pool.splice(i, 1)[0]!
  }
  return pool.pop()!
}

/**
 * What a room's container holds.
 *
 * **An authored find beats the pool, always.** A template that names a `find`
 * is a room that contains a specific thing — the Talisman of the Pair is in the
 * Reliquary, the Rustplate is in the cage, the Grave Candle is in the
 * Offertory's recess — and that is what makes a route a build choice rather
 * than a lottery. A template that names nothing draws, and the draw machinery
 * stays for the rooms that will want it.
 *
 * Either way the answer is settled **once**, in the tick the container opened,
 * and written onto the node as loot. A reload reads that record rather than
 * drawing again, which is the same law a ritual's roll is kept under.
 */
function chestReward(here: ResolvedRoom, rng: Rng): RewardId | undefined {
  return here.find ?? drawWeighted([...LOOT_REWARDS], rng)
}

// ── loot: things lying in rooms ────────────────────────────────────────

/** What is lying in one room of this run. Empty is the ordinary answer. */
export function lootIn(run: RunState, nodeId: string = run.roomId): readonly LootItem[] {
  return run.loot?.[nodeId] ?? []
}

/**
 * Put things on the floor of the room the run is standing in.
 *
 * Appended, never replaced: a fight that pays two things pays two objects, and
 * a room that reveals a second one later stands it beside the first.
 */
function placeLoot(run: RunState, ids: readonly RewardId[]): RunState {
  if (ids.length === 0) return run
  const here = lootIn(run)
  return {
    ...run,
    loot: { ...run.loot, [run.roomId]: [...here, ...ids.map((id) => ({ id, taken: false }))] },
  }
}

/** Whether anything in this room is still lying there unclaimed. */
export function unclaimedIn(run: RunState, nodeId: string = run.roomId): readonly LootItem[] {
  return lootIn(run, nodeId).filter((l) => !l.taken)
}

// ── core dice: the hand, for sale ──────────────────────────────────────

/** Which seats in this room have already been emptied. */
export function claimedIn(run: RunState, nodeId: string = run.roomId): readonly number[] {
  return run.claimed?.[nodeId] ?? []
}

/**
 * The core dice still lying in this room, with the seat each one is on.
 *
 * The index is the **position in the room's offer list**, not a position in what
 * is left — exactly as `TAKE` addresses loot by position in the room. A press has
 * to be able to say which object it was, and a list that renumbered itself as
 * things were bought could not.
 */
export function diceOnOffer(
  run: RunState,
  nodeId: string = run.roomId,
): readonly { readonly index: number; readonly offer: DieOffer }[] {
  const claimed = new Set(claimedIn(run, nodeId))
  return roomAt(run, nodeId).dice.flatMap((offer, index) =>
    claimed.has(index) ? [] : [{ index, offer }],
  )
}

/**
 * Whether a die in a room can be taken at all.
 *
 * **A bargain is never lethal.** The pile has to be strictly bigger than the
 * price — three bones out of three is not a trade, it is the room killing you for
 * a die you will not live to throw — and the press is hidden rather than greyed,
 * with the say line owning the refusal. The treasure has no price and is always
 * takeable: what it cost was the road.
 *
 * One question, one answer, asked by the reducer before a claim is honoured and
 * by the view before a verb is drawn.
 */
export function canClaim(run: RunState, offer: DieOffer): boolean {
  return offer.price === undefined || run.bones > offer.price
}

/** Why a die cannot be taken, in the words the player is owed. */
export function refusalForDie(run: RunState, offer: DieOffer): string | undefined {
  if (canClaim(run, offer)) return undefined
  const price = offer.price ?? 0
  return run.bones === price
    ? `It wants ${NUMBER[price]?.toLowerCase() ?? price}. I have ${NUMBER[price]?.toLowerCase() ?? price}. No.`
    : `It wants ${price}. I have ${run.bones}.`
}

/**
 * What a die lying in a room says when it is looked at.
 *
 * Name, and the price before the press. The **strip** is drawn under it by the
 * word band, off the die's own table — a found thing states its exact mechanic
 * where it lies, and since the faces are drawn rather than described, the faces
 * are what the LOOK is for.
 */
function dieSay(run: RunState, offer: DieOffer): string {
  const die = coreDie(offer.die)
  const refused = refusalForDie(run, offer)
  if (offer.price === undefined) {
    return `${die.name}. ${die.flavour} It is not priced. It cost what it cost to get here.`
  }
  return `${die.name}. ${die.flavour} ${refused ?? `${NUMBER[offer.price] ?? offer.price} of my bones.`}`
}

/** What the room says about a press that changed something. */
function interactionSay(after: RoomInteractionState, id: string, found?: RewardId): string {
  if (after.templateId === 'reliquary') {
    if (id === 'reliquary-bell') return 'The bell answers once. Something shifts behind the altar.'
    if (id === 'reliquary-brazier') {
      return after.brazier === 'out'
        ? 'The flame folds into the wick. In the dark, the handle under the basin catches the red window-light.'
        : 'The flame returns.'
    }
    return found
      ? `Something moves inside the altar. The chest opens on a ${reward(found).name}.`
      : 'Something moves inside the altar. The chest opens on nothing at all.'
  }
  if (after.templateId === 'offertory') {
    if (id === 'offertory-candles') {
      return after.candles === 'out'
        ? 'The flames fold into the wicks. In the dark, the carving beside the slot catches what light is left.'
        : 'The flames come back.'
    }
    return found
      ? `Two bones into the slot. The wall grinds open on a ${reward(found).name}, and so does the way out.`
      : 'Two bones into the slot. The wall grinds open, and so does the way out.'
  }
  if (id === 'vault-chain') {
    return after.cage === 'lowered'
      ? 'The cage drops onto the plate. Something heavy unlocks inside the wall.'
      : 'The chain takes the weight again. The plate comes back up.'
  }
  return found
    ? `The weight holds. The lever stays down. The gate rises, and the cage is holding a ${reward(found).name}.`
    : 'The weight holds. The lever stays down. The gate rises.'
}

/** What the vault kills you with, when it does. */
const VAULT_CAUSE = 'The chain mechanism.'

/** And the offertory, which charges for the correct answer and for the wrong one. */
const OFFERTORY_CAUSE = 'The offertory.'

/** What the slot costs, printed on the verb before it charges. */
export const OFFERTORY_PRICE = 2

/**
 * Take bones out of the pile, for something that is not a fight.
 *
 * One helper, so every non-combat cost in the game — the vault's backlash, the
 * offertory's price and its backlash, whatever wants one next — spends the pile
 * the same way. It answers with what it actually took, because a pile with one
 * bone in it pays a two-bone toll with one bone and the copy has to be honest
 * about that.
 */
export function loseBones(run: RunState, wanted: number): {
  readonly run: RunState
  readonly took: number
} {
  const took = Math.max(0, Math.min(wanted, run.bones))
  return { run: took === 0 ? run : { ...run, bones: run.bones - took }, took }
}

/**
 * Put bones back, never above the ceiling.
 *
 * The one place recovery arithmetic lives. It answers with what it actually
 * gave, because zero is a real answer and the copy has to be able to say so.
 */
function recover(run: RunState, wanted: number): { readonly run: RunState; readonly gave: number } {
  const gave = Math.max(0, Math.min(wanted, roomToRecover(run)))
  return { run: gave === 0 ? run : { ...run, bones: run.bones + gave }, gave }
}

/**
 * A run at its waking.
 *
 * Thirty bones, an empty satchel, and no trace of the run before it. Note what
 * is absent: `combat`, `offer` and `cause`, which is the invariant the
 * stuck-on-death bug turned on.
 */
export function newRun(seed: number): RunState {
  // The descent is generated here, once, and stored. Everything after this
  // point reads the map; nothing anywhere rebuilds it. See `runGenerator.ts`.
  const map = generateRun(seed >>> 0)
  const run: RunState = {
    seed: seed >>> 0,
    map,
    roomId: map.start,
    bones: STARTING_BONES,
    // Six ordinary bones, one iron die and one talisman. The iron and the
    // talisman are **provisional starting content** for this wave — the
    // replacement economy that would otherwise hand them out is the next
    // wave's — and they are recorded as such in `docs/COMBAT.md`. Item dice
    // start empty and are found: they enter a run through the reward flow.
    hand: [...STARTING_HAND],
    ironDice: [...STARTING_IRON],
    itemDice: [],
    talismans: [...STARTING_TALISMANS],
    vials: 0,
    looked: [],
    cleared: [],
    path: [map.start],
    say: '',
  }
  return { ...run, say: roomAt(run).arrival }
}

// ── the fight ──────────────────────────────────────────────────────────

/** Open a fight against the room's enemy. It rolls nothing. */
function beginCombat(run: RunState): CombatState {
  const id = roomAt(run).enemy
  if (!id) throw new Error(`${run.roomId} has no enemy`)
  const e = enemy(id)
  return {
    enemyId: id,
    round: 1,
    enemyHp: e.maxHp,
    enemyMaxHp: e.maxHp,
    usedHands: [],
    dice: [],
    rollsUsed: 0,
    // The iron has not been thrown yet. It is thrown by ROLL, with the six.
    ironRolls: [],
    log: e.rule ? [e.tell, e.rule] : [e.tell],
  }
}

/** Whether a fight is live: open, not won, not being watched dying. */
function live(state: GameState, run: RunState | undefined): run is RunState {
  return state.mode === 'combat' && !!run?.combat && !run.combat.defeated
}

/** How a multiplier prints. `2`, `1.25`, `0.5` — never `2.00`. */
function showMultiplier(multiplier: number): string {
  return String(multiplier)
}

/**
 * What an exchange did, in beats, for the word band.
 *
 * The same order the cascade plays in, so the band is a transcript rather than
 * a summary: the line, then what the items and the talisman added to it, then
 * what it took off the thing, then what the thing took off you and what the
 * iron held back.
 */
function attackSay(e: Enemy, record: AttackRecord): readonly string[] {
  const beats: string[] = []

  const flats: string[] = []
  if (record.itemFlats > 0) flats.push(`+${record.itemFlats}`)
  if (record.talismanFlat > 0) flats.push(`+${record.talismanFlat}`)
  const line = `${scoreName(record.hand)}. ${record.sum} × ${showMultiplier(record.multiplier)}`

  if (record.itemCost > 0) {
    beats.push(
      `The ${record.itemCost === 1 ? 'die takes a bone' : `dice take ${record.itemCost} bones`}.`,
    )
  }

  // A cost that emptied the pile ends the run at the item beat, before the
  // blow. There is no hit to narrate, and pretending there was one would be
  // the band contradicting the record.
  if (!record.landed) {
    beats.push('That was all of them. The blow never lands.')
    return beats
  }

  beats.push(
    flats.length > 0
      ? `${line} = ${record.base}${flats.join('')} — ${record.damage}.`
      : `${line} — ${record.damage}.`,
  )
  beats.push(`${e.name}: ${record.enemyHpBefore} → ${Math.max(0, record.enemyHpAfter)}.`)

  if (record.enemyHpAfter <= 0) {
    beats.push('It stops.')
  } else if (record.block > 0 && record.retaliation === 0) {
    beats.push(`It swings ${record.enemyHit}. The iron takes all of it.`)
  } else if (record.bonesAfter === 0) {
    beats.push(`It breaks ${record.retaliation}. That was all of them.`)
  } else {
    const held = record.block > 0 ? ` The iron held ${record.block}.` : ''
    beats.push(
      `It breaks ${record.retaliation} of mine. ${record.bonesBefore} → ${record.bonesAfter} bones.${held}`,
    )
  }
  return beats
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
 *      table, weighted by rarity.
 *
 * Nothing is padded *up*: if one thing remains, one is offered. An empty
 * return is a real answer — the fight gave nothing — and the room says so
 * plainly rather than leaving it looking like the offer screen failed.
 */
export function offerFor(run: RunState, enemyId: string, rng: Rng): readonly RewardId[] {
  // An enemy that declares no reward gives none. That is content saying so,
  // not a table that happened to run dry — the boss stands at the way out, and
  // the open door is the reward.
  const e = enemy(enemyId)
  if (e.rewards.length === 0 || e.rewardChoices === 0) return []
  if (rng.next() >= e.rewardChance) return []

  const pool = [...e.rewards]
  const out: RewardId[] = []
  while (out.length < e.rewardChoices) {
    const drawn = drawWeighted(pool, rng)
    if (!drawn) break
    out.push(drawn)
  }
  return out
}

/**
 * The fight is over and the room is yours.
 *
 * The one place a win is granted, called from exactly two: the SCORE that
 * emptied a health total with no death to show, and the `DEFEAT_DONE` that
 * ends one that had. Both hand it the same `run` — the pile already settled —
 * and both get the same answer, because everything it draws on comes from the
 * run's own generator at a fixed position. A death that is watched and a death
 * that is skipped pay identically, and neither can pay twice: `combat` is gone
 * from the state it returns, so a second call has no fight left to win.
 *
 * **What it pays falls beside the body.** There is no reward screen and no
 * offer: the guaranteed drop and the rolled one are separate objects lying in
 * the room, with their own LOOK and their own TAKE, and walking to the exit
 * without touching either is what skipping is now. The drop is placed first
 * and once, so the Marrow's Vial never rides on the 70% that decides whether
 * anything else fell.
 */
function victory(state: GameState, run: RunState, combat: CombatState): GameState {
  const e = enemy(combat.enemyId)
  const rng = fightRng(run, combat.round, 0, RNG_CHANNEL.reward)
  const fell: RewardId[] = [...(e.drop ? [e.drop] : []), ...offerFor(run, combat.enemyId, rng)]

  const { combat: _gone, ...rest } = run
  const cleared: RunState = { ...rest, cleared: [...run.cleared, run.roomId], say: '' }
  const left = placeLoot(cleared, fell)

  const names = fell.map((id) => reward(id).name)
  const dropped =
    names.length === 0
      ? ' Nothing useful on it.'
      : ` It leaves ${names.join(' and ')}, on the floor where it fell.`

  return {
    ...state,
    mode: 'explore',
    // Seeing a thing is not carrying it. The ledger records what the run has
    // actually taken, so a Vial walked away from is a Vial the title screen
    // has never heard of.
    meta: state.meta,
    run: { ...left, say: `${e.name} is finished.${dropped}` },
  }
}

/**
 * Whether a found thing can still go anywhere.
 *
 * One question with one answer, asked by the reducer before a TAKE is honoured
 * and by the view before the button is drawn — so a full loadout is a reward
 * that plainly cannot be taken rather than a press that silently does nothing.
 */
export function canTake(run: RunState, id: RewardId): boolean {
  switch (reward(id).kind) {
    case 'item-die':
      return run.itemDice.length < ITEM_CAP
    case 'iron-die':
      return run.ironDice.length < IRON_CAP
    case 'talisman':
      return !run.talismans.includes(id as TalismanId)
    default:
      return true
  }
}

/**
 * Why a found thing cannot go anywhere, in the words the player is owed.
 *
 * The refusal is printed **in the room**, on the thing, rather than as a grey
 * button: an unavailable action is hidden, and what replaces it is a sentence.
 */
export function refusalFor(run: RunState, id: RewardId): string | undefined {
  if (canTake(run, id)) return undefined
  switch (reward(id).kind) {
    case 'item-die':
      return `I am already carrying ${ITEM_CAP}. There is nowhere to put it.`
    case 'iron-die':
      return 'I am already wearing iron. There is nowhere to put a second piece.'
    default:
      return 'I already have one of these.'
  }
}

/**
 * Put one reward where it belongs. The only place a TAKE means anything.
 *
 * **The item cap is enforced here**, in the reducer, and not in the pool that
 * offered it or the screen that drew it: a third item die changes nothing.
 */
function grant(run: RunState, id: RewardId): RunState {
  if (!canTake(run, id)) return run
  const item = itemDieOf(id)
  if (item) return { ...run, itemDice: [...run.itemDice, item] }
  const iron = ironDieOf(id)
  if (iron) return { ...run, ironDice: [...run.ironDice, iron] }
  if (reward(id).kind === 'talisman') {
    return { ...run, talismans: [...run.talismans, id as TalismanId] }
  }
  return reward(id).kind === 'vial' ? { ...run, vials: run.vials + 1 } : run
}

/** The run is over, with the fight it ended in still on the plate. */
function died(state: GameState, run: RunState, combat: CombatState, cause: string): GameState {
  return { ...state, mode: 'dead', run: { ...run, combat, cause } }
}

// ── the reducer ────────────────────────────────────────────────────────

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TITLE': {
      // Stepping back to the door remembers where you were, so CONTINUE means
      // the same thing whether you got here by pressing TITLE or by reloading.
      // Only a *live* mode is remembered: a run that has ended is not
      // somewhere the door may offer to send you back to.
      const alive: readonly string[] = ['explore', 'combat', 'reward']
      const resume = state.mode === 'title' ? state.resume : state.mode
      return { ...state, mode: 'title', ...(resume && alive.includes(resume) ? { resume } : {}) }
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

      // A found thing is looked at exactly as a carving is: one verb, one
      // answer, nothing committed. What it says is the card — the name and the
      // exact rule — because that is the contract a reward has always been
      // held to, and it does not get weaker for having moved into the world.
      if (action.detailId.startsWith('loot:')) {
        const index = Number(action.detailId.slice(5))
        const item = lootIn(run)[index]
        if (!item || item.taken) return state
        const card = reward(item.id)
        const refused = refusalFor(run, item.id)
        return {
          ...state,
          run: { ...run, say: `${card.name}. ${card.rule}${refused ? ` ${refused}` : ''}` },
        }
      }

      // A core die on a table or on a chain is looked at exactly as a found
      // thing is: its name, its price before the press, and its faces drawn
      // under the line. Nothing is committed and nothing is charged.
      if (action.detailId.startsWith('die:')) {
        const index = Number(action.detailId.slice(4))
        const offer = roomAt(run).dice[index]
        if (!offer || claimedIn(run).includes(index)) return state
        return { ...state, run: { ...run, say: dieSay(run, offer) } }
      }

      // And the prose the plan cut into this room's wall.
      if (action.detailId === 'carving') {
        const line = roomAt(run).carvings[0]
        if (!line) return state
        return {
          ...state,
          run: {
            ...run,
            say: line,
            looked: run.looked.includes('carving') ? run.looked : [...run.looked, 'carving'],
          },
        }
      }

      const detail = roomAt(run).details.find((d) => d.id === action.detailId)
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
      const here = roomAt(run)
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
      if (!exitsOpen(stateOf(run.rooms, run.roomId, here.id))) return state
      // The **generated** exits, not the template's — a template has none. The
      // reducer is the authority on where a press may go, and the map is the
      // authority it reads.
      if (!here.exits.some((e) => e.to === action.to)) return state

      // Something is still lying here, and the descent does not come back.
      // The band says so on the way through — not as a warning before the
      // press, which would be the game second-guessing a decision it printed
      // the stakes of, but as the fact it is.
      const abandoned = unclaimedIn(run).length > 0
      const next = roomAt(run, action.to)
      const moved: RunState = {
        ...run,
        roomId: action.to,
        path: [...run.path, action.to],
        looked: [],
        say: abandoned ? `I left it. The door does not open twice. ${next.arrival}` : next.arrival,
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
      if (!roomAt(run).enemy || run.cleared.includes(run.roomId)) return state
      if (run.bones === 0) return state
      return { ...state, mode: 'combat', run: { ...run, combat: beginCombat(run), say: '' } }
    }

    /**
     * Six dice, thrown. And the iron, thrown with them.
     *
     * **Six from the first fight to the last turn of the boss.** Nothing here
     * reads the pile: `min(6, bones)` is repealed, and there is no width rule
     * left to hide anywhere. What being hurt costs is exchanges, not dice.
     *
     * The iron is thrown here and only here. A REROLL does not touch it, and
     * there is no press that can: what it shows is the turn's terrain, settled
     * before the first hold and stated in a caption before anything can be
     * committed.
     */
    case 'ROLL': {
      const run = state.run
      const combat = run?.combat
      if (!live(state, run) || !combat) return state
      if (combat.dice.length > 0 || combat.rollsUsed !== 0) return state

      // **Each slot off its own die.** Six slots, left to right, one draw apiece —
      // which is the whole of what a crooked die is and the reason a hand of six
      // plain bones replays a seed exactly as it always did.
      const dice = rollHand(run.hand, fightRng(run, combat.round, 1, RNG_CHANNEL.playerRoll))
      const ironRolls = rollIron(
        run.ironDice,
        fightRng(run, combat.round, 1, RNG_CHANNEL.ironRoll),
      )
      return {
        ...state,
        run: {
          ...run,
          say: '',
          combat: { ...combat, dice, rollsUsed: 1, ironRolls, log: [] },
        },
      }
    }

    /**
     * Throw the unheld bones again.
     *
     * Refused rather than charged when everything is held: a throw in which
     * nothing moves is not a throw, and spending one of two rerolls on it
     * would be the interface taking a press the player did not mean to make.
     */
    case 'REROLL': {
      const run = state.run
      const combat = run?.combat
      if (!live(state, run) || !combat) return state
      if (combat.dice.length === 0) return state
      if (combat.rollsUsed < 1 || combat.rollsUsed >= MAX_ROLLS) return state

      const held = canonicalHeld(action.held, combat.dice.length)
      if (held.length === combat.dice.length) return state

      const rollNumber = combat.rollsUsed + 1
      const dice = rerollHand(
        combat.dice,
        held,
        run.hand,
        fightRng(run, combat.round, rollNumber, RNG_CHANNEL.playerRoll),
      )
      return {
        ...state,
        run: {
          ...run,
          say: '',
          combat: { ...combat, dice, rollsUsed: rollNumber as 2 | 3, log: [] },
        },
      }
    }

    /**
     * The attack, committed — the whole cascade, in one tick.
     *
     * The legal set is recomputed here and the request is checked against it,
     * because the UI's claim that a score is legal is not what makes it legal.
     * The one draw in the whole of it is the item dice; everything else is
     * arithmetic, and the order it happens in is a ruling rather than an
     * accident:
     *
     *   1. the six core dice add up and the chosen line multiplies them;
     *   2. the item dice fire — flats add, and **costs charge here, before the
     *      blow lands.** If a cost empties the pile the run ends at this beat
     *      and the enemy is never touched. A cost is a cost;
     *   3. a talisman whose line matched adds its flat;
     *   4. `damage = max(1, floor(sum × mult) + itemFlats + talismanFlat)`
     *      comes off the enemy;
     *   5. a thing still standing swings its fixed number, and the iron die
     *      holds off what it rolled: `answer = max(0, hit − block)`.
     *
     * A dead enemy never answers, however thin the pile is. That is unchanged
     * law and it outranks everything below it.
     */
    case 'SCORE': {
      const run = state.run
      const combat = run?.combat
      if (!live(state, run) || !combat) return state
      if (combat.dice.length === 0) return state
      if (!legalScores(combat.dice, combat.usedHands).includes(action.hand)) return state

      const e = enemy(combat.enemyId)

      // The item beat. The only draw in a SCORE, and it is positioned by the
      // fight's round with a channel of its own, so adding it cannot perturb
      // what the core dice or the iron rolled.
      const itemRolls = rollItems(
        run.itemDice,
        fightRng(run, combat.round, 1, RNG_CHANNEL.itemRoll),
      )
      const itemFlats = itemFlatsOf(itemRolls)
      const itemCost = itemCostOf(itemRolls)
      const talismansFired = talismansFor(run.talismans, action.hand)
      const talismanFlat = talismanFlatOf(run.talismans, action.hand)

      const totals = totalsFor(combat.dice, action.hand, { itemFlats, talismanFlat })
      const block = blockOf(combat.ironRolls)

      // Costs are charged before the blow. If they take the last bone, that is
      // where the run stops — and nothing after this point happens.
      const afterCost = Math.max(0, run.bones - itemCost)
      const landed = afterCost > 0

      const damage = landed ? totals.damage : 0
      const enemyHp = landed ? Math.max(0, combat.enemyHp - damage) : combat.enemyHp
      const killed = landed && enemyHp === 0

      // A dead thing does not answer. The kill happened first, and it happened
      // whatever the pile was down to. What a living one swings is **its own rule
      // of the turn it is standing in** — how near it is, how much of it is left,
      // or what line was just committed — less whatever the iron came up holding.
      //
      // `breakFor` is the one authority on that number. The tray derived the same
      // figure off the same function before the press, which is what makes the
      // rule a stated mechanic rather than a surprise.
      const enemyHit = landed && !killed ? breakFor(e, combat, action.hand) : 0
      const retaliation = answerAfterBlock(enemyHit, block)
      const bones = Math.max(0, afterCost - retaliation)

      const record: AttackRecord = {
        dice: combat.dice,
        hand: action.hand,
        sum: totals.sum,
        multiplier: totals.multiplier,
        base: totals.base,
        itemRolls,
        itemFlats,
        itemCost,
        talismansFired,
        talismanFlat,
        damage,
        landed,
        enemyHpBefore: combat.enemyHp,
        enemyHpAfter: enemyHp,
        enemyHit,
        block,
        retaliation,
        bonesBefore: run.bones,
        bonesAfter: bones,
      }

      // CRAP is never written down. It is what the legal set *is* when nothing
      // named qualifies, so it cannot be spent and cannot run out. A line the
      // blow never reached is not spent either: the cost killed the run before
      // the line was played.
      const usedHands: readonly NamedHandId[] =
        action.hand === 'crap' || !landed ? combat.usedHands : [...combat.usedHands, action.hand]

      const settled: RunState = { ...run, bones }
      const after: CombatState = {
        ...combat,
        enemyHp,
        usedHands,
        dice: [],
        rollsUsed: 0,
        // The turn's terrain went with the turn. The next ROLL throws it again.
        ironRolls: [],
        lastAttack: record,
        log: attackSay(e, record),
      }

      // The pile emptied at the item beat. The run ends here, with the fight
      // still on the plate so the death has a cause to show.
      if (!landed) {
        return died(state, settled, after, `A cost. ${scoreName(action.hand)} was never thrown.`)
      }

      if (killed) {
        // A horror whose death has been authored keeps the fight open on it.
        // The room is *not* cleared, no offer is drawn and no screen changes:
        // the state says only that the thing is finished and is being watched
        // finishing, and `DEFEAT_DONE` is the single transition out.
        if (defeatOf(combat.enemyId)) {
          return { ...state, run: { ...settled, combat: { ...after, defeated: true } } }
        }
        return victory(state, { ...settled, combat: after }, after)
      }

      if (bones === 0) {
        return died(state, settled, after, `${e.name} — the last of my bones.`)
      }

      // The next attack begins here, in the same tick. There is no ROUND
      // button: the score *is* the commitment, and what follows it is another
      // empty table waiting for ROLL.
      return {
        ...state,
        run: { ...settled, combat: { ...after, round: combat.round + 1 } },
      }
    }

    case 'DRINK': {
      const run = state.run
      if (!run || run.vials <= 0) return state
      // Everywhere the player still has a decision to make. Not over a death,
      // and not on a screen that is not the room or the fight.
      if (state.mode === 'combat') {
        if (!run.combat || run.combat.defeated) return state
      } else if (state.mode !== 'explore') {
        return state
      }
      if (roomToRecover(run) === 0) return state

      const { run: filled, gave } = recover(run, VIAL_BONES)
      return {
        ...state,
        run: {
          ...filled,
          vials: run.vials - 1,
          say: `${gave} ${gave === 1 ? 'bone' : 'bones'} back. ${filled.bones} in all.`,
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
      const here = roomAt(run)
      if (!here.ritual) return state
      // Once. The room has already answered, so a second press has nothing
      // left to decide — which is the same sentence that makes a reload
      // unable to reroll it and a held thumb unable to farm it.
      if (run.ritual?.roomId === run.roomId) return state

      const roll = (rngFor(run, ritualSalt(run)).int(6) + 1) as RitualRoll
      const missingBefore = roomToRecover(run)
      const { run: filled, gave } = recover(run, fontRestore(roll, missingBefore))
      return {
        ...state,
        run: {
          ...filled,
          ritual: { roomId: run.roomId, roll, restored: gave, missingBefore },
          say: ritualSay(roll, gave),
        },
      }
    }

    case 'INTERACT': {
      const run = state.run
      if (!run || state.mode !== 'explore') return state
      const here = roomAt(run)
      // The room has to declare it. An id that belongs to another room — a
      // stale press, a hand-made dispatch — is not a thing you are standing in
      // front of.
      if (!here.interactables?.some((i) => i.id === action.interactionId)) return state
      const before = stateOf(run.rooms, run.roomId, here.id)
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

      if (before.templateId === 'reliquary') {
        switch (id) {
          case 'reliquary-bell':
            return put({ ...before, bellRung: true })
          case 'reliquary-brazier':
            return put({ ...before, brazier: before.brazier === 'lit' ? 'out' : 'lit' })
          default: {
            // The lever. The chest is authoritatively open *here*, in the same
            // tick as the lever going down, and **what is in it is drawn here
            // too** — recorded on the node as loot, so a reload renders the same
            // thing and can never redraw it.
            //
            // What has changed is that the draw and the *grant* have come
            // apart. Opening a chest puts a thing in the room; carrying it is a
            // separate press on the thing itself.
            const found = chestReward(here, rngFor(run, reliquarySalt(run)))
            const next: RoomInteractionState = { ...before, lever: 'down', chest: 'open' }
            const opened: RunState = { ...run, rooms: { ...run.rooms, [run.roomId]: next } }
            return {
              ...state,
              run: {
                ...(found ? placeLoot(opened, [found]) : opened),
                say: interactionSay(next, id, found),
              },
            }
          }
        }
      }

      if (before.templateId === 'offertory') {
        if (id === 'offertory-candles') {
          return put({ ...before, candles: before.candles === 'lit' ? 'out' : 'lit' })
        }

        if (id === 'offertory-recess') {
          // Prying at the lid before the slot is fed. The price of the greedy
          // answer, and it is exactly the vault's: a bone, nothing moves, and
          // it can be made as many times as there is blood for it.
          const { run: paid, took } = loseBones(run, 1)
          const gone = paid.bones === 0
          const hurt: RunState = {
            ...paid,
            say: took > 0
              ? "The stone takes a finger's worth. It was not asking twice."
              : 'The stone takes at me and finds nothing left to take.',
            ...(gone ? { cause: OFFERTORY_CAUSE } : {}),
          }
          return { ...state, ...(gone ? { mode: 'dead' as const } : {}), run: hurt }
        }

        // The slot, fed. **The price was printed on the verb before it
        // charged** — two bones, in the button's own accessible name — which is
        // the whole difference between a toll and a trap. It can be the last
        // two: a room may kill you, and it uses the death the game already has.
        const { run: charged, took } = loseBones(run, OFFERTORY_PRICE)
        const next: RoomInteractionState = { ...before, paid: true, recess: 'open' }
        const opened: RunState = { ...charged, rooms: { ...run.rooms, [run.roomId]: next } }
        if (charged.bones === 0) {
          return {
            ...state,
            mode: 'dead',
            run: {
              ...opened,
              say: took === 1
                ? 'One bone into the slot. It was the last one, and it was still short.'
                : 'Two bones into the slot. They were the last two.',
              cause: OFFERTORY_CAUSE,
            },
          }
        }
        const found = chestReward(here, rngFor(run, reliquarySalt(run)))
        return {
          ...state,
          run: {
            ...(found ? placeLoot(opened, [found]) : opened),
            say: interactionSay(next, id, found),
          },
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
      // against, and it comes back through your hand — and it takes a bone for
      // it. One bone, every time.
      if (before.pressurePlate === 'off') {
        const { run: paid, took } = loseBones(run, 1)
        const gone = paid.bones === 0
        const hurt: RunState = {
          ...paid,
          say: took > 0
            ? 'The mechanism snaps back. The chain catches my hand. One of my bones snaps.'
            : 'The mechanism snaps back. There is nothing left of me for it to take.',
          ...(gone ? { cause: VAULT_CAUSE } : {}),
        }
        // A room may kill you, and it uses the death the game already has. The
        // player can make this mistake as many times as they have bones for.
        return { ...state, ...(gone ? { mode: 'dead' as const } : {}), run: hurt }
      }
      {
        // The gate rises, and the cage — down on the plate, holding what it has
        // always held — is now something you can reach into. The deep way's
        // iron is here, and the way's own line said so before the press.
        const next: RoomInteractionState = { ...before, lever: 'down', gate: 'open' }
        const opened: RunState = { ...run, rooms: { ...run.rooms, [run.roomId]: next } }
        const found = chestReward(here, rngFor(run, reliquarySalt(run)))
        return {
          ...state,
          run: {
            ...(found ? placeLoot(opened, [found]) : opened),
            say: interactionSay(next, id, found),
          },
        }
      }
    }

    /**
     * Pick the nth thing off the floor of this room.
     *
     * There is no screen behind this and nothing to close. The cap is enforced
     * here, in the reducer, exactly as it always was: a third item die changes
     * nothing, and the room prints the refusal on the thing rather than
     * offering a grey button.
     */
    case 'TAKE': {
      const run = state.run
      if (!run || state.mode !== 'explore') return state
      const here = lootIn(run)
      const item = here[action.index]
      if (!item || item.taken) return state
      if (!canTake(run, item.id)) return state

      const card = reward(item.id)
      const paid = grant(run, item.id)
      const after = here.map((l, i) => (i === action.index ? { ...l, taken: true } : l))
      return {
        ...state,
        meta: remember(state.meta, [item.id]),
        run: {
          // A pickup repeats the thing's actual rule. "Vial. Taken." confirms
          // a press and explains nothing, and sending the player to MENU to
          // find out what they just picked up is the same failure again.
          ...paid,
          loot: { ...run.loot, [run.roomId]: after },
          say: `${card.name} taken. ${card.rule}`,
        },
      }
    }

    /**
     * One of the six, swapped for another.
     *
     * The array cannot get longer here and there is no action that can make it
     * longer: a slot outside `0..5` is refused, and what is written back is
     * the same six positions with one of them changed. Replacement is the
     * progression model, so this is the whole of the progression model.
     */
    case 'REPLACE_DIE': {
      const run = state.run
      if (!run) return state
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= HAND_SLOTS) {
        return state
      }
      if (!isCoreDieId(action.die)) return state
      if (run.hand[action.slot] === action.die) return state
      const hand = run.hand.map((id, index) => (index === action.slot ? action.die : id))
      return { ...state, run: { ...run, hand } }
    }

    /**
     * The price, the swap and the claim, in one tick.
     *
     * Every guard here is a statement of a law rather than a belt: the slot is
     * one of six, the die is one somebody wrote, the seat has not already been
     * emptied, and **the price is never the last of the pile**. A press that
     * reaches here illegally — a stale dispatch, a second confirm from a picker
     * the screen has already closed — changes nothing.
     *
     * What it deliberately does not do is ask whether the swap is an improvement.
     * A run is allowed to put a Saint's Finger in place of a Jawbone and regret
     * it; which route a run takes is which build it gets, and which slot it spends
     * is the same sentence one level down.
     */
    case 'CLAIM_DIE': {
      const run = state.run
      if (!run || state.mode !== 'explore') return state
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= HAND_SLOTS) return state

      const here = roomAt(run)
      const offer = here.dice[action.index]
      if (!offer || claimedIn(run).includes(action.index)) return state
      if (!isCoreDieId(offer.die)) return state
      if (!canClaim(run, offer)) return state

      const price = offer.price ?? 0
      const taken = coreDie(offer.die)
      const paid = price > 0 ? ` ${price} bones for it.` : ''

      return {
        ...state,
        meta: remember(state.meta, [offer.die]),
        run: {
          ...run,
          bones: run.bones - price,
          hand: run.hand.map((id, index) => (index === action.slot ? offer.die : id)),
          claimed: { ...run.claimed, [run.roomId]: [...claimedIn(run), action.index] },
          // The line owns the discarded die **once**, and then never again. There
          // is no inventory for it to go to and no screen that lists it: the hand
          // is six, nothing sits outside it, and what was in that slot is gone.
          say: `${taken.name}. ${CORE_RULE}${paid} I put the old one down. It had been with me since the stair.`,
        },
      }
    }
  }

  // Total, including for an action the union does not contain.
  //
  // TypeScript makes the switch above exhaustive, so this line is unreachable
  // from typed code — and it is here precisely for the code that is not typed:
  // a stale `THROW` from a bookmarked console, a dispatch from a build that
  // had a verb this one does not. Falling off the end would return `undefined`
  // and hand the app a state with no mode, which is the class of bug the
  // explicit `mode` field exists to make impossible.
  return state
}

/** The living pile, for anything outside the reducer that needs the number. */
export function livingBones(state: GameState): number {
  return state.run?.bones ?? 0
}

/** Everything the run is carrying, named, for a summary screen. */
export function carriedNames(run: RunState): readonly string[] {
  const names: string[] = []
  if (run.vials > 0) names.push(run.vials > 1 ? `Vial ×${run.vials}` : 'Vial')
  for (const id of run.ironDice) names.push(ironDie(id).name)
  for (const id of run.itemDice) names.push(itemDie(id).name)
  for (const id of run.talismans) names.push(talisman(id).name)
  return names
}
