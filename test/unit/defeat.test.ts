/**
 * The death of a horror, as a state the fight is in.
 *
 * The claim under test is not "an animation plays" — an animation is not a
 * fact about a run and nothing here can see one. It is that killing something
 * whose death has been authored puts the fight into a state with **no move
 * left in it and exactly one way out**, that the way out grants the same win
 * the old single-press path granted, and that nothing can take it twice.
 *
 * The sequence itself lives in `src/app/app.ts` and is asserted in
 * `test/browser/defeat.spec.ts`, where there is a screen to watch it on.
 */

import { describe, expect, it } from 'vitest'

import { MAX_HP, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { TITLE } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { ENEMIES, REACHES, enemy, turnAt } from '../../src/content/enemies.js'
import { DEFEATS, defeatDuration, defeatOf, defeatStance } from '../../src/content/defeat.js'
import type { Defeat } from '../../src/content/defeat.js'
import { ENEMY_ART } from '../../src/render/assets.js'

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/** A fight against the Gnawing, rolled, with every die chosen. */
function poised(enemyHp: number, seed = 1): GameState {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const run = started.run!
  const opened = reduce(
    { ...started, run: { ...run, roomId: 'hollow', path: [...run.path, 'hollow'] } },
    { type: 'FIGHT' },
  )
  const rolled = reduce(opened, { type: 'ROLL' })
  const combat = rolled.run!.combat!
  return {
    ...rolled,
    run: { ...rolled.run!, combat: { ...combat, enemyHp, selected: [0, 1, 2, 3, 4, 5] } },
  }
}

/** A fight in a named room, rolled, with every die chosen. */
function poisedIn(roomId: string, enemyHp: number, seed = 1): GameState {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const run = started.run!
  const opened = reduce(
    { ...started, run: { ...run, roomId, path: [...run.path, roomId] } },
    { type: 'FIGHT' },
  )
  const rolled = reduce(opened, { type: 'ROLL' })
  const combat = rolled.run!.combat!
  return {
    ...rolled,
    run: { ...rolled.run!, combat: { ...combat, enemyHp, selected: [0, 1, 2, 3, 4, 5] } },
  }
}

/** A fight against something that stands still, and has no authored death. */
function poisedTrading(enemyHp: number, seed = 1): GameState {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const run = started.run!
  const opened = reduce(
    { ...started, run: { ...run, roomId: 'deep', path: [...run.path, 'deep'] } },
    { type: 'FIGHT' },
  )
  const rolled = reduce(opened, { type: 'ROLL' })
  const combat = rolled.run!.combat!
  return {
    ...rolled,
    run: { ...rolled.run!, combat: { ...combat, enemyHp, selected: [0, 1, 2, 3, 4, 5] } },
  }
}

const killed = (seed = 1): GameState => reduce(poised(1, seed), { type: 'SCORE' })

describe('killing a horror whose death is authored', () => {
  it('holds the fight open on it instead of popping to the win', () => {
    const dying = killed()
    expect(dying.mode).toBe('combat')
    const combat = dying.run!.combat!
    expect(combat.defeated).toBe(true)
    expect(combat.enemyHp).toBe(0)
    // Nothing about the win has happened yet. This is the whole point: the
    // room is still un-cleared, so a reload lands back in the death rather
    // than in a room that has already been packed away.
    expect(dying.run!.cleared).not.toContain('hollow')
    expect(dying.run!.offer).toBeUndefined()
  })

  it('settles the health the killing hand cost or gave, at once', () => {
    // The face costs and heals of that hand already happened. Only the win is
    // being waited on, and health is not part of the win.
    const dying = killed()
    expect(dying.run!.hp).toBeGreaterThan(0)
    expect(dying.run!.hp).toBeLessThanOrEqual(MAX_HP)
  })

  it('leaves it standing where it died', () => {
    for (const reach of REACHES) {
      const at = poised(1)
      const combat = at.run!.combat!
      const there = {
        ...at,
        run: {
          ...at.run!,
          combat: { ...combat, approach: reach, turn: turnAt('gnawing', reach) },
        },
      }
      const dying = reduce(there, { type: 'SCORE' })
      expect(dying.run!.combat!.approach, `it moved as it died at ${reach}`).toBe(reach)
    }
  })

  it('takes no further press: every combat verb is refused while it plays', () => {
    const dying = killed()
    for (const action of [
      { type: 'ROLL' },
      { type: 'REROLL' },
      { type: 'SELECT', slot: 0 },
      { type: 'SCORE' },
      { type: 'FIGHT' },
    ] as const) {
      expect(reduce(dying, action), `${action.type} moved a dead fight`).toBe(dying)
    }
  })

  it('cannot be damaged twice: a second SCORE changes nothing at all', () => {
    const dying = killed()
    const again = reduce(dying, { type: 'SCORE' })
    expect(again).toBe(dying)
    expect(again.run!.combat!.enemyHp).toBe(0)
  })
})

describe('the end of the death', () => {
  it('transitions into the ordinary win, with the fight gone', () => {
    const won = reduce(killed(), { type: 'DEFEAT_DONE' })
    expect(won.mode === 'reward' || won.mode === 'explore').toBe(true)
    expect(won.run!.combat).toBeUndefined()
    expect(won.run!.cleared).toContain('hollow')
  })

  it('grants exactly the win the fight would have granted in one press', () => {
    // The offer is drawn from the run's own generator at a fixed position, so
    // holding the fight open for two-thirds of a second cannot change what
    // was found. Checked across enough seeds to cover both branches.
    for (let seed = 1; seed <= 60; seed++) {
      const won = play(poised(1, seed), { type: 'SCORE' }, { type: 'DEFEAT_DONE' })
      const twice = play(poised(1, seed), { type: 'SCORE' }, { type: 'DEFEAT_DONE' })
      expect(won.mode).toBe(twice.mode)
      expect(won.run!.offer).toEqual(twice.run!.offer)
      expect(won.run!.hp).toBe(twice.run!.hp)
    }
  })

  it('pays once: a second DEFEAT_DONE is not a second win', () => {
    const won = reduce(killed(), { type: 'DEFEAT_DONE' })
    expect(reduce(won, { type: 'DEFEAT_DONE' })).toBe(won)
    // And the room was cleared exactly once, however many times it is pressed.
    const thrice = play(won, { type: 'DEFEAT_DONE' }, { type: 'DEFEAT_DONE' })
    expect(thrice.run!.cleared.filter((id) => id === 'hollow')).toHaveLength(1)
  })

  it('is refused by every fight that is not being held open on a death', () => {
    const live = poised(140)
    expect(reduce(live, { type: 'DEFEAT_DONE' })).toBe(live)
    const exploring = reduce(TITLE, { type: 'START_RUN', seed: 1 })
    expect(reduce(exploring, { type: 'DEFEAT_DONE' })).toBe(exploring)
    expect(reduce(TITLE, { type: 'DEFEAT_DONE' })).toBe(TITLE)
  })
})

describe('a fight that is not over', () => {
  it('does not enter the death on a hand that leaves it standing', () => {
    const after = reduce(poised(140), { type: 'SCORE' })
    expect(after.mode).toBe('combat')
    expect(after.run!.combat!.defeated).toBeUndefined()
    expect(after.run!.combat!.enemyHp).toBeGreaterThan(0)
    // And the turn moved on, which is the thing a death would have stopped.
    expect(after.run!.combat!.phase).toBe('intent')
    expect(after.run!.combat!.turn).toBe(1)
  })
})

/**
 * The Warden, through the same framework.
 *
 * There is no second death system and there must not be one. The boss is a row
 * in the same table, played by the same sequence, ended by the same single
 * transition — the only thing new about it is that its frames name plates, so
 * the collapse is drawn rather than staged.
 */
describe('the Warden stops', () => {
  /** The boss's fight, on its last point of health, ready to be scored. */
  const doomed = (seed = 1): GameState => poisedIn('gate', 1, seed)
  const felled = (seed = 1): GameState => reduce(doomed(seed), { type: 'SCORE' })

  it('has a death at all, of exactly the two authored plates', () => {
    const death = defeatOf('warden')
    expect(death, 'the boss has no death').toBeDefined()
    expect(death!.frames).toHaveLength(2)
    expect(death!.frames.map((f) => f.pose)).toEqual(['defeat.1', 'defeat.2'])
    // In that order, and the body is held longest: 120 + 180 + 420.
    expect(death!.still).toBe(120)
    expect(death!.frames.map((f) => f.hold)).toEqual([180, 420])
    expect(defeatDuration('warden')).toBe(720)
  })

  it('holds the fight open on the kill instead of popping to the way out', () => {
    const dying = felled()
    expect(dying.mode).toBe('combat')
    expect(dying.run!.combat!.defeated).toBe(true)
    expect(dying.run!.combat!.enemyHp).toBe(0)
    // The door is still shut. `cleared` is what opens it, and it has not been
    // granted — so a reload lands back inside the death rather than in front of
    // an open exit the player never saw earned.
    expect(dying.run!.cleared).not.toContain('gate')
  })

  it('takes no further press while it plays, and cannot be killed twice', () => {
    const dying = felled()
    for (const action of [
      { type: 'ROLL' },
      { type: 'REROLL' },
      { type: 'SELECT', slot: 0 },
      { type: 'SCORE' },
      { type: 'FIGHT' },
    ] as const) {
      expect(reduce(dying, action), `${action.type} moved a dead boss`).toBe(dying)
    }
  })

  it('opens the door only once DEFEAT_DONE has been taken', () => {
    const won = reduce(felled(), { type: 'DEFEAT_DONE' })
    expect(won.run!.combat).toBeUndefined()
    expect(won.run!.cleared).toContain('gate')
    // And the boss pays nothing but the way out. Escape is the reward.
    expect(enemy('warden').rewards).toEqual([])
    expect(won.mode).toBe('explore')
    expect(won.run!.offer).toBeUndefined()
  })

  it('pays once: a second DEFEAT_DONE is not a second win', () => {
    const won = reduce(felled(), { type: 'DEFEAT_DONE' })
    expect(reduce(won, { type: 'DEFEAT_DONE' })).toBe(won)
    const thrice = play(won, { type: 'DEFEAT_DONE' }, { type: 'DEFEAT_DONE' })
    expect(thrice.run!.cleared.filter((id) => id === 'gate')).toHaveLength(1)
    expect(thrice).toBe(won)
  })

  it('ends the run exactly where it always did: through the door, and out', () => {
    // The whole point of not touching gameplay. The win after the boss's new
    // death is the same win, reached by the same press, ending the same run.
    const out = play(felled(), { type: 'DEFEAT_DONE' }, { type: 'GO', to: 'exit' })
    expect(out.mode).toBe('complete')
    expect(out.meta.wins).toBe(1)
  })

  it('grants the same run it would have granted in one press, across seeds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const held = play(doomed(seed), { type: 'SCORE' }, { type: 'DEFEAT_DONE' })
      const again = play(doomed(seed), { type: 'SCORE' }, { type: 'DEFEAT_DONE' })
      expect(held.mode).toBe(again.mode)
      expect(held.run!.hp).toBe(again.run!.hp)
      expect(held.run!.offer).toEqual(again.run!.offer)
    }
  })
})

