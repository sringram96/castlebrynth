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
// once, the object set folded out of the reserved flags, and nothing mutated.
//
// Fixtures go through parseScene wherever they can, so what is under test is
// the shape the loader actually hands over, normalisation and all.

const POKE = { object: 'o', action: 'poke' } as const

/** A one-object scene: `o`, affording `poke` through the given responses. */
const probe = (...responses: Record<string, unknown>[]): Scene =>
  parseScene({ id: 'probe', line: 'A line.', objects: [{ id: 'o', name: 'o', actions: { poke: responses } }] })

/** The same, unparsed — for responses the schema refuses to build (see below). */
const unchecked = (...responses: Response[]): Scene => ({
  id: 'probe',
  line: 'A line.',
  objects: [{ id: 'o', name: 'o', actions: { poke: responses } }],
})

const start = (): GameState => emptyState('probe', 1)

const says = (turn: Turn): string[] =>
  turn.effects.flatMap((effect) => (effect.kind === 'say' ? [effect.text] : []))

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
    const turn = resolve(probe({ gate: { flag: 'never' }, say: 'gated' }, { say: 'fallback' }), start(), POKE)
    expect(says(turn)).toEqual(['fallback'])
  })

  it('passes an empty gate and an absent one alike — both are the fallback', () => {
    expect(says(resolve(probe({ gate: {}, say: 'empty' }), start(), POKE))).toEqual(['empty'])
    expect(says(resolve(probe({ say: 'absent' }), start(), POKE))).toEqual(['absent'])
  })

  it('treats a gate as a conjunction — one condition short is no gate at all', () => {
    const scene = probe({ gate: { flag: ['lit', 'dark'] }, say: 'both' }, { say: 'fallback' })
    const half: GameState = { ...start(), flags: ['lit'] }
    expect(says(resolve(scene, half, POKE))).toEqual(['fallback'])
    expect(says(resolve(scene, { ...half, flags: ['lit', 'dark'] }, POKE))).toEqual(['both'])
  })

  it('takes a later response once the world has caught up with its gate', () => {
    const scene = probe({ gate: { flag: 'lit' }, say: 'open' }, { say: 'shut' })
    expect(says(resolve(scene, start(), POKE))).toEqual(['shut'])
    expect(says(resolve(scene, { ...start(), flags: ['lit'] }, POKE))).toEqual(['open'])
  })
})

describe('selection — every gate word', () => {
  // A gate word the engine does not read is a gate that always passes, which
  // is a scene that opens before it has been earned. Every word gets a pair.
  const held: GameState = { ...start(), flags: ['lit'], items: ['lamp'] }
  const cases: [word: string, gate: Record<string, string>, passes: boolean][] = [
    ['flag', { flag: 'lit' }, true],
    ['flag', { flag: 'dark' }, false],
    ['notFlag', { notFlag: 'dark' }, true],
    ['notFlag', { notFlag: 'lit' }, false],
    ['item', { item: 'lamp' }, true],
    ['item', { item: 'ash' }, false],
    ['notItem', { notItem: 'ash' }, true],
    ['notItem', { notItem: 'lamp' }, false],
  ]

  it('covers the whole of GATE_WORDS', () => {
    expect([...new Set(cases.map(([word]) => word))].sort()).toEqual([...GATE_WORDS].sort())
  })

  for (const [word, gate, expected] of cases) {
    it(`${word} ${JSON.stringify(gate)} ${expected ? 'passes' : 'does not pass'}`, () => {
      const turn = resolve(probe({ gate, say: 'gated' }, { say: 'fallback' }), held, POKE)
      expect(says(turn)).toEqual([expected ? 'gated' : 'fallback'])
    })
  }
})

