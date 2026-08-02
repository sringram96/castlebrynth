// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'

// P101 · the shell stands up. No game yet — a build that works and a place to
// mount. Everything else is P102 onward.

const root = resolve(__dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const pkg = () => JSON.parse(read('package.json'))

// The Crossing, from the scene as it was authored rather than from
// content/bundle.json: the compiler writes the parsed Scene, whose `objects` is
// a list, and `loadBundle` validates through `parseScene`, which reads the
// authored shape — a mapping keyed by object id. H004 owns that disagreement.
const crossing = (): unknown => ({
  v: 1,
  start: 'crossing',
  scenes: { crossing: yaml.load(read('content/crossing.yaml')) },
})

describe('P101 · the pieces exist', () => {
  it('index.html has exactly one mount point', () => {
    const html = read('index.html')
    expect(html).toMatch(/<div\s+id=["']app["']/)
    expect(html.match(/id=["']app["']/g)?.length).toBe(1)
  })

  it('vite.config.ts exists', () => {
    expect(existsSync(resolve(root, 'vite.config.ts'))).toBe(true)
  })

  it('capacitor needs built assets, so build writes to dist', () => {
    expect(read('vite.config.ts')).toMatch(/outDir\s*:\s*['"]dist['"]/)
  })

  it('package.json gained the shell scripts', () => {
    const s = pkg().scripts
    expect(s.dev).toMatch(/vite/)
    expect(s.build).toMatch(/vite build/)
    expect(s.preview).toMatch(/vite preview/)
  })

  it('package.json gained vite and a DOM environment for tests', () => {
    const dev = pkg().devDependencies
    expect(dev.vite, 'vite').toBeDefined()
    expect(dev['happy-dom'], 'happy-dom').toBeDefined()
  })

  it('did not acquire a UI framework (P1.md · no framework)', () => {
    const all = { ...pkg().dependencies, ...pkg().devDependencies }
    for (const banned of ['react', 'react-dom', 'vue', 'svelte', 'preact', 'solid-js', 'lit']) {
      expect(all[banned], `${banned} is not wanted here`).toBeUndefined()
    }
  })
})

describe('P101 · mount', () => {
  it('exports a mount that takes a root element and a game', async () => {
    const { mount } = await import('../../src/shell/mount')
    expect(typeof mount).toBe('function')
    expect(mount.length).toBeGreaterThanOrEqual(2)
  })

  it('renders the scene line into the element it was given', async () => {
    const { mount } = await import('../../src/shell/mount')
    const { createGame } = await import('../../src/core/api')
    const { loadBundle } = await import('../../src/core/bundle')

    const bundle = loadBundle(crossing())
    const el = document.createElement('div')
    mount(el, createGame(bundle))

    expect(el.textContent ?? '').toContain('The ring of the portal is cold all through')
  })

  it('touches GameAPI only — no reach into resolve (P1.md)', () => {
    const src = read('src/shell/mount.ts')
    expect(src).not.toMatch(/core\/resolve/)
    expect(src).not.toMatch(/\.scenes\s*[[.]/)
  })
})

describe('P101 · the build actually runs', () => {
  it('npm run build produces dist', () => {
    execFileSync('npm', ['run', 'build'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
    })
    expect(existsSync(resolve(root, 'dist/index.html'))).toBe(true)
  }, 180_000)
})
