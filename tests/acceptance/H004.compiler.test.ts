import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadBundle } from '../../src/core/bundle'

// H004 · YAML in, bundle out, and a loader that refuses to trust it.

const root = resolve(__dirname, '../..')
const bundlePath = resolve(root, 'content/bundle.json')

const build = (args: string[] = []): { ok: boolean; output: string } => {
  try {
    const output = execFileSync('node', ['scripts/build-content.mjs', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, output }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message: string }
    return { ok: false, output: `${err.stdout ?? ''}${err.stderr ?? ''}${err.message}` }
  }
}

describe('H004a · the content builder', () => {
  beforeAll(() => {
    const r = build()
    expect(r.ok, `build failed:\n${r.output}`).toBe(true)
  })

  it('writes content/bundle.json', () => {
    expect(existsSync(bundlePath)).toBe(true)
  })

  it('produces a v1 bundle containing the shore', () => {
    const b = JSON.parse(readFileSync(bundlePath, 'utf8'))
    expect(b.v).toBe(1)
    expect(b.start).toBe('shore')
    expect(Object.keys(b.scenes)).toContain('shore')
    expect(b.scenes.shore.objects.map((o: { id: string }) => o.id).sort()).toEqual(
      ['book', 'path', 'pool', 'self', 'stone'].sort(),
    )
  })

  it('is deterministic — building twice yields byte-identical output', () => {
    const first = readFileSync(bundlePath, 'utf8')
    build()
    expect(readFileSync(bundlePath, 'utf8')).toBe(first)
  })

  it('fails on an unknown vocabulary word and names the offending path', () => {
    const r = build(['--only', 'tests/fixtures/bad-vocab.yaml'])
    expect(r.ok, 'a bad-vocab fixture must fail the build').toBe(false)
    expect(r.output).toMatch(/bad-vocab\.yaml/)
    expect(r.output).toMatch(/objects\.book\.read\[0\]\.setFlagg/)
  })
})

describe('H004b · the bundle loader', () => {
  it('loads the compiled shore', () => {
    const b = loadBundle(JSON.parse(readFileSync(bundlePath, 'utf8')))
    expect(b.v).toBe(1)
    expect(b.scenes['shore']).toBeDefined()
  })

  it('round-trips deep-equal through JSON', () => {
    const b = loadBundle(JSON.parse(readFileSync(bundlePath, 'utf8')))
    expect(loadBundle(JSON.parse(JSON.stringify(b)))).toEqual(b)
  })

  it('rejects a bundle that is not one', () => {
    for (const junk of [null, undefined, 42, 'x', [], {}, { v: 2 }, { v: 1 }]) {
      expect(() => loadBundle(junk), `accepted ${JSON.stringify(junk)}`).toThrow()
    }
  })

  it('rejects a bundle whose start scene is missing', () => {
    expect(() => loadBundle({ v: 1, start: 'nowhere', scenes: {} })).toThrow(/start|nowhere/i)
  })
})
