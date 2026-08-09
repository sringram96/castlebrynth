/**
 * The pipeline's codec, as the tests see it.
 *
 * `png.mjs` is a build tool and is deliberately plain JavaScript — nothing in
 * `src/` imports it and the game never runs it. But the asset suite has one
 * question that cannot be answered from a PNG header: **is the alpha binary?**
 * Every plate in this game is opaque or absent, never in between, because a
 * pixel's colour may not depend on what is behind it — and the only way to hold
 * the files on disk to that is to decode them.
 *
 * So the decoder gets a declaration rather than the test getting a second PNG
 * reader. Kept to what a test actually calls.
 */

export interface Decoded {
  readonly width: number
  readonly height: number
  readonly rgba: Uint8Array
}

export function decode(bytes: Uint8Array): Decoded
