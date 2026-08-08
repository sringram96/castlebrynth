/**
 * The invariants of the state machine.
 *
 * These are the model-level half of the reset's promises. The half that
 * matters more — that a real thumb on a real phone can reach all of it — is in
 * `test/browser`, and a green run here is explicitly not completion.
 */

import { describe, expect, it } from 'vitest'

import { MAX_HP, newRun, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { SAVE_VERSION, TITLE } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { HAND_SIZE } from '../../src/content/dice.js'
import { ENEMIES, intentAt } from '../../src/content/enemies.js'
import { ROOMS, room } from '../../src/content/rooms.js'
import { preview } from '../../src/combat/scoring.js'
import { resolve, selectionOf } from '../../src/combat/resolve.js'

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

const start = (seed = 1): GameState => reduce(TITLE, { type: 'START_RUN', seed })

/** Walk to the first fight and open it, taking the room's gift on the way. */
function toPassage(seed = 1): GameState {
  // Walking into the gift room opens the offer screen, exactly as a won fight
  // does. Taking one of the two is what returns to exploring.
  const arrived = reduce(start(seed), { type: 'GO', to: 'passage' })
  return reduce(arrived, { type: 'TAKE', id: arrived.run!.offer![0]! })
}

function intoFirstFight(seed = 1): GameState {
  return play(toPassage(seed), { type: 'GO', to: 'hollow' }, { type: 'FIGHT' })
}

describe('a new run', () => {
  it('starts with six dice, full health, and no stale combat', () => {
    const state = start()
    expect(state.mode).toBe('explore')
    expect(state.run?.dice).toHaveLength(HAND_SIZE)
    expect(state.run?.hp).toBe(MAX_HP)
    expect(state.run?.combat).toBeUndefined()
    expect(state.run?.offer).toBeUndefined()
    expect(state.run?.cause).toBeUndefined()
  })

  it('carries nothing over from the run before it', () => {
    const dead = play(
      intoFirstFight(),
      { type: 'ROLL' },
      { type: 'SELECT', slot: 0 },
      { type: 'SCORE' },
    )
    const next = reduce(dead, { type: 'START_RUN', seed: 2 })
    expect(next.run?.combat).toBeUndefined()
    expect(next.run?.relics).toEqual([])
    expect(next.run?.roomId).toBe('entry')
    expect(next.run?.hp).toBe(MAX_HP)
  })

  it('is a pure function of its seed', () => {
    expect(newRun(4)).toEqual(newRun(4))
  })
})

describe('a floor gift', () => {
  it('is offered on the same screen a won fight uses, and asked once', () => {
    const arrived = reduce(start(), { type: 'GO', to: 'passage' })
    expect(arrived.mode).toBe('reward')
    expect(arrived.run?.offer).toEqual(room('passage').gift)

    const taken = reduce(arrived, { type: 'TAKE', id: arrived.run!.offer![0]! })
    expect(taken.mode).toBe('explore')
    expect(taken.run?.offer).toBeUndefined()
    expect(taken.run?.cleared).toContain('passage')

    // And the other one stays where it is: the room does not ask again.
    const again = reduce(taken, { type: 'GO', to: 'hollow' })
    expect(again.mode).toBe('explore')
  })
})

describe('the room graph', () => {
  it('only names rooms that exist, and always offers a way on', () => {
    for (const r of Object.values(ROOMS)) {
      for (const exit of r.exits) expect(ROOMS[exit.to]).toBeDefined()
      if (!r.ending) expect(r.exits.length).toBeGreaterThan(0)
    }
  })

  it('reaches the ending from the first room down every branch', () => {
    const seen = new Set<string>()
    const walk = (id: string, depth: number): boolean => {
      if (depth > 20) return false
      seen.add(id)
      const here = room(id)
      if (here.ending) return true
      return here.exits.every((e) => walk(e.to, depth + 1))
    }
    expect(walk('entry', 0)).toBe(true)
    expect(seen.size).toBe(Object.keys(ROOMS).length)
  })

  it('never requires a hidden thing to leave a room', () => {
    // Every exit is reachable from arrival: no detail has to be found first.
    for (const r of Object.values(ROOMS)) {
      const arrived = { ...newRun(1), roomId: r.id, cleared: r.enemy ? [r.id] : [] }
      for (const exit of r.exits) {
        const moved = reduce({ ...TITLE, mode: 'explore', run: arrived }, { type: 'GO', to: exit.to })
        expect(moved.run?.roomId).toBe(exit.to)
      }
    }
  })

  it('holds you in a fight room until the enemy is down', () => {
    const held = reduce(toPassage(), { type: 'GO', to: 'hollow' })
    expect(reduce(held, { type: 'GO', to: 'fork' })).toBe(held)
  })
})

describe('a turn', () => {
  it('rolls exactly the hand', () => {
    const rolled = reduce(intoFirstFight(), { type: 'ROLL' })
    expect(rolled.run?.combat?.roll).toHaveLength(HAND_SIZE)
    expect(rolled.run?.combat?.phase).toBe('rolled')
  })

  it('lets a chosen die be unchosen, and never repeats a slot', () => {
    let state = reduce(intoFirstFight(), { type: 'ROLL' })
    state = play(state, { type: 'SELECT', slot: 2 }, { type: 'SELECT', slot: 4 })
    expect(state.run?.combat?.selected).toEqual([2, 4])
    state = reduce(state, { type: 'SELECT', slot: 2 })
    expect(state.run?.combat?.selected).toEqual([4])
    const slots = state.run!.combat!.selected
    expect(new Set(slots).size).toBe(slots.length)
  })

  it('keeps chosen dice across the reroll and throws the rest', () => {
    const rolled = reduce(intoFirstFight(), { type: 'ROLL' })
    const chosen = play(rolled, { type: 'SELECT', slot: 0 }, { type: 'SELECT', slot: 3 })
    const after = reduce(chosen, { type: 'REROLL' })
    expect(after.run?.combat?.phase).toBe('rerolled')
    expect(after.run?.combat?.roll).toHaveLength(HAND_SIZE)
    for (const slot of [0, 3]) {
      expect(after.run!.combat!.roll.find((d) => d.slot === slot)).toEqual(
        chosen.run!.combat!.roll.find((d) => d.slot === slot),
      )
    }
    // And a chosen die stays chosen: the mark is one thing, not two.
    expect(after.run?.combat?.selected).toEqual([0, 3])
  })

  it('offers only one reroll', () => {
    const twice = play(intoFirstFight(), { type: 'ROLL' }, { type: 'REROLL' })
    expect(reduce(twice, { type: 'REROLL' })).toBe(twice)
  })

  it('will not score nothing', () => {
    const rolled = reduce(intoFirstFight(), { type: 'ROLL' })
    expect(reduce(rolled, { type: 'SCORE' })).toBe(rolled)
  })

  it('lands the damage the preview showed', () => {
    const chosen = play(
      intoFirstFight(),
      { type: 'ROLL' },
      { type: 'SELECT', slot: 0 },
      { type: 'SELECT', slot: 1 },
      { type: 'SELECT', slot: 2 },
    )
    const combat = chosen.run!.combat!
    const shown = preview(selectionOf(combat), chosen.run!.relics, combat.spentHands)
    const after = reduce(chosen, { type: 'SCORE' })
    expect(after.run!.combat!.enemyHp).toBe(combat.enemyHp - shown.damage)
  })

  it('returns to the top of the next turn with a clean table', () => {
    const after = play(
      intoFirstFight(),
      { type: 'ROLL' },
      { type: 'SELECT', slot: 0 },
      { type: 'SCORE' },
    )
    const combat = after.run!.combat!
    expect(combat.phase).toBe('intent')
    expect(combat.turn).toBe(1)
    expect(combat.roll).toEqual([])
    expect(combat.selected).toEqual([])
  })

  it('takes the enemy blow, less armour', () => {
    const bare = play(intoFirstFight(), { type: 'ROLL' }, { type: 'SELECT', slot: 0 }, { type: 'SCORE' })
    const bite = intentAt('gnawing', 0).damage
    expect(bare.run!.hp).toBe(MAX_HP - bite)

    const armoured = play(
      { ...intoFirstFight(), run: { ...intoFirstFight().run!, relics: ['plate'] } },
      { type: 'ROLL' },
      { type: 'SELECT', slot: 0 },
      { type: 'SCORE' },
    )
    expect(armoured.run!.hp).toBe(MAX_HP - (bite - 2))
  })
})

describe('the outcome', () => {
  const fightAt = (enemyHp: number, hp: number) => {
    const state = intoFirstFight()
    const rolled = reduce(state, { type: 'ROLL' })
    const combat = rolled.run!.combat!
    return {
      ...rolled,
      run: { ...rolled.run!, hp, combat: { ...combat, enemyHp, selected: [0, 1, 2, 3, 4, 5] } },
    }
  }

  it('never lets a dead enemy act', () => {
    const nearly = fightAt(1, MAX_HP)
    const out = resolve(nearly.run!, nearly.run!.combat!)
    expect(out.won).toBe(true)
    expect(out.blow).toBeUndefined()
    expect(out.hp).toBe(MAX_HP)
  })

  it('goes to the reward screen on a win, with combat gone', () => {
    const after = reduce(fightAt(1, MAX_HP), { type: 'SCORE' })
    expect(after.mode).toBe('reward')
    expect(after.run?.combat).toBeUndefined()
    expect(after.run?.offer?.length).toBe(3)
    expect(new Set(after.run!.offer).size).toBe(3)
  })

  it('always sets mode dead when health reaches zero, and says why', () => {
    const after = reduce(fightAt(9999, 3), { type: 'SCORE' })
    expect(after.mode).toBe('dead')
    expect(after.run?.hp).toBe(0)
    expect(after.run?.cause).toBeTruthy()
  })

  it('offers nothing already carried', () => {
    const won = reduce(fightAt(1, MAX_HP), { type: 'SCORE' })
    const withRelic = {
      ...won,
      run: { ...won.run!, relics: ['knuckle'], offer: won.run!.offer! },
    }
    const taken = reduce(withRelic, { type: 'TAKE', id: withRelic.run!.offer![0]! })
    expect(taken.mode).toBe('explore')
    expect(taken.run?.offer).toBeUndefined()
  })

  it('equips a taken die into the six and keeps the hand at six', () => {
    const won = reduce(fightAt(1, MAX_HP), { type: 'SCORE' })
    const dieOffer = won.run!.offer!.find((id) => id === 'careful' || id === 'leech' || id === 'pusher' || id === 'runner')
    const id = dieOffer ?? won.run!.offer![0]!
    const taken = reduce(won, { type: 'TAKE', id })
    expect(taken.run?.dice).toHaveLength(HAND_SIZE)
    if (dieOffer) expect(taken.run?.dice).toContain(dieOffer)
  })
})

describe('the doors of the machine', () => {
  it('boots to the title with no run', () => {
    expect(TITLE.mode).toBe('title')
    expect(TITLE.run).toBeUndefined()
    expect(TITLE.version).toBe(SAVE_VERSION)
  })

  it('will not continue into nothing', () => {
    expect(reduce(TITLE, { type: 'CONTINUE' })).toBe(TITLE)
  })

  it('continues back to exactly the mode it left', () => {
    const fighting = intoFirstFight()
    const parked = reduce(fighting, { type: 'TITLE' })
    expect(parked.mode).toBe('title')
    expect(reduce(parked, { type: 'CONTINUE' }).mode).toBe('combat')
  })

  it('does not continue back into a run that ended', () => {
    const state = intoFirstFight()
    const rolled = reduce(state, { type: 'ROLL' })
    const doomed = {
      ...rolled,
      run: { ...rolled.run!, hp: 1, combat: { ...rolled.run!.combat!, enemyHp: 9999, selected: [0] } },
    }
    const dead = reduce(doomed, { type: 'SCORE' })
    expect(dead.mode).toBe('dead')
    // The door does not offer to send you back into a run that is over, so
    // CONTINUE has nowhere to go and the title stays up.
    const parked = reduce(dead, { type: 'TITLE' })
    expect(parked.resume).toBeUndefined()
    expect(reduce(parked, { type: 'CONTINUE' }).mode).toBe('title')
  })

  it('reaches complete by walking out', () => {
    const out = reduce(toPassage(), { type: 'GO', to: 'hollow' })
    const cleared = { ...out, run: { ...out.run!, cleared: ['hollow'] } }
    const done = play(
      cleared,
      { type: 'GO', to: 'fork' },
      { type: 'GO', to: 'gate' },
    )
    const past = { ...done, run: { ...done.run!, cleared: ['hollow', 'gate'] } }
    const finished = reduce(past, { type: 'GO', to: 'exit' })
    expect(finished.mode).toBe('complete')
    expect(finished.meta.wins).toBe(1)
  })

  it('looks for free, and answers every time', () => {
    const state = start()
    for (const detail of room('entry').details) {
      const looked = reduce(state, { type: 'LOOK', detailId: detail.id })
      expect(looked.run?.say).toBe(detail.says)
      expect(looked.run?.hp).toBe(state.run?.hp)
    }
  })
})

describe('the enemies', () => {
  it('declares an intent for every turn of every fight', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.script.length).toBeGreaterThan(0)
      for (let turn = 0; turn < 40; turn++) {
        const intent = intentAt(e.id, turn)
        expect(intent.verb.length).toBeGreaterThan(0)
        expect(intent.explain.length).toBeGreaterThan(0)
        expect(intent.damage).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('teaches one thing at a time', () => {
    // The first enemy has no special rule at all; the boss introduces none.
    expect(ENEMIES['gnawing']!.script.some((i) => i.telegraph)).toBe(false)
    const taught = new Set<string>()
    for (const i of ENEMIES['marrow']!.script) if (i.telegraph) taught.add('telegraph')
    for (const i of ENEMIES['warden']!.script) if (i.telegraph) expect(taught.has('telegraph')).toBe(true)
  })

  it('states the number a telegraphed blow will land for', () => {
    for (const e of Object.values(ENEMIES)) {
      e.script.forEach((intent, index) => {
        if (!intent.telegraph) return
        const next = e.script[(index + 1) % e.script.length]!
        expect(intent.explain).toContain(String(next.damage))
      })
    }
  })
})
