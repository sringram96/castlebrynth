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
import type { RoomBook } from '../descent/index.js'
import { mayLeave } from '../descent/index.js'
import type { Ledgers } from '../state/index.js'

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
 * art. 67: the acts the strip is holding right now.
 *
 * It is `offering` under the shell's own name, and it is a re-export rather
 * than a second filter on purpose. The first cut of this file wrote the four
 * conditions out again, and a deliberate regression of art. 118 was then
 * caught by the tray's copy and missed by the harness's — one rule with two
 * statements, which is what `offering`'s own note is about.
 */
export { offering as offeredActs } from '../descent/index.js'
