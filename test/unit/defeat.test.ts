/**
 * The death of a horror, as a state the fight is in.
 *
 * The claim under test is not "an animation plays" — an animation is not a
 * fact about a run and nothing here can see one. It is that emptying an army
 * whose death has been authored puts the fight into a state with **no move
 * left in it and exactly one way out**, that the way out grants the same win
 * a direct one would, and that nothing can take it twice.
 *
 * The sequence itself lives in `src/app/app.ts` and is asserted in
 * `test/browser/defeat.spec.ts`, where there is a screen to watch it on.
 */

import { describe, expect, it } from 'vitest'

import { reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { TITLE } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { ENEMIES, armySize } from '../../src/content/enemies.js'
import { standIn } from './where.js'
import { DEFEATS, defeatDuration, defeatOf, defeatStance } from '../../src/content/defeat.js'
import { totalBones } from '../../src/content/bones.js'

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/**
 * A fight in a named room, standing one lane from over.
 *
 * The army is cut to one bone and that bone is stood on a 1, then a real
 * round is fought through the reducer. Both are positions the fight reaches on
 * its own — a six-wide line against a single low bone is an ordinary last
 * round — so this only skips the rounds that get there.
 */
function poised(templateId: string, seed = 1): GameState {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const opened = reduce(standIn(started, templateId), { type: 'FIGHT' })
  const combat = opened.run!.combat!
  // The army and the line are two views of the same bones, so they are cut as
  // one: keeping a bone the line does not show would leave a fight that cannot
  // be finished by anything on screen.
  const last = combat.enemyLine[combat.enemyLine.length - 1]!
  return {
    ...opened,
    run: {
      ...opened.run!,
      combat: {
        ...combat,
        enemyBones: combat.enemyBones.filter((b) => b.boneId === last.enemyBoneId),
        enemyLine: [{ ...last, value: 1, faceIndex: 0 }],
      },
    },
  }
}

/** Take the last bone. */
function kill(state: GameState): GameState {
  return play(
    state,
    { type: 'FIELD', width: 6, specialIds: [] },
    { type: 'THROW' },
    { type: 'SMASH' },
  )
}

describe('the content', () => {
  it('gives every shipped enemy a death', () => {
    // The sparse fallback in `defeatOf` stays as a defensive path, but no
    // fight in the slice may reach it.
    for (const id of Object.keys(ENEMIES)) {
      expect(defeatOf(id), `${id} has no death`).toBeDefined()
    }
  })

  it('gives nothing for a horror that does not exist', () => {
    expect(defeatOf('nonesuch')).toBeUndefined()
    expect(defeatDuration('nonesuch')).toBe(0)
  })

  it('measures a death as its freeze plus its frames', () => {
    for (const [id, death] of Object.entries(DEFEATS)) {
      const sum = death.frames.reduce((total, f) => total + f.hold, death.still)
      expect(defeatDuration(id), id).toBe(sum)
    }
  })

  it('is long enough to be watched and short enough to end', () => {
    for (const id of Object.keys(DEFEATS)) {
      expect(defeatDuration(id), id).toBeGreaterThanOrEqual(400)
      expect(defeatDuration(id), id).toBeLessThanOrEqual(1400)
    }
  })

  it('stages a death relative to where it died, never absolutely', () => {
    // A horror killed at the far end of the hall collapses at the far end of
    // the hall. An absolute box would make every death happen in one place.
    const far = defeatStance({ width: 0.3, foot: 0.6 }, DEFEATS.gnawing!.frames[2]!)
    const close = defeatStance({ width: 1.24, foot: 1.02 }, DEFEATS.gnawing!.frames[2]!)
    expect(close.width).toBeGreaterThan(far.width)
    expect(close.foot).toBeGreaterThan(far.foot)
  })

  it('keeps a painted death at the identity, so it is not collapsed twice', () => {
    // The Warden's plates already draw a figure giving way. Shrinking them
    // would collapse it a second time; moving a scene plate would slide the
    // whole picture off the door it is standing in front of.
    for (const frame of DEFEATS.warden!.frames) {
      expect(frame.pose).toBeDefined()
      expect([frame.scale, frame.drop, frame.dim]).toEqual([1, 0, 1])
    }
  })

  it('stages a death that has no plates out of the sprite it died in', () => {
    for (const id of ['gnawing', 'marrow'] as const) {
      const frames = DEFEATS[id]!.frames
      expect(frames.every((f) => f.pose === undefined), id).toBe(true)
      // It has to visibly go somewhere: smaller, lower, and darker.
      const last = frames[frames.length - 1]!
      expect(last.scale, id).toBeLessThan(0.8)
      expect(last.drop, id).toBeGreaterThan(0.1)
      expect(last.dim, id).toBeLessThan(0.35)
    }
  })
})

describe('the last bone', () => {
  it('holds the fight open rather than ending it', () => {
    const after = kill(poised('hollow'))
    expect(after.mode).toBe('combat')
    const combat = after.run!.combat!
    expect(combat.defeated).toBe(true)
    expect(combat.enemyBones).toHaveLength(0)
    // Not cleared, no offer drawn, no screen changed. The state says only that
    // the thing is finished and is being watched finishing.
    expect(after.run!.cleared).not.toContain(after.run!.roomId)
    expect(after.run!.offer).toBeUndefined()
  })

  it('leaves no move in the fight', () => {
    const dying = kill(poised('hollow'))
    for (const action of [
      { type: 'FIELD', width: 2, specialIds: [] },
      { type: 'THROW' },
      { type: 'SMASH' },
      { type: 'ROUND' },
      { type: 'CHARM', boneKey: 'anything' },
    ] as Action[]) {
      expect(reduce(dying, action), action.type).toBe(dying)
    }
  })

  it('has already settled the pile', () => {
    const before = poised('hollow')
    const after = kill(before)
    // Whatever the last round cost is already paid. `DEFEAT_DONE` moves no
    // bones; it only packs the fight away.
    const settled = totalBones(after.run!)
    expect(totalBones(reduce(after, { type: 'DEFEAT_DONE' }).run!)).toBe(settled)
  })
})

describe('DEFEAT_DONE', () => {
  it('is the one way out, and it grants the win', () => {
    const fight = kill(poised('hollow'))
    const done = reduce(fight, { type: 'DEFEAT_DONE' })
    // Keyed by **node**: two hollows in one descent would be two fights.
    expect(done.run!.cleared).toContain(fight.run!.roomId)
    expect(done.run!.combat).toBeUndefined()
    expect(['explore', 'reward']).toContain(done.mode)
  })

  it('cannot pay twice', () => {
    // `combat` is gone from the state it returns, so a second call has no
    // fight left to win — which covers the second timer, the reload that fired
    // one of its own, and the press that arrived after the win landed.
    const once = reduce(kill(poised('hollow')), { type: 'DEFEAT_DONE' })
    expect(reduce(once, { type: 'DEFEAT_DONE' })).toBe(once)
  })

  it('does nothing to a fight that is not being held open', () => {
    const live = poised('hollow')
    expect(reduce(live, { type: 'DEFEAT_DONE' })).toBe(live)
  })

  it('pays the same offer however long the death was watched', () => {
    // Everything it draws on comes from the run's own generator at a fixed
    // position, so a death that is watched and a death that is skipped pay
    // identically.
    const a = reduce(kill(poised('hollow', 12)), { type: 'DEFEAT_DONE' })
    const b = reduce(kill(poised('hollow', 12)), { type: 'DEFEAT_DONE' })
    expect(a.run!.offer).toEqual(b.run!.offer)
    expect(a.mode).toBe(b.mode)
  })
})

describe('the three fights', () => {
  it('every one of them can be finished, and every one is held open', () => {
    for (const [templateId, enemyId] of [
      ['hollow', 'gnawing'],
      ['deep', 'marrow'],
      ['gate', 'warden'],
    ] as const) {
      const after = kill(poised(templateId, 3))
      expect(after.run!.combat?.enemyId, templateId).toBe(enemyId)
      expect(after.run!.combat?.defeated, templateId).toBe(true)
      expect(armySize(enemyId)).toBeGreaterThan(0)
    }
  })
})
