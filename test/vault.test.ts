import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  FIRST_DEPTH,
  GRAMMAR,
  HAND_SIZE,
  PLAIN_POUCH,
  opensAt,
} from '../src/content/index.js'
import { deal, nodeAt } from '../src/gen/index.js'
import type { Vault } from '../src/state/index.js'
import {
  THE_SCRAWL,
  MIGRATIONS,
  QUARANTINE_KEY,
  die,
  erase,
  VAULT_KEY,
  VAULT_VERSION,
  firstPermanent,
  load,
  quarantined,
  save,
  wake,
  woken,
} from '../src/state/index.js'

/**
 * The vault ladder (card 32, art. 11).
 *
 * The debt this closes: `load` used to answer a snapshot from another
 * version with `return null`, and the next `save` overwrote it. One schema
 * change would have eaten every Book of Ends in existence — the one thing
 * art. 11 promises survives everything.
 *
 * What replaces it: a chain of version-to-version migrations run in order,
 * and a quarantine for anything the chain cannot walk. Nothing is destroyed.
 */

/** A vault whose bytes can be read back out, and killed between boots. */
function killable(seeded: Readonly<Record<string, string>> = {}): {
  vault: Vault
  bytes: () => Readonly<Record<string, string>>
} {
  const written = new Map<string, string>(Object.entries(seeded))
  return {
    vault: {
      read: (key) => written.get(key) ?? null,
      forget: (key) => void written.delete(key),
      write: (key, value) => void written.set(key, value),
    },
    bytes: () => Object.fromEntries(written),
  }
}

/**
 * A v1 snapshot, as the build that wrote v1 wrote it: a permanent with no
 * wearables, no body, no hand size, no meetings — and a run with none of
 * art. 75's or the drift's fields on it.
 *
 * Two lines in its Book of Ends. Those two lines are the whole test.
 */
const V1 = JSON.stringify({
  version: 1,
  ledgers: {
    run: {
      seed: 41,
      depth: 1,
      health: 12,
      healthMax: 26,
      at: { room: 'room.crossing', step: 0, beat: 1 },
      carried: ['key.warden'],
    },
    permanent: {
      pouch: { dice: [{ id: 'bone.1', body: 6, faces: [{ value: 1 }] }] },
      signature: 'bone.1',
      keepsakes: [{ id: 'talisman.ossuary', species: 'value', value: { of: 6, times: 2 } }],
      known: [{ id: 'clue.tally', about: 'room.puzzle.tally' }],
      bookOfEnds: [
        { seed: 7, depth: 1, cause: 'end.gnawing' },
        { seed: 9, depth: 1, cause: 'end.marrow' },
      ],
    },
  },
})

