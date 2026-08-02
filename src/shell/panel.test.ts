// H105 · the panel is one height, its tabs never leave, and its panes swap.
//
// The three things this card is for, stated as tests: the tabs are always all
// four, the panes swap under them, and LOG shows the journal with the refused
// ledger under it. Everything else here guards the seams the cards downstream
// stand on — H106 presses the action buttons, H107 mounts the element, and
// H100's slice acceptance addresses the whole thing by `data-testid`.
//
// The models are deep-frozen the way the engine acceptance freezes state: a
// panel that wrote through its View or its GameState fails here rather than in
// a run three cards later.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { View } from '../core/api-types'
import type { GameState } from '../core/types'
import { createPanel, PANES } from './panel'
import type { Pane, PanelModel } from './panel'
import { theme } from './theme'

// Not `new URL(...)`: these tests run under happy-dom, whose global URL is its
// own and node's fs will not take one. fileURLToPath survives both.
const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'panel.ts'), 'utf8')

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const shore: View = deepFreeze({
  line: 'Grey water, and no far side to it.',
  scene: 'the_shore',
  objects: [
    { id: 'flat-stone', actions: ['study'] },
    { id: 'book', actions: ['read', 'take'] },
    { id: 'the_far_shore', actions: [] },
  ],
})

const fresh: GameState = deepFreeze({
  scene: 'the_shore',
  flags: [],
  items: [],
  journal: [],
  refused: [],
  rng: 7,
  seed: 7,
})

const walked: GameState = deepFreeze({
  scene: 'the_shore',
  flags: ['knows_glyph', 'obj+:the_shore:lantern', 'obj-:the_shore:book'],
  items: ['brass-key', 'lantern'],
  journal: ['You read of a procession that never arrived.'],
  refused: ['book.read', 'gate.open'],
  rng: 99,
  seed: 7,
})

const model = (over: Partial<PanelModel> = {}): PanelModel =>
  deepFreeze({ view: shore, state: fresh, ...over })

