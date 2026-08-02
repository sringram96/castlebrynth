import { describe, it, expect } from 'vitest'
import type { Act, ActionRef, Effect, GetView, NewRun, Turn, View, ViewObject } from './api-types'
import type { Bundle } from './cards'
import { emptyState, refKey } from './types'

// A type has no runtime, so the assertions that matter most here are the typed
// consts below. This file sits under src/, `npm run typecheck` compiles it, and
// a contract that drifted would fail the law rather than a test — which is what
// makes the shapes real rather than decorative.
//
// What runs is the other half: that a shell can discriminate an Effect on
// `kind` alone, that ActionRef is the thing refKey (H001a) reads, and that
// everything crossing this boundary survives JSON.

const bundle: Bundle = {
  v: 1,
  start: 'shore',
  scenes: {
    shore: {
      id: 'shore',
      line: 'Grey water, and no far side to it.',
      objects: [{ id: 'book', name: 'book', actions: { read: [{ say: 'The marks swim.' }] } }],
    },
  },
}

const inView: readonly ViewObject[] = [{ id: 'book', actions: ['read'] }]

// The three signatures P1 consumes, inhabited. A stand-in and not an engine —
// H006b writes the one that resolves anything. What is proved by writing them
// is that the shapes can be satisfied and that they compose: newRun's state
// goes into act, act's state goes into getView.
const newRun: NewRun = (seed, b) => emptyState(b.start, seed)

const getView: GetView = (state) => ({
  line: bundle.scenes[state.scene]?.line ?? '',
  scene: state.scene,
  objects: inView,
})

const act: Act = (state, ref, input) => ({
  state,
  effects: [{ kind: 'say', text: input ?? refKey(ref) }],
})

const BOOK_READ: ActionRef = { object: 'book', action: 'read' }

const EVERY_KIND: readonly Effect[] = [
  { kind: 'say', text: 'The marks swim.' },
  { kind: 'refused', ref: BOOK_READ, line: 'You cannot hold them.' },
  { kind: 'journal', entry: 'procession' },
  { kind: 'enter', scene: 'stair' },
]

/** Narrowing on `kind` alone reaches every member, and reaches no other. */
const speak = (effect: Effect): string => {
  switch (effect.kind) {
    case 'say':
      return effect.text
    case 'refused':
      return `${effect.line} (${refKey(effect.ref)})`
    case 'journal':
      return `journal + ${effect.entry}`
    case 'enter':
      return `enter ${effect.scene}`
    default: {
      // The exhaustiveness assertion. A fifth kind stops compiling here, where
      // a shell would otherwise have gone on rendering four of five.
      const unreachable: never = effect
      return unreachable
    }
  }
}

describe('the signatures the shell consumes', () => {
  it('newRun opens at the start scene of the bundle it was handed', () => {
    const state = newRun(42, bundle)
    expect(state.scene).toBe(bundle.start)
    expect(state.seed).toBe(42)
  })

  it('getView draws the moment from state alone', () => {
    const view: View = getView(newRun(42, bundle))
    expect(view.scene).toBe('shore')
    expect(view.line).toBe('Grey water, and no far side to it.')
    expect(view.objects.map((o) => o.id)).toEqual(['book'])
  })

  it('act takes the free-text half of a tap, or nothing at all', () => {
    const turn: Turn = act(newRun(42, bundle), BOOK_READ)
    expect(turn.effects).toEqual([{ kind: 'say', text: 'book.read' }])
    expect(act(newRun(42, bundle), BOOK_READ, 'aloud').effects).toEqual([
      { kind: 'say', text: 'aloud' },
    ])
  })
})

describe('an effect is discriminated by kind', () => {
  it('reaches every member of the union', () => {
    expect(EVERY_KIND.map(speak)).toEqual([
      'The marks swim.',
      'You cannot hold them. (book.read)',
      'journal + procession',
      'enter stair',
    ])
  })

  it('carries the ref refKey reads, so a refusal names its own ledger key', () => {
    const refusal = EVERY_KIND.find((e) => e.kind === 'refused')
    expect(refusal?.kind === 'refused' && refKey(refusal.ref)).toBe('book.read')
  })
})

describe('what crosses the boundary is JSON', () => {
  it('an effect list survives the round trip that a transcript is', () => {
    expect(JSON.parse(JSON.stringify(EVERY_KIND))).toEqual(EVERY_KIND)
    expect(structuredClone(EVERY_KIND)).toEqual(EVERY_KIND)
  })

  it('a view survives it too', () => {
    const view = getView(newRun(42, bundle))
    expect(JSON.parse(JSON.stringify(view))).toEqual(view)
  })

  it('an absent arrival line is absent, not an undefined member', () => {
    const standing: View = { line: 'Grey water.', scene: 'shore', objects: [] }
    const arriving: View = { enter: 'The water is closer than it was.', ...standing }
    expect('enter' in standing).toBe(false)
    expect(JSON.parse(JSON.stringify(arriving))).toEqual(arriving)
  })
})
