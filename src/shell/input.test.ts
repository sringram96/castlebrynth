// H106 · one dispatch per gesture, and none at all for the free one.
//
// The card is two claims and this file exists to hold them apart:
//
//   **zero** — a bare tap advances nothing. It selects, it snaps the panel to
//   ACT, and `act` is not called. The first tap is free (GAME.md #input), and
//   "free" is a number this test can count.
//   **exactly one** — a press dispatches once. Never none, because a control
//   that does nothing is a lie; never twice, because a turn spent twice cannot
//   be given back (LAWS.md #dice).
//
// Both are proved twice: once against a stand-in for H107's ports, where the
// count is exact and visible, and once through the real stage and the real
// panel with real clicks, because "never two" is mostly a claim about wiring
// and wiring is only ever wrong when it is assembled.
//
// The views are deep-frozen, the way the engine's acceptance freezes state: a
// gesture layer that wrote through the View it was handed fails here rather
// than in a run three cards later.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionRef, View } from '../core/api-types'
import type { GameState } from '../core/types'
import { createInput } from './input'
import type { Input, InputPorts } from './input'
import { createPanel } from './panel'
import type { Pane } from './panel'
import { createScene } from './scene'

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const shore: View = deepFreeze({
  line: 'Grey water, and no far side to it.',
  scene: 'shore',
  objects: [
    { id: 'stone', actions: ['study'] },
    { id: 'book', actions: ['read', 'take'] },
    { id: 'pool', actions: [] },
  ],
})

/** The same scene with the book gone — a `removeObject`, as the view sees it. */
const shoreWithoutTheBook: View = deepFreeze({
  ...shore,
  objects: [
    { id: 'stone', actions: ['study'] },
    { id: 'pool', actions: [] },
  ],
})

/** Somewhere else, sharing an id with the shore on purpose (see "settles"). */
const gate: View = deepFreeze({
  line: 'Iron, and older than the water.',
  scene: 'gate',
  objects: [
    { id: 'book', actions: ['read'] },
    { id: 'iron_gate', actions: ['open'] },
  ],
})

const fresh: GameState = deepFreeze({
  scene: 'shore',
  flags: [],
  items: [],
  journal: [],
  refused: [],
  rng: 7,
  seed: 7,
})

/**
 * A stand-in for H107: it holds the view, counts the dispatches, and remembers
 * what it was told to show and redraw. It decides nothing, which is the point —
 * everything counted below happened inside `input`.
 */
function harness(first: View = shore) {
  let view = first
  let next: View | null = null
  const dispatched: ActionRef[] = []
  const shown: Pane[] = []
  const redrawn: (string | null)[] = []
  const ports: InputPorts = {
    view: () => view,
    dispatch: (ref) => {
      dispatched.push(ref)
      // The world moves *inside* the dispatch, as it does under H107: `act`
      // runs, the state advances, and the next `view()` is a different moment.
      if (next !== null) {
        view = next
        next = null
      }
    },
    show: (pane) => {
      shown.push(pane)
    },
    redraw: (id) => {
      redrawn.push(id)
    },
  }
  const input = createInput(ports)
  return {
    input,
    dispatched,
    shown,
    redrawn,
    /** What the world becomes on the way through the next dispatch. */
    after: (becomes: View) => {
      next = becomes
    },
  }
}

/** A key, as the browser delivers it: bubbling, cancellable, from an element. */
function press(
  target: EventTarget,
  key: string,
  over: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...over })
  target.dispatchEvent(event)
  return event
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('the first tap is free', () => {
  it('selects, and dispatches nothing at all', () => {
    const h = harness()
    h.input.select('book')

    expect(h.dispatched, 'a bare tap reached act').toEqual([])
    expect(h.input.selectedId).toBe('book')
  })

  it('snaps the panel to ACT, and redraws with the chosen id', () => {
    const h = harness()
    h.input.select('book')

    expect(h.shown).toEqual(['act'])
    expect(h.redrawn).toEqual(['book'])
  })

  it('stays free however many times it is tapped', () => {
    const h = harness()
    h.input.select('book')
    h.input.select('book')
    h.input.select('stone')
    h.input.select('pool')

    expect(h.dispatched, 'tapping around the room spent a turn').toEqual([])
    expect(h.input.selectedId).toBe('pool')
  })

  it('selects a thing that affords nothing — "it\'s a door." is an answer', () => {
    const h = harness()
    h.input.select('pool')

    expect(h.input.selectedId).toBe('pool')
    expect(h.dispatched).toEqual([])
  })

  it('touches no document and attaches nothing until asked', () => {
    const h = harness()
    press(document, '1')

    expect(document.body.childElementCount, 'building an input drew something').toBe(0)
    expect(h.input.selectedId, 'a key landed before anyone listened').toBeNull()
  })
})

