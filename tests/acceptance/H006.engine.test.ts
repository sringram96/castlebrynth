import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import { createGame, newRun } from '../../src/core/api'
import { loadBundle } from '../../src/core/bundle'
import type { Bundle } from '../../src/core/cards'
import type { Turn, View } from '../../src/core/api-types'

// H006 · the heart. First passing gate wins; deltas apply in VOCAB order;
// nothing mutates; the same taps always produce the same run.
//
// Fixtures are built through `loadBundle`, which is `parseScene`, which is the
// gate the compiler and the shell both come through. A fixture the loader would
// refuse is not content, and proving the engine's behaviour on one would prove
// nothing about the world.
//
// The Crossing comes from the scene as it was authored rather than from
// content/bundle.json, for the reason the root acceptance gives at length: the
// compiler writes the parsed Scene, whose `objects` is a list, and `loadBundle`
// validates through `parseScene`, which reads the authored shape — a mapping
// keyed by object id. H004 owns that disagreement. H006 is about the engine.
const SCENE = resolve(__dirname, '../../content/crossing.yaml')

const crossingBundle = (): Bundle =>
  loadBundle({ v: 1, start: 'crossing', scenes: { crossing: yaml.load(readFileSync(SCENE, 'utf8')) } })

const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object') {
    Object.values(o as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(o)
  }
  return o
}

type Raw = Record<string, unknown>

const POKE = { object: 'o', action: 'poke' } as const

/** A scene, unvalidated — `synth` hands it to the loader. */
const room = (id: string, objects: Raw): Raw => ({ scene: id, enter: 'A line.', objects })

const synth = (scenes: Raw, start = 'probe'): Bundle => loadBundle({ v: 1, start, scenes })

/** One scene, one object `o`, affording `poke` through the given responses. */
const probe = (...responses: Raw[]): Bundle =>
  synth({ probe: room('probe', { o: { tap: 'A thing to poke.', actions: { poke: responses } } }) })

/** The same, with a hidden `ash` waiting on a delta to bring it in. */
const probeWithAsh = (...responses: Raw[]): Bundle =>
  synth({
    probe: room('probe', {
      o: { tap: 'A thing to poke.', actions: { poke: responses } },
      ash: { tap: 'Grey, and banked over.', hidden: true, actions: { look: [{ say: 'Grey.' }] } },
    }),
  })

const says = (turn: Turn): string[] =>
  turn.effects.flatMap((e) => (e.kind === 'say' ? [e.text] : []))

/**
 * The prose a refusal turns you away with. `refuse: true` means the response's
 * `say` IS that line (VOCAB.md), so a refusing branch speaks here rather than
 * through `says` — once, on the effect that also names the ledger key.
 */
const refusedLines = (turn: Turn): string[] =>
  turn.effects.flatMap((e) => (e.kind === 'refused' ? [e.line] : []))

const kinds = (turn: Turn): string[] => turn.effects.map((e) => e.kind)

const ids = (view: View): string[] => view.objects.map((o) => o.id)

describe('H006a · first passing gate wins', () => {
  it('takes the first response whose gate passes, not the most specific', () => {
    const g = createGame(probe({ if: {}, say: 'first' }, { if: {}, say: 'second' }))
    expect(says(g.act(g.newRun(1), POKE))).toEqual(['first'])
  })

  it('skips a gate that does not pass', () => {
    const g = createGame(probe({ if: { flags: ['never'] }, say: 'gated' }, { say: 'fallback' }))
    expect(says(g.act(g.newRun(1), POKE))).toEqual(['fallback'])
  })

  it('treats a multi-condition gate as a conjunction', () => {
    const g = createGame(
      synth({
        probe: room('probe', {
          o: {
            tap: 'A thing to poke.',
            actions: {
              arm: [{ set: ['a'], say: 'armed' }],
              poke: [{ if: { flags: ['a', 'b'] }, say: 'both' }, { say: 'fallback' }],
            },
          },
        }),
      }),
    )
    const armed = g.act(g.newRun(1), { object: 'o', action: 'arm' }).state
    expect(says(g.act(armed, POKE))).toEqual(['fallback'])
  })

  it('gates on items as well as flags', () => {
    // A gate word the engine does not read is a gate that always passes, which
    // is a branch that opens before it has been earned.
    const g = createGame(
      synth({
        probe: room('probe', {
          o: {
            tap: 'A thing to poke.',
            actions: {
              take: [{ give: ['lamp'], say: 'taken' }],
              poke: [{ if: { items: ['lamp'] }, say: 'held' }, { say: 'empty-handed' }],
            },
          },
        }),
      }),
    )
    const start = g.newRun(1)
    expect(says(g.act(start, POKE))).toEqual(['empty-handed'])
    const held = g.act(start, { object: 'o', action: 'take' }).state
    expect(says(g.act(held, POKE))).toEqual(['held'])
  })

  it('reaches the gateless fallback only while the gated branch does not pass', () => {
    // There is no negation in the vocabulary. "Not yet opened" is the fallback,
    // reached by ordering the opened branch above it — the Crossing's own shape.
    const g = createGame(
      synth({
        probe: room('probe', {
          o: {
            tap: 'A thing to poke.',
            actions: {
              learn: [{ set: ['knows'], say: 'learned' }],
              poke: [{ if: { flags: ['knows'] }, say: 'open' }, { say: 'shut' }],
            },
          },
        }),
      }),
    )
    const start = g.newRun(1)
    expect(says(g.act(start, POKE))).toEqual(['shut'])
    const knows = g.act(start, { object: 'o', action: 'learn' }).state
    expect(says(g.act(knows, POKE))).toEqual(['open'])
  })
})

