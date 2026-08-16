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

import { newRun, reduce } from '../../src/game/reducer.js'
import { SAVE_VERSION, TITLE } from '../../src/game/state.js'
import type { GameState, RoomInteractionState } from '../../src/game/state.js'
import { load, save } from '../../src/game/save.js'
import { LOOT_REWARDS, reward } from '../../src/content/rewards.js'
import { BONE_CEILING } from '../../src/content/bones.js'
import { roomAt } from '../../src/game/map.js'
import { nodeOf } from './where.js'
import { actionFor, initialRoomState, stateOf } from '../../src/content/interactions.js'

/**
 * Standing in a room, mid-run, with nothing in it touched.
 *
 * Named by its authored **template** — the reliquary, the chain vault — and
 * resolved to whichever node of this run's map used it. A test may not invent
 * a room; it may only stand in one the director built.
 */
function standingIn(templateId: string, seed = 7, bones = BONE_CEILING): GameState {
  const run = newRun(seed)
  const roomId = nodeOf(run, templateId)
  const stood = { ...run, roomId, bones, path: [...run.path, roomId] }
  return {
    ...TITLE,
    mode: 'explore',
    run: { ...stood, say: roomAt(stood).arrival },
  }
}

/** Where a press has to go, from where the run is standing. */
const onwardFrom = (state: GameState): string => roomAt(state.run!).exits[0]!.to

/** The way on from a fork, by the label the player reads. */
const towards = (state: GameState, label: string): string =>
  roomAt(state.run!).exits.find((e) => e.label === label)!.to

/** What the run is carrying that a chest could have given it. */
function carried(state: GameState): readonly string[] {
  return Array.from({ length: state.run!.vials }, () => 'vial')
}

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
      claimed: false,
    })
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

  it('cannot be robbed through a shut chest', () => {
    const shut = press(standingIn('reliquary'), 'reliquary-bell')
    expect(actionFor(roomStateOf(shut), 'reliquary-chest')).toBeUndefined()
    expect(reduce(shut, { type: 'INTERACT', interactionId: 'reliquary-chest' })).toBe(shut)
    expect(carried(shut)).toEqual([])
  })

  it('gives exactly one thing from the reward pool', () => {
    const took = press(
      standingIn('reliquary'),
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
      'reliquary-chest',
    )
    expect(carried(took)).toHaveLength(1)
    const found = carried(took)[0]!
    // Something from the pool the fights draw from. No new species, no new
    // noun, and no chest-only object.
    expect(LOOT_REWARDS).toContain(found)
    const claimed = roomStateOf(took)
    expect(claimed.templateId === 'reliquary' && claimed.claimed).toBe(true)
    expect(claimed.templateId === 'reliquary' && claimed.rewardId).toBe(found)
    expect(took.run?.say).toContain('Inside:')
    // Meta remembers it exactly as a reward screen would.
    expect(took.meta.seenRewards).toContain(found)
  })

  it('never touches the pile, whatever it hands over', () => {
    // The chest fills the satchel. It is not a bone source and it never was:
    // the pile only moves for a fight, a font, a Vial or the vault's backlash.
    const here = standingIn('reliquary')
    const took = press(
      here,
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
      'reliquary-chest',
    )
    const claimed = roomStateOf(took)
    const found = claimed.templateId === 'reliquary' ? claimed.rewardId : undefined
    if (found) expect(reward(found).kind).toBe('vial')
    expect(took.run!.bones).toBe(BONE_CEILING)
  })

  it('draws the same thing for the same seed and the same history', () => {
    const solve = (s: GameState): GameState =>
      press(s, 'reliquary-bell', 'reliquary-brazier', 'reliquary-lever', 'reliquary-chest')
    expect(carried(solve(standingIn('reliquary', 99)))).toEqual(
      carried(solve(standingIn('reliquary', 99))),
    )
    // The pool is one noun deep for this baseline, so every seed draws the
    // same thing — what is under test is that it draws *exactly one*, off the
    // run's own generator, and never twice.
    for (let seed = 1; seed <= 24; seed++) {
      expect(carried(solve(standingIn('reliquary', seed)))).toEqual(['vial'])
    }
  })

  it('cannot have its reward changed by a reload', () => {
    const took = press(
      standingIn('reliquary', 12),
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
      'reliquary-chest',
    )
    const back = reloaded(took)
    expect(carried(back)).toEqual(carried(took))
    expect(roomStateOf(back)).toEqual(roomStateOf(took))
  })

  it('cannot pay twice, however many times the chest is pressed', () => {
    const took = press(
      standingIn('reliquary'),
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
      'reliquary-chest',
    )
    const again = press(took, 'reliquary-chest', 'reliquary-chest')
    expect(again).toBe(took)
    expect(carried(again)).toHaveLength(1)
    // Not even across a reload, which is the press the save used to invite.
    expect(carried(press(reloaded(took), 'reliquary-chest'))).toHaveLength(1)
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

  it('leads to the Deep Way once the gate is up', () => {
    const open = press(standingIn('chain-vault'), 'vault-chain', 'vault-lever')
    const on = reduce(open, { type: 'GO', to: onwardFrom(open) })
    expect(roomAt(on.run!).id).toBe('deep')
    // And the deep way rejoins. The map says so now, not the room.
    expect(roomAt(on.run!, onwardFrom(on)).id).toBe('gate')
  })

  it('is only on the deep route, and the stair skips it', () => {
    const fork = standingIn('fork')
    expect(roomAt(fork.run!, towards(fork, 'STAIR')).id).toBe('gate')
    expect(roomAt(fork.run!, towards(fork, 'DEEP')).id).toBe('chain-vault')
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
    const solved = press(
      standingIn('reliquary', 3),
      'reliquary-bell',
      'reliquary-brazier',
      'reliquary-lever',
      'reliquary-chest',
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
    expect(roomAt(reduce(back, { type: 'GO', to: onwardFrom(back) }).run!).id).toBe('deep')
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
    expect(SAVE_VERSION).toBe(9)
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
  })
})
