/**
 * The canonical-screen harness — development only.
 *
 * `?scene=canonical` puts the shell into the still that
 * `reference/visual/canonical-screen.png` is the target for: the dressed
 * ossuary lair, the Marrow standing in it, the lantern at the lower edge,
 * a body that is neither full nor nearly dead, and a fight open on a real
 * turn with a real intent on the crown. `?dice=n` draws the tray with a
 * different hand.
 *
 *     npm run dev
 *     …/?scene=canonical
 *     …/?scene=canonical&dice=3
 *     …/?scene=canonical&dice=8
 *
 * **It builds real state and then stands back.** The room is a real
 * `ChainNode` for a real authored room, the fight is a real `Fight` opened
 * through the real `openFight`, and the hand is a real hand of real dice.
 * Nothing about the fixture is a special path through the renderer or the
 * tray, because a fixture that renders differently from the game is a
 * fixture that lies about the game — which is the one thing a visual
 * reference surface may not do.
 *
 * **It is not player UI.** The caller gates it on `import.meta.env.DEV`, so
 * a built game has no route here at all. art. 118's rule about a press that
 * cannot change anything is about the *game*; this is a harness, and the
 * right way to keep it from becoming a debug control in the tray is for it
 * not to exist in the tray.
 */

import type { Chain, ChainNode, InstanceId, RegionId, RoomType } from '../gen/index.js'
import { FRESH_DRIFT } from '../gen/index.js'
import type { RoomId, Seed } from '../state/index.js'

/** What the query string asked for. Null when it asked for nothing. */
export interface CanonicalRequest {
  readonly dice: number | null
  readonly room: string | null
}

/**
 * Read the harness's request off a URL. Pure, so the parse is testable
 * without a browser and the shell has one thing to call.
 *
 * A `dice` that is not a number, or is negative, is ignored rather than
 * clamped: an unreadable request is not a request, and silently drawing six
 * when somebody typed `dice=lots` would hide the typo.
 */
export function canonicalRequest(search: string): CanonicalRequest | null {
  const query = new URLSearchParams(search)
  if (query.get('scene') !== 'canonical') return null
  const asked = query.get('dice')
  const dice = asked === null ? null : Number.parseInt(asked, 10)
  return {
    dice: dice !== null && Number.isFinite(dice) && dice >= 0 ? dice : null,
    room: query.get('room'),
  }
}

/**
 * The still's room, as a chain node.
 *
 * It is built rather than dealt because the fixture has to be the *same*
 * room every time (art. 17's determinism, said about a harness), and what
 * the generator deals depends on the drift, which depends on doors nobody
 * has opened. Two doors, because a chamber with one way out reads as a dead
 * end and the reference's corridor plainly goes on.
 */
export function canonicalNode(room: string, type: RoomType = 'lair'): ChainNode {
  return {
    instance: 'canonical' as InstanceId,
    room: room as RoomId,
    type,
    step: 0,
    region: 'ossuary' as RegionId,
    doors: [],
    fills: [],
    announces: null,
  }
}

/** A chain holding only the still. Nothing walks out of a fixture. */
export function canonicalChain(node: ChainNode, seed: Seed): Chain {
  return {
    seed,
    depth: 1,
    length: 1,
    start: node.instance,
    nodes: [node],
    drift: FRESH_DRIFT,
  }
}