describe('the vault ladder — art. 11 (the Book survives everything)', () => {
  it('runs a real migration: a v1 snapshot loads clean at the current version', () => {
    const { vault } = killable({ [VAULT_KEY]: V1 })
    const restored = load(vault)

    expect(restored).not.toBeNull()
    // The lines the ladder exists for, word for word — and above them the
    // one the reason wave puts at the head of every Book (art. 11).
    expect(restored!.permanent.bookOfEnds).toEqual([
      THE_SCRAWL,
      { seed: 7, depth: 1, cause: 'end.gnawing' },
      { seed: 9, depth: 1, cause: 'end.marrow' },
    ])
    // And the rest of the collection with it (art. 11).
    expect(restored!.permanent.pouch.dice).toHaveLength(1)
    expect(restored!.permanent.signature).toBe('bone.1')
    expect(restored!.permanent.keepsakes).toHaveLength(1)
    expect(restored!.permanent.known).toHaveLength(1)
  })

  it('fills the fields the older schemas never had, rather than leaving holes', () => {
    const { vault } = killable({ [VAULT_KEY]: V1 })
    const permanent = load(vault)!.permanent
    // art. 49's wearables axis, arts 47/60's body stats, art. 84's meetings.
    expect(permanent.wearables).toEqual([])
    expect(permanent.met).toEqual([])
    expect(permanent.memories).toEqual([])
    expect(permanent.handSize).toBeGreaterThan(0)
    expect(permanent.body.health).toBeGreaterThan(0)
  })

  /**
   * art. 36: a run is a position in an arrangement derived from a seed and a
   * choice history the old schemas never wrote down. It cannot be replayed,
   * so the ladder drops it and keeps what art. 11 actually promises.
   */
  it('drops the unreplayable run and keeps the permanent (arts 11, 36)', () => {
    const { vault } = killable({ [VAULT_KEY]: V1 })
    const restored = load(vault)!
    expect(restored.run).toBeNull()
    expect(restored.permanent.bookOfEnds).toHaveLength(3)
    // And the permanent it kept still wakes a run, which is the point.
    const up = wake(restored.permanent, 3 as never)
    expect(up.run).not.toBeNull()
    expect(up.permanent.bookOfEnds).toHaveLength(3)
  })

  /**
   * art. 11 — **and the boot has to actually use it.**
   *
   * The rung above hands back a permanent and no run, and the shell used to
   * read "no run" as "nothing here" and wake from the bare pouch. Every die,
   * every meeting and the whole Book went with it, one schema change after
   * the ladder was written to prevent exactly that. So the decision is a
   * function now, and this is the test standing over it.
   */
  it('wakes a dropped run off the permanent the ladder kept (arts 11, 36)', () => {
    const { vault } = killable({ [VAULT_KEY]: V1 })
    const restored = load(vault)!
    expect(restored.run).toBeNull()

    const bare = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const up = woken(restored, bare, 3 as never)

    // The player is intact: the Book, the pouch, everything the ladder kept.
    expect(up.permanent).toEqual(restored.permanent)
    expect(up.permanent.bookOfEnds).toHaveLength(3)
    expect(up.permanent).not.toEqual(bare)
    // And they are standing in a run again, which is what was actually lost.
    expect(up.run).not.toBeNull()
    expect(up.run!.seed).toBe(3)
  })

  it('wakes bare only when the vault holds nothing at all (art. 11)', () => {
    const bare = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const fresh = woken(null, bare, 4 as never)
    expect(fresh.permanent).toEqual(bare)
    expect(fresh.run).not.toBeNull()
  })

  it('stands a run back up exactly as it was found (arts 36, 75)', () => {
    const { vault } = killable()
    const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), 8 as never)
    save(ledgers, vault)
    const restored = load(vault)!
    expect(woken(restored, firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), 9 as never)).toBe(
      restored,
    )
  })

  it('walks every rung of the ladder, with no gap between them', () => {
    const rungs = MIGRATIONS.map((one) => one.from).sort((a, b) => a - b)
    expect(rungs).toEqual(
      Array.from({ length: VAULT_VERSION - 1 }, (_, i) => i + 1),
    )
    // And each one really changes the version it is walking.
    expect(new Set(rungs).size).toBe(rungs.length)
  })

  /**
   * **13 → 14: depth one became a different labyrinth.**
   *
   * The regression this exists for shipped and was found by a player rather
   * than by a test: the jungle-hell slice took depth one, and every saved run
   * in existence was standing in a room that depth no longer deals. `deal`
   * replayed the slice, `nodeAt` could not find `room.crossing#0` in it, and
   * the boot threw behind a black screen — the whole game, unreachable, with
   * the vault intact and unreadable behind it.
   *
   * The bug was not the slice. It was shipping a content change that moves an
   * arrangement without a rung on the ladder, which is the one thing the
   * ladder exists to catch (art. 11).
   */
  it('drops a run standing in a labyrinth that no longer deals it (arts 11, 36)', () => {
    const { vault } = killable()
    const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), 21 as never)
    save(ledgers, vault)
    // The save a player from before the slice is actually holding: the real
    // permanent this version writes, and a run on depth one at the Crossing.
    const held = JSON.parse(vault.read(VAULT_KEY)!)
    vault.write(
      VAULT_KEY,
      JSON.stringify({
        version: 13,
        ledgers: {
          permanent: held.ledgers.permanent,
          run: {
            ...held.ledgers.run,
            depth: 1,
            at: { room: 'room.crossing', instance: 'room.crossing#0', step: 0, beat: 0 },
            history: { taken: [] },
          },
        },
      }),
    )

    const restored = load(vault)
    // Not quarantined — the ladder walked it.
    expect(restored, 'a v13 snapshot must climb, not quarantine').not.toBeNull()
    expect(quarantined(vault)).toBeNull()
    // The position is gone, and nothing else is.
    expect(restored!.run).toBeNull()
    expect(restored!.permanent).toEqual(ledgers.permanent)
    expect(restored!.permanent.bookOfEnds).toEqual(ledgers.permanent.bookOfEnds)
    expect(restored!.permanent.pouch).toEqual(ledgers.permanent.pouch)

    // And the boot stands back up from it, in the room the depth it is
    // opening actually begins with — which is the whole of the crash.
    const up = woken(
      restored,
      firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY),
      22 as never,
      FIRST_DEPTH,
      opensAt(FIRST_DEPTH),
    )
    expect(up.run).not.toBeNull()
    expect(up.permanent.bookOfEnds).toEqual(ledgers.permanent.bookOfEnds)
    const chain = deal(up.run!.seed, up.run!.depth, CATALOG, GRAMMAR, up.run!.history)
    expect(
      nodeAt(chain, up.run!.at.instance),
      'the run must be standing in a room the dealer dealt',
    ).not.toBeNull()
  })

  it('leaves a current snapshot exactly as it found it', () => {
    const { vault } = killable()
    const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), 5 as never)
    save(ledgers, vault)
    const restored = load(vault)
    expect(restored!.permanent).toEqual(ledgers.permanent)
    expect(restored!.run!.seed).toBe(ledgers.run!.seed)
    // Nothing was set aside: there was nothing wrong with it.
    expect(quarantined(vault)).toBeNull()
  })
})

