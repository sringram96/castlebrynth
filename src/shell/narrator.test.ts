// H103 · the line updates on say and on enter, and it never stacks.
//
// The card's done_when, one describe at a time. "Never stacks" is the one that
// matters most and it is asserted the hard way — not "the new line is in
// there" but "the old line is not", because a narrator that appended would
// pass the first and fail the person (H105 owns the log).
//
// Inputs are deep-frozen the way the acceptance suite freezes engine inputs
// (CLAUDE.md), so a shell that wrote back through a View or an effect list
// fails here rather than three cards later.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Effect, View } from '../core/api-types'
import { theme } from './theme'
import { createNarrator } from './narrator'

// Not `new URL(...)`: these tests run under happy-dom (H101's
// environmentMatchGlobs), whose global URL is its own, and node's fs rejects
// it. fileURLToPath is the one spelling that survives both environments.
const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'narrator.ts'), 'utf8')

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const shore: View = deepFreeze({
  line: 'Grey water, and no far side to it.',
  scene: 'shore',
  objects: [
    { id: 'stone', actions: ['study'] },
    { id: 'book', actions: ['read'] },
  ],
})

// Where a `goto` lands: a scene that speaks an arrival apart from its line.
// The id is deliberately a word the prose does not use, so "reads the arrival
// off the View" below can say so by its absence.
const gate: View = deepFreeze({
  enter: 'The path climbs, and the shingle is behind you.',
  line: 'A gate, and no one keeping it.',
  scene: 'sealed-gate',
  objects: [],
})

/** What `getView` hands back for a scene the bundle has not got. */
const nowhere: View = deepFreeze({ line: '', scene: 'elsewhere', objects: [] })

const said = (text: string): Effect => deepFreeze({ kind: 'say', text })
const arrived = (scene: string): Effect => deepFreeze({ kind: 'enter', scene })
const refused = (object: string, action: string, line: string): Effect =>
  deepFreeze({ kind: 'refused', ref: { object, action }, line })

/** The line, as a person reads it: one string, newline between the two. */
const spoken = (el: HTMLElement): string => el.textContent ?? ''
const lines = (el: HTMLElement): string[] => (spoken(el) === '' ? [] : spoken(el).split('\n'))

let narrator = createNarrator()

beforeEach(() => {
  document.body.innerHTML = ''
  narrator = createNarrator()
  document.body.append(narrator.el)
})

describe('createNarrator', () => {
  it('is inert on import — nothing draws until something appends it', () => {
    // The boundary H101 exists to hold: main.ts is the only module in
    // src/shell allowed a side effect on import. A fresh narrator is detached.
    const fresh = createNarrator()
    expect(fresh.el.isConnected).toBe(false)
    expect(fresh.el.textContent).toBe('')
  })

  it('is set in the prose face, on the reserved height', () => {
    // GAME.md #frame — the writing reads as writing because it is not the
    // interface. The values are H102's tokens, read and set, never re-typed.
    const { style } = narrator.el
    expect(style.fontFamily).toBe(theme.type.prose)
    expect(style.fontStyle).toBe('italic')
    expect(style.fontSize).toBe(theme.type.size.prose)
    expect(style.lineHeight).toBe(theme.type.leading.prose)
    expect(style.color).toBe(theme.color.text)
    // Reserved, not fixed: a one-line turn must not jump the scene under the
    // thumb, and a turn that speaks and then arrives must still fit.
    expect(style.minHeight).toBe(theme.frame.narrator)
    expect(style.height).toBe('')
  })
})

describe('the opening draw', () => {
  it('speaks the place when the turn had nothing to report', () => {
    narrator.render(shore)
    expect(lines(narrator.el)).toEqual(['Grey water, and no far side to it.'])
  })

  it('stands the arrival above where you now are', () => {
    narrator.render(gate)
    expect(lines(narrator.el)).toEqual([
      'The path climbs, and the shingle is behind you.',
      'A gate, and no one keeping it.',
    ])
  })

  it('says nothing rather than showing a blank line', () => {
    narrator.render(nowhere)
    expect(spoken(narrator.el)).toBe('')
  })
})

describe('say', () => {
  it('is what this tap did', () => {
    narrator.render(shore, [said('The stone is warm where nothing else is.')])
    expect(lines(narrator.el)).toEqual(['The stone is warm where nothing else is.'])
  })

  it('is in the order the world did it', () => {
    narrator.render(shore, [said('first'), said('second'), said('third')])
    expect(lines(narrator.el)).toEqual(['first', 'second', 'third'])
  })

  it('replaces the scene line rather than standing under it', () => {
    // The place is not re-spoken every turn. That would be a wall of text
    // where GAME.md #frame asks for one or two lines.
    narrator.render(shore)
    narrator.render(shore, [said('The pool is shallow and clear.')])
    expect(spoken(narrator.el)).not.toContain('Grey water')
  })

  it('drops a blank say rather than printing an empty line', () => {
    narrator.render(shore, [said('  '), said('the only line')])
    expect(lines(narrator.el)).toEqual(['the only line'])
  })
})

describe('refused', () => {
  it("is spoken — the refusal line is the turn's only prose", () => {
    // VOCAB.md: `refuse` implies no other delta fired, and the shore's
    // refusals carry no `say` beside them. A narrator that skipped this would
    // answer "read the book" with a blank screen. The ledger is the second
    // thing that happens to a refusal (GAME.md #consequences, H105's LOG).
    narrator.render(shore, [refused('book', 'read', 'The marks swim. You cannot hold them.')])
    expect(lines(narrator.el)).toEqual(['The marks swim. You cannot hold them.'])
  })

  it('keeps its place in the order when a say came with it', () => {
    narrator.render(shore, [said('You try the words.'), refused('book', 'read', 'They swim.')])
    expect(lines(narrator.el)).toEqual(['You try the words.', 'They swim.'])
  })
})

