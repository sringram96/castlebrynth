import { beforeEach, describe, expect, it } from 'vitest'
import { createGame, newRun } from '../core/api'
import type { ActionRef } from '../core/api-types'
import { loadBundle } from '../core/bundle'
import type { Bundle } from '../core/cards'
import type { GameState } from '../core/types'
import { mount } from './app'

// H107 · the composition, tested the only way a composition can be: by playing
// it, and by playing the same taps through `act` beside it.
//
// The card names the proof — "drive the mounted app and drive core act
// directly with the same seed and the same taps, and the two states are
// equal". That is the whole point of a shell that keeps no game state of its
// own (P1.md): it adds nothing to the world and subtracts nothing from it, and
// the way to know is to run the world twice and compare.
//
// The bundle here is a fixture rather than `content/bundle.json`. This file is
// about wiring, not about the shore: the real content is proved by H110/H111's
// own acceptance and driven through the screen by H100's slice. A fixture also
// lets a scene remove an object under a selection, which is the case the
// gesture layer's settle exists for and which the shore has no reason to have.

const world = (): Bundle =>
  loadBundle({
    v: 1,
    start: 'shore',
    scenes: {
      shore: {
        id: 'shore',
        line: 'Grey water, and a shore of black sand.',
        objects: [
          {
            id: 'stone',
            name: 'a standing stone',
            actions: {
              study: [{ say: 'The mark on it resolves into a word.', setFlag: ['knows_glyph'] }],
            },
          },
          {
            id: 'book',
            name: 'a swollen book',
            actions: {
              read: [
                {
                  gate: { flag: ['knows_glyph'] },
                  say: 'A procession, walking down.',
                  journal: ['procession'],
                },
                { refuse: 'The marks swim and will not hold still.' },
              ],
            },
          },
          {
            id: 'path',
            name: 'a path off the shore',
            actions: { follow: [{ say: 'You climb.', goto: 'gate' }] },
          },
        ],
      },
      gate: {
        id: 'gate',
        line: 'The path ends at iron.',
        objects: [
          {
            id: 'bearer',
            name: 'a dead bearer',
            actions: {
              // Takes itself off the stage as it gives: the object leaves the
              // scene under whatever had it selected (VOCAB.md §object sets).
              search: [{ say: 'A key, and a hand that has stopped keeping it.', addItem: ['rusted_key'], removeObject: ['bearer'] }],
            },
          },
          {
            id: 'iron_gate',
            name: 'a gate of black iron',
            actions: {
              open: [
                { gate: { item: ['rusted_key'] }, say: 'It swings in.', setFlag: ['gate_open'] },
                { refuse: 'The gate does not move.' },
              ],
            },
          },
        ],
      },
    },
  })

interface Mounted {
  readonly el: HTMLElement
  readonly run: ReturnType<typeof mount>
}

const open = (bundle: Bundle, saved?: GameState): Mounted => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return { el, run: saved === undefined ? mount(el, bundle) : mount(el, bundle, saved) }
}

const need = (root: HTMLElement, selector: string): HTMLElement => {
  const found = root.querySelector<HTMLElement>(selector)
  if (found === null) throw new Error(`nothing matched ${selector}`)
  return found
}

/** The free tap: it selects and describes, and spends nothing (GAME.md #input). */
const select = (el: HTMLElement, object: string): void => {
  need(el, `[data-object="${object}"]`).click()
}

/** The press: the second gesture, and the only one that costs. */
const press = (el: HTMLElement, object: string, action: string): void => {
  need(el, `[data-object="${object}"][data-action="${action}"]`).click()
}

const tap = (el: HTMLElement, ref: ActionRef): void => {
  select(el, ref.object)
  press(el, ref.object, ref.action)
}

const pane = (el: HTMLElement, name: 'act' | 'pack' | 'log' | 'set'): string => {
  need(el, `[data-testid="tab-${name}"]`).click()
  return need(el, `[data-testid="pane-${name}"]`).textContent ?? ''
}

// `#narr` is the narrator's own name for itself (H103), and the only handle it
// offers. H100's slice acceptance addresses the same line as
// `[data-testid="narrator"]`, which nothing sets — that is a finding against
// H103's module and not something this card may reach in and add, so this
// file asks for the line by the name the module actually gives it.
const narrator = (el: HTMLElement): string => need(el, '#narr').textContent ?? ''

const objects = (el: HTMLElement): string[] =>
  Array.from(el.querySelectorAll('#stage [data-object]')).map(
    (node) => (node as HTMLElement).dataset['object'] ?? '',
  )

const key = (init: KeyboardEventInit): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
}

