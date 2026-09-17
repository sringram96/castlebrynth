/**
 * Dev fixtures: reach any mode from a URL.
 *
 * Every mode must be reachable without playing to it, or the tests that cover
 * the ends of the game — dying, getting out, a fight one attack from over —
 * become forty presses long and nobody writes them. That is how the old build
 * ended up with a death screen nobody had ever automated.
 *
 *   ?seed=7                     a known run
 *   ?plan=tithe                 pin which **grammar** the run is built from, by
 *                               choosing the lowest seed that produces it. It is
 *                               not a fixture on its own — it changes nothing but
 *                               which seed a press of DESCEND uses, so a journey
 *                               can know which of the three descents it is
 *                               walking without skipping a single press
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
 *   ?iron=2                     an iron die on, standing on an exact block
 *   ?iron=none                  a run carrying no iron die at all (the default)
 *   ?items=splinter-fetish      that item die in the loadout (two at most)
 *   ?items=none                 an empty item loadout
 *   ?talismans=none             a run carrying no talisman
 *   ?hand=bone,bone,bone,bone,bone,bone
 *                               exact contents of the six slots
 *   ?mode=combat                open the room's fight, or jump to an ending
 *   ?dying=1                    the room's enemy finished, mid-death — what a
 *                               save written a third of a second before the
 *                               win holds
 *   ?reliquary=solved           the chest open, and what was in it taken
 *   ?reliquary=open             the chest open, the find still lying in it
 *   ?reliquary=dark             bell rung and brazier out — the lever live
 *   ?vault=weighted             the cage down on the plate, gate still shut
 *   ?vault=open                 the gate up, the way on with it, iron in the cage
 *   ?offertory=dark             the candles out, the slot ready to be fed
 *   ?offertory=paid             the price paid, the recess open, the find in it
 *   ?offertory=solved           the same, and the find already taken
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
import { rollIron } from '../combat/loadout.js'
import type { IronRoll } from '../combat/loadout.js'
import {
  HAND_SLOTS,
  ITEM_CAP,
  isCoreDieId,
  isItemDieId,
  isTalismanId,
  ironDie,
} from '../content/dice.js'
import type { CoreDieId, IronDieId, ItemDieId, TalismanId } from '../content/dice.js'
import { firstNodeOf, roomAt } from './map.js'
import { newRun, reduce } from './reducer.js'
import { generateRun, generateRunPlan } from './runGenerator.js'
import { RNG_CHANNEL, combatSalt, rngAt } from './rng.js'
import { SAVE_VERSION } from './state.js'
import type { GameState, Mode } from './state.js'

const MODES: readonly Mode[] = ['title', 'explore', 'combat', 'dead', 'complete']

const list = (raw: string | null): string[] =>
  raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []

const num = (raw: string | null): number | undefined => {
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

const KEYS: readonly string[] = [
  'maze',
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
  'offertory',
  'iron',
  'items',
  'talismans',
  'hand',
]

export function hasFixture(search: string): boolean {
  const p = new URLSearchParams(search)
  return KEYS.some((k) => p.has(k))
}

/**
 * How far to look for a seed that produces a named grammar.
 *
 * Three grammars off a hashed seed: the first handful of integers covers all of
 * them many times over. The bound exists so a typo answers `undefined` rather
 * than spinning.
 */
const SEED_SEARCH = 500

/**
 * The lowest seed whose descent is built from a named grammar.
 *
 * **It pins nothing but the seed.** The generator is untouched: this asks it what
 * each seed produces and hands back one that produces the grammar a test means.
 * So a journey booted with `?plan=tithe` is walking a run the game could have
 * dealt it, which is the whole reason a fixture is allowed to exist.
 */
export function seedForPlan(planId: string): number | undefined {
  for (let seed = 1; seed <= SEED_SEARCH; seed++) {
    if (generateRunPlan(seed).id === planId) return seed
  }
  return undefined
}

/**
 * The seed a press of DESCEND should use, if the URL asked for one.
 *
 * Read by `main.ts` as well as by the fixture below, because the two want it for
 * the same reason and at different moments: the fixture builds a run *now*, and
 * the title screen's DESCEND builds one later. `?plan=` is deliberately **not**
 * a fixture key — on its own it leaves the game exactly where it was, at the
 * title, with one press still to make.
 */
