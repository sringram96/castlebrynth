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

// The v4 scene head: `scene` and `enter`, and objects as a mapping keyed by id.
const scene = (body: string) =>
  `scene: probe\nenter: "The ring of the portal is cold all through."\ntier: T0\nobjects:\n${body}`

/** A door that opens on `gate` and refuses without it — the shape of most cases here. */
const door = (gate: string) =>
  `  door:\n    tap: "A low door, barred from this side."\n    actions:\n      open:\n        - if: ${gate}\n          say: "You lift the bar and the door is only a door."\n        - refuse: true\n          say: "The bar is seated in iron, and your hands do nothing to it."\n`

describe('H005 · the authored content passes its own lint', () => {
  it('the authored content is clean', () => {
    // All of content/, not the crossing alone: once a scene gotos another file,
    // linting one file in isolation reports a dangling target that is not dangling.
    const r = lint([])
    expect(r.ok, `content failed lint:\n${r.output}`).toBe(true)
  })
})

describe('H005 · gate satisfiability', () => {
  it('fails when a gate needs a flag nothing can set', () => {
    withScene(scene(door('{ flags: [has_key] }')), (p) => {
      const r = lint([p])
      expect(r.ok, 'unsettable flag must fail').toBe(false)
      expect(r.output).toMatch(/has_key/)
    })
  })

  it('passes when something does set the flag', () => {
    withScene(
      scene(
        `  hook:\n    tap: "An iron hook, and something hanging off it."\n    actions:\n      take:\n        - set: [has_key]\n          say: "It comes free in your hand."\n` +
          door('{ flags: [has_key] }'),
      ),
      (p) => {
        const r = lint([p])
        expect(r.ok, `should pass:\n${r.output}`).toBe(true)
      },
    )
  })

  it('fails when a gate needs an item nothing grants', () => {
    withScene(scene(door('{ items: [lamp] }')), (p) => {
      const r = lint([p])
      expect(r.ok, 'unobtainable item must fail').toBe(false)
      expect(r.output).toMatch(/lamp/)
    })
  })

  it('passes when something does grant the item', () => {
    withScene(
      scene(
        `  hook:\n    tap: "An iron hook, and something hanging off it."\n    actions:\n      take:\n        - give: [lamp]\n          say: "It comes free in your hand."\n` +
          door('{ items: [lamp] }'),
      ),
      (p) => {
        const r = lint([p])
        expect(r.ok, `should pass:\n${r.output}`).toBe(true)
      },
    )
  })
})

describe('H005 · mandatory fallbacks', () => {
  it('fails a response list whose last response is gated', () => {
    withScene(
      scene(
        `  door:\n    tap: "A low door, barred from this side."\n    actions:\n      open:\n        - if: { flags: [a] }\n          say: "You lift the bar."\n`,
      ),
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
      scene(
        `  steps:\n    tap: "Steps going down, and the dark takes them three treads in."\n    actions:\n      descend:\n        - goto: nowhere\n          say: "You go down into the cold."\n`,
      ),
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
      scene(
        `  door:\n    tap: "A low door, barred from this side."\n    actions:\n      open:\n        - refuse: true\n          say: "The bar is seated in iron."\n          set: [tried]\n`,
      ),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'impure refusal must fail').toBe(false)
        expect(r.output).toMatch(/refuse/i)
      },
    )
  })

  it('passes a refusal that is only a line', () => {
    // The say is the refusal's prose now, and it is not a second delta.
    withScene(
      scene(
        `  door:\n    tap: "A low door, barred from this side."\n    actions:\n      open:\n        - refuse: true\n          say: "The mark on the wood means something. Not to you, and not to your hands."\n`,
      ),
      (p) => {
        const r = lint([p])
        expect(r.ok, `should pass:\n${r.output}`).toBe(true)
      },
    )
  })
})

describe('H005 · CANON banned words', () => {
  it('fails on a meta word', () => {
    withScene(
      scene(
        `  door:\n    tap: "A low door, barred from this side."\n    actions:\n      open:\n        - say: "This unlocks the next level."\n`,
      ),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'banned word must fail').toBe(false)
        expect(r.output).toMatch(/level|unlock/i)
      },
    )
  })

  it('fails on a deferral word in a refusal (LAWS.md §refusal)', () => {
    withScene(
      scene(
        `  door:\n    tap: "A low door, barred from this side."\n    actions:\n      open:\n        - refuse: true\n          say: "You cannot open this yet."\n`,
      ),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'deferral must fail').toBe(false)
        expect(r.output).toMatch(/yet/i)
      },
    )
  })

  it('fails on the narrator telling you what you are having', () => {
    withScene(
      scene(
        `  door:\n    tap: "A low door, barred from this side."\n    actions:\n      open:\n        - say: "You feel the cold come up out of the dark."\n`,
      ),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'a two-word banned phrase must fail').toBe(false)
        expect(r.output).toMatch(/you feel/i)
      },
    )
  })

  it('scans the free tap, which is the line read most often', () => {
    withScene(
      scene(
        `  door:\n    tap: "A creepy door, barred from this side."\n    actions:\n      open:\n        - say: "You lift the bar."\n`,
      ),
      (p) => {
        const r = lint([p])
        expect(r.ok, 'a banned word in a tap must fail').toBe(false)
        expect(r.output).toMatch(/objects\.door\.tap/)
        expect(r.output).toMatch(/creepy/i)
      },
    )
  })

  it('does not fire on a banned word embedded in a longer word', () => {
    withScene(
      scene(
        `  door:\n    tap: "A low door, barred from this side."\n    actions:\n      open:\n        - say: "The invention holds. The oaken frame is level with the sill."\n`,
      ),
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
