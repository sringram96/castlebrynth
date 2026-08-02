import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// P106 · pay P0's debt. Two hand-copied engines get deleted and the scripts
// import the real thing. This is the card that stops the copies drifting.

const root = resolve(__dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const has = (p: string) => existsSync(resolve(root, p))

const CONVERTED = ['build-content', 'content-lint', 'play']

describe('P106 · the .mjs copies are gone', () => {
  for (const name of CONVERTED) {
    it(`scripts/${name}.mjs no longer exists`, () => {
      expect(has(`scripts/${name}.mjs`), `scripts/${name}.mjs should have been converted`).toBe(false)
    })

    it(`scripts/${name}.ts exists instead`, () => {
      expect(has(`scripts/${name}.ts`)).toBe(true)
    })
  }

  it('the factory tooling is untouched — it imports nothing from src/core', () => {
    for (const name of ['board', 'progress', 'task-lint', 'cards']) {
      expect(has(`scripts/${name}.mjs`), `scripts/${name}.mjs should NOT have been converted`).toBe(true)
    }
  })
})

describe('P106 · they import the engine rather than mirroring it', () => {
  it('build-content parses through src/core/cards', () => {
    expect(read('scripts/build-content.ts')).toMatch(/from ['"].*core\/cards['"]/)
  })

  it('content-lint parses through src/core/cards', () => {
    expect(read('scripts/content-lint.ts')).toMatch(/from ['"].*core\/cards['"]/)
  })

  it('play runs the real engine', () => {
    const src = read('scripts/play.ts')
    expect(src).toMatch(/from ['"].*core\/api['"]/)
    expect(src).toMatch(/from ['"].*core\/bundle['"]/)
  })

  it('no copied block survives, commented out or otherwise', () => {
    for (const name of CONVERTED) {
      const src = read(`scripts/${name}.ts`)
      expect(src, `${name}.ts still admits to carrying a copy`).not.toMatch(
        /copied|hand-written copy|second copy|mirror of/i,
      )
    }
  })

  it('play no longer defines its own resolve', () => {
    const src = read('scripts/play.ts')
    expect(src).not.toMatch(/function\s+resolve\b/)
    expect(src).not.toMatch(/function\s+getView\b/)
  })

  it('build-content no longer defines its own vocabulary gate', () => {
    expect(read('scripts/build-content.ts')).not.toMatch(/function\s+parseScene\b/)
  })
})

describe('P106 · the runner is wired up', () => {
  it('package.json points the three scripts at tsx', () => {
    const s = JSON.parse(read('package.json')).scripts
    expect(s['build:content']).toMatch(/tsx .*scripts\/build-content\.ts/)
    expect(s['content-lint']).toMatch(/tsx .*scripts\/content-lint\.ts/)
    expect(s['play']).toMatch(/tsx .*scripts\/play\.ts/)
  })

  it('tsx is a devDependency', () => {
    expect(JSON.parse(read('package.json')).devDependencies.tsx).toBeDefined()
  })
})

describe('P106 · behaviour did not change', () => {
  const run = (script: string, args: string[] = []) => {
    try {
      return {
        ok: true,
        out: execFileSync('npm', ['run', script, ...(args.length ? ['--', ...args] : [])], {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 120_000,
        }),
      }
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; message: string }
      return { ok: false, out: `${err.stdout ?? ''}${err.stderr ?? ''}${err.message}` }
    }
  }

  it('build:content still compiles the bundle', () => {
    const r = run('build:content')
    expect(r.ok, r.out).toBe(true)
  })

  it('content-lint still passes on the shore', () => {
    const r = run('content-lint')
    expect(r.ok, r.out).toBe(true)
  })

  it('build:content still fails path-precisely on bad vocabulary', () => {
    const r = run('build:content', ['--only', 'tests/fixtures/bad-vocab.yaml'])
    expect(r.ok, 'a bad-vocab fixture must still fail the build').toBe(false)
    expect(r.out).toMatch(/objects\.book\.read\[0\]\.setFlagg/)
  })
})

describe('P106 · the divergence that prompted this card', () => {
  // play.mjs emitted only [refused] on a refusing branch; resolve.ts emits
  // [say, refused]. Importing the engine makes that impossible by construction,
  // so the check is that nothing builds effects by hand any more.
  it('play does not assemble refusal effects itself', () => {
    const src = read('scripts/play.ts')
    expect(src).not.toMatch(/kind:\s*['"]refused['"]/)
    expect(src).not.toMatch(/kind:\s*['"]say['"]\s*,\s*text/)
  })
})
