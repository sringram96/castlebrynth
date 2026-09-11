/**
 * The negative-space law, and the quiet-motion law welded to it.
 *
 * A playtest said the rooms shout. Two symptoms of one disease: frames packed
 * with seated furniture and a press offered for every brick, and then perfect
 * stillness inside all of it, which reads as a slide rather than as a place.
 *
 * So this file holds the library to four promises, and the order is the order
 * they were built in:
 *
 *   - **every frame declares what it can hold, and holds no more.** The budget
 *     is the composition's, because the composition is already the statement of
 *     what a picture can carry.
 *   - **nothing was cut from the writing.** A demoted LOOK lost its hotspot and
 *     kept every word: the line is still in the room's prose, verbatim, and the
 *     backdrop still shows the thing it names.
 *   - **a room breathes only inside the space that cleared**, at most twice,
 *     with the territory's own ambient counting as one of the two.
 *   - **and it breathes in whole numbers.** Amplitudes and ticks are integers,
 *     because the pixel grid is the law in space and this is the law in time.
 *
 * Everything here is pure over content. No map, no run, no state, no DOM — the
 * browser suite is where the same budgets are counted off a rendered room.
 */

import { describe, expect, it } from 'vitest'

import { ROOM_LIBRARY, ROOM_TEMPLATES, AMBIENT_CAP, MOTE_CAP, ambienceFor, ambientSeat } from '../../src/content/rooms.js'
import type { RoomTemplate } from '../../src/content/rooms.js'
import {
  FRAME_BUDGETS,
  contentProblems,
  platesIn,
  pressesIn,
} from '../../src/content/roomResolver.js'

/**
 * Everything a room says, in every place it can say it.
 *
 * The prose a demoted line has to survive into: the arrival, the LOOKs that
 * kept their hotspots, the ritual's own prompt, and the accessible name on each
 * worked object. Deliberately **not** the copy tables — a line that ended up in
 * `content/text.ts` would be a line the room stopped owning.
 */
function proseOf(t: RoomTemplate): string {
  return [
    t.arrival,
    ...t.details.map((d) => d.says),
    ...(t.ritual ? [t.ritual.prompt, t.ritual.describe] : []),
    ...(t.interactables ?? []).map((i) => i.describe),
  ].join('\n')
}

/**
 * What the audit demoted, room by room, word for word.
 *
 * **This is the record and it is the point.** A LOOK whose only job was flavour
 * lost its hotspot; it did not lose its sentence. Every line below was a
 * `Detail.says` before this wave and is now inside the room's arrival or inside
 * the one LOOK that kept its place, in full, and the test under it is what stops
 * a later edit quietly dropping one while tidying.
 *
 * A demotion earned its place on this list by one of two readings: the hotspot
 * sat on an object that already carried its own verb (the bell beside RING, the
 * candles beside PUT OUT), or it sat on the painted feature a way out already
 * passes through (the far door, both mouths of the Cleft).
 */
const DEMOTED: Readonly<Record<string, readonly string[]>> = {
  entry: [
    'A skull on the floor. Small. It has been here longer than the candles.',
    'The hall keeps going. There is a door at the end of it and no light behind it.',
  ],
  passage: ['A step, worn down the middle. Whatever uses this passage uses it often.'],
  hollow: ['Niches, packed with skulls. Hundreds. This is where the hall was leading.'],
  sanctuary: [
    'Candles down both walls, lit and level. Somebody comes down here and keeps them.',
    'Skulls, shelf on shelf, back into the dark. Every one of them is facing the basin.',
  ],
  reliquary: [
    'A bronze bell. Old red thread is knotted around the clapper.',
    'Five candles melted almost to the stone. They are the only warm light in the room.',
    'An altar built around a basin. The blood in it is old enough to be black.',
    'A chest with no keyhole. The skull clasp is joined to something inside the wall.',
  ],
  cleft: [
    'Dragged marks into the left mouth. Something heavy goes that way, and often.',
    'Wax down the right-hand wall. Somebody carried a light in there and came back.',
  ],
  confluence: [
    'The mouth I could have come out of. It is quiet in there now.',
    'The other mouth. Narrower. I would have had to turn my shoulders.',
  ],
  offertory: [
    'Candles, and fresh ones. Whoever they are burning for is not me yet.',
    'A recess in the wall, shut with a stone lid. The lid has been forced at before.',
  ],
  fork: ['Scratches on the stone. Counting something. They stop at nine.'],
  'chain-vault': [
    'An iron cage. Heavy enough to make the chain groan.',
    'A square plate in the floor, polished around the edges by weight.',
    'A lever beside the gate. Its linkage runs toward the floor plate.',
    'Iron bars with no lock. The mechanism is inside the wall.',
  ],
  gate: ['A plate on the wall. REPENT OR PERISH. Someone had opinions.'],
}

