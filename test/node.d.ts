/**
 * The two node built-ins the plate tests need, declared locally.
 *
 * `test/visual.assets.test.ts` reads the shipped PNG masters off disk and
 * checks that each one is the size its manifest claims and that its alpha
 * is binary (art. 17). Nothing else in the suite touches the filesystem,
 * and neither does anything under `src` — the game is a browser and a URL.
 *
 * These are declared here rather than by installing `@types/node` because
 * CLAUDE.md asks a Blocked question before a new dependency, and a
 * dependency is a poor answer to *two functions in one test file*. The
 * shapes below are the whole of what is used; anything more should be the
 * Blocked question instead of a wider shim.
 */

declare module 'node:fs' {
  export function readFileSync(path: string): Uint8Array
}

declare module 'node:zlib' {
  export function inflateSync(data: Uint8Array): Uint8Array
}
