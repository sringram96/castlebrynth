// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '../../src/shell/render'
import type { View } from '../../src/core/api-types'
import type { ActionRef } from '../../src/core/api-types'

// P102 · draw a View, send taps back. Full redraw every tap; no diffing.
//
// A ViewObject carries `tap`, the free tap's own prose (api-types.ts), so every
// fixture here carries one. The renderer does not draw it yet — a free-tap step
// in the shell is future work, and this card asserts what the renderer does
// today: the line, and one control per object/action pair.

const root = resolve(__dirname, '../..')

const view = (over: Partial<View> = {}): View => ({
  line: 'The ring of the portal is cold all through, and nothing is coming back through it.',
  scene: 'crossing',
  objects: [
    { id: 'stone', tap: 'A block set into the wall at chest height.', actions: ['study'] },
    { id: 'door', tap: 'A low door, barred from this side.', actions: ['open'] },
  ],
  ...over,
})

let el: HTMLElement
beforeEach(() => {
  el = document.createElement('div')
})

const controls = () => [...el.querySelectorAll('[data-object][data-action]')] as HTMLElement[]

describe('P102 · the scene', () => {
  it('draws the narrator line', () => {
    render(el, view(), () => {})
    expect(el.textContent).toContain(
      'The ring of the portal is cold all through, and nothing is coming back through it.',
    )
  })

  it('draws the arrival line above it when the view carries one', () => {
    render(el, view({ enter: 'The portal puts you down on stone.' }), () => {})
    const text = el.textContent ?? ''
    expect(text).toContain('The portal puts you down on stone.')
    expect(text.indexOf('The portal puts you down')).toBeLessThan(text.indexOf('The ring of the portal'))
  })

  it('omits the arrival line when there is none', () => {
    render(el, view(), () => {})
    expect(el.textContent).not.toContain('undefined')
  })

  it('offers one control per object/action pair', () => {
    render(el, view(), () => {})
    expect(controls()).toHaveLength(2)
  })

  it('offers a control per action when an object affords several', () => {
    render(
      el,
      view({
        objects: [
          {
            id: 'portal',
            tap: "It's a portal, and it's dead.",
            actions: ['touch', 'look', 'listen'],
          },
        ],
      }),
      () => {},
    )
    expect(controls()).toHaveLength(3)
  })

  it('labels each control with its object and action', () => {
    render(el, view(), () => {})
    const labels = controls().map((c) => (c.textContent ?? '').toLowerCase())
    expect(labels.some((l) => l.includes('stone') && l.includes('study'))).toBe(true)
    expect(labels.some((l) => l.includes('door') && l.includes('open'))).toBe(true)
  })

  it('carries the ref in data attributes', () => {
    render(el, view(), () => {})
    const door = controls().find((c) => c.dataset['object'] === 'door')
    expect(door).toBeDefined()
    expect(door!.dataset['action']).toBe('open')
  })

  it('does not print the free tap — that step is not in the shell yet', () => {
    render(el, view(), () => {})
    expect(el.textContent).not.toContain('A block set into the wall')
  })
})

describe('P102 · taps', () => {
  it('calls back with the ref that was tapped', () => {
    const taps: ActionRef[] = []
    render(el, view(), (ref) => taps.push(ref))
    controls().find((c) => c.dataset['object'] === 'door')!.click()
    expect(taps).toEqual([{ object: 'door', action: 'open' }])
  })

  it('does not fire on render', () => {
    const taps: ActionRef[] = []
    render(el, view(), (ref) => taps.push(ref))
    expect(taps).toEqual([])
  })

  it('redraws clean — rendering twice does not double the controls', () => {
    render(el, view(), () => {})
    render(el, view(), () => {})
    expect(controls()).toHaveLength(2)
  })

  it('a redraw does not leave the old scene behind', () => {
    render(el, view(), () => {})
    render(
      el,
      view({ line: 'The cold comes up the steps to meet you.', scene: 'descent', objects: [] }),
      () => {},
    )
    expect(el.textContent).toContain('The cold comes up the steps to meet you.')
    expect(el.textContent).not.toContain('The ring of the portal')
  })
})

describe('P102 · the shell adds no words of its own (CANON.md)', () => {
  it('renders an empty scene without inventing prose', () => {
    render(el, view({ objects: [] }), () => {})
    const text = (el.textContent ?? '').toLowerCase()
    for (const invented of ['nothing happens', 'try something', 'no actions', 'loading']) {
      expect(text, `shell invented "${invented}"`).not.toContain(invented)
    }
  })

  it('speaks no banned word', () => {
    render(el, view(), () => {})
    const text = (el.textContent ?? '').toLowerCase()
    for (const banned of [
      'player', 'game', 'level', 'inventory', 'menu', 'unlock',
      'suddenly', 'evil', 'creepy', 'yet', 'later',
    ]) {
      expect(text, `banned word "${banned}"`).not.toMatch(new RegExp(`\\b${banned}\\b`))
    }
    expect(text, 'banned phrase "you feel"').not.toMatch(/\byou\s+feel\b/)
  })
})

describe('P102 · the contract', () => {
  it('touches GameAPI only — no reach into resolve or the bundle', () => {
    const src = readFileSync(resolve(root, 'src/shell/render.ts'), 'utf8')
    expect(src).not.toMatch(/core\/resolve/)
    expect(src).not.toMatch(/\.scenes\s*[[.]/)
  })
})
