// @vitest-environment happy-dom
//
// vitest.config.ts is in no card's scope, so the DOM environment is asked for
// per file rather than by glob. The pragma above is that ask.
import { describe, expect, it } from 'vitest'
import { mount } from './mount'
import { SAVE_KEY, restore } from './persist'
import { createGame } from '../core/api'
import { loadBundle } from '../core/bundle'
import type { Bundle } from '../core/cards'
import type { GameState } from '../core/types'

// P101 · mount, on its own. What is under test is the entry, not the engine:
// that the line the API projected is the line that reaches the element, that
// it reaches it as text, and that mount remembers nothing between calls.
//
// P108 · and the loop that entry runs. The tap tests below are the same shape:
// what is under test is that a tap reaches `act` and that the whole screen is
// drawn again from the state it returned. What the world says when it is asked
// is the engine's business and H006a's tests.
//
// The fixture goes through loadBundle rather than content/bundle.json, so a
// content edit cannot turn this red — and `water` is written before `shore` so
// "the start scene" and "the first scene" are different answers.
const twoScenes = (line: string): Bundle =>
  loadBundle({
    v: 1,
    start: 'shore',
    scenes: {
      water: { id: 'water', line: 'Under, and no light in it.', objects: [] },
      shore: {
        id: 'shore',
        line,
        objects: [
          {
            id: 'stone',
            name: 'a flat stone',
            actions: { study: [{ say: 'A mark is cut into it.' }] },
          },
        ],
      },
    },
  })

// P108 · a shore with an arc in it: a refusal, the flag that lifts it, an entry
// for the journal, and somewhere to walk to. The smallest content a loop is
// visible in.
const arc = (): Bundle =>
  loadBundle({
    v: 1,
    start: 'shore',
    scenes: {
      water: { id: 'water', line: 'Under, and no light in it.', objects: [] },
      shore: {
        id: 'shore',
        line: 'Grey water, and no far side to it.',
        objects: [
          {
            id: 'stone',
            name: 'a flat stone',
            actions: {
              study: [{ setFlag: 'knows_glyph', say: 'The stone is warm where nothing else is.' }],
            },
          },
          {
            id: 'book',
            name: 'a book, face up in the shingle',
            actions: {
              read: [
                {
                  gate: { flag: 'knows_glyph' },
                  journal: 'procession',
                  say: 'The marks hold still.',
                },
                { refuse: 'The marks swim. You cannot hold them.' },
              ],
            },
          },
          {
            id: 'path',
            name: 'a path inland',
            actions: { follow: [{ goto: 'water', say: 'The path goes down off the shingle.' }] },
          },
        ],
      },
    },
  })

const div = () => document.createElement('div')

const text = (el: HTMLElement) => el.textContent ?? ''

/** The control for a ref, as the person's thumb finds it: by what it carries. */
const control = (el: HTMLElement, object: string, action: string): HTMLElement | null =>
  el.querySelector<HTMLElement>(`[data-object="${object}"][data-action="${action}"]`)

const tap = (el: HTMLElement, object: string, action: string): void => {
  const target = control(el, object, action)
  if (target === null) throw new Error(`no control for ${object}.${action}`)
  target.click()
}

/** The smallest thing that satisfies Storage — persist.test.ts's, and for the same reason. */
const fakeStorage = (): Storage => {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage
}

/** A run played through the API alone, for the mounts that must open on one. */
const played = (): GameState => {
  const game = createGame(arc())
  let state = game.newRun(1)
  state = game.act(state, { object: 'stone', action: 'study' }).state
  state = game.act(state, { object: 'book', action: 'read' }).state
  return state
}

describe('P101 · mount', () => {
  it('draws the scene line into the element it was given', () => {
    const el = div()
    mount(el, createGame(twoScenes('Grey water, and no far side to it.')))
    expect(el.textContent).toContain('Grey water, and no far side to it.')
  })

  it('opens at the bundle\'s start scene, not the first one written', () => {
    const el = div()
    mount(el, createGame(twoScenes('Grey water, and no far side to it.')))
    expect(el.textContent).not.toContain('Under, and no light in it.')
  })

  it('draws the line as prose, not as markup', () => {
    const el = div()
    mount(el, createGame(twoScenes('A door, <b>shut</b>.')))
    expect(el.querySelector('b')).toBeNull()
    expect(el.textContent).toContain('A door, <b>shut</b>.')
  })

  it('keeps no run of its own — two mounts of one game draw one frame', () => {
    const game = createGame(twoScenes('Grey water, and no far side to it.'))
    const first = div()
    const second = div()
    mount(first, game)
    mount(second, game)
    expect(second.textContent).toBe(first.textContent)
  })

  it('draws into the element it was handed and no other', () => {
    const mine = div()
    const theirs = div()
    document.body.append(mine, theirs)
    mount(mine, createGame(twoScenes('Grey water, and no far side to it.')))
    expect(theirs.textContent).toBe('')
  })
})

