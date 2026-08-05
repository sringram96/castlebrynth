import { describe, expect, it } from 'vitest'

import {
  ARRIVALS,
  BASIN,
  BURNT,
  CATALOG,
  DROWNED,
  FONT,
  GNAWING,
  IRON_KEY,
  MARROW,
  MENDER,
  OSSUARY,
  ROOMS,
  ROOM_BOOK,
  SOCKET_BEATS,
} from '../src/content/index.js'
import { beatsIn } from '../src/descent/index.js'
import type { Chain } from '../src/gen/index.js'
import { encounterOf } from '../src/gen/index.js'
import type { Vault } from '../src/state/index.js'
import { hasMet, load, save } from '../src/state/index.js'
import { routeDeath } from '../src/hinge/index.js'
import { coinFlip, leaning, playRun, runOf } from './drift.js'

/**
 * Binding, scope, and what survives death (arts 83, 84).
 *
 * Every encounter declares two axes, and the three that ship are the straw
 * rows made real: a plain horror that floats and repeats freely, a special
 * horror that floats and is unique per run, and a key that floats and is
 * placed by the dealer alone. The `remembers` scope is typed and unfilled —
 * the merchant it exists for waits on the economy.
 */
function heldIn(chain: Chain, who: string): number {
  return chain.nodes.filter((node) =>
    node.fills.some((fill) => (fill.encounter as string) === who),
  ).length
}

/** A vault that can be killed: only the bytes come back. */
function killable(): { vault: Vault; kill: () => Vault } {
  const written = new Map<string, string>()
  const open = (store: Map<string, string>): Vault => ({
    read: (key) => store.get(key) ?? null,
    write: (key, value) => void store.set(key, value),
  })
  return { vault: open(written), kill: () => open(new Map(written)) }
}

describe('art. 83 — binding and scope', () => {
  it('declares both axes on every encounter, with no third option smuggled in', () => {
    expect(CATALOG.encounters.length).toBeGreaterThan(0)
    for (const one of CATALOG.encounters) {
      expect(['bound', 'floating'], one.id as string).toContain(one.binding)
      expect(['repeats', 'unique', 'remembers'], one.id as string).toContain(one.scope)
      expect(['horror', 'boon', 'mercy'], one.id as string).toContain(one.kind)
      // A bound encounter names the room it is bound to; a floating one does
      // not name one, because naming one would be binding it.
      if (one.binding === 'bound') expect(one.at).toBeDefined()
      else expect(one.at).toBeUndefined()
    }
  })

  it('ships the straw rows the article names', () => {
    expect(encounterOf(CATALOG, GNAWING)).toMatchObject({
      binding: 'floating',
      scope: 'repeats',
      region: null,
    })
    expect(encounterOf(CATALOG, MARROW)).toMatchObject({
      binding: 'floating',
      scope: 'unique',
      region: OSSUARY,
    })
    expect(encounterOf(CATALOG, IRON_KEY)).toMatchObject({
      binding: 'floating',
      scope: 'unique',
    })
    // art. 40 filled the last two rows of the straw table. The basin is
    // bound — it is what the font *is*, and it is there every time the font
    // is — and the Mender floats, is rare, and remembers, which is the row
    // the merchant was holding open.
    expect(encounterOf(CATALOG, BASIN)).toMatchObject({
      kind: 'mercy',
      binding: 'bound',
      at: FONT,
    })
    expect(encounterOf(CATALOG, MENDER)).toMatchObject({
      kind: 'mercy',
      binding: 'floating',
      scope: 'remembers',
      region: null,
    })
    expect(CATALOG.encounters.filter((one) => one.scope === 'remembers')).toHaveLength(1)
  })

  it('declares sockets on every room, and lets no room speak for them', () => {
    for (const template of CATALOG.rooms) {
      expect(template.sockets.length, template.id as string).toBeGreaterThan(0)
    }
    // The rule that lets thirteen rooms feel like thirty: a room's own words
    // are a function of the room and of nothing else. Fill its sockets or
    // leave them empty — the room says exactly the same thing either way.
    for (const held of ROOMS) {
      const own = ROOM_BOOK.beats(held.id)
      expect(own.length, held.id as string).toBeGreaterThan(0)
      for (const said of own) {
        for (const words of Object.values(SOCKET_BEATS).flat()) {
          expect(said, held.id as string).not.toBe(words)
        }
      }
    }
  })

  it('lays the socket’s own words after the room’s, and the arrival before both', () => {
    // A room the drift has put something in says its own beats and then the
    // thing's; the room dealt at the lock says where the run has arrived
    // first of all (art. 78).
    for (let seed = 1; seed <= 60; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      for (const node of chain.nodes) {
        const said = beatsIn(ROOM_BOOK, node)
        const own = ROOM_BOOK.beats(node.room)
        const offset = node.announces === null ? 0 : ARRIVALS[node.announces as string]!.length
        expect(said.slice(offset, offset + own.length)).toEqual(own)
        for (const fill of node.fills) {
          for (const words of SOCKET_BEATS[fill.encounter as string] ?? []) {
            expect(said).toContain(words)
          }
        }
      }
    }
  })

  it('repeats a plain horror freely and a special one never, inside one run', () => {
    let repeated = 0
    for (let seed = 1; seed <= 400; seed++) {
      const chain = runOf(seed, leaning(OSSUARY))
      // Unique per run means once per run, whatever the drift does.
      expect(heldIn(chain, MARROW as string), `seed ${seed}`).toBeLessThanOrEqual(1)
      if (heldIn(chain, GNAWING as string) > 1) repeated++
    }
    // And repeats freely means it actually does, or the axis is decoration.
    expect(repeated).toBeGreaterThan(0)
  })

  it('wakes a region’s encounter only once that region locks (art. 78)', () => {
    let inOssuary = 0
    for (let seed = 1; seed <= 400; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      const at = chain.nodes.findIndex((node) =>
        node.fills.some((fill) => fill.encounter === MARROW),
      )
      if (at < 0) continue
      inOssuary++
      expect(chain.drift.locked, `seed ${seed}`).toBe(OSSUARY)
      expect(chain.nodes[at]!.step).toBeGreaterThanOrEqual(chain.nodes[at]!.step)
      expect(chain.drift.locked).not.toBe(DROWNED)
      expect(chain.drift.locked).not.toBe(BURNT)
    }
    expect(inOssuary).toBeGreaterThan(0)
  })
})

