/**
 * Where a press can stand in a picture, and where it may not.
 *
 * Movement moved into the room. A way out is a hotspot seated on the painted
 * feature it passes through, a found thing lies where it fell with its own
 * name and its own TAKE, and both of them are now in the same picture as the
 * worked objects and the LOOK details that were always there.
 *
 * So the law `content/rooms.ts` already stated for a worked object's verb now
 * covers all four kinds: **no two presses may share the same 44 px.** A tap
 * that lands on the neighbour is the class of bug this whole suite exists for,
 * and it is arithmetic rather than a screenshot — which means it can be
 * checked over every template at once, including the ones no journey walks.
 *
 * The geometry is the phone's: a 390 × 844 viewport, with the tray taking the
 * bottom of it. Everything below is in CSS pixels of the **world box**, and
 * the numbers are derived from `content/tray.ts` rather than typed in.
 */

import { describe, expect, it } from 'vitest'

import { ROOM_LIBRARY } from '../../src/content/rooms.js'
import type { RoomTemplate } from '../../src/content/rooms.js'
import { CONTENT_SPAN, TRAY_ASPECT } from '../../src/content/tray.js'
import { REWARDS } from '../../src/content/rewards.js'
import { CORE_DICE } from '../../src/content/dice.js'
import { actionFor, initialRoomState } from '../../src/content/interactions.js'

/** The phone the browser suite runs at, and the only one anything is sized to. */
const VIEWPORT = { width: 390, height: 844 } as const

/**
 * The world box, in CSS pixels.
 *
 * `#app` is a column: the tray is laid out so that its content band fills the
 * viewport, and the world takes everything above it. Derived here for the same
 * reason the stylesheet derives it — a number typed in twice is a number that
 * will disagree with itself.
 */
const TRAY_WIDTH = Math.min((VIEWPORT.width - 6) / CONTENT_SPAN, 620)
const WORLD = {
  width: VIEWPORT.width,
  height: VIEWPORT.height - TRAY_WIDTH / TRAY_ASPECT,
} as const

/** The touch floor, from `CONTRIBUTING.md`'s input contract. */
const TOUCH = 44

/**
 * How wide a press's box is, by what is written on it.
 *
 * A bare LOOK ring is a circle of the touch floor. Everything that carries a
 * verb is a pill: `min-width: 72px`, growing with its label at roughly nine
 * pixels a character plus the stylesheet's 28 px of padding. Deliberately an
 * **over**-estimate — a test that guessed narrow would pass a layout that
 * overlaps on a real phone.
 */
const pill = (label: string): number => Math.max(72, 28 + label.length * 9)

