import { describe, expect, it } from 'vitest'

import { CATALOG, GRAMMAR, ROOM_BOOK } from '../src/content/index.js'
import { actsIn, enterRoom, look, looking, summoned, tappablesIn } from '../src/descent/index.js'
import type { ChainNode } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import type { Ledgers } from '../src/state/index.js'
import { MIGRATIONS, VAULT_KEY, VAULT_VERSION, hasLooked, load, memoryVault } from '../src/state/index.js'
import { DEALER, opened } from './drift.js'

/**
 * The summons (card 51, art. 68 strengthened).
 *
 * **An act about a thing does not exist until the thing has been tapped.**
 * The playtest found you could take something you had never looked at, which
 * is the immersion break this closes: the tap is the inspection, the word
 * band is the whole of it, and the verb is what looking leaves behind.
 *
 * There are no inspect buttons and no tooltips. A tooltip with an inspect
 * button in it is precisely the thing art. 68 abolished.
 */

/** The first room on this seed's road that has an act about a thing in it. */
function roomWithASummons(): { ledgers: Ledgers; chain: ReturnType<typeof hereIn> extends null ? never : ReturnType<typeof opened>['chain']; node: ChainNode; about: string } {
  for (let seed = 1; seed <= 200; seed++) {
    const { ledgers, chain } = opened(seed)
    const node = hereIn(chain)
    if (node === null) continue
    const one = actsIn(ROOM_BOOK, node).find((held) => held.about !== undefined)
    if (one !== undefined) return { ledgers, chain, node, about: one.about! }
  }
  throw new Error('no seed opened on a room with a summonable act')
}

/** The act ids the tray is offering right now. */
function offered(ledgers: Ledgers, chain: ReturnType<typeof opened>['chain'], node: ChainNode): readonly string[] {
  return enterRoom(ledgers, chain, ROOM_BOOK, node.instance).tray.flatMap((offer) =>
    offer.kind === 'act' ? [offer.act.id] : [],
  )
}

/** Standing where the shell would be standing, so `looking` keys correctly. */
function standing(ledgers: Ledgers, node: ChainNode): Ledgers {
  return {
    ...ledgers,
    run: {
      ...ledgers.run!,
      at: { room: node.room, instance: node.instance, step: node.step, beat: 0 },
    },
  }
}

