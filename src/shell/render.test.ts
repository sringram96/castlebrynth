// @vitest-environment happy-dom
//
// vitest.config.ts is in no card's scope, so the DOM environment is asked for
// per file rather than by glob. The pragma above is that ask.
import { beforeEach, describe, expect, it } from 'vitest'
import { render, renderEffects } from './render'
import type { ActionRef, Effect, View } from '../core/api-types'

// P102 · render and renderEffects, on their own. The acceptance owns the shape
// of the frame; what is here is what it does not cover — that a redraw takes
// the old frame's listeners with it, that an effect is never mistaken for a
// control, and that the shell stays silent when the world was.

const shore: View = {
  line: 'Grey water, and no far side to it.',
  scene: 'shore',
  objects: [
    { id: 'stone', actions: ['study'] },
    { id: 'book', actions: ['read'] },
  ],
}

const nothing = (): void => {}

let el: HTMLElement
beforeEach(() => {
  el = document.createElement('div')
})

// A miss is a broken test rather than a null dereference three lines later.
const control = (object: string): HTMLElement => {
  const found = el.querySelector<HTMLElement>(`[data-object="${object}"]`)
  if (found === null) throw new Error(`no control for ${object}`)
  return found
}

describe('P102 · render', () => {
  it('draws the line as prose, not as markup', () => {
    render(el, { ...shore, line: 'A door, <b>shut</b>.' }, nothing)
    expect(el.querySelector('b')).toBeNull()
    expect(el.textContent).toContain('A door, <b>shut</b>.')
  })

  it('keeps the authored order of the objects and their actions', () => {
    render(el, { line: 'x', scene: 'x', objects: [{ id: 'pool', actions: ['look', 'drink'] }] }, nothing)
    // Array.from, not a spread: the DOM lib is in without DOM.Iterable, so a
    // NodeList is array-like here and not iterable.
    const refs = Array.from(el.querySelectorAll<HTMLElement>('[data-object][data-action]')).map(
      (c) => c.dataset['action'],
    )
    expect(refs).toEqual(['look', 'drink'])
  })

  it('draws into the element it was handed and no other', () => {
    const other = document.createElement('div')
    other.textContent = 'not yours'
    render(el, shore, nothing)
    expect(other.textContent).toBe('not yours')
  })
})

describe('P102 · a redraw takes the old frame with it', () => {
  it('leaves no listener behind — a tap after two draws fires once', () => {
    const taps: ActionRef[] = []
    const onTap = (ref: ActionRef): void => void taps.push(ref)
    render(el, shore, onTap)
    render(el, shore, onTap)
    control('book').click()
    expect(taps).toEqual([{ object: 'book', action: 'read' }])
  })

  it('taps back through the callback the current frame was drawn with', () => {
    const first: ActionRef[] = []
    const second: ActionRef[] = []
    render(el, shore, (ref) => void first.push(ref))
    render(el, shore, (ref) => void second.push(ref))
    control('stone').click()
    expect(first).toEqual([])
    expect(second).toHaveLength(1)
  })
})

describe('P102 · the effects of a turn', () => {
  it('says what the world said', () => {
    const said: Effect[] = [{ kind: 'say', text: 'The stone is warm where nothing else is.' }]
    renderEffects(el, said)
    expect(el.textContent).toContain('The stone is warm where nothing else is.')
  })

  it('marks a refusal apart from a thing that happened', () => {
    const turn: Effect[] = [
      { kind: 'refused', ref: { object: 'book', action: 'read' }, line: 'The marks swim.' },
    ]
    renderEffects(el, turn)
    const refusal = el.querySelector('.refused')
    expect(refusal, 'the refusal is not marked as one').not.toBeNull()
    expect(refusal?.textContent).toBe('The marks swim.')
  })

  it('never gives a refusal the attributes of a control', () => {
    // P100 finds a tap by [data-object][data-action]. A refusal carries a ref,
    // and if it wore one as data it would be tappable and would resolve
    // nothing.
    const turn: Effect[] = [
      { kind: 'refused', ref: { object: 'book', action: 'read' }, line: 'The marks swim.' },
    ]
    renderEffects(el, turn)
    expect(el.querySelector('[data-object]')).toBeNull()
    expect(el.querySelector('[data-action]')).toBeNull()
  })

  it('shows a journal addition as it arrives', () => {
    const turn: Effect[] = [{ kind: 'journal', entry: 'procession' }]
    renderEffects(el, turn)
    expect(el.textContent).toContain('procession')
  })

  it('keeps them in the order the world produced them', () => {
    const turn: Effect[] = [
      { kind: 'say', text: 'The marks hold still.' },
      { kind: 'journal', entry: 'procession' },
    ]
    renderEffects(el, turn)
    const text = el.textContent ?? ''
    expect(text.indexOf('The marks hold still.')).toBeLessThan(text.indexOf('procession'))
  })

  it('puts no scene id on the screen when the world moved', () => {
    const turn: Effect[] = [{ kind: 'enter', scene: 'stair' }, { kind: 'say', text: 'The path climbs.' }]
    renderEffects(el, turn)
    expect(el.textContent).toContain('The path climbs.')
    expect(el.textContent, 'an id reached the screen').not.toContain('stair')
  })

  it('says nothing at all for a turn that said nothing', () => {
    renderEffects(el, [])
    expect(el.textContent).toBe('')
    expect(el.children).toHaveLength(0)
  })

  it('clears last turn — the screen says what this tap did', () => {
    renderEffects(el, [{ kind: 'say', text: 'The pool is shallow and clear.' }])
    renderEffects(el, [{ kind: 'say', text: 'You hold still and listen.' }])
    expect(el.textContent).toContain('You hold still and listen.')
    expect(el.textContent).not.toContain('The pool is shallow')
  })

  it('draws effect prose as prose, not as markup', () => {
    renderEffects(el, [{ kind: 'say', text: 'A door, <b>shut</b>.' }])
    expect(el.querySelector('b')).toBeNull()
    expect(el.textContent).toBe('A door, <b>shut</b>.')
  })
})
