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
import type { Encounter, EncounterId, Fill, KeyId, RegionId } from '../gen/index.js'
import type { Good } from '../lots/index.js'
import type { Prop, WorldMark } from '../room/index.js'
import type { ItemId, RoomId } from '../state/index.js'
import { THE_LEECH, THE_SISTERS } from './dice.js'
import { RUSTED_PLATE, THE_CORD } from './items.js'
import type { School } from './palettes.js'
import { deadTraveler, goodOnFloor, leftMark, lurker, stillBasin, theKey, theMender } from './plates/props.js'
import { NOUNS, SOCKET_BEATS, VERBS } from './prose.js'
import { THE_CAREFUL, THE_PUSHER, THE_RUNNER } from './travelers.js'

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

/** art. 86: the three who came down here and did not come back. */
export const PUSHER = who('enc.traveler.pusher')
export const CAREFUL = who('enc.traveler.careful')
export const RUNNER = who('enc.traveler.runner')

/** arts 49, 87: the goods that lie on a floor rather than beside a body. */
export const SISTER_ELDER = who('enc.sister.elder')
export const SISTER_YOUNGER = who('enc.sister.younger')
export const LEECH_BONE = who('enc.leech')
export const CORD = who('enc.cord')
export const PLATE = who('enc.plate')

/**
 * How often the goods are dealt against each other. Rarity is content's, and
 * these are the bands the whole catalog is weighed in: a traveler is the
 * ordinary find, a talisman is the uncommon one, and the Sisters are the
 * thing a run is lucky to hold both halves of.
 */
export const RARITY = { common: 6, uncommon: 3, rare: 1 } as const

/**
 * arts 52, 86: the halves of the Sisters are banded apart, so no run can be
 * handed both before it has walked for the second. The elder is dealt in the
 * first half of the depth and the younger in the second — finding one always
 * means the other is below you, which is a goal the labyrinth gave you
 * rather than a quest handed to you.
 *
 * Both bands stop short of the Warden's room, which offers nothing.
 */
const ELDER_BAND = [1, 4] as const
const YOUNGER_BAND = [5, 7] as const

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
 * art. 86: how often an ordinary room's floor socket holds somebody, or
 * something somebody left. Six or seven rooms in a depth can hold it, so
 * this puts one or two finds in an average run — enough that a build is a
 * thing that happens, sparse enough that which one you got is the run.
 *
 * The key ignores it entirely (art. 80): a lock ahead fills this socket
 * whether or not the chance would have.
 */
export const FLOOR_CHANCE = 0.34

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
  // art. 86: the three travelers. Each floats — a body can lie anywhere —
  // and each is unique per run, because there is one of each of them and
  // they are already dead. They stand in the boon socket beside the key,
  // which is why art. 80 fills that socket first: a lock is owed, a bone
  // never is.
  {
    id: PUSHER,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.common,
  },
  {
    id: CAREFUL,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.common,
  },
  {
    id: RUNNER,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.common,
  },
  // arts 52, 87: two who went down together, banded apart so that finding
  // one half is a road and not a coincidence. art. 89: the elder stands in
  // a fork against the plate — build against body, and one of them.
  {
    id: SISTER_ELDER,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.rare,
    band: ELDER_BAND,
    orElse: PLATE,
  },
  {
    id: SISTER_YOUNGER,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.rare,
    band: YOUNGER_BAND,
  },
  // art. 89: sustain against consistency. The habit somebody carried into a
  // fight, or the bone of the one who never reached for anything.
  {
    id: LEECH_BONE,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.uncommon,
    orElse: CAREFUL,
  },
  {
    id: CORD,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.uncommon,
  },
  {
    id: PLATE,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.uncommon,
  },
]

/**
 * What each encounter leaves behind (arts 86–87).
 *
 * It is a map here rather than a field on the `Encounter` because the dealer
 * has no business knowing what a die is: `grants` is on the encounter
 * because winnability reads it (art. 33), and nothing in the engine reads
 * this. Every good in it is in `CATALOG_GOODS`, and the audit holds that
 * list to art. 54.
 */
const LEFT_BY: Readonly<Record<string, readonly Good[]>> = {
  [PUSHER]: [THE_PUSHER],
  [CAREFUL]: [THE_CAREFUL],
  [RUNNER]: [THE_RUNNER],
  [SISTER_ELDER]: [THE_SISTERS[0]],
  [SISTER_YOUNGER]: [THE_SISTERS[1]],
  [LEECH_BONE]: [THE_LEECH],
  [CORD]: [THE_CORD],
  [PLATE]: [RUSTED_PLATE],
}

/** Every encounter that leaves a good, for the catalog tests to walk. */
export const LEAVES_A_GOOD: readonly EncounterId[] = Object.keys(LEFT_BY) as EncounterId[]

/** What this encounter leaves, if it leaves anything (arts 86–87). */
export function leftBy(who: EncounterId): readonly Good[] {
  return LEFT_BY[who as string] ?? []
}

/** Which act picks up what an encounter left. One per encounter, by id. */
export function takeActId(who: EncounterId): string {
  return `act.take.${(who as string).replace(/^enc\./, '')}`
}

/**
 * art. 89: the deed a forfeited good leaves behind. It is not an act and
 * nothing presses it — it is the room's record of what closed, and it is
 * what the paint reads to know the difference between a thing you carried
 * out and a thing you left (art. 70).
 */