describe('art. 68 — a verb is what looking leaves behind', () => {
  it('offers nothing about a thing that has not been tapped', () => {
    const { ledgers, chain, node, about } = roomWithASummons()
    const hidden = actsIn(ROOM_BOOK, node).filter((one) => one.about === about)
    expect(hidden.length).toBeGreaterThan(0)
    for (const one of hidden) expect(offered(ledgers, chain, node)).not.toContain(one.id)
  })

  it('offers it the moment the thing is tapped, and not before', () => {
    const { chain, node, about } = roomWithASummons()
    let ledgers = standing(roomWithASummons().ledgers, node)
    const one = actsIn(ROOM_BOOK, node).find((held) => held.about === about)!

    expect(summoned(ledgers.run, node.instance, one)).toBe(false)
    expect(offered(ledgers, chain, node)).not.toContain(one.id)

    const target = tappablesIn(ROOM_BOOK, node).find((held) => held.id === about)!
    // art. 6: looking answers, always — that is the inspection.
    expect(look(ROOM_BOOK, enterRoom(ledgers, chain, ROOM_BOOK, node.instance), target).text)
      .not.toBe('')
    ledgers = looking(ledgers, target)

    expect(hasLooked(ledgers.run, node.instance, about)).toBe(true)
    expect(summoned(ledgers.run, node.instance, one)).toBe(true)
    expect(offered(ledgers, chain, node)).toContain(one.id)
  })

  it('leaves an act about nothing alone — a room is a thing you stand in', () => {
    const { ledgers, node } = roomWithASummons()
    for (const one of actsIn(ROOM_BOOK, node)) {
      if (one.about !== undefined) continue
      expect(summoned(ledgers.run, node.instance, one), one.id).toBe(true)
    }
  })

  /** arts 70, 82: the world remembers, and it remembers per instance. */
  it('keeps the summons across leaving and coming back', () => {
    const { chain, node, about } = roomWithASummons()
    const target = tappablesIn(ROOM_BOOK, node).find((held) => held.id === about)!
    const looked = looking(standing(roomWithASummons().ledgers, node), target)

    // Walk away in the only sense the run has of it — stand somewhere else,
    // then stand here again. Nothing about the summons was in the bands.
    const away = standing(looked, { ...node, instance: `${node.room}#77` as typeof node.instance })
    const back = standing(away, node)
    expect(back.run!.at.instance).toBe(node.instance)
    expect(hasLooked(back.run, node.instance, about)).toBe(true)
    expect(offered(back, chain, node)).toContain(
      actsIn(ROOM_BOOK, node).find((held) => held.about === about)!.id,
    )
  })

  it('summons independently in two instances of one template (art. 82)', () => {
    const { chain, node, about } = roomWithASummons()
    const twin: ChainNode = { ...node, instance: `${node.room}#88` as typeof node.instance }
    const target = tappablesIn(ROOM_BOOK, node).find((held) => held.id === about)!
    const looked = looking(standing(roomWithASummons().ledgers, node), target)

    // Looked at here; not looked at there.
    expect(hasLooked(looked.run, node.instance, about)).toBe(true)
    expect(hasLooked(looked.run, twin.instance, about)).toBe(false)
    const one = actsIn(ROOM_BOOK, node).find((held) => held.about === about)!
    expect(offered(looked, chain, node)).toContain(one.id)
    // The twin is not in this chain — it is the same template dealt at
    // another step — so it is asked directly rather than through the bands.
    expect(summoned(looked.run, node.instance, one)).toBe(true)
    expect(summoned(looked.run, twin.instance, one)).toBe(false)
    void GRAMMAR
    void CATALOG
    void DEALER
  })

  it('never records a look for a run that is not there', () => {
    const { ledgers } = roomWithASummons()
    const noRun: Ledgers = { ...ledgers, run: null }
    const { node, about } = roomWithASummons()
    const target = tappablesIn(ROOM_BOOK, node).find((held) => held.id === about)!
    expect(looking(noRun, target)).toBe(noRun)
    expect(hasLooked(null, node.instance, about)).toBe(false)
  })
})

describe('art. 68 — the summons rides the vault', () => {
  it('carries a v4 snapshot forward with an empty set, keeping its run', () => {
    const vault = memoryVault()
    const { ledgers } = roomWithASummons()
    const run = { ...(ledgers.run as unknown as Record<string, unknown>) }
    delete run.looked
    vault.write(
      VAULT_KEY,
      JSON.stringify({ version: 4, ledgers: { run, permanent: ledgers.permanent } }),
    )

    const restored = load(vault)
    expect(restored).not.toBeNull()
    // The run is where it was: a summons change costs nobody a descent.
    expect(restored!.run!.seed).toBe(ledgers.run!.seed)
    expect(restored!.run!.at.instance).toBe(ledgers.run!.at.instance)
    // And it has looked at nothing, which is the honest answer — it never
    // recorded looking. The cost is the taps to look again.
    expect(restored!.run!.looked).toEqual([])
  })

  it('keeps the ladder gapless to the version this wave writes', () => {
    // Bumped by the threshold wave: 6 for the run's `descending` (the front
    // door may only offer Continue for a run that was begun) and 7 for
    // art. 116's preferences. Both rungs are the filling kind — nothing
    // about the arrangement moves — so no descent was lost to either.
    expect(VAULT_VERSION).toBe(7)
    expect(MIGRATIONS.map((one) => one.from).sort((a, b) => a - b)).toEqual(
      Array.from({ length: VAULT_VERSION - 1 }, (_, at) => at + 1),
    )
  })
})
