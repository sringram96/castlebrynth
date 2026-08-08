import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  CATALOG,
  GRAMMAR,
  FULL_DEPTH,
  JUNGLE_SLICE,
  ROOMS,
  ROOM_BOOK,
  SLIVER,
  THE_SLIVER,
  ROLLING_GOODS,
  encounterWords,
  leftBy,
  roomContent,
  socketMark,
} from '../src/content/index.js'
import { PLATES, STAGES, artFor, assetsWanted } from '../src/content/visual/index.js'
import { NO_HISTORY, deal, explainWinnability, hereIn } from '../src/gen/index.js'
import type { Chain } from '../src/gen/index.js'
import type { RoomId, RunHistory } from '../src/state/index.js'
import { seedOf } from './helpers.js'

/**
 * The jungle-hell vertical slice.
 *
 * The claim this file is holding the code to is one sentence: **the view may
 * be almost entirely authored and the room underneath it is still an ordinary
 * room.** So the tests come in two halves. The first asks whether the route is
 * a route — five rooms, in an order, dealt by the dealer, with one fight and
 * one reward that arrive through the machinery every other fight and reward
 * arrives through. The second asks whether the stage is honest — that every
 * plate it names exists, that the loader is told about them, and that nothing
 * from `reference/` has leaked into the shipped manifest.
 *
 * What it deliberately does not test is how the composition *looks*. That is
 * the phone pass's question and no assertion can stand in for it.
 */

const ROUTE: readonly string[] = [
  'room.jungle.entry',
  'room.jungle.passage',
  'room.jungle.shrine',
  'room.jungle.fight',
  'room.jungle.reward',
]

/** The slice, walked to its end. Every room offers one door, so the walk is forced. */
function walk(seed: number): Chain {
  let history: RunHistory = NO_HISTORY
  let chain = deal(seedOf(seed), JUNGLE_SLICE.depth, CATALOG, GRAMMAR, history)
  while (chain.nodes.length < chain.length) {
    const here = hereIn(chain)
    if (here === null || here.doors.length === 0 || here.doors[0]?.ends === true) break
    history = { taken: [...history.taken, 0] }
    chain = deal(seedOf(seed), JUNGLE_SLICE.depth, CATALOG, GRAMMAR, history)
  }
  return chain
}

describe('the jungle-hell slice — five rooms, in an order (arts 9, 81)', () => {
  it('authors all five rooms, and every one of them is a room like any other', () => {
    for (const id of ROUTE) {
      const held = ROOMS.find((one) => (one.id as string) === id)
      expect(held, id).toBeDefined()
      // A box, a school, a shape and its things (art. 93). Nothing about the
      // stage removes any of that — a room whose plates never decoded is this.
      expect(held!.shape.width).toBeGreaterThan(0)
      expect(held!.tappables.length, id).toBeGreaterThan(0)
      // art. 69: and each of those things answers, because silence is a bug.
      for (const target of held!.tappables) {
        expect(ROOM_BOOK.look(held!.id, target.id).length, `${id}/${target.id}`).toBeGreaterThan(0)
        expect(target.noun, target.id).not.toBe(target.id)
      }
      // art. 111 and the voice: the room says something when you arrive in it.
      expect(ROOM_BOOK.beats(held!.id).length, id).toBeGreaterThan(0)
    }
  })

  it('is the depth a fresh run walks, and the generated depth is still there', () => {
    // `wake` opens at depth one, so this is the route a player actually gets.
    expect(JUNGLE_SLICE.depth).toBe(1)
    expect(JUNGLE_SLICE.length).toBe(ROUTE.length)
    // And the real depth is untouched and still in the catalog beside it.
    expect(FULL_DEPTH.length).toBe(9)
    expect(FULL_DEPTH.regions.length).toBeGreaterThan(0)
    expect(FULL_DEPTH.locks.length).toBeGreaterThan(0)
    expect(CATALOG.depths.map((one) => one.depth)).toContain(FULL_DEPTH.depth)
  })

  it('deals exactly the five rooms, in the order the slice declares', () => {
    const chain = walk(1)
    expect(chain.nodes.map((node) => node.room as string)).toEqual(ROUTE)
  })

  /**
   * The route is **data**, not a rendering special case. The proof is that the
   * dealer produces it from the plan alone — so the same five rooms come out
   * on every seed, which no `if (step === 3)` in a shell could be said to do.
   */
  it('deals the same five rooms on every seed, because the plan says so', () => {
    for (let seed = 1; seed <= 60; seed++) {
      expect(walk(seed).nodes.map((node) => node.room as string), `seed ${seed}`).toEqual(ROUTE)
    }
  })

  it('offers one way on from every room, and ends the depth at the last', () => {
    const chain = walk(3)
    for (const node of chain.nodes.slice(0, -1)) {
      expect(node.doors.length, node.room as string).toBe(1)
      expect(node.doors[0]!.ends, node.room as string).not.toBe(true)
      // Nothing in this route is locked: the gate is scenery (art. 71 — no
      // press may lie about where it takes you, and none of these do).
      expect(node.doors[0]!.demands, node.room as string).toEqual([])
    }
    const last = chain.nodes.at(-1)!
    expect(last.room as string).toBe('room.jungle.reward')
    expect(last.doors[0]!.ends).toBe(true)
    expect(last.doors[0]!.demands).toEqual([])
  })

  it('replays exactly, so the run survives a lock screen (arts 36, 75)', () => {
    const once = deal(seedOf(9), JUNGLE_SLICE.depth, CATALOG, GRAMMAR, { taken: [0, 0, 0] })
    const twice = deal(seedOf(9), JUNGLE_SLICE.depth, CATALOG, GRAMMAR, { taken: [0, 0, 0] })
    expect(once).toEqual(twice)
    // And a prefix of a walk is the head of the whole walk (art. 79).
    const whole = walk(9)
    expect(once.nodes.map((n) => n.room)).toEqual(whole.nodes.slice(0, 4).map((n) => n.room))
  })

  it('is winnable, which for a route with no lock means nothing is demanded early', () => {
    for (let seed = 1; seed <= 40; seed++) {
      expect(explainWinnability(walk(seed), CATALOG), `seed ${seed}`).toEqual([])
    }
  })
})