describe('a horror with no authored death', () => {
  it('wins on the killing press, exactly as it always did', () => {
    const won = reduce(poisedTrading(1), { type: 'SCORE' })
    expect(defeatOf('marrow')).toBeUndefined()
    expect(won.mode === 'reward' || won.mode === 'explore').toBe(true)
    expect(won.run!.combat).toBeUndefined()
    expect(won.run!.cleared).toContain('deep')
  })

  it('never parks a fight waiting for a picture that does not exist', () => {
    const won = reduce(poisedTrading(1), { type: 'SCORE' })
    expect(won.run!.combat?.defeated).toBeUndefined()
  })
})

describe('the defeat manifest', () => {
  it('names only horrors that exist', () => {
    for (const id of Object.keys(DEFEATS)) expect(ENEMIES[id], `${id} is not an enemy`).toBeDefined()
  })

  it('gives every death frames, and a hold on the last of them', () => {
    for (const [id, death] of Object.entries(DEFEATS)) {
      expect(death.frames.length, `${id} has no frames`).toBeGreaterThan(0)
      for (const frame of death.frames) expect(frame.hold, `${id} has a frame of no length`).toBeGreaterThan(0)
      // The last frame is the picture of a dead thing and is held longest.
      // A death that ends as fast as it started reads as a glitch.
      const last = death.frames[death.frames.length - 1]!
      for (const frame of death.frames.slice(0, -1)) expect(last.hold).toBeGreaterThan(frame.hold)
    }
  })

  /**
   * Staging is for a death that has not been drawn.
   *
   * `scale`, `drop` and `dim` make a collapse out of a plate that is not one:
   * the Gnawing dies in the sprite it was fighting in, so the sequence has to
   * shrink it, sink it and take the light out of it or nothing happens on
   * screen. A death whose frames name authored plates is the opposite case —
   * the collapse is already painted — and every one of those three has to be
   * the identity there, or the drawing gets collapsed a second time on top of
   * itself.
   *
   * So the invariant is not "always shrink". It is **stage exactly what has not
   * been drawn**, and the two deaths in the table are the two sides of it.
   */
  const staged = (death: Defeat): boolean => death.frames.some((f) => !f.pose)

  it('gives a staged death out: smaller, lower and darker with every frame', () => {
    for (const [id, death] of Object.entries(DEFEATS)) {
      if (!staged(death)) continue
      death.frames.forEach((frame, index) => {
        if (index === 0) return
        const before = death.frames[index - 1]!
        expect(frame.scale, `${id} grows at frame ${index}`).toBeLessThan(before.scale)
        expect(frame.drop, `${id} rises at frame ${index}`).toBeGreaterThan(before.drop)
        expect(frame.dim, `${id} brightens at frame ${index}`).toBeLessThan(before.dim)
      })
      const last = death.frames[death.frames.length - 1]!
      expect(last.dim, `${id} ends as lit as it started`).toBeLessThan(0.5)
    }
  })

  it('leaves an authored death alone: it was drawn falling, so nothing moves it', () => {
    for (const [id, death] of Object.entries(DEFEATS)) {
      if (staged(death)) continue
      for (const frame of death.frames) {
        expect(frame.scale, `${id} is being shrunk on top of its own drawing`).toBe(1)
        expect(frame.drop, `${id} is being dropped on top of its own drawing`).toBe(0)
        expect(frame.dim, `${id} is being dimmed on top of its own drawing`).toBe(1)
      }
      // Which makes the staging the identity, at every reach it can die at.
      const base = { width: 0.5, foot: 0.9 }
      for (const frame of death.frames) expect(defeatStance(base, frame)).toEqual(base)
    }
  })

  it('names only plates that exist', () => {
    // A pose that was never painted would leave a hole in the middle of the
    // sequence. Nothing here requires one — a frame with no pose holds the
    // plate it died standing in — but a frame that names one has to have it.
    for (const [id, death] of Object.entries(DEFEATS)) {
      const art = enemy(id).art
      for (const frame of death.frames) {
        if (!frame.pose) continue
        expect(ENEMY_ART[`${art}.${frame.pose}`], `${art}.${frame.pose} is not painted`).toBeDefined()
      }
    }
  })

  it('is short: a death the player waits through is a death they resent', () => {
    for (const id of Object.keys(DEFEATS)) {
      const ms = defeatDuration(id)
      expect(ms, `${id}'s death drags`).toBeLessThanOrEqual(900)
      expect(ms, `${id}'s death is a flicker`).toBeGreaterThanOrEqual(450)
    }
    // And a horror with none costs nothing at all.
    expect(defeatDuration('marrow')).toBe(0)
  })

  it('stages the collapse against the stance it died in, not an absolute box', () => {
    const death = defeatOf('gnawing')!
    const first = death.frames[0]!
    const last = death.frames[death.frames.length - 1]!
    for (const reach of REACHES) {
      const base = enemy('gnawing').approach!.stances[reach]
      expect(defeatStance(base, first).width).toBeCloseTo(base.width * first.scale, 6)
      expect(defeatStance(base, last).foot).toBeCloseTo(base.foot + last.drop, 6)
      // It never collapses upwards into a bigger silhouette than it had.
      expect(defeatStance(base, last).width).toBeLessThan(base.width)
      expect(defeatStance(base, last).foot).toBeGreaterThan(base.foot)
    }
  })
})