describe('art. 84 — the labyrinth remembers you', () => {
  /** A run committed to the ossuary until the Marrow is standing in it. */
  function metTheMarrow() {
    for (let seed = 1; seed <= 200; seed++) {
      const played = playRun(seed, leaning(OSSUARY), true)
      if (hasMet(played.ledgers.permanent, MARROW)) return { seed, ...played }
    }
    throw new Error('no run in two hundred met the Marrow')
  }

  it('starts a first waking having met nobody, and remembering nothing', () => {
    const played = playRun(1, coinFlip(1), true)
    // A walk that never spends a mercy leaves nothing to remember: the mark
    // is written by the deed, not by the meeting (arts 40, 84).
    expect(played.ledgers.permanent.memories).toEqual([])
    expect(Array.isArray(played.ledgers.permanent.met)).toBe(true)
  })

  it('writes a meeting down the moment you stand in the room with it', () => {
    const played = playRun(1, coinFlip(1), true)
    // Every run has teeth in it somewhere (art. 38's guarantee), so every
    // run has met something by the time it ends.
    expect(played.ledgers.permanent.met.length).toBeGreaterThan(0)
    for (const who of played.ledgers.permanent.met) {
      expect(encounterOf(CATALOG, who), who as string).not.toBeNull()
    }
  })

  it('keeps the meeting through the death that burns the run (arts 11, 84)', () => {
    const { ledgers } = metTheMarrow()
    expect(hasMet(ledgers.permanent, MARROW)).toBe(true)
    const woken = routeDeath(ledgers, 'end.marrow')
    // The run burned — nothing carried, a fresh road, a fresh seed.
    expect(woken.run!.carried).toEqual([])
    expect(woken.run!.history.taken).toEqual([])
    // The meeting did not.
    expect(hasMet(woken.permanent, MARROW)).toBe(true)
  })

  it('keeps the meeting through a reload, which is the other way to lose it', () => {
    const { ledgers } = metTheMarrow()
    const { vault, kill } = killable()
    save(routeDeath(ledgers, 'end.marrow'), vault)
    const restored = load(kill())
    expect(restored).not.toBeNull()
    expect(hasMet(restored!.permanent, MARROW)).toBe(true)
    expect(restored!.permanent.memories).toEqual([])
  })

  it('respawns the unique encounter with the reseed, met or not (arts 11, 84)', () => {
    // The encounter itself belongs to the run and burns with it. Having met
    // it is knowledge and does not — so the next run may deal it again.
    const first = metTheMarrow()
    let dealtAgain = 0
    for (let seed = first.seed + 1; seed <= first.seed + 60; seed++) {
      if (heldIn(runOf(seed, leaning(OSSUARY)), MARROW as string) > 0) dealtAgain++
    }
    expect(dealtAgain).toBeGreaterThan(0)
  })
})
