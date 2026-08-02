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
//
// Every ViewObject carries `tap`, the free tap's own prose (api-types.ts), so
// every fixture here carries one — the renderer does not draw it yet, and a
// View without one is not a View the API can hand it.

const crossing: View = {
  line: 'The ring of the portal is cold all through, and nothing is coming back through it.',
  scene: 'crossing',
  objects: [
    {
      id: 'stone',
      tap: 'A block set into the wall at chest height, scored over with a shape.',
      actions: ['study'],
    },
    {
      id: 'door',
      tap: 'A low door, barred from this side. The same shape is burned into the wood at eye height.',
      actions: ['open'],
    },
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
    render(el, { ...crossing, line: 'A door, <b>shut</b>.' }, nothing)
    expect(el.querySelector('b')).toBeNull()
    expect(el.textContent).toContain('A door, <b>shut</b>.')
  })

  it('keeps the authored order of the objects and their actions', () => {
    render(
      el,
      {
        line: 'x',
        scene: 'crossing',
        objects: [{ id: 'door', tap: 'A low door, barred from this side.', actions: ['open', 'listen'] }],
      },
      nothing,
    )
    // Array.from, not a spread: the DOM lib is in without DOM.Iterable, so a
    // NodeList is array-like here and not iterable.
    const refs = Array.from(el.querySelectorAll<HTMLElement>('[data-object][data-action]')).map(
      (c) => c.dataset['action'],
    )
    expect(refs).toEqual(['open', 'listen'])
  })

  it('draws into the element it was handed and no other', () => {
    const other = document.createElement('div')
    other.textContent = 'not yours'
    render(el, crossing, nothing)
    expect(other.textContent).toBe('not yours')
  })
})

describe('P102 · a redraw takes the old frame with it', () => {
  it('leaves no listener behind — a tap after two draws fires once', () => {
    const taps: ActionRef[] = []
    const onTap = (ref: ActionRef): void => void taps.push(ref)
    render(el, crossing, onTap)
    render(el, crossing, onTap)
    control('door').click()
    expect(taps).toEqual([{ object: 'door', action: 'open' }])
  })

  it('taps back through the callback the current frame was drawn with', () => {
    const first: ActionRef[] = []
    const second: ActionRef[] = []
    render(el, crossing, (ref) => void first.push(ref))
    render(el, crossing, (ref) => void second.push(ref))
    control('stone').click()
    expect(first).toEqual([])
    expect(second).toHaveLength(1)
  })
})

describe('P102 · the effects of a turn', () => {
  it('says what the world said', () => {
    const said: Effect[] = [
      { kind: 'say', text: 'The stone takes the heat out of your palm and gives nothing back.' },
    ]
    renderEffects(el, said)
    expect(el.textContent).toContain(
      'The stone takes the heat out of your palm and gives nothing back.',
    )
  })

  it('marks a refusal apart from a thing that happened', () => {
    const turn: Effect[] = [
      {
        kind: 'refused',
        ref: { object: 'door', action: 'open' },
        line: 'The mark on the wood means something. Not to you, and not to your hands.',
      },
    ]
    renderEffects(el, turn)
    const refusal = el.querySelector('.refused')
    expect(refusal, 'the refusal is not marked as one').not.toBeNull()
    expect(refusal?.textContent).toBe(
      'The mark on the wood means something. Not to you, and not to your hands.',
    )
  })

  it('never gives a refusal the attributes of a control', () => {
    // P100 finds a tap by [data-object][data-action]. A refusal carries a ref,
    // and if it wore one as data it would be tappable and would resolve
    // nothing.
    const turn: Effect[] = [
      {
        kind: 'refused',
        ref: { object: 'door', action: 'open' },
        line: 'The mark on the wood means something. Not to you, and not to your hands.',
      },
    ]
    renderEffects(el, turn)
    expect(el.querySelector('[data-object]')).toBeNull()
    expect(el.querySelector('[data-action]')).toBeNull()
  })

  it('shows a journal addition as it arrives', () => {
    const turn: Effect[] = [{ kind: 'journal', entry: 'the_mark' }]
    renderEffects(el, turn)
    expect(el.textContent).toContain('the_mark')
  })

  it('keeps them in the order the world produced them', () => {
    const turn: Effect[] = [
      { kind: 'say', text: 'You lift the bar, and the door is only a door.' },
      { kind: 'journal', entry: 'the_way_down' },
    ]
    renderEffects(el, turn)
    const text = el.textContent ?? ''
    expect(text.indexOf('You lift the bar')).toBeLessThan(text.indexOf('the_way_down'))
  })

  it('puts no scene id on the screen when the world moved', () => {
    const turn: Effect[] = [
      { kind: 'enter', scene: 'dark' },
      { kind: 'say', text: 'The cold comes up the steps to meet you.' },
    ]
    renderEffects(el, turn)
    expect(el.textContent).toContain('The cold comes up the steps to meet you.')
    expect(el.textContent, 'an id reached the screen').not.toContain('dark')
  })

  it('says how the slice ended, and keeps the bookkeeping off the screen', () => {
    // The end speaks for itself. `note` is for the Book of Ends (render.ts),
    // and a screen that printed it would be showing the person the ledger the
    // world keeps about them.
    const turn: Effect[] = [
      {
        kind: 'end',
        line: 'The dark takes the third tread, and then you.',
        note: 'left the Crossing',
      },
    ]
    renderEffects(el, turn)
    expect(el.textContent).toContain('The dark takes the third tread, and then you.')
    expect(el.textContent, 'a note reached the screen').not.toContain('left the Crossing')
  })

  it('says nothing at all for a turn that said nothing', () => {
    renderEffects(el, [])
    expect(el.textContent).toBe('')
    expect(el.children).toHaveLength(0)
  })

  it('clears last turn — the screen says what this tap did', () => {
    renderEffects(el, [
      { kind: 'say', text: 'The stone takes the heat out of your palm and gives nothing back.' },
    ])
    renderEffects(el, [
      { kind: 'say', text: 'Nothing on the other side. Not silence — the sound of a place too big to hear the end of.' },
    ])
    expect(el.textContent).toContain('Nothing on the other side.')
    expect(el.textContent).not.toContain('takes the heat out of your palm')
  })

  it('draws effect prose as prose, not as markup', () => {
    renderEffects(el, [{ kind: 'say', text: 'A door, <b>shut</b>.' }])
    expect(el.querySelector('b')).toBeNull()
    expect(el.textContent).toBe('A door, <b>shut</b>.')
  })
})
