import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import { loadBundle } from '../../src/core/bundle'
import { createGame } from '../../src/core/api'
import type { Bundle, ObjectCard, Response } from '../../src/core/cards'
import type { Effect } from '../../src/core/api-types'
import type { GameState } from '../../src/core/types'

// P105 · the world, and the way out of it.
//
// This card was written for three scenes — shore, stair, hall — and a path that
// led from one to the next. The v4 pivot deletes all three: there is one scene,
// content/crossing.yaml, and the labyrinth beyond it is a later wave. What
// survives is everything this card actually proved, re-aimed at the Crossing:
// the scene is whole, the way on is earned, the refusal stands for anyone who
// has not earned it, the arc pays off the thing it taught, the end is reachable
// by some route rather than one the test dictates, and the content is legal.
//
// The two claims that had nowhere to land are replaced rather than dropped:
//
//   · "the stair leads on to the hall" — a `goto` chain. The Crossing's way on
//     is `end`, the word v4 added for finishing a slice, so the claim becomes
//     that the way on ends the slice and says so.
//   · "the hall pays off the glyph" — a second scene gated on what the first
//     taught. The Crossing pays off the mark inside itself: the same tap that
//     was refused opens once `knows_mark` is set.
//
// The Crossing is read from the scene as it was authored rather than from
// content/bundle.json, for the reason H004 owns at length: the compiler writes
// the parsed Scene, whose `objects` is a list, and `loadBundle` validates
// through `parseScene`, which reads the authored shape — a mapping keyed by
// object id. The compiled artefact is still checked here, as text, by the
// freshness test at the bottom.

const root = resolve(__dirname, '../..')
const SCENE = resolve(root, 'content/crossing.yaml')

const world = (): Bundle =>
  loadBundle({
    v: 1,
    start: 'crossing',
    scenes: { crossing: yaml.load(readFileSync(SCENE, 'utf8')) },
  })

const crossing = () => world().scenes['crossing']!

const object = (id: string): ObjectCard => {
  const found = crossing().objects.find((o) => o.id === id)
  expect(found, `the Crossing affords no "${id}"`).toBeDefined()
  return found!
}

const gated = (r: Response): boolean => r.if !== undefined && Object.keys(r.if).length > 0

