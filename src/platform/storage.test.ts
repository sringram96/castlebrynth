// H108 · the acceptance for the storage driver.
//
// Two rungs of the ladder are reachable from a node process: memory, which is
// what a headless run gets, and localStorage, which arrives as a stub on
// globalThis exactly as a browser would supply it. The Capacitor rung is not
// installed here (see storage.ts) and its absence is itself the thing under
// test — every case below runs because the import rejected and the ladder
// stepped down.
//
// The stub is how the lies get planted. `saveRun` can only write text this
// build wrote; a truncated file, a hand-edited one and a save from a version
// that does not exist yet have to be put into the store directly, which is the
// honest shape of the test anyway — that text came from the outside world.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearRun, loadRun, saveRun, SAVE_KEY } from './storage'
import type { Bundle } from '../core/cards'
import { SAVE_VERSION, serialize } from '../core/save'
import { emptyState, type GameState } from '../core/types'
import type { GameState as State } from '../core/types'

const bundle: Bundle = {
  v: 1,
  start: 'crossing',
  scenes: {
    crossing: { id: 'crossing', line: 'the portal is dead.', objects: [] },
    gate: { id: 'gate', line: 'a sealed gate.', objects: [] },
  },
}

const lived = (): GameState => ({
  ...emptyState('gate', 42),
  flags: ['knows_glyph'],
  items: ['lamp', 'ash'],
  journal: ['the procession passed'],
  refused: ['gate.press'],
  rng: 998877,
})

// A browser's Storage, as much of it as this file touches. The two members
// nothing calls are still here because the type is the browser's, and a driver
// that got a stub with a hole in it would be testing something else.
class FakeStorage {
  private readonly cells = new Map<string, string>()

  get length(): number {
    return this.cells.size
  }

  key(index: number): string | null {
    return [...this.cells.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.cells.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.cells.set(key, value)
  }

  removeItem(key: string): void {
    this.cells.delete(key)
  }

  clear(): void {
    this.cells.clear()
  }
}

const host = globalThis as { localStorage?: Storage }

const useLocalStorage = (): FakeStorage => {
  const store = new FakeStorage()
  host.localStorage = store as unknown as Storage
  return store
}

const noGlobals = (): void => {
  delete host.localStorage
}

// The memory rung is module state, so a test that wrote is a test the next one
// would read. Every case opens on an empty store, on whichever rung it is on.
beforeEach(async () => {
  noGlobals()
  await clearRun()
})

afterEach(async () => {
  await clearRun()
  noGlobals()
})

describe('the fallback driver', () => {
  it('round-trips a lived-in run byte-identically', async () => {
    const state = lived()
    await saveRun(state)

    const back = await loadRun(bundle)
    expect(back).toEqual(state)
    // Byte-identical, not merely deep-equal: the seven keys in the order the
    // engine writes them, so a save is the state and the state is a save.
    expect(JSON.stringify(back)).toBe(JSON.stringify(state))
  })

  it('round-trips a fresh run', async () => {
    const state = emptyState('crossing', 1)
    await saveRun(state)
    expect(await loadRun(bundle)).toEqual(state)
  })

  it('holds the run across many saves, last write winning', async () => {
    await saveRun(emptyState('crossing', 1))
    await saveRun(lived())
    expect(await loadRun(bundle)).toEqual(lived())
  })

  it('does not touch the state it was handed', async () => {
    const state = Object.freeze(lived())
    await saveRun(state)
    expect(state).toEqual(lived())
  })

  it('is null before anything has been saved', async () => {
    expect(await loadRun(bundle)).toBeNull()
  })

  it('is null after clearRun', async () => {
    await saveRun(lived())
    await clearRun()
    expect(await loadRun(bundle)).toBeNull()
  })

  it('clears an empty store without complaint', async () => {
    await expect(clearRun()).resolves.toBeUndefined()
  })
})

describe('localStorage, when the host has one', () => {
  it('writes the envelope under the one key', async () => {
    const store = useLocalStorage()
    const state = lived()
    await saveRun(state)

    expect(store.getItem(SAVE_KEY)).toBe(JSON.stringify(serialize(state)))
  })

  it('reads back what it wrote', async () => {
    useLocalStorage()
    await saveRun(lived())
    expect(await loadRun(bundle)).toEqual(lived())
  })

  it('removes the key on clearRun rather than blanking it', async () => {
    const store = useLocalStorage()
    await saveRun(lived())
    await clearRun()

    expect(store.getItem(SAVE_KEY)).toBeNull()
    expect(await loadRun(bundle)).toBeNull()
  })

  it('is preferred over memory once the host has one', async () => {
    // Written with no globals, then a browser appears: the run in memory is
    // not the browser's, and the browser's store is the one that answers.
    await saveRun(lived())
    const store = useLocalStorage()
    expect(await loadRun(bundle)).toBeNull()
    expect(store.length).toBe(0)
  })

  it('falls back to memory when reaching for localStorage throws', async () => {
    Object.defineProperty(host, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage is disabled in this context')
      },
    })

    await saveRun(lived())
    expect(await loadRun(bundle)).toEqual(lived())
  })

