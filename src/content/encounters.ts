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
import {
  RUSTED_PLATE,
  THE_BOWL,
  THE_CHAIN,
  THE_CORD,
  THE_NOTCHED_STICK,
  THE_RING,
  THE_WHETSTONE,
  THE_ZEALOT,
} from './items.js'
import { REFUSALS } from './marks.js'
import { THE_SLIVER, THE_TIN_SAINT } from './trinkets.js'
import type { School } from './palettes.js'
import {
  GNAWING as GNAWING_BODY,
  KINDLED as KINDLED_BODY,
  MARROW as MARROW_BODY,
  SILT_MOTHER as SILT_MOTHER_BODY,
} from './plates/bestiary.js'
import {
  deadTraveler,
  goodOnFloor,
  leftMark,
  stillBasin,
  theKey,
  theMender,
  thing,
} from './plates/props.js'
import { NOUNS, SOCKET_BEATS, VERBS } from './prose.js'

/**
 * art. 100: past this depth a horror's drawing is not placed. The far
 * socket sits between 19 and 40 world units depending on the room's shape,
 * so this reaches every one of them and stops short of turning a body into
 * six grey pixels in the deepest hall.
 */
const HORROR_READABLE_TO = 46

/** art. 100: what the Kindled's cracks burn as, in any school. */
const EMBER_LIGHT = '#ff8a3c'
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
/**
 * art. 78, card 29: every region gets its unique. The Marrow was one
 * region's, which meant most runs met the Gnawing and nothing else — so the
 * drowned and the burnt get theirs, and arrival costs something everywhere.
 */
export const SILT_MOTHER = who('enc.silt-mother')
export const KINDLED = who('enc.kindled')
/**
 * art. 37 (as amended 2026-08-06), card 31: the keeper the door was built
 * for. It is deliberately **not** in `ENCOUNTERS` — it stands in no socket,
 * is never dealt and is never weighted, because there is one hall and that
 * is what makes it unique. The id exists so that art. 84 can remember
 * meeting it, and for nothing else.
 */
export const WARDEN_KEEPER = who('enc.warden')

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
 * card 90: **the levels, on the floor like anything else.** They are dealt
 * through the same boon socket the travelers stand in, at the same bands,
 * because the wave's whole claim about them is that they are one path in the
 * growth basket beside found dice and armor — not a system beside it.
 */
export const WHETSTONE = who('enc.whetstone')
export const CHAIN = who('enc.chain')
export const RING = who('enc.ring')
export const BOWL = who('enc.bowl')
export const NOTCH = who('enc.notch')
export const ZEALOT = who('enc.zealot')

/**
 * card 93: **the rolling goods, on the floor like anything else.** They are
 * dealt through the same boon socket every other find stands in, at the
 * rarest band, because the wave's own boundary is that zero of them is the
 * normal state of the game: most runs carry none for most of their length,
 * and the cap says only two may ever be carried at once (`ROLLING_CAP`).
 */
export const TIN_SAINT = who('enc.tin-saint')
export const SLIVER = who('enc.sliver')

/**
 * art. 125: **the bands, and each number is a share of finds.**
 *
 * A band's number says how often a filled socket lands *in that band*. It is
 * not a share of the whole pool and it is not a comparison between two goods:
 * adding an eighth good at `uncommon` dilutes the uncommon band and leaves
 * the common one exactly where it was.
 *
 * **Per-good rarity is the share divided among the band's members**, which is
 * what the words still mean. Three goods share `common` and seven share
 * `uncommon`, so an individual common find is better than twice as likely as
 * an individual uncommon one.
 *
 * **These first shares are chosen to hold the balance the levels wave
 * measured**, and that is deliberate: a semantics ruling may not smuggle in a
 * rebalance. Under the old relative draw the catalog's *effective* mix had
 * drifted to 40 / 47 / 13 — the seven uncommons outweighed the three commons,
 * which is a rarity nobody chose and the reason art. 125 exists — and 6/6/2
 * is that mix, now on purpose and stable against the next twenty goods. Any
 * change to it from here is a rebalance and owes a table (DESIGN.md).
 */