export function pinnedSeed(search: string): number | undefined {
  const p = new URLSearchParams(search)
  const seed = num(p.get('seed'))
  if (seed !== undefined) return seed
  const plan = p.get('plan')
  return plan ? seedForPlan(plan) : undefined
}

/**
 * The first seed at or after `from` whose descent actually contains a room.
 *
 * `?room=gate` means **the gate**, and it has to keep meaning that now that the
 * three grammars disagree about which rooms exist: there is no Reliquary in THE
 * LONG WAY and no Font at all in THE TITHE. So a seed that built a descent
 * without the room asked for is walked forward until one did.
 *
 * It is still not a cheat and still not an invented room: every seed it tries is
 * a run the game could have dealt, and the room it lands in is one the director
 * built. A seed that is explicitly asked for is the **starting point** of that
 * search rather than an override, because a fixture pointing at a room that is
 * not there is a fixture that silently does nothing — which is how a browser
 * spec comes to assert against the entry hall.
 */
function seedWithRoom(templateId: string, from: number): number {
  for (let seed = from; seed < from + 200; seed++) {
    if (firstNodeOf(generateRun(seed >>> 0), templateId)) return seed
  }
  return from
}

/** Stand the enemy on an exact total. The one thing an attack cannot aim at. */
function standEnemyAt(state: GameState, hp: number): GameState {
  const combat = state.run?.combat
  if (!combat) return state
  const enemyHp = Math.max(1, Math.min(Math.floor(hp), combat.enemyMaxHp))
  return { ...state, run: { ...state.run!, combat: { ...combat, enemyHp } } }
}

/**
 * Put exact faces on the table, with a throw count that admits to it.
 *
 * The iron is thrown here too when it has not been thrown, off the same
 * generator position a real ROLL would have drawn it at — so a `?dice=`
 * fixture stands in a turn with real terrain rather than in one with the
 * armour mysteriously absent.
 */
function standDiceAt(state: GameState, faces: readonly DieValue[]): GameState {
  const combat = state.run?.combat
  const run = state.run
  if (!combat || !run || faces.length === 0) return state
  const rollsUsed = combat.rollsUsed === 0 ? 1 : combat.rollsUsed
  const ironRolls =
    combat.ironRolls.length > 0
      ? combat.ironRolls
      : rollIron(
          run.ironDice,
          rngAt(run.seed, combatSalt(run.roomId, combat.round, 1, RNG_CHANNEL.ironRoll)),
        )
  return { ...state, run: { ...run, combat: { ...combat, dice: faces, rollsUsed, ironRolls } } }
}

/**
 * Stand the iron on an exact block for this turn.
 *
 * The fifth escape hatch, and it is one for the same reason `?dice=` is: no
 * sequence of honest presses puts a named face on a die, and a browser test of
 * the block — or of an iron blank — should not have to search seeds for one.
 * The face index is resolved back out of the die's own table where it can be,
 * so the fixture cannot claim a block the die does not have.
 */
