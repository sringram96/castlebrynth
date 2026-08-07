import { describe, expect, it } from 'vitest'

import { BARE_BODY, GRID, HAND_SIZE, PLAIN_POUCH, ROOMS, atGrid } from '../src/content/index.js'
import { renderRoom } from '../src/room/index.js'
import type { AtTheDoor, DoorActs, VerbFactory } from '../src/shell/screens/threshold.js'
import { doorActs, doorWord } from '../src/shell/screens/threshold.js'
import type { SettingsView } from '../src/shell/screens/settings.js'
import { settingsSheet, settingsWord } from '../src/shell/screens/settings.js'
import type { Ledgers, Seed } from '../src/state/index.js'
import { instanceOf } from '../src/state/index.js'
import {
  MIGRATIONS,
  PLAIN_PREFS,
  QUARANTINE_KEY,
  VAULT_KEY,
  VAULT_VERSION,
  descending,
  die,
  exported,
  firstPermanent,
  importSnapshot,
  importable,
  inFlight,
  load,
  memoryVault,
  preferring,
  quarantined,
  save,
  wake,
} from '../src/state/index.js'

/**
 * The front door (card 61) and the settings behind it (card 62, art. 116).
 *
 * The threshold offers **only what is true**: art. 71 says no press may lie
 * about where it takes you, so a Continue that starts a fresh run is a lie
 * and a Descend that resumes one is another. Everything below is that claim,
 * asked of the two places it can go wrong — the state that answers it, and
 * the strip that draws it.
 */

const SEED = 7 as unknown as Seed

function fresh(): Ledgers {
  return wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), SEED)
}

// ── The strip, without a DOM ───────────────────────────────────────────
// The screens build DOM and nothing else, so what is worth testing is which
// verbs they offer. A stub strip and a stub verb factory answer that without
// dragging a document in behind them.

function pressed(at: AtTheDoor): readonly string[] {
  const keys: string[] = []
  const verb = ((key: string) => {
    keys.push(key)
    return {} as HTMLButtonElement
  }) as VerbFactory
  const strip = { replaceChildren: () => {}, append: () => {} } as unknown as HTMLElement
  doorActs(strip, at, {} as DoorActs, verb)
  return keys
}

const NOTHING: AtTheDoor = { inFlight: false, abandoning: false }

describe('the threshold — art. 71 (no press lies about where it takes you)', () => {
  it('offers Descend and never Continue when there is no run to come back to', () => {
    expect(pressed(NOTHING)).toContain('descend')
    expect(pressed(NOTHING)).not.toContain('continue')
    // And nothing to abandon, because there is nothing in flight.
    expect(pressed(NOTHING)).not.toContain('abandon')
  })

  it('offers Continue and never Descend when a run is in flight', () => {
    const held = pressed({ ...NOTHING, inFlight: true })
    expect(held).toContain('continue')
    expect(held).not.toContain('descend')
  })

  it('never puts Abandon and Descend on the same button (arts 5, 71)', () => {
    const held = pressed({ ...NOTHING, inFlight: true })
    expect(held).toContain('abandon')
    // Two different words, and the one that ends a run is not the one that
    // starts one. A run is not a thing to lose by mis-tapping.
    expect(held.filter((key) => key === 'abandon' || key === 'descend')).toEqual(['abandon'])
  })

  it('states what abandoning costs before the press that pays it', () => {
    const armed = { ...NOTHING, inFlight: true, abandoning: true }
    expect(doorWord(armed)).not.toBe(doorWord({ ...NOTHING, inFlight: true }))
    expect(doorWord(armed).length).toBeGreaterThan(0)
    // Armed, the strip is the two presses and nothing else: the one that
    // pays and the one that walks away.
    expect(pressed(armed)).toEqual(['abandon.all', 'keep'])
  })

  it('always offers settings, and offers nothing else it has not been told is true', () => {
    expect(pressed(NOTHING)).toEqual(['descend', 'settings'])
  })
})

