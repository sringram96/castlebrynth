/**
 * Which drawing belongs to which fact.
 *
 * `content/enemyPresentation.ts` is a lookup and nothing else, and that is the
 * claim under test: every answer it gives is a function of numbers the reducer
 * already settled, it holds nothing, and **no answer it gives changes an
 * outcome**. The last one is the important one and gets its own block — the
 * Warden's RAISE has a defensive drawing and is still not armour.
 *
 * The idle *loop* is not tested here. A frame index is not a fact about a run;
 * it lives in `app/app.ts`, and what it looks like on a screen is
 * `test/browser/warden.spec.ts`.
 */

import { describe, expect, it } from 'vitest'

import {
  PRESENTATION,
  healthBand,
  idleFrameMs,
  idlePose,
  intentPose,
  presentationOf,
} from '../../src/content/enemyPresentation.js'
import { ENEMIES, enemy, intentAt } from '../../src/content/enemies.js'
import { ENEMY_ART } from '../../src/render/assets.js'
import { MAX_HP, reduce } from '../../src/game/reducer.js'
import type { Action } from '../../src/game/reducer.js'
import { TITLE } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { standIn } from './where.js'

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, a) => reduce(s, a), state)

/** The Warden's fight, rolled, every die chosen, on whatever health is asked. */
function atTheDoor(enemyHp: number, turn = 0, seed = 1): GameState {
  const started = reduce(TITLE, { type: 'START_RUN', seed })
  const opened = reduce(standIn(started, 'gate'), { type: 'FIGHT' })
  const rolled = reduce(opened, { type: 'ROLL' })
  const combat = rolled.run!.combat!
  return {
    ...rolled,
    run: { ...rolled.run!, combat: { ...combat, enemyHp, turn, selected: [0, 1, 2, 3, 4, 5] } },
  }
}

describe('how hurt a horror looks', () => {
  /** The boss's own numbers, so the bands are read where the player reads them. */
  const MAX = enemy('warden').hp

  it('is 300 health cut in thirds, and the cut is at the line', () => {
    expect(MAX).toBe(300)
    // A band ends *at* its fraction: the moment the bar touches the line it has
    // crossed it. 300–201 full, 200–101 medium, 100–1 low.
    expect(healthBand(300, MAX)).toBe('full')
    expect(healthBand(201, MAX)).toBe('full')
    expect(healthBand(200, MAX)).toBe('medium')
    expect(healthBand(101, MAX)).toBe('medium')
    expect(healthBand(100, MAX)).toBe('low')
    expect(healthBand(1, MAX)).toBe('low')
  })

  it('never leaves a gap or an overlap anywhere on the bar', () => {
    // Every point of health answers exactly one band, and the answer only ever
    // gets worse as the number falls. A ladder with a step missing would show
    // the wrong plate for a whole stretch of the fight and nothing would say so.
    const order = { full: 2, medium: 1, low: 0 }
    let last = order[healthBand(MAX, MAX)]
    for (let hp = MAX; hp >= 0; hp--) {
      const band = healthBand(hp, MAX)
      expect(['full', 'medium', 'low']).toContain(band)
      expect(order[band], `the ladder went back up at ${hp}`).toBeLessThanOrEqual(last)
      last = order[band]
    }
    expect(healthBand(0, MAX)).toBe('low')
  })

  it('is a fraction rather than a number, so it holds at any maximum', () => {
    for (const max of [1, 9, 30, 140, 210, 300, 999]) {
      expect(healthBand(max, max)).toBe('full')
      expect(healthBand(0, max)).toBe('low')
      expect(healthBand(Math.ceil((max * 2) / 3) + 1, max)).toBe('full')
      expect(healthBand(Math.floor(max / 3), max)).toBe('low')
    }
    // And it does not divide by zero on a horror with no health at all.
    expect(healthBand(0, 0)).toBe('full')
  })
})

describe('the plate a horror is standing in', () => {
  it('walks the Warden down its ladder as its health goes', () => {
    expect(idlePose('warden', 300, 300)).toBe('idle.full.1')
    expect(idlePose('warden', 250, 300)).toBe('idle.full.1')
    expect(idlePose('warden', 150, 300)).toBe('idle.mid.1')
    expect(idlePose('warden', 175, 300)).toBe('idle.mid.1')
    expect(idlePose('warden', 75, 300)).toBe('idle.low.1')
    expect(idlePose('warden', 60, 300)).toBe('idle.low.1')
  })

  it('settles on the first plate of the band, whatever the loop was doing', () => {
    // What a reload gets, and what reduced motion gets. There is no frame index
    // in the save to recover, so the settled picture has to be reconstructible
    // from health alone — and it is, because the default is the first plate.
    for (const hp of [300, 235, 200, 175, 101, 100, 75, 1]) {
      expect(idlePose('warden', hp, 300)).toBe(idlePose('warden', hp, 300, 0))
    }
  })

  it('has two plates a band, and cycles them without running off either end', () => {
    const idle = presentationOf('warden')!.idle!
    for (const pair of [idle.full, idle.medium, idle.low]) expect(pair).toHaveLength(2)
    // The counter in `app/app.ts` only ever goes up, and it is never reset to a
    // multiple of anything, so the modulo has to hold for any integer it grows
    // to — and for a negative one, which is cheap insurance against a caller.
    expect(idlePose('warden', 300, 300, 1)).toBe('idle.full.2')
    expect(idlePose('warden', 300, 300, 2)).toBe('idle.full.1')
    expect(idlePose('warden', 300, 300, 41)).toBe('idle.full.2')
    expect(idlePose('warden', 300, 300, -1)).toBe('idle.full.2')
  })

  it('says nothing at all for a horror nobody painted an idle for', () => {
    // The degradation the whole file is built to allow: an enemy with no family
    // is still, and every call site falls back to the plate it always used.
    expect(idlePose('marrow', 100, 210)).toBeUndefined()
    expect(idlePose('gnawing', 100, 140)).toBeUndefined()
    expect(idleFrameMs('marrow')).toBeUndefined()
    expect(presentationOf('nothing-at-all')).toBeUndefined()
  })

  it('names only plates that exist', () => {
    for (const [id, seen] of Object.entries(PRESENTATION)) {
      const art = enemy(id).art
      const named = [
        ...Object.values(seen.idle ?? {}).filter(Array.isArray).flat(),
        ...Object.values(seen.intents ?? {}),
      ]
      expect(named.length, `${id} names no plates`).toBeGreaterThan(0)
      for (const pose of named) {
        expect(ENEMY_ART[`${art}.${pose}`], `${art}.${pose} is not painted`).toBeDefined()
      }
    }
  })

  it('is slow enough to read as breathing rather than as a flicker', () => {
    expect(idleFrameMs('warden')).toBe(700)
    for (const seen of Object.values(PRESENTATION)) {
      if (!seen.idle) continue
      expect(seen.idle.frameMs).toBeGreaterThanOrEqual(400)
    }
  })
})