function standIronAt(state: GameState, block: number): GameState {
  const combat = state.run?.combat
  const run = state.run
  if (!combat || !run || run.ironDice.length === 0) return state
  const rolls: IronRoll[] = run.ironDice.map((id, index) => {
    const die = ironDie(id)
    const wanted = index === 0 ? Math.max(0, Math.floor(block)) : (combat.ironRolls[index]?.block ?? 0)
    const face = die.faces.indexOf(wanted)
    return { id, face: face >= 0 ? face : 0, block: face >= 0 ? wanted : (die.faces[0] ?? 0) }
  })
  return { ...state, run: { ...run, combat: { ...combat, ironRolls: rolls } } }
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

  // The seed, and then the seed that actually has the room in it. See
  // `seedWithRoom`: `?room=` names a template and the three grammars do not all
  // contain every template, so an unsatisfiable `?room=` walks the seed forward
  // rather than quietly leaving the run standing in the entry hall.
  const asked = pinnedSeed(search) ?? 1
  const wantedRoom = p.get('room')
  const maze = p.get('maze') === '1'
  const seed = wantedRoom && !maze ? seedWithRoom(wantedRoom, asked) : asked
  let state: GameState = reduce({ ...base, mode: 'title' }, { type: 'START_RUN', seed, ...(!maze ? { layout: 'classic' as const } : {}) })
  let run = state.run ?? newRun(seed)

  // Standing somewhere else in *this run's map*.
  //
  // `?room=` names an authored template and lands on the first node of the
  // descent that used it — which is the convenience that has always been
  // wanted, and stays unambiguous while a template appears once. `?node=`
  // names one exact room, and is the answer when it does not: a fixture that
  // silently picked one of two Reliquaries would be worse than no fixture.
  const wantedNode = p.get('node')
  const wantedTemplate = wantedRoom
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

  // The loadout, set outright.
  //
  // These are escape hatches like `?dice=` and they are stated as such: the
  // acquisition economy for a core die does not exist yet, and the item dice
  // that do have one enter through a reward screen a bounded journey cannot
  // reliably reach twice. Each is still held to its own rule — six slots, at
  // most two item dice, ids that exist — so a fixture cannot stand the game in
  // a loadout the reducer would refuse.
  const wantedHand = list(p.get('hand')).filter(isCoreDieId) as CoreDieId[]
  if (wantedHand.length > 0) {
    run = {
      ...run,
      hand: Array.from({ length: HAND_SLOTS }, (_, i) => wantedHand[i] ?? run.hand[i] ?? 'bone'),
    }
  }

  const wantedItems = p.get('items')
  if (wantedItems !== null) {
    const ids = list(wantedItems).filter(isItemDieId) as ItemDieId[]
    run = { ...run, itemDice: ids.slice(0, ITEM_CAP) }
  }

  const wantedTalismans = p.get('talismans')
  if (wantedTalismans !== null) {
    run = { ...run, talismans: list(wantedTalismans).filter(isTalismanId) as TalismanId[] }
  }

  // The iron is **found** now, in the Chain Vault's cage, so a fresh run has
  // none — and a fixture that wants to stand a fight on an exact block has to
  // put one on first. `?iron=none` is still spelled out rather than dropped,
  // because a test that means *bare* should be able to say so.
  const wantedIron = p.get('iron')
  if (wantedIron === 'none') run = { ...run, ironDice: [] as readonly IronDieId[] }
  else if (wantedIron !== null) run = { ...run, ironDice: ['rustplate'] as readonly IronDieId[] }

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

  // And picking a thing up off the floor is a press like any other. It is the
  // *first* untaken thing, always, so a fixture never has to know which index
  // a room's own machinery put a find at.
  const takeFirst = (): void => {
    const index = (run.loot?.[run.roomId] ?? []).findIndex((l) => !l.taken)
    if (index < 0) return
    state = reduce({ version: SAVE_VERSION, mode: 'explore', meta: state.meta, run }, {
      type: 'TAKE',
      index,
    })
    run = state.run ?? run
  }

  const stage = p.get('reliquary')
  if (stage && roomAt(run).id === 'reliquary') {
    press('reliquary-bell')
    press('reliquary-brazier')
    if (stage === 'solved' || stage === 'open') {
      press('reliquary-lever')
      if (stage === 'solved') takeFirst()
    }
  }

  const vault = p.get('vault')
  if (vault && roomAt(run).id === 'chain-vault') {
    press('vault-chain')
    if (vault === 'open' || vault === 'solved') press('vault-lever')
    if (vault === 'solved') takeFirst()
  }

  const offertory = p.get('offertory')
  if (offertory && roomAt(run).id === 'offertory') {
    press('offertory-candles')
    if (offertory === 'paid' || offertory === 'solved') press('offertory-altar')
    if (offertory === 'solved') takeFirst()
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
    p.has('used') ||
    p.has('iron')

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

    // Last, so it wins over whatever the throws above rolled — the point of
    // the hatch is an exact block, including a deliberate blank.
    const block = num(wantedIron)
    if (block !== undefined && state.run?.combat) state = standIronAt(state, block)

    return state
  }

  if (mode === 'dead') {
    return {
      ...state,
      mode: 'dead',
      // Dev-only, and still held to the story: nothing kills anybody in this
      // game. Running out is running out of knowing why you came.
      run: { ...state.run!, bones: 0, cause: 'A fixture. Nothing took it.' },
    }
  }
  if (mode === 'complete') {
    return { ...state, mode: 'complete', meta: { ...state.meta, wins: state.meta.wins + 1 } }
  }
  if (mode === 'title') return { ...state, mode: 'title', resume: 'explore' }

  return state
}
