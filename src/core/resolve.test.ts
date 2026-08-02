import { describe, expect, it } from 'vitest'
import { DELTA_ORDER, GATE_WORDS, parseScene } from './cards'
import type { Response, Scene } from './cards'
import { resolve, visible } from './resolve'
import { emptyState } from './types'
import type { GameState } from './types'
import type { Turn } from './api-types'

// H006a · the heart, on its own. The acceptance (tests/acceptance/H006.engine)
// cannot run until H006b lands — it imports createGame — so this suite is the
// card's proof: first passing gate, deltas in VOCAB order, a refusal ledgered
// once, the object set folded out of the reserved flags and scoped to its
// scene, and nothing mutated.
//
// Fixtures go through parseScene wherever they can, so what is under test is
// the shape the loader actually hands over, normalisation and all.

const POKE = { object: 'o', action: 'poke' } as const

const CAUSE = 'the poke turned it up'

/** A one-object scene: `o`, affording `poke` through the given responses. */
const probe = (...responses: Record<string, unknown>[]): Scene =>
  parseScene({
    scene: 'probe',
    enter: 'A line.',
    objects: { o: { tap: 'A thing to poke.', actions: { poke: responses } } },
  })

/**
 * The same two objects under whatever scene name is asked for — `o` in view and
 * `ash` waiting on an addObject. Two rooms holding the same ids is the whole
 * point of the scene-scoped object set, so the builder takes the name.
 */
const room = (name: string, ...responses: Record<string, unknown>[]): Scene =>
  parseScene({
    scene: name,
    enter: 'A line.',
    objects: {
      o: { tap: 'A thing to poke.', actions: { poke: responses } },
      ash: { tap: 'Grey, and cold all through.', actions: { look: [{ say: 'Grey.' }] }, hidden: true },
    },
  })

/** The same, unparsed — for responses the schema refuses to build (see below). */
const unchecked = (...responses: Response[]): Scene => ({
  scene: 'probe',
  enter: 'A line.',
  objects: [{ id: 'o', tap: 'A thing to poke.', actions: { poke: responses } }],
})

const start = (): GameState => emptyState('probe', 1)

const says = (turn: Turn): string[] =>
  turn.effects.flatMap((effect) => (effect.kind === 'say' ? [effect.text] : []))

/**
 * The prose a refusal turns you away with. `refuse: true` means the response's
 * `say` IS that line (VOCAB.md), so this is where a refusing branch's prose
 * comes out — the mirror of `says` for the one branch that does not say.
 */
const refusedLines = (turn: Turn): string[] =>
  turn.effects.flatMap((effect) => (effect.kind === 'refused' ? [effect.line] : []))

const kinds = (turn: Turn): string[] => turn.effects.map((effect) => effect.kind)

const ids = (scene: Scene, state: GameState): string[] =>
  visible(scene, state).map((object) => object.id)

const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('selection — the first response whose gate passes', () => {
  it('takes the first passing response, not the last and not the most specific', () => {
    const turn = resolve(probe({ say: 'first' }, { say: 'second' }), start(), POKE)
    expect(says(turn)).toEqual(['first'])
  })

  it('skips a response whose gate does not pass', () => {
    const turn = resolve(
      probe({ if: { flags: 'never' }, say: 'gated' }, { say: 'fallback' }),
      start(),
      POKE,
    )
    expect(says(turn)).toEqual(['fallback'])
  })

  it('passes an empty gate and an absent one alike — both are the fallback', () => {
    expect(says(resolve(probe({ if: {}, say: 'empty' }), start(), POKE))).toEqual(['empty'])
    expect(says(resolve(probe({ say: 'absent' }), start(), POKE))).toEqual(['absent'])
  })

  it('treats a gate as a conjunction — one condition short is no gate at all', () => {
    const scene = probe({ if: { flags: ['lit', 'dark'] }, say: 'both' }, { say: 'fallback' })
    const half: GameState = { ...start(), flags: ['lit'] }
    expect(says(resolve(scene, half, POKE))).toEqual(['fallback'])
    expect(says(resolve(scene, { ...half, flags: ['lit', 'dark'] }, POKE))).toEqual(['both'])
  })

  it('treats flags and items in one gate as a conjunction across both words', () => {
    const scene = probe({ if: { flags: ['lit'], items: ['lamp'] }, say: 'both' }, { say: 'fallback' })
    expect(says(resolve(scene, { ...start(), flags: ['lit'] }, POKE))).toEqual(['fallback'])
    expect(says(resolve(scene, { ...start(), items: ['lamp'] }, POKE))).toEqual(['fallback'])
    expect(
      says(resolve(scene, { ...start(), flags: ['lit'], items: ['lamp'] }, POKE)),
    ).toEqual(['both'])
  })

  it('takes a later response once the world has caught up with its gate', () => {
    const scene = probe({ if: { flags: 'lit' }, say: 'open' }, { say: 'shut' })
    expect(says(resolve(scene, start(), POKE))).toEqual(['shut'])
    expect(says(resolve(scene, { ...start(), flags: ['lit'] }, POKE))).toEqual(['open'])
  })
})

