import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * The one thing this config needs from the process it is running in. There are
 * no `@types/node` here — the runtime is a browser — and one build-time
 * environment variable does not justify a dependency, so the shape that is
 * actually used is declared instead.
 */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> }

/**
 * Stamp the commit into the build.
 *
 * The deploy workflow's last step asks the live site what it is holding and
 * believes nothing else — not the deploy action's exit code, which is known to
 * fail while the publish succeeds. That check reads `version.txt`, so the build
 * has to write it, and a build that stops writing it turns a green deploy into
 * a permanent red one. (It did: the reset dropped this plugin and left the
 * check, and the first run on main failed for exactly that reason.)
 *
 * `dev` is stamped when there is no commit to stamp, which is every local
 * build. It is emitted as an asset rather than written to disk so it travels
 * with the bundle and cannot be cleaned away behind it.
 */
function servedVersion(): Plugin {
  return {
    name: 'castlebrynth:version',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.txt',
        source: `${process.env['GITHUB_SHA'] ?? 'dev'}\n`,
      })
    },
  }
}

// No backend, no framework, no router. The built directory is the whole
// install, and every path in it is relative to the page so the same bundle
// runs at a domain root, in a project subdirectory, or off file://.
export default defineConfig({
  plugins: [servedVersion()],
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
