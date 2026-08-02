// @vitest-environment happy-dom
//
// vitest.config.ts is in no card's scope, so the DOM environment is asked for
// per file rather than by glob. The pragma above is that ask.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import data from '../../content/bundle.json'
import { SAVE_KEY, save } from './persist'
import { createGame } from '../core/api'
import { loadBundle } from '../core/bundle'
import type { GameState } from '../core/types'

// P108 · boot, on its own. The whole of this module is a side effect, so every
// case here clears the module registry and imports it again — which is also the
// only way to ask it the one question that matters: what it does when the
// element it draws into is not there.
//
// This file is the exception to the fixtures elsewhere in src/shell: boot names
// content/bundle.json itself, so the real content is what it is tested against.

const boot = async (): Promise<void> => {
  vi.resetModules()
  await import('./boot')
}

const app = (): HTMLElement => {
  const el = document.createElement('div')
  el.id = 'app'
  document.body.append(el)
  return el
}

/** A run played through the API alone, to be left where the boot will find it. */
const played = (): GameState => {
  const game = createGame(loadBundle(data))
  let state = game.newRun(1)
  // The Crossing's arc: the scored stone teaches the mark, and the same door
  // that refused it opens (content/crossing.yaml).
  state = game.act(state, { object: 'stone', action: 'study' }).state
  state = game.act(state, { object: 'door', action: 'open' }).state
  return state
}

beforeEach(() => {
  document.body.replaceChildren()
  localStorage.clear()
})

describe('P108 · the boot is inert without its element', () => {
  it('draws nothing and throws nothing when there is no #app', async () => {
    await expect(boot()).resolves.toBeUndefined()
    expect(document.body.textContent).toBe('')
  })

  it('acts on nothing either — an import is not a run', async () => {
    await boot()
    expect(localStorage.getItem(SAVE_KEY)).toBeNull()
  })
})

describe('P108 · the boot draws the world', () => {
  it('mounts the real content into #app', async () => {
    const el = app()
    await boot()
    expect(el.textContent).toContain('The ring of the portal is cold all through')
  })

  it('the page it drew is tappable', async () => {
    const el = app()
    await boot()
    const stone = el.querySelector<HTMLElement>('[data-object="stone"][data-action="study"]')
    expect(stone, 'the Crossing must be tappable').not.toBeNull()
    stone?.click()
    expect(el.textContent).toContain('cut deep enough to read with a thumb')
  })
})

describe('P108 · the boot is where the run comes back from', () => {
  it('opens on the run localStorage was left holding', async () => {
    save(localStorage, played())
    const el = app()
    await boot()
    expect(el.textContent, 'the journal came back with the run').toContain('the_way_down')
  })

  it('writes the run back after a tap', async () => {
    const el = app()
    await boot()
    el.querySelector<HTMLElement>('[data-object="stone"][data-action="study"]')?.click()
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull()
  })

  it('a corrupt save opens a new run rather than a broken screen', async () => {
    localStorage.setItem(SAVE_KEY, '{"v":1,"state":{')
    const el = app()
    await boot()
    expect(el.textContent).toContain('The ring of the portal is cold all through')
  })

  it('leaves every other key in storage alone', async () => {
    // Capacitor hands the app the WebView's whole localStorage, so the run is a
    // tenant there rather than the owner (persist.ts).
    localStorage.setItem('someone.elses', 'not ours')
    const el = app()
    await boot()
    el.querySelector<HTMLElement>('[data-object="stone"][data-action="study"]')?.click()
    expect(localStorage.getItem('someone.elses')).toBe('not ours')
  })
})
