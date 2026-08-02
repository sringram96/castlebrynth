// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '../../src/shell/app'
import { saveRun, loadRun, clearRun } from '../../src/platform/storage'
import { loadBundle } from '../../src/core/bundle'
import type { Bundle } from '../../src/core/cards'
import type { GameState } from '../../src/core/types'

// H100 · THE P1 SLICE — the whole phase in one test, through the screen.
//
// H000 proved the engine. H110 and H111 prove the world. This proves the two
// of them are enough: a shell built on GameAPI and nothing else, played with
// taps, showing the run and remembering it afterwards.
//
// Authored ahead of every P1 card (AGENTS.md law 7). Red until H114 says
// otherwise, and that is the correct state for it to be in.
//
//   tap the book        → the refusal is on the narrator line, and in LOG
//   study the stone     → knows_glyph
//   read the book again → the procession lands in the journal, and in LOG
//   walk shore → gate → corridor mouth
//   the dark crossing   → the end card is shown
//
// THE SURFACE IT ADDRESSES. Two modules, both declared by P1 cards:
//
//   src/shell/app.ts        mount(el, bundle, saved?) → { getState, dispatch, dispose }   H107
//   src/platform/storage.ts saveRun · loadRun · clearRun                                  H108
//
// and six hooks, which are semantic on purpose. H115's art pass rewrites every
// colour token and class name in the shell, and an acceptance test pinned to
// those would turn red for a change of paint:
//
//   [data-testid="narrator"]                    the one top line
//   [data-object="<id>"]                        a thing in the scene, tappable
//   [data-object="<id>"][data-action="<name>"]  the control that spends the turn
//   [data-testid="tab-act|pack|log|set"]        the four tabs, always present
//   [data-testid="pane-act|pack|log|set"]       what each one shows
//   [data-testid="end-card"]                    ABSENT until the run ends
//
// The tabs are a tab row, not H120's pager — that is a later amendment and
// this file does not assume it.

const bundle = (): Bundle =>
  loadBundle(JSON.parse(readFileSync(resolve(__dirname, '../../content/bundle.json'), 'utf8')))

type Pane = 'act' | 'pack' | 'log' | 'set'

const need = (root: HTMLElement, selector: string, what: string): HTMLElement => {
  const found = root.querySelector<HTMLElement>(selector)
  if (found === null) throw new Error(`${what} — nothing matched ${selector}`)
  return found
}

const app = (b: Bundle, saved?: GameState) => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const run = saved === undefined ? mount(el, b) : mount(el, b, saved)
  return { el, run }
}

/** The first tap is free (GAME.md #input): it selects and describes, and spends nothing. */
const select = (el: HTMLElement, object: string): void => {
  need(el, `[data-object="${object}"]`, `${object} is not on the screen`).click()
}

/** The second press is the turn. */
const press = (el: HTMLElement, object: string, action: string): void => {
  need(
    el,
    `[data-object="${object}"][data-action="${action}"]`,
    `${object}.${action} is not offered`,
  ).click()
}

const doo = (el: HTMLElement, object: string, action: string): void => {
  select(el, object)
  press(el, object, action)
}

/** Flip to a pane and read it. Nothing collapses, so every pane is always reachable. */
const pane = (el: HTMLElement, name: Pane): string => {
  need(el, `[data-testid="tab-${name}"]`, `the ${name.toUpperCase()} tab`).click()
  return need(el, `[data-testid="pane-${name}"]`, `the ${name.toUpperCase()} pane`).textContent ?? ''
}

const narrator = (el: HTMLElement): string =>
  need(el, '[data-testid="narrator"]', 'the narrator line').textContent ?? ''

/** Shore to the corridor mouth, the only way it goes. */
const walkToTheCorridor = (el: HTMLElement): void => {
  doo(el, 'stone', 'study')
  doo(el, 'book', 'read')
  doo(el, 'path', 'follow')
  doo(el, 'dead_bearer', 'search')
  doo(el, 'iron_gate', 'open')
  doo(el, 'exit', 'follow')
}

describe('H100 · the shore, on a screen', () => {
  it('opens on the shore with everything in it tappable', () => {
    const { el, run } = app(bundle())
    expect(narrator(el).length, 'the world says where you are').toBeGreaterThan(0)
    for (const id of ['stone', 'book', 'pool', 'self', 'path']) {
      expect(el.querySelector(`[data-object="${id}"]`), `${id} is not tappable`).not.toBeNull()
    }
    run.dispose()
  })

  it('shows all four tabs, and keeps showing them', () => {
    const { el, run } = app(bundle())
    for (const tab of ['act', 'pack', 'log', 'set'] as const) {
      expect(el.querySelector(`[data-testid="tab-${tab}"]`), `no ${tab} tab`).not.toBeNull()
    }
    doo(el, 'stone', 'study')
    doo(el, 'book', 'read')
    for (const tab of ['act', 'pack', 'log', 'set'] as const) {
      expect(el.querySelector(`[data-testid="tab-${tab}"]`), `${tab} collapsed`).not.toBeNull()
    }
    run.dispose()
  })

  it('the first tap is free — it surfaces the actions and spends nothing', () => {
    const { el, run } = app(bundle())
    const before = run.getState()

    select(el, 'book')
    expect(run.getState(), 'a bare tap advanced the world').toEqual(before)
    expect(pane(el, 'act'), 'selecting must surface what the book affords').toMatch(/read/i)

    run.dispose()
  })
})