const find = (root: HTMLElement, testid: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[data-testid="${testid}"]`)

const all = (root: HTMLElement, testid: string): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(`[data-testid="${testid}"]`))

const text = (root: HTMLElement, testid: string): string => find(root, testid)?.textContent ?? ''

const visiblePanes = (root: HTMLElement): string[] =>
  PANES.filter((name) => find(root, `pane-${name}`)?.hidden === false)

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('the panel, built', () => {
  it('mounts nothing on its own — the element is handed back, not appended', () => {
    // Every module in src/shell but main.ts must be importable with nothing
    // firing on it (P1.md). Building one is not mounting one either.
    createPanel().render(model())
    expect(document.body.innerHTML).toBe('')
  })

  it('is one fixed height, from the theme and not from its content', () => {
    const panel = createPanel()
    panel.render(model())
    const before = panel.el.style.height
    expect(before).toBe(theme.frame.panel)

    // A pane with a great deal in it, and a pane with nothing.
    panel.render(model({ state: walked, selectedId: 'book' }))
    for (const name of PANES) {
      panel.show(name)
      expect(panel.el.style.height).toBe(theme.frame.panel)
    }
    panel.render(model())
    expect(panel.el.style.height).toBe(before)
  })

  it('opens on ACT', () => {
    const panel = createPanel()
    panel.render(model())
    expect(panel.pane).toBe('act')
    expect(visiblePanes(panel.el)).toEqual(['act'])
  })
})

describe('the strip', () => {
  it('says where you are and what you carry, always', () => {
    const panel = createPanel()
    panel.render(model())
    expect(text(panel.el, 'panel-location')).toBe('the shore')
    expect(text(panel.el, 'panel-carried')).toBe('carried 0')

    panel.render(model({ state: walked }))
    expect(text(panel.el, 'panel-carried')).toBe('carried 2')
  })

  it('stays put whatever pane is showing', () => {
    const panel = createPanel()
    panel.render(model({ state: walked }))
    for (const name of PANES) {
      panel.show(name)
      expect(find(panel.el, 'panel-strip')?.hidden).toBe(false)
      expect(text(panel.el, 'panel-carried')).toBe('carried 2')
    }
  })
})

describe('the tabs', () => {
  it('are all four, always, whichever pane is showing', () => {
    const panel = createPanel()
    panel.render(model())
    for (const name of PANES) {
      panel.show(name)
      for (const other of PANES) {
        const tab = find(panel.el, `tab-${other}`)
        expect(tab).not.toBeNull()
        expect(tab?.hidden).toBe(false)
        expect(tab?.textContent).toBe(other)
      }
    }
  })

  it('swaps the pane when pressed, and exactly one pane shows', () => {
    const panel = createPanel()
    panel.render(model({ state: walked }))

    for (const name of PANES) {
      find(panel.el, `tab-${name}`)?.click()
      expect(panel.pane).toBe(name)
      expect(visiblePanes(panel.el)).toEqual([name])
      expect(find(panel.el, `tab-${name}`)?.getAttribute('aria-selected')).toBe('true')
    }
  })

  it('meets the minimum hit area (LAWS.md #visible)', () => {
    const panel = createPanel()
    panel.render(model())
    for (const name of PANES) {
      expect(find(panel.el, `tab-${name}`)?.style.minHeight).toBe(theme.frame.minTap)
    }
  })

  it('keeps the pane the person opened across a re-render', () => {
    // A turn passing must not throw you out of LOG and back to ACT. Only a
    // selection does that, and H106 asks for it out loud.
    const panel = createPanel()
    panel.render(model())
    panel.show('log')
    panel.render(model({ state: walked }))
    expect(panel.pane).toBe('log')
    expect(visiblePanes(panel.el)).toEqual(['log'])
  })
})

describe('ACT', () => {
  it('shows the selection and the taps it affords, verbatim and in order', () => {
    const panel = createPanel()
    panel.render(model({ selectedId: 'book' }))

    expect(text(panel.el, 'act-selection')).toBe('book')
    expect(all(panel.el, 'action').map((b) => b.dataset.action)).toEqual(['read', 'take'])
    expect(all(panel.el, 'action').map((b) => b.dataset.object)).toEqual(['book', 'book'])
  })

  it('shows the place, and no actions, when nothing is selected', () => {
    const panel = createPanel()
    panel.render(model())
    expect(text(panel.el, 'act-selection')).toBe('the shore')
    expect(all(panel.el, 'action')).toEqual([])

    // A selection that has left the scene is stale, not fatal.
    panel.render(model({ selectedId: 'ghost' }))
    expect(all(panel.el, 'action')).toEqual([])
  })

  it('gives an object with no actions a pane with no buttons, not an error', () => {
    // The first tap is free and describes (GAME.md #input); affordance is the
    // engine's to decide (LAWS.md #affordance).
    const panel = createPanel()
    panel.render(model({ selectedId: 'the_far_shore' }))
    expect(text(panel.el, 'act-selection')).toBe('the far shore')
    expect(all(panel.el, 'action')).toEqual([])
  })

  it('hands a press back out once, as an ActionRef, and acts on nothing itself', () => {
    const onAction = vi.fn()
    const before = JSON.stringify(fresh)
    const panel = createPanel({ onAction })
    panel.render(model({ selectedId: 'book' }))

    all(panel.el, 'action')[0]?.click()

    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith({ object: 'book', action: 'read' })
    expect(JSON.stringify(fresh)).toBe(before)
  })

  it('drops the old buttons rather than stacking them', () => {
    const panel = createPanel()
    panel.render(model({ selectedId: 'book' }))
    panel.render(model({ selectedId: 'book' }))
    expect(all(panel.el, 'action')).toHaveLength(2)
    panel.render(model({ selectedId: 'flat-stone' }))
    expect(all(panel.el, 'action').map((b) => b.dataset.action)).toEqual(['study'])
  })
})

describe('PACK', () => {
  it('is what the hands hold, in order', () => {
    const panel = createPanel()
    panel.render(model({ state: walked }))
    expect(all(panel.el, 'pack-item').map((s) => s.textContent)).toEqual(['brass key', 'lantern'])
  })

  it('says so when there is nothing', () => {
    const panel = createPanel()
    panel.render(model())
    expect(all(panel.el, 'pack-item')).toEqual([])
    expect(find(panel.el, 'pack-empty')).not.toBeNull()
  })
})

describe('LOG', () => {
  it('is the journal, with the refused ledger under it', () => {
    const panel = createPanel()
    panel.render(model({ state: walked }))

    expect(all(panel.el, 'log-journal-entry').map((e) => e.textContent)).toEqual([
      'You read of a procession that never arrived.',
    ])
    expect(all(panel.el, 'log-refused-entry').map((e) => e.textContent)).toEqual([
      'book.read',
      'gate.open',
    ])

    // Under it, on the screen and not merely in the DOM: the journal list comes
    // first in document order.
    const pane = find(panel.el, 'pane-log')
    const order = Array.from(pane?.querySelectorAll('[data-testid]') ?? []).map(
      (n) => (n as HTMLElement).dataset.testid,
    )
    expect(order.indexOf('log-journal')).toBeLessThan(order.indexOf('log-refused'))
  })

  it('shows no flags, no rng, no seed — that is the machine, not the person', () => {
    const panel = createPanel()
    panel.render(model({ state: walked }))
    const shown = panel.el.textContent ?? ''

    for (const flag of walked.flags) expect(shown).not.toContain(flag)
    expect(shown).not.toContain('obj+')
    expect(shown).not.toContain('obj-')
    expect(shown).not.toContain(String(walked.rng))
    // and it never reaches for them at all
    expect(SOURCE).not.toMatch(/state\.(flags|rng|seed)/)
  })

  it('reads as silence, not as a bug, when nothing has happened yet', () => {
    const panel = createPanel()
    panel.render(model())
    expect(all(panel.el, 'log-journal-entry')).toEqual([])
    expect(all(panel.el, 'log-refused-entry')).toEqual([])
    expect(all(panel.el, 'log-empty')).toHaveLength(2)
  })
})

describe('SET', () => {
  it('shows the outline switch, reflecting what it was handed', () => {
    const panel = createPanel()
    panel.render(model({ outline: true }))
    expect(find(panel.el, 'toggle-outline')?.getAttribute('aria-checked')).toBe('true')

    panel.render(model({ outline: false }))
    expect(find(panel.el, 'toggle-outline')?.getAttribute('aria-checked')).toBe('false')

    // Unstated is on: the wireframe is what H104 draws until someone says stop.
    panel.render(model())
    expect(find(panel.el, 'toggle-outline')?.getAttribute('aria-checked')).toBe('true')
  })

  it('asks for the opposite of what is showing, and changes nothing itself', () => {
    const onOutline = vi.fn()
    const panel = createPanel({ onOutline })
    panel.render(model({ outline: true }))

    find(panel.el, 'toggle-outline')?.click()

    expect(onOutline).toHaveBeenCalledTimes(1)
    expect(onOutline).toHaveBeenCalledWith(false)
    // The panel does not flip itself — the shell owns the value and re-renders.
    expect(find(panel.el, 'toggle-outline')?.getAttribute('aria-checked')).toBe('true')
  })
})

describe('drawing', () => {
  it('draws the same twice for the same model', () => {
    const first = createPanel()
    const second = createPanel()
    const m = model({ state: walked, selectedId: 'book', outline: false })

    first.render(m)
    const once = first.el.innerHTML
    first.render(m)
    second.render(m)

    expect(first.el.innerHTML).toBe(once)
    expect(second.el.innerHTML).toBe(once)
  })

  it('never writes through the View or the state it was handed', () => {
    const panel = createPanel()
    const before = JSON.stringify({ shore, walked })
    panel.render(model({ state: walked, selectedId: 'book' }))
    panel.show('log')
    expect(JSON.stringify({ shore, walked })).toBe(before)
  })

  it('has a stable hook for every tab and every pane', () => {
    // H100's slice acceptance addresses this panel from outside, and H115's art
    // pass rewrites every colour and class under it. The names are the contract.
    const panel = createPanel()
    panel.render(model())
    for (const name of PANES) {
      expect(find(panel.el, `tab-${name}`)).not.toBeNull()
      expect(find(panel.el, `pane-${name}`)).not.toBeNull()
    }
    for (const testid of ['panel-strip', 'panel-location', 'panel-carried', 'panel-tabs']) {
      expect(find(panel.el, testid)).not.toBeNull()
    }
    expect(panel.el.dataset.testid).toBe('panel')
  })

  it('names its panes for what the person sees', () => {
    const named: Pane[] = ['act', 'pack', 'log', 'set']
    expect([...PANES]).toEqual(named)
  })
})

describe('layering', () => {
  it('decides nothing — it never resolves, and never acts', () => {
    // .llm/rules/layering.mdc — no rules in the shell.
    expect(SOURCE).not.toMatch(/from '\.\.\/core\/(resolve|api|cards)'/)
    expect(SOURCE).not.toMatch(/\bact\s*\(/)
  })
})