describe('H006a · deltas apply in VOCAB order, not file order', () => {
  it('give (3) precedes take (4) regardless of key order', () => {
    // take written first; VOCAB order must still run give first, so the item
    // ends up gone.
    const g = createGame(probe({ take: ['lamp'], give: ['lamp'], say: 'x' }))
    expect(g.act(g.newRun(1), POKE).state.items).not.toContain('lamp')
  })

  it('say (1) precedes journal (5) regardless of key order', () => {
    const g = createGame(probe({ journal: 'mark', say: 'x' }))
    expect(g.act(g.newRun(1), POKE).effects).toEqual([
      { kind: 'say', text: 'x' },
      { kind: 'journal', entry: 'mark' },
    ])
  })

  it('journal (5) precedes goto (7) — the entry belongs to the scene you left', () => {
    const g = createGame(
      synth({
        probe: room('probe', {
          o: { tap: 'A thing to poke.', actions: { go: [{ goto: 'far', journal: 'mark', say: 'x' }] } },
        }),
        far: room('far', {}),
      }),
    )
    const { state, effects } = g.act(g.newRun(1), { object: 'o', action: 'go' })
    expect(state.journal).toEqual(['mark'])
    expect(state.scene).toBe('far')
    expect(kinds({ state, effects })).toEqual(['say', 'journal', 'enter'])
  })

  it('end (10) comes last, after everything the branch said', () => {
    const g = createGame(
      probe({ end: { line: 'The dark takes it.', note: 'left' }, journal: 'mark', say: 'x' }),
    )
    expect(g.act(g.newRun(1), POKE).effects).toEqual([
      { kind: 'say', text: 'x' },
      { kind: 'journal', entry: 'mark' },
      { kind: 'end', line: 'The dark takes it.', note: 'left' },
    ])
  })

  it('appends every journal entry — the ledger de-duplicates, the journal does not', () => {
    const g = createGame(probe({ journal: 'mark', say: 'x' }))
    const once = g.act(g.newRun(1), POKE).state
    expect(g.act(once, POKE).state.journal).toEqual(['mark', 'mark'])
  })
})

describe('H006a · the refusal ledger', () => {
  it('ledgers a refusal and changes nothing else', () => {
    const g = createGame(probe({ refuse: true, say: 'The bar does not lift for you.' }))
    const before = g.newRun(1)
    const { state, effects } = g.act(before, POKE)
    expect(state.refused).toEqual(['o.poke'])
    expect(state.flags).toEqual(before.flags)
    expect(state.items).toEqual(before.items)
    expect(state.journal).toEqual(before.journal)
    expect(state.scene).toBe(before.scene)
    expect(effects).toContainEqual({
      kind: 'refused',
      ref: { object: 'o', action: 'poke' },
      line: 'The bar does not lift for you.',
    })
  })

  it('still speaks the line — carried on the refusal, once, because the say is the line', () => {
    // Refuse purity is about deltas, and say is not one: the line reaches the
    // caller. It reaches it as `refused.line`, because for `refuse: true` the
    // `say` is the refusal's own line — one prose effect per response, so no
    // consumer can print the sentence twice.
    const g = createGame(probe({ refuse: true, say: 'The bar does not lift for you.' }))
    const turn = g.act(g.newRun(1), POKE)
    expect(kinds(turn)).toEqual(['refused'])
    expect(says(turn)).toEqual([])
    expect(refusedLines(turn)).toEqual(['The bar does not lift for you.'])
  })

  it('does not duplicate a ledger entry on a second refusal', () => {
    const g = createGame(probe({ refuse: true, say: 'The bar does not lift for you.' }))
    let s = g.newRun(1)
    s = g.act(s, POKE).state
    s = g.act(s, POKE).state
    expect(s.refused).toEqual(['o.poke'])
  })

  it('never reaches the engine carrying another delta — the loader refuses it', () => {
    // A refusal that changes the world is not a refusal (VOCAB.md §refuse
    // purity). The engine applies refuse and stops regardless, but content like
    // this does not get as far as the engine to find out.
    for (const delta of [
      { set: ['a'] },
      { give: ['lamp'] },
      { journal: 'mark' },
      { goto: 'far' },
      { end: { line: 'The dark takes it.' } },
    ]) {
      expect(() => probe({ refuse: true, say: 'No.', ...delta })).toThrow(
        /a refusal changes nothing/,
      )
    }
  })
})

