import { describe, expect, it } from 'vitest'

import {
  CASCADE,
  HORROR_SCRIPTS,
  LADDER,
  THE_GNAWING,
  GNAWING_SCRIPT,
} from '../src/content/index.js'
import type { Beat, Fight, Frame, Goods, Horror, Intent } from '../src/lots/index.js'
import {
  advanceFight,
  cascadeBeats,
  claim,
  decide,
  openFight,
  withTurn,
} from '../src/lots/index.js'
import { turnOf } from './helpers.js'

/**
 * art. 119, section 3 (card 76): **the blow.**
 *
 * *Then, and only then.* The blow is what the whole cascade was for, so it
 * comes last, it is read straight off the events the advance already wrote,
 * and the crown falls as it lands — not before it and not after.
 */

const NO_GOODS: Goods = { talismans: [], riders: [] }

function horrorOf(intent: Intent, health = 200): Horror {
  return { id: 'horror.test', health, intentFor: () => intent }
}

function exchange(
  intent: Intent,
  options: {
    readonly values?: readonly number[]
    readonly line?: Parameters<typeof claim>[2]
    readonly health?: number
    readonly armor?: number
    readonly horrorHealth?: number
  } = {},
): { before: Fight; after: Fight; frames: readonly Frame[] } {
  const health = options.health ?? 60
  const opened = openFight(
    horrorOf(intent, options.horrorHealth ?? 200),
    { dice: [] },
    health,
    options.armor ?? 0,
    NO_GOODS,
  )
  const turn = turnOf(options.values ?? [4, 4, 4], { intent })
  const laid = turn.castings[0]!.map((one) => one.die)
  const before = withTurn(
    { ...opened, turn, hand: turn.hand, yourHealthMax: health },
    options.line === undefined ? turn : claim(turn, laid, options.line, LADDER, NO_GOODS),
  )
  const resolution = decide(before.turn, 'end-turn', before.armor, NO_GOODS)
  const after = advanceFight(before, resolution)
  return { before, after, frames: cascadeBeats(before, after, resolution, NO_GOODS, CASCADE) }
}

const kinds = (frames: readonly Frame[]): readonly string[] =>
  frames.map((frame) => frame.beat.kind)

const beatAt = (frames: readonly Frame[], kind: Beat['kind']): Frame | undefined =>
  frames.find((frame) => frame.beat.kind === kind)

