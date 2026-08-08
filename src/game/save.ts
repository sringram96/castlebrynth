/**
 * Persistence.
 *
 * A save records logical state only. Nothing about an animation is written and
 * nothing is written during one — a save happens after a committed action, so
 * a reload lands on a settled frame by construction.
 *
 * There is **no migration ladder**. The reset broke the schema on purpose: an
 * old save is detected, discarded, and reported. Carrying prototype run-state
 * semantics into a new architecture is how the old build ended up booting to
 * black on a stale vault.
 */

import { EMPTY_META, SAVE_VERSION, TITLE } from './state.js'
import type { GameState, Mode } from './state.js'

const KEY = 'castlebrynth'

/** Modes a run can be resumed into. `dead` and `complete` are endings. */
const LIVE: readonly Mode[] = ['explore', 'combat', 'reward']

export interface Loaded {
  readonly state: GameState
  /** Set when a save existed but could not be used. The title screen says so. */
  readonly discarded?: 'incompatible' | 'corrupt'
}

/**
 * Boot always lands on the title.
 *
 * Cold, or in the middle of a fight: the first screen is the door, and
 * CONTINUE is one press back to exactly where the run stood. The cost is one
 * press per reload, and it buys a boot that cannot land in a broken mode.
 */
export function load(storage: Storage = localStorage): Loaded {
  let raw: string | null = null
  try {
    raw = storage.getItem(KEY)
  } catch {
    return { state: TITLE }
  }
  if (!raw) return { state: TITLE }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { state: TITLE, discarded: 'corrupt' }
  }

  const saved = parsed as Partial<GameState>
  if (saved?.version !== SAVE_VERSION) {
    // Meta is kept only when it is trivially safe to keep. It is a pair of
    // counters and two id lists; nothing about a run rides on it.
    return { state: TITLE, discarded: 'incompatible' }
  }
  if (typeof saved.mode !== 'string' || !saved.meta) {
    return { state: TITLE, discarded: 'corrupt' }
  }

  const meta = { ...EMPTY_META, ...saved.meta }
  const resume = LIVE.includes(saved.mode) ? saved.mode : saved.resume
  const state: GameState = {
    version: SAVE_VERSION,
    mode: 'title',
    meta,
    ...(saved.run ? { run: saved.run } : {}),
    ...(saved.run && resume && LIVE.includes(resume) ? { resume } : {}),
  }
  return { state }
}

export function save(state: GameState, storage: Storage = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(state))
  } catch {
    // A full or disabled store is not a reason to lose the session in front of
    // the player. The run continues; it just will not survive a reload.
  }
}

export function wipe(storage: Storage = localStorage): void {
  try {
    storage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}