describe('the plate for what a horror just did', () => {
  it('gives the Warden a drawing for every verb it has', () => {
    expect(intentPose('warden', 'STRIKE')).toBe('attack')
    expect(intentPose('warden', 'RAISE')).toBe('defense')
    expect(intentPose('warden', 'JUDGE')).toBe('attack')
    // Its whole script, so a verb cannot be added to content without a picture
    // of it — a turn with no pose silently plays as the idle plate.
    for (const intent of enemy('warden').script) {
      expect(intentPose('warden', intent.verb), `${intent.verb} has no drawing`).toBeDefined()
    }
  })

  it('is read off the turn that resolved, not the turn that follows it', () => {
    // The trap the whole mapping exists to avoid. On the RAISE turn the *next*
    // intent is JUDGE, and JUDGE's drawing is the attack — so a controller that
    // asked about the next intent would show the Warden lunging on the one turn
    // in the fight where it does nothing.
    expect(intentAt('warden', 2).verb).toBe('RAISE')
    expect(intentAt('warden', 3).verb).toBe('JUDGE')
    expect(intentPose('warden', intentAt('warden', 2).verb)).toBe('defense')
    expect(intentPose('warden', intentAt('warden', 3).verb)).toBe('attack')
  })

  it('says nothing for a verb, or a horror, nobody painted', () => {
    expect(intentPose('warden', 'CRAWL')).toBeUndefined()
    expect(intentPose('marrow', 'RAKE')).toBeUndefined()
    for (const e of Object.values(ENEMIES)) {
      expect(() => intentPose(e.id, 'NOTHING')).not.toThrow()
    }
  })
})

describe('none of it is a rule', () => {
  it('leaves RAISE dealing nothing, and JUDGE dealing twenty', () => {
    // The presentation gives RAISE a defensive drawing. It is a telegraph and
    // not armour: it costs the player no health, and the blow it announces is
    // the full twenty. Both read straight off content.
    const raise = intentAt('warden', 2)
    const judge = intentAt('warden', 3)
    expect(raise.verb).toBe('RAISE')
    expect(raise.damage).toBe(0)
    expect(raise.telegraph).toBe(true)
    expect(judge.verb).toBe('JUDGE')
    expect(judge.damage).toBe(20)
  })

  it('takes no damage off the player when the Warden is drawn defending', () => {
    // The turn played through the real reducer, with health it cannot kill
    // through. RAISE costs nothing; the JUDGE after it costs twenty.
    const raising = { ...atTheDoor(300, 2), run: { ...atTheDoor(300, 2).run!, hp: MAX_HP } }
    const afterRaise = reduce(raising, { type: 'SCORE' })
    expect(afterRaise.run!.combat!.turn).toBe(3)
    expect(intentAt('warden', afterRaise.run!.combat!.turn).verb).toBe('JUDGE')

    const judging = { ...atTheDoor(300, 3), run: { ...atTheDoor(300, 3).run!, hp: MAX_HP } }
    const afterJudge = reduce(judging, { type: 'SCORE' })
    // Twenty more health leaves the player after JUDGE than after RAISE, on the
    // same seed and the same hand. Whatever the faces did, they did it to both.
    expect(afterRaise.run!.hp - afterJudge.run!.hp).toBe(20)
  })

  it('blocks nothing: the Warden takes the same damage on every turn of its cycle', () => {
    // The other half of "defense is a drawing". A pose that reduced incoming
    // damage would show up here as the RAISE turn leaving it with more health.
    const dealt = [0, 1, 2, 3].map((turn) => {
      const after = reduce(atTheDoor(300, turn), { type: 'SCORE' })
      return 300 - after.run!.combat!.enemyHp
    })
    expect(dealt[0]).toBeGreaterThan(0)
    expect(new Set(dealt).size, `the Warden took ${dealt.join('/')} across its cycle`).toBe(1)
  })

  it('changes no reducer result at all, over the whole script', () => {
    // The blunt version, and the one that would catch a presentation that had
    // quietly grown a rule: play the same four turns and compare the states.
    // Nothing in this suite has touched the reducer, so they must be identical.
    for (let turn = 0; turn < enemy('warden').script.length; turn++) {
      const once = play(atTheDoor(300, turn), { type: 'SCORE' })
      const twice = play(atTheDoor(300, turn), { type: 'SCORE' })
      expect(once).toEqual(twice)
      expect(once.run!.combat!.enemyMaxHp).toBe(300)
    }
  })
})
