/**
 * What a room *is*, as vocabulary.
 *
 * A room used to answer two questions at once: **what happens here**, and
 * **where does this lead**. The second one made every authored room name
 * another authored room, which is the coupling that made the slice a graph you
 * could only extend by editing the whole of it.
 *
 * So the split this file exists to state:
 *
 *   - a **`RoomTemplate`** owns what happens inside the room — its art, its
 *     copy, its details, its ritual, its worked objects. It is a reusable
 *     *place*, and it names no destination anywhere.
 *   - the generated **`RunMap`** owns where that place leads. See
 *     `src/game/map.ts`.
 *
 * Three orthogonal words describe a template, and keeping them apart is what
 * lets the library grow without the director changing:
 *
 *   - **role** — the dramatic job. *A fight goes here.*
 *   - **territory** — where in the world it is. *This is bone country.*
 *   - **composition** — what the picture can hold. *This is a long corridor
 *     with its far end visible.*
 *
 * A later room may be `encounter` + `frozen` + `long-axis` and the director
 * will place it without a line of it changing. What may never happen is
 * content being dropped into art that cannot support it — which is what
 * `composition` and `encounterTags` are for, and why they are content rather
 * than staging.
 */

import type { RewardId } from './rewards.js'

export interface Detail {
  readonly id: string
  /** What the tap says. Leads with the plain noun. */
  readonly says: string
  /** Where the hit region sits, in fractions of the world box. */
  readonly at: { readonly x: number; readonly y: number }
  /** Whether this is the one thing the eye should find. */
  readonly focal?: boolean
}

/**
 * The one thing in the room that is pressed rather than looked at.
 *
 * A detail answers and moves nothing. A ritual *commits*: the reducer rolls,
 * the run changes, and the room records what it gave. Like an enemy, it holds
 * the exits shut until it is resolved — which is why it is content rather than
 * a class the view could forget to apply.
 */
export interface Ritual {
  /** The prop's art family. Its frames are `<art>.idle` and `<art>.1`–`.6`. */
  readonly art: string
  /** The name of the thing, for the well. */
  readonly name: string
  /** What the press says. Two words or fewer — it goes on a button. */
  readonly label: string
  readonly describe: string
  /** Where the object sits, in fractions of the world box. */
  readonly at: { readonly x: number; readonly y: number }
  /** What the well says before it is used. */
  readonly prompt: string
}

/**
 * One object in a room that can be worked, and remembers being worked.
 *
 * The third kind of thing in a room, and the one the slice was missing. A
 * `Detail` answers and moves nothing. A `Ritual` commits once and holds the
 * exits shut until it has. An interactable is neither: it has a **position of
 * its own** that survives a reload, several of them can stand in one room, and
 * what any of them will do depends on where the others are standing.
 *
 * What is here is only what does not change: the id the reducer switches on,
 * the art family, and where the object sits. Everything that *does* change —
 * the verb on the button, whether there is a button at all, which frame is up —
 * is a function of state and lives in `content/interactions.ts`, because a
 * label baked in here would be a second place the room's rules were written.
 */
export interface Interactable {
  /** What `INTERACT` carries. Unique across the game, not just the room. */
  readonly id: string
  /** The prop's art family. Its frames are `<art>.<frame>`. */
  readonly art: string
  /** Where the object sits, in fractions of the world box. */
  readonly at: { readonly x: number; readonly y: number }
  /**
   * Default action copy, for the accessible name.
   *
   * The starting verb only. A thing whose verb changes with its state resolves
   * it through `actionFor`, and this is what it says before anything has
   * happened to it.
   */
  readonly describe: string
}

/**
 * Where one way out of this picture is standing.
 *
 * The exits used to be a button in the tray, which put the most important verb
 * in the game in the one region of the screen that is not the world. They are
 * hotspots now, seated on the painted feature the way passes through — the
 * arch, the stair, the far door — and this is where that feature is.
 *
 * **A template still names no destination.** An anchor is a place in a picture
 * and nothing else; the generated map's edges bind to these in **declaration
 * order**, so the first anchor carries the first edge out of the slot, which is
 * the same law that already made the first edge the primary one.
 *
 * A hotspot and a LOOK detail may never share the same 44 px. That was already
 * the rule for a worked object's verb; an exit is a verb on the picture too,
 * and `test/unit/rooms.test.ts` holds all three kinds to it together.
 */
export interface ExitAnchor {
  /** For tests and for the DOM. Unique within the template. */
  readonly id: string
  /** Where the way sits, in fractions of the world box. */
  readonly at: { readonly x: number; readonly y: number }
}

