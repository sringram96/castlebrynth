import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  GRAMMAR,
  HAND_SIZE,
  PLAIN_POUCH,
  ROOM_BOOK,
  THE_PUSHER,
} from '../src/content/index.js'
import { chooseDoor } from '../src/descent/index.js'
import { deal, hereIn } from '../src/gen/index.js'
import type { Seed, Vault } from '../src/state/index.js'
import { collect, firstPermanent, load, save, snapshot, wake } from '../src/state/index.js'
import { DEALER, opened } from './drift.js'

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

  /**
   * art. 36 (amended): the history graph is the source of truth, and resume
   * replays it. Killing the app halfway down has to come back to the same
   * room, standing in the same instance, with the same tally behind it —
   * because everything else about the run is derived from those choices.
   */
  it('replays the history graph: the same room, the same tally, after a kill', () => {
    const { vault, kill } = killableVault()
    let { ledgers, chain } = opened(19)
    for (let n = 0; n < 5; n++) {
      const node = hereIn(chain)!
      const walked = chooseDoor(ledgers, chain, ROOM_BOOK, node.doors[0]!, DEALER)
      ledgers = walked.ledgers
      chain = walked.chain
    }
    save(ledgers, vault)

    const restored = load(kill())
    expect(restored).not.toBeNull()
    expect(restored!.run!.history.taken).toEqual(ledgers.run!.history.taken)

    // Nothing about the run was stored except the choices — the rooms come
    // back because they are replayed, not because they were written down.
    const replayed = deal(
      restored!.run!.seed,
      restored!.run!.depth,
      CATALOG,
      GRAMMAR,
      restored!.run!.history,
    )
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(chain))
    expect(restored!.run!.at).toEqual(ledgers.run!.at)
    expect(hereIn(replayed)!.instance).toBe(restored!.run!.at.instance)
    expect(replayed.drift).toEqual(chain.drift)
  })

  it('keeps the run and the permanent apart, except through the rituals (art. 11)', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const ledgers = wake(permanent, 1 as unknown as Seed)

    // The run burns; the permanent survives. Nothing crosses but by ritual.
    expect(ledgers.permanent.pouch.dice).toHaveLength(PLAIN_POUCH.dice.length)
    expect(ledgers.run).not.toBeNull()
    // arts 55, 60: a first waking is five bones against a hand size of six.
    // The hand is what the pouch can fill, and the shortfall is art. 55's
    // invitation rather than a bug in the assembly.
    expect(ledgers.run!.hand.dice).toHaveLength(PLAIN_POUCH.dice.length)
    expect(permanent.handSize).toBeGreaterThan(ledgers.run!.hand.dice.length)
  })

  /**
   * arts 56, 86: the first die you collect is the signature, and under the
   * travelers ruling it comes off somebody. It reaches the hand at the next
   * waking, not mid-run — art. 60 assembles the hand *for the descent*, so
   * the bone you find down here is the bone you go down with next time.
   */
  it('takes a traveler’s die into the pouch and the next hand (arts 56, 60, 86)', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const ledgers = wake(permanent, 1 as unknown as Seed)
    expect(ledgers.run!.hand.dice).toHaveLength(5)

    const found = collect(ledgers.permanent, THE_PUSHER)
    expect(found.signature).toBe(THE_PUSHER.id)
    // The run in flight keeps the hand it went down with.
    expect(ledgers.run!.hand.dice).toHaveLength(5)
    // The next one does not.
    expect(wake(found, 2 as unknown as Seed).run!.hand.dice).toHaveLength(HAND_SIZE)
  })
})