describe('selection — the un-done branch is the gateless one, reached by order', () => {
  // There is no negation in the vocabulary. "The door has not been read yet" is
  // written by putting the read branch above the fallback and letting the
  // fallback catch every run that has not earned the flag — content/crossing
  // is exactly this shape. These stand in for the notFlag/notItem pairs the
  // old vocabulary had: same claim, spelled as ordering.
  const DOOR_REFUSAL = 'The mark on the wood means something. Not to you, and not to your hands.'

  const door = (): Scene =>
    probe(
      {
        if: { flags: ['knows_mark'] },
        say: 'You lift the bar. The shape on the wood is the shape on the stone.',
        set: ['door_open'],
        journal: 'the_way_down',
      },
      {
        refuse: true,
        say: DOOR_REFUSAL,
      },
    )

  it('falls through to the fallback while the gated branch is unearned', () => {
    const turn = resolve(door(), start(), POKE)
    // The fallback here is the refusing branch, and a refusal speaks on the
    // `refused` effect: its `line` is the branch's own `say`.
    expect(kinds(turn)).toEqual(['refused'])
    expect(refusedLines(turn)).toEqual([DOOR_REFUSAL])
    expect(turn.state.flags).toEqual([])
    expect(turn.state.journal).toEqual([])
    expect(turn.state.refused).toEqual(['o.poke'])
  })

  it('takes the gated branch — and only it — once the flag is held', () => {
    const turn = resolve(door(), { ...start(), flags: ['knows_mark'] }, POKE)
    expect(kinds(turn)).toEqual(['say', 'journal'])
    expect(turn.state.flags).toEqual(['knows_mark', 'door_open'])
    expect(turn.state.journal).toEqual(['the_way_down'])
    // The fallback did not also fire: one response per tap, not a cascade.
    expect(turn.state.refused).toEqual([])
  })

  it('writes "does not carry it" the same way — a gated items branch over a fallback', () => {
    const scene = probe({ if: { items: ['lamp'] }, say: 'held' }, { say: 'empty-handed' })
    expect(says(resolve(scene, start(), POKE))).toEqual(['empty-handed'])
    expect(says(resolve(scene, { ...start(), items: ['lamp'] }, POKE))).toEqual(['held'])
  })
})

describe('selection — every gate word', () => {
  // A gate word the engine does not read is a gate that always passes, which
  // is a scene that opens before it has been earned. Every word gets a pair.
  const held: GameState = { ...start(), flags: ['lit'], items: ['lamp'] }
  const cases: [word: string, gate: Record<string, string>, passes: boolean][] = [
    ['flags', { flags: 'lit' }, true],
    ['flags', { flags: 'dark' }, false],
    ['items', { items: 'lamp' }, true],
    ['items', { items: 'ash' }, false],
  ]

  it('covers the whole of GATE_WORDS', () => {
    expect([...new Set(cases.map(([word]) => word))].sort()).toEqual([...GATE_WORDS].sort())
  })

  for (const [word, gate, expected] of cases) {
    it(`${word} ${JSON.stringify(gate)} ${expected ? 'passes' : 'does not pass'}`, () => {
      const turn = resolve(probe({ if: gate, say: 'gated' }, { say: 'fallback' }), held, POKE)
      expect(says(turn)).toEqual([expected ? 'gated' : 'fallback'])
    })
  }
})