/** Deep-frozen, like the acceptance suite's inputs (CLAUDE.md). */
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null) return value
  for (const member of Object.values(value)) deepFreeze(member)
  return Object.freeze(value)
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('mount · the frame', () => {
  it('draws the writing, the stage and the panel, in that order', () => {
    const { el, run } = open(world())

    expect(el.children.length, 'the frame is one element').toBe(1)
    const frame = el.children[0] as HTMLElement
    expect(Array.from(frame.children).map((node) => (node as HTMLElement).id)).toEqual([
      'narr',
      'stage',
      '',
    ])
    expect(narrator(el)).toBe('Grey water, and a shore of black sand.')
    expect(objects(el)).toEqual(['stone', 'book', 'path'])
    for (const name of ['act', 'pack', 'log', 'set'] as const) {
      expect(el.querySelector(`[data-testid="tab-${name}"]`), `no ${name} tab`).not.toBeNull()
      expect(el.querySelector(`[data-testid="pane-${name}"]`), `no ${name} pane`).not.toBeNull()
    }

    run.dispose()
  })

  it('replaces what was in the element rather than stacking beside it', () => {
    const el = document.createElement('div')
    el.innerHTML = '<p>stale</p>'
    const run = mount(el, world())

    expect(el.children.length).toBe(1)
    expect(el.textContent).not.toContain('stale')
    run.dispose()
  })

  it('touches nothing outside the element it was handed', () => {
    // The boundary H101 exists to hold, stated as a test: the only module in
    // src/shell allowed to reach for the document is the entry. `mount` draws
    // where it is told and nowhere else.
    const el = document.createElement('div')
    const run = mount(el, world())

    expect(document.body.innerHTML).toBe('')
    run.dispose()
  })

  it('opens on the run it is handed, not on a new one', () => {
    const bundle = world()
    const saved = deepFreeze({ ...newRun(77, bundle), scene: 'gate', flags: ['gate_open'] })

    const { el, run } = open(bundle, saved)

    expect(run.getState()).toEqual(saved)
    expect(narrator(el)).toBe('The path ends at iron.')
    expect(objects(el)).toEqual(['bearer', 'iron_gate'])

    run.dispose()
  })
})

describe('mount · the first tap is free', () => {
  it('selects, surfaces what the thing affords, and spends nothing', () => {
    const { el, run } = open(world())
    const before = run.getState()

    select(el, 'book')

    expect(run.getState(), 'a bare tap advanced the world').toEqual(before)
    expect(pane(el, 'act'), 'the tap did not surface the action').toMatch(/read/i)
    expect(narrator(el), 'the tap spoke over the room').toBe(
      'Grey water, and a shore of black sand.',
    )

    run.dispose()
  })

  it('snaps the panel to ACT however far away the person had wandered', () => {
    const { el, run } = open(world())

    pane(el, 'set')
    select(el, 'stone')

    expect(need(el, '[data-testid="tab-act"]').getAttribute('aria-selected')).toBe('true')

    run.dispose()
  })
})

describe('mount · the loop', () => {
  it('is exactly what core act does — same seed, same taps, same state', () => {
    // The card's own proof. The shell adds nothing to the world and subtracts
    // nothing from it, so the two states are not similar, they are equal.
    const bundle = world()
    const { el, run } = open(bundle)
    const game = createGame(bundle)

    const taps: readonly ActionRef[] = [
      { object: 'book', action: 'read' }, // refused — the ledger, and nothing else
      { object: 'stone', action: 'study' }, // the flag
      { object: 'book', action: 'read' }, // the journal entry
      { object: 'path', action: 'follow' }, // the goto
      { object: 'iron_gate', action: 'open' }, // refused again, in another room
      { object: 'bearer', action: 'search' }, // the item, and an object removed
      { object: 'iron_gate', action: 'open' }, // and now it opens
    ]

    // Seeded from the run itself: `mount` opens a fresh run and this is the
    // seed it opened on, whatever H109 later decides that number should be.
    let core = newRun(run.getState().seed, bundle)
    for (const ref of taps) {
      core = game.act(core, ref).state
      tap(el, ref)
      expect(run.getState(), `diverged at ${ref.object}.${ref.action}`).toEqual(core)
    }

    expect(core.flags).toContain('gate_open')
    expect(core.journal).toEqual(['procession'])
    expect(core.refused).toEqual(['book.read', 'iron_gate.open'])

    run.dispose()
  })

  it('spends exactly one turn per press', () => {
    const { el, run } = open(world())

    tap(el, { object: 'book', action: 'read' })
    tap(el, { object: 'book', action: 'read' })

    // The ledger keeps a key once, so the count that would show a double-fired
    // act is the journal's — and the refusal ledger's is the same either way.
    expect(run.getState().refused).toEqual(['book.read'])
    tap(el, { object: 'stone', action: 'study' })
    tap(el, { object: 'book', action: 'read' })
    expect(run.getState().journal, 'the press fired twice').toEqual(['procession'])

    run.dispose()
  })

  it('redraws the whole screen after every act', () => {
    const { el, run } = open(world())

    tap(el, { object: 'stone', action: 'study' })
    tap(el, { object: 'book', action: 'read' })
    expect(narrator(el)).toBe('A procession, walking down.')
    expect(pane(el, 'log')).toMatch(/procession/)

    tap(el, { object: 'path', action: 'follow' })
    expect(objects(el), 'the shore is still standing').toEqual(['bearer', 'iron_gate'])
    expect(narrator(el), 'the arrival is not on the line').toMatch(/The path ends at iron\./)

    tap(el, { object: 'bearer', action: 'search' })
    expect(objects(el), 'the bearer is still on the stage').toEqual(['iron_gate'])
    expect(pane(el, 'pack')).toMatch(/rusted key/)

    run.dispose()
  })

  it('the narrator swaps, it does not stack', () => {
    const { el, run } = open(world())

    tap(el, { object: 'book', action: 'read' })
    const refusal = narrator(el)
    expect(refusal).toMatch(/marks swim/)

    tap(el, { object: 'stone', action: 'study' })
    expect(narrator(el)).not.toBe(refusal)
    expect(narrator(el)).not.toMatch(/marks swim/)

    run.dispose()
  })

  it('lets the selection go when the world takes the thing away', () => {
    const { el, run } = open(world())

    tap(el, { object: 'path', action: 'follow' })
    tap(el, { object: 'bearer', action: 'search' })

    // The bearer is gone, so the ACT pane offers the room and not a tap on a
    // thing that is not there (H106's settle, through this module's redraw).
    expect(pane(el, 'act')).not.toMatch(/search/)
    expect(el.querySelector('[data-action="search"]')).toBeNull()

    run.dispose()
  })

  it('dispatch is the press, not a second way to reach act', () => {
    const bundle = world()
    const { el, run } = open(bundle)
    const game = createGame(bundle)

    run.dispatch({ object: 'stone', action: 'study' })

    expect(run.getState()).toEqual(game.act(newRun(run.getState().seed, bundle), {
      object: 'stone',
      action: 'study',
    }).state)
    // It went through the screen, not around it.
    expect(narrator(el)).toMatch(/resolves into a word/)

    run.dispose()
  })

  it('answers a tap on something that is not there with nothing at all', () => {
    const { el, run } = open(world())
    const before = run.getState()

    run.dispatch({ object: 'no_such_thing', action: 'shove' })

    expect(run.getState()).toEqual(before)
    expect(narrator(el), 'a stale tap spoke').toBe('Grey water, and a shore of black sand.')

    run.dispose()
  })
})

