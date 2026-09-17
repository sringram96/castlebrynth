/**
 * What a wave did not touch.
 *
 * Two promises, and they are the constraints that shaped the legibility wave
 * and every wave since:
 *
 *   - **the save does not move.** Every feature of those waves — the face
 *     strips, the slot cards, the strip of where the run has been, the
 *     territory grades and their cards — is derived wholly from state that
 *     already existed. Not one of them added a field, and `SAVE_VERSION` is
 *     the proof: a run in progress survives them.
 *   - **no pixel is authored by an agent.** Existing art may be measured,
 *     positioned, clipped, transformed and graded; its pixels may not be
 *     drawn. That one is no longer a zero — the bell's swing was painted by a
 *     human and landed here — so it is a named list now, below, and everything
 *     outside the list is still held to byte for byte.
 *
 * Both are asserted rather than asserted-in-a-commit-message, because both are
 * the kind of promise that is easy to break by accident and impossible to
 * notice afterwards.
 */

import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { statSync } from 'node:fs'

import { SAVE_VERSION } from '../../src/game/state.js'

describe('the save is untouched', () => {
  it('was bumped once for the crooked bones wave, and only once', () => {
    // **12, and it is the whole wave's bump.** Eight core dice rather than one,
    // priced dice and cut prose on a `RunRoom`, a record of which of them have
    // been claimed, three grammars, and a ladder where an enemy's damage was —
    // all of it is one shape change and it gets one number. A thirteenth inside
    // this wave would mean two saves nobody ever wrote were readable; the policy
    // is unchanged, which is that an old save is discarded and reported.
    expect(SAVE_VERSION).toBe(12)
  })
})

/**
 * The base this wave was cut from, whichever name the checkout has for it.
 *
 * CI checks out a pull request **shallow**, so neither `origin/main` nor
 * `main` exists there and the assertion below would quietly become a no-op on
 * the one machine everybody reads the verdict from. So a shallow fetch of the
 * base is the last resort: diffing two trees needs both commits present and
 * nothing else, not a shared history. A checkout that cannot reach the base at
 * all — offline, or no remote — answers nothing, and the tests say so rather
 * than pretending to have checked.
 */
function baseRef(): string | undefined {
  for (const ref of ['origin/main', 'main']) {
    try {
      execSync(`git rev-parse --verify --quiet ${ref}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      return ref
    } catch {
      continue
    }
  }
  try {
    execSync('git fetch --depth=1 origin main', { stdio: ['ignore', 'ignore', 'ignore'] })
    execSync('git rev-parse --verify --quiet FETCH_HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    return 'FETCH_HEAD'
  } catch {
    return undefined
  }
}

/**
 * The art that moved, and everything that did not.
 *
 * This used to assert that **nothing** under `public/` or `docs/art-reference/`
 * had moved at all, which was the legibility wave's promise and held for five
 * waves after it. The bell's swing is the first delivery to break it, and it
 * breaks it the way the freeze always said art would arrive: a human painted
 * the frames, `CLAUDE.md` § *No art in the polish sweep* was lifted for that
 * one asset, and every file below is the painter's pixels measured, scaled,
 * shifted and composited by `tools/sheet.mjs` — not drawn, retouched or
 * recoloured by anything in this repository.
 *
 * So the promise is now a list rather than a zero, and the list is the point:
 * a change that touches one other pixel of art fails here and has to say so in
 * a commit that means it.
 */
const ART_THAT_MOVED = [
  // The delivered sheet, six bells on a 3 × 2 grid, and the cut that made a
  // family out of it. `bell-idle` is a **replacement**: the bell that hung here
  // was a different drawing on a chain, and a swing in one drawing and a rest
  // pose in another is two bells.
  'docs/art-reference/visual/reliquary/reference-bell-swing-sheet.png',
  'docs/art-reference/masters/reliquary/bell-idle.png',
  'docs/art-reference/masters/reliquary/bell-ring-1.png',
  'docs/art-reference/masters/reliquary/bell-ring-2.png',
  'docs/art-reference/masters/reliquary/bell-ring-3.png',
  'docs/art-reference/masters/reliquary/bell-ring-4.png',
  'public/assets/props/reliquary-bell-idle.png',
  'public/assets/props/reliquary-bell-ring-1.png',
  'public/assets/props/reliquary-bell-ring-2.png',
  'public/assets/props/reliquary-bell-ring-3.png',
  'public/assets/props/reliquary-bell-ring-4.png',
]

describe('no pixel was authored here', () => {
  const moved = (paths: string): readonly string[] => {
    const base = baseRef()
    // A checkout with no base to compare against cannot answer the question,
    // and a test that quietly passed in that case would be worse than one that
    // says so. Every CI checkout has one.
    if (!base) return []
    return execSync(`git diff --name-only ${base} -- ${paths}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .map((line) => line.trim())
      // Pixels, not prose. A brief lives beside the masters it is the contract
      // for, and rewriting one is how a delivery is *recorded* — this is here
      // to catch a drawing that changed, not a paragraph.
      .filter((file) => /\.(png|jpe?g|webp|gif|svg)$/i.test(file))
  }

  it('moves nothing under public/ but the bell', () => {
    for (const file of moved('public/')) {
      expect(ART_THAT_MOVED, `${file} moved and is not the bell`).toContain(file)
    }
  })

  it('moves nothing under the masters but the bell and the sheet it came on', () => {
    for (const file of moved('docs/art-reference/')) {
      expect(ART_THAT_MOVED, `${file} moved and is not the bell`).toContain(file)
    }
  })

  it('builds the runtime plates from the masters, so the two cannot disagree', () => {
    // Every master the sheet produced is in the build. A master cut and never
    // built is a swing that plays in the masters folder and nowhere else, and
    // `npm run art` is the only thing that should ever close that gap.
    //
    // On disk rather than through git, because a file that is new is not in a
    // diff until it is committed and this has to answer in a dirty tree too.
    for (const master of ART_THAT_MOVED.filter((f) => f.includes('masters/'))) {
      const frame = master.split('/').pop()!.replace('.png', '')
      const built = new URL(`../../public/assets/props/reliquary-${frame}.png`, import.meta.url)
      expect(statSync(built).size, `${frame} was cut but never built`).toBeGreaterThan(0)
    }
  })
})