describe('application — deltas apply in DELTA_ORDER, not file order', () => {
  it('runs give (3) before take (4), whichever the file wrote first', () => {
    const turn = resolve(probe({ take: 'lamp', give: 'lamp', say: 'x' }), start(), POKE)
    expect(turn.state.items).not.toContain('lamp')
  })

  it('applies set (2) and give (3) whichever order the file happened to write them', () => {
    const turn = resolve(probe({ give: 'lamp', set: 'lit', say: 'x' }), start(), POKE)
    expect(turn.state.flags).toEqual(['lit'])
    expect(turn.state.items).toEqual(['lamp'])
  })

  it('runs journal (5) before goto (7) — the entry belongs to the scene you left', () => {
    const turn = resolve(probe({ goto: 'far', journal: 'the_mark', say: 'x' }), start(), POKE)
    expect(turn.state.journal).toEqual(['the_mark'])
    expect(turn.state.scene).toBe('far')
    expect(kinds(turn)).toEqual(['say', 'journal', 'enter'])
  })

  it('runs end (10) last — after the line, the entry and the move', () => {
    const turn = resolve(
      probe({
        end: { line: 'The dark takes the third tread, and then you.' },
        goto: 'far',
        journal: 'the_mark',
        say: 'x',
      }),
      start(),
      POKE,
    )
    expect(kinds(turn)).toEqual(['say', 'journal', 'enter', 'end'])
  })

  it('applies a delta once per name, in the order the author listed the names', () => {
    const turn = resolve(probe({ set: ['a', 'b'], give: ['lamp', 'ash'], say: 'x' }), start(), POKE)
    expect(turn.state.flags).toEqual(['a', 'b'])
    expect(turn.state.items).toEqual(['lamp', 'ash'])
  })

  it('appends the journal entry every time — the ledger de-duplicates, the journal does not', () => {
    const scene = probe({ journal: 'the_mark', say: 'x' })
    const once = resolve(scene, start(), POKE)
    const twice = resolve(scene, once.state, POKE)
    expect(twice.state.journal).toEqual(['the_mark', 'the_mark'])
  })

  it('leaves flags and items each holding a name once', () => {
    const scene = probe({ set: 'a', give: 'lamp', say: 'x' })
    const twice = resolve(scene, resolve(scene, start(), POKE).state, POKE)
    expect(twice.state.flags).toEqual(['a'])
    expect(twice.state.items).toEqual(['lamp'])
  })
})

describe('application — every word in the table moves the world', () => {
  // A word the engine silently ignores is the worst kind of bug: the content
  // lints, the suite is green, and nothing happens. The map is keyed by the
  // table itself, so a word added to VOCAB.md will not compile until it is
  // exercised here.
  //
  // `say` is required on every response now, so "moved the world" is measured
  // against the turn a bare say produces — not against an empty turn, which
  // no v4 response can give.
  const oneOfEach: Record<(typeof DELTA_ORDER)[number], Record<string, unknown>> = {
    say: { say: 'The stone takes the heat out of your palm.' },
    set: { say: 'x', set: 'lit' },
    give: { say: 'x', give: 'lamp' },
    take: { say: 'x', take: 'coin' },
    journal: { say: 'x', journal: 'the_mark' },
    refuse: { say: 'It holds fast.', refuse: true },
    goto: { say: 'x', goto: 'far' },
    addObject: { say: 'x', addObject: { scene: 'probe', object: 'ash', cause: CAUSE } },
    removeObject: { say: 'x', removeObject: { scene: 'probe', object: 'o', cause: CAUSE } },
    end: { say: 'x', end: { line: 'The dark takes the third tread, and then you.' } },
  }

  it('names every word in DELTA_ORDER', () => {
    expect(Object.keys(oneOfEach).sort()).toEqual([...DELTA_ORDER].sort())
  })

  for (const [word, response] of Object.entries(oneOfEach)) {
    it(`${word} is not a no-op`, () => {
      // Something to take away, so the words that take have something to take.
      const before: GameState = { ...start(), flags: ['held'], items: ['coin'] }
      const bare = resolve(probe({ say: 'x' }), before, POKE)
      const turn = resolve(probe(response), before, POKE)
      expect({ state: turn.state, effects: turn.effects }).not.toEqual({
        state: bare.state,
        effects: bare.effects,
      })
    })
  }

  it('carries the end note when the author wrote one, and omits the key when not', () => {
    const noted = resolve(
      probe({ say: 'x', end: { line: 'The dark takes the third tread.', note: 'left the Crossing' } }),
      start(),
      POKE,
    )
    expect(noted.effects).toContainEqual({
      kind: 'end',
      line: 'The dark takes the third tread.',
      note: 'left the Crossing',
    })
    const plain = resolve(
      probe({ say: 'x', end: { line: 'The dark takes the third tread.' } }),
      start(),
      POKE,
    )
    expect(plain.effects).toContainEqual({ kind: 'end', line: 'The dark takes the third tread.' })
  })

  it('ends the slice without moving the state — end is announced, not stored', () => {
    const before = start()
    const turn = resolve(
      probe({ say: 'x', end: { line: 'The dark takes the third tread.' } }),
      before,
      POKE,
    )
    expect(turn.state).toEqual(before)
  })
})

