// P108 · the browser entry. index.html points its module tag here.
//
// Everything the shell needs a browser for is in this file and nowhere else:
// the element it draws into, and the storage the run is kept in. `mount` is
// handed both, and ./persist takes a `Storage` as a parameter for exactly this
// reason — the entry knows it is in a browser, and nothing below it does
// (persist.ts).
//
// The bundle is imported rather than fetched. Capacitor serves this page out of
// the app's own assets with no server behind it (P107), so the content has to
// be something the build put in `dist` rather than something the page asks for
// at runtime.
//
// The shell touches GameAPI only (P1.md): `loadBundle` and `createGame` are the
// two calls that turn a file into a Game, and everything after them goes
// through `mount`. Nothing here imports resolve.ts or reads `bundle.scenes`.

import data from '../../content/bundle.json'
import { createGame } from '../core/api'
import { loadBundle } from '../core/bundle'
import { mount } from './mount'
import { restore } from './persist'

// The whole of the boot, behind the element it needs. Under happy-dom there is
// no `#app`, so importing this module during the test suite does nothing at all
// — which is why the boot is here and not in mount.ts, where the side effect
// would fire inside every acceptance file that imports `mount`.
const app = document.getElementById('app')

if (app !== null) {
  // The bundle is a build artefact and is checked as untrusted input every time
  // (bundle.ts). A page that shipped with a broken bundle is not a screen this
  // can recover into, so the throw is left to reach the console.
  const bundle = loadBundle(data)
  // The run as it was left, or a fresh one — a corrupt save is a new run,
  // quietly (persist.ts). The same storage goes down to `mount`, which writes
  // it back after every act.
  mount(app, createGame(bundle), localStorage, restore(localStorage, bundle))
}