interface Press {
  readonly what: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

const at = (
  what: string,
  spot: { readonly x: number; readonly y: number },
  w: number,
): Press => ({ what, x: spot.x * WORLD.width, y: spot.y * WORLD.height, w, h: TOUCH })

/** How far under a found thing's name its TAKE sits. Mirrors `ui/worldView.ts`. */
const LOOT_TAKE_DROP = 0.09

/**
 * Every press a room can put on its picture, at once.
 *
 * Deliberately **all of them together**, including presses that are never on
 * screen at the same moment: a room whose PRY and whose TAKE are one thumb
 * apart is a room one state change away from a tap landing on the wrong thing,
 * and "they are never both up" is a promise about the reducer rather than
 * about the picture.
 */
function pressesIn(t: RoomTemplate): readonly Press[] {
  const out: Press[] = []

  for (const detail of t.details) out.push(at(`look:${detail.id}`, detail.at, TOUCH))

  if (t.ritual) out.push(at(`ritual:${t.ritual.label}`, t.ritual.at, pill(t.ritual.label)))

  // A worked object's verb, at its widest: an object whose label changes with
  // its state is checked at the longest thing it can ever say.
  const opening = initialRoomState(t.id)
  for (const thing of t.interactables ?? []) {
    const labels = opening
      ? [actionFor(opening, thing.id)?.label, ...WIDEST[thing.id] ?? []].filter(
          (l): l is string => typeof l === 'string',
        )
      : []
    const widest = labels.reduce((n, l) => Math.max(n, pill(l)), pill(''))
    out.push(at(`interact:${thing.id}`, thing.at, widest))
  }

  for (const anchor of t.exitAnchors ?? []) {
    // A way's label is the plan's, not the template's, so the widest one any
    // plan could put here is what an anchor has to have room for.
    out.push(at(`exit:${anchor.id}`, anchor.at, WIDEST_WAY))
  }

  for (const spot of t.lootAt ?? []) {
    out.push(at(`loot:${spot.id}`, spot.at, WIDEST_LOOT))
    out.push(
      at(`take:${spot.id}`, { x: spot.at.x, y: spot.at.y + LOOT_TAKE_DROP }, pill('TAKE')),
    )
  }

  // A spare seat, **whether or not anything is standing in it this run**. The
  // negative-space law counts a seat as a plate: a room whose empty seat would
  // have covered a LOOK is one die away from a tap landing on the wrong thing, and
  // "nothing is in it today" is a promise about the generator rather than about
  // the picture. Two presses apiece, the same pair a found thing has.
  for (const seat of t.spareSeats ?? []) {
    out.push(at(`die:${seat.id}`, seat.at, WIDEST_DIE))
    out.push(at(`claim:${seat.id}`, { x: seat.at.x, y: seat.at.y + LOOT_TAKE_DROP }, pill('TAKE')))
  }

  // And the one place a carving can be cut. Prose and a tap, so it is a LOOK ring.
  if (t.carvingAt) out.push(at('look:carving', t.carvingAt, TOUCH))

  return out
}

/**
 * Labels an object can say that its opening state does not.
 *
 * Enumerated rather than derived, because `actionFor` answers for one position
 * at a time and what this test needs is the *widest* thing a button can ever
 * be. Short, and it fails loudly if an object grows a longer verb: the pill is
 * still checked at `pill('')` as a floor.
 */
const WIDEST: Readonly<Record<string, readonly string[]>> = {
  'reliquary-bell': ['RING'],
  'reliquary-brazier': ['PUT OUT', 'LIGHT'],
  'reliquary-lever': ['PULL'],
  'vault-chain': ['LOWER', 'RAISE'],
  'vault-lever': ['PULL'],
  'offertory-candles': ['PUT OUT', 'LIGHT'],
  'offertory-altar': ['OFFER'],
  'offertory-recess': ['PRY'],
}

/** The widest label any authored way can put on an anchor. */
const WIDEST_WAY = pill('THROUGH')

/** And the widest short name any found thing can put on a pill. */
const WIDEST_LOOT = Object.values(REWARDS).reduce((n, r) => Math.max(n, pill(r.short)), 0)

/** The same question for a core die on a seat: the widest word one can wear. */
const WIDEST_DIE = Object.values(CORE_DICE).reduce((n, d) => Math.max(n, pill(d.short)), 0)

const overlaps = (a: Press, b: Press): boolean =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2

describe('two presses never share a thumb', () => {
  for (const t of ROOM_LIBRARY) {
    it(`${t.id} seats every press clear of every other`, () => {
      const presses = pressesIn(t)
      for (let i = 0; i < presses.length; i++) {
        for (let j = i + 1; j < presses.length; j++) {
          const a = presses[i]!
          const b = presses[j]!
          expect(
            overlaps(a, b),
            `${t.id}: ${a.what} and ${b.what} share the same 44px ` +
              `(${Math.round(Math.abs(a.x - b.x))}px apart across, ` +
              `${Math.round(Math.abs(a.y - b.y))}px down)`,
          ).toBe(false)
        }
      }
    })
  }
})

describe('every press is on the screen', () => {
  for (const t of ROOM_LIBRARY) {
    it(`${t.id} keeps every press inside the world box`, () => {
      for (const p of pressesIn(t)) {
        expect(p.x - p.w / 2, `${t.id}: ${p.what} runs off the left`).toBeGreaterThanOrEqual(0)
        expect(p.x + p.w / 2, `${t.id}: ${p.what} runs off the right`).toBeLessThanOrEqual(
          WORLD.width,
        )
        expect(p.y - p.h / 2, `${t.id}: ${p.what} runs off the top`).toBeGreaterThanOrEqual(0)
        expect(p.y + p.h / 2, `${t.id}: ${p.what} runs off the bottom`).toBeLessThanOrEqual(
          WORLD.height,
        )
      }
    })
  }
})

describe('the ways out are in the picture', () => {
  it('gives every room exactly as many anchors as its art can carry ways', () => {
    // One anchor per exit slot. Fewer would be a way with nowhere to stand,
    // which `validateRunMap` fails a run for; more would be a coordinate
    // nothing can ever bind to.
    for (const t of ROOM_LIBRARY) {
      expect(t.exitAnchors?.length ?? 0, `${t.id}`).toBe(t.topology.maxExits)
    }
  })

  it('gives a room that sells exactly one seat per thing on its table', () => {
    // A die with nowhere to stand is a die the view would have to invent a place
    // for, which is the one thing a view may not do. Asserted both ways: enough
    // seats for what the room sells, and no seat that nothing could ever stand on.
    for (const t of ROOM_LIBRARY) {
      const seats = t.spareSeats?.length ?? 0
      if (t.exchange) expect(seats, `${t.id} sells ${t.exchange.count}`).toBeGreaterThanOrEqual(t.exchange.count)
      if (seats > 0) expect(t.role === 'exchange' || t.role === 'find', `${t.id} has seats`).toBe(true)
      // Every seat is unique in its room, or two things would stack on one.
      expect(new Set((t.spareSeats ?? []).map((s) => s.id)).size).toBe(seats)
    }
  })

  it('gives every room that can pay somewhere for the payment to lie', () => {
    // A room that reveals a find, or holds a fight that can drop one, needs a
    // place in the picture for the thing to be. The alternative is a view
    // inventing a coordinate, which is the one thing a view may not do.
    for (const t of ROOM_LIBRARY) {
      if (!t.find && !t.enemy) continue
      if (t.enemy && !t.find && t.id === 'gate') continue
      expect((t.lootAt?.length ?? 0) > 0, `${t.id} can pay and has nowhere to pay into`).toBe(true)
    }
  })

  it('names a find the reward table actually has', () => {
    for (const t of ROOM_LIBRARY) {
      if (!t.find) continue
      expect(REWARDS[t.find], `${t.id} names ${t.find}`).toBeDefined()
    }
  })
})