describe('refusal — the world remembers being asked', () => {
  it('ledgers refKey(ref) and changes nothing else', () => {
    const before = start()
    const turn = resolve(probe({ say: 'It holds fast.', refuse: true }), before, POKE)
    expect(turn.state.refused).toEqual(['o.poke'])
    expect(turn.state.flags).toEqual(before.flags)
    expect(turn.state.items).toEqual(before.items)
    expect(turn.state.journal).toEqual(before.journal)
    expect(turn.state.scene).toBe(before.scene)
    expect(turn.state.rng).toBe(before.rng)
    expect(turn.effects).toEqual([
      { kind: 'refused', ref: { object: 'o', action: 'poke' }, line: 'It holds fast.' },
    ])
  })

  it('never ledgers a key twice, however often it is asked', () => {
    const scene = probe({ say: 'It holds fast.', refuse: true })
    let state = start()
    for (let i = 0; i < 3; i++) state = resolve(scene, state, POKE).state
    expect(state.refused).toEqual(['o.poke'])
  })

  it('keeps one entry per action, not per object', () => {
    const scene = parseScene({
      scene: 'probe',
      enter: 'A line.',
      objects: {
        o: {
          tap: 'A thing to poke.',
          actions: {
            poke: [{ say: 'No.', refuse: true }],
            pull: [{ say: 'Also no.', refuse: true }],
          },
        },
      },
    })
    const once = resolve(scene, start(), POKE)
    const twice = resolve(scene, once.state, { object: 'o', action: 'pull' })
    expect(twice.state.refused).toEqual(['o.poke', 'o.pull'])
  })

  it('carries the line on the refusal — the say is the refusal line, and it goes out once', () => {
    // v4 folded the refusal line into `say`: for `refuse: true` the `say` IS
    // the line the world turns you away with. So it goes out attached to the
    // ledger key and nowhere else. Emitting it as prose as well would put the
    // same sentence on screen twice and leave every consumer to know which
    // copy to drop.
    const line = 'The mark on the wood means something. Not to you, and not to your hands.'
    const turn = resolve(probe({ say: line, refuse: true }), start(), POKE)
    expect(kinds(turn)).toEqual(['refused'])
    // The line still reaches the caller — it is `refused.line` now.
    expect(refusedLines(turn)).toEqual([line])
    expect(turn.effects[0]).toEqual({ kind: 'refused', ref: POKE, line })
  })

  it('emits exactly one prose effect for a refusal — no say beside the refused', () => {
    // The regression guard for the double-print. Both effects carried the same
    // string and both default consumers drew it, so the refusal appeared twice
    // on screen above its `(refused — …)` marker. One prose effect per
    // response, and for a refusal that effect is `refused`.
    const line = 'The bar does not lift for you.'
    const turn = resolve(probe({ say: line, refuse: true }), start(), POKE)
    expect(says(turn)).toEqual([])
    expect(turn.effects.filter((effect) => effect.kind === 'refused')).toHaveLength(1)
    expect(refusedLines(turn)).toEqual([line])
  })

  // The v3 vocabulary let a refusal carry a line *and* deltas, so the engine
  // had to be the thing that stopped. v4 moved the guarantee up to the schema:
  // a refusal that changes the world does not parse at all. Both halves are
  // proved — the schema refuses to build one, and the engine stops at one if
  // content reaches it another way.
  describe('purity — a refusal changes nothing', () => {
    const carriers: [word: string, delta: Record<string, unknown>][] = [
      ['set', { set: ['a'] }],
      ['give', { give: ['lamp'] }],
      ['take', { take: ['coin'] }],
      ['journal', { journal: 'the_mark' }],
      ['goto', { goto: 'far' }],
      ['addObject', { addObject: { scene: 'probe', object: 'ash', cause: CAUSE } }],
      ['removeObject', { removeObject: { scene: 'probe', object: 'o', cause: CAUSE } }],
      ['end', { end: { line: 'The dark takes the third tread.' } }],
    ]

    it('covers every delta but say and refuse', () => {
      expect(carriers.map(([word]) => word).sort()).toEqual(
        [...DELTA_ORDER].filter((word) => word !== 'say' && word !== 'refuse').sort(),
      )
    })

    for (const [word, delta] of carriers) {
      it(`parseScene rejects a refusal carrying ${word}`, () => {
        expect(() => probe({ say: 'It holds fast.', refuse: true, ...delta })).toThrow(
          /a refusal changes nothing/,
        )
      })
    }

    it('names every offending word at once, so one pass fixes the response', () => {
      expect(() =>
        probe({ say: 'It holds fast.', refuse: true, set: ['a'], goto: 'far' }),
      ).toThrow(/drop set, goto/)
    })
  })

  it('stops the turn at the refusal — nothing ordered after it fires', () => {
    // VOCAB.md: the engine applies refuse and stops. parseScene will not build
    // this response, so the test hands it over unchecked.
    //
    // `refuse` sits sixth in DELTA_ORDER, so "stops" reaches goto, addObject,
    // removeObject and end. The four words ordered *before* it are held off by
    // the schema, not by the loop — which is why the suite above exercises the
    // rejection for all eight rather than trusting the engine to be the gate.
    // `say` is the fifth word before it and is held off by neither: it is
    // required on every response, and on a refusing one it is the refusal's
    // own line, so it leaves on `refused` rather than as prose of its own.
    const turn = resolve(
      unchecked({
        say: 'It holds fast.',
        refuse: true,
        goto: 'far',
        addObject: { scene: 'probe', object: 'ash', cause: CAUSE },
        removeObject: { scene: 'probe', object: 'o', cause: CAUSE },
        end: { line: 'The dark takes the third tread.' },
      }),
      start(),
      POKE,
    )
    expect(turn.state.scene).toBe('probe')
    expect(turn.state.flags).toEqual([])
    expect(turn.state.refused).toEqual(['o.poke'])
    expect(kinds(turn)).toEqual(['refused'])
    expect(refusedLines(turn)).toEqual(['It holds fast.'])
  })
})

