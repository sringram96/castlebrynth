/**
 * The two environmental rooms.
 *
 * What is being tested is not "the buttons work". It is the three promises
 * these rooms are built on, and every case below is one of them:
 *
 *   - **the reducer owns every outcome.** An illegal press changes nothing, a
 *     repeated press changes nothing twice, and no press anywhere can pay a
 *     reward out more than once.
 *   - **the settled state is the whole truth.** Save, reload, and the room is
 *     the room it was — including the relic that came out of the chest, which
 *     is recorded rather than redrawn.
 *   - **optional means optional.** The Reliquary can be walked through without
 *     touching one thing in it, and the Chain Vault cannot be walked through
 *     at all until its gate is up.
 */

import { describe, expect, it } from 'vitest'

import { lootIn, newRun, reduce, unclaimedIn } from '../../src/game/reducer.js'
import { SAVE_VERSION, TITLE } from '../../src/game/state.js'
import type { GameState, RoomInteractionState } from '../../src/game/state.js'
import { load, save } from '../../src/game/save.js'
import { reward } from '../../src/content/rewards.js'
import { BONE_CEILING } from '../../src/content/bones.js'
import { ROOM_TEMPLATES } from '../../src/content/rooms.js'
import { roomAt } from '../../src/game/map.js'
import { reachableFrom } from '../../src/game/mapValidation.js'
import { nodeOf, seedWith } from './where.js'
import { actionFor, initialRoomState, stateOf } from '../../src/content/interactions.js'

/**
 * Standing in a room, mid-run, with nothing in it touched.
 *
 * Named by its authored **template** — the reliquary, the chain vault — and
 * resolved to whichever node of this run's map used it. A test may not invent
 * a room; it may only stand in one the director built.
 */
function standingIn(templateId: string, from = 7, bones = BONE_CEILING): GameState {
  // **A descent that has the room in it.** The three grammars disagree about
  // which rooms exist — there is no Reliquary in THE LONG WAY and no Font in THE
  // TITHE — so a spec about a room asks for a seed that built one rather than
  // pinning a grammar it is not about. See `seedWith`.
  const run = newRun(seedWith(templateId, from))
  const roomId = nodeOf(run, templateId)
  const stood = { ...run, roomId, bones, path: [...run.path, roomId] }
  return {
    ...TITLE,
    mode: 'explore',
    run: { ...stood, say: roomAt(stood).arrival },
  }
}

/**
 * Which authored rooms are still ahead of a node, through the generated map.
 *
 * The grammars disagree about what the next door is — THE DESCENT cuts an alcove
 * into both legs of the Split — so a spec that means *the deep way still gets to
 * the door* asserts the reach rather than the neighbour. Template ids, because
 * that is the only half of a map a spec is allowed to name.
 */
function aheadOf(state: GameState, nodeId: string): readonly string[] {
  const run = state.run!
  return [...reachableFrom(run.map, nodeId)].map((id) => run.map.nodes[id]!.templateId)
}

/** Where a press has to go, from where the run is standing. */
const onwardFrom = (state: GameState): string => roomAt(state.run!).exits[0]!.to

/** The way on from a fork, by the label the player reads. */
const towards = (state: GameState, label: string): string =>
  roomAt(state.run!).exits.find((e) => e.label === label)!.to

/**
 * What the run is carrying that a chest could have given it.
 *
 * Vials and item dice, which is the whole loot pool. The iron die and the
 * talisman a run starts with are not in it: they are provisional starting
 * content, not something a chest ever hands out.
 */
function carried(state: GameState): readonly string[] {
  return [
    ...Array.from({ length: state.run!.vials }, () => 'vial'),
    ...state.run!.itemDice,
    ...state.run!.ironDice,
    ...state.run!.talismans,
  ]
}

/** Pick the first thing lying in this room off the floor. */
const take = (state: GameState): GameState => reduce(state, { type: 'TAKE', index: 0 })

const press = (state: GameState, ...ids: readonly string[]): GameState =>
  ids.reduce((s, interactionId) => reduce(s, { type: 'INTERACT', interactionId }), state)