/**
 * Where a found thing lies, once something has revealed it.
 *
 * Loot is a room object like any other: it is discovered, revealed, inspected,
 * decided on, taken, and possessed — in the world, every time. There is no
 * reward screen for it to appear on, so it needs a place in the picture, and
 * this is that place. The nth thing revealed in this room lies at the nth
 * anchor; a room that reveals more things than it declares anchors stacks the
 * remainder on the last one, which is a content fault the tests catch.
 */
export type LootAnchor = ExitAnchor

/**
 * A pre-measured place in a picture that a *generated* thing may be seated in.
 *
 * The other half of the placement system. A `LootAnchor` is where this room's own
 * machinery puts what it pays; a seat is where the **director** may stand
 * something the room knows nothing about — a chained die in an alcove, the two
 * dice on the carver's table, whatever the next plan wants.
 *
 * It is measured exactly as every other anchor is, and the negative-space law
 * counts it as a plate **whether or not it is filled**: a room whose spare seat
 * is empty this run must still be a room where that seat would not have covered
 * a LOOK or a way out. `test/unit/anchors.test.ts` does that arithmetic over
 * every seat in the library, filled or not.
 */
export type Seat = ExitAnchor

/**
 * A plate a room paints with no state behind it.
 *
 * The Reliquary's altar and the vault's chain are *objects with positions that
 * survive a reload*, and `content/interactions.ts` owns them. Furniture is the
 * other case and the honest one for a room with nothing to work: the Bone
 * Carver has an altar in it because a table is where dice are laid out, and no
 * press in the game can move it. So it is declared here, beside the room's copy,
 * rather than as a `RoomInteractionState` with no transitions in it.
 *
 * Structurally the same as `interactions.Plate`, and deliberately declared here
 * so the vocabulary file does not have to import the rules file.
 */
export interface Furniture {
  readonly id: string
  readonly art: string
  readonly frame: string
  /** A position the stylesheet draws, when the plate is a portrait. */
  readonly look?: string
}

/**
 * What the director may stand in a spare seat.
 *
 * Three kinds and no framework. `bargain-die` is a specific crooked die, chained
 * and priced. `treasure` is the Hand of Saint Orrin, unpriced — its price is the
 * road to it. `hint-carving` is **prose only**: a detail cut into the wall that
 * consumes no seat, takes no press beyond a LOOK, and says a thing exists
 * without saying where.
 */
export type PlacementId = 'bargain-die' | 'treasure' | 'hint-carving'

/**
 * What a room that *sells* has on its table.
 *
 * Authored by the template rather than by the plan, because it is a fact about
 * the place: the Bone Carver has two dice on the altar because that is what the
 * Bone Carver is. Which two, and at what price, is the generator's — seeded by
 * the node, so two Carvers in one descent are two tables.
 */
export interface ExchangeOffer {
  /** How many dice are on the table. One seat each. */
  readonly count: number
  /** Bones, printed on the verb before it charges. */
  readonly price: number
}

/**
 * The dramatic job a room does in a descent.
 *
 * This is what the director asks for. It is deliberately *not* a description
 * of the picture: `encounter` says a fight belongs here, and says nothing at
 * all about whether the fight is in a corridor or a vault.
 *
 * `worked` and `aftermath` are declared and currently unresolvable — no
 * authored template claims either as its primary job. That is the correct
 * failure mode rather than a gap: a plan that asks for one gets a loud
 * `resolveRoom` throw naming the request, instead of a quietly wrong room.
 * The Reliquary and the Chain Vault are *worked* rooms in the secondary sense,
 * and carry `worked` as a tag over a primary role of `find` and `toll`.
 */
export type RoomRole =
  | 'entrance'
  | 'transition'
  | 'encounter'
  | 'recovery'
  | 'find'
  | 'worked'
  | 'toll'
  | 'junction'
  | 'keeper'
  /**
   * A place where the hand is **sold**.
   *
   * Not `find` and not `toll`, and the difference is the whole reason it is its
   * own word: a find is a thing lying there, a toll is a price for the way on,
   * and an exchange is a price for a *specific object you can read before you
   * pay*. The Bone Carver is the one authored so far.
   */
  | 'exchange'
  | 'aftermath'
  | 'exit'

/**
 * Where in the world the place is.
 *
 * Only enough vocabulary to classify the rooms that exist, honestly. The slice
 * descends threshold → ossuary → chapel → deep → threshold, and those four
 * words are the whole taxonomy until there is art for a fifth.
 */
export type Territory = 'threshold' | 'ossuary' | 'chapel' | 'deep'

/**
 * What the picture can hold.
 *
 * The art's half of the contract, and the reason the director cannot treat a
 * backdrop as wallpaper. A thing that crawls the length of a hall needs a hall
 * whose far end is in frame; a figure that fills the doorway needs a doorway.
 *
 * Every entry below is a scene that has actually been painted. Nothing is here
 * for completeness.
 */