describe('object sets — nothing moves them but a delta (LAWS.md §affordance)', () => {
  const here = (...responses: Record<string, unknown>[]): Scene => room('probe', ...responses)
  /** The same object ids, a different room. Nothing here ever gets poked. */
  const there = room('elsewhere', { say: 'x' })

  const add = (scene: string): Record<string, unknown> => ({
    say: 'x',
    addObject: { scene, object: 'ash', cause: CAUSE },
  })
  const drop = (scene: string): Record<string, unknown> => ({
    say: 'x',
    removeObject: { scene, object: 'o', cause: CAUSE },
  })

  it('leaves a hidden object out of the set until something adds it', () => {
    const scene = here(add('probe'))
    expect(ids(scene, start())).toEqual(['o'])
    const turn = resolve(scene, start(), POKE)
    expect(ids(scene, turn.state)).toEqual(['o', 'ash'])
  })

  it('takes an object away on removeObject', () => {
    const scene = here(drop('probe'))
    const turn = resolve(scene, start(), POKE)
    // `ash` is still hidden and nothing added it, so the set empties out.
    expect(ids(scene, turn.state)).toEqual([])
  })

  it('adds to the scene the delta names, and to no other', () => {
    // The bug this shape exists to stop: v3 keyed the object set by object id
    // alone, so a template dealt into two rooms opened both at once. `ash` is
    // a hidden object id in each room, and only the named room may reveal it.
    const scene = here(add('probe'))
    const turn = resolve(scene, start(), POKE)
    expect(ids(scene, turn.state)).toEqual(['o', 'ash'])
    expect(ids(there, turn.state)).toEqual(['o'])
  })

  it('removes from the scene the delta names, and from no other', () => {
    const scene = here(drop('probe'))
    const turn = resolve(scene, start(), POKE)
    expect(ids(scene, turn.state)).toEqual([])
    expect(ids(there, turn.state)).toEqual(['o'])
  })

  it('reaches into another scene when the delta names one — and leaves this one alone', () => {
    // The scene key is an address, not a shorthand for "here": a tap in the
    // Crossing may set a thing waiting further down.
    const scene = here(add('elsewhere'))
    const turn = resolve(scene, start(), POKE)
    expect(ids(scene, turn.state)).toEqual(['o'])
    expect(ids(there, turn.state)).toEqual(['o', 'ash'])
  })

  it('records the set in flags under the reserved prefixes, keyed by scene', () => {
    // The wire format, pinned: scripts/play.ts folds the same two prefixes,
    // and content-lint has to know what an author may never write by hand.
    const added = resolve(here(add('probe')), start(), POKE)
    expect(added.state.flags).toEqual(['obj+:probe:ash'])
    const removed = resolve(here(drop('elsewhere')), start(), POKE)
    expect(removed.state.flags).toEqual(['obj-:elsewhere:o'])
    expect(Object.keys(added.state).sort()).toEqual(Object.keys(start()).sort())
  })

  it('never moves the set for a flag alone', () => {
    for (const flag of ['ash', 'obj_ash', 'obj:probe:ash']) {
      const scene = here({ say: 'x', set: [flag] })
      const turn = resolve(scene, start(), POKE)
      expect(ids(scene, turn.state)).toEqual(ids(scene, start()))
    }
  })

  it('keeps a removal final — a later add does not undo it (VOCAB.md §object sets)', () => {
    const scene = parseScene({
      scene: 'probe',
      enter: 'A line.',
      objects: {
        o: {
          tap: 'A thing to poke.',
          actions: {
            poke: [
              {
                say: 'x',
                removeObject: { scene: 'probe', object: 'o', cause: CAUSE },
                addObject: { scene: 'probe', object: 'o', cause: CAUSE },
              },
            ],
          },
        },
      },
    })
    const turn = resolve(scene, start(), POKE)
    expect(turn.state.flags).toEqual(['obj+:probe:o', 'obj-:probe:o'])
    expect(ids(scene, turn.state)).toEqual([])
  })

  it('will not resolve a tap on an object that is not in the set', () => {
    const scene = here(add('probe'))
    const look = { object: 'ash', action: 'look' }
    expect(resolve(scene, start(), look)).toEqual({ state: start(), effects: [] })
    const added = resolve(scene, start(), POKE)
    expect(says(resolve(scene, added.state, look))).toEqual(['Grey.'])
  })

  it('reads the cause but never acts on it — two deltas differing only in cause resolve alike', () => {
    // `cause` is authored for the reader of the content and checked by the
    // linter, not by the engine (LAWS.md #affordance).
    const one = resolve(
      here({ say: 'x', addObject: { scene: 'probe', object: 'ash', cause: CAUSE } }),
      start(),
      POKE,
    )
    const other = resolve(
      here({ say: 'x', addObject: { scene: 'probe', object: 'ash', cause: 'some other reason' } }),
      start(),
      POKE,
    )
    expect(JSON.stringify(one)).toBe(JSON.stringify(other))
  })
})

