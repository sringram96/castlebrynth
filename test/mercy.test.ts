import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  BASIN,
  CATALOG,
  FULL_DEPTH,
  FONT,
  GRAMMAR,
  GRID,
  MENDER,
  MERCY_SOCKET,
  SANCTUM_BREATH,
  SAVIOR_MERCY,
  ROOM_BOOK,
  VERBS,
  atGrid,
  roomContent,
  saysAct,
} from '../src/content/index.js'
import type { Act } from '../src/descent/index.js'
import {
  act,
  actsIn,
  breathOf,
  enterRoom,
  sceneStateOf,
} from '../src/descent/index.js'
import type { Catalog, Chain, ChainNode, RegionId } from '../src/gen/index.js'
import { FRESH_DRIFT } from '../src/gen/index.js'
import { renderRoom, viewOf } from '../src/room/index.js'
import type { Ledgers, RoomId, Vault } from '../src/state/index.js'
import { hasMet, instanceOf, load, movedTo, remembers, save, wounded } from '../src/state/index.js'
import { routeDeath } from '../src/hinge/index.js'
import type { Policy } from './drift.js'
import {
  alwaysLeft,
  alwaysRight,
  avoiding,
  coinFlip,
  leaning,
  opened,
  runOf,
  runWith,
  seedOf,
  walkTo,
  lookAround } from './drift.js'
import { BURNT, DROWNED, OSSUARY } from '../src/content/index.js'
import { DEALT_BY_FULL_DEPTH } from './helpers.js'

/**
 * art. 40 (ruled) — the two mercies.
 *
 * The Sanctum is a *place*: a room, in the neutral pool, whose basin is
 * bound to it and gives back half of what is missing. The Savior is a
 * *being*: a rare floating encounter that stands in an ordinary room and
 * gives back all of it. Neither charges anything.
 *
 * The two tiers must stay distinct — a full free Sanctum makes every fight
 * before it consequence-free and leaves the Savior nothing to be — so the
 * arithmetic is asked about directly rather than inferred from a playthrough.
 */
const BAND = FULL_DEPTH.mercies[0]!.band

/** The policies a run can be played with, including two that fight the drift. */
const POLICIES: readonly (readonly [string, (seed: number) => Policy])[] = [
  ['always-left', () => alwaysLeft],
  ['always-right', () => alwaysRight],
  ['lean-drowned', () => leaning(DROWNED)],
  ['lean-burnt', () => leaning(BURNT)],
  ['lean-ossuary', () => leaning(OSSUARY)],
  ['avoid-ossuary', () => avoiding(OSSUARY)],
  ['coin-flip', (seed: number) => coinFlip(seed)],
]

/** Which steps of a run hold a Sanctum. */
function sanctumsIn(chain: Chain): readonly number[] {
  return chain.nodes.filter((node) => node.type === 'sanctum').map((node) => node.step)
}

function heldIn(chain: Chain, who: string): number {
  return chain.nodes.filter((node) =>
    node.fills.some((fill) => (fill.encounter as string) === who),
  ).length
}

/** The one act a filled mercy socket offers, whatever fills it. */
function mercyAct(node: ChainNode): Act {
  const one = actsIn(ROOM_BOOK, node).find((held) => held.heals !== undefined)
  if (one === undefined) throw new Error(`no mercy offered at ${node.instance}`)
  return one
}

/** The first run in a sweep that puts the Mender in front of the player. */
function withTheMender(): { seed: number; ledgers: Ledgers; chain: Chain; node: ChainNode } {
  for (let seed = 1; seed <= 400; seed++) {
    const found = walkTo(seed, (node) =>
      node.fills.some((fill) => fill.encounter === MENDER),
    )
    if (found !== null) return { seed, ...found }
  }
  throw new Error('no run in four hundred put the Mender in the path')
}

/** A vault that can be killed: only the bytes come back. */
function killable(): { vault: Vault; kill: () => Vault } {
  const written = new Map<string, string>()
  const open = (store: Map<string, string>): Vault => ({
    read: (key: string) => store.get(key) ?? null,
    write: (key: string, value: string) => void store.set(key, value),
    forget: (key: string) => void store.delete(key),
  })
  return { vault: open(written), kill: () => open(new Map(written)) }
}