export const RARITY = { common: 6, uncommon: 6, rare: 2 } as const

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
  // card 29: the Marrow's row, twice more. Same binding, same scope, same
  // weight — the only thing that differs is which region has to lock before
  // they are awake, which is the whole of what makes them a region's.
  {
    id: SILT_MOTHER,
    kind: 'horror',
    binding: 'floating',
    scope: 'unique',
    region: DROWNED,
    weight: 6,
    horror: 'horror.silt-mother',
  },
  {
    id: KINDLED,
    kind: 'horror',
    binding: 'floating',
    scope: 'unique',
    region: BURNT,
    weight: 6,
    horror: 'horror.kindled',
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
  // card 90: the levels. Four at the talisman band the Cord already sits in,
  // and the two that measured largest one band rarer — the beggar's bowl,
  // because doubling art. 46's floor is the biggest single lift in the game,
  // and the Zealot, because doubling a whole turn is not a level at all.
  {
    id: WHETSTONE,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.uncommon,
  },
  {
    id: CHAIN,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.uncommon,
  },
  {
    id: RING,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.uncommon,
  },
  {
    id: NOTCH,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.uncommon,
  },
  {
    id: BOWL,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.rare,
  },
  {
    id: ZEALOT,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.rare,
  },
  // card 93: the two rolling goods, at the rarest band there is. They are the
  // add-on the wave says they are — a find that most runs never make — and
  // they sit in the boon socket rather than in one of their own, because a
  // socket of their own would be a system beside the growth basket instead of
  // one more path through it.
  {
    id: TIN_SAINT,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.rare,
  },
  {
    id: SLIVER,
    kind: 'boon',
    binding: 'floating',
    scope: 'unique',
    region: null,
    weight: RARITY.rare,
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
  [WHETSTONE]: [THE_WHETSTONE],
  [CHAIN]: [THE_CHAIN],
  [RING]: [THE_RING],
  [BOWL]: [THE_BOWL],
  [NOTCH]: [THE_NOTCHED_STICK],
  [ZEALOT]: [THE_ZEALOT],
  // card 93: a rolling good is a good, and it is taken off a floor by the
  // same act every other good is.
  [TIN_SAINT]: [THE_TIN_SAINT],
  [SLIVER]: [THE_SLIVER],
}

/** Every encounter that leaves a good, for the catalog tests to walk. */
export const LEAVES_A_GOOD: readonly EncounterId[] = Object.keys(LEFT_BY) as EncounterId[]

/**
 * art. 84 (extended, card 87): **which refusal each of these means.**
 *
 * The map is deliberately many-to-few. Three travelers share `bone` and two
 * sisters share `pair`, because what the labyrinth remembers is *the kind of
 * thing you walked past*, not which one — and the whole design of the card
 * is a small reusable set rather than a branch per good. Nine flags across
 * the game, and each lands in two or three later moments (`marks.ts`).
 */
const REFUSED_FOR: Readonly<Record<string, string>> = {
  [PUSHER]: REFUSALS.bone,
  [CAREFUL]: REFUSALS.bone,
  [RUNNER]: REFUSALS.bone,
  [SISTER_ELDER]: REFUSALS.pair,
  [SISTER_YOUNGER]: REFUSALS.pair,
  [LEECH_BONE]: REFUSALS.stain,
  [CORD]: REFUSALS.luck,
  [PLATE]: REFUSALS.iron,
  // card 90: a level is somebody's luck like the cord is, so it writes the
  // same flag. The vocabulary is deliberately small (art. 84) — what the
  // labyrinth remembers is the *kind* of thing walked past, and six pieces
  // of luck left lying are one refusal six times over.
  [WHETSTONE]: REFUSALS.luck,
  [CHAIN]: REFUSALS.luck,
  [RING]: REFUSALS.luck,
  [BOWL]: REFUSALS.luck,
  [NOTCH]: REFUSALS.luck,
  [ZEALOT]: REFUSALS.luck,
  // card 93: a rolling good left lying is a piece of luck left lying, which
  // is the flag the vocabulary already has for it (art. 84's small set).
  [TIN_SAINT]: REFUSALS.luck,
  [SLIVER]: REFUSALS.luck,
}

/** What this encounter leaves, if it leaves anything (arts 86–87). */
export function leftBy(who: EncounterId): readonly Good[] {
  return LEFT_BY[who as string] ?? []
}

/**
 * art. 84: which encounter a horror *is*, so that fighting one is meeting
 * it. Most horrors are met by standing in the room with them (`meetings`);
 * the Warden stands in no room until the key turns, so it is met by the
 * only thing that ever puts it in front of you.
 */
const MET_BY: Readonly<Record<string, EncounterId>> = {
  'horror.gnawing': GNAWING,
  'horror.marrow': MARROW,
  'horror.silt-mother': SILT_MOTHER,
  'horror.kindled': KINDLED,
  'horror.warden': WARDEN_KEEPER,
}

export function encounterOfHorror(id: string): EncounterId | null {
  return MET_BY[id] ?? null
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
    // art. 120: an object in the hand, which is the top of the return bar
    // and the only payload in the depth that is not knowledge. Nothing here
    // is priced — these are free, and art. 4's *missed* is the whole cost.
    pays: ['object'],
    // art. 84 (extended): and the flag the *not* taking of it writes. The
    // vocabulary is shared across the acts that mean the same refusal —
    // three travelers are one flag, because walking past a body is the same
    // thing whichever body it is.
    ...(REFUSED_FOR[who as string] === undefined
      ? {}
      : { refused: REFUSED_FOR[who as string] as string }),
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
  // art. 120: leverage — it is the one thing in the depth that opens
  // something. And it is `required`, which is exactly why art. 3 forbids it
  // ever carrying a price.
  pays: ['leverage'],
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
  // art. 120: a mercy pays in a permanent change to the body, and it pays
  // nothing for it. The bar is about *priced* acts; this is what the bar
  // looks like at a price of zero.
  pays: ['change'],
  about: 'basin.water',
  // art. 84 (extended): walking away from a free breath with blood on you
  // is a thing the labyrinth notices.
  refused: REFUSALS.breath,
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
  // art. 120: the large mercy, and a relationship beside it — art. 84's
  // memory is what makes the second meeting different from the first.
  pays: ['change', 'relationship'],
  about: 'mender.figure',
  refused: REFUSALS.hands,
}

const tappable = (id: string, at: WorldMark): Tappable => ({ id, noun: NOUNS[id] ?? id, at })

/**
 * card 95: **the deed a beaten horror leaves**, against the instance it fell
 * in (art. 82) — two copies of one Lair each keep their own.
 *
 * It is the Warden's `WARDEN_DOWN` said about the things that stand in
 * sockets, and it exists for the same reason: the room reads it to know
 * whether its doors are shut, its socket reads it to know whether to keep
 * speaking, and the paint reads it to know whether to draw anything.
 */
export const HORROR_DOWN = 'deed.horror-down'

/** Where a thing stands when nothing about the room is being asked. */
const ANYWHERE: WorldMark = { X: 0, Y: 0, z: 1, width: 1, height: 1 }

/**
 * card 95, art. 68: **the thing in the world a fight is summoned by tapping.**
 *
 * It is derived from the socket's own words rather than listed again here, so
 * a horror whose noun is renamed cannot end up with a verb hanging off a
 * tappable that no longer exists. Null for everything that is not a horror,
 * which is most of what stands in a socket.
 */
export function horrorTapOf(id: EncounterId): string | null {
  const one = ENCOUNTERS.find((held) => held.id === id)
  if (one === undefined || one.kind !== 'horror') return null
  return encounterWords(id, ANYWHERE).tappables[0]?.id ?? null
}

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
  done: readonly string[] = [],
): SocketWords {
  // card 95: **a horror that has fallen leaves the room.** Winning used to
  // walk you straight through the door you had bumped into, so nobody ever
  // stood in a room with a beaten thing in it; the fight is entered by tapping
  // the horror now, and won in the room, so the room has to stop saying it is
  // there. One candle, no prop (`encounterProp`), nothing left to tap —
  // art. 70, and it is the taken key's own pattern.
  if (done.includes(HORROR_DOWN) && horrorTapOf(id) !== null) {
    return { beats: SOCKET_BEATS[`${id as string}.down`] ?? [], tappables: [], acts: [] }
  }
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
    // card 29: a region's unique says its own candle and answers to its own
    // noun, standing where the far socket is like everything else with teeth.
    case SILT_MOTHER:
      return {
        beats: SOCKET_BEATS[SILT_MOTHER as string] ?? [],
        tappables: [tappable('mother.shape', { ...at, height: at.height * 1.3 })],
        acts: [],
      }
    case KINDLED:
      return {
        beats: SOCKET_BEATS[KINDLED as string] ?? [],
        tappables: [tappable('kindled.shape', { ...at, height: at.height * 1.15 })],
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
export function fillWords(fill: Fill, at: WorldMark, done: readonly string[] = []): SocketWords {
  if (fill.orElse === undefined) return encounterWords(fill.encounter, at, undefined, done)
  const apart = at.width * 0.6
  const mine = encounterWords(fill.encounter, { ...at, X: at.X - apart }, fill.orElse, done)
  const theirs = encounterWords(fill.orElse, { ...at, X: at.X + apart }, fill.encounter, done)
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
  // card 95, art. 70: **a beaten horror is not in the scene.** The fight is
  // won standing in the room now rather than on the way out of it, so the room
  // has to show that the thing is down — a body still filling the far end
  // while its verb is gone would be exactly the world remembering something
  // that did not happen.
  if (done.includes(HORROR_DOWN) && horrorTapOf(id) !== null) return null
  switch (id) {
    // art. 100, card 78: **and these two are drawn now as well.** They were
    // masses on the argument that a shape at the far end is what a horror
    // looks like before it is anything — but the drowned's unique and the
    // burnt's were already drawn at exactly that distance, so the argument
    // was only ever describing two rooms out of four. What art. 100 actually
    // says is the other thing: a horror a run meets more than once has to be
    // recognised the second time, and silhouette is most of legibility at
    // this scale. The thing standing at the end of the corridor is now the
    // thing that comes at you (`advanceBodyOf`), which is the whole of what
    // makes an advance read as an arrival rather than as a shape resolving.
    case GNAWING:
      return thing(
        school,
        GNAWING_BODY,
        { ...at, width: at.width * 1.25 },
        NOUNS['gnawing.shape'] ?? 'the shape',
        HORROR_READABLE_TO,
      )
    case MARROW:
      return thing(
        school,
        MARROW_BODY,
        { ...at, height: at.height * 1.25 },
        NOUNS['marrow.shape'] ?? 'the shape',
        HORROR_READABLE_TO,
      )
    // The school colours them, so one drawing is one thing in whatever key
    // the room is in.
    case SILT_MOTHER:
      return thing(
        school,
        SILT_MOTHER_BODY,
        { ...at, height: at.height * 1.3 },
        NOUNS['mother.shape'] ?? 'the shape',
        HORROR_READABLE_TO,
      )
    case KINDLED:
      return thing(
        school,
        KINDLED_BODY,
        { ...at, height: at.height * 1.15 },
        NOUNS['kindled.shape'] ?? 'the shape',
        HORROR_READABLE_TO,
        // art. 100: the cracks in it are a light that carries. Whatever is
        // burning in there is not the room's light, so the room does not
        // get to colour it — the burnt and the drowned alike.
        EMBER_LIGHT,
      )
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