describe('H006a · object sets change only by delta (LAWS.md §affordance)', () => {
  const cause = 'the poke shook it loose'

  it('addObject brings an object into view', () => {
    const g = createGame(probeWithAsh({ addObject: { scene: 'probe', object: 'ash', cause }, say: 'x' }))
    const start = g.newRun(1)
    expect(ids(g.getView(start))).not.toContain('ash')
    const { state } = g.act(start, POKE)
    expect(ids(g.getView(state))).toContain('ash')
  })

  it('scopes an addObject to the scene it names — the same id elsewhere stays hidden', () => {
    // The scene on the delta is not decoration. A template dealt into two rooms
    // must not open in the room you were never in.
    const g = createGame(
      synth(
        {
          here: room('here', {
            o: {
              tap: 'A thing to poke.',
              actions: { poke: [{ addObject: { scene: 'here', object: 'ash', cause }, say: 'x' }] },
            },
            ash: { tap: 'Grey, and banked over.', hidden: true, actions: { look: [{ say: 'Grey.' }] } },
          }),
          there: room('there', {
            ash: { tap: 'Grey, and banked over.', hidden: true, actions: { look: [{ say: 'Grey.' }] } },
          }),
        },
        'here',
      ),
    )
    const { state } = g.act(g.newRun(1), POKE)
    expect(ids(g.getView(state))).toEqual(['o', 'ash'])
    expect(ids(g.getView({ ...state, scene: 'there' }))).toEqual([])
  })

  it('removeObject takes one away', () => {
    const g = createGame(probe({ removeObject: { scene: 'probe', object: 'o', cause }, say: 'x' }))
    const { state } = g.act(g.newRun(1), POKE)
    expect(ids(g.getView(state))).not.toContain('o')
  })

  it('keeps a removal final — a later add does not undo it', () => {
    const g = createGame(
      probeWithAsh({
        removeObject: { scene: 'probe', object: 'ash', cause },
        addObject: { scene: 'probe', object: 'ash', cause },
        say: 'x',
      }),
    )
    const { state } = g.act(g.newRun(1), POKE)
    expect(ids(g.getView(state))).not.toContain('ash')
  })

  it('a flag alone never changes the object set, however it is named', () => {
    // Not even a flag named after the object. Arrivals and departures come from
    // a delta that recorded its cause, and from nothing else.
    const g = createGame(probeWithAsh({ set: ['ash', 'obj_ash'], say: 'x' }))
    const start = g.newRun(1)
    const { state } = g.act(start, POKE)
    expect(ids(g.getView(state))).toEqual(ids(g.getView(start)))
  })
})

