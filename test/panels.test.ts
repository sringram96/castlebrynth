import { describe, expect, it } from 'vitest'

import { BARE_BODY, HAND_SIZE, PLAIN_POUCH, TABS, lintVoice } from '../src/content/index.js'
import type { FocusEvent, Panel, Seed } from '../src/state/index.js'
import {
  HOME,
  MIGRATIONS,
  VAULT_VERSION,
  firstPermanent,
  focused,
  load,
  memoryVault,
  panelAfter,
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
    // **Asked of the rung rather than of the whole climb.** This wave's rung
    // is the good kind and that is what is being tested; a snapshot walking
    // all the way to today now passes rung 13 → 14, which drops the run
    // because depth one is a different labyrinth. Reading the whole ladder
    // here would be testing that rung instead of this one.
    const rung = MIGRATIONS.find((one) => one.from === 3)!
    const ledgers = opened()
    const run = { ...(ledgers.run as unknown as Record<string, unknown>) }
    delete run.panel
    const climbed = rung.up({
      version: 3,
      ledgers: { run, permanent: ledgers.permanent },
    } as never) as unknown as { ledgers: { run: Record<string, unknown> } }

    // The run survived this rung — same seed, same road, same room.
    expect(climbed.ledgers.run).not.toBeNull()
    expect(climbed.ledgers.run.seed).toBe(ledgers.run!.seed)
    expect((climbed.ledgers.run.at as { instance: string }).instance).toBe(
      ledgers.run!.at.instance,
    )
    // And the new field is filled rather than missing.
    expect(climbed.ledgers.run.panel).toBe(HOME)
  })

  it('keeps the ladder gapless up to the current version', () => {
    // Bumped by the threshold wave: 6 for the run's `descending` (the front
    // door may only offer Continue for a run that was begun) and 7 for
    // art. 116's preferences. 8 is the reason wave, which puts the scrawl at
    // the head of every Book, and 9 is that line ceasing to be an ending. 10
    // is the company wave — a paused fight now carries what a bind took and
    // what a bleed is taking (art. 65). 11 is the descent wave's refusals, and
    // 12 is card 93's rolling goods, which are collectible and therefore
    // permanent. All of those are the filling kind — nothing about the
    // arrangement moves — so no descent was lost to any. 13 is the one
    // exception and it is a repair: a legacy five-slot hand against a pouch
    // that can fill six becomes six, because no shipped v12 mechanic writes
    // that value and carrying it forward manufactured a choosing screen.
    // 13 is the one repair — a legacy five-slot hand against a pouch that can
    // fill six becomes six — and **14 is the first rung since the drift to
    // drop a run.** The jungle-hell slice took depth one, so every saved
    // position is a position in a labyrinth that is no longer dealt there; the
    // permanent carries forward whole and only the descent is lost, which is
    // what art. 11 says a run costs.
    expect(VAULT_VERSION).toBe(14)
    expect(MIGRATIONS.map((one) => one.from).sort((a, b) => a - b)).toEqual(
      Array.from({ length: VAULT_VERSION - 1 }, (_, at) => at + 1),
    )
  })
})

describe('art. 91 — the transitions are a table, not a habit', () => {
  /**
   * The article's whole claim is that focus never moves by inference. A
   * table is the only shape of that you can read in one go — so it is read
   * in one go here, and every event the game has is in it.
   */
  it('puts the thumb in the fight when a fight starts, and only then', () => {
    expect(panelAfter('fight-opened')).toBe('fight')
    expect(panelAfter('fight-resumed')).toBe('fight')
  })

  it('puts it home on every way a fight can end', () => {
    for (const event of ['fight-won', 'fight-fled', 'died', 'finished'] as const) {
      expect(panelAfter(event), event).toBe(HOME)
    }
  })

  it('sends every declared event somewhere — none of them is a hole', () => {
    const events: readonly FocusEvent[] = [
      'fight-opened',
      'fight-resumed',
      'fight-won',
      'fight-fled',
      'died',
      'finished',
    ]
    const panels: readonly Panel[] = ['acts', 'pouch', 'fight']
    for (const event of events) expect(panels, event).toContain(panelAfter(event))
    // FIGHT is only ever reached by a fight beginning: nothing else in the
    // table lands there, so a tab that does not exist cannot be focused.
    const toFight = events.filter((event) => panelAfter(event) === 'fight')
    expect(toFight).toEqual(['fight-opened', 'fight-resumed'])
  })

  /** Nothing in the table sends the thumb to POUCH: only a tap does. */
  it('never moves the thumb to the pouch on its own', () => {
    const events: readonly FocusEvent[] = [
      'fight-opened',
      'fight-resumed',
      'fight-won',
      'fight-fled',
      'died',
      'finished',
    ]
    expect(events.some((event) => panelAfter(event) === 'pouch')).toBe(false)
  })
})

describe('art. 90 — the tabs', () => {
  /**
   * art. 67: FIGHT is not a tab. It is what the panel area *becomes* while a
   * fight is on — the ground the tray sits on rather than a place you go —
   * so it is deliberately absent from the rail, and a fight puts you there
   * without your having to find it.
   */
  it('names the places you can go', () => {
    expect(Object.keys(TABS).sort()).toEqual(['acts', 'pouch'])
    expect(Object.keys(TABS)).not.toContain('fight')
  })

  it('still has a FIGHT panel for the fight to become', () => {
    // The panel exists and the table sends a fight to it — it simply has no
    // label on the rail, which is the whole of the change.
    const panels: readonly Panel[] = ['acts', 'pouch', 'fight']
    expect(panels).toContain('fight')
    expect(panelAfter('fight-opened')).toBe('fight')
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
   * art. 92 is repealed: the disabled Map socket was placeholder chrome, so
   * there is no longer a label for it either. The panel union remains where
   * the absence is enforced — a `Panel` value for the map cannot be
   * constructed, so nothing can focus it by accident.
   */
  it('leaves the map out of the panels entirely', () => {
    const panels: readonly Panel[] = ['acts', 'pouch', 'fight']
    expect(panels).not.toContain('map' as unknown as Panel)
    expect(Object.keys(TABS)).not.toContain('map')
  })
})