describe('mount · the keyboard fallback', () => {
  it('is attached, and it is the same two-step gesture', () => {
    const { el, run } = open(world())

    key({ key: '1' }) // the first thing in the room: the stone
    expect(pane(el, 'act')).toMatch(/study/)
    expect(run.getState().flags, 'choosing spent a turn').toEqual([])

    key({ key: '1' }) // its first action
    expect(run.getState().flags).toEqual(['knows_glyph'])

    run.dispose()
  })

  it('comes off with the run', () => {
    const { el, run } = open(world())
    run.dispose()

    key({ key: '1' })
    key({ key: '1' })

    expect(run.getState().flags, 'a disposed run is still playing').toEqual([])
    expect(el.children.length, 'the frame outlived the run').toBe(0)
  })
})

describe('mount · the settings it draws', () => {
  it('the outline switch reaches the stage, and costs no turn', () => {
    const { el, run } = open(world())
    const before = run.getState()
    const block = (): HTMLElement => need(el, '#stage [data-object="stone"]')

    expect(block().style.outlineStyle).toBe('dashed')

    pane(el, 'set')
    need(el, '[data-testid="toggle-outline"]').click()

    expect(block().style.outlineStyle, 'the stage never heard').toBe('none')
    expect(pane(el, 'set')).toMatch(/off/)
    expect(run.getState(), 'a setting spent a turn').toEqual(before)
    // And it survives the next redraw rather than switching itself back on.
    tap(el, { object: 'stone', action: 'study' })
    expect(block().style.outlineStyle).toBe('none')

    run.dispose()
  })
})

describe('mount · what it does not do', () => {
  it('never writes through the run it was handed', () => {
    const bundle = deepFreeze(world())
    const saved = deepFreeze(newRun(9, bundle))
    const { el, run } = open(bundle, saved)

    tap(el, { object: 'stone', action: 'study' })
    tap(el, { object: 'book', action: 'read' })

    expect(saved.flags).toEqual([])
    expect(run.getState()).not.toBe(saved)

    run.dispose()
  })

  it('puts nothing on the screen the world did not say', () => {
    const { el, run } = open(world())

    tap(el, { object: 'stone', action: 'study' })
    tap(el, { object: 'book', action: 'read' })
    tap(el, { object: 'path', action: 'follow' })
    tap(el, { object: 'bearer', action: 'search' })
    const everything = [
      narrator(el),
      pane(el, 'act'),
      pane(el, 'pack'),
      pane(el, 'log'),
      pane(el, 'set'),
    ].join(' ')

    // The engine's bookkeeping is the engine's: flags are its memory, and the
    // reserved obj+/obj- entries are how an object set is folded out of them.
    expect(everything).not.toContain('knows_glyph')
    expect(everything).not.toContain('obj+')
    expect(everything).not.toContain('obj-')

    run.dispose()
  })
})
