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
    throw new Error(`play.mjs failed:\n${err.stdout ?? ''}\n${err.stderr ?? ''}\n${err.message}`)
  }
}

// The harness accepts `<object> <action>` per line, and `quit`.
const ARC = ['book read', 'stone study', 'book read', 'quit'].join('\n') + '\n'

describe('H008 · terminal play harness', () => {
  it('opens on the shore and lists the objects it affords', () => {
    const out = play('quit\n')
    expect(out).toMatch(/shore/i)
    for (const id of ['stone', 'book', 'pool', 'self', 'path']) {
      expect(out, `${id} not offered`).toMatch(new RegExp(id, 'i'))
    }
  })

  it('numbers what you can touch', () => {
    const out = play('quit\n')
    expect(out, 'expected a numbered menu').toMatch(/^\s*1[).]\s/m)
    expect(out).toMatch(/^\s*2[).]\s/m)
  })

  it('plays the arc: refusal, then teaching, then the procession', () => {
    const out = play(ARC)

    const refusalAt = out.search(/marks swim/i)
    const teachingAt = out.search(/warm where nothing else is/i)
    const processionAt = out.search(/procession/i)

    expect(refusalAt, 'the book must refuse first').toBeGreaterThanOrEqual(0)
    expect(teachingAt, 'the stone must teach').toBeGreaterThanOrEqual(0)
    expect(processionAt, 'the journal must gain the procession').toBeGreaterThanOrEqual(0)

    expect(refusalAt).toBeLessThan(teachingAt)
    expect(teachingAt).toBeLessThan(processionAt)
  })

  it('exits cleanly on quit', () => {
    expect(() => play('quit\n')).not.toThrow()
  })

  it('survives nonsense input without crashing', () => {
    expect(() => play('flibbertigibbet\n999\nbook juggle\nquit\n')).not.toThrow()
  })

  it('is deterministic — the same script twice gives the same transcript', () => {
    expect(play(ARC)).toBe(play(ARC))
  })
})