describe('a tap that answers to nothing is nothing', () => {
  const scene = probe({ say: 'x' })

  it('returns the state it was handed for an unknown object', () => {
    const before = start()
    expect(resolve(scene, before, { object: 'nothing', action: 'poke' })).toEqual({
      state: before,
      effects: [],
    })
  })

  it('returns the state it was handed for an action the object does not afford', () => {
    const before = start()
    expect(resolve(scene, before, { object: 'o', action: 'juggle' })).toEqual({
      state: before,
      effects: [],
    })
  })

  it('does not mistake a name off Object.prototype for a response list', () => {
    // `actions` is a plain object, so `actions.constructor` is a function and
    // `actions.toString` is one too. A person may type anything at a shell.
    for (const action of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(() => resolve(scene, start(), { object: 'o', action })).not.toThrow()
      expect(resolve(scene, start(), { object: 'o', action }).effects).toEqual([])
    }
  })

  it('resolves nothing when no response passes and there is no fallback', () => {
    // parseScene will not build a list without one, so this is content that
    // reached the engine another way. It is a miss, not a throw.
    const before = start()
    expect(resolve(unchecked({ if: { flags: ['never'] }, say: 'x' }), before, POKE)).toEqual({
      state: before,
      effects: [],
    })
  })
})

describe('purity — the state handed in is never touched', () => {
  const everything = probe({
    say: 'x',
    set: ['a', 'held'],
    give: ['lamp', 'coin'],
    take: ['coin'],
    journal: 'the_mark',
    goto: 'far',
    addObject: { scene: 'probe', object: 'ash', cause: CAUSE },
    removeObject: { scene: 'elsewhere', object: 'pool', cause: 'the water went out of it' },
    end: { line: 'The dark takes the third tread, and then you.', note: 'left the Crossing' },
  })

  it('leaves a deep-frozen state byte for byte as it found it', () => {
    const before = deepFreeze(start())
    const snapshot = JSON.stringify(before)
    expect(() => resolve(everything, before, POKE)).not.toThrow()
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('leaves a deep-frozen state alone on the refusal path too', () => {
    const before = deepFreeze(start())
    const snapshot = JSON.stringify(before)
    expect(() =>
      resolve(probe({ say: 'It holds fast.', refuse: true }), before, POKE),
    ).not.toThrow()
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('does not read the scene it was handed through either', () => {
    const scene = deepFreeze(everything)
    expect(() => resolve(scene, start(), POKE)).not.toThrow()
    expect(() => visible(scene, start())).not.toThrow()
  })

  it('hands back state that is still JSON, and still seven keys', () => {
    const { state } = resolve(everything, start(), POKE)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(structuredClone(state)).toEqual(state)
    expect(Object.keys(state).sort()).toEqual(Object.keys(start()).sort())
  })

  it('is the same turn every time, from the same scene and the same state', () => {
    const once = resolve(everything, start(), POKE)
    const twice = resolve(everything, start(), POKE)
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice))
  })

  it('leaves the generator where it found it — no word in P0 draws', () => {
    const before: GameState = { ...start(), rng: 12345 }
    const { state } = resolve(everything, before, POKE)
    expect(state.rng).toBe(12345)
    expect(state.seed).toBe(before.seed)
  })
})

describe('effects — what the world said, in the order it said it', () => {
  it('leads with the branch line, then the deltas that speak, in table order', () => {
    const turn = resolve(
      probe({
        end: { line: 'The dark takes the third tread, and then you.' },
        goto: 'far',
        journal: 'the_mark',
        say: 'x',
      }),
      start(),
      POKE,
    )
    expect(turn.effects).toEqual([
      { kind: 'say', text: 'x' },
      { kind: 'journal', entry: 'the_mark' },
      { kind: 'enter', scene: 'far' },
      { kind: 'end', line: 'The dark takes the third tread, and then you.' },
    ])
  })

  it('says the line and no more for a branch whose deltas do not speak', () => {
    const turn = resolve(
      probe({
        say: 'x',
        set: 'a',
        give: 'lamp',
        addObject: { scene: 'probe', object: 'ash', cause: CAUSE },
      }),
      start(),
      POKE,
    )
    expect(turn.effects).toEqual([{ kind: 'say', text: 'x' }])
    expect(turn.state.flags).toEqual(['a', 'obj+:probe:ash'])
    expect(turn.state.items).toEqual(['lamp'])
  })
})
