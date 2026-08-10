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
 */

import { describe, expect, it } from 'vitest'
import { maxWidth, newRun, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { SAVE_VERSION, EMPTY_META } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { totalBones } from '../../src/content/bones.js'
import { armySize } from '../../src/content/enemies.js'
import { standIn } from './where.js'

const play = (state: GameState, ...actions: readonly Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

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
    expect(run.charms).toBe(0)
    expect(run.vials).toBe(0)
  })

  it('carries no health of any kind', () => {
    // The law that must not be quietly undone. A bone counter that behaves
    // like a health bar is the old game wearing this one's coat.
    expect(newRun(1)).not.toHaveProperty('hp')
    expect(newRun(1)).not.toHaveProperty('maxHp')
  })
})

describe('FIGHT', () => {
  it('opens at thrown, with the enemy line already up', () => {
    const combat = fighting().run!.combat!
    expect(combat.phase).toBe('thrown')
    expect(combat.round).toBe(1)
    expect(combat.enemyLine.length).toBeGreaterThan(0)
    // The first rule of the fight: the threat is public before the decision.
    expect(combat.field).toBeUndefined()
    expect(combat.playerLine).toBeUndefined()
  })

  it('stands the whole army up', () => {
    const combat = fighting().run!.combat!
    expect(combat.enemyBones).toHaveLength(armySize('gnawing'))
    expect(combat.enemyStartCount).toBe(armySize('gnawing'))
  })

  it('sorts the enemy line high to low', () => {
    const line = fighting().run!.combat!.enemyLine
    for (let i = 1; i < line.length; i++) {
      expect(line[i]!.value).toBeLessThanOrEqual(line[i - 1]!.value)
    }
  })

  it('carries no charm spent', () => {
    expect(fighting().run!.combat!.charmUsed).toBe(false)
  })

  it('is refused twice', () => {
    const open = fighting()
    expect(reduce(open, { type: 'FIGHT' })).toBe(open)
  })
})

describe('FIELD', () => {
  it('commits a legal width', () => {
    const after = reduce(fighting(), { type: 'FIELD', width: 3, specialIds: [] })
    expect(after.run!.combat!.phase).toBe('fielded')
    expect(after.run!.combat!.field).toEqual({ width: 3, specialIds: [] })
  })

  it('rolls nothing', () => {
    const after = reduce(fighting(), { type: 'FIELD', width: 3, specialIds: [] })
    expect(after.run!.combat!.playerLine).toBeUndefined()
  })

  it('refuses a width below one', () => {
    const open = fighting()
    expect(reduce(open, { type: 'FIELD', width: 0, specialIds: [] })).toBe(open)
    expect(reduce(open, { type: 'FIELD', width: -1, specialIds: [] })).toBe(open)
  })

  it('refuses a width above six', () => {
    const open = fighting()
    expect(reduce(open, { type: 'FIELD', width: 7, specialIds: [] })).toBe(open)
  })

  it('refuses a width the pile cannot pay for', () => {
    const thin = fighting()
    const poor: GameState = { ...thin, run: { ...thin.run!, commonBones: 2 } }
    expect(maxWidth(poor.run!)).toBe(2)
    expect(reduce(poor, { type: 'FIELD', width: 3, specialIds: [] })).toBe(poor)
    expect(reduce(poor, { type: 'FIELD', width: 2, specialIds: [] })).not.toBe(poor)
  })

  it('refuses a special that is not alive', () => {
    const open = fighting()
    expect(reduce(open, { type: 'FIELD', width: 2, specialIds: ['knuckle#0'] })).toBe(open)
  })

  it('refuses a duplicated special', () => {
    const open = fighting()
    const armed: GameState = {
      ...open,
      run: { ...open.run!, specials: [{ instanceId: 'knuckle#0', specialId: 'knuckle' }] },
    }
    expect(
      reduce(armed, { type: 'FIELD', width: 2, specialIds: ['knuckle#0', 'knuckle#0'] }),
    ).toBe(armed)
  })

  it('refuses more specials than the field is wide', () => {
    const open = fighting()
    const armed: GameState = {
      ...open,
      run: {
        ...open.run!,
        specials: [
          { instanceId: 'knuckle#0', specialId: 'knuckle' },
          { instanceId: 'knuckle#1', specialId: 'knuckle' },
        ],
      },
    }
    expect(
      reduce(armed, { type: 'FIELD', width: 1, specialIds: ['knuckle#0', 'knuckle#1'] }),
    ).toBe(armed)
  })

  it('records specials in a stable order however they were tapped', () => {
    const open = fighting()
    const armed: GameState = {
      ...open,
      run: {
        ...open.run!,
        specials: [
          { instanceId: 'cinderbone#0', specialId: 'cinderbone' },
          { instanceId: 'knuckle#1', specialId: 'knuckle' },
        ],
      },
    }
    const a = reduce(armed, { type: 'FIELD', width: 2, specialIds: ['knuckle#1', 'cinderbone#0'] })
    const b = reduce(armed, { type: 'FIELD', width: 2, specialIds: ['cinderbone#0', 'knuckle#1'] })
    expect(a.run!.combat!.field).toEqual(b.run!.combat!.field)
  })

  it('is refused outside thrown', () => {
    const fielded = reduce(fighting(), { type: 'FIELD', width: 3, specialIds: [] })
    expect(reduce(fielded, { type: 'FIELD', width: 2, specialIds: [] })).toBe(fielded)
  })
})