describe('P105 · the one scene', () => {
  it('the compiled bundle holds the crossing, and a run opens on it', () => {
    const b = JSON.parse(readFileSync(resolve(root, 'content/bundle.json'), 'utf8'))
    expect(b.start, 'a run must open on the Crossing').toBe('crossing')
    expect(b.scenes.crossing, 'scene "crossing"').toBeDefined()
  })

  it('stands on its own line and affords more than a couple of things', () => {
    const s = crossing()
    expect(typeof s.enter).toBe('string')
    expect(s.enter.length, 'the crossing has no line').toBeGreaterThan(0)
    expect(s.objects.length, 'the crossing affords too little').toBeGreaterThanOrEqual(2)
  })

  it('holds its five objects — H003b must stay green', () => {
    expect(crossing().objects.map((o) => o.id).sort()).toEqual(
      ['door', 'hands', 'portal', 'steps', 'stone'].sort(),
    )
  })

  it('every object carries a free tap, and every response says something', () => {
    for (const o of crossing().objects) {
      expect(o.tap.length, `${o.id} has no free tap`).toBeGreaterThan(0)
      for (const [action, list] of Object.entries(o.actions)) {
        for (const r of list) {
          expect(r.say.length, `${o.id}.${action} has a response that says nothing`).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('P105 · the way on', () => {
  it('the steps end the slice, behind a gate that had to be earned', () => {
    const descend = object('steps').actions['descend']!
    const ending = descend.find((r) => r.end !== undefined)
    expect(ending, 'steps.descend must end the slice').toBeDefined()
    expect(ending!.end!.line.length, 'the end must say how it ended').toBeGreaterThan(0)
    expect(gated(ending!), 'the way on must be earned').toBe(true)
  })

  it('the steps keep their refusal for anyone who has not earned it', () => {
    const descend = object('steps').actions['descend']!
    const last = descend[descend.length - 1]!
    expect(last.if === undefined || Object.keys(last.if).length === 0).toBe(true)
    expect(last.refuse, 'the unearned descent must refuse').toBe(true)
    // `refuse: true` and the line the world speaks are one response now: the
    // prose rides on `say`, and parseScene rejects a refusal carrying anything
    // else (VOCAB.md §refuse purity).
    expect(last.say.length, 'a refusal still has to say what you lack').toBeGreaterThan(0)
  })

  it('the door pays off the mark the stone taught', () => {
    const open = object('door').actions['open']!
    const paid = open.find((r) => r.if?.flags?.includes('knows_mark'))
    expect(paid, 'nothing in the Crossing knows the mark you learned').toBeDefined()
    const teaches = object('stone').actions['study']!.some((r) => r.set?.includes('knows_mark'))
    expect(teaches, 'nothing sets the mark the door wants').toBe(true)
  })

  it('the gated branch is written above the fallback — ordering is the negation', () => {
    // There is no `notFlag` in v4. "Has not learned the mark" is the gateless
    // fallback, and it is only reachable because the gated branch sits above it
    // (resolve.ts · first passing gate wins). Written the other way round, the
    // fallback would swallow every run and the door would never open.
    for (const [id, action, flag] of [
      ['door', 'open', 'knows_mark'],
      ['steps', 'descend', 'door_open'],
    ] as const) {
      const list = object(id).actions[action]!
      const at = list.findIndex((r) => r.if?.flags?.includes(flag))
      const fallback = list.findIndex((r) => !gated(r))
      expect(at, `${id}.${action} has no branch gated on ${flag}`).toBeGreaterThanOrEqual(0)
      expect(at, `${id}.${action}'s fallback would swallow the gated branch`).toBeLessThan(fallback)
    }
  })

  it('and the ordering is what the engine actually does', () => {
    const g = createGame(world())
    const fresh = g.newRun(42)
    const refused = g.act(fresh, { object: 'door', action: 'open' })
    expect(refused.effects.some((e) => e.kind === 'refused'), 'the fallback must fire first').toBe(true)

    const taught = g.act(fresh, { object: 'stone', action: 'study' }).state
    const opened = g.act(taught, { object: 'door', action: 'open' })
    expect(opened.effects.some((e) => e.kind === 'refused'), 'the gated branch must fire now').toBe(false)
    expect(opened.state.flags).toContain('door_open')
  })
})

describe('P105 · the end is actually reachable', () => {
  it('some sequence of taps from a fresh run gets there', () => {
    const g = createGame(world())

    // Breadth-first over every tap the view offers. This asserts reachability
    // without pinning the author to one route.
    const seen = new Set<string>()
    const key = (s: GameState) => JSON.stringify([s.scene, s.flags, s.items])
    let frontier: GameState[] = [g.newRun(42)]
    seen.add(key(frontier[0]!))

    for (let depth = 0; depth < 12 && frontier.length; depth++) {
      const next: GameState[] = []
      for (const state of frontier) {
        for (const obj of g.getView(state).objects) {
          for (const action of obj.actions) {
            const turn = g.act(state, { object: obj.id, action })
            if (turn.effects.some((e) => e.kind === 'end')) return
            const k = key(turn.state)
            if (!seen.has(k)) {
              seen.add(k)
              next.push(turn.state)
            }
          }
        }
      }
      frontier = next
    }
    expect.fail('no sequence of taps within 12 steps ends the slice')
  })

  it('and the journal has the mark and the way down by the time you get there', () => {
    const g = createGame(world())
    let s = g.newRun(42)
    let effects: readonly Effect[] = []
    for (const tap of [
      { object: 'stone', action: 'study' },
      { object: 'door', action: 'open' },
      { object: 'steps', action: 'descend' },
    ]) {
      const turn = g.act(s, tap)
      s = turn.state
      effects = turn.effects
    }
    expect(s.journal).toContain('the_mark')
    expect(s.journal).toContain('the_way_down')
    expect(
      effects.some((e) => e.kind === 'end'),
      'the opened door must open the way down',
    ).toBe(true)
  })
})

describe('P105 · the law', () => {
  it('a refusal that changes the world is not content the loader will take', () => {
    // The Crossing's two refusals carry their line on `say` and nothing else.
    // The reason they can is that the gate refuses anything more: a refusal
    // means nothing else fired (VOCAB.md §refuse purity), so a branch that
    // refuses AND sets a flag is rejected where it is written rather than
    // discovered as a flag nobody can account for.
    const scene = (open: unknown) => ({
      v: 1,
      start: 'probe',
      scenes: {
        probe: {
          scene: 'probe',
          enter: 'The ring of the portal is cold all through.',
          objects: { door: { tap: 'A low door, barred from this side.', actions: { open } } },
        },
      },
    })
    expect(() =>
      loadBundle(scene([{ refuse: true, say: 'The bar is seated in iron.', set: ['door_open'] }])),
    ).toThrow(/refuse — a refusal changes nothing — drop set/)
    // And the pure one is content.
    expect(() =>
      loadBundle(scene([{ refuse: true, say: 'The bar is seated in iron.' }])),
    ).not.toThrow()
  })

  it('content-lint passes on the Crossing', () => {
    expect(() =>
      execFileSync('npm', ['run', 'content-lint'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    ).not.toThrow()
  })

  it('the compiled bundle matches the sources — someone rebuilt it', () => {
    const committed = readFileSync(resolve(root, 'content/bundle.json'), 'utf8')
    execFileSync('npm', ['run', 'build:content'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const rebuilt = readFileSync(resolve(root, 'content/bundle.json'), 'utf8')
    // Put back what was committed either way, so a failing run does not leave a
    // rebuilt bundle behind and quietly pass on the retry.
    writeFileSync(resolve(root, 'content/bundle.json'), committed, 'utf8')
    expect(
      rebuilt,
      'content/bundle.json is stale — run npm run build:content and commit it',
    ).toBe(committed)
  })

  it('speaks no banned word (CANON.md)', () => {
    const banned = [
      'player', 'game', 'level', 'quest', 'xp', 'inventory', 'tutorial',
      'unlock', 'unlocked', 'menu', 'okay', 'ok', 'very', 'really',
      'suddenly', 'somehow', 'amazing', 'awesome', 'epic', 'mysterious',
      'eerie', 'yet', 'later', 'come back', 'not now',
      // CANON v2 adds these.
      'you feel', 'evil', 'creepy', 'satan', 'devil', 'lucifer',
    ]
    const s = crossing()
    // Every authored string the scene carries. `journal` is an entry id now,
    // not prose (VOCAB.md), so it is not scanned — the entry it names is, and
    // that lives with the entries. `end.line` and `end.note` are, because they
    // are prose and the last prose a slice speaks.
    const prose: string[] = [s.enter]
    for (const o of s.objects) {
      prose.push(o.tap)
      for (const rs of Object.values(o.actions)) {
        for (const r of rs) {
          prose.push(r.say)
          if (r.end !== undefined) {
            prose.push(r.end.line)
            if (r.end.note !== undefined) prose.push(r.end.note)
          }
        }
      }
    }
    expect(prose.length, 'nothing was scanned').toBeGreaterThan(10)
    for (const line of prose) {
      for (const word of banned) {
        expect(
          new RegExp(`\\b${word.split(/\s+/).join('\\s+')}\\b`, 'i').test(line),
          `banned word "${word}" in: ${line}`,
        ).toBe(false)
      }
    }
  })
})
