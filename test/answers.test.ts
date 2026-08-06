/**
 * card 69 — **the band's third state, and every act's answer.**
 *
 * art. 29 gives the word band two jobs: what you are looking at, and what is
 * coming. It never had a third for *what just happened*, so an act's result
 * and a tap's result shared one slot and an act with no authored line fell
 * through to the candle underneath — the candle describing the thing that
 * had just been picked up. In the playtest of 2026-08-06:
 *
 * > PRESS **Take bone** → *"Someone lies against the wall with a hand out.
 * > There is a bone in it."*
 *
 * Two guarantees, and neither is a matter of discipline: the priority is a
 * function, and the answers are enumerated off the catalog.
 */

import { describe, expect, it } from 'vitest'

import {
  CANDLE_WORDS,
  ENCOUNTERS,
  NOTICES,
  ROOMS,
  ROOM_BOOK,
  encounterWords,
  LADDER,
  lintVoice,
  saysAct,
  saysWithheld,
} from '../src/content/index.js'
import type { Act } from '../src/descent/index.js'
import { act, chooseDoor, enterRoom } from '../src/descent/index.js'
import { HUSHED, answered, bandLine, holding, noticed } from '../src/shell/band.js'
import type { WorldMark } from '../src/room/index.js'
import { hereIn } from '../src/gen/index.js'
import { DEALER, lookAround, opened, takeable } from './drift.js'

const NOWHERE: WorldMark = { X: 0, Y: 0, z: 1, width: 1, height: 1 }

/** Every act the catalog can ever put on the strip, authored or socketed. */
function everyAct(): readonly Act[] {
  const seen = new Map<string, Act>()
  for (const room of ROOMS) for (const one of room.acts) seen.set(one.id, one)
  for (const who of ENCOUNTERS) {
    for (const one of encounterWords(who.id, NOWHERE).acts) seen.set(one.id, one)
  }
  return [...seen.values()]
}

describe('card 69 — every act answers', () => {
  it('authors a line for every act id in the catalog', () => {
    const acts = everyAct()
    expect(acts.length, 'the catalog offers something').toBeGreaterThan(1)
    for (const one of acts) {
      expect(
        saysAct(one.id),
        `${one.id} has no answer — pressing it would fall through to the candle underneath`,
      ).not.toBe('')
    }
  })

  it('gives each act a line of its own rather than one shared line', () => {
    // art. 40's two mercies are the case that matters: a breath and a full
    // mercy may not say the same thing, or the tiers stop being distinct.
    const said = everyAct().map((one) => saysAct(one.id))
    expect(new Set(said).size, 'two acts share one answer').toBe(said.length)
  })

  it('writes them in the amended register and inside one candle', () => {
    // rules/voice.md: these are his thought. Nothing new may be written in
    // the repealed voice, whatever the rest of the map is still carrying.
    for (const one of everyAct()) {
      const line = saysAct(one.id)
      expect(lintVoice(line, 'thought'), `${one.id}: ${line}`).toEqual([])
      expect(line.trim().split(/\s+/).length).toBeLessThanOrEqual(CANDLE_WORDS)
    }
  })

  it('never answers a take with the line that says the thing is still there', () => {
    // The defect itself, reproduced across a sweep of seeds: for every take
    // any dealt room offers, the answer must not be one of that room's own
    // candles — which is exactly what the fall-through used to hand back.
    let took = 0
    for (let seed = 1; seed <= 30; seed++) {
      let { ledgers, chain } = opened(seed)
      for (let n = 0; n < chain.length + 2; n++) {
        const node = hereIn(chain)
        if (node === null) break
        ledgers = lookAround(ledgers, node)
        const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
        for (const one of takeable(ledgers, node)) {
          const answer = saysAct(one.id)
          expect(answer, `${one.id} answers with nothing`).not.toBe('')
          expect(
            bands.beats,
            `${one.id} answers with a candle of ${node.instance} — the fall-through is back`,
          ).not.toContain(answer)
          ledgers = act(ledgers, one)
          took += 1
        }
        const door = node.doors[0]
        if (door === undefined || door.ends === true) break
        const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
        ledgers = walked.ledgers
        chain = walked.chain
      }
    }
    expect(took, 'the sweep took something').toBeGreaterThan(0)
  })
})

