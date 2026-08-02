// H101 · the browser entry. index.html points its module tag here.
//
// This is the one module in src/shell permitted a side effect on import: it
// reaches for #app and it draws. Every other shell module must be importable
// by a test with nothing firing on it, which is the whole reason the entry is
// a file of its own rather than a few lines at the bottom of the thing it
// mounts. The v3 build learned this the expensive way (P1.md) and the boundary
// is kept here from the first commit.
//
// It stands on nothing yet. There is no engine import, no bundle, no storage —
// H107 replaces the placeholder below with `mount`, and this file keeps its one
// job: find the element, hand it over.

// In the page this is the div index.html declares. In a test there is no #app
// unless the test built one, so importing this module does nothing at all —
// that is the shape the guard is here for, not a defence against a missing
// element in production.
const app = document.getElementById('app')

if (app !== null) {
  // A placeholder root, not a frame. GAME.md #frame wants writing on top, a
  // full-bleed still, and a fixed panel below; H103, H104 and H105 build those
  // as modules and H107 composes them. Standing their containers up here would
  // be scaffolding those cards have to unpick, so what mounts is one element
  // that says the shell is alive and admits it is empty.
  const root = document.createElement('div')
  root.className = 'shell-root'
  root.textContent = 'castlebrynth — the shell stands. Nothing is mounted in it yet.'
  app.replaceChildren(root)
}

// No exports, deliberately: nothing may import the entry, because importing it
// is the side effect. `export {}` only makes the file a module rather than a
// script, so its `const` is its own.
export {}