describe('art. 40 — the Sanctum restores half of what is missing', () => {
  it('rounds the half in the player’s favour, always', () => {
    for (let max = 1; max <= 60; max++) {
      for (let health = 0; health <= max; health++) {
        const missing = max - health
        const given = breathOf(health, max, SANCTUM_BREATH)
        expect(given, `${health}/${max}`).toBe(Math.ceil(missing / 2))
        // Favour means never less than the honest half, and never more than
        // the whole of what is open.
        expect(given).toBeGreaterThanOrEqual(missing / 2)
        expect(given).toBeLessThanOrEqual(missing)
      }
    }
    // The odd numbers are where a rounding rule is actually a rule.
    expect(breathOf(1, 26, SANCTUM_BREATH)).toBe(13)
    expect(breathOf(0, 25, SANCTUM_BREATH)).toBe(13)
    expect(breathOf(20, 25, SANCTUM_BREATH)).toBe(3)
    expect(breathOf(24, 25, SANCTUM_BREATH)).toBe(1)
  })

  it('never heals a body that is whole, and never overheals one that is not', () => {
    for (let max = 1; max <= 60; max++) {
      expect(breathOf(max, max, SANCTUM_BREATH), `${max}`).toBe(0)
      expect(breathOf(max, max, SAVIOR_MERCY), `${max}`).toBe(0)
      // And a share of nothing is nothing, however large the share.
      expect(breathOf(max + 5, max, SANCTUM_BREATH)).toBe(0)
      for (let health = 0; health <= max; health++) {
        expect(health + breathOf(health, max, SANCTUM_BREATH)).toBeLessThanOrEqual(max)
        expect(health + breathOf(health, max, SAVIOR_MERCY)).toBe(max)
      }
    }
  })

  it('gives the Savior all of it, which is the whole difference between the tiers', () => {
    expect(SAVIOR_MERCY).toBe(1)
    expect(SANCTUM_BREATH).toBeGreaterThan(0)
    expect(SANCTUM_BREATH).toBeLessThan(1)
    // The distinctness is the part of the ruling that is not tuning.
    for (const missing of [2, 7, 13, 25]) {
      expect(breathOf(26 - missing, 26, SANCTUM_BREATH)).toBeLessThan(
        breathOf(26 - missing, 26, SAVIOR_MERCY),
      )
    }
  })

  it('spends the breath through the act strip, on a run that is actually hurt', () => {
    const found = walkTo(1, (node) => node.type === 'sanctum')
    expect(found).not.toBeNull()
    const { chain, node } = found!
    let ledgers = found!.ledgers
    ledgers = { ...ledgers, run: wounded(ledgers.run!, 7) }

    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const offered = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
    const drink = offered.find((one) => one.id === 'act.drink')
    expect(drink, 'the font offers its breath').toBeDefined()
    // art. 66: a plain imperative verb, and it costs nothing to press.
    expect(drink!.verb).toBe(VERBS['act.drink'])
    expect(drink!.needs).toEqual([])
    expect(drink!.required).toBe(false)

    const after = act(ledgers, drink!)
    // Half of what is missing, rounded in the player's favour — asked of the
    // rule rather than written down as a number, because the body is tuning
    // (card 89 moved it from twenty-six to sixty-four) and art. 40's share
    // is not.
    expect(after.run!.health).toBe(7 + breathOf(7, BARE_BODY.health, SANCTUM_BREATH))
    // It costs nothing: no item leaves, nothing on the permanent moves.
    expect(after.run!.carried).toEqual(ledgers.run!.carried)
    expect(after.permanent).toBe(ledgers.permanent)
  })

  /**
   * **Amended by art. 118 (the answer wave).** This test used to assert that
   * a whole body was still *offered* the breath and got `mercy.whole` back
   * for pressing it. The dead-press ruling repeals that: an act that cannot
   * change anything is not offered, and the reason moves into the basin's own
   * look, where a withheld verb can carry one. What survives unamended is
   * art. 40's substance — the breath is not spent, and it is still there when
   * the run comes back hurt.
   */
  it('is not spent by a body that is whole, and is not offered to one (art. 118)', () => {
    const found = walkTo(1, (node) => node.type === 'sanctum')!
    const { ledgers, chain, node } = found
    expect(ledgers.run!.health).toBe(ledgers.run!.healthMax)

    const drink = mercyAct(node)
    // The engine still refuses the press, which is the belt to the suspender.
    expect(act(ledgers, drink)).toBe(ledgers)
    // art. 118: and the suspender is that the verb is not on the strip at all.
    const whole = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    expect(
      whole.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act.id] : [])),
    ).not.toContain('act.drink')

    // art. 40 unamended: the breath keeps. Come back open and it is there.
    const hurt = { ...ledgers, run: wounded(ledgers.run!, 7) }
    const later = enterRoom(hurt, chain, ROOM_BOOK, node.instance)
    expect(
      later.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act.id] : [])),
    ).toContain('act.drink')
    // card 69: and pressing it answers with the breath's own line, keyed on
    // the act. `mercy.breath` retired with `mercy.whole` — a second name for
    // one act's answer is a second thing to keep in step.
    expect(saysAct('act.drink').length).toBeGreaterThan(0)
  })
})

