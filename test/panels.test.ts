import { describe, expect, it } from 'vitest'

import { BARE_BODY, HAND_SIZE, PLAIN_POUCH, TABS, lintVoice } from '../src/content/index.js'
import type { Panel, Seed, Vault } from '../src/state/index.js'
import {
  HOME,
  MIGRATIONS,
  VAULT_KEY,
  VAULT_VERSION,
  firstPermanent,
  focused,
  load,
  memoryVault,
  save,
  wake,
} from '../src/state/index.js'

/**
 * The rail and the panels (card 50, arts 67, 90–92).
 *
 * The tray stopped showing every region at once. What the tests here hold is
 * the part of that which is law rather than layout: focus is state (art. 91),
 * it rides the vault like any other state, and it moves only by a declared
 * transition.
 */

const seedOf = (n: number): Seed => n as unknown as Seed
const opened = () => wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), seedOf(4))

describe('art. 91 — focus is state', () => {
  it('starts at home, which is where the room is played from', () => {
    expect(HOME).toBe('acts')
    expect(opened().run!.panel).toBe(HOME)
  })

  it('moves only by being told to, and says so in the ledger', () => {
    const run = opened().run!
    expect(focused(run, 'pouch').panel).toBe('pouch')
    expect(focused(focused(run, 'pouch'), 'fight').panel).toBe('fight')
    // A move to where you already are is not a move: the run is untouched,
    // so nothing downstream sees a change that did not happen.
    expect(focused(run, HOME)).toBe(run)
  })

  it('changes nothing else about the run', () => {
    const run = opened().run!
    const moved = focused(run, 'pouch')
    expect({ ...moved, panel: run.panel }).toEqual(run)
  })

  /** art. 75 applied to the tab bar: the lock screen may not move the thumb. */
  it('round-trips through the vault, on every panel there is', () => {
    for (const panel of ['acts', 'pouch', 'fight'] as readonly Panel[]) {
      const vault = memoryVault()
      const ledgers = opened()
      save({ ...ledgers, run: focused(ledgers.run!, panel) }, vault)
      const restored = load(vault)
      expect(restored, panel).not.toBeNull()
      expect(restored!.run!.panel, panel).toBe(panel)
    }
  })
})

describe('art. 91 — the vault carries the new field forward', () => {
  /**
   * The rung this wave added is the *good* kind: nothing about the
   * arrangement moved, so it fills the field and leaves the player standing
   * where they were. A tray change may not cost anybody a descent.
   */
  it('fills panel on a v3 snapshot without dropping its run', () => {
    const vault: Vault & { held: Map<string, string> } = Object.assign(memoryVault(), {
      held: new Map<string, string>(),
    })
    const ledgers = opened()
    // A v3 snapshot: everything this build writes, minus the field it added.
    const run = { ...(ledgers.run as unknown as Record<string, unknown>) }
    delete run.panel
    vault.write(
      VAULT_KEY,
      JSON.stringify({ version: 3, ledgers: { run, permanent: ledgers.permanent } }),
    )

    const restored = load(vault)
    expect(restored).not.toBeNull()
    // The run survived — same seed, same road, same room.
    expect(restored!.run).not.toBeNull()
    expect(restored!.run!.seed).toBe(ledgers.run!.seed)
    expect(restored!.run!.at.instance).toBe(ledgers.run!.at.instance)
    // And the new field is filled rather than missing.
    expect(restored!.run!.panel).toBe(HOME)
  })

  it('keeps the ladder gapless up to the current version', () => {
    expect(VAULT_VERSION).toBe(4)
    expect(MIGRATIONS.map((one) => one.from).sort((a, b) => a - b)).toEqual([1, 2, 3])
  })
})

describe('arts 90, 92 — the tabs', () => {
  it('names every panel there is, and the socket that has none', () => {
    expect(Object.keys(TABS).sort()).toEqual(['acts', 'fight', 'map', 'pouch'])
  })

  /**
   * art. 90: a tab is a label and not a control, so it answers to this
   * article rather than to art. 66 — a place, in one or two words.
   */
  it('holds every tab to art. 90 rather than to art. 66', () => {
    for (const [key, said] of Object.entries(TABS)) {
      expect(said.trim().split(/\s+/).length, key).toBeLessThanOrEqual(2)
      expect(said, key).not.toMatch(/[.!?,;:]/)
      // A label, judged as a label — the same lint every other name gets.
      expect(lintVoice(said, 'label'), key).toEqual([])
    }
  })

  /**
   * art. 92: the map is a socket. There is no panel behind it, and the panel
   * union is where that is enforced — a `Panel` value for the map cannot be
   * constructed, so nothing can focus it by accident.
   */
  it('leaves the map out of the panels entirely', () => {
    const panels: readonly Panel[] = ['acts', 'pouch', 'fight']
    expect(panels).not.toContain('map' as unknown as Panel)
    expect(Object.keys(TABS)).toContain('map')
  })
})
