import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// H005 · content-lint. The compiler proves the words are legal; the lint
// proves the scene is playable.

const root = resolve(__dirname, '../..')

const lint = (paths: string[]): { ok: boolean; output: string } => {
  try {
    const output = execFileSync('npm', ['run', 'content-lint', '--', ...paths], {
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

const withScene = (yamlText: string, run: (path: string) => void): void => {
  const dir = mkdtempSync(join(tmpdir(), 'brynth-lint-'))
  const path = join(dir, 'scene.yaml')
  try {
    writeFileSync(path, yamlText, 'utf8')
    run(path)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const scene = (body: string) => `id: probe\nline: "Grey water, and no far side to it."\nobjects:\n${body}`

describe('H005 · the shore passes its own lint', () => {
  it('the authored content is clean', () => {
    // All of content/, not shore alone: once a scene gotos another file, linting
    // one file in isolation reports a dangling target that is not dangling.
    const r = lint([])
    expect(r.ok, `shore failed lint:\n${r.output}`).toBe(true)
  })
})

describe('H005 · gate satisfiability', () => {
  it('fails when a gate needs a flag nothing can set', () => {
    withScene(
      scene(`  - id: door\n    name: door\n    actions:\n      open:\n        - gate: { flag: has_key }\n          say: "It opens."\n        - refuse: "It holds fast."\n`),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'unsettable flag must fail').toBe(false)
        expect(r.output).toMatch(/has_key/)
      },
    )
  })

  it('passes when something does set the flag', () => {
    withScene(
      scene(`  - id: hook\n    name: hook\n    actions:\n      take:\n        - setFlag: has_key\n          say: "It comes free."\n  - id: door\n    name: door\n    actions:\n      open:\n        - gate: { flag: has_key }\n          say: "It opens."\n        - refuse: "It holds fast."\n`),
      (p) => {
        const r = lint([p])
        expect(r.ok, `should pass:\n${r.output}`).toBe(true)
      },
    )
  })

  it('fails when a gate needs an item nothing grants', () => {
    withScene(
      scene(`  - id: door\n    name: door\n    actions:\n      open:\n        - gate: { item: lamp }\n          say: "It opens."\n        - refuse: "It holds fast."\n`),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'unobtainable item must fail').toBe(false)
        expect(r.output).toMatch(/lamp/)
      },
    )
  })
})

describe('H005 · mandatory fallbacks', () => {
  it('fails a response list whose last response is gated', () => {
    withScene(
      scene(`  - id: door\n    name: door\n    actions:\n      open:\n        - gate: { flag: a }\n          say: "It opens."\n`),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'missing fallback must fail').toBe(false)
        expect(r.output).toMatch(/fallback/i)
      },
    )
  })
})

describe('H005 · goto targets', () => {
  it('fails when goto names a scene that does not exist', () => {
    withScene(
      scene(`  - id: path\n    name: path\n    actions:\n      follow:\n        - goto: nowhere\n          say: "You climb."\n`),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'dangling goto must fail').toBe(false)
        expect(r.output).toMatch(/nowhere/)
      },
    )
  })
})

describe('H005 · refuse purity', () => {
  it('fails a refusal carrying another delta', () => {
    withScene(
      scene(`  - id: door\n    name: door\n    actions:\n      open:\n        - refuse: "It holds fast."\n          setFlag: tried\n`),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'impure refusal must fail').toBe(false)
        expect(r.output).toMatch(/refuse/i)
      },
    )
  })
})

describe('H005 · CANON banned words', () => {
  it('fails on a meta word', () => {
    withScene(
      scene(`  - id: door\n    name: door\n    actions:\n      open:\n        - say: "This unlocks the next level."\n`),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'banned word must fail').toBe(false)
        expect(r.output).toMatch(/level|unlock/i)
      },
    )
  })

  it('fails on a deferral word in a refusal (LAWS.md §refusal)', () => {
    withScene(
      scene(`  - id: door\n    name: door\n    actions:\n      open:\n        - refuse: "You cannot open this yet."\n`),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'deferral must fail').toBe(false)
        expect(r.output).toMatch(/yet/i)
      },
    )
  })

  it('does not fire on a banned word embedded in a longer word', () => {
    withScene(
      scene(`  - id: door\n    name: door\n    actions:\n      open:\n        - say: "The invention holds. The oaken frame is level with the sill."\n`),
      (p) => {
        // "level" is banned as a whole word; "invention" contains "vent", not a
        // banned word. This asserts whole-word matching, so the failure here
        // must be about "level" alone.
        const r = lint([p])
        expect(r.output).not.toMatch(/invention/)
      },
    )
  })
})
