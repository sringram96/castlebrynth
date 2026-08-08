import { defineConfig } from 'vitest/config'

// No backend, no framework, no router. The built directory is the whole
// install, and every path in it is relative to the page so the same bundle
// runs at a domain root, in a project subdirectory, or off file://.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  server: { host: '127.0.0.1', port: 5173 },
  test: {
    // Browser journeys are Playwright's, not vitest's. Pointing vitest at
    // test/browser would let a headless assertion masquerade as an
    // acceptance test, which is the inverted pyramid this reset is undoing.
    include: ['test/unit/**/*.test.ts'],
    environment: 'node',
  },
})
