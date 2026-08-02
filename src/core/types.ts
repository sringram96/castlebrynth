// H001a · the state half of the contract.
//
// GameState is data and nothing else. It survives JSON.stringify and
// structuredClone deep-equal (RULES.md §2), which is what lets a save be the
// state and the state be a save. Collections are arrays in insertion order
// because a Set does not survive the round trip, and order is the difference
// between two runs from one seed being identical and being merely similar.

/** The whole world as the person in it has left it. Seven keys, and no eighth. */
export interface GameState {
  readonly scene: string
  readonly flags: readonly string[]
  readonly items: readonly string[]
  readonly journal: readonly string[]
  /** The refusal ledger, keyed by `refKey` — `book.read`. Each key at most once. */
  readonly refused: readonly string[]
  /** The generator, as a plain uint32. H002 owns how it advances. */
  readonly rng: number
  readonly seed: number
}

/** A fresh run: the named scene, the given seed, and nothing remembered yet. */
export function emptyState(scene: string, seed: number): GameState {
  return {
    scene,
    flags: [],
    items: [],
    journal: [],
    refused: [],
    // The stream opens at the seed, coerced to the uint32 it has to stay.
    rng: seed >>> 0,
    seed,
  }
}

export function hasFlag(state: GameState, flag: string): boolean {
  return state.flags.includes(flag)
}

export function hasItem(state: GameState, item: string): boolean {
  return state.items.includes(item)
}

export function withFlag(state: GameState, flag: string): GameState {
  return { ...state, flags: withMember(state.flags, flag) }
}

export function withoutFlag(state: GameState, flag: string): GameState {
  return { ...state, flags: withoutMember(state.flags, flag) }
}

export function withItem(state: GameState, item: string): GameState {
  return { ...state, items: withMember(state.items, item) }
}

export function withoutItem(state: GameState, item: string): GameState {
  return { ...state, items: withoutMember(state.items, item) }
}

/**
 * The stable ledger key for an action: `book` + `read` is `book.read`.
 *
 * The argument is structural rather than the `ActionRef` H001b declares —
 * api-types imports this file, so this file may not import it back.
 */
export function refKey(ref: { readonly object: string; readonly action: string }): string {
  return `${ref.object}.${ref.action}`
}

// Membership is de-duplicated and insertion-ordered: append only when absent,
// and never in place — the caller's list is not ours to touch (RULES.md §1).
function withMember(list: readonly string[], member: string): string[] {
  return list.includes(member) ? [...list] : [...list, member]
}

function withoutMember(list: readonly string[], member: string): string[] {
  return list.filter((m) => m !== member)
}