describe('art. 82 — once per instance, and only per instance', () => {
  /** Two fonts in one run, which the shipped depth does not deal but may. */
  function twoFonts(): Chain {
    const node = (step: number): ChainNode => ({
      instance: instanceOf(FONT, step),
      room: FONT as RoomId,
      type: 'sanctum',
      step,
      region: null as RegionId | null,
      doors: [{ at: 0, region: null, demands: [] }],
      fills: [{ socket: MERCY_SOCKET, encounter: BASIN }],
      announces: null,
    })
    return {
      seed: seedOf(1),
      depth: 1,
      length: FULL_DEPTH.length,
      start: instanceOf(FONT, 2),
      nodes: [node(2), node(5)],
      drift: FRESH_DRIFT,
    }
  }

  it('stops offering the breath in the instance it was taken in', () => {
    const chain = twoFonts()
    const here = chain.nodes[0]!
    let { ledgers } = opened(1)
    ledgers = { ...ledgers, run: movedTo(wounded(ledgers.run!, 6), { room: here.room, instance: here.instance, step: here.step, beat: 0 }) }
    // art. 68: the basin is a thing, and a thing is looked at before it is
    // drunk from. The tap is what puts Drink on the strip.
    ledgers = lookAround(ledgers, here)

    const before = enterRoom(ledgers, chain, ROOM_BOOK, here.instance)
    expect(before.tray.flatMap((o) => (o.kind === 'act' ? [o.act.id] : []))).toContain('act.drink')

    const after = act(ledgers, mercyAct(here))
    expect(after.run!.health).toBe(6 + breathOf(6, BARE_BODY.health, SANCTUM_BREATH))
    const again = enterRoom(after, chain, ROOM_BOOK, here.instance)
    expect(again.tray.flatMap((o) => (o.kind === 'act' ? [o.act.id] : []))).not.toContain(
      'act.drink',
    )
    // And a second press changes nothing, whatever presses it.
    expect(act(after, mercyAct(here)).run!.health).toBe(
      6 + breathOf(6, BARE_BODY.health, SANCTUM_BREATH),
    )
  })

  it('still offers it in a different instance of the same template', () => {
    const chain = twoFonts()
    const first = chain.nodes[0]!
    const second = chain.nodes[1]!
    let { ledgers } = opened(1)
    ledgers = { ...ledgers, run: movedTo(wounded(ledgers.run!, 6), { room: first.room, instance: first.instance, step: first.step, beat: 0 }) }
    // art. 68: looked at in the first font, and — art. 82 — that is looking
    // at the first font and not at the second.
    ledgers = lookAround(ledgers, first)

    const spent = act(ledgers, mercyAct(first))
    const moved: Ledgers = {
      ...spent,
      run: movedTo(spent.run!, {
        room: second.room,
        instance: second.instance,
        step: second.step,
        beat: 0,
      }),
    }
    // art. 68 is per-instance too: looking at the first font is not looking
    // at the second, so the second basin has to be tapped on its own before
    // it offers anything. That is the same law as the deed, from the other
    // side — and it is why this line is here rather than assumed.
    const unlooked = enterRoom(moved, chain, ROOM_BOOK, second.instance)
    expect(unlooked.tray.flatMap((o) => (o.kind === 'act' ? [o.act.id] : []))).not.toContain(
      'act.drink',
    )

    // art. 82: what you took *here* is gone from here, not from every copy.
    const looked = lookAround(moved, second)
    expect(
      enterRoom(looked, chain, ROOM_BOOK, second.instance).tray.flatMap((o) =>
        o.kind === 'act' ? [o.act.id] : [],
      ),
    ).toContain('act.drink')
    expect(act(looked, mercyAct(second)).run!.health).toBeGreaterThan(looked.run!.health)
  })

  it('shows the spent basin in the pixels, not only in the prose (art. 70)', () => {
    const chain = twoFonts()
    const here = chain.nodes[0]!
    let { ledgers } = opened(1)
    ledgers = { ...ledgers, run: movedTo(wounded(ledgers.run!, 6), { room: here.room, instance: here.instance, step: here.step, beat: 0 }) }

    const content = roomContent(here.room)
    const config = atGrid(GRID, 415)
    const sceneOf = (held: Ledgers) => content.scene(sceneStateOf(held, ROOM_BOOK, here))
    const namesIn = (held: Ledgers): readonly string[] => {
      const scene = sceneOf(held)
      return scene.props(viewOf(scene.shape, config)).map((prop) => prop.name)
    }
    const stampOf = (held: Ledgers): string => {
      let h = 2166136261 >>> 0
      for (const byte of renderRoom(sceneOf(held), config).frame.pixels) {
        h ^= byte
        h = Math.imul(h, 16777619) >>> 0
      }
      return h.toString(16)
    }

    expect(namesIn(ledgers)).toContain('the basin')
    expect(namesIn(ledgers)).not.toContain('the empty basin')
    const after = act(ledgers, mercyAct(here))
    expect(namesIn(after)).toContain('the empty basin')
    expect(namesIn(after)).not.toContain('the basin')
    // And the pixels say so, which is the half prose cannot do (art. 70).
    expect(stampOf(after)).not.toBe(stampOf(ledgers))
  })
})

