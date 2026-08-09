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

  readonly topology: RoomTopology

  /** The run ends here, and it ends well. */
  readonly ending?: 'escaped'
}
