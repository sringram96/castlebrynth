import { describe, expect, it } from 'vitest'

import {
  CASCADE,
  LABELS,
  LADDER,
  READOUT,
  ROLLING_CAP,
  ROLLING_GOODS,
  THE_SLIVER,
  THE_TIN_SAINT,
  faceSays,
  saysAmend,
  saysGood,
} from '../src/content/index.js'
import type { Amend, Beat, Fight, Frame, Goods, Horror, Lot, Trinket } from '../src/lots/index.js'
import {
  advanceFight,
  atOnce,
  cascadeBeats,
  claim,
  decide,
  openFight,
  withTurn,
} from '../src/lots/index.js'
import { SWIPE, turnOf } from './helpers.js'

/**
 * **Card 93, section 4 — reading them, and the beat.**
 *
 * Two claims, and both are art. 119 said about a new species rather than a new
 * article. **Inspect declares every face and its number**, from birth, so the
 * rider defect — a power that fired without ever having said it could — is not
 * repeated on something brand new. And **the cascade gains a beat**: the line
 * names itself and its total climbs, then each rolling good that fired says so
 * and moves the number, one at a time.
 *
 * Reduced motion collapses the whole thing to the settled total like every
 * other beat, and the last frame agreeing with the engine is the assertion the
 * article actually rests on (art. 119 — the settled state is the whole truth or
 * the beat is wrong).
 */

const NOTHING: Goods = { talismans: [], riders: [] }

const trinket = (id: string, rolls: readonly Amend[]): Trinket => ({
  id: id as Trinket['id'],
  rolls,
})

/** A lot facing every trinket at one chosen face, so a turn is stated. */
function facing(at: number, of = 6): Lot {
  return { next: () => at / of }
}

function horrorOf(health = 400): Horror {
  return { id: 'horror.test', health, intentFor: () => SWIPE }
}

/** One resolved turn, with `trinkets` carried and every roll facing `face`. */
function played(
  values: readonly number[],
  line: Parameters<typeof claim>[2],
  trinkets: readonly Trinket[],
  face: number,
  options: { readonly health?: number; readonly armor?: number } = {},
): { before: Fight; after: Fight; frames: readonly Frame[] } {
  const goods: Goods = { ...NOTHING, trinkets, trinketCap: ROLLING_CAP }
  const health = options.health ?? 200
  const opened = openFight(horrorOf(), { dice: [] }, health, options.armor ?? 0, goods, health)
  const turn = turnOf(values)
  const laid = turn.castings[0]!.map((one) => one.die)
  const before = withTurn(
    { ...opened, turn, hand: turn.hand, yourHealthMax: health },
    claim(turn, laid, line, LADDER, goods),
  )
  const resolution = decide(before.turn, 'end-turn', before.armor, goods, facing(face, 6))
  const after = advanceFight(before, resolution)
  return { before, after, frames: cascadeBeats(before, after, resolution, goods, CASCADE) }
}

const kinds = (frames: readonly Frame[]): readonly string[] =>
  frames.map((frame) => frame.beat.kind)

const only = <K extends Beat['kind']>(
  frames: readonly Frame[],
  kind: K,
): readonly Extract<Beat, { kind: K }>[] =>
  frames.flatMap((frame) =>
    frame.beat.kind === kind ? [frame.beat as Extract<Beat, { kind: K }>] : [],
  )