describe('application — deltas apply in DELTA_ORDER, not file order', () => {
  it('runs setFlag (2) before clearFlag (3), whichever the file wrote first', () => {
    const turn = resolve(probe({ clearFlag: 'a', setFlag: 'a' }), start(), POKE)
    expect(turn.state.flags).not.toContain('a')
  })

  it('runs addItem (4) before removeItem (5), whichever the file wrote first', () => {
    const turn = resolve(probe({ removeItem: 'lamp', addItem: 'lamp' }), start(), POKE)
    expect(turn.state.items).not.toContain('lamp')
  })

  it('runs journal (8) before goto (9) — the entry belongs to the scene you left', () => {
    const turn = resolve(probe({ goto: 'far', journal: 'mark' }), start(), POKE)
    expect(turn.state.journal).toEqual(['mark'])
    expect(turn.state.scene).toBe('far')
    expect(kinds(turn)).toEqual(['journal', 'enter'])
  })

  it('applies a delta once per name, in the order the author listed the names', () => {
    const turn = resolve(probe({ setFlag: ['a', 'b'], addItem: ['lamp', 'ash'] }), start(), POKE)
    expect(turn.state.flags).toEqual(['a', 'b'])
    expect(turn.state.items).toEqual(['lamp', 'ash'])
  })

  it('appends every journal entry — the ledger de-duplicates, the journal does not', () => {
    const scene = probe({ journal: 'procession' })
    const once = resolve(scene, start(), POKE)
    const twice = resolve(scene, once.state, POKE)
    expect(twice.state.journal).toEqual(['procession', 'procession'])
  })

  it('leaves flags and items each holding a name once', () => {
    const scene = probe({ setFlag: 'a', addItem: 'lamp' })
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
  const oneOfEach: Record<(typeof DELTA_ORDER)[number], Record<string, unknown>> = {
    refuse: { refuse: 'It holds fast.' },
    setFlag: { setFlag: 'lit' },
    clearFlag: { clearFlag: 'held' },
    addItem: { addItem: 'lamp' },
    removeItem: { removeItem: 'coin' },
    addObject: { addObject: 'ash' },
    removeObject: { removeObject: 'o' },
    journal: { journal: 'procession' },
    goto: { goto: 'far' },
  }

  it('names every word in DELTA_ORDER', () => {
    expect(Object.keys(oneOfEach).sort()).toEqual([...DELTA_ORDER].sort())
  })

  for (const [word, response] of Object.entries(oneOfEach)) {
    it(`${word} is not a no-op`, () => {
      // Something to clear and something to remove, so the words that take
      // away have something to take.
      const before: GameState = { ...start(), flags: ['held'], items: ['coin'] }
      const turn = resolve(probe(response), before, POKE)
      expect({ state: turn.state, effects: turn.effects }).not.toEqual({ state: before, effects: [] })
    })
  }
})

describe('refusal — the world remembers being asked', () => {
  it('ledgers refKey(ref) and changes nothing else', () => {
    const before = start()
    const turn = resolve(probe({ refuse: 'It holds fast.' }), before, POKE)
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
    const scene = probe({ refuse: 'It holds fast.' })
    let state = start()
    for (let i = 0; i < 3; i++) state = resolve(scene, state, POKE).state
    expect(state.refused).toEqual(['o.poke'])
  })

  it('keeps one entry per action, not per object', () => {
    const scene = parseScene({
      id: 'probe',
      line: 'A line.',
      objects: [
        {
          id: 'o',
          name: 'o',
          actions: { poke: [{ refuse: 'No.' }], pull: [{ refuse: 'Also no.' }] },
        },
      ],
    })
    const once = resolve(scene, start(), POKE)
    const twice = resolve(scene, once.state, { object: 'o', action: 'pull' })
    expect(twice.state.refused).toEqual(['o.poke', 'o.pull'])
  })

  it('says the branch line as well as the refusal, when the author wrote both', () => {
    // VOCAB.md's own example carries a say beside a refuse: refuse purity is
    // about deltas, and say is not one. Dropping it would lose authored prose.
    const turn = resolve(
      probe({ say: 'The marks swim. You cannot hold them.', refuse: 'You do not know how to read this.' }),
      start(),
      POKE,
    )
    expect(kinds(turn)).toEqual(['say', 'refused'])
  })

  it('stops at the refusal even when the response carries deltas the lint would reject', () => {
    // VOCAB.md: "the resolve engine must not rely on the lint: it applies
    // refuse and stops". parseScene will not build this, so the test does.
    const turn = resolve(
      unchecked({ refuse: 'It holds fast.', setFlag: ['a'], journal: ['mark'], goto: 'far' }),
      start(),
      POKE,
    )
    expect(turn.state.flags).toEqual([])
    expect(turn.state.journal).toEqual([])
    expect(turn.state.scene).toBe('probe')
    expect(turn.state.refused).toEqual(['o.poke'])
    expect(kinds(turn)).toEqual(['refused'])
  })
})

describe('object sets — nothing moves them but a delta (LAWS.md §affordance)', () => {
  const withAsh = (...responses: Record<string, unknown>[]): Scene =>
    parseScene({
      id: 'probe',
      line: 'A line.',
      objects: [
        { id: 'o', name: 'o', actions: { poke: responses } },
        { id: 'ash', name: 'ash', actions: { look: [{ say: 'Grey.' }] }, hidden: true },
      ],
    })

  it('leaves a hidden object out of the set until something adds it', () => {
    const scene = withAsh({ addObject: 'ash' })
    expect(ids(scene, start())).toEqual(['o'])
    const turn = resolve(scene, start(), POKE)
    expect(ids(scene, turn.state)).toEqual(['o', 'ash'])
  })

  it('takes an object away on removeObject', () => {
    const scene = probe({ removeObject: 'o' })
    const turn = resolve(scene, start(), POKE)
    expect(ids(scene, turn.state)).toEqual([])
  })

  it('records the set in flags under the reserved prefixes, not in an eighth key', () => {
    // The wire format, pinned: scripts/play.mjs folds the same two prefixes,
    // and content-lint has to know what an author may never write by hand.
    const added = resolve(withAsh({ addObject: 'ash' }), start(), POKE)
    expect(added.state.flags).toEqual(['obj+:ash'])
    const removed = resolve(probe({ removeObject: 'o' }), start(), POKE)
    expect(removed.state.flags).toEqual(['obj-:o'])
    expect(Object.keys(added.state).sort()).toEqual(Object.keys(start()).sort())
  })

  it('never moves the set for a flag alone', () => {
    const scene = withAsh({ setFlag: 'obj_ash' })
    const turn = resolve(scene, start(), POKE)
    expect(ids(scene, turn.state)).toEqual(ids(scene, start()))
  })

  it('keeps a removal final — a later add does not undo it (VOCAB.md §object sets)', () => {
    const scene = parseScene({
      id: 'probe',
      line: 'A line.',
      objects: [{ id: 'o', name: 'o', actions: { poke: [{ removeObject: 'o', addObject: 'o' }] } }],
    })
    const turn = resolve(scene, start(), POKE)
    expect(turn.state.flags).toEqual(['obj+:o', 'obj-:o'])
    expect(ids(scene, turn.state)).toEqual([])
  })

  it('will not resolve a tap on an object that is not in the set', () => {
    const scene = withAsh({ addObject: 'ash' })
    const look = { object: 'ash', action: 'look' }
    expect(resolve(scene, start(), look)).toEqual({ state: start(), effects: [] })
    const added = resolve(scene, start(), POKE)
    expect(says(resolve(scene, added.state, look))).toEqual(['Grey.'])
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
    expect(resolve(unchecked({ gate: { flag: ['never'] }, say: 'x' }), before, POKE)).toEqual({
      state: before,
      effects: [],
    })
  })
})

describe('purity — the state handed in is never touched', () => {
  const everything = probe({
    setFlag: ['a', 'held'],
    clearFlag: 'held',
    addItem: ['lamp', 'coin'],
    removeItem: 'coin',
    addObject: 'ash',
    removeObject: 'pool',
    journal: 'procession',
    goto: 'far',
    say: 'x',
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
    expect(() => resolve(probe({ refuse: 'It holds fast.' }), before, POKE)).not.toThrow()
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
    const turn = resolve(probe({ goto: 'far', journal: ['one', 'two'], say: 'x' }), start(), POKE)
    expect(turn.effects).toEqual([
      { kind: 'say', text: 'x' },
      { kind: 'journal', entry: 'one' },
      { kind: 'journal', entry: 'two' },
      { kind: 'enter', scene: 'far' },
    ])
  })

  it('says nothing for a branch with no say and no delta that speaks', () => {
    const turn = resolve(probe({ setFlag: 'a' }), start(), POKE)
    expect(turn.effects).toEqual([])
    expect(turn.state.flags).toEqual(['a'])
  })
})