describe('the threshold — a waking is not a descent', () => {
  it('says a fresh waking is not in flight, however complete the run looks', () => {
    const ledgers = fresh()
    expect(ledgers.run).not.toBeNull()
    // Everything about the run exists — it is dealt and standing there —
    // and nobody has gone into it. That is the distinction Continue needs.
    expect(inFlight(ledgers)).toBe(false)
  })

  it('says it is in flight once the press at the door has been pressed', () => {
    const ledgers = fresh()
    expect(inFlight({ ...ledgers, run: descending(ledgers.run!) })).toBe(true)
  })

  it('is not in flight again after an ending, because the ending wakes a new one', () => {
    const started = { ...fresh(), run: descending(fresh().run!) }
    const permanent = die(started, 'end.abandoned')
    // The opening line, and the abandoned run's under it.
    expect(permanent.bookOfEnds).toHaveLength(2)
    expect(inFlight(wake(permanent, SEED))).toBe(false)
  })

  it('carries a v5 snapshot forward by the one thing that cannot be wrong', () => {
    // A run that has taken a door was begun. A run standing at the Crossing
    // with an empty history was not. Nothing else in a v5 snapshot says.
    const rung = MIGRATIONS.find((one) => one.from === 5)!
    const walked = rung.up({
      version: 5,
      ledgers: { run: { history: { taken: [0, 1] } }, permanent: {} },
    })
    const stood = rung.up({
      version: 5,
      ledgers: { run: { history: { taken: [] } }, permanent: {} },
    })
    const runOf = (raw: Record<string, unknown>): Record<string, unknown> =>
      (raw.ledgers as { run: Record<string, unknown> }).run
    expect(runOf(walked).descending).toBe(true)
    expect(runOf(stood).descending).toBe(false)
    // And the run itself is where it was: a front door costs nobody a descent.
    expect(runOf(walked).history).toEqual({ taken: [0, 1] })
  })
})

// ── Settings (art. 116) ────────────────────────────────────────────────

describe('art. 116 — a setting changes how the game is shown, never what is true', () => {
  it('keeps a preference across a death, because dying is not changing your mind', () => {
    const ledgers = fresh()
    const permanent = preferring(ledgers.permanent, { reducedMotion: true })
    const after = wake(die({ ...ledgers, permanent }, 'end.abandoned'), SEED)
    expect(after.permanent.prefs.reducedMotion).toBe(true)
  })

  it('starts every player where nothing has been said', () => {
    expect(fresh().permanent.prefs).toEqual(PLAIN_PREFS)
  })

  it('fills a v6 snapshot with the plain preferences and keeps its run standing', () => {
    const rung = MIGRATIONS.find((one) => one.from === 6)!
    const filled = rung.up({
      version: 6,
      ledgers: { run: { seed: 3, descending: true }, permanent: { bookOfEnds: [{ seed: 3 }] } },
    })
    const ledgers = filled.ledgers as { run: Record<string, unknown>; permanent: Record<string, unknown> }
    expect(ledgers.permanent.prefs).toEqual(PLAIN_PREFS)
    expect(ledgers.permanent.bookOfEnds).toEqual([{ seed: 3 }])
    // The filling kind of rung: nothing about the arrangement moved.
    expect(ledgers.run.seed).toBe(3)
    expect(ledgers.run.descending).toBe(true)
  })

  it('changes no pixel of any room, because it is not an input to the cast', () => {
    // The claim the definition of done makes: reduced-motion on and off
    // differ in no pixel that is not part of a declared loop. It holds by
    // construction — a preference cannot reach the renderer, which takes a
    // scene and a configuration and nothing else — and this is the guard
    // against somebody later threading one through.
    const ledgers = fresh()
    const still = preferring(ledgers.permanent, { reducedMotion: true })
    expect(still.prefs.reducedMotion).toBe(true)
    for (const held of ROOMS.slice(0, 4)) {
      const state = {
        room: held.id,
        instance: instanceOf(held.id, 0),
        done: [],
        opened: [],
        horror: null,
        fills: [],
        doors: [{ at: 0, open: false, locked: false, turned: false, ends: false }],
      }
      const config = atGrid(GRID, 260)
      const once = renderRoom(held.scene(state), config).frame.pixels
      const twice = renderRoom(held.scene(state), config).frame.pixels
      expect(twice, held.id as string).toEqual(once)
    }
  })

  it('survives the whole ladder, written and read back', () => {
    const vault = memoryVault()
    const ledgers = fresh()
    save({ ...ledgers, permanent: preferring(ledgers.permanent, { reducedMotion: true }) }, vault)
    expect(load(vault)!.permanent.prefs.reducedMotion).toBe(true)
    expect(VAULT_VERSION).toBe(13)
  })
})