describe('art. 40 — the Sanctum is promised, not left to chance', () => {
  it('deals one in every run of every policy, inside the band, exactly once', () => {
    for (const [name, make] of POLICIES) {
      for (let seed = 1; seed <= 1000; seed++) {
        const at = sanctumsIn(runOf(seed, make(seed)))
        expect(at, `${name} seed ${seed}`).toHaveLength(1)
        expect(at[0], `${name} seed ${seed}`).toBeGreaterThanOrEqual(BAND[0])
        expect(at[0], `${name} seed ${seed}`).toBeLessThanOrEqual(BAND[1])
      }
    }
  })

  it('keeps the band in the middle of the road, and before the lock', () => {
    // Not the Crossing, not the Warden's room, and — art. 78 — before the
    // region takes the rest of the depth, because the font is neutral.
    expect(BAND[0]).toBeGreaterThan(0)
    expect(BAND[1]).toBeLessThan(FULL_DEPTH.length - 1)
    expect(BAND[1]).toBeLessThan(FULL_DEPTH.lockAt)
    // And neutral it is: no region's pool holds it (arts 77–78).
    expect(FULL_DEPTH.neutral).toContain(FONT)
    for (const region of FULL_DEPTH.regions) expect(region.rooms).not.toContain(FONT)
  })

  it('lands at both ends of the band rather than always the same step', () => {
    const steps = new Set<number>()
    for (let seed = 1; seed <= 400; seed++) steps.add(sanctumsIn(runOf(seed, coinFlip(seed)))[0]!)
    expect(steps).toEqual(new Set([BAND[0], BAND[1]]))
  })

  /**
   * The control, so the guarantee is not a description of what happens
   * anyway: switch the promise off and the same thousand runs hold no
   * Sanctum at all, because its tendency is zero and nothing else deals it.
   */
  it('deals none at all the moment the promise is switched off', () => {
    const unpromised: Catalog = {
      ...CATALOG,
      depths: [{ ...FULL_DEPTH, mercies: [] }],
    }
    let held = 0
    for (let seed = 1; seed <= 300; seed++) {
      held += sanctumsIn(runWith(unpromised, GRAMMAR, seed, coinFlip(seed))).length
    }
    expect(held).toBe(0)
  })
})