describe('THROW', () => {
  it('throws exactly the committed width', () => {
    const after = play(fighting(), { type: 'FIELD', width: 4, specialIds: [] }, { type: 'THROW' })
    expect(after.run!.combat!.phase).toBe('rolled')
    expect(after.run!.combat!.playerLine).toHaveLength(4)
  })

  it('sorts the line high to low', () => {
    const line = play(fighting(), { type: 'FIELD', width: 6, specialIds: [] }, { type: 'THROW' })
      .run!.combat!.playerLine!
    for (let i = 1; i < line.length; i++) {
      expect(line[i]!.value).toBeLessThanOrEqual(line[i - 1]!.value)
    }
  })

  it('is refused before FIELD', () => {
    const open = fighting()
    expect(reduce(open, { type: 'THROW' })).toBe(open)
  })

  it('cannot be thrown twice', () => {
    // The one throw. There is no HOLD and no general reroll; the Charm is the
    // only rethrow in the game and it takes an item.
    const rolled = play(fighting(), { type: 'FIELD', width: 4, specialIds: [] }, { type: 'THROW' })
    expect(reduce(rolled, { type: 'THROW' })).toBe(rolled)
  })

  it('is the same throw after a reload at fielded', () => {
    const fielded = reduce(fighting(7), { type: 'FIELD', width: 5, specialIds: [] })
    const once = reduce(fielded, { type: 'THROW' }).run!.combat!.playerLine
    const twice = reduce(fielded, { type: 'THROW' }).run!.combat!.playerLine
    expect(once).toEqual(twice)
  })
})

describe('CHARM', () => {
  const withCharm = (): GameState => {
    const rolled = play(fighting(3), { type: 'FIELD', width: 4, specialIds: [] }, { type: 'THROW' })
    return { ...rolled, run: { ...rolled.run!, charms: 2 } }
  }

  it('spends one charge and rethrows one bone', () => {
    const armed = withCharm()
    const key = armed.run!.combat!.playerLine![0]!.boneKey
    const after = reduce(armed, { type: 'CHARM', boneKey: key })
    expect(after.run!.charms).toBe(1)
    expect(after.run!.combat!.charmUsed).toBe(true)
    expect(after.run!.combat!.phase).toBe('rolled')
  })

  it('leaves every other bone byte-identical', () => {
    const armed = withCharm()
    const line = armed.run!.combat!.playerLine!
    const key = line[line.length - 1]!.boneKey
    const after = reduce(armed, { type: 'CHARM', boneKey: key })
    const others = after.run!.combat!.playerLine!.filter((b) => b.boneKey !== key)
    expect(others).toEqual(line.filter((b) => b.boneKey !== key))
  })

  it('stands the line up again', () => {
    const armed = withCharm()
    const key = armed.run!.combat!.playerLine![3]!.boneKey
    const line = reduce(armed, { type: 'CHARM', boneKey: key }).run!.combat!.playerLine!
    for (let i = 1; i < line.length; i++) {
      expect(line[i]!.value).toBeLessThanOrEqual(line[i - 1]!.value)
    }
  })

  it('is once a fight, however many are carried', () => {
    const armed = withCharm()
    expect(armed.run!.charms).toBe(2)
    const once = reduce(armed, { type: 'CHARM', boneKey: armed.run!.combat!.playerLine![0]!.boneKey })
    const twice = reduce(once, {
      type: 'CHARM',
      boneKey: once.run!.combat!.playerLine![1]!.boneKey,
    })
    expect(twice).toBe(once)
    expect(once.run!.charms).toBe(1)
  })

  it('survives the round: still spent after ROUND', () => {
    const armed = withCharm()
    const used = reduce(armed, { type: 'CHARM', boneKey: armed.run!.combat!.playerLine![0]!.boneKey })
    const next = play(used, { type: 'SMASH' }, { type: 'ROUND' })
    if (next.run?.combat) expect(next.run.combat.charmUsed).toBe(true)
  })

  it('is refused with no charge', () => {
    const rolled = play(fighting(3), { type: 'FIELD', width: 4, specialIds: [] }, { type: 'THROW' })
    expect(rolled.run!.charms).toBe(0)
    expect(
      reduce(rolled, { type: 'CHARM', boneKey: rolled.run!.combat!.playerLine![0]!.boneKey }),
    ).toBe(rolled)
  })

  it('is refused outside rolled', () => {
    const fielded = reduce(fighting(3), { type: 'FIELD', width: 4, specialIds: [] })
    const armed: GameState = { ...fielded, run: { ...fielded.run!, charms: 1 } }
    expect(reduce(armed, { type: 'CHARM', boneKey: 'anything' })).toBe(armed)
  })

  it('is refused for a bone that is not in the line', () => {
    const armed = withCharm()
    expect(reduce(armed, { type: 'CHARM', boneKey: 'not-here' })).toBe(armed)
  })
})