const roomStateOf = (state: GameState): RoomInteractionState =>
  stateOf(state.run!.rooms, state.run!.roomId, roomAt(state.run!).id)!

/** Save, boot, and press CONTINUE — the whole of what a reload is. */
function reloaded(state: GameState): GameState {
  const held = new Map<string, string>()
  const store = {
    getItem: (k: string) => held.get(k) ?? null,
    setItem: (k: string, v: string) => void held.set(k, v),
    removeItem: (k: string) => void held.delete(k),
  } as unknown as Storage
  save(state, store)
  return reduce(load(store).state, { type: 'CONTINUE' })
}

describe('the Reliquary', () => {
  it('opens with the bell unrung, the brazier lit, the lever up and the chest shut', () => {
    const here = standingIn('reliquary')
    // Untouched, so nothing has been written: the opening position is content,
    // and a run that walked past writes no entry at all.
    expect(here.run?.rooms).toBeUndefined()
    expect(roomStateOf(here)).toEqual({
      templateId: 'reliquary',
      bellRung: false,
      brazier: 'lit',
      lever: 'up',
      chest: 'closed',
    })
    expect(lootIn(here.run!)).toEqual([])
  })

  it('records the bell as rung', () => {
    const rung = press(standingIn('reliquary'), 'reliquary-bell')
    const after = roomStateOf(rung)
    expect(after.templateId === 'reliquary' && after.bellRung).toBe(true)
    expect(rung.run?.say).toMatch(/The bell answers once/)
  })

  it('does nothing at all the second time the bell is pressed', () => {
    const rung = press(standingIn('reliquary'), 'reliquary-bell')
    // Not "does it again harmlessly" — returns the identical state. The verb
    // is gone from the object, so this is unreachable from a press anyway.
    expect(reduce(rung, { type: 'INTERACT', interactionId: 'reliquary-bell' })).toBe(rung)
    expect(actionFor(roomStateOf(rung), 'reliquary-bell')).toBeUndefined()
  })

  it('puts the brazier out, and lights it again', () => {
    const out = press(standingIn('reliquary'), 'reliquary-brazier')
    const dark = roomStateOf(out)
    expect(dark.templateId === 'reliquary' && dark.brazier).toBe('out')
    expect(out.run?.say).toMatch(/The flame folds into the wick/)

    const lit = press(out, 'reliquary-brazier')
    const back = roomStateOf(lit)
    expect(back.templateId === 'reliquary' && back.brazier).toBe('lit')
    expect(lit.run?.say).toBe('The flame returns.')
  })

  it('will not open the chest before the bell has rung and the flame is out', () => {
    const fresh = standingIn('reliquary')
    // Neither half on its own, and neither in the wrong order.
    for (const partial of [press(fresh), press(fresh, 'reliquary-bell'), press(fresh, 'reliquary-brazier')]) {
      expect(actionFor(roomStateOf(partial), 'reliquary-lever')).toBeUndefined()
      expect(reduce(partial, { type: 'INTERACT', interactionId: 'reliquary-lever' })).toBe(partial)
      const still = roomStateOf(partial)
      expect(still.templateId === 'reliquary' && still.chest).toBe('closed')
    }
  })

  it('opens the chest when the bell has rung and the flame is out', () => {
    const solved = press(standingIn('reliquary'), 'reliquary-bell', 'reliquary-brazier', 'reliquary-lever')
    const open = roomStateOf(solved)
    expect(open.templateId === 'reliquary' && open.lever).toBe('down')
    expect(open.templateId === 'reliquary' && open.chest).toBe('open')
    expect(solved.run?.say).toMatch(/Something moves inside the altar/)
    // And the lever is spent — the chest cannot be opened a second time.
    expect(actionFor(open, 'reliquary-lever')).toBeUndefined()
  })

  it('has no chest control at all: the chest is a container, not a button', () => {
    // The wave's ruling, as an absence. Opening the chest puts **a thing in
    // the room**; taking that thing is a press on the thing.
    expect(ROOM_TEMPLATES['reliquary']!.interactables!.map((i) => i.id)).not.toContain(
      'reliquary-chest',
    )
    const shut = press(standingIn('reliquary'), 'reliquary-bell')
    expect(reduce(shut, { type: 'INTERACT', interactionId: 'reliquary-chest' })).toBe(shut)
    expect(lootIn(shut.run!)).toEqual([])
  })

  it('cannot be robbed through a shut chest', () => {
    const shut = press(standingIn('reliquary'), 'reliquary-bell')
    expect(reduce(shut, { type: 'TAKE', index: 0 })).toBe(shut)
    expect(carried(shut)).toEqual([])
  })

  it('puts the Talisman of the Pair in the open chest, and does not hand it over', () => {
    // An **authored** find: the template names it, so the pool is never
    // touched. The talisman used to be starting equipment, and it lives here
    // now — which is what makes working the room worth doing.
    const opened = press(
      standingIn('reliquary'),
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
    )
    expect(ROOM_TEMPLATES['reliquary']!.find).toBe('pair-talisman')
    expect(unclaimedIn(opened.run!).map((l) => l.id)).toEqual(['pair-talisman'])
    // Revealed is not carried. Nothing has moved into the loadout and the door
    // has recorded nothing.
    expect(carried(opened)).toEqual([])
    expect(opened.meta.seenRewards).toEqual([])
    expect(opened.run?.say).toContain(reward('pair-talisman').name)
  })

  it('hands it over on TAKE, and once', () => {
    const opened = press(
      standingIn('reliquary'),
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
    )
    const took = take(opened)
    expect(took.run!.talismans).toEqual(['pair-talisman'])
    expect(took.meta.seenRewards).toContain('pair-talisman')
    // Not twice, and not across a reload — which is the press the save used to
    // invite.
    expect(reduce(took, { type: 'TAKE', index: 0 })).toBe(took)
    expect(carried(take(reloaded(took)))).toEqual(['pair-talisman'])
  })

  it('never touches the pile, whatever it hands over', () => {
    // The chest fills the loadout. It is not a bone source and it never was:
    // the pile only moves for a fight, a font, a Vial or a room that charges.
    const took = take(
      press(standingIn('reliquary'), 'reliquary-bell', 'reliquary-brazier', 'reliquary-lever'),
    )
    expect(took.run!.bones).toBe(BONE_CEILING)
  })

  it('holds the same thing for every seed, because it is placed rather than drawn', () => {
    const solve = (s: GameState): GameState =>
      take(press(s, 'reliquary-bell', 'reliquary-brazier', 'reliquary-lever'))
    for (let seed = 1; seed <= 24; seed++) {
      expect(carried(solve(standingIn('reliquary', seed))), `seed ${seed}`).toEqual([
        'pair-talisman',
      ])
    }
  })

  it('cannot have what is in it changed by a reload', () => {
    const opened = press(
      standingIn('reliquary', 12),
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
    )
    const back = reloaded(opened)
    expect(lootIn(back.run!)).toEqual(lootIn(opened.run!))
    expect(roomStateOf(back)).toEqual(roomStateOf(opened))
  })

  it('lets you walk out on it, and the thing stays behind', () => {
    const opened = press(
      standingIn('reliquary'),
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
    )
    const left = opened.run!.roomId
    const walked = reduce(opened, { type: 'GO', to: onwardFrom(opened) })
    expect(carried(walked)).toEqual([])
    expect(unclaimedIn(walked.run!, left).map((l) => l.id)).toEqual(['pair-talisman'])
    expect(walked.run!.say).toContain('The door does not open twice')
  })

  it('lets you leave without touching anything in it', () => {
    const here = standingIn('reliquary')
    const walked = reduce(here, { type: 'GO', to: onwardFrom(here) })
    expect(roomAt(walked.run!).id).toBe('fork')
    // No penalty, and no trace: the run records nothing about a room it
    // walked through.
    expect(walked.run?.rooms).toBeUndefined()
    expect(walked.run!.bones).toBe(BONE_CEILING)
  })

  it('lets you leave from any half-solved position', () => {
    const fresh = standingIn('reliquary')
    for (const part of [
      press(fresh, 'reliquary-bell'),
      press(fresh, 'reliquary-brazier'),
      press(fresh, 'reliquary-bell', 'reliquary-brazier'),
      press(fresh, 'reliquary-bell', 'reliquary-brazier', 'reliquary-lever'),
    ]) {
      expect(roomAt(reduce(part, { type: 'GO', to: onwardFrom(part) }).run!).id).toBe('fork')
    }
  })
})