describe('every frame declares what it can hold', () => {
  it('gives every composition in the library a budget', () => {
    for (const t of ROOM_LIBRARY) {
      expect(FRAME_BUDGETS[t.composition], `${t.id} is a ${t.composition}`).toBeDefined()
    }
  })

  for (const t of ROOM_LIBRARY) {
    it(`${t.id} fits its own ${t.composition} frame`, () => {
      const budget = FRAME_BUDGETS[t.composition]!
      expect(platesIn(t), `${t.id} plates`).toBeLessThanOrEqual(budget.plates)
      expect(pressesIn(t), `${t.id} presses`).toBeLessThanOrEqual(budget.presses)
    })
  }

  it('counts the ways out in neither budget', () => {
    // Exits are mandated by topology — one anchor per slot the map may attach,
    // asserted next door in `anchors.test.ts` — so a budget that counted them
    // would punish a junction for being a junction. The Cleft is the proof: two
    // ways out, and it is comfortably inside a junction's four presses.
    const cleft = ROOM_TEMPLATES['cleft']!
    expect(cleft.exitAnchors).toHaveLength(2)
    expect(pressesIn(cleft)).toBe(1)
  })

  it('counts loot at its authoring-time maximum', () => {
    // The Marrow's floor counts two, because two things can be lying on it —
    // not however many this particular fight happened to pay.
    expect(ROOM_TEMPLATES['deep']!.lootAt).toHaveLength(2)
    expect(platesIn(ROOM_TEMPLATES['deep']!)).toBe(2)
  })

  it('fails loudly, and names the room and the number', () => {
    const piled: RoomTemplate = {
      ...ROOM_TEMPLATES['passage']!,
      id: 'piled',
      details: [1, 2, 3, 4, 5].map((n) => ({
        id: `brick-${n}`,
        at: { x: 0.1 * n, y: 0.5 },
        says: `Brick ${n}.`,
      })),
    }
    const problems = contentProblems([piled])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('piled: 5 presses in a cramped frame, which holds 3')
  })

  it('passes the library it actually ships', () => {
    expect(contentProblems()).toEqual([])
  })
})

describe('a demoted LOOK keeps every word', () => {
  for (const [id, lines] of Object.entries(DEMOTED)) {
    it(`${id} still says what it stopped offering a press for`, () => {
      const t = ROOM_TEMPLATES[id]
      expect(t, `${id} is not in the library`).toBeDefined()
      const prose = proseOf(t!)
      for (const line of lines) {
        expect(prose, `${id} lost: ${line}`).toContain(line)
      }
    })
  }

  it('demoted no hotspot it did not record', () => {
    // The other direction, and the one that rots: a later edit that removes a
    // LOOK without adding it here would pass every test above. So the ids are
    // held to being gone, which is only true if somebody listed them.
    for (const [id, lines] of Object.entries(DEMOTED)) {
      const t = ROOM_TEMPLATES[id]!
      for (const line of lines) {
        expect(
          t.details.some((d) => d.says === line),
          `${id} still offers a press for a line recorded as demoted`,
        ).toBe(false)
      }
    }
  })

  it('leaves every room with at most one thing the eye should find', () => {
    for (const t of ROOM_LIBRARY) {
      expect(t.details.filter((d) => d.focal).length, `${t.id}`).toBeLessThanOrEqual(1)
    }
  })
})

