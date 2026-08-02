// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderPanel } from '../../src/shell/panel'
import { emptyState, withFlag, withItem } from '../../src/core/types'
import type { GameState } from '../../src/core/types'

// P103 · the panel that is always there. The person's own record — journal and
// what they carry. Never the engine's bookkeeping.

let el: HTMLElement
beforeEach(() => {
  el = document.createElement('div')
})

const withJournal = (state: GameState, ...entries: string[]): GameState => ({
  ...state,
  journal: [...state.journal, ...entries],
})

describe('P103 · the journal', () => {
  it('shows entries', () => {
    renderPanel(el, withJournal(emptyState('shore', 42), 'procession'))
    expect(el.textContent).toContain('procession')
  })

  it('keeps them in order, newest last', () => {
    renderPanel(el, withJournal(emptyState('shore', 42), 'procession', 'the stair', 'the hall'))
    const text = el.textContent ?? ''
    expect(text.indexOf('procession')).toBeLessThan(text.indexOf('the stair'))
    expect(text.indexOf('the stair')).toBeLessThan(text.indexOf('the hall'))
  })

  it('is present from the first frame, before it has anything in it', () => {
    renderPanel(el, emptyState('shore', 42))
    expect(el.children.length, 'the panel must exist while empty').toBeGreaterThan(0)
  })

  it('an empty journal reads as empty, not as a message about being empty', () => {
    renderPanel(el, emptyState('shore', 42))
    const text = (el.textContent ?? '').toLowerCase()
    for (const chatter of ['no entries', 'nothing yet', 'empty', 'you have not']) {
      expect(text, `panel editorialised: "${chatter}"`).not.toContain(chatter)
    }
  })

  it('redraws clean', () => {
    const s = withJournal(emptyState('shore', 42), 'procession')
    renderPanel(el, s)
    renderPanel(el, s)
    expect((el.textContent ?? '').match(/procession/g)).toHaveLength(1)
  })
})

describe('P103 · what you carry', () => {
  it('shows items', () => {
    renderPanel(el, withItem(emptyState('shore', 42), 'lamp'))
    expect(el.textContent).toContain('lamp')
  })

  it('drops an item that was removed', () => {
    const held = withItem(emptyState('shore', 42), 'lamp')
    renderPanel(el, held)
    expect(el.textContent).toContain('lamp')
    renderPanel(el, { ...held, items: [] })
    expect(el.textContent).not.toContain('lamp')
  })
})

describe('P103 · the panel never leaks the engine', () => {
  it('does not show flags', () => {
    renderPanel(el, withFlag(emptyState('shore', 42), 'knows_glyph'))
    expect(el.textContent).not.toContain('knows_glyph')
  })

  it('never shows object-set bookkeeping', () => {
    const s = withFlag(withFlag(emptyState('shore', 42), 'obj+:ash'), 'obj-:pool')
    renderPanel(el, s)
    const text = el.textContent ?? ''
    expect(text, 'obj+: leaked to the screen').not.toContain('obj+')
    expect(text, 'obj-: leaked to the screen').not.toContain('obj-')
    expect(text).not.toContain('ash')
  })

  it('shows neither the seed nor the rng', () => {
    const s = emptyState('shore', 424242)
    renderPanel(el, s)
    expect(el.textContent).not.toContain('424242')
  })

  it('does not show the refusal ledger — the world remembers, the person need not', () => {
    const s = { ...emptyState('shore', 42), refused: ['book.read'] }
    renderPanel(el, s)
    expect(el.textContent).not.toContain('book.read')
  })
})
