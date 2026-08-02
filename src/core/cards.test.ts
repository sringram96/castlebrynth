import { describe, it, expect } from 'vitest'
import { DELTA_ORDER, GATE_WORDS, parseScene } from './cards'

// The acceptance owns the headline: the two word lists, and the four ways a
// scene can be wrong. These cover the rest of the closed vocabulary — every
// place a path has to be named, what normalisation does to each word, and that
// what comes out is JSON and nothing but.

const scene = (actions: Record<string, unknown>): Record<string, unknown> => ({
  id: 'shore',
  line: 'Grey water, and no far side to it.',
  objects: [{ id: 'book', name: 'book', actions }],
})

/** The response under test, followed by the fallback every list must end in. */
const one = (response: Record<string, unknown>) => scene({ read: [response, { say: 'always' }] })

const responses = (raw: Record<string, unknown>) => {
  const read = parseScene(raw).objects[0]?.actions['read']
  if (read === undefined) throw new Error('the fixture lost its action')
  return read
}

const first = (response: Record<string, unknown>) => {
  const r = responses(one(response))[0]
  if (r === undefined) throw new Error('the fixture lost its response')
  return r
}

describe('the word lists are the ones the rest of the engine indexes by', () => {
  it('holds no word twice', () => {
    expect(new Set(GATE_WORDS).size).toBe(GATE_WORDS.length)
    expect(new Set(DELTA_ORDER).size).toBe(DELTA_ORDER.length)
  })

  it('accepts every gate word', () => {
    for (const word of GATE_WORDS) {
      expect(() => first({ gate: { [word]: 'x' } })).not.toThrow()
    }
  })

  it('accepts every delta word', () => {
    for (const word of DELTA_ORDER) {
      expect(() => first({ [word]: 'x' }), word).not.toThrow()
    }
  })
})

describe('normalisation', () => {
  it('makes a list of every gate argument, scalar or not', () => {
    const r = first({ gate: { flag: 'lit', notItem: ['ash', 'lamp'] } })
    expect(r.gate).toEqual({ flag: ['lit'], notItem: ['ash', 'lamp'] })
  })

  it('makes a list of every "(s)" delta argument', () => {
    const r = first({
      setFlag: 'a',
      clearFlag: ['b'],
      addItem: 'lamp',
      removeItem: ['ash'],
      addObject: 'ash',
      removeObject: ['pool'],
      journal: 'the procession passed',
    })
    expect(r.setFlag).toEqual(['a'])
    expect(r.clearFlag).toEqual(['b'])
    expect(r.addItem).toEqual(['lamp'])
    expect(r.removeItem).toEqual(['ash'])
    expect(r.addObject).toEqual(['ash'])
    expect(r.removeObject).toEqual(['pool'])
    expect(r.journal).toEqual(['the procession passed'])
  })

  it('leaves the lines and the scene id as the strings they are', () => {
    expect(first({ refuse: 'The marks swim.' }).refuse).toBe('The marks swim.')
    expect(first({ goto: 'stair', say: 'You climb.' }).goto).toBe('stair')
    expect(first({ say: 'You climb.' }).say).toBe('You climb.')
  })

  it('keeps an empty gate, which is what a fallback is', () => {
    expect(first({ gate: {}, say: 'always' }).gate).toEqual({})
  })

  it('leaves an absent word absent rather than present and undefined', () => {
    expect(Object.keys(first({ say: 'A line.' }))).toEqual(['say'])
  })

  it('survives the JSON round trip a bundle is stored as (RULES.md §2)', () => {
    const s = parseScene(one({ gate: { flag: 'lit' }, setFlag: 'a', say: 'x' }))
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    expect(structuredClone(s)).toEqual(s)
  })

  it('copies the list the author wrote rather than keeping it', () => {
    const names = ['a']
    const s = parseScene(one({ setFlag: names, say: 'x' }))
    names.push('b')
    expect(s.objects[0]?.actions['read']?.[0]?.setFlag).toEqual(['a'])
  })
})

describe('unknown words name the path to themselves (RULES.md §3)', () => {
  it('at the scene', () => {
    expect(() => parseScene({ ...scene({}), start: 'shore' })).toThrow(/^start — unknown/)
  })

  it('at the object', () => {
    expect(() =>
      parseScene({
        id: 'shore',
        line: 'A line.',
        objects: [{ id: 'book', name: 'book', actions: {}, colour: 'grey' }],
      }),
    ).toThrow(/^objects\.book\.colour — unknown/)
  })

  it('at the response, under the action rather than under "actions"', () => {
    expect(() => parseScene(one({ setFlagg: 'a' }))).toThrow(
      /^objects\.book\.read\[0\]\.setFlagg — unknown/,
    )
  })

  it('at the gate', () => {
    expect(() => parseScene(one({ gate: { flagg: 'a' } }))).toThrow(
      /^objects\.book\.read\[0\]\.gate\.flagg — unknown/,
    )
  })

  it('counts responses from the one that is wrong', () => {
    expect(() => parseScene(scene({ read: [{ say: 'x' }, { setFlagg: 'a' }] }))).toThrow(
      /read\[1\]\.setFlagg/,
    )
  })
})

