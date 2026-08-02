// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
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
// The arc is the Crossing's (content/crossing.yaml): the door refuses, the
// scored stone teaches, the same tap opens, and the steps end the slice. It
// replaces the shore's "the book refuses, then the book opens" one for one —
// a refusal that names what you lack, a thing that teaches it, the same tap
// answering differently, and a way on that was earned.
//
// The free tap is NOT asserted here. `getView` carries `tap` for every object
// (api-types.ts) and the renderer does not draw it yet; a free-tap step in the
// shell is future work, and P100 asserts what the shell does today — one
// control per object/action pair, and the world's own lines under them.
//
// The bundle is read from the authored yaml rather than from
// content/bundle.json. Those two shapes disagree today — the compiler writes
// the parsed Scene, whose `objects` is a list, and `loadBundle` validates
// through `parseScene`, which reads the authored shape, a mapping keyed by
// object id. H004 owns that disagreement; this card is about the shell.

const root = resolve(__dirname, '../..')
const SCENE = resolve(root, 'content/crossing.yaml')

const bundle = (): Bundle =>
  loadBundle({
    v: 1,
    start: 'crossing',
    scenes: { crossing: yaml.load(readFileSync(SCENE, 'utf8')) },
  })

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
  it('opens on the Crossing with its objects tappable', () => {
    const el = app()
    mount(el, createGame(bundle()))
    expect(text(el)).toContain('The ring of the portal is cold all through')
    for (const id of ['portal', 'hands', 'stone', 'door', 'steps']) {
      expect(
        el.querySelector(`[data-object="${id}"]`),
        `${id} is not tappable`,
      ).not.toBeNull()
    }
  })

  it('plays the whole arc: refused, taught, opened', () => {
    const el = app()
    mount(el, createGame(bundle()))

    expect(tap(el, 'door', 'open'), 'door.open must be tappable').toBe(true)
    expect(text(el), 'the door must refuse a reader who cannot read the mark').toMatch(
      /means something\. Not to you/i,
    )

    expect(tap(el, 'stone', 'study')).toBe(true)
    expect(text(el)).toMatch(/cut deep enough to read with a thumb/i)

    expect(tap(el, 'door', 'open')).toBe(true)
    expect(text(el), 'the same tap must open once the mark is known').toMatch(
      /the door is only a door/i,
    )
  })

  it('the journal is on screen the whole time, and keeps what it gained', () => {
    const el = app()
    mount(el, createGame(bundle()))
    tap(el, 'stone', 'study')
    expect(text(el), 'the journal must gain the mark').toMatch(/the_mark/)
    // still there a tap later, in a different turn's worth of redraws
    tap(el, 'portal', 'touch')
    expect(text(el), 'the journal did not survive a redraw').toMatch(/the_mark/)
  })

  it('the way down opens once the door has', () => {
    const el = app()
    mount(el, createGame(bundle()))

    expect(tap(el, 'steps', 'descend')).toBe(true)
    expect(text(el), 'the steps must refuse while the door is barred').toMatch(
      /The door is barred between you and them/,
    )
    expect(text(el), 'the slice must not end on a refusal').not.toContain(
      'The dark takes the third tread',
    )

    tap(el, 'stone', 'study')
    tap(el, 'door', 'open')
    expect(tap(el, 'steps', 'descend')).toBe(true)
    expect(text(el), 'the earned descent must end the slice').toContain(
      'The dark takes the third tread, and then you.',
    )
  })

  it('never shows the engine\'s bookkeeping', () => {
    const el = app()
    mount(el, createGame(bundle()))
    tap(el, 'stone', 'study')
    tap(el, 'door', 'open')
    const t = text(el)
    expect(t, 'a flag leaked to the screen').not.toContain('knows_mark')
    expect(t, 'a flag leaked to the screen').not.toContain('door_open')
    expect(t).not.toContain('obj+')
    expect(t).not.toContain('obj-')
    // The end note is the Book of Ends' bookkeeping, not the screen's
    // (render.ts). Reached below; asserted here where the other leaks are.
    expect(t).not.toContain('left the Crossing')
  })
})

describe('P100 · the run survives being closed', () => {
  it('restores mid-arc, journal and ledger intact', () => {
    const g = createGame(bundle())
    let s = g.newRun(42)
    s = g.act(s, { object: 'door', action: 'open' }).state
    s = g.act(s, { object: 'stone', action: 'study' }).state
    s = g.act(s, { object: 'door', action: 'open' }).state

    const store = fakeStorage()
    save(store, s)

    const back = restore(store, bundle())
    expect(back).toEqual(s)
    expect(back.journal).toContain('the_mark')
    expect(back.journal).toContain('the_way_down')
    expect(back.refused).toContain('door.open')
    expect(back.flags).toContain('knows_mark')
    expect(back.flags).toContain('door_open')
  })

  it('a corrupt save opens a new run rather than a broken screen', () => {
    const store = fakeStorage({ [SAVE_KEY]: '{"v":1,"state":{' })
    const b = bundle()
    const s = restore(store, b)
    expect(s.scene).toBe(b.start)
    expect(s.journal).toEqual([])

    const el = app()
    mount(el, createGame(b))
    expect(text(el)).toContain('The ring of the portal is cold all through')
  })
})

describe('P100 · the shell reached for nothing but the API', () => {
  it('no shell module imports resolve or reads the bundle directly', () => {
    // Read the directory rather than a list: P108 added boot.ts after this test
    // was authored and it escaped the check entirely. A hardcoded list silently
    // stops covering the thing it exists to cover.
    const shell = readdirSync(resolve(root, 'src/shell'))
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    expect(shell.length, 'no shell modules found').toBeGreaterThan(3)
    for (const f of shell) {
      const src = readFileSync(resolve(root, 'src/shell', f), 'utf8')
      expect(src, `${f} reached past GameAPI`).not.toMatch(/core\/resolve/)
      expect(src, `${f} read the bundle directly`).not.toMatch(/\.scenes\s*[[.]/)
    }
  })
})
