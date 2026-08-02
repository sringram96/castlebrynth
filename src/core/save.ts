// H007 · the save envelope.
//
// A save is the state and nothing else, wrapped in a version so that a later
// format can tell itself apart from this one. serialize is small by design:
// GameState is already JSON (RULES.md §2), so there is nothing to encode.
//
// parse is the boundary with the outside world, and the outside world lies —
// a half-written file, a hand-edited one, a save from a build that no longer
// exists. It never throws. Every lie gets the same answer, null, because the
// caller has only one recovery from any of them: begin again.

import type { GameState } from './types'

/** The format this build writes. A save that does not say 1 is not ours. */
export const SAVE_VERSION = 1

/** What goes to disk: the version, then the state verbatim. */
export interface SaveEnvelope {
  readonly v: typeof SAVE_VERSION
  readonly state: GameState
}

/**
 * Wraps a state for storage.
 *
 * No copy is taken: GameState is readonly data and the envelope's next stop is
 * JSON.stringify, so there is nothing here that could write through.
 */
export function serialize(state: GameState): SaveEnvelope {
  return { v: SAVE_VERSION, state }
}

/** Recovers a state from raw text, or null if the text is not one of ours. */
export function parse(raw: string): GameState | null {
  const envelope = decode(raw)
  if (!isRecord(envelope)) return null
  // Strict: "1" is a string a different writer produced, not this version.
  if (envelope.v !== SAVE_VERSION) return null
  if (!isRecord(envelope.state)) return null

  const { scene, flags, items, journal, refused, rng, seed } = envelope.state
  if (typeof scene !== 'string') return null
  if (!isStringArray(flags)) return null
  if (!isStringArray(items)) return null
  if (!isStringArray(journal)) return null
  if (!isStringArray(refused)) return null
  if (!isNumber(rng)) return null
  if (!isNumber(seed)) return null

  // Rebuilt key by key rather than handed back as parsed: what leaves here has
  // the seven keys and no eighth, whatever else the file was carrying.
  return { scene, flags, items, journal, refused, rng, seed }
}

function decode(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    // Malformed text is not exceptional at this boundary — it is the ordinary
    // shape of a truncated write, and it means what every other lie means.
    return null
  }
}

// Arrays are not records here: a save whose state is `[]` has no seven keys,
// and reading them off an array would find seven undefineds rather than say so.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((member) => typeof member === 'string')
}

// Finite, not merely a number: JSON.parse turns an overflowing literal like
// 1e999 into Infinity, which would poison every draw taken after the load.
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