describe('H100 · the arc: refused, taught, opened', () => {
  it('the book refuses an unglyphed reader, on the line and in the log', () => {
    const { el, run } = app(bundle())

    doo(el, 'book', 'read')
    expect(narrator(el), 'the refusal must be on the narrator line').toMatch(/marks swim/i)
    expect(run.getState().refused).toContain('book.read')
    // LOG is the journal and the refused ledger under it (H105). The compass
    // has to show which thing turned you away (GAME.md #progress).
    expect(pane(el, 'log'), 'the refusal never reached the log').toMatch(/book/i)

    run.dispose()
  })

  it('the stone teaches, and the same tap opens', () => {
    const { el, run } = app(bundle())

    doo(el, 'book', 'read')
    doo(el, 'stone', 'study')
    expect(run.getState().flags, 'the stone must teach the glyph').toContain('knows_glyph')

    doo(el, 'book', 'read')
    expect(run.getState().journal).toContain('procession')
    expect(pane(el, 'log'), 'the procession never reached the log').toMatch(/procession/i)

    run.dispose()
  })

  it('the narrator swaps, it does not stack', () => {
    const { el, run } = app(bundle())
    doo(el, 'book', 'read')
    const refusal = narrator(el)
    doo(el, 'stone', 'study')
    const taught = narrator(el)

    expect(taught, 'the line did not change').not.toBe(refusal)
    expect(taught, 'the line is a line, not a log').not.toMatch(/marks swim/i)
    run.dispose()
  })

  it('never puts the engine\'s bookkeeping on the screen', () => {
    const { el, run } = app(bundle())
    doo(el, 'stone', 'study')
    doo(el, 'book', 'read')
    const everything = [pane(el, 'act'), pane(el, 'pack'), pane(el, 'log'), narrator(el)].join(' ')

    expect(everything, 'a flag leaked to the screen').not.toContain('knows_glyph')
    expect(everything).not.toContain('obj+')
    expect(everything).not.toContain('obj-')
    run.dispose()
  })
})

describe('H100 · the walk down', () => {
  it('shore → gate → corridor mouth', () => {
    const { el, run } = app(bundle())

    doo(el, 'stone', 'study')
    doo(el, 'book', 'read')
    doo(el, 'path', 'follow')
    expect(run.getState().scene).toBe('gate')
    expect(el.querySelector('[data-object="stone"]'), 'still standing on the shore').toBeNull()
    expect(el.querySelector('[data-object="iron_gate"]'), 'the gate is not drawn').not.toBeNull()

    doo(el, 'dead_bearer', 'search')
    expect(run.getState().items).toContain('rusted_key')
    expect(pane(el, 'pack'), 'the pack does not show what you are carrying').toMatch(/key/i)

    doo(el, 'iron_gate', 'open')
    expect(run.getState().flags).toContain('gate_open')

    doo(el, 'exit', 'follow')
    expect(run.getState().scene).toBe('corridor')
    expect(el.querySelector('[data-object="dark_crossing"]'), 'the crossing is not drawn').not.toBeNull()

    run.dispose()
  })

  it('the log keeps the whole descent, scene after scene', () => {
    const { el, run } = app(bundle())
    walkToTheCorridor(el)
    doo(el, 'dust_floor', 'inspect')

    const log = pane(el, 'log')
    expect(log, 'the shore fell out of the log').toMatch(/procession/i)
    expect(log, 'the bearer fell out of the log').toMatch(/bearer/i)
    expect(log, 'the floor fell out of the log').toMatch(/dust/i)
    run.dispose()
  })
})

describe('H100 · the end card', () => {
  it('is not on the screen until the run has ended', () => {
    const { el, run } = app(bundle())
    expect(el.querySelector('[data-testid="end-card"]'), 'the end card showed early').toBeNull()
    walkToTheCorridor(el)
    expect(el.querySelector('[data-testid="end-card"]'), 'the end card showed early').toBeNull()
    run.dispose()
  })

  it('the dark crossing draws it', () => {
    const { el, run } = app(bundle())
    walkToTheCorridor(el)
    doo(el, 'dark_crossing', 'cross')

    const card = need(el, '[data-testid="end-card"]', 'the crossing did not end the slice')
    expect((card.textContent ?? '').trim().length, 'the end card says nothing').toBeGreaterThan(0)
    run.dispose()
  })
})

describe('H100 · the run survives being closed', () => {
  it('saves mid-descent and comes back the same run', async () => {
    const b = bundle()
    await clearRun()

    const first = app(b)
    doo(first.el, 'stone', 'study')
    doo(first.el, 'book', 'read')
    const mid = first.run.getState()
    await saveRun(mid)
    first.run.dispose()

    const back = await loadRun(b)
    expect(back, 'the save did not come back').toEqual(mid)

    const second = app(b, back ?? undefined)
    expect(second.run.getState()).toEqual(mid)
    expect(pane(second.el, 'log'), 'the journal did not survive the remount').toMatch(/procession/i)
    second.run.dispose()

    await clearRun()
    expect(await loadRun(b), 'a cleared save is no save').toBeNull()
  })
})
