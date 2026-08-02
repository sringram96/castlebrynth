import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import { DELTA_ORDER, GATE_WORDS, RESERVED_WORDS, parseScene } from '../../src/core/cards'

// H003 · the card schema, and the crossing that proves it. The vocabulary is
// closed (VOCAB.md) and this test is what "closed" means.

const crossingRaw = () =>
  readFileSync(resolve(__dirname, '../../content/crossing.yaml'), 'utf8')

const crossing = () => parseScene(yaml.load(crossingRaw()))

/** A minimal legal scene, with `objects` in the shape the vocabulary wants: a
 *  mapping keyed by object id, every object carrying its free tap. */
const scene = (objects: Record<string, unknown>): Record<string, unknown> => ({
  scene: 'x',
  enter: 'A line.',
  objects,
})

/** One object, one action, whatever responses the case is about. */
const one = (...responses: unknown[]): Record<string, unknown> =>
  scene({ o: { tap: 'A thing.', actions: { poke: responses } } })

describe('H003a · the vocabulary is exactly VOCAB.md', () => {
  it('gate words, in order', () => {
    expect(GATE_WORDS).toEqual(['flags', 'items'])
  })

  it('delta words, in the frozen application order', () => {
    expect(DELTA_ORDER).toEqual([
      'say',
      'set',
      'give',
      'take',
      'journal',
      'refuse',
      'goto',
      'addObject',
      'removeObject',
      'end',
    ])
  })

  it('rejects an unknown delta word, naming the path', () => {
    expect(() => parseScene(one({ setFlagg: 'a', say: 'hi' }))).toThrow(
      /objects\.o\.poke\[0\]\.setFlagg/,
    )
  })

  it('rejects an unknown gate word, naming the path', () => {
    expect(() => parseScene(one({ if: { flagg: 'a' }, say: 'hi' }, { say: 'always' }))).toThrow(
      /objects\.o\.poke\[0\]\.if\.flagg/,
    )
  })

  it('rejects a word deleted in the move to VOCAB.md v4', () => {
    // Each of these parsed once. A file that still speaks them must fail loudly
    // rather than have the dead word quietly ignored.
    for (const dead of ['gate', 'setFlag', 'clearFlag', 'addItem', 'removeItem']) {
      expect(() => parseScene(one({ [dead]: 'a', say: 'hi' })), dead).toThrow(
        new RegExp(`objects\\.o\\.poke\\[0\\]\\.${dead}`),
      )
    }
  })

  it('rejects a reserved word with its reason, not as an anonymous unknown', () => {
    expect(RESERVED_WORDS).toEqual(['contest', 'dropObols', 'prompt', 'roll', 'counter', 'lies'])
    for (const word of RESERVED_WORDS) {
      expect(() => parseScene(one({ [word]: 'x', say: 'hi' })), word).toThrow(/reserved/i)
    }
  })

  it('rejects the scene keys the old shape used', () => {
    expect(() => parseScene({ id: 'x', enter: 'A line.', objects: {} })).toThrow(/id/)
    expect(() => parseScene({ scene: 'x', line: 'A line.', objects: {} })).toThrow(/line/)
  })

  it('takes an object id from the key it is authored under', () => {
    // Objects are a mapping now and carry no `name` of their own: the key is
    // the id, so a scene cannot hold two answers to what a thing is called.
    const s = parseScene(
      scene({
        door: { tap: 'A low door.', actions: { open: [{ say: 'hi' }] } },
        steps: { tap: 'Steps going down.', actions: { descend: [{ say: 'hi' }] } },
      }),
    )
    expect(s.objects.map((o) => o.id)).toEqual(['door', 'steps'])
  })
})

describe('H003a · every object has a free tap', () => {
  it('rejects an object with no tap, naming the path', () => {
    expect(() =>
      parseScene(scene({ o: { actions: { poke: [{ say: 'hi' }] } } })),
    ).toThrow(/objects\.o\.tap/)
  })

  it('rejects a key the object shape does not have', () => {
    expect(() =>
      parseScene(scene({ o: { tap: 'A thing.', name: 'o', actions: { poke: [{ say: 'hi' }] } } })),
    ).toThrow(/objects\.o\.name/)
  })

  it('keeps the tap as the string it is', () => {
    const s = parseScene(one({ say: 'hi' }))
    expect(s.objects[0]!.tap).toBe('A thing.')
  })
})

