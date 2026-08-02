// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderPanel } from '../../src/shell/panel'
import { emptyState, withFlag, withItem } from '../../src/core/types'
import type { GameState } from '../../src/core/types'

// P103 · the panel that is always there. The person's own record — journal and
// what they carry. Never the engine's bookkeeping.
//
// A journal entry is an id now, not prose (VOCAB.md · `journal: id`), so the
// entries below are the Crossing's ids. The panel prints what the state holds,
// which is what the ids are.

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
    renderPanel(el, withJournal(emptyState('crossing', 42), 'the_mark'))
    expect(el.textContent).toContain('the_mark')
  })

  it('keeps them in order, newest last', () => {
    renderPanel(
      el,
      withJournal(emptyState('crossing', 42), 'scraped_hands', 'the_mark', 'the_way_down'),
    )
    const text = el.textContent ?? ''
    expect(text.indexOf('scraped_hands')).toBeLessThan(text.indexOf('the_mark'))
    expect(text.indexOf('the_mark')).toBeLessThan(text.indexOf('the_way_down'))
  })

  it('is present from the first frame, before it has anything in it', () => {
    renderPanel(el, emptyState('crossing', 42))
    expect(el.children.length, 'the panel must exist while empty').toBeGreaterThan(0)
  })

  it('an empty journal reads as empty, not as a message about being empty', () => {
    renderPanel(el, emptyState('crossing', 42))
    const text = (el.textContent ?? '').toLowerCase()
    for (const chatter of ['no entries', 'nothing yet', 'empty', 'you have not']) {
      expect(text, `panel editorialised: "${chatter}"`).not.toContain(chatter)
    }
  })

  it('redraws clean', () => {
    const s = withJournal(emptyState('crossing', 42), 'the_mark')
    renderPanel(el, s)
    renderPanel(el, s)
    expect((el.textContent ?? '').match(/the_mark/g)).toHaveLength(1)
  })
})

describe('P103 · what you carry', () => {
  it('shows items', () => {
    renderPanel(el, withItem(emptyState('crossing', 42), 'tithe'))
    expect(el.textContent).toContain('tithe')
  })

  it('drops an item that was removed', () => {
    const held = withItem(emptyState('crossing', 42), 'tithe')
    renderPanel(el, held)
    expect(el.textContent).toContain('tithe')
    renderPanel(el, { ...held, items: [] })
    expect(el.textContent).not.toContain('tithe')
  })
})

describe('P103 · the panel never leaks the engine', () => {
  it('does not show flags', () => {
    renderPanel(el, withFlag(emptyState('crossing', 42), 'knows_mark'))
    expect(el.textContent).not.toContain('knows_mark')
  })

  it('never shows object-set bookkeeping', () => {
    // The reserved keys are scene-scoped now (resolve.ts · `obj+:scene:object`),
    // so the leak to catch carries a scene id as well as an object id.
    const s = withFlag(
      withFlag(emptyState('crossing', 42), 'obj+:crossing:effigy'),
      'obj-:crossing:portal',
    )
    renderPanel(el, s)
    const text = el.textContent ?? ''
    expect(text, 'obj+: leaked to the screen').not.toContain('obj+')
    expect(text, 'obj-: leaked to the screen').not.toContain('obj-')
    expect(text, 'the added object leaked to the screen').not.toContain('effigy')
    expect(text, 'the scene id leaked to the screen').not.toContain('crossing')
  })

  it('shows neither the seed nor the rng', () => {
    const s = emptyState('crossing', 424242)
    renderPanel(el, s)
    expect(el.textContent).not.toContain('424242')
  })

  it('does not show the refusal ledger — the world remembers, the person need not', () => {
    const s = { ...emptyState('crossing', 42), refused: ['door.open'] }
    renderPanel(el, s)
    expect(el.textContent).not.toContain('door.open')
  })
})
