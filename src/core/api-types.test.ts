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
// `kind` alone, that ActionRef is the thing refKey (H001a) reads, that a
// ViewObject carries the free tap's prose, and that everything crossing this
// boundary survives JSON.

const DOOR_TAP = 'A low door, barred from this side.'
const DOOR_REFUSAL = 'The mark on the wood means something. Not to you, and not to your hands.'

// The Bundle shape, inhabited: a scene calls itself `scene`, speaks on arrival
// through `enter`, and declares the tier it may speak from (CANON.md).
const bundle: Bundle = {
  v: 1,
  start: 'crossing',
  scenes: {
    crossing: {
      scene: 'crossing',
      enter: 'The ring of the portal is cold all through, and nothing is coming back through it.',
      tier: 'T0',
      objects: [{ id: 'door', tap: DOOR_TAP, actions: { open: [{ refuse: true, say: DOOR_REFUSAL }] } }],
    },
  },
}

// `tap` is not optional and is not decoration: it is the one piece of prose the
// view carries, and the free tap is bedrock (GAME.md #input).
const inView: readonly ViewObject[] = [{ id: 'door', tap: DOOR_TAP, actions: ['open'] }]

// The three signatures P1 consumes, inhabited. A stand-in and not an engine —
// H006b writes the one that resolves anything. What is proved by writing them
// is that the shapes can be satisfied and that they compose: newRun's state
// goes into act, act's state goes into getView.
const newRun: NewRun = (seed, b) => emptyState(b.start, seed)

const getView: GetView = (state) => ({
  line: bundle.scenes[state.scene]?.enter ?? '',
  scene: state.scene,
  objects: inView,
})

const act: Act = (state, ref, input) => ({
  state,
  effects: [{ kind: 'say', text: input ?? refKey(ref) }],
})

const DOOR_OPEN: ActionRef = { object: 'door', action: 'open' }

const EVERY_KIND: readonly Effect[] = [
  { kind: 'say', text: 'You lift the bar.' },
  { kind: 'refused', ref: DOOR_OPEN, line: DOOR_REFUSAL },
  { kind: 'journal', entry: 'the_mark' },
  { kind: 'enter', scene: 'stair' },
  { kind: 'end', line: 'The dark takes the third tread, and then you.', note: 'left the Crossing' },
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
    case 'end':
      return `end ${effect.line}${effect.note === undefined ? '' : ` — ${effect.note}`}`
    default: {
      // The exhaustiveness assertion. A sixth kind stops compiling here, where
      // a shell would otherwise have gone on rendering five of six.
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
    expect(view.scene).toBe('crossing')
    expect(view.line).toBe(bundle.scenes['crossing']?.enter)
    expect(view.objects.map((o) => o.id)).toEqual(['door'])
  })

  it('act takes the free-text half of a tap, or nothing at all', () => {
    const turn: Turn = act(newRun(42, bundle), DOOR_OPEN)
    expect(turn.effects).toEqual([{ kind: 'say', text: 'door.open' }])
    expect(act(newRun(42, bundle), DOOR_OPEN, 'aloud').effects).toEqual([
      { kind: 'say', text: 'aloud' },
    ])
  })
})

describe('a view object carries the free tap (GAME.md #input)', () => {
  it('hands the shell the tap prose alongside the actions it surfaces', () => {
    const view = getView(newRun(42, bundle))
    expect(view.objects).toEqual([{ id: 'door', tap: DOOR_TAP, actions: ['open'] }])
    // The tap describes; the actions are what it surfaces. Neither stands in
    // for the other, so the prose may not be an action name.
    for (const object of view.objects) {
      expect(object.tap.length).toBeGreaterThan(0)
      expect(object.actions).not.toContain(object.tap)
    }
  })

  it('is not a ViewObject without one — a shell with no tap text has no free tap', () => {
    // The directive is the assertion: `tap` becoming optional would leave
    // nothing here to expect an error about, and typecheck would fail.
    // @ts-expect-error — `tap` is required on every ViewObject.
    const untappable: ViewObject = { id: 'door', actions: ['open'] }
    expect('tap' in untappable).toBe(false)
  })
})

describe('an effect is discriminated by kind', () => {
  it('reaches every member of the union', () => {
    expect(EVERY_KIND.map(speak)).toEqual([
      'You lift the bar.',
      `${DOOR_REFUSAL} (door.open)`,
      'journal + the_mark',
      'enter stair',
      'end The dark takes the third tread, and then you. — left the Crossing',
    ])
  })

  it('carries the ref refKey reads, so a refusal names its own ledger key', () => {
    const refusal = EVERY_KIND.find((e) => e.kind === 'refused')
    expect(refusal?.kind === 'refused' && refKey(refusal.ref)).toBe('door.open')
  })

  it('ends a slice with a line, and with a note only when there is one', () => {
    const bare: Effect = { kind: 'end', line: 'The dark takes the third tread, and then you.' }
    expect(speak(bare)).toBe('end The dark takes the third tread, and then you.')
    expect('note' in bare).toBe(false)
  })
})

describe('what crosses the boundary is JSON', () => {
  it('an effect list survives the round trip that a transcript is', () => {
    expect(JSON.parse(JSON.stringify(EVERY_KIND))).toEqual(EVERY_KIND)
    expect(structuredClone(EVERY_KIND)).toEqual(EVERY_KIND)
  })

  it('a view survives it too, tap prose and all', () => {
    const view = getView(newRun(42, bundle))
    expect(JSON.parse(JSON.stringify(view))).toEqual(view)
    expect(structuredClone(view)).toEqual(view)
  })

  it('an absent arrival line is absent, not an undefined member', () => {
    const standing: View = { line: 'The ring of the portal is cold.', scene: 'crossing', objects: [] }
    const arriving: View = { enter: 'Nothing is coming back through it.', ...standing }
    expect('enter' in standing).toBe(false)
    expect(JSON.parse(JSON.stringify(arriving))).toEqual(arriving)
  })
})
