import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadBundle } from '../../src/core/bundle'
import { createGame } from '../../src/core/api'
import type { Bundle } from '../../src/core/cards'
import type { GameState } from '../../src/core/types'

// P105 · the path off the shore leads somewhere, twice. The arc that started
// with a glyph on a stone has to pay off.

const root = resolve(__dirname, '../..')
const bundle = (): Bundle =>
  loadBundle(JSON.parse(readFileSync(resolve(root, 'content/bundle.json'), 'utf8')))

const scene = (b: Bundle, id: string) => b.scenes[id]

describe('P105 · three scenes', () => {
  it('the bundle holds shore, stair and hall', () => {
    const b = bundle()
    for (const id of ['shore', 'stair', 'hall']) {
      expect(scene(b, id), `scene "${id}"`).toBeDefined()
    }
  })

  it('each new scene stands on its own line and affords at least two things', () => {
    const b = bundle()
    for (const id of ['stair', 'hall']) {
      const s = scene(b, id)!
      expect(typeof s.line).toBe('string')
      expect(s.line.length, `${id} has no line`).toBeGreaterThan(0)
      expect(s.objects.length, `${id} affords too little`).toBeGreaterThanOrEqual(2)
    }
  })

  it('the shore still holds its five objects — H003b must stay green', () => {
    expect(scene(bundle(), 'shore')!.objects.map((o) => o.id).sort()).toEqual(
      ['book', 'path', 'pool', 'self', 'stone'].sort(),
    )
  })
})

describe('P105 · the way on', () => {
  it('the shore path leads to the stair, behind the opened book', () => {
    const path = scene(bundle(), 'shore')!.objects.find((o) => o.id === 'path')!
    const follow = path.actions['follow']!
    const gated = follow.find((r) => r.goto === 'stair')
    expect(gated, 'path.follow must goto stair').toBeDefined()
    expect(gated!.gate, 'the way on must be earned').toBeDefined()
    expect(Object.keys(gated!.gate ?? {}).length).toBeGreaterThan(0)
  })

  it('the shore keeps its refusal for anyone who has not earned it', () => {
    const path = scene(bundle(), 'shore')!.objects.find((o) => o.id === 'path')!
    const follow = path.actions['follow']!
    const last = follow[follow.length - 1]!
    expect(last.gate === undefined || Object.keys(last.gate).length === 0).toBe(true)
    expect(typeof last.refuse).toBe('string')
  })

  it('the stair leads on to the hall', () => {
    const stair = scene(bundle(), 'stair')!
    const gotos = stair.objects.flatMap((o) =>
      Object.values(o.actions).flatMap((rs) => rs.map((r) => r.goto)),
    )
    expect(gotos).toContain('hall')
  })

  it('the hall pays off the glyph', () => {
    const hall = scene(bundle(), 'hall')!
    const gatedOnGlyph = hall.objects.some((o) =>
      Object.values(o.actions).some((rs) =>
        rs.some((r) => r.gate?.flag?.includes('knows_glyph')),
      ),
    )
    expect(gatedOnGlyph, 'nothing in the hall knows the glyph you learned').toBe(true)
  })
})

describe('P105 · the hall is actually reachable', () => {
  it('some sequence of taps from a fresh run gets there', () => {
    const b = bundle()
    const g = createGame(b)

    // Breadth-first over every tap the view offers. This asserts reachability
    // without pinning the author to one route.
    const seen = new Set<string>()
    const key = (s: GameState) => JSON.stringify([s.scene, s.flags, s.items])
    let frontier: GameState[] = [g.newRun(42)]
    seen.add(key(frontier[0]!))

    for (let depth = 0; depth < 12 && frontier.length; depth++) {
      const next: GameState[] = []
      for (const state of frontier) {
        if (state.scene === 'hall') return
        for (const obj of g.getView(state).objects) {
          for (const action of obj.actions) {
            const after = g.act(state, { object: obj.id, action }).state
            const k = key(after)
            if (!seen.has(k)) {
              seen.add(k)
              next.push(after)
            }
          }
        }
      }
      frontier = next
    }
    expect.fail('no sequence of taps within 12 steps reaches the hall')
  })

  it('and the journal has the procession by the time you get there', () => {
    const g = createGame(bundle())
    let s = g.newRun(42)
    for (const tap of [
      { object: 'stone', action: 'study' },
      { object: 'book', action: 'read' },
    ]) {
      s = g.act(s, tap).state
    }
    expect(s.journal).toContain('procession')
  })
})

describe('P105 · the law', () => {
  it('content-lint passes on all three scenes', () => {
    expect(() =>
      execFileSync('npm', ['run', 'content-lint'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    ).not.toThrow()
  })

  it('the compiled bundle matches the sources — someone rebuilt it', () => {
    const before = readFileSync(resolve(root, 'content/bundle.json'), 'utf8')
    execFileSync('npm', ['run', 'build:content'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    expect(
      readFileSync(resolve(root, 'content/bundle.json'), 'utf8'),
      'content/bundle.json is stale — run npm run build:content and commit it',
    ).toBe(before)
  })

  it('speaks no banned word (CANON.md)', () => {
    const banned = [
      'player', 'game', 'level', 'quest', 'xp', 'inventory', 'tutorial',
      'unlock', 'unlocked', 'menu', 'okay', 'ok', 'very', 'really',
      'suddenly', 'somehow', 'amazing', 'awesome', 'epic', 'mysterious',
      'eerie', 'yet', 'later',
    ]
    const b = bundle()
    const prose: string[] = []
    for (const s of Object.values(b.scenes)) {
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
