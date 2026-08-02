// H108 · where a run lives while the app is not running.
//
// One key, overwritten. A person has one run, and the only question this file
// answers on opening is "where was I", not "where have I ever been" — a second
// slot would be a feature nobody asked for and a second thing to keep coherent
// (.llm/rules/no-dead-scaffolding.mdc).
//
// The format is `src/core/save.ts`'s envelope and not a second one
// (.llm/rules/saves.mdc): `serialize` says what goes to storage and `parse` is
// the boundary that reads it back. All this file adds is the key it lives under,
// the place it lives, and the decision about what a lie means here — a new run,
// quietly.
//
// The place is a ladder, tried top down on every call:
//
//   Capacitor Preferences · the device's own store, on a phone
//   localStorage          · a browser or a WebView
//   memory                · a process with no globals at all, so the suite runs
//                           headless and this file is testable without a DOM
//
// Nothing above this file knows which rung it got. That is the whole point of
// putting it under src/platform/ rather than in the shell: the shell asks for
// the run back and is told, and it never learns whether it is on a phone.
//
// Everything is async because the top rung is. A localStorage write is
// synchronous underneath and the promise it returns is already resolved; the
// caller cannot tell, and does not have to be rewritten the day it is a phone.

import type { Bundle } from '../core/cards'
import { parse, serialize } from '../core/save'
import type { GameState } from '../core/types'

/** The one key a run lives under, on every rung of the ladder. */
export const SAVE_KEY = 'castlebrynth.run'

/**
 * Writes `state` over whatever was there.
 *
 * Called after every act, so it is the cheapest thing that can be: one
 * stringify of a state that is already JSON (.llm/rules/determinism.mdc).
 */
export async function saveRun(state: GameState): Promise<void> {
  const store = await driver()
  await store.write(JSON.stringify(serialize(state)))
}

/**
 * The run as it was left, or null.
 *
 * Every way this can go wrong goes the same way: nothing stored, a half-written
 * string, a save from a version that no longer exists, one somebody edited by
 * hand. `parse` already answers all of them with null (save.ts), and null has
 * exactly one recovery — begin again. The caller does that; a corrupt save is
 * not an error the player is ever shown (.llm/rules/saves.mdc).
 *
 * The bundle is the last of those questions. A state standing in a scene this
 * world has not got is a save from another world: `getView` would hand back an
 * empty line and nothing to tap (api.ts), which is the one thing worse than
 * starting over — a run that is neither fresh nor playable. So it is a lie like
 * the others, and gets the same answer.
 */
export async function loadRun(bundle: Bundle): Promise<GameState | null> {
  const store = await driver()
  const raw = await store.read()
  // Nothing stored and something unreadable are the same answer, so they take
  // the same path: `parse` is only asked about text that exists.
  const state = raw === null ? null : parse(raw)
  if (state === null) return null
  // `scenes` is a plain object and a scene id is content, so the lookup asks
  // whether the bundle actually has one rather than what it inherited.
  return Object.hasOwn(bundle.scenes, state.scene) ? state : null
}

/** Forgets the run. Begin-again calls this before it opens a new seed. */
export async function clearRun(): Promise<void> {
  const store = await driver()
  await store.erase()
}

// --- the ladder ------------------------------------------------------------

/** One place a string can live. The key is not a parameter: there is one key. */
interface Driver {
  readonly read: () => Promise<string | null>
  readonly write: (value: string) => Promise<void>
  readonly erase: () => Promise<void>
}

// Resolved per call rather than once at import: a module that is loaded before
// the WebView has installed its globals would otherwise pick the wrong rung and
// keep it for the life of the process. The check is two typeofs; the expensive
// half — asking whether Preferences is there at all — is answered once, below.
async function driver(): Promise<Driver> {
  const plugin = await preferences()
  if (plugin !== null) return capacitorDriver(plugin)

  const store = webStorage()
  if (store !== null) return localDriver(store)

  return memoryDriver
}

/** Only what this file calls, and only what it is prepared to check for. */
interface PreferencesPlugin {
  readonly get: (options: { key: string }) => Promise<unknown>
  readonly set: (options: { key: string; value: string }) => Promise<unknown>
  readonly remove: (options: { key: string }) => Promise<unknown>
}

// Not a literal, deliberately: the specifier must stay opaque to the compiler
// and the bundler, because `@capacitor/preferences` is not a dependency of this
// repo yet (H112 owns the wrap that adds it). Until it is, the import rejects
// and the ladder steps down — which is exactly what it does in a browser too.
const PREFERENCES_MODULE: string = '@capacitor/preferences'

let probe: Promise<PreferencesPlugin | null> | undefined

// Memoised: a module that is not installed is not installed for the whole
// process, and saveRun runs after every tap.
function preferences(): Promise<PreferencesPlugin | null> {
  probe ??= probePreferences()
  return probe
}

async function probePreferences(): Promise<PreferencesPlugin | null> {
  try {
    const module: unknown = await import(/* @vite-ignore */ PREFERENCES_MODULE)
    const plugin = isRecord(module) ? module.Preferences : undefined
    if (!isPlugin(plugin)) return null
    // Presence is not availability. On the web runtime the plugin is a proxy
    // whose every call rejects unless a web implementation was registered, and
    // a driver that throws on read would strand the run somewhere localStorage
    // could have held it. One read answers that question, once.
    await plugin.get({ key: SAVE_KEY })
    return plugin
  } catch {
    return null
  }
}

function capacitorDriver(plugin: PreferencesPlugin): Driver {
  return {
    read: async () => {
      const got = await plugin.get({ key: SAVE_KEY })
      // The bridge is the outside world and the outside world lies (save.ts):
      // an absent key comes back as null here, and anything that is not a
      // string means the same as an absent key.
      const value = isRecord(got) ? got.value : undefined
      return typeof value === 'string' ? value : null
    },
    write: async (value) => {
      await plugin.set({ key: SAVE_KEY, value })
    },
    erase: async () => {
      await plugin.remove({ key: SAVE_KEY })
    },
  }
}

function localDriver(store: Storage): Driver {
  return {
    read: async () => store.getItem(SAVE_KEY),
    write: async (value) => store.setItem(SAVE_KEY, value),
    erase: async () => store.removeItem(SAVE_KEY),
  }
}

// The bottom rung. One cell, because there is one key — and module scope,
// because a run has to survive the call that wrote it.
let cell: string | null = null

const memoryDriver: Driver = {
  read: async () => cell,
  write: async (value) => {
    cell = value
  },
  erase: async () => {
    cell = null
  },
}

// Reaching for `localStorage` can itself throw where storage is disabled, which
// is why this is a try and not an `in` check.
function webStorage(): Storage | null {
  try {
    const store = (globalThis as { localStorage?: Storage }).localStorage
    if (store === undefined || store === null) return null
    return typeof store.getItem === 'function' ? store : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlugin(value: unknown): value is PreferencesPlugin {
  if (!isRecord(value)) return false
  return (
    typeof value.get === 'function' &&
    typeof value.set === 'function' &&
    typeof value.remove === 'function'
  )
}
