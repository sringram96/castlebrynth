import { describe, expect, it } from 'vitest'
import { SAVE_KEY, restore, save } from './persist'
import { loadBundle } from '../core/bundle'
import { newRun } from '../core/api'
import { emptyState, withFlag, withItem } from '../core/types'
import type { Bundle } from '../core/cards'

// P104 · persist, on its own. The acceptance owns the round trip and the whole
// catalogue of lies a save can tell; what is here is what it does not cover —
// which key is written, that nothing else in storage is disturbed, that a bad
// save is left where it lies rather than repaired, and that the fresh run this
// falls back to is `newRun`'s and not a second idea of one.
//
// No DOM pragma: `Storage` is an interface, and the point of taking one as a
// parameter is that this file never needs a browser to have one.

// The fixture goes through loadBundle rather than content/bundle.json, so a
// content edit cannot turn this red — and the start scene is not the first
// scene written, so "a fresh run" cannot pass by accident.
const twoScenes = (): Bundle =>
  loadBundle({
    v: 1,
    start: 'shore',
    scenes: {
      water: { id: 'water', line: 'Under, and no light in it.', objects: [] },
      shore: { id: 'shore', line: 'Grey water, and no far side to it.', objects: [] },
    },
  })

/** The smallest thing that satisfies Storage, and the whole reason for the parameter. */
const fakeStorage = (seed: Record<string, string> = {}): Storage => {
  const map = new Map(Object.entries(seed))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage
}

const played = () => withItem(withFlag(emptyState('shore', 42), 'knows_glyph'), 'lamp')

describe('P104 · the one key', () => {
  it('writes under SAVE_KEY, which is the name the shell agreed on', () => {
    const store = fakeStorage()
    save(store, played())
    expect(SAVE_KEY).toBe('castlebrynth.run')
    expect(store.getItem(SAVE_KEY)).not.toBeNull()
  })

  it('leaves every other key in storage alone', () => {
    // Capacitor hands the app the WebView's whole localStorage, so the run is
    // a tenant there rather than the owner.
    const store = fakeStorage({ 'someone.elses': 'not ours' })
    save(store, played())
    save(store, emptyState('shore', 1))
    expect(store.getItem('someone.elses')).toBe('not ours')
    expect(store.length).toBe(2)
  })

  it('reads only its own key', () => {
    const store = fakeStorage({ 'someone.elses': 'not ours' })
    expect(restore(store, twoScenes())).toEqual(newRun(1, twoScenes()))
  })
})

describe('P104 · the fallback is a real fresh run', () => {
  it('is the run newRun would have made of this bundle', () => {
    const bundle = twoScenes()
    expect(restore(fakeStorage(), bundle)).toEqual(newRun(1, bundle))
  })

  it('opens at the bundle\'s start scene, not the first one written', () => {
    expect(restore(fakeStorage(), twoScenes()).scene).toBe('shore')
  })

  it('is the same run twice — the fallback reads no clock', () => {
    const bundle = twoScenes()
    expect(restore(fakeStorage(), bundle)).toEqual(restore(fakeStorage(), bundle))
  })

  it('leaves the unreadable save where it lies rather than repairing it', () => {
    // Nothing here rewrites storage: `restore` answers a question, and the next
    // `save` is what overwrites. A restore that also wrote would mean the shell
    // could destroy a save it merely failed to understand — a save this build
    // cannot read may still be one a later build can.
    const store = fakeStorage({ [SAVE_KEY]: '{"v":2,"state":{}}' })
    restore(store, twoScenes())
    expect(store.getItem(SAVE_KEY)).toBe('{"v":2,"state":{}}')
  })
})

describe('P104 · a save is the state and nothing else', () => {
  it('carries no key GameState has not got', () => {
    const store = fakeStorage()
    save(store, played())
    const envelope: unknown = JSON.parse(store.getItem(SAVE_KEY) ?? '')
    expect(Object.keys(envelope as object).sort()).toEqual(['state', 'v'])
  })

  it('round-trips a state that is deep-equal, key order and all', () => {
    const store = fakeStorage()
    const s = played()
    save(store, s)
    const back = restore(store, twoScenes())
    expect(back).toEqual(s)
    expect(Object.keys(back)).toEqual(Object.keys(s))
  })

  it('does not write through the state it was handed', () => {
    const s = played()
    const before = structuredClone(s)
    save(fakeStorage(), s)
    expect(s).toEqual(before)
  })
})
