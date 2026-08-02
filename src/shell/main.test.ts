import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// H101 · the entry, and the boundary it exists to hold.
//
// main.ts is the one module in src/shell allowed a side effect on import, so
// the only honest way to test it is to import it and look at what it did. Each
// case resets the module registry first: an ES module is evaluated once per
// registry, and a second `import` of an already-evaluated module draws nothing.
//
// This file also proves the vitest.config.ts amendment — `document` exists here
// at all only because src/shell matched the DOM glob. src/core stays under node.
const importMain = async (): Promise<void> => {
  vi.resetModules()
  await import('./main')
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('main', () => {
  it('runs in a document', () => {
    // If this fails the environment glob is gone and every assertion below is
    // testing nothing, so it is stated rather than assumed.
    expect(typeof document.createElement).toBe('function')
  })

  it('draws a placeholder root into #app', async () => {
    document.body.innerHTML = '<div id="app"></div>'

    await importMain()

    const app = document.getElementById('app')
    expect(app?.children.length).toBe(1)
    expect(app?.textContent?.length).toBeGreaterThan(0)
  })

  it('replaces what is in #app rather than stacking beside it', async () => {
    // The entry owns that element. Anything already inside it is a previous
    // draw, and a shell that appended would grow a log where a screen belongs.
    document.body.innerHTML = '<div id="app"><p>stale</p></div>'

    await importMain()
    await importMain()

    const app = document.getElementById('app')
    expect(app?.children.length).toBe(1)
    expect(app?.textContent).not.toContain('stale')
  })

  it('does nothing, and does not throw, when the page has no #app', async () => {
    // This is the boundary, stated as a test: an acceptance file that imports a
    // shell module must not have a boot fire on it. Nothing in src/shell but
    // this file touches the document on import, and even this file is inert
    // without the element index.html declares.
    document.body.innerHTML = '<div id="elsewhere">untouched</div>'

    await expect(importMain()).resolves.toBeUndefined()

    expect(document.body.innerHTML).toBe('<div id="elsewhere">untouched</div>')
  })

  it('is the module index.html asks for', async () => {
    // The build broke on exactly this disagreement before H101 landed: the page
    // named a file that did not exist. The two are one contract, so they are
    // checked together.
    // Resolved off this file rather than the cwd, and without `new URL` — in
    // this file `URL` is happy-dom's, and node's fs will not take one of those.
    const html = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../index.html'), 'utf8')

    expect(html).toContain('src="/src/shell/main.ts"')
    expect(html).toContain('id="app"')
  })
})
