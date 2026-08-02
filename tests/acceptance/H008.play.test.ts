import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

// H008 · the atom, in your hands. Ugly on purpose — this is a harness, not
// a shell. P1 builds the shell.

const root = resolve(__dirname, '../..')

const play = (script: string): string => {
  try {
    return execFileSync('npm', ['run', 'play', '--', '--seed', '42'], {
      cwd: root,
      input: script,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 20_000,
    })
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message: string }
    throw new Error(`play failed:\n${err.stdout ?? ''}\n${err.stderr ?? ''}\n${err.message}`)
  }
}

// The harness accepts `<object> <action>` per line, and `quit`.
const script = (...lines: string[]): string => [...lines, 'quit'].join('\n') + '\n'

/** The Crossing, whole: the door refuses, the stone teaches, the same tap opens. */
const ARC = script('door open', 'stone study', 'door open', 'steps descend')

describe('H008 · terminal play harness', () => {
  it('opens on the Crossing and lists the objects it affords', () => {
    const out = play(script())
    expect(out).toMatch(/crossing/i)
    for (const id of ['portal', 'hands', 'stone', 'door', 'steps']) {
      expect(out, `${id} not offered`).toMatch(new RegExp(`\\b${id}\\b`, 'i'))
    }
  }, 30_000)

  it('numbers what you can touch', () => {
    const out = play(script())
    expect(out, 'expected a numbered menu').toMatch(/^\s*1[).]\s/m)
    expect(out).toMatch(/^\s*2[).]\s/m)
  }, 30_000)

  it('plays the arc: the door refuses, the stone teaches, the same tap opens', () => {
    const out = play(ARC)

    const refusalAt = out.search(/means something\. Not to you/i)
    const teachingAt = out.search(/cut deep enough to read with a thumb/i)
    const openingAt = out.search(/the door is only a door/i)
    const endAt = out.search(/takes the third tread/i)

    expect(refusalAt, 'the door must refuse first').toBeGreaterThanOrEqual(0)
    expect(teachingAt, 'the stone must teach').toBeGreaterThanOrEqual(0)
    expect(openingAt, 'the same tap must then open the door').toBeGreaterThanOrEqual(0)
    expect(endAt, 'the steps must end the slice').toBeGreaterThanOrEqual(0)

    expect(refusalAt).toBeLessThan(teachingAt)
    expect(teachingAt).toBeLessThan(openingAt)
    expect(openingAt).toBeLessThan(endAt)
  }, 30_000)

  it('ledgers the refusal, by the key the world remembers it under', () => {
    const out = play(ARC)
    expect(out, 'the refusal must reach the ledger').toMatch(/refused\s*—\s*door\.open/i)
  }, 30_000)

  it('names the journal entries it gained, in the order it gained them', () => {
    // A journal entry is an id now, not a line of prose. The harness prints the
    // id, which is the whole of what the world hands it.
    const out = play(ARC)
    const markAt = out.search(/journal \+ the_mark/i)
    const wayAt = out.search(/journal \+ the_way_down/i)
    expect(markAt, 'studying the stone must write the_mark').toBeGreaterThanOrEqual(0)
    expect(wayAt, 'opening the door must write the_way_down').toBeGreaterThanOrEqual(0)
    expect(markAt).toBeLessThan(wayAt)
  }, 30_000)

  it('ends the slice on the steps, with the note it was left under', () => {
    const out = play(ARC)
    expect(out).toMatch(/The dark takes the third tread, and then you\./)
    expect(out).toMatch(/left the Crossing/)
  }, 30_000)

  it('holds the steps until the door is open', () => {
    // There is no negation in the vocabulary: the closed way is the gateless
    // fallback, reached because the opened branch is ordered above it. Taking
    // the steps first must find the fallback, and must not end the slice.
    const out = play(script('steps descend'))
    expect(out).toMatch(/The door is barred between you and them\./)
    expect(out).toMatch(/refused\s*—\s*steps\.descend/i)
    expect(out, 'a refused descent must not end the slice').not.toMatch(/takes the third tread/i)
  }, 30_000)

  it('exits cleanly on quit', () => {
    expect(() => play(script())).not.toThrow()
  }, 30_000)

  it('survives nonsense input without crashing', () => {
    expect(() => play(script('flibbertigibbet', '999', 'door juggle'))).not.toThrow()
  }, 30_000)

  it('is deterministic — the same script twice gives the same transcript', () => {
    expect(play(ARC)).toBe(play(ARC))
  }, 60_000)

  it('speaks each line once — a doubled line is a bug a search() would miss', () => {
    // This suite located prose with search()/toMatch, which match the FIRST
    // occurrence, so a line printed twice read as a pass. It is how a real
    // double-emit of the refusal survived a green harness suite.
    const out = play('door open\nquit\n')
    const refusal = 'The mark on the wood means something.'
    const hits = out.split(refusal).length - 1
    expect(hits, `the refusal line appears ${hits} times`).toBe(1)
  })
})
