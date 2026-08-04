import { describe, expect, it } from 'vitest'

import { BARE_BODY, HAND_SIZE, PLAIN_POUCH } from '../src/content/index.js'
import type { Seed, Vault } from '../src/state/index.js'
import { firstPermanent, load, save, snapshot, wake } from '../src/state/index.js'

/** A vault that can be killed: what was written is all that survives. */
function killableVault(): { vault: Vault; kill: () => Vault } {
  const written = new Map<string, string>()
  const open = (store: Map<string, string>): Vault => ({
    read: (key) => store.get(key) ?? null,
    write: (key, value) => void store.set(key, value),
  })
  return {
    vault: open(written),
    // The process dies; only the bytes on disk come back.
    kill: () => open(new Map(written)),
  }
}

describe('state — art. 36 (every mutation persists, boot restores exactly), art. 11 (two ledgers)', () => {
  it('restores mid-turn: kill the process anywhere and nothing is lost (art. 36)', () => {
    const { vault, kill } = killableVault()
    const seed = 20260804 as unknown as Seed

    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const ledgers = wake(permanent, seed)
    save(ledgers, vault)

    const restored = load(kill())
    expect(restored).not.toBeNull()
    expect(snapshot(restored!)).toEqual(snapshot(ledgers))
  })

  it('keeps the run and the permanent apart, except through the rituals (art. 11)', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const ledgers = wake(permanent, 1 as unknown as Seed)

    // The run burns; the permanent survives. Nothing crosses but by ritual.
    expect(ledgers.permanent.pouch.dice).toHaveLength(PLAIN_POUCH.dice.length)
    expect(ledgers.run).not.toBeNull()
    expect(ledgers.run!.hand.dice).toHaveLength(permanent.handSize)
  })
})