describe('card 93 §4 — inspect declares every face and its number', () => {
  it('names every face of every shipped rolling good, nulls included', () => {
    for (const one of ROLLING_GOODS) {
      const said = saysGood(one)
      // The name, then the faces, then art. 87's sentence.
      expect(said, one.id as string).toContain(LABELS[one.id as string]!)
      expect(said, one.id as string).toContain(READOUT.rolls!)
      for (const face of one.rolls) {
        expect(said, `${one.id as string} · ${face.kind}`).toContain(faceSays(face))
      }
      // Every number on it is in the answer, so nothing fires unannounced.
      for (const face of one.rolls) {
        if (face.kind === 'null') continue
        expect(said, `${one.id as string} ${face.kind}`).toContain(`${face.amount}`)
      }
    }
  })

  it('draws a null rather than naming it — nothing is what it says', () => {
    expect(faceSays({ kind: 'null' })).toBe(READOUT.nothing)
    // And it is not a word, so it cannot read as a fifth kind.
    expect(faceSays({ kind: 'null' })).not.toMatch(/[a-z]/)
  })

  /** A `per` face says both numbers when it lands: what a die pays, and the total. */
  it('says a per face’s own number and what it came to', () => {
    const said = saysAmend({
      trinket: THE_SLIVER.id,
      face: { kind: 'per', amount: 2 },
      amount: 10,
    })
    expect(said).toContain(LABELS[THE_SLIVER.id as string]!)
    expect(said).toContain('2')
    expect(said).toContain('10')
  })

  it('says the thing’s own name on every beat, so a mark is never alone', () => {
    for (const one of ROLLING_GOODS) {
      for (const face of one.rolls) {
        const said = saysAmend({ trinket: one.id, face, amount: 1 })
        expect(said, one.id as string).toContain(LABELS[one.id as string]!)
        expect(said, one.id as string).not.toBe('')
      }
    }
  })
})