describe('the Chain Vault', () => {
  it('opens with the cage up, the plate off and the gate shut', () => {
    expect(initialRoomState('chain-vault')).toEqual({
      templateId: 'chain-vault',
      chain: 'off',
      cage: 'raised',
      pressurePlate: 'off',
      lever: 'up',
      gate: 'closed',
    })
  })

  it('drops the cage onto the plate, and takes it off again', () => {
    const down = press(standingIn('chain-vault'), 'vault-chain')
    const weighted = roomStateOf(down)
    expect(weighted).toEqual({
      templateId: 'chain-vault',
      chain: 'on',
      cage: 'lowered',
      pressurePlate: 'on',
      lever: 'up',
      gate: 'closed',
    })
    expect(down.run?.say).toMatch(/The cage drops onto the plate/)
    // The verb turns round with the object.
    expect(actionFor(weighted, 'vault-chain')?.label).toBe('RAISE')

    const up = press(down, 'vault-chain')
    expect(roomStateOf(up)).toEqual(initialRoomState('chain-vault'))
    expect(actionFor(roomStateOf(up), 'vault-chain')?.label).toBe('LOWER')
  })

  it('costs exactly one bone when the lever is pulled against nothing', () => {
    const hurt = press(standingIn('chain-vault'), 'vault-lever')
    expect(hurt.run!.bones).toBe(BONE_CEILING - 1)
    expect(hurt.run?.say).toMatch(/The mechanism snaps back.*snaps/)
    expect(hurt.mode).toBe('explore')
  })

  it('does not open the gate on a pull against nothing, however many times', () => {
    let state = standingIn('chain-vault')
    for (let i = 0; i < 3; i++) state = press(state, 'vault-lever')
    const shut = roomStateOf(state)
    expect(shut.templateId === 'chain-vault' && shut.gate).toBe('closed')
    expect(shut.templateId === 'chain-vault' && shut.lever).toBe('up')
    expect(state.run!.bones).toBe(BONE_CEILING - 3)
  })

  it('can be pulled to death, and uses the death the game already has', () => {
    // One bone left. The pull takes it, and there is nothing behind it.
    let state = standingIn('chain-vault', 7, 1)
    state = press(state, 'vault-lever')
    expect(state.run!.bones).toBe(0)
    expect(state.mode).toBe('dead')
    expect(state.run?.cause).toBe('The chain mechanism.')
    // And it is over: a corpse cannot keep working the room.
    expect(press(state, 'vault-chain')).toBe(state)
  })

  it('takes nothing from an empty pile rather than going negative', () => {
    const here = standingIn('chain-vault', 7, 0)
    const state = press(here, 'vault-lever')
    expect(state.run!.bones).toBe(0)
  })

  it('opens the gate when the plate is weighted, and costs nothing', () => {
    const open = press(standingIn('chain-vault'), 'vault-chain', 'vault-lever')
    expect(open.run!.bones).toBe(BONE_CEILING)
    expect(roomStateOf(open)).toEqual({
      templateId: 'chain-vault',
      chain: 'on',
      cage: 'lowered',
      pressurePlate: 'on',
      lever: 'down',
      gate: 'open',
    })
    expect(open.run?.say).toMatch(/The weight holds.*The gate rises/)
  })

  it('takes both controls away once the gate is up', () => {
    const open = press(standingIn('chain-vault'), 'vault-chain', 'vault-lever')
    for (const id of ['vault-chain', 'vault-lever']) {
      expect(actionFor(roomStateOf(open), id)).toBeUndefined()
      expect(reduce(open, { type: 'INTERACT', interactionId: id })).toBe(open)
    }
  })

  it('refuses to let you leave while the gate is shut', () => {
    const shut = standingIn('chain-vault')
    // In the reducer, not in a stylesheet: no dispatch, fixture or reload gets
    // through a gate that is down.
    const deep = onwardFrom(shut)
    expect(reduce(shut, { type: 'GO', to: deep })).toBe(shut)
    expect(press(shut, 'vault-chain')).not.toBe(shut)
    expect(roomAt(reduce(press(shut, 'vault-chain'), { type: 'GO', to: deep }).run!).id).toBe('chain-vault')
  })

  it('leads on down the deep leg once the gate is up', () => {
    // **Where it leads is the map's, and the map changed.** THE DESCENT now cuts
    // an alcove into the deep leg between the gate and the Marrow, so what the
    // vault opens onto is whatever the grammar put next — which is exactly why a
    // room template names no destination. What is asserted is that the gate
    // actually opens onto something, and that the leg still reaches the keeper.
    const open = press(standingIn('chain-vault'), 'vault-chain', 'vault-lever')
    const on = reduce(open, { type: 'GO', to: onwardFrom(open) })
    expect(on.run!.roomId).not.toBe(open.run!.roomId)
    expect(aheadOf(on, on.run!.roomId)).toContain('gate')
  })

  it('is only on the deep route, and the stair skips it', () => {
    const fork = standingIn('fork')
    // The stair does not pass the vault, and the deep way does. Which *room* each
    // mouth opens onto is the grammar's — the descent puts an alcove on the stair
    // leg now — so what is asserted is the reach, not the next door.
    expect(aheadOf(fork, towards(fork, 'STAIR'))).not.toContain('chain-vault')
    expect(roomAt(fork.run!, towards(fork, 'DEEP')).id).toBe('chain-vault')
  })
})

