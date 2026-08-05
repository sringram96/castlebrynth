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
 * Five encounters ship. A plain horror that floats and repeats freely; a
 * special horror that floats, is unique per run, and wakes only when its
 * region locks; the iron key, which is not placed by any room at all —
 * art. 80 puts it in the path when the lock ahead demands it; and art. 40's
 * two mercies, which are the whole of the difference between a place and a
 * being. The basin is **bound**: it is what the font *is*, and it stands
 * there every time the font is dealt. The Mender **floats**, is rare, is
 * unique per run, and **remembers** — it is a being, so it can be anywhere,
 * and it is the last row of art. 83's straw table left unfilled.
 */

import type { Act, SocketWords, Tappable } from '../descent/index.js'
import type { Encounter, EncounterId, KeyId, RegionId } from '../gen/index.js'
import type { Prop, WorldMark } from '../room/index.js'
import type { ItemId, RoomId } from '../state/index.js'
import type { School } from './palettes.js'
import { lurker, stillBasin, theKey, theMender } from './plates/props.js'
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
export const BASIN = who('enc.basin')
export const MENDER = who('enc.mender')

/** The room the basin is bound to. It is what the font is (art. 83). */
export const FONT = 'room.sanctum.font' as RoomId

/**
 * art. 40 (ruled): what each tier restores, as a share of what is missing.
 * The Sanctum's breath is half; the Savior's mercy is all of it. Both are
 * free — the economy may one day add options beside them, never a price on
 * them. Tuning, and it lives here.
 */
export const SANCTUM_BREATH = 0.5
export const SAVIOR_MERCY = 1

/**
 * How often an ordinary room's mercy socket is filled of the dealer's own
 * accord — which is the Savior's rarity, and the only knob it has. Six
 * rooms in a depth can hold it, so this lands the Mender in roughly a fifth
 * of runs. Rarity is content's, not the engine's.
 */
export const SAVIOR_CHANCE = 0.04

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
  // art. 40: the place. Bound to the font and repeating freely — a second
  // font dealt in the same run is a second font, with its own basin in it.
  // Scope is about the *encounter*; once-per-instance is art. 82's business
  // and is kept by the deed, not by the scope.
  {
    id: BASIN,
    kind: 'mercy',
    binding: 'bound',
    scope: 'repeats',
    region: null,
    weight: 1,
    at: FONT,
  },
  // art. 40: the being. It floats into any room's mercy socket, at the
  // socket's own chance; it is unique per run; and it remembers.
  {
    id: MENDER,
    kind: 'mercy',
    binding: 'floating',
    scope: 'remembers',
    region: null,
    weight: 1,
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

/**
 * art. 40 (ruled): the small breath. Half of what is missing, free, once per
 * instance — the deed is written against where you stand (art. 82), so a
 * second font later in the run still offers its own.
 *
 * art. 66: the control is a plain imperative verb. The poetry is what the
 * word band says back.
 */
const DRINK: Act = {
  id: 'act.drink',
  verb: VERBS['act.drink'] ?? 'Drink',
  needs: [],
  gives: [],
  required: false,
  heals: SANCTUM_BREATH,
}

/**
 * art. 40 (ruled): the large mercy. All of what is missing, free, once —
 * and the Mender is unique per run, so once here is once for the run.
 *
 * art. 84: it remembers that you knelt. The meeting is written down by
 * standing in the room; this is the mark the deed leaves beside it.
 */
const KNEEL: Act = {
  id: 'act.kneel',
  verb: VERBS['act.kneel'] ?? 'Kneel',
  needs: [],
  gives: [],
  required: false,
  heals: SAVIOR_MERCY,
  remembers: MENDER,
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
    case BASIN:
      return {
        beats: SOCKET_BEATS[BASIN as string] ?? [],
        tappables: [tappable('basin.water', at)],
        acts: [DRINK],
      }
    case MENDER:
      return {
        beats: SOCKET_BEATS[MENDER as string] ?? [],
        tappables: [tappable('mender.figure', at)],
        acts: [KNEEL],
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
    // art. 70: a spent mercy stays spent, and it says so in pixels — the
    // basin stands dry and dull rather than simply vanishing, because what
    // a font has is not a thing you pick up.
    case BASIN:
      return stillBasin(school, at, done.includes('act.drink'))
    case MENDER:
      return theMender(school, at)
    default:
      return null
  }
}