describe('the vault ladder — quarantine, not destruction', () => {
  it('sets aside bytes that are not a snapshot at all, and keeps them', () => {
    const { vault } = killable({ [VAULT_KEY]: 'not json {{{' })
    expect(load(vault)).toBeNull()
    expect(quarantined(vault)).toBe('not json {{{')
  })

  it('sets aside a snapshot from a build newer than this one', () => {
    const ahead = JSON.stringify({ version: VAULT_VERSION + 1, ledgers: { run: null, permanent: {} } })
    const { vault } = killable({ [VAULT_KEY]: ahead })
    expect(load(vault)).toBeNull()
    // Not rewritten, not downgraded, not lost. The newer build still has it.
    expect(quarantined(vault)).toBe(ahead)
  })

  it('sets aside a snapshot with no version, and one with a version it cannot use', () => {
    for (const bad of [{ ledgers: {} }, { version: 0, ledgers: {} }, { version: 'three' }]) {
      const written = JSON.stringify(bad)
      const { vault } = killable({ [VAULT_KEY]: written })
      expect(load(vault), written).toBeNull()
      expect(quarantined(vault), written).toBe(written)
    }
  })

  /**
   * The failure mode worth naming: a step that cannot find the permanent it
   * is meant to carry forward must refuse rather than invent an empty one.
   * A blank Book of Ends written over a real one is the old wipe in a new
   * coat, and it would be silent.
   */
  it('refuses rather than inventing a blank permanent, and keeps the bytes', () => {
    for (const broken of [
      JSON.stringify({ version: 1, ledgers: 'nonsense' }),
      JSON.stringify({ version: 1, ledgers: { run: null } }),
      JSON.stringify({ version: 2, ledgers: { permanent: 7 } }),
      // A current-version snapshot with nothing readable in it, which never
      // reaches the ladder at all.
      JSON.stringify({ version: VAULT_VERSION, ledgers: { run: null, permanent: null } }),
    ]) {
      const { vault } = killable({ [VAULT_KEY]: broken })
      expect(load(vault), broken).toBeNull()
      expect(quarantined(vault), broken).toBe(broken)
    }
  })

  it('never destroys the original — the fresh save goes to a different key', () => {
    const { vault, bytes } = killable({ [VAULT_KEY]: V1 })
    // A boot that quarantines, then a fresh waking written over the top.
    const broken = JSON.stringify({ version: 99, ledgers: {} })
    vault.write(VAULT_KEY, broken)
    expect(load(vault)).toBeNull()
    save(wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), 5 as never), vault)

    expect(bytes()[QUARANTINE_KEY]).toBe(broken)
    expect(bytes()[VAULT_KEY]).not.toBe(broken)
    // A second casualty does not overwrite the first: the interesting bytes
    // are the oldest ones, not the newest.
    vault.write(VAULT_KEY, 'garbage')
    expect(load(vault)).toBeNull()
    expect(bytes()[QUARANTINE_KEY]).toBe(broken)
  })

  it('reads nothing at all as nothing at all, and quarantines nothing', () => {
    const { vault, bytes } = killable()
    expect(load(vault)).toBeNull()
    expect(bytes()[QUARANTINE_KEY]).toBeUndefined()
  })
})