describe('H003a · response lists', () => {
  it('requires a say on every response', () => {
    expect(() => parseScene(one({ set: ['a'] }))).toThrow(/say/i)
  })

  it('requires a gateless fallback last', () => {
    expect(() => parseScene(one({ if: { flags: ['a'] }, say: 'hi' }))).toThrow(/fallback/i)
  })

  it('accepts a list whose last response is gateless', () => {
    expect(() =>
      parseScene(one({ if: { flags: ['a'] }, say: 'gated' }, { say: 'always' })),
    ).not.toThrow()
  })

  it('normalises scalar gate and delta arguments to arrays', () => {
    // The gated response needs a fallback behind it, or this fixture would
    // violate the rule asserted directly above.
    const s = parseScene(one({ if: { flags: 'a' }, set: 'b', give: 'c', say: 'hi' }, { say: 'always' }))
    const r = s.objects[0]!.actions['poke']![0]!
    expect(r.if?.flags).toEqual(['a'])
    expect(r.set).toEqual(['b'])
    expect(r.give).toEqual(['c'])
  })

  it('takes journal as one entry id, and refuses a list of prose', () => {
    // The journal was a list of lines once. It is an id now, and the prose it
    // names lives with the entry (LAWS.md #consequences).
    const s = parseScene(one({ say: 'hi', journal: 'the_mark' }))
    expect(s.objects[0]!.actions['poke']![0]!.journal).toBe('the_mark')
    expect(() => parseScene(one({ say: 'hi', journal: ['the procession passed'] }))).toThrow(
      /objects\.o\.poke\[0\]\.journal/,
    )
  })

  it('wants an affordance change scene-scoped, with its cause', () => {
    // `addObject: [id]` was global once, and an id dealt into two scenes moved
    // both. The shape is what stops that: the scene is named, and the cause is
    // required by law rather than decoration (LAWS.md #affordance).
    const s = parseScene(
      one({ say: 'hi', addObject: { scene: 'crossing', object: 'ash', cause: 'the fire went out' } }),
    )
    expect(s.objects[0]!.actions['poke']![0]!.addObject).toEqual({
      scene: 'crossing',
      object: 'ash',
      cause: 'the fire went out',
    })
    expect(() => parseScene(one({ say: 'hi', addObject: 'ash' }))).toThrow(
      /objects\.o\.poke\[0\]\.addObject/,
    )
    expect(() =>
      parseScene(one({ say: 'hi', addObject: { scene: 'crossing', object: 'ash' } })),
    ).toThrow(/objects\.o\.poke\[0\]\.addObject\.cause/)
    expect(() =>
      parseScene(
        one({ say: 'hi', removeObject: { scene: 'crossing', object: 'ash', why: 'because' } }),
      ),
    ).toThrow(/objects\.o\.poke\[0\]\.removeObject\.why/)
  })

  it('wants an end with a line, and lets it carry a note', () => {
    const s = parseScene(one({ say: 'hi', end: { line: 'The dark takes you.', note: 'left' } }))
    expect(s.objects[0]!.actions['poke']![0]!.end).toEqual({
      line: 'The dark takes you.',
      note: 'left',
    })
    expect(() => parseScene(one({ say: 'hi', end: {} }))).toThrow(
      /objects\.o\.poke\[0\]\.end\.line/,
    )
  })

  it('takes refuse as true, and the say carries the line', () => {
    const s = parseScene(one({ refuse: true, say: 'The bar does not lift.' }))
    const r = s.objects[0]!.actions['poke']![0]!
    expect(r.refuse).toBe(true)
    expect(r.say).toBe('The bar does not lift.')
    // The line used to be refuse's own argument. A file that still writes it
    // that way must fail rather than have the prose read as a truthy flag.
    expect(() => parseScene(one({ refuse: 'No.', say: 'No.' }))).toThrow(
      /objects\.o\.poke\[0\]\.refuse/,
    )
  })

  it('rejects refuse carrying any other delta (VOCAB.md refuse purity)', () => {
    expect(() => parseScene(one({ refuse: true, say: 'No.', set: ['a'] }))).toThrow(/refuse/i)
    for (const delta of [
      { set: ['a'] },
      { give: ['lamp'] },
      { take: ['lamp'] },
      { journal: 'the_mark' },
      { goto: 'crossing' },
      { addObject: { scene: 'x', object: 'o', cause: 'c' } },
      { removeObject: { scene: 'x', object: 'o', cause: 'c' } },
      { end: { line: 'Done.' } },
    ]) {
      expect(
        () => parseScene(one({ refuse: true, say: 'No.', ...delta })),
        Object.keys(delta)[0],
      ).toThrow(/refuse/i)
    }
  })
})

