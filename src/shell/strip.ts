/**
 * The act strip's decisions, as functions rather than as DOM.
 *
 * **art. 118: nothing may be a dead press.** The whole of that article is a
 * question about what is *offered*, and until this file existed the answer
 * lived inside `main.ts` beside the code that builds a `<button>` — so the
 * only way to ask it was to run a browser, and the suite therefore never
 * asked it at all (the answer wave's card 74).
 *
 * Nothing here paints. Every function is a pure question about a room as it
 * stands, so the shell and the harness get the same answer from the same
 * code, and a regression is a failing test rather than a playtest.
 */

import type { ChainNode, Door } from '../gen/index.js'
import type { Act, RoomBook } from '../descent/index.js'
import { actsIn, afforded, mayLeave, moves, summoned } from '../descent/index.js'
import type { Ledgers } from '../state/index.js'
import { deedKey } from '../state/index.js'

/**
 * art. 66: which plain verb this door wears, or nothing at all.
 *
 * The three words mean three different journeys and art. 71 says no press
 * may lie about which — so the door that ends the depth says Descend once
 * its keeper is down, Fight while it is up, and Open everywhere else.
 *
 * **Null is the article.** A door held back by art. 3, or a lock that has
 * not been turned (card 67), offers no verb: the player gets the room's
 * answer instead, which is where the reason lives (art. 118).
 */
export type WayOn = 'open' | 'fight' | 'descend'

export function wayOn(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
  door: Door,
  keeperStanding: boolean,
): WayOn | null {
  // art. 3 and card 67 in one question: may this press take me out of here.
  if (!mayLeave(ledgers, book, node, door)) return null
  if (door.fight !== undefined || keeperStanding) return 'fight'
  return door.ends === true ? 'descend' : 'open'
}

/**
 * art. 67: the acts the strip is holding right now — what looking has
 * summoned (art. 68), what is afforded (card 67), what has not been done
 * here (art. 82), and what could still change something (art. 118).
 *
 * `enterRoom` already builds exactly this list into the bands; this asks the
 * same question of a room without needing a `Bands` in hand, which is what a
 * harness walking a depth has.
 */
export function offeredActs(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
): readonly Act[] {
  const run = ledgers.run
  return actsIn(book, node).filter(
    (one) =>
      summoned(run, node.instance, one) &&
      afforded(run, one) &&
      moves(ledgers, one) &&
      !(run?.did ?? []).includes(deedKey(node.instance, one.id)),
  )
}
