/**
 * Boot.
 *
 * Construct the app, load the save, mount the root view. That is the whole
 * job, and this file is kept small enough that it stays the whole job.
 */

import { App } from './app/app.js'
import { applyFixture, hasFixture } from './game/fixture.js'
import { load } from './game/save.js'
import { preload } from './render/assets.js'

const root = document.getElementById('app')
if (!root) throw new Error('#app is missing from the document')

const { state, discarded } = load()

// A URL fixture replaces the save rather than merging with it, so a test run
// never inherits a half-finished session. See src/game/fixture.ts.
const search = window.location.search
const initial = hasFixture(search) ? applyFixture(state, search) : state

const app = new App({ root, initial, discarded, persist: !hasFixture(search) })

// Art is a content requirement. A missing backdrop or a missing enemy is a
// build fault, so it is reported loudly here rather than showing an empty room
// or an absent opponent. The game still runs — a player mid-session is not
// helped by a white screen — but nobody can miss it.
void preload().then((failures) => {
  document.body.dataset['assets'] = failures.length === 0 ? 'ready' : 'missing'
  if (failures.length > 0) {
    document.body.dataset['missingAssets'] = failures.join(',')
    console.error(`missing art: ${failures.join(', ')}`)
  }
})

// The one hook a browser test needs, and the only thing on the global. It
// reads state and dispatches through the same path a press does; it cannot
// reach anything a player cannot.
declare global {
  interface Window {
    castlebrynth?: {
      state: () => unknown
      dispatch: App['dispatch']
    }
  }
}
window.castlebrynth = { state: () => app.current, dispatch: app.dispatch }
