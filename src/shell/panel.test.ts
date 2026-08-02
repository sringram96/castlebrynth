// @vitest-environment happy-dom
//
// vitest.config.ts is in no card's scope, so the DOM environment is asked for
// per file rather than by glob. The pragma above is that ask.
import { beforeEach, describe, expect, it } from 'vitest'
import { renderPanel } from './panel'
import { emptyState, withItem } from '../core/types'
import type { GameState } from '../core/types'

// P103 · renderPanel, on its own. The acceptance owns what the panel may and
// may not show; what is here is what it does not cover — that the two records
// stay two, that an entry is prose rather than markup, that the person's own
// hand is copied and not tidied, and that nothing in the panel is a tap.

let el: HTMLElement
beforeEach(() => {
  el = document.createElement('div')
})

const journalled = (state: GameState, ...entries: string[]): GameState => ({
  ...state,
  journal: [...state.journal, ...entries],
})

const shore = (): GameState => emptyState('shore', 42)

const list = (className: string): HTMLElement => {
  const found = el.querySelector<HTMLElement>(`.${className}`)
  if (found === null) throw new Error(`no ${className} in the panel`)
  return found
}

describe('P103 · the two records stay two', () => {
  it('draws both lists on a run that has neither', () => {
    renderPanel(el, shore())
    expect(list('journal').children).toHaveLength(0)
    expect(list('carried').children).toHaveLength(0)
  })

  it('keeps what you carry out of what you wrote down', () => {
    renderPanel(el, journalled(withItem(shore(), 'lamp'), 'procession'))
    expect(list('journal').textContent).toBe('procession')
    expect(list('carried').textContent).toBe('lamp')
  })

  it('keeps the order the state kept them in', () => {
    renderPanel(el, withItem(withItem(shore(), 'lamp'), 'key'))
    const carried = Array.from(list('carried').children).map((c) => c.textContent)
    expect(carried).toEqual(['lamp', 'key'])
  })
})

describe('P103 · the panel copies the hand, it does not tidy it', () => {
  it('draws an entry as prose, not as markup', () => {
    renderPanel(el, journalled(shore(), 'a door, <b>shut</b>'))
    expect(el.querySelector('b')).toBeNull()
    expect(el.textContent).toContain('a door, <b>shut</b>')
  })

  // `journal` is appended to without a membership check (resolve.ts) — the
  // ledger is the one that keeps a key once. Twice written is twice there.
  it('writes a repeated entry twice', () => {
    renderPanel(el, journalled(shore(), 'procession', 'procession'))
    expect(list('journal').children).toHaveLength(2)
  })
})

describe('P103 · nothing in the panel is a tap', () => {
  // P100 finds a control by [data-object][data-action]. A journal entry that
  // wore either would be tappable and would resolve nothing.
  it('offers no control attributes', () => {
    renderPanel(el, journalled(withItem(shore(), 'lamp'), 'procession'))
    expect(el.querySelector('[data-object]')).toBeNull()
    expect(el.querySelector('[data-action]')).toBeNull()
    expect(el.querySelector('button')).toBeNull()
  })

  it('draws into the element it was handed and no other', () => {
    const other = document.createElement('div')
    other.textContent = 'not yours'
    renderPanel(el, journalled(shore(), 'procession'))
    expect(other.textContent).toBe('not yours')
  })
})