describe('art. 40 — the Savior is a being, and a rare one', () => {
  it('floats into an ordinary room rather than being a room of its own', () => {
    // It is bound to nothing, so no room in the catalog is the Savior's.
    const mender = CATALOG.encounters.find((one) => one.id === MENDER)!
    expect(mender.binding).toBe('floating')
    expect(mender.at).toBeUndefined()
    expect(CATALOG.rooms.some((held) => held.type === 'savior')).toBe(false)
    // And every ordinary room declares the socket it can stand in (art. 83).
    //
    // Asked of the rooms the **generated** depth deals, which is what the
    // article is about: the Savior floats into the drift's pools, and
    // `FULL_DEPTH` is the plan that has them. The jungle-hell proof slice
    // deals no mercies at all (`JUNGLE_SLICE.mercies` is empty) and declares
    // only the sockets its fixed route uses, so asserting a Savior's landing
    // place over its five rooms would be asserting art. 40 about a depth that
    // does not offer art. 40.
    const ordinary = CATALOG.rooms.filter(
      (held) =>
        DEALT_BY_FULL_DEPTH.has(held.id as string) &&
        held.type !== 'crossing' &&
        held.type !== 'warden' &&
        held.type !== 'sanctum',
    )
    expect(ordinary.length).toBeGreaterThan(0)
    for (const held of ordinary) {
      const socket = held.sockets.find((one) => one.accepts === 'mercy')
      expect(socket, held.id as string).toBeDefined()
      expect(socket!.chance, held.id as string).toBeGreaterThan(0)
      expect(socket!.chance, held.id as string).toBeLessThan(0.5)
    }
  })

  it('appears in a minority of runs, and never twice in one', () => {
    let runsWithIt = 0
    for (let seed = 1; seed <= 500; seed++) {
      const held = heldIn(runOf(seed, coinFlip(seed)), MENDER as string)
      // Unique per run means once per run, whatever the drift does.
      expect(held, `seed ${seed}`).toBeLessThanOrEqual(1)
      if (held > 0) runsWithIt++
    }
    // Rare is a content knob, so this is a band and not a number: often
    // enough to be a thing that happens, seldom enough to be a mercy.
    expect(runsWithIt / 500).toBeGreaterThan(0.05)
    expect(runsWithIt / 500).toBeLessThan(0.5)
  })

  it('gives back all of what is missing, once, and asks for nothing', () => {
    const { chain, node } = withTheMender()
    let ledgers = withTheMender().ledgers
    ledgers = { ...ledgers, run: wounded(ledgers.run!, 3) }
    const kneel = mercyAct(node)
    expect(kneel.id).toBe('act.kneel')
    expect(kneel.verb).toBe(VERBS['act.kneel'])
    expect(kneel.needs).toEqual([])

    const after = act(ledgers, kneel)
    expect(after.run!.health).toBe(after.run!.healthMax)
    expect(after.run!.carried).toEqual(ledgers.run!.carried)
    // And it is spent: the room does not offer it twice.
    expect(
      enterRoom(after, chain, ROOM_BOOK, node.instance).tray.flatMap((o) =>
        o.kind === 'act' ? [o.act.id] : [],
      ),
    ).not.toContain('act.kneel')
  })
})

describe('art. 84 — the Savior is met, and it remembers', () => {
  it('writes the meeting down the moment you stand in the room with it', () => {
    const { ledgers } = withTheMender()
    expect(hasMet(ledgers.permanent, MENDER)).toBe(true)
  })

  it('marks what you did, on the permanent, through the memory socket', () => {
    const { node } = withTheMender()
    let ledgers = withTheMender().ledgers
    ledgers = { ...ledgers, run: wounded(ledgers.run!, 4) }
    // Nothing is remembered until the deed is done — a meeting is not a mark.
    expect(remembers(ledgers.permanent, MENDER)).toEqual([])
    const after = act(ledgers, mercyAct(node))
    expect(remembers(after.permanent, MENDER)).toEqual(['act.kneel'])
    // The same socket the merchant will use, and only one of them exists.
    expect(after.permanent.memories.map((one) => one.about)).toEqual([MENDER])
  })

  it('keeps the meeting and the mark through the death that burns the run', () => {
    const { node } = withTheMender()
    let ledgers = withTheMender().ledgers
    ledgers = { ...ledgers, run: wounded(ledgers.run!, 4) }
    const knelt = act(ledgers, mercyAct(node))

    const woken = routeDeath(knelt, 'end.gnawing')
    // The run burned: fresh road, fresh seed, whole body.
    expect(woken.run!.history.taken).toEqual([])
    expect(woken.run!.health).toBe(woken.run!.healthMax)
    // The meeting and the mark did not.
    expect(hasMet(woken.permanent, MENDER)).toBe(true)
    expect(remembers(woken.permanent, MENDER)).toEqual(['act.kneel'])
  })

  it('keeps them through a reload, which is the other way to lose them', () => {
    const { node } = withTheMender()
    let ledgers = withTheMender().ledgers
    ledgers = { ...ledgers, run: wounded(ledgers.run!, 4) }
    const knelt = act(ledgers, mercyAct(node))

    const { vault, kill } = killable()
    save(routeDeath(knelt, 'end.gnawing'), vault)
    const restored = load(kill())
    expect(restored).not.toBeNull()
    expect(hasMet(restored!.permanent, MENDER)).toBe(true)
    expect(remembers(restored!.permanent, MENDER)).toEqual(['act.kneel'])
  })

  it('respawns with the reseed, met or not (arts 11, 84)', () => {
    // The encounter belongs to the run and burns with it; having met it does
    // not. So a later run may put it in front of you again.
    const first = withTheMender()
    let dealtAgain = 0
    for (let seed = first.seed + 1; seed <= first.seed + 400; seed++) {
      if (heldIn(runOf(seed, coinFlip(seed)), MENDER as string) > 0) dealtAgain++
    }
    expect(dealtAgain).toBeGreaterThan(0)
  })
})