export type Composition =
  | 'long-axis'
  | 'duel'
  | 'junction'
  | 'altar'
  | 'cramped'
  | 'vertical'
  | 'threshold'

/**
 * How hard a fight in this slot should be.
 *
 * Three words, because the slice has three fights. It is a band and not a
 * number on purpose: the numbers are the enemy's, authored in
 * `content/enemies.ts`, and the director's business is only *which weight of
 * thing belongs at this point in the descent*.
 */
export type ThreatBand = 'low' | 'medium' | 'keeper'

/**
 * How many ways in and out the picture can carry.
 *
 * The other half of art constraining generation. The Split was painted with
 * the passage dividing in front of you and can hold exactly two ways on; a
 * corridor painted with one arch at the end can hold one. A director that
 * ignored this would draw a second GO button onto a wall.
 */
export interface RoomTopology {
  readonly minEntrances: number
  readonly maxEntrances: number
  readonly minExits: number
  readonly maxExits: number
}

/**
 * A place, authored once and reusable.
 *
 * Note what is **absent**: any destination whatsoever. There is no `to`, no
 * `exits`, and no way to write one. A template that named another template
 * would be a graph hidden inside the content library, and the whole of this
 * refactor is the removal of that.
 */
export interface RoomTemplate {
  readonly id: string
  readonly name: string

  readonly role: RoomRole
  /**
   * Where the place is. Its primary one, and the one a node records.
   *
   * A template that reads in more than one stretch of the descent says so in
   * `territories` below; this stays the first of them.
   */
  readonly territory: Territory
  /**
   * Every stretch of the descent this picture belongs in, when it is more than
   * one.
   *
   * **An extension, not a weakening.** `fits()` still requires membership — a
   * template with no `territories` is a template that belongs in exactly one
   * territory, which is every room authored before this wave — and the
   * resolution throw is unchanged: a request no authored room can satisfy is
   * still a loud failure naming the request. What it buys is a room whose paint
   * honestly reads in two places being allowed to stand in both, rather than
   * being copied.
   */
  readonly territories?: readonly Territory[]
  readonly composition: Composition

  /** Secondary properties a plan may require or forbid. Never a second role. */
  readonly tags: readonly string[]

  /** The backdrop asset id. Every template has one; it is validated. */
  readonly art: string

  /** The line on arrival. */
  readonly arrival: string
  readonly details: readonly Detail[]

  /**
   * The kinds of encounter this picture can hold, if it can hold one at all.
   *
   * Absent means *no fight belongs in this art*, which is the honest default:
   * a chapel painted around a basin has nowhere for a thing to stand. A
   * template that declares an `enemy` must declare the tags that enemy needs,
   * and `validateRunMap` fails the map if it does not.
   */
  readonly encounterTags?: readonly string[]

  /** The weight of fight the art and the room were built for. */
  readonly threat?: ThreatBand

  /** An enemy that must be beaten before the exits open. */
  readonly enemy?: string
  /** A thing that must be used before the exits open. */
  readonly ritual?: Ritual
  /** Objects that can be worked, and remember it. */
  readonly interactables?: readonly Interactable[]

  /** Plates the room simply has. Nothing can move them and nothing records them. */
  readonly furniture?: readonly Furniture[]

  /**
   * Where the ways out are standing, in the picture, in declaration order.
   *
   * One per exit slot the topology allows. It names no destination — the map
   * does that — and binding is positional, so the first anchor takes the first
   * edge and the primary way is the one it was already going to be.
   */
  readonly exitAnchors?: readonly ExitAnchor[]

  /** Where found things lie in this room, in the order they are revealed. */
  readonly lootAt?: readonly LootAnchor[]

  /**
   * Places the director may seat a generated thing, in declaration order.
   *
   * Measured like every other anchor, and counted against the negative-space
   * budget whether they are filled or not.
   */
  readonly spareSeats?: readonly Seat[]

  /** What this room sells, if selling is what it is for. */
  readonly exchange?: ExchangeOffer

  /**
   * Where a cut carving stands, for a room that can carry one.
   *
   * `hint-carving` consumes no seat — it is prose, and a tap that answers — so
   * it needs a place in the picture of its own. A template with none simply
   * cannot host one, and the content test says which grammars rely on which.
   */
  readonly carvingAt?: { readonly x: number; readonly y: number }

  /**
   * The thing that is *in* this room, rather than drawn for it.
   *
   * A placed find. When a template names one, the room pays exactly it and
   * `chestReward` never touches the pool — which is how the Talisman of the
   * Pair comes to live in the Reliquary rather than in a starting loadout.
   * A template that names nothing draws, and the machinery stays for the
   * rooms that will want it.
   */
  readonly find?: RewardId

  readonly topology: RoomTopology

  /** The run ends here, and it ends well. */
  readonly ending?: 'escaped'
}