describe('the Offertory', () => {
  const here = (bones = BONE_CEILING): GameState => standingIn('offertory', 7, bones)

  it('opens with the candles lit, nothing paid and the recess shut', () => {
    expect(initialRoomState('offertory')).toEqual({
      templateId: 'offertory',
      candles: 'lit',
      paid: false,
      recess: 'shut',
    })
  })

  it('will not take an offering until the price has been read', () => {
    // The carving is in the dark until the candles are out, exactly as the
    // Reliquary's handle is. The room is not a guessing game: it is a price
    // list you have to be able to see.
    const lit = here()
    expect(actionFor(roomStateOf(lit), 'offertory-altar')).toBeUndefined()
    expect(reduce(lit, { type: 'INTERACT', interactionId: 'offertory-altar' })).toBe(lit)
    const dark = press(lit, 'offertory-candles')
    expect(actionFor(roomStateOf(dark), 'offertory-altar')?.label).toBe('OFFER')
  })

  it('prints the price on the verb before it charges', () => {
    // Two bones, in digits, in the button's own accessible name. That is the
    // whole difference between a toll and a trap.
    const dark = press(here(), 'offertory-candles')
    expect(actionFor(roomStateOf(dark), 'offertory-altar')!.describe).toBe(
      'Two bones into the slot. That is what it says it costs.',
    )
    expect(
      ROOM_TEMPLATES['offertory']!.details.find((d) => d.focal)!.says,
    ).toBe('Two skulls carved beside the slot. Under them, two carved bones. A price list.')
  })

  it('costs exactly two bones, and opens the recess and the way out together', () => {
    const paid = press(here(), 'offertory-candles', 'offertory-altar')
    expect(paid.run!.bones).toBe(BONE_CEILING - 2)
    expect(roomStateOf(paid)).toEqual({
      templateId: 'offertory',
      candles: 'out',
      paid: true,
      recess: 'open',
    })
    expect(unclaimedIn(paid.run!).map((l) => l.id)).toEqual(['grave-candle'])
    expect(ROOM_TEMPLATES['offertory']!.find).toBe('grave-candle')
  })

  it('holds the way out until it is paid', () => {
    const shut = here()
    const onward = onwardFrom(shut)
    expect(reduce(shut, { type: 'GO', to: onward })).toBe(shut)
    const dark = press(shut, 'offertory-candles')
    expect(reduce(dark, { type: 'GO', to: onward })).toBe(dark)
    const paid = press(dark, 'offertory-altar')
    expect(roomAt(reduce(paid, { type: 'GO', to: onward }).run!).id).toBe('confluence')
  })

  it('charges a bone for prying at the lid, and moves nothing', () => {
    const pried = press(here(), 'offertory-recess')
    expect(pried.run!.bones).toBe(BONE_CEILING - 1)
    expect(pried.run!.say).toMatch(/The stone takes a finger/)
    const still = roomStateOf(pried)
    expect(still.templateId === 'offertory' && still.recess).toBe('shut')
    expect(lootIn(pried.run!)).toEqual([])
    // And it can be done as many times as there is blood for it.
    const again = press(pried, 'offertory-recess', 'offertory-recess')
    expect(again.run!.bones).toBe(BONE_CEILING - 3)
  })

  it('can be pried to death, and uses the death the game already has', () => {
    const doomed = press(here(1), 'offertory-recess')
    expect(doomed.run!.bones).toBe(0)
    expect(doomed.mode).toBe('dead')
    expect(doomed.run!.cause).toBe('The offertory.')
    // And it is over: a corpse cannot keep working the room.
    expect(press(doomed, 'offertory-candles')).toBe(doomed)
  })

  it('can be paid to death, and says which', () => {
    // The price is printed and it can still be the last of you. A toll that
    // could not kill would be a toll that never mattered.
    const doomed = press(here(2), 'offertory-candles', 'offertory-altar')
    expect(doomed.run!.bones).toBe(0)
    expect(doomed.mode).toBe('dead')
    expect(doomed.run!.cause).toBe('The offertory.')
  })

  it('takes every control away once it is paid', () => {
    const paid = press(here(), 'offertory-candles', 'offertory-altar')
    for (const id of ['offertory-candles', 'offertory-altar', 'offertory-recess']) {
      expect(actionFor(roomStateOf(paid), id)).toBeUndefined()
      expect(reduce(paid, { type: 'INTERACT', interactionId: id })).toBe(paid)
    }
  })

  it('is the right-hand branch of the Cleft, and the fight is the left', () => {
    const cleft = standingIn('cleft')
    expect(roomAt(cleft.run!, towards(cleft, 'GO ON')).id).toBe('hollow')
    expect(roomAt(cleft.run!, towards(cleft, 'NARROW')).id).toBe('offertory')
  })

  it('comes back with its price paid, across a reload', () => {
    const paid = press(here(), 'offertory-candles', 'offertory-altar')
    const back = reloaded(paid)
    expect(roomStateOf(back)).toEqual(roomStateOf(paid))
    expect(lootIn(back.run!)).toEqual(lootIn(paid.run!))
    expect(back.run!.bones).toBe(BONE_CEILING - 2)
  })
})

