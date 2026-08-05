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
    // Several of the laws are proved rather than sampled — arts 3, 33, 40
    // and 78 each play every seed of every policy through the real acts and
    // the real doors, which is thousands of whole runs. Those sit at two to
    // three seconds on a developer machine and cross vitest's 5s default on
    // a CI runner, so the suite went red on a stopwatch rather than on a
    // fact. The budget is the runner's slowness, not a licence to write slow
    // tests: anything approaching this number is a test to make cheaper.
    testTimeout: 30_000,
  },
})