describe('card 93 §4 — the cascade gains a beat', () => {
  it('lands each fired good after the line and its climb, and before the blow', () => {
    const { frames } = played([4, 4, 4], 'triple', [THE_SLIVER], 0)
    const order = kinds(frames)
    expect(only(frames, 'amend')).toHaveLength(1)
    const at = order.indexOf('amend')
    expect(at).toBeGreaterThan(order.indexOf('line'))
    expect(at).toBeGreaterThan(order.lastIndexOf('climb'))
    expect(at).toBeLessThan(order.indexOf('struck'))
    expect(order.at(-1)).toBe('settled')
  })

  it('gives one beat to each carried good, in the order they are carried', () => {
    const { frames } = played([4, 4, 4], 'triple', ROLLING_GOODS, 0)
    expect(only(frames, 'amend').map((beat) => beat.rolled.trinket)).toEqual(
      ROLLING_GOODS.map((one) => one.id),
    )
  })

  /**
   * **A null gets no beat.** It is the absence of an event, and art. 119 asks
   * each beat to say one thing — a beat that said *nothing happened* would be a
   * fifth kind of face.
   */
  it('gives no beat to a face that did not fire', () => {
    const nulls = ROLLING_GOODS.map((one) => one.rolls.findIndex((face) => face.kind === 'null'))
    expect(new Set(nulls).size).toBe(1)
    const { frames } = played([4, 4, 4], 'triple', ROLLING_GOODS, nulls[0]!)
    expect(only(frames, 'amend')).toHaveLength(0)
  })

  /**
   * **The climb is the line's, and the amendments come after it.** Without this
   * the climb would sweep the amendments up and the beats they exist for would
   * be spent before they played.
   */
  it('climbs to what the line came to, then moves the number once per good', () => {
    const plain = played([4, 4, 4], 'triple', [], 0)
    const added = played([4, 4, 4], 'triple', [trinket('t.add', [{ kind: 'add', amount: 7 }])], 0)
    const lineTotal = plain.after.events.flatMap((event) =>
      event.kind === 'dealt' ? [event.amount] : [],
    )[0]!
    const climbs = added.frames.filter((frame) => frame.beat.kind === 'climb')
    expect(climbs.at(-1)!.shows.attack).toBe(lineTotal)
    // …and the amend beat is where it becomes the number that actually landed.
    const beat = added.frames.find((frame) => frame.beat.kind === 'amend')!
    expect(beat.shows.attack).toBe(lineTotal + 7)
  })

  /** A `cost` face takes it out of you on its own beat, where a rider's does. */
  it('takes a bite on its own beat, and lands where the engine left you', () => {
    const bite = trinket('t.cost', [{ kind: 'cost', amount: 9 }])
    const { before, after, frames } = played([4, 4, 4], 'triple', [bite], 0)
    const beat = frames.find((frame) => frame.beat.kind === 'amend')!
    expect(beat.shows.yourHealth).toBe(before.yourHealth - 9)
    expect(frames.at(-1)!.shows.yourHealth).toBe(after.yourHealth)
  })

  /**
   * A `block` face moves no number in the cascade: what it moved is the blow,
   * and the blow's own beat carries its `blocked` (art. 57).
   */
  it('leaves a block face to be seen in the blow it turned aside', () => {
    const shield = trinket('t.block', [{ kind: 'block', amount: 4 }])
    const { frames } = played([4, 4, 4], 'triple', [shield], 0)
    const struck = only(frames, 'struck')
    expect(struck).toHaveLength(1)
    expect(struck[0]!.blocked).toBe(Math.min(4, SWIPE.amount))
    expect(struck[0]!.amount).toBe(Math.max(0, SWIPE.amount - 4))
  })

  /**
   * **The load-bearing one** (art. 119): the settled frame is the fight the
   * engine already advanced to. If the beats and the ledger could come apart,
   * this is where.
   */
  it('settles on the numbers the engine holds, at every face of every good', () => {
    for (const one of ROLLING_GOODS) {
      for (let face = 0; face < one.rolls.length; face++) {
        const { after, frames } = played([4, 4, 4], 'triple', [one], face)
        const last = frames.at(-1)!
        const where = `${one.id as string} face ${face}`
        expect(last.beat.kind, where).toBe('settled')
        expect(last.shows.yourHealth, where).toBe(after.yourHealth)
        expect(last.shows.horrorHealth, where).toBe(after.horrorHealth)
        expect(last.shows.lifted, where).toEqual([])
        expect(last.shows.hit, where).toBe('none')
      }
    }
  })

  /** And with both carried at once, which is the cap and the worst case. */
  it('settles on the engine’s numbers with two carried', () => {
    for (let face = 0; face < 6; face++) {
      const { after, frames } = played([4, 4, 4], 'triple', ROLLING_GOODS, face)
      const last = frames.at(-1)!
      expect(last.shows.yourHealth, `face ${face}`).toBe(after.yourHealth)
      expect(last.shows.horrorHealth, `face ${face}`).toBe(after.horrorHealth)
    }
  })

  /**
   * art. 116: **reduced motion collapses it to the settled total**, like every
   * other beat. The same script with every delay zero — not a second path — so
   * a player who never sees a frame of motion has missed nothing.
   */
  it('collapses to the same settled state with motion reduced', () => {
    const { after, frames } = played([4, 4, 4], 'triple', ROLLING_GOODS, 0)
    const still = atOnce(frames)
    expect(kinds(still)).toEqual(kinds(frames))
    expect(still.every((frame) => frame.after === 0)).toBe(true)
    expect(still.at(-1)!.shows.yourHealth).toBe(after.yourHealth)
    expect(still.at(-1)!.shows.horrorHealth).toBe(after.horrorHealth)
  })

  /**
   * **And carrying none leaves the cascade the cascade it was.** No empty beat,
   * no placeholder frame — the timeline of a run carrying nothing is the
   * timeline the build had before the wave, frame for frame.
   */
  it('adds no frame at all when nothing is carried', () => {
    const bare = played([4, 4, 4], 'triple', [], 0)
    expect(only(bare.frames, 'amend')).toHaveLength(0)
    const saint = played([4, 4, 4], 'triple', [THE_TIN_SAINT], 3)
    // Face 3 is the tin saint's null: carried, rolled, fired nothing — and the
    // script is the bare one, because a null is not an event.
    expect(kinds(saint.frames)).toEqual(kinds(bare.frames))
    expect(saint.frames.map((frame) => frame.after)).toEqual(
      bare.frames.map((frame) => frame.after),
    )
  })
})
