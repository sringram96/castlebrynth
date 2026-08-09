/**
 * The little bit of Node the tests actually touch.
 *
 * Declared here rather than pulling in `@types/node`: the runtime is a browser
 * and the only reason a test reaches the filesystem is to hold the asset
 * manifest to the files on disk. A whole dependency for two functions would be
 * a dependency the game does not need.
 */

declare module 'node:fs' {
  export function readFileSync(path: string | URL): Uint8Array
  export function statSync(path: string | URL): { size: number }
}

/**
 * The one global the balance report touches.
 *
 * `npm run balance` has to be able to fail a build when an invariant breaks,
 * and an exit code is how a script says so. Two properties, declared here for
 * the same reason as the two functions above.
 */
declare const process: {
  exitCode?: number
  argv: string[]
}
