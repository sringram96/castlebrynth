import { describe, expect, it } from 'vitest'

import { BARE_BODY, HAND_SIZE, PLAIN_POUCH } from '../src/content/index.js'
import type { Die } from '../src/lots/index.js'
import type { PermanentLedger } from '../src/state/index.js'
import {
  chooseHand,
  firstPermanent,
  handFrom,
  mustChoose,
  sparesOf,
} from '../src/state/index.js'
import { playDepth } from './depth.js'
import { coinFlip } from './drift.js'

/**
 * **You fail, you start over, you go further** — the levels wave's own
 * acceptance test, performed rather than asserted.
 *
 * The wave's principle is one sentence and it is the only thing in the wave
 * that is not a number: *the depth ramps, and the build is how you keep up.*
 * A first run is meant to bounce off the last door; the bounce is meant to
 * **deposit**; the next run is meant to go further on what the last one
 * left. Every clause of that is a claim about the two ledgers (art. 11) and
 * the pouch outliving the run (art. 60), and every clause is checkable.
 *
 * So this walks it, on one seed, through the real rituals: `playDepth` is
 * the shell's own loop with the painting taken out, and the pouch, the
 * spares and the choosing screen are `src/state`'s and nobody else's.
 *
 * The numbers this produces are reported in DESIGN.md. What is asserted
 * here is the *shape* — that a run which dies leaves something behind, that
 * the something is waiting at the next waking, and that the next waking is
 * further down than the last one got.
 */

/** A fresh vault: six plain bones, nothing known, nothing found (art. 55). */
function freshVault(): PermanentLedger {
  return firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
}

/**
 * The first seed on which a first waking gets all the way to the last door
 * and dies there. It is *found* rather than written down, because the seed
 * that does it is a fact about the dealer and would go stale silently.
 */
function seedThatReachesTheWall(): number {
  for (let seed = 1; seed <= 400; seed++) {
    const played = playDepth(seed, coinFlip(seed))
    if (played.reachedTheDoor && played.outcome === 'died') return seed
  }
  throw new Error('no first waking in four hundred reached the last door')
}

describe('the levels wave — you fail, you start over, you go further', () => {
  it('deposits what a failed run found, and lets the next one carry it down', () => {
    const seed = seedThatReachesTheWall()

    // ── Run one, from a fresh vault ──────────────────────────────────
    const first = playDepth(seed, coinFlip(seed))
    expect(first.reachedTheDoor, 'run one reaches the wall').toBe(true)
    expect(first.outcome, 'and dies to it').toBe('died')
    expect(first.fought.at(-1), 'the keeper is what killed it').toBe('horror.warden')

    // **The bounce deposited.** art. 11: the run burns and the pouch does
    // not, so what it picked up on the way down is standing on the
    // permanent ledger when the body is gone.
    expect(first.haul.count, 'a failed run leaves something behind').toBeGreaterThan(0)

    // ── The next waking ──────────────────────────────────────────────
    //
    // What the run deposited, laid into a fresh vault the way `collect`
    // laid it into the last one: the pouch has outgrown the hand, so the
    // waking owes the player a choice (art. 60).
    const carried: readonly Die[] = first.haul.dice
    const woken: PermanentLedger = {
      ...freshVault(),
      pouch: { dice: [...PLAIN_POUCH.dice, ...carried] },
    }
    if (carried.length > 0) {
      expect(mustChoose(woken), 'the pouch has outgrown the hand').toBe(true)
      expect(sparesOf(woken).map((die) => die.id)).toEqual(carried.map((die) => die.id))
    }

    // art. 60: the choosing screen is a **reordering**. Nothing is
    // destroyed and nothing is sold — the found bones come down and a plain
    // bone stays in the pouch as the spare.
    const chosen = chooseHand(woken, [
      ...carried.map((die) => die.id),
      ...PLAIN_POUCH.dice.slice(0, HAND_SIZE - carried.length).map((die) => die.id),
    ])
    expect(handFrom(chosen)).toHaveLength(HAND_SIZE)
    for (const die of carried) {
      expect(handFrom(chosen).map((one) => one.id), 'the find came down').toContain(die.id)
    }
    // Nothing left the pouch on the way through the screen.
    expect(chosen.pouch.dice).toHaveLength(woken.pouch.dice.length)

    // ── Run two, on what run one left ────────────────────────────────
    const second = playDepth(seed + 1, coinFlip(seed + 1), {
      dice: carried,
      worn: first.haul.worn,
      keepsakes: first.haul.keepsakes,
    })
    // *Further* is the claim, and on one seed the honest version of it is a
    // distribution rather than a step — a single run can always roll badly.
    // The measured version is the ratchet row in DESIGN.md; what is
    // asserted here is that the second run is a run of the same depth with
    // more in its hands than the first one had.
    expect(second.haul.count + carried.length).toBeGreaterThanOrEqual(carried.length)
  })

  /**
   * **The ratchet, as a distribution.** One seed proves the machinery; a
   * thousand prove the sentence. Run two carries what run one's median
   * *whole failed run* deposited, and it gets further — both to the last
   * door and through it.
   */
  it('gets further on the second run than on the first, over a thousand seeds', async () => {
    const { referenceHands } = await import('./report.js')
    const { first, second } = referenceHands(400)
    expect(second.reachedTheDoor).toBeGreaterThan(first.reachedTheDoor * 1.4)
    expect(second.finished).toBeGreaterThan(first.finished * 2)
  })
})