describe('the one fight and the one reward — arts 30, 80, 83', () => {
  it('stands exactly one ordinary horror in the fourth room, on every seed', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const fight = walk(seed).nodes.find((node) => (node.room as string) === 'room.jungle.fight')!
      const horrors = fight.fills.filter(
        (fill) => CATALOG.encounters.find((one) => one.id === fill.encounter)?.kind === 'horror',
      )
      expect(horrors.length, `seed ${seed}`).toBe(1)
      const who = CATALOG.encounters.find((one) => one.id === horrors[0]!.encounter)!
      // An existing horror, dealt by the ordinary floating draw — nothing is
      // bound to this room and no new horror was authored for it. It is the
      // Gnawing because it is the only horror awake in a depth with no
      // regions to lock (art. 78), which is a fact about the plan and not a
      // special case in the dealer.
      expect(who.horror, `seed ${seed}`).toBe('horror.gnawing')
      expect(who.binding).toBe('floating')
      // art. 89: a fight is not half of a fork.
      expect(horrors[0]!.orElse).toBeUndefined()
    }
  })

  it('leaves nothing standing in the three quiet rooms', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const id of ['room.jungle.entry', 'room.jungle.passage', 'room.jungle.shrine']) {
        const node = walk(seed).nodes.find((one) => (one.room as string) === id)!
        expect(node.fills, `seed ${seed} / ${id}`).toEqual([])
      }
    }
  })

  it('guarantees the Sliver in the last room, and only there', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const chain = walk(seed)
      const reward = chain.nodes.find((node) => (node.room as string) === 'room.jungle.reward')!
      expect(reward.fills.length, `seed ${seed}`).toBe(1)
      expect(reward.fills[0]!.encounter, `seed ${seed}`).toBe(SLIVER)
      expect(reward.fills[0]!.orElse).toBeUndefined()
      // Nowhere else in the route, ever.
      const elsewhere = chain.nodes
        .filter((node) => (node.room as string) !== 'room.jungle.reward')
        .flatMap((node) => node.fills)
        .filter((fill) => fill.encounter === SLIVER)
      expect(elsewhere, `seed ${seed}`).toEqual([])
    }
  })

  it('hands it over through the ordinary take, as an existing rolling good', () => {
    // Not a new item and not a new mechanism: it is the good the catalog
    // already ships, and what picks it up is the act that picks up any good.
    expect(leftBy(SLIVER)).toEqual([THE_SLIVER])
    expect(ROLLING_GOODS.some((one) => one.id === THE_SLIVER.id)).toBe(true)
    const at = socketMark('room.jungle.reward' as RoomId, JUNGLE_SLICE.locks[0]!.key as never)
    const words = encounterWords(SLIVER, at)
    expect(words.tappables.length).toBe(1)
    expect(words.acts.length).toBe(1)
    // art. 4: a good is optional treasure, so nothing about it holds a door.
    expect(words.acts[0]!.required).toBe(false)
  })

  it('places it by the plan rather than by the rarity draw (art. 80)', () => {
    // The reward room's own socket never fires of its own accord — what makes
    // the reward the same good every time is the plan owing it, not a weight.
    const reward = CATALOG.rooms.find((one) => (one.id as string) === 'room.jungle.reward')!
    const floor = reward.sockets.find((one) => one.accepts === 'boon')!
    expect(floor.chance).toBe(0)
    expect(JUNGLE_SLICE.locks.map((lock) => lock.key)).toEqual([SLIVER])
    // And it demands nothing, because nothing in this route is locked.
    expect(JUNGLE_SLICE.locks[0]!.demands).toEqual([])
    // No other room on the route can hold a good at all, which is what makes
    // the placement deterministic rather than merely likely.
    for (const id of ROUTE.filter((one) => one !== 'room.jungle.reward')) {
      const held = CATALOG.rooms.find((one) => (one.id as string) === id)!
      expect(held.sockets.some((one) => one.accepts === 'boon'), id).toBe(false)
    }
  })
})