function freshLedgers() {
  return wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), 7 as never)
}

/**
 * art. 11, the reason wave (straw ruling, pending veto): **the Book of Ends
 * is not empty at the first waking.** One line already stands in it and it is
 * not yours — the record you spend the game adding yourself to was open
 * before you got here.
 *
 * The rung is what makes that true for a player who is already collecting
 * endings. It adds the line *above* theirs, because it is older than any of
 * them, and it takes nothing away.
 */
describe('the scrawl at the head of the Book — art. 11 (the reason wave)', () => {
  it('opens a first waking with exactly one line, and it is not an ending', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    expect(permanent.bookOfEnds).toEqual([THE_SCRAWL])
    // Not an ending, and honest about it: there is no run behind it, so it
    // has no seed to print and no depth to claim — which is what the reader
    // reads it by, rather than by asking which line it is.
    expect(permanent.bookOfEnds[0]!.seed).toBeNull()
    expect(permanent.bookOfEnds[0]!.depth).toBeNull()
  })

  it('keeps it there through a death, with yours written under it', () => {
    const ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), 11 as never)
    const after = die(ledgers, 'end.gnawing')
    expect(after.bookOfEnds.map((line) => line.cause)).toEqual([THE_SCRAWL.cause, 'end.gnawing'])
    expect(after.bookOfEnds[1]!.seed).toBe(ledgers.run!.seed)
  })

  it('gives an existing Book the scrawl above its own lines, and loses nothing', () => {
    const rung = MIGRATIONS.find((one) => one.from === 7)!
    const walked = rung.up({
      version: 7,
      ledgers: {
        run: { seed: 3, descending: true },
        permanent: {
          bookOfEnds: [
            { seed: 7, depth: 1, cause: 'end.gnawing' },
            { seed: 9, depth: 1, cause: 'end.marrow' },
          ],
        },
      },
    })
    const ledgers = walked.ledgers as {
      run: Record<string, unknown>
      permanent: { bookOfEnds: readonly Record<string, unknown>[] }
    }
    expect(ledgers.permanent.bookOfEnds).toEqual([
      THE_SCRAWL,
      { seed: 7, depth: 1, cause: 'end.gnawing' },
      { seed: 9, depth: 1, cause: 'end.marrow' },
    ])
    // The filling kind of rung: nobody mid-descent loses a descent to it.
    expect(ledgers.run.seed).toBe(3)
    expect(ledgers.run.descending).toBe(true)
  })

  it('does not grow a second copy of it on a Book that already has one', () => {
    const rung = MIGRATIONS.find((one) => one.from === 7)!
    const once = { version: 7, ledgers: { run: null, permanent: { bookOfEnds: [THE_SCRAWL] } } }
    const walked = rung.up(once) as { ledgers: { permanent: { bookOfEnds: readonly unknown[] } } }
    expect(walked.ledgers.permanent.bookOfEnds).toEqual([THE_SCRAWL])
  })

  it('fills a Book that was never written at all', () => {
    const rung = MIGRATIONS.find((one) => one.from === 7)!
    const walked = rung.up({ version: 7, ledgers: { run: null, permanent: {} } }) as {
      ledgers: { permanent: { bookOfEnds: readonly unknown[] } }
    }
    expect(walked.ledgers.permanent.bookOfEnds).toEqual([THE_SCRAWL])
  })

  /**
   * v8 shipped the line as an ending — a death that happened before yours.
   * The ruling as it stands is that it is the player's own hand, so a Book
   * written by that build is rewritten rather than left holding an id with no
   * words behind it, and nothing else in it moves.
   */
  it('rewrites the v8 line, which was an ending, and touches no other', () => {
    const rung = MIGRATIONS.find((one) => one.from === 8)!
    const walked = rung.up({
      version: 8,
      ledgers: {
        run: { seed: 5 },
        permanent: {
          bookOfEnds: [
            { seed: null, depth: null, cause: 'end.gone' },
            { seed: 7, depth: 1, cause: 'end.gnawing' },
          ],
        },
      },
    }) as {
      ledgers: { run: Record<string, unknown>; permanent: { bookOfEnds: readonly unknown[] } }
    }
    expect(walked.ledgers.permanent.bookOfEnds).toEqual([
      THE_SCRAWL,
      { seed: 7, depth: 1, cause: 'end.gnawing' },
    ])
    // And the descent it was standing in is where it was.
    expect(walked.ledgers.run.seed).toBe(5)
  })

  /**
   * Starting over is the player asking to be forgotten, and it does not
   * un-write the premise: the vault boots exactly as a new install does, and
   * a new install has the line in it.
   */
  it('is there again after a wipe, because a wipe is a first waking', () => {
    const { vault } = killable()
    save(freshLedgers(), vault)
    erase(vault)
    expect(load(vault)).toBeNull()
    expect(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY).bookOfEnds).toEqual([THE_SCRAWL])
  })
})

