// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '../../src/shell/mount'
import { createGame } from '../../src/core/api'
import { loadBundle } from '../../src/core/bundle'
import { save, restore, SAVE_KEY } from '../../src/shell/persist'
import type { Bundle } from '../../src/core/cards'

// P100 · THE VERTICAL SLICE.
//
// P0 proved the engine. This proves the engine is enough: a shell built on
// GameAPI and nothing else, playing the whole arc, remembering it afterwards.
//
// Authored by convention ahead of every P1 card. No agent may edit it
// (AGENTS.md law 3). The agent assigned P100 runs it, finds it green, and
// reports "already satisfied".

const root = resolve(__dirname, '../..')
const bundle = (): Bundle =>
  loadBundle(JSON.parse(readFileSync(resolve(root, 'content/bundle.json'), 'utf8')))

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

const app = () => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

const tap = (el: HTMLElement, object: string, action: string): boolean => {
  const control = el.querySelector<HTMLElement>(
    `[data-object="${object}"][data-action="${action}"]`,
  )
  if (control === null) return false
  control.click()
  return true
}

const text = (el: HTMLElement) => el.textContent ?? ''

describe('P100 · the slice, through the shell', () => {
  it('opens on the shore with its objects tappable', () => {
    const el = app()
    mount(el, createGame(bundle()))
    expect(text(el)).toContain('Grey water')
    for (const id of ['stone', 'book', 'pool', 'self', 'path']) {
      expect(
        el.querySelector(`[data-object="${id}"]`),
        `${id} is not tappable`,
      ).not.toBeNull()
    }
  })

  it('plays the whole arc: refused, taught, opened', () => {
    const el = app()
    mount(el, createGame(bundle()))

    expect(tap(el, 'book', 'read'), 'book.read must be tappable').toBe(true)
    expect(text(el), 'the book must refuse an unglyphed reader').toMatch(/marks swim/i)

    expect(tap(el, 'stone', 'study')).toBe(true)
    expect(text(el)).toMatch(/warm where nothing else is/i)

    expect(tap(el, 'book', 'read')).toBe(true)
    expect(text(el), 'the journal must gain the procession').toMatch(/procession/i)
  })

  it('the journal is on screen the whole time, and keeps what it gained', () => {
    const el = app()
    mount(el, createGame(bundle()))
    tap(el, 'stone', 'study')
    tap(el, 'book', 'read')
    expect(text(el)).toMatch(/procession/i)
    // still there a tap later, in a different scene's worth of redraws
    tap(el, 'pool', 'look')
    expect(text(el), 'the journal did not survive a redraw').toMatch(/procession/i)
  })

  it('the path off the shore opens once the book has', () => {
    const el = app()
    mount(el, createGame(bundle()))

    tap(el, 'path', 'follow')
    expect(text(el), 'the path must refuse before the book is open').not.toMatch(/^stair$/im)

    tap(el, 'stone', 'study')
    tap(el, 'book', 'read')
    expect(tap(el, 'path', 'follow')).toBe(true)

    // We are somewhere else now: the shore's objects are gone from the screen.
    expect(el.querySelector('[data-object="stone"]'), 'still on the shore').toBeNull()
  })

  it('never shows the engine\'s bookkeeping', () => {
    const el = app()
    mount(el, createGame(bundle()))
    tap(el, 'stone', 'study')
    tap(el, 'book', 'read')
    const t = text(el)
    expect(t, 'a flag leaked to the screen').not.toContain('knows_glyph')
    expect(t).not.toContain('obj+')
    expect(t).not.toContain('obj-')
  })
})

describe('P100 · the run survives being closed', () => {
  it('restores mid-arc, journal and ledger intact', () => {
    const g = createGame(bundle())
    let s = g.newRun(42)
    s = g.act(s, { object: 'book', action: 'read' }).state
    s = g.act(s, { object: 'stone', action: 'study' }).state
    s = g.act(s, { object: 'book', action: 'read' }).state

    const store = fakeStorage()
    save(store, s)

    const back = restore(store, bundle())
    expect(back).toEqual(s)
    expect(back.journal).toContain('procession')
    expect(back.refused).toContain('book.read')
    expect(back.flags).toContain('knows_glyph')
  })

  it('a corrupt save opens a new run rather than a broken screen', () => {
    const store = fakeStorage({ [SAVE_KEY]: '{"v":1,"state":{' })
    const b = bundle()
    const s = restore(store, b)
    expect(s.scene).toBe(b.start)
    expect(s.journal).toEqual([])

    const el = app()
    mount(el, createGame(b))
    expect(text(el)).toContain('Grey water')
  })
})

describe('P100 · the shell reached for nothing but the API', () => {
  it('no shell module imports resolve or reads the bundle directly', () => {
    for (const f of ['mount.ts', 'render.ts', 'panel.ts', 'persist.ts']) {
      const src = readFileSync(resolve(root, 'src/shell', f), 'utf8')
      expect(src, `${f} reached past GameAPI`).not.toMatch(/from ['"].*core\/resolve['"]/)
      expect(src, `${f} read the bundle directly`).not.toMatch(/\.scenes\b/)
    }
  })
})
