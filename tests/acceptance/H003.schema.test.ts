import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import { DELTA_ORDER, GATE_WORDS, parseScene } from '../../src/core/cards'

// H003 · the card schema, and the shore that proves it. The vocabulary is
// closed (VOCAB.md) and this test is what "closed" means.

const shoreRaw = () =>
  readFileSync(resolve(__dirname, '../../content/shore.yaml'), 'utf8')

const shore = () => parseScene(yaml.load(shoreRaw()))

describe('H003a · the vocabulary is exactly VOCAB.md', () => {
  it('gate words, in order', () => {
    expect(GATE_WORDS).toEqual(['flag', 'notFlag', 'item', 'notItem'])
  })

  // Ten words, not the original nine. VOCAB.md line 25 has declared
  // `end: {line, note}` the whole time and the engine simply never implemented
  // it, so H117 is the engine catching up to its own spec rather than the
  // vocabulary growing — "frozen" in this title was always a fact about the
  // past, not a promise about the word set.
  //
  // Amended by the orchestrator on the human's ruling, after H117 bounced on
  // this exact assertion: that agent implemented `end`, found this test red,
  // and backed the whole change out rather than touch the definition of done
  // (AGENTS.md law 7). That was the correct move, and this is the answer to it.
  //
  // `end` sits last on purpose. It is the delta after which nothing else in
  // the response can matter, and deltas apply in this order, not file order.
  it('delta words, in the frozen application order', () => {
    expect(DELTA_ORDER).toEqual([
      'refuse',
      'setFlag',
      'clearFlag',
      'addItem',
      'removeItem',
      'addObject',
      'removeObject',
      'journal',
      'goto',
      'end',
    ])
  })

  it('rejects an unknown delta word, naming the path', () => {
    const bad = {
      id: 'x',
      line: 'A line.',
      objects: [{ id: 'o', name: 'o', actions: { poke: [{ setFlagg: 'a' }] } }],
    }
    expect(() => parseScene(bad)).toThrow(/objects\.o\.poke\[0\]\.setFlagg/)
  })

  it('rejects an unknown gate word, naming the path', () => {
    const bad = {
      id: 'x',
      line: 'A line.',
      objects: [{ id: 'o', name: 'o', actions: { poke: [{ gate: { flagg: 'a' } }] } }],
    }
    expect(() => parseScene(bad)).toThrow(/objects\.o\.poke\[0\]\.gate\.flagg/)
  })
})

describe('H003a · response lists', () => {
  it('requires a gateless fallback last', () => {
    const bad = {
      id: 'x',
      line: 'A line.',
      objects: [
        { id: 'o', name: 'o', actions: { poke: [{ gate: { flag: 'a' }, say: 'hi' }] } },
      ],
    }
    expect(() => parseScene(bad)).toThrow(/fallback/i)
  })

  it('accepts a list whose last response is gateless', () => {
    const ok = {
      id: 'x',
      line: 'A line.',
      objects: [
        {
          id: 'o',
          name: 'o',
          actions: { poke: [{ gate: { flag: 'a' }, say: 'gated' }, { say: 'always' }] },
        },
      ],
    }
    expect(() => parseScene(ok)).not.toThrow()
  })

  it('normalises scalar gate and delta arguments to arrays', () => {
    // The gated response needs a fallback behind it, or this fixture would
    // violate the rule asserted directly above.
    const s = parseScene({
      id: 'x',
      line: 'A line.',
      objects: [
        {
          id: 'o',
          name: 'o',
          actions: {
            poke: [{ gate: { flag: 'a' }, setFlag: 'b', say: 'hi' }, { say: 'always' }],
          },
        },
      ],
    })
    const r = s.objects[0]!.actions['poke']![0]!
    expect(r.gate?.flag).toEqual(['a'])
    expect(r.setFlag).toEqual(['b'])
  })

  it('rejects refuse carrying any other delta (VOCAB.md refuse purity)', () => {
    const bad = {
      id: 'x',
      line: 'A line.',
      objects: [
        {
          id: 'o',
          name: 'o',
          actions: { poke: [{ refuse: 'No.', setFlag: 'a' }] },
        },
      ],
    }
    expect(() => parseScene(bad)).toThrow(/refuse/i)
  })
})

describe('H003b · the shore fixture', () => {
  it('parses', () => {
    expect(() => shore()).not.toThrow()
  })

  it('is the scene named shore', () => {
    expect(shore().id).toBe('shore')
    expect(typeof shore().line).toBe('string')
    expect(shore().line.length).toBeGreaterThan(0)
  })

  it('holds exactly the five reference objects', () => {
    expect(shore().objects.map((o) => o.id).sort()).toEqual(
      ['book', 'path', 'pool', 'self', 'stone'].sort(),
    )
  })

  it('the stone teaches the glyph', () => {
    const stone = shore().objects.find((o) => o.id === 'stone')!
    const study = stone.actions['study']!
    expect(study).toBeDefined()
    expect(study.some((r) => r.setFlag?.includes('knows_glyph'))).toBe(true)
  })

  it('the book refuses without the glyph and opens with it', () => {
    const book = shore().objects.find((o) => o.id === 'book')!
    const read = book.actions['read']!
    expect(read.length).toBeGreaterThanOrEqual(2)

    const gated = read.find((r) => r.gate?.flag?.includes('knows_glyph'))
    expect(gated, 'a response gated on knows_glyph').toBeDefined()
    expect(gated!.journal).toContain('procession')

    const fallback = read[read.length - 1]!
    expect(fallback.gate === undefined || Object.keys(fallback.gate).length === 0).toBe(true)
    expect(typeof fallback.refuse).toBe('string')
  })

  it('the gated read comes before the fallback — first passing gate wins', () => {
    const book = shore().objects.find((o) => o.id === 'book')!
    const read = book.actions['read']!
    const gatedIndex = read.findIndex((r) => r.gate?.flag?.includes('knows_glyph'))
    expect(gatedIndex).toBeLessThan(read.length - 1)
  })

  it('pool, self and path each afford something', () => {
    for (const id of ['pool', 'self', 'path']) {
      const o = shore().objects.find((x) => x.id === id)!
      expect(Object.keys(o.actions).length, `${id} affords nothing`).toBeGreaterThan(0)
    }
  })

  it('speaks no banned word (CANON.md)', () => {
    const banned = [
      'player', 'game', 'gameplay', 'level', 'quest', 'xp', 'inventory',
      'checkpoint', 'respawn', 'tutorial', 'unlock', 'unlocked', 'menu',
      'computer', 'phone', 'email', 'internet', 'okay', 'ok',
      'very', 'really', 'truly', 'literally', 'suddenly', 'somehow',
      'amazing', 'awesome', 'incredible', 'epic', 'mysterious', 'eerie',
      'yet', 'later',
    ]
    const prose: string[] = []
    const s = shore()
    prose.push(s.line)
    for (const o of s.objects) {
      for (const rs of Object.values(o.actions)) {
        for (const r of rs) {
          if (r.say) prose.push(r.say)
          if (r.refuse) prose.push(r.refuse)
          if (r.journal) prose.push(...r.journal)
        }
      }
    }
    for (const line of prose) {
      for (const word of banned) {
        expect(
          new RegExp(`\\b${word}\\b`, 'i').test(line),
          `banned word "${word}" in: ${line}`,
        ).toBe(false)
      }
    }
  })
})