describe('the press is the turn — exactly one, every time', () => {
  it('dispatches once, with the ref verbatim', () => {
    const h = harness()
    h.input.select('book')
    h.input.press({ object: 'book', action: 'read' })

    expect(h.dispatched).toEqual([{ object: 'book', action: 'read' }])
  })

  it('the whole round trip is one dispatch and no more', () => {
    const h = harness()
    h.input.select('book')
    h.input.press({ object: 'book', action: 'read' })

    expect(h.dispatched, 'select + press must be exactly one turn').toHaveLength(1)
  })

  it('never swallows one: ten presses are ten turns', () => {
    const h = harness()
    for (let i = 0; i < 10; i += 1) h.input.press({ object: 'book', action: 'read' })

    expect(h.dispatched).toHaveLength(10)
  })

  it('does not gate — a ref for something not in view still dispatches once', () => {
    // The engine answers a stale tap with no effects and the same state
    // (src/core/api.ts). A shell that filtered here would be deciding what is
    // offered, which is the rule living in two places (.llm/rules/layering.mdc).
    const h = harness()
    h.input.press({ object: 'lantern', action: 'light' })

    expect(h.dispatched).toEqual([{ object: 'lantern', action: 'light' }])
  })

  it('does not touch the pane — the panel is already on ACT to have been pressed', () => {
    const h = harness()
    h.input.select('book')
    h.shown.length = 0
    h.input.press({ object: 'book', action: 'read' })

    expect(h.shown).toEqual([])
  })
})

describe('through the real stage and the real panel', () => {
  /**
   * H107 in miniature: the two modules that own the clicks, wired to the one
   * module that counts them. Nothing here is a mock — the clicks are on the
   * elements H104 and H105 build, which is the only way to prove that a finger
   * reaches `act` down exactly one path.
   */
  function screen() {
    const dispatched: ActionRef[] = []
    const view = shore
    // The two modules that own the clicks are built first and reach the
    // gesture layer through their callbacks, which is the order H107 is in
    // too: the stage and the panel do not know what a tap will mean.
    const scene = createScene({ onSelect: (id) => input.select(id) })
    const panel = createPanel({ onAction: (ref) => input.press(ref) })
    const paint = (): void => {
      scene.render(view, input.selectedId)
      panel.render({ view, state: fresh, selectedId: input.selectedId })
    }
    const input: Input = createInput({
      view: () => view,
      dispatch: (ref) => {
        dispatched.push(ref)
        paint()
      },
      show: (pane) => panel.show(pane),
      redraw: () => paint(),
    })
    const root = document.createElement('div')
    root.append(scene.el, panel.el)
    document.body.append(root)
    paint()
    return { root, panel, dispatched, input }
  }

  const click = (root: HTMLElement, selector: string): void => {
    const found = root.querySelector<HTMLElement>(selector)
    if (found === null) throw new Error(`nothing matched ${selector}`)
    found.click()
  }

  it('tapping a block selects it and spends nothing', () => {
    const s = screen()
    s.panel.show('log')
    click(s.root, '[data-object="book"]')

    expect(s.dispatched, 'the free tap reached act').toEqual([])
    expect(s.input.selectedId).toBe('book')
    expect(s.panel.pane, 'selecting must snap the panel to ACT').toBe('act')
  })

  it('and surfaces what it affords, so there is something to press', () => {
    const s = screen()
    click(s.root, '[data-object="book"]')

    expect(s.root.querySelector('[data-object="book"][data-action="read"]')).not.toBeNull()
    expect(s.root.querySelector('[data-object="book"][data-action="take"]')).not.toBeNull()
  })

  it('pressing the action fires act exactly once', () => {
    const s = screen()
    click(s.root, '[data-object="book"]')
    click(s.root, '[data-object="book"][data-action="read"]')

    expect(s.dispatched).toEqual([{ object: 'book', action: 'read' }])
  })

  it('a repaint mid-run does not re-fire the turn under it', () => {
    const s = screen()
    click(s.root, '[data-object="book"]')
    click(s.root, '[data-object="book"][data-action="read"]')
    click(s.root, '[data-testid="tab-log"]')
    click(s.root, '[data-testid="tab-act"]')

    expect(s.dispatched, 'redrawing spent a turn').toHaveLength(1)
  })
})