describe('malformed shapes name their path too', () => {
  it('a scene that is not a mapping', () => {
    for (const junk of [null, 42, 'shore', []]) {
      expect(() => parseScene(junk), JSON.stringify(junk)).toThrow(/not a mapping/)
    }
  })

  it('a missing id or line', () => {
    expect(() => parseScene({ line: 'A line.', objects: [] })).toThrow(/^id — /)
    expect(() => parseScene({ id: 'shore', objects: [] })).toThrow(/^line — /)
  })

  it('objects that are not a list', () => {
    expect(() => parseScene({ id: 'shore', line: 'A line.', objects: {} })).toThrow(/^objects — /)
  })

  it('an object with no id, placed by where it sits', () => {
    expect(() =>
      parseScene({ id: 'shore', line: 'A line.', objects: [{ id: 'book', name: 'book', actions: {} }, {}] }),
    ).toThrow(/^objects\[1\]\.id — /)
  })

  it('an object with no name', () => {
    expect(() =>
      parseScene({ id: 'shore', line: 'A line.', objects: [{ id: 'book', actions: {} }] }),
    ).toThrow(/^objects\.book\.name — /)
  })

  it('an action whose responses are not a list', () => {
    expect(() => parseScene(scene({ read: { say: 'x' } }))).toThrow(/^objects\.book\.read — /)
  })

  it('a gate argument that is neither a name nor a list of names', () => {
    expect(() => parseScene(one({ gate: { flag: 7 } }))).toThrow(
      /^objects\.book\.read\[0\]\.gate\.flag — must be a name/,
    )
  })

  it('a delta argument that is neither a name nor a list of names', () => {
    expect(() => parseScene(one({ setFlag: [1, 2] }))).toThrow(
      /^objects\.book\.read\[0\]\.setFlag — must be a name/,
    )
  })

  it('a line that is not a string', () => {
    expect(() => parseScene(one({ say: 7 }))).toThrow(/^objects\.book\.read\[0\]\.say — /)
    expect(() => parseScene(one({ refuse: 7 }))).toThrow(/^objects\.book\.read\[0\]\.refuse — /)
  })
})

describe('hidden objects (LAWS.md §affordance)', () => {
  it('is absent unless the author wrote it', () => {
    const s = parseScene(one({ say: 'x' }))
    expect('hidden' in (s.objects[0] ?? {})).toBe(false)
  })

  it('is carried through when written', () => {
    const s = parseScene({
      id: 'shore',
      line: 'A line.',
      objects: [{ id: 'ash', name: 'ash', actions: {}, hidden: true }],
    })
    expect(s.objects[0]?.hidden).toBe(true)
  })

  it('must be true or false', () => {
    expect(() =>
      parseScene({
        id: 'shore',
        line: 'A line.',
        objects: [{ id: 'ash', name: 'ash', actions: {}, hidden: 'yes' }],
      }),
    ).toThrow(/^objects\.ash\.hidden — /)
  })
})

describe('refuse purity (VOCAB.md)', () => {
  it('rejects refuse beside any other delta, and names which', () => {
    for (const word of DELTA_ORDER) {
      if (word === 'refuse') continue
      expect(() => parseScene(one({ refuse: 'It holds fast.', [word]: 'x' })), word).toThrow(
        new RegExp(`refuse may carry no other delta, and carries ${word}`),
      )
    }
  })

  it('allows the say that speaks the refusal, which is not a delta', () => {
    const r = first({ say: 'The marks swim.', refuse: 'You do not know how to read this.' })
    expect(r.say).toBe('The marks swim.')
    expect(r.refuse).toBe('You do not know how to read this.')
  })

  it('allows the gate that reached the refusal', () => {
    const r = responses(
      scene({ read: [{ gate: { notFlag: 'knows_glyph' }, refuse: 'No.' }, { say: 'x' }] }),
    )[0]
    expect(r?.refuse).toBe('No.')
  })
})

describe('the last response is the fallback (VOCAB.md)', () => {
  it('rejects a list that ends on a gate', () => {
    expect(() => parseScene(scene({ read: [{ say: 'x' }, { gate: { flag: 'a' }, say: 'y' }] }))).toThrow(
      /^objects\.book\.read — a response list must end in a gateless fallback/,
    )
  })

  it('rejects a list with no responses at all', () => {
    expect(() => parseScene(scene({ read: [] }))).toThrow(/fallback/)
  })

  it('accepts a last response whose gate is written but empty', () => {
    expect(() => parseScene(scene({ read: [{ gate: {}, say: 'always' }] }))).not.toThrow()
  })

  it('reports a malformed gate as malformed, not as a missing fallback', () => {
    expect(() => parseScene(scene({ read: [{ gate: { flagg: 'a' } }] }))).toThrow(/unknown/)
  })
})
