/**
 * What stands in a socket (arts 83, 84).
 *
 * Every encounter declares two axes. **Binding** — bound to a room, or
 * floating into whatever socket will take it. **Scope** — repeats freely,
 * unique per run, or remembers. Nothing here is a room's business: a room's
 * authored prose never assumes what fills its sockets, so the words an
 * encounter says are here, beside the encounter, and the room never speaks
 * for them. That rule is what lets a dozen rooms feel like thirty.
 *
 * Three encounters ship. A plain horror that floats and repeats freely; a
 * special horror that floats, is unique per run, and wakes only when its
 * region locks; and the iron key, which is not placed by any room at all —
 * art. 80 puts it in the path when the lock ahead demands it.
 *
 * The `remembers` scope is typed and unfilled. The merchant is the encounter
 * it exists for, and the merchant waits on the economy ruling.
 */

import type { Act, SocketWords, Tappable } from '../descent/index.js'
import type { Encounter, EncounterId, KeyId, RegionId } from '../gen/index.js'
import type { Prop, WorldMark } from '../room/index.js'
import type { ItemId } from '../state/index.js'
import type { School } from './palettes.js'
import { lurker, theKey } from './plates/props.js'
import { NOUNS, SOCKET_BEATS, VERBS } from './prose.js'

/** The one lock in the depth, and the one key that opens it (arts 33, 80). */
export const WARDEN_KEY = 'key.warden' as KeyId
/** The same thing, carried: run ledgers hold items, doors demand keys. */
export const WARDEN_KEY_ITEM = 'key.warden' as ItemId

const who = (id: string): EncounterId => id as EncounterId
const region = (id: string): RegionId => id as RegionId

/** art. 77: the three regions of the first depth. How many is content. */
export const DROWNED = region('region.drowned')
export const BURNT = region('region.burnt')
export const OSSUARY = region('region.ossuary')

export const GNAWING = who('enc.gnawing')
export const MARROW = who('enc.marrow')
export const IRON_KEY = who('enc.iron-key')

/**
 * art. 83's straw rows, made real.
 *
 * The Gnawing floats and repeats freely: it is the depth's ordinary teeth
 * and meeting it twice is not a bug. The Marrow floats and is unique per
 * run, and it is bound to a region rather than a room — it wakes only when
 * the drift arrives in the ossuary (art. 78), which is what a region's
 * encounters activating means. The key floats and is unique, and the dealer
 * alone decides where it goes (art. 80).
 */
export const ENCOUNTERS: readonly Encounter[] = [
  {
    id: GNAWING,
    kind: 'horror',
    binding: 'floating',
    scope: 'repeats',
    region: null,
    weight: 4,
    horror: 'horror.gnawing',
  },
  {
    id: MARROW,
    kind: 'horror',
    binding: 'floating',
    scope: 'unique',
    region: OSSUARY,
    weight: 6,
    horror: 'horror.marrow',
  },
  {
    id: IRON_KEY,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: 1,
    grants: [WARDEN_KEY_ITEM],
  },
]

/**
 * arts 3 and 80: the key is the depth's one required thing. The lock is
 * committed to before the player reaches it, so the dealer places this in
 * the path ahead of it — and while it lies unclaimed the room's doors
 * refuse, which is the belt to that suspender.
 */
const TAKE_THE_KEY: Act = {
  id: 'act.take-key',
  // art. 66: a control is a plain imperative verb, two words or fewer.
  verb: VERBS['act.take-key'] ?? 'Take',
  needs: [],
  gives: [WARDEN_KEY_ITEM],
  required: true,
}

const tappable = (id: string, at: WorldMark): Tappable => ({ id, noun: NOUNS[id] ?? id, at })

/**
 * What an encounter says for itself, standing at the mark the room keeps for
 * that socket. The mark comes in because a thing that is tapped has to stand
 * somewhere (art. 68) — not because the room has anything to say about it.
 */
export function encounterWords(id: EncounterId, at: WorldMark): SocketWords {
  switch (id) {
    case GNAWING:
      return {
        beats: SOCKET_BEATS[GNAWING as string] ?? [],
        tappables: [tappable('gnawing.shape', at)],
        acts: [],
      }
    case MARROW:
      return {
        beats: SOCKET_BEATS[MARROW as string] ?? [],
        tappables: [tappable('marrow.shape', { ...at, height: at.height * 1.35 })],
        acts: [],
      }
    case IRON_KEY:
      return {
        beats: SOCKET_BEATS[IRON_KEY as string] ?? [],
        tappables: [tappable('key.iron', at)],
        acts: [TAKE_THE_KEY],
      }
    default:
      return { beats: [], tappables: [], acts: [] }
  }
}

/**
 * art. 70: prose confirms, pixels prove. What stands in a socket is painted
 * where it stands — and when its act is done it is simply not in the scene,
 * because the floor it lay on is the floor again.
 */
export function encounterProp(
  id: EncounterId,
  school: School,
  at: WorldMark,
  done: readonly string[],
): Prop | null {
  switch (id) {
    case GNAWING:
      return lurker(school, at, false)
    case MARROW:
      return lurker(school, at, true)
    case IRON_KEY:
      return done.includes('act.take-key') ? null : theKey(school, at)
    default:
      return null
  }
}