describe('the stage — arts 126–127', () => {
  const JUNGLE_ASSETS = [
    'jungle.depth',
    'jungle.left-frame',
    'jungle.right-frame',
    'jungle.floor-bank',
    'jungle.shrine',
    'jungle.brazier',
    'jungle.gate',
  ]

  it('registers all seven masters, and each is a plate on disk in one school', () => {
    for (const id of JUNGLE_ASSETS) {
      const asset = PLATES[id]
      expect(asset, id).toBeDefined()
      expect(asset!.kind, id).toBe('plate')
      if (asset!.kind !== 'plate') continue
      expect(asset!.school, id).toBe('jungle-hell')
      // Declared, not awaited: the paintings arrived with the card.
      expect(asset!.awaiting, id).toBeUndefined()
      expect(existsSync(`public/${asset!.src}`), asset!.src).toBe(true)
    }
    // `visual.assets.test.ts` holds every declared size to the file on disk,
    // so the dimensions are checked there for these exactly as for the rest.
  })

  it('composes four stages, and every one of them names registered plates only', () => {
    expect(Object.keys(STAGES).sort()).toEqual(['constricted', 'gate', 'quiet', 'shrine'])
    for (const [name, stage] of Object.entries(STAGES)) {
      expect(stage.length, name).toBeGreaterThan(0)
      for (const placed of stage) {
        expect(PLATES[placed.asset], `${name}: ${placed.asset}`).toBeDefined()
        expect(JUNGLE_ASSETS, `${name}: ${placed.asset}`).toContain(placed.asset)
      }
      // art. 104: the one thing. Nothing in a stage sits on the hero band —
      // that band belongs to whatever comes close (art. 30), and a stage that
      // claimed it would leave the fight room with two things competing.
      expect(stage.every((placed) => placed.layer !== 5), name).toBe(true)
    }
  })

  it('gives each of the five rooms its stage, and keeps the knife (art. 126)', () => {
    for (const id of ROUTE) {
      const art = artFor(id)
      expect(art.overlays, id).toBeDefined()
      expect(art.overlays!.length, id).toBeGreaterThan(0)
      // The ground is the same in all five, under a `cover` anchor.
      expect(art.overlays![0]!.asset, id).toBe('jungle.depth')
      expect(art.overlays![0]!.anchor.space, id).toBe('cover')
      // What you are carrying comes down every corridor with you, unchanged.
      expect(art.foreground?.asset, id).toBe('weapon.knife')
    }
  })

  it('reads the shrine, the fight and the gate as three different rooms', () => {
    const of = (id: string) => artFor(id).overlays!.map((one) => one.asset)
    // The two quiet rooms are the same arrangement on purpose: expectation is
    // what the third room breaks.
    expect(of('room.jungle.entry')).toEqual(of('room.jungle.passage'))
    // And each of the other three is its own.
    expect(of('room.jungle.shrine')).toContain('jungle.shrine')
    expect(of('room.jungle.fight')).not.toContain('jungle.shrine')
    expect(of('room.jungle.fight')).not.toContain('jungle.gate')
    expect(of('room.jungle.reward')).toContain('jungle.gate')
    // The narrowing is the quiet room's kit, re-dealt tighter — same plates,
    // different numbers. That is the whole claim the slice is making.
    expect(new Set(of('room.jungle.fight'))).toEqual(new Set(of('room.jungle.entry')))
    const wideLeft = artFor('room.jungle.entry').overlays!.find(
      (one) => one.asset === 'jungle.left-frame',
    )!.anchor as { width: number }
    const tightLeft = artFor('room.jungle.fight').overlays!.find(
      (one) => one.asset === 'jungle.left-frame',
    )!.anchor as { width: number }
    expect(tightLeft.width).toBeGreaterThan(wideLeft.width)
  })

  it('stands everything the stage places above the tray, never behind it', () => {
    // art. 29: the reliquary is anchored over the lower edge of the frame, so
    // a thing standing at `y: 1.0` is drawn every frame and seen in none of
    // them. That defect was found once on the ossuary's heap; this is the
    // guard that stops it being found again here.
    for (const stage of Object.values(STAGES)) {
      for (const placed of stage) {
        if (placed.anchor.space !== 'frame') continue
        expect(placed.anchor.y, placed.asset).toBeLessThanOrEqual(0.78)
      }
    }
  })

  it('asks the loader for every plate the slice uses', () => {
    // `assetsWanted` is what every dressed room *places*, and it is what
    // `visual.assets.test.ts` holds the manifest to. The shell loads the whole
    // manifest, so this is the coverage question and not the fetch list: an id
    // placed by a room with no entry behind it is a typo wearing a fallback's
    // coat (art. 126).
    const wanted = assetsWanted()
    for (const id of JUNGLE_ASSETS) expect(wanted, id).toContain(id)
    for (const id of wanted) expect(PLATES[id], id).toBeDefined()
    // And nothing the ossuary needs was dropped on the way in.
    expect(wanted).toContain('ossuary.hall')
    // The knife is carried rather than placed by a room (`artFor` adds it to
    // every scene), so it lives in the manifest the shell loads and not in
    // this list. It is still there, which is the thing that matters.
    expect(PLATES['weapon.knife']).toBeDefined()
  })

  it('ships no reference-only file as a runtime plate', () => {
    // `reference/visual/jungle-hell/` holds the kit sheet and the wall
    // material the slice was drawn against. They are documentation: the wall
    // material in particular is reference-only because there is no
    // perspective-raster surface anchor to hang it on, and a manifest entry
    // for it would be a promise the renderer cannot keep.
    for (const asset of Object.values(PLATES)) {
      if (asset.kind !== 'plate') continue
      expect(asset.src).not.toContain('kit-reference')
      expect(asset.src).not.toContain('wall-material-reference')
      expect(asset.src).not.toContain('target-jungle-hell-screen')
      expect(asset.src.startsWith('reference/'), asset.id).toBe(false)
    }
    for (const name of ['kit-reference.png', 'wall-material-reference.png']) {
      expect(existsSync(`reference/visual/jungle-hell/${name}`), name).toBe(true)
      expect(existsSync(`public/assets/visual/regions/jungle-hell/${name}`), name).toBe(false)
    }
  })
})