describe('SMASH', () => {
  const rolled = (seed = 5): GameState =>
    play(fighting(seed), { type: 'FIELD', width: 6, specialIds: [] }, { type: 'THROW' })

  it('records what happened', () => {
    const after = reduce(rolled(), { type: 'SMASH' })
    const combat = after.run?.combat
    if (!combat) return
    expect(combat.lastSmash).toBeDefined()
    expect(combat.lastSmash!.lanes.length).toBeGreaterThan(0)
  })

  it('leaves the phase at smashed when both sides live', () => {
    const after = reduce(rolled(2), { type: 'SMASH' })
    if (after.mode === 'combat' && after.run?.combat && !after.run.combat.defeated) {
      expect(after.run.combat.phase).toBe('smashed')
    }
  })

  it('is refused outside rolled', () => {
    const open = fighting()
    expect(reduce(open, { type: 'SMASH' })).toBe(open)
    const fielded = reduce(open, { type: 'FIELD', width: 2, specialIds: [] })
    expect(reduce(fielded, { type: 'SMASH' })).toBe(fielded)
  })

  it('cannot be smashed twice', () => {
    const smashed = reduce(rolled(2), { type: 'SMASH' })
    if (smashed.mode === 'combat' && smashed.run?.combat?.phase === 'smashed') {
      expect(reduce(smashed, { type: 'SMASH' })).toBe(smashed)
    }
  })

  it('never leaves the pile below zero', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let state = rolled(seed)
      const thin: GameState = { ...state, run: { ...state.run!, commonBones: 3 } }
      state = reduce(thin, { type: 'SMASH' })
      expect(totalBones(state.run!)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('ROUND', () => {
  const smashed = (seed: number): GameState =>
    play(
      fighting(seed),
      { type: 'FIELD', width: 1, specialIds: [] },
      { type: 'THROW' },
      { type: 'SMASH' },
    )

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

  it('is refused outside a settled smash', () => {
    const open = fighting()
    expect(reduce(open, { type: 'ROUND' })).toBe(open)
    const fielded = reduce(open, { type: 'FIELD', width: 2, specialIds: [] })
    expect(reduce(fielded, { type: 'ROUND' })).toBe(fielded)
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
    let state = play(
      doomed,
      { type: 'FIELD', width: 6, specialIds: [] },
      { type: 'THROW' },
      { type: 'SMASH' },
    )
    // Either it died (and there is a defeat being held open, or the room is
    // cleared) or it survived. In no case may a ROUND be accepted against an
    // empty army.
    if (state.run?.combat && state.run.combat.enemyBones.length === 0) {
      expect(reduce(state, { type: 'ROUND' })).toBe(state)
    }
  })
})

describe('the old verbs are gone', () => {
  it('does not answer ROLL, SELECT, REROLL or SCORE', () => {
    // Not wrapped, not aliased, not translated: absent. The reducer's switch
    // has no case for them, so a stale dispatch changes nothing.
    const open = fighting()
    for (const type of ['ROLL', 'SELECT', 'REROLL', 'SCORE']) {
      expect(reduce(open, { type } as unknown as Action)).toBe(open)
    }
  })
})
