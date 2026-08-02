// @vitest-environment happy-dom
//
// vitest.config.ts is in no card's scope, so the DOM environment is asked for
// per file rather than by glob. The pragma above is that ask.
import { describe, expect, it } from 'vitest'
import { mount } from './mount'
import { createGame } from '../core/api'
import { loadBundle } from '../core/bundle'
import type { Bundle } from '../core/cards'

// P101 · mount, on its own. What is under test is the entry, not the engine:
// that the line the API projected is the line that reaches the element, that
// it reaches it as text, and that mount remembers nothing between calls.
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

const div = () => document.createElement('div')

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