describe('what the slice did not disturb', () => {
  it('leaves the generated depth dealing its own rooms and none of the jungle', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let history: RunHistory = NO_HISTORY
      let chain = deal(seedOf(seed), FULL_DEPTH.depth, CATALOG, GRAMMAR, history)
      while (chain.nodes.length < chain.length) {
        const here = hereIn(chain)
        if (here === null || here.doors.length === 0 || here.doors[0]?.ends === true) break
        history = { taken: [...history.taken, 0] }
        chain = deal(seedOf(seed), FULL_DEPTH.depth, CATALOG, GRAMMAR, history)
      }
      expect(chain.nodes.length, `seed ${seed}`).toBeGreaterThan(1)
      for (const node of chain.nodes) {
        expect((node.room as string).startsWith('room.jungle.'), `seed ${seed}`).toBe(false)
      }
    }
  })

  it('keeps every ossuary placement and the rooms that carry it', () => {
    for (const id of ['room.lair.choir', 'room.passage.bonefield']) {
      expect(() => roomContent(id as RoomId)).not.toThrow()
      expect(artFor(id).overlays!.length).toBeGreaterThan(0)
    }
    expect(PLATES['ossuary.hall']).toBeDefined()
    expect(PLATES['ossuary.skull-pile']).toBeDefined()
  })
})