describe('H003b · the crossing fixture', () => {
  it('parses', () => {
    expect(() => crossing()).not.toThrow()
  })

  it('is the scene named crossing, and declares the tier it speaks from', () => {
    expect(crossing().scene).toBe('crossing')
    expect(typeof crossing().enter).toBe('string')
    expect(crossing().enter.length).toBeGreaterThan(0)
    expect(crossing().tier).toBe('T0')
  })

  it('holds exactly the five reference objects', () => {
    expect(crossing().objects.map((o) => o.id).sort()).toEqual(
      ['portal', 'hands', 'stone', 'door', 'steps'].sort(),
    )
  })

  it('every object says something to a free tap', () => {
    for (const o of crossing().objects) {
      expect(typeof o.tap, `${o.id} has no tap`).toBe('string')
      expect(o.tap.length, `${o.id} taps to nothing`).toBeGreaterThan(0)
    }
  })

  it('the stone teaches the mark', () => {
    const stone = crossing().objects.find((o) => o.id === 'stone')!
    const study = stone.actions['study']!
    expect(study).toBeDefined()
    expect(study.some((r) => r.set?.includes('knows_mark'))).toBe(true)
    expect(study.some((r) => r.journal === 'the_mark')).toBe(true)
  })

  it('the door refuses without the mark and opens with it', () => {
    const door = crossing().objects.find((o) => o.id === 'door')!
    const open = door.actions['open']!
    expect(open.length).toBeGreaterThanOrEqual(2)

    const gated = open.find((r) => r.if?.flags?.includes('knows_mark'))
    expect(gated, 'a response gated on knows_mark').toBeDefined()
    expect(gated!.journal).toBe('the_way_down')
    expect(gated!.set).toContain('door_open')

    const fallback = open[open.length - 1]!
    expect(fallback.if === undefined || Object.keys(fallback.if).length === 0).toBe(true)
    expect(fallback.refuse).toBe(true)
    expect(fallback.say.length).toBeGreaterThan(0)
  })

  it('the gated open comes before the fallback — first passing gate wins', () => {
    const door = crossing().objects.find((o) => o.id === 'door')!
    const open = door.actions['open']!
    const gatedIndex = open.findIndex((r) => r.if?.flags?.includes('knows_mark'))
    expect(gatedIndex).toBeGreaterThanOrEqual(0)
    expect(gatedIndex).toBeLessThan(open.length - 1)
  })

  it('"not done yet" is written as ordering, never as a negation', () => {
    // There is no negation in the vocabulary. A branch meaning "the mark is not
    // known" is the gateless fallback, reached by ordering the gated branch
    // above it — so every gate in the scene is a positive one, and every list
    // ends in the branch that needs nothing.
    let pairs = 0
    for (const o of crossing().objects) {
      for (const [action, list] of Object.entries(o.actions)) {
        const last = list[list.length - 1]!
        expect(
          last.if === undefined || Object.keys(last.if).length === 0,
          `objects.${o.id}.${action} does not end in a fallback`,
        ).toBe(true)
        if (list.slice(0, -1).some((r) => Object.keys(r.if ?? {}).length > 0)) pairs++
      }
    }
    // The door and the steps, at least: gated branch above, fallback below.
    expect(pairs).toBeGreaterThanOrEqual(2)
  })

  it('the steps end the slice once the door is open, and refuse until then', () => {
    const steps = crossing().objects.find((o) => o.id === 'steps')!
    const descend = steps.actions['descend']!

    const gated = descend.find((r) => r.if?.flags?.includes('door_open'))
    expect(gated, 'a response gated on door_open').toBeDefined()
    expect(gated!.end?.line.length).toBeGreaterThan(0)

    const fallback = descend[descend.length - 1]!
    expect(fallback.refuse).toBe(true)
    expect(fallback.end).toBeUndefined()
  })

  it('portal, hands and stone each afford something', () => {
    for (const id of ['portal', 'hands', 'stone']) {
      const o = crossing().objects.find((x) => x.id === id)!
      expect(Object.keys(o.actions).length, `${id} affords nothing`).toBeGreaterThan(0)
    }
  })

  it('speaks no banned word (CANON.md)', () => {
    const banned = [
      'player', 'game', 'gameplay', 'level', 'quest', 'xp', 'inventory',
      'checkpoint', 'respawn', 'tutorial', 'unlock', 'unlocked', 'menu',
      'health', 'mana', 'stats', 'hp',
      'you feel', 'suddenly', 'mysterious', 'evil', 'creepy',
      'satan', 'devil', 'lucifer',
      'computer', 'phone', 'email', 'internet', 'okay', 'ok',
      'very', 'really', 'truly', 'literally', 'somehow',
      'amazing', 'awesome', 'incredible', 'epic', 'eerie',
      'yet', 'not now', 'later', 'come back',
    ]
    // Every authored string in the file. `journal` is an entry id now rather
    // than prose, so it is not scanned — the entry it names is.
    const prose: string[] = []
    const s = crossing()
    prose.push(s.enter)
    for (const o of s.objects) {
      prose.push(o.tap)
      for (const rs of Object.values(o.actions)) {
        for (const r of rs) {
          prose.push(r.say)
          if (r.end) {
            prose.push(r.end.line)
            if (r.end.note !== undefined) prose.push(r.end.note)
          }
        }
      }
    }
    expect(prose.length).toBeGreaterThan(5)
    for (const line of prose) {
      for (const word of banned) {
        expect(
          new RegExp(`\\b${word.split(/\s+/).join('\\s+')}\\b`, 'i').test(line),
          `banned word "${word}" in: ${line}`,
        ).toBe(false)
      }
    }
  })
})