describe('the Chain Vault\u2019s cage', () => {
  it('is holding the iron, and hands it over on TAKE', () => {
    // The deep way certainly pays iron, and its own way-line says so before
    // the press. Nothing is in the cage until the gate is up.
    const shut = standingIn('chain-vault')
    expect(lootIn(shut.run!)).toEqual([])
    const open = press(shut, 'vault-chain', 'vault-lever')
    expect(unclaimedIn(open.run!).map((l) => l.id)).toEqual(['rustplate'])
    expect(open.run!.ironDice).toEqual([])
    const took = take(open)
    expect(took.run!.ironDice).toEqual(['rustplate'])
  })
})

describe('what a save carries', () => {
  it('holds room state as plain serialisable data', () => {
    const worked = press(standingIn('reliquary'), 'reliquary-bell', 'reliquary-brazier')
    const round = JSON.parse(JSON.stringify(worked.run!.rooms)) as unknown
    expect(round).toEqual(worked.run!.rooms)
    // No frame index, no timestamp, no clock of any kind.
    const keys = Object.keys(worked.run!.rooms![worked.run!.roomId]!)
    expect(keys.some((k) => /frame|time|at$|tick|ms/i.test(k))).toBe(false)
  })

  it('brings the Reliquary back exactly as it was left', () => {
    const solved = take(
      press(standingIn('reliquary', 3), 'reliquary-bell', 'reliquary-brazier', 'reliquary-lever'),
    )
    const back = reloaded(solved)
    expect(roomAt(back.run!).id).toBe('reliquary')
    expect(roomStateOf(back)).toEqual(roomStateOf(solved))
    expect(carried(back)).toEqual(carried(solved))
    // Every one-shot is spent: the bell has answered, the lever is down and
    // the chest has been emptied, so none of them is a control any more.
    for (const id of ['reliquary-bell', 'reliquary-lever', 'reliquary-chest']) {
      expect(actionFor(roomStateOf(back), id)).toBeUndefined()
    }
    // The brazier is not a one-shot and is not meant to become one. It is a
    // light you can keep changing your mind about, and the only thing that
    // ever depended on it — the lever — is already spent.
    expect(actionFor(roomStateOf(back), 'reliquary-brazier')?.label).toBe('LIGHT')
    expect(roomAt(reduce(back, { type: 'GO', to: onwardFrom(back) }).run!).id).toBe('fork')
  })

  it('brings the Chain Vault back with its gate still up', () => {
    const open = press(standingIn('chain-vault'), 'vault-chain', 'vault-lever')
    const back = reloaded(open)
    expect(roomStateOf(back)).toEqual(roomStateOf(open))
    const on = reduce(back, { type: 'GO', to: onwardFrom(back) })
    expect(on.run!.roomId).not.toBe(back.run!.roomId)
  })

  it('brings a half-worked Chain Vault back half-worked, and still shut', () => {
    const half = press(standingIn('chain-vault'), 'vault-chain')
    const back = reloaded(half)
    const weighted = roomStateOf(back)
    expect(weighted.templateId === 'chain-vault' && weighted.pressurePlate).toBe('on')
    expect(weighted.templateId === 'chain-vault' && weighted.gate).toBe('closed')
    expect(reduce(back, { type: 'GO', to: onwardFrom(back) })).toBe(back)
  })

  it('was bumped, because the shape of a run changed', () => {
    expect(SAVE_VERSION).toBe(12)
    // And the policy is unchanged: an older save is discarded, never migrated.
    // 8 is the War of Bones, whose run carried a two-part pile and whose fight
    // carried two lines of thrown bones. Neither shape can be read here, and
    // there is no ladder that would make it worth trying.
    const held = new Map<string, string>([['castlebrynth', JSON.stringify({ version: 8, mode: 'explore' })]])
    const store = {
      getItem: (k: string) => held.get(k) ?? null,
      setItem: () => {},
      removeItem: () => {},
    } as unknown as Storage
    expect(load(store).discarded).toBe('incompatible')
  })
})