describe('art. 119 §3 — the blow (the blow lands)', () => {
  it('puts the blow last: after the lifts, the line, and the climb', () => {
    const { frames } = exchange({ verb: 'SWIPE', amount: 7 }, { line: 'triple' })
    const order = kinds(frames)
    expect(order.indexOf('strike')).toBeGreaterThan(order.lastIndexOf('climb'))
    expect(order.indexOf('struck')).toBeGreaterThan(order.indexOf('strike'))
  })

  /**
   * The crown is the horror's health bar, and it falls **as** the blow lands
   * rather than at the moment the arithmetic was done. So the frame that
   * moves it is the strike, and every frame before it reads unwounded.
   */
  it('falls the crown on the strike, and not one frame earlier', () => {
    const { before, frames } = exchange({ verb: 'SWIPE', amount: 7 }, { line: 'triple' })
    const strike = frames.findIndex((frame) => frame.beat.kind === 'strike')
    expect(strike).toBeGreaterThan(0)
    for (const frame of frames.slice(0, strike)) {
      expect(frame.shows.horrorHealth).toBe(before.horrorHealth)
    }
    expect(frames[strike]?.shows.horrorHealth).toBeLessThan(before.horrorHealth)
  })

  /**
   * **The only time the room itself moves.** The frame is the player's body,
   * so it offsets when the blow lands on *you* and at no other moment — a
   * strike on the horror never touches it.
   */
  it('marks your body only when the blow is the one that lands on you', () => {
    const { frames } = exchange({ verb: 'SWIPE', amount: 7 }, { line: 'triple' })
    expect(beatAt(frames, 'strike')?.shows.hit).toBe('them')
    expect(beatAt(frames, 'struck')?.shows.hit).toBe('you')
    // And nothing else in the timeline claims a body at all.
    const marked = frames.filter((frame) => frame.shows.hit !== 'none')
    expect(marked.map((frame) => frame.beat.kind).sort()).toEqual(['strike', 'struck'])
  })

  /**
   * art. 57: armour eating the whole blow still happened. Without a beat for
   * it, the one turn a player most needs to see their armour work is the one
   * turn nothing on screen moves.
   */
  it('gives armour its own beat when it eats the whole blow', () => {
    const { frames, after } = exchange({ verb: 'SWIPE', amount: 5 }, { line: 'triple', armor: 9 })
    const struck = beatAt(frames, 'struck')
    expect(struck).toBeDefined()
    expect(struck?.beat).toMatchObject({ kind: 'struck', amount: 0, blocked: 5 })
    expect(frames.at(-1)?.shows.yourHealth).toBe(after.yourHealth)
  })

  /** art. 65 (`hunger`): a turn that claimed nothing feeds it, visibly. */
  it('swells it on the beat a turn that claimed nothing feeds it', () => {
    const { before, frames } = exchange(
      { verb: 'GAPE', amount: 6, effect: { kind: 'hunger', amount: 12 } },
      { horrorHealth: 200 },
    )
    // Nothing was claimed, so nothing lifted and nothing struck it.
    expect(kinds(frames)).not.toContain('lift')
    const fed = beatAt(frames, 'fed')
    expect(fed?.beat).toMatchObject({ kind: 'fed', amount: 12 })
    expect(fed?.shows.hit).toBe('them')
    // Never past what it started with: a horror whose bar lies is worse
    // than a horror that heals (art. 57).
    expect(fed?.shows.horrorHealth).toBe(before.horror.health)
  })

  /** art. 65 (`bind`): the die is dragged out, and the beat says which. */
  it('gives the bind its own beat, naming the die it takes', () => {
    const { frames, before } = exchange(
      { verb: 'DRAG', amount: 6, effect: { kind: 'bind', rule: 'highest' } },
      { values: [2, 6, 3], line: 'any-dice' },
    )
    const bound = beatAt(frames, 'bound')
    expect(bound).toBeDefined()
    expect((bound?.beat as { dice: readonly string[] }).dice).toHaveLength(1)
    expect(before.turn.intent.effect?.kind).toBe('bind')
  })

  /** art. 65 (`bleed`): a tick, and it lands on you like anything else does. */
  it('ticks a bleed on its own beat, after the blow that opened it', () => {
    const { frames } = exchange(
      { verb: 'CHILL', amount: 4, effect: { kind: 'bleed', amount: 4, turns: 3 } },
      { values: [2, 2], line: 'pair' },
    )
    const order = kinds(frames)
    expect(order).toContain('bled')
    expect(order.indexOf('bled')).toBeGreaterThan(order.indexOf('struck'))
    expect(beatAt(frames, 'bled')?.shows.hit).toBe('you')
  })

  /** The crown falls as the blow lands, and the ending is the beat after. */
  it('ends on the beat after the blow that ended it', () => {
    const { frames, after } = exchange({ verb: 'SWIPE', amount: 7 }, {
      line: 'triple',
      horrorHealth: 10,
    })
    expect(after.outcome).toBe('won')
    const order = kinds(frames)
    expect(order.indexOf('ended')).toBe(order.indexOf('strike') + 1)
    expect(beatAt(frames, 'ended')?.beat).toMatchObject({ outcome: 'won' })
    // A killing blow is not also a killing blow taken (the demo's order).
    expect(order).not.toContain('struck')
  })

  it('ends on the fight the engine advanced to, whatever the blow did', () => {
    const cases: readonly [Intent, Parameters<typeof exchange>[1]][] = [
      [{ verb: 'SWIPE', amount: 7 }, { line: 'triple' }],
      [{ verb: 'SWIPE', amount: 99 }, { line: 'triple', health: 12 }],
      [{ verb: 'CORRODE', amount: 9, effect: { kind: 'corrode' } }, { line: 'triple', armor: 9 }],
      [{ verb: 'GAPE', amount: 6, effect: { kind: 'hunger', amount: 12 } }, {}],
    ]
    for (const [intent, options] of cases) {
      const { frames, after } = exchange(intent, options)
      const last = frames.at(-1)
      expect(last?.beat.kind, intent.verb).toBe('settled')
      expect(last?.shows.horrorHealth, intent.verb).toBe(after.horrorHealth)
      expect(last?.shows.yourHealth, intent.verb).toBe(after.yourHealth)
      expect(last?.shows.hit, intent.verb).toBe('none')
      expect(last?.shows.lifted, intent.verb).toEqual([])
    }
  })

  /**
   * art. 119: **which intents telegraph is content, not law.** There is no
   * threshold in the engine and there must not be one — the socket is a
   * field on the intent, and every script says for itself.
   */
  it('lets content declare the tell, and declares one on the depth’s big hits', () => {
    const telling = HORROR_SCRIPTS.flat().filter((intent) => intent.telegraph === true)
    expect(telling.length).toBeGreaterThan(0)
    // BELLOW 16 is the biggest hit in the depth and the thing the death
    // scrawl tells the player to count for. If anything tells, it does.
    expect(GNAWING_SCRIPT.find((intent) => intent.verb === 'BELLOW')?.telegraph).toBe(true)
    // And a tell rides the escalation, so a script's later loops still tell.
    const at = GNAWING_SCRIPT.findIndex((intent) => intent.verb === 'BELLOW')
    expect(THE_GNAWING.intentFor(at + 1 + GNAWING_SCRIPT.length).telegraph).toBe(true)
    // Nothing small tells: a room that feels every turn coming feels none.
    expect(telling.length).toBeLessThan(HORROR_SCRIPTS.flat().length / 2)
  })
})
