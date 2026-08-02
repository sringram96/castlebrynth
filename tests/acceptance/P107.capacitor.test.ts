import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// P107 · wrap the built shell for a phone. Installing it is the human's job
// and is P1's exit gate; this card gets the project to the point where they can.

const root = resolve(__dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const has = (p: string) => existsSync(resolve(root, p))

describe('P107 · the config', () => {
  it('capacitor.config.ts exists', () => {
    expect(has('capacitor.config.ts')).toBe(true)
  })

  it('names the app and points at the built assets', () => {
    const cfg = read('capacitor.config.ts')
    expect(cfg).toMatch(/com\.castlebrynth\.app/)
    expect(cfg).toMatch(/Castle Brynth/)
    expect(cfg).toMatch(/webDir\s*:\s*['"]dist['"]/)
  })

  it('capacitor is a dependency', () => {
    const pkg = JSON.parse(read('package.json'))
    const all = { ...pkg.dependencies, ...pkg.devDependencies }
    for (const dep of ['@capacitor/core', '@capacitor/cli', '@capacitor/android']) {
      expect(all[dep], dep).toBeDefined()
    }
  })

  it('there are scripts for syncing and opening', () => {
    const s = JSON.parse(read('package.json')).scripts
    expect(s['cap:sync']).toBeDefined()
    expect(s['cap:sync']).toMatch(/cap sync/)
    expect(s['cap:open']).toMatch(/cap open/)
  })
})

describe('P107 · the android project', () => {
  it('exists', () => {
    expect(has('android'), 'run npx cap add android').toBe(true)
    expect(has('android/app')).toBe(true)
  })

  it('is committed, but its build output is not', () => {
    const ignored = read('.gitignore')
    expect(ignored).toMatch(/android\/app\/build/)
    expect(ignored).toMatch(/android\/\.gradle/)
    expect(ignored).toMatch(/android\/local\.properties/)
  })

  it('the gradle wrapper came with it', () => {
    expect(has('android/gradlew')).toBe(true)
  })

  it('the project itself is committed, not just present on disk', () => {
    const tracked = execFileSync('git', ['ls-files', 'android/app/src/main/AndroidManifest.xml'], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
    expect(tracked, 'the android project must be committed').not.toBe('')
  })
})

describe('P107 · it syncs', () => {
  it('npm run build produces the web assets capacitor copies', () => {
    execFileSync('npm', ['run', 'build'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
    })
    expect(has('dist/index.html')).toBe(true)
  }, 180_000)

  it('npx cap sync android completes clean', () => {
    execFileSync('npx', ['cap', 'sync', 'android'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
    })
    // The web assets must have actually landed in the android project.
    expect(has('android/app/src/main/assets/public/index.html')).toBe(true)
  }, 300_000)
})