describe('card 69 — the band resolves by priority', () => {
  const AMBIENT = 'the candle underneath'

  it('puts an act result over a look, and a look over the ambient', () => {
    expect(bandLine(HUSHED, AMBIENT)).toBe(AMBIENT)
    expect(bandLine(noticed('a basin, dry'), AMBIENT)).toBe('a basin, dry')
    expect(bandLine(answered('the key is in my hand'), AMBIENT)).toBe('the key is in my hand')
  })

  it('lets an act displace the look it was pressed over', () => {
    // The order that matters: you tap a thing, then press the verb it
    // summoned (art. 68). The answer is what you are meant to read.
    const looking = noticed('an iron key, cut with three teeth')
    const after = answered('heavier than it looks')
    expect(bandLine(after, AMBIENT)).toBe('heavier than it looks')
    expect(after.look).toBeNull()
    void looking
  })

  it('lets a look displace a stale answer, so no reply outlives its press', () => {
    const after = noticed('a chain, out of reach')
    expect(after.answer).toBeNull()
    expect(bandLine(after, AMBIENT)).toBe('a chain, out of reach')
  })

  it('falls to the ambient rather than to silence when nothing is held', () => {
    // art. 69: silence is a bug, and the bottom of a priority order is
    // exactly where one would hide.
    expect(holding(HUSHED)).toBe(false)
    expect(bandLine(answered(''), AMBIENT)).toBe(AMBIENT)
    expect(bandLine(answered(null), AMBIENT)).toBe(AMBIENT)
    expect(bandLine(noticed(''), AMBIENT)).toBe(AMBIENT)
  })

  it('knows when something is standing over the ambient', () => {
    expect(holding(answered('x'))).toBe(true)
    expect(holding(noticed('x'))).toBe(true)
    expect(holding(HUSHED)).toBe(false)
  })
})

describe('card 69 — the answers the retired lines used to carry', () => {
  it('keeps art. 40 two-tiered now that each mercy has its own answer', () => {
    expect(saysAct('act.drink')).not.toBe(saysAct('act.kneel'))
    // The pair the dead-press ruling retired: a whole body is not offered
    // the verb, so there is nothing left for `mercy.whole` to answer.
    expect(NOTICES['mercy.whole']).toBeUndefined()
    expect(NOTICES['mercy.breath']).toBeUndefined()
  })
})

/**
 * arts 63, 65, 72, 118 — **the tray names the line, not the floor.**
 *
 * The sentence this replaces was *any dice 19 · the best these make*, said
 * over a full house on a SEAL turn. It was the whole of what a playtest read
 * as the scoring being broken: the dice plainly made a full house and the
 * game was quietly worth one point a pip for them, with nothing on the frame
 * saying why. `withheld` finds the reason (`lots/card.ts`); this is the
 * sentence it comes out as.
 */
describe('arts 63, 65 — what the tray says about a line it is not offering', () => {
  it('names the line and what is holding it shut', () => {
    expect(saysWithheld('full-house', 'sealed')).toContain(LADDER['full-house'].name)
    expect(saysWithheld('full-house', 'sealed')).toContain(NOTICES['claim.sealed']!)
    expect(saysWithheld('pair', 'spent')).toContain(LADDER.pair.name)
    expect(saysWithheld('pair', 'spent')).toContain(NOTICES['claim.spent']!)
  })

  it('tells the two reasons apart, and neither is the floor’s line', () => {
    expect(saysWithheld('full-house', 'sealed')).not.toBe(saysWithheld('full-house', 'spent'))
    for (const why of ['sealed', 'spent'] as const) {
      expect(saysWithheld('full-house', why)).not.toContain(NOTICES['claim.floor']!)
    }
  })

  it('says nothing the controls would have to carry (art. 66)', () => {
    // It is a readout beside the offer, never a verb — so it is free to be
    // longer than two words, and it must never read as one.
    for (const why of ['sealed', 'spent'] as const) {
      expect(saysWithheld('three-pairs', why)).not.toMatch(/^[A-Z]/)
    }
  })
})