describe('the keyboard, for the terminal-shaped among us', () => {
  function listening(first: View = shore) {
    const h = harness(first)
    const stop = h.input.listen(document)
    return { ...h, stop }
  }

  it('a digit chooses the nth thing in the room, and spends nothing', () => {
    const h = listening()
    press(document, '2')

    expect(h.input.selectedId).toBe('book')
    expect(h.dispatched, 'choosing by key must be as free as choosing by thumb').toEqual([])
    expect(h.shown).toEqual(['act'])
    h.stop()
  })

  it('a digit with something chosen presses its nth action — once', () => {
    const h = listening()
    h.input.select('book')
    press(document, '2')

    expect(h.dispatched).toEqual([{ object: 'book', action: 'take' }])
    h.stop()
  })

  it('Enter presses the first action of what is chosen — once', () => {
    const h = listening()
    h.input.select('book')
    press(document, 'Enter')

    expect(h.dispatched).toEqual([{ object: 'book', action: 'read' }])
    h.stop()
  })

  it('Enter aimed at a button stands down — the button already fires it', () => {
    // A focused `<button>` turns Enter into a click by itself, and that click
    // is already a press. Answering the bubbled keydown as well is the
    // double-fired act this card exists to prevent.
    const h = listening()
    h.input.select('book')
    const button = document.createElement('button')
    document.body.append(button)
    press(button, 'Enter')

    expect(h.dispatched, 'the keyboard fired a turn the control was already firing').toEqual([])
    h.stop()
  })

  it('the composed press-with-Enter is still exactly one turn', () => {
    const h = listening()
    h.input.select('book')
    const button = document.createElement('button')
    // What a browser does with Enter on a focused button: the click, and the
    // keydown that bubbles past it. Only one of the two may become a turn.
    button.addEventListener('click', () => h.input.press({ object: 'book', action: 'read' }))
    document.body.append(button)
    button.click()
    press(button, 'Enter')

    expect(h.dispatched).toHaveLength(1)
    h.stop()
  })

  it('a held key is one gesture, not a stream of them', () => {
    const h = listening()
    h.input.select('book')
    press(document, 'Enter')
    press(document, 'Enter', { repeat: true })
    press(document, 'Enter', { repeat: true })

    expect(h.dispatched, 'leaning on Enter spent the room').toHaveLength(1)
    h.stop()
  })

  it('leaves the browser its own shortcuts', () => {
    const h = listening()
    for (const over of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }]) {
      press(document, '1', over)
    }

    expect(h.input.selectedId, 'cmd-1 is a tab, not the first thing in the room').toBeNull()
    expect(h.dispatched).toEqual([])
    h.stop()
  })

  it('a number nobody is showing does nothing, and says so', () => {
    const h = listening()
    h.input.select('stone')
    const beyond = press(document, '5')

    expect(h.dispatched, 'the keyboard invented an action').toEqual([])
    expect(beyond.defaultPrevented, 'an unhandled key must not be swallowed').toBe(false)
    h.stop()
  })

  it('Enter with nothing chosen, and Enter on a thing that affords nothing', () => {
    const h = listening()
    press(document, 'Enter')
    expect(h.dispatched).toEqual([])

    h.input.select('pool')
    press(document, 'Enter')
    expect(h.dispatched, 'the pool affords nothing to press').toEqual([])
    h.stop()
  })

  it('a handled key is claimed, so the page does not act on it twice', () => {
    const h = listening()
    const chose = press(document, '1')
    expect(chose.defaultPrevented).toBe(true)

    const pressed = press(document, 'Enter')
    expect(pressed.defaultPrevented).toBe(true)
    h.stop()
  })

  it('Escape lets go, and the digits address the room again', () => {
    const h = listening()
    press(document, '2')
    expect(h.input.selectedId).toBe('book')

    const back = press(document, 'Escape')
    expect(h.input.selectedId, 'Escape did not let go').toBeNull()
    expect(back.defaultPrevented).toBe(true)
    expect(h.redrawn.at(-1)).toBeNull()

    press(document, '1')
    expect(h.input.selectedId, 'the room is unreachable after one choice').toBe('stone')
    expect(h.dispatched, 'backing out and choosing again spent a turn').toEqual([])
    h.stop()
  })

  it('Escape with nothing chosen is not ours', () => {
    const h = listening()
    const idle = press(document, 'Escape')

    expect(idle.defaultPrevented).toBe(false)
    expect(h.redrawn).toEqual([])
    h.stop()
  })

  it('0 and letters are not ours', () => {
    const h = listening()
    press(document, '0')
    press(document, 'e')
    press(document, ' ')

    expect(h.input.selectedId).toBeNull()
    expect(h.dispatched).toEqual([])
    h.stop()
  })

  it('detaching stops it — a torn-down run is not still playable', () => {
    const h = listening()
    h.stop()
    press(document, '1')
    press(document, 'Enter')

    expect(h.input.selectedId).toBeNull()
    expect(h.dispatched).toEqual([])
  })

  it('ignores a key another listener has already claimed', () => {
    const h = listening()
    const claimed = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true })
    claimed.preventDefault()
    document.dispatchEvent(claimed)

    expect(h.input.selectedId).toBeNull()
    h.stop()
  })

  it('is not a listener on anything but what it was handed', () => {
    const h = harness()
    const target = document.createElement('div')
    const stop = h.input.listen(target)
    press(document, '1')

    expect(h.input.selectedId, 'the keyboard listened somewhere it was not asked to').toBeNull()
    press(target, '1')
    expect(h.input.selectedId).toBe('stone')
    stop()
  })
})