describe('the rules a press is held to', () => {
  it('ignores an interaction the room does not declare', () => {
    const here = standingIn('reliquary')
    expect(reduce(here, { type: 'INTERACT', interactionId: 'vault-lever' })).toBe(here)
    expect(reduce(here, { type: 'INTERACT', interactionId: 'nothing-at-all' })).toBe(here)
  })

  it('ignores an interaction in a room that has none', () => {
    const hall = standingIn('entry')
    expect(reduce(hall, { type: 'INTERACT', interactionId: 'reliquary-bell' })).toBe(hall)
  })

  it('ignores an interaction outside explore', () => {
    const fighting = { ...standingIn('reliquary'), mode: 'combat' as const }
    expect(reduce(fighting, { type: 'INTERACT', interactionId: 'reliquary-bell' })).toBe(fighting)
  })

  it('offers a verb for exactly the presses the reducer will accept', () => {
    // The view draws a button when `actionFor` answers; the reducer accepts
    // when it answers. This is that agreement, over every reachable position
    // of both rooms.
    const walk = (state: GameState, depth: number): void => {
      if (depth === 0) return
      const here = roomAt(state.run!)
      for (const thing of here.interactables ?? []) {
        const offered = actionFor(roomStateOf(state), thing.id) !== undefined
        const moved = reduce(state, { type: 'INTERACT', interactionId: thing.id }) !== state
        expect(moved, `${thing.id} offered=${offered} moved=${moved}`).toBe(offered)
        if (offered) walk(reduce(state, { type: 'INTERACT', interactionId: thing.id }), depth - 1)
      }
    }
    walk(standingIn('reliquary'), 5)
    walk(standingIn('chain-vault'), 4)
    walk(standingIn('offertory'), 4)
  })
})