describe('journal', () => {
  it('is not writing — an entry is a key, and the journal is a pane', () => {
    // LAWS.md #consequences: the journal records acts and scenes. `procession`
    // is an entry id, not prose, and H105 draws it in LOG.
    narrator.render(shore, [
      said('The marks hold still.'),
      deepFreeze({ kind: 'journal', entry: 'procession' }),
    ])
    expect(lines(narrator.el)).toEqual(['The marks hold still.'])
  })
})

describe('enter', () => {
  it('stands the arrival above where you now are, under what the tap said', () => {
    // `say` leads and `goto` is late in the delta table (VOCAB.md), so this is
    // the order the world produced, walked and not sorted.
    narrator.render(gate, [said('The path climbs off the shingle and inland.'), arrived('sealed-gate')])
    expect(lines(narrator.el)).toEqual([
      'The path climbs off the shingle and inland.',
      'The path climbs, and the shingle is behind you.',
      'A gate, and no one keeping it.',
    ])
  })

  it('speaks the arrival even when the tap said nothing', () => {
    narrator.render(gate, [arrived('sealed-gate')])
    expect(lines(narrator.el)).toEqual([
      'The path climbs, and the shingle is behind you.',
      'A gate, and no one keeping it.',
    ])
  })

  it('reads the arrival off the View, not off the effect', () => {
    // The effect carries a scene id and no prose (api-types.ts). A shell that
    // printed the id would print `gate`.
    narrator.render(gate, [arrived('sealed-gate')])
    expect(spoken(narrator.el)).not.toContain('sealed-gate')
  })
})

describe('never stacks', () => {
  it('replaces the line, and the one before it is gone', () => {
    narrator.render(shore, [said('The stone is warm.')])
    narrator.render(shore, [said('The pool is shallow.')])

    expect(lines(narrator.el)).toEqual(['The pool is shallow.'])
    expect(spoken(narrator.el)).not.toContain('The stone is warm.')
  })

  it('is one node however many turns pass', () => {
    // A narrator that appended would grow children. This one assigns.
    for (const text of ['one', 'two', 'three', 'four']) narrator.render(shore, [said(text)])

    expect(narrator.el.children.length).toBe(0)
    expect(spoken(narrator.el)).toBe('four')
  })

  it('is cleared by a turn that says nothing', () => {
    // "One line, cleared by the next turn" (H103). A tap that resolved to
    // nothing is a stale screen, and the screen falls back to the place.
    narrator.render(shore, [said('The stone is warm.')])
    narrator.render(shore, [])
    expect(lines(narrator.el)).toEqual(['Grey water, and no far side to it.'])
  })

  it('does not carry the old room into the new one', () => {
    narrator.render(shore, [said('The pool is shallow.')])
    narrator.render(gate, [arrived('sealed-gate')])
    expect(spoken(narrator.el)).not.toContain('pool')
  })
})

describe('swap on change', () => {
  it('draws the same turn twice as one draw', () => {
    // Idempotence, out loud: H107 re-renders after every act, and a redraw
    // that flashed would read as something having happened.
    narrator.render(shore, [said('The stone is warm.')])
    const once = spoken(narrator.el)
    narrator.render(shore, [said('The stone is warm.')])
    expect(spoken(narrator.el)).toBe(once)
    expect(narrator.el.style.opacity).toBe('1')
  })

  it('ends a change opaque, and transitioning', () => {
    // The fade is the mock's `.swap`. What must be true when render returns is
    // that the new text is there and the line is on its way back to visible —
    // nothing about this waits on a clock.
    narrator.render(shore, [said('The stone is warm.')])
    expect(spoken(narrator.el)).toBe('The stone is warm.')
    expect(narrator.el.style.opacity).toBe('1')
    expect(narrator.el.style.transition).toContain('opacity')
  })
})

describe('purity', () => {
  it('never writes through the View or the effects it was handed', () => {
    const before = JSON.stringify(gate)
    const effects = deepFreeze([said('The path climbs.'), arrived('sealed-gate')])
    narrator.render(gate, effects)
    expect(JSON.stringify(gate)).toBe(before)
    expect(effects.length).toBe(2)
  })

  it('two narrators do not share a line', () => {
    // Nothing is remembered in the module. The element is the whole state.
    const other = createNarrator()
    narrator.render(shore, [said('mine')])
    other.render(shore, [said('theirs')])
    expect(spoken(narrator.el)).toBe('mine')
    expect(spoken(other.el)).toBe('theirs')
  })
})

describe('layering', () => {
  it('imports types from the engine and never its resolution', () => {
    // .llm/rules/layering.mdc — no rules in the shell. A shell that could
    // resolve would eventually resolve.
    expect(SOURCE).not.toMatch(/from '\.\.\/core\/resolve'/)
    // Types from the engine, values from nowhere in it.
    expect(SOURCE).not.toMatch(/^\s*import\s+(?!type\s)[^\n]*from '\.\.\/core/m)
  })

  it('reaches for no element it does not own', () => {
    // It creates its own and hands it back. A module that went looking for one
    // would fire on import, which is H101's boundary.
    expect(SOURCE).not.toMatch(/getElementById|querySelector/)
  })

  it('has no timer — render is done when it returns', () => {
    expect(SOURCE).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/)
  })
})