export function lostId(who: EncounterId): string {
  return `lost.${(who as string).replace(/^enc\./, '')}`
}

/**
 * arts 66, 86: the act that takes a dead traveler's die off the floor. A
 * plain imperative verb, and the whole of the poetry is what the word band
 * says back (`prose.ts`).
 *
 * art. 89: `forfeits` is set when this good stands in a fork — taking it
 * closes the other, and the closing is a deed like any other so the room
 * stops offering it and stops painting it in the same breath (arts 70, 82).
 */
function takeAct(who: EncounterId, forfeits?: EncounterId): Act {
  const id = takeActId(who)
  const base: Act = {
    id,
    verb: VERBS[id] ?? 'Take',
    needs: [],
    gives: [],
    // art. 4: optional treasure. Nothing here is required, so nothing here
    // holds a door — a bone left lying is a bone missed for this run.
    required: false,
    takes: LEFT_BY[who as string] ?? [],
    // art. 68: nothing is taken off a body you have not looked at.
    about: tapId(who),
  }
  // Two deeds, and both of them matter: the act id closes the tray's offer,
  // and the lost id is what the floor remembers (arts 70, 89).
  return forfeits === undefined
    ? base
    : { ...base, forfeits: [takeActId(forfeits), lostId(forfeits)] }
}

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
  // art. 68: and it is summoned by looking at the key, like anything else.
  // The door still refuses while it lies here (art. 3), so a player who has
  // not looked is stopped and pointed back at the room rather than walked
  // past it — which is the loop this article exists to make.
  about: 'key.iron',
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
  about: 'basin.water',
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
  about: 'mender.figure',
}

const tappable = (id: string, at: WorldMark): Tappable => ({ id, noun: NOUNS[id] ?? id, at })

/**
 * What an encounter says for itself, standing at the mark the room keeps for
 * that socket. The mark comes in because a thing that is tapped has to stand
 * somewhere (art. 68) — not because the room has anything to say about it.
 *
 * art. 89: `forfeit` is the other half of a fork, when this one is standing
 * in one. It reaches the act rather than the words — the terms are said once,
 * by the fork, and not twice by each side of it.
 */
export function encounterWords(
  id: EncounterId,
  at: WorldMark,
  forfeit?: EncounterId,
): SocketWords {
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
      // arts 86–87: everything else that stands in a socket is a good, and a
      // good says the same three things wherever it lies — its own candle,
      // the thing itself under the thumb, and one plain verb.
      if (leftBy(id).length > 0) {
        return {
          beats: SOCKET_BEATS[id as string] ?? [],
          tappables: [tappable(tapId(id), at)],
          acts: [takeAct(id, forfeit)],
        }
      }
      return { beats: [], tappables: [], acts: [] }
  }
}

/** The thing in the world a good is tapped as. Concrete and singular (voice). */
function tapId(who: EncounterId): string {
  return `${(who as string).replace(/^enc\./, '')}.thing`
}

/**
 * art. 89: a fork, laid end to end.
 *
 * The terms come first and in one candle — the room says plainly that taking
 * one closes the other, *before* either verb is on the strip (arts 66, 68) —
 * and then each side says its own words, standing to its own side of the
 * socket so the thumb can tell them apart (art. 68).
 *
 * A fill with no `orElse` is the ordinary case and passes straight through.
 */
export function fillWords(fill: Fill, at: WorldMark): SocketWords {
  if (fill.orElse === undefined) return encounterWords(fill.encounter, at)
  const apart = at.width * 0.6
  const mine = encounterWords(fill.encounter, { ...at, X: at.X - apart }, fill.orElse)
  const theirs = encounterWords(fill.orElse, { ...at, X: at.X + apart }, fill.encounter)
  return {
    beats: [...(SOCKET_BEATS['fork'] ?? []), ...mine.beats, ...theirs.beats],
    tappables: [...mine.tappables, ...theirs.tappables],
    acts: [...mine.acts, ...theirs.acts],
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
    case PUSHER:
    case CAREFUL:
    case RUNNER:
      // art. 86: a traveler is a body, and the body stays. What goes is the
      // bone out of its hand — so the prop knows whether it has been taken
      // and paints the hand open rather than vanishing the person (art. 70).
      return deadTraveler(school, at, done.includes(takeActId(id)))
    default:
      if (leftBy(id).length === 0) return null
      // art. 89: a good you took is on you and is simply gone; a good you
      // forfeited is closed, and what is left is the shape of it in the
      // dust. The two deeds are what tells them apart.
      if (done.includes(lostId(id))) return leftMark(school, at)
      return done.includes(takeActId(id)) ? null : goodOnFloor(school, at)
  }
}

/**
 * art. 89: the two halves of a fork stand to either side of the socket, the
 * same way the words lay them out. The paint and the thumb read the same
 * coordinates or the marks answer for the wrong thing (art. 68).
 */
export function fillProps(
  fill: Fill,
  school: School,
  at: WorldMark,
  done: readonly string[],
): readonly Prop[] {
  if (fill.orElse === undefined) {
    const one = encounterProp(fill.encounter, school, at, done)
    return one === null ? [] : [one]
  }
  const apart = at.width * 0.6
  return [
    encounterProp(fill.encounter, school, { ...at, X: at.X - apart }, done),
    encounterProp(fill.orElse, school, { ...at, X: at.X + apart }, done),
  ].filter((prop): prop is Prop => prop !== null)
}
