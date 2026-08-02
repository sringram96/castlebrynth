import { describe, expect, it } from 'vitest'
import { DELTA_ORDER, GATE_WORDS, RESERVED_WORDS, parseScene } from './cards'
import type { DeltaWord, GateWord, Response } from './cards'

// The schema, word by word. The vocabulary is closed (VOCAB.md) and this file
// is what "closed" means: the two gate words, the ten deltas in their frozen
// order, the six words held back for later waves, and every shape a scene can
// be wrong in — each naming the path to itself.
//
// The fixtures are the Crossing in miniature, because the reference arc is the
// thing the schema exists to make expressible: the door refuses, the stone
// teaches, the same tap opens (content/crossing.yaml).

const scene = (actions: Record<string, unknown>): Record<string, unknown> => ({
  scene: 'crossing',
  enter: 'The ring of the portal is cold all through.',
  objects: {
    door: {
      tap: 'A low door, barred from this side.',
      actions,
    },
  },
})

/** The response under test, followed by the fallback every list must end in. */
const one = (response: Record<string, unknown>): Record<string, unknown> =>
  scene({ open: [response, { say: 'The bar sits in its brackets.' }] })

const responses = (raw: Record<string, unknown>): readonly Response[] => {
  const open = parseScene(raw).objects[0]?.actions['open']
  if (open === undefined) throw new Error('the fixture lost its action')
  return open
}

const first = (response: Record<string, unknown>): Response => {
  const r = responses(one(response))[0]
  if (r === undefined) throw new Error('the fixture lost its response')
  return r
}

/** A response that says something, plus the one word under test. */
const said = (word: string, arg: unknown): Record<string, unknown> => {
  const raw: Record<string, unknown> = { say: 'You lift the bar.' }
  raw[word] = arg
  return raw
}

