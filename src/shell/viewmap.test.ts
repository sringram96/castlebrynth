// H102 · the helpers are pure, total and idempotent, and they decide nothing.
//
// Idempotent, out loud: `label(label(x)) === label(x)`, and mapping the same
// View twice draws the same twice. The inputs are deep-frozen the way the
// acceptance suite freezes engine inputs, so a helper that wrote through its
// argument fails here rather than in a shell three cards later.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { View } from '../core/api-types'
import { blocks, label, narratorLines, selectedBlock } from './viewmap'

// Not `new URL(...)`: these tests run under happy-dom (H101's
// environmentMatchGlobs), whose global URL is its own, and node's fs
// rejects it — "The URL must be of scheme file". fileURLToPath is the
// one spelling that survives both environments.
const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'viewmap.ts'), 'utf8')

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const shore: View = deepFreeze({
  line: 'Grey water, and no far side to it.',
  scene: 'shore',
  objects: [
    { id: 'flat-stone', actions: ['study'] },
    { id: 'book', actions: ['read', 'take'] },
    { id: 'the_far_shore', actions: [] },
  ],
})

const arrival: View = deepFreeze({
  enter: 'You wake at the dead glass.',
  line: 'A dead portal. Stone so close you can hear it.',
  scene: 'crossing',
  objects: [],
})

/** What `getView` hands back for a scene the bundle has not got. */
const nowhere: View = deepFreeze({ line: '', scene: 'elsewhere', objects: [] })

describe('label', () => {
  it('makes an id printable', () => {
    expect(label('dead-portal')).toBe('dead portal')
    expect(label('the_far_shore')).toBe('the far shore')
    expect(label('Book')).toBe('book')
  })

  it('is idempotent: label(label(x)) === label(x)', () => {
    for (const id of ['dead-portal', 'the_far_shore', 'Book', ' a  flat--stone ', '', '-_-']) {
      const once = label(id)
      expect(label(once)).toBe(once)
      expect(label(label(once))).toBe(once)
    }
  })

  it('never touches the id it was given', () => {
    const id = 'dead-portal'
    label(id)
    expect(id).toBe('dead-portal')
  })
})

describe('blocks', () => {
  it('is one block per object, in view order', () => {
    expect(blocks(shore).map((b) => b.id)).toEqual(['flat-stone', 'book', 'the_far_shore'])
    expect(blocks(shore).map((b) => b.label)).toEqual(['flat stone', 'book', 'the far shore'])
  })

  it('keeps action names verbatim — they are half of an ActionRef', () => {
    expect(blocks(shore)[1]?.actions).toEqual(['read', 'take'])
  })

  it('gives a block to an object with no actions (the first tap is free)', () => {
    // GAME.md #input, LAWS.md #affordance: tappability is not ours to decide.
    const actionless = blocks(shore).find((b) => b.id === 'the_far_shore')
    expect(actionless).toBeDefined()
    expect(actionless?.actions).toEqual([])
  })

  it('marks exactly the selected block, and nothing when nothing is selected', () => {
    expect(blocks(shore, 'book').filter((b) => b.selected).map((b) => b.id)).toEqual(['book'])
    expect(blocks(shore).some((b) => b.selected)).toBe(false)
    expect(blocks(shore, null).some((b) => b.selected)).toBe(false)
    // A selection that has left the scene highlights nothing. Stale, not fatal.
    expect(blocks(shore, 'ghost').some((b) => b.selected)).toBe(false)
  })

  it('draws the same twice — nothing is remembered between calls', () => {
    expect(blocks(shore, 'book')).toEqual(blocks(shore, 'book'))
    expect(blocks(shore)).toEqual(blocks(shore))
    // and the order of calls changes neither answer
    const selected = blocks(shore, 'book')
    expect(blocks(shore)).toEqual(blocks(shore, undefined))
    expect(blocks(shore, 'book')).toEqual(selected)
  })

  it('never writes through the View', () => {
    const before = JSON.stringify(shore)
    blocks(shore, 'book')
    expect(JSON.stringify(shore)).toBe(before)
  })

  it('has nothing to draw in an empty scene', () => {
    expect(blocks(nowhere)).toEqual([])
  })
})

describe('selectedBlock', () => {
  it('is the block the shell is holding', () => {
    expect(selectedBlock(shore, 'book')).toEqual({
      id: 'book',
      label: 'book',
      actions: ['read', 'take'],
      selected: true,
    })
  })

  it('is null for nothing selected, and for a selection out of view', () => {
    expect(selectedBlock(shore)).toBeNull()
    expect(selectedBlock(shore, null)).toBeNull()
    expect(selectedBlock(shore, 'ghost')).toBeNull()
  })

  it('agrees with blocks, and says so twice', () => {
    expect(selectedBlock(shore, 'book')).toEqual(blocks(shore, 'book').find((b) => b.selected))
    expect(selectedBlock(shore, 'book')).toEqual(selectedBlock(shore, 'book'))
  })
})

describe('narratorLines', () => {
  it('is the line, alone, where the scene speaks once', () => {
    expect(narratorLines(shore)).toEqual(['Grey water, and no far side to it.'])
  })

  it('stands the arrival above the line it stands under', () => {
    expect(narratorLines(arrival)).toEqual([
      'You wake at the dead glass.',
      'A dead portal. Stone so close you can hear it.',
    ])
  })

  it('says nothing rather than showing a blank line', () => {
    expect(narratorLines(nowhere)).toEqual([])
    expect(narratorLines(deepFreeze({ line: '   ', scene: 'x', objects: [] }))).toEqual([])
  })

  it('draws the same twice', () => {
    expect(narratorLines(arrival)).toEqual(narratorLines(arrival))
  })
})

describe('layering', () => {
  it('imports types from the engine and never its resolution', () => {
    // .llm/rules/layering.mdc — no rules in the shell. A shell that could
    // resolve would eventually resolve.
    expect(SOURCE).not.toMatch(/from '\.\.\/core\/resolve'/)
    expect(SOURCE).not.toMatch(/^\s*import\s+(?!type\s)/m)
  })

  it('never touches the document — these are helpers, not a screen', () => {
    expect(SOURCE).not.toMatch(/\b(document|window|localStorage)\b/)
  })
})
