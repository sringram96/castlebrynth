/**
 * The Font.
 *
 * A healing room is the easiest thing in a roguelike to turn into an exploit,
 * and every way of doing it is a way of asking the same question twice. So the
 * shape of this file is that question, asked from every direction: pressing
 * again, reloading, reloading mid-sequence, walking back in, and rolling on a
 * body with nothing wrong with it.
 *
 * The answer is always the same sentence — **the room decided once, and the
 * decision is in the save** — and the tests below are that sentence stated in
 * terms the reducer can fail.
 */

import { describe, expect, it } from 'vitest'

import { HEAL_FRACTIONS, MAX_HP, applyRecovery, newRun, recovered, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { SAVE_VERSION, TITLE } from '../../src/game/state.js'
import type { GameState, RitualRoll, RunState } from '../../src/game/state.js'
import { ROOMS, room } from '../../src/content/rooms.js'
import { load, save } from '../../src/game/save.js'

const ROLLS: readonly RitualRoll[] = [1, 2, 3, 4, 5, 6]

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/**
 * Standing in the chapel, on a chosen seed and at a chosen health.
 *
 * Walked to rather than assembled: the ritual's draw is positioned by the
 * run's history, so a state that skipped the walk would roll a different
 * number from the one a player reaches — which is exactly the class of bug
 * these tests are about.
 */
function inSanctuary(seed = 1, hp = MAX_HP): GameState {
  const walked = play(
    reduce(TITLE, { type: 'START_RUN', seed }),
    { type: 'GO', to: 'passage' },
    { type: 'GO', to: 'hollow' },
  )
  const beaten = { ...walked, run: { ...walked.run!, cleared: ['hollow'] } }
  const arrived = reduce(beaten, { type: 'GO', to: 'sanctuary' })
  return { ...arrived, run: { ...arrived.run!, hp } }
}

/** A tiny in-memory Storage, so a reload can be tested without a browser. */
function memoryStore(): Storage {
  const held = new Map<string, string>()
  return {
    getItem: (k) => held.get(k) ?? null,
    setItem: (k, v) => void held.set(k, v),
    removeItem: (k) => void held.delete(k),
    clear: () => held.clear(),
    key: () => null,
    get length() {
      return held.size
    },
  } as Storage
}

/** Save, boot, and press CONTINUE — the whole of what a reload is. */
function reloaded(state: GameState): GameState {
  const store = memoryStore()
  save(state, store)
  return reduce(load(store).state, { type: 'CONTINUE' })
}

describe('the route', () => {
  it('puts the chapel between the Gnawing and the fork', () => {
    expect(room('hollow').exits.map((e) => e.to)).toEqual(['sanctuary'])
    expect(room('sanctuary').exits.map((e) => e.to)).toEqual(['fork'])
    // And the fork is untouched: it is still the run's one route decision.
    expect(room('fork').exits.map((e) => e.to)).toEqual(['gate', 'deep'])
  })

  it('walks there by beating the Gnawing and pressing GO ON', () => {
    const here = inSanctuary()
    expect(here.mode).toBe('explore')
    expect(here.run?.roomId).toBe('sanctuary')
    expect(here.run?.path).toEqual(['entry', 'passage', 'hollow', 'sanctuary'])
    expect(here.run?.say).toBe(room('sanctuary').arrival)
  })

  it('holds you in the chapel until the font has been used', () => {
    const held = inSanctuary()
    // Not a hidden exit and not a disabled button: the reducer refuses, so
    // there is no dispatch, fixture or reload that walks past it.
    expect(reduce(held, { type: 'GO', to: 'fork' })).toBe(held)
    const rolled = reduce(held, { type: 'RITUAL_ROLL' })
    expect(reduce(rolled, { type: 'GO', to: 'fork' }).run?.roomId).toBe('fork')
  })

  it('leaves exactly one ritual in the graph', () => {
    // The run carries one `ritual` record, so two ritual rooms would have the
    // second overwrite the first — and the first would shut behind you. When
    // there is a second, this is the test that says what has to change.
    const ritual = Object.values(ROOMS).filter((r) => r.ritual)
    expect(ritual.map((r) => r.id)).toEqual(['sanctuary'])
  })

  it('gives the chapel a way on that is worth reading, and no enemy', () => {
    const here = room('sanctuary')
    expect(here.enemy).toBeUndefined()
    expect(here.ritual?.label.length).toBeGreaterThan(0)
    expect(here.exits).toHaveLength(1)
  })
})

describe('the draw', () => {
  it('lands on a face of an ordinary die, and on all six across seeds', () => {
    const seen = new Set<number>()
    for (let seed = 1; seed <= 200; seed++) {
      const roll = reduce(inSanctuary(seed, 10), { type: 'RITUAL_ROLL' }).run!.ritual!.roll
      expect(roll).toBeGreaterThanOrEqual(1)
      expect(roll).toBeLessThanOrEqual(6)
      expect(Number.isInteger(roll)).toBe(true)
      seen.add(roll)
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('is a pure function of the run: the same seed and history roll the same', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const a = reduce(inSanctuary(seed, 40), { type: 'RITUAL_ROLL' })
      const b = reduce(inSanctuary(seed, 40), { type: 'RITUAL_ROLL' })
      expect(a.run?.ritual).toEqual(b.run?.ritual)
      expect(a.run?.hp).toBe(b.run?.hp)
    }
  })

  it('answers a second press with nothing at all', () => {
    const once = reduce(inSanctuary(1, 40), { type: 'RITUAL_ROLL' })
    // Identity, not equality: the reducer returned the same object, so there
    // is no second heal, no second draw, and nothing for a held thumb to farm.
    for (let press = 0; press < 5; press++) {
      expect(reduce(once, { type: 'RITUAL_ROLL' })).toBe(once)
    }
  })

  it('cannot be rerolled or re-healed by reloading', () => {
    const rolled = reduce(inSanctuary(7, 31), { type: 'RITUAL_ROLL' })
    const back = reloaded(rolled)
    expect(back.mode).toBe('explore')
    expect(back.run?.ritual).toEqual(rolled.run?.ritual)
    expect(back.run?.hp).toBe(rolled.run?.hp)
    // And the room is still spent on the far side of the reload.
    expect(reduce(back, { type: 'RITUAL_ROLL' })).toBe(back)
  })

  it('cannot be rolled from anywhere that is not a room with a font', () => {
    for (const id of ['entry', 'passage', 'hollow', 'fork', 'deep', 'gate']) {
      const run = { ...newRun(1), roomId: id }
      const state: GameState = { ...TITLE, mode: 'explore', run }
      expect(reduce(state, { type: 'RITUAL_ROLL' })).toBe(state)
    }
  })

  it('cannot be rolled while a fight or a screen is up', () => {
    const here = inSanctuary(1, 40)
    for (const mode of ['title', 'combat', 'reward', 'dead', 'complete'] as const) {
      const wrong = { ...here, mode }
      expect(reduce(wrong, { type: 'RITUAL_ROLL' })).toBe(wrong)
    }
  })
})

describe('what a face gives back', () => {
  it('restores the declared share of what is missing', () => {
    // The mapping, stated here as the player-facing promise rather than as
    // the table the reducer reads — if the two ever disagree, this fails.
    const share: Readonly<Record<RitualRoll, number>> = {
      1: 0.19,
      2: 0.35,
      3: 0.51,
      4: 0.68,
      5: 0.84,
      6: 1.0,
    }
    expect(HEAL_FRACTIONS).toEqual(share)

    const missing = 60
    const want: Readonly<Record<RitualRoll, number>> = { 1: 11, 2: 21, 3: 31, 4: 41, 5: 50, 6: 60 }
    for (const roll of ROLLS) {
      expect(recovered(roll, missing), `roll ${roll} on ${missing} missing`).toBe(want[roll])
    }
  })

  it('is a share of the wound, never of the body', () => {
    for (const roll of ROLLS) {
      for (const missing of [4, 17, 33, 60, 99]) {
        const got = recovered(roll, missing)
        const flat = HEAL_FRACTIONS[roll] * missing
        expect(Math.abs(got - flat), `roll ${roll} on ${missing}`).toBeLessThanOrEqual(1)
        // Never the raw number on the die, which is the reading this design
        // is most likely to be mistaken for.
        if (missing >= 40 && roll >= 2) expect(got).toBeGreaterThan(roll)
      }
    }
  })

  it('never gives nothing back for a wound, however small', () => {
    for (const roll of ROLLS) {
      for (let missing = 1; missing <= 20; missing++) {
        expect(recovered(roll, missing), `roll ${roll} on ${missing}`).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('makes a six whole, exactly, at every health', () => {
    for (let hp = 0; hp <= MAX_HP; hp++) {
      const run: RunState = { ...newRun(1), hp }
      expect(applyRecovery('hp', 6, run).value).toBe(MAX_HP)
    }
  })

  it('never overfills, on any face at any health', () => {
    for (const roll of ROLLS) {
      for (let hp = 0; hp <= MAX_HP; hp++) {
        const run: RunState = { ...newRun(1), hp }
        const { healed, value } = applyRecovery('hp', roll, run)
        expect(value).toBeLessThanOrEqual(MAX_HP)
        expect(value).toBe(Math.min(MAX_HP, hp + healed))
        expect(value).toBeGreaterThanOrEqual(hp)
      }
    }
  })

  it('gives a whole body nothing, and still answers the press', () => {
    const full = reduce(inSanctuary(3, MAX_HP), { type: 'RITUAL_ROLL' })
    expect(full.run?.hp).toBe(MAX_HP)
    expect(full.run?.ritual?.healed).toBe(0)
    expect(full.run?.ritual?.missingBefore).toBe(0)
    // The room is used up either way, so the way on opens and the press is
    // not silently ignored.
    expect(full.run?.ritual?.roomId).toBe('sanctuary')
    expect(full.run?.say).toMatch(/nothing left for it to mend/i)
    expect(reduce(full, { type: 'GO', to: 'fork' }).run?.roomId).toBe('fork')
  })

  it('says the number it landed on, and the health, in the same line', () => {
    const NAMES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']
    for (let seed = 1; seed <= 60; seed++) {
      const after = reduce(inSanctuary(seed, 40), { type: 'RITUAL_ROLL' })
      const { roll, healed } = after.run!.ritual!
      expect(after.run?.say).toContain(NAMES[roll])
      if (roll !== 6) expect(after.run?.say).toContain(String(healed))
    }
  })
})

describe('the record it keeps', () => {
  it('is small, serialisable, and survives a round trip through a save', () => {
    const rolled = reduce(inSanctuary(11, 25), { type: 'RITUAL_ROLL' })
    const ritual = rolled.run!.ritual!
    expect(Object.keys(ritual).sort()).toEqual(['healed', 'missingBefore', 'roll', 'roomId'])
    expect(JSON.parse(JSON.stringify(ritual))).toEqual(ritual)
  })

  it('states what was missing when it was pressed, so the number is legible', () => {
    const rolled = reduce(inSanctuary(11, 25), { type: 'RITUAL_ROLL' })
    const { healed, missingBefore, roll } = rolled.run!.ritual!
    expect(missingBefore).toBe(MAX_HP - 25)
    expect(healed).toBe(recovered(roll, missingBefore))
    expect(rolled.run?.hp).toBe(25 + healed)
  })

  it('carries nothing into the next run', () => {
    const rolled = reduce(inSanctuary(11, 25), { type: 'RITUAL_ROLL' })
    expect(reduce(rolled, { type: 'START_RUN', seed: 2 }).run?.ritual).toBeUndefined()
  })

  it('is a new shape, so the save version moved with it', () => {
    // No migration ladder in this repository — an old save is discarded and
    // reported. The only thing that has to be true is that it *is* discarded.
    expect(SAVE_VERSION).toBeGreaterThan(3)
    const store = memoryStore()
    store.setItem('castlebrynth', JSON.stringify({ version: 3, mode: 'explore', meta: {}, run: newRun(1) }))
    const old = load(store)
    expect(old.discarded).toBe('incompatible')
    expect(old.state.run).toBeUndefined()
  })
})
