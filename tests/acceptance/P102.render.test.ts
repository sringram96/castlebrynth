// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '../../src/shell/render'
import type { View } from '../../src/core/api-types'
import type { ActionRef } from '../../src/core/api-types'

// P102 · draw a View, send taps back. Full redraw every tap; no diffing.

const root = resolve(__dirname, '../..')

const view = (over: Partial<View> = {}): View => ({
  line: 'Grey water, and no far side to it.',
  scene: 'shore',
  objects: [
    { id: 'stone', actions: ['study'] },
    { id: 'book', actions: ['read'] },
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
    expect(el.textContent).toContain('Grey water, and no far side to it.')
  })

  it('draws the arrival line above it when the view carries one', () => {
    render(el, view({ enter: 'You come down to the water.' }), () => {})
    const text = el.textContent ?? ''
    expect(text).toContain('You come down to the water.')
    expect(text.indexOf('You come down')).toBeLessThan(text.indexOf('Grey water'))
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
    render(el, view({ objects: [{ id: 'pool', actions: ['look', 'touch', 'drink'] }] }), () => {})
    expect(controls()).toHaveLength(3)
  })

  it('labels each control with its object and action', () => {
    render(el, view(), () => {})
    const labels = controls().map((c) => (c.textContent ?? '').toLowerCase())
    expect(labels.some((l) => l.includes('stone') && l.includes('study'))).toBe(true)
    expect(labels.some((l) => l.includes('book') && l.includes('read'))).toBe(true)
  })

  it('carries the ref in data attributes', () => {
    render(el, view(), () => {})
    const book = controls().find((c) => c.dataset['object'] === 'book')
    expect(book).toBeDefined()
    expect(book!.dataset['action']).toBe('read')
  })
})

describe('P102 · taps', () => {
  it('calls back with the ref that was tapped', () => {
    const taps: ActionRef[] = []
    render(el, view(), (ref) => taps.push(ref))
    controls().find((c) => c.dataset['object'] === 'book')!.click()
    expect(taps).toEqual([{ object: 'book', action: 'read' }])
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
    render(el, view({ line: 'The stair goes up.', scene: 'stair', objects: [] }), () => {})
    expect(el.textContent).toContain('The stair goes up.')
    expect(el.textContent).not.toContain('Grey water')
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
    for (const banned of ['player', 'game', 'level', 'inventory', 'menu', 'unlock']) {
      expect(text, `banned word "${banned}"`).not.toMatch(new RegExp(`\\b${banned}\\b`))
    }
  })
})

describe('P102 · the contract', () => {
  it('touches GameAPI only — no reach into resolve or the bundle', () => {
    const src = readFileSync(resolve(root, 'src/shell/render.ts'), 'utf8')
    expect(src).not.toMatch(/from ['"].*core\/resolve['"]/)
    expect(src).not.toMatch(/bundle\.scenes/)
  })
})