describe('P108 · a tap goes through act and comes back as a screen', () => {
  it('shows what the world said for the tap', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'stone', 'study')
    expect(text(el)).toContain('The stone is warm where nothing else is.')
  })

  it('marks a refusal as one rather than as a thing that happened', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'book', 'read')
    const refusal = el.querySelector('.refused')
    expect(refusal, 'the refusal must reach the screen, set apart').not.toBeNull()
    expect(refusal?.textContent).toBe('The marks swim. You cannot hold them.')
  })

  it('keeps the state the act returned — the second read is not the first', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'book', 'read')
    tap(el, 'stone', 'study')
    tap(el, 'book', 'read')
    expect(text(el)).toContain('The marks hold still.')
    expect(text(el), 'the refusal belongs to a tap that is over').not.toContain('The marks swim')
  })

  it('says what this tap did, not what every tap has done', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'stone', 'study')
    tap(el, 'book', 'read')
    expect(text(el)).not.toContain('The stone is warm')
  })

  it('redraws the scene whole — a second tap does not double the controls', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'stone', 'study')
    tap(el, 'stone', 'study')
    expect(el.querySelectorAll('[data-object][data-action]')).toHaveLength(3)
  })

  it('follows a goto: the scene it left is gone from the screen', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'path', 'follow')
    expect(text(el)).toContain('Under, and no light in it.')
    expect(text(el)).not.toContain('Grey water')
    expect(control(el, 'stone', 'study'), 'still on the shore').toBeNull()
  })

  it('draws the panel from the same state, every frame', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'stone', 'study')
    tap(el, 'book', 'read')
    expect(el.querySelector('.panel')?.textContent).toContain('procession')
    // A scene away, and a redraw later: the person's record is not the moment's.
    tap(el, 'path', 'follow')
    expect(el.querySelector('.panel')?.textContent).toContain('procession')
  })

  it('never puts the engine\'s bookkeeping on the screen', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'stone', 'study')
    tap(el, 'book', 'read')
    expect(text(el)).not.toContain('knows_glyph')
  })
})

describe('P108 · where the run is kept', () => {
  it('writes nothing before there is anything to write', () => {
    const store = fakeStorage()
    mount(div(), createGame(arc()), store)
    expect(store.getItem(SAVE_KEY), 'a mount is not a turn').toBeNull()
  })

  it('saves after every act', () => {
    const store = fakeStorage()
    const el = div()
    mount(el, createGame(arc()), store)

    tap(el, 'stone', 'study')
    expect(restore(store, arc()).flags).toContain('knows_glyph')

    tap(el, 'book', 'read')
    expect(restore(store, arc()).journal).toContain('procession')
  })

  it('saves a refused tap too — the ledger moved', () => {
    const store = fakeStorage()
    const el = div()
    mount(el, createGame(arc()), store)
    tap(el, 'book', 'read')
    expect(restore(store, arc()).refused).toContain('book.read')
  })

  it('keeps nothing when it was given nowhere to keep it', () => {
    const el = div()
    mount(el, createGame(arc()))
    tap(el, 'stone', 'study')
    // happy-dom has a localStorage. The point is that mount never reaches for
    // one — the storage arrives as an argument or the run is not written down.
    expect(localStorage.getItem(SAVE_KEY)).toBeNull()
  })

  it('opens on the run it was handed rather than a fresh one', () => {
    const el = div()
    mount(el, createGame(arc()), undefined, played())
    expect(el.querySelector('.panel')?.textContent).toContain('procession')
    // And it is that run that carries on: the book is open, so it holds still.
    tap(el, 'book', 'read')
    expect(text(el)).toContain('The marks hold still.')
  })

  it('opens a fresh run when it was handed none', () => {
    const el = div()
    mount(el, createGame(arc()), fakeStorage())
    expect(el.querySelector('.panel')?.textContent).not.toContain('procession')
  })
})
