import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Imported lazily: H004a (the builder) must be able to run its own blocks
// before H004b (the loader) exists.
const importLoadBundle = async () =>
  (await import('../../src/core/bundle')).loadBundle

// H004 · YAML in, bundle out, and a loader that refuses to trust it.

const root = resolve(__dirname, '../..')
const bundlePath = resolve(root, 'content/bundle.json')

const build = (args: string[] = []): { ok: boolean; output: string } => {
  try {
    const output = execFileSync('npm', ['run', 'build:content', ...(args.length ? ['--', ...args] : [])], {
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

  it('produces a v1 bundle containing the crossing', () => {
    const b = JSON.parse(readFileSync(bundlePath, 'utf8'))
    expect(b.v).toBe(1)
    expect(b.start).toBe('crossing')
    expect(Object.keys(b.scenes)).toContain('crossing')
    expect(b.scenes.crossing.objects.map((o: { id: string }) => o.id).sort()).toEqual(
      ['portal', 'hands', 'stone', 'door', 'steps'].sort(),
    )
  })

  it('carries the free tap of every object through to the bundle', () => {
    // The tap is what a shell draws before anything has been done (GAME.md
    // #input). A bundle that dropped it would compile and be unplayable.
    const b = JSON.parse(readFileSync(bundlePath, 'utf8'))
    for (const o of b.scenes.crossing.objects as { id: string; tap?: string }[]) {
      expect(typeof o.tap, `${o.id} lost its tap`).toBe('string')
      expect(o.tap!.length, `${o.id} taps to nothing`).toBeGreaterThan(0)
    }
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
    expect(r.output).toMatch(/objects\.stone\.study\[0\]\.setFlagg/)
  })

  it('leaves the bundle alone when a build fails', () => {
    // --only reports one file and writes nothing; a failed build must not have
    // left a half-world behind either.
    const before = readFileSync(bundlePath, 'utf8')
    build(['--only', 'tests/fixtures/bad-vocab.yaml'])
    expect(readFileSync(bundlePath, 'utf8')).toBe(before)
  })
})

describe('H004b · the bundle loader', () => {
  it('loads the compiled crossing', async () => {
    const loadBundle = await importLoadBundle()
    const b = loadBundle(JSON.parse(readFileSync(bundlePath, 'utf8')))
    expect(b.v).toBe(1)
    expect(b.scenes['crossing']).toBeDefined()
    expect(b.start).toBe('crossing')
  })

  it('round-trips deep-equal through JSON', async () => {
    const loadBundle = await importLoadBundle()
    const b = loadBundle(JSON.parse(readFileSync(bundlePath, 'utf8')))
    expect(loadBundle(JSON.parse(JSON.stringify(b)))).toEqual(b)
  })

  it('rejects a bundle that is not one', async () => {
    const loadBundle = await importLoadBundle()
    for (const junk of [null, undefined, 42, 'x', [], {}, { v: 2 }, { v: 1 }]) {
      expect(() => loadBundle(junk), `accepted ${JSON.stringify(junk)}`).toThrow()
    }
  })

  it('rejects a bundle whose start scene is missing', async () => {
    const loadBundle = await importLoadBundle()
    expect(() => loadBundle({ v: 1, start: 'nowhere', scenes: {} })).toThrow(/start|nowhere/i)
  })

  it('rejects a scene whose words are not the vocabulary, naming the scene', async () => {
    // The bundle is an artefact, and an artefact can be hand-edited. It comes
    // through parseScene every time, so the loader and the compiler can never
    // disagree about a word.
    const loadBundle = await importLoadBundle()
    expect(() =>
      loadBundle({
        v: 1,
        start: 'crossing',
        scenes: {
          crossing: {
            scene: 'crossing',
            enter: 'A line.',
            objects: { door: { tap: 'A low door.', actions: { open: [{ setFlagg: 'a', say: 'hi' }] } } },
          },
        },
      }),
    ).toThrow(/scenes\.crossing.*objects\.door\.open\[0\]\.setFlagg/)
  })
})
