import { defineConfig } from 'vitest/config'

// The URL is the whole install: no backend, no framework, everything
// client-side.
export default defineConfig({
  // Every asset path is relative to the page, so the same build runs at a
  // domain root, in a subdirectory (a GitHub Pages project site lives at
  // /castlebrynth/), or off a file:// URL. There is no router and no deep
  // link, so nothing needs to know where it is.
  base: './',
  build: { target: 'es2022' },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})