describe('starting over — the vault is emptied, and nothing is kept back', () => {
  /** A vault that remembers what it was told to forget, so the test can see. */
  function watched(): { vault: Vault; store: Map<string, string> } {
    const store = new Map<string, string>()
    return {
      store,
      vault: {
        read: (key) => store.get(key) ?? null,
        write: (key, value) => void store.set(key, value),
        forget: (key) => void store.delete(key),
      },
    }
  }

  it('leaves a machine that has never run the game (art. 11, the exception)', () => {
    const { vault, store } = watched()
    save(freshLedgers(), vault)
    expect(load(vault)).not.toBeNull()

    erase(vault)

    // Not an empty string, not an empty snapshot: gone. `load` has to be
    // able to tell "nothing was ever here" from "here is something I cannot
    // read", because it quarantines the second and wakes fresh on the first.
    expect(store.has(VAULT_KEY)).toBe(false)
    expect(load(vault)).toBeNull()
  })

  it('takes the quarantine with it, so nothing is quietly kept', () => {
    const { vault, store } = watched()
    // A snapshot no ladder can walk: quarantined rather than destroyed.
    vault.write(VAULT_KEY, JSON.stringify({ version: 999, ledgers: {} }))
    expect(load(vault)).toBeNull()
    expect(quarantined(vault)).not.toBeNull()

    erase(vault)

    // The quarantine exists so that nothing is thrown away by *accident*.
    // A player pressing this is not an accident, and a start-over that
    // quietly keeps a copy is only ever discovered by somebody who trusted
    // it.
    expect(quarantined(vault)).toBeNull()
    expect(store.size).toBe(0)
  })

  it('is safe on a vault that holds nothing at all', () => {
    const { vault } = watched()
    expect(() => erase(vault)).not.toThrow()
    expect(load(vault)).toBeNull()
  })
})