describe('H006b · GameAPI', () => {
  it('newRun starts at the bundle start scene with the given seed', () => {
    const b = crossingBundle()
    const s = newRun(42, b)
    expect(s.scene).toBe(b.start)
    expect(s.scene).toBe('crossing')
    expect(s.seed).toBe(42)
    expect(s.journal).toEqual([])
    expect(s.refused).toEqual([])
  })

  it('getView reports the scene line and the objects with their actions', () => {
    const g = createGame(crossingBundle())
    const v = g.getView(g.newRun(42))
    expect(typeof v.line).toBe('string')
    expect(v.line).toMatch(/ring of the portal/i)
    expect(v.scene).toBe('crossing')
    const door = v.objects.find((o) => o.id === 'door')
    expect(door?.actions).toContain('open')
  })

  it('carries every object its free tap — the prose a shell draws without acting', () => {
    const g = createGame(crossingBundle())
    const v = g.getView(g.newRun(42))
    expect(v.objects.length).toBeGreaterThan(0)
    for (const o of v.objects) {
      expect(typeof o.tap, `${o.id} has no tap`).toBe('string')
      expect(o.tap.length, `${o.id} taps to nothing`).toBeGreaterThan(0)
    }
    expect(v.objects.find((o) => o.id === 'door')?.tap).toMatch(/low door/i)
  })

  it('act does not mutate the state it was handed', () => {
    const g = createGame(crossingBundle())
    const before = deepFreeze(g.newRun(42))
    const snapshot = JSON.stringify(before)
    expect(() => g.act(before, { object: 'door', action: 'open' })).not.toThrow()
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('getView does not mutate', () => {
    const g = createGame(crossingBundle())
    const s = deepFreeze(g.newRun(42))
    const snapshot = JSON.stringify(s)
    g.getView(s)
    expect(JSON.stringify(s)).toBe(snapshot)
  })

  it('act returns state that is still JSON-safe', () => {
    const g = createGame(crossingBundle())
    const { state } = g.act(g.newRun(42), { object: 'stone', action: 'study' })
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(structuredClone(state)).toEqual(state)
  })

  it('an unknown object or action is a no-op, not a crash', () => {
    const g = createGame(crossingBundle())
    const s = g.newRun(42)
    expect(() => g.act(s, { object: 'nothing', action: 'poke' })).not.toThrow()
    expect(g.act(s, { object: 'nothing', action: 'poke' }).state).toEqual(s)
    expect(g.act(s, { object: 'door', action: 'juggle' }).state).toEqual(s)
  })

  it('plays the Crossing arc: the door refuses, the stone teaches, the same tap opens', () => {
    const g = createGame(crossingBundle())
    const start = g.newRun(42)

    const shut = g.act(start, { object: 'door', action: 'open' })
    // The refusing branch says nothing of its own: its `say` is the line the
    // refusal carries, and the refusal is the whole of what the turn spoke.
    expect(kinds(shut)).toEqual(['refused'])
    expect(refusedLines(shut)).toEqual([
      'The mark on the wood means something. Not to you, and not to your hands.',
    ])
    expect(shut.state.refused).toEqual(['door.open'])
    expect(shut.state.flags).toEqual([])

    const taught = g.act(shut.state, { object: 'stone', action: 'study' })
    expect(taught.state.flags).toContain('knows_mark')
    expect(taught.state.journal).toEqual(['the_mark'])

    const open = g.act(taught.state, { object: 'door', action: 'open' })
    expect(kinds(open)).toEqual(['say', 'journal'])
    expect(open.state.flags).toContain('door_open')
    expect(open.state.journal).toEqual(['the_mark', 'the_way_down'])
    // The ledger keeps the refusal that came before: the world remembers being
    // asked, and the second asking is not the first.
    expect(open.state.refused).toEqual(['door.open'])

    const down = g.act(open.state, { object: 'steps', action: 'descend' })
    expect(down.effects).toContainEqual({
      kind: 'end',
      line: 'The dark takes the third tread, and then you.',
      note: 'left the Crossing',
    })
  })

  it('holds the steps until the door is open — the fallback is the closed way', () => {
    const g = createGame(crossingBundle())
    const turn = g.act(g.newRun(42), { object: 'steps', action: 'descend' })
    // The fallback fires and names what bars the way — on the refusal, which
    // is where a refusing branch's `say` goes and the only place it goes.
    expect(kinds(turn)).toEqual(['refused'])
    expect(refusedLines(turn)).toEqual(['The door is barred between you and them.'])
    expect(turn.effects).not.toContainEqual(expect.objectContaining({ kind: 'end' }))
    expect(turn.state.refused).toEqual(['steps.descend'])
  })

  it('replays deterministically — same seed, same taps, same state', () => {
    const taps = [
      { object: 'door', action: 'open' },
      { object: 'stone', action: 'study' },
      { object: 'door', action: 'open' },
      { object: 'hands', action: 'look' },
      { object: 'steps', action: 'descend' },
    ]
    const run = () => {
      const g = createGame(crossingBundle())
      let s = g.newRun(42)
      for (const t of taps) s = g.act(s, t).state
      return s
    }
    expect(run()).toEqual(run())
  })
})