describe('art. 116 — the vault is the player’s', () => {
  it('exports the bytes on the shelf, not a fresh serialisation of them', () => {
    const vault = memoryVault()
    expect(exported(vault)).toBeNull()
    save(fresh(), vault)
    expect(exported(vault)).toBe(vault.read(VAULT_KEY))
  })

  it('brings a snapshot back in, whole', () => {
    const one = memoryVault()
    const ledgers = fresh()
    save({ ...ledgers, permanent: preferring(ledgers.permanent, { reducedMotion: true }) }, one)
    const text = exported(one)!

    const other = memoryVault()
    expect(importSnapshot(other, text)).toBe(true)
    expect(load(other)!.permanent.prefs.reducedMotion).toBe(true)
    expect(load(other)!.run!.seed).toBe(ledgers.run!.seed)
  })

  it('refuses what it cannot read rather than half-applying it', () => {
    const vault = memoryVault()
    save(fresh(), vault)
    const before = exported(vault)

    for (const bad of ['', 'not json', '{}', '{"version":999,"ledgers":{}}', '[]']) {
      expect(importable(bad), bad).toBe(false)
      expect(importSnapshot(vault, bad), bad).toBe(false)
      // The vault is exactly as it was. A refused import touches nothing.
      expect(exported(vault), bad).toBe(before)
    }
    expect(quarantined(vault)).toBeNull()
  })

  it('leaves no quarantine behind when it brings something in (card 32)', () => {
    const vault = memoryVault()
    // A snapshot this build cannot read, set aside rather than destroyed.
    vault.write(VAULT_KEY, 'these are not bytes anybody can read')
    expect(load(vault)).toBeNull()
    expect(quarantined(vault)).not.toBeNull()

    const other = memoryVault()
    save(fresh(), other)
    expect(importSnapshot(vault, exported(other)!)).toBe(true)
    // The set-aside bytes belonged to what was just replaced. Keeping them
    // would quarantine the *next* failure behind another install's.
    expect(vault.read(QUARANTINE_KEY)).toBeNull()
    expect(load(vault)).not.toBeNull()
  })

  it('says what it did, so the screen is never silent about it (art. 69)', () => {
    const view = (over: Partial<SettingsView>): SettingsView => ({
      prefs: PLAIN_PREFS,
      snapshot: null,
      quarantine: null,
      wiping: false,
      imported: null,
      ...over,
    })
    const lines = [
      settingsWord(view({})),
      settingsWord(view({ imported: 'took' })),
      settingsWord(view({ imported: 'refused' })),
      settingsWord(view({ wiping: true })),
    ]
    for (const line of lines) expect(line.length).toBeGreaterThan(0)
    expect(new Set(lines).size).toBe(lines.length)
  })

  it('stands export beside the wipe, which is the point of the confirmation', () => {
    const armed = settingsSheet({
      prefs: PLAIN_PREFS,
      snapshot: 'the last copy',
      quarantine: null,
      wiping: true,
      imported: null,
    })
    // Two presses, and the loss stated between them.
    expect(armed.flatMap((row) => (row.kind === 'verbs' ? row.keys : []))).toEqual([
      'wipe.all',
      'keep',
    ])
    // And the snapshot is on the screen the wipe is confirmed on: a player
    // about to lose their Book is one press from keeping a copy of it.
    expect(armed.flatMap((row) => (row.kind === 'box' ? [row.text] : []))).toContain(
      'the last copy',
    )
  })

  it('shows a set-aside snapshot, and only when there is one (card 32)', () => {
    const bare: SettingsView = {
      prefs: PLAIN_PREFS,
      snapshot: 'what is kept',
      quarantine: null,
      wiping: false,
      imported: null,
    }
    const boxes = (view: SettingsView): readonly string[] =>
      settingsSheet(view).flatMap((row) => (row.kind === 'box' ? [row.text] : []))
    expect(boxes(bare)).toEqual(['what is kept'])
    expect(boxes({ ...bare, quarantine: 'bytes nobody could read' })).toEqual([
      'what is kept',
      'bytes nobody could read',
    ])
  })

  it('holds nothing that could change what is true (art. 116)', () => {
    const sheet = settingsSheet({
      prefs: PLAIN_PREFS,
      snapshot: null,
      quarantine: null,
      wiping: false,
      imported: null,
    })
    const knobs = sheet.flatMap((row) => (row.kind === 'setting' ? [row.change] : []))
    // Every knob on the screen is a key of `Preferences`, and `Preferences`
    // is where the article's boundary is drawn. A difficulty, a rarity or a
    // drift weight cannot be expressed here without widening that type.
    const allowed = new Set(Object.keys(PLAIN_PREFS))
    for (const change of knobs) {
      for (const key of Object.keys(change)) expect(allowed.has(key), key).toBe(true)
    }
    expect(knobs.length).toBeGreaterThan(0)
  })
})
