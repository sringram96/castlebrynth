// H004b · the loader — nothing downstream trusts the bundle until this says so.
//
// "load" means validate, not read from disk. src/core does no I/O
// (.llm/rules/purity.mdc), so the caller supplies the parsed JSON and this
// hands back a Bundle or throws naming what was wrong with it.
//
// The bundle is a build artefact, and an artefact can be stale, hand-edited,
// or written by a compiler that has since moved on. So it is checked as
// untrusted input every time, and checked through parseScene (H003a) — the
// same gate the builder came through, which is what keeps the compiler and the
// engine from ever disagreeing about a word.

import { parseScene } from './cards'
import type { Bundle, Scene } from './cards'

const BUNDLE_KEYS: readonly string[] = ['v', 'start', 'scenes']

/** The only bundle version there is. A bundle that claims another is not one. */
const V = 1

/**
 * Validates an already-parsed bundle, or throws.
 *
 * What comes out is JSON and deep-equal to what a rebuild would produce, so a
 * loaded bundle round-trips: `loadBundle(JSON.parse(JSON.stringify(b)))`
 * equals `b`.
 */
export function loadBundle(raw: unknown): Bundle {
  if (!isRecord(raw)) throw new Error('the bundle is not a mapping')

  for (const key of Object.keys(raw)) {
    if (!BUNDLE_KEYS.includes(key)) fail(key, 'unknown bundle key')
  }

  if (raw['v'] !== V) fail('v', `must be ${V}, the only bundle version there is`)

  const start = raw['start']
  if (typeof start !== 'string') fail('start', 'must be a scene id (string)')

  const rawScenes = raw['scenes']
  if (!isRecord(rawScenes)) fail('scenes', 'must be a mapping of scene id to scene')

  const entries: [string, Scene][] = []
  for (const id of Object.keys(rawScenes)) {
    const scene = parse(rawScenes[id], id)
    // The key is what `start` and `goto` name; the id is what the scene calls
    // itself. Two answers to "which scene is this" is one answer too many.
    if (scene.id !== id) fail(`scenes.${id}.id`, `must be "${id}", and is "${scene.id}"`)
    entries.push([id, scene])
  }

  // fromEntries rather than assignment into a literal: a scene id is content,
  // and `scenes['__proto__'] = scene` would set a prototype instead of a scene.
  const scenes: { [id: string]: Scene } = Object.fromEntries(entries)

  if (scenes[start] === undefined) fail('start', `names no scene: "${start}"`)

  return { v: V, start, scenes }
}

// parseScene names the path inside the scene; the loader names the scene, the
// way the builder names the file: `scenes.shore: objects.book.read[0] — ...`.
function parse(raw: unknown, id: string): Scene {
  try {
    return parseScene(raw)
  } catch (e) {
    throw new Error(`scenes.${id}: ${e instanceof Error ? e.message : String(e)}`)
  }
}

function fail(path: string, what: string): never {
  throw new Error(`${path} — ${what}`)
}

// Arrays are not records: a bundle written as a list has no `v` to read, and
// reading one off would find undefined rather than say what is wrong.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