describe('a room breathes in whole numbers', () => {
  it('declares no more than two sources anywhere, the territory included', () => {
    for (const t of ROOM_LIBRARY) {
      expect(ambienceFor(t).length, `${t.id}`).toBeLessThanOrEqual(AMBIENT_CAP)
    }
  })

  it('seats every source on something the room actually has', () => {
    for (const t of ROOM_LIBRARY) {
      for (const a of ambienceFor(t)) {
        if (a.kind === 'drift') {
          expect(a.target, `${t.id}`).toBe('world')
          expect(a.at, `${t.id}: drift has no seat`).toBeUndefined()
          continue
        }
        expect(a.at, `${t.id}: ${a.kind} on "${a.target}" has no seat`).toBeDefined()
        expect(ambientSeat(t, a.target)).toEqual(a.at)
      }
    }
  })

  it('moves in whole pixels and steps on whole ticks', () => {
    for (const t of ROOM_LIBRARY) {
      for (const a of ambienceFor(t)) {
        expect(Number.isInteger(a.amplitude), `${t.id}: ${a.kind} amplitude`).toBe(true)
        expect(a.amplitude).toBeGreaterThan(0)
        expect(Number.isInteger(a.tick), `${t.id}: ${a.kind} tick`).toBe(true)
        expect(a.tick).toBeGreaterThan(0)
      }
    }
  })

  it('caps the dust rather than raining it', () => {
    // A hard count, not a rate. Dust that accumulates is weather, and weather
    // is a system nobody asked for.
    expect(MOTE_CAP).toBe(6)
  })

  it('throws on a kind nobody wrote', () => {
    const wrong = {
      ...ROOM_TEMPLATES['passage']!,
      id: 'wrong',
      ambient: [{ kind: 'shimmer' as never, target: 'arch', amplitude: 1, tick: 1 }],
    }
    expect(contentProblems([wrong]).join('\n')).toContain('"shimmer" is not one anybody wrote')
  })

  it('throws on a fraction of a pixel and on a fraction of a tick', () => {
    const half = {
      ...ROOM_TEMPLATES['passage']!,
      id: 'half',
      ambient: [{ kind: 'sway' as const, target: 'arch', amplitude: 0.5, tick: 1.5 }],
    }
    const said = contentProblems([half]).join('\n')
    expect(said).toContain('amplitude 0.5, and amplitudes are whole')
    expect(said).toContain('ticks every 1.5, and ticks are whole')
  })

  it('throws on a light seated on nothing', () => {
    const nowhere = {
      ...ROOM_TEMPLATES['passage']!,
      id: 'nowhere',
      ambient: [{ kind: 'glow' as const, target: 'chandelier', amplitude: 1, tick: 1 }],
    }
    expect(contentProblems([nowhere]).join('\n')).toContain(
      'seated on "chandelier", which is not in this room',
    )
  })

  it('throws on a third source in one room', () => {
    // The ossuary gives every room in it one already, so two of the room's own
    // is three — and three is what the cap exists to refuse.
    const crowded = {
      ...ROOM_TEMPLATES['offertory']!,
      id: 'crowded',
      ambient: [
        { kind: 'flicker' as const, target: 'offertory-candles', amplitude: 2, tick: 1 },
        { kind: 'glow' as const, target: 'price', amplitude: 1, tick: 2 },
      ],
    }
    expect(contentProblems([crowded]).join('\n')).toContain('3 ambient sources')
  })
})

describe('the assignment table this wave shipped', () => {
  /** Where something moves, and what it is. The wave's own list, as data. */
  const MOVES: Readonly<Record<string, readonly string[]>> = {
    entry: ['flicker'],
    sanctuary: ['glow'],
    reliquary: ['flicker'],
    offertory: ['flicker', 'drift'],
    'chain-vault': ['sway'],
    deep: ['glow'],
    // Bone country carries the ossuary's dust and nothing of its own.
    passage: ['drift'],
    hollow: ['drift'],
    cleft: ['drift'],
  }

  for (const t of ROOM_LIBRARY) {
    it(`${t.id} moves exactly as the table says`, () => {
      expect(ambienceFor(t).map((a) => a.kind)).toEqual(MOVES[t.id] ?? [])
    })
  }

  it('holds the threshold rooms before the door still, deliberately', () => {
    // Still is a choice. The Split, the Confluence, the Door and the way out
    // have nothing moving in them, and that is the wave's ruling rather than an
    // omission: a room that is about to ask a question should not be fidgeting.
    for (const id of ['fork', 'confluence', 'gate', 'exit']) {
      expect(ambienceFor(ROOM_TEMPLATES[id]!), id).toEqual([])
    }
  })
})
