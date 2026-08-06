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
import { hasLooked } from '../state/index.js'

/**
 * art. 66: which plain verb this door wears, or nothing at all.
 *
 * The words mean different journeys and art. 71 says no press may lie about
 * which — so the door that ends the depth says Descend once its keeper is
 * down, Fight while it is up, and Open everywhere else.
 *
 * **Null is the article.** A door held back by art. 3, or a lock that has
 * not been turned (card 67), offers no verb: the player gets the room's
 * answer instead, which is where the reason lives (art. 118).
 *
 * **card 95: and a door with a horror standing in the room offers nothing.**
 * The door-fight was the exception to the interaction model rather than an
 * expression of it — art. 68 says no verb exists until its thing is tapped,
 * and the horror was the one thing in the game you engaged by bumping into
 * something *else*. Its verb hangs off the horror now (`fightSummoned`), and
 * what the door has instead is an answer that says what is wrong (art. 118's
 * second clause, `door.guarded`).
 *
 * `guarded` is a fact about the **room** and not about the door, because that
 * is what is true: a horror is in the room with you, and the generator gives
 * every door of such a room the same fight. While it stands, none of them
 * gives; when it falls, all of them do.
 *
 * The keeper keeps its word. It stands in no socket, it is not in the hall
 * until the key turns (art. 37), and the ceremony that wakes it is already a
 * verb pressed about a thing.
 */
export type WayOn = 'open' | 'fight' | 'descend'

export function wayOn(
  ledgers: Ledgers,
  book: RoomBook,
  node: ChainNode,
  door: Door,
  keeperStanding: boolean,
  guarded = false,
): WayOn | null {
  // art. 3 and card 67 in one question: may this press take me out of here.
  if (!mayLeave(ledgers, book, node, door)) return null
  if (guarded) return null
  if (keeperStanding) return 'fight'
  return door.ends === true ? 'descend' : 'open'
}

/**
 * card 95, art. 68: **whether FIGHT is on the strip.**
 *
 * Looking is what summons the verb, and the horror is a thing in the world
 * like any other — so this is `summoned` asked about the one act in the game
 * that is not an `Act`. It is here rather than inside `main.ts` for the reason
 * the whole file exists: art. 118's guarantees are about what is *offered*,
 * and a question the harness cannot ask is a question CI cannot answer.
 *
 * `mark` is the horror's own tappable, which content names (`horrorMarkIn`);
 * null where nothing has teeth, and a room with nothing to fight offers no
 * verb however hard it is looked at.
 *
 * **`standing` is art. 118 and the harness found it.** The summons is
 * knowledge and lives on the ledger, so it survives everything — including the
 * thing it was about. A verb that outlived its horror is a press that cannot
 * change anything, which is precisely the article, and the first cut of this
 * function had one. The verb goes with the thing.
 */
export function fightSummoned(
  ledgers: Ledgers,
  node: ChainNode,
  mark: string | null,
  standing: boolean,
): boolean {
  if (!standing || mark === null) return false
  return hasLooked(ledgers.run ?? null, node.instance, mark)
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
