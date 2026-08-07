/**
 * The two node built-ins the plate tests need, declared locally.
 *
 * `test/visual.assets.test.ts` reads the shipped PNG masters off disk and
 * checks that each one is the size its manifest claims, or that it is
 * declared as still awaited (arts 17, 126). Nothing else in the suite touches the filesystem,
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
  /**
   * The hero-art wave: a plate may be **declared and not yet painted**
   * (art. 126's fallback, made into an authoring contract). The test asks
   * whether the file is there before it asks how big it is, so that an
   * unpainted slot reads as an unpainted slot and a typo'd path still reads
   * as a fault.
   */
  export function existsSync(path: string): boolean
}

declare module 'node:zlib' {
  export function inflateSync(data: Uint8Array): Uint8Array
}