  it('falls back to memory when the host offers something that is not a Storage', async () => {
    host.localStorage = {} as unknown as Storage
    await saveRun(lived())
    expect(await loadRun(bundle)).toEqual(lived())
  })
})

describe('a lie in the store', () => {
  const planted = async (raw: string): Promise<State | null> => {
    const store = useLocalStorage()
    store.setItem(SAVE_KEY, raw)
    return loadRun(bundle)
  }

  it('is null for the empty string', async () => {
    expect(await planted('')).toBeNull()
  })

  it('is null for garbage', async () => {
    expect(await planted('not json at all {{{')).toBeNull()
  })

  it('is null for a truncated write', async () => {
    const whole = JSON.stringify(serialize(lived()))
    expect(await planted(whole.slice(0, whole.length - 12))).toBeNull()
  })

  it('is null for valid JSON of the wrong shape', async () => {
    expect(await planted('[]')).toBeNull()
    expect(await planted('"a run"')).toBeNull()
    expect(await planted('null')).toBeNull()
    expect(await planted(JSON.stringify({ v: SAVE_VERSION }))).toBeNull()
    expect(await planted(JSON.stringify(lived()))).toBeNull()
  })

  it('is null for a state missing a key', async () => {
    const state: Record<string, unknown> = { ...lived() }
    delete state.journal
    expect(await planted(JSON.stringify({ v: SAVE_VERSION, state }))).toBeNull()
  })

  it('is null for a save from a future version', async () => {
    const raw = JSON.stringify({ v: SAVE_VERSION + 1, state: lived() })
    expect(await planted(raw)).toBeNull()
  })

  it('is null for a save from a world that no longer has this scene', async () => {
    const raw = JSON.stringify({ v: SAVE_VERSION, state: { ...lived(), scene: 'the_shore' } })
    expect(await planted(raw)).toBeNull()
  })

  it('is null for a scene the bundle only inherited', async () => {
    const raw = JSON.stringify({ v: SAVE_VERSION, state: { ...lived(), scene: 'constructor' } })
    expect(await planted(raw)).toBeNull()
  })

  it('leaves the lie where it lies — a load is not a repair', async () => {
    const store = useLocalStorage()
    store.setItem(SAVE_KEY, 'not json at all {{{')
    await loadRun(bundle)
    expect(store.getItem(SAVE_KEY)).toBe('not json at all {{{')
  })

  it('is overwritten by the next save, which reads back clean', async () => {
    const store = useLocalStorage()
    store.setItem(SAVE_KEY, 'not json at all {{{')
    await saveRun(lived())
    expect(await loadRun(bundle)).toEqual(lived())
    expect(store.length).toBe(1)
  })
})