const message = (fn: () => unknown): string => {
  try {
    fn()
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
  throw new Error('expected a failure, and nothing was thrown')
}

/**
 * Assert where a failure happened, and hand back why — so a test can pin the
 * path and the reason apart, which is the whole shape of a schema error.
 */
const failsAt = (fn: () => unknown, path: string): string => {
  const m = message(fn)
  expect(m.startsWith(`${path} — `), `expected a failure at "${path}", got: ${m}`).toBe(true)
  return m.slice(path.length + 3)
}

/** One legal argument per gate word — typed, so a new word cannot be forgotten. */
const GATE_SAMPLE: Record<GateWord, unknown> = {
  flags: 'knows_mark',
  items: 'lamp',
}

/** One legal argument per delta word. Same contract: the type is the checklist. */
const DELTA_SAMPLE: Record<DeltaWord, unknown> = {
  say: 'The door is only a door.',
  set: 'door_open',
  give: 'bar',
  take: 'dust',
  journal: 'the_way_down',
  refuse: true,
  goto: 'crossing',
  addObject: { scene: 'crossing', object: 'ash', cause: 'the bar came away in your hand' },
  removeObject: { scene: 'crossing', object: 'bar', cause: 'you lifted it out of its brackets' },
  end: { line: 'The dark takes the third tread, and then you.' },
}

describe('the word lists the rest of the engine indexes by (VOCAB.md)', () => {
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

  it('says first, so a refusal still speaks before it stops', () => {
    expect(DELTA_ORDER[0]).toBe('say')
    expect(DELTA_ORDER.indexOf('say')).toBeLessThan(DELTA_ORDER.indexOf('refuse'))
  })

  it('the words held back for later waves', () => {
    expect(RESERVED_WORDS).toEqual(['contest', 'dropObols', 'prompt', 'roll', 'counter', 'lies'])
  })

  it('holds no word twice, and no word in two lists', () => {
    expect(new Set(GATE_WORDS).size).toBe(GATE_WORDS.length)
    expect(new Set(DELTA_ORDER).size).toBe(DELTA_ORDER.length)
    expect(new Set(RESERVED_WORDS).size).toBe(RESERVED_WORDS.length)

    const all = [...GATE_WORDS, ...DELTA_ORDER, ...RESERVED_WORDS]
    expect(new Set(all).size).toBe(all.length)
  })

  it('does not count the condition among the deltas', () => {
    // `if` is the question, not one of the answers applied in order.
    expect(DELTA_ORDER).not.toContain('if')
    expect(DELTA_ORDER).not.toContain('gate')
  })

  it('accepts every gate word', () => {
    for (const word of GATE_WORDS) {
      expect(
        () => first({ if: { [word]: GATE_SAMPLE[word] }, say: 'You lift the bar.' }),
        word,
      ).not.toThrow()
    }
  })

  it('accepts every delta word', () => {
    for (const word of DELTA_ORDER) {
      expect(() => first(said(word, DELTA_SAMPLE[word])), word).not.toThrow()
    }
  })

  it('carries every delta a response may hold at once, each kept as authored', () => {
    // Every word but `refuse`, which by law travels alone.
    const r = first({
      say: 'You lift the bar.',
      set: ['door_open'],
      give: ['bar'],
      take: ['dust'],
      journal: 'the_way_down',
      goto: 'crossing',
      addObject: { scene: 'crossing', object: 'ash', cause: 'the bar came away' },
      removeObject: { scene: 'crossing', object: 'bar', cause: 'you carry it now' },
      end: { line: 'The dark takes the third tread, and then you.' },
    })
    expect(r.set).toEqual(['door_open'])
    expect(r.give).toEqual(['bar'])
    expect(r.take).toEqual(['dust'])
    expect(r.journal).toBe('the_way_down')
    expect(r.goto).toBe('crossing')
    expect(r.addObject).toEqual({ scene: 'crossing', object: 'ash', cause: 'the bar came away' })
    expect(r.removeObject).toEqual({
      scene: 'crossing',
      object: 'bar',
      cause: 'you carry it now',
    })
    expect(r.end).toEqual({ line: 'The dark takes the third tread, and then you.' })
  })
})

describe('the words v3 spoke are not words (VOCAB.md)', () => {
  it('rejects the old deltas, each naming itself', () => {
    for (const word of ['setFlag', 'clearFlag', 'addItem', 'removeItem', 'gate', 'line', 'id']) {
      expect(
        failsAt(() => parseScene(one(said(word, 'a'))), `objects.door.open[0].${word}`),
        word,
      ).toBe('unknown vocabulary word')
    }
  })

  it('rejects the old gate words, including both negations', () => {
    for (const word of ['flag', 'item', 'notFlag', 'notItem', 'notFlags', 'notItems']) {
      expect(
        failsAt(
          () => parseScene(one({ if: { [word]: 'a' }, say: 'You lift the bar.' })),
          `objects.door.open[0].if.${word}`,
        ),
        word,
      ).toMatch(/^unknown vocabulary word \(gates: flags, items\)$/)
    }
  })

  it('rejects a tap written as a delta — the free tap belongs to the object', () => {
    expect(
      failsAt(() => parseScene(one(said('tap', 'a low door'))), 'objects.door.open[0].tap'),
    ).toBe('unknown vocabulary word')
  })
})

describe('reserved words fail with the reason, not as anonymous unknowns (VOCAB.md)', () => {
  it('names each one, and says it is held back', () => {
    for (const word of RESERVED_WORDS) {
      const why = failsAt(
        () => parseScene(one(said(word, 'anything'))),
        `objects.door.open[0].${word}`,
      )
      expect(why, word).toContain('reserved for a later wave')
      expect(why, word).toContain('VOCAB.md')
      // The point of knowing them: this is not the message an unknown word gets.
      expect(why, word).not.toContain('unknown vocabulary word')
    }
  })

  it('is not quietly a gate word either', () => {
    for (const word of RESERVED_WORDS) {
      expect(
        () => parseScene(one({ if: { [word]: 'a' }, say: 'You lift the bar.' })),
        word,
      ).toThrow(/unknown vocabulary word/)
    }
  })
})

describe('normalisation', () => {
  it('makes a list of every gate argument, scalar or not', () => {
    const r = first({
      if: { flags: 'knows_mark', items: ['lamp', 'ash'] },
      say: 'You lift the bar.',
    })
    expect(r.if).toEqual({ flags: ['knows_mark'], items: ['lamp', 'ash'] })
  })

  it('makes a list of every plural delta argument', () => {
    const r = first({ say: 'You lift the bar.', set: 'a', give: 'lamp', take: ['ash'] })
    expect(r.set).toEqual(['a'])
    expect(r.give).toEqual(['lamp'])
    expect(r.take).toEqual(['ash'])
  })

  it('keeps journal a single entry id and refuses a list of them', () => {
    // v3 wrote prose, and wrote several. An entry is one id now (LAWS.md
    // #consequences) — the prose lives in the entry the id names.
    expect(first({ say: 'You lift the bar.', journal: 'the_mark' }).journal).toBe('the_mark')
    expect(
      failsAt(() => parseScene(one(said('journal', ['the_mark']))), 'objects.door.open[0].journal'),
    ).toBe('expected a string')
  })

  it('leaves the lines and the scene id as the strings they are', () => {
    expect(first({ say: 'You climb.', goto: 'crossing' }).goto).toBe('crossing')
    expect(first({ say: 'You climb.' }).say).toBe('You climb.')
  })

  it('keeps an empty gate, which is what a fallback is', () => {
    expect(first({ if: {}, say: 'always' }).if).toEqual({})
  })

  it('leaves an absent word absent rather than present and undefined', () => {
    expect(Object.keys(first({ say: 'A line.' }))).toEqual(['say'])
  })

  it('survives the JSON round trip a bundle is stored as (.llm/rules/determinism.mdc)', () => {
    const s = parseScene(
      one({
        if: { flags: 'knows_mark' },
        say: 'You lift the bar.',
        set: 'door_open',
        journal: 'the_way_down',
        addObject: { scene: 'crossing', object: 'ash', cause: 'the bar came away' },
        end: { line: 'The dark takes the third tread, and then you.', note: 'left the Crossing' },
      }),
    )
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    expect(structuredClone(s)).toEqual(s)
  })

  it('copies the list the author wrote rather than keeping it', () => {
    const flags = ['a']
    const s = parseScene(one({ say: 'You lift the bar.', set: flags }))
    flags.push('b')
    expect(s.objects[0]?.actions['open']?.[0]?.set).toEqual(['a'])
  })
})

describe('every response says something (VOCAB.md)', () => {
  it('rejects a response with no say', () => {
    expect(failsAt(() => parseScene(one({ set: 'door_open' })), 'objects.door.open[0]')).toBe(
      'every response must say something',
    )
  })

  it('rejects an empty response, which is the same omission', () => {
    expect(() => parseScene(scene({ open: [{}] }))).toThrow(/every response must say something/)
  })

  it('rejects a refusal with no say — the say is the refusal line', () => {
    // v3 put the line inside `refuse`. v4 puts it where every other line is.
    expect(failsAt(() => parseScene(one({ refuse: true })), 'objects.door.open[0]')).toBe(
      'every response must say something',
    )
  })

  it('rejects a say that is not a string', () => {
    expect(failsAt(() => parseScene(one(said('say', 7))), 'objects.door.open[0].say')).toBe(
      'expected a string',
    )
  })
})

describe('every object has a free tap (GAME.md #input)', () => {
  const object = (body: Record<string, unknown>): Record<string, unknown> => ({
    scene: 'crossing',
    enter: 'The ring of the portal is cold all through.',
    objects: { stone: body },
  })

  it('rejects an object with actions and no tap', () => {
    expect(failsAt(() => parseScene(object({ actions: {} })), 'objects.stone.tap')).toBe(
      'expected a string',
    )
  })

  it('rejects a tap that is not a string', () => {
    expect(failsAt(() => parseScene(object({ tap: 7, actions: {} })), 'objects.stone.tap')).toBe(
      'expected a string',
    )
  })

  it('requires it even of an object that affords nothing', () => {
    const s = parseScene(
      object({ tap: 'A block set into the wall at chest height.', actions: {} }),
    )
    expect(s.objects[0]?.tap).toBe('A block set into the wall at chest height.')
    expect(Object.keys(s.objects[0]?.actions ?? {})).toEqual([])
  })

  it('keeps the tap and the say apart', () => {
    const s = parseScene(one({ say: 'You lift the bar.' }))
    expect(s.objects[0]?.tap).toBe('A low door, barred from this side.')
    expect(s.objects[0]?.actions['open']?.[0]?.say).toBe('You lift the bar.')
  })
})

describe('objects are a mapping keyed by id (VOCAB.md)', () => {
  it('takes the normalised list back, so loading twice is loading once', () => {
    // The authored shape is a mapping; the shape parseScene produces is a list
    // whose members carry their own `id`. Both parse, or a compiled bundle
    // could never be re-loaded.
    const s = parseScene({
      scene: 'crossing',
      enter: 'A line.',
      objects: [{ id: 'door', tap: 'A low door.', actions: { open: [{ say: 'It holds.' }] } }],
    })
    expect(s.objects.map((o) => o.id)).toEqual(['door'])
    expect(parseScene(s)).toEqual(s)
  })

  it('still rejects a v3 object, whichever shape it arrives in', () => {
    // `name` is gone and `tap` is required — the free tap is bedrock
    // (GAME.md #input), so an object without one is not an object.
    expect(
      failsAt(
        () =>
          parseScene({
            scene: 'crossing',
            enter: 'A line.',
            objects: [{ id: 'door', name: 'a low door', actions: {} }],
          }),
        'objects.door.name',
      ),
    ).toMatch(/unknown key/)
  })

  it('takes the id from the key', () => {
    expect(parseScene(one({ say: 'You lift the bar.' })).objects[0]?.id).toBe('door')
  })

  it('leaves no way for a body to contradict its key', () => {
    // The self-contradictory fixture — `door:` holding `id: steps` — cannot be
    // written at all now, because `id` is not a key an object has.
    expect(
      failsAt(
        () =>
          parseScene({
            scene: 'crossing',
            enter: 'A line.',
            objects: { door: { id: 'steps', tap: 'A low door.', actions: {} } },
          }),
        'objects.door.id',
      ),
    ).toBe('unknown key — expected tap, actions, hidden')
  })

  it('has no name, because the key is the name', () => {
    expect(
      failsAt(
        () =>
          parseScene({
            scene: 'crossing',
            enter: 'A line.',
            objects: { door: { name: 'door', tap: 'A low door.', actions: {} } },
          }),
        'objects.door.name',
      ),
    ).toBe('unknown key — expected tap, actions, hidden')
  })

  it('keeps the order the scene was authored in', () => {
    const s = parseScene({
      scene: 'crossing',
      enter: 'A line.',
      objects: {
        portal: { tap: "It's a portal, and it's dead.", actions: {} },
        hands: { tap: 'Your hands. The knuckles are opened.', actions: {} },
        stone: { tap: 'A block set into the wall.', actions: {} },
      },
    })
    expect(s.objects.map((o) => o.id)).toEqual(['portal', 'hands', 'stone'])
  })
})

describe('addObject and removeObject carry the scene they change (LAWS.md #affordance)', () => {
  const delta = {
    scene: 'undercroft',
    object: 'ash',
    cause: 'the bar came away in your hand',
  }

  for (const word of ['addObject', 'removeObject'] as const) {
    it(`${word} keeps scene, object and cause exactly as authored`, () => {
      expect(first(said(word, { ...delta }))[word]).toEqual(delta)
    })

    it(`${word} names the scene, so the same object id in another scene is untouched`, () => {
      // The v3 form was a bare id, and a template dealt into two rooms emptied
      // a pool nobody had entered. The scene is in the schema so that the flag
      // the engine folds it into can never be global.
      const r = first(said(word, { ...delta }))
      expect(r[word]?.scene).toBe('undercroft')
      expect(r[word]?.scene).not.toBe('crossing')
    })

    it(`${word} rejects the v3 bare id`, () => {
      expect(
        failsAt(() => parseScene(one(said(word, 'ash'))), `objects.door.open[0].${word}`),
      ).toBe('expected {scene, object, cause}')
    })

    it(`${word} rejects a list of ids`, () => {
      expect(
        failsAt(() => parseScene(one(said(word, ['ash']))), `objects.door.open[0].${word}`),
      ).toBe('expected {scene, object, cause}')
    })

    for (const key of ['scene', 'object', 'cause'] as const) {
      it(`${word} demands ${key}`, () => {
        const partial: Record<string, unknown> = { ...delta }
        delete partial[key]
        expect(
          failsAt(
            () => parseScene(one(said(word, partial))),
            `objects.door.open[0].${word}.${key}`,
          ),
        ).toBe('expected a string')
      })
    }

    it(`${word} takes no fourth key`, () => {
      expect(
        failsAt(
          () => parseScene(one(said(word, { ...delta, why: 'because' }))),
          `objects.door.open[0].${word}.why`,
        ),
      ).toBe('unknown key — expected scene, object, cause')
    })
  }
})

describe('end closes the slice (VOCAB.md)', () => {
  it('keeps the line, and the note when one is written', () => {
    const r = first({
      say: 'The cold comes up the steps to meet you.',
      end: { line: 'The dark takes the third tread, and then you.', note: 'left the Crossing' },
    })
    expect(r.end).toEqual({
      line: 'The dark takes the third tread, and then you.',
      note: 'left the Crossing',
    })
  })

  it('leaves the note absent rather than present and undefined', () => {
    const r = first({ say: 'You go down.', end: { line: 'The dark takes you.' } })
    expect(Object.keys(r.end ?? {})).toEqual(['line'])
  })

  it('rejects a bare line', () => {
    expect(
      failsAt(() => parseScene(one(said('end', 'The dark takes you.'))), 'objects.door.open[0].end'),
    ).toBe('expected {line, note?}')
  })

  it('demands the line', () => {
    expect(
      failsAt(
        () => parseScene(one(said('end', { note: 'left the Crossing' }))),
        'objects.door.open[0].end.line',
      ),
    ).toBe('expected a string')
  })

  it('demands a note that is a string when there is one', () => {
    expect(
      failsAt(
        () => parseScene(one(said('end', { line: 'The dark takes you.', note: 7 }))),
        'objects.door.open[0].end.note',
      ),
    ).toBe('expected a string')
  })
})

describe('refuse purity (VOCAB.md)', () => {
  it('rejects refuse beside any other delta, and names which', () => {
    for (const word of DELTA_ORDER) {
      if (word === 'refuse' || word === 'say') continue
      const why = failsAt(
        () =>
          parseScene(
            one({
              say: 'The mark on the wood means something.',
              refuse: true,
              [word]: DELTA_SAMPLE[word],
            }),
          ),
        'objects.door.open[0].refuse',
      )
      expect(why, word).toContain('a refusal changes nothing')
      expect(why, word).toContain(word)
    }
  })

  it('allows the say that speaks the refusal, and carries nothing else', () => {
    const r = first({
      refuse: true,
      say: 'The mark on the wood means something. Not to you, and not to your hands.',
    })
    expect(r.refuse).toBe(true)
    expect(r.say).toBe('The mark on the wood means something. Not to you, and not to your hands.')
    expect(Object.keys(r).sort()).toEqual(['refuse', 'say'])
  })

  it('allows the gate that reached the refusal', () => {
    const r = responses(
      scene({
        open: [
          { if: { items: ['bar'] }, refuse: true, say: 'Your hands are already full.' },
          { say: 'The bar sits in its brackets.' },
        ],
      }),
    )[0]
    expect(r?.refuse).toBe(true)
    expect(r?.if).toEqual({ items: ['bar'] })
  })

  it('rejects the v3 refusal, whose line was the argument', () => {
    expect(
      failsAt(
        () => parseScene(one(said('refuse', 'You do not know how to read this.'))),
        'objects.door.open[0].refuse',
      ),
    ).toBe('expected true')
  })

  it('rejects a refusal that is written false rather than left out', () => {
    expect(
      failsAt(() => parseScene(one(said('refuse', false))), 'objects.door.open[0].refuse'),
    ).toBe('expected true')
  })
})

describe('"not yet done" is ordering, not negation (VOCAB.md)', () => {
  it('the door arc: the gated branch above, the gateless refusal below', () => {
    const open = responses(
      scene({
        open: [
          {
            if: { flags: ['knows_mark'] },
            say: 'You lift the bar. The shape on the wood is the shape on the stone.',
            set: ['door_open'],
            journal: 'the_way_down',
          },
          {
            refuse: true,
            say: 'The mark on the wood means something. Not to you, and not to your hands.',
          },
        ],
      }),
    )
    expect(open).toHaveLength(2)
    expect(open[0]?.if).toEqual({ flags: ['knows_mark'] })
    // The refusal states no condition at all. It is reached by being last.
    expect(open[1]?.if).toBeUndefined()
    expect(open[1]?.refuse).toBe(true)
  })

  it('rejects that same arc written the other way up', () => {
    // With the refusal first there is nothing gateless at the end, so a run
    // that knows the mark would fall off the list. The schema is what stops
    // an author reaching for a negation to fix it.
    expect(
      failsAt(
        () =>
          parseScene(
            scene({
              open: [
                { refuse: true, say: 'The mark means something.' },
                { if: { flags: ['knows_mark'] }, say: 'You lift the bar.' },
              ],
            }),
          ),
        'objects.door.open[1]',
      ),
    ).toBe('the last response must be a gateless fallback')
  })

  it('the stone arc: knowing it already is the gate, learning it is the fallback', () => {
    // The teaching branch is the gateless one, so a first study always reaches
    // it. Nothing anywhere says "does not know the mark".
    const s = parseScene(
      scene({
        study: [
          { if: { flags: ['knows_mark'] }, say: 'The same shape. A ring, and a line through it.' },
          {
            say: 'A ring with a line falling through it, cut deep enough to read with a thumb.',
            set: ['knows_mark'],
            journal: 'the_mark',
          },
        ],
      }),
    )
    const study = s.objects[0]?.actions['study']
    expect(study).toHaveLength(2)
    expect(study?.[0]?.if).toEqual({ flags: ['knows_mark'] })
    expect(study?.[1]?.if).toBeUndefined()
    expect(study?.[1]?.set).toEqual(['knows_mark'])
    expect(study?.[1]?.journal).toBe('the_mark')
  })
})

describe('the last response is the fallback (VOCAB.md)', () => {
  it('rejects a list that ends on a gate, naming the response that ends it', () => {
    expect(
      failsAt(
        () =>
          parseScene(
            scene({
              open: [
                { say: 'You lift the bar.' },
                { if: { flags: ['knows_mark'] }, say: 'The shape is the shape on the stone.' },
              ],
            }),
          ),
        'objects.door.open[1]',
      ),
    ).toBe('the last response must be a gateless fallback')
  })

  it('rejects a list with no responses at all', () => {
    expect(failsAt(() => parseScene(scene({ open: [] })), 'objects.door.open')).toBe(
      'expected at least one response',
    )
  })

  it('accepts a last response whose gate is written but empty', () => {
    expect(() => parseScene(scene({ open: [{ if: {}, say: 'always' }] }))).not.toThrow()
  })

  it('reports a malformed gate as malformed, not as a missing fallback', () => {
    expect(() => parseScene(scene({ open: [{ if: { flag: 'a' }, say: 'x' }] }))).toThrow(
      /unknown vocabulary word/,
    )
  })
})

describe('unknown words name the path to themselves (VOCAB.md)', () => {
  it('at the scene', () => {
    expect(failsAt(() => parseScene({ ...scene({}), start: 'crossing' }), 'start')).toBe(
      'unknown key — expected scene, enter, tier, objects',
    )
  })

  it('at the object', () => {
    expect(
      failsAt(
        () =>
          parseScene({
            scene: 'crossing',
            enter: 'A line.',
            objects: { door: { tap: 'A low door.', actions: {}, colour: 'grey' } },
          }),
        'objects.door.colour',
      ),
    ).toBe('unknown key — expected tap, actions, hidden')
  })

  it('at the response, under the action rather than under "actions"', () => {
    expect(() => parseScene(one(said('sett', 'a')))).toThrow(
      /^objects\.door\.open\[0\]\.sett — unknown/,
    )
  })

  it('at the gate', () => {
    expect(() => parseScene(one({ if: { flagss: 'a' }, say: 'x' }))).toThrow(
      /^objects\.door\.open\[0\]\.if\.flagss — unknown/,
    )
  })

  it('counts responses from the one that is wrong', () => {
    expect(() =>
      parseScene(scene({ open: [{ say: 'x' }, { say: 'y', sett: 'a' }] })),
    ).toThrow(/open\[1\]\.sett/)
  })
})

describe('malformed shapes name their path too', () => {
  it('a scene that is not a mapping', () => {
    for (const junk of [null, 42, 'crossing', []]) {
      expect(() => parseScene(junk), JSON.stringify(junk)).toThrow(/^scene — expected a mapping/)
    }
  })

  it('a missing scene id or enter line', () => {
    expect(failsAt(() => parseScene({ enter: 'A line.', objects: {} }), 'scene')).toBe(
      'expected a string',
    )
    expect(failsAt(() => parseScene({ scene: 'crossing', objects: {} }), 'enter')).toBe(
      'expected a string',
    )
  })

  it('objects that are not a mapping', () => {
    expect(
      failsAt(() => parseScene({ scene: 'crossing', enter: 'A line.', objects: 7 }), 'objects'),
    ).toBe('expected a mapping of object ids')
  })

  it('an object that is not a mapping', () => {
    expect(
      failsAt(
        () => parseScene({ scene: 'crossing', enter: 'A line.', objects: { door: 'a low door' } }),
        'objects.door',
      ),
    ).toBe('expected a mapping')
  })

  it('actions that are not a mapping of action ids', () => {
    expect(
      failsAt(
        () =>
          parseScene({
            scene: 'crossing',
            enter: 'A line.',
            objects: { door: { tap: 'A low door.', actions: ['open'] } },
          }),
        'objects.door.actions',
      ),
    ).toBe('expected a mapping of action ids')
  })

  it('an action whose responses are not a list', () => {
    expect(failsAt(() => parseScene(scene({ open: { say: 'x' } })), 'objects.door.open')).toBe(
      'expected a list of responses',
    )
  })

  it('a response that is not a mapping', () => {
    expect(failsAt(() => parseScene(scene({ open: ['x'] })), 'objects.door.open[0]')).toBe(
      'expected a mapping',
    )
  })

  it('a gate that is not a mapping of gate words', () => {
    expect(
      failsAt(() => parseScene(one({ if: 7, say: 'x' })), 'objects.door.open[0].if'),
    ).toBe('expected a mapping of gate words')
  })

  it('a gate argument that is neither a name nor a list of names', () => {
    expect(
      failsAt(() => parseScene(one({ if: { flags: 7 }, say: 'x' })), 'objects.door.open[0].if.flags'),
    ).toBe('expected a string or a list of strings')
    expect(
      failsAt(
        () => parseScene(one({ if: { flags: ['a', 2] }, say: 'x' })),
        'objects.door.open[0].if.flags[1]',
      ),
    ).toBe('expected a string')
  })

  it('a delta argument that is neither a name nor a list of names', () => {
    expect(failsAt(() => parseScene(one(said('set', 7))), 'objects.door.open[0].set')).toBe(
      'expected a string or a list of strings',
    )
    expect(failsAt(() => parseScene(one(said('set', [1, 2]))), 'objects.door.open[0].set[0]')).toBe(
      'expected a string',
    )
  })

  it('a goto that is not a scene id', () => {
    expect(failsAt(() => parseScene(one(said('goto', 7))), 'objects.door.open[0].goto')).toBe(
      'expected a string',
    )
  })
})

describe('hidden objects (LAWS.md #affordance)', () => {
  const withHidden = (hidden: unknown): Record<string, unknown> => ({
    scene: 'crossing',
    enter: 'A line.',
    objects: { ash: { tap: 'A cone of ash, still holding its shape.', actions: {}, hidden } },
  })

  it('is absent unless the author wrote it', () => {
    const s = parseScene(one({ say: 'You lift the bar.' }))
    expect('hidden' in (s.objects[0] ?? {})).toBe(false)
  })

  it('is carried through when written', () => {
    expect(parseScene(withHidden(true)).objects[0]?.hidden).toBe(true)
  })

  it('takes a literal true and nothing else — anything else stays in the scene', () => {
    // v3 rejected a non-boolean here. v4's parseObject reads `hidden === true`
    // and leaves the object visible for everything else, so the failure mode
    // this pins is the quiet one: a mistyped hidden never hides.
    for (const junk of ['yes', 1, 'true']) {
      const card = parseScene(withHidden(junk)).objects[0]
      expect(card?.hidden, JSON.stringify(junk)).toBeUndefined()
    }
    expect(parseScene(withHidden(false)).objects[0]?.hidden).toBeUndefined()
  })
})

describe('tier (CANON.md, LAWS.md #spoiler)', () => {
  it('is absent unless the author wrote it', () => {
    expect('tier' in parseScene(one({ say: 'You lift the bar.' }))).toBe(false)
  })

  it('is carried through when written', () => {
    expect(parseScene({ ...one({ say: 'You lift the bar.' }), tier: 'T0' }).tier).toBe('T0')
  })

  it('must be a name', () => {
    expect(
      failsAt(() => parseScene({ ...one({ say: 'You lift the bar.' }), tier: 0 }), 'tier'),
    ).toBe('expected a string')
  })
})
