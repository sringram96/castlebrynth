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
 * The four things a room is allowed to do with time.
 *
 * **Ambient motion moves like a sprite cycle, never like CSS** — the pixel-grid
 * law, extended into time. Every kind below steps: whole pixels of travel, or
 * whole quanta of light, on one shared clock. There is no easing curve here and
 * there is nowhere to write one.
 *
 *   - `flicker` — stepped light on a flame. Uneven on purpose: a candle that
 *     breathes smoothly is a lamp.
 *   - `glow`    — stepped light that breathes. Even, and slower.
 *   - `sway`    — whole-pixel horizontal steps. A hanging thing, moved by air.
 *   - `drift`   — motes falling through the world box, a fixed few at a time.
 */
export type AmbientKind = 'flicker' | 'glow' | 'sway' | 'drift'

/**
 * One thing a room does while nobody is pressing anything.
 *
 * Declared **beside the seating it animates**, and it names that seating rather
 * than a coordinate: `target` is the id of a detail, an interactable, the word
 * `ritual`, or `world` for something that moves through the whole box. The seat
 * is then the object's own, so moving the object moves its light with it and
 * there is no second coordinate to disagree.
 *
 * It is ceremony, whole. It decides nothing, it survives nothing, and with
 * motion off it does not exist — there is no reduced version of it, because a
 * reduced version would imply it was carrying something.
 */
export interface Ambient {
  readonly kind: AmbientKind
  /** A detail id, an interactable id, `ritual`, or `world`. */
  readonly target: string
  /**
   * How far it goes, and never a fraction.
   *
   * Whole **pixels** for the kinds that move — `sway`, `drift` — and whole
   * **quanta of light** for the kinds that light. Content validation rejects
   * anything that is not a positive integer.
   */
  readonly amplitude: number
  /** Ticks of the shared clock between steps. 1 is the base rate. Integers. */
  readonly tick: number
}

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
  readonly territory: Territory
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
   * What moves in here while nobody is doing anything.
   *
   * At most **two** sources in any one room, and a territory's own ambient
   * counts as one of the two — `ambienceFor` in `rooms.ts` joins them and
   * content validation enforces the cap. Absent means still, and still is a
   * choice: a threshold room before the door holds its breath.
   */
  readonly ambient?: readonly Ambient[]

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
