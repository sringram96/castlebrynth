/**
 * Boot.
 *
 * Construct the app, load the save, mount the root view. That is the whole
 * job, and this file is kept small enough that it stays the whole job.
 */

import { App } from './app/app.js'
import { applyFixture, hasFixture } from './game/fixture.js'
import { load } from './game/save.js'
import { AssetLoader, criticalAssetsForState } from './render/loader.js'

const root = document.getElementById('app')
if (!root) throw new Error('#app is missing from the document')

const { state, discarded } = load()

// A URL fixture replaces the save rather than merging with it, so a test run
// never inherits a half-finished session. See src/game/fixture.ts.
const search = window.location.search
const initial = hasFixture(search) ? applyFixture(state, search) : state

// `?motion=0` is a presentation switch, not a fixture: it changes how long a
// change takes to appear and nothing about what the change is. Journeys that
// care about flow rather than feel use it; the motion spec does not.
const motion = new URLSearchParams(search).get('motion') !== '0'

const loader = new AssetLoader()
const app = new App({ root, initial, discarded, persist: !hasFixture(search), motion, loader })

// **Only what the first screen needs.** The rest of the game's art is fetched
// as the player walks towards it — see `render/loader.ts` — so a fifth
// authored pose for an enemy three rooms away costs that fight rather than
// this boot. Art is still a content requirement: a missing file is a build
// fault and is reported loudly here rather than showing an empty room or an
// absent opponent, and the game keeps running because a player mid-session is
// not helped by a white screen.
void loader.loadAll(criticalAssetsForState(app.current)).then(() => {
  const failures = loader.failures
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
      settle: () => void
      animating: () => boolean
      /** Which files have been decoded so far. The loading tests read it. */
      loaded: () => readonly string[]
    }
  }
}
window.castlebrynth = {
  state: () => app.current,
  dispatch: app.dispatch,
  // Presentation only. `settle` ends a transition early — exactly what an
  // impatient press does — and `animating` says whether one is on screen.
  // Neither can reach an outcome: the state was reduced and saved before the
  // first frame of any sequence.
  settle: () => app.settle(),
  animating: () => app.animating,
  loaded: () => app.assets.decoded,
}
