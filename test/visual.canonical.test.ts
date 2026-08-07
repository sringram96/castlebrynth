import { describe, expect, it } from 'vitest'

import { CANONICAL, artFor, canonicalArt, horrorPlateAt, horrorPlateFor } from '../src/content/visual/index.js'
import { HAND_SIZE, LADDER, RENDER, atGrid, plainPouchOf, roomContent } from '../src/content/index.js'
import { canonicalChain, canonicalNode, canonicalRequest } from '../src/shell/canonical.js'
import { assembleHand, cast, casting, openFight } from '../src/lots/index.js'
import type { Horror, Intent, Lot } from '../src/lots/index.js'
import type { Seed } from '../src/state/index.js'
import { renderRoom } from '../src/room/index.js'

/**
 * art. 126: the canonical screen is the surface future art work is measured
 * against, so what it has to be is *the same picture twice*. These prove
 * that, and prove the one thing a rendering harness must never do — change
 * what is true (art. 116's first sentence, applied to a dev route).
 */

describe('the request — the harness reads a URL and nothing else', () => {
  it('ignores a URL that did not ask for it', () => {
    expect(canonicalRequest('')).toBeNull()
    expect(canonicalRequest('?dice=3')).toBeNull()
    expect(canonicalRequest('?scene=something-else')).toBeNull()
  })

  it('reads the scene, the count and the room', () => {
    expect(canonicalRequest('?scene=canonical')).toEqual({ dice: null, room: null })
    expect(canonicalRequest('?scene=canonical&dice=3')?.dice).toBe(3)
    expect(canonicalRequest('?scene=canonical&dice=8')?.dice).toBe(8)
    expect(canonicalRequest('?scene=canonical&dice=0')?.dice).toBe(0)
    expect(canonicalRequest('?scene=canonical&room=room.passage.bonefield')?.room).toBe(
      'room.passage.bonefield',
    )
  })

  it('ignores an unreadable count rather than clamping it', () => {
    // Silently drawing six when somebody typed `dice=lots` would hide the
    // typo, and a harness that hides a typo is a harness you cannot trust
    // about anything else.
    expect(canonicalRequest('?scene=canonical&dice=lots')?.dice).toBeNull()
    expect(canonicalRequest('?scene=canonical&dice=-2')?.dice).toBeNull()
  })
})

describe('the still — art. 17 (the same picture, every time)', () => {
  it('stands in the same room, with the same identity, every load', () => {
    expect(canonicalNode(CANONICAL.room)).toEqual(canonicalNode(CANONICAL.room))
    const chain = canonicalChain(canonicalNode(CANONICAL.room), 1 as Seed)
    expect(chain.nodes.length).toBe(1)
    expect(chain.start).toBe(chain.nodes[0]?.instance)
  })

  it('composes in a room that exists and has been dressed', () => {
    expect(() => roomContent(CANONICAL.room as never)).not.toThrow()
    // The still's art is the room's own, so the fixture cannot drift away
    // from the game it is a picture of.
    expect(canonicalArt()).toBe(artFor(CANONICAL.room))
    expect(canonicalArt().foreground).toBeDefined()
    expect((canonicalArt().patches ?? []).length).toBeGreaterThan(0)
  })

  it('has a plated horror to put on the hero band', () => {
    expect(horrorPlateFor(CANONICAL.horror)).not.toBeNull()
  })

  it('renders the room byte-identical twice, as any room must', () => {
    const content = roomContent(CANONICAL.room as never)
    const state = {
      room: CANONICAL.room as never,
      instance: 'canonical' as never,
      done: [],
      opened: [],
      doors: [],
      horror: null,
      fills: [],
    }
    const once = renderRoom(content.scene(state), atGrid(RENDER.grid, 260))
    const twice = renderRoom(content.scene(state), atGrid(RENDER.grid, 260))
    expect(twice.frame.pixels).toEqual(once.frame.pixels)
  })
})

describe('the advance — art. 30 (no battle screen; the same thing, come close)', () => {
  const plate = horrorPlateFor(CANONICAL.horror)!

  it('is the same plate at both ends of the advance', () => {
    expect(horrorPlateAt(plate, 0).asset).toBe(horrorPlateAt(plate, 1).asset)
  })

  it('fills more of the lens as it arrives', () => {
    const off = horrorPlateAt(plate, 0).anchor
    const here = horrorPlateAt(plate, 1).anchor
    expect(off.space).toBe('frame')
    expect(here.space).toBe('frame')
    if (off.space !== 'frame' || here.space !== 'frame') return
    expect(here.width).toBeGreaterThan(off.width)
    // And it comes *down* the frame as it comes at you, past the bottom of
    // the lens: a thing at the near depth is cut off by the frame.
    expect(here.y).toBeGreaterThan(off.y)
    expect(here.y).toBeGreaterThan(1)
  })

  it('interpolates monotonically, so the advance never goes backwards', () => {
    let last = -Infinity
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const anchor = horrorPlateAt(plate, t).anchor
      if (anchor.space !== 'frame') throw new Error('a horror plate must be frame-anchored')
      expect(anchor.width).toBeGreaterThan(last)
      last = anchor.width
    }
  })

  it('is deterministic at any point of the advance', () => {
    expect(horrorPlateAt(plate, 0.4)).toEqual(horrorPlateAt(plate, 0.4))
  })
})

describe('the harness changes no rule — art. 116 (a setting may never change what is true)', () => {
  const intent: Intent = { verb: 'REND', amount: 9 }
  const horror: Horror = { id: 'test', health: 100, intentFor: () => intent }
  const flat: Lot = { next: () => 0 }

  it('asks for a hand the same way the game does', () => {
    // `?dice=n` moves the *hand*, through content's own pouch and the real
    // `assembleHand`. It is not a tray knob: what is being looked at is the
    // tray solving a real hand.
    for (const size of [1, 3, 6, 8]) {
      expect(assembleHand(plainPouchOf(size), size).dice.length).toBe(size)
    }
  })

  it('leaves the ladder, the card and the arithmetic exactly where they were', () => {
    const six = openFight(horror, assembleHand(plainPouchOf(6), 6), 40, 0)
    const three = openFight(horror, assembleHand(plainPouchOf(3), 3), 40, 0)
    // The card refills whole at every hand size: a line is a line (art. 63).
    expect(Object.keys(six.card)).toEqual(Object.keys(three.card))
    expect(six.turn.intent).toEqual(three.turn.intent)
    // And the tiers are content's, untouched by anything the harness does.
    expect(LADDER['any-dice'].multiplier).toBe(1)
  })

  it('changes the frame height without changing what the dice do', () => {
    // The render dial and the game are different questions (art. 23). A
    // taller frame is a taller frame; it is not a different turn.
    const fight = openFight(horror, assembleHand(plainPouchOf(6), 6), 40, 0)
    const before = casting(cast(fight.turn, flat)).map((one) => one.face.value)
    atGrid(480, 520)
    const after = casting(cast(fight.turn, flat)).map((one) => one.face.value)
    expect(after).toEqual(before)
  })

  it('still wakes the shipped game with six', () => {
    expect(CANONICAL.dice).toBe(HAND_SIZE)
  })
})