describe('the selection settles after a turn', () => {
  it('a turn that moved the world lets the selection go', () => {
    const h = harness()
    h.input.select('book')
    h.after(gate)
    h.input.press({ object: 'book', action: 'read' })

    // The gate has a `book` too, and it is not the one that was tapped. A ring
    // around it would be a highlight on something never touched.
    expect(h.input.selectedId, 'the selection walked into the next room').toBeNull()
    expect(h.redrawn.at(-1), 'the stale ring was never redrawn away').toBeNull()
  })

  it('a turn that took the thing away lets it go too', () => {
    const h = harness()
    h.input.select('book')
    h.after(shoreWithoutTheBook)
    h.input.press({ object: 'book', action: 'take' })

    expect(h.input.selectedId).toBeNull()
    expect(h.redrawn.at(-1)).toBeNull()
  })

  it('a turn that changed neither keeps it, and redraws nothing extra', () => {
    const h = harness()
    h.input.select('book')
    h.redrawn.length = 0
    h.input.press({ object: 'book', action: 'read' })

    expect(h.input.selectedId, 'the book is still on the shore').toBe('book')
    expect(h.redrawn, 'a settled selection redrew for nothing').toEqual([])
  })

  it('settling is not a second dispatch', () => {
    const h = harness()
    h.input.select('book')
    h.after(gate)
    h.input.press({ object: 'book', action: 'read' })

    expect(h.dispatched).toHaveLength(1)
  })

  it('with nothing chosen there is nothing to settle', () => {
    const h = harness()
    h.after(gate)
    h.input.press({ object: 'path', action: 'follow' })

    expect(h.redrawn).toEqual([])
  })
})

describe('it decides nothing about the world', () => {
  it('never mutates the view it is handed', () => {
    const h = harness()
    h.input.select('book')
    h.input.press({ object: 'book', action: 'read' })
    press(document, '1')

    // Frozen on the way in; a write would have thrown by now under strict mode.
    expect(shore.objects).toHaveLength(3)
    expect(Object.isFrozen(shore)).toBe(true)
  })

  it('imports no engine function — only the types and the viewmap', async () => {
    // .llm/rules/layering.mdc: a shell that could resolve would eventually
    // resolve. `act` arrives as a port, from H107, and never as an import.
    const { readFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    // Not `new URL(...)`: these tests run under happy-dom, whose global URL is
    // its own and node's fs will not take one. fileURLToPath survives both.
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'input.ts'), 'utf8')

    expect(source).not.toMatch(/from '\.\.\/core\/api'/)
    expect(source).not.toMatch(/from '\.\.\/core\/resolve'/)
    expect(source).toMatch(/import type \{ ActionRef, View \} from '\.\.\/core\/api-types'/)
  })

  it('calls no port it was not asked to — a bare tap never dispatches', () => {
    const dispatch = vi.fn()
    const input = createInput({
      view: () => shore,
      dispatch,
      show: () => {},
      redraw: () => {},
    })
    input.select('stone')
    input.select('book')

    expect(dispatch).not.toHaveBeenCalled()
  })
})
