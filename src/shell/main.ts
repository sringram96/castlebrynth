// H101 · the browser entry. index.html points its module tag here.
//
// This is the one module in src/shell permitted a side effect on import: it
// reaches for #app and it draws. Every other shell module must be importable
// by a test with nothing firing on it, which is the whole reason the entry is
// a file of its own rather than a few lines at the bottom of the thing it
// mounts. The v3 build learned this the expensive way (P1.md) and the boundary
// is kept here from the first commit.
//
// H107 replaced the placeholder with the thing itself, and the file kept its
// one job: find the element, hand it over. There is no third line of work here
// and there will not be one — which run is opened is `mount`'s business and
// then H109's (resume, or a new seed), and no decision about a run should need
// the entry rewritten again.

import { loadBundle } from '../core/bundle'
import { mount } from './app'
// The compiled world, imported and not fetched. It is a build artefact that is
// committed (CLAUDE.md), so Vite can inline it, and a phone opening the app
// with no network has nothing to fetch it from (H112 wraps this in a WebView).
// `loadBundle` is still the gate: an artefact can be stale or hand-edited, so
// it is checked as untrusted input every time (H004b) — a bundle this build
// cannot read is a broken build, and it should say so at the top of the page's
// life rather than at the first tap.
import compiled from '../../content/bundle.json'

// In the page this is the div index.html declares. In a test there is no #app
// unless the test built one, so importing this module does nothing at all —
// that is the shape the guard is here for, not a defence against a missing
// element in production.
const app = document.getElementById('app')

if (app !== null) {
  // `mount` empties the element and draws the frame into it, so the entry
  // neither builds a root of its own nor clears one: it owns the element, and
  // owning it here means handing it over whole.
  mount(app, loadBundle(compiled))
}

// No exports, deliberately: nothing may import the entry, because importing it
// is the side effect. `export {}` only makes the file a module rather than a
// script, so its `const` is its own.
export {}
