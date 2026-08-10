/**
 * The round, through the real reducer.
 *
 * Every test here plays actions. Nothing assembles a `CombatState` by hand,
 * because the thing being tested is the state machine — which presses are
 * accepted, in which order, and what each of them is allowed to touch.
 *
 * The reducer is **total**: an action that does not apply returns the same
 * object. That is asserted by identity (`toBe`) rather than by equality,
 * because a new object with the same contents would still be a repaint the
 * player did not ask for.
 *
 * ## Two phases, one press
 *
 * A round is `thrown → smashed`. There is no committed field to assert and no
 * half-thrown state to catch a policy in: THROW fields, rolls, sorts and
 * resolves in a single tick, so most of what used to be a state-machine test
 * is now a test of what one action produces.
 */

import { describe, expect, it } from 'vitest'
import { fieldFor, maxWidth, newRun, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { SAVE_VERSION, EMPTY_META } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { newSpecial, totalBones } from '../../src/content/bones.js'
import { armySize } from '../../src/content/enemies.js'
import { standIn } from './where.js'

/**
 * A run standing in front of the Gnawing, with a chosen seed.
 *
 * Stood rather than walked: the route is generated, so the room this wants is
 * named by its authored template and resolved to whichever node of this run's
 * map used it. `standIn` is the one place a test joins the two.
 */
function atGnawing(seed = 5): GameState {
  const base: GameState = { version: SAVE_VERSION, mode: 'title', meta: EMPTY_META }
  return standIn(reduce(base, { type: 'START_RUN', seed }), 'hollow')
}

function fighting(seed = 5): GameState {
  return reduce(atGnawing(seed), { type: 'FIGHT' })
}

describe('a fresh run', () => {
  it('starts at thirty common bones and nothing else', () => {
    const run = newRun(1)
    expect(run.commonBones).toBe(30)
    expect(run.specials).toEqual([])
    expect(totalBones(run)).toBe(30)
    expect(run.vials).toBe(0)
  })

  it('carries no health of any kind', () => {
    // The law that must not be quietly undone. A bone counter that behaves
    // like a health bar is the old game wearing this one's coat.
    expect(newRun(1)).not.toHaveProperty('hp')
    expect(newRun(1)).not.toHaveProperty('maxHp')
  })

  it('carries no Charm, under any name', () => {
    // Cut with the phase it was spent in. A reroll needs a moment between
    // seeing your throw and living with it, and the round no longer has one.
    expect(newRun(1)).not.toHaveProperty('charms')
    expect(newRun(1)).not.toHaveProperty('charmUsed')
  })
})

describe('FIGHT', () => {
  it('opens at thrown, with the enemy line already up', () => {
    const combat = fighting().run?.combat
    expect(combat?.phase).toBe('thrown')
    expect(combat!.enemyLine.length).toBeGreaterThan(0)
    // It threw. You have not — which is the whole of what `thrown` names.
    expect(combat?.playerLine).toBeUndefined()
    expect(combat?.field).toBeUndefined()
  })

  it('stands the whole army up', () => {
    const combat = fighting().run?.combat
    expect(combat!.enemyBones).toHaveLength(armySize('gnawing'))
    expect(combat!.enemyStartCount).toBe(armySize('gnawing'))
  })

  it('sorts the enemy line high to low', () => {
    const line = fighting().run!.combat!.enemyLine
    for (let i = 1; i < line.length; i++) {
      expect(line[i]!.value).toBeLessThanOrEqual(line[i - 1]!.value)
    }
  })

  it('is refused twice', () => {
    const open = fighting()
    expect(reduce(open, { type: 'FIGHT' })).toBe(open)
  })
})

describe('the line the pile puts up', () => {
  // `fieldFor` is the composition rule, and it is exported because the tray
  // draws the line before it is thrown. The reducer and the view must agree
  // about what is going in, so they call the same function.

  it('is as wide as the pile allows, capped at six', () => {
    const run = newRun(1)
    expect(fieldFor(run).width).toBe(6)
    expect(fieldFor({ ...run, commonBones: 4 }).width).toBe(4)
    expect(fieldFor({ ...run, commonBones: 0 }).width).toBe(0)
  })

  it('is never a choice: no width is asked for and none is honoured', () => {
    const run = newRun(1)
    // There is no argument to pass. The only input is which named bones stand.
    expect(fieldFor(run).width).toBe(fieldFor(run, []).width)
    expect(maxWidth(run)).toBe(6)
  })

  it('stands named bones inside the width, never on top of it', () => {
    const run = { ...newRun(1), specials: [newSpecial('knuckle', 0)], commonBones: 29 }
    const field = fieldFor(run, ['knuckle#0'])
    expect(field.width).toBe(6)
    expect(field.specialIds).toEqual(['knuckle#0'])
  })

  it('refuses a named bone that is not alive', () => {
    const run = newRun(1)
    expect(fieldFor(run, ['ghost#9']).specialIds).toEqual([])
  })

  it('drops a duplicate rather than throwing the same bone twice', () => {
    const run = { ...newRun(1), specials: [newSpecial('knuckle', 0)], commonBones: 29 }
    expect(fieldFor(run, ['knuckle#0', 'knuckle#0']).specialIds).toEqual(['knuckle#0'])
  })

  it('sorts the named bones, so two thumbs reach the same throw', () => {
    const run = {
      ...newRun(1),
      specials: [newSpecial('knuckle', 0), newSpecial('cinderbone', 1)],
      commonBones: 28,
    }
    const forward = fieldFor(run, ['knuckle#0', 'cinderbone#1']).specialIds
    const backward = fieldFor(run, ['cinderbone#1', 'knuckle#0']).specialIds
    expect(forward).toEqual(backward)
  })

  it('narrows when a held-back bone has no common to replace it', () => {
    // Three bones in all: two commons and a Knuckle. Holding the Knuckle back
    // is a line of two, not a line of three with a bone invented to fill it.
    const run = { ...newRun(1), specials: [newSpecial('knuckle', 0)], commonBones: 2 }
    expect(fieldFor(run, ['knuckle#0']).width).toBe(3)
    expect(fieldFor(run, []).width).toBe(2)
  })
})

describe('THROW', () => {
  it('is the whole round: it throws and it resolves, in one tick', () => {
    const after = reduce(fighting(), { type: 'THROW' })
    const combat = after.run?.combat
    expect(combat?.phase).toBe('smashed')
    expect(combat?.playerLine?.length).toBeGreaterThan(0)
    expect(combat?.lastSmash).toBeDefined()
    expect(combat!.lastSmash!.lanes.length).toBeGreaterThan(0)
  })

  it('records what went in alongside what it rolled', () => {
    const combat = reduce(fighting(), { type: 'THROW' }).run?.combat
    expect(combat?.field?.width).toBe(combat?.playerLine?.length)
  })

  it('throws as wide as the pile allows without being asked', () => {
    const open = fighting()
    const after = reduce(open, { type: 'THROW' })
    expect(after.run!.combat!.playerLine!.length).toBe(maxWidth(open.run!))
  })

  it('sorts the line high to low', () => {
    const line = reduce(fighting(), { type: 'THROW' }).run!.combat!.playerLine ?? []
    for (let i = 1; i < line.length; i++) {
      expect(line[i]!.value).toBeLessThanOrEqual(line[i - 1]!.value)
    }
  })

  it('stands the named bones it was asked for', () => {
    const open = fighting()
    const armed: GameState = {
      ...open,
      run: { ...open.run!, specials: [newSpecial('knuckle', 0)], commonBones: 20 },
    }
    const after = reduce(armed, { type: 'THROW', specialIds: ['knuckle#0'] })
    expect(after.run!.combat!.field!.specialIds).toEqual(['knuckle#0'])
    expect(
      after.run!.combat!.playerLine!.some((b) => b.specialInstanceId === 'knuckle#0'),
    ).toBe(true)
  })

  it('holds back a named bone it was not asked for', () => {
    const open = fighting()
    const armed: GameState = {
      ...open,
      run: { ...open.run!, specials: [newSpecial('knuckle', 0)], commonBones: 20 },
    }
    const after = reduce(armed, { type: 'THROW', specialIds: [] })
    expect(after.run!.combat!.field!.specialIds).toEqual([])
    expect(after.run!.combat!.playerLine!.every((b) => b.specialInstanceId === undefined)).toBe(
      true,
    )
    // Held back is *safe*: it cannot break in a lane it never stood in.
    expect(after.run!.specials.map((s) => s.instanceId)).toEqual(['knuckle#0'])
  })

  it('cannot be thrown twice in a round', () => {
    const smashed = reduce(fighting(2), { type: 'THROW' })
    if (smashed.mode === 'combat' && smashed.run?.combat?.phase === 'smashed') {
      expect(reduce(smashed, { type: 'THROW' })).toBe(smashed)
    }
  })

  it('is refused with nothing to throw', () => {
    const open = fighting()
    const empty: GameState = {
      ...open,
      run: { ...open.run!, commonBones: 0, specials: [] },
    }
    expect(reduce(empty, { type: 'THROW' })).toBe(empty)
  })

  it('never leaves the pile below zero', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const open = fighting(seed)
      const thin: GameState = { ...open, run: { ...open.run!, commonBones: 3 } }
      const state = reduce(thin, { type: 'THROW' })
      expect(totalBones(state.run!)).toBeGreaterThanOrEqual(0)
    }
  })

  it('is the same throw after a reload before it', () => {
    const open = fighting(31)
    const reloaded: GameState = JSON.parse(JSON.stringify(open))
    expect(reduce(reloaded, { type: 'THROW' }).run!.combat!.playerLine).toEqual(
      reduce(open, { type: 'THROW' }).run!.combat!.playerLine,
    )
  })
})

