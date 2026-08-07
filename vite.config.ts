import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * The one thing this config needs from the process it is running in. There
 * are no `@types/node` in this repo and a build-time environment variable
 * does not justify one (CLAUDE.md: no new dependency without a Blocked
 * question first), so the shape that is actually used is declared here.
 */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> }

/**
 * **Standing rule 1: green means served.**
 *
 * `deploy-pages` polls for ten minutes — a hard ceiling in that action, not
 * a default — then gives up and *cancels* the deployment, which lands
 * anyway. Three runs went red on 2026-08-06 while the site published
 * correctly each time, and a signal that cries wolf is a signal nobody
 * reads. So the build stamps the commit into the artifact and CI's verdict
 * is whether that hash is being *served* from the real URL.
 *
 * `dev` is stamped when there is no commit to stamp, which is every local
 * build. It is emitted as an asset rather than written to disk so that it
 * goes wherever the bundle goes and cannot be cleaned away behind it.
 */
function servedVersion(): Plugin {
  return {
    name: 'castlebrynth:version',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.txt',
        source: `${process.env.GITHUB_SHA ?? 'dev'}\n`,
      })
    },
  }
}

// The URL is the whole install: no backend, no framework, everything
// client-side.
export default defineConfig({
  plugins: [servedVersion()],
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