describe('ROUND', () => {
  const smashed = (seed: number): GameState => reduce(fighting(seed), { type: 'THROW' })

  it('increments the round exactly once and throws again', () => {
    const after = smashed(4)
    if (after.run?.combat?.phase !== 'smashed') return
    const next = reduce(after, { type: 'ROUND' })
    expect(next.run!.combat!.round).toBe(2)
    expect(next.run!.combat!.phase).toBe('thrown')
    expect(next.run!.combat!.enemyLine.length).toBeGreaterThan(0)
  })

  it('clears the field and the last throw', () => {
    const after = smashed(4)
    if (after.run?.combat?.phase !== 'smashed') return
    const next = reduce(after, { type: 'ROUND' })
    expect(next.run!.combat!.field).toBeUndefined()
    expect(next.run!.combat!.playerLine).toBeUndefined()
    expect(next.run!.combat!.lastSmash).toBeUndefined()
  })

  it('fields the survivors, never the dead', () => {
    const after = smashed(4)
    if (after.run?.combat?.phase !== 'smashed') return
    const alive = new Set(after.run.combat.enemyBones.map((b) => b.boneId))
    const next = reduce(after, { type: 'ROUND' })
    for (const bone of next.run!.combat!.enemyLine) {
      expect(alive.has(bone.enemyBoneId!)).toBe(true)
    }
  })

  it('is refused before the throw', () => {
    const open = fighting()
    expect(reduce(open, { type: 'ROUND' })).toBe(open)
  })

  it('never comes after a dead army', () => {
    const open = fighting(9)
    const doomed: GameState = {
      ...open,
      run: {
        ...open.run!,
        combat: { ...open.run!.combat!, enemyBones: open.run!.combat!.enemyBones.slice(0, 1) },
      },
    }
    const state = reduce(doomed, { type: 'THROW' })
    // Either it died (and there is a defeat being held open, or the room is
    // cleared) or it survived. In no case may a ROUND be accepted against an
    // empty army.
    if (state.run?.combat && state.run.combat.enemyBones.length === 0) {
      expect(reduce(state, { type: 'ROUND' })).toBe(state)
    }
  })
})

describe('the old verbs are gone', () => {
  it('does not answer ROLL, SELECT, REROLL, SCORE, FIELD, SMASH or CHARM', () => {
    // Not wrapped, not aliased, not translated: absent. The reducer's switch
    // has no case for them, so a stale dispatch changes nothing. FIELD, SMASH
    // and CHARM join the list — three presses that became one.
    const open = fighting()
    for (const type of ['ROLL', 'SELECT', 'REROLL', 'SCORE', 'FIELD', 'SMASH', 'CHARM']) {
      expect(reduce(open, { type } as unknown as Action)).toBe(open)
    }
  })
})
